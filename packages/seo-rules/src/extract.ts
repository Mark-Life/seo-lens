import type { PageUrl } from "./schema";

/**
 * Extracts SEO-relevant data from a `Document`. Pure: no globals, no side
 * effects. The caller passes in the URL since the parsed document's
 * `location.href` may be unreliable (e.g., `<base>` overrides, `DOMParser`
 * returns `about:blank`).
 */
const toAbsolute = (href: string, base: string): string => {
  try {
    return new URL(href, base).href;
  } catch {
    return href;
  }
};

const extractHeadings = (doc: Document) =>
  Array.from(doc.querySelectorAll("h1, h2, h3, h4, h5, h6")).map((el) => ({
    level: Number.parseInt(el.tagName.substring(1), 10),
    text: el.textContent?.trim() || "",
  }));

const extractImages = (doc: Document, url: PageUrl) =>
  Array.from(doc.querySelectorAll("img")).map((img) => {
    const rawSrc = img.getAttribute("src") || "";
    return {
      src: rawSrc ? toAbsolute(rawSrc, url) : "",
      alt: img.getAttribute("alt"),
    };
  });

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
};

const extractLinks = (doc: Document, url: PageUrl) => {
  const host = hostOf(url);
  return Array.from(doc.querySelectorAll("a[href]")).map((a) => {
    const href = a.getAttribute("href") || "";
    const linkHost = hostOf(new URL(href, url).href);
    return {
      href,
      text: a.textContent?.trim() || "",
      isExternal: linkHost !== "" && linkHost !== host,
      rel: a.getAttribute("rel") || null,
    };
  });
};

const extractOpenGraph = (doc: Document, url: PageUrl) => {
  const openGraph: Record<string, string> = {};
  for (const el of doc.querySelectorAll<HTMLMetaElement>(
    'meta[property^="og:"]'
  )) {
    const property = el.getAttribute("property");
    if (!property) {
      continue;
    }
    const content = el.getAttribute("content") || "";
    openGraph[property] =
      property === "og:image" && content ? toAbsolute(content, url) : content;
  }
  return openGraph;
};

const extractTwitterCard = (doc: Document, url: PageUrl) => {
  const twitterCard: Record<string, string> = {};
  for (const el of doc.querySelectorAll<HTMLMetaElement>(
    'meta[name^="twitter:"]'
  )) {
    const name = el.getAttribute("name");
    if (!name) {
      continue;
    }
    const content = el.getAttribute("content") || "";
    twitterCard[name] =
      name === "twitter:image" && content ? toAbsolute(content, url) : content;
  }
  return twitterCard;
};

const extractJsonLd = (doc: Document): unknown[] => {
  const jsonLd: unknown[] = [];
  for (const script of doc.querySelectorAll<HTMLScriptElement>(
    'script[type="application/ld+json"]'
  )) {
    try {
      jsonLd.push(JSON.parse(script.textContent || ""));
    } catch {
      // Skip invalid JSON-LD
    }
  }
  return jsonLd;
};

export const extractFromDocument = (doc: Document, url: PageUrl): unknown => {
  return {
    url,
    title: doc.title || "",
    metaDescription:
      doc.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ||
      "",
    canonical:
      doc.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href || null,
    headings: extractHeadings(doc),
    images: extractImages(doc, url),
    links: extractLinks(doc, url),
    openGraph: extractOpenGraph(doc, url),
    twitterCard: extractTwitterCard(doc, url),
    jsonLd: extractJsonLd(doc),
    robotsMeta:
      doc.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content ||
      null,
  };
};
