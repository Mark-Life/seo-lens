import { FetchHttpClient } from "@effect/platform";
import { describe, expect, it } from "@effect/vitest";
import { FetchFailed } from "@workspace/seo-rules/errors";
import { PageUrl } from "@workspace/seo-rules/schema";
import { Effect, Either, Fiber, Layer, TestClock } from "effect";
import { Fetcher } from "../src/lib/services/fetcher";

const url = PageUrl.make("https://example.com/");

const fetchLayer = (
  impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
) =>
  Fetcher.layer.pipe(
    Layer.provide(
      Layer.succeed(FetchHttpClient.Fetch, impl as typeof globalThis.fetch)
    )
  );

describe("Fetcher", () => {
  it.effect("returns body on 200", () =>
    Effect.gen(function* () {
      const fetcher = yield* Fetcher;
      const html = yield* fetcher.fetch(url);
      expect(html).toBe("<html>ok</html>");
    }).pipe(
      Effect.provide(
        fetchLayer(async () => new Response("<html>ok</html>", { status: 200 }))
      )
    )
  );

  it.effect("fails on non-2xx with status", () =>
    Effect.gen(function* () {
      const fetcher = yield* Fetcher;
      const result = yield* Effect.either(fetcher.fetch(url));
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(FetchFailed);
        expect(result.left.status).toBe(500);
      }
    }).pipe(
      Effect.provide(
        fetchLayer(async () => new Response("boom", { status: 500 }))
      )
    )
  );

  it.effect("fails on timeout", () =>
    Effect.gen(function* () {
      const fetcher = yield* Fetcher;
      const fiber = yield* Effect.fork(Effect.either(fetcher.fetch(url)));
      yield* TestClock.adjust("11 seconds");
      const result = yield* Fiber.join(fiber);
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(FetchFailed);
      }
    }).pipe(
      Effect.provide(
        fetchLayer(
          () =>
            new Promise<Response>(() => {
              // never resolves
            })
        )
      )
    )
  );

  it.effect("fails on network error", () =>
    Effect.gen(function* () {
      const fetcher = yield* Fetcher;
      const result = yield* Effect.either(fetcher.fetch(url));
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(FetchFailed);
      }
    }).pipe(
      Effect.provide(
        fetchLayer(async () => {
          await Promise.resolve();
          throw new TypeError("network down");
        })
      )
    )
  );
});
