# Module Brief — M5 + M6 SCHEMA Overnight Build (schema-only, no UI, no migration)

**Brief version:** v1
**Date:** 2026-05-17
**Author:** Architect
**Hand-off to:** Module Strategist (`opticup-strategic`) → Executor (`opticup-executor`) → Reviewer (`opticup-reviewer`) → Strategist Foreman.
**Pipeline:** Full Auto Pipeline CHAIN — M5 schema → M5 functional smoke → M6 schema → M6 functional smoke → cross-contract smoke. Run-to-end with stop-on-deviation. ~10-12 hours overnight.
**Branch:** `develop`. Daniel-only merge to main after the chain closes 🟢 + Daniel QA.
**Environment:** Claude Code (not Cowork — MCP 45s timeout would break DDL steps).

---

## 1. Purpose

Build the **schema foundation** of M5 (Customers) + M6 (Prescriptions) end-to-end on the **demo tenant** in one overnight chain. This is the single highest-leverage unblock toward LIVE: M7 (Orders), M8 (Payments), M9 (Lab), M11-M15 are ALL blocked on the `customer_id` FK (M5) and `prescription_id` FK (M6) existing. Once these two schemas + their Views + RPCs are live, every downstream module's build can begin.

**This Brief ships SCHEMA ONLY.** No UI screens. No OpticPlus migration. The customer card, customer list, create-mode, and prescription editor are deferred to later UI-focused SPECs (which need Daniel-in-the-loop for Chrome MCP smoke + permission seeding — not appropriate for an unattended overnight run). The 5,028-customer + 1,158-lead OpticPlus migration is its own SPEC.

**Bias:** Build exactly what the two Architecture Briefs sealed. No relitigating the 30 M5 decisions or the M6 decisions. Schema, RLS, Views, RPCs, functional smoke. Stop.

---

## 2. Scope — In

The chain has two halves (M5 first because M6 FKs to `customers`), each with mandatory functional smoke before proceeding.

### Half 1 — M5 Customers schema (Phase A + Phase B of the M5 ROADMAP)

Source of truth: `modules/Module 5 - Customers/architecture-brief/M5_CUSTOMERS_BRIEF.md` (v3, sealed). Read it end-to-end. The Module Strategist authors `MODULE_5_ROADMAP.md` Phase A + B from it, then the SPEC.

**Tables (Day-1 skeleton per Brief §2):**
- `customers` — core person entity. Fields: union of OpticPlus `cust_list` columns + existing `crm_leads` columns (read `ACCESS_AUDIT_REPORT.md` for the full list). `lifecycle_stage` enum (prospect/active/dormant). `customer_number` integer NOT NULL (sequential per-tenant via RPC). `home_branch_id` NOT NULL. FKs: `household_id` NULL, `health_fund_id` NULL.
- `households` — skeleton (5 business fields per Brief §2.2): id, tenant_id, primary_customer_id, status, created_at + soft-delete.
- `health_funds` — config skeleton per-tenant (Brief §2.3): id, tenant_id, name, code, is_active + soft-delete.
- `tenant_languages` — config per-tenant (Brief §2.3.1): id, tenant_id, language_code, is_active, is_default, sort_order. Seed demo with he/ru/en active + es inactive.
- `customer_notes` (Brief §2.3.3) + `customer_documents` (Brief §2.3.4) — schema only.
- `branches` extension (Brief §2.3.2): add `branch_code`, `is_active`, `deactivated_at` if not present (probe first — branches table already exists).

**Views (9 per Brief §3.1):** `v_customer_for_exam`, `v_customer_for_order`, `v_customer_for_payment`, `v_customer_full`, `v_customer_for_messaging`, `v_customer_for_loyalty`, `v_customer_for_appointment`. **NOTE:** `v_customer_prescriptions_summary` + `v_customer_queue_position` are M5-card consumers of M6/M14 data — `v_customer_prescriptions_summary` is built in Half 2 (M6 owns it per Brief §3.4). `v_customer_queue_position` is M14-dependent → defer (M14 not built). Build the 7 customer-data Views now; document the 2 deferred.

**RPCs (Brief §3.2):** `create_customer` (atomic, dedup algorithm per §4.7, allocates customer_number atomically), `merge_customers`, `assign_to_household`, `delete_last_unused_customer` (Iron Rule 32), `update_customer_display_preferences`.

**Patterns (Brief §4 — all 8 mandatory or documented N/A):** canonical RLS, soft-delete, audit-via-activity-log on PII changes, draft/commit where applicable, i18n per-record, defense-in-depth, dedup-on-create, configuration-over-code.

