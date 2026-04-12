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

/** Google Recipe Rich Results — required fields. */
export const RecipeRequired = Schema.Struct({
  "@type": Schema.Literal("Recipe"),
  name: Schema.String,
  image: ImageValue,
  recipeIngredient: Schema.Array(Schema.String),
  recipeInstructions: Schema.Unknown,
});

export const RecipeRecommended = Schema.Struct({
  author: Schema.Unknown,
  datePublished: Schema.String,
  description: Schema.String,
  prepTime: Schema.String,
  cookTime: Schema.String,
  totalTime: Schema.String,
  recipeYield: Schema.Unknown,
  nutrition: Schema.Unknown,
  aggregateRating: Schema.Unknown,
  video: Schema.Unknown,
  recipeCategory: Schema.String,
  recipeCuisine: Schema.String,
  keywords: Schema.Unknown,
  suitableForDiet: Schema.Unknown,
});

export const recipeSpec: RichResultSpec = {
  type: "Recipe",
  subtypes: [],
  required: RecipeRequired,
  recommended: RecipeRecommended,
  docUrl:
    "https://developers.google.com/search/docs/appearance/structured-data/recipe",
};
