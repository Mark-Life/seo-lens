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

export type AuditRootSource = "main" | "role-main" | "largest-subtree" | "body";

export interface AuditRoot {
  element: Element;
  source: AuditRootSource;
}

const DISPLAY_NONE_RE = /display\s*:\s*none/i;
const VISIBILITY_HIDDEN_RE = /visibility\s*:\s*hidden/i;
const WHITESPACE_RE = /\s+/;

const NON_CONTENT_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEMPLATE",
  "LINK",
  "META",
]);

const isNonContent = (el: Element): boolean => NON_CONTENT_TAGS.has(el.tagName);

const isHidden = (el: Element): boolean => {
  if (el.hasAttribute("hidden")) {
    return true;
  }
  if (el.getAttribute("aria-hidden") === "true") {
    return true;
  }
  const style = el.getAttribute("style") ?? "";
  if (DISPLAY_NONE_RE.test(style)) {
    return true;
  }
  if (VISIBILITY_HIDDEN_RE.test(style)) {
    return true;
  }
  return false;
};

const visibleTextLength = (el: Element): number => {
  if (isHidden(el) || isNonContent(el)) {
    return 0;
  }
  return (el.textContent ?? "").trim().length;
};

/**
 * Pick a single visible element, collapsing nested duplicates to the outermost.
 * Returns null when multiple unrelated visible elements remain (ambiguous).
 */
const pickOutermostVisible = (els: ArrayLike<Element>): Element | null => {
  const visible = Array.from(els).filter((el) => !isHidden(el));
  if (visible.length === 0) {
    return null;
  }
  const visibleSet = new Set(visible);
  const outermost = visible.filter((el) => {
    let p = el.parentElement;
    while (p) {
      if (visibleSet.has(p)) {
        return false;
      }
      p = p.parentElement;
    }
    return true;
  });
  return outermost.length === 1 ? (outermost[0] ?? null) : null;
};

/**
 * Choose the subtree to audit. Mount-merging SPAs (parallel routes, view
 * transitions) leave prior route DOM in the tree; auditing the whole document
 * yields stale headings/images/links. This heuristic scopes extraction to the
 * active route.
 */
export const findAuditRoot = (doc: Document): AuditRoot => {
  const main = pickOutermostVisible(doc.querySelectorAll("main"));
  if (main && visibleTextLength(main) > 0) {
    return { element: main, source: "main" };
  }

  const roleMain = pickOutermostVisible(doc.querySelectorAll('[role="main"]'));
  if (roleMain && visibleTextLength(roleMain) > 0) {
    return { element: roleMain, source: "role-main" };
  }

  const body = doc.body;
  if (!body) {
    return { element: doc.documentElement, source: "body" };
  }

  let best: Element | null = null;
  let bestLen = 0;
  for (const child of Array.from(body.children)) {
    const len = visibleTextLength(child);
    if (len > bestLen) {
      bestLen = len;
      best = child;
    }
  }
  if (best) {
    return { element: best, source: "largest-subtree" };
  }
  return { element: body, source: "body" };
};

const extractHeadings = (root: ParentNode) =>
  Array.from(root.querySelectorAll("h1, h2, h3, h4, h5, h6")).map((el) => ({
    level: Number.parseInt(el.tagName.substring(1), 10),
    text: el.textContent?.trim() || "",
  }));

const extractImages = (root: ParentNode, url: PageUrl) =>
  Array.from(root.querySelectorAll("img")).map((img) => {
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

const extractLinks = (root: ParentNode, url: PageUrl) => {
  const host = hostOf(url);
  return Array.from(root.querySelectorAll("a[href]")).map((a) => {
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
  const auditRoot = findAuditRoot(doc);
  const root = auditRoot.element;
  return {
    url,
    title: doc.title || "",
    metaDescription:
      doc.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ||
      "",
    canonical:
      doc.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href || null,
    headings: extractHeadings(root),
    images: extractImages(root, url),
    links: extractLinks(root, url),
    openGraph: extractOpenGraph(doc, url),
    twitterCard: extractTwitterCard(doc, url),
    jsonLd: extractJsonLd(doc),
    robotsMeta:
      doc.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content ||
      null,
    auditRoot: {
      selector: describeElement(root),
      source: auditRoot.source,
    },
  };
};

const describeElement = (el: Element): string => {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const cls = el.getAttribute("class");
  const firstClass = cls ? `.${cls.trim().split(WHITESPACE_RE)[0]}` : "";
  const role = el.getAttribute("role");
  const roleAttr = role ? `[role="${role}"]` : "";
  return `${tag}${id}${firstClass}${roleAttr}`;
};
