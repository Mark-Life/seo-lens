import { Effect, Option } from "effect";

const DEFAULT_TTL_MS = 5 * 60 * 1000;

interface Entry<T> {
  readonly at: number;
  readonly value: T;
}

export interface OriginCache<T> {
  readonly get: (origin: string) => Effect.Effect<Option.Option<T>>;
  readonly invalidate: (origin: string) => Effect.Effect<void>;
  readonly invalidateAll: () => Effect.Effect<void>;
  readonly set: (origin: string, value: T) => Effect.Effect<void>;
}

/**
 * In-memory per-origin cache with a short TTL. Used by the site-level
 * services so repeat audits for the same tab don't re-fetch robots.txt,
 * sitemaps, probes, etc.
 */
export const makeOriginCache = <T>(
  ttlMs: number = DEFAULT_TTL_MS,
  now: () => number = () => Date.now()
): OriginCache<T> => {
  const store = new Map<string, Entry<T>>();
  return {
    get: (origin) =>
      Effect.sync(() => {
        const entry = store.get(origin);
        if (!entry) {
          return Option.none();
        }
        if (now() - entry.at > ttlMs) {
          store.delete(origin);
          return Option.none();
        }
        return Option.some(entry.value);
      }),
    set: (origin, value) =>
      Effect.sync(() => {
        store.set(origin, { at: now(), value });
      }),
    invalidate: (origin) =>
      Effect.sync(() => {
        store.delete(origin);
      }),
    invalidateAll: () =>
      Effect.sync(() => {
        store.clear();
      }),
  };
};

/**
 * Run `compute` on cache miss, otherwise return the cached value. Only
 * successful computations are cached.
 */
export const withOriginCache = <T, E, R>(
  cache: OriginCache<T>,
  origin: string,
  compute: Effect.Effect<T, E, R>
): Effect.Effect<T, E, R> =>
  Effect.gen(function* () {
    const cached = yield* cache.get(origin);
    if (Option.isSome(cached)) {
      return cached.value;
    }
    const value = yield* compute;
    yield* cache.set(origin, value);
    return value;
  });
