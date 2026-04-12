import type { AuditResult, AuditState, PageData } from "@workspace/seo-rules";
import { TooltipProvider } from "@workspace/ui/components/tooltip";
import { Match } from "effect";
import { useState } from "react";
import { FindingsTab } from "./components/findings-tab";
import { Header } from "./components/header";
import { InspectTab } from "./components/inspect-tab";
import { OverviewTab } from "./components/overview-tab";
import { ErrorState } from "./components/states/error";
import { LoadingState } from "./components/states/loading";
import { RestrictedState } from "./components/states/restricted";
import { useAuditState } from "./hooks/use-audit-state";

type TabKey = "overview" | "findings" | "inspect";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "findings", label: "Findings" },
  { key: "inspect", label: "Inspect" },
];

interface ReadyViewProps {
  readonly onRefresh: () => void;
  readonly page: PageData;
  readonly result: AuditResult;
}

const ReadyView = (_props: ReadyViewProps) => {
  const [tab, setTab] = useState<TabKey>("overview");

  return (
    <>
      <nav className="sticky top-[68px] z-10 border-border border-b bg-background/85 backdrop-blur-md">
        <ul className="flex items-stretch px-3">
          {TABS.map((t) => {
            const active = tab === t.key;
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

      <main>
        {tab === "overview" && <OverviewTab />}
        {tab === "findings" && <FindingsTab />}
        {tab === "inspect" && <InspectTab />}
      </main>
    </>
  );
};

const renderState = (state: AuditState, onRefresh: () => void) =>
  Match.value(state).pipe(
    Match.tagsExhaustive({
      Idle: () => <LoadingState />,
      Loading: () => <LoadingState />,
      Running: () => <LoadingState />,
      Restricted: () => <RestrictedState />,
      AuditError: (s) => <ErrorState message={s.message} onRetry={onRefresh} />,
      Ready: (s) => (
        <ReadyView onRefresh={onRefresh} page={s.page} result={s.result} />
      ),
    })
  );

export const App = () => {
  const { state, refresh } = useAuditState();

  return (
    <TooltipProvider delayDuration={150}>
      <div className="grain min-h-screen bg-background text-foreground">
        <Header />

        {renderState(state, refresh)}

        <footer className="border-border border-t px-5 py-3">
          <div className="flex items-center justify-between">
            <span className="font-display text-[11px] text-muted-foreground italic">
              seo lens
            </span>
            <span className="font-mono text-[9px] text-muted-foreground/70 uppercase tracking-widest">
              v0.0.1 · Mark Life Ltd
            </span>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
};
