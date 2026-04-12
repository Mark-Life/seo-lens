import { Schema } from "effect";
import type { RichResultSpec } from "../registry";

/** Google Event Rich Results — required fields. */
export const EventRequired = Schema.Struct({
  "@type": Schema.String,
  name: Schema.String,
  startDate: Schema.String,
  location: Schema.Unknown,
});

export const EventRecommended = Schema.Struct({
  endDate: Schema.String,
  description: Schema.String,
  image: Schema.Unknown,
  offers: Schema.Unknown,
  performer: Schema.Unknown,
  organizer: Schema.Unknown,
  eventStatus: Schema.Unknown,
  eventAttendanceMode: Schema.Unknown,
  previousStartDate: Schema.String,
  url: Schema.String,
});

export const eventSpec: RichResultSpec = {
  type: "Event",
  subtypes: [],
  required: EventRequired,
  recommended: EventRecommended,
  docUrl:
    "https://developers.google.com/search/docs/appearance/structured-data/event",
};
