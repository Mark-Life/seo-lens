import { detectPageKind } from "../../detect/page-kind";
import { type PageData, type PageSignals, RuleId } from "../../schema";
import type { AuditRule } from "../../types";
import {
  buildRecommendationContext,
  collectAllJsonLdTypes,
  hasAnyType,
  makeRecommendFinding,
  WEBSITE_JSONLD_TYPES,
  WEBSITE_TEMPLATE,
  wantsRecommendation,
} from "./shared";

const RULE_ID = RuleId.make("structured.recommend-website");

export const recommendWebsiteRule: AuditRule = {
  id: RULE_ID,
  name: "Recommend WebSite JSON-LD",
  description:
    "Suggests WebSite JSON-LD on homepages that lack it, enabling sitelinks search box",
  category: "structured",
  weight: 1,
  run(page: PageData, signals: PageSignals) {
    const declared = collectAllJsonLdTypes(page.jsonLd);
    if (hasAnyType(declared, WEBSITE_JSONLD_TYPES)) {
      return [];
    }
    const candidates = detectPageKind(page, signals);
    const matched = wantsRecommendation(candidates, "website");
    if (matched === undefined) {
      return [];
    }
    return [
      makeRecommendFinding({
        ruleId: RULE_ID,
        category: "structured",
        severity: "info",
        title: "Consider adding WebSite JSON-LD",
        message:
          "This looks like the site root. Adding WebSite structured data lets Google show a sitelinks search box for your site.",
        context: buildRecommendationContext(WEBSITE_TEMPLATE, matched.reasons),
      }),
    ];
  },
};
