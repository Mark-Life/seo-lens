import { PageUrl, SoftFourOhFourProbe } from "@workspace/seo-rules/schema";
import { Context, Effect, Layer } from "effect";
import {
  makeOriginCache,
  type OriginCache,
  withOriginCache,
} from "./origin-cache";

const randomSlug = () => Math.random().toString(36).slice(2, 12);

type FetchImpl = typeof globalThis.fetch;

export interface SoftFourOhFourServiceShape {
  readonly get: (origin: string) => Effect.Effect<SoftFourOhFourProbe>;
  readonly invalidate: (origin: string) => Effect.Effect<void>;
}

export class SoftFourOhFourService extends Context.Tag("SoftFourOhFourService")<
  SoftFourOhFourService,
  SoftFourOhFourServiceShape
>() {
  static readonly makeLayer = (fetchImpl: FetchImpl = globalThis.fetch) =>
    Layer.effect(
      SoftFourOhFourService,
      Effect.gen(function* () {
        const cache: OriginCache<SoftFourOhFourProbe> = makeOriginCache();
        const sessionSlug = randomSlug();

        const runProbe = (origin: string) =>
          Effect.gen(function* () {
            const probeUrl = PageUrl.make(
              `${origin}/__seo-lens-probe-${sessionSlug}`
            );
            const controller = new AbortController();
            const probe = yield* Effect.tryPromise({
              try: () =>
                fetchImpl(probeUrl, {
                  method: "GET",
                  credentials: "omit",
                  redirect: "follow",
                  signal: controller.signal,
                }),
              catch: (cause) => cause,
            }).pipe(
              Effect.onInterrupt(() =>
                Effect.sync(() => {
                  controller.abort();
                })
              ),
              Effect.catchAll(() => Effect.succeed(null as Response | null))
            );
            const status = probe?.status ?? 0;
            return new SoftFourOhFourProbe({
              probeUrl,
              status,
              isSoftFourOhFour: status === 200,
            });
          });

        return SoftFourOhFourService.of({
          get: (origin) =>
            withOriginCache(cache, origin, runProbe(origin)).pipe(
              Effect.timeout("10 seconds"),
              Effect.catchAll(() =>
                Effect.succeed(
                  new SoftFourOhFourProbe({
                    probeUrl: PageUrl.make(
                      `${origin}/__seo-lens-probe-timeout`
                    ),
                    status: 0,
                    isSoftFourOhFour: false,
                  })
                )
              )
            ),
          invalidate: (origin) => cache.invalidate(origin),
        });
      })
    );

  static readonly layer = SoftFourOhFourService.makeLayer();

  static readonly testLayer = (impl: SoftFourOhFourServiceShape) =>
    Layer.succeed(SoftFourOhFourService, SoftFourOhFourService.of(impl));
}
