import {
  type Favicon,
  type Feed,
  type HeadLink,
  type HostProbeResult,
  type LlmsTxt,
  type PageData,
  PageUrl,
  type RobotsTxt,
  type SecurityTxt,
  type Sitemap,
  SiteSignals,
  type SoftFourOhFourProbe,
  type WebManifest,
} from "@workspace/seo-rules";
import { Context, Effect, Layer, Option } from "effect";
import { FaviconService } from "./favicon";
import { FeedService } from "./feed";
import { HostProbeService } from "./host-probe";
import { LlmsTxtService } from "./llms-txt";
import { ManifestService } from "./manifest";
import {
  makeOriginCache,
  type OriginCache,
  withOriginCache,
} from "./origin-cache";
import { RobotsService } from "./robots";
import { SecurityTxtService } from "./security-txt";
import { SitemapService } from "./sitemap";
import { SoftFourOhFourService } from "./soft-404";

export interface SiteSignalsServiceShape {
  readonly get: (origin: string, page: PageData) => Effect.Effect<SiteSignals>;
  readonly invalidate: (origin: string) => Effect.Effect<void>;
}

const originMatches = (origin: string, url: string) => {
  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
};

const FEED_TYPE_RE = /application\/(rss|atom)(\+xml)?/i;
const REL_SPLIT_RE = /\s+/;

export class SiteSignalsService extends Context.Tag("SiteSignalsService")<
  SiteSignalsService,
  SiteSignalsServiceShape
