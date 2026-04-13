# SEO Lens — Project Context

## What Is This

A browser extension that audits SEO metadata on any webpage. Instant, actionable feedback on SEO health — title, meta tags, headings, structured data, and more. Designed for the AI coding workflow: every finding is copyable as structured plain text for agents like Claude Code, Cursor, or Copilot.

## Current State (shipped)

Chrome side panel (WXT + React) with a live audit pipeline driven by the active tab.

- **Audit engine** (`packages/seo-rules`) — pure Effect-TS rules engine with branded schemas. Rules cover title, meta description, headings (single H1, skip-level), images alt, structured data (schema.org recognition, rich-results validation, initial recommendations), social OG/Twitter, canonical + robots directives.
- **Fetched-HTML audits** — the background service worker fetches the active tab's URL and parses the response with `DOMParser`, matching what a crawler sees (not what the rendered DOM accumulates on SPAs). CSR-shell fallback is deferred.
- **Side panel UI** — three tabs:
  - *Overview* — overall score, severity counts, per-category scores, Markdown/JSON export.
  - *Findings* — filterable issue list with per-finding copy (includes grep-able snippets).
  - *Inspect* — meta, social preview, heading tree, JSON-LD blocks, breadcrumbs, indexing dashboard, image gallery. Images render inline from cross-origin URLs.
- **Copy-for-AI** — per-finding copy, per-section copy in Inspect, full-report exports.
- **Reactive triggers** — audits re-run on tab switch, window focus, full load, SPA soft-nav, or manual refresh. Per-tab debouncing via Effect `Queue` + `Stream.groupByKey`.

Implementation details: see [plan-extension.md](./plan-extension.md).

## Product Direction (next)

The current product audits one page at a time. Next scopes grow it beyond single-page.

1. **Smarter JSON-LD recommendations.** Detect the kind of page (article, product, homepage, breadcrumb-bearing) and proactively suggest the schema the user should add, not only validate what's already present.
2. **Site-level static signals.** Fetch `robots.txt`, `sitemap.xml`, `.well-known/security.txt`, and related site-wide files; fold them into the current-page report (e.g., "this page is disallowed in robots.txt", "this page is not in sitemap").
3. **Manual full-site audit.** User-triggered sampled crawl of the current site from inside the extension. URL-pattern grouping for large/aggregator sites. Site-wide report, copyable for agents.
4. **Additional interfaces for the core.** Same audits + recommendations via non-browser surfaces — CLI, MCP server, desktop app. Broadly scoped; specific shapes decided per-surface.

Per-scope plans: see [plan.md](./plan.md).

## Target Surfaces

- **Phase 1 (shipped)**: Chrome extension (Manifest V3), side panel.
- **Phase 2**: Firefox port.
- **Future**: Edge, Safari, and non-extension surfaces (CLI, MCP, desktop) per scope 4.

## Monorepo Structure

```
apps/
  web/          — Landing page (Next.js, scaffolded)
  extension/    — Chrome extension (WXT + React, shipped)
packages/
  seo-rules/    — Audit engine: rules, schemas, view-model derivations. Runtime-agnostic Effect-TS. Candidate to rename to `core` as non-extension surfaces come online.
  ui/           — Shared shadcn/ui components.
```

`seo-rules` lives in `packages/` so it can be consumed by the extension today and by a CLI, MCP server, or desktop app later.

## Related Documents

- [user-stories.md](./user-stories.md) — user-facing problems and their status.
- [plan.md](./plan.md) — roadmap for the next four scopes.
- [plan-extension.md](./plan-extension.md) — original implementation plan for the current side-panel product (completed).
- [json-ld-improvements.md](./json-ld-improvements.md) — JSON-LD validation + initial recommendations spec (shipped).
- [json-ld-recommendation-review.md](./json-ld-recommendation-review.md) — review notes feeding scope 1.
