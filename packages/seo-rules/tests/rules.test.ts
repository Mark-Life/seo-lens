import { describe, expect, it } from "@effect/vitest";
import { headingsRule } from "../src/rules/headings.js";
import { headingsSkipRule } from "../src/rules/headings-skip.js";
import { imagesAltRule } from "../src/rules/images-alt.js";
import { canonicalRule, robotsRule } from "../src/rules/indexing.js";
import { metaDescriptionRule } from "../src/rules/meta-description.js";
import {
  structuredRichResultsRecommendedRule,
  structuredRichResultsRequiredRule,
  structuredUnknownTypeRule,
  structuredValidRule,
} from "../src/rules/structured.js";
import { titleRule } from "../src/rules/title.js";
import {
  AuditRootInfo,
  type FindingContext,
  HeadingData,
  ImageData,
  PageData,
  PageUrl,
  type Severity,
} from "../src/schema.js";
import type { AuditRule } from "../src/types.js";

const makePage = (
  overrides: Partial<{
    title: string;
    metaDescription: string;
    canonical: string | null;
    robotsMeta: string | null;
    headings: readonly HeadingData[];
    images: readonly ImageData[];
    jsonLd: readonly unknown[];
  }> = {}
): PageData =>
  PageData.make({
    url: PageUrl.make("https://example.com/"),
    title: "",
    metaDescription: "",
    canonical: null,
    robotsMeta: null,
    headings: [],
    images: [],
    links: [],
    openGraph: {},
    twitterCard: {},
    jsonLd: [],
    auditRoot: AuditRootInfo.make({ selector: "body", source: "body" }),
    ...overrides,
  });

interface RuleCase {
  readonly expected: readonly {
    readonly idSuffix: string;
    readonly severity: Severity;
  }[];
  readonly name: string;
  readonly page: PageData;
}

const runTable = (rule: AuditRule, cases: readonly RuleCase[]) => {
  it.each(cases)("$name", ({ page, expected }) => {
    const findings = rule.run(page);
    expect(findings).toHaveLength(expected.length);
    expected.forEach((e, i) => {
      const f = findings[i];
      expect(f?.severity).toBe(e.severity);
      expect(f?.id.endsWith(e.idSuffix)).toBe(true);
      expect(f?.ruleId).toBe(rule.id);
      expect(f?.category).toBe(rule.category);
    });
  });
};

describe("titleRule", () => {
  const longTitle = "x".repeat(80);
  runTable(titleRule, [
    {
      name: "missing → error",
      page: makePage({ title: "" }),
      expected: [{ severity: "error", idSuffix: "#missing" }],
    },
    {
      name: "too short → warning",
      page: makePage({ title: "Short title" }),
      expected: [{ severity: "warning", idSuffix: "#too-short" }],
    },
    {
      name: "too long → warning",
      page: makePage({ title: longTitle }),
      expected: [{ severity: "warning", idSuffix: "#too-long" }],
    },
    {
      name: "in range → pass",
      page: makePage({ title: "A perfectly reasonable page title here" }),
      expected: [{ severity: "pass", idSuffix: "#pass" }],
    },
  ]);

  it("attaches title + length context on pass", () => {
    const page = makePage({
      title: "A perfectly reasonable page title here",
    });
    const [finding] = titleRule.run(page);
    expect(finding?.context?.[0]?.label).toBe("title");
    expect(finding?.context?.[1]?.label).toBe("length");
  });

  it("sets grep to the offending title on warnings", () => {
    const page = makePage({ title: "Short title" });
    const [finding] = titleRule.run(page);
    expect(finding?.grep).toBe("Short title");
  });
});

describe("metaDescriptionRule", () => {
  const longDesc = "x".repeat(200);
  const goodDesc = "x".repeat(120);
  runTable(metaDescriptionRule, [
    {
      name: "missing → error",
      page: makePage({ metaDescription: "" }),
      expected: [{ severity: "error", idSuffix: "#missing" }],
    },
    {
      name: "too short → warning",
      page: makePage({ metaDescription: "too short" }),
      expected: [{ severity: "warning", idSuffix: "#too-short" }],
    },
    {
      name: "too long → warning",
      page: makePage({ metaDescription: longDesc }),
      expected: [{ severity: "warning", idSuffix: "#too-long" }],
    },
    {
      name: "in range → pass",
      page: makePage({ metaDescription: goodDesc }),
      expected: [{ severity: "pass", idSuffix: "#pass" }],
    },
  ]);
});

