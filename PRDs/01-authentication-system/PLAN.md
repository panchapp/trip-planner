# Implementation Plan — Authentication System (Google OAuth + NestJS + PostgreSQL)

> Source: `PRDs/01-authentication-system/PRD.md`
> Generated: 2025-03-21

## Summary

Implement a secure, cookie-based authentication system where NestJS handles all OAuth exchanges and session persistence (**access + refresh** JWTs in HTTP-Only cookies, **rotating** refresh token hashes in a **`refresh_tokens`** table), PostgreSQL stores user data, and Angular 21 manages reactive UI state via NgRx Signal Store and AuthService. The frontend triggers login via redirect and rehydrates session by calling `/auth/me` on app boot (via `provideAppInitializer` in `app.config.ts`). When the access token expires, the **`credentialsInterceptor`** performs **`POST /auth/refresh`** once and retries the original request; **`AuthService.logout()`** calls **`POST /auth/logout`** (via `HttpBackend` to bypass the interceptor). Sign out clears the store and navigates to `/login`.

---

## Backend Track

### Tasks

1. **Install dependencies** — Add `@nestjs/config`, `@nestjs/passport`, `passport`, `passport-google-oauth20`, `@nestjs/jwt`, `typeorm`, `pg`, `class-validator`, `class-transformer`, `@nestjs/swagger`, `helmet`.

- Scope: `app-service/package.json`
- Depends on: none

2. **Configure environment** — Add ConfigModule with typed config for `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN_SECONDS`, `JWT_REFRESH_EXPIRES_IN_SECONDS`, `AUTH_COOKIE_MAX_AGE_MS`, `REFRESH_COOKIE_MAX_AGE_MS`, `DATABASE_URL`, `FRONTEND_URL` (CORS origin).

- Scope: `app-service/src/common/config/`, `app-service/.env.example`
- Depends on: none

3. **Create User entity** — PostgreSQL entity with `id` (UUID), `email` (unique), `googleId`, `firstName`, `lastName`, `avatarUrl`, `createdAt`.

3b. **Create RefreshToken entity** — Table `refresh_tokens`: `id`, `user_id` (FK → users, `ON DELETE CASCADE`), `token_hash` (unique), `expires_at`, `created_at`.

- Scope: `app-service/src/modules/auth/entities/user.entity.ts`
- Depends on: none

4. **Configure TypeORM** — Add TypeORM module with PostgreSQL driver, register `User` and `RefreshToken` entities.

- Scope: `app-service/src/app.module.ts`
- Depends on: task 2, 3

5. **Implement Auth module** — AuthModule with AuthService, AuthController.

- Scope: `app-service/src/modules/auth/`
- Depends on: task 4

6. **Implement Google OAuth Strategy** — Passport GoogleStrategy; on callback, find-or-create user by `googleId`, issue **access + refresh** JWTs and persist refresh hash in **`refresh_tokens`** (replace prior rows for that user on new login).

- Scope: `app-service/src/modules/auth/strategies/google.strategy.ts`
- Depends on: task 5

7. **Implement cookie issuance** — On successful OAuth callback, redirect to frontend with `Set-Cookie` for **`access_token`** and **`refresh_token`** (HttpOnly, Secure, SameSite=Lax), with distinct max-age from config.

- Scope: `app-service/src/modules/auth/auth.controller.ts`, `auth.service.ts`
- Depends on: task 6

8. **Implement /auth/me endpoint** — JWT strategy decodes **access** cookie (`typ: access`), return user profile. Implement JwtAuthGuard for protected routes.

- Scope: `app-service/src/modules/auth/strategies/jwt.strategy.ts`, `auth.controller.ts`
- Depends on: task 7

9. **Implement refresh token flow** — `AuthService`: sign access/refresh with separate secrets/TTLs; SHA-256 hash of raw refresh stored in **`refresh_tokens`**; `refreshFromRawToken` verifies JWT + row match + expiry, deletes old row, inserts new. **`POST /auth/refresh`**: read `refresh_token` cookie, rotate, `204` + `Set-Cookie`.

- Scope: `app-service/src/modules/auth/auth.service.ts`, `auth.controller.ts`
- Depends on: task 8

10. **Implement logout** — **`POST /auth/logout`**: verify refresh JWT if present, delete matching **`refresh_tokens`** row, `clearCookie` for `access_token` and `refresh_token`, `204`.

- Scope: `app-service/src/modules/auth/auth.service.ts`, `auth.controller.ts`
- Depends on: task 9

11. **Configure main.ts** — Add global ValidationPipe, CORS with credentials, helmet.

- Scope: `app-service/src/main.ts`
- Depends on: none (can run in parallel)

### Artifacts

- Modules: `AuthModule`
- Controllers: `AuthController`
- Services: `AuthService`
- DTOs: `UserProfileDto` (for /auth/me)
- Entities: `User`, `RefreshToken`
- Strategies: `GoogleStrategy`, `JwtStrategy`
- Guards: `JwtAuthGuard`
- Other: `auth.config.ts`, `.env.example`

