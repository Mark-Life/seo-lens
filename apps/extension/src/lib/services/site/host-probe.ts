import { HostProbeFailed } from "@workspace/seo-rules/errors";
import {
  HostProbeResult,
  type HostProbeScheme,
  HostProbeVariant,
  PageUrl,
} from "@workspace/seo-rules/schema";
import { Context, Effect, Layer } from "effect";
import {
  makeOriginCache,
  type OriginCache,
  withOriginCache,
} from "./origin-cache";

export interface HostProbeServiceShape {
  readonly get: (
    origin: string
  ) => Effect.Effect<HostProbeResult, HostProbeFailed>;
  readonly invalidate: (origin: string) => Effect.Effect<void>;
}

interface ProbePair {
  readonly host: string;
  readonly scheme: HostProbeScheme;
}

const WWW_PREFIX = /^www\./;

const buildPairs = (origin: string): readonly ProbePair[] => {
  const parsed = new URL(origin);
  const bare = parsed.hostname.replace(WWW_PREFIX, "");
  const withWww = `www.${bare}`;
  const pairs: ProbePair[] = [];
  for (const scheme of ["http", "https"] as const) {
    pairs.push({ scheme, host: bare });
    if (bare !== withWww) {
      pairs.push({ scheme, host: withWww });
    }
  }
  return pairs;
};

type FetchImpl = typeof globalThis.fetch;

const probeOne = (fetchImpl: FetchImpl, pair: ProbePair, signal: AbortSignal) =>
  Effect.tryPromise({
    try: async () => {
      const url = `${pair.scheme}://${pair.host}/`;
      try {
        const resp = await fetchImpl(url, {
          method: "HEAD",
          credentials: "omit",
          redirect: "follow",
          signal,
        });
        return {
          scheme: pair.scheme,
          host: pair.host,
          url: PageUrl.make(url),
          status: resp.status,
          finalUrl: resp.url ? PageUrl.make(resp.url) : null,
          redirected: resp.redirected,
        };
      } catch {
        const resp = await fetchImpl(url, {
          method: "GET",
          credentials: "omit",
          redirect: "follow",
          headers: { Range: "bytes=0-0" },
          signal,
        });
        return {
          scheme: pair.scheme,
          host: pair.host,
          url: PageUrl.make(url),
          status: resp.status,
          finalUrl: resp.url ? PageUrl.make(resp.url) : null,
          redirected: resp.redirected,
        };
      }
    },
    catch: (cause) => ({ pair, cause }),
  }).pipe(
    Effect.map(
      (v) =>
        new HostProbeVariant({
          scheme: v.scheme,
          host: v.host,
          url: v.url,
          status: v.status,
          finalUrl: v.finalUrl,
          redirected: v.redirected,
        })
    ),
    Effect.catchAll(() =>
      Effect.succeed(
        new HostProbeVariant({
          scheme: pair.scheme,
          host: pair.host,
          url: PageUrl.make(`${pair.scheme}://${pair.host}/`),
          status: null,
          finalUrl: null,
          redirected: false,
        })
      )
    )
  );

const computeCanonical = (
  variants: readonly HostProbeVariant[]
): string | null => {
  const counts = new Map<string, number>();
  for (const v of variants) {
    const target = v.finalUrl ?? v.url;
    try {
      const host = new URL(target).hostname;
      counts.set(host, (counts.get(host) ?? 0) + 1);
    } catch {
      // ignore
    }
  }
  let best: string | null = null;
  let max = 0;
  for (const [host, count] of counts) {
    if (count > max) {
      max = count;
      best = host;
    }
  }
  return best;
};

export class HostProbeService extends Context.Tag("HostProbeService")<
  HostProbeService,
  HostProbeServiceShape
>() {
  static readonly makeLayer = (fetchImpl: FetchImpl = globalThis.fetch) =>
    Layer.effect(
      HostProbeService,
      Effect.gen(function* () {
        const cache: OriginCache<HostProbeResult> = makeOriginCache();

        const runProbe = (origin: string) =>
          Effect.gen(function* () {
            const controller = new AbortController();
            const pairs = buildPairs(origin);
            const variants = yield* Effect.forEach(
              pairs,
              (pair) => probeOne(fetchImpl, pair, controller.signal),
              { concurrency: pairs.length }
            ).pipe(
              Effect.onInterrupt(() =>
                Effect.sync(() => {
                  controller.abort();
                })
              )
            );
            return new HostProbeResult({
              origin: PageUrl.make(origin),
              variants,
              canonicalHost: computeCanonical(variants),
            });
          });

        return HostProbeService.of({
          get: (origin) =>
            withOriginCache(cache, origin, runProbe(origin)).pipe(
              Effect.timeoutFail({
                duration: "15 seconds",
                onTimeout: () =>
                  new HostProbeFailed({
                    url: PageUrl.make(origin),
                    cause: "host probe timed out",
                  }),
              })
            ),
          invalidate: (origin) => cache.invalidate(origin),
        });
      })
    );

  static readonly layer = HostProbeService.makeLayer();

  static readonly testLayer = (impl: HostProbeServiceShape) =>
    Layer.succeed(HostProbeService, HostProbeService.of(impl));
}
