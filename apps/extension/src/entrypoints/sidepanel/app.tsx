import {
  type AuditResult,
  headingsRule,
  metaDescriptionRule,
  type PageData,
  runAudit,
  titleRule,
} from "@workspace/seo-rules";
import { useCallback, useEffect, useState } from "react";
import { FindingsList } from "./components/findings-list";
import { ScoreDisplay } from "./components/score-display";

const rules = [titleRule, metaDescriptionRule, headingsRule];

export function App() {
  const [result, setResult] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestAudit = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) {
        setError("No active tab found");
        return;
      }

      const response = await browser.tabs.sendMessage(tab.id, {
        type: "EXTRACT_PAGE_DATA",
      });
      const pageData = response as PageData;
      const auditResult = runAudit(pageData, rules);
      setResult(auditResult);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to analyze page. Try refreshing the page."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    requestAudit();
  }, [requestAudit]);

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="font-semibold text-lg">SEO Lens</h1>
        <button
          className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground text-sm hover:opacity-90 disabled:opacity-50"
          disabled={loading}
          onClick={requestAudit}
          type="button"
        >
          {loading ? "Analyzing…" : "Re-analyze"}
        </button>
      </header>

      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-destructive text-sm">
          {error}
        </div>
      )}

      {result && (
        <>
          <ScoreDisplay score={result.score} url={result.url} />
          <FindingsList findings={result.findings} />
        </>
      )}
    </div>
  );
}
