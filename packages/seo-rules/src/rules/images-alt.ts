import { AuditFinding, FindingContext, type PageData, RuleId } from "../schema";
import type { AuditRule } from "../types";

const MAX_LISTED = 10;
const RULE_ID = RuleId.make("images.missing-alt");

export const imagesAltRule: AuditRule = {
  id: RULE_ID,
  name: "Image Alt Text",
  description: "Validates that all images have non-empty alt attributes",
  category: "images",
  weight: 6,
  run(page: PageData) {
    if (page.images.length === 0) {
      return [
        AuditFinding.make({
          id: `${RULE_ID}#pass`,
          ruleId: RULE_ID,
          category: "images",
          severity: "pass",
          title: "No images on page",
          message: "Page contains no <img> elements.",
        }),
      ];
    }

    const missing = page.images.filter(
      (img) => img.alt === null || img.alt.trim() === ""
    );

    if (missing.length === 0) {
      return [
        AuditFinding.make({
          id: `${RULE_ID}#pass`,
          ruleId: RULE_ID,
          category: "images",
          severity: "pass",
          title: "All images have alt text",
          message: `${page.images.length} image${page.images.length === 1 ? "" : "s"} have alt text.`,
        }),
      ];
    }

    const listed = missing.slice(0, MAX_LISTED);
    const context = listed.map((img, i) =>
      FindingContext.make({ label: `img #${i + 1}`, value: img.src })
    );
    if (missing.length > MAX_LISTED) {
      context.push(
        FindingContext.make({
          label: "…and more",
          value: `${missing.length - MAX_LISTED} additional image(s)`,
        })
      );
    }

    return [
      AuditFinding.make({
        id: `${RULE_ID}#missing`,
        ruleId: RULE_ID,
        category: "images",
        severity: "warning",
        title: "Images missing alt text",
        message: `${missing.length} of ${page.images.length} image${page.images.length === 1 ? "" : "s"} missing alt text.`,
        context,
        grep: missing[0]?.src,
      }),
    ];
  },
};
