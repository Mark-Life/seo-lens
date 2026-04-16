"use client";

import { TooltipProvider } from "@workspace/ui/components/tooltip";
import { mockPage } from "../panel-preview/mock-audit";

const headings = mockPage.headings;
const og = mockPage.openGraph;
const ogTitle = og["og:title"] ?? "—";
const ogDescription = og["og:description"] ?? "—";
const ogImage = og["og:image"] ?? null;
const ogType = og["og:type"] ?? "—";
const ogDomain = "example.com";

export function InspectDemo() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-neutral-800 bg-[#0a0a0a] shadow-2xl shadow-black/40">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_80%_20%,rgba(71,209,205,0.07),transparent_70%)]"
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#47d1cd]/25 to-transparent" />

      <div className="relative flex h-full items-center justify-center px-4 py-4 md:px-6 md:py-6">
        <TooltipProvider delayDuration={150}>
          <div className="grain dark w-full max-w-[520px] rounded-lg border border-neutral-800 bg-background p-4 text-foreground shadow-black/50 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.18em]">
                Metadata
              </span>
              <span className="font-mono text-[10px] text-muted-foreground tracking-[0.14em]">
                headings · open graph
              </span>
            </div>

            <div className="flex flex-col gap-5">
              <HeadingTree />
              <div className="rule-hair" />
              <OpenGraphCard />
            </div>
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
}

function HeadingTree() {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">
          Heading hierarchy
        </span>
        <span className="font-mono text-[9px] text-muted-foreground/70">
          {headings.length} nodes
        </span>
      </div>
      <ul className="flex flex-col gap-1">
        {headings.map((h, i) => (
          <li
            className="tree-row text-[12px]"
            key={`${h.text}-${i}`}
            style={{ marginLeft: `${(h.level - 1) * 14}px` }}
          >
            <div className="flex items-baseline gap-2">
              <span className="font-medium font-mono text-[9px] text-primary uppercase">
                H{h.level}
              </span>
              <span className="text-foreground">{h.text}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function OpenGraphCard() {
  return (
    <section>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">
          Open Graph
        </span>
        <span className="font-mono text-[9px] text-muted-foreground/70">
          og:type · {ogType}
        </span>
      </div>
      <div className="overflow-hidden rounded-md border border-border bg-card">
        <div className="relative aspect-1200/630 w-full bg-linear-to-br from-primary/15 via-muted to-secondary/15">
          <div className="grain absolute inset-0" />
          {ogImage ? (
            // biome-ignore lint/performance/noImgElement: avoiding next/image loader config for cross-origin demo image
            // biome-ignore lint/correctness/useImageSize: remote cross-origin image with unknown dimensions
            <img
              alt=""
              className="absolute inset-0 size-full object-cover"
              decoding="async"
              loading="lazy"
              referrerPolicy="no-referrer"
              src={ogImage}
            />
          ) : null}
        </div>
        <div className="border-border border-t px-3 py-2.5">
          <div className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
            {ogDomain}
          </div>
          <div className="mt-0.5 line-clamp-1 font-display font-medium text-[13px]">
            {ogTitle}
          </div>
          <div className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
            {ogDescription}
          </div>
        </div>
      </div>
    </section>
  );
}
