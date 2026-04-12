import {
  type AuditFinding,
  AuditResult,
  type Category,
  CategoryScore,
  FindingCounts,
  type PageData,
  Score,
} from "./schema";
import type { AuditRule } from "./types";

const WARNING_PENALTY = 0.5;
const MAX_SCORE = 100;

export function runAudit(page: PageData, rules: AuditRule[]): AuditResult {
  const findings: AuditFinding[] = [];
  const counts = { error: 0, warning: 0, info: 0, pass: 0 };
  const byCategory = new Map<Category, { total: number; earned: number }>();
  let totalWeight = 0;
  let earnedWeight = 0;

  for (const rule of rules) {
    const ruleFindings = rule.run(page);
    findings.push(...ruleFindings);

    for (const f of ruleFindings) {
      counts[f.severity] += 1;
    }

    const hasError = ruleFindings.some((f) => f.severity === "error");
    const hasWarning = ruleFindings.some((f) => f.severity === "warning");
    let earned = rule.weight;
    if (hasError) {
      earned = 0;
    } else if (hasWarning) {
      earned = rule.weight * WARNING_PENALTY;
    }

    totalWeight += rule.weight;
    earnedWeight += earned;

    const cat = byCategory.get(rule.category) ?? { total: 0, earned: 0 };
    cat.total += rule.weight;
    cat.earned += earned;
    byCategory.set(rule.category, cat);
  }

  const overall =
    totalWeight > 0
      ? Math.round((earnedWeight / totalWeight) * MAX_SCORE)
      : MAX_SCORE;

  const categoryScores = Array.from(byCategory, ([id, { total, earned }]) =>
    CategoryScore.make({
      id,
      score: Score.make(
        total > 0 ? Math.round((earned / total) * MAX_SCORE) : MAX_SCORE
      ),
    })
  );

  return AuditResult.make({
    url: page.url,
    score: Score.make(overall),
    counts: FindingCounts.make(counts),
    categoryScores,
    findings,
    timestamp: Date.now(),
  });
}
