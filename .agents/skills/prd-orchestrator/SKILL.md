---
name: prd-orchestrator
description: Orchestrate full-stack feature implementation from a PRD document. Use when the user references a PRD file or asks to implement a feature described in a PRD. Reads the PRD, switches to plan mode for analysis and user approval, then launches parallel backend (NestJS) and frontend (Angular) tasks.
---

# PRD Orchestrator

Multi-phase pipeline that turns a PRD document into implemented code across the monorepo.

---

## Phase 1 — Ingest the PRD

1. Identify the PRD file path from the user's message (e.g. `PRDs/01-authentication-system/PRD.md`).
2. Read the PRD file in full.
3. Determine the **PRD folder** (parent directory of the PRD file) — all plan artifacts will be stored there.

---

## Phase 2 — Plan

### 2.1 Switch to Plan Mode

Call `SwitchMode` with `target_mode_id: "plan"` immediately after reading the PRD. The planning phase is **read-only** — no code changes.

### 2.2 Analyze the PRD

Break the PRD down into concrete work items. For each item determine:

- **Layer**: `backend`, `frontend`, or `shared` (affects both).
- **Scope**: module / feature / file path where the change belongs.
- **Description**: what needs to be built or changed.
- **Dependencies**: which items must be completed before this one.

Classify work into two tracks:

| Track        | Package       | Skill to use     |
| ------------ | ------------- | ---------------- |
| **Backend**  | `app-service` | `nestjs-service` |
| **Frontend** | `app-client`  | `angular-client` |

A PRD may require only one track or both — adjust accordingly.

### 2.3 Draft the Implementation Plan

Produce a structured markdown plan with the following template:

```markdown
# Implementation Plan — <PRD Title>

> Source: `<path to PRD file>`
> Generated: <date>

## Summary

<1–3 sentence overview of what will be built>

## Backend Track

> Skip this section entirely if no backend work is needed.

### Tasks

1. **<task name>** — <description>
   - Scope: `<module/file path>`
   - Depends on: <dependency or "none">
2. ...

### Artifacts

- Modules: ...
- Controllers: ...
- Services: ...
- DTOs: ...
- Entities: ...
- Other: ...

## Frontend Track

> Skip this section entirely if no frontend work is needed.

### Tasks

1. **<task name>** — <description>
   - Scope: `<feature/file path>`
   - Depends on: <dependency or "none">
2. ...

### Artifacts

- Components: ...
- Services: ...
- Guards / Interceptors: ...
- Routes: ...
- Models: ...
- Other: ...

## Shared / Cross-Cutting Concerns

- <item if any, otherwise remove section>

## Execution Order

<Brief note on parallelism: both tracks run concurrently unless a frontend task explicitly depends on a backend artifact.>
```

### 2.4 Present the Plan and Get Approval

1. Show the full plan to the user.
2. **Explicitly ask for confirmation** — do NOT proceed without it. Example prompt:

   > "Here is the implementation plan. Please review it and let me know if you'd like any changes, or confirm to proceed with implementation."

3. If the user requests changes, revise the plan and ask again.
4. Repeat until the user explicitly approves.

### 2.5 Save the Plan

Once approved, write the plan as `PLAN.md` inside the PRD folder:

```
PRDs/<prd-folder>/PLAN.md
```

---

## Phase 3 — Execute

After the user confirms the plan, switch back to **Agent mode** (the user will do this when approving from plan mode) and launch implementation.

### 3.1 Launch Parallel Tasks

Use the `Task` tool to launch up to **2 subagents concurrently** — one per track that applies. Both calls go in the **same message** so they run in parallel.

#### Backend Task Prompt Template

```
You are implementing the backend track of a PRD.

## Context

Read the following skills before writing any code:
- `.cursor/skills/nestjs-service/SKILL.md`
- `app-service/CLAUDE.md`

## PRD
<paste the full PRD content or reference the file path>

## Plan — Backend Track
<paste only the Backend Track section from the approved PLAN.md>

## Instructions

1. Read the skill files listed above FIRST.
2. Implement each backend task in order, respecting dependencies.
3. Follow all NestJS 11 patterns from the skill (modules, controllers, services, DTOs, repository pattern, Swagger decorators, etc.).
4. After implementation, run `pnpm --filter app-service build` to verify the build passes.
5. Run `pnpm --filter app-service lint` and fix any lint errors you introduced.
6. Return a summary of all files created or modified, and any issues encountered.
```

#### Frontend Task Prompt Template

```
You are implementing the frontend track of a PRD.

## Context

Read the following skills before writing any code:
- `.cursor/skills/angular-client/SKILL.md`
- `app-client/CLAUDE.md`

## PRD
<paste the full PRD content or reference the file path>

## Plan — Frontend Track
<paste only the Frontend Track section from the approved PLAN.md>

## Instructions

1. Read the skill files listed above FIRST.
2. Implement each frontend task in order, respecting dependencies.
3. Follow all Angular 21 patterns from the skill (standalone components, signals, inject(), built-in control flow, resource/rxResource, reactive forms, etc.).
4. After implementation, run `pnpm --filter app-client build` to verify the build passes.
5. Run `pnpm --filter app-client lint` and fix any lint errors you introduced.
6. Return a summary of all files created or modified, and any issues encountered.
```

### 3.2 Task Configuration

| Setting         | Value                                          |
| --------------- | ---------------------------------------------- |
| `subagent_type` | `generalPurpose`                               |
| `description`   | `"PRD backend track"` / `"PRD frontend track"` |

### 3.3 Single-Track PRDs

If only one track applies, launch **one** task — do not launch an empty task for the unused track.

---

## Phase 4 — Consolidate

After both tasks complete:

1. Review the summaries returned by each subagent.
2. Present a consolidated report to the user:
   - Files created / modified per track.
   - Build and lint status.
   - Any issues or follow-ups.
3. Suggest next steps (e.g. running tests, manual verification, committing with the `commit` skill).

---

## Quick Checklist

- [ ] PRD file read in full
- [ ] Switched to Plan mode before analyzing
- [ ] Plan covers both backend and frontend tracks (when applicable)
- [ ] Plan saved as `PLAN.md` in the PRD folder
- [ ] User explicitly approved the plan before execution
- [ ] Parallel tasks launched with correct skill references
- [ ] Each task reads its corresponding skill file first
- [ ] Build and lint verified per package
- [ ] Consolidated report presented to user
