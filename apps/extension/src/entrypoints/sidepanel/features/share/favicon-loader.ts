import type { HeadLink } from "@workspace/seo-rules/shapes";

const ICON_SIZE = 128;

const ICON_REL_TOKENS = new Set(["icon", "shortcut", "apple-touch-icon"]);
const WHITESPACE = /\s+/;

const isIconLink = (link: HeadLink): boolean => {
  const tokens = link.rel.toLowerCase().split(WHITESPACE);
  return tokens.some((t) => ICON_REL_TOKENS.has(t));
};

const resolveAgainst = (base: string, href: string): string | null => {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
};

/**
 * Collect candidate favicon URLs for a page, ordered by preference:
 * declared `<link rel="icon">` hrefs first, then `/favicon.ico`.
 */
export const collectFaviconCandidates = (
  pageUrl: string,
  headLinks: readonly HeadLink[],
  fallback: string | null
): readonly string[] => {
  const declared = headLinks
    .filter(isIconLink)
    .map((l) => resolveAgainst(pageUrl, l.href))
    .filter((u): u is string => u !== null);
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const u of declared) {
    if (!seen.has(u)) {
      seen.add(u);
      ordered.push(u);
    }
  }
  if (fallback && !seen.has(fallback)) {
    ordered.push(fallback);
  }
  try {
    const origin = new URL(pageUrl).origin;
    const ico = `${origin}/favicon.ico`;
    if (!seen.has(ico)) {
      ordered.push(ico);
    }
  } catch {
    // ignore — pageUrl malformed
  }
  return ordered;
};

/**
 * Fetch a single candidate URL and rasterize it to a 128×128 PNG data URL.
 * Re-encoding via canvas means the card drawer never has to decode
 * .ico/.svg/.webp itself — Chrome's <img> handles all formats, and we
 * hand the drawer a clean PNG.
 */
const loadAsPngDataUrl = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) {
      return null;
    }
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) {
      return null;
    }
    const objUrl = URL.createObjectURL(blob);
    const img = await new Promise<HTMLImageElement | null>((resolve) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => resolve(null);
      el.src = objUrl;
    });
    URL.revokeObjectURL(objUrl);
    if (!img) {
      return null;
    }
    const canvas = document.createElement("canvas");
    canvas.width = ICON_SIZE;
    canvas.height = ICON_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }
    ctx.drawImage(img, 0, 0, ICON_SIZE, ICON_SIZE);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
};

/**
 * Try each candidate URL in order; return the first that decodes. Returns
 * null if none work (card falls back to a monogram circle).
 */
export const fetchFaviconDataUrl = async (
  candidates: readonly string[]
): Promise<string | null> => {
  for (const url of candidates) {
    const dataUrl = await loadAsPngDataUrl(url);
    if (dataUrl) {
      return dataUrl;
    }
  }
  return null;
};
