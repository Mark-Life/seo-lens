/**
 * Generates `src/generated/schema-vocab.json` and a tiny `schema-vocab.ts`
 * shim from the vendored schema.org JSON-LD.
 *
 * The raw data lives in `schema-vocab.json` so the ~255 kB payload is not
 * inlined into every JS chunk that touches the vocabulary. Consumers load the
 * data at runtime via `loadSchemaVocab()` and share a single module-scoped
 * cache per JS realm.
 *
 * Extracts:
 * - classes: schema: namespaced `rdfs:Class` entries
 * - properties: schema: namespaced `rdf:Property` entries
 * - subClassOf: child -> all schema: parents (DAG walked at query time)
 * - propertyDomains: property -> schema: classes from `schema:domainIncludes`
 * - propertyRanges: property -> schema: classes from `schema:rangeIncludes`
 *
 * Usage:
 *   `bun run update-schema` — regenerates from the vendor file.
 *   `bun run update-schema -- --check` — regenerates into memory and diffs
 *     against the committed files; exits non-zero on mismatch.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCHEMA_PREFIX = "schema:";
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PKG_DIR = join(SCRIPT_DIR, "..");
const VENDOR_PATH = join(
  PKG_DIR,
  "scripts/vendor/schemaorg-current-https.jsonld"
);
const OUT_JSON_PATH = join(PKG_DIR, "src/generated/schema-vocab.json");
const OUT_TS_PATH = join(PKG_DIR, "src/generated/schema-vocab.ts");
const OUT_EXTENSION_PUBLIC_PATH = join(
  PKG_DIR,
  "../../apps/extension/public/schema-vocab.json"
);

interface GraphNode {
  readonly "@id"?: string;
  readonly "@type"?: string | readonly string[];
  readonly "rdfs:subClassOf"?: IdRef | readonly IdRef[];
  readonly "schema:domainIncludes"?: IdRef | readonly IdRef[];
  readonly "schema:rangeIncludes"?: IdRef | readonly IdRef[];
}

interface IdRef {
  readonly "@id"?: string;
}

interface Doc {
  readonly "@graph": readonly GraphNode[];
}

const hasType = (node: GraphNode, type: string) => {
  const t = node["@type"];
  if (!t) {
    return false;
  }
  return Array.isArray(t) ? t.includes(type) : t === type;
};

const asArray = <T>(v: T | readonly T[] | undefined): readonly T[] => {
  if (v === undefined) {
    return [];
  }
  return Array.isArray(v) ? v : [v as T];
};

const stripSchema = (id: string | undefined): string | null => {
  if (!id) {
    return null;
  }
  if (!id.startsWith(SCHEMA_PREFIX)) {
    return null;
  }
  return id.slice(SCHEMA_PREFIX.length);
};

const refsToLocalNames = (refs: readonly IdRef[]): readonly string[] => {
  const out: string[] = [];
  for (const ref of refs) {
    const name = stripSchema(ref["@id"]);
    if (name) {
      out.push(name);
    }
  }
  return out;
};

const extractGraph = (graph: Doc["@graph"]): Extracted => {
  const classes = new Set<string>();
  const properties = new Set<string>();
  const subClassOf = new Map<string, Set<string>>();
  const propertyDomains = new Map<string, Set<string>>();
  const propertyRanges = new Map<string, Set<string>>();

  for (const node of graph) {
    const localId = stripSchema(node["@id"]);
    if (!localId) {
      continue;
    }

    if (hasType(node, "rdfs:Class")) {
      classes.add(localId);
      const parents = refsToLocalNames(asArray(node["rdfs:subClassOf"]));
      if (parents.length > 0) {
        subClassOf.set(localId, new Set(parents));
      }
    }

    if (hasType(node, "rdf:Property")) {
      properties.add(localId);
      const domains = refsToLocalNames(asArray(node["schema:domainIncludes"]));
      if (domains.length > 0) {
        propertyDomains.set(localId, new Set(domains));
      }
      const ranges = refsToLocalNames(asArray(node["schema:rangeIncludes"]));
      if (ranges.length > 0) {
        propertyRanges.set(localId, new Set(ranges));
      }
    }
  }

  return { classes, properties, subClassOf, propertyDomains, propertyRanges };
};

const runCheck = (json: string, ts: string, classCount: number): void => {
  const existingJson = readFileSync(OUT_JSON_PATH, "utf8");
  if (existingJson !== json) {
    console.error(
      `schema-vocab.json is stale relative to ${VENDOR_PATH}.\n` +
        "Run `bun run update-schema` in packages/seo-rules and commit the result."
    );
    process.exit(1);
  }
  const existingTs = readFileSync(OUT_TS_PATH, "utf8");
  if (existingTs !== ts) {
    console.error(
      "schema-vocab.ts shim is stale.\n" +
        "Run `bun run update-schema` in packages/seo-rules and commit the result."
    );
    process.exit(1);
  }
  try {
    const existingPublic = readFileSync(OUT_EXTENSION_PUBLIC_PATH, "utf8");
    if (existingPublic !== json) {
      console.error(
        "apps/extension/public/schema-vocab.json is stale.\n" +
          "Run `bun run update-schema` in packages/seo-rules and commit the result."
      );
      process.exit(1);
    }
  } catch {
    console.error(
      "apps/extension/public/schema-vocab.json is missing.\n" +
        "Run `bun run update-schema` in packages/seo-rules and commit the result."
    );
    process.exit(1);
  }
  console.log(`schema-vocab up to date (${classCount} classes).`);
};

const main = () => {
  const checkMode = process.argv.includes("--check");

  const raw = readFileSync(VENDOR_PATH, "utf8");
  const doc = JSON.parse(raw) as Doc;
  const extracted = extractGraph(doc["@graph"]);

  if (extracted.classes.size < 800) {
    throw new Error(`Expected >800 classes, got ${extracted.classes.size}`);
  }

  const json = emitJson(extracted);
  const ts = emitTs();

  if (checkMode) {
    runCheck(json, ts, extracted.classes.size);
    return;
  }

  writeFileSync(OUT_JSON_PATH, json);
  writeFileSync(OUT_TS_PATH, ts);
  writeFileSync(OUT_EXTENSION_PUBLIC_PATH, json);

  console.log(
    `generated ${OUT_JSON_PATH}\n` +
      `generated ${OUT_TS_PATH}\n` +
      `generated ${OUT_EXTENSION_PUBLIC_PATH}\n` +
      `  classes: ${extracted.classes.size}\n` +
      `  properties: ${extracted.properties.size}\n` +
      `  subClassOf edges: ${extracted.subClassOf.size}\n` +
      `  propertyDomains: ${extracted.propertyDomains.size}\n` +
      `  propertyRanges: ${extracted.propertyRanges.size}`
  );
};

interface Extracted {
  readonly classes: ReadonlySet<string>;
  readonly properties: ReadonlySet<string>;
  readonly propertyDomains: ReadonlyMap<string, ReadonlySet<string>>;
  readonly propertyRanges: ReadonlyMap<string, ReadonlySet<string>>;
  readonly subClassOf: ReadonlyMap<string, ReadonlySet<string>>;
}

const emitJson = (data: Extracted): string => {
  const sortedClasses = [...data.classes].sort();
  const sortedProps = [...data.properties].sort();
  const sortedSubClass = [...data.subClassOf]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, set]): [string, string[]] => [k, [...set].sort()]);
  const sortedDomains = [...data.propertyDomains]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, set]): [string, string[]] => [k, [...set].sort()]);
  const sortedRanges = [...data.propertyRanges]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, set]): [string, string[]] => [k, [...set].sort()]);

  return `${JSON.stringify(
    {
      classes: sortedClasses,
      properties: sortedProps,
      subClassOf: sortedSubClass,
      propertyDomains: sortedDomains,
      propertyRanges: sortedRanges,
    },
    null,
    0
  )}\n`;
};

const emitTs =
  (): string => `// Generated by scripts/generate-schema.ts — do not edit.
// Source: scripts/vendor/schemaorg-current-https.jsonld
//
// This shim is intentionally tiny: the vocabulary data lives in
// \`schema-vocab.json\` and is loaded at runtime via \`loadSchemaVocab\`.
// Keeping the data out of the JS bundle prevents the ~255 kB payload from
// being duplicated into every chunk that imports \`schemaVocab\`.

export interface SchemaVocab {
  readonly classes: ReadonlySet<string>;
  readonly properties: ReadonlySet<string>;
  readonly subClassOf: ReadonlyMap<string, ReadonlySet<string>>;
  readonly propertyDomains: ReadonlyMap<string, ReadonlySet<string>>;
  readonly propertyRanges: ReadonlyMap<string, ReadonlySet<string>>;
}

interface SchemaVocabRaw {
  readonly classes: readonly string[];
  readonly properties: readonly string[];
  readonly subClassOf: ReadonlyArray<readonly [string, readonly string[]]>;
  readonly propertyDomains: ReadonlyArray<readonly [string, readonly string[]]>;
  readonly propertyRanges: ReadonlyArray<readonly [string, readonly string[]]>;
}

/** Fetches the raw vocab JSON payload as an object. */
export type VocabLoader = () => Promise<SchemaVocabRaw>;

