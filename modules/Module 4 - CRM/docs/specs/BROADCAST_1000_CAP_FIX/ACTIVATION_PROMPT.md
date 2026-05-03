You are working in `C:\Users\User\opticup` (the ERP repo, `opticalis/opticup`). Follow CLAUDE.md and all 30 Iron Rules. The user is Daniel.

## Role for this session

Two-stage. First load `opticup-strategic` (Foreman) to author the SPEC. Then load `opticup-executor` to implement it. Both stages happen in this single session.

## Pre-reads (in order, MANDATORY before authoring)

1. `modules/Module 4 - CRM/docs/specs/BROADCAST_1000_CAP_FIX/SUPERVISOR_DECISION.md` — the binding architectural verdict from the Main Strategic Chat. The SPEC must follow §SPEC scope verbatim.
2. `modules/Module 4 - CRM/docs/specs/BROADCAST_1000_CAP_FIX/SUPERVISOR_BRIEF.md` — the Campaign Overseer's original problem statement + 3 options analysis.
3. `__LAUNCH_PLAN_DRAFT__/campaign-overseer/DECISIONS_LOG.md` REC-010 — the Overseer's logged recommendation.

## Background (the bug, in one paragraph)

PostgREST default page cap of 1000 rows is silently truncating every `select()` query in the CRM that doesn't paginate. With 1165 active leads on Prizma today, every "send to all" path drops 165 customers in silence. Two surfaces: (a) the manual broadcast in CRM admin, (b) 7 recipient resolvers in `modules/crm/crm-automation-recipient-resolvers.js` that drive automated event invites, coupon dispatches, waitlist invites. Today only the tier2 cluster trips the cap (1166 leads → tier2 ~1165), but the others become future-leaks as the tenant grows.

## The Supervisor's verdict (Option A refined)

Refactor the existing `fetchAll(tableName, filters)` in `js/supabase-ops.js` to extract its pagination loop into a new builder-agnostic helper `paginateQuery(queryBuilder, pageSize=1000)`. `fetchAll` becomes a thin wrapper over `paginateQuery` (zero behavior change to existing callers). Then apply `paginateQuery` to the 7 resolvers + the manual-broadcast path.

NOT "use existing fetchAll as-is" (signature mismatch — needs custom select shapes, custom filters, no enrichRow). NOT a new parallel helper (Rule 21 violation). NOT RPCs (would add migration debt to M4-DEBT-01). The single-engine-two-entry-points pattern is the chosen shape.

## Stage 1 — Foreman (opticup-strategic) authors the SPEC

