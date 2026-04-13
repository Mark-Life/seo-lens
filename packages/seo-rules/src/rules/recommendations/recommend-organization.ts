import { detectPageKind } from "../../detect/page-kind";
import { type PageData, type PageSignals, RuleId } from "../../schema";
import type { AuditRule } from "../../types";
import {
  buildRecommendationContext,
  collectAllJsonLdTypes,
  hasAnyType,
  makeRecommendFinding,
  ORGANIZATION_JSONLD_TYPES,
  ORGANIZATION_TEMPLATE,
  wantsRecommendation,
} from "./shared";

const RULE_ID = RuleId.make("structured.recommend-organization");

export const recommendOrganizationRule: AuditRule = {
  id: RULE_ID,
  name: "Recommend Organization JSON-LD",
  description:
    "Suggests Organization JSON-LD on homepages that lack it, improving Google Knowledge Panel candidacy",
  category: "structured",
  weight: 1,
  run(page: PageData, signals: PageSignals) {
    const declared = collectAllJsonLdTypes(page.jsonLd);
    if (hasAnyType(declared, ORGANIZATION_JSONLD_TYPES)) {
      return [];
    }
    const candidates = detectPageKind(page, signals);
    const matched = wantsRecommendation(candidates, "organization");
    if (matched === undefined) {
      return [];
    }
    return [
      makeRecommendFinding({
        ruleId: RULE_ID,
        category: "structured",
        severity: "info",
        title: "Consider adding Organization JSON-LD",
        message:
          "This looks like the site root. Adding Organization structured data tells Google who publishes the site.",
        context: buildRecommendationContext(
          ORGANIZATION_TEMPLATE,
          matched.reasons
        ),
      }),
    ];
  },
};
