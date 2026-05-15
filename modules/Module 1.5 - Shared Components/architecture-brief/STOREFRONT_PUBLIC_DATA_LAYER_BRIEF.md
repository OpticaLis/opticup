# STOREFRONT_PUBLIC_DATA_LAYER — Architecture Brief

**Type:** Foundational architectural SPEC. **Replaces SECURITY_HOTFIX_4.**
**Author:** Architect (Daniel + opticup-architect)
**Date sealed:** 2026-05-15
**Module home:** Module 1.5 — Shared Components (cross-module foundation)
**Predecessor:** `SECURITY_HOTFIX_4_BRIEF.md` (stub) — RETIRED; this Brief supersedes it.

---

## 1. Why this exists

SECURITY_HOTFIX_3 (closed 2026-05-15) left 8 `v_storefront_*` views unresolved because closing them via the "extend RLS on 5 base tables + GRANT anon" approach (Option A) created a long-term maintenance burden: every future column added to `inventory`/`brands`/`media_library`/`tenant_branches`/`storefront_config` would require a discipline check — "did we accidentally expose this column to anon?". That is culture, not infrastructure (per Pattern P31).

Daniel's directive (2026-05-15):

> "אני רוצה שזה יהיה בנוי בצורה המקצועית ביותר בלי פלסטרים ויהיה אפשר לשפר את התוכנה תמיד בלי צורך לחזור אחורה ולתקן דברים."

The strategic choice is **Option C — a dedicated public-data layer**: structurally-separate mirror tables (or equivalent SECURITY DEFINER projection) sit between the private source-of-truth tables and the public consumers (storefront, future supplier portal, future customer portal, future API, future mobile app). Anon never reads from `inventory`, `brands`, `media_library`, `tenant_branches`, or `storefront_config` directly. The boundary is **mechanical, not procedural**.

## 2. Strategic context — Tenant tiers

The public-data layer must support **two tenant tiers** (locked by Daniel 2026-05-15):

- **Standard tier (majority of future tenants):** A shared storefront on a single platform domain that exposes each tenant's catalog via slug or subdomain. May extend to commerce later.
- **Premium tier (Prizma today, future paid upgrades):** A dedicated storefront on a custom domain (e.g., `prizma-optic.co.il`), bespoke UI, but the same underlying public-data layer.

Both tiers consume the same public-data layer. The layer is **consumer-agnostic** — it does not know whether the caller is a custom-domain premium site, a shared-domain standard site, an API client, or a mobile app. RLS by `tenant_id` ensures each consumer sees only its own tenant's published data.

This means: **the layer designed for Prizma's premium site today is the same layer that powers the Standard-tier shared site when it ships.** Zero refactor at that point.

## 3. Scope — In

### 3.1 Five public-projection entities (the "showcase windows")

For each of these private base tables, build a dedicated public-projection that anon can read:

| # | Private source | Public projection (working name) | Columns to project (anon-visible) | Filter (anon-visible rows only) |
|---|----------------|----------------------------------|-----------------------------------|----------------------------------|
| 1 | `inventory` | `inventory_public` (mirror table OR projection-view, decision in §6) | barcode, brand_id, model, color, size, quantity, product_type, website_sync, display_mode_override, computed display fields (only those `v_storefront_products` currently projects) | `is_deleted=false AND COALESCE(website_sync,'full') <> 'none' AND barcode IS NOT NULL AND (display_mode_override IS NULL OR display_mode_override <> 'hidden')` |
| 2 | `brands` | `brands_public` | id, name_he, name_en, slug, logo_path, active, sort_order, exclude_website | `active=true AND COALESCE(exclude_website,false)=false` |
| 3 | `media_library` | `media_public` | id, asset_path, asset_type, brand_id, alt_text_he, alt_text_en, sort_order | `is_deleted=false` |
| 4 | `tenant_branches` | `branches_public` | id, name_he, name_en, address, phone_public, lat, lng, hours_json, status | `status='published' AND is_deleted=false` |
| 5 | `storefront_config` | `storefront_config_public` | per-tenant settings keys needed by storefront (whitelist by config key, not full row) | `enabled=true` |

