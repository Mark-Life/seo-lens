import { Image as ImageIcon } from "lucide-react";
import { headings, images, jsonld, meta, social } from "../data/placeholder";
import { CopyButton } from "./copy-button";
import { SectionLabel } from "./section-label";

function MetaRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="kv-row py-1.5 text-[11px]">
      <span className="font-mono text-muted-foreground">{k}</span>
      <span className="kv-leader" />
      <span className="max-w-[220px] truncate font-mono text-foreground">
        {v}
      </span>
    </div>
  );
}

export function InspectTab() {
  return (
    <div className="flex flex-col gap-8 px-5 py-6">
      {/* META TAGS */}
      <section>
        <div className="flex items-center justify-between">
          <SectionLabel index="01" title="Meta tags" />
          <CopyButton
            label="Copy meta"
            payload={JSON.stringify(meta, null, 2)}
            size="sm"
          />
        </div>
        <div className="mt-3 divide-y divide-border/60 rounded-md border border-border bg-card px-3">
          <MetaRow k="title" v={meta.title} />
          <MetaRow k="description" v={meta.description} />
          <MetaRow k="canonical" v={meta.canonical} />
          <MetaRow k="robots" v={meta.robots} />
          <MetaRow k="viewport" v={meta.viewport} />
          <MetaRow k="lang" v={meta.lang} />
          <MetaRow k="charset" v={meta.charset} />
        </div>
      </section>

      <div className="rule-hair" />

      {/* SOCIAL PREVIEW */}
      <section>
        <SectionLabel hint="Open Graph" index="02" title="Social preview" />

        <div className="mt-4 overflow-hidden rounded-md border border-border bg-card">
          <div className="relative aspect-[1200/630] w-full bg-gradient-to-br from-primary/15 via-muted to-secondary/15">
            <div className="grain absolute inset-0" />
            <div className="absolute inset-0 flex items-center justify-center">
              <ImageIcon className="size-7 text-muted-foreground/50" />
            </div>
            <span className="absolute right-2 bottom-2 rounded-sm bg-background/85 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
              1024 × 512
            </span>
          </div>
          <div className="border-border border-t px-3 py-2.5">
            <div className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
              {social.domain}
            </div>
            <div className="mt-0.5 line-clamp-1 font-display font-medium text-[13px]">
              {social.ogTitle}
            </div>
            <div className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
              {social.ogDescription}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded-sm border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            og:type · {social.ogType}
          </span>
          <span className="rounded-sm border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            twitter:card · {social.twitterCard}
          </span>
        </div>
      </section>

      <div className="rule-hair" />

      {/* HEADING TREE */}
      <section>
        <SectionLabel
          hint={`${headings.length} nodes`}
          index="03"
          title="Heading hierarchy"
        />
        <ul className="mt-4 flex flex-col gap-1">
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

      <div className="rule-hair" />

      {/* JSON-LD */}
      <section>
        <div className="flex items-center justify-between">
          <SectionLabel index="04" title="Structured data" />
          <CopyButton label="Copy JSON-LD" payload={jsonld} size="sm" />
        </div>
        <pre className="mt-3 max-h-72 overflow-auto rounded-md border border-border bg-foreground/5 p-3 font-mono text-[10.5px] text-foreground leading-relaxed">
          <code>{jsonld}</code>
        </pre>
      </section>

      <div className="rule-hair" />

      {/* IMAGES */}
      <section>
        <SectionLabel
          hint={`${images.length} found`}
          index="05"
          title="Images & alt text"
        />
        <ul className="mt-4 grid grid-cols-2 gap-3">
          {images.map((img) => (
            <li className="flex flex-col gap-1.5" key={img.src}>
              <div className="relative aspect-square overflow-hidden rounded-md border border-border bg-gradient-to-br from-muted to-card">
                <div className="absolute inset-0 flex items-center justify-center">
                  <ImageIcon className="size-5 text-muted-foreground/50" />
                </div>
                {img.alt === null && (
                  <span className="absolute top-1.5 left-1.5 rounded-sm bg-destructive/90 px-1 py-0.5 font-mono text-[8px] text-destructive-foreground uppercase tracking-wider">
                    no alt
                  </span>
                )}
              </div>
              <div className="line-clamp-1 font-mono text-[9px] text-muted-foreground">
                {img.src.split("/").pop()}
              </div>
              <div className="line-clamp-2 text-[10px] text-foreground/80">
                {img.alt ?? "—"}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
