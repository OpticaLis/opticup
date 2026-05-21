# FOREMAN_REVIEW — M4_LEADS_BULK_APPROVE_TO_REGISTERED

> **Verdict:** 🟢 **CLOSED.**

## Audit
- Bulk-approve flow shipped end-to-end. Reuses sanctioned single-lead path so no behavioural change to the underlying status-change/automation chain.
- Iron Rules: 12 (at 350 cap exactly), 31, 32, 33, 34 all honored.
- Negative-case verified (terms-not-approved skipped).

## IR34 runtime trace evidence
**UI render probe** (Chrome MCP DOM):
```
n_columns: 9 ; headers: [☐, שם, טלפון, אימייל, סטטוס, תאריך, מקור, UTM, פעולה]
row_checkbox_count: 3 ; bulk_bar_present: true ; bulk_bar_hidden_initially: true
```
**Select interaction:** check 2 → bar appears, count=2; select-all → count=3 ✓

**Confirm dialog:** "אישור בכמות. לעבור 3 לידים למצב רשום (Tier 2)? לידים שלא אישרו תקנון ידולגו אוטומטית..." — correctly rendered with both action buttons.

**Execute trace (DB cross-check):**
```
PRE:  Bulk Test A (terms=true,  status=new)
      Bulk Test B (terms=true,  status=new)
      Bulk Test C (terms=false, status=new)
POST: Bulk Test A → status=waiting   ✓
      Bulk Test B → status=waiting   ✓
      Bulk Test C → status=new       ✓ (skipped — terms gate)
```
Screenshot: `bulk-approve-after.png`.

## Verdict justification
🟢 — every acceptance criterion met. The terms-gate skip behavior was explicitly designed into the test data and verified end-to-end.

## Sprint 3 candidates surfaced
1. **`M4_LEADS_BULK_RPC`** — server-side RPC that batches the loop in one txn (currently sequential per-lead from browser). Atomicity nicety; not blocking.
2. **`M4_LEADS_BULK_MAX_GUARD`** — add `MAX_BULK=500` guard if/when incoming pagination expands beyond current ~50-100 visible rows.
3. **`M4_LEADS_REGISTERED_BULK_REJECT_RESTORE`** — similar bulk patterns for the "Registered" tab (bulk reject, bulk restore, bulk delete).

## 2 author-skill proposals
1. **When a SPEC adds UX-pattern code (checkbox columns, action bars, confirm dialogs), default to a NEW helper file from the start.** The crm-incoming-tab.js host module already serves a complex role; mixing bulk-action UI logic into it is a recipe for cap breach. The helper file pattern in this SPEC (`crm-leads-bulk-actions.js`) is reusable: future "registered tab bulk" + "attendees bulk" SPECs can extend the same file.
2. **Iron Rule 32 §Destructive Operations should explicitly enumerate FK-children to delete during cleanup.** This SPEC declared lead-INSERT/UPDATE/DELETE but didn't enumerate FK-children (notes, message_log, message_queue, status_change_events). The cleanup query had to be redesigned mid-execution as a CTE. Future SPECs touching crm_leads should pre-declare the cleanup CTE shape.

## 2 executor-skill proposals
(See EXECUTION_REPORT §"Skill improvement proposals" — both endorsed.)

---
*End of FOREMAN_REVIEW.*
