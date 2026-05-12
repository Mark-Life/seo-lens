# Agent Readiness — Audit Checklist

Roadmap of checks that extend SEO Lens beyond classic SEO into "agent readiness": how well a site exposes itself to AI crawlers, LLM browse tools, and agent protocols.

Sources of inspiration: [acceptmarkdown.com](https://acceptmarkdown.com) (Markdown content negotiation) and [isitagentready.com](https://isitagentready.com) (full agent-readiness scorecard). Each item below has a status, a short description, and the standard / RFC it's grounded in.

**Status legend:**
- `[x]` — shipped (rule emits a finding, or data surfaced in Inspect)
- `[~]` — partial (data fetched / surfaced, but no rule emits a finding yet)
- `[ ]` — todo

---

## 1. Discoverability

Files and headers that tell crawlers what exists.

- [x] **`robots.txt` presence + parse** — `User-agent`, `Disallow`, `Allow`, `Sitemap:` directives. Rule: `site.robots-disallow` flags current URL when disallowed.
  Standard: [RFC 9309 — Robots Exclusion Protocol](https://www.rfc-editor.org/rfc/rfc9309)
- [x] **`sitemap.xml` + variants** — `/sitemap.xml`, `/sitemap_index.xml`, `/sitemap-index.xml`, `/sitemap.xml.gz`, plus news/image/video sitemaps. Honors `Sitemap:` paths in robots.txt. Rules: `site.sitemap-missing`, `site.not-in-sitemap`, `site.robots-sitemap-drift`.
  Standard: [sitemaps.org protocol](https://www.sitemaps.org/protocol.html)
- [~] **`llms.txt`** — emerging convention for LLM crawler guidance. Currently fetched + surfaced in Inspect tab; **no rule yet**.
  Standard: [llmstxt.org](https://llmstxt.org/)
  Todo: emit `site.llms-txt-missing` info-level finding when absent; validate basic Markdown structure (H1 title, optional summary, sections of links).
- [ ] **`llms-full.txt`** — companion to `llms.txt` for the full content payload an LLM should ingest. Not fetched today.
  Standard: [llmstxt.org §llms-full.txt](https://llmstxt.org/#optional)
  Todo: add `LlmsFullTxtService`, fetch from origin root, emit `site.llms-full-txt-missing`.
- [x] **Link response headers** — `Link: rel=...` on HTTP responses. Partially covered via `<link>` tags in `PageData.headLinks` (used for favicon, manifest, feed discovery).
  Standard: [RFC 8288 — Web Linking](https://www.rfc-editor.org/rfc/rfc8288)
  Todo (optional): also parse `Link:` response headers, not only `<link>` HTML elements.

---

## 2. Content Negotiation for Agents

Whether the server can serve Markdown (or other agent-friendly formats) to clients that ask for it.

- [ ] **`Accept: text/markdown` → `Content-Type: text/markdown; charset=utf-8`** — server returns Markdown when requested.
  Standard: [RFC 7763 — text/markdown media type](https://www.rfc-editor.org/rfc/rfc7763), [RFC 9110 §12.5.1](https://www.rfc-editor.org/rfc/rfc9110#name-accept)
- [ ] **`Vary: Accept` response header** — response advertises that content varies on Accept, for correct cache behavior.
  Standard: [RFC 9110 §12.5.5](https://www.rfc-editor.org/rfc/rfc9110#name-vary)
- [ ] **`406 Not Acceptable` for unsupported media types** — server refuses unsupported types instead of silently returning HTML.
  Standard: [RFC 9110 §15.5.7](https://www.rfc-editor.org/rfc/rfc9110#name-406-not-acceptable)
- [ ] **Q-value support** — server honors quality factors in Accept (`text/html;q=0.9, text/markdown;q=1.0`).
  Standard: [RFC 9110 §12.4.2](https://www.rfc-editor.org/rfc/rfc9110#name-quality-values)
- [ ] **`Link: rel="alternate"` pointing to Markdown version** — discoverable link to the `.md` representation.
  Standard: [RFC 8288 — Web Linking](https://www.rfc-editor.org/rfc/rfc8288), `type="text/markdown"`

Implementation note: requires a per-page **probe** (`HEAD`/`GET` with custom `Accept`). New service `MarkdownNegotiationService` in `apps/extension/src/lib/services/`. Result schema: `{ contentType, vary, statusForUnsupported, honorsQValues, alternateLink }`. Rules: `page.markdown-not-served`, `page.markdown-no-vary`, `page.markdown-no-406`, `page.markdown-no-qvalues`, `page.markdown-no-alternate-link`.

Track which AI agents send `Accept: text/markdown` (acceptmarkdown.com status board) for context, but don't audit this — it's not site-side.

---

## 3. AI Bot Access Control

How the site signals access policy to AI crawlers specifically.

- [ ] **AI-specific bot rules in `robots.txt`** — explicit `User-agent` blocks for AI crawlers. Currently parsed generically but not surfaced as a dedicated agent-readiness check.
  Bots to detect: `GPTBot` (OpenAI), `ChatGPT-User`, `OAI-SearchBot`, `ClaudeBot` (Anthropic), `anthropic-ai`, `Claude-Web`, `Google-Extended` (Gemini training), `PerplexityBot`, `Perplexity-User`, `CCBot` (Common Crawl), `Applebot-Extended`, `Bytespider` (ByteDance), `FacebookBot`, `Meta-ExternalAgent`, `cohere-ai`, `DuckAssistBot`.
  Standard: [RFC 9309](https://www.rfc-editor.org/rfc/rfc9309) + each operator's published bot identifier.
  Todo: emit `site.ai-bots-unconfigured` info-level finding listing which AI bots have explicit allow/disallow groups and which fall under wildcard `*`.
- [ ] **Cloudflare Content Signals** — `content-signal` HTTP header (and/or robots.txt extension) indicating allowed uses: `search`, `ai-input`, `ai-train`.
  Standard: [Cloudflare Content Signals announcement](https://blog.cloudflare.com/content-signals-policy/)
  Todo: parse response header `content-signal` and the `Content-Signal:` line in robots.txt; emit `site.content-signals-missing` info-level.
- [ ] **`ai.txt` (Spawning)** — opt-out manifest at `/ai.txt` for generative-AI training.
  Standard: [Spawning ai.txt spec](https://site.spawning.ai/spaces/ai-txt)
  Todo: `AiTxtService`, fetch from origin root, surface in Inspect, emit `site.ai-txt-missing` info-level.
- [ ] **Page-level AI directives** — `<meta name="robots" content="noai, noimageai">` and `X-Robots-Tag: noai` HTTP header.
  Standard: [DeviantArt / Spawning `noai`/`noimageai`](https://site.spawning.ai/spaces/ai-txt) (no formal RFC; widely adopted convention)
  Todo: extend `extract.ts` to capture these robots-meta tokens; extend `RobotsMeta` schema; emit `page.ai-policy-undeclared` info-level when no AI directive is present (neither allow nor disallow).
- [ ] **Web Bot Auth** — cryptographic bot identity verification via HTTP message signatures.
  Standard: [IETF draft `draft-meunier-web-bot-auth`](https://datatracker.ietf.org/doc/draft-meunier-web-bot-auth/)
  Todo: detect server-side support advertisement (likely via `/.well-known/http-message-signatures-directory` or response headers). Defer actual signature verification — not the extension's job.

---

## 4. Security & Metadata (mostly shipped)

Site-level files that affect crawlers and discoverability.

- [x] **`/.well-known/security.txt`** — contact + policy for security researchers. Rule: `site.security-txt-missing` (info).
  Standard: [RFC 9116](https://www.rfc-editor.org/rfc/rfc9116)
- [x] **Favicon** — `/favicon.ico` plus `<link rel="icon">`. Rule: `site.favicon-missing` (info). Google uses favicons in SERP.
  Standard: [W3C HTML Living Standard §4.2.4.7](https://html.spec.whatwg.org/multipage/links.html#rel-icon)
- [x] **Web app manifest** — `/site.webmanifest`, `/manifest.json`, or `<link rel="manifest">`. Rule: `site.manifest-missing` (info).
  Standard: [W3C Web App Manifest](https://www.w3.org/TR/appmanifest/)
- [x] **Feeds (RSS / Atom)** — `/feed.xml`, `/rss.xml`, `/atom.xml`, plus `<link rel="alternate" type="application/(rss|atom)+xml">`. Rule: `site.feed-broken` (warning).
  Standard: [RFC 4287 — Atom](https://www.rfc-editor.org/rfc/rfc4287), [RSS 2.0](https://www.rssboard.org/rss-specification)
- [x] **Canonical host probe** — `www` vs apex, HTTP vs HTTPS. Rule: `site.canonical-host-drift` (warning).
- [x] **Soft-404 probe** — random nonexistent path returns 200 instead of 404. Rule: `site.soft-404` (error).

---

## 5. Protocol Discovery (Agent Endpoints)

How a site advertises programmatic / agent-facing endpoints.

- [ ] **MCP Server discovery** — well-known endpoint announcing a Model Context Protocol server for the site.
  Standard: [Model Context Protocol](https://modelcontextprotocol.io) (discovery convention still emerging — likely `/.well-known/mcp` or an HTTP header)
  Todo: probe `/.well-known/mcp` (and any settled location once the spec stabilizes); surface server card if present; emit `site.mcp-server-undeclared` info-level.
- [ ] **Agent Skills** — declarative skill manifest a site exposes for agent consumption.
  Standard: Anthropic Agent Skills (location and exact format TBD — track upstream)
  Todo: revisit once a discovery location is published.
- [ ] **WebMCP** — browser-side MCP transport advertisement.
  Standard: WebMCP (track upstream — early stage)
  Todo: defer until the discovery convention is published.
- [ ] **API Catalog** — `/.well-known/api-catalog` listing the site's HTTP APIs.
  Standard: [RFC 9727 — Web API Catalog](https://www.rfc-editor.org/rfc/rfc9727)
  Todo: `ApiCatalogService`, fetch + parse, surface in Inspect; emit `site.api-catalog-missing` info-level only on sites that look API-bearing (heuristic: presence of `/api/*` links or `application/json` responses elsewhere).
- [ ] **OAuth Authorization Server Metadata** — `/.well-known/oauth-authorization-server`.
  Standard: [RFC 8414](https://www.rfc-editor.org/rfc/rfc8414)
  Todo: probe only on sites that show OAuth signals; emit `site.oauth-as-metadata-missing` info-level.
- [ ] **OAuth Protected Resource Metadata** — `/.well-known/oauth-protected-resource`.
  Standard: [RFC 9728](https://www.rfc-editor.org/rfc/rfc9728)
  Todo: same as above; rule `site.oauth-pr-metadata-missing`.

---

## 6. Commerce Protocols

Out of scope for v1 of agent readiness in SEO Lens — track here so they aren't forgotten, but don't build without user demand. These are agentic-payment standards, not SEO.

- [ ] **x402** — HTTP `402 Payment Required` revival for machine payments.
  Standard: [x402.org](https://www.x402.org/)
- [ ] **ACP — Agentic Commerce Protocol**
  Standard: [agenticcommerce.dev](https://www.agenticcommerce.dev/) (verify URL when implementing)
- [ ] **MPP — Marketplace Protocol** — exact reference TBD; isitagentready.com lists it without a public spec link as of writing.
- [ ] **UCP — Universal Commerce Protocol** — same caveat.

---

## Implementation Notes

- **Where things fit.** Items 1–4 extend [scope B](./plan.md#scope-b--site-level-static-signals) (already shipped). Items 5 likely warrant a small new scope (call it B.5) once any of MCP/API-catalog/OAuth-discovery becomes worth surfacing. Item 2 (Markdown negotiation) is per-page and new — could be its own thin scope or fold into an "Agent Readiness" category on the existing Findings tab.
- **New category.** Add `Category` literal `"agent-readiness"` so these findings group cleanly in the UI rather than scattering across `site` and `page` categories.
- **Severity defaults.** All AI-readiness findings default to `info` — these aren't broken-SEO bugs, they're "missing-best-practice" hints. Promote individual checks to `warning` only when there's clear user impact (e.g., a site that disallows all bots in robots.txt while wanting to be indexed).
- **Don't recommend what we can't verify.** For each item, the audit checks for *presence* and *basic well-formedness*. Cryptographic verification (Web Bot Auth) and runtime semantic checks (does the MCP server actually work) are out of scope.
- **Per-origin caching.** All site-level probes follow the existing scope B pattern: cached per origin in the background service worker, invalidated on manual refresh.

---

## Related Documents

- [context.md](./context.md) — product context.
- [plan.md](./plan.md) — top-level roadmap; this doc extends scope B.
- [user-stories.md](./user-stories.md) — user-facing problems.
