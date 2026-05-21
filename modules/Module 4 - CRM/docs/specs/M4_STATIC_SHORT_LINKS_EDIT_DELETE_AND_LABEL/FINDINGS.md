# FINDINGS — M4_STATIC_SHORT_LINKS_EDIT_DELETE_AND_LABEL

## F-01 (resolved) — Label column gap closed
**Severity:** LOW (Sprint 2 Item 4 had this as a known follow-up).
**Resolution:** `short_links.label text NULL` added; `crm_create_static_short_link` 3rd arg `p_label` persists it; table renders the column.

## F-02 (resolved) — Edit + delete operator UI
**Severity:** MEDIUM (operators previously had no way to fix a typo or remove a stale link).
**Resolution:** per-row "ערוך" + "מחק" buttons → modals → RPCs.

## F-03 (preserved) — link_type='template_static' guard
**Severity:** N/A.
**What:** Both update + delete RPCs hard-fail if the link is not `link_type='template_static'`. Prevents operator UI from accidentally modifying system rows (broadcast-template-personal, broadcast-static, etc.).

## F-04 (INFO) — Hard-delete includes click history
**Severity:** INFO.
**What:** `crm_delete_static_short_link` deletes the row + all `short_link_clicks` for it. UI warns about this in the confirm dialog (`⚠️ ... ימחק גם את כל היסטוריית הקליקים`). Operator opt-in.

## F-05 (INFO) — Verification deferred
**Severity:** INFO.
**What:** Supabase intermittent outage during this run. Code shipped + committed; verification pending stable connectivity.

---
*End of findings.*
