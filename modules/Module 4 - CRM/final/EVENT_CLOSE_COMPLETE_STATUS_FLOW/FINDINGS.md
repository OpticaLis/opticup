# FINDINGS — EVENT_CLOSE_COMPLETE_STATUS_FLOW

> Findings surfaced during execution that are NOT in scope of this SPEC.
> Do not fix here — each is a suggested next action for the Foreman.

---

## F1 — event_completed rule triggers a "no recipients" Toast on zero-message rules — INFO

**Severity:** INFO (noise, not a bug)
**Location:** `modules/crm/crm-automation-engine.js:328` — the
`if (!planItems.length) { Toast.info('כלל אוטומציה הופעל, אך אין נמענים
מתאימים') ... }` path fires for the `event_completed` rule because it
intentionally produces zero plan items (channels=[], template=null).
**Description:** When event_completed fires, the post-action runs silently
(reverts all attendees to waiting) BEFORE the Toast. So the user sees a
Toast saying "no suitable recipients" even though the rule successfully
transitioned a bunch of leads. Misleading UX.
**Suggested next action:** Either (a) suppress the Toast when the rule had
a post-action run (track a `postActionApplied` flag in evaluate() and
bypass the info-toast, emit "סטטוס X לידים עודכן ל-waiting" instead), or
(b) change the Toast wording to "אין הודעות לשליחה" since "no recipients"
is inaccurate when post-action resolved recipients but didn't need to
message them. Small follow-up SPEC worth ~20 lines.

---

## F2 — SPEC §11 claimed engine is "~220 lines", actual was 348 — HIGH for SPEC authoring

**Severity:** HIGH — affects SPEC authoring quality
**Location:** `modules/Module 4 - CRM/final/EVENT_CLOSE_COMPLETE_STATUS_FLOW/
SPEC.md:205-206` — "crm-automation-engine.js currently ~220 lines (verified)
+ ~30-50 new lines = well within 350".
**Description:** File was 348 lines at execution time. Adding the planned
~30-50 lines would have pushed it to 378-398 — well over Rule 12's 350 cap.
If the executor trusted the SPEC's claim without re-measuring, the first
edit cycle would have produced an uncommittable file.
**Suggested next action:** Codify "Foreman-claim verification" into opticup-
executor skill (proposed as EXECUTION_REPORT §9 Proposal 1). Also the
opticup-strategic skill should add a pre-SPEC-commit step that runs
`wc -l <mentioned_file>` for every file whose line count appears in the
SPEC body. Both sides of the handoff should enforce data currency.

---

## F3 — Historical Monday import did not set terms_approved_at — LOW

**Severity:** LOW (closed by the backfill, but the ingestion script is
archive-only at this point)
**Location:** `campaigns/supersale/scripts/import-monday-data.mjs:303` —
SQL INSERT template lists both columns, but the two demo rows that had
`terms_approved=true AND _at=NULL` must have come through a code path
where the `approval_time` value was unavailable from Monday or the
earlier version of the import script didn't pair the two fields.
**Description:** Two leads on demo had the inconsistency at start of this
SPEC; backfill used `created_at` as a proxy. Neither is a production
incident (demo tenant only), and every live code path now pairs both fields.
**Suggested next action:** None required for runtime code. If the Monday
import ever runs again (it shouldn't — it's historical), the import
script should be inspected to ensure it pairs the fields. Closing this
finding is fine.
