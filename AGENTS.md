# Agent Skills — Routing Table

This file maps tasks to the agent skills available in this monorepo.
All skills live under `.cursor/skills/` and are automatically surfaced by Cursor.

## Skill Routing

| Trigger / Task                                                                                           | Skill              | Path                                       |
| -------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------ |
| Writing, reviewing, or refactoring **Angular** components, services, guards, pipes, routes, or templates | `angular-client`   | `.cursor/skills/angular-client/SKILL.md`   |
| Writing, reviewing, or refactoring **NestJS** modules, controllers, services, DTOs, guards, or filters   | `nestjs-service`   | `.cursor/skills/nestjs-service/SKILL.md`   |
| Creating or amending a **git commit**, writing a commit message, or following commitlint conventions     | `commit`           | `.cursor/skills/commit/SKILL.md`           |
| Implementing a feature from a **PRD** document (full-stack, backend + frontend)                          | `prd-orchestrator` | `.cursor/skills/prd-orchestrator/SKILL.md` |

## How Skills Work

- Skills are **read on demand** — the agent reads the relevant `SKILL.md` as its first action before generating code or running commands.
- A single task may activate **multiple skills** (e.g., a PRD implementation activates `prd-orchestrator`, which in turn delegates to `angular-client` and `nestjs-service`).
- Skills are scoped to this monorepo. Global/cross-project skills live in `~/.cursor/skills-cursor/`.
