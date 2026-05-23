# Code Review Report — M5/M6/M7/M8 Schema

> **Role:** opticup-reviewer (READ-ONLY independent audit)
> **Authored:** 2026-05-23
> **Subject:** the 4 SCHEMA SPECs (M5_SCHEMA, M6_SCHEMA, M7_SCHEMA, M8_SCHEMA) shipped across the 3 overnight chains 2026-05-22 → 2026-05-23
> **Brief:** `modules/Module 1.5 - Shared Components/architecture-brief/M5_M8_CODE_REVIEW_BRIEF.md` (v1)
> **Sibling Brief (parallel):** `M5_M8_STRATEGIC_REVIEW_BRIEF.md` — business-logic + contract focus; this report covers code/RLS/security/performance only.
> **Method:** Live Supabase MCP `execute_sql` (SELECT-only) against `pg_class`/`pg_policy`/`pg_proc`/`pg_index`/`pg_trigger`/`pg_constraint`/`information_schema.*`/`aclexplode` + `get_advisors(security)` + `get_advisors(performance)` + read of all 4 SPEC folders.

**Verdict: 🟡 PASS WITH NOTES.** The 4 SCHEMA SPECs ship a structurally sound spine. RLS canonical on 100% of 23 new tables, zero `auth.uid()` use, zero anon execute on 20 RPCs, all RPCs SECURITY DEFINER + `SET search_path=public`, all UNIQUE constraints tenant-scoped, all FKs from payments→orders/customers use `NO ACTION` (no accidental CASCADE on financial records), all 22 new views run `security_invoker=on`, no secrets in the `payment_adapters` manifest, `allocate_tenant_number` is provably atomic via `ON CONFLICT DO UPDATE ... RETURNING`. **However**, the M8 event-emission layer ships with a real TOCTOU race + no idempotency guard on `payment_events_queue` (Q-e); `payment_events_queue` has 3 unindexed FKs including `tenant_id` (will full-scan every consumer-side query); 4 more unindexed FKs across M6/M7/M8; 20 `auth_rls_initplan` advisor WARNs (per-row re-evaluation of `current_setting`); and no DB-level CHECK constraints on financial precision/sign (defense-in-depth gap). None of these are M9-blockers, but several should land before any UI writes against this spine.

**M9-readiness: READY-WITH-FOLLOWUPS.** M9 (Lab) consumes M7's `sub_orders` + emits its own events — the M7 spine is structurally sound for that. The payment_events_queue defects do not block M9 since M9 builds its own queue.

**UI-readiness: READY-WITH-FOLLOWUPS.** UI writes against `record_payment` will trigger the double-enqueue race the first time two staff record a first payment simultaneously. Recommend addressing F-D1 + F-D2 before the first UI SPEC against M8.

---

## 1. Axis-by-axis findings (A–I)

### Axis A — Migration audit

58 M5–M8 migrations applied 2026-05-22 19:56 → 2026-05-23 06:32 via MCP `apply_migration`. Versions monotonic; names follow `M{N}_{NN}_{purpose}`. The 4 SPECs each declare `## Destructive Operations: None.` and `schema_migrations` history confirms zero DROP/TRUNCATE/DELETE — only ALTER ADD COLUMN, CREATE IF NOT EXISTS, CREATE OR REPLACE. **Iron Rule 32: ✅.**

- **F-A1 [INFO]** — `M{5,6,7,8}_{15,09,08,10}_views` are mono-bundle migrations. Acceptable per M7 P-EXEC-2 grouping, but MIGRATION.md cannot pinpoint which view caused a regression. Cosmetic.
- **F-A2 [INFO]** — Zero `COMMENT ON TABLE` provenance on the 23 new tables. Brief §2.A flagged as good-practice; not an Iron Rule.

### Axis B — RLS audit (23 new tables)

`SELECT relname, relrowsecurity, policy_names FROM pg_class JOIN pg_policy …` returned **23/23 with `relrowsecurity=true` and exactly 2 policies each**.

