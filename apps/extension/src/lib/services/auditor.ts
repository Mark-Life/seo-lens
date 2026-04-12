import {
  AuditFailed,
  type AuditResult,
  defaultRules,
  type PageData,
  runAudit,
} from "@workspace/seo-rules";
import { Context, Effect, Layer } from "effect";

export interface AuditorShape {
  readonly audit: (page: PageData) => Effect.Effect<AuditResult, AuditFailed>;
}

export class Auditor extends Context.Tag("Auditor")<Auditor, AuditorShape>() {
  static readonly layer = Layer.succeed(
    Auditor,
    Auditor.of({
      audit: Effect.fn("Auditor.audit")(function* (page: PageData) {
        return yield* Effect.try({
          try: () => runAudit(page, [...defaultRules]),
          catch: (cause) =>
            new AuditFailed({ ruleId: "engine.internal", cause }),
        });
      }),
    })
  );

  static readonly testLayer = (
    impl: (page: PageData) => AuditResult = (page) =>
      runAudit(page, [...defaultRules])
  ) =>
    Layer.succeed(
      Auditor,
      Auditor.of({
        audit: (page) => Effect.sync(() => impl(page)),
      })
    );
}
