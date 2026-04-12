import { AuditFinding, FindingContext, type PageData, RuleId } from "../schema";
import type { AuditRule } from "../types";

const MIN_DESC_LENGTH = 70;
const MAX_DESC_LENGTH = 160;

const RULE_ID = RuleId.make("meta.description-length");

export const metaDescriptionRule: AuditRule = {
  id: RULE_ID,
  name: "Meta Description",
  description: "Validates meta description existence and length",
  category: "meta",
  weight: 8,
  run(page: PageData) {
    const desc = page.metaDescription.trim();

    if (!desc) {
      return [
        AuditFinding.make({
          id: `${RULE_ID}#missing`,
          ruleId: RULE_ID,
          category: "meta",
          severity: "error",
          title: "Missing meta description",
          message: "Page is missing a meta description.",
        }),
      ];
    }

    const length = desc.length;
    const context = [
      FindingContext.make({ label: "description", value: desc }),
      FindingContext.make({ label: "length", value: String(length) }),
    ];

    if (length < MIN_DESC_LENGTH) {
      return [
        AuditFinding.make({
          id: `${RULE_ID}#too-short`,
          ruleId: RULE_ID,
          category: "meta",
          severity: "warning",
          title: "Meta description too short",
          message: `Meta description is ${length} chars (recommended ${MIN_DESC_LENGTH}–${MAX_DESC_LENGTH}).`,
          context,
          grep: desc,
        }),
      ];
    }

    if (length > MAX_DESC_LENGTH) {
      return [
        AuditFinding.make({
          id: `${RULE_ID}#too-long`,
          ruleId: RULE_ID,
          category: "meta",
          severity: "warning",
          title: "Meta description too long",
          message: `Meta description is ${length} chars (recommended ${MIN_DESC_LENGTH}–${MAX_DESC_LENGTH}).`,
          context,
          grep: desc,
        }),
      ];
    }

    return [
      AuditFinding.make({
        id: `${RULE_ID}#pass`,
        ruleId: RULE_ID,
        category: "meta",
        severity: "pass",
        title: "Meta description length is good",
        message: `Meta description is ${length} chars.`,
        context,
      }),
    ];
  },
};
