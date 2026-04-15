import type {
  Favicon,
  Feed,
  HostProbeResult,
  LlmsTxt,
  RobotsTxt,
  SecurityTxt,
  Sitemap,
  SiteSignals,
  SoftFourOhFourProbe,
  WebManifest,
} from "@workspace/seo-rules/shapes";
import type { ReactNode } from "react";
import { CopyButton } from "./copy-button";
import { SectionLabel } from "./section-label";

interface RowProps {
  readonly children?: ReactNode;
  readonly copy?: string;
  readonly label: string;
  readonly tone?: "ok" | "warn" | "bad" | "muted";
  readonly value: string | null;
}

const toneDot: Record<NonNullable<RowProps["tone"]>, string> = {
  ok: "bg-primary",
  warn: "bg-secondary",
  bad: "bg-destructive",
  muted: "bg-muted-foreground/30",
};

const Row = ({ label, value, copy, tone = "muted", children }: RowProps) => (
  <div className="flex items-center gap-3 px-3 py-2">
    <span
      aria-hidden
      className={`size-1.5 shrink-0 rounded-full ${toneDot[tone]}`}
    />
    <div className="flex min-w-0 flex-1 flex-col">
      <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <span className="truncate font-mono text-[11px] text-foreground">
        {value ?? "—"}
      </span>
      {children}
    </div>
    {copy && value && (
      <CopyButton label={`Copy ${label}`} payload={copy} size="sm" />
    )}
  </div>
);

interface GroupProps {
  readonly children: ReactNode;
  readonly title: string;
}

const Group = ({ title, children }: GroupProps) => (
  <div className="mt-3 overflow-hidden rounded-md border border-border bg-card">
    <div className="border-border/60 border-b bg-muted/30 px-3 py-1.5">
      <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">
        {title}
      </span>
    </div>
    <div className="divide-y divide-border/60">{children}</div>
  </div>
);

const plural = (n: number, one: string) => (n === 1 ? one : `${one}s`);

// ─── Crawlers ──────────────────────────────────────────────────────────

const RobotsRow = ({ robots }: { robots: RobotsTxt | null }) => {
  if (!robots) {
    return <Row label="robots.txt" tone="muted" value={null} />;
  }
  const value = `${robots.groups.length} ${plural(robots.groups.length, "group")} · ${robots.sitemapUrls.length} ${plural(robots.sitemapUrls.length, "sitemap")}`;
  return (
    <Row copy={robots.rawText} label="robots.txt" tone="ok" value={value} />
  );
};

const SitemapsRow = ({ sitemaps }: { sitemaps: readonly Sitemap[] }) => {
  if (sitemaps.length === 0) {
    return <Row label="sitemaps" tone="muted" value={null} />;
  }
  const totalEntries = sitemaps.reduce((n, s) => n + s.entries.length, 0);
  const value = `${sitemaps.length} found · ${totalEntries} urls`;
  const copy = sitemaps.map((s) => s.url).join("\n");
  return (
    <Row copy={copy} label="sitemaps" tone="ok" value={value}>
      <ul className="mt-1 flex flex-col gap-0.5">
        {sitemaps.map((s) => (
          <li
            className="truncate font-mono text-[10px] text-muted-foreground"
            key={s.url}
          >
            {s.variant}/{s.kind} · {s.entries.length}
            {s.truncated ? "+" : ""} · {s.url}
          </li>
        ))}
      </ul>
    </Row>
  );
};

const LlmsTxtRow = ({ llmsTxt }: { llmsTxt: LlmsTxt | null }) => {
  if (!llmsTxt) {
    return <Row label="llms.txt" tone="muted" value={null} />;
  }
  return (
    <Row
      copy={llmsTxt.rawText}
      label="llms.txt"
      tone="ok"
      value={llmsTxt.url}
    />
  );
};

const CrawlersGroup = ({ siteSignals }: { siteSignals: SiteSignals }) => (
  <Group title="Crawlers">
    <RobotsRow robots={siteSignals.robots} />
    <SitemapsRow sitemaps={siteSignals.sitemaps} />
    <LlmsTxtRow llmsTxt={siteSignals.llmsTxt} />
  </Group>
);

// ─── Host ──────────────────────────────────────────────────────────────

const softLabelFor = (probe: SoftFourOhFourProbe) =>
  probe.isSoftFourOhFour
    ? `soft-404 (${probe.status})`
    : `healthy (${probe.status})`;

const SoftFourOhFourRow = ({
  probe,
}: {
  probe: SoftFourOhFourProbe | null;
}) => {
  if (!probe) {
    return <Row label="soft-404" tone="muted" value={null} />;
  }
  const tone: RowProps["tone"] = probe.isSoftFourOhFour ? "bad" : "ok";
  return (
    <Row label="soft-404" tone={tone} value={softLabelFor(probe)}>
      <span className="truncate font-mono text-[10px] text-muted-foreground">
        probe · {probe.probeUrl}
      </span>
    </Row>
  );
};

const formatHostVariant = (
  scheme: string,
  host: string,
  status: number | null,
  redirected: boolean
) => `${scheme}://${host} → ${status ?? "—"}${redirected ? " (↪)" : ""}`;