- 21 tenant-scoped tables: `{service_bypass, tenant_isolation}` exactly the canonical pattern.
- 2 global platform tables (`payment_adapters`, `payment_capabilities`): `{service_bypass, public_read}` — correct global pattern per M8 design.
- **Every `tenant_isolation` USING clause** matches the canonical JWT-claim text verbatim:
  ```
  (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid)
  ```
- **Zero policies use `auth.uid()`** (probe 15 returned `[]`).
- **Zero policies use the legacy `current_setting('app.tenant_id')` session-var pattern** (probe 15 returned `[]`).

**Brief Q (a) — Can tenant-A JWT read tenant-B rows? NO.** Structurally verified via `pg_policy`. The SPECs' own smokes correctly noted (M5 FINDINGS F8) that behavioral verification via MCP cannot fire RLS (MCP runs as `postgres` superuser → bypasses RLS). For a behavioral verification the project would need PostgREST round-trip with an anon JWT; structural verification matches the project canonical M1A/M1B0 smoke pattern and is sufficient at SPEC-close.

**F-B1 [INFO]** — All 22 new M5-M8 views also carry the Supabase project-default grant pattern `{anon=ALL, authenticated=ALL, service_role=ALL, optic_readonly=SELECT}`. Because every view is `security_invoker=on` the underlying tenant_isolation policy engages, and an anon JWT has no `tenant_id` claim → USING returns NULL → 0 rows. The same pattern exists on `v_storefront_*` views by design (those *are* anon-readable). So functionally safe — but defense-in-depth would explicitly `REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN FROM anon, authenticated` on staff-only views (`v_payments_for_reports`, `v_customer_full`, etc.). This is a project-wide gap, not an M5-M8 regression. Severity: LOW.

### Axis C — RPC audit (20 RPCs)

`SELECT proname, prosecdef, proconfig, aclexplode(proacl)` against the M5-M8 RPC names returned 20 rows; **every one has `prosecdef=true`, `proconfig=['search_path=public']`, and grants `{postgres=EXECUTE, authenticated=EXECUTE, service_role=EXECUTE}`** — zero anon, zero PUBLIC.

**Brief Q (b) — Can anon execute any of the 29 RPCs? NO.** All 20 RPCs verified. (The SPEC inventories count create_sub_order, add_sub_order_item, apply_general_discount, reverse_payment etc. as additional M7/M8 — those appear in `pg_proc` under exact-name probes too, all with the same pattern.)

**Brief Q (c) — Any SECURITY DEFINER without `SET search_path`? NO.** All 20 verified. The `function_search_path_mutable` advisor (which fires across the project for several pre-existing functions) contains zero M5-M8 RPC names — confirmed by the Agent-parsed security advisor file.

**Brief Q (d) — Does `allocate_tenant_number` race? NO.** The full body (probe 9):
```sql
INSERT INTO public.tenant_number_counters (tenant_id, entity_kind, last_value)
  VALUES (p_tenant_id, p_entity_kind, 1)
  ON CONFLICT (tenant_id, entity_kind) DO UPDATE
    SET last_value = public.tenant_number_counters.last_value + 1,
        updated_at = now()
  RETURNING last_value INTO v_new_value;
```
Postgres' `INSERT ... ON CONFLICT DO UPDATE` takes a row-level write lock on the conflicting key, serializing concurrent calls. **Iron Rule 11: ✅.** Re-used by `create_customer`, `commit_prescription`, `create_order`, and `record_payment` with distinct `entity_kind` values — no cross-entity collision possible (PK is `(tenant_id, entity_kind)`).

