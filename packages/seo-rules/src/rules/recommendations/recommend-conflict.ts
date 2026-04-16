import { detectPageKind } from "../../detect/page-kind";
import { STRONG_THRESHOLD } from "../../detect/weights";
import {
  AuditFinding,
  FindingContext,
  type PageData,
  type PageKind,
  type PageKindCandidate,
  type PageSignals,
  RuleId,
} from "../../schema";
import type { AuditRule } from "../../types";
import {
  ARTICLE_JSONLD_TYPES,
  collectTopLevelJsonLdTypes,
  ORGANIZATION_JSONLD_TYPES,
  PRODUCT_JSONLD_TYPES,
  WEBSITE_JSONLD_TYPES,
} from "./shared";

const RULE_ID = RuleId.make("structured.recommend-conflict");

/**
 * Maps a declared schema.org `@type` to the `PageKind` the conflict rule
 * treats it as. Types that don't correspond to a tracked kind (e.g. `WebPage`,
 * `ItemList`) return `null` and are ignored.
 */
const kindForDeclaredType = (type: string): PageKind | null => {
  if ((ARTICLE_JSONLD_TYPES as readonly string[]).includes(type)) {
    return "article";
  }
  if ((PRODUCT_JSONLD_TYPES as readonly string[]).includes(type)) {
    return "product";
  }
  if (
    (WEBSITE_JSONLD_TYPES as readonly string[]).includes(type) ||
    (ORGANIZATION_JSONLD_TYPES as readonly string[]).includes(type)
  ) {
    return "homepage";
  }
  return null;
};

const isDisjoint = (a: PageKind, b: PageKind): boolean => {
  if (a === b) {
    return false;
  }
  return a !== "breadcrumb-bearing" && b !== "breadcrumb-bearing";
};

const topCandidate = (
  candidates: readonly PageKindCandidate[]
): PageKindCandidate | null => {
  let best: PageKindCandidate | null = null;
  for (const c of candidates) {
    if (c.kind === "breadcrumb-bearing") {
      continue;
    }
    if (best === null || c.confidence > best.confidence) {
      best = c;
    }
  }
  return best;
};

export const recommendConflictRule: AuditRule = {
  id: RULE_ID,
  name: "JSON-LD Kind Conflict",
  description:
    "Warns when declared JSON-LD @type disagrees with the detected page kind",
  category: "structured",
  weight: 1,
  run(page: PageData, signals: PageSignals) {
    const candidates = detectPageKind(page, signals);
    const top = topCandidate(candidates);
    if (top === null || top.confidence < STRONG_THRESHOLD) {
      return [];
    }

    const declared = collectTopLevelJsonLdTypes(page.jsonLd);
    let hasMatch = false;
    const conflicts: { declaredType: string; declaredKind: PageKind }[] = [];
    for (const type of declared) {
      const declaredKind = kindForDeclaredType(type);
      if (declaredKind === null) {
        continue;
      }
      if (isDisjoint(top.kind, declaredKind)) {
        conflicts.push({ declaredType: type, declaredKind });
      } else {
        hasMatch = true;
      }
    }
    if (conflicts.length === 0 || hasMatch) {
      return [];
    }

    const context = [
      FindingContext.make({ label: "detected kind", value: top.kind }),
      FindingContext.make({
        label: "confidence",
        value: top.confidence.toFixed(2),
      }),
      ...conflicts.map((c) =>
        FindingContext.make({
          label: "declared @type",
          value: `${c.declaredType} (${c.declaredKind})`,
        })
      ),
      ...top.reasons.map((r) =>
        FindingContext.make({ label: "reason", value: r })
      ),
    ];

    const types = conflicts.map((c) => c.declaredType).join(", ");
    return [
      AuditFinding.make({
        id: `${RULE_ID}#conflict`,
        ruleId: RULE_ID,
        category: "structured",
        severity: "warning",
        title: "Declared JSON-LD disagrees with page content",
        message: `Page looks like a ${top.kind} but declares ${types}. Declared schema may not match page content.`,
        context,
        grep: conflicts[0]?.declaredType,
      }),
    ];
  },
};
