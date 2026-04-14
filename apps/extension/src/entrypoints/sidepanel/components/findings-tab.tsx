import type { AuditFinding, Severity } from "@workspace/seo-rules/schema";
import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { categoryLabels } from "../lib/labels";
import { CopyButton } from "./copy-button";

const FILTERS: { key: Severity | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "error", label: "Errors" },
  { key: "warning", label: "Warnings" },
  { key: "info", label: "Info" },
  { key: "pass", label: "Passed" },
];

const severityDot: Record<Severity, string> = {
  error: "bg-destructive",
  warning: "bg-secondary",
  info: "bg-primary/70",
  pass: "bg-foreground/30",
};

const severityOrder: Record<Severity, number> = {
  error: 0,
  warning: 1,
  info: 2,
  pass: 3,
};

const severityLabel: Record<Severity, string> = {
  error: "Error",
  warning: "Warning",
  info: "Info",
  pass: "Passed",
};

function findingToText(f: AuditFinding): string {
  const lines = [
    `[${f.severity.toUpperCase()}] ${f.ruleId}`,
    f.title,
    f.message,
  ];
  if (f.context && f.context.length > 0) {
    lines.push("");
    lines.push("Context:");
    for (const c of f.context) {
      lines.push(`  ${c.label}: ${c.value}`);
    }
  }
  if (f.grep) {
    lines.push("");
    lines.push(`Grep: ${f.grep}`);
  }
  return lines.join("\n");
}

export function reportToText(items: readonly AuditFinding[]): string {
  return items.map(findingToText).join("\n\n---\n\n");
}

interface FindingsSectionProps {
  readonly findings: readonly AuditFinding[];
}

export function FindingsSection({ findings }: FindingsSectionProps) {
  const [filter, setFilter] = useState<Severity | "all">("all");
  const [open, setOpen] = useState<Set<string>>(new Set());

  const visible = useMemo(() => {
    const list =
      filter === "all"
        ? findings
        : findings.filter((f) => f.severity === filter);
    return [...list].sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
    );
  }, [filter, findings]);

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      {/* FILTER CHIPS */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
              }`}
              key={f.key}
              onClick={() => setFilter(f.key)}
              type="button"
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* FINDINGS LIST */}
      <ul className="flex flex-col">
        {visible.map((f) => {
          const isOpen = open.has(f.id);
          return (
            <li
              className="border-border border-t py-3 last:border-b"
              key={f.id}
            >
              {/* ROW */}
              <div className="flex items-start gap-1.5">
                <CopyButton
                  label="Copy issue"
                  payload={findingToText(f)}
                  stopPropagation
                />
                <button
                  className="flex flex-1 items-start gap-2.5 pt-1 text-left"
                  onClick={() => toggle(f.id)}
                  type="button"
                >
                  <span
                    className={`mt-1.5 size-1.5 shrink-0 rounded-full ${severityDot[f.severity]}`}
                  />
                  <div className="flex flex-1 flex-col items-start gap-1">
                    <div className="flex w-full items-baseline justify-between gap-2">
                      <span className="font-display font-medium text-[14px] leading-tight">
                        {f.title}
                      </span>
                      <ChevronDown
                        className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                        {severityLabel[f.severity]}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60">
                        ·
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {f.ruleId}
                      </span>
                    </div>
                  </div>
                </button>
              </div>

              {isOpen && (
                <div className="mt-3 ml-[34px] flex flex-col gap-3 border-foreground/15 border-l pl-3">
                  <p className="text-[12px] text-foreground/80">{f.message}</p>

                  {f.ruleId.startsWith("structured.recommend") ? (
                    <RecommendContext finding={f} />
                  ) : (
                    f.context &&
                    f.context.length > 0 && (
                      <div className="flex flex-col gap-1 rounded-sm border border-border bg-muted/30 p-2.5">
                        <div className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
                          {categoryLabels[f.category]}
                        </div>
                        {f.context.map((c, idx) => (
                          <div
                            className="kv-row text-[11px]"
                            key={`${f.id}-c-${idx}`}
                          >
                            <span className="font-mono text-muted-foreground">
                              {c.label}
                            </span>
                            <span className="kv-leader" />
                            <span className="max-w-[220px] truncate font-mono text-foreground">
                              {c.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    )
                  )}

                  {f.grep && (
                    <div className="flex items-center gap-2 rounded-sm bg-foreground/5 px-2.5 py-1.5">
                      <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
                        grep
                      </span>
                      <code className="flex-1 truncate font-mono text-[11px] text-foreground">
                        {f.grep}
                      </code>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RecommendContext({ finding }: { readonly finding: AuditFinding }) {
  const context = finding.context ?? [];
  const template = context.find((c) => c.label === "template")?.value;
  const reasons = context
    .filter((c) => c.label === "reason")
    .map((c) => c.value);

  if (!template && reasons.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {reasons.length > 0 && (
        <div className="flex flex-col gap-1 rounded-sm border border-border bg-muted/30 p-2.5">
          <div className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
            Why we recommend this
          </div>
          <ul className="mt-1 flex flex-col gap-1">
            {reasons.map((r, idx) => (
              <li
                className="flex gap-1.5 text-[11px] text-foreground/80"
                key={`${finding.id}-r-${idx}`}
              >
                <span className="text-muted-foreground">·</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {template && (
        <div className="flex flex-col gap-1 rounded-sm border border-border bg-muted/30 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
              Template — paste into a &lt;script
              type=&quot;application/ld+json&quot;&gt;
            </div>
            <CopyButton
              label="Copy template"
              payload={template}
              size="sm"
              stopPropagation
            />
          </div>
          <pre className="wrap-break-word mt-1 whitespace-pre-wrap font-mono text-[11px] text-foreground">
            {template}
          </pre>
        </div>
      )}
    </div>
  );
}
