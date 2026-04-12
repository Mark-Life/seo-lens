/**
 * Generates `src/generated/schema-vocab.ts` from the vendored schema.org JSON-LD.
 *
 * Extracts:
 * - classes: schema: namespaced `rdfs:Class` entries
 * - properties: schema: namespaced `rdf:Property` entries
 * - subClassOf: child -> all schema: parents (DAG walked at query time)
 * - propertyDomains: property -> schema: classes from `schema:domainIncludes`
 * - propertyRanges: property -> schema: classes from `schema:rangeIncludes`
 *
 * Usage:
 *   `bun run update-schema` — regenerates `schema-vocab.ts` from the vendor file.
 *   `bun run update-schema -- --check` — regenerates into memory and diffs against
 *     the committed file; exits non-zero on mismatch. Used in CI to catch drift.
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
const OUT_PATH = join(PKG_DIR, "src/generated/schema-vocab.ts");

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

const main = () => {
  const checkMode = process.argv.includes("--check");

  const raw = readFileSync(VENDOR_PATH, "utf8");
  const doc = JSON.parse(raw) as Doc;
  const graph = doc["@graph"];

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

  if (classes.size < 800) {
    throw new Error(`Expected >800 classes, got ${classes.size}`);
  }

  const out = emit({
    classes,
    properties,
    subClassOf,
    propertyDomains,
    propertyRanges,
  });

  if (checkMode) {
    const existing = readFileSync(OUT_PATH, "utf8");
    if (existing !== out) {
      console.error(
        `schema-vocab.ts is stale relative to ${VENDOR_PATH}.\n` +
          "Run `bun run update-schema` in packages/seo-rules and commit the result."
      );
      process.exit(1);
    }
    console.log(`schema-vocab.ts up to date (${classes.size} classes).`);
    return;
  }

  writeFileSync(OUT_PATH, out);

  console.log(
    `generated ${OUT_PATH}\n` +
      `  classes: ${classes.size}\n` +
      `  properties: ${properties.size}\n` +
      `  subClassOf edges: ${subClassOf.size}\n` +
      `  propertyDomains: ${propertyDomains.size}\n` +
      `  propertyRanges: ${propertyRanges.size}`
  );
};

interface Extracted {
  readonly classes: ReadonlySet<string>;
  readonly properties: ReadonlySet<string>;
  readonly propertyDomains: ReadonlyMap<string, ReadonlySet<string>>;
  readonly propertyRanges: ReadonlyMap<string, ReadonlySet<string>>;
  readonly subClassOf: ReadonlyMap<string, ReadonlySet<string>>;
}

const emit = (data: Extracted): string => {
  const sortedClasses = [...data.classes].sort();
  const sortedProps = [...data.properties].sort();
  const sortedSubClass = [...data.subClassOf].sort(([a], [b]) =>
    a.localeCompare(b)
  );
  const sortedDomains = [...data.propertyDomains].sort(([a], [b]) =>
    a.localeCompare(b)
  );
  const sortedRanges = [...data.propertyRanges].sort(([a], [b]) =>
    a.localeCompare(b)
  );

  const stringList = (xs: readonly string[]) =>
    xs.map((x) => `  ${JSON.stringify(x)},`).join("\n");
  const setPairList = (
    xs: readonly (readonly [string, ReadonlySet<string>])[]
  ) =>
    xs
      .map(([k, set]) => {
        const members = [...set]
          .sort()
          .map((m) => JSON.stringify(m))
          .join(", ");
        return `  [${JSON.stringify(k)}, new Set([${members}])],`;
      })
      .join("\n");

  return `// Generated by scripts/generate-schema.ts — do not edit.
// Source: scripts/vendor/schemaorg-current-https.jsonld

export interface SchemaVocab {
  readonly classes: ReadonlySet<string>;
  readonly properties: ReadonlySet<string>;
  readonly subClassOf: ReadonlyMap<string, ReadonlySet<string>>;
  readonly propertyDomains: ReadonlyMap<string, ReadonlySet<string>>;
  readonly propertyRanges: ReadonlyMap<string, ReadonlySet<string>>;
}

const classes: ReadonlySet<string> = new Set([
${stringList(sortedClasses)}
]);

const properties: ReadonlySet<string> = new Set([
${stringList(sortedProps)}
]);

const subClassOf: ReadonlyMap<string, ReadonlySet<string>> = new Map([
${setPairList(sortedSubClass)}
]);

const propertyDomains: ReadonlyMap<string, ReadonlySet<string>> = new Map([
${setPairList(sortedDomains)}
]);

const propertyRanges: ReadonlyMap<string, ReadonlySet<string>> = new Map([
${setPairList(sortedRanges)}
]);

export const schemaVocab: SchemaVocab = Object.freeze({
  classes,
  properties,
  subClassOf,
  propertyDomains,
  propertyRanges,
});
`;
};

main();
