# PRD: User Home Dashboard (Trip Management)

## 1. Overview

The User Home is the landing experience for authenticated users. It provides a comprehensive view of the user’s travel history, current state, and future aspirations. It serves as the primary entry point for the "Agentic AI" to suggest new plans or modifications to existing ones.

---

## 2. Objectives

- **Chronological Organization:** Clearly separate upcoming, active, and past trips.
- **High Performance:** Use Angular 21 Signals to handle real-time updates and "empty states" gracefully.
- **Data Integrity:** Ensure all trip data is relationally linked to the `User` entity in PostgreSQL.

---

## 3. Functional Requirements

### 3.1 Trip Categorization (The "Logic")

The backend (NestJS) must provide a filtered API or the frontend must compute categories based on the `startDate` and `endDate` fields:

- **Active Trip:** Current date falls between `startDate` and `endDate`.
- **Upcoming Trips:** `startDate` is in the future (sorted by proximity).
- **Past Trips:** `endDate` is in the past (archived view).
- **Drafts/AI Suggestions:** Trips created by the agent that haven't been "confirmed" or assigned dates yet.

### 3.2 UI Components (Angular 21)

| Component            | Description                                                                                    |
| :------------------- | :--------------------------------------------------------------------------------------------- |
| **Hero Greeting**    | Dynamic message (e.g., "Welcome back, [Name]! Your next flight to Tokyo is in 3 days.")        |
| **Trip Card**        | Visual summary showing: Destination, Date Range, a thumbnail image, and "Collaborators" count. |
| **Quick Action FAB** | A Floating Action Button to "Plan New Trip with AI."                                           |
| **Empty State**      | A specific view for new users with no trips, prompting the AI agent to start a conversation.   |

### 3.3 Data Schema Additions (PostgreSQL)

The `trips` table must relate to the `users` table:

- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key to `users`)
- `title`: Varchar
- `destination`: Varchar (or JSONB for Google Maps metadata)
- `start_date`: Timestamp (Nullable for drafts)
- `end_date`: Timestamp (Nullable for drafts)
- `status`: Enum ('draft', 'confirmed', 'cancelled')
- `cover_image_url`: Text

---

## 4. User Experience (UX) Flow

1.  **Load:** Upon successful OAuth login, the user is redirected to `/home`.
2.  **Hydration:** Angular calls `GET /api/trips`.
3.  **Display:** \* If a trip is "Active," it is pinned to the top with a "Current Trip" badge.
    - "Upcoming" trips are displayed in a horizontal scroll or grid.
    - "Past" trips are collapsed behind a "View History" toggle to reduce clutter.
4.  **Interaction:** Clicking a card navigates the user to the specific **Trip Details** or **Map View**.

---

## 5. Agentic AI Integration

The Home screen is where the "Brain" monitors user behavior:

- **Proactive Suggestions:** If a user has a "Past Trip" to Paris, the agent might show a small card: _"You enjoyed Paris! Want to see similar itineraries for Lyon?"_
- **Contextual Awareness:** The agent uses the `trips` table to avoid suggesting overlapping dates for new plans.

---

## 6. Technical Constraints & Security

- **Ownership:** The NestJS service must verify that the `user_id` in the `trips` table matches the `userId` in the session cookie for every request.
- **Pagination:** Use limit/offset for "Past Trips" to ensure the dashboard remains fast as the user's history grows.
- **Signals:** Use `computed()` signals in Angular to filter trips by status on the client side for instant UI switching.
