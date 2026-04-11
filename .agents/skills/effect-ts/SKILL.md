---
name: effect-ts
description: >-
  Comprehensive guide for Effect-TS, the functional TypeScript library.
  Use when writing Effect programs, defining services, creating layers,
  handling errors, modeling data with Schema, configuring apps, or testing
  Effect code. Covers correct APIs, common misconceptions, and idiomatic patterns.
user-invocable: false
paths: "**/*.ts, **/*.tsx"
---

# Effect-TS Core Patterns

Prescriptive guide for writing idiomatic Effect programs.
Source: [effect.solutions](https://www.effect.solutions/)

## Core pattern documents

Load the relevant document based on what you're working on:

- **[basics.md](core-patterns/basics.md)** — Effect.gen, Effect.fn, pipe for instrumentation, retry/timeout with Schedule. Load when writing any Effect code or starting a new effectful function.

- **[config.md](core-patterns/config.md)** — Config module, Config layers, ConfigProvider, Schema.Config validation, Redacted secrets. Load when setting up app configuration, environment variables, or config providers.

- **[data-modeling.md](core-patterns/data-modeling.md)** — Schema.Class records, Schema.TaggedClass variants, branded types, Schema.Union, Match.valueTags, JSON encoding/decoding. Load when defining domain models, DTOs, or data validation schemas.

- **[error-handling.md](core-patterns/error-handling.md)** — Schema.TaggedError, catchAll/catchTag/catchTags, expected errors vs defects, Schema.Defect for wrapping unknown errors. Load when defining or handling errors in Effect programs.

- **[services-and-layers.md](core-patterns/services-and-layers.md)** — Context.Tag services, Layer.effect/Layer.sync implementations, service-driven development, layer composition with provideMerge, layer memoization. Load when creating services, defining dependency injection, or composing layers.

- **[testing.md](core-patterns/testing.md)** — @effect/vitest setup, it.effect/it.scoped/it.live, TestClock, providing test layers, worked example with test services. Load when writing or setting up tests for Effect code.

---

## Local Effect Source

The Effect v3 repository is cloned to `~/.local/share/effect-solutions/effect` for reference.
Use this to explore APIs, find usage examples, and understand implementation
details when the documentation isn't enough.
