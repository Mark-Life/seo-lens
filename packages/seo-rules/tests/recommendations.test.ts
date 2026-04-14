import { describe, expect, it } from "@effect/vitest";
import {
  recommendArticleRule,
  recommendBreadcrumbRule,
  recommendConflictRule,
  recommendOrganizationRule,
  recommendProductRule,
  recommendWebsiteRule,
} from "../src/rules/recommendations/index.js";
import {
  AuditRootInfo,
  BreadcrumbDom,
  BreadcrumbDomItem,
  Confidence,
  HeadingData,
  PageData,
  PageSignals,
  PageUrl,
  PricePattern,
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

const articleLikePage = (): PageData =>
  basePage({
    url: PageUrl.make("https://example.com/blog/my-post"),
    headings: [h1("Post title")],
  });

const articleLikeSignals = (): PageSignals =>
  baseSignals({
    ogType: "article",
    articleTextLength: 3000,
    hasArticleElement: true,
  });

const productLikePage = (): PageData =>
  basePage({
    url: PageUrl.make("https://example.com/product/widget"),
    headings: [h1("Widget")],
  });

const productLikeSignals = (): PageSignals =>
  baseSignals({
    ogType: "product",
    cartAffordances: ["Add to cart"],
    pricePatterns: [PricePattern.make({ snippet: "$19.99", nearH1: true })],
  });

const homepagePage = (): PageData =>
  basePage({
    url: PageUrl.make("https://example.com/"),
    canonical: "https://example.com/",
  });

const homepageSignals = (): PageSignals =>
  baseSignals({
    ogType: "website",
    isRootPath: true,
    articleTextLength: 200,
  });

const breadcrumbPage = (): PageData =>
  basePage({
    url: PageUrl.make("https://example.com/shop/tools/hammers/claw-hammer"),
  });

const breadcrumbSignals = (): PageSignals =>
  baseSignals({
    urlPathSegments: ["shop", "tools", "hammers", "claw-hammer"],
    breadcrumbDom: BreadcrumbDom.make({
      selector: "nav[aria-label=breadcrumb]",
      items: [
        BreadcrumbDomItem.make({ text: "Shop", href: "/shop" }),
        BreadcrumbDomItem.make({ text: "Tools", href: "/shop/tools" }),
        BreadcrumbDomItem.make({
          text: "Hammers",
          href: "/shop/tools/hammers",
        }),
      ],
    }),
  });

describe("recommendArticleRule", () => {
  it("emits when page looks like an article and no Article JSON-LD is declared", () => {
    const [finding] = recommendArticleRule.run(
      articleLikePage(),
      articleLikeSignals()
    );
    expect(finding?.severity).toBe("info");
    expect(finding?.id.endsWith("#recommend")).toBe(true);
    expect(
      finding?.context?.some(
        (c) => c.label === "template" && c.value.includes('"Article"')
      )
    ).toBe(true);
    expect(finding?.context?.some((c) => c.label === "reason")).toBe(true);
  });

  it("suppresses when Article JSON-LD already declared", () => {
    const page = basePage({
      url: PageUrl.make("https://example.com/blog/my-post"),
      headings: [h1("Post title")],
      jsonLd: [{ "@context": "https://schema.org", "@type": "Article" }],
    });
    expect(recommendArticleRule.run(page, articleLikeSignals())).toEqual([]);
  });

  it("suppresses when NewsArticle declared via @graph", () => {
    const page = basePage({
      url: PageUrl.make("https://example.com/blog/my-post"),
      headings: [h1("Post title")],
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@graph": [{ "@type": "NewsArticle" }],
        },
      ],
    });
    expect(recommendArticleRule.run(page, articleLikeSignals())).toEqual([]);
  });

  it("silent when detector has no article candidate", () => {
    expect(recommendArticleRule.run(basePage(), baseSignals())).toEqual([]);
  });
});

describe("recommendProductRule", () => {
  it("emits when page looks like a product and no Product JSON-LD is declared", () => {
    const [finding] = recommendProductRule.run(
      productLikePage(),
      productLikeSignals()
    );
    expect(finding?.severity).toBe("info");
    expect(
      finding?.context?.some(
        (c) => c.label === "template" && c.value.includes('"Product"')
      )
    ).toBe(true);
  });

  it("suppresses when Product declared", () => {
    const page = basePage({
      url: PageUrl.make("https://example.com/product/widget"),
      jsonLd: [{ "@context": "https://schema.org", "@type": "Product" }],
    });
    expect(recommendProductRule.run(page, productLikeSignals())).toEqual([]);
  });

  it("silent on article-like page", () => {
    expect(
      recommendProductRule.run(articleLikePage(), articleLikeSignals())
    ).toEqual([]);
  });
});

