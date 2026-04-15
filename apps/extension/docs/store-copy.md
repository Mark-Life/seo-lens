# Chrome Web Store — Listing Copy

Ready-to-paste copy for the SEO Lens store listing. Character limits noted inline.

## Name (≤75 chars)

```
SEO Lens — SEO audit for AI coding
```

34 chars.

## Summary (≤132 chars)

```
Instant SEO audit in the side panel. Copy findings straight into Claude, Cursor, or Copilot as structured plain text.
```

118 chars.

## Description (≤16,000 chars)

```
SEO Lens audits any webpage the way a search crawler sees it, then hands you findings you can paste straight into your AI coding agent.

Open the side panel on any site and you get an instant report: overall score, per-category breakdowns, and a prioritized list of issues — each one with a copy button that produces grep-able, agent-ready plain text.

Built for the AI coding workflow
Every finding, section, and full report is one click away from your clipboard in a format Claude Code, Cursor, Copilot, or any other agent can act on. No screenshots, no hand-typing, no "fix my SEO" prompts that go nowhere.

What it audits
• Title tag — length, presence, duplication signals
• Meta description — length, presence, quality
• Headings — single H1, skip-level issues, outline
• Images — missing alt text, empty alt, decorative flags
• Structured data — JSON-LD parsing, schema.org recognition, rich-results validation, recommendations for what to add
• Social tags — Open Graph + Twitter Card completeness and preview
• Canonical + robots — self-reference, indexability, directives
• Indexing signals — noindex, nofollow, robots meta

Two tabs, one workflow
• Audit — overall score, severity counts, per-category scores, prioritized findings list with per-finding copy, share-as-image card, and full-report export as Markdown or JSON
• Metadata — raw meta, social preview, heading tree, JSON-LD blocks, breadcrumbs, indexing dashboard, site-level signals (robots, sitemaps, security.txt), and image gallery

Audits what crawlers see
SEO Lens fetches the page URL in the background and parses the response HTML — the same thing Googlebot sees on first request. No "rendered DOM" noise, no false positives from client-side injected tags.

Reactive by default
Audits re-run automatically on tab switch, window focus, full page load, and SPA soft-navigation. Works on Next.js, Nuxt, SvelteKit, Astro, Remix, Framer, Webflow, Wix, Squarespace, WordPress, Shopify, and plain HTML.

Privacy
SEO Lens runs entirely in your browser. No analytics, no tracking, no accounts. The only network request the extension makes is fetching the page you're auditing. Optional feedback form forwards your message to the developer — nothing else leaves your machine.

Free and open source
SEO Lens is free and MIT-licensed. Source and issue tracker at seo-lens.dev.
```

## Category

Developer Tools

## Language

English

---

## Single-purpose description (required field)

```
Audit the SEO metadata of the current webpage and let the user copy findings as structured text for use with AI coding assistants.
```

## Permission justifications

`**activeTab**`

```
Used to read the URL of the currently focused tab so the extension can fetch and audit that page when the user opens the side panel.
```

`**sidePanel**`

```
The extension's entire UI — audit results, findings list, and inspector — is rendered inside Chrome's side panel.
```

`**tabs**`

```
Used to detect when the user switches tabs so the audit can re-run against the newly focused page automatically.
```

`**webNavigation**`

```
Used to detect full page loads and SPA soft-navigations (history.pushState) so the audit refreshes when the page content changes.
```

**Host permission `<all_urls>`**

```
The extension fetches the HTML of whichever page the user is currently viewing to audit its SEO metadata. The user controls which page is audited by choosing which tab is active. No data from fetched pages is transmitted anywhere.
```

## Data usage disclosures

- Personally identifiable information: **No** — except optional email in the feedback form (user-provided, forwarded to the developer only)
- Health information: **No**
- Financial and payment information: **No**
- Authentication information: **No**
- Personal communications: **No** — except feedback messages (user-provided, forwarded to the developer only)
- Location: **No**
- Web history: **No** — audit results are computed locally and not stored or transmitted
- User activity: **No**
- Website content: **No** — HTML is fetched and parsed locally; audit output stays in the browser

Attestations:

- I do not sell or transfer user data to third parties outside of the approved use cases
- I do not use or transfer user data for purposes unrelated to the extension's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

## Remote code

```
No, I am not using remote code.
```

All JavaScript is bundled at build time. No `eval`, no dynamic script injection, no remote CDN scripts.

## Privacy policy URL

```
https://www.seo-lens.dev/privacy
```

## Support

- **Support email**: [CWS@mark-life.com](mailto:CWS@mark-life.com)
- **Homepage URL**: [https://www.seo-lens.dev](https://www.seo-lens.dev)

## Distribution

- **Visibility**: Public
- **Regions**: All
- **Pricing**: Free

