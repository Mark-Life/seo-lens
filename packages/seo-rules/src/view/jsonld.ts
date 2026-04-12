import type { PageData } from "../schema";
import { isClass, suggestClass } from "../vocab/query";

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
    const valid = isClass(type);
    const block: JsonLdBlock = {
      fields: flattenFields(raw),
      id,
      raw,
      type,
      valid,
    };
    if (!valid) {
      const hint = suggestClass(type);
      if (hint !== null) {
        block.note = `Did you mean ${hint}?`;
      }
    }
    return block;
  });
}
