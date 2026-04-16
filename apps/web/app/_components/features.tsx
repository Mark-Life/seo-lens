import type { ReactNode } from "react";
import { FetchedHtmlDemo } from "./features/fetched-html";
import { InspectDemo } from "./features/inspect";
import { JsonLdRecsDemo } from "./features/jsonld-recs";
import { JsonLdViewerDemo } from "./features/jsonld-viewer";
import { SiteLevelDemo } from "./features/site-level";
import { Placeholder } from "./placeholder";

interface Feature {
  body: string;
  bullets?: string[];
  demo?: ReactNode;
  index: string;
  ph: {
    label: string;
    description: string;
    aspect?: string;
    dimensions?: string;
  };
  tag: string;
  title: ReactNode;
}

const FEATURES: Feature[] = [
  {
    index: "01",
    tag: "FETCHED-HTML AUDIT",
    title: (
      <>
        What the crawler sees,
        <br />
        <span
          className="text-[#47d1cd]"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          not what your DOM pretends.
        </span>
      </>
    ),
    body: "The extension fetches the page's actual HTTP response and parses it with DOMParser — the same signal Google starts from. No mount-merging. No stale client routes. No false positives from SPA hydration.",
    bullets: [
      "Real network response, not in-memory DOM",
      "Avoids CSR/SPA bleed between soft-nav routes",
      "Matches what a basic crawler ingests",
    ],
    demo: <FetchedHtmlDemo />,
    ph: {
      label: "01 · FETCH",
      description:
        "Side-by-side comparison: left shows raw fetched HTML (source view, highlighted <title>, <meta>, <h1>, <script type=\"application/ld+json\">). Right shows the rendered page. Caption implies 'this is what Google actually reads'.",
      aspect: "16/10",
    },
  },
  {
    index: "02",
    tag: "JSON-LD VIEWER",
    title: (
      <>
        Every JSON-LD block,
        <br />
        <span style={{ fontFamily: "var(--font-serif)" }}>
          node by validated node.
        </span>
      </>
    ),
    body: "Expandable tree of every structured-data block on the page. Schema.org types resolved, Google Rich Results specs checked field by field, unknown properties flagged inline. Copy a single value, a subtree, or the whole block.",
    bullets: [
      "Per-node schema.org + rich-results validity",
      "Required vs. recommended field deltas",
      "Copy value · subtree · block",
    ],
    demo: <JsonLdViewerDemo />,
    ph: {
      label: "02 · JSON-LD",
      description:
        "Expandable JSON-LD tree: Article block with schema.org ✓ badge, rich-results bar ('all required fields present'), nested author → Person with @type pill. BreadcrumbList block below with itemListElement array expanded. Copy button per block.",
      aspect: "16/10",
    },
  },
  {
    index: "03",
    tag: "JSON-LD RECS",
    title: (
      <>
        Not just validation.
        <br />
        <span
          className="text-[#47d1cd]"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          What you&apos;re missing.
        </span>
      </>
    ),
    body: "SEO Lens detects the kind of page it's looking at — article, product, homepage, category — and tells you which schema.org types you should add, with Google Rich Results specs and a minimal template to paste in.",
    bullets: [
      "Page-kind detector (Article / Product / Home / …)",
      "Google Rich Results field validation",
      "Minimal JSON-LD templates, copy-ready",
    ],
    demo: <JsonLdRecsDemo />,
    ph: {
      label: "03 · RECOMMEND",
      description:
        "Recommendations panel: 'This looks like an Article page. Consider adding: Article, BreadcrumbList.' With expandable cards — one shows a copy-ready JSON-LD template with required + recommended fields. Another shows a conflict warning.",
      aspect: "16/10",
    },
  },
  {
    index: "04",
    tag: "SITE-LEVEL",
    title: (
      <>
        One page report.
        <br />
        <span style={{ fontFamily: "var(--font-serif)" }}>
          Whole-site awareness.
        </span>
      </>
    ),
    body: "robots.txt, sitemap.xml, security.txt, manifest, feeds, soft-404 probes, canonical host drift — folded into the current page's report so you catch the blocker that's hiding above the page level.",
    bullets: [
      "robots.txt disallow detection",
      "Sitemap inclusion check",
      "Soft-404, canonical host drift, security.txt",
    ],
    demo: <SiteLevelDemo />,
    ph: {
      label: "04 · SITE",
      description:
        "Site-level signals card: robots.txt rules parsed, sitemap status (found / page included), security.txt, manifest, RSS feeds. Include one error state showing 'this page is disallowed in robots.txt' as a prominent finding.",
      aspect: "16/10",
    },
  },
  {
    index: "05",
    tag: "INSPECT",
    title: (
      <>
        The outline and the share card,
        <br />
        <span
          className="text-[#47d1cd]"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          seen the way they&apos;re read.
        </span>
      </>
    ),
    body: "Two views you actually use before shipping: the heading outline flattened into a tree so skip-levels jump out, and the Open Graph preview card rendered with your real hero image, title, and description.",
    bullets: [
      "H1→H2→H3 tree with level badges",
      "Live OG card at 1200×630",
      "Real hero image, not a mock",
    ],
    demo: <InspectDemo />,
    ph: {
      label: "05 · INSPECT",
      description:
        "Stacked view: heading hierarchy tree (indented H1/H2/H3 with level badges) on top, Open Graph preview card (1200×630 hero image + domain + title + description) below.",
      aspect: "16/10",
    },
  },
];

