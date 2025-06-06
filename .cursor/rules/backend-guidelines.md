---
description: Backend-only rules (Azure Functions, Node 20 TS)
globs:
  - "RateMate-Backend/**"
alwaysApply: false
---

- **Do not** create a new `Pool()` per request—import the singleton from `src/database/postgresClient.ts`.
- Each Function must:
  1. Export an `AzureFunction` typed default export.
  2. Send JSON via `context.res = { status, body }`.
- Folder layout:
  - `src/functions/<feature>/index.ts`  ← HTTP trigger
  - `src/database/`                     ← data clients
  - `src/lib/`                          ← pure helpers
- Environment variables live in **`local.settings.json`** (local) and **Azure Portal ▶ Configuration** (prod). 