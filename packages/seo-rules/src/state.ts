import type { AuditState } from "./shapes";

/**
 * Construct an Idle audit state without pulling `effect/Schema` into the
 * caller's runtime graph. The object is structurally compatible with the
 * `Idle` tagged class for the purposes of `_tag`-switch narrowing.
 */
export const idleState = (): AuditState =>
  ({ _tag: "Idle" }) as unknown as AuditState;
