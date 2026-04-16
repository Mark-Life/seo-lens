import type { AuditResult, PageData } from "@workspace/seo-rules/shapes";
import { CARD_HEIGHT, CARD_WIDTH, drawCard, PIXEL_RATIO } from "./card-canvas";
import {
  collectFaviconCandidates,
  fetchFaviconDataUrl,
} from "./favicon-loader";
import { formatDisplayUrl } from "./format-url";

export interface RenderedCard {
  readonly blob: Blob;
  readonly objectUrl: string;
}

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to decode favicon image"));
    img.src = src;
  });

/**
 * Render the share card to a PNG blob using Canvas 2D. Fetches the favicon,
 * draws the card directly onto a pre-scaled canvas, then exports via toBlob.
 */
export const renderCard = async (
  result: AuditResult,
  page: PageData
): Promise<RenderedCard> => {
  const { host, path } = formatDisplayUrl(page.url);
  const candidates = collectFaviconCandidates(
    page.url,
    page.headLinks,
    result.siteSignals?.favicon?.url ?? null
  );
  const faviconDataUrl = await fetchFaviconDataUrl(candidates);
  const faviconImage = faviconDataUrl ? await loadImage(faviconDataUrl) : null;

  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH * PIXEL_RATIO;
  canvas.height = CARD_HEIGHT * PIXEL_RATIO;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context unavailable");
  }
  ctx.scale(PIXEL_RATIO, PIXEL_RATIO);

  drawCard({ ctx, result, host, path, faviconImage });

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) {
        resolve(b);
      } else {
        reject(new Error("canvas.toBlob returned null"));
      }
    }, "image/png");
  });
  return { blob, objectUrl: URL.createObjectURL(blob) };
};
