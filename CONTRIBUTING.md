# Contributing to SEO Lens

Thanks for your interest in contributing. This guide covers the basics for getting a dev environment running and submitting changes.

## Prerequisites

- [Bun](https://bun.sh) `>= 1.3.9` (see `packageManager` in `package.json`)
- Node-compatible environment (macOS / Linux / WSL)
- Chrome or Chromium for testing the extension

## Setup

```bash
git clone https://github.com/Mark-Life/seo-lens.git
cd seo-lens
bun install
```

## Common scripts

Run from the repo root:

```bash
bun run dev         # all apps via turbo
bun run build
bun run test        # NOT `bun test` — must be `bun run test`
bun run typecheck
bun run lint
bun run format      # ultracite fix
```

Extension-only:

```bash
cd apps/extension
bun run dev         # WXT dev build with HMR
bun run build
bun run zip         # packaged .zip
```

Load the unpacked dev build from `apps/extension/.output/chrome-mv3` in `chrome://extensions`.

## Project layout

See [docs/plan/context.md](./docs/plan/context.md) for the full project context. Short version:

- `apps/extension` — Chrome extension (WXT + React)
- `apps/web` — landing page (Next.js)
- `packages/seo-rules` — runtime-agnostic Effect-TS audit engine; the place for new rules and schema work
- `packages/ui` — shared shadcn/ui components

## Making changes

1. Create a branch off `main`.
2. Keep changes focused. Don't refactor surrounding code unrelated to the fix.
3. Before pushing:
   - `bun run typecheck`
   - `bun run lint`
   - `bun run test`
4. Commit with [Conventional Commits](https://www.conventionalcommits.org/) — existing history uses `feat:`, `fix:`, `perf:`, `chore:`, `docs:`. Scope by package when it helps (e.g. `feat(seo-rules): …`).
5. Open a PR against `main` using the PR template.

## Coding style

- TypeScript, functional style, pure functions preferred.
- Maximize type inference; derive types from source (`typeof schema`, `Awaited<ReturnType<...>>`).
- `interface` over `type` where possible.
- No comments unless the *why* is non-obvious.
- Biome / Ultracite enforces formatting and lints — `bun run format` fixes most issues.
- Files should stay under ~400–500 lines.

## Adding a rule to `seo-rules`

New audit rules live in `packages/seo-rules`. Each rule is a pure function over a parsed page model and returns structured findings. Add unit tests alongside the rule. See existing rules for the shape.

## Reporting bugs and requesting features

Use the GitHub issue templates:

- [Bug report](.github/ISSUE_TEMPLATE/bug_report.yml)
- [Feature request](.github/ISSUE_TEMPLATE/feature_request.yml)

For security issues, please do **not** file a public issue — email the maintainer directly.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
