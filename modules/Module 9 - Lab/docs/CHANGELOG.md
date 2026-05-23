# Module 9 — Lab — Changelog

## 2026-05-23 — Phase A+B Schema closed 🟢

**SPEC:** `M9_SCHEMA` (NIGHT_RUN chain Track 3, gated on Track 1 🟢).

- 10 new tables (lab_jobs, lab_categories, lab_compensation_tiers, lab_notes, shipping_boxes, shipping_box_items, lab_damage_reasons, lab_couriers, lab_supplier_thresholds, lab_events_queue).
- 8 enums + 9 RPCs + 1 trigger-fn (compute_lab_clock_color_fn) + 2 views.
- Pattern P22 inherited from Track 1 — `lab_events_queue` ships with 3 partial-unique idempotency indexes from day-1.
- Seed: 14 lab_categories + 10 lab_damage_reasons + 2 lab_couriers (7+5+1 per tenant × 2 tenants).
- Smoke 10/10 PASS on demo. 0 Prizma row writes on data tables.
- Iron Rules 1, 2, 11, 14, 15, 18, 19, 21, 22, 23, 31, 32 conformed.

Sealed under `docs/specs/M9_SCHEMA/` (7 artifacts).
