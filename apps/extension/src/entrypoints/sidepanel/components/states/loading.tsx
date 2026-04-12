export const LoadingState = () => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 px-6 text-center">
    <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
    <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-wider">
      Auditing page…
    </p>
  </div>
);
