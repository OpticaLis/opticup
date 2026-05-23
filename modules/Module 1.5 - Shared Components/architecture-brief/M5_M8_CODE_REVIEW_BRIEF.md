# Module Brief — M5/M6/M7/M8 Code Review (Security / Schema / RLS / Performance)

**Brief version:** v1
**Date:** 2026-05-18
**Author:** Architect
**Skill to load:** `opticup-reviewer`
**Mode:** **READ-ONLY review.** No code changes, no SQL writes, no migrations, no commits. Output is one report file.
**Sibling Brief (parallel):** `M5_M8_STRATEGIC_REVIEW_BRIEF.md` (separate Claude Code chat, `opticup-strategic`).

---

## 1. Purpose

M5 (Customers) + M6 (Prescriptions) + M7 (Orders) + M8 (Payments) shipped schema-only across 3 fast overnight chains. ~24 new tables, ~46 enums, ~28 views, ~29 RPCs, plus M8's new event-trigger mechanism — all built fast, each closed 🟢 on its own smoke, but **no independent code/security audit of the four together.**

Before M9 builds on M7 and before any UI builds on all four, we want an independent `opticup-reviewer` audit. The recent SECURITY_HOTFIX series + the M1 reviews proved that fast schema builds harbor RLS leaks, missing tenant_id defenses, sequence races, SECURITY-DEFINER misuse, and performance landmines the existential smokes miss.

