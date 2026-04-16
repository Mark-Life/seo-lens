import type {
  AuditFinding,
  AuditResult,
  CategoryScore,
  PageData,
  PageUrl,
  RuleId,
  Score,
  SiteSignals,
} from "@workspace/seo-rules/shapes";

const rule = (s: string) => s as RuleId;
const score = (n: number) => n as Score;
const url = (s: string) => s as PageUrl;

const findings: AuditFinding[] = [
  {
    id: "meta.description-missing",
    ruleId: rule("meta.description"),
    category: "meta",
    severity: "error",
    title: "Meta description is missing",
    message:
      'No <meta name="description"> tag was found on this page. Search engines will fall back to an auto-generated snippet, which usually underperforms.',
    context: [
      { label: "length", value: "0 chars" },
      { label: "recommended", value: "120–160 chars" },
    ],
    grep: '<meta name="description"',
  } as AuditFinding,
  {
    id: "headings.skip-h1-h3",
    ruleId: rule("headings.skip-level"),
    category: "headings",
    severity: "warning",
    title: "Heading level skipped (H1 → H3)",
    message:
      "The first subheading jumps from H1 straight to H3. Screen readers and some crawlers interpret this as a malformed outline.",
    context: [
      { label: "first", value: "H1: Introducing SEO Lens" },
      { label: "next", value: "H3: How it works" },
    ],
  } as AuditFinding,
  {
    id: "structured.recommend-article",
    ruleId: rule("structured.recommend.article"),
    category: "structured",
    severity: "info",
    title: "Article schema recommended",
    message:
      "This page looks like an article. Adding an Article JSON-LD block helps you qualify for article-rich results and surfaces author/date in AI answers.",
    context: [
      { label: "reason", value: "Detected <article> element and byline" },
      { label: "reason", value: "Matches article URL pattern /blog/*" },
    ],
  } as AuditFinding,
  {
    id: "social.og-image-ok",
    ruleId: rule("social.og-image"),
    category: "social",
    severity: "pass",
    title: "Open Graph image present",
    message:
      "og:image is declared and resolves to a valid image of at least 1200×630.",
  } as AuditFinding,
  {
    id: "indexing.canonical-ok",
    ruleId: rule("indexing.canonical"),
    category: "indexing",
    severity: "pass",
    title: "Canonical URL set",
    message:
      "A canonical tag points to the expected absolute URL and matches the page URL.",
  } as AuditFinding,
];

const categoryScores: CategoryScore[] = [
  { id: "meta", score: score(62) } as CategoryScore,
  { id: "headings", score: score(78) } as CategoryScore,
  { id: "social", score: score(92) } as CategoryScore,
  { id: "structured", score: score(70) } as CategoryScore,
  { id: "images", score: score(85) } as CategoryScore,
  { id: "indexing", score: score(96) } as CategoryScore,
];

const pageUrl = url("https://example.com/blog/introducing-seo-lens");

export const mockSiteSignals: SiteSignals = {
  origin: url("https://example.com"),
  robots: {
    url: url("https://example.com/robots.txt"),
    rawText:
      "User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml\n",
    groups: [
      {
        userAgents: ["*"],
        allow: ["/"],
        disallow: [],
        crawlDelay: null,
      },
    ],
    sitemapUrls: [url("https://example.com/sitemap.xml")],
  },
  sitemaps: [
    {
      url: url("https://example.com/sitemap.xml"),
      kind: "urlset",
      variant: "sitemap",
      entries: [
        { loc: pageUrl, lastmod: "2026-04-02" },
        {
          loc: url("https://example.com/blog/headings-matter"),
          lastmod: "2026-03-18",
        },
      ],
      childSitemapUrls: [],
      truncated: false,
    },
  ],
  securityTxt: null,
  favicon: {
    url: url("https://example.com/favicon.ico"),
    contentType: "image/x-icon",
    resolvable: true,
  },
  manifest: null,
  feeds: [
    {
      url: url("https://example.com/rss.xml"),
      kind: "rss",
      contentType: "application/rss+xml",
      resolvable: true,
    },
  ],
  llmsTxt: null,
  hostProbe: {
    origin: url("https://example.com"),
    canonicalHost: "example.com",
    variants: [
      {
        scheme: "https",
        host: "example.com",
        url: url("https://example.com"),
        status: 200,
        finalUrl: url("https://example.com"),
        redirected: false,
      },
      {
        scheme: "https",
        host: "www.example.com",
        url: url("https://www.example.com"),
        status: 301,
        finalUrl: url("https://example.com"),
        redirected: true,
      },
    ],
  },
  softFourOhFour: {
    probeUrl: url("https://example.com/__seo-lens-404-probe__"),
    status: 404,
    isSoftFourOhFour: false,
  },
} as SiteSignals;

