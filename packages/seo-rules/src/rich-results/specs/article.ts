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

const Person = Schema.Struct({
  "@type": Schema.Literal("Person"),
  name: Schema.String,
});

const Organization = Schema.Struct({
  "@type": Schema.Literal("Organization"),
  name: Schema.String,
});

const AuthorSingle = Schema.Union(Person, Organization);
const AuthorValue = Schema.Union(AuthorSingle, Schema.Array(AuthorSingle));

/** Google Article Rich Results — required fields. */
export const ArticleRequired = Schema.Struct({
  "@type": Schema.Literal("Article", "NewsArticle", "BlogPosting"),
  headline: Schema.String,
  image: ImageValue,
  datePublished: Schema.String,
  author: AuthorValue,
});

/**
 * Google Article Rich Results — recommended fields.
 * Fields are required here so missing ones surface as decode errors,
 * which the validator maps to `warning` severity.
 */
export const ArticleRecommended = Schema.Struct({
  dateModified: Schema.String,
  publisher: Schema.Unknown,
});

export const articleSpec: RichResultSpec = {
  type: "Article",
  subtypes: ["NewsArticle", "BlogPosting"],
  required: ArticleRequired,
  recommended: ArticleRecommended,
  docUrl:
    "https://developers.google.com/search/docs/appearance/structured-data/article",
};