**This review is NOT:** a re-execution, a business-logic review (sibling's job), a refactor, or a rubber-stamp.

**This review IS:** a skeptical pass over the migrations, RPCs, triggers, views, and event mechanism of all four modules — hunting for security holes + production-risk-under-load that the 4 Foremen didn't catch.

---

## 2. Scope — In

Read all 4 modules' SPEC artifacts + live Supabase state via MCP (`execute_sql` SELECT-only, `list_tables`, `get_advisors`). Test across **nine axes** spanning all four modules.

### Axis A — Migration audit (all M5-M8 migrations)

Per the retros: ~34 M5/M6 migrations + ~24 M7/M8 migrations. For a sample of the highest-risk ones:
- Idempotency (CREATE ... IF NOT EXISTS).
- DOWN/rollback path documented.
- `SET search_path = public` on every SECURITY DEFINER fn (verify on a sample of 5 across the 4 modules).
- `COMMENT ON TABLE` provenance.

### Axis B — RLS audit (all ~24 new tables)

Run via MCP `execute_sql` against `pg_class` × `pg_policy` for every new M5/M6/M7/M8 table:
- `relrowsecurity = true`? (Iron Rule 15 — non-negotiable.)
- Policy count matches pattern (2 for tenant-scoped service_bypass + tenant_isolation; 3 for platform/global).
- USING uses the canonical JWT-claim pattern, NOT `auth.uid()`.
- **Cross-tenant test:** can tenant-A JWT read tenant-B rows in any of the 24 tables? Inspection-based if live-INSERT too risky; document method.
- Any `GRANT SELECT ... TO anon` on these staff-only tables? (should be zero — customers/orders/payments are NOT public.)

### Axis C — RPC audit (all ~29 new RPCs)

For each (create_customer, merge_customers, commit_prescription, order create, record_payment, etc.):
- `prosecdef = true` + `SET search_path = public`?
- JWT tenant_id validated as first statement (Rule 22 defense-in-depth)?
- `FOR UPDATE` on every sequential generator (`allocate_tenant_number` for customer/order/payment numbers — Iron Rule 11)?
- `REVOKE EXECUTE FROM PUBLIC, anon`; `GRANT EXECUTE TO authenticated`? (verify via `aclexplode`).
- **Special focus — `allocate_tenant_number`:** it serves 3 entity kinds (customer/order/payment) concurrently. Can two concurrent calls collide? Inspect the lock order. This is the single highest-concurrency RPC in the spine.
- **record_payment + order create:** atomic? Can a payment land without its order FK? Can inventory decrement race with order creation?

### Axis D — Event-trigger mechanism audit (M8's new pattern)

M8 introduced `payment_events_queue` + `trg_emit_first_payment_event` + `trg_emit_check_returned_event` (per retro — "Pattern P22 first formal codification") + M7's `trg_recompute_order_status` (Pattern P21).
- **Idempotency:** transaction retry → double-enqueue? Is there a UNIQUE on the event source id?
- **tenant_id leak:** does the queue row carry tenant_id correctly + RLS-protected?
- **Performance:** these triggers fire on every payment/order write. Per-write cost?
- **trg_recompute_order_status:** recomputes order status from sub-orders on every change — N+1 risk? Recursion risk (does updating order status re-fire any trigger)?

### Axis E — View audit (all ~28 views)

- `security_invoker = on` (retro says all M7/M8 views have it — verify all 28)?
- anon SELECT grants — revoked? (none should be anon-reachable; these are staff Views.)
- Any view leaking sensitive columns unnecessarily (e.g., does `v_order_payment_summary` expose internal cost/margin)?
- `v_payments_for_reports` (M11 consumer) — unified across statuses; does it leak cross-tenant in any JOIN?

### Axis F — Performance + index audit

- Every FK column indexed (the M1B0 lesson — 21 unindexed FKs found there)?
- tenant_id index (single or leading) on every tenant-scoped table?
- Hot tables: `payments`, `orders`, `sub_order_items` will see heavy writes under real use. Composite indexes for common queries (payments by order, orders by customer+status)?
- Supabase Advisor: run `get_advisors` PERFORMANCE + SECURITY; pin HIGH/MEDIUM against the new M5-M8 objects; classify pre-existing vs newly-introduced.

### Axis G — payment_adapters skeleton security

M8 shipped `payment_adapters` as a config manifest (Mock/Gama/Z Credit) with `credentials_schema`. Verify:
- No real credentials/tokens/secrets committed in the seed rows (Iron Rule 23).
- The `credentials_schema` column is a schema-descriptor, not actual credentials.
- RLS protects it (provider config is sensitive — who can read it?).

### Axis H — Cross-module FK + cascade audit

The spine has deep FK chains: payment→order→customer, sub_order→prescription, sub_order_item→inventory.
- ON DELETE behavior on every cross-module FK — any accidental CASCADE that would delete payments when a customer soft-deletes? (should be RESTRICT or SET NULL, never CASCADE on financial records.)
- Soft-delete consistency: does soft-deleting a customer leave orphan orders? (per M5 decision #10 — soft-delete doesn't hide FKs.)
- The crm_leads-still-live situation: any FK from M5/M7/M8 that assumes crm_leads is gone?

### Axis I — Iron-Rule sweep + cross-cutting

- Rule 5 (FIELD_MAP) — all ~24 new tables in FIELD_MAP?
- Rule 12 (file size) — any new JS/migration file > 350 lines? (schema-only, likely N/A but check.)
- Rule 23 (no secrets) — grep migrations + adapter seeds for hardcoded keys/tokens.
- Rule 31 (integrity gate) — all chain commits clean, no `--no-verify`.
- Rule 32 (destructive ops) — declared None; verify no DROP/TRUNCATE in the migrations.
- Re-used infra soundness: M7/M8 re-used M5's `allocate_tenant_number` + M1's `decrement_inventory`. Are those re-uses correct (right signature, right lock semantics)?

---

## 3. Scope — Out

- No SQL writes/DDL/RPC invocation. `execute_sql` SELECT only. INSERT/UPDATE/DELETE/CREATE/DROP/ALTER FORBIDDEN. Cross-tenant test by inspection if executing is risky.
- No file touch except `M5_M8_CODE_REVIEW_REPORT.md`.
- No commit/branch/push/merge.
- No follow-up SPECs. Findings → report.
- No business-logic/contract review — sibling's job.
- No refactoring. A finding may say "rewrite X because Y"; never write the rewrite.

---

## 4. Deliverable

ONE file: `modules/Module 1.5 - Shared Components/architecture-brief/M5_M8_CODE_REVIEW_REPORT.md`

**Structure:**
```
# Code Review Report — M5/M6/M7/M8 Schema
**Verdict:** 🟢 / 🟡 / 🔴 (one-paragraph rationale)
**M9-readiness:** READY / READY-WITH-FOLLOWUPS / BLOCKED
**UI-readiness:** READY / READY-WITH-FOLLOWUPS / BLOCKED

## 1. Axis-by-axis findings (A-I)
Per finding: title, severity, location (file:line / DB object / migration ref / RPC name), evidence (query result / code snippet), proposed action.

## 2. Iron Rule scorecard (rules 1-32 × ✅/🟡/❌ × evidence)

## 3. Supabase Advisor results (HIGH/MEDIUM on M5-M8 objects; pre-existing vs introduced)

## 4. Critical questions answered with evidence:
  (a) Can tenant-A JWT read tenant-B rows in any of the 24 tables?
  (b) Can anon execute any of the 29 RPCs?
  (c) Any SECURITY DEFINER RPC without SET search_path?
  (d) Does allocate_tenant_number race under concurrent customer+order+payment creation?
  (e) Can the M8 event queue double-enqueue on retry?
  (f) Any cross-module FK with accidental CASCADE on financial records?
  (g) Any new table missing a tenant_id / FK index?
  (h) Any HIGH advisor lint introduced by M5-M8 unaddressed?

## 5. Top 5 production-risk findings (the Foremen missed)

## 6. M9 + UI technical-readiness gate

## 7. Pre-M9 questions for Daniel (code/security only, ONE recommendation each)
```

**Severity per opticup-guardian:** every CRITICAL/HIGH evidence-backed (query result / file:line / advisor ID). **Target: 2000-4000 words.** Tight, evidence-dense.

---

## 5. Reading list (in order)

1. `CLAUDE.md` §4-§7 (Iron Rules 1,11,14,15,18,22,31,32 + canonical RLS pattern).
2. `docs/guardian/SECURITY_HOTFIX_2026_05_13_SUMMARY.md` + the public-data-layer + recent hotfix patterns — the new schema MUST inherit these (REVOKE anon EXECUTE, security_invoker views, etc.).
3. The 4 SPEC folders: SPEC + EXECUTION_REPORT + FINDINGS + REVIEW + MIGRATION + TEST_REPORT each.
4. `js/shared.js` + `js/shared-field-map.js` — confirm FIELD_MAP + T-constants for all new tables.
5. `docs/GLOBAL_SCHEMA.sql` + `docs/DB_TABLES_REFERENCE.md` — confirm the merge.
6. **Live Supabase via MCP** — `list_tables`, `get_advisors(SECURITY)`, `get_advisors(PERFORMANCE)`, targeted SELECTs against `pg_class`, `pg_policy`, `pg_proc`, `pg_indexes`, `pg_trigger`, `pg_constraint`, `information_schema.columns`, `aclexplode(proacl)`, `aclexplode(relacl)`.

---

## 6. Critical questions the report must answer (with evidence)

Listed in §4 #4 (a)-(h). Each → one paragraph with a verifiable result.

---

## 7. What "good" looks like

- Names ≥3 production-risk findings the 4 Foremen missed.
- Runs the cross-tenant RLS test (or documents inspection-only) for all 24 tables.
- Spot-checks ≥4 RPCs across the 4 modules (signature, gate, lock order, error path) — including `allocate_tenant_number` under the concurrency lens.
- Pins each finding to file:line or DB object — no "RLS looks ok."
- Confirms the new schema inherited the SECURITY_HOTFIX patterns.
- < 4000 words.

---

## 8. Hand-off

After the report is written + committed (single commit: `docs(m1.5): add M5-M8 code review report`), emit ONE Hebrew line:
> "Code Review (M5-M8) הסתיים. Verdict: [🟢/🟡/🔴]. M9-readiness: [...]. דו"ח: <path>."

That's all. Architect reads both reports together + decides M9 kickoff.

---

## 9. Pre-flight

1. Branch `develop`, repo `opticalis/opticup`.
2. The 4 SCHEMA SPEC folders exist with FOREMAN_REVIEW.md each (all 🟢).
3. Supabase MCP connected (read-only SELECTs + advisors).
4. If a pre-flight fails → STOP, write a one-paragraph escalation note in the report, halt.

---

*End of Brief. Read-only code/security/RLS/performance audit across 4 modules. Single report. No code changes.*
