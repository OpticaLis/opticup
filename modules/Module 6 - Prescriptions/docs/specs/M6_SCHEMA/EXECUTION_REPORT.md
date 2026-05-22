# M6_SCHEMA — Execution Report

> **SPEC:** `modules/Module 6 - Prescriptions/docs/specs/M6_SCHEMA/SPEC.md`
> **Executed:** 2026-05-22 overnight chain Half 2 (immediately after M5_SCHEMA closed 🟢).
> **Status:** 🟢 CLOSED. M6 schema foundation deployed. M6 9/9 + cross-contract 5/5 smoke PASS on demo.

---

## 1. What was built

- **8 new tables** (CREATE-only, no extends): eye_exams, prescriptions_glasses, prescription_glasses_eyes, prescriptions_contacts, prescription_contacts_eyes, prescription_types, lens_manufacturers, prescription_recall_axes. All RLS canonical 2-policy + FK + indexes.
- **19 new enums** spanning exam state-machine, prescription state-machine, prescription source/reason/treatment, refraction method, glasses lens type+material, prism base, eye side (R/L), CL lens type/replacement/wear/material/tint, recall axis kind, prescription_kind (cross-table discriminator).
- **7 RPCs**: create_exam, create_prescription_draft (M5↔M6 cross-contract entry), commit_prescription, cancel_draft_prescription (Iron Rule 32), supersede_prescription, compute_recall_due_dates, clone_prescription. All SECURITY DEFINER + Block A header + REVOKE anon/PUBLIC + GRANT authenticated+service_role.
- **9 views** (security_invoker=on): v_exam_for_customer, v_exam_for_doctor, v_prescription_glasses_for_order, v_prescription_contacts_for_order, v_recall_due (window-fn 1-row-per-prescription), v_prescription_history_for_customer (UNION), **v_customer_prescriptions_summary** (cross-contract UNION), v_prescription_full_for_editor, v_prescriptions_list_for_customer (UNION).
- **Seed:** 16 prescription_types (8 per tenant: for_distance/for_reading/for_computer/progressive/bifocal/multifocal_cl/for_sunglasses/health_fund) + 10 lens_manufacturers (5 per tenant: Acuvue/Air Optix/Proclear/Biofinity/Dailies).
- **T-constants** added to `js/shared.js`: 8 new keys (EYE_EXAMS, PRESCRIPTIONS_GLASSES, PRESCRIPTION_GLASSES_EYES, PRESCRIPTIONS_CONTACTS, PRESCRIPTION_CONTACTS_EYES, PRESCRIPTION_TYPES, LENS_MANUFACTURERS, PRESCRIPTION_RECALL_AXES).
- **Re-used M5 infrastructure:** `allocate_tenant_number(p_tenant_id, 'prescription')` — atomic per-tenant sequential allocation (same `tenant_number_counters` table, different entity_kind). Iron Rule 11 preserved.

## 2. §3 Success Criteria — actual vs expected

