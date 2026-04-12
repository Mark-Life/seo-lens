import { Schema } from "effect";
import type { RichResultSpec } from "../registry";

const PostalAddress = Schema.Struct({
  "@type": Schema.Literal("PostalAddress"),
  streetAddress: Schema.optional(Schema.String),
  addressLocality: Schema.optional(Schema.String),
  addressRegion: Schema.optional(Schema.String),
  postalCode: Schema.optional(Schema.String),
  addressCountry: Schema.optional(Schema.Unknown),
});

const AddressValue = Schema.Union(Schema.String, PostalAddress);

/** Google LocalBusiness Rich Results — required fields. */
export const LocalBusinessRequired = Schema.Struct({
  "@type": Schema.String,
  name: Schema.String,
  address: AddressValue,
});

export const LocalBusinessRecommended = Schema.Struct({
  image: Schema.Unknown,
  telephone: Schema.String,
  url: Schema.String,
  priceRange: Schema.String,
  openingHoursSpecification: Schema.Unknown,
  geo: Schema.Unknown,
  aggregateRating: Schema.Unknown,
  review: Schema.Unknown,
  sameAs: Schema.Unknown,
  areaServed: Schema.Unknown,
});

export const localBusinessSpec: RichResultSpec = {
  type: "LocalBusiness",
  subtypes: [],
  required: LocalBusinessRequired,
  recommended: LocalBusinessRecommended,
  docUrl:
    "https://developers.google.com/search/docs/appearance/structured-data/local-business",
};
