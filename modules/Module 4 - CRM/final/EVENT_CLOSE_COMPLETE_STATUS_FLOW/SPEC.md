# SPEC — EVENT_CLOSE_COMPLETE_STATUS_FLOW

> **Location:** `modules/Module 4 - CRM/final/EVENT_CLOSE_COMPLETE_STATUS_FLOW/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, Cowork session)
> **Authored on:** 2026-04-24
> **Module:** 4 — CRM
> **Phase:** N/A — post-merge automation flow fix
> **Author signature:** Cowork strategic session 2026-04-24

---

## 1. Goal

Fix the lead-status lifecycle around event close / complete so that leads return to `waiting` automatically and can be invited to the next event. Also fix the terms-approval data inconsistency that made Dana appear approved in the UI while the audit timestamp says she never approved.

---

## 2. Background & Motivation

**2026-04-24 discovery:**

1. **Current `event_closed` automation rule** sends to `recipient_type='attendees'` (all attendees regardless of `crm_leads.status`). Daniel's intent: the message should go only to leads currently in `invited` (הוזמן לאירוע) status, and their status should revert to `waiting` (ממתין לאירוע) after send so they're eligible for the next event's invitation.

2. **No `event_completed` automation exists.** When an event finishes (all coupons redeemed, purchases tallied), leads remain in `confirmed` / `confirmed_verified` / attendee statuses. They never return to `waiting`, which means `event_registration_open` automation (recipient filter `status=['waiting']`) skips them on the next event. This was the root cause of Dana not receiving an invite — she was `confirmed` from event #2, never reverted.

3. **Terms-approval data inconsistency (Dana case):**
   - UI at `modules/crm/crm-leads-detail.js:228` reads `lead.terms_approved` (boolean).
   - DB also has `terms_approved_at` (timestamp).
   - Dana's row: `terms_approved=true` + `terms_approved_at=NULL`.
   - The two fields are not kept in sync. The UI shows "✅ אושרו" while the audit timestamp says she never approved. This is a write-path bug (something sets the boolean without setting the timestamp, or vice versa).

**Why all three in one SPEC:** they are one coherent lead-lifecycle story. Fixing (1) and (2) without fixing (3) leaves Dana unable to ever move forward because she'd fail a "has approved terms" precondition if we add one later. Fixing (3) alone doesn't help the lifecycle. Atomic.

**Out of scope — deferred as OPEN_ISSUES #13:**
- **Quick registration terms-approval flow.** Daniel's directive: someone registered via quick-register (walk-in / barcode scan) with no form data must be prompted to approve terms via rapid flow before they can reach `confirmed`. New OPEN_ISSUE, handled in a later SPEC.

---

## 3. Success Criteria (Measurable)

**Pre-conditions:** develop at `d8a99dc` or later, tree clean, integrity gate green.

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 1 | Branch | `develop` | `git branch --show-current` |
| 2 | `event_closed` automation rule updated | `recipient_type='leads_by_status'`, filter `status=['invited']`, and post-send action sets `status='waiting'` | `SELECT action_config FROM crm_automation_rules WHERE action_config::text LIKE '%event_closed%' AND tenant_id='8d8cfa7e-...'` — action_config includes both recipient filter and post_send status revert |
| 3 | NEW `event_completed` automation rule exists | trigger on event status=`completed`, sends nothing (no template), post-action reverts all linked leads to `waiting` | `SELECT count(*) FROM crm_automation_rules WHERE trigger_condition::text LIKE '%completed%' AND tenant_id='8d8cfa7e-...'` → ≥1 |
| 4 | NEW `recipient_type='leads_by_status'` supported in automation engine | Switch case added to `resolveRecipients` | `grep -c "leads_by_status" modules/crm/crm-automation-engine.js` → ≥1 |
| 5 | Post-send status revert action supported | Action config field like `post_action_status_update` honored after dispatch | `grep -c "post_action_status_update\|status_after_send" modules/crm/crm-automation-engine.js` → ≥1 |
| 6 | `terms_approved_at` backfilled for existing approved leads | All rows with `terms_approved=true` + `terms_approved_at=NULL` get timestamp set to `created_at` as fallback | `SELECT count(*) FROM crm_leads WHERE terms_approved=true AND terms_approved_at IS NULL AND tenant_id='8d8cfa7e-...'` → 0 |
| 7 | Terms-approval write path fixed | New writes to `terms_approved=true` auto-set `terms_approved_at=now()` via trigger OR explicit code path | Test: INSERT a lead with `terms_approved=true`, check `terms_approved_at` not NULL |
| 8 | Integrity gate passes | `npm run verify:integrity` exit 0 or 2 | End of SPEC |
| 9 | File sizes ≤350 | `wc -l` on touched files | All under cap |
| 10 | QA — trigger event_closed on test event | Dana (or a test lead in `invited` status) receives the SMS + Email AND her lead.status becomes `waiting` | Manual trigger on demo: set event to `closed`, check `crm_message_log` + `crm_leads.status` |
| 11 | QA — trigger event_completed on test event | All linked leads (via attendees table) have `crm_leads.status='waiting'` | Manual: set event to `completed`, check statuses |
| 12 | QA — Dana appears correctly in UI | After backfill, `terms_approved_at` is non-null; UI still shows "✅ אושרו" | Reload CRM, open Dana's detail modal |
| 13 | OPEN_ISSUES updated | #13 added for quick-register terms flow | `grep -c "^## 13\." "modules/Module 4 - CRM/final/OPEN_ISSUES.md"` → 1 |
| 14 | Commits produced | 1–3 | `git log origin/main..HEAD --oneline \| wc -l` |
| 15 | Pushed to origin | in sync | `git rev-parse HEAD = origin/develop` |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Read `modules/crm/crm-automation-engine.js`, `crm-leads-detail.js`, `crm-automation-rules.js` (or wherever rules UI lives)
- Add new `case 'leads_by_status':` branch in `resolveRecipients()` that selects from `crm_leads` directly by `status` filter (not via `crm_event_attendees`)
- Add post-dispatch hook in `CRM_AUTOMATION_ENGINE` / rule-executor: if `action_config.post_action_status_update` exists, iterate recipient leads and update their `crm_leads.status`
- UPDATE the existing `event_closed` automation rule row (action_config JSON) — not DDL, just data
- INSERT new `event_completed` automation rule row
- Run one-time UPDATE to backfill `terms_approved_at` for `terms_approved=true AND terms_approved_at IS NULL` rows, using `created_at` as fallback timestamp
- Add a DB trigger OR code guard (prefer code, to keep DDL scope-minimal) that syncs `terms_approved_at` whenever `terms_approved` is set to true
- QA by manually changing event status on demo and verifying message dispatches + status updates
- Commit + push
- Update OPEN_ISSUES with #13 (quick-register terms flow) + mark SPEC resolutions in #5 section
- Update `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` with the new lifecycle rules

### What REQUIRES stopping and reporting

- Any DDL (ALTER TABLE, CREATE TRIGGER without explicit authorization) → STOP. Prefer code-level guard in `crm-lead-actions.js` / wherever terms are set.
- If backfilling `terms_approved_at` would touch production data (wrong tenant) → STOP
- If `resolveRecipients` change affects OTHER automation rules (e.g., `event_invite_new` uses `tier2_excl_registered`) → STOP and verify no regression
- If a new variable is needed in `event_closed` template (template already exists at `event_closed_email_he` + `event_closed_sms_he`) that isn't in the current substitution set → STOP and ask
- If Rule 12 breached in `crm-automation-engine.js` → STOP and propose extraction
- Post-dispatch status update failure (DB write fails after successful message send) → log as error, continue dispatch, surface in EXECUTION_REPORT §3

### Bounded autonomy — you CAN'T decide
- **UX of the UI for rule config**: if the existing automation-rules UI doesn't have a "post-action status update" field, the new rule is configured via direct DB INSERT this SPEC, and UI exposure is a separate future SPEC
- **Whether to enforce terms_approved precondition**: not in scope; Daniel deferred to OPEN_ISSUE #13

---

## 5. Stop-on-Deviation Triggers

- Any change to `crm_leads` schema → STOP (we only UPDATE data, no ALTER)
- Any automation rule OTHER than `event_closed` or new `event_completed` being modified → STOP
- If test shows that `event_closed` dispatch no longer reaches the intended recipients → STOP
- Dana's status not actually changing to `waiting` after `event_closed` QA → STOP (implementation bug)
- `terms_approved_at` backfill updates zero rows or wrong count → STOP

---

## 6. Rollback Plan

- Automation rule changes: revert via `UPDATE crm_automation_rules SET action_config = '<old JSON>'` — executor records old JSON in EXECUTION_REPORT before modifying
- New `event_completed` rule: `DELETE FROM crm_automation_rules WHERE id = '<new uuid>'`
- `terms_approved_at` backfill: if wrong values written, `UPDATE crm_leads SET terms_approved_at = NULL WHERE terms_approved_at = created_at AND <condition>` — but this is a safe lossless backfill (from NULL → reasonable timestamp), so reverting is only needed on catastrophic mistake
- Code changes: single-commit `git revert <hash>`
- Start commit marker: executor records in EXECUTION_REPORT §1

---

## 7. Out of Scope (explicit)

- **No schema changes** (`terms_approved_at` column already exists)
- **No UI changes to "תנאים" display** — the boolean source is fine; the data backfill fixes the discrepancy
- **No quick-register terms flow** — OPEN_ISSUE #13
- **No Prizma propagation** — demo-only; OPEN_ISSUE #9 still tracks P7 cutover
- **No changes to `event_registration_open` automation** — it already filters `status=['waiting']` correctly; we just need to populate `waiting` more aggressively
- **No change to `event_closed` TEMPLATE** — template `event_closed_email_he` + `event_closed_sms_he` stay as-is for now (a separate micro-SPEC can refresh their content if needed — not this SPEC)
- **No changes to attendee status lifecycle** — `crm_event_attendees.status` stays. Only `crm_leads.status` reverts on event close/complete

---

## 8. Expected Final State

### DB changes (data only, no DDL)

- `crm_automation_rules` row for `event_closed` → `action_config` updated:
  ```json
  {
    "channels": ["sms", "email"],
    "template_slug": "event_closed",
    "recipient_type": "leads_by_status",
    "recipient_status_filter": ["invited"],
    "post_action_status_update": "waiting"
  }
  ```
- NEW `crm_automation_rules` row for `event_completed`:
  ```json
  {
    "name": "שינוי סטטוס: אירוע הושלם",
    "trigger_entity": "event",
    "trigger_event": "status_change",
    "trigger_condition": {"type": "status_equals", "status": "completed"},
    "action_type": "send_message",
    "action_config": {
      "channels": [],
      "template_slug": null,
      "recipient_type": "attendees_all_statuses",
      "post_action_status_update": "waiting"
    },
    "is_active": true
  }
  ```
  (Note: empty channels + null template means the rule dispatches zero messages but still runs the post-action status update. Executor: if this breaks the automation engine's validation, add a special "action_type=status_update_only" OR add a minimal no-op template — describe approach in EXECUTION_REPORT.)
- `crm_leads` backfill: all rows where `terms_approved=true AND terms_approved_at IS NULL AND tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'` → `terms_approved_at = created_at`

