import { HttpClient } from "@effect/platform";
import { FaviconFetchFailed } from "@workspace/seo-rules/errors";
import { Favicon, PageUrl } from "@workspace/seo-rules/schema";
import { Context, Effect, Layer, Option } from "effect";
import { headOrNone, SiteHttpClientLayer } from "./http";
import {
  makeOriginCache,
  type OriginCache,
  withOriginCache,
} from "./origin-cache";

export interface FaviconServiceShape {
  readonly get: (
    origin: string
  ) => Effect.Effect<Option.Option<Favicon>, FaviconFetchFailed>;
  readonly invalidate: (origin: string) => Effect.Effect<void>;
}

export class FaviconService extends Context.Tag("FaviconService")<
  FaviconService,
  FaviconServiceShape
>() {
  static readonly layer = Layer.effect(
    FaviconService,
    Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient;
      const cache: OriginCache<Option.Option<Favicon>> = makeOriginCache();

      const fetchFavicon = (origin: string) =>
        Effect.gen(function* () {
          const url = PageUrl.make(`${origin}/favicon.ico`);
          const result = yield* headOrNone(
            client,
            url,
            (args) => new FaviconFetchFailed({ url, ...args })
          );
          if (Option.isNone(result)) {
            return Option.none<Favicon>();
          }
          return Option.some(
            new Favicon({
              url,
              contentType: result.value.contentType,
              resolvable: result.value.resolvable,
            })
          );
        });

      return FaviconService.of({
        get: (origin) =>
          withOriginCache(cache, origin, fetchFavicon(origin)).pipe(
            Effect.timeoutFail({
              duration: "10 seconds",
              onTimeout: () =>
                new FaviconFetchFailed({
                  url: PageUrl.make(`${origin}/favicon.ico`),
                  cause: "favicon fetch timed out",
                }),
            })
          ),
        invalidate: (origin) => cache.invalidate(origin),
      });
    })
  ).pipe(Layer.provide(SiteHttpClientLayer));

  static readonly testLayer = (
    impl: FaviconServiceShape = {
      get: () => Effect.succeed(Option.none()),
      invalidate: () => Effect.void,
    }
  ) => Layer.succeed(FaviconService, FaviconService.of(impl));
}
