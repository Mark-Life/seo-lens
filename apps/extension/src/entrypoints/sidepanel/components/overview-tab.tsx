import type { AuditResult, PageData } from "@workspace/seo-rules/shapes";
import { Share2 } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { categoryLabels } from "../lib/labels";
import { DataSlot, useIsRefreshing } from "../lib/refresh-context";
import { CopyButton } from "./copy-button";
import { FindingsSection, reportToText } from "./findings-tab";
import { ScoreGauge } from "./score-gauge";
import { SectionLabel } from "./section-label";

const ShareModal = lazy(() =>
  import("../features/share/share-modal").then((m) => ({
    default: m.ShareModal,
  }))
);

const ShareErrorBoundary = lazy(() =>
  import("../features/share/error-boundary").then((m) => ({
    default: m.ShareErrorBoundary,
  }))
);

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

interface OverviewTabProps {
  readonly page: PageData;
  readonly result: AuditResult;
}

export function OverviewTab({ result, page }: OverviewTabProps) {
  const refreshing = useIsRefreshing();
  const [shareOpen, setShareOpen] = useState(false);
  return (
    <div className="flex flex-col gap-7 px-5 py-6">
      {/* GAUGE */}
      <section>
        <div className="flex items-center justify-between gap-2">
          <SectionLabel hint="Live" index="01" title="The reading" />
          <button
            aria-label="Share as image"
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-sm border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground"
            disabled={refreshing}
            onClick={() => setShareOpen(true)}
            type="button"
          >
            <Share2 className="size-3.5" />
          </button>
        </div>
        <div className="mt-4">
          {refreshing ? (
            <DataSlot className="h-24 w-full rounded-md" />
          ) : (
            <ScoreGauge score={result.score} />
          )}
        </div>
      </section>

      {shareOpen && (
        <Suspense fallback={null}>
          <ShareErrorBoundary onReset={() => setShareOpen(false)}>
            <ShareModal
              onOpenChange={setShareOpen}
              open={shareOpen}
              page={page}
              result={result}
            />
          </ShareErrorBoundary>
        </Suspense>
      )}

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
                <DataSlot className="inline-block h-5 w-6 align-middle">
                  {result.counts[item.key]}
                </DataSlot>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="rule-hair" />

      {/* CATEGORIES */}
      <section>
        <SectionLabel
          hint={`${result.categoryScores.length} areas`}
          index="03"
          title="By category"
        />
        <ul className="mt-4 flex flex-col gap-3.5">
          {result.categoryScores.map((cat) => {
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
                    <DataSlot className="inline-block h-3 w-6 align-middle">
                      {cat.score}
                    </DataSlot>
                  </span>
                </div>
                <div className="h-[3px] w-full overflow-hidden rounded-full bg-muted">
                  {!refreshing && (
                    <div
                      className={`h-full rounded-full ${tone} transition-[width] duration-700`}
                      style={{ width: `${cat.score}%` }}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="rule-hair" />

      {/* FINDINGS */}
      <section>
        <div className="flex items-center justify-between gap-2">
          <SectionLabel
            hint={`${result.findings.length} total`}
            index="04"
            title="Findings"
          />
          <CopyButton
            label="Copy full report"
            payload={reportToText(result.findings)}
            size="sm"
          />
        </div>
        {refreshing ? (
          <div className="mt-4 flex flex-col gap-2">
            <DataSlot className="h-10 w-full rounded-md" />
            <DataSlot className="h-10 w-full rounded-md" />
            <DataSlot className="h-10 w-full rounded-md" />
          </div>
        ) : (
          <FindingsSection findings={result.findings} />
        )}
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