### Modified files

- `modules/crm/crm-automation-engine.js` — add `leads_by_status` case + `post_action_status_update` hook (estimated +30 to +50 lines; host currently under 350)
- `modules/crm/crm-lead-actions.js` (or wherever terms_approved is set) — ensure `terms_approved_at = new Date().toISOString()` when `terms_approved=true` is written (grep for current write sites first)
- `modules/Module 4 - CRM/final/OPEN_ISSUES.md` — add issue #13 (quick-register terms flow)
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — brief note about lifecycle rules

### New files

- `modules/Module 4 - CRM/final/EVENT_CLOSE_COMPLETE_STATUS_FLOW/EXECUTION_REPORT.md`
- `modules/Module 4 - CRM/final/EVENT_CLOSE_COMPLETE_STATUS_FLOW/FINDINGS.md` (if findings)

### No changes

- `docs/GLOBAL_MAP.md` — no new contract
- `docs/GLOBAL_SCHEMA.sql` — no schema changes
- Any template body/subject
- Any UI component rendering

---

## 9. Commit Plan

- **Commit 1:** `feat(crm): event_closed + event_completed lead-status lifecycle + leads_by_status recipient type` — includes automation rule updates (DB-level), engine code, OPEN_ISSUES #13.
- **Commit 2 (optional):** `fix(crm): backfill terms_approved_at from created_at + sync writes` — separates data-hygiene concern if executor prefers.
- **Commit 3:** `chore(spec): close EVENT_CLOSE_COMPLETE_STATUS_FLOW with retrospective` — EXECUTION_REPORT + FINDINGS + SESSION_CONTEXT update.

