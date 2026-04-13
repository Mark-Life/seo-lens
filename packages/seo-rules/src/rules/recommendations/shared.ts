import { Match } from "effect";
import {
  AuditFinding,
  type Category,
  FindingContext,
  type PageKind,
  type PageKindCandidate,
  type RuleId,
  type Severity,
} from "../../schema";

export const ARTICLE_JSONLD_TYPES = [
  "Article",
  "NewsArticle",
  "BlogPosting",
  "TechArticle",
  "ScholarlyArticle",
  "Report",
] as const;

export const PRODUCT_JSONLD_TYPES = [
  "Product",
  "ProductGroup",
  "IndividualProduct",
  "ProductModel",
] as const;

export const WEBSITE_JSONLD_TYPES = ["WebSite"] as const;
export const ORGANIZATION_JSONLD_TYPES = [
  "Organization",
  "Corporation",
  "LocalBusiness",
  "NGO",
  "EducationalOrganization",
  "GovernmentOrganization",
] as const;
export const BREADCRUMB_JSONLD_TYPES = ["BreadcrumbList"] as const;

const pushType = (value: unknown, out: Set<string>): void => {
  if (typeof value === "string") {
    out.add(value);
    return;
  }
  if (!Array.isArray(value)) {
    return;
  }
  for (const inner of value) {
    if (typeof inner === "string") {
      out.add(inner);
    }
  }
};

const walk = (value: unknown, out: Set<string>): void => {
  if (value === null || typeof value !== "object") {
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      walk(item, out);
    }
    return;
  }
  const obj = value as Record<string, unknown>;
  pushType(obj["@type"], out);
  for (const v of Object.values(obj)) {
    walk(v, out);
  }
};

/**
 * Collects every `@type` string declared anywhere in the JSON-LD blocks,
 * including inside `@graph` and property values. Used by recommendation
 * rules for suppression checks.
 */
export const collectAllJsonLdTypes = (
  jsonLd: readonly unknown[]
): ReadonlySet<string> => {
  const out = new Set<string>();
  for (const block of jsonLd) {
    walk(block, out);
  }
  return out;
};

const readTopLevelTypes = (value: unknown, out: Set<string>): void => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return;
  }
  const obj = value as Record<string, unknown>;
  const graph = obj["@graph"];
  if (Array.isArray(graph)) {
    for (const node of graph) {
      readTopLevelTypes(node, out);
    }
  }
  pushType(obj["@type"], out);
};

/**
 * Top-level `@type` values (including types inside `@graph`) — what the
 * conflict rule compares the detected page kind against. Nested entity types
 * (e.g. an `author` Person inside an Article) are excluded on purpose.
 */
export const collectTopLevelJsonLdTypes = (
  jsonLd: readonly unknown[]
): ReadonlySet<string> => {
  const out = new Set<string>();
  for (const block of jsonLd) {
    readTopLevelTypes(block, out);
  }
  return out;
};

export const hasAnyType = (
  types: ReadonlySet<string>,
  targets: readonly string[]
): boolean => targets.some((t) => types.has(t));

export const findCandidate = (
  candidates: readonly PageKindCandidate[],
  kind: PageKind
): PageKindCandidate | undefined => candidates.find((c) => c.kind === kind);

/**
 * Exhaustive `PageKind → RecommendationId[]` dispatch. `homepage` fans out to
 * both `website` and `organization`; `breadcrumb-bearing` maps to `breadcrumb`.
 * Adding a new `PageKind` literal breaks compilation here until a case is
 * added — that is the intended exhaustiveness guarantee.
 */
export type RecommendationId =
  | "article"
  | "product"
  | "website"
  | "organization"
  | "breadcrumb";

export const recommendationsForKind: (
  kind: PageKind
) => readonly RecommendationId[] = Match.type<PageKind>().pipe(
  Match.when("article", (): readonly RecommendationId[] => ["article"]),
  Match.when("product", (): readonly RecommendationId[] => ["product"]),
  Match.when("homepage", (): readonly RecommendationId[] => [
    "website",
    "organization",
  ]),
  Match.when("breadcrumb-bearing", (): readonly RecommendationId[] => [
    "breadcrumb",
  ]),
  Match.exhaustive
);

/** True when any detected candidate kind maps to the given recommendation id. */
export const wantsRecommendation = (
  candidates: readonly PageKindCandidate[],
  id: RecommendationId
): PageKindCandidate | undefined =>
  candidates.find((c) => recommendationsForKind(c.kind).includes(id));

export interface RecommendInputs {
  readonly category: Category;
  readonly context: readonly FindingContext[];
  readonly message: string;
  readonly ruleId: RuleId;
  readonly severity: Severity;
  readonly title: string;
}

export const makeRecommendFinding = (inputs: RecommendInputs): AuditFinding =>
  AuditFinding.make({
    id: `${inputs.ruleId}#recommend`,
    ruleId: inputs.ruleId,
    category: inputs.category,
    severity: inputs.severity,
    title: inputs.title,
    message: inputs.message,
    context: inputs.context,
  });

/** Builds the template + reasons context array shared by every per-kind rule. */
export const buildRecommendationContext = (
  template: string,
  reasons: readonly string[]
): readonly FindingContext[] => [
  FindingContext.make({ label: "template", value: template }),
  ...reasons.map((r) => FindingContext.make({ label: "reason", value: r })),
];

export {
  ARTICLE_TEMPLATE,
  BREADCRUMB_TEMPLATE,
  ORGANIZATION_TEMPLATE,
  PRODUCT_TEMPLATE,
  WEBSITE_TEMPLATE,
} from "./templates";
