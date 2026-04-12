import { AuditState, Idle } from "@workspace/seo-rules";
import { Context, Effect, Layer, Schema, Stream } from "effect";
import type { Browser } from "wxt/browser";

const decodeState = Schema.decodeUnknown(AuditState);

export interface PanelClientShape {
  readonly refresh: Effect.Effect<void>;
  readonly states: Stream.Stream<AuditState>;
}

const queryActiveTabId = async (): Promise<number | null> => {
  try {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    return tab?.id ?? null;
  } catch {
    return null;
  }
};

const make = Effect.sync((): PanelClientShape => {
  let activePort: Browser.runtime.Port | null = null;

  const states = Stream.asyncPush<AuditState>((emit) =>
    Effect.sync(() => {
      const port = browser.runtime.connect({ name: "sidepanel" });
      activePort = port;
      queryActiveTabId().then((tabId) => {
        if (tabId != null) {
          try {
            port.postMessage({ type: "hello", tabId });
          } catch {
            // port closed
          }
        }
      });

      const onMessage = (msg: unknown) => {
        if (
          typeof msg === "object" &&
          msg !== null &&
          (msg as { type?: unknown }).type === "state"
        ) {
          const raw = (msg as { state: unknown }).state;
          decodeState(raw).pipe(
            Effect.match({
              onFailure: () => undefined,
              onSuccess: (state) => emit.single(state),
            }),
            Effect.runSync
          );
        }
      };

      const onDisconnect = () => {
        emit.single(Idle.make());
      };

      port.onMessage.addListener(onMessage);
      port.onDisconnect.addListener(onDisconnect);

      return Effect.sync(() => {
        port.onMessage.removeListener(onMessage);
        port.onDisconnect.removeListener(onDisconnect);
        try {
          port.disconnect();
        } catch {
          // already disconnected
        }
        if (activePort === port) {
          activePort = null;
        }
      });
    })
  );

  const refresh = Effect.sync(() => {
    if (activePort) {
      try {
        activePort.postMessage({ type: "refresh" });
      } catch {
        // port closed
      }
    }
  });

  return { states, refresh };
});

export class PanelClient extends Context.Tag("PanelClient")<
  PanelClient,
  PanelClientShape
>() {
  static readonly layer = Layer.effect(PanelClient, make);
}
