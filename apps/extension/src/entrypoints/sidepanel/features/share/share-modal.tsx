import type { AuditResult, PageData } from "@workspace/seo-rules/shapes";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { downloadBlob } from "./actions";
import { renderCard } from "./render-card";

interface ShareModalProps {
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
  readonly page: PageData;
  readonly result: AuditResult;
}

type Status =
  | { _tag: "idle" }
  | { _tag: "rendering" }
  | { _tag: "ready"; blob: Blob; objectUrl: string }
  | { _tag: "error"; message: string };

export const ShareModal = ({
  open,
  onOpenChange,
  result,
  page,
}: ShareModalProps) => {
  const [status, setStatus] = useState<Status>({ _tag: "idle" });

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    setStatus({ _tag: "rendering" });
    renderCard(result, page)
      .then((card) => {
        if (cancelled) {
          URL.revokeObjectURL(card.objectUrl);
          return;
        }
        setStatus({
          _tag: "ready",
          blob: card.blob,
          objectUrl: card.objectUrl,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setStatus({
          _tag: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [open, result, page]);

  useEffect(() => {
    return () => {
      if (status._tag === "ready") {
        URL.revokeObjectURL(status.objectUrl);
      }
    };
  }, [status]);

  const onDownload = () => {
    if (status._tag === "ready") {
      downloadBlob(status.blob, page.url);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share this report</DialogTitle>
          <DialogDescription>
            Download a shareable image with your SEO score.
          </DialogDescription>
        </DialogHeader>

        <div
          className="relative aspect-[1200/630] w-full overflow-hidden rounded-md border border-border"
          style={{ isolation: "isolate" }}
        >
          {status._tag === "rendering" && (
            <div className="share-shimmer absolute inset-0" />
          )}
          {status._tag === "error" && (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="text-center font-mono text-[10px] text-destructive uppercase tracking-wider">
                {status.message}
              </div>
            </div>
          )}
          {status._tag === "ready" && (
            <img
              alt="SEO Lens report card"
              className="h-full w-full object-cover"
              src={status.objectUrl}
            />
          )}
        </div>

        <Button
          className="w-full"
          disabled={status._tag !== "ready"}
          onClick={onDownload}
        >
          <Download />
          Download PNG
        </Button>
      </DialogContent>
    </Dialog>
  );
};
