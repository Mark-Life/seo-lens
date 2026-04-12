import { AuditFinding, FindingContext, type PageData, RuleId } from "../schema";
import type { AuditRule } from "../types";

const MIN_TITLE_LENGTH = 30;
const MAX_TITLE_LENGTH = 60;

const RULE_ID = RuleId.make("meta.title-length");

export const titleRule: AuditRule = {
  id: RULE_ID,
  name: "Page Title",
  description: "Validates page title existence and length",
  category: "meta",
  weight: 10,
  run(page: PageData) {
    const title = page.title.trim();

    if (!title) {
      return [
        AuditFinding.make({
          id: `${RULE_ID}#missing`,
          ruleId: RULE_ID,
          category: "meta",
          severity: "error",
          title: "Missing page title",
          message: "Page is missing a <title> tag.",
        }),
      ];
    }

    const length = title.length;
    const context = [
      FindingContext.make({ label: "title", value: title }),
      FindingContext.make({ label: "length", value: String(length) }),
    ];

    if (length < MIN_TITLE_LENGTH) {
      return [
        AuditFinding.make({
          id: `${RULE_ID}#too-short`,
          ruleId: RULE_ID,
          category: "meta",
          severity: "warning",
          title: "Title too short",
          message: `Title is ${length} chars (recommended ${MIN_TITLE_LENGTH}–${MAX_TITLE_LENGTH}).`,
          context,
          grep: title,
        }),
      ];
    }

    if (length > MAX_TITLE_LENGTH) {
      return [
        AuditFinding.make({
          id: `${RULE_ID}#too-long`,
          ruleId: RULE_ID,
          category: "meta",
          severity: "warning",
          title: "Title too long",
          message: `Title is ${length} chars (recommended ${MIN_TITLE_LENGTH}–${MAX_TITLE_LENGTH}).`,
          context,
          grep: title,
        }),
      ];
    }

    return [
      AuditFinding.make({
        id: `${RULE_ID}#pass`,
        ruleId: RULE_ID,
        category: "meta",
        severity: "pass",
        title: "Title length is good",
        message: `Title is ${length} chars.`,
        context,
      }),
    ];
  },
};