**Strictly excluded from any public projection:** `cost_price`, `last_purchase_at`, `supplier_id`, `internal_notes`, `created_by`, `updated_by`, `tenant_id` (filtered by RLS — not projected), any sensitive financial or operational field. The public-projection's column list is **explicit allow-list**, never `SELECT *`.

### 3.2 Rewrite 8 deferred `v_storefront_*` views to read from the public-projection layer

- `v_storefront_branches`
- `v_storefront_brand_page`
- `v_storefront_brands`
- `v_storefront_products`
- `v_storefront_categories`
- `v_storefront_config`
- `v_storefront_media`
- `v_public_tenant`

After rewrite: each view's `FROM` clause references the public-projection layer, never the private base tables. Each view keeps `security_invoker=on` (matches HOTFIX_2/3 pattern). RLS on the public-projection tables enforces tenant isolation; the views inherit it.

### 3.3 Strip anon access from the 5 private base tables

After §3.1 + §3.2 complete and verified:
- `REVOKE SELECT ON {inventory, brands, media_library, tenant_branches, storefront_config} FROM anon`
- Keep existing JWT-tenant-claim RLS on private tables intact (ERP and authenticated callers continue to use them).

### 3.4 Side-finding from HOTFIX_3

`v_crm_lead_first_touch` has `anon_has_select=true` AND is admin-purpose. Add `REVOKE SELECT FROM anon` here too — it does not belong to the public-data layer at all.

### 3.5 Documentation deliverables

- `docs/PUBLIC_DATA_LAYER.md` — canonical reference: what the layer is, what's in it, how to add a new public-projection in the future. This becomes the contract for every future consumer (Standard tier, Supplier Portal, etc.).
- Update `docs/GLOBAL_MAP.md` Views section to list the 8 rewritten views with their new `FROM` source.
- Update `docs/GLOBAL_SCHEMA.sql` with the 5 new public-projection tables/views.
- Update `MASTER_ROADMAP.md` §2.5 — note that the public-data layer foundation is in place; future modules (M11 Supplier Portal, etc.) consume it rather than building their own.

## 4. Scope — Out (deferred or non-goals)

- **No changes to storefront frontend code** — the storefront calls the same 8 `v_storefront_*` views. The view contract (column names, semantics) is preserved.
- **No commerce/checkout work** — purely data-exposure layer.
- **No new tenant onboarding** — Prizma + demo only; Standard-tier onboarding is a future SPEC that consumes this layer.
- **No CRM, M4, M5 work** — `v_crm_lead_first_touch` REVOKE is a one-liner cleanup, not a CRM module change.
- **No `cost_price` or financial column changes** — those stay private forever.

## 5. Critical design constraints

### 5.1 SaaS multi-tenant invariant
Every public-projection table has `tenant_id UUID NOT NULL` + RLS policy. Two policies per table (per Iron Rule 15 canonical pattern):
1. `service_bypass` for service_role (trusted).
2. `tenant_isolation` for public, using the JWT-claim USING clause:
   ```sql
   tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid
   ```
3. Plus a third anon-read policy (the whole point of this layer):
   ```sql
   FOR SELECT TO anon USING (tenant_id = current_setting('request.jwt.claims', true)::json ->> 'tenant_id'::uuid)
   ```
   (or equivalent — design decision per §6).

### 5.2 Zero downtime for Prizma storefront
The 8 views' contract (column names, return semantics, row counts) must be preserved through the migration. Per-view rollback tag + anon probe + storefront-page smoke (HTTP 200 + non-empty body) on Prizma after every view rewrite.

### 5.3 Backfill correctness
Wherever a mirror-table approach is chosen (§6), the initial backfill must match `SELECT count(*) FROM private_base WHERE <public-filter>` exactly. Drift = abort.

### 5.4 Trigger sync (if mirror-table approach chosen)
- INSERT/UPDATE/DELETE on private base → trigger updates public mirror.
- Trigger must be `SECURITY DEFINER` with `SET search_path = public, pg_temp`.
- Trigger must be idempotent and tenant-scoped.
- Trigger failures must not silently break ERP writes — failures log to `platform_audit_log` but allow the source write to proceed.

