import { Either, ParseResult, Schema } from "effect";
import { schemaVocab } from "../generated/schema-vocab";
import {
  type SpecDeprecated,
  type SpecRestricted,
  specsByType,
} from "./registry";

export interface FieldError {
  readonly message: string;
  readonly path: string;
}

/**
 * A top-level field the spec expects but the raw block is missing.
 * Drives the "show suggestions" ghost-row UI.
 */
export interface FieldSuggestion {
  readonly name: string;
  readonly severity: "required" | "recommended";
}

export interface RichResultsReport {
  readonly deprecated?: SpecDeprecated;
  readonly docUrl: string;
  readonly recommendedErrors: readonly FieldError[];
  readonly requiredErrors: readonly FieldError[];
  readonly restricted?: SpecRestricted;
  readonly spec: string;
  readonly suggestions: readonly FieldSuggestion[];
}

/** JSON-pointer-escape a single path segment (RFC 6901). */
const escapePointerSegment = (segment: string): string =>
  segment.replace(/~/g, "~0").replace(/\//g, "~1");

const toPointer = (path: readonly PropertyKey[]): string => {
  if (path.length === 0) {
    return "";
  }
  return path.map((seg) => `/${escapePointerSegment(String(seg))}`).join("");
};

const toFieldErrors = (
  issues: readonly ParseResult.ArrayFormatterIssue[]
): FieldError[] =>
  issues.map((issue) => ({
    path: toPointer(issue.path),
    message: issue.message,
  }));

const decodeIssues = (
  schema: Schema.Schema.AnyNoContext,
  raw: unknown
): FieldError[] => {
  const result = Schema.decodeUnknownEither(schema)(raw, { errors: "all" });
  if (Either.isRight(result)) {
    return [];
  }
  return toFieldErrors(ParseResult.ArrayFormatter.formatErrorSync(result.left));
};

/**
 * Non-optional top-level property names in a Struct spec. Skips `@`-prefixed
 * keys and anything not declared as a plain `PropertySignature`.
 */
const topLevelFields = (schema: Schema.Schema.AnyNoContext): string[] => {
  const ast = schema.ast;
  if (ast._tag !== "TypeLiteral") {
    return [];
  }
  const out: string[] = [];
  for (const sig of ast.propertySignatures) {
    if (sig.isOptional) {
      continue;
    }
    const name = String(sig.name);
    if (name.startsWith("@")) {
      continue;
    }
    out.push(name);
  }
  return out;
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const collectSuggestions = (
  spec: {
    readonly required: Schema.Schema.AnyNoContext;
    readonly recommended: Schema.Schema.AnyNoContext;
  },
  raw: unknown
): FieldSuggestion[] => {
  const present = isRecord(raw) ? new Set(Object.keys(raw)) : new Set<string>();
  const out: FieldSuggestion[] = [];
  for (const name of topLevelFields(spec.required)) {
    if (!present.has(name)) {
      out.push({ name, severity: "required" });
    }
  }
  for (const name of topLevelFields(spec.recommended)) {
    if (!present.has(name)) {
      out.push({ name, severity: "recommended" });
    }
  }
  return out;
};

/**
 * Walk `type` and its schema.org ancestors (DAG BFS) looking for a registered
 * spec. Returns the closest match by BFS order, or null.
 */
const resolveSpec = (type: string) => {
  const direct = specsByType.get(type);
  if (direct !== undefined) {
    return direct;
  }
  const seen = new Set<string>([type]);
  const queue: string[] = [type];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    const parents = schemaVocab.subClassOf.get(current);
    if (parents === undefined) {
      continue;
    }
    for (const p of parents) {
      if (seen.has(p)) {
        continue;
      }
      const hit = specsByType.get(p);
      if (hit !== undefined) {
        return hit;
      }
      seen.add(p);
      queue.push(p);
    }
  }
  return null;
};

/**
 * Validate a raw JSON-LD block against its Google Rich Results spec.
 * Returns null when no spec is registered for the type (or any ancestor).
 */
export const validateBlock = (
  raw: unknown,
  type: string
): RichResultsReport | null => {
  const spec = resolveSpec(type);
  if (spec === null) {
    return null;
  }
  return {
    spec: spec.type,
    docUrl: spec.docUrl,
    requiredErrors: decodeIssues(spec.required, raw),
    recommendedErrors: decodeIssues(spec.recommended, raw),
    suggestions: collectSuggestions(spec, raw),
    ...(spec.deprecated ? { deprecated: spec.deprecated } : {}),
    ...(spec.restricted ? { restricted: spec.restricted } : {}),
  };
};
