import { describe, expect, it } from "@effect/vitest";
import {
  isPathDisallowed,
  siteCanonicalHostDriftRule,
  siteFaviconMissingRule,
  siteFeedBrokenRule,
  siteManifestMissingRule,
  siteNotInSitemapRule,
  siteRobotsDisallowRule,
  siteRobotsSitemapDriftRule,
  siteSecurityTxtMissingRule,
  siteSitemapMissingRule,
  siteSoft404Rule,
} from "../src/rules/site/index.js";
import {
  AuditRootInfo,
  Confidence,
  Favicon,
  Feed,
  HeadLink,
  HostProbeResult,
  HostProbeVariant,
  PageData,
  PageSignals,
  PageUrl,
  RobotsGroup,
  RobotsTxt,
  Sitemap,
  SitemapEntry,
  SiteSignals,
  SoftFourOhFourProbe,
  WebManifest,
} from "../src/schema.js";

const ZERO = Confidence.make(0);

const signals: PageSignals = PageSignals.make({
  articleLike: ZERO,
  productLike: ZERO,
  homepageLike: ZERO,
  breadcrumbLike: ZERO,
  hasArticleElement: false,
  hasNavElement: false,
  articleTextLength: 0,
  ogType: null,
  timeElements: [],
  microdataTypes: [],
  pricePatterns: [],
  cartAffordances: [],
  breadcrumbDom: null,
  urlPathSegments: [],
  isRootPath: false,
});

const makePage = (
  overrides: Partial<{
    url: string;
    robotsMeta: string | null;
    headLinks: readonly HeadLink[];
  }> = {}
): PageData =>
  PageData.make({
    url: PageUrl.make(overrides.url ?? "https://example.com/"),
    title: "",
    metaDescription: "",
    canonical: null,
    robotsMeta: overrides.robotsMeta ?? null,
    headings: [],
    images: [],
    links: [],
    headLinks: overrides.headLinks ?? [],
    openGraph: {},
    twitterCard: {},
    jsonLd: [],
    auditRoot: AuditRootInfo.make({ selector: "body", source: "body" }),
  });

const makeSiteSignals = (overrides: Partial<SiteSignals> = {}): SiteSignals =>
  SiteSignals.make({
    origin: PageUrl.make("https://example.com"),
    robots: null,
    sitemaps: [],
    securityTxt: null,
    favicon: null,
    manifest: null,
    feeds: [],
    llmsTxt: null,
    hostProbe: null,
    softFourOhFour: null,
    ...overrides,
  });

const makeRobots = (
  groups: readonly {
    userAgents: readonly string[];
    allow?: readonly string[];
    disallow?: readonly string[];
  }[],
  sitemapUrls: readonly string[] = []
): RobotsTxt =>
  RobotsTxt.make({
    url: PageUrl.make("https://example.com/robots.txt"),
    rawText: "",
    groups: groups.map((g) =>
      RobotsGroup.make({
        userAgents: g.userAgents,
        allow: g.allow ?? [],
        disallow: g.disallow ?? [],
        crawlDelay: null,
      })
    ),
    sitemapUrls: sitemapUrls.map((u) => PageUrl.make(u)),
  });

const makeSitemap = (urls: readonly string[]): Sitemap =>
  Sitemap.make({
    url: PageUrl.make("https://example.com/sitemap.xml"),
    kind: "urlset",
    variant: "sitemap",
    entries: urls.map((u) =>
      SitemapEntry.make({ loc: PageUrl.make(u), lastmod: null })
    ),
    childSitemapUrls: [],
    truncated: false,
  });

// ─── isPathDisallowed ──────────────────────────────────────────────────

