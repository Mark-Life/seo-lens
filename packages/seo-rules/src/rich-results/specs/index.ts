import type { RichResultSpec } from "../registry";
import { articleSpec } from "./article";
import { breadcrumbListSpec } from "./breadcrumb-list";
import { eventSpec } from "./event";
import { faqPageSpec } from "./faq-page";
import { howToSpec } from "./how-to";
import { jobPostingSpec } from "./job-posting";
import { localBusinessSpec } from "./local-business";
import { productSpec } from "./product";
import { recipeSpec } from "./recipe";
import { videoObjectSpec } from "./video-object";

/** Registered Google Rich Results specs. */
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
];
