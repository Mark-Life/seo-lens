# SEO Lens — Product Roadmap

Plan for growing SEO Lens beyond the current single-page side-panel audit. The extension product itself is complete (see [plan-extension.md](./plan-extension.md)); this document defines the next four scopes.

Scopes are ordered by dependency and delivery cost, not as strict phases. Work can overlap where it doesn't conflict.

---

## Scope A — Smarter JSON-LD Recommendations

**Goal:** proactively recommend the schema.org types a page *should* have, based on its content, instead of only validating what is already declared.

Today the engine recognizes schema.org types present in JSON-LD and flags missing fields on those types. It says nothing when the page has no structured data at all, or when the declared schema mismatches the page content.

### What changes

- **Page-kind detection.** New pure function (`packages/seo-rules/src/detect/page-kind.ts`) over `PageData` (or a derived `PageSignals`). Outputs one or more candidate kinds with confidence. Initial categories:
  - `article` / `blog-post` — `<article>` element, long-form prose, `<time>` + author patterns, URL contains `/blog/` or `/post/`.
  - `product` — price markup, "add to cart" affordances, known product URL patterns.
  - `homepage` — site root URL, single brand-matching H1, navigation-heavy DOM.
  - `breadcrumb-bearing` — visible breadcrumb trail in DOM (ARIA `aria-label="breadcrumb"`, separator glyphs).
- **Recommendation rules.** For each detected kind, emit a finding: "This looks like an article — consider adding `Article` JSON-LD." Include a minimal template in the `context` field the user can copy.
- **Already-correct suppression.** If the matching type is already present and valid, no recommendation — only validation continues.
- **Conflict reporting.** If the page declares a schema that mismatches the detected kind (e.g., `Product` schema on an article-shaped page), surface a warning.

### Implementation outline

1. Add `page-kind` detector module in `seo-rules`; unit-test heuristics with table-driven `it.effect` fixtures.
2. Add a derived `PageSignals` view in `seo-rules/src/view/` (article-like, product-like, …) so detectors and rules share inputs.
3. New rules under `seo-rules/src/rules/recommendations/`: `recommend-article`, `recommend-product`, `recommend-website`, `recommend-organization`, `recommend-breadcrumb`, `recommend-faq`. Each is a pure function reading `PageData` + `PageSignals`.
4. Minimal template strings per recommendation. Keep them grep-friendly and short.
5. Surface recommendations in the existing Findings tab — no new UI needed v1. Category `structured.recommend`.
6. Conservative defaults: require multiple concurring signals before recommending. Document confidence thresholds in comments.

### Considerations

- False positives ("recommended Article on a marketing page") are worse than silence. Tune conservatively and let users lower the bar later.
- Reuses the existing JSON-LD pipeline; don't duplicate validation logic.
- Templates should be minimal (`@context`, `@type`, a handful of required fields) so the user copies + fills rather than deleting cruft.

### Out of scope

- Machine-learned classification.
- Auto-generating fully filled JSON-LD from live DOM content.
- Recommendations that require data only the site owner has (org structure, canonical brand info).

---

## Scope B — Site-Level Static Signals

**Goal:** fold site-wide files (robots.txt, sitemap.xml, security.txt, and similar) into the current-page report so single-page findings reflect site-wide rules.

Today a page may pass all rules while being disallowed in `robots.txt` or absent from `sitemap.xml`. The extension has no visibility into these files.

### What changes

- **Fetchers for site-level files**, all same-origin as the active tab:
  - `/robots.txt` — parse `User-agent`, `Disallow`, `Allow`, `Sitemap:` directives.
  - `/sitemap.xml` (and sitemap-index → child sitemaps) — flat list of URLs.
  - `/.well-known/security.txt` — presence + `Contact`, `Expires`, `Policy` fields.
- **Per-origin cache** in the background, keyed by origin, short TTL (a few minutes). Invalidated on manual refresh.
- **New rules** that consume the site-level data:
  - `site.robots-disallow` — current URL is disallowed by robots.txt (error).
  - `site.not-in-sitemap` — current URL is indexable but absent from sitemap (warning). Suppress for URLs that crawlers typically ignore (params, fragments).
  - `site.sitemap-missing` — no sitemap discoverable at all (info).
  - `site.security-txt-missing` — info level.
  - `site.robots-sitemap-drift` — sitemap referenced in robots.txt doesn't match the sitemap actually found, or vice versa.
- **New Inspect section "Site-level signals"** — summary of robots.txt, sitemap presence, security.txt presence. Each value copyable.

### Implementation outline

1. New tagged errors in `seo-rules/src/errors.ts`: `RobotsFetchFailed`, `SitemapFetchFailed`, `SecurityTxtFetchFailed`.
2. New schemas: `RobotsTxt`, `Sitemap`, `SecurityTxt` as `Schema.Class`.
3. New services in `apps/extension/src/lib/services/`: `RobotsService`, `SitemapService`, `SecurityTxtService`. Each has `get(origin)` returning a cached Effect.
4. New service `SiteSignals` composing the three above; exposes `get(origin): Effect<SiteSignals>`.
5. Wire `SiteSignals` into `auditTab` program; pass to rules that need it as an additional input alongside `PageData`.
6. Extend `AuditResult` (or a parallel `SiteAuditContext`) to carry the site signals so the side panel can render the new Inspect section.
7. Add `Site-level signals` section component in the Inspect tab; copyable per field.
8. Tests: table-driven `robots.txt` parser cases, sitemap-index resolution, malformed-input fall-through (must not fail the whole audit).

