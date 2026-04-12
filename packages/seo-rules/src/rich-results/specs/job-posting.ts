import { Schema } from "effect";
import type { RichResultSpec } from "../registry";

const Organization = Schema.Struct({
  "@type": Schema.Literal("Organization"),
  name: Schema.String,
});

const Place = Schema.Struct({
  "@type": Schema.Literal("Place"),
  address: Schema.Unknown,
});

const JobLocationValue = Schema.Union(Place, Schema.Array(Place));

/** Google JobPosting Rich Results — required fields. */
export const JobPostingRequired = Schema.Struct({
  "@type": Schema.Literal("JobPosting"),
  title: Schema.String,
  description: Schema.String,
  datePosted: Schema.String,
  hiringOrganization: Organization,
  jobLocation: JobLocationValue,
});

export const JobPostingRecommended = Schema.Struct({
  baseSalary: Schema.Unknown,
  employmentType: Schema.Unknown,
  validThrough: Schema.String,
  identifier: Schema.Unknown,
  jobLocationType: Schema.Unknown,
  applicantLocationRequirements: Schema.Unknown,
  directApply: Schema.Unknown,
  educationRequirements: Schema.Unknown,
  experienceRequirements: Schema.Unknown,
});

export const jobPostingSpec: RichResultSpec = {
  type: "JobPosting",
  subtypes: [],
  required: JobPostingRequired,
  recommended: JobPostingRecommended,
  docUrl:
    "https://developers.google.com/search/docs/appearance/structured-data/job-posting",
};
