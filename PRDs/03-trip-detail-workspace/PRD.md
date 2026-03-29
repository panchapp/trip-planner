# PRD: Trip Detail Workspace (Layout & Global Actions)

## 1. Executive Summary

The **Trip Detail Workspace** provides a structured, three-column environment for trip management. This document defines the skeletal framework, the metadata management in the header, and a persistent global footer for state persistence and primary actions.

## 2. Objectives

- **Layout Consistency:** Maintain a fixed 3-column architecture regardless of content.
- **Metadata Control:** Provide immediate access to core trip details (Name, Dates).
- **Guaranteed Persistence:** Ensure a dedicated Footer exists for saving changes and triggering primary system actions.

---

## 3. Structural Layout (Desktop-First)

The interface is divided into three primary vertical zones. Content within these zones is deferred to future implementation.

| Column            | Width | Role                                |
| :---------------- | :---- | :---------------------------------- |
| **Left Column**   | 25%   | Primary Sidebar / Interaction Zone  |
| **Middle Column** | 45%   | Central Visualization / Canvas Zone |
| **Right Column**  | 30%   | Data / Information List Zone        |

---

## 4. Functional Requirements

### 4.1 Header: Trip Metadata

The header is the primary entry point for defining the trip's scope.

- **Editable Trip Name:** A text input synced to the PostgreSQL `name` field.
- **Date Range Selection:** Interactive inputs for `start_date` and `end_date`.
- **State Sync:** Any changes in the header must update the global Angular Signal state for the trip.

### 4.2 Footer: Global Action Bar

A persistent bar at the bottom of the viewport containing the following:

- **Save Action:** A primary button to trigger a `PUT` or `PATCH` request to the NestJS service to persist all current changes (Metadata and Column data) to the PostgreSQL database.
- **Sync Status:** A visual indicator showing if changes are "Saved" or "Pending."
- **Secondary Actions:** Placeholders for shared actions (e.g., Export, Delete, or Share).

---

## 5. Technical Requirements

### 5.1 Backend (NestJS & PostgreSQL)

- **Upsert Logic:** The backend must handle incoming data from the "Save" action, updating the `trips` table and associated relational data in PostgreSQL.
- **Transaction Safety:** The "Save" operation should be transactional—if the metadata update fails, the associated column data changes should not persist.

### 5.2 Frontend (Angular 21)

- **Signal-Based Persistence:** A `isDirty` signal should track if the user has made changes that haven't been pushed to the server.
- **Global Footer Component:** A standalone component that listens to the `TripStore` signal and handles the "Save" event emission.

---

## 6. Constraints & Exclusions

- **Content Agnostic:** This PRD does not define the internal components of the three columns (e.g., Chat, Maps, or Lists).
- **Desktop Focus:** No responsive or mobile-specific layouts are considered in this version.
- **Secret Management:** As established, all API keys and OAuth secrets remain on the NestJS server; the frontend only interacts with the authenticated session.

---

## 7. Future Considerations

- **Auto-Save:** Implementing a debounce timer to trigger the "Save" action automatically after user inactivity.
- **AI Context Hook:** The footer may later include a toggle to "Send to AI" to process the current state of the 3-column layout.
