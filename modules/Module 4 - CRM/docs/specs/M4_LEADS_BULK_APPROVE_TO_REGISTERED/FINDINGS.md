# FINDINGS — M4_LEADS_BULK_APPROVE_TO_REGISTERED

## F-01 (resolved) — Bulk approve added
**Severity:** N/A (feature add).
**Resolution:** UI + helper + tab integration shipped. Terms-gate honored, sequential `transferLeadToTier2` loop, friendly toast summary.

## F-02 (resolved at design time) — crm-incoming-tab.js at 350-line cap
**Severity:** LOW.
**What:** adding bulk-select bar + checkbox col to crm-incoming-tab.js pushed it from 336 → 378 (over cap). Refactored: moved `wireBulkSelectUI` into the new bulk-actions helper. Final crm-incoming-tab.js = 350 (at absolute cap). Future bulk-related edits should land in crm-leads-bulk-actions.js, not in crm-incoming-tab.js.

## F-03 (INFO) — Sequential per-lead transfer (not atomic batch)
**Severity:** INFO.
**What:** each `transferLeadToTier2` call commits its own UPDATE + INSERT note. If the user closes the tab mid-bulk, partial state is left (some leads moved, some not). This mirrors the single-row behavior (you can also close the tab mid-single-click and leave it half-done). For Sprint-3 polish, the bulk-action could optionally use a server-side RPC that batches the loop in one txn. Not blocking today.

## F-04 (INFO) — Bulk count limit not enforced
**Severity:** LOW.
**What:** the bulk action accepts any number of selected leads. At very large selections (1000+) the sequential RPC loop would take many seconds + spam the activity log. Pragmatic: incoming-leads tab paginates per-screen, so the practical max selection is ~50-100. If pagination expands, add a `MAX_BULK = 500` guard.

---
*End of findings.*
