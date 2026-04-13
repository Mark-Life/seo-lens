import {
  Confidence,
  type PageData,
  type PageKind,
  PageKindCandidate,
  type PageSignals,
} from "../schema";
import {
  articleWeights,
  breadcrumbWeights,
  EMIT_THRESHOLD,
  homepageWeights,
  productWeights,
} from "./weights";

interface Signal {
  readonly reason: string;
  readonly weight: number;
}

interface KindEvidence {
  readonly strong: readonly Signal[];
  readonly weak: readonly Signal[];
}

const ARTICLE_JSONLD_TYPES = [
  "Article",
  "NewsArticle",
  "BlogPosting",
  "TechArticle",
  "ScholarlyArticle",
] as const;

const PRODUCT_JSONLD_TYPES = ["Product", "Offer", "ProductGroup"] as const;
const WEBSITE_JSONLD_TYPES = ["WebSite", "Organization"] as const;
const BREADCRUMB_JSONLD_TYPES = ["BreadcrumbList"] as const;

const ARTICLE_URL_RE =
  /\/(?:blog|news|posts?|articles?)(?:\/|$)|\/\d{4}\/\d{2}\//i;
const PRODUCT_URL_RE = /\/(?:products?|p|shop|dp)(?:\/|$)/i;

const PRODUCT_MICRODATA_RE = /schema\.org\/Product\b/i;
const BREADCRUMB_MICRODATA_RE = /schema\.org\/BreadcrumbList\b/i;

const pushTypeField = (value: unknown, out: string[]): void => {
  if (typeof value === "string") {
    out.push(value);
    return;
  }
  if (!Array.isArray(value)) {
    return;
  }
  for (const inner of value) {
    if (typeof inner === "string") {
      out.push(inner);
    }
  }
};

const visitJsonLd = (value: unknown, out: string[]): void => {
  if (value === null || typeof value !== "object") {
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      visitJsonLd(item, out);
    }
    return;
  }
  const obj = value as Record<string, unknown>;
  pushTypeField(obj["@type"], out);
  for (const v of Object.values(obj)) {
    visitJsonLd(v, out);
  }
};

/**
 * Walks JSON-LD values collecting every `@type` string encountered, including
 * types nested inside `@graph` arrays or property values.
 */
const collectJsonLdTypes = (jsonLd: readonly unknown[]): readonly string[] => {
  const types: string[] = [];
  for (const block of jsonLd) {
    visitJsonLd(block, types);
  }
  return types;
};

const hasAnyType = (
  types: readonly string[],
  targets: readonly string[]
): boolean => types.some((t) => targets.includes(t));

const urlPath = (url: string): string => {
  try {
    return new URL(url).pathname;
  } catch {
    return "";
  }
};

