# SECURITY_HOTFIX_4 — Architecture Brief (stub)

**Type:** Production security hotfix. Sequel to SECURITY_HOTFIX_3 (closed 2026-05-15 🟡 with Option B partial closure). Closes the residual F-CRIT-2 gap: the 8 deferred storefront views + their 5 additional base-table RLS expansions that SECURITY_HOTFIX_3 scoped out per Daniel's Option B decision.

**Why this exists:** SECURITY_HOTFIX_3 pre-flight surfaced that the 15 F-CRIT-2 deferred views fan out to **11 distinct base tables**, not 3 as the original Brief assumed. Daniel approved **Option B (scope-out unsafe views, ship a smaller hotfix)** — HOTFIX_3 closed 2 storefront + 5 admin = 7 views. HOTFIX_4 closes the remaining 8 storefront views by first expanding RLS + GRANT on the 5 base tables those views read from.

**Stub status:** Authored 2026-05-15 by opticup-strategic (Foreman) during HOTFIX_3 closeout. Architect picks up next session for full Brief authoring.

---

## 1. Scope (preview)

### §1.1 — Base-table RLS expansion on 5 additional tables

For each of `brands`, `inventory`, `media_library`, `tenant_branches`, `storefront_config`:
1. Audit existing RLS policies (currently all JWT-tenant-claim-only).
2. Add a NEW RLS policy `<table>_public_read_storefront` for anon role, with per-table filter matching the existing storefront view filter:
   - `brands`: `USING (active = true AND exclude_website IS NOT TRUE)`
   - `inventory`: `USING (is_deleted = false AND COALESCE(website_sync, 'full') <> 'none' AND barcode IS NOT NULL AND (display_mode_override IS NULL OR display_mode_override <> 'hidden'))` — most invasive; needs explicit Architect review
   - `media_library`: `USING (is_deleted = false)`
   - `tenant_branches`: `USING (status = 'published' AND is_deleted = false)`
   - `storefront_config`: `USING (enabled = true)`
3. `GRANT SELECT TO anon ON <table>` (column-level restricted to view-projected columns where possible).

### §1.2 — Apply `security_invoker=on` to 8 remaining views

- `v_storefront_branches`
- `v_storefront_brand_page`
- `v_storefront_brands`
- `v_storefront_products`
- `v_storefront_categories` (depends on `v_storefront_products`)
- `v_storefront_config`
- `v_storefront_media`
- `v_public_tenant`

Per-view rollback tag + anon probe — same protocol as HOTFIX_3 §1.2.

### §1.3 — (none — admin lockdowns all completed in HOTFIX_3)

### §1.4 — (none — `save_translation_memory_batch` both overloads hardened in HOTFIX_2 + HOTFIX_3)

### §1.5 — Side-finding from HOTFIX_3 pre-flight

`v_crm_lead_first_touch` has `anon_has_select=true` AND `security_invoker=true` AND is admin-purpose. Not in the F-CRIT-2 advisor list (`security_invoker=true` was already set), so not strictly closing an advisor finding — but a real security concern. Add `REVOKE SELECT FROM anon` to align with the admin-cohort pattern.

---

## 2. Critical Design Constraints

**Tenant scope:** ALL changes are structural (RLS policies, grants, view metadata). ZERO data row writes on any tenant.

**Backward compatibility — storefront uptime is sacrosanct:**
- The 5 base-table RLS expansions are LIKELY safe because they mirror the existing view-level filters. But `inventory` is Prizma's most sensitive table — exposing `barcode`, `model`, `color`, `quantity` to anon SELECT globally with only "in-stock-and-active" filter is itself an architectural decision. Architect must confirm during Brief authoring whether this is acceptable as-is OR requires column-level GRANT restriction.
- Per-view rollback tag + anon probe per HOTFIX_3 §1.2 protocol — mandatory.

