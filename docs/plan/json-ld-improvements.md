# JSON-LD Improvements

Upgrade JSON-LD handling from hand-curated allowlist + flat UI to real schema.org vocabulary, Google Rich Results validation, and a recursive tree view.

Related: [plan.md](./plan.md) §8 (JSON-LD deferred items), US-1, US-2, US-3.

---

## 1. Current State — Problems

### Duplicated, drifting allowlist

- `packages/seo-rules/src/rules/structured.ts` — 28 types.
- `packages/seo-rules/src/view/jsonld.ts` — 20 types (different set).
- Two sources of truth, already out of sync.

### Shallow validation

- `structured.valid-schema`: only checks `@context` present + `@type` is a string.
- `structured.unknown-type`: only presence in local allowlist.
- No property validation, no required-field check, no subclass awareness.
- `NewsArticle` passes, but we can't tell if required Google Rich Result fields (`headline`, `image`, `datePublished`, `author`) are present.

### Flat UI (`inspect-tab.tsx:339-388`)

- `flattenFields` strips `@context`/`@type`, stringifies one level deep.
- Nested objects → `{Type}`. Arrays → `"N items"`. User loses everything below depth 1.
- Only escape hatch: raw `<pre>` blob via `<details>`.
- Fails US-1 (precise context) and US-2 ("what does Google see?").

---

## 2. Goals

1. Single source of truth for schema.org vocabulary, regenerable.
2. Validate against Google Rich Results requirements (stricter, more practical SEO value than pure schema.org).
3. Recursive, fully-expanded tree view with per-node validity + copy.
4. Hard-fail build if vocabulary asset is missing.
5. Use Effect Schema **only** where shapes are known (Rich Results specs). Plain data / interfaces for vocabulary and tree model.

---

## 3. Vocabulary Source — Build Time Extraction

### Source

- Fetch `https://schema.org/version/latest/schemaorg-current-https.jsonld` at build time.
- Parse class list, property list, `rdfs:subClassOf` edges, `schema:domainIncludes`, `schema:rangeIncludes`.
- Download via `bun run fetch-schema` in `packages/seo-rules` (curl into `scripts/vendor/`).
- Current vendor file: fetched 2026-04-12 from `schema.org/version/latest`, `@graph` length 3219. Bump by re-running `fetch-schema` and committing.

### Generator script

- `packages/seo-rules/scripts/generate-schema.ts` — run via `bun run update-schema` in `packages/seo-rules`.
- Input: downloaded `.jsonld` (committed under `scripts/vendor/schemaorg-current-https.jsonld` so CI is deterministic — update = bump the file).
- Output: `packages/seo-rules/src/generated/schema-vocab.ts` (TS file, not JSON, for type safety + tree-shakeable).

### Shape (compact)

```ts
export interface SchemaVocab {
  readonly classes: ReadonlySet<string>;           // ~900 types
  readonly properties: ReadonlySet<string>;        // ~1400 props
  readonly subClassOf: ReadonlyMap<string, string>; // child -> parent (chain walked at query time)
  readonly propertyDomains: ReadonlyMap<string, ReadonlySet<string>>; // prop -> valid owning classes
  readonly propertyRanges: ReadonlyMap<string, ReadonlySet<string>>;  // prop -> valid value types
}
```

Expected size: ~60-90KB raw, ~15-25KB gzipped. Acceptable for extension bundle.

### Hard-fail rule

- `index.ts` re-exports from `./generated/schema-vocab`.
- If file missing: TS compile error — build breaks, no silent fallback.
- CI runs `bun run update-schema --check` to guarantee committed file matches current source.

### Query helpers

```ts
isClass(type: string): boolean
isSubClassOf(child: string, parent: string): boolean  // walks chain
propertiesOf(type: string): Set<string>               // inherited from ancestors
propertyValidFor(prop: string, type: string): boolean
```

Pure functions, no state.

---

## 4. Google Rich Results Layer — Effect Schema

Each Rich Results spec is a known shape with required/optional/nested fields. This is exactly what Effect Schema is for. We use `Schema.Struct` per spec, decode raw JSON-LD blocks with `Schema.decodeUnknownEither`, and map `ParseError` paths directly into `FindingContext[]` — giving US-1 precise context for free.

### Spec file shape

One file per type: `packages/seo-rules/src/rich-results/specs/article.ts`

