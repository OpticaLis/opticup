# SPEC — M4_MERGE_PREP

> **Module:** Module 4 - CRM
> **SPEC folder (final location for executor):** `modules/Module 4 - CRM/docs/specs/M4_MERGE_PREP/SPEC.md`
> **Author:** opticup-strategic (Cowork session 2026-04-26 evening)
> **Type:** Pre-merge documentation + handoff (no code, no DB)
> **Drives:** Final SESSION_CONTEXT update before Daniel manually merges develop → main. Produces a per-step manual merge guide for Daniel. After this SPEC and after Daniel completes the merge — Module 4 reaches Prizma production for event-manager testing.

---

## 1. Goal

Develop is merge-ready. The campaigns sequence (5 SPECs), the pre-merge QA, and the 2 HIGH fixes are all closed. Before Daniel runs the merge, this SPEC:

1. Refreshes `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` with the post-fix state so post-merge sessions have current context.
2. Produces a per-step manual merge guide at `outputs/INSTRUCTIONS_DANIEL_MERGE_TO_MAIN.md` for Daniel to follow.
3. Single commit, then handoff to Daniel.

This is a Housekeeping SPEC. No Hypothesis Ladder.

## 2. Background

### Where we are
- Last commit on develop: `f7ca532` (FOREMAN_REVIEW for M4_PRE_MERGE_HIGH_FIXES).
- Repo: clean delta (3 guardian files modified + outputs/strays untracked, expected since session start).
- Module 4 build phases: all closed.
- Pre-merge QA: clean. 4 HIGH findings either fixed (HIGH-1, HIGH-2) or accepted as debt (HIGH-3, HIGH-4).
- Pipeline operational on demo: 7 campaigns syncing every 4 hours.

### What changed on develop since last main merge
For Daniel's situational awareness — the merge to main brings these changes (high-level summary, not exhaustive):
- M4 Campaigns Screen built (KPI cards, table, drill-down, Unit Economics modal).
- Campaigns sync pipeline (Make scenario `9126542` + EF `facebook-campaigns-sync` v4 with env-based MAKE_SECRET).
- Iteration pattern documented at `modules/Module 4 - CRM/docs/make-patterns/README.md`.
- M4 payment lifecycle trio (schema + UI + automation) — already closed before this session.
- Activity Log column-name fix (HIGH-1).
- Phone allowlist `0507168471` added in `send-message` + `dispatch-queue` EFs (HIGH-2).
- Bootstrap-wire fix for campaigns dispatch (`f12605a`).
- 5 SPEC retrospectives (campaigns sequence) + QA report.

### What's NOT in this SPEC
- Code changes.
- DB writes.
- Make scenario edits.
- EF redeploys.
- The actual `git merge` (Daniel does manually per CLAUDE.md §9 working rule 7).
- HIGH-3 SECURITY DEFINER views fix.
- HIGH-4 STOREFRONT_ORIGIN per-tenant fix.
- Historical import (Monday → Supabase).
- P7 cutover.

## 3. Authority Envelope

DO:
- Edit `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` with post-fix state summary.
- Write `outputs/INSTRUCTIONS_DANIEL_MERGE_TO_MAIN.md` (already exists from prior author work; verify or refresh if stale).
- Single commit + push.

DO NOT:
- Touch any code file.
- Run any DB writes.
- Run `git merge` or `git checkout main`.
- Write the SESSION_CONTEXT in a way that grows past 100 added lines (cleanup-rule).
- Stage guardian files or unrelated outputs.

## 4. Success Criteria

