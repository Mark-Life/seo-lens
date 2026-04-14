import {
  AuditFinding,
  FindingContext,
  type PageData,
  type PageSignals,
  RuleId,
  type SiteSignals,
} from "../../schema";
import type { AuditRule } from "../../types";

const ruleId = RuleId.make("site.robots-sitemap-drift");

export const siteRobotsSitemapDriftRule: AuditRule = {
  id: ruleId,
  name: "robots.txt and sitemap drift",
  description:
    "Info when sitemap URLs declared in robots.txt do not match sitemaps actually found",
  category: "site",
  weight: 2,
  run(_page: PageData, _signals: PageSignals, siteSignals?: SiteSignals) {
    if (!siteSignals?.robots) {
      return [];
    }
    const declared = new Set(siteSignals.robots.sitemapUrls.map(String));
    if (declared.size === 0) {
      return [];
    }
    const found = new Set(siteSignals.sitemaps.map((s) => String(s.url)));
    const missing = [...declared].filter((u) => !found.has(u));
    if (missing.length === 0) {
      return [];
    }
    return [
      AuditFinding.make({
        id: `${ruleId}#drift`,
        ruleId,
        category: "site",
        severity: "info",
        title: "robots.txt references sitemaps that were not resolved",
        message:
          "robots.txt declares Sitemap: URLs that could not be fetched or parsed.",
        context: [
          FindingContext.make({
            label: "declared",
            value: [...declared].join(", "),
          }),
          FindingContext.make({
            label: "not resolved",
            value: missing.join(", "),
          }),
        ],
      }),
    ];
  },
};
