import { Wordmark } from "./logo";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Coverage", href: "#coverage" },
      { label: "How it works", href: "#how" },
      { label: "Install", href: "#install" },
    ],
  },
  {
    title: "Engine",
    links: [
      {
        label: "seo-rules",
        href: "https://github.com/Mark-Life/seo-lens/tree/main/packages/seo-rules",
      },
      {
        label: "Roadmap",
        href: "https://github.com/Mark-Life/seo-lens/blob/main/docs/plan/plan.md",
      },
      {
        label: "JSON-LD spec",
        href: "https://github.com/Mark-Life/seo-lens/blob/main/docs/plan/json-ld-improvements.md",
      },
    ],
  },
  {
    title: "Build",
    links: [
      { label: "GitHub", href: "https://github.com/Mark-Life/seo-lens" },
      { label: "Issues", href: "https://github.com/Mark-Life/seo-lens/issues" },
      { label: "Contributing", href: "https://github.com/Mark-Life/seo-lens" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative border-neutral-900 border-t bg-[#070707] pt-20 pb-10">
      <div className="mx-auto max-w-[1280px] px-6">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <Wordmark />
            <p
              className="mt-5 max-w-[38ch] text-[15px] text-neutral-400 leading-[1.6]"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              An SEO audit built for developers who ship with their agent
              sitting next to them.
            </p>
            <div className="mt-8 font-mono text-[10px] text-neutral-600 uppercase tracking-[0.3em]">
              seo-lens.dev · MIT · v0.1.0
            </div>
            <div className="mt-3 font-mono text-[10px] text-neutral-600 tracking-[0.2em]">
              <a
                className="text-primary/80 transition hover:text-neutral-300"
                href="https://andrey-markin.com/"
              >
                Mark Life Ltd
              </a>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 md:col-span-7 md:gap-10">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <div className="font-mono text-[#47d1cd]/80 text-[10px] uppercase tracking-[0.3em]">
                  {col.title}
                </div>
                <ul className="mt-5 space-y-3">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <a
                        className="text-[13px] text-neutral-400 transition hover:text-neutral-100"
                        href={l.href}
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-3 border-neutral-900 border-t pt-6 md:flex-row md:items-center">
          <div className="font-mono text-[10px] text-neutral-600 uppercase tracking-[0.3em]">
            © {new Date().getFullYear()} Mark Life Ltd
          </div>
          <nav className="flex items-center gap-6">
            <a
              className="font-mono text-[10px] text-neutral-500 uppercase tracking-[0.3em] transition hover:text-neutral-200"
              href="/privacy"
            >
              Privacy
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
