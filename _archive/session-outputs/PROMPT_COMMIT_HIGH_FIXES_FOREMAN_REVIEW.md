# Claude Code — Atomic Task: Commit FOREMAN_REVIEW for M4_PRE_MERGE_HIGH_FIXES

> **Purpose:** Commit the FOREMAN_REVIEW that closes the retroactive HIGH fixes loop.

---

## First Action — Continuation

- `git remote -v` is `opticalis/opticup`, branch is `develop`. ✅
- `git log -1` shows `4cce9d8 chore(spec): retroactively close M4_PRE_MERGE_HIGH_FIXES — fixes already in c190751+0d7f4f5`. If different — STOP.
- `git status`: 3 guardian files modified, untracked outputs/strays + **NEW: `modules/Module 4 - CRM/docs/specs/M4_PRE_MERGE_HIGH_FIXES/FOREMAN_REVIEW.md`** (untracked).

---

## Steps

### Step 1 — Stage

```bash
git add "modules/Module 4 - CRM/docs/specs/M4_PRE_MERGE_HIGH_FIXES/FOREMAN_REVIEW.md"
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
git commit -m "docs(spec): FOREMAN_REVIEW for M4_PRE_MERGE_HIGH_FIXES (verdict: 🟢 CLOSED retroactively — develop merge-ready)"
```

If pre-commit fails — STOP.

### Step 5 — Push

```bash
git push origin develop
```

### Step 6 — Final verification

```bash
git log --oneline -6
git status
```

---

## Output Format

1. Step 1: 1 file staged.
2. Step 2: zero secret matches.
3. Step 4: commit hash.
4. Step 5: push success.
5. Step 6: last 6 commits + status.
6. Confirmation: "FOREMAN_REVIEW committed. M4_PRE_MERGE_HIGH_FIXES fully closed. Develop merge-ready. Awaiting merge-prep SPEC from strategic chat."

---

## Stop-on-Deviation

- More/fewer than 1 file staged.
- Pre-commit fails.
- `git push` rejected.

---

## Time Estimate

1–2 minutes.

---

*End of prompt.*
