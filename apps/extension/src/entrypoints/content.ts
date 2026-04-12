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
