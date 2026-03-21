# Trip Planner Monorepo

## Overview

Trip Planner is a full-stack application built as a **pnpm workspace monorepo** with two packages:

| Package         | Path           | Framework | Version |
| --------------- | -------------- | --------- | ------- |
| **app-client**  | `app-client/`  | Angular   | 21      |
| **app-service** | `app-service/` | NestJS    | 11      |

Each package has its own `CLAUDE.md` with project-specific guidelines.

See [`AGENTS.md`](./AGENTS.md) for the full skill routing table — it maps tasks to the agent skills available in this monorepo.

## Quick Start

```bash
pnpm install          # install all dependencies
pnpm start:client     # Angular dev server
pnpm start:service    # NestJS watch mode
```

## Package Manager

- **pnpm 10** — all commands use `pnpm`. Never use `npm` or `yarn`.
- Workspace packages defined in `pnpm-workspace.yaml`.
- Run package-specific scripts: `pnpm --filter <package> <script>`.

## Monorepo Structure

```
trip-planner-monorepo/
├── app-client/          # Angular 21 frontend  → see app-client/CLAUDE.md
├── app-service/         # NestJS 11 backend    → see app-service/CLAUDE.md
├── .husky/              # Git hooks (commitlint)
├── package.json         # Root workspace config
└── pnpm-workspace.yaml
```
