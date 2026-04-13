# SEO Lens — User Stories

## Legend

- ✅ Shipped in the current extension.
- 🟡 Partial — some aspects shipped, others open.
- 🔲 Not yet implemented — on the roadmap.

---

## US-1: Diagnose SEO Issues with Precise Context ✅

**As a** web developer,
**I want** the extension to show SEO errors with exact details (element text, tag content, location on page),
**so that** I (or my AI coding agent) can pinpoint and fix the problem without manually inspecting the DOM.

### Examples

- "3 `<h1>` elements found" → show the actual text of each H1: `"Welcome"`, `"About Us"`, `"Contact"`
- "Meta description too long (186 chars)" → show the full description text
- "Image missing alt text" → show the image `src` path
- "JSON-LD: unrecognized type `Organziation`" → show the exact typo and its location in the schema

### Why exact context matters

- Users can grep for the exact text in their codebase
- AI agents can receive the error + context and generate a targeted fix
- No back-and-forth between the extension and the source code

### Status

Shipped. Findings carry structured `context` and optional `grep` fields. The Findings tab renders each issue with copyable context.

---

## US-2: Visualize Invisible SEO Metadata ✅

**As a** website owner or developer,
**I want** a dedicated view that renders all SEO-relevant metadata in a human-readable format,
**so that** I can review what search engines and social platforms actually see — without opening DevTools.

### What to visualize

- **Meta tags**: title, description, robots, canonical URL, viewport
- **Open Graph / Twitter Cards**: rendered as a social share preview (title, image, description)
- **Heading hierarchy**: tree view showing H1 → H2 → H3 nesting structure
- **JSON-LD structured data**: formatted, syntax-highlighted, with type validation against schema.org
- **Breadcrumbs**: rendered breadcrumb trail as parsed from JSON-LD or microdata
- **Image alt text**: gallery of images with their alt text (or lack thereof)
- **Robots / indexing directives**: noindex, nofollow, canonical signals in one place

### Key principle

This is not just error-checking — it's a "what does Google see?" dashboard, even when everything is correct.

### Status

Shipped. The Inspect tab renders all of the above. OG/Twitter preview images and gallery images render inline from cross-origin URLs.

---

## US-3: One-Click Copy for AI Coding Agents ✅

**As a** developer using an AI coding assistant (Claude Code, Cursor, etc.),
**I want** to copy any issue or the full audit report as structured plain text with one click,
**so that** I can paste it directly into my AI tool and get actionable fix suggestions.

### Requirements

- Copy button on each individual issue (copies the issue + context)
- Copy button for the full report (copies all issues as structured text)
- Output format is Markdown or structured plain text — not HTML, not screenshots
- Includes enough context (element text, tag names, attribute values) for an AI to generate a fix without seeing the page

### Status

Shipped. Per-finding copy, per-section copy in Inspect, full-report Markdown/JSON export from Overview.

---

## US-4: Agent-Compatible API 🔲

**As an** AI agent or automation tool,
**I want** to programmatically request an SEO audit and receive structured results,
**so that** I can integrate SEO checks into automated workflows without user interaction.

### Possible approaches

- MCP server exposing audit operations
- CLI for shell / CI use
- Native messaging between a CLI/MCP and the installed extension
- Desktop app for persistent dashboards

### Use cases

- AI coding agent runs SEO audit as part of a development workflow
- CI/CD pipeline triggers audit on staging URLs
- Agent requests audit → receives issues → generates fixes → re-audits

### Status

Not shipped. Now covered by scope D in [plan.md](./plan.md). Superseded in breadth by US-10 below.

---

## US-5: At-a-Glance SEO Score ✅

**As a** non-technical website owner,
**I want** to see an overall SEO health score with color-coded severity,
**so that** I can quickly understand whether my page needs attention without reading every detail.

### Requirements

- Numerical or letter-grade score in the extension icon/badge
- Summary view: score + count of errors / warnings / passed checks
- Expandable sections per category (headings, meta, structured data, etc.)
- Severity levels: error (blocks indexing/ranking), warning (suboptimal), info (suggestion)

### Status

Shipped. Overview tab shows the overall score, error/warning/info/pass counts, and per-category scores. Icon badge is not yet wired.

---

## US-6: Export Full Audit Report ✅

**As a** developer or SEO consultant,
**I want** to export the complete audit as a Markdown or JSON file,
**so that** I can share it with teammates, attach it to tickets, or feed it into other tools.

