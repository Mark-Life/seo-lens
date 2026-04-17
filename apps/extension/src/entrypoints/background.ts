import {
  loadSchemaVocab,
  type SchemaVocab,
} from "@workspace/seo-rules/generated/schema-vocab";
import {
  AuditError,
  Loading,
  Ready,
  Restricted,
  Running,
  TabId,
} from "@workspace/seo-rules/schema";
import {
  Effect,
  Fiber,
  GroupBy,
  ManagedRuntime,
  Option,
  Queue,
  Stream,
  SubscriptionRef,
} from "effect";
import type { Browser } from "wxt/browser";
import {
  AuditBus,
  AuditCache,
  Auditor,
  appLayer,
  BrowserApi,
  Extractor,
  SiteSignalsService,
  type TabEvent,
} from "@/lib/services";

interface AuditRequest {
  readonly reason: string;
  readonly tabId: TabId;
  readonly urgent: boolean;
}

const SETTLE_DELAY = "1000 millis";

const PASSIVE_REASONS = new Set([
  "activated",
  "focus",
  "panel-connect",
  "panel-hello",
  "action-click",
]);

const originOf = (url: string): string => {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
};

let vocabReadyRef: Promise<SchemaVocab> | null = null;

const auditTab = Effect.fn("Background.auditTab")(function* (
  tabId: TabId,
  reason: string,
  scheduleSettle: (tabId: TabId) => Effect.Effect<void>
) {
  const cache = yield* AuditCache;
  const extractor = yield* Extractor;
  const auditor = yield* Auditor;
  const siteSignalsService = yield* SiteSignalsService;
  const bus = yield* AuditBus;
  const api = yield* BrowserApi;

  if (PASSIVE_REASONS.has(reason)) {
    const tab = yield* api.getTab(tabId).pipe(Effect.option);
    const cached = yield* cache.get(tabId);
    if (
      Option.isSome(tab) &&
      Option.isSome(cached) &&
      cached.value.url === tab.value.url
    ) {
      return;
    }
  }

  yield* bus.publish(tabId, Running.make({ reason }));

  const program = Effect.gen(function* () {
    const { page, signals } = yield* extractor.extract(
      tabId,
      reason === "settle"
    );
    const cached = yield* cache.get(tabId);
    if (
      Option.isSome(cached) &&
      cached.value.url === page.url &&
      reason !== "manual" &&
      reason !== "settle"
    ) {
      yield* bus.publish(
        tabId,
        Ready.make({ page, result: cached.value.result })
      );
      return;
    }

    const urlCached = yield* cache.getByUrl(page.url);
    if (Option.isSome(urlCached)) {
      yield* bus.publish(
        tabId,
        Ready.make({ page, result: urlCached.value.result })
      );
    }

    // Phase 1: page-level audit (no site signals needed).
    if (vocabReadyRef !== null) {
      yield* Effect.promise(() => vocabReadyRef as Promise<SchemaVocab>);
    }
    const pageResult = yield* auditor.auditPage(page, signals);
    yield* cache.set(tabId, {
      url: page.url,
      result: pageResult,
      at: Date.now(),
    });
    yield* bus.publish(tabId, Ready.make({ page, result: pageResult }));

    const isThinPage = page.headings.length === 0 || page.title.trim() === "";

    if (isThinPage && reason !== "settle") {
      yield* scheduleSettle(tabId);
    }

    // Phase 2: full audit with site signals (forked, non-blocking).
    yield* Effect.gen(function* () {
      const origin = originOf(page.url);
      const siteSignals = yield* siteSignalsService.get(origin, page);
      const fullResult = yield* auditor.audit(page, signals, siteSignals);
      yield* cache.set(tabId, {
        url: page.url,
        result: fullResult,
        at: Date.now(),
      });
      yield* bus.publish(tabId, Ready.make({ page, result: fullResult }));
    }).pipe(
      Effect.catchTag("AuditFailed", (e) =>
        bus.publish(tabId, AuditError.make({ message: String(e.cause) }))
      ),
      Effect.forkDaemon,
      Effect.asVoid
    );
  });

  yield* program.pipe(
    Effect.catchTags({
      RestrictedUrl: () => bus.publish(tabId, Restricted.make()),
      TabNotReady: () => bus.publish(tabId, Loading.make()),
      ExtractionFailed: (e) => {
        const needsReload =
          typeof e.cause === "object" &&
          e.cause !== null &&
          "_tag" in e.cause &&
          e.cause._tag === "NoActiveTab";
        return bus.publish(
          tabId,
          AuditError.make({
            message: needsReload
              ? "Could not reach the page. Reload the tab to connect."
              : String(e.cause),
            needsReload,
          })
        );
      },
      AuditFailed: (e) =>
        bus.publish(tabId, AuditError.make({ message: String(e.cause) })),
    })
  );
});