1 or 3 commits; executor decides. All pushed.

---

## 10. Dependencies / Preconditions

- Commit `d8a99dc` present (COUPON_SEND_WIRING closed) — verified at authoring
- Demo tenant: `8d8cfa7e-ef58-49af-9702-a862d459cccb`
- Test event UUID on demo available (executor Step 1.5 DB pre-flight resolves it)
- Test lead Dana UUID: `f49d4d8e-6fb0-4b1e-9e95-48353e792ec2` (known — pinned per Foreman Proposal 2 from last review)
- Test lead current state (verified author time): `status='confirmed'`, `terms_approved=true`, `terms_approved_at=NULL`. Post-SPEC she should be `status='waiting'` (or one of the expected terminal states after event_completed runs) and `terms_approved_at` non-null.

---

## 11. Lessons Already Incorporated

From recent FOREMAN_REVIEWs (COUPON_SEND_WIRING, INTEGRITY_GATE_SETUP, WORKING_TREE_RECOVERY):

- **COUPON_SEND_WIRING Foreman Proposal 1 (file-size projection)** → APPLIED. `crm-automation-engine.js` currently ~220 lines (verified) + ~30-50 new lines = well within 350. No extraction needed.
- **COUPON_SEND_WIRING Foreman Proposal 2 (pin test-subject IDs)** → APPLIED. Dana UUID `f49d4d8e-6fb0-4b1e-9e95-48353e792ec2` pinned in §10.
- **COUPON_SEND_WIRING executor Proposal 1 (pre-edit file-size projection)** → APPLIED. See §4.
- **COUPON_SEND_WIRING executor Proposal 2 (DB pre-flight resolve IDs)** → APPLIED. §10 provides pre-resolved IDs.
- **INTEGRITY_GATE_SETUP executor Proposal 1 (precondition-drift check)** → APPLIED. Success criteria §3 include exact row counts verifiable at execution time.
- **WORKING_TREE_RECOVERY Foreman Proposal 1 (State Snapshot for recovery SPECs)** → Not applicable (this is a feature SPEC, not a recovery SPEC). Still, §10 captures author-time state for drift detection.
- **Clean-repo discipline (feedback_clean_repo_in_specs.md)** → Rollback §6 explicit; §9 commit plan final.
- **Multi-SPEC day execution model** → Today (2026-04-24) has closed 3 SPECs already (WORKING_TREE_RECOVERY, INTEGRITY_GATE_SETUP, COUPON_SEND_WIRING). This is SPEC #4. Reasonable pace.

