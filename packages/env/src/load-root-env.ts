import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";

/**
 * Loads .env and .env.local from monorepo root into process.env.
 * Does not override existing env vars (existing values take precedence).
 */
const findMonorepoRoot = () => {
  let dir = import.meta.dirname ?? process.cwd();
  for (let i = 0; i < 10; i++) {
    if (existsSync(resolve(dir, "turbo.json"))) {
      return dir;
    }
    dir = resolve(dir, "..");
  }
  return undefined;
};

const root = findMonorepoRoot();

if (root) {
  config({ path: resolve(root, ".env"), override: false });
  config({ path: resolve(root, ".env.local"), override: false });
}