```ts
import { Schema } from "effect";

const ImageObject = Schema.Struct({
  "@type": Schema.Literal("ImageObject"),
  url: Schema.String,
});

const Author = Schema.Union(
  Schema.Struct({ "@type": Schema.Literal("Person"), name: Schema.String }),
  Schema.Struct({ "@type": Schema.Literal("Organization"), name: Schema.String })
);

export const ArticleRequired = Schema.Struct({
  "@type": Schema.Literal("Article", "NewsArticle", "BlogPosting"),
  headline: Schema.String,
  image: Schema.Union(Schema.String, ImageObject, Schema.Array(Schema.Union(Schema.String, ImageObject))),
  datePublished: Schema.String,
  author: Schema.Union(Author, Schema.Array(Author)),
});

export const ArticleRecommended = Schema.Struct({
  dateModified: Schema.optional(Schema.String),
  publisher: Schema.optional(Schema.Unknown),
});

export const articleSpec: RichResultSpec = {
  type: "Article",
  subtypes: ["NewsArticle", "BlogPosting"],
  required: ArticleRequired,
  recommended: ArticleRecommended,
  docUrl: "https://developers.google.com/search/docs/appearance/structured-data/article",
};
```

### Registry shape

`packages/seo-rules/src/rich-results/registry.ts`:

```ts
import type * as Schema from "effect/Schema";

export interface RichResultSpec {
  readonly type: string;                                    // canonical class name
  readonly subtypes: readonly string[];                     // additional @types this spec matches
  readonly required: Schema.Schema<unknown, unknown>;       // decoded to assert required fields
  readonly recommended: Schema.Schema<unknown, unknown>;    // decoded to assert recommended fields
  readonly docUrl: string;
}

export const specsByType: ReadonlyMap<string, RichResultSpec> = /* built from specs/*.ts */;
```

Spec matching: walk `@type` and its ancestors via `vocab.isSubClassOf` until a registered spec is found.

### Validator

`packages/seo-rules/src/rich-results/validate.ts`:

```ts
interface RichResultsReport {
  readonly spec: string;
  readonly docUrl: string;
  readonly requiredErrors: readonly FieldError[];    // from required schema ParseError
  readonly recommendedErrors: readonly FieldError[]; // from recommended schema ParseError
}

interface FieldError {
  readonly path: string;   // JSON pointer, e.g. "/author/0/name"
  readonly message: string;
}
```

`Schema.decodeUnknownEither(spec.required)(rawBlock)` → on `Left`, walk `ParseError` via `ArrayFormatter.formatErrorSync` to flatten into `FieldError[]`. Required errors become finding `severity: "error"`; recommended errors `severity: "warning"`. One aggregated finding per block per severity (not one per field) — pending Open Question #2 below; this is the default.

### Initial set (v1 — high-traffic types)

- `Article` / `NewsArticle` / `BlogPosting`
- `Product` (+ `Offer`, `AggregateRating`, `Review` subrules)
- `BreadcrumbList`
- `FAQPage` (+ `Question` → `acceptedAnswer`)
- `HowTo` (+ `HowToStep`)
- `Recipe`
- `Event`
- `LocalBusiness` / `Organization`
- `VideoObject`
- `JobPosting`

Each hand-authored from Google's Rich Results spec pages. Unit-tested per type with fixture JSON-LD.

### New rules

- `structured.rich-results-required` — severity `error`, lists missing required fields per matched type.
- `structured.rich-results-recommended` — severity `warning`, missing recommended fields.
- Subclass-aware: a `NewsArticle` block matches the `Article` spec via `isSubClassOf`.

### Replaces

- `structured.unknown-type` stays but now queries `vocab.isClass(type)` instead of hardcoded set. Levenshtein suggestions run against `vocab.classes`.

---

## 5. Recursive Tree View — Plain Interfaces

The tree model walks open-ended JSON with no fixed shape, so Effect Schema buys nothing here. Plain TS discriminated union via a `kind` tag.

### New view model (`packages/seo-rules/src/view/jsonld.ts`)

Replace `JsonLdField` flat list with a node tree:

```ts
export type JsonLdNode =
  | { kind: "object"; key: string | null; type: string | null;
      children: JsonLdNode[]; path: string;
      validity: NodeValidity }
  | { kind: "array"; key: string; items: JsonLdNode[]; path: string }
  | { kind: "primitive"; key: string; value: string | number | boolean | null;
      path: string; validity: NodeValidity };

export interface NodeValidity {
  readonly status: "ok" | "unknown-property" | "wrong-domain" | "missing-required";
  readonly note?: string;
}

export interface JsonLdBlock {
  readonly id: string;
  readonly root: JsonLdNode;
  readonly type: string;
  readonly typeValid: boolean;         // vocab.isClass
  readonly typeSuggestion: string | null;
  readonly richResults: RichResultsReport | null;  // null if type has no spec
}

export interface RichResultsReport {
  readonly spec: string;                // "Article"
  readonly missingRequired: readonly string[];
  readonly missingRecommended: readonly string[];
  readonly docUrl: string;
}
```

