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

export const FAQPageRecommended = Schema.Struct({});

export const faqPageSpec: RichResultSpec = {
  type: "FAQPage",
  subtypes: [],
  required: FAQPageRequired,
  recommended: FAQPageRecommended,
  docUrl:
    "https://developers.google.com/search/docs/appearance/structured-data/faqpage",
};
