import { HttpClient } from "@effect/platform";
import {
  PageUrl,
  SecurityTxt,
  SecurityTxtFetchFailed,
} from "@workspace/seo-rules";
import { Context, Effect, Layer, Option } from "effect";
import { fetchTextOption, SiteHttpClientLayer } from "./http";
import {
  makeOriginCache,
  type OriginCache,
  withOriginCache,
} from "./origin-cache";

const CANDIDATE_PATHS = ["/.well-known/security.txt", "/security.txt"] as const;

const LINE_SEP = /\r?\n/;
const COMMENT_STRIP = /#.*/;

export interface ParsedSecurityTxt {
  readonly contact: readonly string[];
  readonly encryption: string | null;
  readonly expires: string | null;
  readonly policy: string | null;
}

const setIfEmpty = (current: string | null, value: string) =>
  current === null ? value : current;

export const parseSecurityTxt = (text: string): ParsedSecurityTxt => {
  const contact: string[] = [];
  let expires: string | null = null;
  let policy: string | null = null;
  let encryption: string | null = null;

  for (const raw of text.split(LINE_SEP)) {
    const line = raw.replace(COMMENT_STRIP, "").trim();
    if (!line) {
      continue;
    }
    const idx = line.indexOf(":");
    if (idx === -1) {
      continue;
    }
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (!value) {
      continue;
    }
    if (key === "contact") {
      contact.push(value);
    } else if (key === "expires") {
      expires = setIfEmpty(expires, value);
    } else if (key === "policy") {
      policy = setIfEmpty(policy, value);
    } else if (key === "encryption") {
      encryption = setIfEmpty(encryption, value);
    }
  }
  return { contact, expires, policy, encryption };
};

export interface SecurityTxtServiceShape {
  readonly get: (
    origin: string
  ) => Effect.Effect<Option.Option<SecurityTxt>, SecurityTxtFetchFailed>;
  readonly invalidate: (origin: string) => Effect.Effect<void>;
}

export class SecurityTxtService extends Context.Tag("SecurityTxtService")<
  SecurityTxtService,
  SecurityTxtServiceShape
>() {
  static readonly layer = Layer.effect(
    SecurityTxtService,
    Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient;
      const cache: OriginCache<Option.Option<SecurityTxt>> = makeOriginCache();

      const fetchSecurityTxt = (origin: string) =>
        Effect.gen(function* () {
          for (const path of CANDIDATE_PATHS) {
            const url = PageUrl.make(`${origin}${path}`);
            const result = yield* fetchTextOption(
              client,
              url,
              (args) => new SecurityTxtFetchFailed({ url, ...args })
            );
            if (Option.isSome(result)) {
              const parsed = parseSecurityTxt(result.value.body);
              return Option.some(
                new SecurityTxt({
                  url,
                  rawText: result.value.body,
                  contact: parsed.contact,
                  expires: parsed.expires,
                  policy: parsed.policy,
                  encryption: parsed.encryption,
                })
              );
            }
          }
          return Option.none<SecurityTxt>();
        });

      return SecurityTxtService.of({
        get: (origin) =>
          withOriginCache(cache, origin, fetchSecurityTxt(origin)).pipe(
            Effect.timeoutFail({
              duration: "10 seconds",
              onTimeout: () =>
                new SecurityTxtFetchFailed({
                  url: PageUrl.make(`${origin}/.well-known/security.txt`),
                  cause: "security.txt fetch timed out",
                }),
            })
          ),
        invalidate: (origin) => cache.invalidate(origin),
      });
    })
  ).pipe(Layer.provide(SiteHttpClientLayer));

  static readonly testLayer = (
    impl: SecurityTxtServiceShape = {
      get: () => Effect.succeed(Option.none()),
      invalidate: () => Effect.void,
    }
  ) => Layer.succeed(SecurityTxtService, SecurityTxtService.of(impl));
}
