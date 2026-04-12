import { describe, expect, it } from "@effect/vitest";
import { PageUrl, TabId } from "@workspace/seo-rules";
import { Effect } from "effect";
import { HtmlExtractor } from "../src/lib/services/html-extractor";

const tabId = TabId.make(1);

const cases = [
  {
    name: "SSR Next.js page with full metadata",
    url: PageUrl.make("https://example.com/blog/post"),
    html: `<!doctype html><html><head>
      <title>Post Title</title>
      <meta name="description" content="A great post">
      <link rel="canonical" href="https://example.com/blog/post">
      <meta property="og:title" content="OG Post">
      <meta name="twitter:card" content="summary">
      <script type="application/ld+json">{"@type":"Article","headline":"Hi"}</script>
    </head><body>
      <h1>Heading One</h1>
      <h2>Heading Two</h2>
      <img src="/cover.jpg" alt="cover">
      <a href="/about">About</a>
      <a href="https://other.com/x">External</a>
    </body></html>`,
    assert: (page: import("@workspace/seo-rules").PageData) => {
      expect(page.title).toBe("Post Title");
      expect(page.metaDescription).toBe("A great post");
      expect(page.canonical).toBe("https://example.com/blog/post");
      expect(page.headings).toHaveLength(2);
      expect(page.headings[0]).toEqual({ level: 1, text: "Heading One" });
      expect(page.images[0]).toEqual({ src: "/cover.jpg", alt: "cover" });
      expect(page.openGraph["og:title"]).toBe("OG Post");
      expect(page.twitterCard["twitter:card"]).toBe("summary");
      expect(page.jsonLd).toHaveLength(1);
      expect(
        page.links.find((l) => l.href === "https://other.com/x")?.isExternal
      ).toBe(true);
      expect(page.links.find((l) => l.href === "/about")?.isExternal).toBe(
        false
      );
    },
  },
  {
    name: "CSR shell with empty body",
    url: PageUrl.make("https://app.example.com/"),
    html: `<!doctype html><html><head><title>App</title></head><body><div id="root"></div></body></html>`,
    assert: (page: import("@workspace/seo-rules").PageData) => {
      expect(page.title).toBe("App");
      expect(page.headings).toHaveLength(0);
      expect(page.images).toHaveLength(0);
      expect(page.metaDescription).toBe("");
    },
  },
  {
    name: "page with inline JSON-LD (valid + invalid)",
    url: PageUrl.make("https://example.com/x"),
    html: `<!doctype html><html><head><title>X</title>
      <script type="application/ld+json">{"@type":"Organization","name":"Acme"}</script>
      <script type="application/ld+json">{not json</script>
    </head><body></body></html>`,
    assert: (page: import("@workspace/seo-rules").PageData) => {
      expect(page.jsonLd).toHaveLength(1);
      expect((page.jsonLd[0] as { name: string }).name).toBe("Acme");
    },
  },
  {
    name: "url uses request URL, not parsed <base>",
    url: PageUrl.make("https://real.example.com/page"),
    html: `<!doctype html><html><head><base href="https://fake.example.com/"><title>T</title></head><body></body></html>`,
    assert: (page: import("@workspace/seo-rules").PageData) => {
      expect(page.url).toBe("https://real.example.com/page");
    },
  },
];

describe("HtmlExtractor", () => {
  for (const c of cases) {
    it.effect(c.name, () =>
      Effect.gen(function* () {
        const svc = yield* HtmlExtractor;
        const page = yield* svc.extract(tabId, c.url, c.html);
        c.assert(page);
      }).pipe(Effect.provide(HtmlExtractor.layer))
    );
  }
});
