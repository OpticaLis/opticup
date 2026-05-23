# Module 6 — Prescriptions / Eye Exams — Roadmap

> **Authored by:** opticup-strategic (Foreman) — 2026-05-22 overnight chain (Half 2)
> **Source brief:** `architecture-brief/M6_PRESCRIPTIONS_BRIEF.md` v2 (sealed 2026-05-07)
> **Companion module:** Module 5 — Customers (M5↔M6 contract: M6 owns `v_customer_prescriptions_summary` + `create_prescription_draft` RPC, called from M5 customer card "+ מרשם חדש").

---

## Phases

| Phase | Name | Status | SPEC folder | Notes |
|---|---|---|---|---|
| **A** | Schema + RLS + Views | ⬜ in progress (2026-05-22 overnight) | `docs/specs/M6_SCHEMA/` | Combined with Phase B in one overnight schema SPEC |
| **B** | RPCs + state-machines + Iron Rule 32 + recall axes | ⬜ in progress (2026-05-22 overnight) | `docs/specs/M6_SCHEMA/` | Combined with Phase A |
| C | Recall engine 3 variants active | ⬜ deferred | `docs/specs/M6_RECALL_ENGINE/` (not yet authored) | day-1 active set per Brief §5.3 |
| D | OpticPlus migration (tb_bdika 6,248 + tb_lenses 251) | ⬜ deferred | `docs/specs/M6_MIGRATION/` (not yet authored) | Separate SPEC, Daniel-in-loop, depends on M5_MIGRATION |
| E | UI — Prescription editor (sidebar + center) | ⬜ deferred | `docs/specs/M6_UI_EDITOR/` (not yet authored) | UI SPEC, Daniel-in-loop |
| F | UI integration in M5 customer card tab-3 | ⬜ deferred | `docs/specs/M6_UI_M5_INTEGRATION/` (not yet authored) | Cross-module UI SPEC |

Phases A + B together = the **schema foundation** built tonight. Sealed in one combined SPEC (`M6_SCHEMA`) per the overnight Brief recommendation: independently verifiable from M5_SCHEMA, but co-sealed in the same overnight chain. UI + migration + cron-scheduled-recall are out-of-scope tonight (Daniel-in-loop required).

---

## Phase A + B — Scope (this overnight SPEC)

**Tables built this phase (8 + recall axes table):**
- `eye_exams` (new — state machine scheduled→in_progress→completed→cancelled)
- `prescriptions_glasses` (new — parent table, state machine draft→committed→superseded→expired→cancelled)
- `prescription_glasses_eyes` (new — Pattern 11 two-rows-for-symmetric-pair, R/L)
- `prescriptions_contacts` (new — CL-specific fields)
- `prescription_contacts_eyes` (new — Pattern 11, R/L)
- `prescription_types` (new — config per-tenant with capability flags)
- `lens_manufacturers` (new — config per-tenant)
- `prescription_recall_axes` (new — multi-axis recall per Brief §13)

**Enums (state machines + Pattern 9):**
- `exam_status` {scheduled, in_progress, completed, cancelled}
- `exam_outcome` {prescribed_glasses, prescribed_contacts, prescribed_both, no_change, referred_to_doctor, customer_declined}
- `exam_type` {final, old, subjective, objective}
- `prescription_status` {draft, committed, superseded, expired, cancelled}
- `prescription_source` {internal_exam, vision_function, health_fund, external_optometrist, external_doctor}
- `prescription_exam_reason` {routine, vision_complaint, new, post_op, myopia_control}
- `prescription_treatment` {none, myocare, atropine, ortho_k, blue_light, dry_eye_drops}
- `prescription_refraction_method` {phoropter, auto_refractor, wavefront}
- `glasses_lens_type` {single_vision, progressive, bifocal, reading, computer}
- `glasses_lens_material` {plastic_1_50, plastic_1_60, plastic_1_67, plastic_1_74, polycarbonate}
- `prism_base` {UP, DN, IN, OUT}
- `eye_side` {R, L}
- `cl_lens_type` {daily_soft, weekly_soft, monthly_soft, quarterly_soft, yearly_soft, toric, multifocal, rgp, ortho_k}
- `cl_replacement_period` {daily, weekly, monthly, quarterly, yearly}
- `cl_wear_schedule` {daily_remove_at_night, extended_wear} — uses EXISTING enum `contact_lens_wearing_schedule` (already in DB) where applicable, OR new bounded enum (decision in SPEC §0)
- `cl_material` {silicone_hydrogel, hydrogel, rgp}
- `cl_tint` {clear, colored}
- `recall_axis_kind` {next_exam, health_fund_validity, prescription_validity, fit_check, glasses_delivery}