describe("headingsRule", () => {
  const h = (level: number, text: string) => HeadingData.make({ level, text });
  runTable(headingsRule, [
    {
      name: "no h1 → error",
      page: makePage({ headings: [h(2, "sub")] }),
      expected: [{ severity: "error", idSuffix: "#missing" }],
    },
    {
      name: "multiple h1 → warning",
      page: makePage({ headings: [h(1, "A"), h(1, "B")] }),
      expected: [{ severity: "warning", idSuffix: "#multiple" }],
    },
    {
      name: "single h1 → pass",
      page: makePage({ headings: [h(1, "A"), h(2, "B")] }),
      expected: [{ severity: "pass", idSuffix: "#pass" }],
    },
  ]);

  it("includes each H1 text as context when multiple", () => {
    const page = makePage({
      headings: [h(1, "First"), h(1, "Second")],
    });
    const [finding] = headingsRule.run(page);
    expect(finding?.context?.map((c: FindingContext) => c.value)).toEqual([
      "First",
      "Second",
    ]);
    expect(finding?.grep).toBe("First");
  });
});

describe("headingsSkipRule", () => {
  const h = (level: number, text: string) => HeadingData.make({ level, text });
  runTable(headingsSkipRule, [
    {
      name: "sequential → pass",
      page: makePage({ headings: [h(1, "A"), h(2, "B"), h(3, "C")] }),
      expected: [{ severity: "pass", idSuffix: "#pass" }],
    },
    {
      name: "empty → pass",
      page: makePage({ headings: [] }),
      expected: [{ severity: "pass", idSuffix: "#pass" }],
    },
    {
      name: "h2 → h4 skip → warning",
      page: makePage({ headings: [h(1, "A"), h(2, "B"), h(4, "D")] }),
      expected: [{ severity: "warning", idSuffix: "#skip" }],
    },
  ]);

  it("includes each skip in context", () => {
    const page = makePage({
      headings: [h(1, "A"), h(3, "C"), h(4, "D"), h(6, "F")],
    });
    const [finding] = headingsSkipRule.run(page);
    expect(finding?.context).toHaveLength(2);
  });
});

describe("imagesAltRule", () => {
  const img = (src: string, alt: string | null) => ImageData.make({ src, alt });
  runTable(imagesAltRule, [
    {
      name: "no images → pass",
      page: makePage({ images: [] }),
      expected: [{ severity: "pass", idSuffix: "#pass" }],
    },
    {
      name: "all alt → pass",
      page: makePage({ images: [img("/a.png", "a"), img("/b.png", "b")] }),
      expected: [{ severity: "pass", idSuffix: "#pass" }],
    },
    {
      name: "missing alt → warning",
      page: makePage({ images: [img("/a.png", "a"), img("/b.png", null)] }),
      expected: [{ severity: "warning", idSuffix: "#missing" }],
    },
    {
      name: "empty alt → warning",
      page: makePage({ images: [img("/a.png", "")] }),
      expected: [{ severity: "warning", idSuffix: "#missing" }],
    },
  ]);

  it("uses image src as grep", () => {
    const page = makePage({ images: [img("/missing.png", null)] });
    const [finding] = imagesAltRule.run(page);
    expect(finding?.grep).toBe("/missing.png");
  });
});

describe("structuredValidRule", () => {
  runTable(structuredValidRule, [
    {
      name: "no JSON-LD → info",
      page: makePage({ jsonLd: [] }),
      expected: [{ severity: "info", idSuffix: "#missing" }],
    },
    {
      name: "valid block → pass",
      page: makePage({
        jsonLd: [{ "@context": "https://schema.org", "@type": "Article" }],
      }),
      expected: [{ severity: "pass", idSuffix: "#pass" }],
    },
    {
      name: "missing @context → warning",
      page: makePage({ jsonLd: [{ "@type": "Article" }] }),
      expected: [{ severity: "warning", idSuffix: "#invalid" }],
    },
    {
      name: "missing @type → warning",
      page: makePage({
        jsonLd: [{ "@context": "https://schema.org", name: "x" }],
      }),
      expected: [{ severity: "warning", idSuffix: "#invalid" }],
    },
  ]);
});

describe("structuredUnknownTypeRule", () => {
  it("returns nothing when no JSON-LD", () => {
    expect(structuredUnknownTypeRule.run(makePage({ jsonLd: [] }))).toEqual([]);
  });

  it("passes when all types are known", () => {
    const page = makePage({
      jsonLd: [{ "@context": "https://schema.org", "@type": "Article" }],
    });
    const [finding] = structuredUnknownTypeRule.run(page);
    expect(finding?.severity).toBe("pass");
  });

  it("flags unknown @type as info", () => {
    const page = makePage({
      jsonLd: [{ "@context": "https://schema.org", "@type": "FakeType" }],
    });
    const [finding] = structuredUnknownTypeRule.run(page);
    expect(finding?.severity).toBe("info");
    expect(finding?.grep).toBe("FakeType");
  });

  it("walks nested objects", () => {
    const page = makePage({
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "Article",
          author: { "@type": "Person", name: "Jane" },
          publisher: { "@type": "MadeUp" },
        },
      ],
    });
    const [finding] = structuredUnknownTypeRule.run(page);
    expect(finding?.severity).toBe("info");
    expect(finding?.context?.[0]?.value).toBe("MadeUp");
  });
});

