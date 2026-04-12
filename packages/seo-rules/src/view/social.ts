import type { PageData } from "../schema";

export interface OgView {
  description: string | null;
  image: string | null;
  siteName: string | null;
  title: string | null;
  type: string | null;
}

export interface TwitterView {
  card: string | null;
  creator: string | null;
  description: string | null;
  image: string | null;
  site: string | null;
  title: string | null;
}

export interface SocialView {
  domain: string | null;
  og: OgView;
  twitter: TwitterView;
}

const pick = (record: Record<string, string>, key: string): string | null => {
  const v = record[key];
  return v != null && v.length > 0 ? v : null;
};

function deriveDomain(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export function deriveSocialView(page: PageData): SocialView {
  const og = page.openGraph;
  const tw = page.twitterCard;
  return {
    og: {
      title: pick(og, "og:title"),
      description: pick(og, "og:description"),
      image: pick(og, "og:image"),
      type: pick(og, "og:type"),
      siteName: pick(og, "og:site_name"),
    },
    twitter: {
      card: pick(tw, "twitter:card"),
      site: pick(tw, "twitter:site"),
      creator: pick(tw, "twitter:creator"),
      title: pick(tw, "twitter:title") ?? pick(og, "og:title"),
      description:
        pick(tw, "twitter:description") ?? pick(og, "og:description"),
      image: pick(tw, "twitter:image") ?? pick(og, "og:image"),
    },
    domain: deriveDomain(page.url),
  };
}
