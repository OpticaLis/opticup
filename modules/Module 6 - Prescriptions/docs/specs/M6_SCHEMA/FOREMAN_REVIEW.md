# M6_SCHEMA — Foreman Review

> **Role:** opticup-strategic (Foreman)
> **Authored:** 2026-05-22 overnight chain close
> **Subject:** SPEC + EXECUTION_REPORT + FINDINGS + TEST_REPORT + MIGRATION + REVIEW for `M6_SCHEMA`

## SPEC quality audit

- **Measurable success criteria:** Yes — 21 criteria with exact expected values.
- **Stop triggers:** Clear — §5 lists 6 M6-specific triggers (counter dependency, FK dependency, view body sanity). None fired.
- **Autonomy envelope:** Same as M5 — DDL via MCP, seeds on both tenants, smoke on demo only. Followed.
- **Pre-flight strength:** §0 Cross-Reference Check correctly identified the `contact_lens_wearing_schedule` orphan enum + chose to create new enums with distinct names rather than reuse the orphan. This avoids tying M6 to a pre-existing semantically-different enum.
- **Inherited M5 lessons:** SPEC §0 explicitly cited M5_SCHEMA's just-completed FINDINGS (F1 column-count manifest, F7 Block A inlining, F8 RLS smoke under MCP) and applied them in the SPEC body. The learning loop closed within a single chain.

## Execution quality audit

- **Followed SPEC:** Yes. 15 MCP `apply_migration` calls in the order declared in DDL Steps 1–9.
- **Atomicity:** commit_prescription verified atomic via M-S3 — allocate + parent UPDATE + 2 child INSERTs + recall computation all in one tx.
- **Iron Rule 32 (cancel_draft):** M-S4 EXPLICITLY verified counter does NOT advance on cancel. The most important Iron Rule 32 contract for M6 — verified.
- **Cross-contract bridge:** X-S1 through X-S5 verified end-to-end M5↔M6 path: customer creation → draft creation → commit + recall → both views surface the result.
- **No Prizma writes:** confirmed 0/0/0/0 on all M6 tables for prizma.

## Findings processing

FINDINGS.md F-M6-1 through F-M6-8:

| # | Decision | Action |
|---|---|---|
| F-M6-1 (orphan `contact_lens_wearing_schedule`) | TECH_DEBT | Future cleanup SPEC after consumer-verification. |
| F-M6-2 (single prescription sequence per tenant across kinds) | Dismissed (intentional) | Documented in EXECUTION_REPORT §3. |
| F-M6-3 (v_prescription_full_for_editor parent-only) | Dismissed | UI SPEC reads parent + child separately. |
| F-M6-4 (legacy `prescriptions` table) | TECH_DEBT (joint with M5 F4) | Future cleanup SPEC. |
| F-M6-5 (lens_catalog_id FK deferred) | TECH_DEBT | M1↔M6 integration SPEC. |
| F-M6-6 (next_followup_at unused at day-1) | Dismissed | UI metadata field. |
| F-M6-7 (no per-axis skip audit in compute_recall) | Dismissed | M12 owns recall_rules. |
| F-M6-8 (v_recall_due 1-row-per-prescription via window fn) | Dismissed | Intentional. |

## 2 author-skill (opticup-strategic) improvement proposals

### P-AUTHOR-1 — Cross-contract surfaces declare ownership + consumers in §0

**Symptom:** M6 owns `v_customer_prescriptions_summary` + `create_prescription_draft` + `clone_prescription`, with M5 customer card as consumer. The SPEC declared this in §0 but the "ownership matrix" is buried in narrative text. A future SPEC author looking at M5↔M6 contracts may need to dig.

**Proposed change:** Add to `SPEC_TEMPLATE.md` §0 (and to the SKILL.md SPEC Authoring Protocol) a new sub-section:

> **Cross-Module Contract Matrix** (if the SPEC introduces or consumes a cross-module surface):
>
> | Surface | Type (View/RPC/FK) | Owner module | Consumer module(s) | Built in (this SPEC / future SPEC) |
> |---|---|---|---|---|
> | `<name>` | View | M{X} | M{Y}, M{Z} | this SPEC / future SPEC |
>
> Each row pins which module owns the surface (defines its body / signature) and which consume it. Critical for future SPEC authors to know if they can break the contract or must extend it. The Reviewer cross-checks this matrix against the SPEC's DDL.

**Acceptance:** future cross-module SPECs (e.g., M7_SCHEMA which will own `orders.prescription_id` FK pointing back at M6) declare the contract matrix in §0.

### P-AUTHOR-2 — Pin "what each smoke case proves" alongside the case description

