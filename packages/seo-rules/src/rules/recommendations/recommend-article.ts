import { detectPageKind } from "../../detect/page-kind";
import { type PageData, type PageSignals, RuleId } from "../../schema";
import type { AuditRule } from "../../types";
import {
  ARTICLE_JSONLD_TYPES,
  ARTICLE_TEMPLATE,
  buildRecommendationContext,
  collectAllJsonLdTypes,
  hasAnyType,
  makeRecommendFinding,
  wantsRecommendation,
} from "./shared";

const RULE_ID = RuleId.make("structured.recommend-article");

export const recommendArticleRule: AuditRule = {
  id: RULE_ID,
  name: "Recommend Article JSON-LD",
  description:
    "Suggests Article JSON-LD when the page looks like an article and none is declared",
  category: "structured",
  weight: 1,
  run(page: PageData, signals: PageSignals) {
    const declared = collectAllJsonLdTypes(page.jsonLd);
    if (hasAnyType(declared, ARTICLE_JSONLD_TYPES)) {
      return [];
    }
    const candidates = detectPageKind(page, signals);
    const matched = wantsRecommendation(candidates, "article");
    if (matched === undefined) {
      return [];
    }
    return [
      makeRecommendFinding({
        ruleId: RULE_ID,
        category: "structured",
        severity: "info",
        title: "Consider adding Article JSON-LD",
        message:
          "This page looks like an article. Adding Article structured data helps Google surface it in rich results.",
        context: buildRecommendationContext(ARTICLE_TEMPLATE, matched.reasons),
      }),
    ];
  },
};
