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
} from "@/lib/services";

interface AuditRequest {
  readonly reason: string;
  readonly tabId: TabId;
}

const SETTLE_DELAY = "1800 millis";

const originOf = (url: string): string => {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
};

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

  yield* bus.publish(tabId, Running.make({ reason }));

  const program = Effect.gen(function* () {
    const { page, signals } = yield* extractor.extract(tabId);
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
    const origin = originOf(page.url);
    const siteSignals = yield* siteSignalsService.get(origin, page);
    const result = yield* auditor.audit(page, signals, siteSignals);
    yield* cache.set(tabId, { url: page.url, result, at: Date.now() });
    yield* bus.publish(tabId, Ready.make({ page, result }));
    if (page.headings.length === 0 && reason !== "settle") {
      yield* scheduleSettle(tabId);
    }
  });

  yield* program.pipe(
    Effect.catchTags({
      RestrictedUrl: () => bus.publish(tabId, Restricted.make()),
      TabNotReady: () => bus.publish(tabId, Loading.make()),
      ExtractionFailed: (e) =>
        bus.publish(tabId, AuditError.make({ message: String(e.cause) })),
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

  const queue = yield* Queue.sliding<AuditRequest>(16);
  const activeTab = yield* SubscriptionRef.make<Option.Option<TabId>>(
    Option.none()
  );

  const setActive = (tabId: TabId) =>
    SubscriptionRef.set(activeTab, Option.some(tabId));

  const enqueue = (req: AuditRequest) => Queue.offer(queue, req);

  const scheduleSettle = (tabId: TabId) =>
    Effect.gen(function* () {
      yield* Effect.sleep(SETTLE_DELAY);
      yield* cache.invalidate(tabId);
      yield* enqueue({ tabId, reason: "settle" });
    }).pipe(Effect.forkDaemon, Effect.asVoid);

  handle = {
    focusTab: (tabId, reason) =>
      Effect.gen(function* () {
        yield* setActive(tabId);
        yield* enqueue({ tabId, reason });
      }),
  };

  // Bootstrap from current active tab.
  yield* api.getActiveTab().pipe(
    Effect.tap((tab) => setActive(tab.id)),
    Effect.tap((tab) => enqueue({ tabId: tab.id, reason: "boot" })),
    Effect.ignore
  );

  // Browser event producer.
  yield* api.events.pipe(
    Stream.tap((ev) =>
      Effect.gen(function* () {
        switch (ev._tag) {
          case "Activated": {
            yield* setActive(ev.tabId);
            yield* enqueue({ tabId: ev.tabId, reason: "activated" });
            return;
          }
          case "Updated": {
            yield* AuditCache.pipe(
              Effect.flatMap((c) => c.invalidate(ev.tabId))
            );
            const cur = yield* SubscriptionRef.get(activeTab);
            if (Option.isSome(cur) && cur.value === ev.tabId) {
              yield* enqueue({ tabId: ev.tabId, reason: "updated" });
            }
            return;
          }
          case "HistoryStateUpdated": {
            yield* AuditCache.pipe(
              Effect.flatMap((c) => c.invalidate(ev.tabId))
            );
            const cur = yield* SubscriptionRef.get(activeTab);
            if (Option.isSome(cur) && cur.value === ev.tabId) {
              yield* enqueue({ tabId: ev.tabId, reason: "history" });
            }
            return;
          }
          case "WindowFocusChanged": {
            const tab = yield* api.getActiveTab().pipe(Effect.option);
            if (Option.isSome(tab)) {
              yield* setActive(tab.value.id);
              yield* enqueue({ tabId: tab.value.id, reason: "focus" });
            }
            return;
          }
          default:
            return;
        }
      })
    ),
    Stream.runDrain,
    Effect.forkDaemon
  );

  // Per-tab debounced consumer (latest wins via the sliding queue).
  yield* Stream.fromQueue(queue).pipe(
    Stream.groupByKey((r) => r.tabId),
    GroupBy.evaluate((_key, inner) =>
      inner.pipe(
        Stream.debounce("500 millis"),
        Stream.mapEffect((r) => auditTab(r.tabId, r.reason, scheduleSettle))
      )
    ),
    Stream.runDrain,
    Effect.forkDaemon
  );

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
      // Trigger an audit for the current active tab on connect.
      const cur = yield* SubscriptionRef.get(activeTab);
      if (Option.isSome(cur)) {
        yield* enqueue({ tabId: cur.value, reason: "panel-connect" });
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
          yield* enqueue({ tabId, reason: "panel-hello" });
        });

      const handleRefresh = Effect.gen(function* () {
        const current = yield* SubscriptionRef.get(activeTab);
        if (Option.isSome(current)) {
          yield* enqueue({ tabId: current.value, reason: "manual" });
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
        return null;
      };

      const handlePortMessage = (msg: unknown) => {
        const parsed = parsePortMessage(msg);
        if (parsed === null) {
          return Effect.void;
        }
        return parsed._tag === "hello"
          ? handleHello(parsed.tabId)
          : handleRefresh;
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

export default defineBackground(() => {
  const runtime = ManagedRuntime.make(appLayer);
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
