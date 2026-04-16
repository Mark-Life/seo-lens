interface ErrorStateProps {
  readonly message: string;
  readonly onReloadPage?: () => void;
  readonly onRetry?: () => void;
}

export const ErrorState = ({
  message,
  onReloadPage,
  onRetry,
}: ErrorStateProps) => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
    <p className="font-display text-base">Audit failed</p>
    <p className="wrap-break-word max-w-xs text-[12px] text-muted-foreground leading-relaxed">
      {message}
    </p>
    <div className="flex items-center gap-2">
      {onRetry && (
        <button
          className="rounded border border-border px-3 py-1 font-mono text-[11px] uppercase tracking-wider hover:bg-muted"
          onClick={onRetry}
          type="button"
        >
          Retry
        </button>
      )}
      {onReloadPage && (
        <button
          className="rounded border border-border px-3 py-1 font-mono text-[11px] uppercase tracking-wider hover:bg-muted"
          onClick={onReloadPage}
          type="button"
        >
          Reload page
        </button>
      )}
    </div>
  </div>
);