describe("structuredRichResultsRequiredRule", () => {
  const fullArticle = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Title",
    image: "https://example.com/a.png",
    datePublished: "2026-04-12",
    author: { "@type": "Person", name: "Jane" },
    dateModified: "2026-04-12",
    publisher: { "@type": "Organization", name: "Pub" },
  };

  it("returns nothing when no block matches a spec", () => {
    const page = makePage({
      jsonLd: [{ "@context": "https://schema.org", "@type": "WebPage" }],
    });
    expect(structuredRichResultsRequiredRule.run(page)).toEqual([]);
  });

  it("passes when all required fields present", () => {
    const page = makePage({ jsonLd: [fullArticle] });
    const [finding] = structuredRichResultsRequiredRule.run(page);
    expect(finding?.severity).toBe("pass");
    expect(finding?.id.endsWith("#pass")).toBe(true);
  });

  it("emits error finding when headline missing", () => {
    const { headline: _headline, ...missingHeadline } = fullArticle;
    const page = makePage({ jsonLd: [missingHeadline] });
    const [finding] = structuredRichResultsRequiredRule.run(page);
    expect(finding?.severity).toBe("error");
    expect(finding?.context?.[0]?.value).toBe("/headline");
    expect(finding?.grep).toBe("/headline");
  });

  it("matches NewsArticle via subtype", () => {
    const page = makePage({
      jsonLd: [{ ...fullArticle, "@type": "NewsArticle" }],
    });
    const [finding] = structuredRichResultsRequiredRule.run(page);
    expect(finding?.severity).toBe("pass");
  });
});

describe("structuredRichResultsRecommendedRule", () => {
  const fullArticle = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Title",
    image: "https://example.com/a.png",
    datePublished: "2026-04-12",
    author: { "@type": "Person", name: "Jane" },
    dateModified: "2026-04-12",
    publisher: { "@type": "Organization", name: "Pub" },
    mainEntityOfPage: "https://example.com/a",
    articleSection: "Tech",
    articleBody: "Body.",
    wordCount: 42,
    keywords: ["a"],
    inLanguage: "en",
    isAccessibleForFree: true,
    about: "x",
    description: "desc",
  };

  it("passes when all recommended fields present", () => {
    const page = makePage({ jsonLd: [fullArticle] });
    const [finding] = structuredRichResultsRecommendedRule.run(page);
    expect(finding?.severity).toBe("pass");
  });

  it("flags missing dateModified as info", () => {
    const { dateModified: _dateModified, ...missingDateModified } = fullArticle;
    const page = makePage({ jsonLd: [missingDateModified] });
    const [finding] = structuredRichResultsRecommendedRule.run(page);
    expect(finding?.severity).toBe("info");
    expect(finding?.context?.[0]?.value).toBe("/dateModified");
    expect(finding?.grep).toBe("/dateModified");
  });
});

describe("canonicalRule", () => {
  runTable(canonicalRule, [
    {
      name: "missing → warning",
      page: makePage({ canonical: null }),
      expected: [{ severity: "warning", idSuffix: "#missing" }],
    },
    {
      name: "valid absolute → pass",
      page: makePage({ canonical: "https://example.com/page" }),
      expected: [{ severity: "pass", idSuffix: "#pass" }],
    },
    {
      name: "valid relative → pass",
      page: makePage({ canonical: "/page" }),
      expected: [{ severity: "pass", idSuffix: "#pass" }],
    },
  ]);
});

describe("robotsRule", () => {
  runTable(robotsRule, [
    {
      name: "no robots → pass",
      page: makePage({ robotsMeta: null }),
      expected: [{ severity: "pass", idSuffix: "#pass" }],
    },
    {
      name: "index, follow → pass",
      page: makePage({ robotsMeta: "index, follow" }),
      expected: [{ severity: "pass", idSuffix: "#pass" }],
    },
    {
      name: "noindex → error",
      page: makePage({ robotsMeta: "noindex, follow" }),
      expected: [{ severity: "error", idSuffix: "#noindex" }],
    },
    {
      name: "none → error",
      page: makePage({ robotsMeta: "none" }),
      expected: [{ severity: "error", idSuffix: "#noindex" }],
    },
    {
      name: "nofollow → warning",
      page: makePage({ robotsMeta: "index, nofollow" }),
      expected: [{ severity: "warning", idSuffix: "#nofollow" }],
    },
  ]);
});
