import { detectPageKind } from "../../detect/page-kind";
import { type PageData, type PageSignals, RuleId } from "../../schema";
import type { AuditRule } from "../../types";
import {
  BREADCRUMB_JSONLD_TYPES,
  BREADCRUMB_TEMPLATE,
  buildRecommendationContext,
  collectAllJsonLdTypes,
  hasAnyType,
  makeRecommendFinding,
  wantsRecommendation,
} from "./shared";

const RULE_ID = RuleId.make("structured.recommend-breadcrumb");

export const recommendBreadcrumbRule: AuditRule = {
  id: RULE_ID,
  name: "Recommend BreadcrumbList JSON-LD",
  description:
    "Suggests BreadcrumbList JSON-LD when breadcrumb DOM is present but no structured breadcrumbs are declared",
  category: "structured",
  weight: 1,
  run(page: PageData, signals: PageSignals) {
    const declared = collectAllJsonLdTypes(page.jsonLd);
    if (hasAnyType(declared, BREADCRUMB_JSONLD_TYPES)) {
      return [];
    }
    const candidates = detectPageKind(page, signals);
    const matched = wantsRecommendation(candidates, "breadcrumb");
    if (matched === undefined) {
      return [];
    }
    return [
      makeRecommendFinding({
        ruleId: RULE_ID,
        category: "structured",
        severity: "info",
        title: "Consider adding BreadcrumbList JSON-LD",
        message:
          "This page shows breadcrumbs in the DOM but does not expose them as structured data. Adding BreadcrumbList makes the trail eligible for rich results.",
        context: buildRecommendationContext(
          BREADCRUMB_TEMPLATE,
          matched.reasons
        ),
      }),
    ];
  },
};
