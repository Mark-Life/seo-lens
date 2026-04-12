/**
 * Generates `src/generated/schema-vocab.ts` from the vendored schema.org JSON-LD.
 *
 * Extracts:
 * - classes: schema: namespaced `rdfs:Class` entries
 * - properties: schema: namespaced `rdf:Property` entries
 * - subClassOf: child -> first schema: parent (chain walked at query time)
 * - propertyDomains: property -> schema: classes from `schema:domainIncludes`
 * - propertyRanges: property -> schema: classes from `schema:rangeIncludes`
 *
 * Usage: `bun run update-schema` from `packages/seo-rules`.
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
  const raw = readFileSync(VENDOR_PATH, "utf8");
  const doc = JSON.parse(raw) as Doc;
  const graph = doc["@graph"];

  const classes = new Set<string>();
  const properties = new Set<string>();
  const subClassOf = new Map<string, string>();
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
      const firstSchemaParent = parents[0];
      if (firstSchemaParent) {
        subClassOf.set(localId, firstSchemaParent);
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
  readonly subClassOf: ReadonlyMap<string, string>;
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
  const pairList = (xs: readonly (readonly [string, string])[]) =>
    xs
      .map(([k, v]) => `  [${JSON.stringify(k)}, ${JSON.stringify(v)}],`)
      .join("\n");
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
  readonly subClassOf: ReadonlyMap<string, string>;
  readonly propertyDomains: ReadonlyMap<string, ReadonlySet<string>>;
  readonly propertyRanges: ReadonlyMap<string, ReadonlySet<string>>;
}

const classes: ReadonlySet<string> = new Set([
${stringList(sortedClasses)}
]);

const properties: ReadonlySet<string> = new Set([
${stringList(sortedProps)}
]);

const subClassOf: ReadonlyMap<string, string> = new Map([
${pairList(sortedSubClass)}
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
