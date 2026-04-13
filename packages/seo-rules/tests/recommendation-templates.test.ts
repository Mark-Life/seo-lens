import { describe, expect, it } from "@effect/vitest";
import { validateBlock } from "../src/rich-results/validate.js";
import {
  ARTICLE_TEMPLATE,
  BREADCRUMB_TEMPLATE,
  ORGANIZATION_TEMPLATE,
  PRODUCT_TEMPLATE,
  WEBSITE_TEMPLATE,
} from "../src/rules/recommendations/templates.js";

interface Case {
  readonly name: string;
  readonly template: string;
  readonly type: string;
}

const cases: readonly Case[] = [
  { name: "Article", template: ARTICLE_TEMPLATE, type: "Article" },
  { name: "Product", template: PRODUCT_TEMPLATE, type: "Product" },
  { name: "WebSite", template: WEBSITE_TEMPLATE, type: "WebSite" },
  {
    name: "Organization",
    template: ORGANIZATION_TEMPLATE,
    type: "Organization",
  },
  {
    name: "BreadcrumbList",
    template: BREADCRUMB_TEMPLATE,
    type: "BreadcrumbList",
  },
];

describe("recommendation templates", () => {
  for (const c of cases) {
    it(`${c.name} template is valid JSON`, () => {
      expect(() => JSON.parse(c.template)).not.toThrow();
    });

    it(`${c.name} template satisfies RichResultSpec required fields`, () => {
      const parsed = JSON.parse(c.template) as unknown;
      const report = validateBlock(parsed, c.type);
      expect(report).not.toBeNull();
      expect(report?.requiredErrors).toEqual([]);
    });

    it(`${c.name} template declares @context and @type`, () => {
      const parsed = JSON.parse(c.template) as Record<string, unknown>;
      expect(parsed["@context"]).toBe("https://schema.org");
      expect(parsed["@type"]).toBe(c.type);
    });
  }
});
