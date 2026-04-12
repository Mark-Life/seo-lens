export const RestrictedState = () => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
    <p className="font-display text-base">SEO Lens can't run here</p>
    <p className="max-w-xs text-[12px] text-muted-foreground leading-relaxed">
      This page is restricted by the browser (chrome://, the Web Store, or a
      similar internal page). Switch to a regular tab to run an audit.
    </p>
  </div>
);
