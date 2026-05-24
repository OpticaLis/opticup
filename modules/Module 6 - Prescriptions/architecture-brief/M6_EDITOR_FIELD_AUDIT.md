# M6 Prescription Editor — Mockup-vs-Schema Field Audit

> **Author:** opticup-executor (night-run-2026-05-24, §2.1)
> **Mockup:** `M6_PRESCRIPTION_EDITOR_MOCKUP.html` v3 (APPROVED + LOCKED 2026-05-23)
> **Verdict: PASS — every mockup field is schema-backed. Zero migrations needed for the editor UI build.**

---

## Audit Method

Every `<input>`, `<select>`, `<textarea>`, button action, and display element in the approved
mockup (glasses + contacts views) was mapped to its target DB column, RPC, or computed source.
Live schema probed via Supabase MCP on 2026-05-24.

## Tables in Scope

| Table | Role |
|---|---|
| `prescriptions_glasses` | Parent row per glasses prescription |
| `prescriptions_contacts` | Parent row per contacts prescription |
| `prescription_glasses_eyes` | Per-eye data (R/L) for glasses |
| `prescription_contacts_eyes` | Per-eye data (R/L) for contacts |
| `prescription_types` | Lookup: prescription type names + config |
| `prescription_recall_axes` | Multi-axis recall dates per prescription |
| `eye_exams` | Exam record linked via `exam_id` FK |

---

## GLASSES VIEW

### Meta Grid (7 fields)

| Mockup Label | Target Column | EXISTS | Type Match | Notes |
|---|---|---|---|---|
| תאריך מרשם | `prescriptions_glasses.valid_from` | YES | date | |
| סוג בדיקה | `eye_exams.exam_type` via `exam_id` FK | YES | enum `exam_type` (final/old/subjective/objective) | Display-only from linked exam; not on prescription table |
| סוג מרשם | `prescriptions_glasses.prescription_type_id` | YES | uuid FK → `prescription_types` | |
| סיבת בדיקה | `prescriptions_glasses.exam_reason` | YES | enum `prescription_exam_reason` (routine/vision_complaint/new/post_op/myopia_control) | |
| אופטומטריסט | `prescriptions_glasses.optometrist_id` | YES | uuid FK → `employees` | |
| מקור הבדיקה | `prescriptions_glasses.source` | YES | enum `prescription_source` (internal_exam/vision_function/health_fund/external_optometrist/external_doctor) | |
| תוקף עד | `prescriptions_glasses.expires_at` | YES | date | |

### Per-Eye Refraction Table (17 fields × 2 eyes)

| Mockup Label | Target Column | EXISTS | Type |
|---|---|---|---|
| SPH | `prescription_glasses_eyes.sphere` | YES | numeric |
| CYL | `prescription_glasses_eyes.cyl` | YES | numeric |
| AXIS | `prescription_glasses_eyes.axis` | YES | integer |
| PRISM | `prescription_glasses_eyes.prism` | YES | numeric |
| BASE | `prescription_glasses_eyes.prism_base` | YES | enum `prism_base` (UP/DN/IN/OUT) |
| VAcc (with correction) | `prescription_glasses_eyes.va_with_correction` | YES | text |
| VAsc (without correction) | `prescription_glasses_eyes.va_without_correction` | YES | text |
| PH (pinhole) | `prescription_glasses_eyes.va_pinhole` | YES | text |
| PD-D (distance) | `prescription_glasses_eyes.pd_distance` | YES | numeric |
| PD-N (near) | `prescription_glasses_eyes.pd_near` | YES | numeric |
| Pupil (diameter) | `prescription_glasses_eyes.pupil_diameter_mm` | YES | numeric |
| K1 | `prescription_glasses_eyes.k1` | YES | numeric |
| K2 | `prescription_glasses_eyes.k2` | YES | numeric |
| K avg | `prescription_glasses_eyes.k_avg` | YES | numeric |
| K axis | `prescription_glasses_eyes.k_axis` | YES | integer |
| Axial length | `prescription_glasses_eyes.axial_length_mm` | YES | numeric |
| Height (pupil) | `prescription_glasses_eyes.pupil_height_mm` | YES | numeric |

### Per-Eye ADD Block (4 fields × 2 eyes)

