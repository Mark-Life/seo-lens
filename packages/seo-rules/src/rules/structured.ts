import { AuditFinding, FindingContext, type PageData, RuleId } from "../schema";
import type { AuditRule } from "../types";
import { isClass, suggestClass } from "../vocab/query";

interface JsonLdNode {
  source: Record<string, unknown>;
  type: string;
}

const collectTypes = (value: unknown, out: JsonLdNode[]): void => {
  if (value === null || typeof value !== "object") {
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectTypes(item, out);
    }
    return;
  }
  const obj = value as Record<string, unknown>;
  const t = obj["@type"];
  if (typeof t === "string") {
    out.push({ type: t, source: obj });
  } else if (Array.isArray(t)) {
    for (const inner of t) {
      if (typeof inner === "string") {
        out.push({ type: inner, source: obj });
      }
    }
  }
  for (const v of Object.values(obj)) {
    collectTypes(v, out);
  }
};

const validRuleId = RuleId.make("structured.valid-schema");

export const structuredValidRule: AuditRule = {
  id: validRuleId,
  name: "JSON-LD Validity",
  description: "Validates that JSON-LD blocks are well-formed objects",
  category: "structured",
  weight: 5,
  run(page: PageData) {
    if (page.jsonLd.length === 0) {
      return [
        AuditFinding.make({
          id: `${validRuleId}#missing`,
          ruleId: validRuleId,
          category: "structured",
          severity: "info",
          title: "No structured data",
          message: "Page has no JSON-LD blocks.",
        }),
      ];
    }

    const invalid: { index: number; reason: string }[] = [];
    page.jsonLd.forEach((block, i) => {
      if (block === null || typeof block !== "object") {
        invalid.push({ index: i, reason: "not an object" });
        return;
      }
      const obj = block as Record<string, unknown>;
      if (
        typeof obj["@context"] !== "string" &&
        !Array.isArray(obj["@context"])
      ) {
        invalid.push({ index: i, reason: "missing @context" });
        return;
      }
      const types: JsonLdNode[] = [];
      collectTypes(obj, types);
      if (types.length === 0) {
        invalid.push({ index: i, reason: "missing @type" });
      }
    });

    if (invalid.length > 0) {
      const context = invalid.map((e) =>
        FindingContext.make({
          label: `block #${e.index + 1}`,
          value: e.reason,
        })
      );
      return [
        AuditFinding.make({
          id: `${validRuleId}#invalid`,
          ruleId: validRuleId,
          category: "structured",
          severity: "warning",
          title: "Invalid JSON-LD blocks",
          message: `${invalid.length} of ${page.jsonLd.length} JSON-LD block${page.jsonLd.length === 1 ? "" : "s"} malformed.`,
          context,
        }),
      ];
    }

    return [
      AuditFinding.make({
        id: `${validRuleId}#pass`,
        ruleId: validRuleId,
        category: "structured",
        severity: "pass",
        title: "JSON-LD is valid",
        message: `${page.jsonLd.length} JSON-LD block${page.jsonLd.length === 1 ? "" : "s"} parsed successfully.`,
      }),
    ];
  },
};

const unknownRuleId = RuleId.make("structured.unknown-type");

export const structuredUnknownTypeRule: AuditRule = {
  id: unknownRuleId,
  name: "JSON-LD Recognized Types",
  description: "Flags JSON-LD @types not found in the schema.org vocabulary",
  category: "structured",
  weight: 3,
  run(page: PageData) {
    if (page.jsonLd.length === 0) {
      return [];
    }

    const types: JsonLdNode[] = [];
    for (const block of page.jsonLd) {
      collectTypes(block, types);
    }

    if (types.length === 0) {
      return [];
    }

    const unknown = types.filter((t) => !isClass(t.type));
    if (unknown.length === 0) {
      return [
        AuditFinding.make({
          id: `${unknownRuleId}#pass`,
          ruleId: unknownRuleId,
          category: "structured",
          severity: "pass",
          title: "All @types recognized",
          message: `Found ${types.length} known schema.org @type${types.length === 1 ? "" : "s"}.`,
        }),
      ];
    }

    const context = unknown.map((u, i) =>
      FindingContext.make({ label: `@type #${i + 1}`, value: u.type })
    );
    const firstHint = suggestClass(unknown[0]?.type ?? "");
    const hintSuffix = firstHint === null ? "" : ` Did you mean ${firstHint}?`;

    return [
      AuditFinding.make({
        id: `${unknownRuleId}#unknown`,
        ruleId: unknownRuleId,
        category: "structured",
        severity: "info",
        title: "Unrecognized JSON-LD @type",
        message: `${unknown.length} @type value${unknown.length === 1 ? "" : "s"} not in the schema.org vocabulary.${hintSuffix}`,
        context,
        grep: unknown[0]?.type,
      }),
    ];
  },
};
