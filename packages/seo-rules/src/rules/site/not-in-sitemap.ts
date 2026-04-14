import {
  AuditFinding,
  FindingContext,
  type PageData,
  type PageSignals,
  RuleId,
  type SiteSignals,
} from "../../schema";
import type { AuditRule } from "../../types";
import { isPathDisallowed } from "./robots-matcher";

const ruleId = RuleId.make("site.not-in-sitemap");

/**
 * Normalize a URL for sitemap membership comparison:
 * lowercase host, strip trailing slash from non-root path, drop fragment.
 * Query string is kept — pages with distinct querystrings can be distinct.
 */
const normalize = (raw: string): string | null => {
  try {
    const u = new URL(raw);
    const host = u.host.toLowerCase();
    const path =
      u.pathname.length > 1 && u.pathname.endsWith("/")
        ? u.pathname.slice(0, -1)
        : u.pathname;
    return `${u.protocol}//${host}${path}${u.search}`;
  } catch {
    return null;
  }
};

const isPageIndexable = (page: PageData, siteSignals: SiteSignals): boolean => {
  const robotsMeta = page.robotsMeta?.toLowerCase() ?? "";
  if (robotsMeta.includes("noindex") || robotsMeta.includes("none")) {
    return false;
  }
  if (siteSignals.robots) {
    let path: string;
    try {
      path = new URL(page.url).pathname;
    } catch {
      return true;
    }
    if (isPathDisallowed(siteSignals.robots, path, "*").disallowed) {
      return false;
    }
  }
  return true;
};

export const siteNotInSitemapRule: AuditRule = {
  id: ruleId,
  name: "Page not in sitemap",
  description:
    "Warns when an indexable page is absent from every discovered sitemap",
  category: "site",
  weight: 4,
  run(page: PageData, _signals: PageSignals, siteSignals?: SiteSignals) {
    if (!siteSignals || siteSignals.sitemaps.length === 0) {
      return [];
    }
    if (!isPageIndexable(page, siteSignals)) {
      return [];
    }
    const target = normalize(page.url);
    if (!target) {
      return [];
    }
    for (const sm of siteSignals.sitemaps) {
      for (const entry of sm.entries) {
        if (normalize(entry.loc) === target) {
          return [];
        }
      }
    }
    return [
      AuditFinding.make({
        id: `${ruleId}#missing`,
        ruleId,
        category: "site",
        severity: "warning",
        title: "Page is not listed in any sitemap",
        message:
          "This indexable page is absent from every discovered sitemap, which slows search engine discovery.",
        context: [
          FindingContext.make({ label: "url", value: page.url }),
          FindingContext.make({
            label: "sitemaps checked",
            value: String(siteSignals.sitemaps.length),
          }),
        ],
        grep: page.url,
      }),
    ];
  },
};
