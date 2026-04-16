import { useIsRefreshing } from "@workspace/panel-ui/components/refresh-context";
import type { AuditResult, PageData } from "@workspace/seo-rules/shapes";
import { Share2 } from "lucide-react";
import { lazy, Suspense, useState } from "react";

const ShareModal = lazy(() =>
  import("../features/share/share-modal").then((m) => ({
    default: m.ShareModal,
  }))
);

const ShareErrorBoundary = lazy(() =>
  import("../features/share/error-boundary").then((m) => ({
    default: m.ShareErrorBoundary,
  }))
);

interface ShareSlotProps {
  readonly page: PageData;
  readonly result: AuditResult;
}

export function ShareSlot({ page, result }: ShareSlotProps) {
  const refreshing = useIsRefreshing();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        aria-label="Share as image"
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-sm border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground"
        disabled={refreshing}
        onClick={() => setOpen(true)}
        type="button"
      >
        <Share2 className="size-3.5" />
      </button>
      {open && (
        <Suspense fallback={null}>
          <ShareErrorBoundary onReset={() => setOpen(false)}>
            <ShareModal
              onOpenChange={setOpen}
              open={open}
              page={page}
              result={result}
            />
          </ShareErrorBoundary>
        </Suspense>
      )}
    </>
  );
}
