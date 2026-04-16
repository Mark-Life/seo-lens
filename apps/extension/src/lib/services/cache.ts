import type { AuditResult, TabId } from "@workspace/seo-rules/schema";
import { Context, Effect, Layer, Option } from "effect";

export interface CacheEntry {
  readonly at: number;
  readonly result: AuditResult;
  readonly url: string;
}

const TAB_TTL_MS = 30_000;
const URL_TTL_MS = 60_000;
const URL_CACHE_MAX = 100;

export interface AuditCacheShape {
  readonly get: (tabId: TabId) => Effect.Effect<Option.Option<CacheEntry>>;
  readonly getByUrl: (url: string) => Effect.Effect<Option.Option<CacheEntry>>;
  readonly invalidate: (tabId: TabId) => Effect.Effect<void>;
  readonly set: (tabId: TabId, entry: CacheEntry) => Effect.Effect<void>;
}

const makeCache = (now: () => number): AuditCacheShape => {
  const tabStore = new Map<TabId, CacheEntry>();
  const urlStore = new Map<string, CacheEntry>();

  const evictLru = () => {
    if (urlStore.size >= URL_CACHE_MAX) {
      const first = urlStore.keys().next().value;
      if (first !== undefined) {
        urlStore.delete(first);
      }
    }
  };

  const getUrlEntry = (url: string) => {
    const entry = urlStore.get(url);
    if (!entry) {
      return Option.none<CacheEntry>();
    }
    if (now() - entry.at > URL_TTL_MS) {
      urlStore.delete(url);
      return Option.none<CacheEntry>();
    }
    return Option.some(entry);
  };

  return {
    get: (tabId) =>
      Effect.sync(() => {
        const entry = tabStore.get(tabId);
        if (!entry) {
          return Option.none<CacheEntry>();
        }
        if (now() - entry.at > TAB_TTL_MS) {
          tabStore.delete(tabId);
          return Option.none<CacheEntry>();
        }
        return Option.some(entry);
      }).pipe(Effect.withSpan("AuditCache.get")),
    getByUrl: (url) =>
      Effect.sync(() => getUrlEntry(url)).pipe(
        Effect.withSpan("AuditCache.getByUrl")
      ),
    set: (tabId, entry) =>
      Effect.sync(() => {
        tabStore.set(tabId, entry);
        urlStore.delete(entry.url);
        evictLru();
        urlStore.set(entry.url, entry);
      }).pipe(Effect.withSpan("AuditCache.set")),
    invalidate: (tabId) =>
      Effect.sync(() => {
        tabStore.delete(tabId);
      }).pipe(Effect.withSpan("AuditCache.invalidate")),
  };
};

export class AuditCache extends Context.Tag("AuditCache")<
  AuditCache,
  AuditCacheShape
>() {
  static readonly layer = Layer.sync(AuditCache, () =>
    AuditCache.of(makeCache(() => Date.now()))
  );

  static readonly testLayer = (
    clock: { now: () => number } = { now: () => 0 }
  ) => Layer.sync(AuditCache, () => AuditCache.of(makeCache(clock.now)));
}
