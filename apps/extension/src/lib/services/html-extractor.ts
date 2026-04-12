import {
  ExtractionFailed,
  extractFromDocument,
  PageData,
  type PageUrl,
  type TabId,
} from "@workspace/seo-rules";
import { Context, Effect, Layer, Schema } from "effect";
import { parseHTML } from "linkedom";

const decodePageData = Schema.decodeUnknown(PageData);

const parseDoc = (html: string): Document =>
  parseHTML(html).document as unknown as Document;

export interface HtmlExtractorShape {
  readonly extract: (
    tabId: TabId,
    url: PageUrl,
    html: string
  ) => Effect.Effect<PageData, ExtractionFailed>;
}

export class HtmlExtractor extends Context.Tag("HtmlExtractor")<
  HtmlExtractor,
  HtmlExtractorShape
>() {
  static readonly layer = Layer.sync(HtmlExtractor, () => {
    const extract = Effect.fn("HtmlExtractor.extract")(function* (
      tabId: TabId,
      url: PageUrl,
      html: string
    ) {
      const doc = yield* Effect.try({
        try: () => parseDoc(html),
        catch: (cause) => new ExtractionFailed({ tabId, cause }),
      });
      const raw = yield* Effect.try({
        try: () => extractFromDocument(doc, url),
        catch: (cause) => new ExtractionFailed({ tabId, cause }),
      });
      return yield* decodePageData(raw).pipe(
        Effect.catchTag("ParseError", (cause) =>
          Effect.fail(new ExtractionFailed({ tabId, cause }))
        )
      );
    });

    return HtmlExtractor.of({ extract });
  });

  static readonly testLayer = Layer.sync(HtmlExtractor, () =>
    HtmlExtractor.of({
      extract: (tabId, url, html) =>
        Effect.try({
          try: () => {
            const doc = parseDoc(html);
            return extractFromDocument(doc, url);
          },
          catch: (cause) => new ExtractionFailed({ tabId, cause }),
        }).pipe(
          Effect.flatMap((raw) =>
            decodePageData(raw).pipe(
              Effect.catchTag("ParseError", (cause) =>
                Effect.fail(new ExtractionFailed({ tabId, cause }))
              )
            )
          )
        ),
    })
  );
}
