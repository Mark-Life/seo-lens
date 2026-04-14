import type { PageData, SiteSignals } from "@workspace/seo-rules/schema";
import {
  deriveBreadcrumbs,
  deriveImageGallery,
  deriveIndexingView,
  deriveJsonLdBlocks,
  deriveMetaView,
  deriveSocialView,
  type IndexingStatus,
} from "@workspace/seo-rules/view";
import { AlertTriangle, ChevronRight, Image as ImageIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { DataSlot, useIsRefreshing } from "../lib/refresh-context";
import { CopyButton } from "./copy-button";
import { buildAllBlocksCopyText, JsonLdTree } from "./jsonld-tree";
import { SectionLabel } from "./section-label";
import { SiteSignalsSection } from "./site-signals-section";

const indexingTone: Record<IndexingStatus, string> = {
  ok: "bg-primary",
  warn: "bg-secondary",
  bad: "bg-destructive",
};

interface RemoteImageProps {
  readonly alt?: string;
  readonly className?: string;
  readonly iconSize?: string;
  readonly src: string | null;
}

const RemoteImage = ({
  src,
  alt = "",
  className = "",
  iconSize = "size-7",
}: RemoteImageProps) => {
  const [errored, setErrored] = useState(false);
  const [lastSrc, setLastSrc] = useState(src);
  if (src !== lastSrc) {
    setLastSrc(src);
    setErrored(false);
  }
  if (!src || errored) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <ImageIcon className={`${iconSize} text-muted-foreground/50`} />
      </div>
    );
  }
  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: onError is a load-failure signal, not user interaction
    <img
      alt={alt}
      className={`absolute inset-0 size-full object-cover ${className}`}
      decoding="async"
      loading="lazy"
      onError={() => setErrored(true)}
      referrerPolicy="no-referrer"
      src={src}
    />
  );
};

function MetaRow({ k, v }: { k: string; v: string | null }) {
  return (
    <div className="kv-row py-1.5 text-[11px]">
      <span className="font-mono text-muted-foreground">{k}</span>
      <span className="kv-leader" />
      <span className="max-w-[220px] truncate font-mono text-foreground">
        <DataSlot className="inline-block h-3 w-24 align-middle">
          {v ?? "—"}
        </DataSlot>
      </span>
    </div>
  );
}

interface InspectTabProps {
  readonly page: PageData;
  readonly siteSignals: SiteSignals;
}