**lifecycle_stage trigger:** auto-transition prospect→active on first order (deferred — orders don't exist yet; build the trigger function but it won't fire until M7). dormant after 24m inactive (cron — defer the cron, build the function).

### Half 2 — M6 Prescriptions schema

Source: `modules/Module 6 - Prescriptions/architecture-brief/M6_PRESCRIPTIONS_BRIEF.md` (v2, sealed). Read end-to-end.

**Tables (Brief §2):**
- `eye_exams` — the exam act. State-machine (scheduled/in_progress/completed/cancelled per Pattern 9).
- `prescriptions_glasses` + `prescription_glasses_eyes` (two-rows-for-symmetric-pair, Pattern 11).
- `prescriptions_contacts` + `prescription_contacts_eyes`.
- `prescription_types` — config per-tenant (P19), with capability flags (allows_order, triggers_recall, etc.).
- `lens_manufacturers` — config per-tenant.

**Views (Brief §3.1):** `v_exam_for_customer`, `v_prescription_glasses_for_order`, `v_prescription_contacts_for_order`, `v_recall_due`, `v_exam_for_doctor`, `v_prescription_history_for_customer`, `v_customer_prescriptions_summary` (the M5↔M6 cross-contract View — M6 owns it), `v_prescription_full_for_editor`, `v_prescriptions_list_for_customer`.

**RPCs (Brief §3.2):** `create_exam`, `create_prescription_draft(customer_id, type, kind)` (the M5↔M6 cross-contract RPC — called from M5 card), `commit_prescription` (atomic, allocates prescription_number per Iron Rule 11, fires compute_recall_due_dates), `cancel_draft_prescription` (Iron Rule 32), `supersede_prescription`, `compute_recall_due_dates`, `clone_prescription`.

### Cross-contract smoke (the M5↔M6 bridge — mandatory)

After both halves: prove the M5↔M6 contract works end-to-end on demo:
1. `create_customer` → returns customer_id + customer_number.
2. `create_prescription_draft(customer_id, 'glasses', ...)` → returns prescription_id (draft).
3. `commit_prescription(prescription_id, type_id, eyes_data)` → returns prescription_number, fires recall computation.
4. Query `v_customer_prescriptions_summary` filtered to that customer → the committed prescription appears with R/L summary.
5. Query `v_prescription_glasses_for_order` → the committed prescription is visible to M7 (future consumer).

### Functional smoke per half (mandatory — no 🟢 without it)