---

## Frontend Track

### Tasks

1. **Install dependencies** — Add `provideHttpClient` with `withFetch()` and `credentialsInterceptor` for cookie transmission. Add `@ngrx/signals`.
   - Scope: `app-client/package.json`, `app-client/src/app/app.config.ts`
   - Depends on: none
2. **Create User model** — Interface matching backend user profile response.
   - Scope: `app-client/src/app/shared/models/user.model.ts`
   - Depends on: none
3. **Create AuthStore (NgRx Signal Store)** — `signalStore` with `user`, computed `isAuthenticated`, and `setUser()` method. Session rehydration handled by `provideAppInitializer` (not store hooks).
   - Scope: `app-client/src/app/core/stores/auth.store.ts`
   - Depends on: task 2
4. **Create AuthService** — Injectable service with `login()` (redirect to backend OAuth URL), `refresh()` / `logout()` posting to `/auth/refresh` and `/auth/logout` using **`HttpBackend`** (no interceptors; avoids circular DI), `me()` (calls `/auth/me` via `HttpClient`, returns `Observable<User>`).
   - Scope: `app-client/src/app/core/services/auth.service.ts`
   - Depends on: task 1, 2
     4b. **Auth retry interceptor** — Extend `credentialsInterceptor`: `withCredentials: true` on all requests; on **401**, call **`POST /auth/refresh`** once, retry original request with **`X-Auth-Retry`** header; skip `/auth/refresh`, `/auth/logout`, `/auth/google`; on refresh failure clear store and navigate to `/login` except for failed `/auth/me` (anonymous bootstrap).
   - Scope: `app-client/src/app/core/interceptors/credentials.interceptor.ts`
   - Depends on: task 1, 4
5. **Wire session rehydration** — `provideAppInitializer` in `app.config.ts` calls `authService.me()`, then `authStore.setUser(user)` on app boot.
   - Scope: `app-client/src/app/app.config.ts`
   - Depends on: task 3, 4
6. **Create auth and guest guards** — Functional `authGuard` redirects to `/login` when `authStore.isAuthenticated()` is false; `guestGuard` redirects to `/` when authenticated.
   - Scope: `app-client/src/app/core/guards/auth.guard.ts`, `guest.guard.ts`
   - Depends on: task 3
7. **Create Login feature** — Login page with "Sign in with Google" button that triggers `authService.login()` redirect.
   - Scope: `app-client/src/app/features/auth/login/` (login.ts, login.html)
   - Depends on: task 4
8. **Create Home feature** — Welcome message, user email, "Sign out" calling `authService.logout()` then `authStore.setUser(null)` and `router.navigate` to `/login` (handle HTTP errors the same way).
   - Scope: `app-client/src/app/features/home/` (home.ts, home.html)
   - Depends on: task 3, 4
9. **Wire routes** — Add `/login` route (guestGuard), protect default route with `authGuard`.
   - Scope: `app-client/src/app/app.routes.ts`
   - Depends on: task 6, 7, 8
10. **Environment config** — `EnvironmentService` injectable with `apiUrl`; `environment.ts` for dev (`http://localhost:3000/api`).
    - Scope: `app-client/src/environments/`
    - Depends on: none

### Artifacts

- Components: `Login`, `Home`
- Stores: `AuthStore` (NgRx Signal Store) at `core/stores/auth.store.ts`
- Services: `AuthService` at `core/services/auth.service.ts`
- Guards: `authGuard`, `guestGuard`
- Interceptors: `credentialsInterceptor` — `withCredentials: true` + **401 → refresh once → retry** (`X-Auth-Retry`)
- Routes: updated `app.routes.ts` with lazy-loaded Login and Home
- Models: `User`
- Other: `environments/environment.ts`, `environments/environment.service.ts`

---

## Shared / Cross-Cutting Concerns

- **API Base URL**: Backend auth routes at `/auth/google`, `/auth/me`, **`/auth/refresh`**, **`/auth/logout`**. Frontend must know backend URL for login redirect and HTTP calls. Use environment variables.
- **CORS**: Backend must set `credentials: true` and allow frontend origin. Frontend `withCredentials: true` for cookies.
- **Cookie domain**: In production, cookie may need `domain` set for subdomain sharing; for local dev, `localhost` works without domain.

---

## Execution Order

- **Backend** and **Frontend** tracks can run concurrently.
- Frontend task 5 (session rehydration) and task 9 (routes) implicitly depend on backend `/auth/me` existing, but implementation can proceed in parallel—frontend will call the endpoint once backend is running.
- Manual verification: Run both services, click "Sign in with Google", complete OAuth, verify redirect back and `/auth/me` returns user; with a short access TTL, confirm a protected API or **page refresh** triggers silent refresh and session still works; **Sign out** clears cookies and returns to `/login`.
