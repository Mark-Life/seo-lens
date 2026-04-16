"use client";

import { Header } from "@workspace/panel-ui/components/header";
import { OverviewTab } from "@workspace/panel-ui/components/overview-tab";
import { loadSchemaVocab } from "@workspace/seo-rules/generated/schema-vocab";
import { TooltipProvider } from "@workspace/ui/components/tooltip";
import { lazy, Suspense, useEffect, useState } from "react";
import { mockAudit, mockPage, mockSiteSignals, mockUrl } from "./mock-audit";

const fetchSchemaVocab = async () => {
  const res = await fetch("/schema-vocab.json");
  if (!res.ok) {
    throw new Error(`Failed to load schema-vocab.json: ${res.status}`);
  }
  return res.json();
};

const InspectTab = lazy(() =>
  Promise.all([
    import("@workspace/panel-ui/components/inspect-tab"),
    loadSchemaVocab(fetchSchemaVocab),
  ]).then(([m]) => ({ default: m.InspectTab }))
);

type TabKey = "overview" | "inspect";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Audit" },
  { key: "inspect", label: "Metadata" },
];

const InspectFallback = () => (
  <div className="flex min-h-[320px] items-center justify-center px-5 py-10 font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
    loading metadata…
  </div>
);

export function PanelPreview() {
  const [tab, setTab] = useState<TabKey>("overview");

  useEffect(() => {
    const idle = (cb: () => void) => {
      if (typeof window === "undefined") {
        return;
      }
      const ric = (
        window as unknown as {
          requestIdleCallback?: (cb: () => void) => number;
        }
      ).requestIdleCallback;
      if (ric) {
        ric(cb);
      } else {
        window.setTimeout(cb, 1500);
      }
    };
    idle(() => {
      import("@workspace/panel-ui/components/inspect-tab").catch(() => {
        // prefetch is best-effort
      });
    });
  }, []);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="grain dark w-full bg-background text-foreground">
        <div className="sticky top-0 z-20">
          <Header url={mockUrl} />
          <nav className="border-border border-b bg-background/85 backdrop-blur-md">
            <ul className="flex items-stretch px-3">
              {TABS.map((t) => {
                const active = t.key === tab;
                return (
                  <li className="flex-1" key={t.key}>
                    <button
                      className="group relative flex w-full items-center justify-center px-2 py-2.5 text-[11px]"
                      onClick={() => setTab(t.key)}
                      type="button"
                    >
                      <span
                        className={`font-mono uppercase tracking-wider transition-colors ${
                          active
                            ? "text-foreground"
                            : "text-muted-foreground group-hover:text-foreground"
                        }`}
                      >
                        {t.label}
                      </span>
                      <span
                        aria-hidden
                        className={`absolute inset-x-2 -bottom-px h-px transition-opacity ${
                          active ? "bg-foreground opacity-100" : "opacity-0"
                        }`}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
        <main>
          {tab === "overview" && <OverviewTab result={mockAudit} />}
          {tab === "inspect" && (
            <Suspense fallback={<InspectFallback />}>
              <InspectTab
                page={mockPage}
                phase={mockAudit.phase}
                siteSignals={mockSiteSignals}
              />
            </Suspense>
          )}
        </main>
      </div>
    </TooltipProvider>
  );
}