>() {
  static readonly layer = Layer.effect(
    SiteSignalsService,
    Effect.gen(function* () {
      const robots = yield* RobotsService;
      const sitemap = yield* SitemapService;
      const securityTxt = yield* SecurityTxtService;
      const favicon = yield* FaviconService;
      const manifest = yield* ManifestService;
      const feeds = yield* FeedService;
      const llmsTxt = yield* LlmsTxtService;
      const hostProbe = yield* HostProbeService;
      const softFourOhFour = yield* SoftFourOhFourService;

      const cache: OriginCache<SiteSignals> = makeOriginCache();

      const fetchRobots = (origin: string) =>
        robots.get(origin).pipe(
          Effect.catchTag("RobotsFetchFailed", () =>
            Effect.succeed(Option.none<RobotsTxt>())
          ),
          Effect.map((opt) => (Option.isSome(opt) ? opt.value : null))
        );

      const fetchSitemapsFromRobots = (
        origin: string,
        declared: readonly PageUrl[]
      ) =>
        Effect.gen(function* () {
          const found: Sitemap[] = [];
          for (const url of declared) {
            if (!originMatches(origin, url)) {
              continue;
            }
            const result = yield* sitemap
              .getAt(url)
              .pipe(
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

      const fetchSitemaps = (origin: string, declared: readonly PageUrl[]) =>
        Effect.gen(function* () {
          if (declared.length > 0) {
            const fromRobots = yield* fetchSitemapsFromRobots(origin, declared);
            if (fromRobots.length > 0) {
              return fromRobots;
            }
          }
          return yield* sitemap
            .get(origin)
            .pipe(
              Effect.catchTag("SitemapFetchFailed", () =>
                Effect.succeed([] as readonly Sitemap[])
              )
            );
        });

      const fetchSecurityTxt = (origin: string) =>
        securityTxt.get(origin).pipe(
          Effect.catchTag("SecurityTxtFetchFailed", () =>
            Effect.succeed(Option.none<SecurityTxt>())
          ),
          Effect.map((opt) => (Option.isSome(opt) ? opt.value : null))
        );

      const fetchFavicon = (origin: string) =>
        favicon.get(origin).pipe(
          Effect.catchTag("FaviconFetchFailed", () =>
            Effect.succeed(Option.none<Favicon>())
          ),
          Effect.map((opt) => (Option.isSome(opt) ? opt.value : null))
        );

      const fetchManifest = (origin: string) =>
        manifest.get(origin).pipe(
          Effect.catchTag("ManifestFetchFailed", () =>
            Effect.succeed(Option.none<WebManifest>())
          ),
          Effect.map((opt) => (Option.isSome(opt) ? opt.value : null))
        );

      const fetchFeeds = (origin: string, headLinks: readonly HeadLink[]) =>
        feeds
          .get(origin, headLinks)
          .pipe(
            Effect.catchTag("FeedFetchFailed", () =>
              Effect.succeed([] as readonly Feed[])
            )
          );

      const fetchLlmsTxt = (origin: string) =>
        llmsTxt.get(origin).pipe(
          Effect.catchTag("LlmsTxtFetchFailed", () =>
            Effect.succeed(Option.none<LlmsTxt>())
          ),
          Effect.map((opt) => (Option.isSome(opt) ? opt.value : null))
        );

      const fetchHostProbe = (origin: string) =>
        hostProbe
          .get(origin)
          .pipe(
            Effect.catchTag("HostProbeFailed", () =>
              Effect.succeed(null as HostProbeResult | null)
            )
          );

      const fetchSoftFourOhFour = (origin: string) =>
        softFourOhFour
          .get(origin)
          .pipe(Effect.map((v) => v as SoftFourOhFourProbe | null));

      const compose = (origin: string, page: PageData) =>
        Effect.gen(function* () {
          const robotsResult = yield* fetchRobots(origin);
          const declaredSitemaps = robotsResult?.sitemapUrls ?? [];

          const [
            sitemapsResult,
            securityTxtResult,
            faviconResult,
            manifestResult,
            feedsResult,
            llmsTxtResult,
            hostProbeResult,
            softFourOhFourResult,
          ] = yield* Effect.all(
            [
              fetchSitemaps(origin, declaredSitemaps),
              fetchSecurityTxt(origin),
              fetchFavicon(origin),
              fetchManifest(origin),
              fetchFeeds(origin, page.headLinks),
              fetchLlmsTxt(origin),
              fetchHostProbe(origin),
              fetchSoftFourOhFour(origin),
            ],
            { concurrency: "unbounded" }
          );

          return new SiteSignals({
            origin: PageUrl.make(origin),
            robots: robotsResult,
            sitemaps: sitemapsResult,
            securityTxt: securityTxtResult,
            favicon: faviconResult,
            manifest: manifestResult,
            feeds: feedsResult,
            llmsTxt: llmsTxtResult,
            hostProbe: hostProbeResult,
            softFourOhFour: softFourOhFourResult,
          });
        });

      const feedHintFingerprint = (headLinks: readonly HeadLink[]): string => {
        const urls: string[] = [];
        for (const link of headLinks) {
          if (!link.rel.split(REL_SPLIT_RE).includes("alternate")) {
            continue;
          }
          if (!(link.type && FEED_TYPE_RE.test(link.type))) {
            continue;
          }
          urls.push(link.href);
        }
        return urls.sort().join("|");
      };

      return SiteSignalsService.of({
        get: (origin, page) => {
          const fingerprint = feedHintFingerprint(page.headLinks);
          const key = fingerprint ? `${origin}|${fingerprint}` : origin;
          return withOriginCache(cache, key, compose(origin, page));
        },
        invalidate: (origin) =>
          Effect.all(
            [
              cache.invalidate(origin),
              robots.invalidate(origin),
              sitemap.invalidate(origin),
              securityTxt.invalidate(origin),
              favicon.invalidate(origin),
              manifest.invalidate(origin),
              feeds.invalidate(origin),
              llmsTxt.invalidate(origin),
              hostProbe.invalidate(origin),
              softFourOhFour.invalidate(origin),
            ],
            { concurrency: "unbounded", discard: true }
          ),
      });
    })
  );

  static readonly testLayer = (
    impl: SiteSignalsServiceShape = {
      get: (origin, _page) =>
        Effect.succeed(
          new SiteSignals({
            origin: PageUrl.make(origin),
            robots: null,
            sitemaps: [],
            securityTxt: null,
            favicon: null,
            manifest: null,
            feeds: [],
            llmsTxt: null,
            hostProbe: null,
            softFourOhFour: null,
          })
        ),
      invalidate: () => Effect.void,
    }
  ) => Layer.succeed(SiteSignalsService, SiteSignalsService.of(impl));
}
