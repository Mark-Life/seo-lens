"use client";

import { JsonLdTree } from "@workspace/panel-ui/components/jsonld-tree";
import { deriveJsonLdBlocks } from "@workspace/seo-rules";
import { loadSchemaVocab } from "@workspace/seo-rules/generated/schema-vocab";
import type { JsonLdBlock } from "@workspace/seo-rules/view";
import { TooltipProvider } from "@workspace/ui/components/tooltip";
import { useEffect, useState } from "react";
import { mockPage } from "../panel-preview/mock-audit";

const fetchSchemaVocab = async () => {
  const res = await fetch("/schema-vocab.json");
  if (!res.ok) {
    throw new Error(`Failed to load schema-vocab.json: ${res.status}`);
  }
  return res.json();
};

export function JsonLdViewerDemo() {
  const [blocks, setBlocks] = useState<readonly JsonLdBlock[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSchemaVocab(fetchSchemaVocab)
      .then(() => {
        if (cancelled) {
          return;
        }
        setBlocks(deriveJsonLdBlocks(mockPage));
      })
      .catch(() => {
        // best-effort; leave the skeleton in place on failure
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative overflow-hidden rounded-xl border border-neutral-800 bg-[#0a0a0a] shadow-2xl shadow-black/40">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_80%_20%,rgba(71,209,205,0.07),transparent_70%)]"
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#47d1cd]/25 to-transparent" />

      <div className="relative flex h-full items-center justify-center px-4 py-4 md:px-6 md:py-6">
        <TooltipProvider delayDuration={150}>
          <div className="grain dark w-full max-w-[420px] rounded-lg border border-neutral-800 bg-background p-4 text-foreground shadow-black/50 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.18em]">
                JSON-LD
              </span>
              <span className="font-mono text-[10px] text-muted-foreground tracking-[0.14em]">
                {blocks
                  ? `${blocks.length} blocks · validated`
                  : "loading vocab…"}
              </span>
            </div>
            {blocks ? <JsonLdTree blocks={blocks} /> : <TreeSkeleton />}
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
}

function TreeSkeleton() {
  return (
    <ul className="mt-3 flex flex-col gap-2">
      {[0, 1].map((i) => (
        <li
          className="overflow-hidden rounded-md border border-border bg-card"
          key={`jld-skel-${i}`}
        >
          <div className="flex items-center gap-2 border-border/60 border-b px-3 py-2">
            <div className="h-2.5 w-16 animate-pulse rounded-sm bg-muted" />
            <div className="h-2.5 w-20 animate-pulse rounded-sm bg-muted/70" />
          </div>
          <div className="space-y-1.5 px-3 py-2.5">
            <div className="h-2 w-[72%] animate-pulse rounded-sm bg-muted/60" />
            <div className="h-2 w-[54%] animate-pulse rounded-sm bg-muted/60" />
            <div className="h-2 w-[64%] animate-pulse rounded-sm bg-muted/50" />
          </div>
        </li>
      ))}
    </ul>
  );
}