- **F-C1 [LOW]** — `record_payment` casts `v_payment_number bigint` down to `integer` for the `payments.payment_number` column. Theoretical overflow at 2.1B payments per tenant. Not a real-world concern; flag as a future audit when payment volumes scale.
- **F-C2 [MED]** — `record_payment` has no `CHECK (amount > 0)` at the DB level. The RPC body raises if `v_amount <= 0`, but a service_role direct INSERT bypassing the RPC would persist `amount = 0` or negative. Defense-in-depth gap. Same for `orders` and `sub_order_items` (no CHECK on quantity/total).
- **F-C3 [MED]** — `mark_check_returned` reads `v_status` via plain SELECT then UPDATEs without a `WHERE status = 'in_bank'` predicate. Two concurrent calls both see `status='in_bank'` (committed snapshot under READ COMMITTED), both UPDATE → second one succeeds, trigger fires twice → 2 `check_returned` events for the same payment. Fix: add `AND status = 'in_bank'::payment_status` to the UPDATE's WHERE, or `SELECT … FOR UPDATE` before the status check.

### Axis D — Event-trigger mechanism (M8)

Three triggers verified via `pg_trigger`:
- `trg_emit_first_payment_event` AFTER INSERT ON payments → `emit_first_payment_event_fn()`
- `trg_emit_check_returned_event` AFTER UPDATE OF status ON payments → `emit_check_returned_event_fn()`
- `trg_recompute_order_status` AFTER INSERT OR UPDATE OF (state, is_deleted) ON sub_orders → `recompute_order_status_fn()`

All trigger functions are SECURITY DEFINER + `SET search_path=public`. `recompute_order_status_fn` reads aggregate counts from `sub_orders` then UPDATEs `orders.status` — **no recursion risk** (no trigger on `orders` would re-fire), **no N+1 risk in practice** (typical 1-3 sub_orders per order).

**Brief Q (e) — Can `payment_events_queue` double-enqueue? YES. 🔴 HIGH.**

`payment_events_queue` has NO unique constraint beyond `pkey (id)` (probe 12). The `emit_first_payment_event_fn` body (probe 9) reads:
```sql
SELECT count(*) INTO v_count FROM public.payments
  WHERE order_id = NEW.order_id AND id <> NEW.id AND is_deleted = false;
IF v_count = 0 THEN
  INSERT INTO public.payment_events_queue (...) VALUES (..., 'first_payment', ...);
END IF;
```
This is a classic TOCTOU race. Two concurrent `record_payment` calls for the same `order_id` (e.g., two staff at two terminals recording first payment for an order at the same moment) each see `v_count = 0` (committed snapshot) → both INSERT a `first_payment` event into the queue → downstream consumer (M4 messaging, M11 reports, M13 loyalty) fires the welcome flow twice.

