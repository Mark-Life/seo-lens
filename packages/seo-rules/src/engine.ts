import type { AuditFinding, AuditResult, AuditRule, PageData } from "./types";

const WARNING_PENALTY = 0.5;
const MAX_SCORE = 100;
const DEFAULT_SCORE = 100;

export function runAudit(page: PageData, rules: AuditRule[]): AuditResult {
  const findings: AuditFinding[] = [];
  let totalWeight = 0;
  let earnedWeight = 0;

  for (const rule of rules) {
    const ruleFindings = rule.run(page);
    findings.push(...ruleFindings);

    totalWeight += rule.weight;
    const hasErrors = ruleFindings.some((f) => f.severity === "error");
    const hasWarnings = ruleFindings.some((f) => f.severity === "warning");

    if (hasErrors) {
      // No credit for errors
    } else if (hasWarnings) {
      earnedWeight += rule.weight * WARNING_PENALTY;
    } else {
      earnedWeight += rule.weight;
    }
  }

  const score =
    totalWeight > 0
      ? Math.round((earnedWeight / totalWeight) * MAX_SCORE)
      : DEFAULT_SCORE;

  return {
    url: page.url,
    score,
    findings,
    timestamp: Date.now(),
  };
}
