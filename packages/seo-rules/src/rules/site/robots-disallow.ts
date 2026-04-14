import {
  AuditFinding,
  FindingContext,
  type PageData,
  type PageSignals,
  RuleId,
  type SiteSignals,
} from "../../schema";
import type { AuditRule } from "../../types";
import { isPathDisallowed } from "./robots-matcher";

const ruleId = RuleId.make("site.robots-disallow");

export const siteRobotsDisallowRule: AuditRule = {
  id: ruleId,
  name: "Page blocked by robots.txt",
  description:
    "Checks if the current page path is disallowed by the site's robots.txt",
  category: "site",
  weight: 8,
  run(page: PageData, _signals: PageSignals, siteSignals?: SiteSignals) {
    const robots = siteSignals?.robots;
    if (!robots) {
      return [];
    }
    let path: string;
    try {
      path = new URL(page.url).pathname;
    } catch {
      return [];
    }
    const match = isPathDisallowed(robots, path, "*");
    if (!match.disallowed) {
      return [];
    }
    return [
      AuditFinding.make({
        id: `${ruleId}#disallowed`,
        ruleId,
        category: "site",
        severity: "error",
        title: "Page is disallowed by robots.txt",
        message:
          "This URL matches a Disallow rule in the site's robots.txt and will not be crawled by compliant bots.",
        context: [
          FindingContext.make({ label: "path", value: path }),
          FindingContext.make({
            label: "pattern",
            value: match.pattern ?? "",
          }),
          FindingContext.make({
            label: "user-agent",
            value: match.userAgentGroup ?? "*",
          }),
          FindingContext.make({ label: "robots.txt", value: robots.url }),
        ],
        grep: match.pattern ?? undefined,
      }),
    ];
  },
};
