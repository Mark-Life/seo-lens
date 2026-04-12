import {
  ExtractionFailed,
  type FetchFailed,
  type PageData,
  PageUrl,
  type RestrictedUrl,
  type TabId,
  type TabNotReady,
} from "@workspace/seo-rules";
import { Context, Effect, Layer } from "effect";
import { BrowserApi } from "./browser-api";
import { Fetcher } from "./fetcher";
import { HtmlExtractor } from "./html-extractor";

export interface ExtractorShape {
  readonly extract: (
    tabId: TabId
  ) => Effect.Effect<
    PageData,
    ExtractionFailed | FetchFailed | RestrictedUrl | TabNotReady
  >;
}

export class Extractor extends Context.Tag("Extractor")<
  Extractor,
  ExtractorShape
>() {
  static readonly layer = Layer.effect(
    Extractor,
    Effect.gen(function* () {
      const api = yield* BrowserApi;
      const fetcher = yield* Fetcher;
      const htmlExtractor = yield* HtmlExtractor;

      const extract = Effect.fn("Extractor.extract")(function* (tabId: TabId) {
        const tab = yield* api
          .getTab(tabId)
          .pipe(
            Effect.catchTag("NoActiveTab", (cause) =>
              Effect.fail(new ExtractionFailed({ tabId, cause }))
            )
          );
        const auditable = yield* api.ensureAuditable(tab);
        const url = PageUrl.make(auditable.url);
        const html = yield* fetcher.fetch(url);
        return yield* htmlExtractor.extract(tabId, url, html);
      });

      return Extractor.of({ extract });
    })
  );

  static readonly testLayer = (pages: ReadonlyMap<TabId, PageData>) =>
    Layer.succeed(
      Extractor,
      Extractor.of({
        extract: (tabId) => {
          const page = pages.get(tabId);
          return page
            ? Effect.succeed(page)
            : Effect.fail(
                new ExtractionFailed({ tabId, cause: "no stub page" })
              );
        },
      })
    );
}
