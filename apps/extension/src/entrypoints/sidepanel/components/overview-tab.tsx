import { Download } from "lucide-react";
import { audit, categoryLabels } from "../data/placeholder";
import { CopyButton } from "./copy-button";
import { ScoreGauge } from "./score-gauge";
import { SectionLabel } from "./section-label";

const SEVERITY_ITEMS = [
  {
    key: "error",
    label: "Errors",
    swatch: "bg-destructive",
    glyph: "✕",
    meaning: "Blocks indexing or ranking",
  },
  {
    key: "warning",
    label: "Warnings",
    swatch: "bg-secondary",
    glyph: "!",
    meaning: "Suboptimal — should fix",
  },
  {
    key: "info",
    label: "Info",
    swatch: "bg-primary/60",
    glyph: "i",
    meaning: "Suggestion or hint",
  },
  {
    key: "pass",
    label: "Passed",
    swatch: "bg-foreground/30",
    glyph: "✓",
    meaning: "Check is healthy",
  },
] as const;

function buildSummaryText() {
  const lines = [
    `SEO Lens — ${audit.url}`,
    `Score: ${audit.score}/100`,
    `Errors: ${audit.counts.error} · Warnings: ${audit.counts.warning} · Info: ${audit.counts.info} · Passed: ${audit.counts.pass}`,
    "",
    "Categories:",
    ...audit.categories.map(
      (c) => `  ${categoryLabels[c.id].padEnd(20)} ${c.score}/100`
    ),
  ];
  return lines.join("\n");
}

export function OverviewTab() {
  return (
    <div className="flex flex-col gap-7 px-5 py-6">
      {/* GAUGE */}
      <section>
        <SectionLabel hint="Live" index="01" title="The reading" />
        <div className="mt-4">
          <ScoreGauge score={audit.score} />
        </div>
      </section>

      <div className="rule-hair" />

      {/* SEVERITY TALLY + LEGEND */}
      <section>
        <SectionLabel hint="severity" index="02" title="Tally" />
        <ul className="mt-4 overflow-hidden rounded-md border border-border bg-card">
          {SEVERITY_ITEMS.map((item, idx) => (
            <li
              className={`flex items-center gap-3 px-3 py-2.5 ${
                idx > 0 ? "border-border/60 border-t" : ""
              }`}
              key={item.key}
            >
              <span
                aria-hidden
                className={`inline-flex size-5 shrink-0 items-center justify-center rounded-full ${item.swatch} font-mono font-semibold text-[10px] text-background leading-none`}
              >
                {item.glyph}
              </span>
              <div className="flex flex-1 flex-col">
                <span className="font-mono text-[10px] text-foreground uppercase tracking-wider">
                  {item.label}
                </span>
                <span className="text-[10px] text-muted-foreground/80 italic">
                  {item.meaning}
                </span>
              </div>
              <span className="font-display font-light text-[24px] tabular-nums leading-none">
                {audit.counts[item.key]}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="rule-hair" />

      {/* CATEGORIES */}
      <section>
        <SectionLabel hint="6 areas" index="03" title="By category" />
        <ul className="mt-4 flex flex-col gap-3.5">
          {audit.categories.map((cat) => {
            let tone = "bg-destructive";
            if (cat.score >= 80) {
              tone = "bg-primary";
            } else if (cat.score >= 55) {
              tone = "bg-secondary";
            }
            return (
              <li className="flex flex-col gap-1.5" key={cat.id}>
                <div className="kv-row text-[12px]">
                  <span className="text-foreground">
                    {categoryLabels[cat.id]}
                  </span>
                  <span className="kv-leader" />
                  <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                    {cat.score}
                  </span>
                </div>
                <div className="h-[3px] w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${tone} transition-[width] duration-700`}
                    style={{ width: `${cat.score}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="rule-hair" />

      {/* COPY + EXPORT */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <SectionLabel index="04" title="Take it with you" />
          <CopyButton
            label="Copy summary"
            payload={buildSummaryText()}
            size="sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            className="group flex items-center justify-between rounded-md border border-border bg-card px-3 py-2.5 text-left transition-colors hover:border-foreground/40"
            type="button"
          >
            <div className="flex flex-col">
              <span className="font-display font-medium text-[13px]">
                Markdown
              </span>
              <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
                .md · for humans
              </span>
            </div>
            <Download className="size-3.5 text-muted-foreground transition-colors group-hover:text-foreground" />
          </button>
          <button
            className="group flex items-center justify-between rounded-md border border-border bg-card px-3 py-2.5 text-left transition-colors hover:border-foreground/40"
            type="button"
          >
            <div className="flex flex-col">
              <span className="font-display font-medium text-[13px]">JSON</span>
              <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
                .json · for tools
              </span>
            </div>
            <Download className="size-3.5 text-muted-foreground transition-colors group-hover:text-foreground" />
          </button>
        </div>
      </section>

      <div className="rule-hair" />

      {/* AGENT MCP NOTE */}
      <section>
        <SectionLabel hint="future" index="05" title="Agent MCP" />
        <div className="mt-3 rounded-md border border-border border-dashed bg-card/40 p-3">
          <p className="text-[11px] text-muted-foreground">
            Programmatic access for AI agents — MCP server. Let your coding
            agent run an audit and consume the results directly.
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-sm border border-border bg-background px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
            <span className="size-1 rounded-full bg-secondary" />
            coming soon
          </div>
        </div>
      </section>
    </div>
  );
}
