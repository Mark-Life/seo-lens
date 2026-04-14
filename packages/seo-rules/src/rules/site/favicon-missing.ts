import {
  AuditFinding,
  type PageData,
  type PageSignals,
  RuleId,
  type SiteSignals,
} from "../../schema";
import type { AuditRule } from "../../types";

const ruleId = RuleId.make("site.favicon-missing");

export const siteFaviconMissingRule: AuditRule = {
  id: ruleId,
  name: "Favicon missing",
  description: "Info when no favicon can be resolved for the site",
  category: "site",
  weight: 1,
  run(_page: PageData, _signals: PageSignals, siteSignals?: SiteSignals) {
    if (!siteSignals) {
      return [];
    }
    if (siteSignals.favicon?.resolvable) {
      return [];
    }
    return [
      AuditFinding.make({
        id: `${ruleId}#missing`,
        ruleId,
        category: "site",
        severity: "info",
        title: "No favicon resolved",
        message:
          'Neither /favicon.ico nor any <link rel="icon"> resolves. Google uses favicons in SERP — add one.',
      }),
    ];
  },
};
