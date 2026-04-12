import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "seo-lens:sidepanel-tab";

/**
 * Persists the selected side-panel tab to `localStorage` so the choice
 * survives panel re-opens and browser-tab switches.
 */
export const usePersistentTab = <T extends string>(
  allowed: readonly T[],
  fallback: T
) => {
  const [tab, setTabState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw && (allowed as readonly string[]).includes(raw)) {
        return raw as T;
      }
    } catch {
      // ignore
    }
    return fallback;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, tab);
    } catch {
      // ignore
    }
  }, [tab]);

  const setTab = useCallback((next: T) => setTabState(next), []);
  return [tab, setTab] as const;
};