### Considerations

- Fetches run against the active tab's origin. `host_permissions: ["<all_urls>"]` already covers this (added in §9 of `plan-extension.md`).
- Parse errors must downgrade the rule to `info` with the parse problem surfaced, not fail the whole audit.
- Sitemap files can be huge. Cap parse size (e.g. 5 MB), truncate the URL list in memory, and switch to a hashed set if large sites cause memory pressure. Full streaming parse can wait.
- Respect `robots.txt` directives in the fetcher itself — don't crawl paths the site disallows even for our own audit traffic.

### Out of scope

- Validating links within the sitemap (that belongs in scope C).
- `hreflang` consistency across pages.
- Bing-specific extensions (`bingbot` rules) — implement if needed.

---

## Scope C — Manual Full-Site Audit (Inside the Extension)

**Goal:** the user clicks "audit this site"; the extension crawls a bounded sample of pages and produces a site-wide report, copyable for agents.

Unlike the existing auto-updating single-page report, this is an explicit, foreground, opt-in flow. Results persist per origin until dismissed.

### What changes

- **Dedicated flow in the side panel.** New top-level action "Full site audit". On click: confirm the target origin, show a progress pane, run the crawl.
- **Sampled crawl strategy.** Auditing every page of a large site is infeasible and user-hostile. Default approach:
  1. Seed from `sitemap.xml` (all URLs) plus the current page.
  2. **URL-pattern grouping** — normalize URLs by collapsing numeric IDs, UUIDs, and repeating slug segments to pattern buckets (`/product/`*, `/blog/*/comments`, `/user/*/profile`).
  3. Sample K URLs per bucket (K configurable, default 3–5).
  4. Cap total pages crawled per run (default e.g. 50, user-adjustable up to a hard ceiling).
  5. Report "audited N of M pages across P patterns" explicitly so the user knows what is sampled.
- **Crawler loop** in the background service. Reuses the existing `Fetcher` + `HtmlExtractor` + `Auditor` composition, one URL at a time, polite rate limit (e.g. 1 req/sec), respects `robots.txt` from scope B, aborts on user cancel.
- **Site-level report view.**
  - Aggregate findings by rule across all audited pages.
  - "Worst offenders" list (pages with the most errors).
  - Per-pattern summary: "all 5 sampled `/product/`* pages are missing `Product` JSON-LD".
  - Textual path-grouped tree of audited URLs. A visual site map is a nice-to-have, not v1.
- **Export.** Full-report Markdown + JSON exports must be sized for LLM context windows — chunk by pattern bucket; let the user copy per-bucket when the whole report is too large.

### Implementation outline

1. New schemas: `UrlPattern`, `SampledUrl`, `SiteAuditRun`, `SiteAuditResult` as `Schema.Class`.
2. URL-pattern normalizer (pure function + tests) that collapses repeating segments. Tests should cover common CMS URL shapes.
3. New service `Crawler` — Effect `Fiber` over an internal `Queue`, concurrency 1, rate-limited via `Effect.schedule`. Cancelable via `Fiber.interrupt`.
4. New service `SiteAuditStore` — persists last run per origin in `chrome.storage.local`. Keys: `site-audit:${origin}`. Migration-safe (versioned schema).
5. Side panel: new `SiteAuditTab` (or a new view under the existing tabs) with: start/cancel control, progress pane, result view. Progress pane streams updates from the background via the existing port.
6. Aggregation helpers in `seo-rules/src/view/site/`: `aggregateFindings`, `worstOffenders`, `patternSummary`.
7. Export formatters: per-bucket Markdown, per-bucket JSON, plus whole-run JSON. Reuse existing per-page Markdown formatter for individual pages.
8. Tests: pattern-collapsing table, aggregation over mock multi-page results, export-size bounds.

### Considerations

- MV3 service worker lifetime (~30s idle) is not a problem for bounded sampled crawls — they finish well before the SW is torn down. No persistent job queue needed at this size. If the product ever wants unbounded crawls, revisit using `chrome.storage.local` + `chrome.alarms` to resume.
- Persist last run in `chrome.storage.local` so reopening the side panel restores it.
- Crawl must be cancellable mid-run. Use Effect fibers and `Fiber.interrupt` rather than ad-hoc flags.
- Fetched-HTML audits miss client-rendered content on pure-CSR sites. Note this clearly in the report when a fetch returns a shell. Live-DOM crawl (opening N background tabs) is a future enhancement.
- Cookies: send `credentials: "omit"` to match a crawler's view. Private pages will fail — that is correct behavior for an SEO audit.
- The whole run should be idempotent — re-running without site changes should produce the same bucketing and the same findings.

