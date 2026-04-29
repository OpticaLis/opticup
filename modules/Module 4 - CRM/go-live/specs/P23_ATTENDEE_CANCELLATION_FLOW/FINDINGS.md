# FINDINGS — P23_ATTENDEE_CANCELLATION_FLOW

> **Location:** `modules/Module 4 - CRM/go-live/specs/P23_ATTENDEE_CANCELLATION_FLOW/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC v2 execution)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — `crm_event_attendees.payment_status` has CHECK constraint blocking `no_refund_due`

- **Code:** `M4-DB-P23-01`
- **Severity:** **CRITICAL** (SPEC foundational assumption is wrong; new value cannot be written)
- **Discovered during:** §10 QA Scenario 6 (cancel paid + no refund due)
- **Location:** `crm_event_attendees.payment_status` — constraint `crm_event_attendees_payment_status_check`
- **Description:** SPEC v2 §2.5 #4 states: *"`payment_status` is `text`, not enum. Adding a new value `'no_refund_due'` is a value addition, not a schema change."* This is **incorrect**. The column has a CHECK constraint enforcing exactly the 7 existing slugs (`pending_payment`, `paid`, `unpaid`, `refund_requested`, `refunded`, `credit_pending`, `credit_used`). Any UPDATE that writes `no_refund_due` is rejected with HTTP 400 by PostgREST. The SPEC's "no schema change" promise (§7) is also wrong — adding the new value DOES require DDL (ALTER TABLE … DROP CONSTRAINT … ADD CONSTRAINT …), which is SQL Autonomy Level 3 (Daniel only).
- **Reproduction:**
  ```sql
  SELECT pg_get_constraintdef(oid) FROM pg_constraint
   WHERE conrelid='public.crm_event_attendees'::regclass AND contype='c';
  -- → CHECK (payment_status = ANY (ARRAY['pending_payment','paid','unpaid','refund_requested','refunded','credit_pending','credit_used']))

  UPDATE crm_event_attendees SET payment_status='no_refund_due' WHERE id=…;
  -- → ERROR:  new row for relation "crm_event_attendees" violates check constraint "crm_event_attendees_payment_status_check"
  ```
- **Expected vs Actual:**
  - Expected: PATCH to set payment_status='no_refund_due' returns 204; row reflects the new value.
  - Actual: PATCH returns 400; row unchanged.
- **Impact on shipped P23:** All commits except the no-refund-due path work as intended. The `crm-attendee-cancel.js` "לא מגיע החזר" button now silently fails with a Hebrew error toast on demo; same will happen on Prizma. UI is shipped but the most "novel" behavior P23 introduced does not function until the constraint is updated. The other two paths (simple-confirm cancel, and paid+refund-due cancel) work because they only write existing-allowed values.
- **Suggested next action:** **NEW_SPEC** — small migration SPEC to:
  ```sql
  ALTER TABLE crm_event_attendees DROP CONSTRAINT crm_event_attendees_payment_status_check;
  ALTER TABLE crm_event_attendees ADD CONSTRAINT crm_event_attendees_payment_status_check
    CHECK (payment_status = ANY (ARRAY['pending_payment','paid','unpaid','refund_requested','refunded','credit_pending','credit_used','no_refund_due']));
  ```
  Daniel must run this. Alternative: change the design to a separate boolean column `no_refund_due_marked BOOLEAN DEFAULT false` instead of a new payment_status value — this avoids the constraint problem entirely and arguably models the semantics better (it's a flag, not a state). Foreman to choose.
- **Rationale for action:** Critical DB-level blocker. Cannot ship P23's full UX without fixing. Must be a separate SPEC because it is a Level-3 schema change.

---

### Finding 2 — `wc -l` vs `content.split('\n').length` discrepancy in line-count budgets

- **Code:** `M5-DEBT-P23-01`
- **Severity:** HIGH (every Foreman SPEC has been computing line-count budgets off-by-1)
- **Discovered during:** §8 commit 4 (cancel button on events-detail) — file at 350 per `wc -l` blocked the verifier reporting "351 lines".
- **Location:** `scripts/checks/file-size.mjs:41` (the verifier) vs `wc -l` (every Foreman SPEC's pre-flight)
- **Description:** The pre-commit verifier counts lines via `content.split('\n').length`, which for a file ending in a trailing newline returns N+1 (because the final `\n` produces an empty string after split). `wc -l`, used by every Foreman SPEC's `wc -l` baseline tables, returns N (it counts only newlines, not the trailing empty segment). On any normally-formatted source file this means the verifier sees 1 more line than `wc -l` reports. Practical consequence: a file the SPEC says is "349 lines, 1 below the 350 hard cap" is actually at 350 by the verifier's count and has zero headroom. Adding any line trips the hard-cap rule. Multiple recent SPECs (P22, P5_V2 templates, P23 v1 + v2) all use `wc -l` budgets that overstate available headroom.
- **Reproduction:**
  ```bash
  wc -l modules/crm/crm-events-detail.js
  # → 350
  node -e "const c=require('fs').readFileSync('modules/crm/crm-events-detail.js','utf8'); console.log(c.split('\\n').length)"
  # → 351
  ```
- **Expected vs Actual:**
  - Expected: SPEC line counts and verifier line counts agree.
  - Actual: SPEC counts are 1 lower than the verifier's. Files reported as "1 below cap" are actually at the cap.
- **Suggested next action:** **TECH_DEBT** — pick one canonical method and update both sides. Two options:
  - (a) Change verifier to `content.split('\n').length - (content.endsWith('\n') ? 1 : 0)` so it matches `wc -l`. Backward-compatible, no SPEC math changes.
  - (b) Change Foreman SPEC pre-flight to use `node -e ".split('\\n').length"` so SPECs agree with the verifier. Disruptive — every active SPEC needs revision.
  Recommendation: option (a) — silently lowers the verifier's count by 1 for trailing-newline files (the common case), which is what every Foreman has been assuming. Files without trailing newlines are unaffected.
- **Rationale for action:** Every future SPEC will silently miscalculate file budgets until this is fixed. Discovery here cost ~30 min of debugging. The fix is one line in `scripts/checks/file-size.mjs`.

---

### Finding 3 — Cancel button on `crm-events-detail.js` deferred (file at hard cap)

- **Code:** `M4-R12-P23-01`
- **Severity:** MEDIUM (planned feature deferred; primary admin surface — Event Day "ניהול" — still ships the button)
- **Discovered during:** §8 commit 4 attempt — file at 351 lines (verifier count) tripped the file-size hard cap.
- **Location:** `modules/crm/crm-events-detail.js` (350 by `wc -l`, 351 by verifier)
- **Description:** SPEC v2 §7 planned the cancel button on the events-detail attendee grid as a secondary admin surface. The file was already at the verifier's hard cap before P23 touched it; adding even a single line for the click handler crosses the threshold. The SPEC's §3 #8 target of ≤345 was unachievable from the 349 baseline (verifier 350) without an extraction outside P23 scope. Admins can still cancel from Event Day "ניהול" (the primary surface, fully shipped).
- **Reproduction:**
  ```bash
  wc -l modules/crm/crm-events-detail.js   # 350
  # Adding 1-line click handler → 351 → hard-cap violation in verifier
  ```
- **Expected vs Actual:**
  - Expected (SPEC §3 #14): "בטל" button visible on events-detail attendees grid.
  - Actual: button NOT shipped; admins use Event Day "ניהול" instead.
- **Suggested next action:** **NEW_SPEC** — small extraction SPEC for `crm-events-detail.js`. Candidate extractions: `renderAttendeesGrouped` (33 lines, naturally extractable into `crm-events-detail-attendees.js`), or the analytics sub-tabs render block. After extraction, the cancel button addition fits.
- **Rationale for action:** Real planned feature, not a one-off cleanup. Ship in a paired refactor+feature SPEC.

---

### Finding 4 — 4 other `tid()` Rule 21 collisions still pending

- **Code:** `M4-R21-P23-01`
- **Severity:** MEDIUM (latent — will trip future commits that stage 2+ of these files together)
- **Discovered during:** P23 v1 pre-flight; carried forward into v2 §2.6.
- **Location:** `modules/crm/crm-attendee-move.js:15`, `modules/crm/crm-automation-engine.js:26`, `modules/crm/crm-campaigns.js:11`, `modules/crm/crm-unit-economics-modal.js:10` — each has its own `function tid()`.
- **Description:** P23 commit `035d2a4` consolidated `tid()` from `crm-event-actions.js` + `crm-event-edit.js` into `CrmHelpers.tid` (canonical). 4 other CRM files still define their own private `tid()`. The pre-commit verifier only fires when 2+ staged files coincide on a duplicate name — so today these collisions are silent. Any future commit that stages 2+ of these files together (e.g., a refactor touching both `crm-attendee-move.js` and `crm-automation-engine.js`) will be blocked by Rule 21 the same way P23 commit #1 was on the original SPEC v1 baseline.
- **Reproduction:**
  ```bash
  grep -rn "function tid(" modules/crm/
  # 5 hits across crm-helpers, crm-attendee-move, crm-automation-engine, crm-campaigns, crm-unit-economics-modal
  ```
- **Expected vs Actual:**
  - Expected: 1 canonical `tid()` in `crm-helpers.js`; all consumers call `CrmHelpers.tid()`.
  - Actual: 5 definitions across 5 files; only 1 (the canonical) is exported.
- **Suggested next action:** **NEW_SPEC** — tiny consolidation SPEC: route the other 4 files through `CrmHelpers.tid()` (delete each local `function tid()` + replace `tid()` call sites with `CrmHelpers.tid()`). All 4 files load `crm-helpers.js` first per the existing load order, so no order changes needed. Total ~12 line-count reduction across the 4 files. Estimated 15 minutes of work.
- **Rationale for action:** Latent landmine. Each future CRM SPEC that touches multiple files risks tripping the same Rule 21 wall that delayed P23 v1.

---

### Finding 5 — Two SELECT bugs found in QA — fixed inline

- **Code:** `M4-BUG-P23-01`
- **Severity:** INFO (already fixed in commit `bac5e3c`; recorded for the learning loop)
- **Discovered during:** §10 QA Scenario 8 (banner) and Scenario 4 (open dialog) — both produced 400 from PostgREST.
- **Location:** `modules/crm/crm-attendee-cancel.js:37` and `modules/crm/crm-dashboard.js:loadRefundsBanner` query
- **Description:** Both new SELECTs queried base table `crm_event_attendees` for columns (`full_name`, `phone`) that don't exist on the base table — those fields live on `crm_leads` and are surfaced through the joined view `v_crm_event_attendees_full`. The base table has only attendee-specific columns: `id, lead_id, event_id, status, payment_status, …, cancelled_at, refund_requested_at`. The fix was a one-word swap (`crm_event_attendees` → `v_crm_event_attendees_full`) in both queries. UPDATE statements still target the base table (views are read-only).
- **Reproduction:**
  ```sql
  SELECT column_name FROM information_schema.columns
   WHERE table_schema='public' AND table_name='crm_event_attendees' AND column_name IN ('full_name','phone');
  -- → 0 rows
  SELECT column_name FROM information_schema.columns
   WHERE table_schema='public' AND table_name='v_crm_event_attendees_full' AND column_name IN ('full_name','phone');
  -- → 2 rows
  ```
- **Expected vs Actual:**
  - Expected: cancel dialog opens; banner queries succeed with 200.
  - Actual (before fix): both returned HTTP 400; banner did not render; cancel dialog returned an error toast before showing the modal.
- **Suggested next action:** **DISMISS** (already fixed in same SPEC). Recorded as a process learning: every new SELECT touching CRM tables should be checked against `v_crm_event_attendees_full` (the standard read view) before the base table.
- **Rationale for action:** No follow-up needed; the executor-skill improvement proposal in EXECUTION_REPORT §8 captures the process gap.

---

### Finding 6 — `MODULE_MAP.md` stale file count

- **Code:** `M4-DOC-P23-01`
- **Severity:** LOW (cosmetic doc drift)
- **Discovered during:** P23 commit 6 (Integration Ceremony docs)
- **Location:** `modules/Module 4 - CRM/docs/MODULE_MAP.md` JS section header — claims "32 files, all ≤350 lines"
- **Description:** Actual count of `modules/crm/*.js` is 52 (verified via `ls modules/crm/*.js | wc -l`). Header has been stale since at least P3a/P3b. Not introduced by P23, just observed during the integration ceremony that touches this file. Not fixed inline to keep P23 scope clean.
- **Suggested next action:** **TECH_DEBT** — sync the count to actual on the next CRM doc commit. Trivial.
- **Rationale for action:** Cosmetic drift; not blocking, not wrong (52 ≤ 350 still holds for all files), but misleads anyone reading the map.

---
