import { headingsRule } from "./rules/headings";
import { headingsSkipRule } from "./rules/headings-skip";
import { imagesAltRule } from "./rules/images-alt";
import { canonicalRule, robotsRule } from "./rules/indexing";
import { metaDescriptionRule } from "./rules/meta-description";
import {
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
];

export { runAudit } from "./engine";
export {
  AuditFailed,
  ExtractionFailed,
  FetchFailed,
  NoActiveTab,
  RestrictedUrl,
  TabNotReady,
} from "./errors";
export { extractFromDocument } from "./extract";
export { headingsRule } from "./rules/headings";
export { headingsSkipRule } from "./rules/headings-skip";
export { imagesAltRule } from "./rules/images-alt";
export { canonicalRule, robotsRule } from "./rules/indexing";
export { metaDescriptionRule } from "./rules/meta-description";
export {
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
  Category,
  CategoryScore,
  FindingContext,
  FindingCounts,
  HeadingData,
  Idle,
  ImageData,
  LinkData,
  Loading,
  PageData,
  PageUrl,
  Ready,
  Restricted,
  RuleId,
  Running,
  Score,
  Severity,
  TabId,
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
