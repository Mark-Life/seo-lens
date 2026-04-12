import type { PageData } from "../schema";

export interface JsonLdField {
  key: string;
  value: string;
}

export interface JsonLdBlock {
  fields: JsonLdField[];
  id: string;
  note?: string;
  raw: unknown;
  type: string;
  valid: boolean;
}

const KNOWN_TYPES: ReadonlySet<string> = new Set([
  "Article",
  "BlogPosting",
  "BreadcrumbList",
  "Event",
  "FAQPage",
  "HowTo",
  "ImageObject",
  "ItemList",
  "LocalBusiness",
  "NewsArticle",
  "Offer",
  "Organization",
  "Person",
  "Product",
  "Recipe",
  "Review",
  "SearchAction",
  "SoftwareApplication",
  "VideoObject",
  "WebPage",
  "WebSite",
]);

function levenshtein(a: string, b: string): number {
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
}

function suggest(type: string): string | null {
  let best: string | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const known of KNOWN_TYPES) {
    const d = levenshtein(type.toLowerCase(), known.toLowerCase());
    if (d < bestDist) {
      bestDist = d;
      best = known;
    }
  }
  return best !== null && bestDist > 0 && bestDist <= 2 ? best : null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function stringifyValue(v: unknown): string {
  if (v === null || v === undefined) {
    return "—";
  }
  if (typeof v === "string") {
    return v;
  }
  if (typeof v === "number" || typeof v === "boolean") {
    return String(v);
  }
  if (Array.isArray(v)) {
    return `${v.length} items`;
  }
  if (isRecord(v)) {
    const t = v["@type"];
    return typeof t === "string" ? `{${t}}` : "{…}";
  }
  return "—";
}

function flattenFields(obj: Record<string, unknown>): JsonLdField[] {
  const fields: JsonLdField[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (key === "@context" || key === "@type") {
      continue;
    }
    fields.push({ key, value: stringifyValue(value) });
  }
  return fields;
}

export function deriveJsonLdBlocks(page: PageData): JsonLdBlock[] {
  return page.jsonLd.map((raw, idx): JsonLdBlock => {
    const id = `ld${idx + 1}`;
    if (!isRecord(raw)) {
      return {
        fields: [],
        id,
        note: "not an object",
        raw,
        type: "unknown",
        valid: false,
      };
    }
    const typeRaw = raw["@type"];
    const type = typeof typeRaw === "string" ? typeRaw : "unknown";
    const valid = KNOWN_TYPES.has(type);
    const block: JsonLdBlock = {
      fields: flattenFields(raw),
      id,
      raw,
      type,
      valid,
    };
    if (!valid) {
      const hint = suggest(type);
      if (hint !== null) {
        block.note = `Did you mean ${hint}?`;
      }
    }
    return block;
  });
}
