# SPEC — M4_STATIC_SHORT_LINK_SELF_SERVE

> **Authored:** 2026-05-21 — Sprint 2 Item 4 of 4.

## 0. Goal
Add a UI on the "קישורים קצרים" screen (template-static card) for operators to CREATE a static short_link (`link_type='template_static'`) without filing a manual-SQL SPEC. Mirrors the `M4_DEMO_STATIC_LINKS_BACKFILL` row-creation pattern (8-char hex code with collision retry, 2099 expiry).

## 1. Acceptance bar
- "+ קישור קצר חדש" button on the static-links card header.
- Click opens a modal with URL input + optional label input.
- URL validated client-side (`^https?://\S+$`) AND server-side (regex in RPC).
- Submit → RPC creates the row + returns `{ok, code, short_path}`.
- Success state in modal shows the new code + `/r/<code>` path + target URL + (if entered) operator's label.
- `/r/<code>` immediately resolves (302) to the target URL via the existing `resolve-link` EF.
- Validation negatives surface inline (no console error, no toast).
- Iron Rule 31 gate exit 0.

## 2. Files modified
- New migration: `supabase/migrations/20260521193300_m4_create_static_short_link_rpc.sql` — RPC `crm_create_static_short_link(p_tenant_id uuid, p_target_url text) RETURNS jsonb`. SECURITY DEFINER + canonical JWT-claim header. URL validation. Collision retry up to 8.
- Edited: `modules/crm/crm-short-links-tiles/template-static-card.js` — adds button in header, modal markup, validation, RPC call, success/error rendering, re-render of the static-links list after success.

## 3. Destructive Operations
1. DDL: 1 `CREATE OR REPLACE FUNCTION` (additive).
2. DML INSERT of 1 test short_link via the new RPC on demo for UI verification.
3. DML DELETE of that 1 test row + its 1 click row at close.
4. NO Prizma writes.

## 4. Out of scope
- Editing existing static links.
- Custom code selection (operator-chosen vs auto-generated).
- Storing the optional label (no `label` column on `short_links` — label is UI-only confirmation context).
- Bulk-create (one at a time).

## 5. Verification
4 closing docs + Chrome MCP live create + curl-verify of `/r/<code>` → 302.

---
*End of SPEC.*
