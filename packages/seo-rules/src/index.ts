import { headingsRule } from "./rules/headings";
import { headingsSkipRule } from "./rules/headings-skip";
import { imagesAltRule } from "./rules/images-alt";
import { canonicalRule, robotsRule } from "./rules/indexing";
import { metaDescriptionRule } from "./rules/meta-description";
import {
  recommendArticleRule,
  recommendBreadcrumbRule,
  recommendConflictRule,
  recommendOrganizationRule,
  recommendProductRule,
  recommendWebsiteRule,
} from "./rules/recommendations";
import {
  structuredRichResultsRecommendedRule,
  structuredRichResultsRequiredRule,
  structuredUnknownTypeRule,
  structuredValidRule,
} from "./rules/structured";
import { titleRule } from "./rules/title";
import type { AuditRule } from "./types";

export const defaultRules: readonly AuditRule[] = [
  titleRule,
  metaDescriptionRule,
  headingsRule,
  headingsSkipRule,
  imagesAltRule,
  canonicalRule,
  robotsRule,
  structuredValidRule,
  structuredUnknownTypeRule,
  structuredRichResultsRequiredRule,
  structuredRichResultsRecommendedRule,
  recommendArticleRule,
  recommendProductRule,
  recommendWebsiteRule,
  recommendOrganizationRule,
  recommendBreadcrumbRule,
  recommendConflictRule,
];

export { detectPageKind } from "./detect/page-kind";
export {
  articleWeights,
  breadcrumbWeights,
  EMIT_THRESHOLD,
  homepageWeights,
  productWeights,
  STRONG_THRESHOLD,
} from "./detect/weights";
export { runAudit } from "./engine";
export {
  AuditFailed,
  ExtractionFailed,
  FetchFailed,
  NoActiveTab,
  RestrictedUrl,
  TabNotReady,
} from "./errors";
export { extractFromDocument, extractPageSignals } from "./extract";
export { headingsRule } from "./rules/headings";
export { headingsSkipRule } from "./rules/headings-skip";
export { imagesAltRule } from "./rules/images-alt";
export { canonicalRule, robotsRule } from "./rules/indexing";
export { metaDescriptionRule } from "./rules/meta-description";
export {
  recommendArticleRule,
  recommendBreadcrumbRule,
  recommendConflictRule,
  recommendOrganizationRule,
  recommendProductRule,
  recommendWebsiteRule,
} from "./rules/recommendations";
export {
  structuredRichResultsRecommendedRule,
  structuredRichResultsRequiredRule,
  structuredUnknownTypeRule,
  structuredValidRule,
} from "./rules/structured";
export { titleRule } from "./rules/title";
export {
  AuditError,
  AuditFinding,
  AuditResult,
  AuditRootInfo,
  AuditRootSource,
  AuditState,
  BreadcrumbDom,
  BreadcrumbDomItem,
  Category,
  CategoryScore,
  Confidence,
  FindingContext,
  FindingCounts,
  HeadingData,
  Idle,
  ImageData,
  LinkData,
  Loading,
  PageData,
  PageKind,
  PageKindCandidate,
  PageSignals,
  PageUrl,
  PricePattern,
  Ready,
  Restricted,
  RuleId,
  Running,
  Score,
  Severity,
  TabId,
  TimeElement,
} from "./schema";
export type { AuditRule } from "./types";
export {
  type Breadcrumb,
  deriveBreadcrumbs,
  deriveImageGallery,
  deriveIndexingView,
  deriveJsonLdBlocks,
  deriveMetaView,
  deriveSocialView,
  type FieldSuggestion,
  type ImageView,
  type IndexingRow,
  type IndexingStatus,
  type JsonLdArrayNode,
  type JsonLdBlock,
  type JsonLdNode,
  type JsonLdObjectNode,
  type JsonLdPrimitiveNode,
  type MetaView,
  type NodeValidity,
  type OgView,
  type RichResultsReport,
  type SocialView,
  type TwitterView,
} from "./view";
