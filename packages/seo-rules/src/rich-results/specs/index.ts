import type { RichResultSpec } from "../registry";
import { articleSpec } from "./article";

/** Registered Google Rich Results specs. Step 11 broadens the set. */
export const specs: readonly RichResultSpec[] = [articleSpec];
