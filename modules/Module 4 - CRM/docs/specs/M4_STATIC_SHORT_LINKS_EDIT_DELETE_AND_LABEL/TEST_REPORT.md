# TEST_REPORT — M4_STATIC_SHORT_LINKS_EDIT_DELETE_AND_LABEL

## 1. Migration shape
- `ALTER TABLE short_links ADD COLUMN IF NOT EXISTS label text NULL` — additive, NULL default, idempotent.
- `crm_create_static_short_link(uuid, text, text DEFAULT NULL)` — extends signature, backward-compatible.
- `crm_update_static_short_link(uuid, uuid, text, text DEFAULT NULL)` — new.
- `crm_delete_static_short_link(uuid, uuid)` — new, hard-deletes link + click history.

## 2. UI changes
Table columns: קוד | **תווית** (NEW) | יעד | קליקים | קליק אחרון | **פעולות** (NEW: ערוך + מחק)

Modals:
- **Edit:** URL + label inputs prefilled from row state. Save → `crm_update_static_short_link`. Re-renders table on success.
- **Delete:** shows code + label + click-count + history-removal warning. Confirm → `crm_delete_static_short_link`. Re-renders table on success.

Create modal (Sprint 2 Item 4) now passes label via RPC's 3rd arg.

## 3. Live verification
**Status: deferred.** Supabase intermittent outage during this run. Re-verification path:
1. Click "+ קישור קצר חדש", enter URL + label "test label", create.
2. New row appears in table with "test label" in the תווית column.
3. Click "ערוך" on that row, change label to "edited", save.
4. Row updates inline with "edited" label.
5. Click "מחק", see confirm dialog showing the click-count warning, confirm.
6. Row disappears + click history removed.

SQL-truth cross-check: `SELECT label, link_type FROM short_links WHERE code='<new-code>'` should match UI throughout.

## 4. Iron Rule 31 gate
exit 0.

## 5. Verdict
🟡 **CLOSED-WITH-DEFERRED-VERIFICATION.** Code complete + committed. Live smoke deferred to first successful test after Supabase outage clears.

---
*End of test report.*