`path` = JSON pointer (e.g. `/offers/0/price`) — enables per-node copy and "grep in code" UX.

### Derive function

```ts
deriveJsonLdBlocks(page: PageData, vocab: SchemaVocab): JsonLdBlock[]
```

Walks raw JSON, builds node tree, attaches validity per node using vocab. Matches rich-results spec by type (or nearest ancestor via `isSubClassOf`).

---

## 6. UI — Tree Rendering

In `apps/extension/src/entrypoints/sidepanel/components/inspect-tab.tsx` section 06:

### Per block

1. Header: `@type` pill (green if valid schema.org, red otherwise, with levenshtein suggestion).
2. Rich Results summary bar (if spec exists):
  - `✓ Article — all required fields present` (green)
  - `✕ Article — missing: headline, datePublished` (red, with link to Google doc)
3. Tree body — fully expanded by default:
  - Indent 12px per depth.
  - Object nodes: `key` + `@type` pill + `{` + recursive children + `}`.
  - Array nodes: `key [0] … [N]` with each item as a subtree.
  - Primitives: `key · value` (truncated with full value in title attr).
  - Per-node copy button on hover (copies subtree as JSON).
  - Unknown-property nodes: amber underline + tooltip `"not valid for Product per schema.org"`.
  - Missing-required shown as ghost row with strikethrough.
4. Drop the `<details> raw` block — tree replaces it. Keep top-right `Copy JSON-LD` button (all blocks).

### Interactions

- Per-node `Copy` — copies that subtree as `{key}: {value-as-json}` (US-3).
- Type pill click → filters tree to that node (future).

---

## 7. File Changes

### New

- `packages/seo-rules/scripts/generate-schema.ts` — plain data generator.
- `packages/seo-rules/scripts/vendor/schemaorg-current-https.jsonld` (committed).
- `packages/seo-rules/src/generated/schema-vocab.ts` (generated, committed, **plain `Set`/`Map`, no Schema**).
- `packages/seo-rules/src/vocab/query.ts` — `isClass`, `isSubClassOf`, etc.
- `packages/seo-rules/src/rich-results/registry.ts` — `RichResultSpec` interface + `specsByType` map.
- `packages/seo-rules/src/rich-results/validate.ts` — `Schema.decodeUnknownEither` + `ArrayFormatter` → `FieldError[]`.
- `packages/seo-rules/src/rich-results/specs/*.ts` — one file per type, each exports `Schema.Struct` for required + recommended.
- `packages/seo-rules/tests/vocab.test.ts`
- `packages/seo-rules/tests/rich-results.test.ts` — fixture JSON-LD per spec, assert error paths.
- `apps/extension/src/entrypoints/sidepanel/components/jsonld-tree.tsx` — plain React tree.

### Modified

- `packages/seo-rules/src/rules/structured.ts` — swap local `KNOWN_TYPES` for `vocab.isClass`, add rich-results rules.
- `packages/seo-rules/src/view/jsonld.ts` — rewrite to tree model, remove local `KNOWN_TYPES`.
- `packages/seo-rules/src/view/breadcrumbs.ts` — update to new block shape (still reads `block.raw` for `itemListElement`, minimal change).
- `packages/seo-rules/src/view/index.ts` — export new types.
- `packages/seo-rules/package.json` — add `update-schema` script.
- `apps/extension/src/entrypoints/sidepanel/components/inspect-tab.tsx` — section 06 swapped for `<JsonLdTree blocks={…} />`.

### Deleted

- Local `KNOWN_TYPES` in both `rules/structured.ts` and `view/jsonld.ts`.

---

## 8. Milestones

