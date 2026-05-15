# Code Review Report — M1 Lens Inventory Phase 1A

**Reviewer:** `opticup-reviewer` (fresh independent session, 2026-05-15)
**Reviewed:** 5 migrations + 9 atomic RPCs + 1 trigger fn + 1 view + 1 Edge Function + `lens-catalog-admin.html` + 7 JS modules + 12 develop-branch commits + live Supabase state (`tsxrrxzmdxaenlvocyit`, Postgres 17.6.1.063, `ACTIVE_HEALTHY`).
**Mode:** READ-ONLY (Supabase MCP `execute_sql`, `get_advisors`, `list_projects` only).
**Verdict:** 🟡 **CLOSED WITH FOLLOW-UPS.** Substantive shipment is solid — every tenant-scoped table has canonical JWT-claim RLS, every new SECURITY DEFINER has `SET search_path = 'public'`, `record_stock_movement` correctly `FOR UPDATE`s the lot before computing FIFO, the K3 trigger correctly inherits `NEW.tenant_id`, the K5 view has `security_invoker = on`, the EF has a real platform-admin gate. But Phase 1A did **not** inherit the post-`SECURITY_HOTFIX_2026_05_13` `REVOKE EXECUTE FROM anon` discipline (advisor lints 0028+0029 fire on 10 functions); `next_lens_variant_display_id()` is the one truly anon-callable mutator (no tenant guard, no rate limit); the EF has **no `config.toml` block**, so a CLI redeploy can silently flip `verify_jwt` and expose a service-role catalog mutator; the K3 trigger has no idempotency key; and 21 FK columns are unindexed before Phase 1B's 60–100 writes/minute hit. Three CRITICAL/HIGH findings warrant a short hardening SPEC before Phase 1B kicks off — none requires rollback.
**Phase 1B readiness:** **READY-WITH-FOLLOWUPS** — Phase 1B may start in parallel with a hardening SPEC; the 3 CRITICAL/HIGH items are inherited-pattern hygiene rather than data leaks.

---

## 1. Axis-by-axis findings

### Axis A — Migrations (5 files)

