import { Schema } from "effect";
import type { RichResultSpec } from "../registry";

const Answer = Schema.Struct({
  "@type": Schema.Literal("Answer"),
  text: Schema.String,
});

const Question = Schema.Struct({
  "@type": Schema.Literal("Question"),
  name: Schema.String,
  acceptedAnswer: Answer,
});

/** Google FAQ Rich Results — required fields. */
export const FAQPageRequired = Schema.Struct({
  "@type": Schema.Literal("FAQPage"),
  mainEntity: Schema.Array(Question),
});

export const FAQPageRecommended = Schema.Struct({
  description: Schema.String,
  inLanguage: Schema.Unknown,
  author: Schema.Unknown,
  datePublished: Schema.String,
  dateModified: Schema.String,
});

export const faqPageSpec: RichResultSpec = {
  type: "FAQPage",
  subtypes: [],
  required: FAQPageRequired,
  recommended: FAQPageRecommended,
  docUrl:
    "https://developers.google.com/search/docs/appearance/structured-data/faqpage",
  restricted: {
    reason:
      "Google shows FAQ rich results only for well-known, authoritative government or health-focused sites. Markup remains valid for other surfaces.",
    since: "2023",
  },
};
