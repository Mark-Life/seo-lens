import { Schema } from "effect";

// ─── Branded primitives ────────────────────────────────────────────────

export const TabId = Schema.Number.pipe(Schema.brand("TabId"));
export type TabId = typeof TabId.Type;

export const PageUrl = Schema.String.pipe(Schema.brand("PageUrl"));
export type PageUrl = typeof PageUrl.Type;

export const RuleId = Schema.String.pipe(Schema.brand("RuleId"));
export type RuleId = typeof RuleId.Type;

export const Score = Schema.Int.pipe(
  Schema.between(0, 100),
  Schema.brand("Score")
);
export type Score = typeof Score.Type;

// ─── Enums ─────────────────────────────────────────────────────────────

export const Severity = Schema.Literal("error", "warning", "info", "pass");
export type Severity = typeof Severity.Type;

export const Category = Schema.Literal(
  "meta",
  "headings",
  "social",
  "structured",
  "images",
  "indexing",
  "site"
);
export type Category = typeof Category.Type;

// ─── PageData sub-shapes ───────────────────────────────────────────────

export class HeadingData extends Schema.Class<HeadingData>("HeadingData")({
  level: Schema.Int.pipe(Schema.between(1, 6)),
  text: Schema.String,
}) {}

export class ImageData extends Schema.Class<ImageData>("ImageData")({
  alt: Schema.NullOr(Schema.String),
  src: Schema.String,
}) {}

export class LinkData extends Schema.Class<LinkData>("LinkData")({
  href: Schema.String,
  isExternal: Schema.Boolean,
  rel: Schema.NullOr(Schema.String),
  text: Schema.String,
}) {}

export class HeadLink extends Schema.Class<HeadLink>("HeadLink")({
  rel: Schema.String,
  href: Schema.String,
  type: Schema.NullOr(Schema.String),
  title: Schema.NullOr(Schema.String),
  hreflang: Schema.NullOr(Schema.String),
}) {}

export const AuditRootSource = Schema.Literal(
  "main",
  "role-main",
  "largest-subtree",
  "body"
);
export type AuditRootSource = typeof AuditRootSource.Type;

export class AuditRootInfo extends Schema.Class<AuditRootInfo>("AuditRootInfo")(
  {
    selector: Schema.String,
    source: AuditRootSource,
  }
) {}

// ─── PageData ──────────────────────────────────────────────────────────

export class PageData extends Schema.Class<PageData>("PageData")({
  url: PageUrl,
  title: Schema.String,
  metaDescription: Schema.String,
  canonical: Schema.NullOr(Schema.String),
  robotsMeta: Schema.NullOr(Schema.String),
  headings: Schema.Array(HeadingData),
  images: Schema.Array(ImageData),
  links: Schema.Array(LinkData),
  headLinks: Schema.Array(HeadLink),
  openGraph: Schema.Record({ key: Schema.String, value: Schema.String }),
  twitterCard: Schema.Record({ key: Schema.String, value: Schema.String }),
  jsonLd: Schema.Array(Schema.Unknown),
  auditRoot: AuditRootInfo,
}) {}

// ─── PageSignals (scope A: page-kind detection) ───────────────────────

export const Confidence = Schema.Number.pipe(
  Schema.between(0, 1),
  Schema.brand("Confidence")
);
export type Confidence = typeof Confidence.Type;

export const PageKind = Schema.Literal(
  "article",
  "product",
  "homepage",
  "breadcrumb-bearing"
);
export type PageKind = typeof PageKind.Type;

export class TimeElement extends Schema.Class<TimeElement>("TimeElement")({
  datetime: Schema.String,
  text: Schema.String,
}) {}

export class PricePattern extends Schema.Class<PricePattern>("PricePattern")({
  snippet: Schema.String,
  nearH1: Schema.Boolean,
}) {}

export class BreadcrumbDomItem extends Schema.Class<BreadcrumbDomItem>(
  "BreadcrumbDomItem"
)({
  text: Schema.String,
  href: Schema.String,
}) {}

export class BreadcrumbDom extends Schema.Class<BreadcrumbDom>("BreadcrumbDom")(
  {
    selector: Schema.String,
    items: Schema.Array(BreadcrumbDomItem),
  }
) {}

