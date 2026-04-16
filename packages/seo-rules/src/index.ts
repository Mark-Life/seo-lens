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
  siteCanonicalHostDriftRule,
  siteFaviconMissingRule,
  siteFeedBrokenRule,
  siteManifestMissingRule,
  siteNotInSitemapRule,
  siteRobotsDisallowRule,
  siteRobotsSitemapDriftRule,
  siteSecurityTxtMissingRule,
  siteSitemapMissingRule,
  siteSoft404Rule,
} from "./rules/site";
import {
  structuredRichResultsRecommendedRule,
  structuredRichResultsRequiredRule,
  structuredUnknownTypeRule,
  structuredValidRule,
} from "./rules/structured";
import { titleRule } from "./rules/title";
import type { AuditRule } from "./types";

/** Rules that only need PageData + PageSignals (no site-level fetches). */
export const pageRules: readonly AuditRule[] = [
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

/** Rules that require SiteSignals (robots.txt, sitemap, manifest, etc.). */
export const siteRules: readonly AuditRule[] = [
  siteRobotsDisallowRule,
  siteNotInSitemapRule,
  siteSitemapMissingRule,
  siteRobotsSitemapDriftRule,
  siteSoft404Rule,
  siteCanonicalHostDriftRule,
  siteSecurityTxtMissingRule,
  siteFaviconMissingRule,
  siteManifestMissingRule,
  siteFeedBrokenRule,
];

export const defaultRules: readonly AuditRule[] = [...pageRules, ...siteRules];

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
  FaviconFetchFailed,
  FeedFetchFailed,
  FetchFailed,
  HostProbeFailed,
  LlmsTxtFetchFailed,
  ManifestFetchFailed,
  NoActiveTab,
  RestrictedUrl,
  RobotsFetchFailed,
  SecurityTxtFetchFailed,
  SitemapFetchFailed,
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
  isPathDisallowed,
  type RobotsMatch,
  siteCanonicalHostDriftRule,
  siteFaviconMissingRule,
  siteFeedBrokenRule,
  siteManifestMissingRule,
  siteNotInSitemapRule,
  siteRobotsDisallowRule,
  siteRobotsSitemapDriftRule,
  siteSecurityTxtMissingRule,
  siteSitemapMissingRule,
  siteSoft404Rule,
} from "./rules/site";
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
  AuditPhase,
  AuditResult,
  AuditRootInfo,
  AuditRootSource,
  AuditState,
  BreadcrumbDom,
  BreadcrumbDomItem,
  Category,
  CategoryScore,
  Confidence,
  Favicon,
  Feed,
  FeedKind,
  FindingContext,
  FindingCounts,
  HeadingData,
  HeadLink,
  HostProbeResult,
  HostProbeScheme,
  HostProbeVariant,
  Idle,
  ImageData,
  LinkData,
  LlmsTxt,
  Loading,
  ManifestIcon,
  PageData,
  PageKind,
  PageKindCandidate,
  PageSignals,
  PageUrl,
  PricePattern,
  Ready,
  Restricted,
  RobotsGroup,
  RobotsTxt,
  RuleId,
  Running,
  Score,
  SecurityTxt,
  Severity,
  Sitemap,
  SitemapEntry,
  SitemapKind,
  SitemapVariant,
  SiteSignals,
  SoftFourOhFourProbe,
  TabId,
  TimeElement,
  WebManifest,
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
