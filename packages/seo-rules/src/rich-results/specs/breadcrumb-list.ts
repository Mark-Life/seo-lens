import { Schema } from "effect";
import type { RichResultSpec } from "../registry";

const ListItem = Schema.Struct({
  "@type": Schema.Literal("ListItem"),
  position: Schema.Union(Schema.Number, Schema.String),
  name: Schema.optional(Schema.String),
  item: Schema.optional(Schema.Unknown),
});

/** Google Breadcrumb Rich Results — required fields. */
export const BreadcrumbListRequired = Schema.Struct({
  "@type": Schema.Literal("BreadcrumbList"),
  itemListElement: Schema.Array(ListItem),
});

/** Recommended fields (none distinct from required for breadcrumbs). */
export const BreadcrumbListRecommended = Schema.Struct({});

export const breadcrumbListSpec: RichResultSpec = {
  type: "BreadcrumbList",
  subtypes: [],
  required: BreadcrumbListRequired,
  recommended: BreadcrumbListRecommended,
  docUrl:
    "https://developers.google.com/search/docs/appearance/structured-data/breadcrumb",
};