| # | Severity | Finding | Location | Evidence | Action |
|---|---|---|---|---|---|
| A-1 | LOW | Each migration uses `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `INSERT … ON CONFLICT DO NOTHING`. Re-runnable. | all 5 files | confirmed via direct read | dismiss |
| A-2 | LOW | `ROLLBACK.md` documents reverse-FK-order DROPs (`ROLLBACK.md:11–75`) but no migration was wrapped in a single explicit transaction — Supabase MCP `apply_migration` wraps each call atomically, but `migration 4/5` includes mid-file `ALTER TABLE ADD CONSTRAINT` statements (`20260514180300:130, 169, 172`) which need the parent table already committed in the same call. Verified working in live (FKs exist) but if migration 4/5 ever fails partway, half the constraints could be absent. | `migration 4/5` | partial-failure recovery would need full re-run via `IF NOT EXISTS` semantics on constraints — they are NOT idempotent | medium-term: refactor add-constraint blocks into migration 5/5 or wrap explicitly |
| A-3 | LOW | Every new table has `COMMENT ON TABLE` (verified in all 5 migration files). RPCs + view also commented. | all 5 files | direct read confirmed | dismiss |
| A-4 | MEDIUM | `migration 5/5:55, 75, 95` — sequence generators do `PERFORM id FROM tenants WHERE id = p_tenant_id FOR UPDATE` then `SELECT COALESCE(MAX(CAST(SUBSTRING(...) AS INT)), 0) FROM stock_lot/stock_transfer/purchase_receipt`. The `FOR UPDATE` is on a *different* row than the sequence target. This serializes correctly **only** while the caller holds the tenants lock through to its own INSERT — true for the 3 internal callers (`record_transfer`, `record_adjustment_found`, `m1_create_receipt_from_box`) but brittle for any future direct caller. Compare with the canonical `lens_variant_display_seq` pattern (own state table, atomic `UPDATE … RETURNING`) — that one is right. | `migration 5/5:44–102` | function bodies inspected via `pg_get_functiondef` | follow-up: migrate the 3 MAX-based generators to the `lens_variant_display_seq` style before adding non-RPC callers in Phase 1B |
| A-5 | LOW | `migration 5/5:373` — trigger `m9_lens_received_for_sale_order_trg` uses `EXECUTE FUNCTION` (correct ≥ PG11 syntax). ✅ | live `pg_trigger` row | `tgenabled = 'O'` (enabled by default) | dismiss |

### Axis B — RLS audit (17 new tables + 2 supporting)

Live query result against `pg_class` × `pg_policy`:

| Table | `rls_enabled` | `rls_forced` | Policies | Pattern |
|---|---|---|---|---|
| `lens_brand`, `lens_design`, `lens_variant` | ✅ | ❌ | 3 each (`service_bypass` + `owner_view` JWT-claim + `public_view` published-only) | platform-owned 3-policy ✅ |
| `vat_rates` | ✅ | ❌ | 3 (`service_bypass` + `public_view USING (true)` + `owner_view` JWT-claim) | global reference ✅ |
| 13 tenant-scoped tables (`supplier_brand_distribution`, `supplier_catalog_offering`, `pricing_overlay`, `tenant_*`, `stock_*`, `purchase_receipt`, `purchase_receipt_line`, `supplier_permissions`, `change_approval_log`, `pending_lens_advancement_queue`) | ✅ | ❌ | 2 each (`service_bypass` + `tenant_isolation` JWT-claim) | canonical 2-policy ✅ |
| `lens_variant_display_seq` | ✅ | ❌ | 1 (`service_bypass` only) | global singleton — direct reads blocked, RPC bypass via SECURITY DEFINER ✅ |

| # | Severity | Finding | Evidence | Action |
|---|---|---|---|---|
| B-1 | LOW | **No `relforcerowsecurity = true`** on any of the 19 tables. Table-owner (postgres) bypasses RLS. Consistent with the rest of the project (verified — every other tenant table is also non-FORCE), so not Phase-1A-introduced. | live `pg_class.relforcerowsecurity = false` for all 19 | defer to project-wide hardening SPEC |
| B-2 | LOW | Every tenant_isolation USING clause uses the canonical pattern `tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid` — **NO use of `auth.uid()`** anywhere. ✅ Cleanly inherits the SECURITY_HOTFIX_2026_05_13 canonical pattern. | live `pg_policy.polqual` for all 14 tenant-scoped policies | dismiss |
| B-3 | LOW | **Cross-tenant read test (by inspection):** for each of the 14 tenant-scoped tables, the policy `USING (tenant_id = jwt.tenant_id)` filters every row before return. A tenant-A JWT querying tenant-B rows gets 0 rows. RLS is implicitly enforced as `WITH CHECK` for INSERT/UPDATE, so writes also rejected cross-tenant. Live-INSERT cross-tenant test not run per Brief §3 (read-only mode). | full policy enumeration above | dismiss |
| B-4 | MEDIUM | All 13 `tenant_isolation` policies use `FOR ALL TO public` — i.e. a tenant JWT can INSERT/UPDATE/DELETE directly on `stock_lot.qty_remaining`, `stock_movement` rows, `tenant_lens_stock.qty_on_hand`, bypassing the atomic-RPC discipline. The Iron Rule 1 / Rule 11 guarantees are enforced at the **application** layer only. Same pattern is used project-wide (e.g. `inventory` table), so not Phase-1A-introduced — but for an append-only event ledger (`stock_movement`) and FIFO state (`stock_lot.qty_remaining`) this is the weakest defensive layer. | `pg_policy.polcmd = '*'` for all 13 | follow-up: in a future SaaS-hardening SPEC, split the tenant_isolation policy on `stock_movement` / `stock_lot` / `tenant_lens_stock` into `FOR SELECT` for tenant JWT and `FOR INSERT/UPDATE/DELETE` to `service_role` only (forcing all mutation through SECURITY DEFINER RPCs) |
| B-5 | LOW | `pricing_overlay.scope_supplier_id` FK to `suppliers.id` has no same-tenant constraint — a tenant could (via direct INSERT) reference another tenant's supplier UUID. Postgres FK passes; tenant's own SELECT join through suppliers RLS returns NULL. Project-wide pattern (e.g. `supplier_catalog_offering.supplier_id` same shape). Not a data leak; data-integrity foot-gun. | column-level inspection | defer — same shape exists across the project |

### Axis C — RPC audit (9 atomic RPCs + 1 trigger fn)

Live query against `pg_proc` for all 10 functions (the 9 RPCs + `m9_lens_received_for_sale_order_trg_fn`):

| Function | `prosecdef` | `proconfig` | `anon EXECUTE` | `authenticated EXECUTE` | `PUBLIC EXECUTE` |
|---|---|---|---|---|---|
| `effective_price` | ✅ true | `[search_path=public]` | ✅ EXECUTE | ✅ EXECUTE | ✅ EXECUTE |
| `m1_create_receipt_from_box` | ✅ | `[search_path=public]` | ✅ | ✅ | ✅ |
| `m9_lens_received_for_sale_order_trg_fn` | ✅ | `[search_path=public]` | ✅ | ✅ | ✅ |
| `next_lens_variant_display_id` | ✅ | `[search_path=public]` | ✅ | ✅ | ✅ |
| `next_lot_number` | ✅ | `[search_path=public]` | ✅ | ✅ | ✅ |
| `next_receipt_number` | ✅ | `[search_path=public]` | ✅ | ✅ | ✅ |
| `next_transfer_number` | ✅ | `[search_path=public]` | ✅ | ✅ | ✅ |
| `record_adjustment_found` | ✅ | `[search_path=public]` | ✅ | ✅ | ✅ |
| `record_stock_movement` | ✅ | `[search_path=public]` | ✅ | ✅ | ✅ |
| `record_transfer` | ✅ | `[search_path=public]` | ✅ | ✅ | ✅ |

| # | Severity | Finding | Evidence | Action |
|---|---|---|---|---|
| C-1 | **HIGH** | **All 10 SECURITY DEFINER functions are EXECUTE-able by `anon`, `authenticated`, and `PUBLIC`.** The `SECURITY_HOTFIX_2026_05_13` SPEC (commits `eaf5911`, `738203c`) established the project-wide canonical pattern of `REVOKE EXECUTE FROM anon, authenticated` on SECURITY DEFINER RPCs (`docs/guardian/SECURITY_HOTFIX_2026_05_13_SUMMARY.md:38`); Phase 1A — which closed 36 hours after that hotfix — did **not** apply the same `REVOKE`. Advisor lints `0028_anon_security_definer_function_executable` + `0029_authenticated_security_definer_function_executable` fire on all 10. **Functional mitigation:** for the 8 RPCs that take `p_tenant_id`, the function body first guard `IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN RAISE EXCEPTION` (e.g. `migration 5/5:51, 71, 91, 120, 169, 219, 260, 315`) rejects unauthenticated callers. So in practice, `anon` calling `record_stock_movement(...)` raises `42501`. The defense is in-body, not in-grants — the project precedent is belt-AND-suspenders. | live `aclexplode` over `pg_proc.proacl`; SECURITY_HOTFIX_2026_05_13_SUMMARY.md §2 row §6.4 | **CRITICAL/HIGH** follow-up SPEC: `REVOKE EXECUTE ON FUNCTION … FROM PUBLIC, anon, authenticated;` for all 10, then `GRANT EXECUTE TO authenticated` selectively on the 8 user-callable RPCs (skip `next_lens_variant_display_id` + `m9_lens_received_for_sale_order_trg_fn`) |
| C-2 | **CRITICAL** | `next_lens_variant_display_id()` is anon-callable AND has no tenant guard (function body `migration 5/5:23–42` takes zero parameters and reads no JWT claim). An anon caller can do `POST /rest/v1/rpc/next_lens_variant_display_id` repeatedly — each call performs `UPDATE lens_variant_display_seq SET last_value = last_value + 1 …`. No rate limit, no auth check. Sequence is BIGINT so exhaustion isn't a near-term concern, but: (a) display_id values get wasted (next legitimate `LV-NNNNNN` is incremented for each abuse call); (b) the update is a row-level write that takes a heavy lock under contention. Should the sequence ever be made tenant-scoped, this becomes a cross-tenant identifier-leak channel. | live `proacl` for `next_lens_variant_display_id`; function body has no JWT check | fix in same C-1 follow-up SPEC by `REVOKE EXECUTE FROM anon`. Add a JWT-non-null guard as defense-in-depth. |
| C-3 | LOW | `m9_lens_received_for_sale_order_trg_fn` is exposed as a callable RPC (anon EXECUTE), which is wrong-by-shape for a trigger function. If called directly via REST it would crash on `NEW.sale_order_id` being undefined — but it's still surface area that shouldn't be REST-reachable. | live `proacl` | fold into C-1 follow-up: `REVOKE EXECUTE … FROM PUBLIC, anon, authenticated;` (only postgres + trigger context needs to call it) |
| C-4 | LOW | Every of the 8 user-callable RPCs validates JWT tenant_id as the first statement of the body. ✅ Iron Rule 22 (defense-in-depth) satisfied for the RPC layer. | `migration 5/5:51, 71, 91, 120, 169, 219, 260, 315` | dismiss |
| C-5 | MEDIUM | **`record_stock_movement` FIFO lock order — Brief Q4 verified:** `migration 5/5:124` does `SELECT tenant_id, qty_remaining INTO … FROM stock_lot WHERE id = p_source_lot_id FOR UPDATE` **before** the negative-balance check at line 131 and the lot UPDATE at line 146. ✅ Two concurrent calls on the same lot serialize correctly; the second waits, re-reads `qty_remaining` post-commit of the first. No negative-stock race. | function body inspection | dismiss; this is the right shape |
| C-6 | LOW | `record_stock_movement` does an UPSERT into `tenant_lens_stock` at `migration 5/5:148–153` using `GREATEST(0, …)` — silently clamps negatives. For the receipt path (positive `qty_delta`) this is irrelevant. For the sale/adjustment-lost path (negative `qty_delta`) it can mask a "stock went below zero somewhere" bug because the projection clamps to 0 while the underlying `stock_lot.qty_remaining` would have correctly raised at line 131. The clamp is intentional (prevents NULL/negative cached qty) but worth a comment. | line `migration 5/5:148–153` | LOW: add inline comment or a separate alert/log on clamp |
| C-7 | LOW | `record_transfer` (`migration 5/5:158–207`) creates a destination lot at line 185–192, then enqueues two stock_movement events (out + in). Does **not** call `record_stock_movement` for the source lot's `qty_remaining` UPDATE — but it does delegate to `record_stock_movement` for both legs via `PERFORM` at lines 193, 199. ✅ Atomic at the function level (SECURITY DEFINER, single transaction). The destination lot's `unit_cost` is copied from the source — correct for cost-basis preservation. | function body | dismiss |

### Axis D — K3 trigger audit (`m9_lens_received_for_sale_order_trg`)

Live `pg_trigger` row confirmed: `tgname=m9_lens_received_for_sale_order_trg`, AFTER INSERT on `stock_movement`, `FOR EACH ROW EXECUTE FUNCTION m9_lens_received_for_sale_order_trg_fn()`, `tgenabled='O'` (enabled).

Function body (`migration 5/5:359–370`):

```sql
IF NEW.sale_order_id IS NOT NULL AND NEW.purchase_receipt_id IS NOT NULL THEN
  INSERT INTO pending_lens_advancement_queue(
    tenant_id, sale_order_id, purchase_receipt_id, stock_movement_id
  ) VALUES (NEW.tenant_id, NEW.sale_order_id, NEW.purchase_receipt_id, NEW.id);
