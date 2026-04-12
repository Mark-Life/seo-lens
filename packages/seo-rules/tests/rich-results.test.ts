import { describe, expect, it } from "@effect/vitest";
import { validateBlock } from "../src/rich-results/validate.js";

const baseArticle = {
  "@context": "https://schema.org",
  "@type": "Article" as const,
  headline: "Hello, world",
  image: "https://example.com/cover.jpg",
  datePublished: "2026-04-12",
  author: { "@type": "Person" as const, name: "Jane Doe" },
  dateModified: "2026-04-12",
  publisher: {
    "@type": "Organization",
    name: "Example",
    logo: { "@type": "ImageObject", url: "https://example.com/logo.png" },
  },
};

describe("validateBlock — Article spec", () => {
  it("reports no required errors when all required fields are present", () => {
    const report = validateBlock(baseArticle, "Article");
    expect(report).not.toBeNull();
    expect(report?.spec).toBe("Article");
    expect(report?.requiredErrors).toHaveLength(0);
    expect(report?.recommendedErrors).toHaveLength(0);
    expect(report?.docUrl).toContain("developers.google.com");
  });

  it("reports a FieldError at /datePublished when the field is missing", () => {
    const { datePublished: _, ...missing } = baseArticle;
    const report = validateBlock(missing, "Article");
    expect(report).not.toBeNull();
    const paths = report?.requiredErrors.map((e) => e.path) ?? [];
    expect(paths).toContain("/datePublished");
  });

  it("matches NewsArticle via registered subtype", () => {
    const news = { ...baseArticle, "@type": "NewsArticle" as const };
    const report = validateBlock(news, "NewsArticle");
    expect(report).not.toBeNull();
    expect(report?.spec).toBe("Article");
    expect(report?.requiredErrors).toHaveLength(0);
  });

  it("returns null for types with no registered spec", () => {
    const report = validateBlock({ "@type": "Person", name: "Jane" }, "Person");
    expect(report).toBeNull();
  });

  it("flags a missing recommended field as a recommendedError", () => {
    const { dateModified: _, ...noDateMod } = baseArticle;
    const report = validateBlock(noDateMod, "Article");
    const paths = report?.recommendedErrors.map((e) => e.path) ?? [];
    expect(paths).toContain("/dateModified");
    expect(report?.requiredErrors).toHaveLength(0);
  });
});
