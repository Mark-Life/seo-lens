import { describe, expect, it } from "@effect/vitest";
import { Schema } from "effect";
import { parseHTML } from "linkedom";
import {
  extractFromDocument,
  extractPageSignals,
  findAuditRoot,
} from "../src/extract.js";
import { PageSignals, PageUrl } from "../src/schema.js";

const decodeSignals = Schema.decodeUnknownSync(PageSignals);

const parse = (html: string): Document =>
  parseHTML(html).document as unknown as Document;

const url = PageUrl.make("https://example.com/");

interface RootCase {
  readonly expectedSource: "main" | "role-main" | "largest-subtree" | "body";
  readonly html: string;
  readonly mustContain?: readonly string[];
  readonly mustNotContain?: readonly string[];
  readonly name: string;
}

const cases: readonly RootCase[] = [
  {
    name: "(a) clean <main> → source=main",
    html: `<!doctype html><html><body>
      <header><h1>Site</h1></header>
      <main><h1>Article</h1><p>Body copy here.</p></main>
      <footer><p>Footer</p></footer>
    </body></html>`,
    expectedSource: "main",
    mustContain: ["Article"],
    mustNotContain: ["Site"],
  },
  {
    name: "(b) no <main>, single [role=main] → source=role-main",
    html: `<!doctype html><html><body>
      <header><h1>Site</h1></header>
      <div role="main"><h1>Role Main Article</h1></div>
    </body></html>`,
    expectedSource: "role-main",
    mustContain: ["Role Main Article"],
    mustNotContain: ["Site"],
  },
  {
    name: "(c) mount-merged SPA, prior routes display:none → skipped",
    html: `<!doctype html><html><body>
      <main style="display:none"><h1>Stale Route</h1></main>
      <main><h1>Active Route</h1></main>
    </body></html>`,
    expectedSource: "main",
    mustContain: ["Active Route"],
    mustNotContain: ["Stale Route"],
  },
  {
    name: "(c2) nested <main> tags → outermost main wins",
    html: `<!doctype html><html><body>
      <header><h1>Site</h1></header>
      <main class="flex-1"><main class="inner"><h1>Nested Article</h1></main></main>
    </body></html>`,
    expectedSource: "main",
    mustContain: ["Nested Article"],
    mustNotContain: ["Site"],
  },
  {
    name: "(c3) no <main>, body has huge inline <script> + content div → script ignored",
    html: `<!doctype html><html><body>
      <div><h1>Real Heading</h1><p>${"x".repeat(200)}</p></div>
      <script>${"a".repeat(5000)}</script>
    </body></html>`,
    expectedSource: "largest-subtree",
    mustContain: ["Real Heading"],
  },
  {
    name: "(d) mount-merged SPA, prior routes NOT hidden → largest-subtree (limitation: stale content may bleed in)",
    html: `<!doctype html><html><body>
      <div><h2>Tiny stale</h2></div>
      <div>
        <h1>Active Route Heading</h1>
        <p>${"x".repeat(500)}</p>
      </div>
    </body></html>`,
    expectedSource: "largest-subtree",
    mustContain: ["Active Route Heading"],
    mustNotContain: ["Tiny stale"],
  },
];

describe("findAuditRoot", () => {
  it.each(cases)("$name", ({ html, expectedSource }) => {
    const doc = parse(html);
    const root = findAuditRoot(doc);
    expect(root.source).toBe(expectedSource);
  });

  it("falls back to body when no children", () => {
    const doc = parse("<!doctype html><html><body></body></html>");
    const root = findAuditRoot(doc);
    expect(root.source).toBe("body");
  });

  it("ignores empty <main> and falls through", () => {
    const doc = parse(
      `<!doctype html><html><body><main></main><div><h1>Real</h1>${"x".repeat(200)}</div></body></html>`
    );
    const root = findAuditRoot(doc);
    expect(root.source).toBe("largest-subtree");
  });
});

describe("extractFromDocument scopes body data to audit root", () => {
  it.each(cases)("$name", ({ html, mustContain = [], mustNotContain = [] }) => {
    const doc = parse(html);
    const data = extractFromDocument(doc, url) as {
      headings: { text: string }[];
    };
    const texts = data.headings.map((h) => h.text);
    for (const t of mustContain) {
      expect(texts).toContain(t);
    }
    for (const t of mustNotContain) {
      expect(texts).not.toContain(t);
    }
  });

  it("extractPageSignals populates raw DOM signals and decodes into PageSignals", () => {
    const doc = parse(
      `<!doctype html><html><head>
        <meta property="og:type" content="article">
      </head><body>
        <nav aria-label="Breadcrumb"><ol>
          <li><a href="/">Home</a></li>
          <li><a href="/blog">Blog</a></li>
        </ol></nav>
        <article>
          <h1>Post Title</h1>
          <time datetime="2026-01-01">Jan 1, 2026</time>
          <p>${"x".repeat(200)}</p>
        </article>
      </body></html>`
    );
    const raw = extractPageSignals(
      doc,
      PageUrl.make("https://example.com/blog/post-1")
    );
    const signals = decodeSignals(raw);
    expect(signals.hasArticleElement).toBe(true);
    expect(signals.hasNavElement).toBe(true);
    expect(signals.ogType).toBe("article");
    expect(signals.timeElements).toHaveLength(1);
    expect(signals.timeElements[0]?.datetime).toBe("2026-01-01");
    expect(signals.urlPathSegments).toEqual(["blog", "post-1"]);
    expect(signals.isRootPath).toBe(false);
    expect(signals.breadcrumbDom).not.toBeNull();
    expect(signals.breadcrumbDom?.items).toHaveLength(2);
    expect(signals.articleTextLength).toBeGreaterThan(0);
  });

  it("extractPageSignals detects product affordances and microdata", () => {
    const doc = parse(
      `<!doctype html><html><body>
        <main itemtype="https://schema.org/Product">
          <h1>Widget</h1>
          <p>Price: $29.99</p>
          <button>Add to Cart</button>
        </main>
      </body></html>`
    );
    const raw = extractPageSignals(
      doc,
      PageUrl.make("https://shop.example.com/p/widget")
    );
    const signals = decodeSignals(raw);
    expect(signals.microdataTypes).toContain("https://schema.org/Product");
    expect(signals.pricePatterns).toHaveLength(1);
    expect(signals.pricePatterns[0]?.nearH1).toBe(true);
    expect(signals.cartAffordances).toContain("Add to Cart");
  });

  it("extractPageSignals flags root path for homepage", () => {
    const doc = parse(
      "<!doctype html><html><body><main><h1>Home</h1></main></body></html>"
    );
    const raw = extractPageSignals(doc, PageUrl.make("https://example.com/"));
    const signals = decodeSignals(raw);
    expect(signals.isRootPath).toBe(true);
    expect(signals.urlPathSegments).toEqual([]);
  });

  it("still extracts head-level data (title, meta) regardless of root", () => {
    const doc = parse(
      `<!doctype html><html><head>
        <title>Head Title</title>
        <meta name="description" content="A desc">
        <link rel="canonical" href="https://example.com/x">
      </head><body><main><h1>Body</h1></main></body></html>`
    );
    const data = extractFromDocument(doc, url) as {
      title: string;
      metaDescription: string;
      canonical: string | null;
      auditRoot: { source: string };
    };
    expect(data.title).toBe("Head Title");
    expect(data.metaDescription).toBe("A desc");
    expect(data.canonical).toBe("https://example.com/x");
    expect(data.auditRoot.source).toBe("main");
  });
});