export function InspectTab({ page, siteSignals }: InspectTabProps) {
  const refreshing = useIsRefreshing();
  const meta = useMemo(() => deriveMetaView(page), [page]);
  const indexing = useMemo(() => deriveIndexingView(page), [page]);
  const social = useMemo(() => deriveSocialView(page), [page]);
  const jsonldBlocks = useMemo(() => deriveJsonLdBlocks(page), [page]);
  const breadcrumbs = useMemo(
    () => deriveBreadcrumbs(jsonldBlocks),
    [jsonldBlocks]
  );
  const images = useMemo(() => deriveImageGallery(page), [page]);
  const headings = page.headings;
  const jsonldRaw = useMemo(
    () => buildAllBlocksCopyText(jsonldBlocks),
    [jsonldBlocks]
  );
  const indexingText = useMemo(
    () =>
      indexing.map((r) => `${r.label}: ${r.value} (${r.source})`).join("\n"),
    [indexing]
  );
  const headingsText = useMemo(
    () =>
      headings
        .map((h) => `${"  ".repeat(h.level - 1)}H${h.level} ${h.text}`)
        .join("\n"),
    [headings]
  );
  const socialText = useMemo(() => {
    const fmt = (v: string | null) => v ?? "(not set)";
    const og = [
      `og:title: ${fmt(social.og.title)}`,
      `og:description: ${fmt(social.og.description)}`,
      `og:image: ${fmt(social.og.image)}`,
      `og:type: ${fmt(social.og.type)}`,
      `og:site_name: ${fmt(social.og.siteName)}`,
    ].join("\n");
    const tw = [
      `twitter:card: ${fmt(social.twitter.card)}`,
      `twitter:title: ${fmt(social.twitter.title)}`,
      `twitter:description: ${fmt(social.twitter.description)}`,
      `twitter:image: ${fmt(social.twitter.image)}`,
      `twitter:site: ${fmt(social.twitter.site)}`,
      `twitter:creator: ${fmt(social.twitter.creator)}`,
    ].join("\n");
    return `# Open Graph\n${og}\n\n# Twitter\n${tw}\n\ndomain: ${fmt(social.domain)}`;
  }, [social]);
  const imagesText = useMemo(
    () =>
      images
        .map((img) => {
          const status = img.missingAlt ? "✗ NO ALT" : "✓";
          const alt = img.alt ?? "(missing)";
          return `${status} ${img.filename}\n  src: ${img.src}\n  alt: ${alt}`;
        })
        .join("\n\n"),
    [images]
  );

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

      {/* INDEXING DASHBOARD */}
      <section>
        <div className="flex items-center justify-between">
          <SectionLabel
            hint="what bots see"
            index="02"
            title="Indexing & robots"
          />
          <CopyButton label="Copy indexing" payload={indexingText} size="sm" />
        </div>
        <ul className="mt-3 overflow-hidden rounded-md border border-border bg-card">
          {indexing.map((row, idx) => (
            <li
              className={`flex items-center gap-3 px-3 py-2 ${
                idx > 0 ? "border-border/60 border-t" : ""
              }`}
              key={row.key}
            >
              <span
                aria-hidden
                className={`size-1.5 shrink-0 rounded-full ${indexingTone[row.status]}`}
              />
              <div className="flex flex-1 flex-col">
                <span className="font-display text-[12px] text-foreground leading-tight">
                  {row.label}
                </span>
                <span className="font-mono text-[9px] text-muted-foreground/80 uppercase tracking-wider">
                  {row.source}
                </span>
              </div>
              <span className="font-mono text-[10px] text-foreground tabular-nums">
                <DataSlot className="inline-block h-3 w-14 align-middle">
                  {row.value}
                </DataSlot>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="rule-hair" />

      {/* SOCIAL PREVIEW — OG + TWITTER */}
      <section>
        <div className="flex items-center justify-between">
          <SectionLabel
            hint="OG · Twitter"
            index="03"
            title="Social previews"
          />
          <CopyButton label="Copy social" payload={socialText} size="sm" />
        </div>

        {/* OG preview */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">
              Open Graph
            </span>
            <span className="font-mono text-[9px] text-muted-foreground/70">
              og:type · {social.og.type ?? "—"}
            </span>
          </div>
          <div className="overflow-hidden rounded-md border border-border bg-card">
            <div className="relative aspect-1200/630 w-full bg-linear-to-br from-primary/15 via-muted to-secondary/15">
              <div className="grain absolute inset-0" />
              {!refreshing && <RemoteImage alt="" src={social.og.image} />}
            </div>
            <div className="border-border border-t px-3 py-2.5">
              <div className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
                <DataSlot className="inline-block h-2.5 w-20 align-middle">
                  {social.domain ?? "—"}
                </DataSlot>
              </div>
              <div className="mt-0.5 line-clamp-1 font-display font-medium text-[13px]">
                <DataSlot className="inline-block h-3.5 w-40 align-middle">
                  {social.og.title ?? "—"}
                </DataSlot>
              </div>
              <div className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                <DataSlot className="inline-block h-3 w-full align-middle">
                  {social.og.description ?? "—"}
                </DataSlot>
              </div>
            </div>
          </div>
        </div>

        {/* Twitter card preview */}
        <div className="mt-5">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">
              Twitter card
            </span>
            <span className="font-mono text-[9px] text-muted-foreground/70">
              {social.twitter.card ?? "—"}
            </span>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="relative aspect-2/1 w-full bg-linear-to-br from-secondary/15 via-muted to-primary/15">
              <div className="grain absolute inset-0" />
              {!refreshing && <RemoteImage alt="" src={social.twitter.image} />}
            </div>
            <div className="px-3 py-2">
              <div className="line-clamp-1 font-display text-[12px] text-foreground">
                <DataSlot className="inline-block h-3 w-36 align-middle">
                  {social.twitter.title ?? "—"}
                </DataSlot>
              </div>
              <div className="line-clamp-1 text-[10px] text-muted-foreground">
                <DataSlot className="inline-block h-2.5 w-48 align-middle">
                  {social.twitter.description ?? "—"}
                </DataSlot>
              </div>
              <div className="mt-0.5 font-mono text-[9px] text-muted-foreground/70 uppercase tracking-wider">
                <DataSlot className="inline-block h-2.5 w-20 align-middle">
                  {social.domain ?? "—"}
                </DataSlot>
              </div>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-sm border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              site · {social.twitter.site ?? "—"}
            </span>
            <span className="rounded-sm border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              creator · {social.twitter.creator ?? "—"}
            </span>
          </div>
        </div>
      </section>

      <div className="rule-hair" />

      {/* BREADCRUMBS */}
      {breadcrumbs.length > 0 && (
        <>
          <section>
            <SectionLabel
              hint="from JSON-LD"
              index="04"
              title="Breadcrumb trail"
            />
            <nav
              aria-label="Breadcrumb preview"
              className="mt-3 flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2.5"
            >
              {breadcrumbs.map((crumb, idx) => {
                const last = idx === breadcrumbs.length - 1;
                return (
                  <div className="flex items-center gap-1.5" key={crumb.url}>
                    <span
                      className={`font-display text-[12px] ${
                        last
                          ? "font-medium text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {crumb.name}
                    </span>
                    {!last && (
                      <ChevronRight
                        aria-hidden
                        className="size-3 text-muted-foreground/60"
                      />
                    )}
                  </div>
                );
              })}
            </nav>
          </section>

          <div className="rule-hair" />
        </>
      )}

      {/* HEADING TREE */}
      <section>
        <div className="flex items-center justify-between">
          <SectionLabel
            hint={`${headings.length} nodes`}
            index="05"
            title="Heading hierarchy"
          />
          <CopyButton label="Copy headings" payload={headingsText} size="sm" />
        </div>
        <ul className="mt-4 flex flex-col gap-1">
          {refreshing &&
            [0, 1, 2].map((i) => (
              <li className="tree-row text-[12px]" key={`skeleton-h-${i}`}>
                <DataSlot className="h-3 w-40 rounded-sm" />
              </li>
            ))}
          {!refreshing &&
            headings.map((h, i) => (
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

      {/* JSON-LD — VALIDATED BLOCKS */}
      <section>
        <div className="flex items-center justify-between">
          <SectionLabel
            hint={`${jsonldBlocks.length} blocks`}
            index="06"
            title="Structured data"
          />
          <CopyButton label="Copy JSON-LD" payload={jsonldRaw} size="sm" />
        </div>

        {refreshing && (
          <ul className="mt-3 flex flex-col gap-2">
            {[0, 1].map((i) => (
              <li key={`skeleton-jld-${i}`}>
                <DataSlot className="h-16 w-full rounded-md" />
              </li>
            ))}
          </ul>
        )}
        {!refreshing && <JsonLdTree blocks={jsonldBlocks} />}
      </section>

      <div className="rule-hair" />

      {/* SITE-LEVEL SIGNALS */}
      <SiteSignalsSection siteSignals={siteSignals} />

      <div className="rule-hair" />

      {/* IMAGES */}
      <section>
        <div className="flex items-center justify-between">
          <SectionLabel
            hint={`${images.length} found`}
            index="07"
            title="Images & alt text"
          />
          <CopyButton label="Copy images" payload={imagesText} size="sm" />
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-3">
          {refreshing &&
            [0, 1, 2, 3].map((i) => (
              <li className="flex flex-col gap-1.5" key={`skeleton-img-${i}`}>
                <DataSlot className="aspect-square w-full rounded-md" />
                <DataSlot className="h-2.5 w-24 rounded-sm" />
                <DataSlot className="h-2.5 w-32 rounded-sm" />
              </li>
            ))}
          {!refreshing &&
            images.map((img, idx) => (
              <li className="flex flex-col gap-1.5" key={`${img.src}-${idx}`}>
                <div className="relative aspect-square overflow-hidden rounded-md border border-border bg-linear-to-br from-muted to-card">
                  <RemoteImage
                    alt={img.alt ?? ""}
                    iconSize="size-5"
                    src={img.src}
                  />
                  {img.missingAlt && (
                    <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-sm bg-destructive/90 px-1 py-0.5 font-mono text-[8px] text-destructive-foreground uppercase tracking-wider">
                      <AlertTriangle className="size-2.5" />
                      no alt text
                    </span>
                  )}
                </div>
                <div className="line-clamp-1 font-mono text-[9px] text-muted-foreground">
                  {img.filename}
                </div>
                {img.missingAlt ? (
                  <div className="line-clamp-2 inline-flex items-center gap-1 text-[10px] text-destructive">
                    <AlertTriangle className="size-2.5 shrink-0" />
                    no alt text
                  </div>
                ) : (
                  <div className="line-clamp-2 text-[10px] text-foreground/80">
                    {img.alt}
                  </div>
                )}
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
