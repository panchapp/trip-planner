# Implementation Plan — Trip Detail Workspace (Layout & Global Actions)

> Source: `PRDs/03-trip-detail-workspace/PRD.md`
> Generated: 2026-03-29

## Summary

Create a Trip Detail Workspace with a fixed 3-column desktop layout, an editable header for trip metadata (title + date range), and a persistent footer with a save action and sync status indicator. The backend already exposes `PATCH /trips/:id` with full metadata support — this is a **frontend-only** implementation.

## Backend Track

**No changes required.** The existing infrastructure already covers this PRD:

- `app-service/src/modules/trips/trips.controller.ts` — `PATCH :id` accepts partial updates to `title`, `startDate`, `endDate`, etc.
- `app-service/src/modules/trips/trips.service.ts` — validates date ordering, builds patch, delegates to repository
- `UpdateTripDto` — `PartialType(CreateTripDto)`, already supports all fields the PRD needs
- The Knex repository handles atomic single-row updates; transactional multi-table saves are deferred to future PRDs (this PRD is content-agnostic)

> **Note:** The PRD references a `name` field, but the existing schema uses `title`. We will use `title` throughout to match the database.

## Frontend Track

### Architecture Overview

```mermaid
graph TD
    subgraph routing [Routing]
        AppRoutes["app.routes.ts"] -->|"/trips"| TRoutes["trips.routes.ts"]
        TRoutes -->|""| Home["Home dashboard"]
        TRoutes -->|"/:id"| TWComp["TripWorkspace"]
    end

    subgraph workspace [Trip Workspace Feature]
        TW["TripWorkspace"] --> TH["TripWorkspaceHeader"]
        TW --> LC["LeftColumn (empty placeholder)"]
        TW --> MC["MiddleColumn (empty placeholder)"]
        TW --> RC["RightColumn (empty placeholder)"]
        TW --> TF["TripWorkspaceFooter"]
    end

    subgraph state [State Management]
        TWStore["TripWorkspaceStore (@ngrx/signals)"]
        TWStore -->|"trip(), isDirty(), saving()"| TH
        TWStore -->|"isDirty(), saving(), save()"| TF
    end

    subgraph services [Existing Services]
        TripSvc["TripService (existing)"]
        TripSvc -->|"getTrip(id)"| TWStore
        TripSvc -->|"updateTrip(id, payload)"| TWStore
    end
```

### Tasks

1. **TripWorkspaceStore** — Signal-based state management

- Location: `app-client/src/app/core/stores/trip-workspace.store.ts`
- `@ngrx/signals` `signalStore` (follows `AuthStore` pattern)
- State: `trip: Trip | null`, `originalTrip: Trip | null`, `loading: boolean`, `saving: boolean`, `error: string | null`
- Computed: `isDirty` — deep-compares `trip` vs. `originalTrip` on title, startDate, endDate
- Methods: `loadTrip(id: string)` — calls `TripService.getTrip`, sets both `trip` and `originalTrip`; `updateField(field, value)` — patches `trip` locally; `save()` — calls `TripService.updateTrip` with only changed fields, resets `originalTrip` on success
- Scope: `providedIn: 'root'` (singleton, like AuthStore)
- Depends on: existing `app-client/src/app/core/services/trip.service.ts` (no changes needed)

2. **Trips routes** — Lazy-loaded feature routes

- Route file: `app-client/src/app/features/trip-workspace/trips.routes.ts`
- Paths: `trips` → `''` loads `Home` (dashboard); `trips/:id` loads `TripWorkspace`
- Guard: `authGuard` on parent `trips` in `app.routes.ts` via `loadChildren` pointing to `trips.routes.ts`

3. **TripWorkspace component** — Layout container

- Location: `app-client/src/app/features/trip-workspace/trip-workspace.ts` + `.html` (Tailwind utilities; no component-level SCSS per project conventions)
- CSS Grid layout: `grid-template-columns: 25% 45% 30%` with full viewport height minus header/footer
- Reads `:id` from `ActivatedRoute`, calls `store.loadTrip(id)` on init
- Renders: header (top), 3-column grid (middle), footer (bottom, sticky)
- Each column renders a placeholder "Coming soon" block for now

4. **TripWorkspaceHeader component** — Metadata editing

- Location: `app-client/src/app/features/trip-workspace/components/trip-workspace-header/`
- Editable title: text `<input>` bound to store's `trip().title`, emits changes via `store.updateField('title', value)`
- Date range: two `<input type="date">` for start/end, similarly bound
- Back navigation link to `/trips` (dashboard)
- Inputs from store signals; standalone component

5. **TripWorkspaceFooter component** — Global action bar

- Location: `app-client/src/app/features/trip-workspace/components/trip-workspace-footer/`
- Save button: enabled when `isDirty()` is true, disabled when `saving()`, calls `store.save()`
- Sync status badge: shows "Saved" (green) or "Unsaved changes" (amber) based on `isDirty()`
- Placeholder slots for future secondary actions (Export, Delete, Share) — empty/disabled for now
- Sticky to bottom of viewport

6. **Update Home navigation** — Trip card navigates to workspace

- In `app-client/src/app/features/home/home.ts`, change `onTripSelected` to navigate to `/trips/${trip.id}` instead of the current `queryParams: { trip: trip.id }` approach

### Artifacts

- **Store**: `core/stores/trip-workspace.store.ts`
- **Components**: `features/trip-workspace/trip-workspace.ts`, `trip-workspace.html`
- **Sub-components**: `features/trip-workspace/components/trip-workspace-header/` (`.ts`, `.html`), `features/trip-workspace/components/trip-workspace-footer/` (`.ts`, `.html`)
- **Utils**: `shared/utils/trip-date.utils.ts` (date input ↔ API ISO helpers; optional but recommended for dirty detection)
- **Routes**: `features/trip-workspace/trips.routes.ts`
- **Modified**: `app.routes.ts`, `features/home/home.ts`

## Execution Order

Single-track (frontend only). Tasks are implemented sequentially: Store (1) → Route (2) → Layout (3) → Header (4) → Footer (5) → Navigation update (6). Build and lint verification at the end.