const toVocab = (raw: SchemaVocabRaw): SchemaVocab =>
  Object.freeze({
    classes: new Set(raw.classes),
    properties: new Set(raw.properties),
    subClassOf: new Map(raw.subClassOf.map(([k, v]) => [k, new Set(v)])),
    propertyDomains: new Map(
      raw.propertyDomains.map(([k, v]) => [k, new Set(v)])
    ),
    propertyRanges: new Map(
      raw.propertyRanges.map(([k, v]) => [k, new Set(v)])
    ),
  });

let loaded: SchemaVocab | null = null;
let pending: Promise<SchemaVocab> | null = null;

/**
 * Load the schema.org vocabulary once per JS realm. Subsequent calls return
 * the cached instance. Must be awaited (or have completed) before any sync
 * access to \`schemaVocab\`.
 */
export const loadSchemaVocab = (loader: VocabLoader): Promise<SchemaVocab> => {
  if (loaded !== null) {
    return Promise.resolve(loaded);
  }
  if (pending !== null) {
    return pending;
  }
  pending = loader().then((raw) => {
    loaded = toVocab(raw);
    return loaded;
  });
  return pending;
};

/** Returns the cached vocab, or null if \`loadSchemaVocab\` has not resolved yet. */
export const tryGetSchemaVocab = (): SchemaVocab | null => loaded;

