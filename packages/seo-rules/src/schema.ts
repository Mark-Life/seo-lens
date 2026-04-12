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
  "indexing"
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
  openGraph: Schema.Record({ key: Schema.String, value: Schema.String }),
  twitterCard: Schema.Record({ key: Schema.String, value: Schema.String }),
  jsonLd: Schema.Array(Schema.Unknown),
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
