import { Schema } from "effect";
import type { RichResultSpec } from "../registry";

/**
 * Person SEO fields. No dedicated Google Rich Result — Person mostly feeds
 * knowledge panels and author markup on Article. The `recommended` list is
 * intentionally broad to teach users which fields exist.
 */
export const PersonRequired = Schema.Struct({
  "@type": Schema.Literal("Person"),
  name: Schema.String,
});

export const PersonRecommended = Schema.Struct({
  url: Schema.String,
  jobTitle: Schema.String,
  image: Schema.Unknown,
  description: Schema.String,
  worksFor: Schema.Unknown,
  sameAs: Schema.Unknown,
  email: Schema.String,
  givenName: Schema.String,
  familyName: Schema.String,
  birthDate: Schema.String,
});

export const personSpec: RichResultSpec = {
  type: "Person",
  subtypes: [],
  required: PersonRequired,
  recommended: PersonRecommended,
  docUrl: "https://schema.org/Person",
};
