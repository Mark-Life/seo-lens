import { HttpClient } from "@effect/platform";
import {
  PageUrl,
  Sitemap,
  SitemapEntry,
  SitemapFetchFailed,
  type SitemapKind,
  type SitemapVariant,
} from "@workspace/seo-rules";
import { Context, Effect, Layer, Option } from "effect";
import { buildGet, isNotFound, isOk, SiteHttpClientLayer } from "./http";
import {
  makeOriginCache,
  type OriginCache,
  withOriginCache,
} from "./origin-cache";

const MAX_PARSE_BYTES = 5 * 1024 * 1024;

const WELL_KNOWN: ReadonlyArray<{
  readonly path: string;
  readonly variant: SitemapVariant;
}> = [
  { path: "/sitemap.xml", variant: "sitemap" },
  { path: "/sitemap_index.xml", variant: "sitemap" },
  { path: "/sitemap-index.xml", variant: "sitemap" },
  { path: "/news-sitemap.xml", variant: "news" },
  { path: "/image-sitemap.xml", variant: "image" },
  { path: "/video-sitemap.xml", variant: "video" },
];

const SITEMAP_INDEX_TAG = /<sitemapindex[\s>]/i;
const SITEMAP_ENTRY =
  /<sitemap\b[^>]*>[\s\S]*?<loc>([^<]+)<\/loc>[\s\S]*?<\/sitemap>/gi;
const URL_BLOCK = /<url\b[^>]*>([\s\S]*?)<\/url>/gi;
const LOC_TAG = /<loc>([^<]+)<\/loc>/i;
const LASTMOD_TAG = /<lastmod>([^<]+)<\/lastmod>/i;

export interface ParsedSitemap {
  readonly childSitemapUrls: readonly string[];
  readonly entries: ReadonlyArray<{
    readonly loc: string;
    readonly lastmod: string | null;
  }>;
  readonly kind: SitemapKind;
}

/**
 * Regex-based XML extraction. Deliberately not a full XML parser — sitemaps
 * use a fixed shape and service workers in MV3 don't have DOMParser. Good
 * enough until a site breaks it, which we'd catch via step 9 test fixtures.
 */
export const parseSitemapXml = (xml: string): ParsedSitemap => {
  if (SITEMAP_INDEX_TAG.test(xml)) {
    const children: string[] = [];
    for (const match of xml.matchAll(SITEMAP_ENTRY)) {
      children.push(match[1].trim());
    }
    return { kind: "index", entries: [], childSitemapUrls: children };
  }
  const entries: Array<{ loc: string; lastmod: string | null }> = [];
  for (const match of xml.matchAll(URL_BLOCK)) {
    const block = match[1];
    const loc = LOC_TAG.exec(block)?.[1]?.trim();
    if (!loc) {
      continue;
    }
    const lastmod = LASTMOD_TAG.exec(block)?.[1]?.trim() ?? null;
    entries.push({ loc, lastmod });
  }
  return { kind: "urlset", entries, childSitemapUrls: [] };
};

export interface SitemapServiceShape {
  readonly get: (
    origin: string
  ) => Effect.Effect<readonly Sitemap[], SitemapFetchFailed>;
  readonly getAt: (
    url: PageUrl,
    variant?: SitemapVariant
  ) => Effect.Effect<Option.Option<Sitemap>, SitemapFetchFailed>;
  readonly invalidate: (origin: string) => Effect.Effect<void>;
}

const toSitemap = (
  url: PageUrl,
  variant: SitemapVariant,
  body: string
): Sitemap => {
  const truncated = body.length > MAX_PARSE_BYTES;
  const parsed = parseSitemapXml(
    truncated ? body.slice(0, MAX_PARSE_BYTES) : body
  );
  return new Sitemap({
    url,
    kind: parsed.kind,
    variant,
    entries: parsed.entries.map(
      (e) =>
        new SitemapEntry({
          loc: PageUrl.make(e.loc),
          lastmod: e.lastmod,
        })
    ),
    childSitemapUrls: parsed.childSitemapUrls.map((s) => PageUrl.make(s)),
    truncated,
  });
};

export class SitemapService extends Context.Tag("SitemapService")<
  SitemapService,
  SitemapServiceShape
>() {
  static readonly layer = Layer.effect(
    SitemapService,
    Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient;
      const cache: OriginCache<readonly Sitemap[]> = makeOriginCache();

      const fetchOne = Effect.fn("SitemapService.fetchOne")(function* (
        url: PageUrl,
        variant: SitemapVariant
      ) {
        const response = yield* client.execute(buildGet(url)).pipe(
          Effect.catchTags({
            RequestError: (cause) =>
              Effect.fail(new SitemapFetchFailed({ url, cause })),
            ResponseError: (cause) =>
              Effect.fail(
                new SitemapFetchFailed({
                  url,
                  status: cause.response.status,
                  cause,
                })
              ),
          })
        );

        if (isNotFound(response)) {
          return Option.none<Sitemap>();
        }
        if (!isOk(response)) {
          return yield* new SitemapFetchFailed({
            url,
            status: response.status,
            cause: `HTTP ${response.status}`,
          });
        }

        const body = yield* response.text.pipe(
          Effect.catchTag("ResponseError", (cause) =>
            Effect.fail(
              new SitemapFetchFailed({
                url,
                status: response.status,
                cause,
              })
            )
          )
        );
        return Option.some(toSitemap(url, variant, body));
      });

      const discover = (origin: string) =>
        Effect.gen(function* () {
          const found: Sitemap[] = [];
          for (const { path, variant } of WELL_KNOWN) {
            const url = PageUrl.make(`${origin}${path}`);
            const result = yield* fetchOne(url, variant).pipe(
              Effect.catchTag("SitemapFetchFailed", () =>
                Effect.succeed(Option.none<Sitemap>())
              )
            );
            if (Option.isSome(result)) {
              found.push(result.value);
            }
          }
          return found as readonly Sitemap[];
        });

      return SitemapService.of({
        get: (origin) =>
          withOriginCache(cache, origin, discover(origin)).pipe(
            Effect.timeoutFail({
              duration: "15 seconds",
              onTimeout: () =>
                new SitemapFetchFailed({
                  url: PageUrl.make(`${origin}/sitemap.xml`),
                  cause: "sitemap discovery timed out",
                }),
            })
          ),
        getAt: (url, variant = "sitemap") =>
          fetchOne(url, variant).pipe(
            Effect.timeoutFail({
              duration: "15 seconds",
              onTimeout: () =>
                new SitemapFetchFailed({
                  url,
                  cause: "sitemap fetch timed out",
                }),
            })
          ),
        invalidate: (origin) => cache.invalidate(origin),
      });
    })
  ).pipe(Layer.provide(SiteHttpClientLayer));

  static readonly testLayer = (
    impl: SitemapServiceShape = {
      get: () => Effect.succeed([]),
      getAt: () => Effect.succeed(Option.none()),
      invalidate: () => Effect.void,
    }
  ) => Layer.succeed(SitemapService, SitemapService.of(impl));
}
