import { HttpClient } from "@effect/platform";
import {
  ManifestFetchFailed,
  ManifestIcon,
  PageUrl,
  WebManifest,
} from "@workspace/seo-rules";
import { Context, Effect, Layer, Option } from "effect";
import { fetchTextOption, SiteHttpClientLayer } from "./http";
import {
  makeOriginCache,
  type OriginCache,
  withOriginCache,
} from "./origin-cache";

const CANDIDATE_PATHS = ["/site.webmanifest", "/manifest.json"] as const;

interface RawIcon {
  readonly sizes?: unknown;
  readonly src?: unknown;
  readonly type?: unknown;
}

interface RawManifest {
  readonly icons?: unknown;
  readonly name?: unknown;
  readonly short_name?: unknown;
}

const asString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const parseIcons = (raw: unknown): ManifestIcon[] => {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.flatMap((entry: RawIcon) => {
    const src = asString(entry?.src);
    if (!src) {
      return [];
    }
    return [
      new ManifestIcon({
        src,
        sizes: asString(entry?.sizes),
        type: asString(entry?.type),
      }),
    ];
  });
};

export const parseWebManifest = (
  url: PageUrl,
  body: string
): WebManifest | null => {
  try {
    const raw = JSON.parse(body) as RawManifest;
    return new WebManifest({
      url,
      name: asString(raw.name),
      shortName: asString(raw.short_name),
      icons: parseIcons(raw.icons),
    });
  } catch {
    return null;
  }
};

export interface ManifestServiceShape {
  readonly get: (
    origin: string
  ) => Effect.Effect<Option.Option<WebManifest>, ManifestFetchFailed>;
  readonly invalidate: (origin: string) => Effect.Effect<void>;
}

export class ManifestService extends Context.Tag("ManifestService")<
  ManifestService,
  ManifestServiceShape
>() {
  static readonly layer = Layer.effect(
    ManifestService,
    Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient;
      const cache: OriginCache<Option.Option<WebManifest>> = makeOriginCache();

      const fetchManifest = (origin: string) =>
        Effect.gen(function* () {
          for (const path of CANDIDATE_PATHS) {
            const url = PageUrl.make(`${origin}${path}`);
            const result = yield* fetchTextOption(
              client,
              url,
              (args) => new ManifestFetchFailed({ url, ...args })
            );
            if (Option.isNone(result)) {
              continue;
            }
            const parsed = parseWebManifest(url, result.value.body);
            if (parsed) {
              return Option.some(parsed);
            }
          }
          return Option.none<WebManifest>();
        });

      return ManifestService.of({
        get: (origin) =>
          withOriginCache(cache, origin, fetchManifest(origin)).pipe(
            Effect.timeoutFail({
              duration: "10 seconds",
              onTimeout: () =>
                new ManifestFetchFailed({
                  url: PageUrl.make(`${origin}/site.webmanifest`),
                  cause: "manifest fetch timed out",
                }),
            })
          ),
        invalidate: (origin) => cache.invalidate(origin),
      });
    })
  ).pipe(Layer.provide(SiteHttpClientLayer));

  static readonly testLayer = (
    impl: ManifestServiceShape = {
      get: () => Effect.succeed(Option.none()),
      invalidate: () => Effect.void,
    }
  ) => Layer.succeed(ManifestService, ManifestService.of(impl));
}
