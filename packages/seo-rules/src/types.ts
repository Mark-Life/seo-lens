/** Raw page data extracted from the DOM by the content script */
export interface PageData {
  canonical: string | null;
  headings: HeadingData[];
  images: ImageData[];
  jsonLd: unknown[];
  links: LinkData[];
  metaDescription: string;
  openGraph: Record<string, string>;
  robotsMeta: string | null;
  title: string;
  twitterCard: Record<string, string>;
  url: string;
}

export interface HeadingData {
  level: number;
  text: string;
}

export interface ImageData {
  alt: string | null;
  src: string;
}

export interface LinkData {
  href: string;
  isExternal: boolean;
  rel: string | null;
  text: string;
}

/** Severity of an audit finding */
export type Severity = "error" | "warning" | "info" | "pass";

/** A single audit finding */
export interface AuditFinding {
  details?: string;
  message: string;
  ruleId: string;
  severity: Severity;
}

/** Result of running all audit rules against a page */
export interface AuditResult {
  findings: AuditFinding[];
  score: number;
  timestamp: number;
  url: string;
}

/** An audit rule — pure function from page data to findings */
export interface AuditRule {
  description: string;
  id: string;
  name: string;
  run: (page: PageData) => AuditFinding[];
  weight: number;
}
