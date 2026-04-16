import { SectionTitle } from "./features";

const STEPS = [
  {
    n: "01",
    title: "Open the side panel",
    body: "Pin SEO Lens, click the icon. The audit runs against the active tab the moment the panel opens.",
  },
  {
    n: "02",
    title: "Watch the page get x-rayed",
    body: "Fetched HTML is parsed. 30+ rules run. Score, categories, and findings appear in under 150ms.",
  },
  {
    n: "03",
    title: "Copy any finding",
    body: "Every finding has its own copy button — structured as plain text with rule, severity, and snippet.",
  },
  {
    n: "04",
    title: "Paste into your agent",
    body: "Hand it to Claude Code, Cursor, or Copilot. The model has everything it needs to ship the fix.",
  },
];

export function HowItWorks() {
  return (
    <section
      className="relative border-neutral-900 border-t bg-[#070707] py-24 md:py-32"
      id="how"
    >
      <div className="mx-auto max-w-[1280px] px-6">
        <SectionTitle kicker="Workflow" title="Four steps. One round-trip." />

        <div className="mt-20 grid gap-6 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <div
              className="group relative flex flex-col rounded-xl border border-neutral-900 bg-[#0c0c0c] p-6 transition hover:border-[#47d1cd]/30"
              key={s.n}
            >
              <div className="flex items-baseline justify-between">
                <div
                  className="text-[#47d1cd] text-[44px] leading-none tracking-[-0.04em]"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {s.n}
                </div>
                {i < STEPS.length - 1 ? (
                  <span className="font-mono text-[10px] text-neutral-600 tracking-widest">
                    →
                  </span>
                ) : null}
              </div>
              <h3 className="mt-6 font-medium text-[17px] text-neutral-100 leading-tight tracking-[-0.01em]">
                {s.title}
              </h3>
              <p className="mt-3 text-[13px] text-neutral-400 leading-[1.55]">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