**M5 smoke (≥8 cases):** create_customer happy path + customer_number allocated + dedup-on-duplicate-phone raises/merges + merge_customers moves FKs + assign_to_household + delete_last_unused_customer (Iron Rule 32) + cross-tenant guard (tenant-A can't read tenant-B customer) + anon-reject on all 5 RPCs.

**M6 smoke (≥8 cases):** create_exam + create_prescription_draft + commit_prescription allocates prescription_number + cancel_draft (Iron Rule 32) + supersede + compute_recall_due_dates returns axes + clone_prescription + cross-tenant guard + anon-reject on all 7 RPCs.

All smoke captured in TEST_REPORT.md per half. Demo tenant only (UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`).

---

## 3. Scope — Out (anti-creep)

- **No UI.** No customer card, no customer list, no create-mode screen, no prescription editor. Those are separate UI SPECs needing Daniel-in-loop Chrome MCP smoke.
- **No OpticPlus migration.** The 5,028 customers + 1,158 leads import is its own SPEC (`M5_MIGRATION`).
- **No `crm_leads` decommission.** Brief §1.1 says crm_leads is absorbed into customers — but that's a migration concern. This SPEC builds the `customers` schema; it does NOT touch the live `crm_leads` table or migrate its rows. M4 keeps running on `crm_leads` until the migration SPEC runs.
- **No M14 queue Views** (`v_customer_queue_position`) — M14 doesn't exist. Document as deferred.
- **No lifecycle_stage cron** (dormant transition) — build the function, don't schedule it.
- **No prescription→order auto-commit trigger** wiring to M7 — M7 doesn't exist. Build the state-machine; the M7 contract fires later.
- **No recall_rules table** (M12 owns it) — M6 emits `v_recall_due`; M12 builds the rule layer later.
- **No Prizma tenant writes.** All build + smoke on demo. Schema DDL applies to both demo + prizma (tables exist in both), but functional smoke data only on demo.
- **No merge to main.** Daniel-only after QA.
- **No relitigating** the 30 M5 decisions or M6 decisions. They're sealed.

---

## 4. Locked Decisions (inherited — do not relitigate)

All 30 M5 decisions (Brief §8) + all M6 decisions (Brief §8) are sealed. Most load-bearing for schema:

| # | Decision | Source |
|---|---|---|
| 1 | Single person entity = `customers` with lifecycle_stage; crm_leads absorbed (migration-time, not this SPEC) | M5 §1.1 |
| 2 | Composite customer_number = `[TENANT_CODE][BRANCH_CODE][CUSTOMER_NUMBER]`, sequential per-tenant via atomic RPC | M5 §12 |
| 3 | Iron Rule 32 — sequential number cancellation (delete_last_unused_customer + cancel_draft_prescription) | M5 §13 / M6 |
| 4 | Marketing consent = 4 independent flags, not 3-value enum | M5 §5.2 |
| 5 | Phone UNIQUE (phone, tenant_id) always; family phone-share = UX exception not constraint | M5 dec #3 |
| 6 | health_funds + tenant_languages + prescription_types + lens_manufacturers = config tables per-tenant (P19) | M5+M6 |
| 7 | M6 prescriptions = separate module from M5; two-rows-for-symmetric-pair (R/L eyes) | M6 Pattern 11 |
| 8 | Fact-vs-Rule: M6 emits v_recall_due (fact); M12 owns recall_rules (rule) | M6 §3.4 |
| 9 | M5↔M6 contract: M6 owns v_customer_prescriptions_summary + create_prescription_draft RPC | M5 §3.4 / M6 §3.5 |
| 10 | All RPC discipline inherited from M1A_OPERATIONS_RPCS_FIX (SECURITY DEFINER + search_path + JWT guard + REVOKE/GRANT) | Project policy |
| 11 | Iron Rule 32 §7 Destructive Operations = None on existing tables/data | Project policy |

---

## 5. Success Criteria

The Module Strategist's SPEC declares measurable criteria covering at minimum:

1. **All M5 tables exist** with RLS enabled (canonical 2-policy) + tenant-scoped UNIQUE + soft-delete columns. Verified by `pg_class` + `pg_policy`.
2. **All M5 FK columns indexed** (per the FK-index discipline learned in M1B0).
3. **7 M5 customer-data Views deployed** with `security_invoker=on` where consumed by anon (none anon here — all staff; document) + correct column sets per Brief §3.1.
4. **5 M5 RPCs deployed** with full M1A discipline. Verified by `pg_proc` + `aclexplode`.
5. **customer_number allocation is atomic** (FOR UPDATE, Iron Rule 11) — verified by concurrent-call test in smoke.
6. **dedup algorithm in create_customer** works per Brief §4.7 — verified by duplicate-phone smoke.
7. **M5 functional smoke ≥8/8 PASS on demo.** Captured in TEST_REPORT.md.
8. **All M6 tables exist** with RLS + state-machine constraints (Pattern 9) + two-eyes-per-prescription (Pattern 11).
9. **9 M6 Views deployed** including the cross-contract `v_customer_prescriptions_summary`.
10. **7 M6 RPCs deployed** with full discipline. prescription_number allocation atomic.
11. **M6 functional smoke ≥8/8 PASS on demo.**
12. **Cross-contract smoke 5/5 PASS** (the M5→M6 bridge: create_customer → create_prescription_draft → commit_prescription → both summary Views show it).
13. **No new HIGH/ERROR advisor lints** on the new tables + RPCs. Run `scripts/audit/advisors-for-objects.mjs`.
14. **No Prizma data written.** All smoke on demo.
15. **Iron Rules 1, 11, 14, 15, 18, 19, 22, 23, 31, 32 — no new violations.** `npm run verify --full`.
16. **`js/shared.js` T-constants + FIELD_MAP extended** for all new tables (Iron Rule 5).
17. **GLOBAL_MAP + GLOBAL_SCHEMA + DB_TABLES_REFERENCE merged** (additive).
18. **Module-level docs written**: M5 + M6 SESSION_CONTEXT + CHANGELOG + MODULE_MAP + ROADMAP (Phase A+B marked done, UI + migration phases marked pending).
19. **MIGRATION.md Applied Log** per harvested E1 (this is MCP-migration-heavy).
20. **EXECUTION_REPORT + FINDINGS + TEST_REPORT + REVIEW + FOREMAN_REVIEW** per module (or one combined set — Module Strategist decides; recommend per-module since they're two modules).

---

## 6. Pre-Flight (mandatory before authoring the SPEC)

§0 mandatory audits (Inner-call arity + Smoke-touched schema + Concurrent-Pipeline envelope per harvested patterns). Plus:

```sql
-- Probe 1: confirm none of the M5 tables exist yet
SELECT to_regclass('public.customers'), to_regclass('public.households'),
       to_regclass('public.health_funds'), to_regclass('public.tenant_languages'),
       to_regclass('public.customer_notes'), to_regclass('public.customer_documents');

-- Probe 2: confirm none of the M6 tables exist yet
SELECT to_regclass('public.eye_exams'), to_regclass('public.prescriptions_glasses'),
       to_regclass('public.prescription_glasses_eyes'), to_regclass('public.prescriptions_contacts'),
       to_regclass('public.prescription_contacts_eyes'), to_regclass('public.prescription_types'),
       to_regclass('public.lens_manufacturers');

-- Probe 3: existing branches table shape (M5 extends it)
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name='branches' AND table_schema='public' ORDER BY ordinal_position;

-- Probe 4: existing crm_leads shape (M5 customers absorbs its columns — read for field union, do NOT modify crm_leads)
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name='crm_leads' AND table_schema='public' ORDER BY ordinal_position;

-- Probe 5: existing tenants shape for TENANT_CODE in composite customer_number
SELECT column_name FROM information_schema.columns
WHERE table_name='tenants' AND column_name IN ('id','slug','tenant_code') ORDER BY column_name;

-- Probe 6: demo tenant has at least 1 branch for home_branch_id FK
SELECT count(*) FROM branches WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb';

-- Probe 7: ACCESS_AUDIT_REPORT.md location (full OpticPlus cust_list field list)
-- via shell: find . -name "ACCESS_AUDIT_REPORT.md" -o -name "*ACCESS_AUDIT*"

-- Probe 8: existing next_*_number RPC pattern to mirror for customer_number + prescription_number
SELECT pg_get_functiondef('next_receipt_number'::regproc);

-- Probe 9: confirm activity_log table exists (audit-via-activity-log pattern)
SELECT to_regclass('public.activity_log');
```

Each probe → §0 baseline. The OpticPlus field union (Probe 4 + 7) is the largest unknown — the Module Strategist pins the exact `customers` column list from the audit report + crm_leads before authoring DDL.

---

## 7. Iron Rules in Sharp Focus

- **Rule 1** — atomic RPCs (create_customer, commit_prescription).
- **Rule 11** — customer_number + prescription_number via atomic FOR UPDATE RPC.
- **Rule 14** — tenant_id NOT NULL on every new table.
- **Rule 15** — canonical RLS (JWT-claim USING + service_bypass). NO auth.uid().
- **Rule 18** — every UNIQUE tenant-scoped (customer_number, prescription_number, phone).
- **Rule 19** — config tables (health_funds, tenant_languages, prescription_types, lens_manufacturers) not enums; state-machines (lifecycle_stage, exam status, prescription status) ARE enums (bounded, internal).
- **Rule 22** — defense-in-depth on every RPC write.
- **Rule 23** — no secrets.
- **Rule 31** — integrity gate clean every commit.
- **Rule 32** — Destructive Operations: None. New tables only; no DROP, no ALTER-DROP, no touching crm_leads.

---

## 8. Anti-Patterns

- **Authoring blind.** Run §6 probes first. Especially the OpticPlus field union.
- **Building UI.** Schema only. If the Module Strategist drifts toward a screen — STOP.
- **Migrating crm_leads rows.** Schema only; crm_leads stays live, untouched.
- **Relitigating sealed decisions.** 30 M5 + M6 decisions are locked.
- **Inventing fields not in the audit + brief.** The customers field set = OpticPlus cust_list ∪ crm_leads columns. No invention.
- **Building M14-dependent or M7-dependent Views/triggers** that need modules that don't exist. Build the function; document the deferred wiring.
- **Skipping functional smoke.** No 🟢 without M5 8/8 + M6 8/8 + cross-contract 5/5.
- **Touching Prizma data.** Demo only.
- **Single mega-SPEC.** Recommend the Module Strategist authors TWO SPECs (M5_SCHEMA + M6_SCHEMA) chained, or one SPEC with two clearly-separated halves — its call, but keep each half independently verifiable.

---

## 9. Open Questions for the Module Strategist

1. **One SPEC or two (M5_SCHEMA + M6_SCHEMA chained)?**
*Recommendation: two SPECs, chained.* Each independently verifiable; cleaner FOREMAN_REVIEW per module; matches "one home per module".

2. **`customers` field set — exact columns from the audit?**
*Recommendation: pin from ACCESS_AUDIT_REPORT.md (Probe 7) + crm_leads (Probe 4) at §0. Do not invent. NULL-able on fields not always filled (ת"ז, email, birth_date, profession).*

3. **TENANT_CODE source for composite customer_number?**
*Recommendation: probe tenants table (Probe 5). If no `tenant_code` column, the Module Strategist proposes adding one as part of M5 (small additive column) OR derives from slug. Document the choice.*

4. **`v_customer_prescriptions_summary` ownership — M5 half or M6 half?**
*Recommendation: M6 half (per Brief §3.4 — M6 owns it, M5 reads it). Build it in Half 2 after M6 prescription tables exist.*

5. **lifecycle_stage trigger — build now or defer?**
*Recommendation: build the trigger function now (it's part of the customers schema), but it won't fire until M7 orders exist. Document that it's dormant until M7.*

---

## 10. Relevant Reference Files

| File | Why |
|---|---|
| `modules/Module 5 - Customers/architecture-brief/M5_CUSTOMERS_BRIEF.md` | M5 sealed Brief v3 — read end-to-end |
| `modules/Module 5 - Customers/architecture-brief/M5_HANDOFF.md` | M5 hand-off notes |
| `modules/Module 5 - Customers/architecture-brief/M5_CUSTOMERS_LIST_MOCKUPS.html` | List screen (UI — for context only, NOT built this SPEC) |
| `modules/Module 5 - Customers/architecture-brief/M5_CUSTOMER_CARD_MOCKUP.html` | Card screen (UI — context only) |
| `modules/Module 6 - Prescriptions/architecture-brief/M6_PRESCRIPTIONS_BRIEF.md` | M6 sealed Brief v2 — read end-to-end |
| `modules/Module 6 - Prescriptions/architecture-brief/M6_PRESCRIPTION_EDITOR_MOCKUP.html` | Editor screen (UI — context only) |
| `ACCESS_AUDIT_REPORT.md` (locate via Probe 7) | Full OpticPlus cust_list field list |
| `.claude/skills/opticup-architect/references/decisions/M5.md` + `M6.md` | Decision detail |
| `modules/Module 1 - Inventory Management/docs/specs/M1A_OPERATIONS_RPCS_FIX/SPEC.md` | RPC discipline reference |
| `modules/Module 1 - Inventory Management/docs/specs/M1B0_PURCHASE_ORDER_SCHEMA/SPEC.md` | Schema + RPC + smoke patterns to mirror |
| `CLAUDE.md` §4-§6 | Iron Rules |

---

## 11. Hand-off Note — Overnight Chain

Full Auto Pipeline CHAIN in a single Claude Code chat, run overnight, run-to-end with stop-on-deviation.

Order:
1. `opticup-strategic` reads this Brief + both module Briefs + runs §6 probes.
2. Authors `MODULE_5_ROADMAP.md` (Phase A+B) + M5_SCHEMA SPEC.
3. Hand-off to `opticup-executor` — builds M5 schema + Views + RPCs.
4. **M5 functional smoke 8/8 on demo.** If fail → STOP, escalate, halt chain.
5. `opticup-strategic` authors `MODULE_6_ROADMAP.md` + M6_SCHEMA SPEC.
6. `opticup-executor` builds M6 schema + Views + RPCs.
7. **M6 functional smoke 8/8 + cross-contract smoke 5/5 on demo.** If fail → STOP, escalate, halt.
8. `opticup-reviewer` reviews both → REVIEW.md per module.
9. `opticup-strategic` Foreman-reviews both → FOREMAN_REVIEW.md per module.
10. ONE Hebrew status line to Daniel at chain end.

**Finish-the-sequence rule applies** (per Daniel directive memory): chain dispatches without pausing between M5 and M6 unless a real deviation occurs. One Hebrew status line at the very end, not between modules.

**Escalation:** write `modules/Module 5 - Customers/escalations/{ISO_TS}_{topic}.md` (or Module 6) + one Hebrew line. Halt the chain.

After 🟢: Daniel reviews in the morning. On QA-pass + merge to main → M7/M8/M9 builds unblocked. UI SPECs for M5 card/list + M6 editor become the next wave (Daniel-in-loop for Chrome MCP smoke). OpticPlus migration SPEC becomes schedulable.

---

*End of Brief. M5 + M6 schema foundation. No UI. No migration. No crm_leads touch. Functional smoke mandatory. Overnight run-to-end.*