1. **Vocab generator** — script + committed vendor file + generated TS + query helpers + tests. Extension still uses old shape.
2. **Swap rules** — `structured.`* rules point at vocab. Old allowlist deleted. Existing tests pass.
3. **Tree view model** — rewrite `deriveJsonLdBlocks` to return `JsonLdNode` tree. Update `deriveBreadcrumbs` (trivial).
4. **Tree UI component** — `JsonLdTree` rendering, recursive, copy-per-node. Visual QA on fixture pages.
5. **Rich Results specs** — add one spec at a time starting with `Article`, `Product`, `BreadcrumbList`. Each comes with fixture test.
6. **Rich Results rules + UI summary bar** — rules emit findings, UI shows pass/fail bar with Google doc link.

Each milestone is independently shippable.

---

## 9. Open Questions

Resolved:

- Vocab source: build time.
- Validation scope: Google Rich Results (pragmatic) layered on schema.org vocabulary (correctness).
- Tree default: fully expanded.
- Missing vocab file: hard-fail build.
- Effect Schema usage: specs only; vocab + tree stay plain.

Open:

- Finding granularity — one aggregated finding per block per severity, or one per missing field? Default: aggregated (cleaner UI, `context[]` carries the field list). Revisit if users want per-field severity.

---

## 10. Step-by-Step Execution

Each step is self-contained and independently mergeable. Hand any step to a future agent as: "do step N of `docs/plan/json-ld-improvements.md`".

### ✅ Step 1 — Vendor schema.org vocabulary

**Goal:** commit the raw schema.org JSON-LD context so the generator is deterministic.
**Files:**

- New: `packages/seo-rules/scripts/vendor/schemaorg-current-https.jsonld`
- Modified: `packages/seo-rules/package.json` — add `fetch-schema` script.
**Actions:**

1. Add `fetch-schema` npm script that curls `https://schema.org/version/latest/schemaorg-current-https.jsonld` into `scripts/vendor/`.
2. Run `bun run fetch-schema` from `packages/seo-rules`.
3. Note the fetch date / `@graph` length in §3 (for future updates).

**Done when:** file exists, is valid JSON, >1MB in size, committed; `fetch-schema` script reproduces it.

### ✅ Step 2 — Vocab generator script

**Goal:** parse vendor file into a compact TS data module.
**Files:**

- New: `packages/seo-rules/scripts/generate-schema.ts`
- New: `packages/seo-rules/src/generated/schema-vocab.ts` (output)
- Modified: `packages/seo-rules/package.json` — add `"update-schema": "tsx scripts/generate-schema.ts"`
**Actions:**

1. Read vendor JSON-LD.
2. Walk `@graph`, collect entries where `@type` is `rdfs:Class` → `classes` set.
3. Collect entries where `@type` is `rdf:Property` → `properties` set.
4. For each class, read `rdfs:subClassOf.@id` → `subClassOf` map (strip `schema:` prefix).
5. For each property, read `schema:domainIncludes` → `propertyDomains` map; `schema:rangeIncludes` → `propertyRanges` map.
6. Emit TS file exporting a frozen `SchemaVocab` object as per §3 shape. Use `ReadonlySet`/`ReadonlyMap`. Prepend `// Generated by scripts/generate-schema.ts — do not edit.`

**Done when:** `bun run update-schema` (in `packages/seo-rules`) regenerates `schema-vocab.ts`; file compiles; classes set contains >800 entries.

### ✅ Step 3 — Vocab query helpers

**Goal:** ergonomic read API over generated data.
**Files:**

- New: `packages/seo-rules/src/vocab/query.ts`
- New: `packages/seo-rules/tests/vocab.test.ts`
**Actions:**

1. Export arrow functions: `isClass(type)`, `isSubClassOf(child, parent)` (walks chain up to root), `propertiesOf(type)` (inherited, walks ancestors + unions their `propertyDomains`), `propertyValidFor(prop, type)`, `suggestClass(type)` (levenshtein over `classes`, threshold 2).
2. Import `schemaVocab` from `../generated/schema-vocab`.
3. Tests: `NewsArticle` is subclass of `Article`, `CreativeWork`, `Thing`; `headline` is valid for `Article` and `NewsArticle`; `suggestClass("Organziation")` → `"Organization"`.

**Done when:** tests pass.

### ✅ Step 4 — Rewire rules to vocab, delete allowlists

**Goal:** single source of truth for `@type` recognition.
**Files:**

- Modified: `packages/seo-rules/src/rules/structured.ts`
- Modified: `packages/seo-rules/tests/rules.test.ts` (if allowlist-dependent)
- Deleted: local `KNOWN_TYPES` constants in `rules/structured.ts` **and** `view/jsonld.ts`
**Actions:**

