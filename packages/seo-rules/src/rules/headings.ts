import { AuditFinding, FindingContext, type PageData, RuleId } from "../schema";
import type { AuditRule } from "../types";

const RULE_ID = RuleId.make("headings.single-h1");

export const headingsRule: AuditRule = {
  id: RULE_ID,
  name: "Heading Structure",
  description: "Validates that the page has exactly one H1 heading",
  category: "headings",
  weight: 7,
  run(page: PageData) {
    const h1s = page.headings.filter((h) => h.level === 1);

    if (h1s.length === 0) {
      return [
        AuditFinding.make({
          id: `${RULE_ID}#missing`,
          ruleId: RULE_ID,
          category: "headings",
          severity: "error",
          title: "Missing H1",
          message: "Page is missing an H1 heading.",
        }),
      ];
    }

    if (h1s.length > 1) {
      const context = h1s.map((h, i) =>
        FindingContext.make({ label: `H1 #${i + 1}`, value: h.text })
      );
      return [
        AuditFinding.make({
          id: `${RULE_ID}#multiple`,
          ruleId: RULE_ID,
          category: "headings",
          severity: "warning",
          title: "Multiple H1 headings",
          message: `Page has ${h1s.length} H1 headings. Only one H1 is recommended.`,
          context,
          grep: h1s[0]?.text,
        }),
      ];
    }

    return [
      AuditFinding.make({
        id: `${RULE_ID}#pass`,
        ruleId: RULE_ID,
        category: "headings",
        severity: "pass",
        title: "Single H1",
        message: "Page has exactly one H1 heading.",
        context: [
          FindingContext.make({ label: "H1", value: h1s[0]?.text ?? "" }),
        ],
      }),
    ];
  },
};
