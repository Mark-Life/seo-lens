import { extractFromDocument, PageData, PageUrl } from "@workspace/seo-rules";
import { Either, Schema } from "effect";

const decodePageData = Schema.decodeUnknownEither(PageData);

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    const nextFrame = () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });

    const extractAfterSettle = async () => {
      await nextFrame();
      await nextFrame();
      const raw = extractFromDocument(
        document,
        PageUrl.make(document.location.href)
      );
      const decoded = decodePageData(raw);
      if (Either.isLeft(decoded)) {
        console.warn("[seo-lens] PageData schema mismatch", decoded.left);
      }
      return raw;
    };

    browser.runtime.onMessage.addListener(
      (
        message: { type: string },
        _sender,
        sendResponse: (data: unknown) => void
      ) => {
        if (message.type === "EXTRACT_PAGE_DATA") {
          extractAfterSettle().then(sendResponse);
          return true;
        }
        return true;
      }
    );
  },
});
