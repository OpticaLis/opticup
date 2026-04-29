# Activation prompt — P5_8_INVITED_TO_REGISTERED_TRANSITION

Paste this into a fresh opticup-executor session. Do NOT activate until Daniel green-lights the SPEC.

---

You are opticup-executor. Read and execute the SPEC at:

`modules/Module 4 - CRM/go-live/specs/P5_8_INVITED_TO_REGISTERED_TRANSITION/SPEC.md`

**Cutover-blocking, target ship 2026-04-29.** This unblocks Flow 4 of the Prizma cutover QA (and all subsequent flows that depend on form-submit working).

## Scope

Three independently-verifiable fixes, each its own commit on develop:

1. **Fix A** — `register_lead_to_event` RPC promotes `invited → registered` (or `waiting_list` at cap) instead of rejecting with `already_registered`. New SQL migration.
2. **Fix B** — Postgres trigger `crm_leads_cascade_attendee_soft_delete_trg` cascades `is_deleted=true` from `crm_leads` to `crm_event_attendees` on the false→true transition. New SQL migration. Includes one-shot UPDATE backfill for the 2 known orphans on V4 Edge volume.
3. **Fix C** — `dispatchFreshLead` in `supabase/functions/lead-intake/dispatch.ts` writes `crm_leads.status='waiting'` after successful T5 dispatch. EF re-deploy.

## Execution order

Strict order: A → B → C (B can swap with A, but C must be last because Daniel's UAT depends on A being live to validate Flow 4, and C only matters for new leads going forward).

## Critical constraints (re-read before each commit)

- **Capacity-count semantics in Fix A:** the `invited` row being promoted is ALREADY in `v_current_count` (the existing capacity check counts everything `is_deleted=false` except `cancelled`/`duplicate`). Do NOT add 1 to the count when deciding `registered` vs `waiting_list`. Add a comment block explaining this.
- **List every caller of `register_lead_to_event` before deploying Fix A:** at minimum `event-register` EF and CRM admin manual-register UI. Verify each handles the new branch's return shape (which is identical to the fresh-INSERT branch — `success: true, attendee_id, status`).
- **Trigger idempotency in Fix B:** trigger condition is `OLD.is_deleted = false AND NEW.is_deleted = true` only. Do NOT fire on every UPDATE.
- **Trigger preserves `status`:** sets `is_deleted=true` only; do NOT change attendee.status.
- **Fix C is best-effort:** errors in the status update log but do not fail the EF response. Same pattern as `dispatchIntakeMessages` failures.
- **Iron Rule 31 integrity gate:** run `npm run verify:integrity` before each commit.
- **No `git add -A`/`git add .`:** explicit filenames only.
- **No checkout main / merge to main / push to main.** All work on develop.

## Verification you MUST run before signaling done

Per SPEC §3 success criteria:
- A1–A7 (RPC behavior + canary attendee promote test)
- B1–B7 (trigger behavior + 2 orphans backfilled + zero-orphans audit on Prizma + demo)
- C1–C6 (dispatch.ts amendment + Flow 4 lead status chain + browser-engine rule still deactivated)
- X5 (integrity gate every commit)

Skip X1–X4 — those are Daniel's manual UAT after this SPEC closes.

## Findings logging

If you discover something not in the SPEC during execution (orphaned function, stale doc, Rule violation in untouched code), append to `FINDINGS.md` in this SPEC folder using the standard template. Do NOT fix it inside this SPEC.

## Closing the SPEC

After all 3 commits land + verification passes:

1. Write `EXECUTION_REPORT.md` per the template at `.claude/skills/opticup-executor/references/EXECUTION_REPORT_TEMPLATE.md`. Include:
   - The verbatim prior `pg_get_functiondef('register_lead_to_event')` output (rollback evidence).
   - The full new RPC body.
   - The trigger function + trigger DDL.
   - The exact dispatch.ts diff.
   - SQL audit results for B5, B6, C5, C6.
   - Real-time decisions made (e.g., comment wording, variable naming).
   - 2 proposals to improve opticup-executor (skill self-improvement mandate).
   - Self-assessment 1–10 on (a) SPEC adherence, (b) Iron Rules, (c) commit hygiene, (d) doc currency.
2. Commit `chore(spec): close P5_8_INVITED_TO_REGISTERED_TRANSITION with retrospective` with `EXECUTION_REPORT.md` (and `FINDINGS.md` if any).
3. Push to develop.
4. Reply in chat: **"SPEC closed. Awaiting Foreman review and Daniel UAT for Flow 4 retest."**

Do NOT write FOREMAN_REVIEW.md yourself — that's the strategic agent's job.

## Hand-back signal to Daniel

Once SPEC is closed, summarize for Daniel:
- 3 commit hashes.
- Backfill audit row count.
- Whether the canary lead `a262bc0e-26aa-4a2d-a401-16e4998f382e` and attendee `ce1e02a9-8a08-46fc-8dcf-00cf0a013ca5` are in the expected post-Fix-A state for Daniel's UAT (still `invited`/`new` waiting for the form click to promote them via the new RPC).
- Daniel's UAT next step: open T5 SMS or email on +972537889878, tap the registration link, complete the form on app.opticalis.co.il (Prizma develop), and confirm `event_registration_confirmation` SMS+email arrive.

## Hard stop conditions (in addition to the SPEC's stop triggers)

- Any caller of `register_lead_to_event` other than `event-register` EF + CRM admin "register" UI surfaces during the caller-enumeration step. → STOP, list it, await direction before deploying Fix A.
- Trigger fires when it shouldn't (any of the 5 unchanged-statuses in A5 cause attendee soft-delete cascade unintentionally). → STOP.
- Make scenario 9104395 DLQ count goes above 4 during execution. → STOP, do not proceed to next commit.
- `event_registration_confirmation_sms_he` substituted body exceeds ~340 chars (check via crm_message_log post-Daniel-UAT) — would re-introduce the vendor 404 issue we fixed in cc297af. → STOP, escalate.

Begin execution.
