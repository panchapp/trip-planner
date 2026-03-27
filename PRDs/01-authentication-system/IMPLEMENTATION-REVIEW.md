# Implementation Review — Authentication System

> PRD: `PRDs/01-authentication-system/PRD.md`

> Plan: `PRDs/01-authentication-system/PLAN.md`

> Review Date: 2025-03-26

---

## 1. Overview

This document captures all aspects of the authentication system implementation across backend (NestJS) and frontend (Angular 21). The system uses Google OAuth, PostgreSQL for user persistence, and **HTTP-Only cookies for access and refresh JWTs**. Refresh tokens are **rotated** on each use; only a **SHA-256 hash** of each refresh JWT is stored in the **`refresh_tokens`** table (never the raw token).

---

## 2. PRD Requirements vs Implementation

### 2.1 Backend Requirements

| PRD Requirement | Implementation | Location |

| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |

| **Secret Isolation** | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`, `JWT_REFRESH_SECRET` in ConfigService, never exposed | `app-service/src/common/config/app.config.ts`, `.env.example` |

| **OAuth Strategy** | Passport Google Strategy handles handshake and profile extraction | `app-service/src/modules/auth/strategies/google-oauth.strategy.ts` |

| **User Schema** | PostgreSQL `users` (profile fields) + **`refresh_tokens`** (`user_id`, `token_hash`, `expires_at`, …) for hashed refresh storage | `user.entity.ts`, `refresh-token.entity.ts` |

| **Identity Logic** | On callback: find user by `googleId`, insert if not exists (upsert) | `app-service/src/modules/auth/auth.service.ts` → `findOrCreateUser()` |

| **Cookie Issuance** | OAuth callback sets **`access_token`** and **`refresh_token`**; HttpOnly, Secure (prod), SameSite=Lax, path `/` | `app-service/src/modules/auth/auth.controller.ts` → `googleAuthCallback()` |

| **Session API** | `GET /api/auth/me` decodes **access** cookie (`typ: access`), returns profile | `app-service/src/modules/auth/auth.controller.ts` → `me()` |

| **Refresh API** | `POST /api/auth/refresh` validates refresh JWT + matching `refresh_tokens` row, rotates row + cookies, `204` | `app-service/src/modules/auth/auth.controller.ts` → `refresh()`, `auth.service.ts` |

| **Logout API** | `POST /api/auth/logout` deletes matching `refresh_tokens` row when refresh JWT verifies, clears both cookies, `204` | `app-service/src/modules/auth/auth.controller.ts` → `logout()`, `auth.service.ts` |

### 2.2 Frontend Requirements

| PRD Requirement | Implementation | Location |

| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |

| **Login Trigger** | `authService.login()` redirects to `{apiUrl}/auth/google` | `app-client/src/app/core/services/auth.service.ts` |

| **Auth Store** | NgRx Signal Store with `user`, computed `isAuthenticated`, `setUser()` | `app-client/src/app/core/stores/auth.store.ts` |

| **Auth Service** | `login()`, `refresh()` / `logout()` via **`HttpBackend`** (no interceptor loop), `me()` via `HttpClient` | `app-client/src/app/core/services/auth.service.ts` |

| **Session Rehydration** | `provideAppInitializer` in app.config.ts calls `authService.me()` then `authStore.setUser(user)` | `app-client/src/app/app.config.ts` |

| **Credential Sharing** | `credentialsInterceptor` — `withCredentials: true`; on **401** (except `/auth/refresh`, `/auth/logout`, `/auth/google`), **`POST /auth/refresh`** once (via `AuthService`), retry with **`X-Auth-Retry`**; on failure clear store, redirect `/login` unless request was `/auth/me` | `app-client/src/app/core/interceptors/credentials.interceptor.ts` |

| **Guard Logic** | Functional `authGuard` redirects to `/login` when `authStore.isAuthenticated()` is false; `guestGuard` redirects to `/` when authenticated | `app-client/src/app/core/guards/auth.guard.ts`, `guest.guard.ts` |

**Implemented:** Refresh is triggered automatically by the HTTP interceptor on **401**; **`POST /api/auth/logout`** is called from Sign out (`Home` → `authService.logout()` → clear store → `/login`).

---

## 3. Backend Implementation Details

### 3.1 Dependencies

- `@nestjs/config` — environment configuration

- `@nestjs/passport`, `passport`, `passport-google-oauth20`, `passport-jwt` — OAuth and JWT

- `@nestjs/jwt` — JWT signing (access default secret; refresh uses `JWT_REFRESH_SECRET` in `sign`/`verify` options)

- `@nestjs/typeorm`, `typeorm`, `pg` — PostgreSQL

- `class-validator`, `class-transformer` — DTO validation

- `@nestjs/swagger` — API docs

- `helmet`, `cookie-parser` — security and cookie parsing

- Node `crypto` — SHA-256 hashing for refresh token digests

### 3.2 Auth Routes (prefix: `/api`)

| Method | Route | Description | Protection |

| ------ | --------------------------- | --------------------------------------------------------------------------- | ------------ |

| GET | `/api/auth/google` | Initiates Google OAuth flow | Public |

| GET | `/api/auth/google/callback` | OAuth callback; sets access + refresh cookies, redirects to frontend | Passport |

| POST | `/api/auth/refresh` | Reads `refresh_token` cookie; rotates access + refresh, `204` + Set-Cookie | Public |

| POST | `/api/auth/logout` | Deletes matching `refresh_tokens` row if refresh JWT valid; clears cookies, `204` | Public |

| GET | `/api/auth/me` | Returns current user profile from **access** cookie | JwtAuthGuard |

### 3.3 Files Created / Modified

| Path | Purpose |

| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |

| `src/common/config/app.config.ts` | Typed config: OAuth, JWT access/refresh secrets & TTLs, cookie max-age, DB, CORS, frontend URL |

| `src/modules/auth/entities/user.entity.ts` | User entity |
| `src/modules/auth/entities/refresh-token.entity.ts` | `refresh_tokens` table: FK to user, unique `token_hash`, `expires_at` |

| `src/modules/auth/dto/user-profile.dto.ts` | Response DTO for `/auth/me` |

| `src/modules/auth/auth.service.ts` | `findOrCreateUser`, `issueTokenPair`, `refreshFromRawToken`, `tryRevokeRefreshToken`, `revokeAllRefreshTokensForUserId`, `findById`, `toProfileDto` |

| `src/modules/auth/auth.controller.ts` | OAuth, `refresh`, `logout`, `me`, dual-cookie helpers |

| `src/modules/auth/auth.module.ts` | Auth module wiring |

| `src/modules/auth/strategies/google-oauth.strategy.ts` | Passport Google strategy |

| `src/modules/auth/strategies/jwt.strategy.ts` | JWT strategy: cookie/header access token; validates `typ === 'access'` |

| `src/common/guards/jwt-auth.guard.ts` | Guard for protected routes |

| `src/common/decorators/current-user.decorator.ts` | `@CurrentUser()` param decorator |

| `src/app.module.ts` | ConfigModule, TypeORM, AuthModule |

| `src/main.ts` | Global prefix `api`, helmet, cookie-parser, CORS, ValidationPipe, Swagger |

| `.env.example` | Sample environment variables including refresh secrets and cookie TTLs |

### 3.4 Security

- **Cookies:** `access_token` (short TTL, `JWT_EXPIRES_IN_SECONDS` / `AUTH_COOKIE_MAX_AGE_MS`), `refresh_token` (long TTL, `JWT_REFRESH_EXPIRES_IN_SECONDS` / `REFRESH_COOKIE_MAX_AGE_MS`); HttpOnly, Secure in production, SameSite=Lax, path `/`

- **Access JWT:** signed with `JWT_SECRET`; payload includes `typ: 'access'`

- **Refresh JWT:** signed with `JWT_REFRESH_SECRET`; payload includes `typ: 'refresh'`; persisted state is **hash only** in table **`refresh_tokens`**

- **Rotation:** successful refresh deletes the old `refresh_tokens` row and inserts a new row; old refresh JWT no longer matches

- **CORS:** `credentials: true`, origin from config

- **DB:** TypeORM parameterized queries (ORM-managed)

- **XSS:** HTTP-Only cookies prevent JS access to tokens

---

## 4. Frontend Implementation Details

### 4.1 Dependencies

- `@ngrx/signals` — Signal Store for auth state

- `@angular/common` — HttpClient (provideHttpClient), `provideAppInitializer` for session rehydration

### 4.2 Auth Flow

1. **App boot** → `provideAppInitializer` runs → `authService.me()` → `authStore.setUser(user)` → rehydrates session if **access** cookie valid

2. **Login** → User clicks "Sign in with Google" → `authService.login()` → redirect to `/api/auth/google`

3. **OAuth return** → Backend redirects with **access + refresh** cookies → app loads → `me()` returns user via initializer

4. **Access expired** → Any `HttpClient` call that receives **401** triggers the interceptor: **`POST /api/auth/refresh`** once (via `AuthService.refresh()` / `HttpBackend`), then the original request is retried with **`X-Auth-Retry`**

5. **Logout** → **`POST /api/auth/logout`** from the Home page (`authService.logout()`), then `authStore.setUser(null)` and **`router.navigateByUrl('/login')`** (same on HTTP error)

### 4.3 Files Created / Modified

| Path | Purpose |

| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |

| `src/app/core/stores/auth.store.ts` | NgRx Signal Store: `user`, computed `isAuthenticated`, `setUser()` |

| `src/app/core/services/auth.service.ts` | AuthService: `login()`, `refresh()` / `logout()` via `HttpBackend`, `me()` via intercepted `HttpClient` |

| `src/app/core/guards/auth.guard.ts` | Functional guard: redirects to `/login` when `authStore.isAuthenticated()` is false |

| `src/app/core/guards/guest.guard.ts` | Functional guard: redirects to `/` when `authStore.isAuthenticated()` is true |

| `src/app/core/interceptors/credentials.interceptor.ts` | `withCredentials` + **401 → refresh once → retry** (`X-Auth-Retry`, `AUTH_RETRY_HEADER`) |

| `src/app/shared/models/user.model.ts` | User interface for profile response |

| `src/app/features/auth/login/` | Login component: "Sign in with Google" button triggers `authService.login()` |

| `src/app/features/home/` | Home: `logout()` → `authService.logout()` → clear store → `/login` |

| `src/app/app.routes.ts` | `/login` (guestGuard, lazy Login), `/` (authGuard, lazy Home) |

| `src/app/app.config.ts` | `provideHttpClient`, `provideAppInitializer` for session rehydration, `credentialsInterceptor` |

| `src/environments/environment.ts` | `apiUrl: 'http://localhost:3000/api'` |

| `src/environments/environment.service.ts` | `EnvironmentService` injectable exposing `apiUrl` |

### 4.4 API Base URL

- `EnvironmentService` injectable reads `environment.apiUrl`

- Development: `http://localhost:3000/api`

