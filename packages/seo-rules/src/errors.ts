import { Schema } from "effect";
import { PageUrl, TabId } from "./schema";

export class ExtractionFailed extends Schema.TaggedError<ExtractionFailed>()(
  "ExtractionFailed",
  {
    tabId: TabId,
    cause: Schema.Defect,
  }
) {}

export class NoActiveTab extends Schema.TaggedError<NoActiveTab>()(
  "NoActiveTab",
  {}
) {}

export class TabNotReady extends Schema.TaggedError<TabNotReady>()(
  "TabNotReady",
  {
    tabId: TabId,
  }
) {}

export class RestrictedUrl extends Schema.TaggedError<RestrictedUrl>()(
  "RestrictedUrl",
  {
    url: Schema.String,
  }
) {}

export class FetchFailed extends Schema.TaggedError<FetchFailed>()(
  "FetchFailed",
  {
    url: PageUrl,
    status: Schema.optional(Schema.Number),
    cause: Schema.Defect,
  }
) {}

export class AuditFailed extends Schema.TaggedError<AuditFailed>()(
  "AuditFailed",
  {
    ruleId: Schema.String,
    cause: Schema.Defect,
  }
) {}

export class RobotsFetchFailed extends Schema.TaggedError<RobotsFetchFailed>()(
  "RobotsFetchFailed",
  {
    url: PageUrl,
    status: Schema.optional(Schema.Number),
    cause: Schema.Defect,
  }
) {}

export class SitemapFetchFailed extends Schema.TaggedError<SitemapFetchFailed>()(
  "SitemapFetchFailed",
  {
    url: PageUrl,
    status: Schema.optional(Schema.Number),
    cause: Schema.Defect,
  }
) {}

export class SecurityTxtFetchFailed extends Schema.TaggedError<SecurityTxtFetchFailed>()(
  "SecurityTxtFetchFailed",
  {
    url: PageUrl,
    status: Schema.optional(Schema.Number),
    cause: Schema.Defect,
  }
) {}

export class ManifestFetchFailed extends Schema.TaggedError<ManifestFetchFailed>()(
  "ManifestFetchFailed",
  {
    url: PageUrl,
    status: Schema.optional(Schema.Number),
    cause: Schema.Defect,
  }
) {}

export class FaviconFetchFailed extends Schema.TaggedError<FaviconFetchFailed>()(
  "FaviconFetchFailed",
  {
    url: PageUrl,
    status: Schema.optional(Schema.Number),
    cause: Schema.Defect,
  }
) {}

export class FeedFetchFailed extends Schema.TaggedError<FeedFetchFailed>()(
  "FeedFetchFailed",
  {
    url: PageUrl,
    status: Schema.optional(Schema.Number),
    cause: Schema.Defect,
  }
) {}

export class LlmsTxtFetchFailed extends Schema.TaggedError<LlmsTxtFetchFailed>()(
  "LlmsTxtFetchFailed",
  {
    url: PageUrl,
    status: Schema.optional(Schema.Number),
    cause: Schema.Defect,
  }
) {}

export class HostProbeFailed extends Schema.TaggedError<HostProbeFailed>()(
  "HostProbeFailed",
  {
    url: PageUrl,
    status: Schema.optional(Schema.Number),
    cause: Schema.Defect,
  }
) {}
