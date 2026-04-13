/**
 * Weights and thresholds for page-kind detection (scope A). Kept in a sibling
 * file so tuning doesn't touch detector logic.
 *
 * Discipline — two independent gates must both pass before a candidate is
 * emitted:
 *   1. **Evidence shape.** At least one strong AND one weak signal must fire.
 *      Enforced in `evaluate()` in `page-kind.ts`. A lone `og:type` or lone
 *      URL pattern is never enough.
 *   2. **Confidence total.** The summed (and clamped to 1) weights must meet
 *      `EMIT_THRESHOLD`. Tuned so a single "big" strong signal (~0.45) plus
 *      one weak (~0.15) just crosses the bar, while two strongs plus a weak
 *      comfortably cross `STRONG_THRESHOLD`.
 *
 * Bias is conservative: false positives ("recommended Article on a marketing
 * page") are worse than silence, so nudge weights down rather than up.
 */

/**
 * Minimum confidence for a `PageKindCandidate` to be returned from
 * `detectPageKind`. Below this, the kind is suppressed entirely.
 */
export const EMIT_THRESHOLD = 0.6;

/**
 * Confidence at or above which a candidate is treated as "strong" — high
 * enough for rules that act on a hard claim about page kind to fire (e.g.
 * `recommend-conflict` warns only when the top candidate is strong).
 * Recommendation rules themselves only need `EMIT_THRESHOLD`.
 */
export const STRONG_THRESHOLD = 0.8;

export const articleWeights = {
  strong: {
    ogTypeArticle: 0.45,
    hasArticleElement: 0.25,
    jsonLdArticleType: 0.5,
    urlMatchesArticlePath: 0.4,
  },
  weak: {
    longBodyText: 0.2,
    timeElementPresent: 0.15,
  },
} as const;

export const productWeights = {
  strong: {
    ogTypeProduct: 0.45,
    microdataProduct: 0.35,
    jsonLdProductOrOffer: 0.5,
    priceNearH1: 0.4,
  },
  weak: {
    cartAffordancePresent: 0.2,
    urlMatchesProductPath: 0.15,
    priceAnywhere: 0.1,
  },
} as const;

export const homepageWeights = {
  strong: {
    isRootPath: 0.4,
    ogTypeWebsite: 0.35,
    jsonLdWebSiteOrOrganization: 0.4,
  },
  weak: {
    canonicalIsOrigin: 0.2,
    noArticleElement: 0.1,
    shortOrNoBody: 0.15,
  },
} as const;

export const breadcrumbWeights = {
  strong: {
    breadcrumbDomPresent: 0.55,
    microdataBreadcrumbList: 0.45,
    jsonLdBreadcrumbList: 0.5,
  },
  weak: {
    deepPathSegments: 0.15,
    multipleBreadcrumbLinks: 0.1,
  },
} as const;
