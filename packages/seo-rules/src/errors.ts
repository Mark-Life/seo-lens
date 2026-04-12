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
