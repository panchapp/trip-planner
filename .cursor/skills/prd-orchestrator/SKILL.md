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

### 2.5 Save the Plan (required before execution)

Once approved, **write the plan to the repository** as `PLAN.md` inside the PRD folder:

```
PRDs/<prd-folder>/PLAN.md
```

**Rules:**

- This file is the **single source of truth** for implementation and for subagent prompts. Subagents must be given sections pasted from this file or the path `PRDs/<prd-folder>/PLAN.md`.
- **Do not** treat Cursor plan artifacts (e.g. files under `.cursor/plans/`) as a substitute for `PRDs/<prd-folder>/PLAN.md`. If planning used a Cursor plan UI, still **materialize** the same content into `PRDs/<prd-folder>/PLAN.md` before Phase 3.
- **Do not** launch parallel implementation tasks until `PLAN.md` exists at the path above and matches what the user approved.

---

## Phase 3 — Execute

After the user confirms the plan, switch back to **Agent mode** (the user will do this when approving from plan mode) and launch implementation.

### 3.0 Gate — verify `PLAN.md` on disk

Before any implementation or parallel work:

1. Confirm `PRDs/<prd-folder>/PLAN.md` exists in the workspace.
2. If it is missing, **create it now** with the approved plan content (same template as §2.3), then proceed.
3. Only after step 1–2 are satisfied, continue to §3.1.

### 3.1 Launch Parallel Tasks

Use the `Task` tool to launch up to **2 subagents concurrently** — one per track that applies. Both calls go in the **same message** so they run in parallel.

**Prerequisite:** §3.0 complete (`PLAN.md` present under `PRDs/<prd-folder>/`).

#### Backend Task Prompt Template

```
You are implementing the backend track of a PRD.

## Mandatory Skills (MUST follow)

You MUST read and apply the following skill. Do not write any backend code without following its patterns:
- `.cursor/skills/nestjs-service/SKILL.md` — apply ALL NestJS conventions from this skill
- `app-service/CLAUDE.md`

## PRD
<paste the full PRD content or reference the file path>

## Plan — Backend Track
<paste only the Backend Track section from the approved PLAN.md>

## Instructions

1. Read `.cursor/skills/nestjs-service/SKILL.md` and `app-service/CLAUDE.md` BEFORE writing any code. These are mandatory.
2. Implement each backend task in order, respecting dependencies.
3. Follow ALL patterns from the nestjs-service skill — no exceptions.
4. After implementation, run `pnpm --filter app-service build` to verify the build passes.
5. Run `pnpm --filter app-service lint` and fix any lint errors you introduced.
6. Return a summary of all files created or modified, and any issues encountered.
```

#### Frontend Task Prompt Template

```
You are implementing the frontend track of a PRD.

## Mandatory Skills (MUST follow)

You MUST read and apply the following skill. Do not write any frontend code without following its patterns:
- `.cursor/skills/angular-client/SKILL.md` — apply ALL Angular conventions from this skill
- `app-client/CLAUDE.md`

## PRD
<paste the full PRD content or reference the file path>

## Plan — Frontend Track
<paste only the Frontend Track section from the approved PLAN.md>

## Instructions

1. Read `.cursor/skills/angular-client/SKILL.md` and `app-client/CLAUDE.md` BEFORE writing any code. These are mandatory.
2. Implement each frontend task in order, respecting dependencies.
3. Follow ALL patterns from the angular-client skill — no exceptions.
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
- [ ] Plan saved as **`PRDs/<prd-folder>/PLAN.md`** in the repo (not only a Cursor/UI plan)
- [ ] Gate §3.0 satisfied before any code or parallel `Task` runs
- [ ] User explicitly approved the plan before execution
- [ ] Parallel tasks launched with correct skill references (same message, up to 2 tracks)
- [ ] Each task reads its corresponding skill file first
- [ ] Build and lint verified per package
- [ ] Consolidated report presented to user