interface BackgroundHandle {
  readonly focusTab: (tabId: TabId, reason: string) => Effect.Effect<void>;
}

let handle: BackgroundHandle | null = null;

const main = Effect.gen(function* () {
  const api = yield* BrowserApi;
  const bus = yield* AuditBus;
  const cache = yield* AuditCache;

  const urgentQueue = yield* Queue.sliding<AuditRequest>(16);
  const normalQueue = yield* Queue.sliding<AuditRequest>(16);
  const activeTab = yield* SubscriptionRef.make<Option.Option<TabId>>(
    Option.none()
  );
  const panelOpen = yield* SubscriptionRef.make(0);
  const isPanelOpen = SubscriptionRef.get(panelOpen).pipe(
    Effect.map((n) => n > 0)
  );

  const setActive = (tabId: TabId) =>
    SubscriptionRef.set(activeTab, Option.some(tabId));

  const enqueue = (req: AuditRequest) =>
    Queue.offer(req.urgent ? urgentQueue : normalQueue, req);

  const scheduleSettle = (tabId: TabId) =>
    Effect.gen(function* () {
      yield* Effect.sleep(SETTLE_DELAY);
      yield* cache.invalidate(tabId);
      yield* enqueue({ tabId, reason: "settle", urgent: true });
    }).pipe(Effect.forkDaemon, Effect.asVoid);

  handle = {
    focusTab: (tabId, reason) =>
      Effect.gen(function* () {
        yield* setActive(tabId);
        yield* enqueue({ tabId, reason, urgent: true });
      }),
  };

  // Bootstrap active-tab ref only; audits start when the panel connects.
  yield* api.getActiveTab().pipe(
    Effect.tap((tab) => setActive(tab.id)),
    Effect.ignore
  );

  const handleActivated = (tabId: TabId) =>
    Effect.gen(function* () {
      yield* setActive(tabId);
      if (yield* isPanelOpen) {
        yield* enqueue({ tabId, reason: "activated", urgent: true });
      }
    });

  const enqueueIfActive = (tabId: TabId, reason: string) =>
    Effect.gen(function* () {
      if (!(yield* isPanelOpen)) {
        return;
      }
      yield* cache.invalidate(tabId);
      const cur = yield* SubscriptionRef.get(activeTab);
      if (Option.isSome(cur) && cur.value === tabId) {
        yield* enqueue({ tabId, reason, urgent: false });
      }
    });

  const handleFocusChanged = Effect.gen(function* () {
    const tab = yield* api.getActiveTab().pipe(Effect.option);
    if (Option.isNone(tab)) {
      return;
    }
    yield* setActive(tab.value.id);
    if (yield* isPanelOpen) {
      yield* enqueue({ tabId: tab.value.id, reason: "focus", urgent: true });
    }
  });

  const handleEvent = (ev: TabEvent) => {
    switch (ev._tag) {
      case "Activated":
        return handleActivated(ev.tabId);
      case "Updated":
        return enqueueIfActive(ev.tabId, "updated");
      case "HistoryStateUpdated":
        return enqueueIfActive(ev.tabId, "history");
      case "WindowFocusChanged":
        return handleFocusChanged;
      default:
        return Effect.void;
    }
  };

  // Browser event producer.
  yield* api.events.pipe(
    Stream.tap(handleEvent),
    Stream.runDrain,
    Effect.forkDaemon
  );

  const consumeQueue = (q: Queue.Queue<AuditRequest>, debounceMs: number) =>
    Stream.fromQueue(q).pipe(
      Stream.groupByKey((r) => r.tabId),
      GroupBy.evaluate((_key, inner) =>
        inner.pipe(
          Stream.debounce(`${debounceMs} millis`),
          Stream.mapEffect((r) => auditTab(r.tabId, r.reason, scheduleSettle))
        )
      ),
      Stream.runDrain,
      Effect.forkDaemon
    );

  yield* consumeQueue(urgentQueue, 50);
  yield* consumeQueue(normalQueue, 300);

  // Side-panel port connections.
  const ports = Stream.asyncPush<Browser.runtime.Port>((emit) =>
    Effect.sync(() => {
      const handler = (port: Browser.runtime.Port) => {
        if (port.name === "sidepanel") {
          emit.single(port);
        }
      };
      browser.runtime.onConnect.addListener(handler);
      return Effect.sync(() => {
        browser.runtime.onConnect.removeListener(handler);
      });
    })
  );

  const handleConnection = (port: Browser.runtime.Port) =>
    Effect.gen(function* () {
      yield* SubscriptionRef.update(panelOpen, (n) => n + 1);
      yield* Effect.addFinalizer(() =>
        SubscriptionRef.update(panelOpen, (n) => Math.max(0, n - 1))
      );

      // Trigger an audit for the current active tab on connect.
      const cur = yield* SubscriptionRef.get(activeTab);
      if (Option.isSome(cur)) {
        yield* enqueue({
          tabId: cur.value,
          reason: "panel-connect",
          urgent: true,
        });
      }

      // Stream audit state for the current active tab to the port.
      const stateStream = activeTab.changes.pipe(
        Stream.filterMap((opt) => opt),
        Stream.flatMap((tabId) => bus.subscribe(tabId), {
          switch: true,
          concurrency: 1,
        })
      );

      const pump = yield* stateStream.pipe(
        Stream.tap((state) =>
          Effect.sync(() => {
            try {
              port.postMessage({ type: "state", state });
            } catch {
              // Port already closed; finalizer will tear down.
            }
          })
        ),
        Stream.runDrain,
        Effect.fork
      );

      // Listen for messages and disconnect.
      const portMessages = Stream.asyncPush<unknown>((emit) =>
        Effect.sync(() => {
          const onMsg = (msg: unknown) => emit.single(msg);
          const onDisc = () => emit.end();
          port.onMessage.addListener(onMsg);
          port.onDisconnect.addListener(onDisc);
          return Effect.sync(() => {
            port.onMessage.removeListener(onMsg);
            port.onDisconnect.removeListener(onDisc);
          });
        })
      );

      const handleHello = (tabId: TabId) =>
        Effect.gen(function* () {
          yield* setActive(tabId);
          yield* enqueue({ tabId, reason: "panel-hello", urgent: true });
        });

      const handleRefresh = Effect.gen(function* () {
        const current = yield* SubscriptionRef.get(activeTab);
        if (Option.isSome(current)) {
          yield* enqueue({
            tabId: current.value,
            reason: "manual",
            urgent: true,
          });
        }
      });

      const handleReloadPage = Effect.gen(function* () {
        const current = yield* SubscriptionRef.get(activeTab);
        if (Option.isSome(current)) {
          yield* api.reloadTab(current.value);
        }
      });

      const parsePortMessage = (msg: unknown) => {
        if (typeof msg !== "object" || msg === null) {
          return null;
        }
        const m = msg as { type?: unknown; tabId?: unknown };
        if (m.type === "hello" && typeof m.tabId === "number") {
          return { _tag: "hello" as const, tabId: TabId.make(m.tabId) };
        }
        if (m.type === "refresh") {
          return { _tag: "refresh" as const };
        }
        if (m.type === "reload-page") {
          return { _tag: "reload-page" as const };
        }
        return null;
      };

      const handlePortMessage = (msg: unknown) => {
        const parsed = parsePortMessage(msg);
        if (parsed === null) {
          return Effect.void;
        }
        switch (parsed._tag) {
          case "hello":
            return handleHello(parsed.tabId);
          case "refresh":
            return handleRefresh;
          case "reload-page":
            return handleReloadPage;
          default:
            return Effect.void;
        }
      };

      yield* portMessages.pipe(Stream.tap(handlePortMessage), Stream.runDrain);

      yield* Fiber.interrupt(pump);
    }).pipe(Effect.scoped);

  yield* ports.pipe(
    Stream.mapEffect((port) => Effect.forkDaemon(handleConnection(port)), {
      concurrency: "unbounded",
    }),
    Stream.runDrain,
    Effect.forkDaemon
  );
});

const fetchSchemaVocab = async () => {
  const url = browser.runtime.getURL("/schema-vocab.json");
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load schema-vocab.json: ${res.status}`);
  }
  return res.json();
};

export default defineBackground(() => {
  const runtime = ManagedRuntime.make(appLayer);
  vocabReadyRef = loadSchemaVocab(fetchSchemaVocab);
  runtime.runFork(main);

  browser.action.onClicked.addListener(async (tab) => {
    if (tab.id == null) {
      return;
    }
    await browser.sidePanel.open({ tabId: tab.id });
    if (handle) {
      runtime.runFork(handle.focusTab(TabId.make(tab.id), "action-click"));
    }
  });
});
