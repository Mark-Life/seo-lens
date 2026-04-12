interface ErrorStateProps {
  readonly message: string;
  readonly onRetry?: () => void;
}

export const ErrorState = ({ message, onRetry }: ErrorStateProps) => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
    <p className="font-display text-base">Audit failed</p>
    <p className="wrap-break-word max-w-xs text-[12px] text-muted-foreground leading-relaxed">
      {message}
    </p>
    {onRetry && (
      <button
        className="rounded border border-border px-3 py-1 font-mono text-[11px] uppercase tracking-wider hover:bg-muted"
        onClick={onRetry}
        type="button"
      >
        Retry
      </button>
    )}
  </div>
);
