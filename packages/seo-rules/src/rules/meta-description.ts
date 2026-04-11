import type { AuditFinding, AuditRule, PageData } from "../types";

const MIN_DESC_LENGTH = 70;
const MAX_DESC_LENGTH = 160;

export const metaDescriptionRule: AuditRule = {
  id: "meta-description",
  name: "Meta Description",
  description: "Validates meta description existence and length",
  weight: 8,
  run(page: PageData): AuditFinding[] {
    const findings: AuditFinding[] = [];

    if (!page.metaDescription) {
      findings.push({
        ruleId: "meta-description",
        severity: "error",
        message: "Page is missing a meta description",
      });
      return findings;
    }

    const { length } = page.metaDescription.trim();

    if (length < MIN_DESC_LENGTH) {
      findings.push({
        ruleId: "meta-description",
        severity: "warning",
        message: `Meta description is too short (${length} chars). Recommended: ${MIN_DESC_LENGTH}–${MAX_DESC_LENGTH} characters.`,
      });
    } else if (length > MAX_DESC_LENGTH) {
      findings.push({
        ruleId: "meta-description",
        severity: "warning",
        message: `Meta description is too long (${length} chars). Recommended: ${MIN_DESC_LENGTH}–${MAX_DESC_LENGTH} characters.`,
      });
    } else {
      findings.push({
        ruleId: "meta-description",
        severity: "pass",
        message: `Meta description length is good (${length} chars)`,
      });
    }

    return findings;
  },
};
