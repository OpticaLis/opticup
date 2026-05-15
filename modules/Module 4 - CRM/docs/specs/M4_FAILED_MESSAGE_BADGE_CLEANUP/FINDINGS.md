# FINDINGS — M4_FAILED_MESSAGE_BADGE_CLEANUP

> **Author:** opticup-executor
> **Date:** 2026-05-15

These are observations discovered DURING execution that are NOT in the SPEC's scope. Each entry is a candidate for: (a) new SPEC, (b) TECH_DEBT entry, (c) dismiss with reasoning. Foreman decides in the post-execution review.

---

## F-1 — `activity_log` column names in SPEC §13 sample queries are wrong (INFO)

**Severity:** INFO.
**Where:** SPEC §13 "Sample Verification Queries", row "Confirm activity log entry" — uses `target_table` / `target_id`.
**Reality:** The live `activity_log` schema has columns `entity_type` (text) / `entity_id` (text), not `target_table` / `target_id`. Verified via `information_schema.columns`.
**Impact:** Zero on production code (the UI surfaces correctly use `CrmHelpers.logActivity(action, entity_type, entity_id, details)` per the project canonical wrapper). The discrepancy was only in my Foreman-authored sample SQL — caught when I ran the manual INSERT for the historical 758-row cleanup. Re-ran with correct column names.
**Action:** Trivial doc fix to the SPEC §13 sample (post-merge), OR accept as historical record. Recommended action: dismiss — the SPEC's verification block is already in the past; future SPECs that need this sample can read the corrected version from EXECUTION_REPORT.md §6.1.

---

## F-2 — Integration Ceremony (GLOBAL_MAP / GLOBAL_SCHEMA / MASTER_ROADMAP) deferred (INFO)

**Severity:** INFO.
**Where:** SPEC §8.5 lists `MASTER_ROADMAP.md`, `docs/GLOBAL_MAP.md`, `docs/GLOBAL_SCHEMA.sql` as "MUST include" docs to update.
**Reality:** This SPEC's integration ceremony updated the module-local files (SESSION_CONTEXT, CHANGELOG, MODULE_MAP, db-schema.sql) but DEFERRED the project-wide files to the next Integration Ceremony. Rationale: per CLAUDE.md §10, "GLOBAL_MAP and GLOBAL_SCHEMA are read-only during development. Updated only during Integration Ceremony" — Integration Ceremony is a phase-close ritual, not a per-SPEC operation. Existing M4 work has been deferring this since the M4-DEEP-AUDIT cycle (audited 2026-05-13: `docs/GLOBAL_SCHEMA.sql` was already 5+ M4 versions behind live before this SPEC).
**Impact:** Accumulating doc-drift in project-wide schema/function registry. No customer impact. Surfaces as Sentinel alert M-NEW-31-1 / M-NEW-33-2 (M4 db-schema sync backlog) — known carry.
**Action:** Bundle this SPEC's additions (3 columns + 1 index + 1 RPC + 1 permission key + new JS file) into the next Integration Ceremony SPEC (likely M4-INTEGRATION-2026-Q2 or whatever follows). Reference: this finding ID.

---

## F-3 — CRM has no permission group in `permission-matrix` UI (LOW)

**Severity:** LOW.
**Where:** `modules/permissions/permission-matrix.js` lines 8-26 (MODULE_LABELS + MODULE_ORDER) — no entry for `crm`.
**Reality:** This SPEC introduced `crm.message_log.acknowledge` — the FIRST CRM permission key in the project. The admin UI (`permission-matrix.js`) won't show it in any module group until `MODULE_LABELS['crm']` is added with a Hebrew label + icon. Today's behavior: the permission row exists in DB, role grants exist, `hasPermission()` returns true for all users in both tenants (default grant), but the matrix UI is unaware.
**Impact:** Future tenant admins can't ungrant the permission per-role via the UI today. Code-wise, `hasPermission('crm.message_log.acknowledge')` works correctly (reads from session storage).
**Action:** Open a small follow-up SPEC `M4_PERMISSION_GROUP_BOOTSTRAP` (or similar) that adds `crm` to MODULE_LABELS + MODULE_ORDER, seeds 5-10 CRM permission keys (the existing `'crm.broadcast.send'` activity label could be the first), and surfaces them in the matrix. ~30 min effort.

---

## F-4 — `crm-leads-detail-messages.js` still uses raw `sb.from()` (M4-DEBT-02, KNOWN)

**Severity:** LOW (already tracked).
**Where:** `modules/crm/crm-leads-detail-messages.js:29` — `var q = sb.from('crm_message_log').select(...)`.
**Reality:** This SPEC extended that SELECT (added `acknowledged_at, acknowledged_reason, acknowledged_employee` join) but did NOT migrate to `DB.select`. Out of scope per SPEC §7. The M4-DEBT-02 finding is already tracked.
**Impact:** Iron Rule 7 stays violated for this file. No new violation introduced by this SPEC.
**Action:** No action — leave for the M4 Iron-Rule-7 phased migration (covered by the standing M4-DEBT-02 entry in TECH_DEBT). This finding is a courtesy recurrence note, not a new entry.

---

## F-5 — Brief said `status='rejected'`; live data has `status='failed'` (INFO — surfaced in SPEC §0)

**Severity:** INFO (documented in SPEC §0).
**Where:** Brief `M4_FAILED_MESSAGE_BADGE_CLEANUP_BRIEF.md` §1.5.
**Reality:** The 758 rows have `status='failed'` (singular value used by the badge filter). Verified live: status distribution sent=3932, **failed=762**, pending_review=4, rejected=2.
**Impact:** Documented in SPEC §0; no execution impact. Recorded here for the Foreman to consider whether the Architect's Brief-authoring process should grep against live DB before sealing status-name claims.
**Action:** Possibly a Brief-Quality Foreman proposal — "verify status string against live before sealing Brief", but this is mild and easily caught at SPEC time (as it was here). Dismiss unless pattern recurs.

---

## F-6 — Brief said the 758 came from `broadcast_id='ab7341c9'`; live has `broadcast_id IS NULL` for all (INFO)

**Severity:** INFO.
**Where:** Brief §2.6.
**Reality:** All 762 failed rows in the 90-day Prizma window have `broadcast_id IS NULL`. They were dispatched by the automation engine (Rule 2.2 / 2.4 — `send_message` action), not the broadcast wizard. The `ab7341c9` attribution in the Brief is wrong; the underlying incident is the same (`event_max_attendees` unsubstituted placeholder, 2026-05-13 06:13-06:32 burst) but the dispatch channel was the automation rules, not a Broadcast Wizard run.
**Impact:** Documented in SPEC §0. Execution unchanged — backup is keyed by `log_id`, not `broadcast_id`. Recorded for accuracy.
**Action:** Dismiss; informational only.

---

End of FINDINGS.