### 5.5 No business-logic in the public-projection layer
The layer is **data shape + visibility filter only**. No discounting logic, no inventory reservation logic, no pricing rules. Those live in the consuming code (Edge Functions, views downstream).

### 5.6 SaaS litmus test (Iron Rule 20)
A second optical chain joins tomorrow with zero code changes — must work. Test: a new tenant's row appearing in `brands` with `active=true` should appear in `brands_public` for that tenant's storefront calls, within trigger latency (sub-second), with no manual intervention.

## 6. Decision required from Executor pre-flight — mirror table vs SECURITY DEFINER projection

The Architect (this Brief) does NOT pre-decide between two implementation patterns. The Foreman (`opticup-strategic`) must evaluate both during SPEC authoring and propose ONE in the SPEC, with reasoning. Both are valid; the choice affects implementation complexity, latency, and storage cost — not the architecture's correctness.

**Pattern A — Mirror tables with trigger sync:**
- `inventory_public`, `brands_public`, etc. are **physical tables**.
- Triggers on private base keep them in sync.
- Anon SELECTs hit the mirror directly (fast).
- Storage cost: ~2× for the projected columns.
- Eventual consistency: sub-second.
- Pro: anon never touches private tables at all. Hardest possible separation.
- Con: sync logic must be perfect. Two sources of truth in transit during writes.