| Mockup Label | Target Column | EXISTS | Type | Notes |
|---|---|---|---|---|
| READ-add | `prescription_glasses_eyes.read_add` | YES | numeric | Pre-confirmed by Architect |
| INT-add | `prescription_glasses_eyes.int_add` | YES | numeric | Pre-confirmed by Architect |
| BIF-add | `prescription_glasses_eyes.bif_add` | YES | numeric | Pre-confirmed by Architect |
| MUL-add | `prescription_glasses_eyes.mul_add` | YES | numeric | Pre-confirmed by Architect |

### Secondary Row (4 fields)

| Mockup Label | Target Column | EXISTS | Type |
|---|---|---|---|
| סוג עדשה | `prescriptions_glasses.recommended_lens_type` | YES | enum `glasses_lens_type` (single_vision/progressive/bifocal/reading/computer) |
| חומר עדשה | `prescriptions_glasses.recommended_lens_material` | YES | enum `glasses_lens_material` (plastic_1_50/1_60/1_67/1_74/polycarbonate) |
| BCVA binocular | `prescriptions_glasses.bcva_binocular` | YES | text |
| שיטת רפרקציה | `prescriptions_glasses.refraction_method` | YES | enum `prescription_refraction_method` (phoropter/auto_refractor/wavefront) |

### Notes (2 fields)

| Mockup Label | Target Column | EXISTS | Type |
|---|---|---|---|
| הערות אופטומטריסט (internal) | `prescriptions_glasses.notes_internal` | YES | text |
| הוראות-לקוח (printed) | `prescriptions_glasses.instructions_for_customer` | YES | text |

### Recall Axes (4 axes + treatment selector)

| Mockup Axis | Target | EXISTS | Notes |
|---|---|---|---|
| בדיקה הבאה (next exam) | `prescription_recall_axes` where `axis_kind='next_exam'` | YES | |
| תוקף קופ"ח | `prescription_recall_axes` where `axis_kind='health_fund_validity'` | YES | |
| תוקף מרשם | `prescription_recall_axes` where `axis_kind='prescription_validity'` | YES | |
| מסירת-משקפיים | `prescription_recall_axes` where `axis_kind='glasses_delivery'` | YES | |
| טיפול-נבחר | `prescriptions_glasses.treatment_selected` | YES | enum `prescription_treatment` (none/myocare/atropine/ortho_k/blue_light/dry_eye_drops) |

### Health Fund Display

| Mockup Element | Source | Notes |
|---|---|---|
| Health fund name + plan | `prescriptions_glasses.health_fund_id` FK → `health_funds` + customer profile | Display-only, read from customer |
| Participation amount | Computed from health_funds config | Display-only, not stored on prescription |

### Context Bar Actions

| Mockup Action | Implementation | Notes |
|---|---|---|
| Status badge | `prescriptions_glasses.status` (draft/committed/superseded/expired/cancelled) | |
| סגור מרשם (commit) | status → 'committed' + `committed_at` timestamp | |
| בטל מרשם (cancel) | status → 'cancelled' | |
| שכפל מרשם קודם | UI action: copy fields from prior prescription into new draft | No new column needed |

### Print Strip Actions

All 6 print/send buttons are UI actions that operate on committed prescriptions. No DB fields needed. Phase E implementation: register as coming-soon; Phase F+ enables them.

---

## CONTACTS VIEW

### Meta Grid (7 fields)

| Mockup Label | Target Column | EXISTS | Type |
|---|---|---|---|
| תאריך | `prescriptions_contacts.valid_from` | YES | date |
| סוג בדיקה | `eye_exams.exam_type` via `exam_id` FK | YES | Display-only from linked exam |
| סוג עדשה | `prescriptions_contacts.cl_lens_type` | YES | enum `cl_lens_type` (daily_soft/weekly_soft/monthly_soft/quarterly_soft/yearly_soft/toric/multifocal/rgp/ortho_k) |
| תקופת החלפה | `prescriptions_contacts.cl_replacement_period` | YES | enum `cl_replacement_period` (daily/weekly/monthly/quarterly/yearly) |
| זמן הרכבה | `prescriptions_contacts.cl_wear_schedule` | YES | enum `cl_wear_schedule` (daily_remove_at_night/extended_wear) |
| אופטומטריסט | `prescriptions_contacts.optometrist_id` | YES | uuid FK → employees |
| תוקף עד | `prescriptions_contacts.expires_at` | YES | date |