1. In `structuredUnknownTypeRule`, replace `KNOWN_TYPES.has(t.type)` with `isClass(t.type)` from `../vocab/query`.
2. Use `suggestClass` for the typo hint in finding message.
3. In `view/jsonld.ts`, replace local `KNOWN_TYPES.has(type)` with `isClass(type)` for the `valid` flag and `suggestClass` for `note`.
4. Update/adjust existing rule tests — they should still pass with broader vocabulary.

**Done when:** both `KNOWN_TYPES` deleted; `bun test` green; no references to the removed constants.

### ✅ Step 5 — Tree view model

**Goal:** replace flat `JsonLdField[]` with recursive `JsonLdNode` tree.
**Files:**

- Modified: `packages/seo-rules/src/view/jsonld.ts` (rewrite)
- Modified: `packages/seo-rules/src/view/breadcrumbs.ts` (adapt to new `JsonLdBlock` shape)
- Modified: `packages/seo-rules/src/view/index.ts` (export new types)
- Modified: `packages/seo-rules/tests/rules.test.ts` or new `view/jsonld.test.ts`
**Actions:**

1. Add `JsonLdNode` tagged union and updated `JsonLdBlock` interface per §5.
2. Write a pure `buildNode(key, value, parentType, path)` recursive function that emits object/array/primitive nodes. Compute `path` as JSON pointer.
3. For object children whose key is a property, set `validity.status = "unknown-property"` when `propertyValidFor(key, parentType)` is false.
4. `deriveJsonLdBlocks(page)` reads `page.jsonLd`, builds `root` tree per block, populates `type`, `typeValid` via `isClass`, `typeSuggestion` via `suggestClass`. Leave `richResults: null` (Step 8 wires it).
5. Update `deriveBreadcrumbs` — still reads `block.raw` for `itemListElement`, only change is typing.
6. Test: `deriveJsonLdBlocks` on fixture Product JSON-LD produces nested `offers`/`brand` subtrees (not `{Offer}` strings).

**Done when:** tests pass; `inspect-tab.tsx` still compiles (may render degraded temporarily until Step 6).

### ✅ Step 6 — Tree UI component

**Goal:** render recursive tree, fully expanded, with per-node copy.
**Files:**

- New: `apps/extension/src/entrypoints/sidepanel/components/jsonld-tree.tsx`
- Modified: `apps/extension/src/entrypoints/sidepanel/components/inspect-tab.tsx` (section 06)
**Actions:**

1. Build `<JsonLdTree blocks={jsonldBlocks} />` — maps blocks; each block renders header (type pill, validity, `typeSuggestion` hint) then `<TreeNode node={block.root} depth={0} />`.
2. `TreeNode` is recursive. 12px left-padding per depth. Object → `key { … }` with children. Array → `key [ … ]` with children indexed. Primitive → `key · value` (truncate to 180ch with full value in `title`).
3. Hover reveals a copy button per node that copies the subtree as formatted JSON (reuse `CopyButton`).
4. Unknown-property node: amber underline + `title` tooltip `"not valid for {parentType} per schema.org"`.
5. In `inspect-tab.tsx` section 06: remove the flat `block.fields.map(...)` render and the `<details> raw`; keep the `Copy JSON-LD` header button; render `<JsonLdTree blocks={jsonldBlocks} />` instead.
6. Visual QA: load extension on a page with nested JSON-LD (Shopify product page or a recipe site).

**Done when:** tree renders recursively; nested objects visible without opening raw; copy-per-node works.

### ✅ Step 7 — Rich Results registry + validator scaffolding

**Goal:** plumbing for Effect Schema specs, no specs yet.
**Files:**

- New: `packages/seo-rules/src/rich-results/registry.ts`
- New: `packages/seo-rules/src/rich-results/validate.ts`
- New: `packages/seo-rules/src/rich-results/specs/index.ts` (empty registry for now)
**Actions:**

1. Define `RichResultSpec` interface per §4 (two `Schema.Schema<unknown, unknown>` fields: `required`, `recommended`).
2. `registry.ts`: export `specsByType: ReadonlyMap<string, RichResultSpec>` built from `specs/index.ts`.
3. `validate.ts`: export `validateBlock(raw: unknown, type: string): RichResultsReport | null`. Walks `type` and its ancestors via `isSubClassOf` looking for a registered spec; if none, returns `null`. On match, runs `Schema.decodeUnknownEither(spec.required)(raw)` and `spec.recommended`, flattens `ParseError` via `ArrayFormatter.formatErrorSync` into `FieldError[]`, returns `RichResultsReport`.
4. No specs registered yet — validator should return `null` for all types.

