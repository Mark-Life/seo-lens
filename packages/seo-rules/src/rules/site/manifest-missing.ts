import {
  AuditFinding,
  type PageData,
  type PageSignals,
  RuleId,
  type SiteSignals,
} from "../../schema";
import type { AuditRule } from "../../types";

const ruleId = RuleId.make("site.manifest-missing");

export const siteManifestMissingRule: AuditRule = {
  id: ruleId,
  name: "Web app manifest missing",
  description: "Info when no web app manifest can be discovered",
  category: "site",
  weight: 1,
  run(_page: PageData, _signals: PageSignals, siteSignals?: SiteSignals) {
    if (!siteSignals || siteSignals.manifest) {
      return [];
    }
    return [
      AuditFinding.make({
        id: `${ruleId}#missing`,
        ruleId,
        category: "site",
        severity: "info",
        title: "No web app manifest discovered",
        message:
          "No /site.webmanifest or /manifest.json was found. A manifest improves installability and PWA behavior.",
      }),
    ];
  },
};
