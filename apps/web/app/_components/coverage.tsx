import { SectionTitle } from "./features";

const CATEGORIES = [
  {
    label: "META",
    title: "Title & description",
    rules: ["Title length", "Meta description length", "Title present"],
  },
  {
    label: "HEADINGS",
    title: "Structure & hierarchy",
    rules: ["Single H1 enforcement", "Skip-level detection", "Heading tree"],
  },
  {
    label: "SOCIAL",
    title: "OG & Twitter cards",
    rules: ["og:title / og:image", "Twitter card type", "Image URL validity"],
  },
  {
    label: "STRUCTURED",
    title: "JSON-LD & Rich Results",
    rules: [
      "schema.org type recognition",
      "Google Rich Results fields",
      "Proactive type recommendations",
    ],
  },
  {
    label: "IMAGES",
    title: "Alt text & accessibility",
    rules: ["Missing alt detection", "Empty alt warnings", "Image inventory"],
  },
  {
    label: "INDEXING",
    title: "Canonical & robots",
    rules: ["Canonical URL", "robots meta directives", "noindex / nofollow"],
  },
  {
    label: "SITE",
    title: "Cross-page signals",
    rules: [
      "robots.txt disallow",
      "Sitemap inclusion",
      "Soft-404, canonical host drift",
      "security.txt, manifest, feeds",
    ],
  },
];

export function Coverage() {
  return (
    <section
      className="relative border-neutral-900 border-t bg-[#0a0a0a] py-24 md:py-32"
      id="coverage"
    >
      <div className="mx-auto max-w-[1280px] px-6">
        <SectionTitle
          kicker="Audit coverage"
          title="Seven categories. Thirty rules."
        />

        <p className="mt-8 max-w-[56ch] text-[15px] text-neutral-400 leading-[1.65]">
          The audit engine lives in an Effect-TS package, pure and runtime-
          agnostic. Today it powers the extension. Tomorrow it powers the CLI,
          the MCP server, and anything else we (or you) plug it into.
        </p>

        <div className="mt-16 grid gap-px overflow-hidden rounded-xl border border-neutral-900 bg-neutral-900 md:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c) => (
            <div
              className="flex flex-col bg-[#0c0c0c] p-7 transition hover:bg-[#0f0f0f]"
              key={c.label}
            >
              <div className="font-mono text-[#47d1cd] text-[10px] uppercase tracking-[0.3em]">
                {c.label}
              </div>
              <h3
                className="mt-4 text-[22px] text-neutral-100 leading-tight tracking-[-0.02em]"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {c.title}
              </h3>
              <ul className="mt-5 space-y-1.5">
                {c.rules.map((r) => (
                  <li
                    className="flex items-start gap-2 font-mono text-[11.5px] text-neutral-400 tracking-[0.02em]"
                    key={r}
                  >
                    <span className="mt-[7px] h-px w-3 bg-neutral-700" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="flex flex-col justify-between bg-[#0c0c0c] p-7">
            <div>
              <div className="font-mono text-[10px] text-neutral-500 uppercase tracking-[0.3em]">
                ROADMAP
              </div>
              <h3 className="mt-4 text-[18px] text-neutral-300 leading-tight tracking-[-0.01em]">
                Site-wide audit — crawl the full sitemap, score every page.
              </h3>
            </div>
            <div className="mt-6 font-mono text-[10px] text-neutral-600 uppercase tracking-widest">
              → planned
            </div>
          </div>

          <div className="flex flex-col justify-between bg-[#0c0c0c] p-7">
            <div>
              <div className="font-mono text-[10px] text-neutral-500 uppercase tracking-[0.3em]">
                ROADMAP
              </div>
              <h3 className="mt-4 text-[18px] text-neutral-300 leading-tight tracking-[-0.01em]">
                More surfaces — CLI, MCP server, and beyond.
              </h3>
            </div>
            <div className="mt-6 font-mono text-[10px] text-neutral-600 uppercase tracking-widest">
              → planned
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
