# SEO Lens — Wiring the UI to Real Audits

Plan for replacing the side panel's placeholder data with a live, reactive audit pipeline built on Effect-TS, driven by the active Chrome tab.

---

> **Note on existing code:**
>
> - **Side panel UI (`apps/extension/src/entrypoints/sidepanel/`) is the target design** — it represents what we want the product to look and feel like. Preserve markup, styling, tab layout, and component structure. This plan is about feeding it real data, not redesigning it.
> - **Everything else — the content script, background, and the entire `packages/seo-rules` package — is a throwaway spike** with no Effect, no schemas, no real error handling. Treat it as a reference for what data we can extract, not as code to preserve. Delete, rename, or rewrite freely. The engine in particular should be built fresh around Effect + Schema rather than patched.

## 1. Current State

### What exists

- **Extension shell (`apps/extension`)** — WXT + React, side panel entrypoint, three tabs (Overview, Findings, Inspect).
- **Content script (`src/entrypoints/content.ts`)** — already extracts a full `PageData` object (title, meta description, canonical, headings, images, links, OG, Twitter, JSON-LD, robots meta) via a `browser.runtime.onMessage` listener on `EXTRACT_PAGE_DATA`.
- **Background (`src/entrypoints/background.ts`)** — only opens the side panel on action click. No tab tracking, no audit orchestration.
- **Rules package (`packages/seo-rules`)** — `runAudit()` engine + three rules: `titleRule`, `metaDescriptionRule`, `headingsRule`. Pure functions over `PageData`. Output: `AuditResult { url, score, findings, timestamp }` with flat findings (no category, no per-rule context beyond `details: string`).
- **Side panel UI (`apps/extension/src/entrypoints/sidepanel/`)** — three tabs fully built against `data/placeholder.ts`:
  - `Header` reads `audit.url`.
  - `OverviewTab` reads `audit` (score, severity counts, per-category scores), exports buttons (Markdown/JSON not wired).
  - `FindingsTab` reads `findings[]` with shape `{ id, ruleId, category, severity, title, message, context?, grep? }`, supports filter + per-finding copy.
  - `InspectTab` reads `meta`, `social`, `twitter`, `breadcrumbs`, `indexing`, `jsonldBlocks`, `headings`, `jsonld` (raw), `images`.

### Gaps between mock and engine

The placeholder shape is **richer** than what `packages/seo-rules` currently produces. The plan must either grow the rules engine to match, or compute the derived views in the side panel. We will do both — grow the engine for semantic data (findings with category/context), and derive presentation structures (social preview, indexing dashboard, JSON-LD block list) in a thin "view-model" layer on top of `PageData` + `AuditResult`.

### Engine shape changes required

`AuditFinding` needs:

- `id: string` — stable per-run id for React keys + copy.
- `category: Category` — one of `meta | headings | social | structured | images | indexing`.
- `title: string` + `message: string` (currently just `message`).
- `context?: Array<{ label: string; value: string }>` — structured, not a free-form `details` string.
- `grep?: string` — optional literal snippet the user can search their codebase for (US-1).

`AuditResult` needs:

- `counts: { error; warning; info; pass }`.
- `categoryScores: Array<{ id: Category; score: number }>`.

Rules to add (scoped to what the UI already visualizes): `headings.single-h1`, `headings.skip-level`, `meta.title-length` (pass/warn), `meta.description-length`, `structured.valid-schema`, `structured.unknown-type`, `images.missing-alt`, `social.og-image-size` (info-only, size unknown without fetch — defer), `indexing.canonical`, `indexing.robots`.

---

## 2. Architecture

Three processes, one Effect program per message round-trip.

```
┌─────────────────┐   EXTRACT_PAGE_DATA    ┌──────────────┐
│ Content Script  │◀──────────────────────▶│  Background  │
│  (per tab)      │     PageData           │  (service    │
└─────────────────┘                        │   worker)    │
                                           │              │
                                           │  • tab watch │
                                           │  • audit     │
                                           │  • cache     │
                                           └──────┬───────┘
                                                  │ PORT: "sidepanel"
                                                  │ AuditResult + PageData
                                           ┌──────▼───────┐
                                           │  Side Panel  │
                                           │  (React)     │
                                           └──────────────┘
```

### Why the background owns auditing

- Survives side-panel close/reopen — cached result shown instantly.
- Single source of truth for the active tab across panel remounts.
- Only one listener set on `tabs.onUpdated` / `tabs.onActivated` instead of per-panel-open subscriptions.
- Content script stays dumb: one message handler, no state.