END IF;
RETURN NEW;
```

| # | Severity | Finding | Evidence | Action |
|---|---|---|---|---|
| D-1 | LOW | NULL handling — both branches (`sale_order_id IS NULL`, `purchase_receipt_id IS NULL`) fall through cleanly. ✅ | body inspection | dismiss |
| D-2 | LOW | Tenant isolation — queue row inherits `NEW.tenant_id`; the queue table has the canonical `tenant_isolation` RLS policy (confirmed in axis B). **No cross-tenant leak path** — Brief Q5 verified. | axis B table row for `pending_lens_advancement_queue` | dismiss |
| D-3 | **MEDIUM** | **No idempotency key.** `pending_lens_advancement_queue` has no UNIQUE on `stock_movement_id`. A transaction retry (deadlock, serialization failure, application replay) would re-fire `AFTER INSERT` and double-enqueue. M9's consumer must dedup, or the queue grows pathologically. Today no M9 consumer exists (the queue is dormant). Phase 1B will start writing into `stock_movement` heavily; the queue's correctness gates M9's correctness when it's built. | schema — `pending_lens_advancement_queue` has only PK + tenant_idx + unprocessed_idx; no UNIQUE on `stock_movement_id` | follow-up: `CREATE UNIQUE INDEX … ON pending_lens_advancement_queue(stock_movement_id);` — single statement, low risk. Caller should `ON CONFLICT DO NOTHING`. |
| D-4 | LOW | Performance — trigger does one INSERT per stock_movement INSERT (when both FK conditions hold). Today both conditions are rare (sale_order_id is M7 future scope). At Phase 1B's 60–100 inserts/minute, only the receipt-against-sale-order path fires the trigger — likely 10-20% of inserts. Per-trigger cost is one row-insert + 2 index maintenance ops. Negligible. | structural analysis | dismiss |

### Axis E — K5 view audit (`v_suppliers_for_m9`)

Live `pg_class` row confirmed: `reloptions = [security_invoker=on]` ✅. View definition `SELECT s.id, s.tenant_id, s.name, s.supplier_number, s.phone, s.email, s.active FROM suppliers s WHERE s.active = true`.

| # | Severity | Finding | Evidence | Action |
|---|---|---|---|---|
| E-1 | LOW | `security_invoker=on` — caller's RLS context applies. Underlying `suppliers` table has tenant-scoped RLS; anon caller sees zero rows (no JWT tenant_id claim resolvable). ✅ | live `reloptions` | dismiss |
| E-2 | MEDIUM | **Live grants on the view are over-broad** — `aclexplode(v.relacl)` returns `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `TRIGGER`, `REFERENCES`, `MAINTAIN` to `anon`, `authenticated`, `postgres`, `service_role`, and `SELECT` to `optic_readonly`. The migration's `GRANT SELECT … TO authenticated, service_role` did not `REVOKE` from anon, and Supabase's default `GRANT ALL` to all roles on schema `public` had already applied. Functional impact is **nil** for INSERT/UPDATE/DELETE (view is not updatable, no INSTEAD OF triggers — writes silently fail). `SELECT:anon` is mitigated by `security_invoker=on` + suppliers RLS (anon has no JWT tenant_id → returns 0 rows). But the surface area is sloppy and inconsistent with the post-`SECURITY_HOTFIX_2026_05_13` hardened pattern for the 9 `v_admin_*` views (`SUMMARY.md` §2 row §6.3 — explicit anon REVOKE). | aclexplode output above | follow-up: `REVOKE ALL ON v_suppliers_for_m9 FROM PUBLIC, anon, authenticated; GRANT SELECT TO authenticated, service_role;` |
| E-3 | LOW | Column set — `(id, tenant_id, name, supplier_number, phone, email, active)`. No bank/internal-cost fields exposed. ✅ Brief expected `default_courier_company_id` + `expected_return_days` but executor dropped them (FINDING M1A-SPEC-04) because the underlying suppliers table doesn't have them. M9 will JOIN its own `lab_couriers` / `lab_supplier_thresholds` tables when it builds them. | view definition | dismiss |

