# PRD: Authentication System (Google OAuth + NestJS + PostgreSQL)

## 1. Overview

This document defines the requirements for a secure, cookie-based authentication system. The **NestJS** backend serves as the "Brain," handling all sensitive OAuth exchanges and session persistence, while **Angular 21** manages the reactive UI state.

---

## 2. Objectives

- **Server-Side Security:** All OAuth Secrets (Client Secret, Token exchange) remain strictly on the NestJS server.
- **Persistent Sessions:** Use HTTP-Only, Secure cookies for **short-lived access JWTs** and **long-lived refresh JWTs** (refresh token hash stored server-side), ensuring the frontend never "touches" raw tokens.
- **Relational Integrity:** Leverage **PostgreSQL** for robust user management and future-proofing for AI-driven data relationships.

---

## 3. Technical Stack

- **Frontend:** Angular 21 (Signals & Functional Interceptors).
- **Backend:** NestJS with `@nestjs/passport` and `passport-google-oauth20`.
- **Database:** **PostgreSQL** (using TypeORM or Prisma).
- **Session:** **Access** JWT in `access_token` and **refresh** JWT in `refresh_token` — both **HTTP-Only, Secure, SameSite=Lax** cookies. Only a **hash** of the refresh token is persisted in PostgreSQL; refresh tokens **rotate** on each use.

---

## 4. Functional Requirements

### 4.1 Backend (The Brain)

| Requirement          | Description                                                                                                                                                                                                                                                                      |
| :------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Secret Isolation** | `GOOGLE_CLIENT_ID` and `SECRET` must be stored in `.env`/Vault; never exposed to the client.                                                                                                                                                                                     |
| **OAuth Strategy**   | Implement Passport Google Strategy to handle the handshake and profile extraction.                                                                                                                                                                                               |
| **User Schema**      | A PostgreSQL `users` table (`id`, `email`, `googleId`, names, `avatarUrl`, `createdAt`) and a separate **`refresh_tokens`** table (`id`, `user_id` FK, `token_hash`, `expires_at`, `created_at`) storing only **hashed** refresh tokens for rotation and per-session revocation. |
| **Identity Logic**   | On callback, check if the `googleId` exists. If not, perform a `SELECT/INSERT` (Upsert) operation.                                                                                                                                                                               |
| **Cookie Issuance**  | Set `Set-Cookie` for **access** and **refresh** JWTs. Attributes: `HttpOnly`, `Secure`, `SameSite=Lax`. Access and refresh TTLs are configurable via env.                                                                                                                        |
| **Session API**      | `/auth/me` endpoint decodes the **access** cookie and returns the user profile. **`POST /auth/refresh`** rotates tokens using the **refresh** cookie. **`POST /auth/logout`** clears cookies and revokes stored refresh state when valid.                                        |

### 4.2 Frontend (Angular 21 Client)

| Requirement            | Description                                                                                                                                                                                                                                                                                |
| :--------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **Login Trigger**      | `window.location.href = 'https://api.panchapp.com/auth/google'`                                                                                                                                                                                                                            |
| **Auth Store**         | Use an **Angular Signal** (e.g., `currentUser = signal<User                                                                                                                                                                                                                                | null>(null)`) to drive UI visibility. |
| **Credential Sharing** | Configure the global HTTP client to use `withCredentials: true` so the browser sends cookies automatically.                                                                                                                                                                                |
| **Silent refresh**     | On **401** from an API call (except auth bootstrap edge cases), automatically **`POST /auth/refresh` once**, retry the original request with an `X-Auth-Retry` marker; if refresh fails, clear user state and redirect to `/login` when appropriate (not for failed anonymous `/auth/me`). |
| **Logout**             | **`POST /auth/logout`** from the client (e.g. Sign out), then clear local auth state and navigate to `/login`. `refresh`/`logout` HTTP calls use a client **without** the retry interceptor to avoid circular refresh.                                                                     |
| **Guard Logic**        | Functional `authGuard` that redirects to `/login` if the `currentUser` signal is null.                                                                                                                                                                                                     |

---

## 5. Data Flow & Logic

1.  **Handshake:** Angular initiates the redirect to the NestJS OAuth route.
2.  **External Auth:** User authenticates with Google.
3.  **Server Processing:** \* NestJS receives the callback.
    - Queries **PostgreSQL** to find or create the user record.
    - Signs **access** and **refresh** JWTs containing `userId` (typed claims: `access` vs `refresh`), inserts a **`refresh_tokens`** row with a **hash** of the refresh token for validation/rotation.
4.  **Cookie Drop:** NestJS sends a redirect response (302) to the Angular app URL, attaching **both** tokens in **HTTP-Only** cookies.
5.  **Rehydration:** Angular app boots up, calls `/auth/me` with the **access** cookie. NestJS returns the user details.
6.  **Refresh:** When the access token expires, API calls may receive **401**; the Angular **HTTP interceptor** performs **`POST /auth/refresh`** once (with credentials), then retries the failed request. The server validates JWT + `refresh_tokens` row, issues **new** access + refresh cookies (rotation).
7.  **Logout:** User triggers **`POST /auth/logout`** from the UI; the server clears cookies and deletes the matching `refresh_tokens` row when a valid refresh cookie is present; the app clears signals and routes to `/login`.

---

## 6. Security Considerations

- **DB Protection:** Use parameterized queries (via ORM) to prevent SQL injection.
- **XSS Prevention:** HTTP-Only cookies prevent scripts from stealing the session token.
- **CSRF Mitigation:** Use `SameSite=Lax` for auth cookies; **`POST /auth/refresh`** and **`POST /auth/logout`** are state-changing — prefer custom headers or additional CSRF defenses for production if cross-site cookies are a concern.
- **Refresh token rotation:** Each successful refresh invalidates the previous refresh token server-side (hash mismatch); reuse detection can be extended later.
- **SSL/TLS:** Cookies must be flagged as `Secure`, requiring HTTPS in all environments except `localhost`.

---

## 7. AI Agent Context

The PostgreSQL `user_id` will be the primary identifier passed to the AI agent. This allows the agent to query specific user relational data (like EHR records or travel preferences) with high referential integrity.
