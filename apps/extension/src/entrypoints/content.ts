import {
  extractFromDocument,
  extractPageSignals,
} from "@workspace/seo-rules/extract";
import { PageData, PageSignals, PageUrl } from "@workspace/seo-rules/schema";
import { Either, Schema } from "effect";

const decodePageData = Schema.decodeUnknownEither(PageData);
const decodePageSignals = Schema.decodeUnknownEither(PageSignals);

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    const waitForReadyComplete = () =>
      new Promise<void>((resolve) => {
        if (document.readyState === "complete") {
          resolve();
          return;
        }
        const onReady = () => {
          if (document.readyState === "complete") {
            document.removeEventListener("readystatechange", onReady);
            resolve();
          }
        };
        document.addEventListener("readystatechange", onReady);
      });

    /** Resolves when DOM stops mutating for `quietMs`, or after `maxMs` hard cap. */
    const observeUntilQuiet = (quietMs: number, maxMs: number) =>
      new Promise<void>((resolve) => {
        let quietTimer: ReturnType<typeof setTimeout>;
        const done = () => {
          observer.disconnect();
          clearTimeout(quietTimer);
          clearTimeout(hardCap);
          resolve();
        };
        const resetQuiet = () => {
          clearTimeout(quietTimer);
          quietTimer = setTimeout(done, quietMs);
        };
        const observer = new MutationObserver(resetQuiet);
        observer.observe(document.documentElement, {
          childList: true,
          subtree: true,
          attributes: true,
          characterData: true,
        });
        const hardCap = setTimeout(done, maxMs);
        resetQuiet();
      });

    const extractAfterSettle = async (settle = false) => {
      await waitForReadyComplete();
      await observeUntilQuiet(settle ? 250 : 150, settle ? 6000 : 4000);
      const url = PageUrl.make(document.location.href);
      const page = extractFromDocument(document, url);
      const signals = extractPageSignals(document, url);
      const decodedPage = decodePageData(page);
      if (Either.isLeft(decodedPage)) {
        console.warn("[seo-lens] PageData schema mismatch", decodedPage.left);
      }
      const decodedSignals = decodePageSignals(signals);
      if (Either.isLeft(decodedSignals)) {
        console.warn(
          "[seo-lens] PageSignals schema mismatch",
          decodedSignals.left
        );
      }
      return { page, signals };
    };

    browser.runtime.onMessage.addListener(
      (
        message: { type: string; settle?: boolean },
        _sender,
        sendResponse: (data: unknown) => void
      ) => {
        if (message.type === "EXTRACT_PAGE_DATA") {
          extractAfterSettle(message.settle).then(sendResponse);
          return true;
        }
        return true;
      }
    );
  },
});
