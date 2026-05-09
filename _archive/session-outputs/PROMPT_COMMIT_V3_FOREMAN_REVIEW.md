# Claude Code — Atomic Task: Commit FOREMAN_REVIEW for M4_CAMPAIGNS_MAKE_BODY_FIX_V3

> **Purpose:** Commit the FOREMAN_REVIEW.md that opticup-strategic just authored. Single file, single commit.

---

## First Action — Continuation

- `git remote -v` is `opticalis/opticup`, branch is `develop`. ✅
- `git log -1` shows `009a1f7 chore(spec): close M4_CAMPAIGNS_MAKE_BODY_FIX_V3 with retrospective`. If different — STOP.
- `git status`: 3 guardian files modified, untracked outputs/strays + **NEW: `modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_MAKE_BODY_FIX_V3/FOREMAN_REVIEW.md`** (untracked).

If state diverges — STOP and report.

---

## Steps

### Step 1 — Stage

```bash
git add "modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_MAKE_BODY_FIX_V3/FOREMAN_REVIEW.md"
git status
```

Expected: 1 file staged.

### Step 2 — Diff sanity

```bash
git diff --staged | grep -iE 'fbsync_[a-f0-9]+'
```

Expected: zero matches.

### Step 3 — Integrity gate

```bash
npm run verify:integrity
```

Must exit 0 (or exit 2 advisory).

### Step 4 — Commit

```bash
git commit -m "docs(spec): FOREMAN_REVIEW for M4_CAMPAIGNS_MAKE_BODY_FIX_V3 (verdict: 🟢 CLOSED — pipeline operational)"
```

If pre-commit fails — STOP. Don't use `--no-verify`.

### Step 5 — Push

```bash
git push origin develop
```

### Step 6 — Final verification

```bash
git log --oneline -5
git status
```

Expected: new commit on top, dirty state same as session start minus the FOREMAN_REVIEW.

---

## Output Format

1. Step 1: `git status` confirming 1 file staged.
2. Step 2: zero secret matches.
3. Step 4: commit hash.
4. Step 5: push success.
5. Step 6: final state (last 5 commits + status).
6. Confirmation: "FOREMAN_REVIEW committed. Sequence M4_CAMPAIGNS_MAKE_BODY_FIX V1+V2+V3 fully closed. Ready for next strategic step (Daniel activates schedule)."

---

## Stop-on-Deviation

- Anything other than the 1 expected file is staged.
- Pre-commit hook fails.
- `git push` rejected.

---

## Time Estimate

1–2 minutes.

---

*End of prompt.*
