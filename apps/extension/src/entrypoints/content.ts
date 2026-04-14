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
    const nextFrame = () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });

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

    const waitForIdle = (timeoutMs: number) =>
      new Promise<void>((resolve) => {
        const ric = (
          globalThis as typeof globalThis & {
            requestIdleCallback?: (
              cb: () => void,
              opts?: { timeout: number }
            ) => number;
          }
        ).requestIdleCallback;
        if (typeof ric === "function") {
          ric(() => resolve(), { timeout: timeoutMs });
          return;
        }
        setTimeout(resolve, timeoutMs);
      });

    const extractAfterSettle = async () => {
      await waitForReadyComplete();
      await nextFrame();
      await nextFrame();
      await waitForIdle(800);
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