### Axis F — Edge Function (`lens-catalog-import`)

Files: `index.ts` (299 LOC), `validate.ts` (59 LOC), `deno.json` (5 LOC). All under Iron Rule 12 (350 LOC).

| # | Severity | Finding | Evidence | Action |
|---|---|---|---|---|
| F-1 | **HIGH** | **No `config.toml` block for `lens-catalog-import`.** `grep "lens-catalog" supabase/config.toml` returns 0 matches. The config.toml deliberately declares `verify_jwt` explicitly for **24 other EFs** (e.g. `submit-lead` at line 480 has `verify_jwt = false` with a paragraph-long justification; `send-message` at line 437 has `verify_jwt = true` similarly justified). Comment at line 466 explicitly states: "*explicit verify_jwt = false to prevent CLI redeploy from defaulting verify_jwt incorrectly*". The Foreman confirmed live state is `verify_jwt=true` (FOREMAN_REVIEW §5 spot-check). But: any `supabase functions deploy lens-catalog-import` run via CLI without a config block could flip it to `false` (Supabase CLI default behavior has shifted across versions). Result: anyone with a valid Supabase anon JWT (which any storefront visitor has) could invoke the EF unauthenticated; the EF's gate at `index.ts:73` is `if (callerAuth)` — empty Authorization header **skips the gate entirely** and the EF proceeds to bulk-INSERT under SERVICE_ROLE_KEY. The runtime `verify_jwt=true` is the only thing stopping this; making it explicit in `config.toml` cements it. | `grep -n "lens-catalog" supabase/config.toml` returns 0; `index.ts:73 if (callerAuth)` skip path; config.toml:466–502 precedent | **HIGH** follow-up: add an explicit `[functions.lens-catalog-import]\nverify_jwt = true` block to `supabase/config.toml`. 3-line edit. Same urgency as the M4_QUICK_HYGIENE_FIXES Rec 7 work. |
| F-2 | MEDIUM | Tied to F-1 — at `index.ts:73–85` the gate is conditional on `callerAuth`: `if (callerAuth) { … is_platform_super_admin check … }`. If header is missing or empty string, the entire gate is bypassed. With `verify_jwt=true` runtime, Supabase rejects the request at the gateway before this code runs. But the code itself is fail-open by design — the inverse of every other gated mutator EF in the project (`submit-lead` line 32 onward is fail-closed). Should the runtime ever change, the EF instantly becomes a public catalog-mutator under service-role. | `index.ts:73` | fix in same SPEC: invert to `if (!callerAuth) return 403; { …check… if (!isAdmin) return 403; }` |
| F-3 | LOW | Input limits — `body.rows.length > 5000` rejects oversize batches (`index.ts:54`); `validate.ts:46–58` validates lens_type, refractive_index range (1.40–2.00), diameter range (50–90), sph range coherence. No null-byte / control-char filtering, but inputs all flow through Supabase JS client `.insert()` which parameterizes — no SQL injection surface. ✅ | `index.ts:54`, `validate.ts` | dismiss |
| F-4 | LOW | Error path — partial-batch behavior is "continue on error, accumulate into `result.errors[]`, return HTTP 207 if any errors". Reasonable. No transactional rollback across the batch (each row's brand/design/variant/offering is its own non-atomic chain of `.maybeSingle()` + `.insert()`). For idempotent reseed this is fine. For "all-or-nothing import" UX, would need a refactor. | `index.ts:289–295` | dismiss as documented behavior |
| F-5 | LOW | CORS — `Access-Control-Allow-Origin: '*'` (`index.ts:20`). Open. Inconsistent with `submit-lead` (Origin-allowlisted per `SUMMARY.md` §2 row §6.5). For a platform-admin-only mutator behind `verify_jwt=true`, the wildcard is acceptable but worth tightening to the ERP origin. | `index.ts:20` | LOW: tighten to `https://app.opticalis.co.il` only |
| F-6 | LOW | Secrets — `index.ts:60–62` reads `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` from `Deno.env`. ✅ Iron Rule 23 honored. | grep confirmed | dismiss |

### Axis G — Platform Catalog Admin screen

`lens-catalog-admin.html` (254 LOC) + 7 JS modules (40 / 70 / 74 / 96 / 125 / 81 / 184 LOC). All under Iron Rule 12. Hebrew RTL throughout.

| # | Severity | Finding | Evidence | Action |
|---|---|---|---|---|
| G-1 | MEDIUM | **Iron Rule 7 (API abstraction) violation** — every JS module calls `sb.from('lens_brand')…`, `sb.from('lens_design')…`, `sb.rpc('next_lens_variant_display_id')` directly. The page does not import `js/shared.js` and cannot use `DB.fetchAll`/`DB.batchCreate`. Conscious design choice for a "lean platform-only" screen but no documented exception. 14 occurrences of `sb.from(...)`. | `catalog-brands-col.js:16, 31`; `catalog-designs-col.js:32`; `catalog-variants-col.js:33, 35`; `catalog-detail-pane.js:10–12, 61, 70`; `catalog-import.js:75`; `lens-catalog-admin.js:71, 114, 160` | document the platform-admin exception in `docs/CONVENTIONS.md`, or wire the screen through shared helpers in Phase 1B |
| G-2 | LOW | Iron Rule 8 (sanitization) — every user-supplied string passes through `escapeHtml` (`lens-catalog-admin.js:179`) before `innerHTML`. ✅ Verified: `catalog-brands-col.js:54`, `catalog-designs-col.js:61`, `catalog-variants-col.js:66`, `catalog-detail-pane.js:34–45, 83–93`. | direct read | dismiss |
| G-3 | LOW | Auth gate — `catalog-auth.js:13–40` checks Supabase Auth session + `is_platform_super_admin()` RPC. Server-side check. ✅ Server-side gate also enforced via RLS on `lens_brand/design/variant` `owner_view` policies that require JWT tenant_id matching `owner_tenant_id` — and since these rows have `owner_tenant_id = NULL`, only `service_role` or future supplier-tenant can write. Anon write attempts return 0 rows. | direct read + axis B confirmation | dismiss |
| G-4 | LOW | UX — `window.prompt()` chains for "add brand/design/variant" (`catalog-brands-col.js:13`, `catalog-designs-col.js:21–31`, `catalog-variants-col.js:23–31`); `window.confirm()` for destructive publish-all (`catalog-detail-pane.js:8`). Documented Phase 1B replacement in EXECUTION_REPORT §5 D12. | direct read | follow Phase 1B plan |
| G-5 | LOW | `catalog-auth.js:6` — `SUPABASE_ANON` hardcoded. This is the publishable anon key (Supabase design: ships in browser bundle). Iron Rule 23 covers secrets, not anon keys. Consistent with other ERP pages. ✅ | direct read | dismiss |
| G-6 | LOW | `lens-catalog-admin.js:179` — local `escapeHtml` reimplementation rather than importing from `js/shared.js`. Iron Rule 21 (No Duplicates) candidate. Same justification as G-1 (lean platform-only). | duplicate of `js/shared.js` helper | fold into the G-1 follow-up |

### Axis H — Performance + index audit

`pg_indexes` enumeration confirms every of the 14 tenant-scoped Phase 1A tables has an index leading with `tenant_id` (e.g. `stock_movement_tenant_idx`, `stock_lot_tenant_idx`, `tenant_lens_stock_tenant_idx`, …). The 3 platform tables have `lens_*_owner_tenant_idx` partial-on-NOT-NULL. Hot FIFO query has dedicated composite: `stock_lot_fifo_idx (tenant_id, variant_id, location_id, received_at) WHERE qty_remaining > 0 AND is_deleted = false`. ✅

| # | Severity | Finding | Evidence | Action |
|---|---|---|---|---|
| H-1 | MEDIUM | **21 unindexed FK columns across Phase 1A tables** (advisor lint `0001_unindexed_foreign_keys`). The most critical for Phase 1B's projected load: `stock_movement.location_id`, `stock_movement.transfer_id`, `stock_transfer.variant_id`, `stock_transfer.from_location_id`, `stock_transfer.to_location_id`, `purchase_receipt_line.location_id`, `stock_lot.original_lot_id`, `stock_lot.purchase_receipt_id`, `stock_lot.supplier_offering_id`, `pending_lens_advancement_queue.stock_movement_id`, `pending_lens_advancement_queue.purchase_receipt_id`. Under Phase 1B's 60–100 stock_movement inserts/minute, ON-DELETE-RESTRICT checks on these FKs will sequential-scan the child tables — fine while child tables are small, painful within months. | live `pg_constraint` + `pg_index` cross-check returned 21 rows; advisor lint 0001 has same set | follow-up SPEC: add 21 indexes; LOW risk. Many are partial (`WHERE col IS NOT NULL`) so cost is bounded. |
| H-2 | LOW | Advisor `auth_rls_initplan` (0003) fires on 18 Phase 1A tables — RLS expression re-evaluates `current_setting()` per row. Fix is to wrap in `(SELECT …)` to make the planner evaluate once. Same advisor finding fires across the entire project (every JWT-claim policy is affected) — not Phase-1A-specific. | advisor finding | defer to project-wide RLS-perf SPEC |
| H-3 | LOW | Advisor `multiple_permissive_policies` (0006) on the 4 platform-pattern tables (`lens_brand`, `lens_design`, `lens_variant`, `vat_rates`) — `owner_view` + `public_view` both PERMISSIVE so Postgres ORs them per row. Intentional pattern (handoff §"RLS pattern"). Performance impact under read load is small (~5% per the lint docs). | advisor finding + policy enumeration above | dismiss as intentional |
| H-4 | LOW | Advisor `unused_index` (0005) flags 63 unused indexes across the 18 Phase 1A tables. Expected — tables are empty / near-empty in demo and prizma. Informational only. | advisor finding | dismiss |
| H-5 | LOW | `stock_movement` has no fillfactor override (defaults to 100). For an append-mostly event ledger, default is fine — no HOT-update path expected. | schema | dismiss |
| H-6 | LOW | Partitioning — none. At Phase 1B's projected 60–100/min × 60 min × 8 hr ≈ 30–50k inserts/day × ~365 = ~13M rows/year. Modern PG17 handles this single-partition without trouble for the next 2–3 years. No action needed pre-LIVE. | volume math | revisit at tenant 5+ |

### Axis I — Cross-repo + Iron-Rule sweep

| # | Severity | Finding | Evidence | Action |
|---|---|---|---|---|
| I-1 | LOW | Iron Rule 6 — `lens-catalog-admin.html` at repo root, listed in `scripts/checks/root-allowlist.json:42`. ✅ | direct read | dismiss |
| I-2 | LOW | Iron Rule 21 (No Duplicates) — 17 T-constants + 17 FIELD_MAP table blocks added per executor (M1A_DEBT_SWEEP commit `52088ed` also added `T.CURRENCIES` separately). `escapeHtml` reimplemented in `lens-catalog-admin.js:179` rather than imported from shared. See G-6. | code inspection | LOW follow-up — link to G-1 |
| I-3 | LOW | Iron Rule 23 (No Secrets) — `grep -rn "SUPABASE_SERVICE_ROLE_KEY" supabase/functions/lens-catalog-import/` returns only `index.ts:10` (comment) + `index.ts:61` (`Deno.env.get(...)`). No hardcoded service-role-key, no hardcoded JWT. The anon key in `catalog-auth.js:6` is publishable-by-design. ✅ | grep results | dismiss |
| I-4 | LOW | Iron Rule 31 (Integrity Gate) — `npm run verify:integrity` at HEAD returns exit 0 (113 files scanned in 9ms). All 12 Phase 1A commits passed the gate per EXECUTION_REPORT §2 criterion 19. | live run | dismiss |
| I-5 | LOW | Iron Rule 32 (Destructive Ops) — SPEC declared "None on existing tables/data" (`SPEC.md:171–181`). `git log --all --grep "\-\-no-verify"` returns 0 matches. Migration files contain no `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`. ROLLBACK.md correctly co-locates rollback DDL outside `.sql` files (per SECURITY_HOTFIX_2026_05_13 F1 lesson). ✅ | grep + ROLLBACK.md | dismiss |
| I-6 | LOW | TECH_DEBT cross-check — Foreman_review §10 said M1A-DEBT-01 + M1A-DEBT-02 would be opened. `grep "M1A-DEBT-0[12]" TECH_DEBT.md` returns 0 matches at HEAD because both were closed/folded by the M1A_DEBT_SWEEP SPEC (commits `52088ed`, `fdf3e2c`, `251cca1`). ✅ Lifecycle complete. | git log | dismiss |
| I-7 | LOW | `is_platform_super_admin()` (which the EF and the screen depend on) lacks `SET search_path = …` (`pg_proc.proconfig = null`, confirmed live). Pre-existing, not Phase 1A scope; covered by SECURITY_HOTFIX_2026_05_13 F5 / Finding 17 future-work bucket. | live query | defer to project-wide search_path SPEC |

---

## 2. Iron Rule scorecard

One row per rule applicable to Phase 1A.

| Rule | Compliance | Evidence | Notes |
|---|---|---|---|
| 1 — Atomic quantity RPC | ✅ | `record_stock_movement` SECURITY DEFINER with FOR UPDATE on stock_lot (C-5) | append-only ledger respected |
| 2 — writeLog | n/a | no quantity changes via JS yet; Phase 1B will wire | — |
| 3 — Soft delete | ✅ | every table has `is_deleted BOOLEAN NOT NULL DEFAULT false` + partial UNIQUE indexes excluding `is_deleted=true` | — |
| 4 — Barcodes BBDDDDD | n/a | not touched | — |
| 5 — FIELD_MAP | ✅ | EXECUTION_REPORT §2 #13; verified `js/shared-field-map.js` extended | — |
| 6 — index.html at root | ✅ | not moved; `lens-catalog-admin.html` allowlisted (I-1) | — |
| 7 — API abstraction | 🟡 | catalog admin screen uses `sb.from()` directly (G-1) | platform-only exception not documented |
| 8 — Sanitization | ✅ | `escapeHtml` everywhere (G-2); pin-auth untouched | — |
| 9 — No hardcoded business values | ✅ | currency_code default 'ILS' is a default not a constraint; vat_rates table-driven (Rule 19) | — |
| 10 — Global name collisions | ✅ | SPEC §1.5 documented; no collisions found | — |
| 11 — Atomic sequence RPCs | 🟡 | `next_lens_variant_display_seq` canonical; the 3 MAX-based generators (`next_lot_number`, `next_transfer_number`, `next_receipt_number`) rely on per-tenant `FOR UPDATE` of a different row — works only for internal callers (A-4) | hard requirement was met functionally; brittle |
| 12 — File size ≤ 350 | ✅ | max 299 (`index.ts`); max HTML 254 | — |
| 13 — Views-only for external reads | n/a | no storefront reads added; `v_suppliers_for_m9` is for internal M9 | — |
| 14 — tenant_id on every table | ✅ | 13 tables tenant_id NOT NULL; 4 platform tables `owner_tenant_id NULL` (documented exception); `lens_variant_display_seq` global singleton (documented exception with GLOBAL_SINGLETON_EXEMPT) | — |
| 15 — RLS canonical pattern | ✅ | every USING uses JWT-claim form (axis B); no `auth.uid()`; service_bypass + tenant_isolation throughout | — |
| 16 — Contracts between modules | ✅ | K3 trigger + K5 view explicit contracts to M9; documented | — |
| 17 — Views for external access | n/a | future-scope | — |
| 18 — UNIQUE includes tenant_id | ✅ | every UNIQUE on tenant-scoped table includes tenant_id (verified: `stock_lot_number_unique`, `stock_transfer_number_unique`, `purchase_receipt_number_unique`, `supplier_brand_distribution_active_unique`, `supplier_catalog_offering_active_unique`, `tenant_active_offerings_unique`, `tenant_lens_stock_unique`, `tenant_location_name_unique`, `supplier_permissions_active_unique`) | M1A-DEBT-02 closed 4 violations |
| 19 — Configurable values = tables | ✅ | `vat_rates`, `currencies`, `production_type` CHECK enum kept narrow | currencies-empty discussed M1A-SPEC-05 |
| 20 — SaaS litmus test | 🟡 | currencies-empty (M1A-SPEC-05) is the only remaining gap; otherwise tenant-2 onboard works | TECH_DEBT folded into M1A_DEBT_SWEEP |
| 21 — No Orphans, No Duplicates | 🟡 | `escapeHtml` reimplemented (G-6); divergence `purchase_receipt` vs legacy `goods_receipts` justified in SPEC §1.5 | platform-screen helpers duplicate shared.js — minor |
| 22 — Defense-in-depth on writes | ✅ | every RPC checks JWT tenant_id first; EF passes `tenant_id` on every offering insert; screen passes `owner_tenant_id: null` on every catalog insert | C-4 |
| 23 — No secrets in code | ✅ | I-3 — only env-reads | — |
| 31 — Integrity Gate | ✅ | I-4 — all 12 commits clean | — |
| 32 — Destructive Ops Gate | ✅ | I-5 — declared None, honored None | ROLLBACK.md externalized correctly |

**Phase 1A non-applicable rules:** 2, 4, 13, 17, 24–30 (cross-repo storefront-scoped).

---

## 3. Supabase Advisor results (filtered to Phase 1A objects)

Out of two full advisor runs (security 151,330 chars, performance 387,232 chars), the Phase-1A-scoped findings:

| Lint | Level | Phase 1A objects affected | Action |
|---|---|---|---|
| `0028_anon_security_definer_function_executable` | WARN | 10 functions (all 9 RPCs + trigger fn) | **C-1 + C-2 + C-3** — open a single hardening SPEC: `REVOKE EXECUTE … FROM PUBLIC, anon, authenticated` for all 10, then selectively `GRANT EXECUTE TO authenticated` on the 8 user-callable RPCs |
| `0029_authenticated_security_definer_function_executable` | WARN | same 10 functions | folded into C-1 |
| `0003_auth_rls_initplan` | WARN | 18 of 19 Phase 1A tables | H-2 — defer to project-wide RLS-perf SPEC (every existing JWT-claim policy in the project is similarly affected) |
| `0006_multiple_permissive_policies` | WARN | 4 platform tables (`lens_brand`, `lens_design`, `lens_variant`, `vat_rates`) | H-3 — dismiss; intentional 2-PERMISSIVE-policy platform pattern |
| `0001_unindexed_foreign_keys` | INFO | 21 FK columns on 11 Phase 1A tables | H-1 — open as part of the Phase 1B prep SPEC (add 21 indexes) |
| `0005_unused_index` | INFO | 63 indexes across 18 tables | H-4 — dismiss; expected on near-empty tables |

**Classification — all advisor findings on Phase 1A objects:**
- **Phase-1A-introduced (must fix):** 0028 + 0029 (10 functions × 2 lints) — the `REVOKE` discipline was the explicit precedent set 36 hours earlier; this is hygiene regression
- **Phase-1A-introduced (worth fixing pre-1B):** 0001 (21 FK indexes)
- **Pre-existing project-wide pattern (defer):** 0003, 0006
- **Informational only (defer):** 0005

**No HIGH/ERROR-level security or performance lints introduced.** All affected lints are WARN or INFO.

---

## 4. Top 5 production-risk findings (the Foreman missed)

1. **C-1 — All 10 SECURITY DEFINER functions are `EXECUTE`-able by `anon`/`authenticated`/`PUBLIC`.** Project precedent set 36 hours earlier (SECURITY_HOTFIX_2026_05_13 §6.4) was not inherited. Advisor 0028/0029 fires. *Mitigation:* `REVOKE EXECUTE FROM PUBLIC, anon, authenticated; GRANT EXECUTE TO authenticated` on the 8 user-callable RPCs. Single migration.

2. **C-2 — `next_lens_variant_display_id()` is the one truly anon-mutator-callable function.** No tenant guard, no rate limit; each anon call increments the global sequence. *Mitigation:* fold into the C-1 SPEC; add a JWT-not-null guard in the function body as belt-and-suspenders.

3. **F-1 — `lens-catalog-import` has NO `config.toml` block.** A future CLI redeploy could flip `verify_jwt` to false; the EF's gate at `index.ts:73` is fail-open on empty `Authorization` header. Today the runtime is `verify_jwt=true` (verified live), so the risk is latent. *Mitigation:* 3-line config.toml addition (mirror `submit-lead`'s block). Same lesson as M4_QUICK_HYGIENE_FIXES Rec 7.

