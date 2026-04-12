import {
  type RichResultsReport,
  validateBlock,
} from "../rich-results/validate";
import type { PageData } from "../schema";
import { isClass, propertyValidFor, suggestClass } from "../vocab/query";

export type { RichResultsReport } from "../rich-results/validate";

export interface NodeValidity {
  readonly note?: string;
  readonly status:
    | "ok"
    | "unknown-property"
    | "wrong-domain"
    | "missing-required";
}

export interface JsonLdObjectNode {
  readonly children: readonly JsonLdNode[];
  readonly key: string | null;
  readonly kind: "object";
  readonly path: string;
  readonly type: string | null;
  readonly validity: NodeValidity;
}

export interface JsonLdArrayNode {
  readonly items: readonly JsonLdNode[];
  readonly key: string;
  readonly kind: "array";
  readonly path: string;
}

export interface JsonLdPrimitiveNode {
  readonly key: string;
  readonly kind: "primitive";
  readonly path: string;
  readonly validity: NodeValidity;
  readonly value: string | number | boolean | null;
}

export type JsonLdNode =
  | JsonLdObjectNode
  | JsonLdArrayNode
  | JsonLdPrimitiveNode;

export interface JsonLdBlock {
  readonly id: string;
  readonly raw: unknown;
  readonly richResults: RichResultsReport | null;
  readonly root: JsonLdNode;
  readonly type: string;
  readonly typeSuggestion: string | null;
  readonly typeValid: boolean;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const escapePointer = (segment: string): string =>
  segment.replace(/~/g, "~0").replace(/\//g, "~1");

const joinPath = (parent: string, segment: string | number): string =>
  `${parent}/${typeof segment === "number" ? segment : escapePointer(segment)}`;

const okValidity: NodeValidity = { status: "ok" };

/** Resolve the schema.org `@type` of a record, or null when absent/non-string. */
const readType = (obj: Record<string, unknown>): string | null => {
  const t = obj["@type"];
  if (typeof t === "string") {
    return t;
  }
  if (Array.isArray(t)) {
    for (const inner of t) {
      if (typeof inner === "string") {
        return inner;
      }
    }
  }
  return null;
};

/**
 * Build a tree node from any JSON value.
 * @param key key under which this value sits on its parent (null at root)
 * @param value the raw JSON value
 * @param parentType the resolved schema.org `@type` of the enclosing object,
 *   used to flag properties that are not valid for that type
 * @param path JSON pointer to this node
 */
const buildNode = (
  key: string | null,
  value: unknown,
  parentType: string | null,
  path: string
): JsonLdNode => {
  if (Array.isArray(value)) {
    return {
      kind: "array",
      key: key ?? "",
      items: value.map((item, i) =>
        buildNode(String(i), item, parentType, joinPath(path, i))
      ),
      path,
    };
  }
  if (isRecord(value)) {
    const type = readType(value);
    const childParentType = type ?? parentType;
    const children: JsonLdNode[] = [];
    for (const [childKey, childValue] of Object.entries(value)) {
      if (childKey === "@context" || childKey === "@type") {
        continue;
      }
      children.push(
        buildNode(
          childKey,
          childValue,
          childParentType,
          joinPath(path, childKey)
        )
      );
    }
    const validity =
      key !== null && parentType !== null && !propertyValidFor(key, parentType)
        ? ({
            status: "unknown-property",
            note: `not valid for ${parentType} per schema.org`,
          } satisfies NodeValidity)
        : okValidity;
    return { kind: "object", key, type, children, path, validity };
  }
  const primitiveValue: string | number | boolean | null =
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
      ? value
      : null;
  const validity =
    key !== null && parentType !== null && !propertyValidFor(key, parentType)
      ? ({
          status: "unknown-property",
          note: `not valid for ${parentType} per schema.org`,
        } satisfies NodeValidity)
      : okValidity;
  return {
    kind: "primitive",
    key: key ?? "",
    value: primitiveValue,
    path,
    validity,
  };
};

export const deriveJsonLdBlocks = (page: PageData): JsonLdBlock[] =>
  page.jsonLd.map((raw, idx): JsonLdBlock => {
    const id = `ld${idx + 1}`;
    if (!isRecord(raw)) {
      return {
        id,
        root: {
          kind: "object",
          key: null,
          type: null,
          children: [],
          path: "",
          validity: okValidity,
        },
        type: "unknown",
        typeValid: false,
        typeSuggestion: null,
        richResults: null,
        raw,
      };
    }
    const resolvedType = readType(raw) ?? "unknown";
    const typeValid = isClass(resolvedType);
    const root = buildNode(null, raw, null, "") as JsonLdObjectNode;
    return {
      id,
      root,
      type: resolvedType,
      typeValid,
      typeSuggestion: typeValid ? null : suggestClass(resolvedType),
      richResults: validateBlock(raw, resolvedType),
      raw,
    };
  });
