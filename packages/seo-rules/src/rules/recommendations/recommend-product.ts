import { detectPageKind } from "../../detect/page-kind";
import { type PageData, type PageSignals, RuleId } from "../../schema";
import type { AuditRule } from "../../types";
import {
  buildRecommendationContext,
  collectAllJsonLdTypes,
  hasAnyType,
  makeRecommendFinding,
  PRODUCT_JSONLD_TYPES,
  PRODUCT_TEMPLATE,
  wantsRecommendation,
} from "./shared";

const RULE_ID = RuleId.make("structured.recommend-product");

export const recommendProductRule: AuditRule = {
  id: RULE_ID,
  name: "Recommend Product JSON-LD",
  description:
    "Suggests Product JSON-LD when the page looks like a product page and none is declared",
  category: "structured",
  weight: 1,
  run(page: PageData, signals: PageSignals) {
    const declared = collectAllJsonLdTypes(page.jsonLd);
    if (hasAnyType(declared, PRODUCT_JSONLD_TYPES)) {
      return [];
    }
    const candidates = detectPageKind(page, signals);
    const matched = wantsRecommendation(candidates, "product");
    if (matched === undefined) {
      return [];
    }
    return [
      makeRecommendFinding({
        ruleId: RULE_ID,
        category: "structured",
        severity: "info",
        title: "Consider adding Product JSON-LD",
        message:
          "This page looks like a product. Adding Product + Offer structured data enables price, availability and rating in rich results.",
        context: buildRecommendationContext(PRODUCT_TEMPLATE, matched.reasons),
      }),
    ];
  },
};
