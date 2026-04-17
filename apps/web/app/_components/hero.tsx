import { ArrowUpRight, Github } from "lucide-react";
import { PanelPreview } from "./panel-preview/panel-preview";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-36 pb-20 md:pt-44 md:pb-28">
      {/* atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(71,209,205,0.12),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:96px_100%]"
      />

      <div className="relative mx-auto max-w-[1280px] px-6">
        {/* top ribbon */}
        <div className="flex items-center gap-3 font-mono text-[11px] text-neutral-500 uppercase tracking-[0.2em]">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#47d1cd]/20 bg-[#47d1cd]/5 px-3 py-1 text-[#47d1cd]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#47d1cd]" />
            v0.1.0 — live
          </span>
          <span className="hidden md:inline">Chrome</span>
          <span className="hidden text-neutral-700 md:inline">/</span>
          <span className="hidden md:inline">Firefox soon</span>
          <span className="hidden text-neutral-700 md:inline">/</span>
          <span className="hidden md:inline">MCP &amp; CLI planned</span>
        </div>

        {/* split: text/ctas on left, side panel on right */}
        <div className="mt-12 grid grid-cols-1 gap-14 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
          <div className="flex flex-col">
            <h1 className="max-w-[14ch] font-medium text-[clamp(2.75rem,7vw,6rem)] text-neutral-50 leading-[0.95] tracking-[-0.04em]">
              <span className="block">SEO audit</span>
              <span className="block">for the age of</span>
              <span
                className="block text-[#47d1cd]"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                AI coding.
              </span>
            </h1>

            <p className="mt-8 max-w-[52ch] text-[16px] text-neutral-400 leading-[1.6] md:text-[17px]">
              A Chrome side panel that audits every page the way a crawler sees
              it. Scores, findings, proactive JSON-LD suggestions — all
              copy-ready for Claude Code, Cursor, Copilot, and anything else on
              the other end of your keyboard.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                className="group inline-flex items-center justify-center gap-3 rounded-full bg-[#47d1cd] px-6 py-3.5 font-medium text-[#0a0a0a] text-[15px] transition hover:bg-[#6ee7e3]"
                href="#install"
              >
                Add to Chrome — Free
                <ArrowUpRight className="size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
              <a
                className="inline-flex items-center justify-center gap-2 rounded-full border border-neutral-800 px-5 py-3 text-[13px] text-neutral-300 transition hover:border-neutral-700 hover:text-neutral-100"
                href="https://github.com/Mark-Life/seo-lens"
              >
                <Github className="size-4" />
                <span className="font-mono tracking-wider">
                  Source on GitHub
                </span>
              </a>
            </div>

            {/* footnotes */}
            <div className="mt-12 grid grid-cols-2 gap-6 border-neutral-900 border-t pt-8 font-mono text-[11px] text-neutral-500 uppercase tracking-[0.16em] sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              {[
                ["30+", "audit rules"],
                ["7", "categories"],
                ["<150ms", "per-page audit"],
                ["100%", "fetched HTML"],
              ].map(([v, l]) => (
                <div key={l}>
                  <div
                    className="text-[28px] text-neutral-100 tracking-[-0.02em]"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {v}
                  </div>
                  <div className="mt-1">{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* side panel mount */}
          <div className="relative lg:-mt-30">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-10 -right-10 h-48 w-48 rounded-full bg-[#47d1cd]/10 blur-3xl"
            />
            <div className="lg:sticky lg:top-12">
              <SidePanelMount />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SidePanelMount() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 shadow-2xl shadow-black/40">
      {/* faint chrome rail to suggest a docked side panel */}
      <div className="flex items-center justify-between gap-2 border-neutral-900 border-b bg-neutral-950 px-3 py-1.5">
        <span className="font-mono text-[9px] text-neutral-600 uppercase tracking-[0.2em]">
          chrome · side panel
        </span>
        <div className="flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-neutral-800" />
          <span className="size-1.5 rounded-full bg-neutral-800" />
          <span className="size-1.5 rounded-full bg-neutral-800" />
        </div>
      </div>
      <div className="panel-scroll dark h-[min(80vh,920px)] overflow-y-auto">
        <PanelPreview />
      </div>
    </div>
  );
}