export const mockAudit: AuditResult = {
  url: pageUrl,
  phase: "page",
  score: score(78),
  counts: { error: 1, warning: 1, info: 1, pass: 2 },
  categoryScores,
  findings,
  siteSignals: mockSiteSignals,
  timestamp: 0,
} as AuditResult;

export const mockPage: PageData = {
  url: pageUrl,
  title: "Introducing SEO Lens — a side panel for the AI coding era",
  metaDescription: "",
  canonical: "https://example.com/blog/introducing-seo-lens",
  robotsMeta: "index, follow",
  headings: [
    { level: 1, text: "Introducing SEO Lens" },
    { level: 3, text: "How it works" },
    { level: 2, text: "Built for AI-assisted coding" },
    { level: 3, text: "Copy-ready findings" },
    { level: 3, text: "Proactive JSON-LD" },
    { level: 2, text: "Roadmap" },
  ],
  images: [
    {
      src: "https://lxbpjvrr41.ufs.sh/f/6KZjuRTQYJxHarlExF614FkVgD68apmxw2ziPJTKflW3S9MI",
      alt: "SEO Lens side panel preview",
    },
    {
      src: "https://lxbpjvrr41.ufs.sh/f/6KZjuRTQYJxHarlExF614FkVgD68apmxw2ziPJTKflW3S9MI",
      alt: null,
    },
    {
      src: "https://lxbpjvrr41.ufs.sh/f/6KZjuRTQYJxHarlExF614FkVgD68apmxw2ziPJTKflW3S9MI",
      alt: "Audit findings laid out as a ready-to-copy report",
    },
    {
      src: "https://lxbpjvrr41.ufs.sh/f/6KZjuRTQYJxHarlExF614FkVgD68apmxw2ziPJTKflW3S9MI",
      alt: "Proactive JSON-LD suggestions in the Metadata tab",
    },
  ],
  links: [],
  headLinks: [
    {
      rel: "canonical",
      href: "https://example.com/blog/introducing-seo-lens",
      type: null,
      title: null,
      hreflang: null,
    },
    {
      rel: "alternate",
      href: "https://example.com/rss.xml",
      type: "application/rss+xml",
      title: "Example — RSS",
      hreflang: null,
    },
  ],
  openGraph: {
    "og:title": "Introducing SEO Lens",
    "og:description":
      "A Chrome side panel that audits every page the way a crawler sees it.",
    "og:image":
      "https://lxbpjvrr41.ufs.sh/f/6KZjuRTQYJxHarlExF614FkVgD68apmxw2ziPJTKflW3S9MI",
    "og:type": "article",
    "og:site_name": "Example",
    "og:url": "https://example.com/blog/introducing-seo-lens",
  },
  twitterCard: {
    "twitter:card": "summary_large_image",
    "twitter:title": "Introducing SEO Lens",
    "twitter:description":
      "A Chrome side panel that audits every page the way a crawler sees it.",
    "twitter:image":
      "https://lxbpjvrr41.ufs.sh/f/6KZjuRTQYJxHarlExF614FkVgD68apmxw2ziPJTKflW3S9MI",
    "twitter:site": "@example",
    "twitter:creator": "@example",
  },
  jsonLd: [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "Introducing SEO Lens",
      description:
        "A Chrome side panel that audits every page the way a crawler sees it.",
      datePublished: "2026-04-02",
      author: {
        "@type": "Person",
        name: "Mark Life",
      },
      image:
        "https://lxbpjvrr41.ufs.sh/f/6KZjuRTQYJxHarlExF614FkVgD68apmxw2ziPJTKflW3S9MI",
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": "https://example.com/blog/introducing-seo-lens",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://example.com/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Blog",
          item: "https://example.com/blog",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Introducing SEO Lens",
          item: "https://example.com/blog/introducing-seo-lens",
        },
      ],
    },
  ],
  auditRoot: {
    selector: "main",
    source: "main",
  },
} as PageData;

export const mockUrl = "example.com/blog/introducing-seo-lens";