export class PageSignals extends Schema.Class<PageSignals>("PageSignals")({
  articleLike: Confidence,
  productLike: Confidence,
  homepageLike: Confidence,
  breadcrumbLike: Confidence,
  hasArticleElement: Schema.Boolean,
  hasNavElement: Schema.Boolean,
  articleTextLength: Schema.Int.pipe(Schema.nonNegative()),
  ogType: Schema.NullOr(Schema.String),
  timeElements: Schema.Array(TimeElement),
  microdataTypes: Schema.Array(Schema.String),
  pricePatterns: Schema.Array(PricePattern),
  cartAffordances: Schema.Array(Schema.String),
  breadcrumbDom: Schema.NullOr(BreadcrumbDom),
  urlPathSegments: Schema.Array(Schema.String),
  isRootPath: Schema.Boolean,
}) {}

export class PageKindCandidate extends Schema.Class<PageKindCandidate>(
  "PageKindCandidate"
)({
  kind: PageKind,
  confidence: Confidence,
  reasons: Schema.Array(Schema.String),
}) {}

// ─── Site-level signals (scope B) ──────────────────────────────────────

export class RobotsGroup extends Schema.Class<RobotsGroup>("RobotsGroup")({
  userAgents: Schema.Array(Schema.String),
  allow: Schema.Array(Schema.String),
  disallow: Schema.Array(Schema.String),
  crawlDelay: Schema.NullOr(Schema.Number),
}) {}

export class RobotsTxt extends Schema.Class<RobotsTxt>("RobotsTxt")({
  url: PageUrl,
  rawText: Schema.String,
  groups: Schema.Array(RobotsGroup),
  sitemapUrls: Schema.Array(PageUrl),
}) {}

export const SitemapKind = Schema.Literal("urlset", "index");
export type SitemapKind = typeof SitemapKind.Type;

export const SitemapVariant = Schema.Literal(
  "sitemap",
  "news",
  "image",
  "video"
);
export type SitemapVariant = typeof SitemapVariant.Type;

export class SitemapEntry extends Schema.Class<SitemapEntry>("SitemapEntry")({
  loc: PageUrl,
  lastmod: Schema.NullOr(Schema.String),
}) {}

export class Sitemap extends Schema.Class<Sitemap>("Sitemap")({
  url: PageUrl,
  kind: SitemapKind,
  variant: SitemapVariant,
  entries: Schema.Array(SitemapEntry),
  childSitemapUrls: Schema.Array(PageUrl),
  truncated: Schema.Boolean,
}) {}

export class SecurityTxt extends Schema.Class<SecurityTxt>("SecurityTxt")({
  url: PageUrl,
  rawText: Schema.String,
  contact: Schema.Array(Schema.String),
  expires: Schema.NullOr(Schema.String),
  policy: Schema.NullOr(Schema.String),
  encryption: Schema.NullOr(Schema.String),
}) {}

export class ManifestIcon extends Schema.Class<ManifestIcon>("ManifestIcon")({
  src: Schema.String,
  sizes: Schema.NullOr(Schema.String),
  type: Schema.NullOr(Schema.String),
}) {}

export class WebManifest extends Schema.Class<WebManifest>("WebManifest")({
  url: PageUrl,
  name: Schema.NullOr(Schema.String),
  shortName: Schema.NullOr(Schema.String),
  icons: Schema.Array(ManifestIcon),
}) {}

export class Favicon extends Schema.Class<Favicon>("Favicon")({
  url: PageUrl,
  contentType: Schema.NullOr(Schema.String),
  resolvable: Schema.Boolean,
}) {}

export const FeedKind = Schema.Literal("rss", "atom", "unknown");
export type FeedKind = typeof FeedKind.Type;

export class Feed extends Schema.Class<Feed>("Feed")({
  url: PageUrl,
  kind: FeedKind,
  contentType: Schema.NullOr(Schema.String),
  resolvable: Schema.Boolean,
}) {}

export class LlmsTxt extends Schema.Class<LlmsTxt>("LlmsTxt")({
  url: PageUrl,
  rawText: Schema.String,
}) {}

