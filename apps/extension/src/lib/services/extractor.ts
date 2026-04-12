import {
  ExtractionFailed,
  PageData,
  type RestrictedUrl,
  type TabId,
  type TabNotReady,
} from "@workspace/seo-rules";
import { Context, Effect, Layer, Schema } from "effect";
import { BrowserApi } from "./browser-api";

const decodePageData = Schema.decodeUnknown(PageData);

export interface ExtractorShape {
  readonly extract: (
    tabId: TabId
  ) => Effect.Effect<PageData, ExtractionFailed | RestrictedUrl | TabNotReady>;
}

export class Extractor extends Context.Tag("Extractor")<
  Extractor,
  ExtractorShape
>() {
  static readonly layer = Layer.effect(
    Extractor,
    Effect.gen(function* () {
      const api = yield* BrowserApi;

      const extract = Effect.fn("Extractor.extract")(function* (tabId: TabId) {
        const tab = yield* api
          .getTab(tabId)
          .pipe(
            Effect.catchTag("NoActiveTab", (cause) =>
              Effect.fail(new ExtractionFailed({ tabId, cause }))
            )
          );
        yield* api.ensureAuditable(tab);
        const raw = yield* api
          .sendMessage<unknown>(tabId, { type: "EXTRACT_PAGE_DATA" })
          .pipe(
            Effect.timeoutFail({
              duration: "2 seconds",
              onTimeout: () =>
                new ExtractionFailed({
                  tabId,
                  cause: "content script timed out",
                }),
            }),
            Effect.catchTag("NoActiveTab", (cause) =>
              Effect.fail(new ExtractionFailed({ tabId, cause }))
            )
          );
        return yield* decodePageData(raw).pipe(
          Effect.catchTag("ParseError", (cause) =>
            Effect.fail(new ExtractionFailed({ tabId, cause }))
          )
        );
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
