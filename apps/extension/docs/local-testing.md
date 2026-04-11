# Local Testing Guide

## Prerequisites

- [Bun](https://bun.sh/) installed
- Google Chrome (or any Chromium-based browser)

## 1. Install Dependencies

From the monorepo root:

```bash
bun install
```

## 2. Build the Extension

You have two options: **dev mode** (with hot reload) or a **production build**.

### Option A: Dev Mode (recommended for development)

```bash
cd apps/extension
bun run dev
```

This starts WXT in dev mode with hot module replacement. The built extension files are output to `apps/extension/.output/chrome-mv3-dev/`.

WXT dev mode supports live reloading — when you change source files, the extension auto-reloads in the browser. Note: changes to the content script or background script may require a manual reload of the extension.

### Option B: Production Build

```bash
cd apps/extension
bun run build
```

Output goes to `apps/extension/.output/chrome-mv3/`.

## 3. Load the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the output directory:
   - Dev mode: `apps/extension/.output/chrome-mv3-dev/`
   - Production build: `apps/extension/.output/chrome-mv3/`
5. The "SEO Lens" extension should appear in your extensions list

## 4. Using the Extension

1. Navigate to any webpage you want to audit
2. Click the **SEO Lens** icon in the Chrome toolbar (you may need to pin it first via the puzzle piece icon)
3. The side panel opens on the right side of the browser
4. Click **Run Audit** to analyze the current page
5. View the score and findings — use the copy button to get AI-friendly text output

## 5. Debugging

### Side Panel (React UI)

1. Right-click inside the side panel
2. Select **Inspect** to open DevTools for the side panel
3. Use the Console and Elements tabs as you would for any web page

### Content Script

1. Open DevTools on the page being audited (F12 or Cmd+Option+I)
2. Content script logs appear in the page's Console
3. You can filter by "content" in the Console to isolate extension logs

### Background Service Worker

1. Go to `chrome://extensions`
2. Find "SEO Lens" and click **Service Worker** link under "Inspect views"
3. This opens DevTools for the background script

### Common Issues

| Issue | Fix |
|---|---|
| Extension not appearing | Make sure Developer mode is on and the correct output directory is selected |
| Side panel not opening | Check that the `sidePanel` permission is listed in the manifest. Try removing and re-loading the extension |
| Content script not responding | Reload the target page after loading/updating the extension. Content scripts only inject into pages loaded after the extension is active |
| Stale code after changes | In dev mode, WXT auto-reloads. For production builds, click the reload icon on `chrome://extensions` after rebuilding |

## 6. Testing on Different Pages

Good pages to test against:

- A well-optimized blog post (should score high)
- A page missing `<title>` or `<meta name="description">` (should flag errors)
- A page with multiple `<h1>` tags or skipped heading levels (should flag heading issues)
- A page with JSON-LD structured data (validates extraction)
- `about:blank` or `chrome://` pages (extension cannot inject content scripts here — expect an error message)