describe("isPathDisallowed", () => {
  it("returns false when no group matches the user agent", () => {
    const robots = makeRobots([
      { userAgents: ["Googlebot"], disallow: ["/private"] },
    ]);
    expect(isPathDisallowed(robots, "/private", "*").disallowed).toBe(false);
  });

  it("matches the wildcard group when no exact UA match", () => {
    const robots = makeRobots([{ userAgents: ["*"], disallow: ["/admin"] }]);
    expect(isPathDisallowed(robots, "/admin/users", "*").disallowed).toBe(true);
  });

  it("prefers exact UA over wildcard", () => {
    const robots = makeRobots([
      { userAgents: ["*"], disallow: ["/"] },
      { userAgents: ["Googlebot"], allow: ["/"], disallow: [] },
    ]);
    const m = isPathDisallowed(robots, "/page", "Googlebot");
    expect(m.disallowed).toBe(false);
    expect(m.userAgentGroup).toBe("Googlebot");
  });

  it("ignores empty Disallow values (allow all)", () => {
    const robots = makeRobots([{ userAgents: ["*"], disallow: [""] }]);
    expect(isPathDisallowed(robots, "/anything", "*").disallowed).toBe(false);
  });

  it("longest match wins; allow ties beat disallow", () => {
    const robots = makeRobots([
      {
        userAgents: ["*"],
        allow: ["/blog/public"],
        disallow: ["/blog"],
      },
    ]);
    expect(isPathDisallowed(robots, "/blog/public/post", "*").disallowed).toBe(
      false
    );
    expect(isPathDisallowed(robots, "/blog/draft", "*").disallowed).toBe(true);
  });

  it("supports * wildcard and $ end anchor", () => {
    const robots = makeRobots([
      {
        userAgents: ["*"],
        disallow: ["/*.pdf$"],
      },
    ]);
    expect(isPathDisallowed(robots, "/docs/report.pdf", "*").disallowed).toBe(
      true
    );
    expect(
      isPathDisallowed(robots, "/docs/report.pdf?v=1", "*").disallowed
    ).toBe(false);
  });
});

// ─── siteRobotsDisallowRule ────────────────────────────────────────────

describe("siteRobotsDisallowRule", () => {
  it("no-op when siteSignals undefined or robots missing", () => {
    const page = makePage();
    expect(siteRobotsDisallowRule.run(page, signals, undefined)).toHaveLength(
      0
    );
    expect(
      siteRobotsDisallowRule.run(page, signals, makeSiteSignals())
    ).toHaveLength(0);
  });

  it("emits error when page path is disallowed", () => {
    const page = makePage({ url: "https://example.com/admin/dashboard" });
    const siteSignals = makeSiteSignals({
      robots: makeRobots([{ userAgents: ["*"], disallow: ["/admin"] }]),
    });
    const findings = siteRobotsDisallowRule.run(page, signals, siteSignals);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("error");
    expect(findings[0]?.id.endsWith("#disallowed")).toBe(true);
  });

  it("stays silent on allowed paths", () => {
    const page = makePage({ url: "https://example.com/public" });
    const siteSignals = makeSiteSignals({
      robots: makeRobots([{ userAgents: ["*"], disallow: ["/admin"] }]),
    });
    expect(siteRobotsDisallowRule.run(page, signals, siteSignals)).toHaveLength(
      0
    );
  });
});

// ─── siteNotInSitemapRule ──────────────────────────────────────────────

describe("siteNotInSitemapRule", () => {
  it("no-op when no sitemaps", () => {
    expect(
      siteNotInSitemapRule.run(makePage(), signals, makeSiteSignals())
    ).toHaveLength(0);
  });

  it("no-op when page is noindex", () => {
    const page = makePage({
      url: "https://example.com/draft",
      robotsMeta: "noindex",
    });
    const siteSignals = makeSiteSignals({
      sitemaps: [makeSitemap(["https://example.com/other"])],
    });
    expect(siteNotInSitemapRule.run(page, signals, siteSignals)).toHaveLength(
      0
    );
  });

  it("no-op when page is in sitemap (with trailing slash diff)", () => {
    const page = makePage({ url: "https://example.com/page" });
    const siteSignals = makeSiteSignals({
      sitemaps: [makeSitemap(["https://example.com/page/"])],
    });
    expect(siteNotInSitemapRule.run(page, signals, siteSignals)).toHaveLength(
      0
    );
  });

  it("warns when page missing from sitemap", () => {
    const page = makePage({ url: "https://example.com/orphan" });
    const siteSignals = makeSiteSignals({
      sitemaps: [makeSitemap(["https://example.com/other"])],
    });
    const findings = siteNotInSitemapRule.run(page, signals, siteSignals);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("warning");
  });

  it("no-op when robots.txt disallows the page", () => {
    const page = makePage({ url: "https://example.com/private" });
    const siteSignals = makeSiteSignals({
      robots: makeRobots([{ userAgents: ["*"], disallow: ["/private"] }]),
      sitemaps: [makeSitemap(["https://example.com/other"])],
    });
    expect(siteNotInSitemapRule.run(page, signals, siteSignals)).toHaveLength(
      0
    );
  });
});

