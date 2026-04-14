import { HttpClient } from "@effect/platform";
import {
  Feed,
  FeedFetchFailed,
  type FeedKind,
  type HeadLink,
  PageUrl,
} from "@workspace/seo-rules";
import { Context, Effect, Layer, Option } from "effect";
import { headOrNone, SiteHttpClientLayer } from "./http";
import {
  makeOriginCache,
  type OriginCache,
  withOriginCache,
} from "./origin-cache";

interface Candidate {
  readonly kind: FeedKind;
  readonly url: PageUrl;
}

const FALLBACK_PATHS: ReadonlyArray<{
  readonly path: string;
  readonly kind: FeedKind;
}> = [
  { path: "/feed.xml", kind: "unknown" },
  { path: "/rss.xml", kind: "rss" },
  { path: "/atom.xml", kind: "atom" },
  { path: "/feed", kind: "unknown" },
  { path: "/rss", kind: "rss" },
];

const FEED_TYPE_RE = /application\/(rss|atom)(\+xml)?/i;
const REL_SPLIT_RE = /\s+/;

const kindFromType = (type: string | null): FeedKind => {
  if (!type) {
    return "unknown";
  }
  const ct = type.toLowerCase();
  if (ct.includes("rss")) {
    return "rss";
  }
  if (ct.includes("atom")) {
    return "atom";
  }
  return "unknown";
};

const detectKind = (
  declared: FeedKind,
  contentType: string | null
): FeedKind => {
  if (declared !== "unknown") {
    return declared;
  }
  return kindFromType(contentType);
};

/**
 * Resolve candidate feed URLs from `<link rel="alternate" type="...">` tags in
 * the page head. Filters by MIME type so only RSS/Atom alternates are probed.
 */
export const hintsFromHeadLinks = (
  headLinks: readonly HeadLink[]
): readonly Candidate[] => {
  const out: Candidate[] = [];
  for (const link of headLinks) {
    if (!link.rel.split(REL_SPLIT_RE).includes("alternate")) {
      continue;
    }
    if (!(link.type && FEED_TYPE_RE.test(link.type))) {
      continue;
    }
    out.push({
      url: PageUrl.make(link.href),
      kind: kindFromType(link.type),
    });
  }
  return out;
};

export const mergeCandidates = (
  origin: string,
  hints: readonly Candidate[]
): readonly Candidate[] => {
  const seen = new Set<string>();
  const merged: Candidate[] = [];
  for (const hint of hints) {
    if (!seen.has(hint.url)) {
      seen.add(hint.url);
      merged.push(hint);
    }
  }
  for (const { path, kind } of FALLBACK_PATHS) {
    const url = PageUrl.make(`${origin}${path}`);
    if (!seen.has(url)) {
      seen.add(url);
      merged.push({ url, kind });
    }
  }
  return merged;
};

const cacheKey = (origin: string, hints: readonly Candidate[]): string => {
  if (hints.length === 0) {
    return origin;
  }
  const fingerprint = [...hints.map((h) => h.url)].sort().join("|");
  return `${origin}|${fingerprint}`;
};

export interface FeedServiceShape {
  readonly get: (
    origin: string,
    headLinks: readonly HeadLink[]
  ) => Effect.Effect<readonly Feed[], FeedFetchFailed>;
  readonly invalidate: (origin: string) => Effect.Effect<void>;
}

export class FeedService extends Context.Tag("FeedService")<
  FeedService,
  FeedServiceShape
>() {
  static readonly layer = Layer.effect(
    FeedService,
    Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient;
      const cache: OriginCache<readonly Feed[]> = makeOriginCache();

      const discover = (candidates: readonly Candidate[]) =>
        Effect.gen(function* () {
          const found: Feed[] = [];
          for (const { url, kind } of candidates) {
            const result = yield* headOrNone(
              client,
              url,
              (args) => new FeedFetchFailed({ url, ...args })
            ).pipe(
              Effect.catchTag("FeedFetchFailed", () =>
                Effect.succeed(
                  Option.none<{
                    resolvable: boolean;
                    contentType: string | null;
                  }>()
                )
              )
            );
            if (Option.isSome(result)) {
              found.push(
                new Feed({
                  url,
                  kind: detectKind(kind, result.value.contentType),
                  contentType: result.value.contentType,
                  resolvable: result.value.resolvable,
                })
              );
            }
          }
          return found as readonly Feed[];
        });

      return FeedService.of({
        get: (origin, headLinks) => {
          const hints = hintsFromHeadLinks(headLinks);
          const candidates = mergeCandidates(origin, hints);
          const key = cacheKey(origin, hints);
          return withOriginCache(cache, key, discover(candidates)).pipe(
            Effect.timeoutFail({
              duration: "10 seconds",
              onTimeout: () =>
                new FeedFetchFailed({
                  url: PageUrl.make(`${origin}/feed.xml`),
                  cause: "feed discovery timed out",
                }),
            })
          );
        },
        invalidate: (origin) => cache.invalidate(origin),
      });
    })
  ).pipe(Layer.provide(SiteHttpClientLayer));

  static readonly testLayer = (
    impl: FeedServiceShape = {
      get: () => Effect.succeed([]),
      invalidate: () => Effect.void,
    }
  ) => Layer.succeed(FeedService, FeedService.of(impl));
}
