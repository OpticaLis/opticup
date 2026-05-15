# SECURITY_HOTFIX_3_2026_05_15 — Architecture Brief

**Type:** Production security hotfix. Closes the residual gaps from SECURITY_HOTFIX_2 (deferred F-CRIT-2 + harvested follow-ups). Sequel SPEC in the SECURITY_HOTFIX series.

**Why this exists:** SECURITY_HOTFIX_2 closed F-CRIT-1 100% + F-CRIT-3 100% (in-scope subset), but only 2 of 17 views got `security_invoker=on` (F-CRIT-2 partial). The remaining 15 views had to be deferred because their base tables (`blog_posts`, `storefront_pages`, `ai_content`) don't grant anon SELECT — the views were silently relying on owner-privilege bypass, which IS the F-CRIT-2 vulnerability. Closing the gap requires base-table RLS work that was explicitly out of scope for HOTFIX_2.

HOTFIX_3 is the planned base-table-aware closure: GRANT SELECT TO anon on the 3 base tables WITH published-only RLS filters, then `security_invoker=on` flip on all 15 views, plus the 4 additional follow-ups harvested during HOTFIX_2 closeout.

---

## 1. Scope

**In scope — 5 work areas:**

### §1.1 — Base-table RLS expansion (3 tables)

For each of `blog_posts`, `storefront_pages`, `ai_content`:
1. Audit existing RLS policies (likely tenant_id-scoped for authenticated; no anon policy today).
2. Add a NEW RLS policy `<table>_public_read_published` for anon role:
   - `USING (status='published')` — Foreman confirms the exact column + value per table (might be `status='published'`, `published_at IS NOT NULL`, `is_active=true` — read existing columns + how the legacy view filters today).
   - Tenant_id derivation: anon has no JWT tenant_id, so the policy uses ONLY the published-state filter. Cross-tenant leakage IS PREVENTED by the view's WHERE clause (every storefront view filters by tenant slug → tenant_id lookup); the base table just lets anon see rows that any tenant has marked published.
   - This IS a design decision: do we leak the existence of "published rows across all tenants" to a client that knows row ids? Foreman's call. For now, anon can SELECT published rows; the view layer restricts visible set per storefront. Cross-tenant data isolation is preserved at the view + RPC layer per Iron Rule 13.
3. `GRANT SELECT TO anon ON <table>` (column-level grant if possible — restrict to columns the views actually project).
4. Verify pre-state: which rows would anon now see globally? Numbers per table.

### §1.2 — Apply `security_invoker=on` to the 15 deferred views

Once §1.1 is complete and base tables allow anon to see published rows:
- `ALTER VIEW <name> SET (security_invoker=on)` for all 15.
- Per-view smoke probe: query the view as anon role, confirm row count > 0 + matches pre-migration expected count.
- The 15 views (per SECURITY_HOTFIX_2 deferred list): `v_storefront_blog_posts`, `v_storefront_pages`, `v_storefront_products`, `v_storefront_brand_page`, `v_storefront_categories`, `v_ai_content`, `v_translation_dashboard`, and 8 cascading views that depend on them (Foreman lists exact via pre-flight).

### §1.3 — 4 Admin-cohort view lockdowns

Per HOTFIX_2 FOREMAN_REVIEW §10. Specifically: 4 views in the `v_admin_*` cohort that SECURITY_HOTFIX_2026_05_13 §6.3 missed (the original hotfix closed 9 of 13; 4 remain). For each:
1. Confirm `security_invoker=on` (may already have it).
2. `REVOKE SELECT FROM anon` (admin views should never be anon-callable).
3. Pre-flight: query `v_admin_*` for the full inventory; confirm exactly 4 remain that need lockdown.

### §1.4 — `save_translation_memory_batch` second overload

Per HOTFIX_2 FOREMAN_REVIEW §10. The function has 2 overloads (different signatures); HOTFIX_2 hardened only one. Apply Block A 3-role-aware JWT validation to the second overload. Verify `pg_proc` shows BOTH overloads with JWT header.

### §1.5 — 15 pre-existing F-CRIT-3 carry RPCs

Per HOTFIX_2 FOREMAN_REVIEW §10. These are SECURITY DEFINER functions WITHOUT `p_tenant_id` parameter that were flagged by the advisor but out-of-scope for HOTFIX_2 (HOTFIX_2 scope was `p_tenant_id`-bearing functions). Each function determines its operating tenant from a different source — slug lookup, lead_id JOIN, attendee_id JOIN, etc.