- **F-D1 [HIGH]** — Add `CREATE UNIQUE INDEX payment_events_queue_first_payment_per_order_uidx ON payment_events_queue (order_id) WHERE event_kind = 'first_payment'` as a partial unique index. The second concurrent INSERT will raise `unique_violation` and the trigger will fail cleanly (rolling back the second payment? — needs a SAVEPOINT in the trigger function, or trap the exception and silently skip). Alternative: `pg_advisory_xact_lock(hashtext(order_id::text))` at the top of the function. Either way, the SPEC's smoke S5 (single-call) wouldn't have caught this — it requires concurrent producers.
- **F-D2 [HIGH]** — `emit_check_returned_event_fn` is gated by `OLD.status='in_bank' AND NEW.status='returned'` so it does not re-fire on idempotent identical UPDATEs (Postgres' "row not actually changed" suppression varies, but the status-equality gate is the actual filter). However, combined with F-C3 (no `WHERE status='in_bank'` on the UPDATE), two concurrent `mark_check_returned` for the same payment_id can each cause the trigger to fire once, double-enqueuing `check_returned`. Same remediation surface as F-D1 — partial unique index `(payment_id) WHERE event_kind = 'check_returned'`.
- **F-D3 [INFO]** — The queue has `consumed_at` + `consumed_by` for at-least-once delivery but no `attempts` counter or `last_error` column. Adequate for v1; flag for the first consumer SPEC (M4 emit→template-send) to decide if retry metadata is needed there or here.

### Axis E — View audit (22 views)

All 22 M5-M8 views have `reloptions=['security_invoker=on']` (probe 4) — RLS on the base table engages for the caller, not the view-owner. Includes `v_payments_for_reports`, `v_order_full`, `v_customer_full`, `v_customer_payments_history`. **22/22 ✅.** Zero appearance in `security_definer_view` or `materialized_view_in_api` advisors.

- **F-E1** — see F-B1 (anon=ALL via Supabase defaults; functionally blocked by security_invoker but defense-in-depth gap). Project-wide.

### Axis F — Performance + indexes

Probe 11 shows **20/23 M5-M8 tables have a leading tenant_id index** (the 3 without are the 2 global tables `payment_adapters` + `payment_capabilities`, and the queue table `payment_events_queue`).

- **F-F1 [HIGH]** — `payment_events_queue` has NO leading `tenant_id` index AND missing FK indexes on `tenant_id`, `order_id`, `customer_id` (probe 12 + performance advisor). Every consumer query like `SELECT * FROM payment_events_queue WHERE tenant_id = X AND consumed_at IS NULL` will be partly served by the `payment_events_queue_unconsumed_idx` (partial on event_kind WHERE consumed_at IS NULL) but the `tenant_id` filter falls through. For the v1 queue this is OK (queue depth is small); under sustained load with multiple tenants the consumer will scan more rows than necessary.
- **F-F2 [LOW]** — Performance advisor flags 7 unindexed FKs on new tables:
  - M6: `eye_exams.branch_id_fkey`, `prescriptions_glasses.health_fund_id_fkey`, `prescriptions_contacts.health_fund_id_fkey`
  - M7: `sub_orders.repair_origin_order_id_fkey`
  - M8: `payment_events_queue.{tenant_id,order_id,customer_id}_fkey` (= F-F1)
  All trivial to fix (one CREATE INDEX each). Folded into a single follow-up migration.
- **F-F3 [LOW]** — Performance advisor flags 20 `auth_rls_initplan` WARNs on M5-M8 tables (per-row re-evaluation of `current_setting('request.jwt.claims', true)`). Rewriting to `tenant_id = (SELECT (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid)` evaluates once per query rather than per row. Project-wide pattern — 181 occurrences total across the whole project. Mechanical fix; defer to a project-wide RLS-perf SPEC rather than per-module work.
- **F-F4 [INFO]** — 41 `unused_index` flags on M5-M8 tables. Expected — Phase A+B shipped today; no workloads have run. Re-audit after Phase C/D when usage exists. Premature dropping is wrong.
- **F-F5 [INFO]** — 20 `authenticated_security_definer_function_executable` advisor WARNs on M5-M8 RPCs. This advisor is informational — it fires whenever a SECURITY DEFINER function has `EXECUTE` granted to `authenticated`. Project's intended pattern. Not a defect.

**Brief Q (g) — Any new table missing a tenant_id / FK index?** YES on `payment_events_queue` (F-F1, HIGH). Otherwise tenant_id coverage is 20/20 on tenant-scoped tables.

**Brief Q (h) — Any HIGH advisor unaddressed?** Zero ERROR-level advisors on M5-M8 objects. 0 `security_definer_view`, 0 `rls_disabled_in_public`, 0 `function_search_path_mutable` on M5-M8. The 4 project-wide ERRORs (e.g., `v_storefront_pages`, `v_crm_event_stats`) are pre-existing and unrelated.

### Axis G — `payment_adapters` skeleton security

Probe 13 returned 3 seed rows (`mock`, `gama_pay`, `z_credit`). All have `credentials_schema_jsonb` populated as **descriptors** (e.g., `[{"key":"api_key","type":"password","placeholder":"GAMA-XXXX"}]`) — placeholders, not real keys. **Iron Rule 23: ✅ no secrets committed.** RLS: `{service_bypass, public_read}` — anyone (including anon) can SELECT, which is correct because the descriptors carry no secret material (the real credentials live in `tenants.<adapter>_credentials` per the manifest contract, not in `payment_adapters` rows).

- **F-G1 [INFO]** — `payment_adapters.public_read` policy uses `TO public` with no role restriction. Storefront anon could SELECT and learn that Gama Pay + Z Credit adapters exist. This is acceptable (the manifest is non-secret metadata) but a discipline note: when real credentials land in a future M8 Phase B, they MUST land in a `tenants`-row column or a `payment_credentials` table with `{service_bypass, tenant_isolation}`, never in `payment_adapters`.

### Axis H — Cross-module FK + cascade audit

Probe 10 (info_schema FK list) covers all M5-M8 FK constraints. **Brief Q (f) — Any cross-module FK with accidental CASCADE on financial records? NO. ✅**

| Edge | ON DELETE | OK? |
|---|---|---|
| payments → orders | NO ACTION | ✅ correct (RESTRICT) |
| payments → customers | NO ACTION | ✅ |
| payments → payment_methods | NO ACTION | ✅ |
| payments → payment_channels | NO ACTION | ✅ |
| orders → customers | NO ACTION | ✅ |
| sub_orders → orders | CASCADE | ✅ intentional (sub-order is a child of order; no financial loss because payments still RESTRICT on orders) |
| sub_orders → prescriptions_glasses/contacts | NO ACTION | ✅ |
| sub_order_items → sub_orders | CASCADE | ✅ intentional |
| sub_order_items → inventory | NO ACTION | ✅ |
| prescription_glasses_eyes → prescriptions_glasses | CASCADE | ✅ Pattern 11 (child rows belong to prescription) |
| prescription_contacts_eyes → prescriptions_contacts | CASCADE | ✅ |
| customer_notes/documents → customers | NO ACTION | ✅ |
| payment_events_queue → payments/orders/customers/tenants | NO ACTION | ✅ |
| households.primary_customer_id → customers | NO ACTION | ✅ (and households cycle avoided) |
| every *_tenant_id_fkey → tenants | NO ACTION | ✅ |

The CASCADE relationships (sub_orders→orders, sub_order_items→sub_orders, eye children → prescription parents) are all parent-child within-module, intentional, and do not propagate to payments. A hard DELETE on a customer would FAIL via RESTRICT (payments + orders block it) — so soft-delete is the only customer-removal path, and Decision M5 D10 (soft-delete does not hide FKs) is honored.

- **F-H1 [INFO]** — There is no FK from `payment_methods → payment_adapters` despite the M8 design connecting them via `adapter_id`. Verify in M8 db-schema. The Foreman REVIEW.md flagged adapter manifest as skeleton-only; the link will surface in M8 Phase B.

### Axis I — Iron-Rule sweep + cross-cutting

Summary table moved to §2 scorecard. Specific observations:
- **R5 (FIELD_MAP)** — `js/shared.js` T-constants extended for all 20 new tables (grep verified lines 77-99); `js/shared-field-map.js` has NO entry for any M5-M8 table (only `purchase_orders`). Acceptable until UI ships; flag for first UI SPEC. 🟡
- **R21 (No duplicates)** — M6 `commit_prescription` re-uses `allocate_tenant_number(p_tenant_id, 'prescription')`; M7 `create_order` re-uses with `'order'`; M8 `record_payment` with `'payment'` (probe 9). No parallel counter tables. ✅
- **R22 (defense-in-depth)** — Every RPC body inspected (probe 9) starts with the canonical Block A header (`v_jwt_role IS DISTINCT FROM 'service_role'` → check `v_jwt_tenant <> p_tenant_id` → raise 42501). All DML statements filter by `tenant_id`. ✅
- **R31 (Integrity gate)** — Chain commits `7e6c979`, `16c6355`, `688f0ac` clean per FOREMAN_REVIEWs; none used `--no-verify`. ✅

---

## 2. Iron Rule scorecard

Rules in-scope (schema-only SPECs): R3 ✅, R5 🟡 deferred (FIELD_MAP empty until UI), R9 ✅, R10 ✅, R11 ✅, R12 ✅, R13 ✅, R14 ✅ (21/21 tenant-scoped), R15 ✅ (23/23 canonical), R17 ✅ (22 views, security_invoker), R18 ✅, R19 ✅, R20 ✅, R21 ✅ (allocator re-used), R22 ✅, R23 ✅, R31 ✅, R32 ✅ (4 SPECs declare None; 0 destructive migrations).

Out-of-scope for schema-only SPECs: R1, R2, R4, R6, R7, R8, R33, R34, R35.

Sibling review owns: R16 contracts.

**Net: 17 ✅ / 1 🟡 (R5) / 0 ❌.**

---

## 3. Supabase Advisor results (M5-M8 scope)

**SECURITY advisors (parsed by sub-agent from `/tool-results/...369516.txt`, 204 KB, 189 lints total):**
- 0 ERROR-level on M5-M8 objects (4 project-wide ERRORs are pre-existing, unrelated).
- 0 `security_definer_view` on M5-M8.
- 0 `rls_disabled_in_public` on M5-M8.
- 0 `function_search_path_mutable` on M5-M8.
- 0 `anon_security_definer_function_executable` on M5-M8.
- **20 WARN `authenticated_security_definer_function_executable`** — fires on every M5-M8 SECURITY DEFINER RPC with `EXECUTE TO authenticated`. Project's intended pattern. Informational only.

**PERFORMANCE advisors (parsed by sub-agent from `/tool-results/...369462.txt`, 567 KB, 703 lints total):**
- 7 `unindexed_foreign_keys` (F-F2 above).
- 20 `auth_rls_initplan` WARN on M5-M8 (F-F3 above; project-wide pattern, 181 occurrences total).
- 41 `unused_index` INFO (F-F4 above; expected — new schema, no workload yet).
- 0 `multiple_permissive_policies`, 0 `duplicate_index`, 0 `no_primary_key` on M5-M8.

**Net introduced HIGH/ERROR by M5-M8: zero.** All M5-M8 lints are WARN (style/perf) or INFO. The SPECs' §3 success criteria #20 ("0 NEW HIGH/ERROR advisor lints") is satisfied.

---

## 4. Critical questions answered with evidence

**(a) Cross-tenant RLS leak across the 23 tables? NO.** All 23 tables `relrowsecurity=true` + canonical 2-policy (probe 1); every `tenant_isolation` USING clause is the verbatim JWT-claim cast (probe 2b); zero `auth.uid()` or legacy session-var (probe 15 returned `[]`). Behavioral verification via MCP is structurally impossible (MCP runs as `postgres` superuser, RLS-bypassing); `pg_policy` structural verification is the project canonical pattern at SPEC-close.

**(b) Anon execute any of the 29 RPCs? NO.** All 20 RPCs grant `{postgres, authenticated, service_role}` only (probe 3); `anon_security_definer_function_executable` advisor returns 0 M5-M8.

**(c) SECURITY DEFINER RPC without `SET search_path`? NO.** All 20 have `proconfig=['search_path=public']` (probe 3); `function_search_path_mutable` advisor returns 0 M5-M8.

**(d) `allocate_tenant_number` race? NO.** Body (probe 9): `INSERT … ON CONFLICT (tenant_id, entity_kind) DO UPDATE SET last_value = last_value + 1 RETURNING last_value`. Atomic at row level — PK is `(tenant_id, entity_kind)` so callers serialize per (tenant, entity); cross-entity collisions impossible (different PK rows). Smoke S2 in M5 TEST_REPORT proved contiguous serial allocation; locking guarantees extend to concurrent calls.

**(e) `payment_events_queue` double-enqueue? YES — concurrent-producer path, not retry path.** Postgres rolls back trigger INSERTs on tx rollback, so retry does not leak stale rows. But two concurrent `record_payment` for the same `order_id` will both see `v_count=0` in `emit_first_payment_event_fn`'s pre-check (probe 9) and both INSERT `first_payment` (no UNIQUE — probe 12 shows only pkey). Same on `mark_check_returned` (F-C3 + F-D2). **HIGH.** Remediation: partial unique indexes per F-D1.

**(f) Accidental CASCADE on financial records? NO.** Probe 10 enumerates 53 M5-M8 FKs; every payments→{orders, customers, payment_methods, payment_channels} edge is `NO ACTION`. CASCADEs (sub_orders→orders, sub_order_items→sub_orders, eye children → prescription parents) are intentional parent-child within-module.

**(g) Table missing tenant_id / FK index? YES — `payment_events_queue`.** Probe 11: no leading tenant_id index; performance advisor flags 3 unindexed FKs on the queue (tenant_id, order_id, customer_id). F-F1 (HIGH). Other 22 tables fully indexed on tenant_id.

**(h) HIGH advisor lint introduced and unaddressed? NO.** Sub-agent verified 0 ERROR on M5-M8 across 189 security lints. The 20 WARN `authenticated_security_definer_function_executable` + 20 WARN `auth_rls_initplan` are project-pattern WARNs, not security holes.

---

## 5. Top 5 production-risk findings the Foremen missed

1. **F-D1 — `payment_events_queue` first_payment double-enqueue** (HIGH). The single smoke that touches event emission (M8 M-S5 + cross-contract X-S5) is a single-producer test. Under real load (two staff terminals recording first payment simultaneously) the queue gets 2 rows, the downstream M4 welcome flow fires twice. Foremen marked the queue 🟢 without considering concurrent-producer semantics. Remediation: partial unique index `(order_id) WHERE event_kind='first_payment'`.
2. **F-C3 + F-D2 — `mark_check_returned` re-trigger** (HIGH). The UPDATE statement lacks a `WHERE status='in_bank'` predicate, so two concurrent calls both succeed and both fire `trg_emit_check_returned_event`. Same Foremen blind spot as #1. Remediation: add the WHERE predicate, AND add the partial unique on the queue per F-D1's structure.
3. **F-F1 — `payment_events_queue` has zero tenant_id / order_id / customer_id indexes** (HIGH-for-perf). When M4 starts draining the queue with `WHERE tenant_id = X AND consumed_at IS NULL`, the partial unconsumed index covers `consumed_at IS NULL` but not the `tenant_id` filter. As soon as 2 tenants generate volume, the consumer scans the wrong tenant's rows. Foremen did not run an advisor query specifically on the queue table; the queue is below the SPEC's verification floor because it never fires under solo demo smoke.
4. **F-C2 — No DB-level CHECK on payment/order amounts** (MEDIUM defense-in-depth). `record_payment` raises if `amount <= 0`, but a `service_role` direct INSERT (admin script, batch import, accidental migration) writes a negative amount with no DB rejection. Reports + reconciliation will subtract the negative and the books silently go off by 2×amount. Easy fix: `ALTER TABLE payments ADD CONSTRAINT payments_amount_positive CHECK (amount > 0)`.
5. **F-B1 — Anon ALL-privileges on M5-M8 views via Supabase project defaults** (LOW functionally, MEDIUM hygiene). `v_payments_for_reports`, `v_customer_full`, `v_customer_payments_history`, `v_order_full` are all `security_invoker=on` so RLS blocks anon SELECTs in practice (anon JWT has no `tenant_id` claim). But anon also has INSERT/UPDATE/DELETE/TRUNCATE grants. The defense-in-depth standard for staff-only views is explicit `REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN FROM anon` after CREATE. Foremen accepted Supabase defaults without inspecting `aclexplode(relacl)`.

---

## 6. M9 + UI technical-readiness gate

**M9 (Lab) — READY-WITH-FOLLOWUPS.** M9 will consume M7 `sub_orders` (read) and emit M9-side events via a new `lab_events_queue`. The M7 spine (`recompute_order_status_fn` + `transition_sub_order_state`) is sound for M9's read path. **Recommendation: address F-D1 + F-D2 + F-F1 BEFORE M9 ships its own queue.** If M9 copies the M8 queue pattern (Pattern P22 from M8's FOREMAN_REVIEW P-AUTHOR-1), it will inherit the double-enqueue gap. Codify the partial-unique-on-source-id idiom in Pattern P22 first.

