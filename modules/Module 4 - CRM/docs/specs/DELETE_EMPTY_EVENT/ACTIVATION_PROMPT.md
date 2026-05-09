# ACTIVATION PROMPT — DELETE_EMPTY_EVENT

> **Purpose:** Daniel pastes the block below into a fresh Claude Code session loaded with `opticup-executor`. Single SPEC, single-repo (opticup), 2 commits + retro.
> **Pre-flight:** Step 0 commits pending Campaign Overseer artifacts before SPEC work starts.

---

## Paste-ready block

```
You are working in C:\Users\User\opticup. Follow CLAUDE.md.

Load the opticup-executor skill.

SPEC location: modules/Module 4 - CRM/docs/specs/DELETE_EMPTY_EVENT/SPEC.md

Read SPEC.md fully before starting. Then execute under Bounded Autonomy.

EXECUTION ORDER:

0. PRE-FLIGHT (per SPEC §14):
   a. First Action protocol per CLAUDE.md §1 — verify branch=develop, pull latest, integrity gate clean.
   b. Run `git status`. If any of these 4 files appear untracked or modified:
        - roles/campaign-overseer/CAMPAIGN_OVERSEER_HANDOFF.md
        - roles/campaign-overseer/DECISIONS_LOG.md
        - modules/Module 4 - CRM/docs/specs/QUICK_REGISTER_QR_FLOW/EXECUTION_REPORT.md
        - modules/Module 4 - CRM/docs/specs/QUICK_REGISTER_QR_FLOW/FINDINGS.md
      THEN: `git add` those 4 files explicitly + commit `chore(overseer): close QUICK_REGISTER_QR_FLOW + open REC-009` + push origin develop.
   c. Verify clean repo before continuing.

1. Cross-Reference verification (SPEC §10 UNVERIFIED items):
   a. Open `shared.js` (or wherever T-constants live). Confirm exact names of:
        - T.EVENTS (or whatever constant maps to crm_events)
        - T.EVENT_ATTENDEES
        - T.MESSAGE_QUEUE
      Use whatever names actually exist; do NOT introduce new T-constants.
   b. Grep modules/crm/ for `reloadCrmEventsTab` or the actual events-tab reload function name. If absent, use the same reload approach the events tab itself uses internally.
   c. Confirm `Modal.confirm` and `Toast.success`/`Toast.error` are reachable from the event-edit modal context (they're used by crm-lead-modals.js — same Modal pattern applies).
   STOP if any of these can't be resolved cleanly — paste findings, ask Foreman.

2. Commit 1 — Backend (migration + RPC):
   a. Author migration file `supabase/migrations/{TODAY_YYYYMMDD}_add_soft_delete_event_if_empty_rpc.sql`.
   b. RPC body must:
      - Take (p_tenant_id uuid, p_event_id uuid)
      - Verify event belongs to tenant; if not → return `{success:false, error:'event_not_found'}`
      - SELECT FOR UPDATE on the crm_events row (atomic lock)
      - Compute SUM(COALESCE(purchase_amount, 0)) on non-deleted attendees of that event
      - If sum > 0 → return `{success:false, error:'has_purchases', total_purchases:NN.NN}` and release lock
      - Else: UPDATE crm_events.is_deleted=true; UPDATE all crm_event_attendees on event.is_deleted=true (cascade); UPDATE crm_message_queue.status='cancelled' WHERE event_id = p_event_id AND status IN ('queued','pending')
      - Insert activity-log row (use existing helper or direct INSERT into crm_activity_log with type='crm.event.delete')
      - Return `{success:true, deleted_attendees:N, cancelled_messages:M}`
      - SECURITY DEFINER, with explicit tenant_id filter on every UPDATE (Iron Rule 14 + 15)
   c. Apply migration via Supabase MCP `apply_migration`.
   d. Verify in DB: `SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname='soft_delete_event_if_empty'` returns the function source.
   e. Iron Rule 31 — integrity gate clean.
   f. Single commit: `feat(crm): soft_delete_event_if_empty RPC + cascade to attendees + queue`. Add only the migration file.
   g. Push origin develop.

3. Commit 2 — Frontend (JS module + UI button):
   a. Create `modules/crm/crm-event-delete.js` (target ≤120 lines):
      - Exposes `window.CrmEventActions = window.CrmEventActions || {}; window.CrmEventActions.softDeleteEventIfEmpty = function(eventId, eventName, tenantId) { ... }`
      - Calls the RPC via the existing DB wrapper helper (whatever pattern shared.js uses for RPC calls — match it; do NOT call sb.rpc directly per Iron Rule 7)
      - Returns Promise that resolves with the RPC result or rejects on transport error
      - Defense-in-depth: includes tenant_id in the RPC call (Iron Rule 22)
   b. Modify `modules/crm/crm-event-edit.js`:
      - Add a 3rd button to the footer HTML at line ~41-43: `<button id="crm-edit-event-delete" class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-sm transition shadow-sm me-auto">מחק אירוע</button>`
      - Add a handler block AFTER the cancel-button handler (line ~50), modeled on crm-lead-modals.js:279-296:
        * Modal.confirm with title 'מחיקת אירוע', message 'האם למחוק את האירוע? פעולה זו ניתנת לשחזור על-ידי מנהל המערכת.', confirmClass 'bg-rose-600 hover:bg-rose-700'
        * On confirm: disable button, call CrmEventActions.softDeleteEventIfEmpty
        * On RPC success → close modal, Toast.success('האירוע נמחק'), reload events list (use the resolved reload function from Step 1)
        * On RPC `error:'has_purchases'` → re-enable button, Toast.error('לא ניתן למחוק — האירוע כולל רכישות בסך ' + result.total_purchases + ' ₪')
        * On any other error → re-enable button, Toast.error('שגיאה: ' + err.message)
      - Include the new JS file in whatever HTML loads crm-event-edit.js (likely crm.html — verify)
   c. Iron Rule 12 — verify both touched files ≤350 lines.
   d. Iron Rule 31 — integrity gate clean.
   e. Single commit: `feat(crm): delete-event button on event-edit modal (gated on purchase_amount=0)`. Add: crm-event-delete.js + crm-event-edit.js + (likely) crm.html for the script tag.
   f. Push origin develop.