describe("recommendWebsiteRule", () => {
  it("emits on homepage without WebSite JSON-LD", () => {
    const [finding] = recommendWebsiteRule.run(
      homepagePage(),
      homepageSignals()
    );
    expect(finding?.severity).toBe("info");
    expect(
      finding?.context?.some(
        (c) => c.label === "template" && c.value.includes('"WebSite"')
      )
    ).toBe(true);
  });

  it("suppresses when WebSite declared", () => {
    const page = basePage({
      url: PageUrl.make("https://example.com/"),
      canonical: "https://example.com/",
      jsonLd: [{ "@context": "https://schema.org", "@type": "WebSite" }],
    });
    expect(recommendWebsiteRule.run(page, homepageSignals())).toEqual([]);
  });

  it("silent on deep URL", () => {
    expect(
      recommendWebsiteRule.run(articleLikePage(), articleLikeSignals())
    ).toEqual([]);
  });
});

describe("recommendOrganizationRule", () => {
  it("emits on homepage without Organization JSON-LD", () => {
    const [finding] = recommendOrganizationRule.run(
      homepagePage(),
      homepageSignals()
    );
    expect(finding?.severity).toBe("info");
    expect(
      finding?.context?.some(
        (c) => c.label === "template" && c.value.includes('"Organization"')
      )
    ).toBe(true);
  });

  it("suppresses when Organization declared", () => {
    const page = basePage({
      url: PageUrl.make("https://example.com/"),
      canonical: "https://example.com/",
      jsonLd: [{ "@context": "https://schema.org", "@type": "Organization" }],
    });
    expect(recommendOrganizationRule.run(page, homepageSignals())).toEqual([]);
  });

  it("suppresses when LocalBusiness (Organization subtype) declared", () => {
    const page = basePage({
      url: PageUrl.make("https://example.com/"),
      canonical: "https://example.com/",
      jsonLd: [{ "@context": "https://schema.org", "@type": "LocalBusiness" }],
    });
    expect(recommendOrganizationRule.run(page, homepageSignals())).toEqual([]);
  });
});

describe("recommendBreadcrumbRule", () => {
  it("emits when breadcrumb DOM present and no BreadcrumbList declared", () => {
    const [finding] = recommendBreadcrumbRule.run(
      breadcrumbPage(),
      breadcrumbSignals()
    );
    expect(finding?.severity).toBe("info");
    expect(
      finding?.context?.some(
        (c) => c.label === "template" && c.value.includes('"BreadcrumbList"')
      )
    ).toBe(true);
  });

  it("suppresses when BreadcrumbList declared", () => {
    const page = basePage({
      url: PageUrl.make("https://example.com/shop/tools/hammers/claw-hammer"),
      jsonLd: [{ "@context": "https://schema.org", "@type": "BreadcrumbList" }],
    });
    expect(recommendBreadcrumbRule.run(page, breadcrumbSignals())).toEqual([]);
  });
});

describe("recommendConflictRule", () => {
  it("warns when strong article detection conflicts with declared Product", () => {
    const page = basePage({
      url: PageUrl.make("https://example.com/blog/my-post"),
      headings: [h1("Post title")],
      jsonLd: [{ "@context": "https://schema.org", "@type": "Product" }],
    });
    const [finding] = recommendConflictRule.run(page, articleLikeSignals());
    expect(finding?.severity).toBe("warning");
    expect(finding?.id.endsWith("#conflict")).toBe(true);
    expect(
      finding?.context?.some(
        (c) => c.label === "detected kind" && c.value === "article"
      )
    ).toBe(true);
    expect(
      finding?.context?.some(
        (c) => c.label === "declared @type" && c.value.startsWith("Product")
      )
    ).toBe(true);
  });

  it("silent when declared type agrees with detected kind", () => {
    const page = basePage({
      url: PageUrl.make("https://example.com/blog/my-post"),
      headings: [h1("Post title")],
      jsonLd: [{ "@context": "https://schema.org", "@type": "Article" }],
    });
    expect(recommendConflictRule.run(page, articleLikeSignals())).toEqual([]);
  });

  it("silent on breadcrumb-only overlap (breadcrumb is orthogonal)", () => {
    const page = basePage({
      url: PageUrl.make("https://example.com/shop/tools/hammers/claw-hammer"),
      jsonLd: [{ "@context": "https://schema.org", "@type": "BreadcrumbList" }],
    });
    expect(recommendConflictRule.run(page, breadcrumbSignals())).toEqual([]);
  });

  it("silent when top detection is below strong threshold", () => {
    // Only a single strong + single weak reaches ~0.6, below STRONG_THRESHOLD (0.8)
    const page = basePage({
      url: PageUrl.make("https://example.com/blog/my-post"),
      jsonLd: [{ "@context": "https://schema.org", "@type": "Product" }],
    });
    const weakArticle = baseSignals({
      articleTextLength: 3000,
    });
    expect(recommendConflictRule.run(page, weakArticle)).toEqual([]);
  });

  it("silent when no JSON-LD at all", () => {
    expect(
      recommendConflictRule.run(articleLikePage(), articleLikeSignals())
    ).toEqual([]);
  });
});