// ─── siteSitemapMissingRule ────────────────────────────────────────────

describe("siteSitemapMissingRule", () => {
  it("info when nothing found and robots declares none", () => {
    const findings = siteSitemapMissingRule.run(
      makePage(),
      signals,
      makeSiteSignals()
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("info");
  });

  it("silent when sitemaps array non-empty", () => {
    const siteSignals = makeSiteSignals({
      sitemaps: [makeSitemap([])],
    });
    expect(
      siteSitemapMissingRule.run(makePage(), signals, siteSignals)
    ).toHaveLength(0);
  });

  it("silent when robots declares sitemap urls", () => {
    const siteSignals = makeSiteSignals({
      robots: makeRobots([], ["https://example.com/sitemap.xml"]),
    });
    expect(
      siteSitemapMissingRule.run(makePage(), signals, siteSignals)
    ).toHaveLength(0);
  });
});

// ─── siteRobotsSitemapDriftRule ────────────────────────────────────────

describe("siteRobotsSitemapDriftRule", () => {
  it("info when declared sitemap url was not resolved", () => {
    const siteSignals = makeSiteSignals({
      robots: makeRobots([], ["https://example.com/sitemap.xml"]),
      sitemaps: [],
    });
    const findings = siteRobotsSitemapDriftRule.run(
      makePage(),
      signals,
      siteSignals
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("info");
  });

  it("silent when all declared urls resolved", () => {
    const siteSignals = makeSiteSignals({
      robots: makeRobots([], ["https://example.com/sitemap.xml"]),
      sitemaps: [makeSitemap([])],
    });
    expect(
      siteRobotsSitemapDriftRule.run(makePage(), signals, siteSignals)
    ).toHaveLength(0);
  });

  it("silent when robots has no sitemap entries", () => {
    expect(
      siteRobotsSitemapDriftRule.run(makePage(), signals, makeSiteSignals())
    ).toHaveLength(0);
  });
});

// ─── siteSoft404Rule ───────────────────────────────────────────────────

describe("siteSoft404Rule", () => {
  it("error when probe flagged soft 404", () => {
    const siteSignals = makeSiteSignals({
      softFourOhFour: SoftFourOhFourProbe.make({
        probeUrl: PageUrl.make("https://example.com/__probe"),
        status: 200,
        isSoftFourOhFour: true,
      }),
    });
    const findings = siteSoft404Rule.run(makePage(), signals, siteSignals);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("error");
  });

  it("silent when probe is healthy", () => {
    const siteSignals = makeSiteSignals({
      softFourOhFour: SoftFourOhFourProbe.make({
        probeUrl: PageUrl.make("https://example.com/__probe"),
        status: 404,
        isSoftFourOhFour: false,
      }),
    });
    expect(siteSoft404Rule.run(makePage(), signals, siteSignals)).toHaveLength(
      0
    );
  });
});

// ─── siteCanonicalHostDriftRule ────────────────────────────────────────

describe("siteCanonicalHostDriftRule", () => {
  const variant = (
    scheme: "http" | "https",
    host: string,
    status: number | null,
    redirected: boolean
  ) =>
    HostProbeVariant.make({
      scheme,
      host,
      url: PageUrl.make(`${scheme}://${host}/`),
      status,
      finalUrl: null,
      redirected,
    });

  it("warns when multiple variants serve 2xx without redirecting", () => {
    const siteSignals = makeSiteSignals({
      hostProbe: HostProbeResult.make({
        origin: PageUrl.make("https://example.com"),
        canonicalHost: null,
        variants: [
          variant("https", "example.com", 200, false),
          variant("https", "www.example.com", 200, false),
        ],
      }),
    });
    const findings = siteCanonicalHostDriftRule.run(
      makePage(),
      signals,
      siteSignals
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("warning");
  });

  it("silent when canonicalHost is set", () => {
    const siteSignals = makeSiteSignals({
      hostProbe: HostProbeResult.make({
        origin: PageUrl.make("https://example.com"),
        canonicalHost: "example.com",
        variants: [
          variant("https", "example.com", 200, false),
          variant("https", "www.example.com", 301, true),
        ],
      }),
    });
    expect(
      siteCanonicalHostDriftRule.run(makePage(), signals, siteSignals)
    ).toHaveLength(0);
  });

  it("silent when only one variant serves 2xx", () => {
    const siteSignals = makeSiteSignals({
      hostProbe: HostProbeResult.make({
        origin: PageUrl.make("https://example.com"),
        canonicalHost: null,
        variants: [
          variant("https", "example.com", 200, false),
          variant("https", "www.example.com", 404, false),
        ],
      }),
    });
    expect(
      siteCanonicalHostDriftRule.run(makePage(), signals, siteSignals)
    ).toHaveLength(0);
  });
});

// ─── security-txt / favicon / manifest missing ─────────────────────────

describe("siteSecurityTxtMissingRule", () => {
  it("info when null", () => {
    const findings = siteSecurityTxtMissingRule.run(
      makePage(),
      signals,
      makeSiteSignals()
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("info");
  });
});

describe("siteFaviconMissingRule", () => {
  it("info when favicon null", () => {
    const findings = siteFaviconMissingRule.run(
      makePage(),
      signals,
      makeSiteSignals()
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("info");
  });

  it("silent when favicon resolvable", () => {
    const siteSignals = makeSiteSignals({
      favicon: Favicon.make({
        url: PageUrl.make("https://example.com/favicon.ico"),
        contentType: "image/x-icon",
        resolvable: true,
      }),
    });
    expect(
      siteFaviconMissingRule.run(makePage(), signals, siteSignals)
    ).toHaveLength(0);
  });

  it("info when favicon present but not resolvable", () => {
    const siteSignals = makeSiteSignals({
      favicon: Favicon.make({
        url: PageUrl.make("https://example.com/favicon.ico"),
        contentType: null,
        resolvable: false,
      }),
    });
    expect(
      siteFaviconMissingRule.run(makePage(), signals, siteSignals)
    ).toHaveLength(1);
  });
});

describe("siteManifestMissingRule", () => {
  it("info when null", () => {
    const findings = siteManifestMissingRule.run(
      makePage(),
      signals,
      makeSiteSignals()
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("info");
  });

  it("silent when present", () => {
    const siteSignals = makeSiteSignals({
      manifest: WebManifest.make({
        url: PageUrl.make("https://example.com/site.webmanifest"),
        name: "Example",
        shortName: null,
        icons: [],
      }),
    });
    expect(
      siteManifestMissingRule.run(makePage(), signals, siteSignals)
    ).toHaveLength(0);
  });
});

// ─── siteFeedBrokenRule ────────────────────────────────────────────────

describe("siteFeedBrokenRule", () => {
  const feedLink = (href: string, type = "application/rss+xml"): HeadLink =>
    HeadLink.make({
      rel: "alternate",
      href,
      type,
      title: null,
      hreflang: null,
    });

  it("silent when no alternate feed declared", () => {
    expect(
      siteFeedBrokenRule.run(makePage(), signals, makeSiteSignals())
    ).toHaveLength(0);
  });

  it("warns when declared feed not in resolved feeds", () => {
    const page = makePage({
      headLinks: [feedLink("/feed.xml")],
    });
    const siteSignals = makeSiteSignals({ feeds: [] });
    const findings = siteFeedBrokenRule.run(page, signals, siteSignals);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("warning");
  });

  it("silent when declared feed resolved", () => {
    const page = makePage({
      headLinks: [feedLink("https://example.com/feed.xml")],
    });
    const siteSignals = makeSiteSignals({
      feeds: [
        Feed.make({
          url: PageUrl.make("https://example.com/feed.xml"),
          kind: "rss",
          contentType: "application/rss+xml",
          resolvable: true,
        }),
      ],
    });
    expect(siteFeedBrokenRule.run(page, signals, siteSignals)).toHaveLength(0);
  });

  it("ignores alternate links with non-feed MIME", () => {
    const page = makePage({
      headLinks: [feedLink("https://example.com/other", "text/html")],
    });
    expect(
      siteFeedBrokenRule.run(page, signals, makeSiteSignals())
    ).toHaveLength(0);
  });
});
