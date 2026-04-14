import { describe, expect, it } from "@effect/vitest";
import { detectPageKind } from "../src/detect/page-kind.js";
import { EMIT_THRESHOLD, STRONG_THRESHOLD } from "../src/detect/weights.js";
import {
  AuditRootInfo,
  BreadcrumbDom,
  BreadcrumbDomItem,
  Confidence,
  HeadingData,
  PageData,
  type PageKind,
  PageSignals,
  PageUrl,
  PricePattern,
  TimeElement,
} from "../src/schema.js";

const ZERO = Confidence.make(0);

const baseSignals = (overrides: Partial<PageSignals> = {}): PageSignals =>
  PageSignals.make({
    articleLike: ZERO,
    productLike: ZERO,
    homepageLike: ZERO,
    breadcrumbLike: ZERO,
    hasArticleElement: false,
    hasNavElement: false,
    articleTextLength: 0,
    ogType: null,
    timeElements: [],
    microdataTypes: [],
    pricePatterns: [],
    cartAffordances: [],
    breadcrumbDom: null,
    urlPathSegments: [],
    isRootPath: false,
    ...overrides,
  });

const basePage = (overrides: Partial<PageData> = {}): PageData =>
  PageData.make({
    url: PageUrl.make("https://example.com/"),
    title: "",
    metaDescription: "",
    canonical: null,
    robotsMeta: null,
    headings: [],
    images: [],
    links: [],
    headLinks: [],
    openGraph: {},
    twitterCard: {},
    jsonLd: [],
    auditRoot: AuditRootInfo.make({ selector: "body", source: "body" }),
    ...overrides,
  });

const h1 = (text: string) => HeadingData.make({ level: 1, text });

const time = (datetime: string, text = ""): TimeElement =>
  TimeElement.make({ datetime, text });

const price = (snippet: string, nearH1: boolean): PricePattern =>
  PricePattern.make({ snippet, nearH1 });

interface Case {
  readonly expectedKinds: readonly PageKind[];
  readonly name: string;
  readonly page: PageData;
  readonly signals: PageSignals;
}

const kindsOf = (page: PageData, signals: PageSignals): readonly PageKind[] =>
  detectPageKind(page, signals).map((c) => c.kind);

