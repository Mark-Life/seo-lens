import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
} from "@effect/platform";
import { FetchFailed, type PageUrl } from "@workspace/seo-rules";
import { Context, Effect, Layer } from "effect";

export interface FetcherShape {
  readonly fetch: (url: PageUrl) => Effect.Effect<string, FetchFailed>;
}

const USER_AGENT = "SEO-Lens/1.0 (+crawler-view)";

const RequestInitLayer = Layer.succeed(FetchHttpClient.RequestInit, {
  credentials: "omit",
});

export class Fetcher extends Context.Tag("Fetcher")<Fetcher, FetcherShape>() {
  static readonly layer = Layer.effect(
    Fetcher,
    Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient;

      const fetch = Effect.fn("Fetcher.fetch")(function* (url: PageUrl) {
        const request = HttpClientRequest.get(url).pipe(
          HttpClientRequest.setHeader("User-Agent", USER_AGENT)
        );
        const response = yield* client.execute(request).pipe(
          Effect.catchTags({
            RequestError: (cause) =>
              Effect.fail(new FetchFailed({ url, cause })),
            ResponseError: (cause) =>
              Effect.fail(
                new FetchFailed({ url, status: cause.response.status, cause })
              ),
          })
        );
        if (response.status < 200 || response.status >= 300) {
          return yield* new FetchFailed({
            url,
            status: response.status,
            cause: `HTTP ${response.status}`,
          });
        }
        return yield* response.text.pipe(
          Effect.catchTag("ResponseError", (cause) =>
            Effect.fail(
              new FetchFailed({ url, status: response.status, cause })
            )
          )
        );
      });

      return Fetcher.of({
        fetch: (url) =>
          fetch(url).pipe(
            Effect.timeoutFail({
              duration: "10 seconds",
              onTimeout: () =>
                new FetchFailed({ url, cause: "fetch timed out" }),
            })
          ),
      });
    })
  ).pipe(Layer.provide([FetchHttpClient.layer, RequestInitLayer]));

  static readonly testLayer = (pages: ReadonlyMap<PageUrl, string>) =>
    Layer.succeed(
      Fetcher,
      Fetcher.of({
        fetch: (url) => {
          const html = pages.get(url);
          return html === undefined
            ? Effect.fail(new FetchFailed({ url, cause: "no stub html" }))
            : Effect.succeed(html);
        },
      })
    );
}
