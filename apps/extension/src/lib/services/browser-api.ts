import {
  NoActiveTab,
  RestrictedUrl,
  TabNotReady,
} from "@workspace/seo-rules/errors";
import { TabId } from "@workspace/seo-rules/schema";
import { Context, Effect, Layer, Stream } from "effect";

export interface TabInfo {
  readonly id: TabId;
  readonly status: "loading" | "complete";
  readonly url: string;
}

export type TabEvent =
  | { readonly _tag: "Activated"; readonly tabId: TabId }
  | { readonly _tag: "Updated"; readonly tabId: TabId; readonly url: string }
  | { readonly _tag: "HistoryStateUpdated"; readonly tabId: TabId }
  | { readonly _tag: "WindowFocusChanged" };

const RESTRICTED_PREFIXES = [
  "chrome://",
  "chrome-extension://",
  "edge://",
  "about:",
  "view-source:",
  "https://chrome.google.com/webstore",
  "https://chromewebstore.google.com",
];

export const isRestrictedUrl = (url: string): boolean =>
  RESTRICTED_PREFIXES.some((p) => url.startsWith(p));

export interface BrowserApiShape {
  readonly ensureAuditable: (
    tab: TabInfo
  ) => Effect.Effect<TabInfo, RestrictedUrl | TabNotReady>;
  readonly events: Stream.Stream<TabEvent>;
  readonly getActiveTab: () => Effect.Effect<
    TabInfo,
    NoActiveTab | TabNotReady
  >;
  readonly getTab: (
    tabId: TabId
  ) => Effect.Effect<TabInfo, NoActiveTab | TabNotReady>;
  readonly sendMessage: <A>(
    tabId: TabId,
    message: unknown
  ) => Effect.Effect<A, NoActiveTab>;
}

export class BrowserApi extends Context.Tag("BrowserApi")<
  BrowserApi,
  BrowserApiShape
>() {
  static readonly layer = Layer.sync(BrowserApi, () => {
    const getTab = Effect.fn("BrowserApi.getTab")(function* (tabId: TabId) {
      const tab = yield* Effect.tryPromise({
        try: () => browser.tabs.get(tabId),
        catch: () => new NoActiveTab(),
      });
      if (!tab || tab.id == null) {
        return yield* new NoActiveTab();
      }
      return {
        id: tabId,
        url: tab.url ?? "",
        status: (tab.status === "complete" ? "complete" : "loading") as
          | "complete"
          | "loading",
      };
    });

    const getActiveTab = Effect.fn("BrowserApi.getActiveTab")(function* () {
      const [tab] = yield* Effect.tryPromise({
        try: () =>
          browser.tabs.query({ active: true, lastFocusedWindow: true }),
        catch: () => new NoActiveTab(),
      });
      if (!tab || tab.id == null) {
        return yield* new NoActiveTab();
      }
      return yield* getTab(TabId.make(tab.id));
    });

    const ensureAuditable = Effect.fn("BrowserApi.ensureAuditable")(function* (
      tab: TabInfo
    ) {
      if (isRestrictedUrl(tab.url)) {
        return yield* new RestrictedUrl({ url: tab.url });
      }
      return tab;
    });

    const sendMessage = <A>(tabId: TabId, message: unknown) =>
      Effect.tryPromise({
        try: () => browser.tabs.sendMessage(tabId, message) as Promise<A>,
        catch: () => new NoActiveTab(),
      }).pipe(
        Effect.withSpan("BrowserApi.sendMessage", { attributes: { tabId } })
      );

    const events: Stream.Stream<TabEvent> = Stream.asyncPush<TabEvent>((emit) =>
      Effect.sync(() => {
        const onActivated = (info: { tabId: number }) => {
          emit.single({ _tag: "Activated", tabId: TabId.make(info.tabId) });
        };
        const onUpdated = (
          tabId: number,
          changeInfo: { status?: string; url?: string },
          tab: { url?: string }
        ) => {
          if (changeInfo.status === "complete") {
            emit.single({
              _tag: "Updated",
              tabId: TabId.make(tabId),
              url: tab.url ?? "",
            });
          }
        };
        const onHistory = (details: { tabId: number; frameId: number }) => {
          if (details.frameId === 0) {
            emit.single({
              _tag: "HistoryStateUpdated",
              tabId: TabId.make(details.tabId),
            });
          }
        };
        const onFocusChanged = (_windowId: number) => {
          emit.single({ _tag: "WindowFocusChanged" });
        };
        browser.tabs.onActivated.addListener(onActivated);
        browser.tabs.onUpdated.addListener(onUpdated);
        browser.webNavigation?.onHistoryStateUpdated.addListener(onHistory);
        browser.windows?.onFocusChanged.addListener(onFocusChanged);
        return Effect.sync(() => {
          browser.tabs.onActivated.removeListener(onActivated);
          browser.tabs.onUpdated.removeListener(onUpdated);
          browser.webNavigation?.onHistoryStateUpdated.removeListener(
            onHistory
          );
          browser.windows?.onFocusChanged.removeListener(onFocusChanged);
        });
      })
    );

    return BrowserApi.of({
      getTab,
      getActiveTab,
      ensureAuditable,
      sendMessage,
      events,
    });
  });

  static readonly testLayer = (init?: {
    tabs?: readonly TabInfo[];
    respond?: (tabId: TabId, message: unknown) => unknown;
  }) =>
    Layer.sync(BrowserApi, () => {
      const tabs = new Map<number, TabInfo>();
      for (const t of init?.tabs ?? []) {
        tabs.set(t.id, t);
      }
      const getTab = (tabId: TabId) => {
        const tab = tabs.get(tabId);
        if (!tab) {
          return Effect.fail(new NoActiveTab());
        }
        if (tab.status !== "complete") {
          return Effect.fail(new TabNotReady({ tabId }));
        }
        return Effect.succeed(tab);
      };
      return BrowserApi.of({
        getTab,
        getActiveTab: () => {
          const first = tabs.values().next().value;
          return first ? Effect.succeed(first) : Effect.fail(new NoActiveTab());
        },
        ensureAuditable: (tab) =>
          isRestrictedUrl(tab.url)
            ? Effect.fail(new RestrictedUrl({ url: tab.url }))
            : Effect.succeed(tab),
        sendMessage: <A>(tabId: TabId, message: unknown) =>
          init?.respond
            ? Effect.succeed(init.respond(tabId, message) as A)
            : Effect.fail(new NoActiveTab()),
        events: Stream.never,
      });
    });
}
