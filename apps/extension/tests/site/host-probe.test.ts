import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { HostProbeService } from "../../src/lib/services/site/host-probe";

type FetchImpl = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

const asFetch = (impl: FetchImpl) => impl as typeof globalThis.fetch;

const makeResponse = (status: number, url: string, redirected = false) => {
  const r = new Response("", { status });
  Object.defineProperty(r, "url", { value: url, configurable: true });
  Object.defineProperty(r, "redirected", {
    value: redirected,
    configurable: true,
  });
  return r;
};

interface Call {
  readonly method: string;
  readonly url: string;
}

const recordingFetch = (
  handler: (call: Call) => Response
): { impl: FetchImpl; calls: Call[] } => {
  const calls: Call[] = [];
  const impl: FetchImpl = (input, init) =>
    new Promise<Response>((resolve, reject) => {
      const call: Call = {
        method: init?.method ?? "GET",
        url: String(input),
      };
      calls.push(call);
      try {
        resolve(handler(call));
      } catch (cause) {
        reject(cause instanceof Error ? cause : new Error(String(cause)));
      }
    });
  return { impl, calls };
};

describe("HostProbeService", () => {
  it.effect("probes all four www/apex × http/https permutations", () => {
    const { impl, calls } = recordingFetch((call) =>
      makeResponse(200, call.url)
    );
    return Effect.gen(function* () {
      const svc = yield* HostProbeService;
      const result = yield* svc.get("https://example.com");
      expect(result.variants).toHaveLength(4);
      const urls = calls.map((c) => c.url).sort();
      expect(urls).toEqual([
        "http://example.com/",
        "http://www.example.com/",
        "https://example.com/",
        "https://www.example.com/",
      ]);
      expect(calls.every((c) => c.method === "HEAD")).toBe(true);
    }).pipe(Effect.provide(HostProbeService.makeLayer(asFetch(impl))));
  });

  it.effect(
    "canonicalizes to apex when every variant redirects to apex",
    () => {
      const { impl } = recordingFetch(() =>
        makeResponse(200, "https://example.com/", true)
      );
      return Effect.gen(function* () {
        const svc = yield* HostProbeService;
        const result = yield* svc.get("https://example.com");
        expect(result.canonicalHost).toBe("example.com");
        expect(result.variants.every((v) => v.status === 200)).toBe(true);
      }).pipe(Effect.provide(HostProbeService.makeLayer(asFetch(impl))));
    }
  );

  it.effect("canonicalizes to www when every variant redirects to www", () => {
    const { impl } = recordingFetch(() =>
      makeResponse(200, "https://www.example.com/", true)
    );
    return Effect.gen(function* () {
      const svc = yield* HostProbeService;
      const result = yield* svc.get("https://example.com");
      expect(result.canonicalHost).toBe("www.example.com");
    }).pipe(Effect.provide(HostProbeService.makeLayer(asFetch(impl))));
  });

  it.effect("falls back to GET when HEAD throws", () => {
    const { impl, calls } = recordingFetch((call) => {
      if (call.method === "HEAD") {
        throw new TypeError("method not allowed");
      }
      return makeResponse(200, call.url);
    });
    return Effect.gen(function* () {
      const svc = yield* HostProbeService;
      const result = yield* svc.get("https://example.com");
      expect(result.variants.every((v) => v.status === 200)).toBe(true);
      const methods = new Set(calls.map((c) => c.method));
      expect(methods.has("HEAD")).toBe(true);
      expect(methods.has("GET")).toBe(true);
    }).pipe(Effect.provide(HostProbeService.makeLayer(asFetch(impl))));
  });

  it.effect("records status null when all fetch attempts fail", () => {
    const impl: FetchImpl = () => Promise.reject(new TypeError("network down"));
    return Effect.gen(function* () {
      const svc = yield* HostProbeService;
      const result = yield* svc.get("https://example.com");
      expect(result.variants).toHaveLength(4);
      expect(result.variants.every((v) => v.status === null)).toBe(true);
    }).pipe(Effect.provide(HostProbeService.makeLayer(asFetch(impl))));
  });

  it.effect("caches the probe result per origin", () => {
    const { impl, calls } = recordingFetch((call) =>
      makeResponse(200, call.url)
    );
    return Effect.gen(function* () {
      const svc = yield* HostProbeService;
      yield* svc.get("https://example.com");
      yield* svc.get("https://example.com");
      expect(calls).toHaveLength(4);
    }).pipe(Effect.provide(HostProbeService.makeLayer(asFetch(impl))));
  });

  it.effect("normalizes a www-prefixed origin to the same four pairs", () => {
    const { impl, calls } = recordingFetch((call) =>
      makeResponse(200, call.url)
    );
    return Effect.gen(function* () {
      const svc = yield* HostProbeService;
      const result = yield* svc.get("https://www.example.com");
      expect(result.variants).toHaveLength(4);
      const urls = calls.map((c) => c.url).sort();
      expect(urls).toEqual([
        "http://example.com/",
        "http://www.example.com/",
        "https://example.com/",
        "https://www.example.com/",
      ]);
    }).pipe(Effect.provide(HostProbeService.makeLayer(asFetch(impl))));
  });
});
