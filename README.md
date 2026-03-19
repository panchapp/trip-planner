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
- npm 9+

## Setup

```bash
npm install
```

## Development

| Command | Description |
|---------|-------------|
| `npm run start:client` | Start Angular dev server (http://localhost:4200) |
| `npm run start:service` | Start NestJS API in watch mode (http://localhost:3000) |

Run both in separate terminals for full-stack development.
