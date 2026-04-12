import { AuditFinding, FindingContext, type PageData, RuleId } from "../schema";
import type { AuditRule } from "../types";

const RULE_ID = RuleId.make("headings.skip-level");

export const headingsSkipRule: AuditRule = {
  id: RULE_ID,
  name: "Heading Hierarchy",
  description: "Validates that heading levels do not skip (e.g., H2 → H4)",
  category: "headings",
  weight: 5,
  run(page: PageData) {
    const skips: { from: number; to: number; text: string }[] = [];
    let prev = 0;
    for (const heading of page.headings) {
      if (prev !== 0 && heading.level > prev + 1) {
        skips.push({ from: prev, to: heading.level, text: heading.text });
      }
      prev = heading.level;
    }

    if (skips.length === 0) {
      return [
        AuditFinding.make({
          id: `${RULE_ID}#pass`,
          ruleId: RULE_ID,
          category: "headings",
          severity: "pass",
          title: "Heading hierarchy is sequential",
          message: "Heading levels do not skip.",
        }),
      ];
    }

    const context = skips.map((s, i) =>
      FindingContext.make({
        label: `Skip #${i + 1}`,
        value: `H${s.from} → H${s.to}: "${s.text}"`,
      })
    );

    return [
      AuditFinding.make({
        id: `${RULE_ID}#skip`,
        ruleId: RULE_ID,
        category: "headings",
        severity: "warning",
        title: "Heading levels skipped",
        message: `Found ${skips.length} heading level skip${skips.length === 1 ? "" : "s"}.`,
        context,
        grep: skips[0]?.text,
      }),
    ];
  },
};
