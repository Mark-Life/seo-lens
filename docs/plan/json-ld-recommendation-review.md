# JSON-LD Recommendation Field Review

Audit of every `Recommended` field in `packages/seo-rules/src/rich-results/specs/*` against current (2026) Google Rich Results guidance and broader SEO/visibility value. Goal: drop low-signal noise, add high-signal fields we missed.

Related: [json-ld-improvements.md](./json-ld-improvements.md).

---

## Verified status notes (from web research, 2026-04)

- **FAQPage** — **active but restricted**. Google still shows FAQ rich results, but only for "well-known, authoritative government or health-focused" sites. Markup is valid everywhere; surface as info, not warning. Source: `developers.google.com/search/docs/appearance/structured-data/faqpage`.
- **HowTo** — **removed from Google Search**. Per Google Search Central changelog (2023-09-14): "Removed the How-to structured data documentation, as this rich result is no longer shown in search results." The docs page now redirects to the changelog. Markup is still valid for Bing, AI crawlers, voice assistants.
- **WebSite.potentialAction / Sitelinks Searchbox** — **deprecated 2024**. Still valid markup, no longer a rich-result driver. Demote but keep.

These three need a structured `deprecated` / `restricted` flag on `RichResultSpec` so the UI can communicate the nuance (see §Registry changes below).

---

## Per-spec changes

### Article (`specs/article.ts`)

**Remove**:
- `articleBody` — full-text blob, not a rich-result signal, clutters the tree.
- `wordCount` — Google does not use this.
- `keywords` — Google has publicly stated meta keywords / schema keywords are ignored for ranking.
- `isAccessibleForFree` — only meaningful for paywalled/subscription content; noise for 99% of pages.
- `about` — knowledge-graph only, rarely surfaced.

**Add**:
- `thumbnailUrl` — Google Discover uses a distinct thumbnail from hero image.
- `speakable` — Voice / News voice playback.

**Keep**: `dateModified`, `publisher`, `mainEntityOfPage`, `articleSection`, `inLanguage`, `description`.

---

### Product (`specs/product.ts`)

**Remove** (Merchant-feed-specific, not Product rich result):
- `color`
- `material`
- `model`
- `weight`

**Keep**: everything else. `sku`/`gtin`/`mpn`/`category` are all in Google's recommended list.

---

### Event (`specs/event.ts`)

**Add**:
- `previousStartDate` — Google flags rescheduled events; high-value post-2020.

**Remove**:
- `inLanguage` — not in Google's Event recommended list.

---

### VideoObject (`specs/video-object.ts`)

**Add**:
- `hasPart` (Clip) — drives Key Moments rich result; high SEO value.
- `publication` — enables Live stream badge.
- `regionsAllowed` — signal for content restrictions.

**Demote** (keep but lower priority):
- `expires` — only matters if content genuinely expires.

---

### Recipe (`specs/recipe.ts`)

**Add** (all in Google's recommended list):
- `video`
- `recipeCategory`
- `recipeCuisine`
- `keywords` (schema.org `keywords` on Recipe **is** used by Google, unlike Article)
- `suitableForDiet`

---

### JobPosting (`specs/job-posting.ts`)

**Add** (all current Google recommendations with real SERP impact):
- `jobLocationType` — TELECOMMUTE / remote flag.
- `applicantLocationRequirements` — required when `jobLocationType=TELECOMMUTE`.
- `directApply` — eligibility for Apply-on-Google flow.

**Optional** (secondary, but schema.org Google guide mentions them):
- `educationRequirements`
- `experienceRequirements`

---

### LocalBusiness (`specs/local-business.ts`)

**Add**:
- `aggregateRating` — stars in local pack, high visibility.
- `review`
- `sameAs` — knowledge-panel linking.
- `areaServed`

**Demote**:
- `priceRange` — Google has soft-deprecated the `$$$` display; keep but lower weight.

---

### Organization (`specs/organization.ts`)

**Remove** (low-signal, knowledge graph rarely surfaces them):
- `slogan`
- `numberOfEmployees`
- `foundingDate`
- `founder`

**Add**:
- `legalName`
- `alternateName`
- `brand`

**Keep**: `logo`, `sameAs`, `description`, `contactPoint`, `address`, `email`, `telephone` — these are Google's actual KG inputs.

---

### WebSite (`specs/website.ts`)

**Remove**:
- `copyrightHolder` — zero SEO value on a WebSite node.
- `datePublished` — nonsensical on a WebSite.

**Demote**:
- `potentialAction` — Sitelinks Searchbox deprecated 2024. Keep but mark as deprecated signal.

**Keep**: `description`, `alternateName`, `inLanguage`, `publisher`, `sameAs`.

---

### Person (`specs/person.ts`)

Already trimmed `nationality`. Further trim:

**Remove** (knowledge-graph only, almost never surfaced):
- `knowsAbout`
- `knowsLanguage`
- `alumniOf`

---

### FAQPage (`specs/faq-page.ts`)

**No field changes.** Add spec-level `restricted` flag:

```ts
{
  type: "FAQPage",
  restricted: {
    reason: "Google shows FAQ rich results only for authoritative government or health sites. Markup remains valid for other surfaces.",
    since: "2023",
  },
  ...
}
```

UI should show the note prominently on detection, not as a warning.

---

### HowTo (`specs/how-to.ts`)

**No field changes.** Add spec-level `deprecated` flag:

```ts
{
  type: "HowTo",
  deprecated: {
    reason: "Google removed HowTo rich results from Search in September 2023. Markup remains valid for Bing, AI crawlers, and voice assistants.",
    since: "2023-09-14",
    docsRemoved: true,
  },
  ...
}
```

UI should show a clear "no longer a Google rich result" info card. Do not penalize presence; do not recommend addition purely for Google SEO.

---

## Registry type changes

`packages/seo-rules/src/rich-results/registry.ts` — extend `RichResultSpec`:

```ts
interface RichResultSpec {
  type: string;
  subtypes: readonly string[];
  required: Schema.Struct<...>;
  recommended: Schema.Struct<...>;
  docUrl: string;
  deprecated?: {
    reason: string;
    since: string;
    docsRemoved?: boolean;
  };
  restricted?: {
    reason: string;
    since: string;
  };
}
```

Findings pipeline (`audit/`, `findings/`) needs a new finding severity `info` (or reuse `hint`) to surface these notes without showing as pass/warn/fail.

---

## Implementation batches

1. **Safe trims** — Article, Product, Organization, WebSite, Person. Pure removals, zero risk.
2. **Additions** — Recipe, JobPosting, VideoObject, Event, LocalBusiness. Net-new recommended fields from Google's current docs.
3. **Registry + UI for deprecated/restricted** — FAQPage, HowTo, WebSite.potentialAction. Requires type change + one new finding path + UI treatment.

Each batch is independently shippable.

---

## Open questions

- Do we want a `weight: "high" | "medium" | "low"` per recommended field instead of a flat list? Would let us scale scoring and surface the top-5 missing fields first. Out of scope for this review but worth deciding before §2.
- For FAQPage, should we auto-suppress the "eligible for rich result" messaging unless the site is on a known gov/health allowlist? Probably not — users can read the note — but worth considering.
- `keywords` behavior differs between Article (ignored) and Recipe (used). Confirm before removing from Article.