4. **D-3 — K3 queue (`pending_lens_advancement_queue`) lacks an idempotency key.** Transaction retries on `stock_movement` insert would double-enqueue. M9's correctness depends on this. *Mitigation:* `CREATE UNIQUE INDEX … ON pending_lens_advancement_queue(stock_movement_id);` + change trigger INSERT to `ON CONFLICT DO NOTHING`. 2 statements.

5. **H-1 — 21 unindexed FK columns** flagged by advisor 0001 across 11 Phase 1A tables; the highest-impact ones for Phase 1B's projected 60–100 stock_movements/minute are `stock_movement.location_id`, `stock_movement.transfer_id`, `stock_transfer.variant_id`, `purchase_receipt_line.location_id`, `pending_lens_advancement_queue.stock_movement_id`. *Mitigation:* add 21 partial indexes — most can use `WHERE col IS NOT NULL` for storage compactness.

---

## 5. Phase 1B technical readiness gate

**YES — Phase 1B can start safely under the current state, provided three follow-ups land in parallel (no rollback needed):**

(a) **C-1 / C-2 / C-3 / E-2 hardening SPEC** — `REVOKE EXECUTE` on 10 functions + over-broad grants on `v_suppliers_for_m9`. Single migration, ~15 SQL statements. Must land before Phase 1B exposes RPCs through the 6 customer-facing screens (otherwise the public attack surface grows with each new caller).

