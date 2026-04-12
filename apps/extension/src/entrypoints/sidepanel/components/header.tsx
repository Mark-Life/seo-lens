import { RefreshCw } from "lucide-react";

interface HeaderProps {
  readonly isRefreshing?: boolean;
  readonly onRefresh?: () => void;
  readonly url?: string;
}

export function Header({ url, onRefresh, isRefreshing }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-border border-b bg-background/85 px-5 pt-4 pb-3 backdrop-blur-md">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="font-display font-medium text-[20px] leading-none tracking-tight">
            SEO
          </span>
          <span className="font-display font-light text-[20px] text-muted-foreground italic leading-none tracking-tight">
            Lens
          </span>
        </div>
        {onRefresh && (
          <button
            aria-label="Rerun audit"
            className="group inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isRefreshing}
            onClick={onRefresh}
            title="Rerun audit"
            type="button"
          >
            <RefreshCw
              className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
        )}
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <span className="size-1 rounded-full bg-primary/60" />
        <span className="truncate font-mono text-[11px] text-muted-foreground">
          {url ?? "—"}
        </span>
      </div>
    </header>
  );
}
