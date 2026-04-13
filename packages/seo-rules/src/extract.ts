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

// ─── PageSignals extraction (scope A: page-kind detection) ────────────

const PRICE_RE = /(?:[$€£]|\bUSD|\bEUR)\s?\d/;
const CART_AFFORDANCE_RE = /add to cart|buy now|add to bag/i;
const WHITESPACE_RUN_RE = /\s+/g;

const extractTimeElements = (
  doc: Document
): readonly { datetime: string; text: string }[] =>
  Array.from(doc.querySelectorAll("time[datetime]")).map((el) => ({
    datetime: el.getAttribute("datetime") || "",
    text: el.textContent?.trim() || "",
  }));

const extractMicrodataTypes = (doc: Document): readonly string[] => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const el of doc.querySelectorAll("[itemtype]")) {
    const t = el.getAttribute("itemtype");
    if (t && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
};

const extractPricePatterns = (
  root: Element
): readonly { snippet: string; nearH1: boolean }[] => {
  const text = root.textContent || "";
  const m = PRICE_RE.exec(text);
  if (!m) {
    return [];
  }
  const start = Math.max(0, m.index - 10);
  const snippet = text
    .slice(start, m.index + 30)
    .replace(WHITESPACE_RUN_RE, " ")
    .trim();

  let nearH1 = false;
  const h1 = root.querySelector("h1");
  if (h1) {
    let p: Element | null = h1;
    for (let i = 0; i < 4 && p; i++) {
      if (PRICE_RE.test(p.textContent || "")) {
        nearH1 = true;
        break;
      }
      p = p.parentElement;
    }
  }
  return [{ snippet, nearH1 }];
};

const extractCartAffordances = (root: Element): readonly string[] => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const el of root.querySelectorAll(
    'button, a, input[type="button"], input[type="submit"]'
  )) {
    const text = (el.textContent || el.getAttribute("value") || "").trim();
    if (text && CART_AFFORDANCE_RE.test(text) && !seen.has(text)) {
      seen.add(text);
      out.push(text);
      if (out.length >= 5) {
        break;
      }
    }
  }
  return out;
};

const BREADCRUMB_SELECTORS: readonly string[] = [
  'nav[aria-label*="breadcrumb" i]',
  'ol[class*="breadcrumb" i]',
  'ul[class*="breadcrumb" i]',
  '[itemtype*="BreadcrumbList"]',
];

const extractBreadcrumbDom = (
  doc: Document,
  url: PageUrl
): {
  selector: string;
  items: readonly { text: string; href: string }[];
} | null => {
  for (const selector of BREADCRUMB_SELECTORS) {
    const el = doc.querySelector(selector);
    if (!el) {
      continue;
    }
    const items = Array.from(el.querySelectorAll("a[href]")).map((a) => ({
      text: a.textContent?.trim() || "",
      href: toAbsolute(a.getAttribute("href") || "", url),
    }));
    if (items.length > 0) {
      return { selector, items };
    }
  }
  return null;
};

const parseUrlPath = (
  url: PageUrl
): { segments: readonly string[]; isRoot: boolean } => {
  try {
    const u = new URL(url);
    const segments = u.pathname.split("/").filter(Boolean);
    return { segments, isRoot: segments.length === 0 };
  } catch {
    return { segments: [], isRoot: false };
  }
};

/**
 * Extracts raw page signals used by the page-kind detector (scope A).
 * The `*Like` confidence fields are populated by the detector itself and are
 * emitted here as zero placeholders. All other fields are DOM-derived.
 */
export const extractPageSignals = (doc: Document, url: PageUrl): unknown => {
  const auditRoot = findAuditRoot(doc);
  const root = auditRoot.element;
  const { segments, isRoot } = parseUrlPath(url);
  const ogType =
    doc.querySelector<HTMLMetaElement>('meta[property="og:type"]')?.content ||
    null;
  return {
    articleLike: 0,
    productLike: 0,
    homepageLike: 0,
    breadcrumbLike: 0,
    hasArticleElement: doc.querySelector("article") !== null,
    hasNavElement: doc.querySelector("nav") !== null,
    articleTextLength: visibleTextLength(root),
    ogType,
    timeElements: extractTimeElements(doc),
    microdataTypes: extractMicrodataTypes(doc),
    pricePatterns: extractPricePatterns(root),
    cartAffordances: extractCartAffordances(root),
    breadcrumbDom: extractBreadcrumbDom(doc, url),
    urlPathSegments: segments,
    isRootPath: isRoot,
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