1. Switch to `opticup-strategic` skill.
2. Verify folder: SPEC folder at `modules/Module 4 - CRM/docs/specs/BROADCAST_1000_CAP_FIX/` already exists with SUPERVISOR_BRIEF.md + SUPERVISOR_DECISION.md + this ACTIVATION_PROMPT.md. The Foreman creates SPEC.md + EXECUTION_PROMPT.md alongside.
3. Survey the 3 most recent FOREMAN_REVIEW.md files under `modules/Module 4 - CRM/docs/specs/*/` for proposals to apply (per opticup-strategic SPEC Authoring Protocol).
4. Author `SPEC.md` with the §SPEC scope from SUPERVISOR_DECISION.md transposed into the standard SPEC schema. Specifically:

   **Section 1 — Refactor `js/supabase-ops.js`** (zero behavior change to existing callers)
   - Extract the pagination loop from `fetchAll(tableName, filters)` into `paginateQuery(queryBuilder, pageSize=1000)`.
   - `fetchAll` becomes a thin wrapper: builds query → delegates to `paginateQuery` → maps through `enrichRow`.
   - All existing `fetchAll(...)` call sites continue bit-identical.

   **Section 2 — Apply to 7 resolvers in `modules/crm/crm-automation-recipient-resolvers.js`**
   - Line 53 (tier2 cluster: tier2, tier2_excl_registered, leads_by_status — note the inner exclude query at line 59 also needs paginating).
   - Line 75 (attendees cluster: attendees, attendees_waiting, attendees_all_statuses).
   - Line 94 (attendees_with_active_coupon).
   - Line 109 (cross_event_active_waitlist — note the inner crm_events query at line 118 also needs paginating).
   - Line 38 (trigger_lead) is single-row — skip.

   **Section 3 — Manual broadcast path (Step 1 = grep to locate)**
   - The Overseer did not verify the manual-broadcast file. Likely candidates: `crm-confirm-send.js`, `crm-messaging-broadcast.js`, `crm-broadcast-filters.js`, `crm-send-dialog.js`. The SPEC's Step 1 is a grep to locate the actual recipient query, then wrap it in `paginateQuery`.
   - **STOP TRIGGER:** if the grep can't locate it → halt + escalate to Supervisor.

   **Section 4 — Smoke test on >1000-row dataset**
   - Either find an existing tenant with >1000 leads (Prizma already has 1165 active), or seed synthetic.
   - Confirm a manual broadcast resolves to ALL leads (count match, not 1000).
   - Confirm a tier2 event invite (use a non-customer-impacting test event on demo) resolves to ALL eligible.
   - Confirm regression: pick 2-3 existing `fetchAll(...)` callers (inventory page, frame list) and verify result sets identical pre/post.

   **Section 5 — Iron Rules to honor**
   - Rule 7 (API abstraction — `paginateQuery` is THE pagination helper going forward).
   - Rule 21 (single pagination engine; `fetchAll` becomes a thin wrapper).
   - Rule 22 (defense-in-depth — query builders already include `tenant_id`; helper is agnostic, doesn't strip it).
   - Rule 31 (integrity gate before every commit).
   - Rule 9 #7 (executor must NOT merge to main; PR + Daniel-only authorization).

   **Section 6 — Out of scope**
   - Moving any resolver to an RPC.
   - Touching M4-DEBT-01.
   - UI changes.
   - Renaming or repositioning `fetchAll`.
   - Touching the inventory `enrichRow` lookup.

   **Section 7 — Stop triggers**
   - Manual-broadcast code can't be located by Step 1 grep → halt + escalate.
   - Refactored `fetchAll` changes behavior on any existing caller → halt.
   - Smoke test on >1000-row dataset still returns capped result → halt; the fix is wrong.
   - Any change required outside `js/supabase-ops.js` and `modules/crm/*` → halt + escalate (scope creep).

   **Section 8 — Acceptance criteria (measurable)**
   1. `paginateQuery` exists in `js/supabase-ops.js` and is exported on `window` (or the equivalent existing pattern in shared.js).
   2. `fetchAll` calls `paginateQuery` internally and returns identical result on smoke-test inventory page.
   3. All 7 resolvers in `crm-automation-recipient-resolvers.js` use `paginateQuery` (grep `paginateQuery` in that file = 7 hits, plus 2 inner queries = 9 hits total).
   4. Manual broadcast path uses `paginateQuery` (grep in the located file = ≥1 hit).
   5. Manual smoke-test on Prizma demo or synthetic seed: a "send to all" path resolves to >1000 recipients without truncation. Daniel verifies via the message-log row count post-send.

   **Section 9 — Backout:** `git revert <commit>` — single commit, reversible.

   **Section 10 — Branch:** `develop`. Single commit. Push to `origin/develop`. Do NOT merge to main — Daniel handles PR-merge himself per `feedback_main_merge_via_pr.md`.

5. Author `EXECUTION_PROMPT.md` (the executor activation prompt) in the same folder.
6. Hand off to executor.

## Stage 2 — Executor (opticup-executor) runs the SPEC

1. Switch to `opticup-executor` skill.
2. Run First Action protocol from CLAUDE.md §1 (machine, repo, branch, integrity gate). User on `🖥️ Windows desktop` (`C:\Users\User\opticup`). Confirm clean repo before starting.
3. Read SPEC.md from Stage 1 and execute exactly.
4. Step 1 of execution = the grep for the manual-broadcast path. Surface the find before refactoring.
5. Implement the refactor + 7 resolver wrappings + manual broadcast wrapping in a single coherent commit.
6. Run integrity gate + file-size gate.
7. Smoke-test the regression cases (existing `fetchAll` callers) AND the >1000-row case before commit.
8. Commit message: `fix(crm): paginate all recipient queries to remove silent 1000-row cap`. Push to `origin/develop`.
9. Write `EXECUTION_REPORT.md` + `FINDINGS.md` per opticup-executor protocol.
10. End-of-session: `git status` clean. No untracked files.

## Stop conditions (Bounded Autonomy)

- Manual-broadcast path can't be located → halt + escalate to Supervisor.
- `fetchAll` regression test fails → halt.
- Refactor requires touching files outside `js/supabase-ops.js` + `modules/crm/*` → halt + escalate.
- Any pre-existing `fetchAll` caller breaks → halt.
- File-size gate fails → halt.

## After completion

Daniel runs the Section 8 acceptance criteria. If all 5 pass → PR-merge to main (Daniel-only).

The Foreman writes `FOREMAN_REVIEW.md` AFTER Daniel verifies — that step is post-session.

## References

- Supervisor decision (binding): `modules/Module 4 - CRM/docs/specs/BROADCAST_1000_CAP_FIX/SUPERVISOR_DECISION.md`
- Supervisor brief (analysis): same folder, `SUPERVISOR_BRIEF.md`
- Overseer recommendation: REC-010 in `__LAUNCH_PLAN_DRAFT__/campaign-overseer/DECISIONS_LOG.md`
- Iron Rules: `CLAUDE.md` §4–§6
- Folder-per-SPEC protocol: `CLAUDE.md` §7

## Operational priority

HIGH — not cutover-blocking but customer-impacting today. Land before the next event open after cutover. Runs in parallel with the cutover roadmap (M4 backlog), does not depend on M4-DEBT-01.
