# Module 6 — Prescriptions — Changelog

## Phase A+B — Schema + RPCs + Views — closed 2026-05-22 🟢

Overnight Full-Auto Pipeline chain Half 2. M6 smoke 9/9 PASS + cross-contract bridge with M5 5/5 PASS. Advisors clean. No Prizma row writes.

**Tables:** 8 new (eye_exams, prescriptions_glasses, prescription_glasses_eyes, prescriptions_contacts, prescription_contacts_eyes, prescription_types, lens_manufacturers, prescription_recall_axes).
**Views:** 9 (incl. cross-contract v_customer_prescriptions_summary owned by M6).
**RPCs:** 7 (create_exam, create_prescription_draft [M5↔M6 entry], commit_prescription, cancel_draft_prescription, supersede_prescription, compute_recall_due_dates, clone_prescription).
**Enums:** 19 (incl. exam_status, prescription_status, eye_side, prescription_kind, recall_axis_kind, cl_lens_type, cl_replacement_period, cl_wear_schedule, cl_material, cl_tint, prism_base, glasses_lens_type, glasses_lens_material, etc.).
**Seed:** 16 prescription_types (8 per tenant) + 10 lens_manufacturers (5 per tenant).
**Re-used M5 infra:** allocate_tenant_number(p_tenant_id, 'prescription') for prescription_number atomicity (Iron Rule 11 preserved).
**Iron Rule 32:** cancel_draft_prescription explicitly verified to NOT consume a counter slot.
**Patterns:** Pattern 9 (state-machine enums), Pattern 10 (Fact-vs-Rule with M12), Pattern 11 (two-rows-for-symmetric-pair R/L), Pattern 12 (sidebar+center — deferred to UI SPEC).

**Sealed under SPEC:** `modules/Module 6 - Prescriptions/docs/specs/M6_SCHEMA/`.

Commits land at chain-close — see `git log --oneline --grep='m6'`.
