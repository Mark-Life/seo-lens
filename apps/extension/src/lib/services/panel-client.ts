import type { AuditState } from "@workspace/seo-rules/shapes";
import { idleState } from "@workspace/seo-rules/state";
import { Context, Effect, Layer, Stream } from "effect";
import type { Browser } from "wxt/browser";

const isAuditState = (v: unknown): v is AuditState => {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const tag = (v as { _tag?: unknown })._tag;
  return (
    tag === "Idle" ||
    tag === "Running" ||
    tag === "Ready" ||
    tag === "Loading" ||
    tag === "Restricted" ||
    tag === "AuditError"
  );
};

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
  let disposed = false;

  const sendHello = (port: Browser.runtime.Port) => {
    queryActiveTabId().then((tabId) => {
      if (tabId != null) {
        try {
          port.postMessage({ type: "hello", tabId });
        } catch {
          // port closed
        }
      }
    });
  };

  const states = Stream.asyncPush<AuditState>((emit) =>
    Effect.sync(() => {
      const onMessage = (msg: unknown) => {
        if (
          typeof msg === "object" &&
          msg !== null &&
          (msg as { type?: unknown }).type === "state"
        ) {
          const raw = (msg as { state: unknown }).state;
          if (isAuditState(raw)) {
            emit.single(raw);
          }
        }
      };

      const detach = (port: Browser.runtime.Port) => {
        port.onMessage.removeListener(onMessage);
      };

      const connect = (attempt: number) => {
        if (disposed) {
          return;
        }
        let port: Browser.runtime.Port;
        try {
          port = browser.runtime.connect({ name: "sidepanel" });
        } catch {
          // SW may be momentarily unavailable while restarting; retry.
          const delay = Math.min(1000, 50 * 2 ** attempt);
          setTimeout(() => connect(attempt + 1), delay);
          return;
        }
        activePort = port;

        const onDisconnect = () => {
          detach(port);
          if (activePort === port) {
            activePort = null;
          }
          // SW died; clear UI to loading state until reconnect lands a fresh audit.
          emit.single(idleState());
          if (!disposed) {
            const delay = Math.min(1000, 50 * 2 ** attempt);
            setTimeout(() => connect(attempt + 1), delay);
          }
        };

        port.onMessage.addListener(onMessage);
        port.onDisconnect.addListener(onDisconnect);
        sendHello(port);
      };

      connect(0);

      return Effect.sync(() => {
        disposed = true;
        const port = activePort;
        activePort = null;
        if (port) {
          detach(port);
          try {
            port.disconnect();
          } catch {
            // already disconnected
          }
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
