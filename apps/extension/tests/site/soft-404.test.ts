import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { SoftFourOhFourService } from "../../src/lib/services/site/soft-404";

type FetchImpl = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

const asFetch = (impl: FetchImpl) => impl as typeof globalThis.fetch;

const PROBE_URL_RE = /^https:\/\/example\.com\/__seo-lens-probe-[a-z0-9]+$/;
const PROBE_SLUG_RE = /^https?:\/\/[^/]+\/__seo-lens-probe-/;

const makeFetchStub = (status: number) => {
  const calls: string[] = [];
  const impl: FetchImpl = (input) => {
    calls.push(String(input));
    return Promise.resolve(new Response("", { status }));
  };
  return { impl, calls };
};

describe("SoftFourOhFourService", () => {
  it.effect("flags a soft-404 when the probe URL returns 200", () => {
    const { impl, calls } = makeFetchStub(200);
    return Effect.gen(function* () {
      const svc = yield* SoftFourOhFourService;
      const probe = yield* svc.get("https://example.com");
      expect(probe.status).toBe(200);
      expect(probe.isSoftFourOhFour).toBe(true);
      expect(calls).toHaveLength(1);
      expect(calls[0]).toMatch(PROBE_URL_RE);
    }).pipe(Effect.provide(SoftFourOhFourService.makeLayer(asFetch(impl))));
  });

  it.effect("does not flag a soft-404 when the probe URL returns 404", () => {
    const { impl } = makeFetchStub(404);
    return Effect.gen(function* () {
      const svc = yield* SoftFourOhFourService;
      const probe = yield* svc.get("https://example.com");
      expect(probe.status).toBe(404);
      expect(probe.isSoftFourOhFour).toBe(false);
    }).pipe(Effect.provide(SoftFourOhFourService.makeLayer(asFetch(impl))));
  });

  it.effect(
    "caches the probe result per origin (second call does not re-fetch)",
    () => {
      const { impl, calls } = makeFetchStub(200);
      return Effect.gen(function* () {
        const svc = yield* SoftFourOhFourService;
        const first = yield* svc.get("https://example.com");
        const second = yield* svc.get("https://example.com");
        expect(first.isSoftFourOhFour).toBe(true);
        expect(second.isSoftFourOhFour).toBe(true);
        expect(calls).toHaveLength(1);
      }).pipe(Effect.provide(SoftFourOhFourService.makeLayer(asFetch(impl))));
    }
  );

  it.effect("reuses the same session slug across distinct origins", () => {
    const calls: string[] = [];
    const impl: FetchImpl = (input) => {
      calls.push(String(input));
      return Promise.resolve(new Response("", { status: 404 }));
    };
    return Effect.gen(function* () {
      const svc = yield* SoftFourOhFourService;
      yield* svc.get("https://example.com");
      yield* svc.get("https://other.test");
      expect(calls).toHaveLength(2);
      const slug = (url: string) => url.replace(PROBE_SLUG_RE, "");
      expect(slug(calls[0])).toBe(slug(calls[1]));
    }).pipe(Effect.provide(SoftFourOhFourService.makeLayer(asFetch(impl))));
  });

  it.effect(
    "treats fetch failures as healthy (isSoftFourOhFour = false)",
    () => {
      const impl: FetchImpl = () =>
        Promise.reject(new TypeError("network down"));
      return Effect.gen(function* () {
        const svc = yield* SoftFourOhFourService;
        const probe = yield* svc.get("https://example.com");
        expect(probe.isSoftFourOhFour).toBe(false);
        expect(probe.status).toBe(0);
      }).pipe(Effect.provide(SoftFourOhFourService.makeLayer(asFetch(impl))));
    }
  );
});