**Pattern B — SECURITY DEFINER projection views with dedicated owner role:**
- `inventory_public`, `brands_public`, etc. are **views with `security_definer`** owned by a role like `storefront_reader_role`.
- The role has SELECT on private base tables.
- Anon has SELECT only on the projection views.
- Storage cost: zero.
- Always-consistent (real-time projection).
- Pro: single source of truth.
- Con: Supabase advisor flags `security_definer` views (we'd allowlist them with explicit rationale).

**The Foreman's SPEC must include in §6:**
1. Recommendation (A or B) with reasoning specific to Optic Up's scale + constraints.
2. Migration order (which table first; `inventory` LAST as highest-risk regardless of pattern).
3. Per-table rollback strategy.

**Architect's lean (not binding):** Pattern A (mirror tables) — because Daniel's directive was "no plasters, build it right" and mirror tables give the hardest mechanical separation. The advisor noise from Pattern B works against the "no findings, professional build" goal. But the Foreman runs pre-flight queries and may reach a different conclusion — if so, document it.

## 7. Migration order (mandatory)

Regardless of pattern A/B:

1. **`tenant_branches`** first (smallest blast radius — few columns, simple shape).
2. **`storefront_config`** (config-only, low traffic).
3. **`media_library`** (mostly-static asset metadata).
4. **`brands`** (medium complexity — referenced by inventory).
5. **`inventory`** LAST (highest risk; largest table; most sensitive columns to NOT expose).

Per-table:
- Pre-tag the repo + the DB state.
- Apply the migration (table or view + sync).
- Anon probe: row counts match expectation.
- Storefront page smoke (the consuming pages return HTTP 200 + non-empty).
- Only then proceed to the next table.

After all 5 are migrated:
- Rewrite the 8 `v_storefront_*` views to source from the public-projection layer.
- Per-view probe + storefront smoke.
- Once all 8 are green: REVOKE anon from the 5 private base tables.

## 8. Verification gates

| # | Gate | How verified |
|---|------|--------------|
| 1 | All 5 public-projection entities exist + are tenant-scoped + have anon-read RLS | `pg_policies` query + `pg_class.relacl` |
| 2 | All 8 `v_storefront_*` views source from public-projection, not private base | `pg_views.definition` regex scan |
| 3 | Anon row counts on each public-projection match expected filtered counts on private base | SQL per table |
| 4 | All 7 storefront pages return HTTP 200 + non-empty body on Prizma + demo | curl probes |
| 5 | Smoke 7/7 PASS pre + post | `npm run test:smoke` |
| 6 | Anon has ZERO SELECT on private base tables after §3.3 | `pg_class.relacl` |
| 7 | Supabase advisor: F-CRIT-2 = 0 (down from 8) | `mcp__supabase__get_advisors` |
| 8 | Zero tenant data row writes (only structural changes + backfill) | git diff on data tables = 0 |
| 9 | Iron Rule 14, 15, 18, 31, 32 gates exit 0 | `npm run verify:integrity` |
| 10 | Mirror-table backfill (if pattern A) matches source counts exactly | per-table count comparison |
| 11 | Trigger sync (if pattern A) verified for INSERT + UPDATE + DELETE on demo | E2E test per table |
| 12 | `docs/PUBLIC_DATA_LAYER.md` exists, documents the contract | file presence + content review |

## 9. Destructive operations (Iron Rule 32 declaration)

Per Iron Rule 32 — every destructive operation declared upfront:

1. **CREATE TABLE × 5** (`inventory_public`, `brands_public`, `media_public`, `branches_public`, `storefront_config_public`) — additive. (If Pattern B: CREATE VIEW × 5 instead.)
2. **CREATE TRIGGER × 5** on each private base table (Pattern A only) — additive.
3. **CREATE POLICY × 15** (3 per public-projection: service_bypass + tenant_isolation + anon_public_read) — additive.
4. **GRANT SELECT TO anon × 5** on the public-projection layer — additive.
5. **CREATE OR REPLACE VIEW × 8** for the rewritten `v_storefront_*` views — additive (replaces definition, keeps name).
6. **REVOKE SELECT FROM anon × 5** on private base tables (`inventory`, `brands`, `media_library`, `tenant_branches`, `storefront_config`) — DECLARED destructive (reverses via re-GRANT, but is a behavior change).
7. **REVOKE SELECT FROM anon × 1** on `v_crm_lead_first_touch` — DECLARED destructive (reverses via re-GRANT).
8. **CREATE ROLE × 1** if Pattern B is chosen (`storefront_reader_role`) — additive.
9. **Initial backfill INSERT × 5** (Pattern A only) — into the new public-projection tables; not a mutation on existing tables.

**No DROP TABLE, no DROP COLUMN, no DELETE on tenant data, no main-branch operations.**

## 10. Foundation-first vs deferred (Pattern P17)

**Day-1 skeleton (this SPEC ships):**
- 5 public-projection entities + RLS + anon GRANT.
- 8 views rewritten to source from layer.
- REVOKE anon from private bases.
- Documentation contract published.

**Documented for later (not in this SPEC):**
- **Standard-tier shared storefront consumption** — when M3.Standard ships, it consumes this layer. No layer changes needed.
- **Supplier Portal consumption (M11)** — M11 will likely need a parallel `supplier_*_public` projection for its supplier-facing data. Same pattern, different consumer.
- **Customer Portal consumption (future)** — same pattern.
- **API tier consumption (future)** — same pattern.
- **Multi-region / read-replica optimization** — out of scope; would be a separate SPEC if scale demands it.
- **Materialized-view caching of common queries** — out of scope; only if storefront p95 latency degrades.
- **Audit-log of public-data-layer reads** — out of scope; can be added without changing the layer's shape.

## 11. Pre-flight requirements (mandatory for Foreman)

Before writing SPEC.md, the Foreman MUST execute and document:

1. **Inventory `v_storefront_products`'s current projected columns** — exact SELECT list. This is the column allow-list for `inventory_public`.
2. **Inventory `v_storefront_brands`, `v_storefront_branches`, `v_storefront_categories`, `v_storefront_config`, `v_storefront_media`, `v_storefront_brand_page`, `v_public_tenant` projected columns** — exact SELECT list per view. Cross-reference to verify each only needs columns that the proposed public-projection exposes.
3. **Current RLS policies on `inventory`, `brands`, `media_library`, `tenant_branches`, `storefront_config`** — `pg_policies` query. Confirm JWT-only state.
4. **Current `pg_class.relacl` on the 5 private base tables** — confirm anon has SELECT today (the thing we're removing).
5. **Storefront page → view dependency map** — which of the 7 storefront pages consume which of the 8 views. Needed for per-view smoke ordering.
6. **Latency baseline** — measure current anon SELECT latency on each of the 8 `v_storefront_*` views (demo + Prizma). Post-migration latency must not exceed +20% (otherwise STOP).
7. **Pattern A vs B decision** with reasoning, per §6.

Pre-flight output goes into the SPEC.md as §1.5 ("Pre-flight findings").

## 12. Backups

Mandatory per Working Rule 9 (>5 files, >100 lines, renames, schema changes):

```
modules/Module 1.5 - Shared Components/backups/2026-MM-DD_STOREFRONT_PUBLIC_DATA_LAYER/
  CLAUDE.md
  modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md (if exists)
  modules/Module 1.5 - Shared Components/docs/MODULE_SPEC.md (if exists)
  modules/Module 1.5 - Shared Components/docs/db-schema.sql (if exists)
  docs/GLOBAL_SCHEMA.sql
  docs/GLOBAL_MAP.md
```

Plus per-table DB snapshot tags (`pre-public-data-layer-{table_name}`) before each of the 5 migrations.

## 13. Bounded autonomy — STOP triggers

The Pipeline runs end-to-end in ONE Claude Code chat. STOP immediately on any of:

- Storefront page returns non-200 on Prizma OR demo after any view rewrite.
- Anon row count on a public-projection differs from expected filtered count on its private base by more than 0 rows.
- Trigger sync (Pattern A) misses a write OR double-applies a write in any of the 5 E2E tests.
- Latency on any of the 8 views exceeds +20% post-migration.
- ANY tenant data row write detected.
- ANY new finding from `mcp__supabase__get_advisors` beyond the 8 F-CRIT-2 closures.
- Pattern A backfill count mismatch.
- Inventory column-projection list disagrees with what `v_storefront_products` actually needs.
- Iron Rule 14, 15, 18, 31, 32 gate exits non-zero.

On STOP: write escalation file `modules/Module 1.5 - Shared Components/escalations/{ISO_TS}_STOREFRONT_PUBLIC_DATA_LAYER.md`, emit ONE Hebrew line to Daniel via the Architect, halt pipeline. Roll back the most recent destructive op via the pre-tag.

## 14. Estimated effort

**2-3 working days for a focused Full-Auto Pipeline session.** Heavier than HOTFIX_4 would have been (4-6 hours). The premium is the foundation: this SPEC sets the public-data-layer contract that every future consumer inherits without modification.

## 15. Deliverables at close

1. 5 public-projection entities live in DB (demo + Prizma, both clean).
2. 8 `v_storefront_*` views rewritten and sourced from the layer.
3. 5 private base tables: anon SELECT revoked.
4. `v_crm_lead_first_touch`: anon SELECT revoked.
5. Supabase advisor F-CRIT-2 = 0.
6. `docs/PUBLIC_DATA_LAYER.md` published.
7. `docs/GLOBAL_MAP.md`, `docs/GLOBAL_SCHEMA.sql`, `MASTER_ROADMAP.md` updated.
8. `EXECUTION_REPORT.md`, `FINDINGS.md`, `FOREMAN_REVIEW.md`, `REVIEW.md`, `TEST_REPORT.md` written into `modules/Module 1.5 - Shared Components/docs/specs/STOREFRONT_PUBLIC_DATA_LAYER_2026_MM_DD/`.
9. Skill harvest applied (2 author + 2 executor improvements minimum).
10. Repo clean at close + merge-to-main PR URL provided to Daniel.

## 16. Notes for the Foreman (`opticup-strategic`)

- This Brief is sealed. The Foreman writes SPEC.md with the §1.5 pre-flight, fills in §6 Pattern decision, and proposes the per-table migration sequence with rollback tags. Do not narrow scope or skip the documentation deliverables in §3.5.
- The 8 views' contract (column names + return semantics) is **inviolable**. The storefront frontend cannot break.
- Pattern P31 applies — if any Iron Rule needs strengthening based on this SPEC's learnings, propose a 3-layer enforcement follow-up in FOREMAN_REVIEW.
- This is a foundation SPEC. Treat it accordingly — extra time on pre-flight is well-spent.

---

**End of Brief.**

*Authored 2026-05-15 by opticup-architect during Architect session. Replaces SECURITY_HOTFIX_4 stub. Ready for Foreman SPEC authoring + Full-Auto Pipeline dispatch.*
