import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll } from "vitest";
import { loadSchemaVocab } from "../src/generated/schema-vocab.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const JSON_PATH = join(HERE, "../src/generated/schema-vocab.json");

beforeAll(async () => {
  await loadSchemaVocab(async () => {
    const raw = await readFile(JSON_PATH, "utf8");
    return JSON.parse(raw);
  });
});
