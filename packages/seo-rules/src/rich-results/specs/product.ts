import { Schema } from "effect";
import type { RichResultSpec } from "../registry";

const ImageObject = Schema.Struct({
  "@type": Schema.Literal("ImageObject"),
  url: Schema.String,
});

const ImageValue = Schema.Union(
  Schema.String,
  ImageObject,
  Schema.Array(Schema.Union(Schema.String, ImageObject))
);

/** Google Product Rich Results — required fields. */
export const ProductRequired = Schema.Struct({
  "@type": Schema.Literal("Product"),
  name: Schema.String,
  image: ImageValue,
});

/**
 * Google Product Rich Results — recommended fields.
 * Required here so missing ones surface as warnings.
 */
export const ProductRecommended = Schema.Struct({
  description: Schema.String,
  offers: Schema.Unknown,
  brand: Schema.Unknown,
  aggregateRating: Schema.Unknown,
  review: Schema.Unknown,
});

export const productSpec: RichResultSpec = {
  type: "Product",
  subtypes: [],
  required: ProductRequired,
  recommended: ProductRecommended,
  docUrl:
    "https://developers.google.com/search/docs/appearance/structured-data/product",
};