**UI — READY-WITH-FOLLOWUPS.** The first UI SPEC against `record_payment` will, statistically, trigger F-D1 within weeks of real use (two staff at two terminals is a frequent Prizma flow). F-C2 (no CHECK on amount) means a UI-layer validation bug → permanent bad data with no DB safety net. **Recommendation: a 1-SPEC follow-up that adds:**
- partial unique indexes on `payment_events_queue (order_id) WHERE event_kind='first_payment'` and `(payment_id) WHERE event_kind='check_returned'`
- `tenant_id`/`order_id`/`customer_id` indexes on `payment_events_queue`
- `WHERE status='in_bank'` predicate on `mark_check_returned`'s UPDATE
- DB-level CHECK constraints: `payments.amount > 0`, `sub_order_items.quantity > 0`
- the 6 other unindexed FKs from F-F2

Estimated 1 SPEC, ~6 migrations, no behavior changes, fully additive.

---

## 7. Pre-M9 questions for Daniel

**Q1 — Approve a Phase B hardening SPEC before the first UI write on the spine?** The 4 items above (F-D1, F-D2 / F-C3, F-F1, F-C2) are not M9-blockers but they will land regressions the moment two staff simultaneously record a first payment. **Recommendation: YES — author a `M8_PHASE_B_QUEUE_IDEMPOTENCY` SPEC under Module 8 before any UI SPEC against `record_payment`.** Reason: cheaper to bake idempotency now (additive DDL only) than to instrument a duplicate-event remediation after Prizma's first incident.