- Production: Configure via environment build-time replacement

---

## 5. Data Flow (as implemented)

1. **Handshake** — Angular `authService.login()` → `window.location.href = env.apiUrl + '/auth/google'`

2. **External Auth** — User authenticates with Google

3. **Server Processing** — NestJS callback receives profile → `findOrCreateUser(googleId)` → `issueTokenPair(user)` (access + refresh JWTs, row inserted in **`refresh_tokens`**)

4. **Cookie Drop** — `res.cookie('access_token', …)`, `res.cookie('refresh_token', …)` → `res.redirect(frontendUrl)`

5. **Rehydration** — Angular boot → `provideAppInitializer` → `authService.me()` → `GET /api/auth/me` with access cookie → user returned → `authStore.setUser(user)`

6. **Refresh** — Interceptor or explicit call: `POST /api/auth/refresh` with `refresh_token` cookie → validates JWT + hash → new access + refresh cookies

7. **Logout** — UI: `POST /api/auth/logout` → delete `refresh_tokens` row; clear cookies; client clears store and routes to `/login`

---

## 6. Known Limitations / Future Work

| Item | Status |

| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |

| **Concurrent 401 storms** | Only one refresh retry per request (`X-Auth-Retry`); many parallel 401s could trigger multiple refresh calls — consider a shared in-flight refresh `Observable` if needed. |

