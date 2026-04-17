import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type BrowserContext, chromium, type Page } from "playwright";

interface ChromeTab {
  active?: boolean;
  id?: number;
  url?: string;
}
interface ChromeQueryInfo {
  active?: boolean;
  currentWindow?: boolean;
  lastFocusedWindow?: boolean;
  url?: string;
}
interface ChromeTabsQuery {
  (info: ChromeQueryInfo): Promise<ChromeTab[]>;
  (info: ChromeQueryInfo, cb: (tabs: ChromeTab[]) => void): void;
}
declare const chrome: { tabs: { query: ChromeTabsQuery } };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXT_DIR = path.resolve(__dirname, "..", ".output", "chrome-mv3");
const PROFILE_DIR = path.resolve(__dirname, "..", ".tmp", "playwright-profile");
const OUT_DIR = path.resolve(__dirname, "..", "docs", "screenshots");

const DEFAULT_URL = "https://www.seo-lens.dev";
const DEMO_URL = process.argv[2] ?? DEFAULT_URL;
const OUT_NAME = process.argv[3] ?? "chrome-store-1280x800.png";

const PANEL_W = 400;
const DEMO_W = 880;
const HEIGHT = 800;

interface SwHandle {
  evaluate: <R, A>(fn: (arg: A) => R | Promise<R>, arg: A) => Promise<R>;
  url: () => string;
}

const getServiceWorker = async (context: BrowserContext): Promise<SwHandle> => {
  const existing = context.serviceWorkers()[0];
  if (existing) {
    return existing as unknown as SwHandle;
  }
  const sw = await context.waitForEvent("serviceworker");
  return sw as unknown as SwHandle;
};

const findTabId = async (sw: SwHandle, url: string) => {
  for (let i = 0; i < 40; i++) {
    const id = await sw.evaluate(async (u: string) => {
      const tabs = await chrome.tabs.query({});
      const match = tabs.find((t) => t.url === u || t.url?.startsWith(u));
      return match?.id ?? null;
    }, url);
    if (id != null) {
      return id;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Could not find tab for ${url}`);
};

const waitForReady = async (panel: Page) => {
  await panel.waitForFunction(
    () => {
      const body = document.body?.innerText ?? "";
      return body.includes("Score") || body.includes("findings");
    },
    { timeout: 25_000 }
  );
  await panel.waitForTimeout(2500);
};

const main = async () => {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(PROFILE_DIR, { recursive: true });

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: { width: DEMO_W, height: HEIGHT },
    args: [
      `--disable-extensions-except=${EXT_DIR}`,
      `--load-extension=${EXT_DIR}`,
      "--no-first-run",
      "--no-default-browser-check",
    ],
  });

  try {
    const sw = await getServiceWorker(context);
    const extId = sw.url().split("/")[2];
    console.log("Extension ID:", extId);

    const demo = await context.newPage();
    await demo.setViewportSize({ width: DEMO_W, height: HEIGHT });
    await demo.goto(DEMO_URL, { waitUntil: "domcontentloaded" });
    await demo.waitForLoadState("networkidle").catch(() => undefined);

    const tabId = await findTabId(sw, DEMO_URL);
    console.log("Demo tab id:", tabId);

    const panel = await context.newPage();
    await panel.setViewportSize({ width: PANEL_W, height: HEIGHT });

    await panel.addInitScript((id: number) => {
      const stubQuery = (orig: typeof chrome.tabs.query) =>
        ((query, cb) => {
          const wantsActive =
            query &&
            (query as { active?: boolean }).active === true &&
            ((query as { currentWindow?: boolean }).currentWindow === true ||
              (query as { lastFocusedWindow?: boolean }).lastFocusedWindow ===
                true);
          if (wantsActive) {
            const result = [{ id, active: true }] as chrome.tabs.Tab[];
            if (cb) {
              cb(result);
            }
            return Promise.resolve(result);
          }
          return orig(query as chrome.tabs.QueryInfo, cb as never);
        }) as typeof chrome.tabs.query;

      const patch = () => {
        if (typeof chrome?.tabs?.query === "function") {
          const orig = chrome.tabs.query.bind(chrome.tabs);
          chrome.tabs.query = stubQuery(orig);
          return true;
        }
        return false;
      };
      if (!patch()) {
        const i = setInterval(() => {
          if (patch()) {
            clearInterval(i);
          }
        }, 5);
      }
    }, tabId);

    await panel.goto(`chrome-extension://${extId}/sidepanel.html`, {
      waitUntil: "domcontentloaded",
    });
    await waitForReady(panel);

    const demoPath = path.join(OUT_DIR, "_demo.png");
    const panelPath = path.join(OUT_DIR, "_panel.png");
    await demo.screenshot({
      path: demoPath,
      clip: { x: 0, y: 0, width: DEMO_W, height: HEIGHT },
    });
    await panel.screenshot({
      path: panelPath,
      clip: { x: 0, y: 0, width: PANEL_W, height: HEIGHT },
    });

    const demoB64 = (await fs.readFile(demoPath)).toString("base64");
    const panelB64 = (await fs.readFile(panelPath)).toString("base64");

    const composer = await context.newPage();
    await composer.setViewportSize({ width: DEMO_W + PANEL_W, height: HEIGHT });
    await composer.setContent(`<!doctype html>
<html><head><style>
  html,body { margin:0; padding:0; background:#0a0a0a; }
  .stage { display:flex; width:${DEMO_W + PANEL_W}px; height:${HEIGHT}px; }
  .stage img { display:block; height:${HEIGHT}px; }
  .demo  { width:${DEMO_W}px; }
  .panel { width:${PANEL_W}px; border-left:1px solid #262626; }
</style></head>
<body>
  <div class="stage">
    <img class="demo"  src="data:image/png;base64,${demoB64}" />
    <img class="panel" src="data:image/png;base64,${panelB64}" />
  </div>
</body></html>`);
    await composer.waitForLoadState("networkidle");

    const outPath = path.join(OUT_DIR, OUT_NAME);
    await composer.screenshot({
      path: outPath,
      clip: { x: 0, y: 0, width: DEMO_W + PANEL_W, height: HEIGHT },
    });

    await fs.unlink(demoPath).catch(() => undefined);
    await fs.unlink(panelPath).catch(() => undefined);

    console.log("Wrote:", outPath);
  } finally {
    await context.close();
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