(b) **F-1 config-toml block** — 3-line addition for `lens-catalog-import`. Trivial. Should land in the same hardening SPEC.

(c) **D-3 + H-1 readiness SPEC** — UNIQUE index on `pending_lens_advancement_queue(stock_movement_id)` + 21 FK indexes. Pure additive. Can land in parallel with Phase 1B's first commits.

**Cross-tenant isolation is solid** — every tenant-scoped table has canonical JWT-claim RLS; no `auth.uid()` mistakes; cross-tenant inspection test (axis B-3) confirms zero leak paths. **The atomic-RPC pattern is correctly built** for `record_stock_movement` (FOR UPDATE on lot before FIFO compute). **The trigger does not leak tenant_id.** **The EF gate is real** (server-side `is_platform_super_admin` RPC). These are the load-bearing security properties — they are intact.

---

## 6. Pre-Phase-1B questions for Daniel (code/security only)

1. **C-1: open a hardening SPEC now or batch into Phase 1B opening commits?** *Recommendation:* open now as a 30-minute SPEC (`M1A_RPC_GRANTS_HARDENING`). Reasoning: bundling into Phase 1B grows the blast radius of Phase 1B's first failed deployment; the hardening is single-purpose and reviewable in one sitting.

2. **F-1: declare `lens-catalog-import` `verify_jwt=true` in `config.toml` *and* invert the gate at `index.ts:73` to fail-closed?** *Recommendation:* both. Belt-and-suspenders matches the project's lesson from M4_QUICK_HYGIENE_FIXES Rec 7. Five-line change total.

