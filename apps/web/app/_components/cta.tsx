import { ArrowUpRight, Chrome, Github } from "lucide-react";

export function Cta() {
  return (
    <section
      className="relative overflow-hidden border-neutral-900 border-t bg-[#0a0a0a] py-28 md:py-40"
      id="install"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,rgba(71,209,205,0.18),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"
      />

      <div className="relative mx-auto max-w-[1280px] px-6 text-center">
        <div className="font-mono text-[#47d1cd] text-[11px] uppercase tracking-[0.3em]">
          {"/// GET THE EXTENSION"}
        </div>

        <h2 className="mx-auto mt-8 max-w-[16ch] font-medium text-[clamp(2.75rem,8vw,7rem)] text-neutral-50 leading-[0.92] tracking-[-0.04em]">
          <span>Install it. </span>
          <span
            className="text-[#47d1cd]"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Open the panel. Ship.
          </span>
        </h2>

        <p className="mx-auto mt-8 max-w-[52ch] text-[16px] text-neutral-400 leading-[1.6]">
          Free. Manifest V3. No account. Chrome now, Firefox shortly, Safari &
          Edge after.
        </p>

        <div className="mt-12 flex flex-col items-center justify-center gap-4 md:flex-row">
          <a
            className="group inline-flex items-center gap-3 rounded-full bg-[#47d1cd] px-8 py-4 font-medium text-[#0a0a0a] text-[15px] transition hover:bg-[#6ee7e3]"
            href="https://chromewebstore.google.com/"
          >
            <Chrome className="size-5" />
            Add to Chrome
            <ArrowUpRight className="size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>

          <a
            className="inline-flex items-center gap-2 rounded-full border border-neutral-800 px-6 py-3.5 font-mono text-[12px] text-neutral-300 uppercase tracking-[0.16em] transition hover:border-neutral-700 hover:text-neutral-100"
            href="https://github.com/Mark-Life/seo-lens"
          >
            <Github className="size-4" />
            Star on GitHub
          </a>
        </div>

        <div className="mt-16 font-mono text-[10px] text-neutral-600 uppercase tracking-[0.3em]">
          chrome web store · v0.1.0
        </div>
      </div>
    </section>
  );
}
