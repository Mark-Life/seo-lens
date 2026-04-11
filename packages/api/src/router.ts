import { health } from "./procedures/health";

export const router = {
  health,
};

export type Router = typeof router;
