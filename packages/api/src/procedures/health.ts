import { z } from "zod";
import { publicProcedure } from "../middleware";

export const health = {
  check: publicProcedure.handler(() => {
    return { status: "ok" as const, timestamp: new Date().toISOString() };
  }),

  echo: publicProcedure
    .input(z.object({ message: z.string() }))
    .handler(({ input }) => {
      return { echo: input.message };
    }),
};
