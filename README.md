# Trip Planner Monorepo

Monorepo containing the Trip Planner Angular client and NestJS API.

## Structure

```
trip-planner-monorepo/
├── app-client/   # Angular 21 app
├── app-service/  # NestJS API
└── package.json
```

## Prerequisites

- Node.js 20+
- pnpm 10+
- Docker Desktop (for local PostgreSQL)

## Setup

```bash
pnpm install
```

## Development

| Command | Description |
|---------|-------------|
| `pnpm start:client` | Start Angular dev server (http://localhost:4200) |
| `pnpm start:service` | Start NestJS API in watch mode (http://localhost:3000) |

Run both in separate terminals for full-stack development.

## Local PostgreSQL (Docker Compose)

Use the root `docker-compose.yml` and set these values in `.env`:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=trip_planner
POSTGRES_PORT=5432
```

Start Postgres:

```bash
docker compose up -d
```

Stop Postgres (keeps data):

```bash
docker compose down
```

Reset Postgres (removes data volume):

```bash
docker compose down -v
```

Connection URL: `postgresql://postgres:postgres@localhost:5432/trip_planner`
