# Claude Code — Atomic Task: Retroactively close M4_PRE_MERGE_HIGH_FIXES

> **Purpose:** The 2 HIGH fixes were executed inline (commits `c190751` and `0d7f4f5`) before the formal SPEC arrived. This task creates the SPEC folder retroactively to preserve the folder-per-SPEC discipline, with an EXECUTION_REPORT that explains the situation.
> **Author:** opticup-strategic (Cowork session 2026-04-26 evening)

---

## First Action — Continuation

- `git remote -v` is `opticalis/opticup`, branch is `develop`. ✅
- `git log -1` shows `0d7f4f5 fix(crm): add 0507168471 to phone allowlist...` (HIGH-2 commit, the most recent).
- `git status`: 3 guardian files modified, untracked `outputs/SPEC_M4_PRE_MERGE_HIGH_FIXES.md`, untracked `outputs/PROMPT_*.md` files.

If state diverges — STOP and report.

---

## Steps

### Step 1 — Move the SPEC into its canonical folder

```bash
mkdir -p "modules/Module 4 - CRM/docs/specs/M4_PRE_MERGE_HIGH_FIXES"
mv "outputs/SPEC_M4_PRE_MERGE_HIGH_FIXES.md" "modules/Module 4 - CRM/docs/specs/M4_PRE_MERGE_HIGH_FIXES/SPEC.md"
```

Use plain `mv` (untracked file).

Verify:
```bash
ls "modules/Module 4 - CRM/docs/specs/M4_PRE_MERGE_HIGH_FIXES/"
```
Should show `SPEC.md`.

### Step 2 — Write EXECUTION_REPORT.md

Create `modules/Module 4 - CRM/docs/specs/M4_PRE_MERGE_HIGH_FIXES/EXECUTION_REPORT.md` with the following content (verbatim — copy/paste exactly):

```markdown
# EXECUTION_REPORT — M4_PRE_MERGE_HIGH_FIXES

> **Verdict:** 🟢 SUCCESS (retroactive close — fixes already in develop)
> **Executor:** opticup-executor (Claude Code, 🖥️ Windows desktop, 2026-04-26 evening)
> **Run window:** 2026-04-26 — fixes executed before formal SPEC authored

---

## 1. Summary

This SPEC is closing **retroactively**. The 2 HIGH findings (HIGH-1 Activity Log column drift, HIGH-2 phone allowlist gap) from `M4_PRE_MERGE_QA/QA_REPORT.md` were fixed inline by Claude Code based on a short Hebrew dispatch prompt that Daniel sent directly to a Claude Code session, **before** the formal `M4_PRE_MERGE_HIGH_FIXES` SPEC arrived from the Foreman. By the time the formal SPEC was issued, the fixes had already landed and pushed to develop.

To preserve the folder-per-SPEC discipline (CLAUDE.md §7 Authority Matrix), this SPEC folder is now created retroactively with this report explaining the situation. No new code is committed by this retrospective — only the SPEC.md (moved to its canonical location), this EXECUTION_REPORT.md, and the FOREMAN_REVIEW.md from opticup-strategic.

## 2. What was done (per-commit)

| # | Hash | Message | Files | Source |
|---|------|---------|-------|--------|
| 1 | `c190751` | `fix(crm): activity log selects employees.name (not full_name)` | `modules/crm/crm-activity-log.js` | Hebrew dispatch prompt from Daniel |
| 2 | `0d7f4f5` | `fix(crm): add 0507168471 to phone allowlist in send-message + dispatch-queue (deploys v9, v3)` | `supabase/functions/send-message/index.ts`, `supabase/functions/dispatch-queue/index.ts` | Same dispatch |

Both commits pushed to origin/develop ~15 minutes before this retroactive close.

EFs redeployed:
- `send-message` v9 ACTIVE
- `dispatch-queue` v3 ACTIVE

## 3. Deviations from SPEC

The fixes match the SPEC's success criteria 1–10 exactly:
- HIGH-1: 2-line column-name fix in `crm-activity-log.js`, verified via Chrome MCP (Activity Log shows employee names).
- HIGH-2: `0507168471` appended to both EF allowlists, both EFs redeployed, curl test confirmed `template_not_found` (not `phone_not_allowed`) — the allowlist gate now passes for the new number.

The only deviation is procedural: the work happened before the formal SPEC arrived. Future SPECs of this kind should be issued before the dispatch prompt to keep the trail clean.

## 4. Decisions made in real time

None — the inline fixes were straightforward and matched what the QA_REPORT prescribed.

## 5. What would have helped

A clearer protocol for "user wants this fix NOW, formal SPEC will follow" — currently this manifested as parallel work streams. See FOREMAN_REVIEW for a proposal.

## 6. Iron-Rule Self-Audit

| Rule | Status |
|---|---|
| 7 (API abstraction) | Pre-existing violation in `crm-activity-log.js` not fixed — out of scope per QA_REPORT |
| 9 (no hardcoded business values) | Pre-existing hardcoded allowlist not refactored — out of scope |
| 21 (no orphans) | ✅ no new files |
| 22 (defense-in-depth) | N/A |
| 23 (no secrets) | ✅ no secrets in either commit's diff |
| 31 (integrity gate) | ✅ both pre-fix commits passed pre-commit hooks |

## 7. Self-Assessment

- **Adherence to SPEC:** N/A — fixes preceded SPEC. Both fixes match SPEC success criteria as authored.
- **Adherence to Iron Rules:** 10. Both pre-existing rule violations explicitly out of scope per QA_REPORT.
- **Commit hygiene:** 10. Two clean atomic commits, no scope creep.

## 8. Self-Improvement: 1 proposal for opticup-executor

**Proposal — handle "fix already done, SPEC arrives later" gracefully.**

When an executor receives a SPEC and finds the work already done in recent commits (verified by `git log` against the SPEC's success criteria), the executor should:
1. Detect the match by comparing `git log` since SPEC's pre-flight HEAD against the SPEC's expected commits.
2. STOP per Bounded Autonomy.
3. Report: "SPEC's work is already in develop at commits X+Y. Recommend retroactive close."

This avoids attempting Edit on already-edited file state (which is what triggered the STOP today — `old_string` not found because the fix already applied).

---

*End of EXECUTION_REPORT. Retroactive close — fixes were already in develop when SPEC arrived.*
```

