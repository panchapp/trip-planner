# PRD: Authentication System (Google OAuth + NestJS + PostgreSQL)

## 1. Overview

This document defines the requirements for a secure, cookie-based authentication system. The **NestJS** backend serves as the "Brain," handling all sensitive OAuth exchanges and session persistence, while **Angular 21** manages the reactive UI state.

---

## 2. Objectives

- **Server-Side Security:** All OAuth Secrets (Client Secret, Token exchange) remain strictly on the NestJS server.
- **Persistent Sessions:** Use HTTP-Only, Secure cookies to manage JWTs, ensuring the frontend never "touches" the raw token.
- **Relational Integrity:** Leverage **PostgreSQL** for robust user management and future-proofing for AI-driven data relationships.

---

## 3. Technical Stack

- **Frontend:** Angular 21 (Signals & Functional Interceptors).
- **Backend:** NestJS with `@nestjs/passport` and `passport-google-oauth20`.
- **Database:** **PostgreSQL** (using TypeORM or Prisma).
- **Session:** JWT stored in an **HTTP-Only, Secure, SameSite=Lax/Strict** Cookie.

---

## 4. Functional Requirements

### 4.1 Backend (The Brain)

| Requirement          | Description                                                                                                                              |
| :------------------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
| **Secret Isolation** | `GOOGLE_CLIENT_ID` and `SECRET` must be stored in `.env`/Vault; never exposed to the client.                                             |
| **OAuth Strategy**   | Implement Passport Google Strategy to handle the handshake and profile extraction.                                                       |
| **User Schema**      | A PostgreSQL `users` table containing: `id` (UUID), `email` (unique), `googleId`, `firstName`, `lastName`, `avatarUrl`, and `createdAt`. |
| **Identity Logic**   | On callback, check if the `googleId` exists. If not, perform a `SELECT/INSERT` (Upsert) operation.                                       |
| **Cookie Issuance**  | Set a `Set-Cookie` header with the JWT. Attributes: `HttpOnly`, `Secure`, `SameSite=Lax`.                                                |
| **Session API**      | `/auth/me` endpoint to decode the cookie and return the user profile to Angular.                                                         |

### 4.2 Frontend (Angular 21 Client)

| Requirement            | Description                                                                                                 |
| :--------------------- | :---------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **Login Trigger**      | `window.location.href = 'https://api.panchapp.com/auth/google'`                                             |
| **Auth Store**         | Use an **Angular Signal** (e.g., `currentUser = signal<User                                                 | null>(null)`) to drive UI visibility. |
| **Credential Sharing** | Configure the global HTTP client to use `withCredentials: true` so the browser sends cookies automatically. |
| **Guard Logic**        | Functional `authGuard` that redirects to `/login` if the `currentUser` signal is null.                      |

---

## 5. Data Flow & Logic

1.  **Handshake:** Angular initiates the redirect to the NestJS OAuth route.
2.  **External Auth:** User authenticates with Google.
3.  **Server Processing:** \* NestJS receives the callback.
    - Queries **PostgreSQL** to find or create the user record.
    - Signs a JWT containing the `userId`.
4.  **Cookie Drop:** NestJS sends a redirect response (302) to the Angular app URL, attaching the JWT in an **HTTP-Only** cookie.
5.  **Rehydration:** Angular app boots up, calls `/auth/me`. The browser sends the cookie. NestJS returns the user details.

---

## 6. Security Considerations

- **DB Protection:** Use parameterized queries (via ORM) to prevent SQL injection.
- **XSS Prevention:** HTTP-Only cookies prevent scripts from stealing the session token.
- **CSRF Mitigation:** Use `SameSite=Lax` for the auth cookie and consider a custom header check (e.g., `X-Requested-With`) for API calls.
- **SSL/TLS:** Cookies must be flagged as `Secure`, requiring HTTPS in all environments except `localhost`.

---

## 7. AI Agent Context

The PostgreSQL `user_id` will be the primary identifier passed to the AI agent. This allows the agent to query specific user relational data (like EHR records or travel preferences) with high referential integrity.
