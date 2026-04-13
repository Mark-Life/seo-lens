import {
  AuditFailed,
  type AuditResult,
  defaultRules,
  type PageData,
  type PageSignals,
  runAudit,
} from "@workspace/seo-rules";
import { Context, Effect, Layer } from "effect";

export interface AuditorShape {
  readonly audit: (
    page: PageData,
    signals: PageSignals
  ) => Effect.Effect<AuditResult, AuditFailed>;
}

export class Auditor extends Context.Tag("Auditor")<Auditor, AuditorShape>() {
  static readonly layer = Layer.succeed(
    Auditor,
    Auditor.of({
      audit: Effect.fn("Auditor.audit")(function* (
        page: PageData,
        signals: PageSignals
      ) {
        return yield* Effect.try({
          try: () => runAudit(page, signals, [...defaultRules]),
          catch: (cause) =>
            new AuditFailed({ ruleId: "engine.internal", cause }),
        });
      }),
    })
  );

  static readonly testLayer = (
    impl: (page: PageData, signals: PageSignals) => AuditResult = (
      page,
      signals
    ) => runAudit(page, signals, [...defaultRules])
  ) =>
    Layer.succeed(
      Auditor,
      Auditor.of({
        audit: (page, signals) => Effect.sync(() => impl(page, signals)),
      })
    );
}