1. ✅ `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` has a "Last updated: 2026-04-26 (merge-ready)" header line and a Phase History row near the top summarizing the 5-SPEC campaigns sequence + 2 HIGH fixes.
2. ✅ The Phase History row count and structure stays consistent with the existing table (don't break the formatting).
3. ✅ Total lines added to `SESSION_CONTEXT.md` ≤ 30.
4. ✅ `outputs/INSTRUCTIONS_DANIEL_MERGE_TO_MAIN.md` exists and contains a clear per-step guide (created or refreshed in this SPEC).
5. ✅ Single commit per §10. Pre-commit hooks pass.
6. ✅ `git status` clean delta at end (same as session start MINUS the SESSION_CONTEXT update).
7. ✅ `npm run verify:integrity` exits 0.

## 5. Stop-on-Deviation Triggers

1. **STOP** if `SESSION_CONTEXT.md` structure has drifted significantly from what the SPEC author expected (e.g., the Phase History table format changed). Read the file first, adapt, ask if uncertain.
2. **STOP** if any code file gets accidentally staged.
3. **STOP** if pre-commit hook fails.
4. **STOP** if `git push` is rejected.

## 6. Pre-flight Checks

1. `git log -1` shows `f7ca532`.
2. `git status` clean delta.
3. Branch is `develop`. Repo is `opticalis/opticup`.
4. Read `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` first 50 lines to confirm Phase History table structure.

## 7. QA Protocol

### Path 1 — SESSION_CONTEXT update
1. Read SESSION_CONTEXT.md head (first 100 lines).
2. Add new Phase History row at top of the table:
   ```
   | M4_MERGE_READY | ✅ READY FOR MERGE | All build phases closed. Campaigns sequence (5 SPECs: SCREEN + V1+V2+V3 + CLEANUP) closed; pipeline operational on demo (7 campaigns syncing every 4h via iteration pattern). Pre-merge QA (cef5618) found 4 HIGH; HIGH-1 (Activity Log column drift) + HIGH-2 (phone allowlist `0507168471`) fixed (c190751 + 0d7f4f5); HIGH-3 (SECURITY DEFINER views) + HIGH-4 (STOREFRONT_ORIGIN) accepted as debt. Bootstrap-wire fix (f12605a). Make → EF iteration pattern documented at modules/Module 4 - CRM/docs/make-patterns/README.md. **Daniel runs manual merge to main next.** |
   ```
3. Update header lines:
   - `> **Last updated:** 2026-04-26 (merge-ready — develop fully wrapped, awaiting Daniel's manual merge)`
   - `> **Status:** Develop merge-ready. Module 4 fully closed on demo: campaigns pipeline operational, payment lifecycle trio shipped, all pre-merge QA HIGH findings either fixed or explicitly deferred.`
   - `> **Next:** Daniel runs `git checkout main && git merge develop && git push && git checkout develop`. Then event manager testing on Prizma. Then post-merge SPECs for HIGH-3, HIGH-4, MEDIUM, LOW findings + historical import + P7 cutover.`

### Path 2 — Daniel merge instructions
1. Check if `outputs/INSTRUCTIONS_DANIEL_MERGE_TO_MAIN.md` exists.
2. If exists — read it, verify it matches the post-`f7ca532` state. If stale (cites older commit hashes), refresh.
3. If doesn't exist — create it (the strategic chat may have written it parallel to this SPEC; verify before creating fresh).
4. The instructions file should be self-contained and follow the pattern of prior `INSTRUCTIONS_DANIEL_*.md` files in `outputs/`.

### Path 3 — Commit
1. Stage explicitly:
   ```
   git add "modules/Module 4 - CRM/docs/SESSION_CONTEXT.md"
   ```
2. `git diff --staged` — verify only SESSION_CONTEXT changes.
3. Run integrity gate.
4. Commit:
   ```
   git commit -m "docs(crm): SESSION_CONTEXT update — develop merge-ready (M4 fully closed on demo)"
   ```
5. Push.

The `outputs/INSTRUCTIONS_DANIEL_MERGE_TO_MAIN.md` is NOT committed (it's in `outputs/` — Daniel-facing handoff, intentionally untracked per project convention).

### Path 4 — Retrospective
1. Write `EXECUTION_REPORT.md` and `FINDINGS.md` (if any) in the SPEC folder.
2. Single retrospective commit: `chore(spec): close M4_MERGE_PREP with retrospective`.
3. Push.

## 8. Output Format

Return one consolidated message:

1. **Pre-flight result.**
2. **Path 1:** SESSION_CONTEXT updated, +N lines.
3. **Path 2:** INSTRUCTIONS file ready at `outputs/INSTRUCTIONS_DANIEL_MERGE_TO_MAIN.md`.
4. **Path 3:** commit hash + push success.
5. **Path 4:** retrospective commit hash.
6. **Final state:** `git log -3` + `git status`.
7. **Confirmation:** "Develop fully prepped for merge. Daniel reads `outputs/INSTRUCTIONS_DANIEL_MERGE_TO_MAIN.md` and runs the manual merge per CLAUDE.md §9."

## 9. Iron Rule Compliance

- **Rule 21 (no orphans):** the SPEC folder lives at canonical location.
- **Rule 23 (no secrets):** SESSION_CONTEXT update masks any secret values.
- **Rule 31 (integrity gate):** runs before commit.

---

*End of SPEC. Author: opticup-strategic in Cowork session 2026-04-26 evening.*
