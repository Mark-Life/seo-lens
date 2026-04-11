import type { AuditFinding, AuditRule, PageData } from "../types";

const MIN_TITLE_LENGTH = 30;
const MAX_TITLE_LENGTH = 60;

export const titleRule: AuditRule = {
  id: "title",
  name: "Page Title",
  description: "Validates page title existence and length",
  weight: 10,
  run(page: PageData): AuditFinding[] {
    const findings: AuditFinding[] = [];

    if (!page.title) {
      findings.push({
        ruleId: "title",
        severity: "error",
        message: "Page is missing a title tag",
      });
      return findings;
    }

    const { length } = page.title.trim();

    if (length < MIN_TITLE_LENGTH) {
      findings.push({
        ruleId: "title",
        severity: "warning",
        message: `Title is too short (${length} chars). Recommended: ${MIN_TITLE_LENGTH}–${MAX_TITLE_LENGTH} characters.`,
      });
    } else if (length > MAX_TITLE_LENGTH) {
      findings.push({
        ruleId: "title",
        severity: "warning",
        message: `Title is too long (${length} chars). Recommended: ${MIN_TITLE_LENGTH}–${MAX_TITLE_LENGTH} characters.`,
      });
    } else {
      findings.push({
        ruleId: "title",
        severity: "pass",
        message: `Title length is good (${length} chars)`,
      });
    }

    return findings;
  },
};