export const HostProbeScheme = Schema.Literal("http", "https");
export type HostProbeScheme = typeof HostProbeScheme.Type;

export class HostProbeVariant extends Schema.Class<HostProbeVariant>(
  "HostProbeVariant"
)({
  scheme: HostProbeScheme,
  host: Schema.String,
  url: PageUrl,
  status: Schema.NullOr(Schema.Number),
  finalUrl: Schema.NullOr(PageUrl),
  redirected: Schema.Boolean,
}) {}

export class HostProbeResult extends Schema.Class<HostProbeResult>(
  "HostProbeResult"
)({
  origin: PageUrl,
  variants: Schema.Array(HostProbeVariant),
  canonicalHost: Schema.NullOr(Schema.String),
}) {}

export class SoftFourOhFourProbe extends Schema.Class<SoftFourOhFourProbe>(
  "SoftFourOhFourProbe"
)({
  probeUrl: PageUrl,
  status: Schema.Number,
  isSoftFourOhFour: Schema.Boolean,
}) {}

export class SiteSignals extends Schema.Class<SiteSignals>("SiteSignals")({
  origin: PageUrl,
  robots: Schema.NullOr(RobotsTxt),
  sitemaps: Schema.Array(Sitemap),
  securityTxt: Schema.NullOr(SecurityTxt),
  favicon: Schema.NullOr(Favicon),
  manifest: Schema.NullOr(WebManifest),
  feeds: Schema.Array(Feed),
  llmsTxt: Schema.NullOr(LlmsTxt),
  hostProbe: Schema.NullOr(HostProbeResult),
  softFourOhFour: Schema.NullOr(SoftFourOhFourProbe),
}) {}

// ─── AuditFinding ──────────────────────────────────────────────────────

export class FindingContext extends Schema.Class<FindingContext>(
  "FindingContext"
)({
  label: Schema.String,
  value: Schema.String,
}) {}

export class AuditFinding extends Schema.Class<AuditFinding>("AuditFinding")({
  id: Schema.String,
  ruleId: RuleId,
  category: Category,
  severity: Severity,
  title: Schema.String,
  message: Schema.String,
  context: Schema.optional(Schema.Array(FindingContext)),
  grep: Schema.optional(Schema.String),
}) {}

// ─── AuditResult ───────────────────────────────────────────────────────

export class FindingCounts extends Schema.Class<FindingCounts>("FindingCounts")(
  {
    error: Schema.Int.pipe(Schema.nonNegative()),
    warning: Schema.Int.pipe(Schema.nonNegative()),
    info: Schema.Int.pipe(Schema.nonNegative()),
    pass: Schema.Int.pipe(Schema.nonNegative()),
  }
) {}

export class CategoryScore extends Schema.Class<CategoryScore>("CategoryScore")(
  {
    id: Category,
    score: Score,
  }
) {}

export class AuditResult extends Schema.Class<AuditResult>("AuditResult")({
  url: PageUrl,
  score: Score,
  counts: FindingCounts,
  categoryScores: Schema.Array(CategoryScore),
  findings: Schema.Array(AuditFinding),
  siteSignals: SiteSignals,
  timestamp: Schema.Number,
}) {}

// ─── AuditState (tagged union) ─────────────────────────────────────────

export class Idle extends Schema.TaggedClass<Idle>()("Idle", {}) {}

export class Running extends Schema.TaggedClass<Running>()("Running", {
  reason: Schema.String,
}) {}

export class Ready extends Schema.TaggedClass<Ready>()("Ready", {
  page: PageData,
  result: AuditResult,
}) {}

export class Loading extends Schema.TaggedClass<Loading>()("Loading", {}) {}

export class Restricted extends Schema.TaggedClass<Restricted>()(
  "Restricted",
  {}
) {}

export class AuditError extends Schema.TaggedClass<AuditError>()("AuditError", {
  message: Schema.String,
}) {}

export const AuditState = Schema.Union(
  Idle,
  Running,
  Ready,
  Loading,
  Restricted,
  AuditError
);
export type AuditState = typeof AuditState.Type;
