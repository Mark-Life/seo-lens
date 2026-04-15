# TODO — before first release

## 1. Share as image ✅

Brag/growth loop: one-click share button on the Overview tab that renders a branded PNG report card with the score, category bars, severity tally, audited host + path, and favicon.

- Lazy-loaded feature chunk — zero cost until first click.
- Canvas 2D imperative draw → `toBlob("image/png")` → download. System font stack, no bundled woffs, no WASM.
- Favicon candidates resolved from `<link rel="icon">` hrefs with `/favicon.ico` fallback; re-encoded through a canvas so the drawer only sees clean PNGs (.ico/.svg safe).
- Transparent favicons composite over the card background.
- Monogram circle fallback when no favicon decodes.
- Branded `seo-lens.dev` attribution in the card footer.

## 2. Feedback form ✅

In-extension feedback tab that POSTs to a Next.js route on the web app; the route ACKs fast and forwards the message to a private Telegram chat via grammY (`after()`).

- Side-panel Feedback tab with message (min 5 chars) + optional email, auto-attaches URL, page title, user agent, and extension version.
- Next.js route at `apps/web/app/api/extension/feedback` — zod-validated body, `chrome-extension://` CORS reflection, `next/server#after()` dispatches grammY `sendMessage`.
- Telegram bot token + chat ID from `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` env vars. No database.
- Feedback URL overridable via `VITE_FEEDBACK_URL` for local dev; prod falls back to `seo-lens.dev`.

## 3. Real-world testing pass

Run the extension against a spread of sites built with different frameworks/builders before publishing.

- No-code builders: Framer, Webflow, Wix, Squarespace.
- JS frameworks: Next.js, Nuxt (Vue), SvelteKit, Astro, Remix.
- Static/classic: plain HTML, WordPress, Shopify.
- Verify: fetch pipeline works, audits render, Inspect tab loads, no crashes on SPA soft-nav, images load cross-origin.
- Goal: smoke test for first release — not production-grade QA.

## 4. Chrome Web Store submission

Everything the store listing needs before we can hit Publish. Developer account + $5 fee already done.

### Package
- Production build zipped from `apps/extension/.output/chrome-mv3/` (WXT `wxt build` output).
- `manifest.json` sanity check: final `name`, `version`, `description` (≤132 chars), icons 16/32/48/128, minimal `permissions` + `host_permissions`, no unused entries.
- Icon set: 16, 32, 48, 128 PNGs (128 is what the store displays). Transparent background, no text that'd blur at 16px.

### Store listing copy
- **Name** — ≤75 chars (45 recommended). e.g. "SEO Lens — SEO audit for AI coding".
- **Summary** — ≤132 chars, shown in search results.
- **Description** — ≤16,000 chars. Lead with the one-liner, then features, then the "copy-for-AI" angle. Plain text, no HTML.
- **Category** — "Developer Tools" (primary). Language: English.

### Graphics
- **Screenshots** — 1–5 required, 1280×800 or 640×400 PNG/JPEG. Aim for 3–5: Overview tab, Findings tab, Inspect tab, share-as-image card, copy-for-AI flow.
- **Small promo tile** — 440×280 PNG (required for featured placement, strongly recommended).
- **Marquee promo tile** — 1400×560 PNG (optional, only if we want to pitch for featuring).

### Privacy & compliance
- **Single-purpose description** — one sentence stating the extension's single purpose (required field).
- **Permission justifications** — per-permission reason for each of: `activeTab`, `scripting`, `sidePanel`, `storage`, `<all_urls>` host permission (fetched-HTML audits), any others in the manifest.
- **Data usage disclosures** — checkboxes + attestation: we don't collect PII, don't sell data, don't use for creditworthiness, etc. Feedback form email is user-provided and forwarded to Telegram — must be disclosed.
- **Privacy policy URL** — required because we collect feedback messages + optional email. Host at `seo-lens.dev/privacy`.
- **Remote code** — declare "No, I am not using remote code". Verify no CDN script tags, no `eval`, no dynamically fetched JS.

### Distribution
- Visibility: Public. Regions: all. Pricing: free.
- Support email (developer account email is fine) + homepage URL (`seo-lens.dev`).

### Pre-submit smoke
- Install the zipped build fresh in a clean Chrome profile, run through golden path once more, confirm version number matches what's in the zip.
