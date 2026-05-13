# M4_STATUS_MODEL_FINETUNES — Findings

**SPEC:** M4_STATUS_MODEL_FINETUNES
**Date:** 2026-05-14

---

## F-SMF-1 — Cross-module trigger naming inconsistency (INFO)

**Severity:** INFO
**Description:** Within Module 4, every `updated_at` maintenance trigger follows the new pattern (`<table>_set_updated_at_trg`): `crm_automation_rules_set_updated_at_trg`, `crm_event_attendees_set_updated_at_trg`, `crm_lead_notes_set_updated_at_trg`. The 4 legacy-pattern triggers (`trg_<table>_updated`) are all in Module 1: `trg_brands_updated`, `trg_inventory_updated`, `trg_po_updated`, `trg_suppliers_updated`.
**Implication:** The "inconsistency" the Brief flagged (F2) is real, but the resolution belongs to an M1-scoped SPEC, not this overnight run. SPEC #4 of this overnight run will note this in STATUS_MODEL.md §6 as a historical-note item, NOT as an action item.
**Suggested action:** When Module 1 next opens a maintenance SPEC, rename its 4 triggers via DROP+CREATE pairs. Bundled small change; M1 is at maintenance phase already so it's a fitting time.

---

## F-SMF-2 — Other RPCs may share the composite-NULL idiom (LOW)

**Severity:** LOW
**Description:** F-CSF-3 was found by reading sync_lead_status_from_attendee. A similar `IF v_<rowtype> IS NULL` pattern may exist in other PL/pgSQL functions across the project — not audited here.
**Implication:** Latent defects of the same shape elsewhere.
**Suggested action:** A focused 30-minute grep over `pg_get_functiondef` for `IS NULL` matches against `%ROWTYPE` declarations would surface them. Bundle into next M4 audit OR into a project-wide hygiene SPEC.

---

*End of FINDINGS. 2 entries — 1 INFO, 1 LOW.*
