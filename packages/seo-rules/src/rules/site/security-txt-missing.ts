import {
  AuditFinding,
  type PageData,
  type PageSignals,
  RuleId,
  type SiteSignals,
} from "../../schema";
import type { AuditRule } from "../../types";

const ruleId = RuleId.make("site.security-txt-missing");

export const siteSecurityTxtMissingRule: AuditRule = {
  id: ruleId,
  name: "security.txt missing",
  description: "Info when /.well-known/security.txt is absent",
  category: "site",
  weight: 1,
  run(_page: PageData, _signals: PageSignals, siteSignals?: SiteSignals) {
    if (!siteSignals || siteSignals.securityTxt) {
      return [];
    }
    return [
      AuditFinding.make({
        id: `${ruleId}#missing`,
        ruleId,
        category: "site",
        severity: "info",
        title: "security.txt is missing",
        message:
          "The site does not publish /.well-known/security.txt. Consider adding one so researchers can report vulnerabilities.",
      }),
    ];
  },
};