### Status

Shipped. Overview tab has Markdown and JSON export buttons. Output is suitable for pasting into AI chats, issue trackers, or docs.

---

## US-7: Smart JSON-LD Recommendations by Page Type 🔲

**As a** web developer or site owner,
**I want** the extension to detect the kind of page I'm on (article, product, homepage, FAQ, etc.) and proactively recommend the JSON-LD schema I should be using,
**so that** I learn about applicable structured data even when I haven't declared any yet.

### Examples

- "This page has an `<article>` element, long-form prose, and a `<time>` tag — consider adding `Article` JSON-LD."
- "This looks like your homepage — consider adding `WebSite` and `Organization` schemas."
- "You declared `Product` JSON-LD, but the page looks like a blog post — mismatch?"
- "Breadcrumb trail detected in the DOM, but no `BreadcrumbList` JSON-LD — add one."

### Why

Existing rules only validate schemas the user has already added. Users never learn about structured data they could be missing. Surfacing this proactively is the single biggest SEO upgrade most pages need.

### Status

Planned — scope A in [plan.md](./plan.md). Builds on the JSON-LD vocab + rich-results work already shipped.

---

## US-8: Site-Level Signals in the Current-Page Report 🔲

**As a** developer or site owner,
**I want** the single-page report to reflect site-wide rules like `robots.txt`, `sitemap.xml`, and `.well-known/security.txt`,
**so that** I learn when the current page is disallowed, not indexed, or not listed in the sitemap — without manually checking those files.

### Examples

- "This page is disallowed in `/robots.txt` (rule: `Disallow: /admin`)."
- "This page is indexable but not listed in `/sitemap.xml`."
- "No sitemap found at `/sitemap.xml` or referenced in `/robots.txt`."
- "No `.well-known/security.txt` — consider adding one (info)."
- "The sitemap URL referenced in robots.txt returns 404."

### Why

The current audit only sees the current page. Site-wide rules override page-level signals — a page with perfect meta can still be blocked by robots.txt, and users only discover this in Search Console days later.

### Status

Planned — scope B in [plan.md](./plan.md).

---

## US-9: Manual Full-Site Audit 🔲

**As a** developer auditing a site before launch or during an SEO sprint,
**I want** to click a button and get a report across many pages of the site, not just the one I'm on,
**so that** I can see which issues are site-wide versus page-specific and hand the whole thing to an AI agent for fixes.

### Requirements

- Explicit opt-in action in the side panel. The existing single-page audit stays auto-updating; this is a new foreground flow.
- Sampled crawl: seed from `sitemap.xml`, group URLs by pattern (`/product/*`, `/blog/*`), sample K per pattern. Bounded total page count.
- Polite rate limit; respects `robots.txt`.
- Report marks which URLs were audited and which patterns were only sampled.
- Per-pattern summaries ("all 5 sampled `/product/*` pages are missing `Product` JSON-LD").
- Cancelable mid-run.
- Full report copyable; chunkable per pattern bucket for fitting into LLM context windows.
- Last run persists per origin so reopening the side panel shows it.

### Why

Single-page audits solve "my current page is broken" but not "my site has a structural issue." On sites with repeating page shapes (e-commerce, blogs, aggregators), pattern-level findings are far more useful than per-page findings.

### Status

Planned — scope C in [plan.md](./plan.md).

---

## US-10: Core Audit Engine on Non-Browser Surfaces 🔲

**As an** AI agent, CI job, or developer scripting SEO checks,
**I want** to call the same audit engine from a CLI, an MCP server, or a desktop app,
**so that** SEO validation and recommendations can run without a human driving a browser.

### Use cases

- **Agent-in-the-loop fixes.** Claude Code (or similar) calls an MCP tool → receives findings → edits source → re-runs the audit. No browser in the loop.
- **CI gating.** A pipeline runs `seo-lens audit-site <staging-url>` and fails the build on new errors.
- **Bulk audits.** A consultant runs the CLI across ten client sites overnight and diffs the reports.
- **Desktop dashboard** for users who want a persistent, cross-site view beyond a browser side panel.

### Why

The extension is the right entry point for humans but the wrong shape for automation. The audit logic is already engine-first (pure Effect-TS rules over `PageData`); exposing it on other surfaces is packaging, not redesign.

### Status

Planned — scope D in [plan.md](./plan.md). Specific surfaces (CLI, MCP, desktop) sequenced later. Supersedes the earlier US-4.
