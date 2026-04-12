import type { RichResultSpec } from "../registry";
import { articleSpec } from "./article";
import { breadcrumbListSpec } from "./breadcrumb-list";
import { eventSpec } from "./event";
import { faqPageSpec } from "./faq-page";
import { howToSpec } from "./how-to";
import { jobPostingSpec } from "./job-posting";
import { localBusinessSpec } from "./local-business";
import { organizationSpec } from "./organization";
import { personSpec } from "./person";
import { productSpec } from "./product";
import { recipeSpec } from "./recipe";
import { videoObjectSpec } from "./video-object";
import { websiteSpec } from "./website";

/**
 * Registered SEO-fields specs. Mix of Google Rich Results types (Article,
 * Product, …) and general-purpose discoverability specs (WebSite, Person,
 * Organization) used to teach users which fields exist for each schema.org
 * class.
 */
export const specs: readonly RichResultSpec[] = [
  articleSpec,
  productSpec,
  breadcrumbListSpec,
  faqPageSpec,
  howToSpec,
  recipeSpec,
  eventSpec,
  localBusinessSpec,
  videoObjectSpec,
  jobPostingSpec,
  websiteSpec,
  organizationSpec,
  personSpec,
];
