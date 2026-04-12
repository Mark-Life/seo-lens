import { AuditFinding, FindingContext, type PageData, RuleId } from "../schema";
import type { AuditRule } from "../types";

const canonicalRuleId = RuleId.make("indexing.canonical");

export const canonicalRule: AuditRule = {
  id: canonicalRuleId,
  name: "Canonical URL",
  description: "Validates the presence and validity of a canonical URL",
  category: "indexing",
  weight: 6,
  run(page: PageData) {
    const canonical = page.canonical?.trim() ?? "";

    if (!canonical) {
      return [
        AuditFinding.make({
          id: `${canonicalRuleId}#missing`,
          ruleId: canonicalRuleId,
          category: "indexing",
          severity: "warning",
          title: "Missing canonical URL",
          message: 'Page has no <link rel="canonical"> tag.',
        }),
      ];
    }

    try {
      const parsed = new URL(canonical, page.url);
      return [
        AuditFinding.make({
          id: `${canonicalRuleId}#pass`,
          ruleId: canonicalRuleId,
          category: "indexing",
          severity: "pass",
          title: "Canonical URL present",
          message: "Page declares a canonical URL.",
          context: [
            FindingContext.make({
              label: "canonical",
              value: parsed.toString(),
            }),
          ],
        }),
      ];
    } catch {
      return [
        AuditFinding.make({
          id: `${canonicalRuleId}#invalid`,
          ruleId: canonicalRuleId,
          category: "indexing",
          severity: "error",
          title: "Invalid canonical URL",
          message: "The canonical URL could not be parsed.",
          context: [
            FindingContext.make({ label: "canonical", value: canonical }),
          ],
          grep: canonical,
        }),
      ];
    }
  },
};

const robotsRuleId = RuleId.make("indexing.robots");

export const robotsRule: AuditRule = {
  id: robotsRuleId,
  name: "Robots Directives",
  description:
    "Detects robots meta directives that block indexing or following",
  category: "indexing",
  weight: 7,
  run(page: PageData) {
    const robots = page.robotsMeta?.trim().toLowerCase() ?? "";

    if (!robots) {
      return [
        AuditFinding.make({
          id: `${robotsRuleId}#pass`,
          ruleId: robotsRuleId,
          category: "indexing",
          severity: "pass",
          title: "No robots restrictions",
          message: "Page has no robots meta tag (defaults to index, follow).",
        }),
      ];
    }

    const directives = robots
      .split(",")
      .map((d) => d.trim())
      .filter((d) => d.length > 0);
    const noindex =
      directives.includes("noindex") || directives.includes("none");
    const nofollow =
      directives.includes("nofollow") || directives.includes("none");

    const context = [FindingContext.make({ label: "robots", value: robots })];

    if (noindex) {
      return [
        AuditFinding.make({
          id: `${robotsRuleId}#noindex`,
          ruleId: robotsRuleId,
          category: "indexing",
          severity: "error",
          title: "Page is noindex",
          message: "Robots meta tag prevents this page from being indexed.",
          context,
          grep: robots,
        }),
      ];
    }

    if (nofollow) {
      return [
        AuditFinding.make({
          id: `${robotsRuleId}#nofollow`,
          ruleId: robotsRuleId,
          category: "indexing",
          severity: "warning",
          title: "Page is nofollow",
          message:
            "Robots meta tag prevents links on this page from being followed.",
          context,
          grep: robots,
        }),
      ];
    }

    return [
      AuditFinding.make({
        id: `${robotsRuleId}#pass`,
        ruleId: robotsRuleId,
        category: "indexing",
        severity: "pass",
        title: "Robots directives OK",
        message: "Robots meta tag does not block indexing or following.",
        context,
      }),
    ];
  },
};
