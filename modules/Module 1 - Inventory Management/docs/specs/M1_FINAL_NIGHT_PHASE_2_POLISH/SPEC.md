# SPEC — M1 Final Night Phase 2: M1_CL_ACCESSORY_POLISH

**Slug:** `M1_FINAL_NIGHT_PHASE_2_POLISH`
**Phase of:** M1 Final Completion Continuation
**Author + Executor:** opticup-executor
**Date:** 2026-05-17
**Estimated:** 1-1.5h per Continuation Brief §5. **Actual: ~15min**

---

## 1. Goal

Close the 5 polish items from `M1_CONTACT_LENSES_ACCESSORIES/FOREMAN_REVIEW.md` §"M1_CL_ACCESSORY_POLISH TECH_DEBT bundle".

## 2. Scope (IN — 4 of 5 polish items)

- **F-5** GLOBAL_SINGLETON_EXEMPT update (2 new sequence tables) — `scripts/checks/rule-14-tenant-id.mjs`
- **F-2** lens_design lens_type CHECK expansion + bulk UPDATE 35 stand-in rows
- **R-FINDING-1** Promise.all parallelism — `contact-lens-inventory.js` + `accessory-inventory.js`
- **R-FINDING-2** console.warn on silent error swallow — same 2 files

## 2.B Scope (OUT — DEFERRED with rationale)

- **F-4** FIELD_MAP backfill — DEFERRED per FOREMAN_REVIEW disposition "Bundle with follow-up CRUD SPEC when full CL/accessory CRUD UI ships"
- **F-6** stock location_id NOT NULL consistency — DEFERRED per FOREMAN_REVIEW disposition "Architect-level decision"

## 4. Destructive Operations

Iron Rule 32 — REQUIRED DECLARATION:

1. **DROP CONSTRAINT** `lens_design_lens_type_check` + **ADD CONSTRAINT** with expanded enum — additive expansion (all old values still allowed; 3 new values added). Net behavior: more permissive, no row rejected. Standard ALTER pattern.
2. **UPDATE** 35 rows of `lens_design` (10 contact_lens + 25 accessory) — change `lens_type` from stand-in `'single_vision'` to real `'soft_contact'` / `'accessory_general'`. Demo only (no Prizma writes — Prizma has 0 lens_design rows).
3. **Edit × 3** code files (additive line changes; no deletes).

**Explicitly NOT authorized:** any other DROP / TRUNCATE / DELETE / ALTER POLICY / RPC change.

## 7. Acceptance Criteria

- 4 of 5 polish items applied (other 2 are documented deferrals)
- `lens_design_lens_type_check` allows 8 values total (5 old + 3 new)
- 35 design rows updated from stand-in to proper type
- 2 module-JS files have `Promise.all` + `console.warn`
- 1 scripts/checks file has 2 new GLOBAL_SINGLETON_EXEMPT entries
- Prizma row-count delta = 0 (verified)
- Iron Rule 31 + 32 gates exit 0

## 12. Execution Markers

- **C-1 ✅** — Migration `m1_phase2_expand_lens_design_lens_type_check` applied. DROP + ADD CONSTRAINT with 3 new values (soft_contact, hard_contact, accessory_general). Bulk UPDATEs: 10 contact_lens designs → 'soft_contact'; 25 accessory designs → 'accessory_general'. Glasses designs (19 total) unchanged. Verified.
- **C-2 ✅** — Edits to `scripts/checks/rule-14-tenant-id.mjs` (+2 EXEMPT entries) + `modules/contact-lens-inventory/contact-lens-inventory.js` (Promise.all in render + console.warn in loadStock) + `modules/accessory-inventory/accessory-inventory.js` (same 2 changes). All targeted edits, no behavior regression risk.
- Prizma delta: lens_design Prizma rows = 0 (preserved). Inventory tables Prizma rows still all 0.
