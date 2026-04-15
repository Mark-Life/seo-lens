import { loadSchemaVocab } from "@workspace/seo-rules/generated/schema-vocab";
import type {
  AuditResult,
  AuditState,
  PageData,
} from "@workspace/seo-rules/shapes";
import { TooltipProvider } from "@workspace/ui/components/tooltip";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Header } from "./components/header";
import { OverviewTab } from "./components/overview-tab";
import { ErrorState } from "./components/states/error";
import { LoadingState } from "./components/states/loading";
import { RestrictedState } from "./components/states/restricted";
import { useAuditState } from "./hooks/use-audit-state";
import { usePersistentTab } from "./hooks/use-persistent-tab";
import { RefreshProvider } from "./lib/refresh-context";

const fetchSchemaVocab = async () => {
  const url = browser.runtime.getURL("/schema-vocab.json");
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load schema-vocab.json: ${res.status}`);
  }
  return res.json();
};

const InspectTab = lazy(() =>
  Promise.all([
    import("./components/inspect-tab"),
    loadSchemaVocab(fetchSchemaVocab),
  ]).then(([m]) => ({ default: m.InspectTab }))
);

type TabKey = "overview" | "inspect";

const TAB_KEYS: readonly TabKey[] = ["overview", "inspect"];
const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Audit" },
  { key: "inspect", label: "Metadata" },
];

interface ReadySnapshot {
  readonly page: PageData;
  readonly result: AuditResult;
}

interface ReadyViewProps {
  readonly onTabChange: (t: TabKey) => void;
  readonly page: PageData;
  readonly result: AuditResult;
  readonly tab: TabKey;
}

const ReadyView = ({ page, result, tab, onTabChange }: ReadyViewProps) => (
  <>
    <nav className="sticky top-[83.5px] z-10 border-border border-b bg-background/85 backdrop-blur-md">
      <ul className="flex items-stretch px-3">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <li className="flex-1" key={t.key}>
              <button
                className="group relative flex w-full items-center justify-center px-2 py-2.5 text-[11px]"
                onClick={() => onTabChange(t.key)}
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
      {tab === "overview" && <OverviewTab page={page} result={result} />}
      {tab === "inspect" && (
        <Suspense fallback={<LoadingState />}>
          <InspectTab page={page} siteSignals={result.siteSignals} />
        </Suspense>
      )}
    </main>
  </>
);

/**
 * Decide how to render the audit state. Returns either:
 * - a full-screen replacement (Idle/first-load/Restricted/Error), or
 * - null if the caller should render `ReadyView` with the stashed snapshot.
 */
const renderFallback = (
  state: AuditState,
  snapshot: ReadySnapshot | null,
  onRefresh: () => void
) => {
  switch (state._tag) {
    case "Ready":
      return null;
    case "Restricted":
      return <RestrictedState />;
    case "AuditError":
      return <ErrorState message={state.message} onRetry={onRefresh} />;
    default:
      // Idle / Loading / Running: only show the full loader when we have
      // nothing to keep on screen. Otherwise keep the stale snapshot.
      return snapshot ? null : <LoadingState />;
  }
};

export const App = () => {
  const { state, refresh } = useAuditState();
  const [tab, setTab] = usePersistentTab<TabKey>(TAB_KEYS, "overview");

  // Keep the most recent Ready snapshot so the UI doesn't flicker between
  // refreshes / tab navigations.
  const [snapshot, setSnapshot] = useState<ReadySnapshot | null>(null);
  const lastUrlRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (state._tag === "Ready") {
      setSnapshot({ page: state.page, result: state.result });
      lastUrlRef.current = state.page.url;
    } else if (state._tag === "Restricted" || state._tag === "AuditError") {
      setSnapshot(null);
      lastUrlRef.current = undefined;
    }
  }, [state]);

  const isTransient =
    state._tag === "Idle" ||
    state._tag === "Loading" ||
    state._tag === "Running";

  // Delay showing skeletons so fast refreshes (cache hits, tab switches)
  // don't produce a flicker on the gauge / category bars.
  const [isRefreshing, setIsRefreshing] = useState(false);
  useEffect(() => {
    if (!(isTransient && snapshot !== null)) {
      setIsRefreshing(false);
      return;
    }
    const timer = setTimeout(() => setIsRefreshing(true), 250);
    return () => clearTimeout(timer);
  }, [isTransient, snapshot]);

  const fallback = renderFallback(state, snapshot, refresh);
  const displayUrl =
    state._tag === "Ready" ? state.page.url : (lastUrlRef.current ?? undefined);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="grain min-h-screen bg-background text-foreground">
        <Header
          isRefreshing={isTransient}
          onRefresh={refresh}
          url={displayUrl}
        />

        {fallback ??
          (snapshot && (
            <RefreshProvider value={isRefreshing}>
              <ReadyView
                onTabChange={setTab}
                page={snapshot.page}
                result={snapshot.result}
                tab={tab}
              />
            </RefreshProvider>
          ))}

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