export function Features() {
  return (
    <section
      className="relative border-neutral-900 border-t bg-[#0a0a0a] py-24 md:py-32"
      id="features"
    >
      <div className="mx-auto max-w-[1280px] px-6">
        <SectionTitle kicker="What's inside" title="Six pillars." />

        <div className="mt-24 space-y-32 md:space-y-40">
          {FEATURES.map((f) => (
            <FeatureRow feature={f} key={f.index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureRow({ feature }: { feature: Feature }) {
  return (
    <div className="grid gap-10 md:grid-cols-12 md:gap-16">
      <div className="md:col-span-5">
        <div className="flex items-baseline gap-4 font-mono text-[11px] text-neutral-500 uppercase tracking-[0.2em]">
          <span
            className="text-[#47d1cd]/90 text-[56px] leading-none tracking-[-0.04em]"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {feature.index}
          </span>
          <span className="text-[#47d1cd]">{feature.tag}</span>
        </div>

        <h3 className="mt-6 font-medium text-[clamp(1.75rem,3vw,2.5rem)] text-neutral-50 leading-[1.05] tracking-[-0.025em]">
          {feature.title}
        </h3>

        <p className="mt-6 max-w-[44ch] text-[15px] text-neutral-400 leading-[1.65]">
          {feature.body}
        </p>

        {feature.bullets ? (
          <ul className="mt-8 space-y-2.5">
            {feature.bullets.map((b) => (
              <li
                className="flex items-start gap-3 font-mono text-[12px] text-neutral-400 uppercase tracking-[0.12em]"
                key={b}
              >
                <span className="mt-[7px] h-px w-4 bg-[#47d1cd]/50" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="md:col-span-7">
        {feature.demo ?? (
          <Placeholder
            aspect={feature.ph.aspect ?? "16/10"}
            description={feature.ph.description}
            dimensions={feature.ph.dimensions}
            label={feature.ph.label}
          />
        )}
      </div>
    </div>
  );
}

export function SectionTitle({
  kicker,
  title,
}: {
  kicker: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="font-mono text-[#47d1cd] text-[11px] uppercase tracking-[0.3em]">
          {`/// ${kicker}`}
        </div>
        <h2
          className="mt-5 max-w-[18ch] font-medium text-[clamp(2.25rem,5vw,4rem)] text-neutral-50 leading-[0.95] tracking-[-0.035em]"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {title}
        </h2>
      </div>
    </div>
  );
}
