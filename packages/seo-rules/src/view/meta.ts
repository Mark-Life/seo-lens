import type { PageData } from "../schema";

export interface MetaView {
  canonical: string | null;
  charset: string | null;
  description: string | null;
  lang: string | null;
  robots: string | null;
  title: string | null;
  viewport: string | null;
}

const blankToNull = (s: string): string | null => (s.length > 0 ? s : null);

export function deriveMetaView(page: PageData): MetaView {
  return {
    title: blankToNull(page.title),
    description: blankToNull(page.metaDescription),
    canonical: page.canonical,
    robots: page.robotsMeta,
    viewport: null,
    lang: null,
    charset: null,
  };
}
