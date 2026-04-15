# TODO — before first release

## 1. Share as image ✅

Brag/growth loop: one-click share button on the Overview tab that renders a branded PNG report card with the score, category bars, severity tally, audited host + path, and favicon.

- Lazy-loaded feature chunk — zero cost until first click.
- Canvas 2D imperative draw → `toBlob("image/png")` → download. System font stack, no bundled woffs, no WASM.
- Favicon candidates resolved from `<link rel="icon">` hrefs with `/favicon.ico` fallback; re-encoded through a canvas so the drawer only sees clean PNGs (.ico/.svg safe).
- Transparent favicons composite over the card background.
- Monogram circle fallback when no favicon decodes.
- Branded `seo-lens.dev` attribution in the card footer.

## 2. Feedback form

In-extension feedback entry point for bug reports / issues.

- Free-text message box.
- Auto-capture context: current URL, page title, framework/stack hints if detectable, extension version, browser/UA.
- Optional contact field (email).
- Decide submission target (e.g. hosted endpoint, GitHub issue, email).

## 3. Real-world testing pass

Run the extension against a spread of sites built with different frameworks/builders before publishing.

- No-code builders: Framer, Webflow, Wix, Squarespace.
- JS frameworks: Next.js, Nuxt (Vue), SvelteKit, Astro, Remix.
- Static/classic: plain HTML, WordPress, Shopify.
- Verify: fetch pipeline works, audits render, Inspect tab loads, no crashes on SPA soft-nav, images load cross-origin.
- Goal: smoke test for first release — not production-grade QA.

