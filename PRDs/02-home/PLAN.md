# Implementation Plan — User Home Dashboard (Trip Management)

> Source: `PRDs/02-home/PRD.md`
> Generated: 2026-03-27

## Summary

Build a full-stack trip management dashboard. The NestJS backend gets a new `trips` module with Knex-based persistence, CRUD endpoints, ownership enforcement, and pagination. The Angular frontend replaces the placeholder Home page with a dashboard featuring a dynamic hero greeting, categorized trip cards (active, upcoming, past, drafts), an empty state for new users, and a FAB for trip creation. Agentic AI suggestions (PRD section 5) are deferred to a future PRD since they depend on an AI agent system that does not exist yet.

---

## Backend Track

### Tasks

1. **Create `trips` table migration** — New Knex migration with columns: `id` (UUID PK), `user_id` (FK to `users`), `title`, `destination`, `start_date` (nullable), `end_date` (nullable), `status` (text, check constraint for `draft`/`confirmed`/`cancelled`), `cover_image_url` (nullable), `created_at`, `updated_at`.

   - Scope: `app-service/migrations/`
   - Depends on: none

2. **Create Trip entity interface** — TypeScript interface matching the DB schema, plus a `TripRow` interface and `mapRow` in the repository (following the `User` pattern in `app-service/src/modules/auth/`).

   - Scope: `app-service/src/modules/trips/entities/trip.ts`
   - Depends on: none

3. **Create TripRepository contract and Knex implementation** — Abstract class `TripRepository` with methods: `create`, `findById`, `findByUserId` (with pagination + optional status/category filter), `update`, `delete`. Concrete `TripKnexRepository` using injected `KNEX` token.

   - Scope: `app-service/src/modules/trips/interfaces/`, `app-service/src/modules/trips/repositories/`
   - Depends on: task 2

4. **Create DTOs** — `CreateTripDto` (class-validator), `UpdateTripDto` (`PartialType` from `@nestjs/mapped-types` — add dependency if missing), `TripQueryDto` (limit, offset, status, category), `TripResponseDto`.

   - Scope: `app-service/src/modules/trips/dto/`
   - Depends on: none

5. **Create TripsService** — Business logic: create trip (attach `userId`), list with query (category `active`/`upcoming`/`past`/`draft` for server-side filtering and past pagination), get single trip (ownership check), update (ownership check), delete (ownership check). Map entities to `TripResponseDto` with ISO date strings.

   - Scope: `app-service/src/modules/trips/trips.service.ts`
   - Depends on: tasks 3, 4

6. **Create TripsController** — REST under `/api/trips`: `POST /`, `GET /` (query), `GET /:id`, `PATCH /:id`, `DELETE /:id`. All protected by `JwtAuthGuard`; use `@CurrentUser()` for ownership.

   - Scope: `app-service/src/modules/trips/trips.controller.ts`
   - Depends on: task 5

7. **Create TripsModule and register in AppModule** — Wire repository binding; import `TripsModule` in `app-service/src/app.module.ts`.

   - Scope: `app-service/src/modules/trips/trips.module.ts`, `app-service/src/app.module.ts`
   - Depends on: tasks 5, 6

### Artifacts

- Modules: `TripsModule`
- Controllers: `TripsController`
- Services: `TripsService`
- DTOs: `CreateTripDto`, `UpdateTripDto`, `TripQueryDto`, `TripResponseDto`
- Entities: `Trip` (interface)
- Interfaces: `TripRepository` (abstract class)
- Repositories: `TripKnexRepository`
- Migrations: `20260327120000_create_trips.ts` (or equivalent)

---

## Frontend Track

### Tasks

1. **Create Trip model** — Interface matching backend response; `TripCategory` union (`'active' | 'upcoming' | 'past' | 'draft'`); `CategorizedTrips` if needed for grouping.

   - Scope: `app-client/src/app/shared/models/trip.model.ts`
   - Depends on: none

2. **Create TripService** — `getTrips(query?)`, `createTrip()`, `updateTrip()`, `deleteTrip()`, `getTrip(id)` using `HttpClient` and `EnvironmentService.apiUrl`.

   - Scope: `app-client/src/app/core/services/trip.service.ts`
   - Depends on: task 1

3. **Trip dashboard state in `Home`** — No separate trip store: `Home` holds `trips`, `loading`, `error`, and past pagination (`pastNextOffset`, `pastHasMore`, `pastLoadingMore`) as signals; `computed()` for `activeTrip`, `upcomingTrips`, `pastTrips`, `draftTrips`, `isEmpty`; async methods `loadTrips()`, `loadMorePast()`, `createDraftTrip()` calling `TripService` (e.g. via `firstValueFrom`). Local helpers for merge/sort/error strings colocated with the feature.

   - Scope: `app-client/src/app/features/home/home.ts`, `home.html`
   - Depends on: tasks 1, 2

4. **Create TripCard component** — Destination, date range, thumbnail, status badge; `trip` input; `selectTrip` output.

   - Scope: `app-client/src/app/shared/components/trip-card/`
   - Depends on: task 1

5. **Create HeroGreeting component** — Uses `AuthStore` for the user name; `activeTrip` and `nextUpcoming` via `input()` from `Home` (derived from the same computed lists as the dashboard).

   - Scope: `app-client/src/app/features/home/components/hero-greeting/`
   - Depends on: tasks 1, 3

6. **Create EmptyState component** — Icon + copy + CTA; `startPlanning` output.

   - Scope: `app-client/src/app/features/home/components/empty-state/`
   - Depends on: none

7. **Create QuickActionFab component** — Fixed bottom-right; `planNewTrip` output.

   - Scope: `app-client/src/app/shared/components/quick-action-fab/`
   - Depends on: none

8. **Redesign Home page** — Header with logout; `loadTrips()` on init; hero; active trip; upcoming horizontal scroll; past behind “View History” with pagination; drafts; empty state; FAB. Tailwind-only templates per `angular-client` skill.

   - Scope: `app-client/src/app/features/home/`
   - Depends on: tasks 3–7

9. **Routing** — PRD: post-login landing at `/home`. Add `home` route (or redirect `''` → `home`) with `authGuard`; keep `login` with `guestGuard`.

   - Scope: `app-client/src/app/app.routes.ts`
   - Depends on: task 8

### Artifacts

- Components: `TripCard`, `HeroGreeting`, `EmptyState`, `QuickActionFab`, redesigned `Home` (owns trip list state for this screen)
- Services: `TripService`
- Stores: `AuthStore` only (`@ngrx/signals`); no `TripStore`
- Models: `Trip`, `TripCategory`, optional `CategorizedTrips`
- Routes: `/home` as authenticated home

---

## Shared / Cross-Cutting Concerns

- **Ownership:** Every trip row must match JWT `sub` / `@CurrentUser().id`.
- **Trip creation UI:** Full form is out of scope; FAB/CTA may call API to create a minimal draft or placeholder trip.
- **Agentic AI:** Deferred; `draft` status supports future AI-created trips.

## Execution Order

Backend and frontend can be implemented in parallel. Run `pnpm --filter app-service migrate:latest` after migrations. Verify with `pnpm --filter app-service build` and `pnpm --filter app-client build`.
