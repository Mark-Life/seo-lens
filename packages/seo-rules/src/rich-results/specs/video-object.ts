import { Schema } from "effect";
import type { RichResultSpec } from "../registry";

const ImageObject = Schema.Struct({
  "@type": Schema.Literal("ImageObject"),
  url: Schema.String,
});

const ThumbnailValue = Schema.Union(
  Schema.String,
  ImageObject,
  Schema.Array(Schema.Union(Schema.String, ImageObject))
);

/** Google VideoObject Rich Results — required fields. */
export const VideoObjectRequired = Schema.Struct({
  "@type": Schema.Literal("VideoObject"),
  name: Schema.String,
  description: Schema.String,
  thumbnailUrl: ThumbnailValue,
  uploadDate: Schema.String,
});

export const VideoObjectRecommended = Schema.Struct({
  contentUrl: Schema.String,
  embedUrl: Schema.String,
  duration: Schema.String,
  interactionStatistic: Schema.Unknown,
  hasPart: Schema.Unknown,
  publication: Schema.Unknown,
  regionsAllowed: Schema.Unknown,
  expires: Schema.String,
});

export const videoObjectSpec: RichResultSpec = {
  type: "VideoObject",
  subtypes: [],
  required: VideoObjectRequired,
  recommended: VideoObjectRecommended,
  docUrl:
    "https://developers.google.com/search/docs/appearance/structured-data/video",
};