4. Smoke test on demo tenant:
   a. Tell Daniel commit 2 is pushed; ask him to open the demo CRM and run §12 manual QA from the SPEC.
   b. Daniel reports back with results (success or specific failure).
   c. If a failure appears that isn't a stop-trigger, log it as a finding rather than stopping.

5. SPEC close:
   a. Write `modules/Module 4 - CRM/docs/specs/DELETE_EMPTY_EVENT/EXECUTION_REPORT.md` covering:
      - All success criteria from §3 with their verification outcomes (✅/❌ per row)
      - The 2 commit hashes
      - The smoke-test outcome from Step 4
   b. Write `modules/Module 4 - CRM/docs/specs/DELETE_EMPTY_EVENT/FINDINGS.md`:
      - Anything surprising, anything deferred, any tech debt surfaced
      - If clean, write a 1-line FINDINGS.md saying "No findings; SPEC closed cleanly."
   c. Single retro commit: `chore(spec): close DELETE_EMPTY_EVENT with retrospective`. Push.

CONSTRAINTS:
- Test ONLY on demo tenant (8d8cfa7e-ef58-49af-9702-a862d459cccb). Zero prizma writes. No exceptions.
- Single commit per logical step (2 + 1 retro = 3 commits total). Push to develop. NEVER merge to main.
- Mandatory clean repo at end of each step.
- DO NOT modify cascade_attendee_soft_delete trigger — orthogonal direction (lead→attendees), keep intact.
- DO NOT introduce a hard-delete option (Iron Rule 3).
- DO NOT modify the events list filter logic — it already filters is_deleted=false.
- Stop on any deviation per CLAUDE.md §9 Bounded Autonomy. Stop triggers in SPEC §5 are non-negotiable.

Begin with step 0.
```

---

## After Claude Code finishes (next Overseer touchpoint)

When the SPEC closes:
1. Verify EXECUTION_REPORT.md, FINDINGS.md, and the 3 commits exist on origin/develop.
2. Update `CAMPAIGN_OVERSEER_HANDOFF.md` §3 — mark REC-009 as APPLIED (with the commit hashes).
3. Update `DECISIONS_LOG.md` REC-009 entry — set `Applied: 2026-MM-DD by Claude Code` and `Outcome (v2 gate input)` with the smoke-test result.
4. Trigger Foreman review (next opticup-strategic session) to write `FOREMAN_REVIEW.md` for DELETE_EMPTY_EVENT.
5. Reassess M4 closure — items remaining: Realtime investigation, MultiSale archive, Campaign metrics UI, multi-tenant URL strategy (F1+F2 from QUICK_REGISTER), Module 36 cleanup in scenario 8464122.
