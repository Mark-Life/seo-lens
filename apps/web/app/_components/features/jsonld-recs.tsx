"use client";

import { FindingsSection } from "@workspace/panel-ui/components/findings-section";
import type { AuditFinding, RuleId } from "@workspace/seo-rules/shapes";
import { TooltipProvider } from "@workspace/ui/components/tooltip";

const rule = (s: string) => s as RuleId;

const ARTICLE_TEMPLATE = `{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "",
  "image": [""],
  "datePublished": "",
  "author": { "@type": "Person", "name": "" }
}`;

const BREADCRUMB_TEMPLATE = `{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "", "item": "" }
  ]
}`;

const DEMO_FINDINGS: AuditFinding[] = [
  {
    id: "structured.recommend-article",
    ruleId: rule("structured.recommend-article"),
    category: "structured",
    severity: "info",
    title: "Consider adding Article JSON-LD",
    message:
      "This page looks like an article. Adding Article structured data helps Google surface it in rich results.",
    context: [
      { label: "template", value: ARTICLE_TEMPLATE },
      { label: "reason", value: "Detected <article> element and byline" },
      { label: "reason", value: "Matches article URL pattern /blog/*" },
    ],
  } as AuditFinding,
  {
    id: "structured.recommend-breadcrumb",
    ruleId: rule("structured.recommend-breadcrumb"),
    category: "structured",
    severity: "info",
    title: "Consider adding BreadcrumbList JSON-LD",
    message:
      "Breadcrumb markup surfaces navigation paths in search results and AI summaries.",
    context: [
      { label: "template", value: BREADCRUMB_TEMPLATE },
      { label: "reason", value: "Detected breadcrumb nav in the DOM" },
    ],
  } as AuditFinding,
];

export function JsonLdRecsDemo() {
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
                Recommendations
              </span>
              <span className="font-mono text-[10px] text-muted-foreground tracking-[0.14em]">
                article page · 2 suggested
              </span>
            </div>
            <FindingsSection
              findings={DEMO_FINDINGS}
              initialOpen={["structured.recommend-article"]}
            />
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
}