**Done when:** compiles; calling `validateBlock` on any fixture returns `null`.

### ✅ Step 8 — First spec: Article + wire into view model

**Goal:** prove the pipeline end-to-end with one spec.
**Files:**

- New: `packages/seo-rules/src/rich-results/specs/article.ts`
- Modified: `packages/seo-rules/src/rich-results/specs/index.ts` (register article)
- Modified: `packages/seo-rules/src/view/jsonld.ts` (call `validateBlock` → populate `richResults`)
- New: `packages/seo-rules/tests/rich-results.test.ts`
**Actions:**

1. Author `articleSpec` per the §4 example: required = `@type` (literal union), `headline`, `image`, `datePublished`, `author`; recommended = `dateModified`, `publisher`. Subtypes: `NewsArticle`, `BlogPosting`. `docUrl` → Google Article Rich Results page.
2. Register in `specs/index.ts`.
3. In `deriveJsonLdBlocks`, call `validateBlock(block.raw, block.type)` and attach result to `JsonLdBlock.richResults`.
4. Tests: fixture `Article` block with all required fields → `requiredErrors.length === 0`. Fixture missing `datePublished` → one `FieldError` with `path === "/datePublished"`. Fixture `NewsArticle` matches via subtype.

**Done when:** tests pass; `deriveJsonLdBlocks` returns non-null `richResults` for Article blocks.

### ✅ Step 9 — Rich Results UI summary bar

**Goal:** user-visible pass/fail state per block.
**Files:**

- Modified: `apps/extension/src/entrypoints/sidepanel/components/jsonld-tree.tsx`
**Actions:**

1. Above each block's tree, if `block.richResults` is non-null, render a summary bar:
  - All-clear: green `✓ {spec} — all required fields present` + link to `docUrl`.
  - Errors: red `✕ {spec} — missing: {comma-joined paths}` + link.
  - Warnings only: amber `⚠ {spec} — recommended missing: …`.
2. Hide the bar entirely when `richResults` is null (no spec for this type).
3. Visual QA: load extension on an Article page; intentionally patch the page's JSON-LD in DevTools to remove `datePublished`; confirm red bar appears.

**Done when:** bar renders for Article blocks with correct state.

### ✅ Step 10 — Rich Results rules (findings integration)

**Goal:** surface rich-results issues in the Findings tab, not just Inspect.
**Files:**

- Modified: `packages/seo-rules/src/rules/structured.ts`
**Actions:**

1. Add `structuredRichResultsRequiredRule` (severity `error`) and `structuredRichResultsRecommendedRule` (severity `warning`).
2. Each walks `page.jsonLd`, calls `validateBlock`, emits one aggregated finding per block per severity (per §9 default). Include `FieldError.path` list as `FindingContext[]`. Set `grep` to the first missing field path for quick nav.
3. Export both from `rules/index.ts` and include in the default rule registry.
4. Tests in `rules.test.ts`: fixture Article missing `headline` → error finding with `context[0].value === "/headline"`.

**Done when:** findings appear in the audit list for misconfigured Article JSON-LD.

### ✅ Step 11 — Additional specs

**Goal:** broaden coverage once the pipeline is proven.
**Files:**

- New: `packages/seo-rules/src/rich-results/specs/{product,breadcrumb-list,faq-page,how-to,recipe,event,local-business,video-object,job-posting}.ts`
- Modified: `packages/seo-rules/src/rich-results/specs/index.ts` (register each)
- Modified: `packages/seo-rules/tests/rich-results.test.ts`
**Actions:** for each type, read the Google Rich Results docs page, author `required` + `recommended` schemas, register, add a fixture test. One type per commit.
**Done when:** all v1 types from §4 registered + tested.

### Step 12 — CI freshness check

**Goal:** prevent drift between committed vendor file and upstream schema.org.
**Files:**

- Modified: `packages/seo-rules/scripts/generate-schema.ts` (add `--check` mode)
- Modified: CI workflow (wherever tests run)
**Actions:**

1. `--check` mode re-runs generation into a temp file and diffs against `schema-vocab.ts`; exits non-zero on difference.
2. CI runs `bun run update-schema -- --check` (in `packages/seo-rules`) before tests.
3. Separate (manual) workflow: fetch upstream schema.org file monthly and open a PR if it differs from vendor file. Defer actual workflow; document the intent here.

**Done when:** CI fails if generated file is stale relative to committed vendor file.