### Out of scope (for v1)

- Link graph analysis (internal/external link maps).
- Ongoing scheduled audits.
- Diffing against a previous run.
- Non-HTML assets (PDFs, images, feeds).
- Visual site map UI.

---

## Scope D — Additional Interfaces for the Core Product Value

**Goal:** the same audit engine and recommendations, available from non-browser surfaces so AI agents and CI systems can consume them without a human driving a browser.

Broadly scoped — specific shapes decided per surface when each is implemented. This section captures direction, not a contract.

### Possible surfaces

- **CLI tool.** `seo-lens audit <url>` (single page) and `seo-lens audit-site <url>` (sampled crawl). Bun-native binary. Useful for CI, bulk checks, and as the backend for the MCP surface. Initial JS-rendering support is fetch+parse only (server-rendered HTML); optional headless-browser support via Playwright comes later.
- **MCP server.** Exposes audit operations as MCP tools so Claude Code / Cursor / other MCP clients can call them directly. Thin wrapper over the CLI engine.
- **Desktop app.** Electron or Tauri surface for users who want a persistent dashboard beyond what a browser side panel gives. Opens space for multi-site tracking, scheduled runs, and run diffs.
- **Extension-as-renderer** (bridge, later). The installed browser extension answers "render this URL and return DOM" over native messaging, giving the CLI/MCP access to rendered DOM without bundling a headless browser.

### Prerequisite refactor

- **Extract a runtime-agnostic `core` package** from today's `packages/seo-rules`. It must depend only on:
  - A `PageData` input contract (shape, not source).
  - An optional `SiteSignals` input (from scope B) for site-level rules.
  - Effect-TS.
  - Not `chrome.`*, not `browser.runtime`, not WXT, not a live `document`.
- **Split extraction into source-agnostic + adapter parts.**
  - Source-agnostic: `Document → PageData` (already in `seo-rules/src/extract.ts` after §9 of `plan-extension.md`).
  - Adapters per surface: extension (fetched-HTML in background), CLI (fetch + `DOMParser`-equivalent), CLI-with-browser (Playwright), MCP (delegates to CLI).
- Rename `seo-rules` → `core` when the split happens. Extension and every other surface import from the same package.

### Implementation outline (broad)

1. Audit `packages/seo-rules` for extension-specific leakage. Move anything surface-specific to `apps/extension`.
2. Split extraction adapters per surface.
3. Add `apps/cli` as a Bun-native binary. Reuse `core`. Implement `audit` and `audit-site` commands. Markdown + JSON output.
4. Add `apps/mcp` as an MCP server. Reuse `core`. Expose tools for single-page and sampled-site audit.
5. Rename `seo-rules` → `core` in one atomic commit when the above has stabilized.
6. (Later) Add `apps/desktop` as an Electron/Tauri shell. Uses `core` directly. Good candidate for scheduled runs and persistent multi-site dashboards.
7. (Later) Native messaging bridge between CLI/MCP and the installed extension, for rendered-DOM access without Playwright.

### Considerations

- Each surface is a separate app in the monorepo (`apps/cli`, `apps/mcp`, `apps/desktop`). `packages/core` is the shared dependency.
- Versioning: keep `core` internal-only until the public surfaces stabilize. Pin via Bun workspace catalog as today.
- Be explicit about limitations in docs: non-extension surfaces miss CSR-rendered content unless the user opts into Playwright or routes through the extension bridge.
- Desktop is valuable enough to keep on the roadmap even if it lands last — it opens UX the extension side panel cannot match (persistent cross-site dashboards, scheduled audits, run diffs).

### Out of scope (for now)

- Final API shape for each surface.
- Auth / rate-limit / hosted service.
- Surfaces beyond the four listed above.

---

## Sequencing Recommendation

Rough delivery order, revisable:

1. **Scope A** — smart JSON-LD recs. Ships inside the current extension, pure addition to the rules engine, direct user value. Lowest risk.
2. **Scope B** — site-level signals into the single-page report. Small, high-signal, reuses existing infra.
3. **Scope C** — manual full-site audit inside the extension. First real "beyond single page" feature; validates the sampled-crawl idea with real users.
4. **Scope D** — `core` extraction + CLI → MCP → desktop, in that order. Start core extraction in parallel with C once scope C proves out.

This keeps every step shippable inside the extension until there's evidence that non-extension surfaces are wanted. Scope D can begin in parallel with scope C because `core` extraction is mechanical and does not block extension work.

---

## Related Documents

- [context.md](./context.md) — product context and current state.
- [user-stories.md](./user-stories.md) — user-facing problems these scopes address (US-7, US-8, US-9, US-10 map to A, B, C, D).
- [plan-extension.md](./plan-extension.md) — completed implementation plan for the current side-panel product.
- [json-ld-improvements.md](./json-ld-improvements.md) — completed JSON-LD validation spec; scope A builds on this.
- [json-ld-recommendation-review.md](./json-ld-recommendation-review.md) — review notes feeding scope A.