### Communication model

- **Side panel ↔ background**: long-lived `browser.runtime.connect({ name: "sidepanel" })` port. Background pushes `{ type: "state"; state: AuditState }` on every state transition. Panel sends `{ type: "refresh" }` for manual re-runs.
- **Background → content script**: `browser.tabs.sendMessage(tabId, { type: "EXTRACT_PAGE_DATA" })` — already wired, keep as-is.

### Reactive triggers (background)

Audit is (re)run when:

1. Side panel connects — audit the active tab immediately (use cache if URL matches and age < 2s).
2. `browser.tabs.onActivated` — user switches tab.
3. `browser.windows.onFocusChanged` — user switches Chrome window.
4. `browser.tabs.onUpdated` with `changeInfo.status === "complete"` for the active tab (page finished loading, covers SPA hard navigations and full reloads).
5. `browser.webNavigation.onHistoryStateUpdated` for the active tab — covers SPA soft navigations (`pushState`). Debounced 300ms.
6. Manual `refresh` message from the panel.

All triggers feed into a single `Queue` of `AuditRequest { tabId, reason }`. A fiber consumes the queue, dedupes by tabId (latest wins), and runs the audit. This gives us natural backpressure and avoids racing audits when the user scrolls through tabs quickly.

---

## 3. Effect-TS Integration

### Dependencies

`effect` is pinned centrally via a Bun **workspace catalog** in the root `package.json` (currently `3.21.0` — the latest stable as of this plan):

```jsonc
// package.json
"workspaces": {
  "packages": ["apps/*", "packages/*"],
  "catalog": {
    "effect": "3.21.0"
  }
}
```

Each consuming package references it with the catalog protocol, so there is exactly one version across the monorepo:

```jsonc
// packages/seo-rules/package.json, apps/extension/package.json
"dependencies": {
  "effect": "catalog:"
}
```

Bumping Effect is a one-line change in the root. No React-specific Effect wrapper — we'll build a tiny `useRuntime` + `useAuditState` hook locally.

Tests additionally pull in `@effect/vitest` + `vitest` as devDeps (see §7).

#### Deferred — pull in when needed, not now

- `**@effect/platform` + `@effect/platform-browser**` — only when we start making `fetch` calls (e.g., OG image size check, future remote rules). `FetchHttpClient.layer` works fine inside the MV3 extension service worker because `fetch` is a standard web global there. Gives us typed `Schema` response decoding, retries, timeouts, and interruption-aware `AbortController` wiring. Not needed for extraction/audit which are local-only.
- `**@effect/rpc**` — only if the side-panel ↔ background port protocol grows past ~3 message types. For now, a `Schema.Union` of tagged port messages decoded with `Schema.decodeUnknown` is simpler and needs no transport adapter (no official `chrome.runtime.Port` transport exists).
- `**@effect/opentelemetry**` — only if we want to export `Effect.fn` spans to a real collector. Local dev can rely on `Logger.pretty`.

#### Not applicable

- `**@effect/platform-browser`'s `BrowserWorker` / `BrowserWorkerRunner**` — targets **Web Workers** (`new Worker(url)`), a page-spawned background thread. Our background script is an **MV3 extension service worker** — a different execution model with `chrome.`* APIs, event-driven wakeup, and ~30s idle termination. The two are unrelated despite the name collision. Don't import it.

### Branded primitives

Per `data-modeling.md`, nearly all semantic primitives should be branded. Define once in `packages/seo-rules/src/schema.ts` and reuse across packages:

```ts
export const TabId = Schema.Number.pipe(Schema.brand("TabId"))
export const PageUrl = Schema.String.pipe(Schema.brand("PageUrl"))
export const RuleId = Schema.String.pipe(Schema.brand("RuleId"))
export const Score = Schema.Int.pipe(Schema.between(0, 100), Schema.brand("Score"))
```

`TabId` in particular flows through `Queue`, `AuditCache`, and `AuditBus` — branding stops raw `number` from leaking in.

### Domain models as `Schema.Class`

`PageData`, `AuditFinding`, `AuditResult` are defined as `Schema.Class` (not loose shapes). This gives us `.make(...)` constructors, methods for view derivations, and identity for `Match`:

```ts
export class PageData extends Schema.Class<PageData>("PageData")({
  url: PageUrl,
  title: Schema.String,
  // ...
}) {}
```

### Shared error types (`packages/seo-rules/src/errors.ts`)

Use `Schema.TaggedError` so errors are serializable and `catchTags`-friendly. These are yieldable — return them directly instead of `Effect.fail(...)`:

- `ExtractionFailed` — content script didn't respond / returned malformed data. Fields: `{ tabId: TabId, cause: Schema.Defect }`.
- `NoActiveTab` — no audit-able tab (chrome://, about:blank, no window focused).
- `TabNotReady` — tab exists but is `loading` / not complete.
- `RestrictedUrl` — `chrome://`, `chrome-extension://`, Chrome Web Store — content scripts can't run.
- `AuditFailed` — a rule threw. Should be rare; rules are pure. Wrap any sync throw with `Effect.try` and wrap the caught value as `Schema.Defect`.

### `AuditState` as tagged union

Per `data-modeling.md`, model the panel state with `Schema.TaggedClass` variants + `Schema.Union`, not a hand-rolled TS union. This gives us exhaustive `Match.valueTags` at the render site and free serialization for port messages:

```ts
export class Idle extends Schema.TaggedClass<Idle>()("Idle", {}) {}
export class Running extends Schema.TaggedClass<Running>()("Running", { reason: Schema.String }) {}
export class Ready extends Schema.TaggedClass<Ready>()("Ready", { page: PageData, result: AuditResult }) {}
export class Loading extends Schema.TaggedClass<Loading>()("Loading", {}) {}
export class Restricted extends Schema.TaggedClass<Restricted>()("Restricted", {}) {}
export class AuditError extends Schema.TaggedClass<AuditError>()("AuditError", { message: Schema.String }) {}

export const AuditState = Schema.Union(Idle, Running, Ready, Loading, Restricted, AuditError)
export type AuditState = typeof AuditState.Type
```

### Services (Tag + co-located layer)

Each service is a `Context.Tag` class with `static readonly layer` / `static readonly testLayer` co-located (per `services-and-layers.md`). Service methods are defined with `Effect.fn("Service.method")(function*(){...})` so every call produces a traced span.

Defined in `apps/extension/src/lib/services/`:

- `**BrowserApi**` — thin wrapper around `browser.tabs`, `browser.runtime`, `browser.webNavigation`. Methods return Effects; errors lifted to tagged errors. Ships a `testLayer` backed by an in-memory tab map.
- `**Extractor**` — `extract(tabId): Effect<PageData, ExtractionFailed | RestrictedUrl | TabNotReady, BrowserApi>`. Sends `EXTRACT_PAGE_DATA`, validates the response with `Schema.decodeUnknown(PageData)`, times out at 2s.
- `**Auditor**` — `audit(page: PageData): Effect<AuditResult, AuditFailed>`. Wraps `runAudit` from `@workspace/seo-rules`.
- `**AuditCache**` — in-memory `Map<TabId, { url, result, at }>`. `get` / `set` / `invalidate`. TTL 30s; invalidated on `tabs.onUpdated`.
- `**AuditBus**` — holds a `SubscriptionRef<AuditState>` (or `PubSub<AuditState>` + `Ref`) per `TabId`. Panel subscribes; background publishes.

Compose the app layer with `Layer.provideMerge` so dependency order is explicit (`Extractor` needs `BrowserApi`, etc.):

```ts
const appLayer = AuditBus.layer.pipe(
  Layer.provideMerge(AuditCache.layer),
  Layer.provideMerge(Auditor.layer),
  Layer.provideMerge(Extractor.layer),
  Layer.provideMerge(BrowserApi.layer)
)
```

### Runtime

- **Background**: one `ManagedRuntime.make(AppLayer)` created at service-worker boot. All background handlers call `runtime.runPromise(program)` / `runtime.runFork(fiber)`.
- **Side panel**: a separate smaller runtime (only needs `BrowserApi` + `PanelClient` service). Provided via a React context; `useRuntime()` returns it.

Service workers in MV3 can be killed any time. The `ManagedRuntime` is re-created on each wake — services must be stateless or rehydrate from `chrome.storage.session`. `AuditCache` lives in memory only (acceptable — cache loss just means one extra re-extract).

### Core audit program

Defined with `Effect.fn` for call-site tracing. Each recovery branch returns a `Schema.TaggedClass` variant from §`AuditState`, not an object literal:

```ts
// background/program.ts
const auditTab = Effect.fn("Background.auditTab")(
  function* (tabId: TabId, reason: AuditReason) {
    const cache = yield* AuditCache
    const extractor = yield* Extractor
    const auditor = yield* Auditor
    const bus = yield* AuditBus

    yield* bus.publish(tabId, Running.make({ reason }))

    const page = yield* extractor.extract(tabId)
    const cached = yield* cache.get(tabId)
    if (cached && cached.url === page.url && reason !== "manual") {
      yield* bus.publish(tabId, Ready.make({ page, result: cached.result }))
      return
    }

    const result = yield* auditor.audit(page)
    yield* cache.set(tabId, { url: page.url, result, at: Date.now() })
    yield* bus.publish(tabId, Ready.make({ page, result }))
  }
).pipe(
  Effect.catchTags({
    RestrictedUrl:    ()  => bus.publish(tabId, Restricted.make({})),
    TabNotReady:      ()  => bus.publish(tabId, Loading.make({})),
    ExtractionFailed: (e) => bus.publish(tabId, AuditError.make({ message: String(e.cause) })),
    AuditFailed:      (e) => bus.publish(tabId, AuditError.make({ message: e.message })),
  })
)
```

### Queue + debouncing

```ts
const queue = yield* Queue.sliding<AuditRequest>(16)

yield* Stream.fromQueue(queue).pipe(
  Stream.groupByKey((r) => r.tabId),
  Stream.map(([, stream]) =>
    stream.pipe(
      Stream.debounce("200 millis"),
      Stream.mapEffect((r) => auditTab(r.tabId, r.reason))
    )
  ),
  Stream.flatten,
  Stream.runDrain,
  Effect.forkScoped
)
```

Result: per-tab debounce (SPA nav storms collapse), global concurrency is fine, latest wins via the sliding queue.

### Side-panel hook

The render switch uses `Match.valueTags` for exhaustive branching (per `data-modeling.md`) instead of an `if/else` on `_tag`:

```ts
function useAuditState() {
  const runtime = useRuntime()
  const [state, setState] = useState<AuditState>(Idle.make({}))
  useEffect(() => {
    const fiber = runtime.runFork(
      Effect.gen(function* () {
        const client = yield* PanelClient
        yield* client.states.pipe(Stream.runForEach((s) => Effect.sync(() => setState(s))))
      })
    )
    return () => runtime.runFork(Fiber.interrupt(fiber))
  }, [runtime])
  return state
}
```

`PanelClient` opens the port, yields a `Stream<AuditState>`, and exposes a `refresh()` effect.

---

## 4. Schema & View-Model Layer

`PageData` → `AuditResult` gives us raw inputs and findings. The Inspect tab needs *derived presentational* structures. Put them in `packages/seo-rules/src/view/`:

- `deriveMetaView(page)` → `{ title, description, canonical, robots, viewport, lang, charset }`.
- `deriveSocialView(page)` → `{ og: { title, description, image, type, siteName }, twitter: { card, site, creator, title, description, image }, domain }`. Missing fields return `null` — UI shows "—".
- `deriveIndexingView(page)` → `IndexingRow[]` (the rows the Inspect tab already renders). Driven by `robotsMeta` + canonical presence.
- `deriveJsonLdBlocks(page)` → validate each `jsonLd[]` entry with a minimal `Schema` for schema.org `@type` + known fields. Produces `JsonLdBlock[]` with `valid`, `note`, `fields`. The `unknown-type` finding reuses this output.
- `deriveBreadcrumbs(jsonLdBlocks)` → pull `BreadcrumbList.itemListElement`.
- `deriveImageGallery(page)` → already close to `page.images`; add a `missingAlt` boolean.

All derivations are pure. The side panel renders `state.result` + `state.page` through these functions; no more reading mock modules.

Schemas live next to the derivations. `PageDataSchema` in particular doubles as the extractor's validator.

---

## 5. Implementation Steps

Bite-sized, each independently verifiable.

1. **✅ Add** `effect` **+** `@effect/vitest` **+** `vitest`**.** Add `"effect": "catalog:"` to both packages. Add vitest as a devDep, add `vitest.config.ts`, wire `"test": "vitest run"`. Run `bun install`. Typecheck.
2. **✅ Define branded primitives, schemas, and errors in** `seo-rules`**.** `TabId`, `PageUrl`, `RuleId`, `Score`. `PageData`, `AuditFinding` (gains `id/title/category/context/grep`), `AuditResult` (gains `counts/categoryScores`) as `Schema.Class`. `AuditState` variants as `Schema.TaggedClass` + `Schema.Union`. Tagged errors module.
3. **✅ Port existing rules to the new shape.** `titleRule`, `metaDescriptionRule`, `headingsRule` — wrap outputs with category + context. Verify with `it.effect` table-driven tests in `tests/rules.test.ts`.
4. **✅ Add missing rules** for categories the UI already shows: headings skip-level, images missing-alt, structured-data valid-schema / unknown-type, indexing canonical + robots. Keep them pure and weight-balanced with the existing engine.
5. **✅ Add view-model derivations** (`packages/seo-rules/src/view/`). Export from package index.
6. ✅ **Create service classes in `apps/extension/src/lib/services/*`*: `BrowserApi`, `Extractor`, `Auditor`, `AuditCache`, `AuditBus`. Each is a `Context.Tag` class with `static readonly layer` and `static readonly testLayer`. Service methods use `Effect.fn("Service.method")(...)` for traced spans.
7. **✅ Rewrite** `entrypoints/background.ts` to build a `ManagedRuntime`, start the audit queue fiber, subscribe to tab/window/webNavigation events, and handle `runtime.onConnect` for the side panel port.
8. **✅ Keep `entrypoints/content.ts`** unchanged except for validating its output against `PageData` schema pre-send (cheap safety net).
9. **✅ Add `manifest.permissions`** `"tabs"` and `"webNavigation"` in `wxt.config.ts`. `activeTab` is not enough for background-initiated cross-tab messaging.
10. **✅ Build** `PanelClient` **service +** `useRuntime` **/** `useAuditState` **hooks** in the side panel.
11. **✅ Rewrite** `sidepanel/app.tsx` to consume `AuditState`: render `<Loading/>`, `<Restricted/>`, `<Error/>`, or the three tabs. Move tab contents into a `Ready` wrapper that passes `page` + `result` down.
12. **✅ Rewrite** `Header`**,** `OverviewTab`**,** `FindingsTab`**,** `InspectTab` to accept real data as props. Delete `data/placeholder.ts` when the last reference goes. Preserve the existing styling verbatim — this is a data-wiring change, not a redesign.
13. **✅ Switch to scoped live-DOM audits — Option B (§9).** Fetched-HTML misses RSC/CSR-rendered content (confirmed on Next.js App Router blog: zero headings in raw response, headings live in flight payload). Live DOM is the right source; mount-merging is solved by scoping to the active route subtree, not by avoiding the DOM.
14. **✅ Manual test matrix** — see §7.
15. **✅ JSON-LD improvements** — vocab detection, rich-results validation, and suggestions. See [json-ld-improvements.md](./json-ld-improvements.md). Tracked in PR [#1](https://github.com/Mark-Life/seo-lens/pull/1).

---

## 6. Edge Cases & Error Handling

- **Restricted URLs** (`chrome://`, `chrome-extension://`, `chrome.google.com/webstore`, `about:*`, `view-source:*`): detect in `Extractor` before messaging. Panel renders `<Restricted/>` with an explanation and a "try another tab" hint.
- **Content script not yet injected** (fresh install, page loaded before install): `browser.tabs.sendMessage` rejects with `Could not establish connection`. Map to `ExtractionFailed`, show retry. WXT auto-injects on matching pages going forward.
- **Tab not complete**: `tabs.get(tabId).status !== "complete"` → `TabNotReady`, wait for `onUpdated` to retrigger. Don't poll.
- **Service worker unload**: cache lost, in-flight fibers killed. Next panel connect re-audits. `ManagedRuntime` rebuilds cleanly.
- **Rapid tab switching**: per-tab debounce in the stream collapses to the latest. Cache TTL short-circuits re-extraction if URL is unchanged and < 2s old.
- **Malformed page data** (site monkey-patches `document`): `Schema.decodeUnknown` fails → `ExtractionFailed` with the parse error wrapped as `Schema.Defect` in `cause`.
- **Audit rule throws**: wrapped in `Effect.try`; reported as a single `ruleId: "engine.internal"` error finding so the user sees something rather than a blank panel.
- **Side panel open while background is cold**: connect triggers a bootstrap audit; panel shows `<Loading/>` until first `Ready`.

All errors are `TaggedError` so the UI's `Error` branch can render a specific message per tag, not a generic "something went wrong."

---

## 7. Testing

### Framework — `@effect/vitest`

Use `@effect/vitest`, **not `bun test`**. It provides `it.effect()`, `it.scoped()`, automatic `TestContext` / `TestClock` wiring, and fiber-failure reporting — none of which bun's runner has. Add to each package that has tests:

```bash
bun add -D vitest @effect/vitest
```

`vitest.config.ts` at each package root:

```ts
import { defineConfig } from "vitest/config"
export default defineConfig({ test: { include: ["tests/**/*.test.ts"] } })
```

Update `package.json` scripts to `"test": "vitest run"`. Import `describe`, `it`, `expect` from `@effect/vitest` (not `vitest`).

### Unit

- **Rules** (`packages/seo-rules`): pure functions, table-driven. `it.effect` + `Effect.provide` where needed.
- **View-model derivations**: same.
- `**PageData` schema**: `Schema.decodeUnknown` happy-path + malformed inputs.
- **Services**: each Tag ships a `static readonly testLayer`. Tests compose `serviceUnderTest.layer.pipe(Layer.provideMerge(Dep.testLayer), ...)` and call `Effect.provide(testLayer)` at the end of the test pipeline. Debounce tests use `TestClock.adjust` — this is why we need `@effect/vitest` specifically.

### Integration (manual, documented)

Drive through the existing `docs/local-testing.md` flow and verify:

1. Open side panel on a well-formed article — `Ready`, score > 0, findings populated.
2. Switch tabs to a second page — side panel updates within ~300ms, URL in header changes.
3. Navigate in-place on an SPA (e.g., github.com) — `webNavigation.onHistoryStateUpdated` fires, audit re-runs.
4. Switch to `chrome://extensions` — panel shows `<Restricted/>`.
5. Close + reopen side panel — first render uses cached result, no flicker.
6. Click "Refresh" — forces re-extraction even if cached.
7. Open panel on a tab that's still loading — shows `<Loading/>`, transitions to `<Ready/>` on complete.
8. Copy full report → paste into a text editor, confirm Markdown is clean.

### Performance budget

- Extract + audit round-trip < 150ms on a typical page (headings tree up to ~200 nodes). Debounce gives us room but shouldn't be load-bearing.
- Side-panel re-render on tab switch: single React state update; no list virtualization needed until findings > 100.

---

## 8. Out of Scope (for this pass)

- MCP server / agent API (US-4) — design sketch only.
- Firefox build — code is already WXT, should port cleanly but not tested this pass.
- JSON-LD schema.org validation beyond `@type` recognition + a hand-picked field allowlist. Full schema.org validation is a later package.
- Persistent cache across service-worker restarts (easy add later via `chrome.storage.session`).

---

## 9. SPA Mount-Merging — Switch to Fetched-HTML Audits

### The issue

Live-DOM extraction is the wrong source of truth for an SEO audit. On SPA frameworks (notably Next.js App Router with parallel routes, view transitions, or layouts that keep prior routes mounted), the active document can legitimately contain nodes from every route the user has visited. Confirmed in the wild: a single page returned 46 headings spanning ~5 distinct routes (`H1 Bots & Automation Solutions`, `H1 Services`, `H1 Launch Your Business with AI`, …) — all present in `document.querySelectorAll('h1...h6')` at steady state, not transitionally.

A `MutationObserver` quiet-window does not help: the merged DOM *is* the steady state. Filtering by visibility does not help either: the inactive routes are not hidden via CSS.

The deeper realisation: an SEO audit should answer **"what does a crawler see when it fetches this URL?"**, not "what is currently in the user's DOM." Those are different questions and we have been answering the wrong one.

### Options considered

**Option A — Fetch the URL from the background and audit the response HTML.** Use `@effect/platform` + `@effect/platform-browser` `FetchHttpClient`, parse with `DOMParser`, run extraction over the parsed document.

- Pros: matches crawler view (the correct SEO question); immune to SPA mount-merging, view transitions, hydration drift, dev overlays; no timing races (single static response); unblocks US-4 (agent API can audit a URL with no tab); Effect platform gives `Schema` decoding, retries, timeouts, `AbortController` wiring for free.
- Cons: misses client-rendered content (pure-CSR SPAs return an empty shell); audits run with the user's cookies unless we send `credentials: "omit"` (which then breaks on private pages); needs `host_permissions: ["<all_urls>"]` (scarier install banner); two HTTP requests per audit; potential drift between "what I see" and "what I audit."

**Option B — Filter the live DOM to visible / `<main>` content.** Scope `querySelectorAll` to `<main>` if present, exclude `[hidden]`, `aria-hidden`, `display:none`, `visibility:hidden`.

- Pros: tiny diff, stays in current architecture, no new permissions, often "good enough" on well-built sites that hide inactive routes.
- Cons: pure heuristic; does not help when inactive routes are *not* hidden (the actual failure case); wrongly excludes legitimate offscreen content (carousels, accordions); does not answer the SEO question — Google sees CSS-hidden content too.

**Option C — Hybrid: Option A with live-DOM fallback.** Default to fetched-HTML audit; if the response has no meaningful content (CSR shell), fall back to live-DOM extraction with a banner explaining the switch.

- Pros: correct for SSR sites, still works for SPAs, single coherent UX with the discrepancy made explicit.
- Cons: most code; two extraction paths to maintain; "is this CSR" is itself a heuristic.

### Decision

Go with **Option A** now. Option C (A+B hybrid) is the eventual destination once the fetched-HTML path is solid and we have a real signal for "this is a CSR shell, fall back."

### Implementation steps (Option A)

1. **Add platform deps.** `@effect/platform` + `@effect/platform-browser` to the extension via the workspace catalog. Bump catalog if needed.
2. **Add `host_permissions: ["<all_urls>"]`** in `wxt.config.ts`. Required for the background to `fetch` arbitrary origins.
3. **Refactor extraction to be document-agnostic.** Today `extractPageData` in `content.ts` reads the global `document`. Lift the logic into `packages/seo-rules/src/extract.ts` as `extractFromDocument(doc: Document): unknown` (pure, takes a `Document`). The content script and the new HtmlExtractor service both call it.
4. **New `Fetcher` service** (`apps/extension/src/lib/services/fetcher.ts`). `Context.Tag` class, layer built on `FetchHttpClient.layer`. Method `fetch(url: PageUrl): Effect<string, FetchFailed>`. 10s timeout via `Effect.timeoutFail`. Sets `User-Agent: SEO-Lens/1.0 (+crawler-view)` and `credentials: "omit"` to match an unauthenticated crawler. New tagged error `FetchFailed { url, status?, cause }` in `seo-rules/src/errors.ts`.
5. **New `HtmlExtractor` service** (`apps/extension/src/lib/services/html-extractor.ts`). Method `extract(url: PageUrl, html: string): Effect<PageData, ExtractionFailed>`. Parses with `new DOMParser().parseFromString(html, "text/html")`, calls `extractFromDocument`, decodes through `PageData` schema, attaches `url` (from the request, not from the parsed doc — avoids `<base>` shenanigans).
6. **Rewrite `Extractor`** to compose `Fetcher` + `HtmlExtractor`:
  - `extract(tabId)` resolves the tab's URL via `BrowserApi`, runs `ensureAuditable`, then `Fetcher.fetch(url)` → `HtmlExtractor.extract(url, html)`.
  - Drop the `browser.tabs.sendMessage(EXTRACT_PAGE_DATA)` path. The content script and its message listener can be deleted in a follow-up step (kept around briefly for diffing during rollout).
7. **Wire `Fetcher` + `HtmlExtractor` into `appLayer`** in `services/index.ts`, with `FetchHttpClient.layer` provided to `Fetcher`.
8. **Update error handling in `auditTab`.** Add `FetchFailed` to the `Effect.catchTags` block — publish `AuditError` with a message distinguishing network failure (no response), HTTP error (status code), and parse failure.
9. **Delete the live-DOM content script path.** Remove `apps/extension/src/entrypoints/content.ts` and the `EXTRACT_PAGE_DATA` listener wiring. Drop the `MutationObserver` quiet-window helper added during the previous fix attempt. Update `wxt.config.ts` if it lists the content script entrypoint explicitly.
10. **Tests.** `HtmlExtractor`: table-driven `it.effect` over fixture HTML strings (one SSR Next.js page, one CSR shell, one with inline JSON-LD). `Fetcher`: stub `HttpClient` via `@effect/platform`'s test utilities; assert timeout, non-2xx, and happy paths.
11. **Manual verification.** Re-run the original repro: navigate the user's Next.js site between blog and home. Side panel should show only the current page's headings. Then open `chrome://extensions` — should still render `<Restricted/>` (the `BrowserApi.ensureAuditable` check still runs against the tab URL, before the fetch).

### Deferred to Option C (future)

- CSR-shell detection heuristic and live-DOM fallback path.
- "Audit this fetched URL" vs. "Inspect the live DOM" as two distinct user intents in the UI.
- Surfacing the discrepancy when the fetched HTML and the live DOM disagree.

---

## 10. Render Images in the Side Panel

### The issue

OG preview, Twitter card, and the image gallery in `InspectTab` currently render a placeholder `<ImageIcon/>` instead of the actual image. The data is already extracted (`social.og.image`, `social.twitter.image`, `images[].src`) — the UI just never wires it to an `<img>` tag.

### Approach

No `fetch` needed. The side panel runs in an extension document and can load arbitrary cross-origin URLs via a plain `<img src>` (browsers don't enforce CORS on image *display*, only on canvas readback). No new permissions, no background round-trip.

### Requirements

- **Absolute URLs.** Extracted `og:image`, `twitter:image`, and `<img src>` may be relative. Resolve against the page URL during extraction (`new URL(src, pageUrl).href`) so the side panel receives absolute hrefs. Do this in `extractFromDocument` for `images`, and in `deriveSocialView` (or upstream extraction) for OG/Twitter image fields.
- **Graceful failure.** Hotlink-blocked, 404, or auth-gated images must not break the layout. Track per-image load error in local state; on `onError`, fall back to the existing `<ImageIcon/>` placeholder.
- **Lazy + decoded async.** `loading="lazy" decoding="async" referrerPolicy="no-referrer"` on every `<img>`. `no-referrer` reduces hotlink-blocking; `lazy` matters for the gallery grid.
- **Aspect preservation.** Keep the existing aspect-ratio containers (`aspect-[1200/630]`, `aspect-[2/1]`, `aspect-square`) and apply `object-cover` so off-spec images don't distort.
- **No size/validation pass.** OG image dimension checks (1200×630 etc.) stay deferred per §8. Just render.

### Implementation steps

1. **Resolve image URLs to absolute in extraction.** Update `extractFromDocument` (`packages/seo-rules/src/extract.ts`) so `images[i].src`, `og:image`, and `twitter:image` are absolute. Use the document's URL (passed in, since the parsed `Document` from `DOMParser` has no base). Add a small `toAbsolute(href, base)` helper that returns `null` on invalid.
2. **Schema.** No shape change — fields stay `string`. Add a JSDoc note that they're absolute post-extraction.
3. `**InspectTab` — OG preview.** Replace the placeholder block at inspect-tab.tsx:128 with `{social.og.image ? <img .../> : <Placeholder/>}`. Use `object-cover absolute inset-0 size-full`.
4. `**InspectTab` — Twitter card.** Same treatment at inspect-tab.tsx:159.
5. `**InspectTab` — image gallery.** Replace the placeholder at inspect-tab.tsx:351. Same fallback pattern.
6. **Per-image error fallback.** Extract a tiny `<RemoteImage src fallback />` component co-located in `inspect-tab.tsx` (or a sibling file) that owns the `errored` state. All three sites use it.
7. **Manual verification.** Open the side panel on a page with OG image + several `<img>`s; confirm previews render, gallery populates, and a deliberately broken src falls back to the icon without console noise beyond the expected image load error.

### Out of scope

- Image dimension / file-size checks (still deferred — needs HEAD request + permission).
- Caching fetched bytes (browser HTTP cache is enough).
- Lightbox / click-to-enlarge.

---

## 11. File Touch List

**New**

- `packages/seo-rules/src/errors.ts`
- `packages/seo-rules/src/schema.ts`
- `packages/seo-rules/src/extract.ts` (document-agnostic extraction — §9)
- `packages/seo-rules/src/view/{meta,social,indexing,jsonld,breadcrumbs,images}.ts`
- `packages/seo-rules/src/rules/{headings-skip,images-alt,structured,indexing,social}.ts`
- `apps/extension/src/lib/services/{browser-api,extractor,auditor,cache,bus,panel-client,fetcher,html-extractor}.ts`
- `apps/extension/src/lib/runtime.ts` (ManagedRuntime + React context)
- `apps/extension/src/entrypoints/sidepanel/hooks/use-audit-state.ts`
- `apps/extension/src/entrypoints/sidepanel/components/states/{loading,restricted,error}.tsx`

**Modified**

- `packages/seo-rules/src/types.ts`, `engine.ts`, `rules/*.ts`, `index.ts`
- `apps/extension/src/entrypoints/background.ts` — full rewrite.
- `apps/extension/src/lib/services/extractor.ts` — rewritten to compose `Fetcher` + `HtmlExtractor` (§9).
- `apps/extension/src/entrypoints/sidepanel/app.tsx` — consume `AuditState`.
- `apps/extension/src/entrypoints/sidepanel/components/{header,overview-tab,findings-tab,inspect-tab}.tsx` — props instead of placeholder import.
- `apps/extension/wxt.config.ts` — add `tabs`, `webNavigation` permissions, plus `host_permissions: ["<all_urls>"]` (§9).
- `apps/extension/package.json`, `packages/seo-rules/package.json` — add `effect`, `@effect/platform`, `@effect/platform-browser`.

**Deleted (at the end)**

- `apps/extension/src/entrypoints/sidepanel/data/placeholder.ts`
- `apps/extension/src/entrypoints/content.ts` — live-DOM extraction superseded by fetched-HTML audit (§9).

