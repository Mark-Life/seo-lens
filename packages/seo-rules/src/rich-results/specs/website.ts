import { Schema } from "effect";
import type { RichResultSpec } from "../registry";

/**
 * WebSite SEO fields. Not a dedicated Google Rich Result, but `potentialAction`
 * drives the Sitelinks Searchbox and the rest are common discoverability
 * signals (publisher, inLanguage, alternateName, sameAs, etc.).
 */
export const WebSiteRequired = Schema.Struct({
  "@type": Schema.Literal("WebSite"),
  name: Schema.String,
  url: Schema.String,
});

export const WebSiteRecommended = Schema.Struct({
  description: Schema.String,
  alternateName: Schema.Unknown,
  inLanguage: Schema.Unknown,
  publisher: Schema.Unknown,
  sameAs: Schema.Unknown,
  potentialAction: Schema.Unknown,
});

export const websiteSpec: RichResultSpec = {
  type: "WebSite",
  subtypes: [],
  required: WebSiteRequired,
  recommended: WebSiteRecommended,
  docUrl: "https://schema.org/WebSite",
};
