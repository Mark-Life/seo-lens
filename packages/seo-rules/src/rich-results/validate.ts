import { Either, ParseResult, Schema } from "effect";
import { schemaVocab } from "../generated/schema-vocab";
import { specsByType } from "./registry";

export interface FieldError {
  readonly message: string;
  readonly path: string;
}

export interface RichResultsReport {
  readonly docUrl: string;
  readonly recommendedErrors: readonly FieldError[];
  readonly requiredErrors: readonly FieldError[];
  readonly spec: string;
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
 * Walk `type` and its schema.org ancestors looking for a registered spec.
 * Returns the most specific match, or null.
 */
const resolveSpec = (type: string) => {
  const direct = specsByType.get(type);
  if (direct !== undefined) {
    return direct;
  }
  const seen = new Set<string>();
  let current: string | undefined = schemaVocab.subClassOf.get(type);
  while (current !== undefined && !seen.has(current)) {
    const hit = specsByType.get(current);
    if (hit !== undefined) {
      return hit;
    }
    seen.add(current);
    current = schemaVocab.subClassOf.get(current);
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
  };
};