const CanonicalHostRow = ({ probe }: { probe: HostProbeResult | null }) => {
  if (!probe) {
    return <Row label="canonical host" tone="muted" value={null} />;
  }
  const tone: RowProps["tone"] = probe.canonicalHost ? "ok" : "warn";
  const label = probe.canonicalHost ?? "no canonical host";
  return (
    <Row
      copy={probe.canonicalHost ?? undefined}
      label="canonical host"
      tone={tone}
      value={label}
    >
      {probe.variants.length > 0 && (
        <ul className="mt-1 flex flex-col gap-0.5">
          {probe.variants.map((v) => (
            <li
              className="truncate font-mono text-[10px] text-muted-foreground"
              key={`${v.scheme}-${v.host}`}
            >
              {formatHostVariant(v.scheme, v.host, v.status, v.redirected)}
            </li>
          ))}
        </ul>
      )}
    </Row>
  );
};

const HostGroup = ({ siteSignals }: { siteSignals: SiteSignals }) => (
  <Group title="Host">
    <SoftFourOhFourRow probe={siteSignals.softFourOhFour} />
    <CanonicalHostRow probe={siteSignals.hostProbe} />
  </Group>
);

// ─── Metadata ──────────────────────────────────────────────────────────

const FaviconRow = ({ favicon }: { favicon: Favicon | null }) => {
  if (!favicon) {
    return <Row label="favicon" tone="muted" value={null} />;
  }
  const tone: RowProps["tone"] = favicon.resolvable ? "ok" : "warn";
  return (
    <Row copy={favicon.url} label="favicon" tone={tone} value={favicon.url}>
      {favicon.contentType && (
        <span className="font-mono text-[10px] text-muted-foreground">
          {favicon.contentType}
        </span>
      )}
    </Row>
  );
};

const ManifestRow = ({ manifest }: { manifest: WebManifest | null }) => {
  if (!manifest) {
    return <Row label="manifest" tone="muted" value={null} />;
  }
  return (
    <Row
      copy={manifest.url}
      label="manifest"
      tone="ok"
      value={manifest.name ?? manifest.url}
    >
      <span className="truncate font-mono text-[10px] text-muted-foreground">
        {manifest.url} · {manifest.icons.length} icons
      </span>
    </Row>
  );
};

const FeedsRow = ({ feeds }: { feeds: readonly Feed[] }) => {
  if (feeds.length === 0) {
    return <Row label="feeds" tone="muted" value={null} />;
  }
  const copy = feeds
    .map((f) => `${f.kind} ${f.url}${f.resolvable ? "" : " (broken)"}`)
    .join("\n");
  return (
    <Row copy={copy} label="feeds" tone="ok" value={`${feeds.length} found`}>
      <ul className="mt-1 flex flex-col gap-0.5">
        {feeds.map((f) => (
          <li
            className="truncate font-mono text-[10px] text-muted-foreground"
            key={f.url}
          >
            {f.kind} · {f.url}
            {!f.resolvable && " (broken)"}
          </li>
        ))}
      </ul>
    </Row>
  );
};

const MetadataGroup = ({ siteSignals }: { siteSignals: SiteSignals }) => (
  <Group title="Metadata">
    <FaviconRow favicon={siteSignals.favicon} />
    <ManifestRow manifest={siteSignals.manifest} />
    <FeedsRow feeds={siteSignals.feeds} />
  </Group>
);

// ─── Security ──────────────────────────────────────────────────────────

const SecurityTxtRow = ({
  securityTxt,
}: {
  securityTxt: SecurityTxt | null;
}) => {
  if (!securityTxt) {
    return <Row label="security.txt" tone="muted" value={null} />;
  }
  return (
    <Row
      copy={securityTxt.rawText}
      label="security.txt"
      tone="ok"
      value={securityTxt.url}
    >
      <div className="mt-0.5 flex flex-col gap-0.5">
        {securityTxt.contact.length > 0 && (
          <span className="truncate font-mono text-[10px] text-muted-foreground">
            contact · {securityTxt.contact.join(", ")}
          </span>
        )}
        {securityTxt.expires && (
          <span className="truncate font-mono text-[10px] text-muted-foreground">
            expires · {securityTxt.expires}
          </span>
        )}
        {securityTxt.policy && (
          <span className="truncate font-mono text-[10px] text-muted-foreground">
            policy · {securityTxt.policy}
          </span>
        )}
      </div>
    </Row>
  );
};

const SecurityGroup = ({ siteSignals }: { siteSignals: SiteSignals }) => (
  <Group title="Security">
    <SecurityTxtRow securityTxt={siteSignals.securityTxt} />
  </Group>
);

// ─── Section ───────────────────────────────────────────────────────────

interface SiteSignalsSectionProps {
  readonly siteSignals: SiteSignals;
}

export function SiteSignalsSection({ siteSignals }: SiteSignalsSectionProps) {
  return (
    <section>
      <SectionLabel hint="origin" index="08" title="Site-level signals" />
      <CrawlersGroup siteSignals={siteSignals} />
      <HostGroup siteSignals={siteSignals} />
      <MetadataGroup siteSignals={siteSignals} />
      <SecurityGroup siteSignals={siteSignals} />
    </section>
  );
}
