import { defaultRules, pageRules } from "@workspace/seo-rules";
import { runAudit } from "@workspace/seo-rules/engine";
import { AuditFailed } from "@workspace/seo-rules/errors";
import type {
  AuditResult,
  PageData,
  PageSignals,
  SiteSignals,
} from "@workspace/seo-rules/schema";
import { Context, Effect, Layer } from "effect";

export interface AuditorShape {
  /** Run all rules including site-level checks. */
  readonly audit: (
    page: PageData,
    signals: PageSignals,
    siteSignals: SiteSignals
  ) => Effect.Effect<AuditResult, AuditFailed>;
  /** Run page-level rules only (no site signals needed). */
  readonly auditPage: (
    page: PageData,
    signals: PageSignals
  ) => Effect.Effect<AuditResult, AuditFailed>;
}

export class Auditor extends Context.Tag("Auditor")<Auditor, AuditorShape>() {
  static readonly layer = Layer.succeed(
    Auditor,
    Auditor.of({
      auditPage: Effect.fn("Auditor.auditPage")(function* (
        page: PageData,
        signals: PageSignals
      ) {
        return yield* Effect.try({
          try: () => runAudit(page, signals, null, [...pageRules], "page"),
          catch: (cause) =>
            new AuditFailed({ ruleId: "engine.internal", cause }),
        });
      }),
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
        auditPage: (page, signals) =>
          Effect.sync(() =>
            impl(page, signals, null as unknown as SiteSignals)
          ),
        audit: (page, signals, siteSignals) =>
          Effect.sync(() => impl(page, signals, siteSignals)),
      })
    );
}
