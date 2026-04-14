import {
  AuditFinding,
  FindingContext,
  type PageData,
  type PageSignals,
  RuleId,
  type SiteSignals,
} from "../../schema";
import type { AuditRule } from "../../types";

const ruleId = RuleId.make("site.canonical-host-drift");

const isOk = (status: number | null): boolean =>
  status !== null && status >= 200 && status < 300;

export const siteCanonicalHostDriftRule: AuditRule = {
  id: ruleId,
  name: "Canonical host drift",
  description:
    "Warns when both www and apex (or http and https) serve 2xx without redirecting to one canonical host",
  category: "site",
  weight: 4,
  run(_page: PageData, _signals: PageSignals, siteSignals?: SiteSignals) {
    const probe = siteSignals?.hostProbe;
    if (!probe) {
      return [];
    }
    if (probe.canonicalHost) {
      return [];
    }
    const okNonRedirecting = probe.variants.filter(
      (v) => isOk(v.status) && !v.redirected
    );
    if (okNonRedirecting.length < 2) {
      return [];
    }
    const hosts = [
      ...new Set(okNonRedirecting.map((v) => `${v.scheme}://${v.host}`)),
    ];
    return [
      AuditFinding.make({
        id: `${ruleId}#drift`,
        ruleId,
        category: "site",
        severity: "warning",
        title: "No single canonical host",
        message:
          "More than one host variant serves 2xx without redirecting. Choose one canonical host and 301 the others to avoid duplicate indexing.",
        context: [
          FindingContext.make({
            label: "serving variants",
            value: hosts.join(", "),
          }),
        ],
      }),
    ];
  },
};
