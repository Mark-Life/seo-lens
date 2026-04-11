# SEO Lens — Project Context

## What Is This

A browser extension that audits SEO metadata on any webpage. Provides instant, actionable feedback on SEO health — title, meta tags, headings, structured data, and more.

## Target Browsers

- **Phase 1**: Chrome (Manifest V3)
- **Phase 2**: Firefox
- **Future**: Edge, Safari, and other Chromium-based browsers

## Core Vision

### SEO Auditing

- Validate page title (length, existence, uniqueness)
- Validate meta description (length, existence)
- Heading structure (single H1, proper hierarchy H1 > H2 > H3)
- Open Graph and Twitter Card completeness
- Canonical URL validation
- JSON-LD structured data parsing and validation against schema.org
- Image alt text coverage
- Robots/indexing directives detection
- Internal/external link analysis
- Overall SEO score with weighted rules

### AI-Friendly Output (Key Differentiator)

Most users today work with AI coding assistants (Claude Code, Cursor, Copilot, etc.). The extension must be designed with this workflow in mind:

- **Copyable text reports**: One-click copy of full SEO audit as structured text (not screenshots, not HTML)
- **Error list as plain text**: Every issue should be easily copyable — paste directly into an AI chat for fix suggestions
- **Structured report format**: Machine-readable output (Markdown or structured text) so AI tools can parse and act on it
- **Future: Agent-compatible API**: Expose audit results in a way that AI agents (Claude MCP plugins, browser automation tools) can consume directly — e.g., via a local API, clipboard format convention, or native messaging

### User Experience Goals

- Zero-config: install and it works
- Fast: audit runs instantly on page load or on demand
- Clean UI: popup shows summary score + expandable sections per category
- Non-intrusive: no content injection into pages unless user opts in

## Monorepo Structure

```
apps/
  web/          — Landing page / marketing site (Next.js, already scaffolded)
  extension/    — Chrome extension (to be created)
packages/
  seo-rules/    — Core SEO auditing logic (pure functions, shared between extension and potentially web)
  ui/           — Shared UI components (shadcn/ui, already scaffolded)
```

The SEO rules engine lives in `packages/` so it can be:
- Used by the extension's content script
- Potentially used server-side (web app, API, CI tool) in the future

## What This Document Is NOT

This is not a detailed spec or implementation plan. It describes **what we want to achieve**, not how. Specific rules, scoring weights, UI designs, and implementation details will come later.
