import type { Schema } from "effect";
import { specs } from "./specs";

/**
 * Metadata for a schema.org type whose Google rich result has been removed
 * entirely. Markup may still be valid for non-Google surfaces (Bing, AI, voice).
 */
export interface SpecDeprecated {
  readonly reason: string;
  readonly since: string;
}

/**
 * Metadata for a schema.org type whose Google rich result is still active
 * but only shown for a restricted subset of sites (e.g. FAQPage → gov/health).
 */
export interface SpecRestricted {
  readonly reason: string;
  readonly since: string;
}

/**
 * A Google Rich Results spec for a schema.org type.
 * `required` and `recommended` are Effect Schemas decoded against the raw
 * JSON-LD block; failures surface as findings in the Inspect and Findings tabs.
 */
export interface RichResultSpec {
  readonly deprecated?: SpecDeprecated;
  readonly docUrl: string;
  readonly recommended: Schema.Schema.AnyNoContext;
  readonly required: Schema.Schema.AnyNoContext;
  readonly restricted?: SpecRestricted;
  readonly subtypes: readonly string[];
  readonly type: string;
}

const buildSpecsByType = (): ReadonlyMap<string, RichResultSpec> => {
  const map = new Map<string, RichResultSpec>();
  for (const spec of specs) {
    map.set(spec.type, spec);
    for (const sub of spec.subtypes) {
      map.set(sub, spec);
    }
  }
  return map;
};

/** Index of schema.org `@type` (including registered subtypes) → spec. */
export const specsByType: ReadonlyMap<string, RichResultSpec> =
  buildSpecsByType();
