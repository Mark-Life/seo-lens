import {
  deriveBreadcrumbs,
  deriveImageGallery,
  deriveIndexingView,
  deriveJsonLdBlocks,
  deriveMetaView,
  deriveSocialView,
  type IndexingStatus,
  type PageData,
} from "@workspace/seo-rules";
import { ChevronRight, Image as ImageIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { DataSlot, useIsRefreshing } from "../lib/refresh-context";
import { CopyButton } from "./copy-button";
import { SectionLabel } from "./section-label";

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
}

export function InspectTab({ page }: InspectTabProps) {
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
  const jsonldRaw = useMemo(() => JSON.stringify(page.jsonLd, null, 2), [page]);

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
        <SectionLabel
          hint="what bots see"
          index="02"
          title="Indexing & robots"
        />
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
        <SectionLabel hint="OG · Twitter" index="03" title="Social previews" />

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
            <div className="relative aspect-[1200/630] w-full bg-gradient-to-br from-primary/15 via-muted to-secondary/15">
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
            <div className="relative aspect-[2/1] w-full bg-gradient-to-br from-secondary/15 via-muted to-primary/15">
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
        <SectionLabel
          hint={`${headings.length} nodes`}
          index="05"
          title="Heading hierarchy"
        />
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

      {/* JSON-LD — VALIDATED BLOCKS + RAW */}
      <section>
        <div className="flex items-center justify-between">
          <SectionLabel
            hint={`${jsonldBlocks.length} blocks`}
            index="06"
            title="Structured data"
          />
          <CopyButton label="Copy JSON-LD" payload={jsonldRaw} size="sm" />
        </div>

        {/* Validated block list */}
        <ul className="mt-3 flex flex-col gap-2">
          {refreshing &&
            [0, 1].map((i) => (
              <li key={`skeleton-jld-${i}`}>
                <DataSlot className="h-16 w-full rounded-md" />
              </li>
            ))}
          {!refreshing &&
            jsonldBlocks.map((block) => (
              <li
                className={`overflow-hidden rounded-md border bg-card ${
                  block.valid
                    ? "border-border"
                    : "border-destructive/50 ring-1 ring-destructive/20"
                }`}
                key={block.id}
              >
                <div className="flex items-center gap-2 border-border/60 border-b px-3 py-2">
                  <span
                    className={`font-mono text-[9px] uppercase tracking-wider ${
                      block.valid ? "text-primary" : "text-destructive"
                    }`}
                  >
                    {block.valid ? "schema.org ✓" : "schema.org ✕"}
                  </span>
                  <span
                    className={`font-display text-[12px] ${
                      block.valid ? "text-foreground" : "text-destructive"
                    }`}
                  >
                    {block.type}
                  </span>
                  {block.note && (
                    <span className="ml-auto font-mono text-[9px] text-destructive/90 italic">
                      {block.note}
                    </span>
                  )}
                </div>
                <div className="flex flex-col px-3 py-2">
                  {block.fields.map((f, idx) => (
                    <div
                      className="kv-row text-[11px]"
                      key={`${block.id}-${idx}`}
                    >
                      <span className="font-mono text-muted-foreground">
                        {f.key}
                      </span>
                      <span className="kv-leader" />
                      <span className="max-w-[180px] truncate font-mono text-foreground">
                        {f.value}
                      </span>
                    </div>
                  ))}
                </div>
              </li>
            ))}
        </ul>

        {/* Raw source */}
        {jsonldBlocks.length > 0 && (
          <details className="group mt-3">
            <summary className="flex cursor-pointer items-center gap-1.5 font-mono text-[9px] text-muted-foreground uppercase tracking-widest hover:text-foreground">
              <ChevronRight
                aria-hidden
                className="size-3 transition-transform group-open:rotate-90"
              />
              View raw source
            </summary>
            <pre className="mt-2 max-h-72 overflow-auto rounded-md border border-border bg-foreground/5 p-3 font-mono text-[10.5px] text-foreground leading-relaxed">
              <code>{jsonldRaw}</code>
            </pre>
          </details>
        )}
      </section>

      <div className="rule-hair" />

      {/* IMAGES */}
      <section>
        <SectionLabel
          hint={`${images.length} found`}
          index="07"
          title="Images & alt text"
        />
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
                <div className="relative aspect-square overflow-hidden rounded-md border border-border bg-gradient-to-br from-muted to-card">
                  <RemoteImage
                    alt={img.alt ?? ""}
                    iconSize="size-5"
                    src={img.src}
                  />
                  {img.missingAlt && (
                    <span className="absolute top-1.5 left-1.5 rounded-sm bg-destructive/90 px-1 py-0.5 font-mono text-[8px] text-destructive-foreground uppercase tracking-wider">
                      no alt
                    </span>
                  )}
                </div>
                <div className="line-clamp-1 font-mono text-[9px] text-muted-foreground">
                  {img.filename}
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
