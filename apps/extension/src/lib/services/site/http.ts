import {
  FetchHttpClient,
  type HttpClient,
  HttpClientRequest,
  type HttpClientResponse,
} from "@effect/platform";
import { Effect, Layer, Option } from "effect";

export const USER_AGENT = "SEO-Lens/1.0 (+crawler-view)";

const RequestInitLayer = Layer.succeed(FetchHttpClient.RequestInit, {
  credentials: "omit",
  redirect: "follow",
});

export const SiteHttpClientLayer = FetchHttpClient.layer.pipe(
  Layer.provide(RequestInitLayer)
);

export const buildGet = (url: string) =>
  HttpClientRequest.get(url).pipe(
    HttpClientRequest.setHeader("User-Agent", USER_AGENT),
    HttpClientRequest.setHeader("Accept", "*/*")
  );

export const buildHead = (url: string) =>
  HttpClientRequest.head(url).pipe(
    HttpClientRequest.setHeader("User-Agent", USER_AGENT)
  );

export const isNotFound = (response: HttpClientResponse.HttpClientResponse) =>
  response.status === 404 || response.status === 410;

export const isOk = (response: HttpClientResponse.HttpClientResponse) =>
  response.status >= 200 && response.status < 300;

export const drainBody = (
  response: HttpClientResponse.HttpClientResponse
): Effect.Effect<string, Error> =>
  response.text.pipe(
    Effect.mapError((cause) =>
      cause instanceof Error ? cause : new Error(String(cause))
    )
  );

/**
 * Fetch a URL as text. Returns `None` for 404/410 responses, propagates the
 * caller's tagged error for any other failure (network, non-2xx, body drain).
 */
export const fetchTextOption = <E>(
  client: HttpClient.HttpClient,
  url: string,
  makeError: (args: { status?: number; cause: unknown }) => E
) =>
  Effect.gen(function* () {
    const response = yield* client.execute(buildGet(url)).pipe(
      Effect.catchTags({
        RequestError: (cause) => Effect.fail(makeError({ cause })),
        ResponseError: (cause) =>
          Effect.fail(makeError({ status: cause.response.status, cause })),
      })
    );
    if (isNotFound(response)) {
      return Option.none<{ body: string; contentType: string | null }>();
    }
    if (!isOk(response)) {
      return yield* Effect.fail(
        makeError({
          status: response.status,
          cause: `HTTP ${response.status}`,
        })
      );
    }
    const body = yield* response.text.pipe(
      Effect.catchTag("ResponseError", (cause) =>
        Effect.fail(makeError({ status: response.status, cause }))
      )
    );
    const contentType = response.headers["content-type"] ?? null;
    return Option.some({ body, contentType });
  });

/**
 * HEAD fetch that reports resolvability + content-type. Never fails on 404;
 * falls back to GET when the host rejects HEAD.
 */
export const headOrNone = <E>(
  client: HttpClient.HttpClient,
  url: string,
  makeError: (args: { status?: number; cause: unknown }) => E
) =>
  Effect.gen(function* () {
    const head = yield* client.execute(buildHead(url)).pipe(
      Effect.catchTags({
        RequestError: (cause) => Effect.fail(makeError({ cause })),
        ResponseError: (cause) =>
          Effect.fail(makeError({ status: cause.response.status, cause })),
      })
    );

    if (isOk(head)) {
      return Option.some({
        resolvable: true,
        contentType: head.headers["content-type"] ?? null,
      });
    }
    if (isNotFound(head)) {
      return Option.none<{ resolvable: boolean; contentType: string | null }>();
    }
    if (head.status !== 405 && head.status !== 501) {
      return yield* Effect.fail(
        makeError({
          status: head.status,
          cause: `HTTP ${head.status}`,
        })
      );
    }

    const get = yield* client.execute(buildGet(url)).pipe(
      Effect.catchTags({
        RequestError: (cause) => Effect.fail(makeError({ cause })),
        ResponseError: (cause) =>
          Effect.fail(makeError({ status: cause.response.status, cause })),
      })
    );
    if (isNotFound(get)) {
      return Option.none<{ resolvable: boolean; contentType: string | null }>();
    }
    if (!isOk(get)) {
      return yield* Effect.fail(
        makeError({
          status: get.status,
          cause: `HTTP ${get.status}`,
        })
      );
    }
    return Option.some({
      resolvable: true,
      contentType: get.headers["content-type"] ?? null,
    });
  });
