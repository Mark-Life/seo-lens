# SEO Lens — User Stories

## US-1: Diagnose SEO Issues with Precise Context

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

---

## US-2: Visualize Invisible SEO Metadata

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

---

## US-3: One-Click Copy for AI Coding Agents

**As a** developer using an AI coding assistant (Claude Code, Cursor, etc.),
**I want** to copy any issue or the full audit report as structured plain text with one click,
**so that** I can paste it directly into my AI tool and get actionable fix suggestions.

### Requirements

- Copy button on each individual issue (copies the issue + context)
- Copy button for the full report (copies all issues as structured text)
- Output format is Markdown or structured plain text — not HTML, not screenshots
- Includes enough context (element text, tag names, attribute values) for an AI to generate a fix without seeing the page

---

## US-4: Agent-Compatible API (Future)

**As an** AI agent or automation tool,
**I want** to programmatically request an SEO audit and receive structured results,
**so that** I can integrate SEO checks into automated workflows without user interaction.

### Possible approaches (TBD)

- MCP server exposing audit results
- Native messaging between extension and local CLI tools
- Localhost API endpoint served by the extension

### Use cases

- AI coding agent runs SEO audit as part of a development workflow
- CI/CD pipeline triggers audit on staging URLs
- Agent requests audit → receives issues → generates fixes → re-audits

---

## US-5: At-a-Glance SEO Score

**As a** non-technical website owner,
**I want** to see an overall SEO health score with color-coded severity,
**so that** I can quickly understand whether my page needs attention without reading every detail.

### Requirements

- Numerical or letter-grade score in the extension icon/badge
- Summary view: score + count of errors / warnings / passed checks
- Expandable sections per category (headings, meta, structured data, etc.)
- Severity levels: error (blocks indexing/ranking), warning (suboptimal), info (suggestion)

---

## US-6: Compare Pages and Track Changes

**As a** developer working on SEO improvements,
**I want** to see how the SEO audit results change as I edit my page,
**so that** I can verify my fixes are working without manually re-running audits.

### Requirements

- Re-audit on page reload or on demand
- Visual indication of new/resolved issues compared to the previous audit
- Optionally persist last audit per URL for before/after comparison

---

## US-7: Export Full Audit Report

**As a** developer or SEO consultant,
**I want** to export the complete audit as a Markdown or JSON file,
**so that** I can share it with teammates, attach it to tickets, or feed it into other tools.