### Cross-Reference Check (Rule 21)

| New name | Exists? | Resolution |
|----------|---------|------------|
| `recipient_type: 'leads_by_status'` | No (only `trigger_lead`, `tier2`, `attendees`, `attendees_waiting`, `tier2_excl_registered`) | Safe. New distinct recipient type. |
| `post_action_status_update` field in action_config | No | Safe. Additive JSON field. |
| `event_completed` automation rule | No | Safe. First of its kind. |
| Backfill UPDATE on `terms_approved_at` | Data-only, single-use | Safe. One-shot migration. |

**Cross-Reference Check completed 2026-04-24: 0 collisions.**

---

## 12. QA Protocol

1. **Baseline state:**
   - Dana: `status='confirmed'`, `terms_approved_at=NULL`. Note values before change.
   - Pick a test event currently in `registration_open` or similar intermediate state. Note its UUID.

2. **After Commit 2 (backfill):**
   - `SELECT count(*) FROM crm_leads WHERE terms_approved=true AND terms_approved_at IS NULL AND tenant_id='8d8cfa7e-...'` → 0.
   - Dana's `terms_approved_at` should equal her `created_at` (2026-04-22).

3. **Set Dana's status to `invited` manually** (via CRM UI OR direct UPDATE) — simulates the state before a real `event_closed`.

4. **Trigger `event_closed` automation:** change the test event's status to `closed` in CRM.
   - **Expected:** Dana receives SMS + Email (check `crm_message_log` for 2 new rows, both `status=sent`, template=`event_closed`).
   - **Expected:** Dana's `crm_leads.status` is now `waiting`.

5. **Trigger `event_completed` automation:** change the test event's status to `completed`.
   - **Expected:** All linked leads (via `crm_event_attendees`) revert to `waiting` in `crm_leads`.
   - **Expected:** No message dispatched (empty channels).

6. **Negative test:** Open a new event, set status=`registration_open`. Dana (now `waiting`) should be in the recipient list for the invite message (this is the original registration_open rule which already filters `status=['waiting']`).

If any step fails, log as finding.

---

*End of SPEC. Hand to opticup-executor.*