**Symptom:** M6 smoke case M-S4 was implemented correctly (cancel_draft, then verify counter unchanged before/after). But the SPEC §3a description said "M-S4: `cancel_draft_prescription` Iron Rule 32 — draft never got a number; cancel hard-deletes the draft. Counter UNCHANGED (still 1 from M-S3)." A SPEC author should distinguish between the EFFECT (DELETE happens) and the INVARIANT (counter unchanged). Currently they're conflated.

**Proposed change:** Update `SPEC_TEMPLATE.md` §3a (Functional smoke cases) to require each case have explicit columns:

| Column | Content |
|---|---|
| Setup | the data state before the case |
| Action | the single RPC/SQL call |
| Effect assertion | what data changes (rows added/changed) |
| Invariant assertion | what data MUST NOT change |
| Teardown | cleanup |

The split forces author + executor to articulate the negative-space too: what specifically about this case proves the rule is honored.

**Acceptance:** future SPECs with state-machine + counter logic separate effects from invariants in the smoke matrix.

## 2 executor-skill (opticup-executor) improvement proposals

### P-EXEC-1 — Verify FK-graph after each ALTER TABLE / CREATE TABLE that adds a FK

**Symptom:** M6 builds 8 tables with 10+ FK references (customers, tenants, eye_exams, prescription_types, lens_manufacturers, health_funds, tenant_location, prescriptions_glasses, prescriptions_contacts). After each migration the executor could probe `pg_constraint` to confirm each declared FK exists. M6 did NOT probe — it relied on the migration-success signal alone. If a FK silently failed (e.g. wrong target table name spelled differently), the regression would only surface at smoke time. M6 was lucky.

**Proposed change:** Add to `opticup-executor` SKILL.md:

> **After every CREATE TABLE migration that declares FK constraints:** run a probe `SELECT conname, confrelid::regclass FROM pg_constraint WHERE conrelid='<new_table>'::regclass` and verify each declared FK appears in the result. Pin the probe result in MIGRATION.md.

**Acceptance:** future schema SPECs surface FK creation explicitly per-migration (not just at run-end).

### P-EXEC-2 — Re-use M5 helper RPCs deliberately (Rule 21 in action)

**Symptom:** M6 commit_prescription correctly re-used M5's `allocate_tenant_number` via a single `PERFORM public.allocate_tenant_number(p_tenant_id, 'prescription')` call. This is the right pattern (avoid orphaning a new per-module counter table). But the SPEC's §0 needed to explicitly state this re-use as a "Dependencies from M5" row — without that, a future executor reading the SPEC might write a parallel counter table.

**Proposed change:** Add to `opticup-executor` SKILL.md a pre-build discipline:

> **Before building any sequential number allocator:** grep the project for existing `next_<x>_number` / `allocate_<x>_number` / `<x>_counter` patterns. If a generic per-tenant counter helper already exists (e.g., `allocate_tenant_number`), re-use it via INSERT into the shared counter table with a new `entity_kind` value. Do NOT create a parallel table.

**Acceptance:** future module SPECs that need per-tenant sequences re-use the shared table.

## Master-doc update checklist

| File | Status | Notes |
|---|---|---|
| `MASTER_ROADMAP.md` §3 | ⏳ chain-close | Module 6 status → "Phase A+B closed 🟢" |
| `docs/GLOBAL_MAP.md` | ⏳ chain-close | M6 functions + contracts |
| `docs/GLOBAL_SCHEMA.sql` | ⏳ chain-close | Append M6 DDL |
| `docs/DB_TABLES_REFERENCE.md` | ⏳ chain-close | 8 new tables |
| `modules/Module 6 - Prescriptions/docs/SESSION_CONTEXT.md` | ⏳ chain-close | |
| `modules/Module 6 - Prescriptions/docs/CHANGELOG.md` | ⏳ chain-close | |
| `modules/Module 6 - Prescriptions/docs/MODULE_MAP.md` | ⏳ chain-close | |
| `modules/Module 6 - Prescriptions/docs/MODULE_SPEC.md` | ⏳ chain-close | |
| `modules/Module 6 - Prescriptions/docs/db-schema.sql` | ⏳ chain-close | |
| `modules/Module 6 - Prescriptions/MODULE_6_ROADMAP.md` | ✅ Phase A+B done | (already updated) |

## Verdict

**🟢 CLOSED.** All §3 criteria pass at-time-of-review or queued for chain-close. M6 smoke 9/9 PASS. Cross-contract M5↔M6 5/5 PASS. Advisors clean. 0 reopener-class issues.

## Closing the loop

Both halves of the overnight chain are now 🟢. The chain proceeds to task #7 (module-level docs + GLOBAL_MAP/SCHEMA/DB_TABLES_REFERENCE additive merge + final commits + Hebrew status line to Daniel).