const urlOrigin = (url: string): string | null => {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

/**
 * Shared threshold gate for every kind detector. Two checks must both pass:
 *
 *   1. **Strong + weak invariant.** At least one strong AND one weak signal
 *      must have fired. A lone strong signal (e.g. `og:type=article`) or a
 *      pile of weak signals alone is never sufficient — see `weights.ts` for
 *      the rationale.
 *   2. **Confidence ≥ `EMIT_THRESHOLD`.** Weights are summed and clamped to
 *      `[0, 1]`. `STRONG_THRESHOLD` is checked downstream by consumers (e.g.
 *      `recommend-conflict`), not here.
 *
 * Returning `null` means "not enough evidence for this kind".
 */
const evaluate = (
  kind: PageKind,
  evidence: KindEvidence
): PageKindCandidate | null => {
  if (evidence.strong.length === 0 || evidence.weak.length === 0) {
    return null;
  }
  const sum = [...evidence.strong, ...evidence.weak].reduce(
    (acc, s) => acc + s.weight,
    0
  );
  const total = Math.min(1, sum);
  if (total < EMIT_THRESHOLD) {
    return null;
  }
  return PageKindCandidate.make({
    kind,
    confidence: Confidence.make(total),
    reasons: [
      ...evidence.strong.map((s) => s.reason),
      ...evidence.weak.map((s) => s.reason),
    ],
  });
};

const detectArticle = (
  page: PageData,
  signals: PageSignals,
  types: readonly string[]
): KindEvidence => {
  const strong: Signal[] = [];
  const weak: Signal[] = [];

  if (signals.ogType === "article") {
    strong.push({
      reason: "og:type=article",
      weight: articleWeights.strong.ogTypeArticle,
    });
  }
  if (signals.hasArticleElement) {
    strong.push({
      reason: "<article> element present",
      weight: articleWeights.strong.hasArticleElement,
    });
  }
  if (hasAnyType(types, ARTICLE_JSONLD_TYPES)) {
    strong.push({
      reason: "JSON-LD declares Article/NewsArticle/BlogPosting",
      weight: articleWeights.strong.jsonLdArticleType,
    });
  }
  if (ARTICLE_URL_RE.test(urlPath(page.url))) {
    strong.push({
      reason: "URL path looks article-like (/blog, /news, /post, /YYYY/MM/)",
      weight: articleWeights.strong.urlMatchesArticlePath,
    });
  }

  if (signals.articleTextLength > 1500) {
    weak.push({
      reason: "Body text > 1500 characters",
      weight: articleWeights.weak.longBodyText,
    });
  }
  if (signals.timeElements.length > 0) {
    weak.push({
      reason: "<time> element present",
      weight: articleWeights.weak.timeElementPresent,
    });
  }

  return { strong, weak };
};

const detectProduct = (
  page: PageData,
  signals: PageSignals,
  types: readonly string[]
): KindEvidence => {
  const strong: Signal[] = [];
  const weak: Signal[] = [];

  if (signals.ogType === "product") {
    strong.push({
      reason: "og:type=product",
      weight: productWeights.strong.ogTypeProduct,
    });
  }
  if (signals.microdataTypes.some((t) => PRODUCT_MICRODATA_RE.test(t))) {
    strong.push({
      reason: "microdata declares Product",
      weight: productWeights.strong.microdataProduct,
    });
  }
  if (hasAnyType(types, PRODUCT_JSONLD_TYPES)) {
    strong.push({
      reason: "JSON-LD declares Product/Offer",
      weight: productWeights.strong.jsonLdProductOrOffer,
    });
  }
  if (signals.pricePatterns.some((p) => p.nearH1)) {
    strong.push({
      reason: "Price pattern detected near H1",
      weight: productWeights.strong.priceNearH1,
    });
  }

  if (signals.cartAffordances.length > 0) {
    weak.push({
      reason: "Cart affordance present (add to cart, buy now, …)",
      weight: productWeights.weak.cartAffordancePresent,
    });
  }
  if (PRODUCT_URL_RE.test(urlPath(page.url))) {
    weak.push({
      reason: "URL path looks product-like (/product, /p, /shop, /dp)",
      weight: productWeights.weak.urlMatchesProductPath,
    });
  }
  if (signals.pricePatterns.length > 0) {
    weak.push({
      reason: "Price pattern detected on page",
      weight: productWeights.weak.priceAnywhere,
    });
  }

  return { strong, weak };
};

const detectHomepage = (
  page: PageData,
  signals: PageSignals,
  types: readonly string[]
): KindEvidence => {
  const strong: Signal[] = [];
  const weak: Signal[] = [];

  if (signals.isRootPath) {
    strong.push({
      reason: "URL is site root (/)",
      weight: homepageWeights.strong.isRootPath,
    });
  }
  if (signals.ogType === "website") {
    strong.push({
      reason: "og:type=website",
      weight: homepageWeights.strong.ogTypeWebsite,
    });
  }
  if (hasAnyType(types, WEBSITE_JSONLD_TYPES)) {
    strong.push({
      reason: "JSON-LD declares WebSite or Organization",
      weight: homepageWeights.strong.jsonLdWebSiteOrOrganization,
    });
  }

  const origin = urlOrigin(page.url);
  if (
    page.canonical !== null &&
    origin !== null &&
    (page.canonical === origin || page.canonical === `${origin}/`)
  ) {
    weak.push({
      reason: "Canonical equals origin",
      weight: homepageWeights.weak.canonicalIsOrigin,
    });
  }
  if (!signals.hasArticleElement) {
    weak.push({
      reason: "No <article> element",
      weight: homepageWeights.weak.noArticleElement,
    });
  }
  if (signals.articleTextLength < 600) {
    weak.push({
      reason: "Minimal body text",
      weight: homepageWeights.weak.shortOrNoBody,
    });
  }

  return { strong, weak };
};

const detectBreadcrumb = (
  signals: PageSignals,
  types: readonly string[]
): KindEvidence => {
  const strong: Signal[] = [];
  const weak: Signal[] = [];

  if (signals.breadcrumbDom !== null) {
    strong.push({
      reason: "Breadcrumb DOM detected",
      weight: breadcrumbWeights.strong.breadcrumbDomPresent,
    });
  }
  if (signals.microdataTypes.some((t) => BREADCRUMB_MICRODATA_RE.test(t))) {
    strong.push({
      reason: "microdata declares BreadcrumbList",
      weight: breadcrumbWeights.strong.microdataBreadcrumbList,
    });
  }
  if (hasAnyType(types, BREADCRUMB_JSONLD_TYPES)) {
    strong.push({
      reason: "JSON-LD declares BreadcrumbList",
      weight: breadcrumbWeights.strong.jsonLdBreadcrumbList,
    });
  }

  if (signals.urlPathSegments.length > 2) {
    weak.push({
      reason: "URL has deep path (>2 segments)",
      weight: breadcrumbWeights.weak.deepPathSegments,
    });
  }
  if ((signals.breadcrumbDom?.items.length ?? 0) > 2) {
    weak.push({
      reason: "Breadcrumb DOM has >2 links",
      weight: breadcrumbWeights.weak.multipleBreadcrumbLinks,
    });
  }

  return { strong, weak };
};

/**
 * Pure-sync page-kind detector. Emits one candidate per kind whose evidence
 * passes the thresholds; kinds are not mutually exclusive, so a product page
 * carrying breadcrumbs returns both.
 */
export const detectPageKind = (
  page: PageData,
  signals: PageSignals
): readonly PageKindCandidate[] => {
  const types = collectJsonLdTypes(page.jsonLd);
  const candidates: PageKindCandidate[] = [];
  const push = (c: PageKindCandidate | null): void => {
    if (c !== null) {
      candidates.push(c);
    }
  };
  push(evaluate("article", detectArticle(page, signals, types)));
  push(evaluate("product", detectProduct(page, signals, types)));
  push(evaluate("homepage", detectHomepage(page, signals, types)));
  push(evaluate("breadcrumb-bearing", detectBreadcrumb(signals, types)));
  return candidates;
};
