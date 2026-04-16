import { Wordmark } from "./logo";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#coverage", label: "Coverage" },
  { href: "#how", label: "How it works" },
  { href: "https://github.com/Mark-Life/seo-lens", label: "GitHub" },
];

export function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-[color:rgba(71,209,205,0.08)] border-b bg-[#0a0a0a]/70 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-6">
        <a className="flex items-center" href="/">
          <Wordmark />
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a
              className="font-mono text-[12px] text-neutral-400 uppercase tracking-[0.14em] transition-colors hover:text-[#47d1cd]"
              href={l.href}
              key={l.href}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <a
          className="group inline-flex items-center gap-2 rounded-full border border-[#47d1cd]/40 bg-[#47d1cd]/10 px-4 py-1.5 font-mono text-[#47d1cd] text-[11px] uppercase tracking-[0.16em] transition hover:bg-[#47d1cd]/20"
          href="#install"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#47d1cd]" />
          Install
        </a>
      </div>
    </header>
  );
}
