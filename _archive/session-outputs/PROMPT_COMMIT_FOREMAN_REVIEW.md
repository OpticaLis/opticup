# Claude Code — Atomic Task: Commit FOREMAN_REVIEW for M4_CAMPAIGNS_MAKE_BODY_FIX

> **Purpose:** Commit the FOREMAN_REVIEW.md that opticup-strategic just authored at the SPEC's canonical folder. Single file, single commit.
> **Author:** opticup-strategic (Cowork session 2026-04-26 evening)

---

## Current Repo State (must match)

After the previous task (`PROMPT_EXECUTE_M4_CAMPAIGNS_MAKE_BODY_FIX`):
- HEAD = `7a2a4ef` (the retrospective commit closing the SPEC).
- `git status`: 3 guardian files modified (Sentinel-authored, leave alone) + untracked outputs/strays + **NEW: `modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_MAKE_BODY_FIX/FOREMAN_REVIEW.md`** (untracked, written by Cowork strategic chat).

If `git status` shows anything different — STOP and report.

---

## First Action — Continuation

This is a continuation. Skip the full First Action protocol. Confirm only:
- `git remote -v` is `opticalis/opticup`, branch is `develop`. ✅
- `git log -1` shows `7a2a4ef`.
- `FOREMAN_REVIEW.md` exists at the path above and is untracked.

---

## Scope

DO:
- `git add` only the FOREMAN_REVIEW.md file.
- Commit with the message specified below.
- Push to origin/develop.

DO NOT:
- Touch any other file.
- Stage guardian files or other untracked outputs.
- Use `git add -A` or `git add .`.
- Modify the FOREMAN_REVIEW.md content.

---

## Steps

### Step 1 — Stage the file

```bash
git add "modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_MAKE_BODY_FIX/FOREMAN_REVIEW.md"
git status
```

Expected: 1 file staged (FOREMAN_REVIEW.md). All other dirty/untracked state preserved.

If anything else is staged → STOP and report.

### Step 2 — Verify the diff sanity

```bash
git diff --staged | grep -iE 'fbsync_[a-f0-9]+'
```

Expected: zero matches (the FOREMAN_REVIEW masks all secrets — Rule 23).

If any match → STOP and report.

### Step 3 — Run integrity gate

```bash
npm run verify:integrity
```

Must exit 0 (or exit 2 advisory).

### Step 4 — Commit

```bash
git commit -m "docs(spec): FOREMAN_REVIEW for M4_CAMPAIGNS_MAKE_BODY_FIX (verdict: 🔴 REOPEN)"
```

If pre-commit hook fails → STOP. Do NOT use `--no-verify`.

### Step 5 — Push

```bash
git push origin develop
```

### Step 6 — Final verification

```bash
git log --oneline -3
git status
```

Expected:
- New commit on top.
- `git status` shows the same dirty state as session start MINUS FOREMAN_REVIEW.md (now committed).

---

## Output Format

Return one consolidated message:

1. Step 1: `git status` after staging — confirms 1 file staged.
2. Step 2: zero secret matches.
3. Step 4: commit hash.
4. Step 5: push success.
5. Step 6: final `git log` + `git status`.
6. Confirmation: "FOREMAN_REVIEW committed. Ready for next prompt (toy-scenario test SPEC)."

---

## Stop-on-Deviation

Stop and report if:
- `git status` shows anything other than the expected state.
- More than 1 file is staged.
- `grep` finds any secret literal.
- Pre-commit hook fails.
- `git push` is rejected.

---

## Time Estimate

1–2 minutes. One file, one commit.

---

*End of prompt. After commit lands, the strategic chat will issue the next prompt — the toy-scenario test SPEC.*
