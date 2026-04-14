import { HeadLink } from "@workspace/seo-rules/schema";
import { describe, expect, it } from "vitest";
import {
  hintsFromHeadLinks,
  mergeCandidates,
} from "../../src/lib/services/site/feed";

const link = (overrides: Partial<HeadLink> = {}): HeadLink =>
  HeadLink.make({
    rel: "alternate",
    href: "https://example.com/blog/feed.xml",
    type: "application/rss+xml",
    title: null,
    hreflang: null,
    ...overrides,
  });

describe("hintsFromHeadLinks", () => {
  it("picks rss+xml alternate links with their absolute href", () => {
    const hints = hintsFromHeadLinks([link()]);
    expect(hints).toHaveLength(1);
    expect(hints[0]?.url).toBe("https://example.com/blog/feed.xml");
    expect(hints[0]?.kind).toBe("rss");
  });

  it("picks atom+xml alternate links and classifies kind", () => {
    const hints = hintsFromHeadLinks([
      link({
        href: "https://example.com/posts/atom.xml",
        type: "application/atom+xml",
      }),
    ]);
    expect(hints[0]?.kind).toBe("atom");
  });

  it("picks bare application/rss without +xml suffix", () => {
    const hints = hintsFromHeadLinks([link({ type: "application/rss" })]);
    expect(hints).toHaveLength(1);
    expect(hints[0]?.kind).toBe("rss");
  });

  it("ignores non-alternate rels (stylesheet, icon, manifest)", () => {
    const hints = hintsFromHeadLinks([
      link({ rel: "stylesheet", type: "text/css" }),
      link({ rel: "icon", type: "image/x-icon" }),
      link({ rel: "manifest", type: "application/manifest+json" }),
    ]);
    expect(hints).toEqual([]);
  });

  it("ignores hreflang alternates (no feed type)", () => {
    const hints = hintsFromHeadLinks([
      link({ type: null, hreflang: "en" }),
      link({ type: "text/html", hreflang: "fr" }),
    ]);
    expect(hints).toEqual([]);
  });

  it("handles multi-rel attributes containing 'alternate'", () => {
    const hints = hintsFromHeadLinks([link({ rel: "home alternate" })]);
    expect(hints).toHaveLength(1);
  });
});

describe("mergeCandidates", () => {
  it("prepends hints before hardcoded fallbacks", () => {
    const hints = hintsFromHeadLinks([link()]);
    const merged = mergeCandidates("https://example.com", hints);
    expect(merged[0]?.url).toBe("https://example.com/blog/feed.xml");
    expect(merged.map((c) => c.url)).toContain("https://example.com/feed.xml");
    expect(merged.map((c) => c.url)).toContain("https://example.com/atom.xml");
  });

  it("dedupes when a hint matches a fallback exactly", () => {
    const hints = hintsFromHeadLinks([
      link({ href: "https://example.com/feed.xml" }),
    ]);
    const merged = mergeCandidates("https://example.com", hints);
    const urls = merged.map((c) => c.url);
    const count = urls.filter(
      (u) => u === "https://example.com/feed.xml"
    ).length;
    expect(count).toBe(1);
  });

  it("falls back to hardcoded list when hints are empty", () => {
    const merged = mergeCandidates("https://example.com", []);
    expect(merged.map((c) => c.url)).toEqual([
      "https://example.com/feed.xml",
      "https://example.com/rss.xml",
      "https://example.com/atom.xml",
      "https://example.com/feed",
      "https://example.com/rss",
    ]);
  });
});
