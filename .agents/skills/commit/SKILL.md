---
name: commit
description: Generate conventional commit messages by analyzing git diffs. Use when the user asks for help with commits, writing commit messages, or when preparing to commit. Always asks whether it is a new commit or amend (unless intent is explicit), produces concise messages following commitlint rules, always provides bullet-point descriptions, and always asks for user confirmation before running the commit.
---

# Commit Skill

## When to Use

Apply this skill when the user wants to create or amend a commit, or write a commit message.

---

## Step 1: Ask Commit Type

**If the user's message already explicitly states the intent** (e.g., "amend the last commit", "create a new commit"), confirm what you understood and proceed directly to Step 2 — do not ask again.

**Otherwise, always ask first:**

> "Is this a **new commit** or an **amend** to the previous commit?"

**No shortcuts:** Short requests like "commit", "commit this", or "let's commit" do **not** imply new vs amend. Always ask the question above before gathering diffs, drafting a message, or staging—never assume **new commit**.

**One question at a time:** In the first turn, ask **only** for new commit vs amend—do not draft a commit message, do not ask for approval to run `git commit`, and do not combine those with this question. Wait for the user's answer, then run Steps 2–4 and use a later turn for Step 5 (confirmation).

Do not proceed until the user answers (or intent is already explicit).

---

## Step 2: Gather Context

### New Commit

- Run `git diff --staged` to see staged changes
- Run `git status` for file overview
- If nothing is staged, run `git diff` and offer to stage changes:
  - **Default**: offer `git add .` to stage everything
  - **Selective**: list changed files and ask which ones to include
- If there are **unstaged changes alongside staged ones**, mention them and ask if the user wants to include any before proceeding

### Amend

- Run `git log -1 -p` to see the **previous commit** (message + diff)
- Run `git diff --staged` to see **new staged changes** for the amend
- Run `git status` for file overview
- If there are **unstaged changes alongside staged ones**, mention them and ask if the user wants to include any before proceeding
- Evaluate previous commit and new staged changes together using the logic in Step 7

---

## Step 3: Commit Message Format (commitlint / Conventional Commits)

Follow `@commitlint/config-conventional`. The message must pass `pnpm exec commitlint`.

### Structure

```
type(scope): subject

- bullet point per logical change
- ...
```

The **subject line** is the first line. The **body** (bullet points) is separated from the subject by one blank line. Both the subject and the body are part of the actual git commit message.

### Allowed Types (lowercase)

| Type     | Use for                                         |
| -------- | ----------------------------------------------- |
| feat     | New feature                                     |
| fix      | Bug fix                                         |
| docs     | Documentation only                              |
| style    | Formatting, whitespace, no code change          |
| refactor | Code change that neither fixes nor adds feature |
| perf     | Performance improvement                         |
| test     | Adding or updating tests                        |
| build    | Build system, dependencies                      |
| ci       | CI configuration                                |
| chore    | Other changes (maintenance, tooling)            |

### Rules

- **Subject**: imperative mood, lowercase start, no period, max 72 chars
- **Scope**: optional noun in parentheses (e.g. `auth`, `api`, `client`)
- **Body**: always present — one blank line after subject, then one bullet point per logical change
- **Breaking change**: add `!` after type/scope or `BREAKING CHANGE:` in footer
- **No AI/tool attribution**: never include editor, assistant, or model attribution (footers, vendor tags, co-author lines for the tool) in the commit message — only project-related information
- **Multi-concern diffs**: if the staged changes span unrelated concerns (multiple features, mixed fixes and refactors), suggest the user split into smaller commits before proceeding rather than forcing them into a single message

### Examples

```
feat(trips): add trip creation form with validation

- add TripForm component with date and destination fields
- add reactive form with Validators for required fields
- connect form submit to trips API service
```

```
fix(api): handle null response in user fetch

- add null check before accessing user properties
- return 404 when user is not found
```

```
refactor(client): extract form validation into shared utility

- move date range validator to shared/validators
- update TripForm and BookingForm to use shared validator
```

---

## Step 4: Output Format

Present the proposed commit to the user in this format:

### Commit Message

Show the exact commit message (subject + body) that will be used in the `git commit` command:

```
type(scope): subject

- bullet 1
- bullet 2
```

### Summary

If useful, add a brief explanation of _why_ this grouping makes sense or any notes — but this section is for the user only and does NOT go into the commit.

---

## Step 5: Confirm Before Committing

**Only after** Steps 2–4, **always ask before running the commit:**

> "Do you agree with this commit message? Should I proceed with the commit?"

Do not run `git commit` (or `git commit --amend`) until the user confirms. Wait for explicit approval.

---

## Step 6: Execute and Verify

After the user confirms:

1. Run the `git commit` (or `git commit --amend`) command.
2. Run `pnpm exec commitlint --last` to verify the commit message passes linting.
3. If commitlint **fails**:
   - Read the error output to identify the rule violation.
   - Fix the message and create a **new commit** (do NOT amend unless the user originally chose amend).
   - Show the corrected message and ask for confirmation again.
4. Run `git status` to confirm the commit succeeded.

---

## Step 7: Amend-Specific Logic

When the user chose **amend**, apply this logic as part of Steps 2–4 before drafting the message:

1. Summarize what the **previous commit** did (from `git log -1 -p`)
2. Summarize what the **new staged changes** add or change
3. Decide if they belong together:
   - **Same logical change**: Use one type and one subject that covers both
   - **Different concerns**: Suggest splitting into separate commits instead of amending
4. Produce a **unified** commit message and description that reflects the combined changes
5. If the previous message was good, prefer refining it over rewriting from scratch

---

## Quick Checklist

- [ ] Asked: new commit or amend — or confirmed explicit intent from user's message
- [ ] Gathered correct diffs (staged for new; previous + staged for amend)
- [ ] Staged changes if needed (offered `git add .` or selective staging)
- [ ] Mentioned unstaged changes if present alongside staged ones
- [ ] For amend: evaluated both previous and new changes together (Step 7)
- [ ] Suggested splitting if diff spans unrelated concerns
- [ ] Type is from allowed enum (feat, fix, docs, style, refactor, perf, test, build, ci, chore)
- [ ] Subject is imperative, lowercase, no trailing period, max 72 chars
- [ ] Body with bullet points included in the commit message
- [ ] No AI/tool attribution anywhere in the message
- [ ] Asked: do you agree? (before running commit)
- [ ] Verified with `commitlint` after committing