### Step 3 — Verify the FOREMAN_REVIEW exists

Check whether `modules/Module 4 - CRM/docs/specs/M4_PRE_MERGE_HIGH_FIXES/FOREMAN_REVIEW.md` exists. The strategic chat will write it separately. If it doesn't exist yet — that's fine, it will be added in a follow-up commit. Don't write it yourself.

### Step 4 — Commit and push

Stage the 2 files explicitly:
```bash
git add "modules/Module 4 - CRM/docs/specs/M4_PRE_MERGE_HIGH_FIXES/SPEC.md" "modules/Module 4 - CRM/docs/specs/M4_PRE_MERGE_HIGH_FIXES/EXECUTION_REPORT.md"
git status
```

Expected: 2 files staged. Other dirty/untracked state preserved.

Verify diff sanity:
```bash
git diff --staged | grep -iE 'fbsync_[a-f0-9]+'
```
Expected: zero matches.

Run integrity gate:
```bash
npm run verify:integrity
```
Must exit 0 (or exit 2 advisory).

Commit:
```bash
git commit -m "chore(spec): retroactively close M4_PRE_MERGE_HIGH_FIXES — fixes already in c190751+0d7f4f5"
```

If pre-commit fails — STOP. Don't bypass.

Push:
```bash
git push origin develop
```

### Step 5 — Final verification

```bash
git log --oneline -5
git status
```

Expected:
- New commit on top.
- Dirty state: 3 guardian files modified + untracked outputs/strays (minus the SPEC file moved out of outputs).

---

## Output Format

Return one consolidated message:

1. Step 1: SPEC moved to canonical folder.
2. Step 2: EXECUTION_REPORT created.
3. Step 4: 2 files staged, integrity gate exit 0, commit hash, push success.
4. Step 5: final `git log -5` + `git status`.
5. Confirmation: "M4_PRE_MERGE_HIGH_FIXES retroactively closed. Awaiting Foreman to write FOREMAN_REVIEW.md and commit it separately."

---

## Stop-on-Deviation

- More/fewer than 2 files staged.
- Pre-commit fails.
- `git push` rejected.
- Any modification to actual code files (the EXECUTION_REPORT references commits c190751 + 0d7f4f5 — those are immutable history; don't try to amend).

---

## Time Estimate

3-5 minutes. Move + write + commit.

---

## Iron Rule Compliance

- **Rule 21 (no orphans):** the SPEC folder is now in its canonical location, not orphaned in `outputs/`.
- **Rule 23 (no secrets):** EXECUTION_REPORT masks any secret values.
- **Rule 31 (integrity gate):** runs before commit.

---

*End of prompt.*
