import type { AuditFinding, AuditRule, PageData } from "../types";

export const headingsRule: AuditRule = {
  id: "headings",
  name: "Heading Structure",
  description: "Validates heading hierarchy (single H1, proper nesting)",
  weight: 7,
  run(page: PageData): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const h1s = page.headings.filter((h) => h.level === 1);

    if (h1s.length === 0) {
      findings.push({
        ruleId: "headings",
        severity: "error",
        message: "Page is missing an H1 heading",
      });
    } else if (h1s.length > 1) {
      findings.push({
        ruleId: "headings",
        severity: "warning",
        message: `Page has ${h1s.length} H1 headings. Only one H1 is recommended.`,
      });
    } else {
      findings.push({
        ruleId: "headings",
        severity: "pass",
        message: "Page has exactly one H1 heading",
      });
    }

    // Check for skipped heading levels (e.g., H1 -> H3 without H2)
    const levels = page.headings.map((h) => h.level);
    for (let i = 1; i < levels.length; i++) {
      const current = levels[i];
      const previous = levels[i - 1];
      if (
        current !== undefined &&
        previous !== undefined &&
        current > previous + 1
      ) {
        findings.push({
          ruleId: "headings",
          severity: "warning",
          message: `Heading level skipped: H${previous} → H${current}. This may hurt accessibility and SEO.`,
        });
        break;
      }
    }

    return findings;
  },
};
