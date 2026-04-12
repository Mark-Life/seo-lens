import type { PageUrl } from "./schema";

/**
 * Extracts SEO-relevant data from a `Document`. Pure: no globals, no side
 * effects. The caller passes in the URL since the parsed document's
 * `location.href` may be unreliable (e.g., `<base>` overrides, `DOMParser`
 * returns `about:blank`).
 */
export const extractFromDocument = (doc: Document, url: PageUrl): unknown => {
  const title = doc.title || "";
  const metaDescription =
    doc.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ||
    "";
  const canonical =
    doc.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href || null;

  const headings = Array.from(
    doc.querySelectorAll("h1, h2, h3, h4, h5, h6")
  ).map((el) => ({
    level: Number.parseInt(el.tagName.substring(1), 10),
    text: el.textContent?.trim() || "",
  }));

  const images = Array.from(doc.querySelectorAll("img")).map((img) => ({
    src: img.getAttribute("src") || "",
    alt: img.getAttribute("alt"),
  }));

  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    host = "";
  }

  const links = Array.from(doc.querySelectorAll("a[href]")).map((a) => {
    const href = a.getAttribute("href") || "";
    let linkHost = "";
    try {
      linkHost = new URL(href, url).hostname;
    } catch {
      // ignore
    }
    return {
      href,
      text: a.textContent?.trim() || "",
      isExternal: linkHost !== "" && linkHost !== host,
      rel: a.getAttribute("rel") || null,
    };
  });

  const openGraph: Record<string, string> = {};
  for (const el of doc.querySelectorAll<HTMLMetaElement>(
    'meta[property^="og:"]'
  )) {
    const property = el.getAttribute("property");
    if (property) {
      openGraph[property] = el.getAttribute("content") || "";
    }
  }

  const twitterCard: Record<string, string> = {};
  for (const el of doc.querySelectorAll<HTMLMetaElement>(
    'meta[name^="twitter:"]'
  )) {
    const name = el.getAttribute("name");
    if (name) {
      twitterCard[name] = el.getAttribute("content") || "";
    }
  }

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

  const robotsMeta =
    doc.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content || null;

  return {
    url,
    title,
    metaDescription,
    canonical,
    headings,
    images,
    links,
    openGraph,
    twitterCard,
    jsonLd,
    robotsMeta,
  };
};