**Q2 — How should the trigger handle a partial-unique-index violation on the queue?** Two options: (a) catch `SQLSTATE=23505 unique_violation` in the trigger and silently RETURN NEW (idempotent — first writer wins, second silently skips); (b) let the UPDATE fail and bubble the error to the RPC caller (forces the application to retry). **Recommendation: option (a)** — the queue's purpose is "at-least-once delivery" so silent dedup at emit-time matches the semantic. Wrap the INSERT in a `BEGIN ... EXCEPTION WHEN unique_violation THEN NULL; END` block.

**Q3 — Project-wide RLS perf rewrite (181 `auth_rls_initplan` occurrences)?** All M5-M8 tables (20 of 181) fire this advisor. Mechanical fix: wrap the `current_setting` call in `(SELECT …)`. **Recommendation: defer to a single project-wide RLS-perf SPEC** under Module 1.5 rather than per-module work. The fix is identical text across all 181 policies and one global SPEC is easier to verify-then-revert if anything breaks.

**Q4 — Tighten anon grants on staff-only views?** F-B1 / F-E1 are functionally safe today (security_invoker=on + no anon tenant claim → 0 rows). But it is inconsistent with the project's "defense in depth" rule (R22 spirit) to leave anon with INSERT/UPDATE/DELETE/TRUNCATE on financial views. **Recommendation: include in the same project-wide SPEC as Q3** — a single REVOKE-all-defaults-from-anon-on-staff-views migration with an allowlist for the explicit storefront views.

---

*End of report. 23 tables / 20 RPCs / 22 views / 53 FKs / 3 triggers audited via live MCP. 5 HIGH-impact findings (F-D1, F-D2, F-F1, F-C3, F-C2) all evidence-pinned to either probe output or pg_get_functiondef body. Verdict 🟡 — ship M9, fix queue idempotency before first M8 UI.*
