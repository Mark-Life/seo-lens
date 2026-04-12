import type { PageData } from "../schema";

const ROBOTS_SPLIT = /[,\s]+/;

export type IndexingStatus = "ok" | "warn" | "bad";

export interface IndexingRow {
  key: string;
  label: string;
  source: string;
  status: IndexingStatus;
  value: string;
}

function parseRobots(robots: string | null): {
  index: boolean;
  follow: boolean;
} {
  if (robots === null) {
    return { index: true, follow: true };
  }
  const tokens = robots.toLowerCase().split(ROBOTS_SPLIT).filter(Boolean);
  return {
    index: !(tokens.includes("noindex") || tokens.includes("none")),
    follow: !(tokens.includes("nofollow") || tokens.includes("none")),
  };
}

export function deriveIndexingView(page: PageData): IndexingRow[] {
  const { index, follow } = parseRobots(page.robotsMeta);
  const canonical = page.canonical;
  const sameAsUrl = canonical !== null && canonical === page.url;
  let canonicalValue: string;
  if (canonical === null) {
    canonicalValue = "absent";
  } else if (sameAsUrl) {
    canonicalValue = "self";
  } else {
    canonicalValue = canonical;
  }

  return [
    {
      key: "indexable",
      label: "Indexable",
      source: "meta robots",
      status: index ? "ok" : "bad",
      value: index ? "Yes" : "No",
    },
    {
      key: "follow",
      label: "Follow links",
      source: "meta robots",
      status: follow ? "ok" : "warn",
      value: follow ? "Yes" : "No",
    },
    {
      key: "canonical",
      label: "Canonical",
      source: "<link rel=canonical>",
      status: canonical === null ? "warn" : "ok",
      value: canonicalValue,
    },
  ];
}