**Views (9 per Brief §3.1):**
- `v_exam_for_customer` (M5/UI customer card tab-1)
- `v_prescription_glasses_for_order` (M7 — future)
- `v_prescription_contacts_for_order` (M7 — future)
- `v_recall_due` (M12 — future)
- `v_exam_for_doctor` (UI optometrist)
- `v_prescription_history_for_customer` (M11)
- **`v_customer_prescriptions_summary`** (M5 customer card tab-3 — **cross-contract; M6 owns**)
- `v_prescription_full_for_editor` (M6 prescription editor center)
- `v_prescriptions_list_for_customer` (M6 prescription editor sidebar)

**RPCs (7):**
- `create_exam(p_tenant_id, p_customer_id, p_exam_date, p_optometrist_id)` — initial state=scheduled.
- **`create_prescription_draft(p_tenant_id, p_customer_id, p_kind)`** — **cross-contract** called from M5 customer card; returns prescription_id in draft state.
- `commit_prescription(p_tenant_id, p_prescription_id, p_type_id, p_eyes_data jsonb)` — atomic; allocates prescription_number via M5's `allocate_tenant_number`; transitions draft→committed; fires `compute_recall_due_dates`.
- `cancel_draft_prescription(p_tenant_id, p_prescription_id)` — Iron Rule 32 (only on draft state, returns counter via NO decrement because draft never got a number).
- `supersede_prescription(p_tenant_id, p_old_id, p_new_id)` — committed→superseded.
- `compute_recall_due_dates(p_tenant_id, p_prescription_id)` — generates rows in `prescription_recall_axes` (4 axes for glasses, 5 for contacts).
- `clone_prescription(p_tenant_id, p_source_id)` — creates a new draft from source.

**Seed data (demo + prizma):**
- `prescription_types` — 8 default rows per tenant (for_distance, for_reading, for_computer, progressive, bifocal, multifocal_cl, for_sunglasses, health_fund).
- `lens_manufacturers` — 5 default rows per tenant (Acuvue, Air Optix, Proclear, Biofinity, Dailies).

**Functional smoke (≥8 on demo, mandatory):**
1. create_exam happy path → returns exam_id in scheduled state.
2. create_prescription_draft (M5↔M6 cross-contract) → returns prescription_id in draft state.
3. commit_prescription atomic + prescription_number allocated + state=committed + fires recall computation.
4. cancel_draft_prescription Iron Rule 32 — draft never got a number; cancel hard-deletes the draft.
5. supersede_prescription committed→superseded.
6. compute_recall_due_dates returns ≥4 axes for glasses prescription.
7. clone_prescription creates new draft from source.
8. Cross-tenant guard — anon-reject on all 7 RPCs.
9. Anon-reject on all 7 RPCs.

**Cross-contract smoke (5 cases, mandatory):**
- Bridge create_customer → create_prescription_draft → commit_prescription → v_customer_prescriptions_summary shows it → v_prescription_glasses_for_order shows it.

---

## Out of Scope (this overnight SPEC)

- No UI — no prescription editor, no toggle bar, no sidebar/center layout. Phases E+F.
- No OpticPlus migration of 6,248 exams + 251 contact-lens prescriptions. Phase D.
- No `recall_rules` table — M12 owns it. M6 emits `v_recall_due` (fact).
- No pg_cron job for prescription expiry (expires_at sweep — defers until Phase C).
- No `compute_recall_due_dates` fully expanded for all 5 axes — day-1 implementation does 4 for glasses + 5 for contacts; the 10-variant recall extensions are deferred to Phase C.
- No FK constraint on `prescription_contacts_eyes.lens_catalog_id` — depends on M1 lens_catalog which may not exist for the storefront-facing dimension. Column added as nullable uuid, FK constraint deferred.
- No auto-commit trigger from M7 order-creation. M7 SPEC wires when M7 ships.
- No flow "צור מרשם מתפקודי-ראייה" — Daniel deferred (Brief §6 #7).
- No Prizma `eye_exams` / `prescriptions_*` row writes during smoke. DDL applied to both tenants; smoke on demo only.
- No merge to main.

---

## Decision history (pinned at module start)

The M6 sealed decisions are in `architecture-brief/M6_PRESCRIPTIONS_BRIEF.md` §8 — 28 decisions across v1 + v2. Most load-bearing for this overnight schema:
- Two-table-per-kind (Pattern 11): parent + child eyes table per glasses/contacts.
- State machines as enums (Pattern 9): exam_status, prescription_status.
- prescription_types = config per-tenant with capability flags (P19).
- Fact-vs-Rule (Pattern 10): M6 emits `v_recall_due` (fact); M12 owns `recall_rules` (rule).
- Cross-contract with M5: M6 owns `v_customer_prescriptions_summary` + `create_prescription_draft` + `clone_prescription`.
- Iron Rule 32 on `prescription_number` — only committed prescriptions consume a number; draft cancel returns 0 cost.
- Multi-axis recall (Brief §13): 4 axes for glasses, 5 for contacts.

---

*End of MODULE_6_ROADMAP.md. Updated when phases close.*