3. **D-3: add `UNIQUE(stock_movement_id)` on `pending_lens_advancement_queue` now, before M9 starts consuming?** *Recommendation:* yes, now. Adding it after the queue has real data risks a constraint-violation backlog. Single statement, zero risk while the queue is empty.

4. **H-1: fold the 21 FK indexes into the same hardening SPEC, or into the Phase 1B opening migration?** *Recommendation:* fold into a single `M1A_FK_INDEXES_PREP_FOR_1B` SPEC (pure additive, no destructive ops). Run before the first Phase 1B SPEC that does heavy writes. The advisor INFO will continue to flag until indexes exist; the storage cost is bounded by partial-on-NOT-NULL.

5. **B-4 / E-2: open a separate project-wide SaaS-hardening SPEC for `FOR ALL TO public` → `FOR SELECT TO public + FOR INSERT/UPDATE/DELETE TO service_role`?** *Recommendation:* defer to a project-wide SPEC (not Phase-1A-specific; same shape applies to `inventory`, `goods_receipts`, every other tenant table). The append-only event ledger (`stock_movement`) is the highest-priority target inside Phase 1A scope; everything else can wait. Daniel call.

---

*End of CODE_REVIEW_REPORT.md. Read-only audit complete; no repo file modified except this report. 22 findings across 9 axes; 1 CRITICAL, 4 HIGH/MEDIUM-priority, 17 LOW. Verdict 🟡 driven by C-1/C-2/F-1 hygiene regressions vs the SECURITY_HOTFIX_2026_05_13 baseline — not by data leaks. Phase 1B technically unblocked.*
