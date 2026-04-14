import {
  AuditFinding,
  FindingContext,
  type PageData,
  type PageSignals,
  RuleId,
  type SiteSignals,
} from "../../schema";
import type { AuditRule } from "../../types";

const ruleId = RuleId.make("site.feed-broken");

const FEED_MIME = /^application\/(rss|atom)(\+xml)?$/i;

const resolveHref = (href: string, base: string): string | null => {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
};

export const siteFeedBrokenRule: AuditRule = {
  id: ruleId,
  name: "Declared feed unresolvable",
  description:
    'Warns when a <link rel="alternate"> feed declared on the page could not be fetched',
  category: "site",
  weight: 3,
  run(page: PageData, _signals: PageSignals, siteSignals?: SiteSignals) {
    if (!siteSignals) {
      return [];
    }
    const declared = page.headLinks.filter(
      (l) =>
        l.rel.toLowerCase().includes("alternate") &&
        l.type !== null &&
        FEED_MIME.test(l.type)
    );
    if (declared.length === 0) {
      return [];
    }
    const resolvableFeeds = new Set(
      siteSignals.feeds.filter((f) => f.resolvable).map((f) => String(f.url))
    );
    const broken: string[] = [];
    for (const l of declared) {
      const abs = resolveHref(l.href, page.url);
      if (abs && !resolvableFeeds.has(abs)) {
        broken.push(abs);
      }
    }
    if (broken.length === 0) {
      return [];
    }
    return [
      AuditFinding.make({
        id: `${ruleId}#broken`,
        ruleId,
        category: "site",
        severity: "warning",
        title: "Declared feed could not be fetched",
        message:
          'A <link rel="alternate"> feed on this page points at a URL that failed to resolve.',
        context: [
          FindingContext.make({
            label: "broken feeds",
            value: broken.join(", "),
          }),
        ],
        grep: broken[0],
      }),
    ];
  },
};
