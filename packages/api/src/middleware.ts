import { os } from "@orpc/server";

export interface Context {
  headers: Headers;
}

const base = os.$context<Context>();

/** Public procedure — no auth required */
export const publicProcedure = base;
