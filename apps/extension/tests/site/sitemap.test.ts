import { describe, expect, it } from "vitest";
import { parseSitemapXml } from "../../src/lib/services/site/sitemap";

describe("parseSitemapXml", () => {
  it("parses a urlset with multiple entries and lastmod", () => {
    const xml = `<?xml version="1.0"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2026-01-01</lastmod>
  </url>
  <url>
    <loc>https://example.com/about</loc>
  </url>
</urlset>`;
    const parsed = parseSitemapXml(xml);
    expect(parsed.kind).toBe("urlset");
    expect(parsed.childSitemapUrls).toEqual([]);
    expect(parsed.entries).toEqual([
      { loc: "https://example.com/", lastmod: "2026-01-01" },
      { loc: "https://example.com/about", lastmod: null },
    ]);
  });

  it("resolves a sitemap index to child sitemap URLs", () => {
    const xml = `<?xml version="1.0"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.com/sitemap-pages.xml</loc>
    <lastmod>2026-01-01</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-posts.xml</loc>
  </sitemap>
</sitemapindex>`;
    const parsed = parseSitemapXml(xml);
    expect(parsed.kind).toBe("index");
    expect(parsed.entries).toEqual([]);
    expect(parsed.childSitemapUrls).toEqual([
      "https://example.com/sitemap-pages.xml",
      "https://example.com/sitemap-posts.xml",
    ]);
  });

  it("skips entries that lack a <loc> tag", () => {
    const xml = `<urlset>
  <url><loc>https://example.com/a</loc></url>
  <url><lastmod>2026-01-01</lastmod></url>
  <url><loc>https://example.com/b</loc></url>
</urlset>`;
    const parsed = parseSitemapXml(xml);
    expect(parsed.entries.map((e) => e.loc)).toEqual([
      "https://example.com/a",
      "https://example.com/b",
    ]);
  });

  it("treats malformed/garbage input as an empty urlset without throwing", () => {
    expect(parseSitemapXml("")).toEqual({
      kind: "urlset",
      entries: [],
      childSitemapUrls: [],
    });
    expect(parseSitemapXml("<<<not xml>>>")).toEqual({
      kind: "urlset",
      entries: [],
      childSitemapUrls: [],
    });
    expect(parseSitemapXml("<urlset><url></url></urlset>")).toEqual({
      kind: "urlset",
      entries: [],
      childSitemapUrls: [],
    });
  });
});