**Inventory exposure question:** Should `inventory` GRANT SELECT TO anon be column-restricted? Today v_storefront_products projects: `id`, `tenant_id`, `barcode`, `model`, `color`, `size`, `quantity`, `product_type`, `website_sync`, `display_mode_override` + a few computed columns + AI content subqueries. The most sensitive columns to NOT expose: `cost_price`, `last_purchase_at`, `created_by`, `supplier_id`, internal status fields. Architect must inventory this before Brief sealing.

---

## 3. Method (high-level for next-session Foreman)

1. **Pre-flight queries (mandatory) per base table** — exact column inventory + which columns the existing view projects (intersection = the safe GRANT column list).
2. **STOP gates:**
   - If any base table's existing RLS USING expression captures behavior that the new anon-friendly policy cannot match → STOP, redesign.
   - If column-level GRANT is infeasible (e.g. PostgreSQL doesn't support column-level SELECT for views) → escalate, decide row-level GRANT with explicit Architect blessing.
3. **Apply migrations in order:**
   - §1.1 base-table RLS for 5 tables (smaller blast radius first: `tenant_branches`, `media_library`, `storefront_config`, `brands`, then `inventory` LAST as highest-risk).
   - §1.2 view flips per-view with rollback tag + anon probe.
4. **Per-view post-migration probe** — query view as anon role + compare to pre-migration count.
5. **Cross-storefront probe** — curl-probe each of the 7 storefront pages that consume migrated views: homepage, brand list, brand page, product list, category list, branch list, single-product page.

---

## 4. Destructive Operations (Iron Rule 32 — preview)

1. **CREATE POLICY × 5** on the 5 base tables (additive).
2. **GRANT SELECT TO anon × 5** (additive).
3. **ALTER VIEW SET (security_invoker=on) × 8** (metadata, additive).
4. **REVOKE SELECT FROM anon × 1** on `v_crm_lead_first_touch` (DECLARED destructive — reverses via re-GRANT).

**No DROP, no DELETE, no schema removal, no main deploys.**

---

## 5. Success Criteria (preview)

| # | Criterion |
|---|-----------|
| 1 | 5 new base-table RLS policies + 5 anon GRANTs verified via `pg_policies` + `pg_class.relacl` |
| 2 | 8 deferred views: ALL have `security_invoker=on` post-migration |
| 3 | Per-view anon probe: row count matches pre-migration |
| 4 | `v_crm_lead_first_touch` anon=false |
| 5 | All 7 storefront pages: HTTP 200 + non-empty body |
| 6 | No tenant data row write on any tenant |
| 7 | Smoke 7/7 PASS pre + post |
| 8 | Supabase advisor: F-CRIT-2 8 → 0 |
| 9 | Repo clean at close |
| 10 | Iron Rule 31 + 32 gates exit 0 |

---

## 6. Notes for the Architect (next session)

- **The inventory-exposure decision is the highest-risk item.** Default safe approach: column-level GRANT only on the 10 columns v_storefront_products projects. Per-table GRANT with `(barcode, brand_id, model, color, size, quantity, product_type, website_sync, display_mode_override, sell_price, ...)` rather than `GRANT SELECT ON inventory TO anon`.
- **Estimated effort:** 4–6 hours total (pre-flight 1 hr + §1.1 5-table RLS 2 hr + §1.2 8 view flips 1 hr + tests + close).
- **Mandatory backup** under `modules/Module 1.5 - Shared Components/backups/{YYYY-MM-DD}_SECURITY_HOTFIX_4/`.
- **Lessons from HOTFIX_3:** runtime-semantics rehearsal pays off — pre-flight against actual base-table RLS state caught the scope mismatch in 5 minutes. Use it again here.

---

## 7. Bounded Autonomy

Pipeline runs end-to-end in ONE Claude Code chat. STOP triggers (same as HOTFIX_3):

- Per-view anon probe returns 0 rows when pre-migration returned >0 → STOP + rollback that view + escalate.
- Storefront page returns non-200 → STOP + rollback + escalate.
- Inventory-exposure decision is unclear → STOP + ask Architect.
- ANY tenant data row write → STOP (structural only).
- Advisor returns NEW findings beyond F-CRIT-2 closures → STOP.

End of stub. Architect to author full Brief next session.
