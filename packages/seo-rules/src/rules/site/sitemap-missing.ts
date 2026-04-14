import {
  AuditFinding,
  type PageData,
  type PageSignals,
  RuleId,
  type SiteSignals,
} from "../../schema";
import type { AuditRule } from "../../types";

const ruleId = RuleId.make("site.sitemap-missing");

export const siteSitemapMissingRule: AuditRule = {
  id: ruleId,
  name: "No sitemap discovered",
  description:
    "Info when no sitemap.xml variant is discoverable and robots.txt declares none",
  category: "site",
  weight: 2,
  run(_page: PageData, _signals: PageSignals, siteSignals?: SiteSignals) {
    if (!siteSignals) {
      return [];
    }
    const hasSitemap = siteSignals.sitemaps.length > 0;
    const robotsDeclares = (siteSignals.robots?.sitemapUrls.length ?? 0) > 0;
    if (hasSitemap || robotsDeclares) {
      return [];
    }
    return [
      AuditFinding.make({
        id: `${ruleId}#missing`,
        ruleId,
        category: "site",
        severity: "info",
        title: "No sitemap discovered",
        message:
          "No sitemap.xml variant was found and robots.txt declares none. A sitemap helps search engines discover pages.",
      }),
    ];
  },
};
