# SPEC — M4_LEADS_BULK_APPROVE_TO_REGISTERED

> **Authored:** 2026-05-21 — Sprint 2 Item 3 of 4.

## 0. Goal
On the "לידים נכנסים" screen, allow operators to bulk-approve multiple leads to Tier 2 (status='waiting' = "רשום") in one action instead of clicking the per-row "אשר ✓" button one at a time.

## 1. Acceptance bar
- Checkbox column added to incoming-leads table (header + per-row).
- "Select all" header checkbox toggles all visible rows.
- Sticky action bar appears at the top of the table when ≥1 lead selected, showing count + "אשר למצב רשום ✓" button.
- Clicking the bulk button opens a confirm dialog with the lead count + explanation.
- Confirm → sequential `transferLeadToTier2` per lead (existing single-lead path is reused — same terms-approved gate, same trigger fires, same automation-engine dispatch chain).
- Leads without `terms_approved` are silently skipped + counted in the final toast.
- Final toast: "הועברו N מתוך M" + skipped count + error count.
- Iron Rule 31 gate exit 0.

## 2. Files modified
- New: `modules/crm/crm-leads-bulk-actions.js` — bulk logic + confirm/progress overlays + `wireBulkSelectUI` helper.
- Edited: `modules/crm/crm-incoming-tab.js` — checkbox column + sticky bar markup; delegates wiring to bulk helper.
- Edited: `crm.html` — `<script src="...crm-leads-bulk-actions.js"></script>` registered before `crm-incoming-tab.js`.

## 3. Destructive Operations
1. DML mass-INSERT of 3 sentinel-marked test leads on demo for UI verification.
2. DML mass-UPDATE on 2 of those 3 leads (status `new` → `waiting`) — the bulk approve flow under test.
3. DML mass-DELETE of those same 3 sentinel leads at close (plus their FK children — `crm_lead_notes`, `crm_message_log`, `crm_message_queue`, `crm_status_change_events`).
4. NO Prizma writes.

## 4. Out of scope
- Bulk delete / bulk other-status changes (separate Sprint).
- "Rolled-back rollback" — the per-lead `transferLeadToTier2` already commits per row; we don't try to atomically batch (the trigger fires per lead, the automation engine handles natural batching downstream).
- Other tabs' bulk actions (registered tab, attendee management).

## 5. Verification
4 closing docs + live Chrome MCP screen probe + actual bulk flow exercised on demo + DB-state confirmation.

---
*End of SPEC.*
