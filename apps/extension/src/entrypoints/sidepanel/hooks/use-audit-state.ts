import type { AuditState } from "@workspace/seo-rules/shapes";
import { idleState } from "@workspace/seo-rules/state";
import { Effect, Fiber, Stream } from "effect";
import { useCallback, useEffect, useState } from "react";
import { useRuntime } from "@/lib/runtime";
import { PanelClient } from "@/lib/services/panel-client";

export const useAuditState = () => {
  const runtime = useRuntime();
  const [state, setState] = useState<AuditState>(idleState());

  useEffect(() => {
    const fiber = runtime.runFork(
      Effect.gen(function* () {
        const client = yield* PanelClient;
        yield* client.states.pipe(
          Stream.runForEach((s) => Effect.sync(() => setState(s)))
        );
      })
    );
    return () => {
      runtime.runFork(Fiber.interrupt(fiber));
    };
  }, [runtime]);

  const refresh = useCallback(() => {
    runtime.runFork(
      Effect.gen(function* () {
        const client = yield* PanelClient;
        yield* client.refresh;
      })
    );
  }, [runtime]);

  return { state, refresh };
};
