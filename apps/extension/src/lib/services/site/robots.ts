import { HttpClient } from "@effect/platform";
import {
  PageUrl,
  RobotsFetchFailed,
  RobotsGroup,
  RobotsTxt,
} from "@workspace/seo-rules";
import { Context, Effect, Layer, Option } from "effect";
import { buildGet, isNotFound, isOk, SiteHttpClientLayer } from "./http";
import {
  makeOriginCache,
  type OriginCache,
  withOriginCache,
} from "./origin-cache";

export interface RobotsServiceShape {
  readonly get: (
    origin: string
  ) => Effect.Effect<Option.Option<RobotsTxt>, RobotsFetchFailed>;
  readonly invalidate: (origin: string) => Effect.Effect<void>;
}

interface ParsedRobotsGroup {
  readonly allow: readonly string[];
  readonly crawlDelay: number | null;
  readonly disallow: readonly string[];
  readonly userAgents: readonly string[];
}

export interface ParsedRobotsTxt {
  readonly groups: readonly ParsedRobotsGroup[];
  readonly sitemapUrls: readonly string[];
}

interface MutableGroup {
  allow: string[];
  crawlDelay: number | null;
  disallow: string[];
  userAgents: string[];
}

const LINE_SEP = /\r?\n/;
const COMMENT_STRIP = /#.*/;

interface ParseState {
  current: MutableGroup | null;
  groups: MutableGroup[];
  readingAgents: boolean;
  sitemapUrls: string[];
}

const newGroup = (): MutableGroup => ({
  userAgents: [],
  allow: [],
  disallow: [],
  crawlDelay: null,
});

const handleUserAgent = (state: ParseState, value: string) => {
  if (!(state.readingAgents && state.current)) {
    state.current = newGroup();
    state.groups.push(state.current);
  }
  state.current.userAgents.push(value);
  state.readingAgents = true;
};

const handleDirective = (state: ParseState, key: string, value: string) => {
  state.readingAgents = false;
  if (key === "allow") {
    state.current?.allow.push(value);
    return;
  }
  if (key === "disallow") {
    state.current?.disallow.push(value);
    return;
  }
  if (key === "crawl-delay") {
    const n = Number(value);
    if (state.current && Number.isFinite(n)) {
      state.current.crawlDelay = n;
    }
    return;
  }
  if (key === "sitemap") {
    state.sitemapUrls.push(value);
  }
};

const parseLine = (line: string): { key: string; value: string } | null => {
  const idx = line.indexOf(":");
  if (idx === -1) {
    return null;
  }
  const value = line.slice(idx + 1).trim();
  if (!value) {
    return null;
  }
  return { key: line.slice(0, idx).trim().toLowerCase(), value };
};

/**
 * Minimal but spec-faithful robots.txt parser. Groups start on `User-agent:`
 * lines; consecutive agents form a shared group until the first directive.
 * Comments, empty lines, and unknown directives are tolerated.
 */
export const parseRobotsTxt = (text: string): ParsedRobotsTxt => {
  const state: ParseState = {
    groups: [],
    sitemapUrls: [],
    current: null,
    readingAgents: false,
  };

  for (const raw of text.split(LINE_SEP)) {
    const line = raw.replace(COMMENT_STRIP, "").trim();
    if (!line) {
      continue;
    }
    const parsed = parseLine(line);
    if (!parsed) {
      continue;
    }
    if (parsed.key === "user-agent") {
      handleUserAgent(state, parsed.value);
    } else {
      handleDirective(state, parsed.key, parsed.value);
    }
  }
  return { groups: state.groups, sitemapUrls: state.sitemapUrls };
};

export class RobotsService extends Context.Tag("RobotsService")<
  RobotsService,
  RobotsServiceShape
>() {
  static readonly layer = Layer.effect(
    RobotsService,
    Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient;
      const cache: OriginCache<Option.Option<RobotsTxt>> = makeOriginCache();

      const fetchRobots = Effect.fn("RobotsService.fetch")(function* (
        origin: string
      ) {
        const url = PageUrl.make(`${origin}/robots.txt`);
        const response = yield* client.execute(buildGet(url)).pipe(
          Effect.catchTags({
            RequestError: (cause) =>
              Effect.fail(new RobotsFetchFailed({ url, cause })),
            ResponseError: (cause) =>
              Effect.fail(
                new RobotsFetchFailed({
                  url,
                  status: cause.response.status,
                  cause,
                })
              ),
          })
        );

        if (isNotFound(response)) {
          return Option.none<RobotsTxt>();
        }
        if (!isOk(response)) {
          return yield* new RobotsFetchFailed({
            url,
            status: response.status,
            cause: `HTTP ${response.status}`,
          });
        }

        const body = yield* response.text.pipe(
          Effect.catchTag("ResponseError", (cause) =>
            Effect.fail(
              new RobotsFetchFailed({
                url,
                status: response.status,
                cause,
              })
            )
          )
        );

        const parsed = parseRobotsTxt(body);
        return Option.some(
          new RobotsTxt({
            url,
            rawText: body,
            groups: parsed.groups.map(
              (g) =>
                new RobotsGroup({
                  userAgents: g.userAgents,
                  allow: g.allow,
                  disallow: g.disallow,
                  crawlDelay: g.crawlDelay,
                })
            ),
            sitemapUrls: parsed.sitemapUrls.map((s) => PageUrl.make(s)),
          })
        );
      });

      return RobotsService.of({
        get: (origin) =>
          withOriginCache(cache, origin, fetchRobots(origin)).pipe(
            Effect.timeoutFail({
              duration: "10 seconds",
              onTimeout: () =>
                new RobotsFetchFailed({
                  url: PageUrl.make(`${origin}/robots.txt`),
                  cause: "robots.txt fetch timed out",
                }),
            })
          ),
        invalidate: (origin) => cache.invalidate(origin),
      });
    })
  ).pipe(Layer.provide(SiteHttpClientLayer));

  static readonly testLayer = (
    impl: RobotsServiceShape = {
      get: () => Effect.succeed(Option.none()),
      invalidate: () => Effect.void,
    }
  ) => Layer.succeed(RobotsService, RobotsService.of(impl));
}