Pre-flight: list the 15 functions + identify EACH function's tenant derivation path. For each:
- **Option A** — derived from a trusted source (e.g. `lead_id` → `crm_leads.tenant_id` JOIN with RLS-protected SELECT). VERIFY the derivation path cannot be bypassed by a malicious caller. Keep as-is + add SET search_path='public' if missing.
- **Option B** — derivation is from an UNTRUSTED source (e.g. directly from caller-supplied params without validation). Add JWT-claim validation header + REVOKE FROM anon if anon-callable.
- **Option C** — function is intentionally anon-callable for public flows (e.g. `validate_slug`, `register_lead_to_event` via storefront submit). Keep anon-callable + verify derivation is from trusted public column (slug lookup on `v_public_tenant` or similar).

Foreman picks A/B/C per function with rationale.

**Out of scope:**
- HIGH/MEDIUM/LOW findings from Bundle 2 audits — separate future hotfix.
- Refactoring view bodies beyond `security_invoker=on`.
- Refactoring base-table schema (only adding RLS policy + grant).
- Backfill of historical data.
- Storefront code changes (the view changes should be transparent to the storefront — that's the design goal).

---

## 2. Critical Design Constraints

**Tenant scope:** ALL changes are structural (RLS policies, grants, view metadata, function bodies). ZERO data row writes on any tenant. Demo is used for integration tests via existing data.

**Backward compatibility — storefront uptime is sacrosanct:**
- The whole reason HOTFIX_2 deferred these 15 views was storefront outage risk. HOTFIX_3 closes the gap WITHOUT breaking storefront because base-table RLS now allows anon to see what the views need.
- Pre-flight + Post-migration testing per view is mandatory.
- ROLLBACK plan: per-view tag every change, snapshot pre-edit base-table policies. Rollback path: ALTER VIEW SET (security_invoker=off) + REVOKE SELECT FROM anon + DROP POLICY.

**Storefront outage risk — STOP triggers explicit:**
- ANY post-migration view-as-anon probe returns 0 rows (when pre-migration returned >0) → STOP, rollback that view, escalate.
- ANY storefront page that consumes a migrated view returns non-200 → STOP, rollback, escalate.

**SaaS-clean (Iron Rules 14, 15, 18, 20):**
- New RLS policies follow canonical pattern (USING clause references a column directly readable by the role, no JWT for anon, JWT-claim tenant_id for authenticated where applicable).
- Grants are SELECT-only, column-restricted where possible.
- No tenant-specific behavior.

**Forward-compat (Phase 4 + future tenants):**
- The published-state RLS pattern becomes the template for any future "public read of authenticated content." Document in SKILL.

**Performance:** Negligible. RLS adds a single WHERE clause to the base table's query plan.

---

## 3. Method (high-level for Foreman)

1. **Pre-flight queries (mandatory) per work area:**
   - §1.1: Read existing RLS on `blog_posts`/`storefront_pages`/`ai_content`. Identify "published" column convention per table. Count would-be-visible rows per table for anon post-policy.
   - §1.2: Confirm exact 15 deferred views still need `security_invoker=on`. Identify cascading dependencies between views.
   - §1.3: Confirm exactly 4 `v_admin_*` views need lockdown.
   - §1.4: Confirm `save_translation_memory_batch` still has 2 overloads, one already hardened.
   - §1.5: List 15 RPCs + their tenant-derivation paths.

2. **STOP gates before any write:**
   - If §1.1 published-column convention is inconsistent across the 3 tables → STOP, escalate (need Daniel's call on how to harmonize).
   - If §1.5 surfaces an RPC where tenant derivation is genuinely UNTRUSTED → STOP, escalate (might be a pre-existing security bug needing wider fix).

3. **Apply migrations in order (smallest blast radius first):**
   - §1.3 admin lockdowns (zero customer impact).
   - §1.4 second overload hardening (admin-internal).
   - §1.5 15 RPCs (per Foreman's A/B/C per function).
   - §1.1 base-table RLS (creates the new anon SELECT path — does not change view behavior yet).
   - §1.2 view flips (per-view, with rollback tag each).

4. **Per-view post-migration probe (§1.2):**
   - Query view as anon role.
   - Compare row count to pre-migration.
   - If matches → mark view as PASSED.
   - If 0 or non-matching → ROLLBACK that view immediately, escalate.

5. **Cross-storefront probe:**
   - For each of the 7 storefront pages that consume migrated views, curl-probe → HTTP 200 + non-empty body.
   - Specific pages: storefront homepage (`v_storefront_components`/`v_storefront_brand_page`), blog list (`v_storefront_blog_posts`), CMS page (`v_storefront_pages`), product list (`v_storefront_products`), category list (`v_storefront_categories`).

6. **Reviewer + Localhost-Tester + Foreman close** — standard pipeline.

---

## 4. Destructive Operations

Per Iron Rule 32:

1. **CREATE POLICY × 3** on `blog_posts`/`storefront_pages`/`ai_content` (additive).
2. **GRANT SELECT TO anon × 3** (additive).
3. **ALTER VIEW SET (security_invoker=on) × 15** (metadata, additive).
4. **CREATE OR REPLACE FUNCTION × ~16** (1 save_translation_memory_batch overload + 15 F-CRIT-3 carry — additive replace, not destructive per Rule 32).
5. **REVOKE SELECT FROM anon × 4** (admin views — declared destructive; reverses via GRANT if rollback needed).
6. **REVOKE EXECUTE FROM anon × N** (subset of §1.5 Option B decisions — Foreman count).

**No DROP, no DELETE, no schema removal, no main deploys.**

Iron Rule 32 declaration: "3 CREATE POLICY + 3 GRANT + 15 ALTER VIEW + ~16 CREATE OR REPLACE FUNCTION + 4 + N REVOKE FROM anon. No DROP, no DELETE."

---

## 5. Success Criteria

| # | Criterion | Method |
|---|---|---|
| 1 | Pre-flight queries documented per work area (3 base tables + 15 views + 4 admin views + 2 overloads + 15 carry RPCs) | SPEC.md grep |
| 2 | 3 base tables: new `<table>_public_read_published` RLS policy + `GRANT SELECT TO anon` | `pg_policies` + `pg_class.relacl` |
| 3 | 15 deferred views: ALL have `security_invoker=on` post-migration | `pg_class` query |
| 4 | Per-view anon probe: row count matches pre-migration (or documented difference if base-table filter changed visible set) | per-view test |
| 5 | 4 admin views locked: `security_invoker=on` + `REVOKE SELECT FROM anon` | `pg_class` + `relacl` |
| 6 | `save_translation_memory_batch` 2nd overload hardened with Block A | `pg_proc` query both overloads |
| 7 | 15 F-CRIT-3 carry RPCs: Foreman's A/B/C decision applied per function | SPEC.md + `pg_proc` |
| 8 | All 7 storefront pages consuming migrated views: HTTP 200 + non-empty body | curl probe |
| 9 | Demo integration: any storefront-facing view returns expected anon-visible rows | demo probe |
| 10 | No tenant data row write on any tenant (structural only) | audit log check |
| 11 | Smoke 7/7 PASS pre- AND post-migration | `npm run smoke` |
| 12 | Integrity gate exit 0 | `npm run verify:integrity` |
| 13 | Supabase advisor: F-CRIT-2 17→0 (all 17 closed); F-CRIT-3 17→0 (15 carry + 2 from HOTFIX_2 remainder closed) | `get_advisors` |
| 14 | HOTFIX_2 FOREMAN_REVIEW §10 follow-ups: ALL marked RESOLVED | grep |
| 15 | Sentinel Deep Dive findings F-CRIT-2 + F-CRIT-3 (full) marked RESOLVED | grep |
| 16 | Backup folder contains pre-edit snapshots of all 3 base tables' policies + 15 view defs + 4 admin view defs + 16 function bodies | ls |
| 17 | Repo clean at close | `git status` |

---

## 6. Notes for the Foreman

- **§1.1 is the highest-risk work area** — adding `GRANT SELECT TO anon` on previously-private base tables. The pre-flight MUST identify: (a) the exact published-state column per table, (b) how many rows anon will be able to see globally, (c) whether any "draft" or "internal" rows would leak.
- **§1.2 per-view probe is mandatory** — if even ONE view returns 0 rows post-migration, the base-table RLS isn't right. Rollback that view + investigate.
- **§1.5 A/B/C decision per RPC** — when in doubt, choose B (add JWT validation + REVOKE FROM anon). Safer to over-restrict and discover via test breakage than to under-restrict and discover via security advisor in 2 weeks.
- **Estimated effort:** 5-7 hours total (pre-flight 1 hr + §1.3 30 min + §1.4 15 min + §1.5 1.5-2 hr + §1.1 1.5 hr + §1.2 1-1.5 hr + tests + close).
- **Mandatory backup** under `modules/Module 1.5 - Shared Components/backups/{YYYY-MM-DD}_SECURITY_HOTFIX_3_2026_05_15/`.
- **Per-view rollback tags** — for §1.2, tag each view's pre-flip state so rollback is per-view, not all-or-nothing.

---

## 7. Bounded Autonomy

Pipeline runs end-to-end in ONE Claude Code chat. STOP triggers:

- §1.1 published-column convention is inconsistent across 3 tables → STOP, escalate.
- §1.2: any view's post-migration anon probe returns 0 rows when pre-migration returned >0 → STOP, rollback that view immediately, escalate.
- §1.2: any storefront page consuming a migrated view returns non-200 → STOP, rollback, escalate.
- §1.5: any RPC's tenant derivation is genuinely UNTRUSTED → STOP, escalate.
- Demo wrong-tenant test for any §1.5 RPC fails to reject → STOP, fix.
- Smoke <7/7 PASS pre-migration → STOP, regression.
- Advisor returns NEW findings beyond closing F-CRIT-2/3 → STOP, list them.
- ANY data row UPDATE/INSERT on any tenant (structural only) → STOP, rollback.

End of Brief.
