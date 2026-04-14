import { HttpClient } from "@effect/platform";
import { LlmsTxt, LlmsTxtFetchFailed, PageUrl } from "@workspace/seo-rules";
import { Context, Effect, Layer, Option } from "effect";
import { fetchTextOption, SiteHttpClientLayer } from "./http";
import {
  makeOriginCache,
  type OriginCache,
  withOriginCache,
} from "./origin-cache";

const CANDIDATE_PATHS = ["/llms.txt", "/.well-known/llms.txt"] as const;

export interface LlmsTxtServiceShape {
  readonly get: (
    origin: string
  ) => Effect.Effect<Option.Option<LlmsTxt>, LlmsTxtFetchFailed>;
  readonly invalidate: (origin: string) => Effect.Effect<void>;
}

export class LlmsTxtService extends Context.Tag("LlmsTxtService")<
  LlmsTxtService,
  LlmsTxtServiceShape
>() {
  static readonly layer = Layer.effect(
    LlmsTxtService,
    Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient;
      const cache: OriginCache<Option.Option<LlmsTxt>> = makeOriginCache();

      const fetchLlmsTxt = (origin: string) =>
        Effect.gen(function* () {
          for (const path of CANDIDATE_PATHS) {
            const url = PageUrl.make(`${origin}${path}`);
            const result = yield* fetchTextOption(
              client,
              url,
              (args) => new LlmsTxtFetchFailed({ url, ...args })
            );
            if (Option.isSome(result)) {
              return Option.some(
                new LlmsTxt({ url, rawText: result.value.body })
              );
            }
          }
          return Option.none<LlmsTxt>();
        });

      return LlmsTxtService.of({
        get: (origin) =>
          withOriginCache(cache, origin, fetchLlmsTxt(origin)).pipe(
            Effect.timeoutFail({
              duration: "10 seconds",
              onTimeout: () =>
                new LlmsTxtFetchFailed({
                  url: PageUrl.make(`${origin}/llms.txt`),
                  cause: "llms.txt fetch timed out",
                }),
            })
          ),
        invalidate: (origin) => cache.invalidate(origin),
      });
    })
  ).pipe(Layer.provide(SiteHttpClientLayer));

  static readonly testLayer = (
    impl: LlmsTxtServiceShape = {
      get: () => Effect.succeed(Option.none()),
      invalidate: () => Effect.void,
    }
  ) => Layer.succeed(LlmsTxtService, LlmsTxtService.of(impl));
}
