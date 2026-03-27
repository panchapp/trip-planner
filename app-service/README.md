# Trip Planner API (`app-service`)

NestJS 11 backend. Persistence uses **Knex** against PostgreSQL; schema changes are applied with **Knex migrations** (no runtime auto-sync).

## Setup

From the monorepo root:

```bash
pnpm install
```

Copy `.env.example` to `.env` (and optionally `.env.local`) under `app-service/` and set `DATABASE_URL` and other variables.

## Database migrations

Run these from `app-service/` (or via `pnpm --filter app-service <script>` from the repo root).

| Script                     | Description                                                 |
| -------------------------- | ----------------------------------------------------------- |
| `pnpm migrate:new <name>`  | Create a new TypeScript migration in `migrations/`          |
| `pnpm migrate:latest`      | Apply pending migrations                                    |
| `pnpm migrate:rollback`    | Roll back the last batch                                    |
| `pnpm migrate:status`      | List migration status                                       |

Migrations use `DATABASE_URL` from `.env` / `.env.local` (see `knexfile.ts`).

Example:

```bash
cd app-service
pnpm migrate:latest
```

## Run

```bash
pnpm --filter app-service start:dev
pnpm --filter app-service build
pnpm --filter app-service test
pnpm --filter app-service test:e2e
pnpm --filter app-service lint
```