| **CSRF** | SameSite=Lax mitigates; for `POST /auth/refresh` / `POST /auth/logout`, consider CSRF tokens or `SameSite=Strict` where compatible. |

| **Production cookie domain** | May need `domain` for subdomain sharing; currently not set. |

| **Reuse detection** | Rotation invalidates old refresh; optional alerting on hash mismatch (possible token theft) not implemented. |

---

## 7. Manual Verification Checklist

- [ ] Backend: copy `.env.example` to `.env`, set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`, **`JWT_REFRESH_SECRET`**, `JWT_EXPIRES_IN_SECONDS`, **`JWT_REFRESH_EXPIRES_IN_SECONDS`**, `AUTH_COOKIE_MAX_AGE_MS`, **`REFRESH_COOKIE_MAX_AGE_MS`**, `DATABASE_URL`, `FRONTEND_URL`

- [ ] PostgreSQL running, schema includes new user columns (TypeORM synchronize or migration)

- [ ] Google Cloud Console: OAuth redirect URI `http://localhost:3000/api/auth/google/callback`

- [ ] Run `pnpm --filter app-service start:dev`

- [ ] Run `pnpm --filter app-client start`

- [ ] Open `http://localhost:4200` → redirect to `/login`

- [ ] Click "Sign in with Google" → complete OAuth → redirect to home with email shown

- [ ] Refresh page → session persists (`/auth/me` succeeds while access valid)

- [ ] Call **`POST /api/auth/refresh`** (e.g. curl with `Cookie: refresh_token=…`) → `204`, new cookies

- [ ] Call **`POST /api/auth/logout`** → cookies cleared; `/auth/me` returns 401

- [ ] Click "Sign out" in UI → after client wires `logout` to backend, confirm server cookies cleared
