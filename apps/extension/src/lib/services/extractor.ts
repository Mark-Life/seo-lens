import {
  ExtractionFailed,
  type RestrictedUrl,
  type TabNotReady,
} from "@workspace/seo-rules/errors";
import { PageData, PageSignals, type TabId } from "@workspace/seo-rules/schema";
import { Context, Effect, Layer, Schema } from "effect";
import { BrowserApi } from "./browser-api";

const decodePageData = Schema.decodeUnknown(PageData);
const decodePageSignals = Schema.decodeUnknown(PageSignals);

export interface ExtractedPage {
  readonly page: PageData;
  readonly signals: PageSignals;
}

export interface ExtractorShape {
  readonly extract: (
    tabId: TabId
  ) => Effect.Effect<
    ExtractedPage,
    ExtractionFailed | RestrictedUrl | TabNotReady
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
          .sendMessage<{ page: unknown; signals: unknown }>(tabId, {
            type: "EXTRACT_PAGE_DATA",
          })
          .pipe(
            Effect.catchTag("NoActiveTab", (cause) =>
              Effect.fail(new ExtractionFailed({ tabId, cause }))
            )
          );
        const page = yield* decodePageData(raw.page).pipe(
          Effect.catchTag("ParseError", (cause) =>
            Effect.fail(new ExtractionFailed({ tabId, cause }))
          )
        );
        const signals = yield* decodePageSignals(raw.signals).pipe(
          Effect.catchTag("ParseError", (cause) =>
            Effect.fail(new ExtractionFailed({ tabId, cause }))
          )
        );
        return { page, signals };
      });

      return Extractor.of({ extract });
    })
  );

  static readonly testLayer = (pages: ReadonlyMap<TabId, ExtractedPage>) =>
    Layer.succeed(
      Extractor,
      Extractor.of({
        extract: (tabId) => {
          const extracted = pages.get(tabId);
          return extracted
            ? Effect.succeed(extracted)
            : Effect.fail(
                new ExtractionFailed({ tabId, cause: "no stub page" })
              );
        },
      })
    );
}
