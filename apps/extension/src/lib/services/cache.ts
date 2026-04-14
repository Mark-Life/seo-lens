import type { AuditResult, TabId } from "@workspace/seo-rules/schema";
import { Context, Effect, Layer, Option } from "effect";

export interface CacheEntry {
  readonly at: number;
  readonly result: AuditResult;
  readonly url: string;
}

const TTL_MS = 30_000;

export interface AuditCacheShape {
  readonly get: (tabId: TabId) => Effect.Effect<Option.Option<CacheEntry>>;
  readonly invalidate: (tabId: TabId) => Effect.Effect<void>;
  readonly set: (tabId: TabId, entry: CacheEntry) => Effect.Effect<void>;
}

const makeCache = (now: () => number): AuditCacheShape => {
  const store = new Map<TabId, CacheEntry>();
  return {
    get: (tabId) =>
      Effect.sync(() => {
        const entry = store.get(tabId);
        if (!entry) {
          return Option.none<CacheEntry>();
        }
        if (now() - entry.at > TTL_MS) {
          store.delete(tabId);
          return Option.none<CacheEntry>();
        }
        return Option.some(entry);
      }).pipe(Effect.withSpan("AuditCache.get")),
    set: (tabId, entry) =>
      Effect.sync(() => {
        store.set(tabId, entry);
      }).pipe(Effect.withSpan("AuditCache.set")),
    invalidate: (tabId) =>
      Effect.sync(() => {
        store.delete(tabId);
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
