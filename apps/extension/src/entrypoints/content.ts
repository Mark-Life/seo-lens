import type { PageData } from "@workspace/seo-rules";

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    browser.runtime.onMessage.addListener(
      (
        message: { type: string },
        _sender,
        sendResponse: (data: PageData) => void
      ) => {
        if (message.type === "EXTRACT_PAGE_DATA") {
          sendResponse(extractPageData());
        }
        return true;
      }
    );
  },
});

function extractPageData(): PageData {
  const doc = document;

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
    src: img.src,
    alt: img.alt || null,
  }));

  const pageUrl = doc.location.href;
  const links = Array.from(doc.querySelectorAll("a[href]")).map((a) => {
    const anchor = a as HTMLAnchorElement;
    return {
      href: anchor.href,
      text: anchor.textContent?.trim() || "",
      isExternal: anchor.hostname !== doc.location.hostname,
      rel: anchor.rel || null,
    };
  });

  const openGraph: Record<string, string> = {};
  for (const el of doc.querySelectorAll<HTMLMetaElement>(
    'meta[property^="og:"]'
  )) {
    const property = el.getAttribute("property");
    if (property) {
      openGraph[property] = el.content;
    }
  }

  const twitterCard: Record<string, string> = {};
  for (const el of doc.querySelectorAll<HTMLMetaElement>(
    'meta[name^="twitter:"]'
  )) {
    const name = el.getAttribute("name");
    if (name) {
      twitterCard[name] = el.content;
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
    url: pageUrl,
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
}