### Per-Eye CL Parameters (14 fields × 2 eyes)

| Mockup Label | Target Column | EXISTS | Type |
|---|---|---|---|
| POWER | `prescription_contacts_eyes.power` | YES | numeric |
| CYL | `prescription_contacts_eyes.cyl` | YES | numeric |
| AXIS | `prescription_contacts_eyes.axis` | YES | integer |
| ADD | `prescription_contacts_eyes.add_power` | YES | numeric |
| BC (base curve) | `prescription_contacts_eyes.bc_mm` | YES | numeric |
| DIA (diameter) | `prescription_contacts_eyes.dia_mm` | YES | numeric |
| VAcc | `prescription_contacts_eyes.va_with_correction` | YES | text |
| VAsc | `prescription_contacts_eyes.va_without_correction` | YES | text |
| K1 | `prescription_contacts_eyes.k1` | YES | numeric |
| K2 | `prescription_contacts_eyes.k2` | YES | numeric |
| K avg | `prescription_contacts_eyes.k_avg` | YES | numeric |
| K axis | `prescription_contacts_eyes.k_axis` | YES | integer |
| OR (over-refraction) | `prescription_contacts_eyes.over_refraction_power` | YES | numeric |
| VA-OR | `prescription_contacts_eyes.va_over_refraction` | YES | text |

### Secondary Row (6 fields)

| Mockup Label | Target Column | EXISTS | Type |
|---|---|---|---|
| חברה (manufacturer) | `prescriptions_contacts.manufacturer_id` | YES | uuid FK |
| שם דגם (model) | `prescriptions_contacts.model_name` | YES | text |
| חומר (material) | `prescriptions_contacts.cl_material` | YES | enum `cl_material` (silicone_hydrogel/hydrogel/rgp) |
| אחוז-מים | `prescriptions_contacts.water_content_pct` | YES | numeric |
| Dk/L | `prescriptions_contacts.dk_l_value` | YES | numeric |
| צבע (tint) | `prescriptions_contacts.cl_tint` | YES | enum `cl_tint` (clear/colored) |

### Notes + Recall + HF

Same pattern as glasses view. `prescriptions_contacts` has identical `notes_internal`, `instructions_for_customer`, `health_fund_id`, `treatment_selected` columns. Recall axes use the same `prescription_recall_axes` table with `prescription_kind='contacts'` and the additional `fit_check` axis.

---

## Sidebar (shared across glasses/contacts)

| Feature | Source | Notes |
|---|---|---|
| History list | Query `prescriptions_glasses` or `prescriptions_contacts` by `customer_id` | No new fields |
| Status filter pills | Filter on `status` enum values | No new fields |
| Search | Client-side text filter on date/type/optometrist | No new fields |
| + New prescription | `create_prescription_draft` RPC (already exists) | No new RPC needed |
| Count display | COUNT query | No new fields |

---

## Summary

| Category | Mockup Fields | Schema-Backed | Display-Only/Computed | Gaps |
|---|---|---|---|---|
| Glasses meta | 7 | 6 | 1 (exam_type from eye_exams) | 0 |
| Glasses per-eye refraction | 17 × 2 | 34 | 0 | 0 |
| Glasses per-eye ADD | 4 × 2 | 8 | 0 | 0 |
| Glasses secondary | 4 | 4 | 0 | 0 |
| Glasses notes | 2 | 2 | 0 | 0 |
| Glasses recall | 5 | 5 | 0 | 0 |
| Glasses HF | 2 | 1 | 1 (participation amount) | 0 |
| Glasses actions | 4 | 2 | 2 (UI-only) | 0 |
| Contacts meta | 7 | 6 | 1 (exam_type) | 0 |
| Contacts per-eye | 14 × 2 | 28 | 0 | 0 |
| Contacts secondary | 6 | 6 | 0 | 0 |
| Contacts notes | 2 | 2 | 0 | 0 |
| Contacts recall | 5 | 5 | 0 | 0 |
| Print actions | 6 | 0 | 6 (UI-only, coming-soon) | 0 |
| **Total** | **~115** | **~109** | **~6** | **0** |

**Result: PASS.** The M6 Phase A+B schema foundation is complete and fully covers the approved mockup. The editor UI build (Phase E) requires zero schema migrations — it is a pure frontend implementation against existing tables, enums, and RPCs.
