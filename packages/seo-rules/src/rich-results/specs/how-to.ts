import { Schema } from "effect";
import type { RichResultSpec } from "../registry";

const HowToStep = Schema.Struct({
  "@type": Schema.Literal("HowToStep"),
  text: Schema.optional(Schema.String),
  name: Schema.optional(Schema.String),
});

/** Google HowTo Rich Results — required fields. */
export const HowToRequired = Schema.Struct({
  "@type": Schema.Literal("HowTo"),
  name: Schema.String,
  step: Schema.Array(HowToStep),
});

export const HowToRecommended = Schema.Struct({
  totalTime: Schema.String,
  supply: Schema.Unknown,
  tool: Schema.Unknown,
  estimatedCost: Schema.Unknown,
  image: Schema.Unknown,
});

export const howToSpec: RichResultSpec = {
  type: "HowTo",
  subtypes: [],
  required: HowToRequired,
  recommended: HowToRecommended,
  docUrl:
    "https://developers.google.com/search/docs/appearance/structured-data/how-to",
  deprecated: {
    reason:
      "Google removed HowTo rich results from Search in September 2023. Markup remains valid for Bing, AI crawlers, and voice assistants.",
    since: "2023-09-14",
  },
};