const throwUnloaded = (): never => {
  throw new Error(
    "schemaVocab accessed before loadSchemaVocab() resolved. " +
      "Call loadSchemaVocab(...) during startup and await it before running audits."
  );
};

const handler: ProxyHandler<SchemaVocab> = {
  get: (_target, prop, receiver) => {
    if (loaded === null) {
      throwUnloaded();
    }
    return Reflect.get(loaded as SchemaVocab, prop, receiver);
  },
  has: (_target, prop) => {
    if (loaded === null) {
      throwUnloaded();
    }
    return Reflect.has(loaded as SchemaVocab, prop);
  },
  ownKeys: () => {
    if (loaded === null) {
      throwUnloaded();
    }
    return Reflect.ownKeys(loaded as SchemaVocab);
  },
  getOwnPropertyDescriptor: (_target, prop) => {
    if (loaded === null) {
      throwUnloaded();
    }
    return Reflect.getOwnPropertyDescriptor(loaded as SchemaVocab, prop);
  },
};

/**
 * Synchronous accessor for the loaded vocab. Throws if \`loadSchemaVocab\` has
 * not resolved yet. Existing call sites read \`schemaVocab.classes\` etc.
 * unchanged.
 */
export const schemaVocab: SchemaVocab = new Proxy({} as SchemaVocab, handler);
`;

main();
