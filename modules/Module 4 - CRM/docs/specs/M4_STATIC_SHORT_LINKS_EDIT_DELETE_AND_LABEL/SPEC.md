# SPEC — M4_STATIC_SHORT_LINKS_EDIT_DELETE_AND_LABEL

> **Authored:** 2026-05-21 — Sprint 3 Item 5 of 6.

## 0. Goal
Two-in-one (per Daniel's bundling guidance):
1. **Persist label column.** Sprint 2 Item 4's create UI already collects an optional label, but `short_links` had no column to store it. Add `label text NULL`. Update `crm_create_static_short_link` to accept + persist it.
2. **Add edit/delete UI** to the existing static-links card. Per-row "ערוך" + "מחק" buttons that open small modals. Edit changes target_url + label; delete is a hard-delete (with click-history) gated by confirm dialog.

## 1. Acceptance bar
- `short_links.label text NULL` column added.
- `crm_create_static_short_link(p_tenant_id, p_target_url, p_label)` 3-arg signature live; existing 2-arg calls still work (default NULL).
- New RPCs: `crm_update_static_short_link(p_tenant_id, p_link_id, p_target_url, p_label)` + `crm_delete_static_short_link(p_tenant_id, p_link_id)`. Both gated to `link_type='template_static'` only.
- Card table gains a "תווית" column + a "פעולות" column with edit + delete buttons per row.
- Edit modal: URL + label inputs, save calls RPC, re-renders on success.
- Delete confirm: shows code + label + click-count, warns that history will be removed, hard-deletes via RPC.
- Iron Rule 31 gate exit 0.

## 2. Files modified
- New migration: `supabase/migrations/20260521211000_m4_short_links_label_column_and_edit_delete_rpc.sql` — ALTER TABLE + 3 RPCs (create extended, update new, delete new).
- Edited: `modules/crm/crm-short-links-tiles/template-static-card.js` — +71 lines (label SELECT, label column, edit + delete buttons, edit modal, delete-confirm modal, action wiring). Final 316 lines, under cap.

## 3. Destructive Operations
1. DDL: `ALTER TABLE short_links ADD COLUMN IF NOT EXISTS label text NULL` (additive, NULL default — no risk to existing data).
2. DDL: 3 `CREATE OR REPLACE FUNCTION` (1 extends signature, 2 new). The crm_create_static_short_link signature change is backward-compatible (third arg has DEFAULT NULL).
3. The RPCs themselves: `crm_delete_static_short_link` performs HARD DELETE on `short_links` + `short_link_clicks` rows for a single operator-selected link_id. Bounded to `link_type='template_static'` only — system rows (broadcast/template-personal) cannot be deleted via this RPC.
4. NO Prizma writes initiated by this SPEC. Daniel's 10K test leads unaffected (no overlap with short_links table).

## 4. Out of scope
- Soft-delete option (operators rarely want to "undo" a static-link deletion; hard-delete keeps the table clean).
- Editing the code itself (would break existing /r/<code> URLs in flight).
- Bulk operations (per-row only).

## 5. Verification
- Live runtime verification deferred during this run (Supabase intermittent connectivity outage prevented end-to-end smoke).
- Once Supabase stable: Daniel can verify via: (a) create new link with label, see label in table; (b) click ערוך, change URL+label, save, see updated row; (c) click מחק, confirm, see row gone + click history erased.

---
*End of SPEC.*
