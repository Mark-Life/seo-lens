"use client";

import { SiteSignalsSection } from "@workspace/panel-ui/components/site-signals-section";
import { TooltipProvider } from "@workspace/ui/components/tooltip";
import { mockSiteSignals } from "../panel-preview/mock-audit";

export function SiteLevelDemo() {
  return (
    <div className="relative overflow-hidden md:rounded-xl md:border md:border-neutral-800 md:bg-[#0a0a0a] md:shadow-2xl md:shadow-black/40">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(ellipse_60%_60%_at_80%_20%,rgba(71,209,205,0.07),transparent_70%)] md:block"
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 hidden h-[1px] bg-gradient-to-r from-transparent via-[#47d1cd]/25 to-transparent md:block" />

      <div className="relative flex h-full items-center justify-center md:px-6 md:py-6">
        <TooltipProvider delayDuration={150}>
          <div className="grain dark w-full max-w-[420px] rounded-lg border border-neutral-800 bg-background p-4 text-foreground shadow-black/50 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.18em]">
                Site
              </span>
              <span className="font-mono text-[10px] text-muted-foreground tracking-[0.14em]">
                example.com · origin
              </span>
            </div>
            <SiteSignalsSection siteSignals={mockSiteSignals} />
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
}
