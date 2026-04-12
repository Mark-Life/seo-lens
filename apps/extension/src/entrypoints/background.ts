import {
  AuditError,
  Loading,
  type PageData,
  Ready,
  Restricted,
  Running,
  type TabId,
} from "@workspace/seo-rules";
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
} from "@/lib/services";

interface AuditRequest {
  readonly reason: string;
  readonly tabId: TabId;
}

const auditTab = Effect.fn("Background.auditTab")(function* (
  tabId: TabId,
  reason: string
) {
  const cache = yield* AuditCache;
  const extractor = yield* Extractor;
  const auditor = yield* Auditor;
  const bus = yield* AuditBus;

  yield* bus.publish(tabId, Running.make({ reason }));

  const program = Effect.gen(function* () {
    const page: PageData = yield* extractor.extract(tabId);
    const cached = yield* cache.get(tabId);
    if (
      Option.isSome(cached) &&
      cached.value.url === page.url &&
      reason !== "manual"
    ) {
      yield* bus.publish(
        tabId,
        Ready.make({ page, result: cached.value.result })
      );
      return;
    }
    const result = yield* auditor.audit(page);
    yield* cache.set(tabId, { url: page.url, result, at: Date.now() });
    yield* bus.publish(tabId, Ready.make({ page, result }));
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

const main = Effect.gen(function* () {
  const api = yield* BrowserApi;
  const bus = yield* AuditBus;

  const queue = yield* Queue.sliding<AuditRequest>(16);
  const activeTab = yield* SubscriptionRef.make<Option.Option<TabId>>(
    Option.none()
  );

  const setActive = (tabId: TabId) =>
    SubscriptionRef.set(activeTab, Option.some(tabId));

  const enqueue = (req: AuditRequest) => Queue.offer(queue, req);

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
        Stream.debounce("200 millis"),
        Stream.mapEffect((r) => auditTab(r.tabId, r.reason))
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

      yield* portMessages.pipe(
        Stream.tap((msg) =>
          Effect.gen(function* () {
            if (
              typeof msg === "object" &&
              msg !== null &&
              (msg as { type?: unknown }).type === "refresh"
            ) {
              const current = yield* SubscriptionRef.get(activeTab);
              if (Option.isSome(current)) {
                yield* enqueue({
                  tabId: current.value,
                  reason: "manual",
                });
              }
            }
          })
        ),
        Stream.runDrain
      );

      yield* Fiber.interrupt(pump);
    }).pipe(Effect.scoped);

  yield* ports.pipe(
    Stream.mapEffect((port) => Effect.fork(handleConnection(port)), {
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
    if (tab.id) {
      await browser.sidePanel.open({ tabId: tab.id });
    }
  });
});