| # | Criterion | Expected | Actual | Pass |
|---|---|---|---|---|
| 1 | Branch state | clean develop | clean (M6 paths only) | ✅ |
| 2 | SPEC folder files | 5 | 5 (SPEC + EXECUTION_REPORT + FINDINGS + TEST_REPORT + MIGRATION) | ✅ |
| 3 | 8 new tables created | 8 | 8 confirmed | ✅ |
| 4 | 19 new enums | 19 | 19 confirmed | ✅ |
| 5 | RLS + 2 policies per table | all 8 tables | all 8 tables RLS=true, 2 policies each | ✅ |
| 6 | FK indexes | all FK columns indexed | verified — customer_id, exam_id, type_id, prescription_id, manufacturer_id, tenant_id all have indexes | ✅ |
| 7 | UNIQUE constraints tenant-scoped | 5 | 5 confirmed: prescription_number/tenant on glasses, prescription_number/tenant on contacts, (code,tenant) on prescription_types, (code,tenant) on lens_manufacturers, (prescription_id,eye) on both eye tables = 6 total. | ✅+ |
| 8 | 9 views deployed | 9 | 9 confirmed | ✅ |
| 9 | 7 RPCs deployed | 7 | 7 confirmed in pg_proc, all SECURITY DEFINER | ✅ |
| 10 | Seed prescription_types | 16 | 16 | ✅ |
| 11 | Seed lens_manufacturers | 10 | 10 | ✅ |
| 12 | M6 smoke 9/9 PASS | 9 | 9/9 (see TEST_REPORT.md) | ✅ |
| 13 | Cross-contract smoke 5/5 PASS | 5 | 5/5 (TEST_REPORT.md §"cross-contract") | ✅ |
| 14 | prescription_number atomic allocation | via allocate_tenant_number | confirmed in M-S3 + X-S3; counter advanced 0→3 across 3 commits | ✅ |
| 15 | Iron Rule 32 — cancel does NOT consume number | counter unchanged before/after cancel | M-S4 verified counter equal before/after | ✅ |
| 16 | Advisors clean | 0 NEW HIGH/ERROR | confirmed via M5-style analysis pattern (all RPCs are WARN-level `authenticated_security_definer_function_executable` matching M5 + project pattern; no new HIGH/ERROR) | ✅ |
| 17 | No Prizma writes | 0 rows on M6 tables in prizma | 0/0/0/0 confirmed | ✅ |
| 18 | Integrity Gate | exit 0 or 2 | at commit time | ⏳ |
| 19 | Destructive Ops "None." | no DROP/TRUNCATE | no destructive op issued | ✅ |
| 20 | T-constants extended | 8 new keys | 8 added | ✅ |
| 21 | MIGRATION.md Applied Log | ≥10 entries | 15 entries | ✅+ |

**Verdict:** 20/21 immediate; 1 deferred to chain close (Integrity Gate).

## 3. Deviations from SPEC

| Deviation | Severity | Resolution |
|---|---|---|
| Counter-based prescription number is shared per-tenant across glasses+contacts (a single 'prescription' entity_kind). The SPEC implies this; the Brief is ambiguous. | Design clarification | This is intentional and explicit: one sequence per tenant for "prescription" regardless of kind. A glasses #5 and a contacts #5 cannot coexist on the same tenant. This matches the project's pattern (single Customer Number sequence regardless of customer "type"). Documented in FINDINGS F-M6-2. |
| `v_prescription_full_for_editor` exposes parent columns only; child eyes loaded separately by the editor | By design | Documented inline in DDL Step 9. UI SPEC will fetch parent + child in two reads (or one with join — implementation choice for editor). |
| 5th recall axis (fit_check) only for contacts kind | By design | Reflects Brief §13's "ראש-מהיר: עדשות-מגע בלבד" (`fit_check` axis only for contacts). |

## 4. Outputs delivered

- `modules/Module 6 - Prescriptions/MODULE_6_ROADMAP.md` (chain start)
- `modules/Module 6 - Prescriptions/docs/specs/M6_SCHEMA/SPEC.md` (chain start)
- `modules/Module 6 - Prescriptions/docs/specs/M6_SCHEMA/MIGRATION.md` (15 entries)
- `modules/Module 6 - Prescriptions/docs/specs/M6_SCHEMA/TEST_REPORT.md` (9/9 + 5/5)
- `modules/Module 6 - Prescriptions/docs/specs/M6_SCHEMA/EXECUTION_REPORT.md` (this file)
- `modules/Module 6 - Prescriptions/docs/specs/M6_SCHEMA/FINDINGS.md`
- `js/shared.js` (8 T-constants added in M6 block)
- 15 MCP `apply_migration` calls successful.

## 5. Hand-off

M6 schema 🟢. Both halves of the overnight chain closed.

Next: opticup-reviewer × 2 (M5 + M6) + FOREMAN_REVIEW × 2 + module docs + GLOBAL_MAP/SCHEMA/DB_TABLES_REFERENCE additive merge + Hebrew status line to Daniel.

Downstream unblocked: M7 (Orders) can FK to `prescriptions_glasses.id` / `prescriptions_contacts.id`. M11 (Reports) can read v_prescription_history_for_customer. M12 (Communications) can read v_recall_due for recall rule processing.

Out of scope for chain end (subsequent SPECs needed): UI editor (M6 Phase E), UI customer card tab-3 integration (M5 Phase D, M6 Phase F), recall engine cron activation (M6 Phase C), OpticPlus migration (M5 Phase C + M6 Phase D).
