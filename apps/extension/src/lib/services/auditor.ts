import {
  AuditFailed,
  type AuditResult,
  defaultRules,
  type PageData,
  type PageSignals,
  runAudit,
  type SiteSignals,
} from "@workspace/seo-rules";
import { Context, Effect, Layer } from "effect";

export interface AuditorShape {
  readonly audit: (
    page: PageData,
    signals: PageSignals,
    siteSignals: SiteSignals
  ) => Effect.Effect<AuditResult, AuditFailed>;
}

export class Auditor extends Context.Tag("Auditor")<Auditor, AuditorShape>() {
  static readonly layer = Layer.succeed(
    Auditor,
    Auditor.of({
      audit: Effect.fn("Auditor.audit")(function* (
        page: PageData,
        signals: PageSignals,
        siteSignals: SiteSignals
      ) {
        return yield* Effect.try({
          try: () => runAudit(page, signals, siteSignals, [...defaultRules]),
          catch: (cause) =>
            new AuditFailed({ ruleId: "engine.internal", cause }),
        });
      }),
    })
  );

  static readonly testLayer = (
    impl: (
      page: PageData,
      signals: PageSignals,
      siteSignals: SiteSignals
    ) => AuditResult = (page, signals, siteSignals) =>
      runAudit(page, signals, siteSignals, [...defaultRules])
  ) =>
    Layer.succeed(
      Auditor,
      Auditor.of({
        audit: (page, signals, siteSignals) =>
          Effect.sync(() => impl(page, signals, siteSignals)),
      })
    );
}
