import { Schema } from "effect";
import type { RichResultSpec } from "../registry";

/**
 * Organization SEO fields. Covers generic organizations; LocalBusiness has
 * its own spec and takes priority via direct registration. Google uses `logo`,
 * `sameAs`, and contact info for knowledge-panel signals.
 */
export const OrganizationRequired = Schema.Struct({
  "@type": Schema.String,
  name: Schema.String,
  url: Schema.String,
});

export const OrganizationRecommended = Schema.Struct({
  logo: Schema.Unknown,
  sameAs: Schema.Unknown,
  description: Schema.String,
  contactPoint: Schema.Unknown,
  address: Schema.Unknown,
  email: Schema.String,
  telephone: Schema.String,
  foundingDate: Schema.String,
  founder: Schema.Unknown,
  numberOfEmployees: Schema.Unknown,
  slogan: Schema.String,
});

export const organizationSpec: RichResultSpec = {
  type: "Organization",
  subtypes: [],
  required: OrganizationRequired,
  recommended: OrganizationRecommended,
  docUrl: "https://schema.org/Organization",
};