describe("detectPageKind", () => {
  describe("emits expected kinds", () => {
    const cases: readonly Case[] = [
      {
        name: "empty page → no candidates",
        page: basePage(),
        signals: baseSignals(),
        expectedKinds: [],
      },
      {
        name: "og:type=article + long body + <article> element → article",
        page: basePage({
          url: PageUrl.make("https://example.com/some-slug"),
          headings: [h1("Post title")],
        }),
        signals: baseSignals({
          ogType: "article",
          articleTextLength: 3000,
          hasArticleElement: true,
        }),
        expectedKinds: ["article"],
      },
      {
        name: "JSON-LD Article + long body → article",
        page: basePage({
          jsonLd: [{ "@context": "https://schema.org", "@type": "Article" }],
        }),
        signals: baseSignals({ articleTextLength: 3000 }),
        expectedKinds: ["article"],
      },
      {
        name: "JSON-LD BlogPosting nested in @graph + long body → article",
        page: basePage({
          jsonLd: [
            {
              "@context": "https://schema.org",
              "@graph": [{ "@type": "BlogPosting" }, { "@type": "WPHeader" }],
            },
          ],
        }),
        signals: baseSignals({ articleTextLength: 3000 }),
        expectedKinds: ["article"],
      },
      {
        name: "URL /blog/foo + long body → article",
        page: basePage({
          url: PageUrl.make("https://example.com/blog/my-post"),
        }),
        signals: baseSignals({ articleTextLength: 3000 }),
        expectedKinds: ["article"],
      },
      {
        name: "og:type=product + cart affordance → product",
        page: basePage(),
        signals: baseSignals({
          ogType: "product",
          cartAffordances: ["Add to cart"],
        }),
        expectedKinds: ["product"],
      },
      {
        name: "JSON-LD Product + cart affordance → product",
        page: basePage({
          jsonLd: [{ "@context": "https://schema.org", "@type": "Product" }],
        }),
        signals: baseSignals({ cartAffordances: ["Buy now"] }),
        expectedKinds: ["product"],
      },
      {
        name: "price near H1 + URL /product/x → product",
        page: basePage({
          url: PageUrl.make("https://example.com/product/widget"),
        }),
        signals: baseSignals({
          pricePatterns: [price("$19.99", true)],
        }),
        expectedKinds: ["product"],
      },
      {
        name: "root path + og:type=website → homepage",
        page: basePage({
          url: PageUrl.make("https://example.com/"),
          canonical: "https://example.com/",
        }),
        signals: baseSignals({ isRootPath: true, ogType: "website" }),
        expectedKinds: ["homepage"],
      },
      {
        name: "root path + JSON-LD WebSite → homepage",
        page: basePage({
          url: PageUrl.make("https://example.com/"),
          jsonLd: [{ "@context": "https://schema.org", "@type": "WebSite" }],
        }),
        signals: baseSignals({ isRootPath: true }),
        expectedKinds: ["homepage"],
      },
      {
        name: "breadcrumb DOM + deep URL → breadcrumb-bearing",
        page: basePage({
          url: PageUrl.make("https://example.com/a/b/c/d"),
        }),
        signals: baseSignals({
          breadcrumbDom: BreadcrumbDom.make({
            selector: "nav[aria-label=breadcrumb]",
            items: [
              BreadcrumbDomItem.make({ text: "Home", href: "/" }),
              BreadcrumbDomItem.make({ text: "A", href: "/a" }),
              BreadcrumbDomItem.make({ text: "B", href: "/a/b" }),
            ],
          }),
          urlPathSegments: ["a", "b", "c", "d"],
        }),
        expectedKinds: ["breadcrumb-bearing"],
      },
      {
        name: "product + breadcrumbs → both (orthogonal)",
        page: basePage({
          url: PageUrl.make("https://example.com/shop/widget"),
          jsonLd: [
            { "@context": "https://schema.org", "@type": "Product" },
            { "@context": "https://schema.org", "@type": "BreadcrumbList" },
          ],
        }),
        signals: baseSignals({
          cartAffordances: ["Add to cart"],
          urlPathSegments: ["shop", "widget", "variant"],
          breadcrumbDom: BreadcrumbDom.make({
            selector: "nav.breadcrumb",
            items: [
              BreadcrumbDomItem.make({ text: "Home", href: "/" }),
              BreadcrumbDomItem.make({ text: "Shop", href: "/shop" }),
              BreadcrumbDomItem.make({ text: "Widget", href: "/shop/widget" }),
            ],
          }),
        }),
        expectedKinds: ["product", "breadcrumb-bearing"],
      },
    ];

    it.each(cases)("$name", ({ page, signals, expectedKinds }) => {
      expect(kindsOf(page, signals)).toEqual(expectedKinds);
    });
  });

  describe("insufficient evidence does not emit", () => {
    const cases: readonly Case[] = [
      {
        name: "lone og:type=article (no weak) → no candidate",
        page: basePage(),
        signals: baseSignals({ ogType: "article" }),
        expectedKinds: [],
      },
      {
        name: "lone URL pattern (no weak) → no candidate",
        page: basePage({
          url: PageUrl.make("https://example.com/blog/foo"),
          headings: [h1("Title")],
        }),
        signals: baseSignals(),
        expectedKinds: [],
      },
      {
        name: "long body without any strong → no candidate",
        page: basePage({ headings: [h1("Title")] }),
        signals: baseSignals({ articleTextLength: 5000 }),
        expectedKinds: [],
      },
      {
        name: "cart affordance alone (weak only) → no product",
        page: basePage(),
        signals: baseSignals({ cartAffordances: ["Add to cart"] }),
        expectedKinds: [],
      },
      {
        name: "breadcrumb weak only (deep path) → no breadcrumb",
        page: basePage({
          url: PageUrl.make("https://example.com/a/b/c/d"),
        }),
        signals: baseSignals({ urlPathSegments: ["a", "b", "c", "d"] }),
        expectedKinds: [],
      },
    ];

    it.each(cases)("$name", ({ page, signals, expectedKinds }) => {
      expect(kindsOf(page, signals)).toEqual(expectedKinds);
    });
  });

  describe("thresholds and reasons", () => {
    it("confidence meets EMIT_THRESHOLD (0.6) and is clamped to 1", () => {
      const page = basePage({
        url: PageUrl.make("https://example.com/blog/post"),
        jsonLd: [{ "@context": "https://schema.org", "@type": "Article" }],
        headings: [h1("Title")],
      });
      const signals = baseSignals({
        ogType: "article",
        hasArticleElement: true,
        articleTextLength: 5000,
        timeElements: [time("2025-01-01")],
      });
      const [candidate] = detectPageKind(page, signals);
      expect(candidate?.kind).toBe("article");
      expect(candidate?.confidence).toBeGreaterThanOrEqual(EMIT_THRESHOLD);
      expect(candidate?.confidence).toBeLessThanOrEqual(1);
      expect(candidate?.confidence).toBeGreaterThanOrEqual(STRONG_THRESHOLD);
    });

    it("one strong + one weak barely clearing EMIT_THRESHOLD emits but is not strong", () => {
      const page = basePage({
        jsonLd: [{ "@context": "https://schema.org", "@type": "Article" }],
      });
      const signals = baseSignals({ articleTextLength: 3000 });
      const [candidate] = detectPageKind(page, signals);
      expect(candidate?.kind).toBe("article");
      expect(candidate?.confidence).toBeGreaterThanOrEqual(EMIT_THRESHOLD);
      expect(candidate?.confidence).toBeLessThan(STRONG_THRESHOLD);
    });

    it("populates reasons[] with human-readable signal descriptions", () => {
      const page = basePage({
        jsonLd: [{ "@context": "https://schema.org", "@type": "Article" }],
        headings: [h1("Title")],
      });
      const signals = baseSignals({ articleTextLength: 3000 });
      const [candidate] = detectPageKind(page, signals);
      expect(candidate?.reasons.length ?? 0).toBeGreaterThan(0);
      expect(
        candidate?.reasons.some((r) => r.toLowerCase().includes("json-ld"))
      ).toBe(true);
    });
  });

  describe("conflict and already-correct paths (detector does not suppress)", () => {
    it("JSON-LD Article already present → article still detected", () => {
      const page = basePage({
        url: PageUrl.make("https://example.com/blog/post"),
        jsonLd: [{ "@context": "https://schema.org", "@type": "Article" }],
      });
      const signals = baseSignals({ articleTextLength: 3000 });
      expect(kindsOf(page, signals)).toContain("article");
    });

    it("strong article signals with Product JSON-LD → both kinds emitted", () => {
      const page = basePage({
        url: PageUrl.make("https://example.com/blog/post"),
        jsonLd: [{ "@context": "https://schema.org", "@type": "Product" }],
      });
      const signals = baseSignals({
        ogType: "article",
        hasArticleElement: true,
        articleTextLength: 5000,
        cartAffordances: ["Add to cart"],
      });
      const kinds = kindsOf(page, signals);
      expect(kinds).toContain("article");
      expect(kinds).toContain("product");
    });
  });
});
