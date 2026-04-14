import { type AuditState, Idle, type TabId } from "@workspace/seo-rules/schema";
import { Context, Effect, Layer, Stream, SubscriptionRef } from "effect";

export interface AuditBusShape {
  readonly publish: (tabId: TabId, state: AuditState) => Effect.Effect<void>;
  readonly state: (tabId: TabId) => Effect.Effect<AuditState>;
  readonly subscribe: (tabId: TabId) => Stream.Stream<AuditState>;
}

const makeBus = Effect.sync((): AuditBusShape => {
  const refs = new Map<TabId, SubscriptionRef.SubscriptionRef<AuditState>>();

  const getRef = (tabId: TabId) =>
    Effect.sync(() => refs.get(tabId)).pipe(
      Effect.flatMap((existing) =>
        existing
          ? Effect.succeed(existing)
          : SubscriptionRef.make<AuditState>(Idle.make()).pipe(
              Effect.tap((ref) => Effect.sync(() => refs.set(tabId, ref)))
            )
      )
    );

  return {
    publish: (tabId, state) =>
      getRef(tabId).pipe(
        Effect.flatMap((ref) => SubscriptionRef.set(ref, state)),
        Effect.withSpan("AuditBus.publish", {
          attributes: { tabId, tag: state._tag },
        })
      ),
    state: (tabId) =>
      getRef(tabId).pipe(Effect.flatMap((ref) => SubscriptionRef.get(ref))),
    subscribe: (tabId) =>
      Stream.unwrap(getRef(tabId).pipe(Effect.map((ref) => ref.changes))),
  };
});

export class AuditBus extends Context.Tag("AuditBus")<
  AuditBus,
  AuditBusShape
>() {
  static readonly layer = Layer.effect(AuditBus, makeBus);
  static readonly testLayer = Layer.effect(AuditBus, makeBus);
}
