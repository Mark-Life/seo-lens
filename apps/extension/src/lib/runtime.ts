import { Layer, ManagedRuntime } from "effect";
import { createContext, useContext } from "react";
import { PanelClient } from "./services/panel-client";

export const panelLayer = Layer.mergeAll(PanelClient.layer);

export type PanelRuntime = ManagedRuntime.ManagedRuntime<
  Layer.Layer.Success<typeof panelLayer>,
  never
>;

export const makePanelRuntime = (): PanelRuntime =>
  ManagedRuntime.make(panelLayer);

export const RuntimeContext = createContext<PanelRuntime | null>(null);

export const useRuntime = (): PanelRuntime => {
  const rt = useContext(RuntimeContext);
  if (!rt) {
    throw new Error("useRuntime must be used inside <RuntimeProvider>");
  }
  return rt;
};
