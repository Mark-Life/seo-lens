import {
  AuditFinding,
  FindingContext,
  type PageData,
  type PageSignals,
  RuleId,
  type SiteSignals,
} from "../../schema";
import type { AuditRule } from "../../types";

const ruleId = RuleId.make("site.soft-404");

export const siteSoft404Rule: AuditRule = {
  id: ruleId,
  name: "Soft 404 detected",
  description:
    "Errors when a probe to a random nonexistent path returns 200 instead of 404",
  category: "site",
  weight: 6,
  run(_page: PageData, _signals: PageSignals, siteSignals?: SiteSignals) {
    const probe = siteSignals?.softFourOhFour;
    if (!probe?.isSoftFourOhFour) {
      return [];
    }
    return [
      AuditFinding.make({
        id: `${ruleId}#detected`,
        ruleId,
        category: "site",
        severity: "error",
        title: "Site returns soft 404 for unknown paths",
        message:
          "A request to a random nonexistent URL returned a 2xx response instead of 404/410. Search engines may index fake pages.",
        context: [
          FindingContext.make({ label: "probe url", value: probe.probeUrl }),
          FindingContext.make({
            label: "status",
            value: String(probe.status),
          }),
        ],
      }),
    ];
  },
};
