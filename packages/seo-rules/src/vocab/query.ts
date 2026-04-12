import { schemaVocab } from "../generated/schema-vocab";

/** True when `type` is a known schema.org class. */
export const isClass = (type: string): boolean => schemaVocab.classes.has(type);

/**
 * Set of `type` plus every transitive parent in the schema.org DAG.
 * BFS over `subClassOf`, guarded against cycles. Includes `type` itself.
 */
const ancestorsOf = (type: string): ReadonlySet<string> => {
  const seen = new Set<string>([type]);
  const queue: string[] = [type];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    const parents = schemaVocab.subClassOf.get(current);
    if (parents === undefined) {
      continue;
    }
    for (const p of parents) {
      if (!seen.has(p)) {
        seen.add(p);
        queue.push(p);
      }
    }
  }
  return seen;
};

/**
 * True when `child` is `parent` or transitively subclasses it via any
 * ancestor branch of the `subClassOf` DAG.
 */
export const isSubClassOf = (child: string, parent: string): boolean => {
  if (child === parent) {
    return isClass(child);
  }
  return ancestorsOf(child).has(parent);
};

/**
 * Set of properties whose `domainIncludes` contains `type` or any ancestor.
 * Returns an empty set for unknown types.
 */
export const propertiesOf = (type: string): ReadonlySet<string> => {
  if (!isClass(type)) {
    return new Set();
  }
  const ancestors = ancestorsOf(type);
  const out = new Set<string>();
  for (const [prop, domains] of schemaVocab.propertyDomains) {
    for (const d of domains) {
      if (ancestors.has(d)) {
        out.add(prop);
        break;
      }
    }
  }
  return out;
};

/**
 * True when `prop` is defined on `type` or any of its ancestors.
 * Unknown properties return true (no signal) to avoid false positives on
 * extension vocabularies; callers should check `schemaVocab.properties` first.
 */
export const propertyValidFor = (prop: string, type: string): boolean => {
  if (!schemaVocab.properties.has(prop)) {
    return true;
  }
  const domains = schemaVocab.propertyDomains.get(prop);
  if (domains === undefined || domains.size === 0) {
    return true;
  }
  for (const ancestor of ancestorsOf(type)) {
    if (domains.has(ancestor)) {
      return true;
    }
  }
  return false;
};

const levenshtein = (a: string, b: string): number => {
  const m = a.length;
  const n = b.length;
  if (m === 0) {
    return n;
  }
  if (n === 0) {
    return m;
  }
  let prev: number[] = new Array(n + 1);
  let curr: number[] = new Array(n + 1);
  for (let j = 0; j <= n; j++) {
    prev[j] = j;
  }
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      const up = (prev[j] ?? 0) + 1;
      const left = (curr[j - 1] ?? 0) + 1;
      const diag = (prev[j - 1] ?? 0) + cost;
      curr[j] = Math.min(up, left, diag);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n] ?? 0;
};

/**
 * Closest schema.org class name to `type` by Levenshtein distance (threshold 2).
 * Returns null when `type` is already a class or no candidate is close enough.
 */
export const suggestClass = (type: string): string | null => {
  if (isClass(type)) {
    return null;
  }
  const needle = type.toLowerCase();
  let best: string | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const candidate of schemaVocab.classes) {
    const d = levenshtein(needle, candidate.toLowerCase());
    if (d < bestDist) {
      bestDist = d;
      best = candidate;
    }
  }
  return best !== null && bestDist > 0 && bestDist <= 2 ? best : null;
};
