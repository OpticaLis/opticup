---
brief_id: M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS
title: RLS policy for platform-super-admin write access on 4 global lens-catalog tables — unblocks Stage 2A submits
authored_by: opticup-architect (Cowork session, 2026-05-18 night)
status: SEALED — ready for Module Strategist (opticup-strategic)
module: Module 1 - Inventory Management
plan_position: Stage 2A unblocker — must close 🟢 before Stage 2B can be authored
predecessor: M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A (closed 🟡, 9 commits, T-BLOCK-2 ESCALATED)
---

# Brief — Platform Catalog RLS Write Bypass

## 1. Background

Stage 2A shipped the full Platform Catalog Admin UI but its 4 creation modals (supplier / brand / series / variant) fail with RLS 403 on submit. This is a **pre-existing architectural gap** that Stage 2A merely surfaced — the modals worked exactly as designed at the UI layer, but no DB write completed because:

- All 4 global tables (`lens_brand`, `lens_design`, `lens_variant`, `contact_lens_variant`) have 3 RLS policies each: `owner_view` (tenant_id match — fails for global `owner_tenant_id IS NULL` rows), `public_view` (published+active+not-deleted — applies to SELECT only, fails for drafts), `service_bypass` (service_role only).
- Optic Up platform admins authenticate via Google OAuth + Supabase auth; their JWT carries an `authenticated` role, NOT `service_role`. None of the 3 policies grants them WRITE access.
- The `is_platform_super_admin()` SQL function ALREADY EXISTS (verified 2026-05-18) and correctly returns `true` for `platform_admins` rows where `auth.uid()` matches + `role='super_admin'` + `status='active'`. **No auth-layer changes needed.** The function is callable from inside RLS policy clauses.

The Foreman's recommended Option A was "JWT-claim bypass" requiring auth-layer changes — that recommendation was made before the function-existence probe. The cleaner path is **direct function call inside policy USING/WITH CHECK clauses** — no JWT mint changes, no Edge Function changes, no client-side changes.

## 2. Goal

Add a new RLS policy `platform_admin_bypass` on each of the 4 global lens-catalog tables that grants `ALL` operations (SELECT + INSERT + UPDATE + DELETE) to users for whom `public.is_platform_super_admin()` returns true. After this Brief's SPEC closes 🟢, Stage 2A's 4 creation modals submit successfully, the version badge increments to v2 on first edit, the adoption count reflects reality, and Stage 2B (Excel import) becomes the next viable build.

## 3. Scope IN

### 3.1 The 4 RLS policies (one per table)

For each of `lens_brand`, `lens_design`, `lens_variant`, `contact_lens_variant`, add a policy of the shape:

```sql
CREATE POLICY platform_admin_bypass ON <table>
  FOR ALL
  TO public
  USING (public.is_platform_super_admin())
  WITH CHECK (public.is_platform_super_admin());
```

Both `USING` and `WITH CHECK` clauses are required — `USING` controls visibility on SELECT/UPDATE/DELETE; `WITH CHECK` controls validity on INSERT/UPDATE. Both must be true for full write access.

### 3.2 Idempotency contract

The migration must be **safe to re-run**. Wrap with `DROP POLICY IF EXISTS platform_admin_bypass ON <table>;` before each CREATE so the migration is idempotent across replays + re-apply scenarios.

### 3.3 Test coverage (mandatory before SPEC closes)

Tier C VFV in this SPEC requires verifying BOTH:

- **Positive path:** authenticated platform-super-admin user (via Stage 2A's existing tenant-select + Google OAuth flow) can successfully submit each of the 4 creation modals on demo, with the new rows appearing in the global tables (`owner_tenant_id IS NULL`).
- **Negative path:** authenticated tenant manager (non-platform-admin) gets 403 RLS rejection when attempting to INSERT into the same tables. This proves the bypass is narrow — it does not accidentally grant tenants access to write to global catalog.

### 3.4 No new permission keys

The existing `is_platform_super_admin()` function already encapsulates the authorization check. No new entries in `permissions` or `role_permissions` tables.

### 3.5 No client-side changes

The 4 modals in Stage 2A code already POST to standard `.insert()` paths via `DB.*` wrapper. Once RLS permits, they succeed. Zero JS changes expected.

## 4. Scope OUT

- **T-INFRA-1 (inventory-shell `?dev=1` inconsistency)** — although the Foreman's review suggested bundling, the Architect's read is that this is a different concern (dev-bypass for local testing vs production RLS architecture). Defer to a separate micro-SPEC if Daniel chooses. **Not in this Brief.**
- **The 3 misclassified "brands"** (`יומיות`/`חודשיות`/`שנתיות`) — still deferred to a curation SPEC.
- **The TECH_DEBT items from Stage 2A close** (`#M1_LENS_DISPLAY_ID_SEQUENTIAL_RPC`, `#M1_LENS_TYPE_CHECK_CONSTRAINT`, `#M1_CATALOG_DETAIL_PANE_SPLIT_AT_STAGE_4`, `#OPTICUP_MODAL_API_CONSOLIDATION`) — defer to housekeeping sweep within 48h.
- **Edge case:** what if a row's `owner_tenant_id` is NOT NULL AND a platform admin tries to write to it? The new policy permits it because the bypass is unconditional on the row's tenant. This is desired behavior: platform admin can edit any row. The Module Strategist documents this in SPEC §5 explicitly so it's a logged decision, not a side-effect surprise.

## 5. Locked decisions

| # | Decision | Why |
|---|---|---|
| D1 | Use `public.is_platform_super_admin()` directly inside policy clauses. NOT JWT claim mint. | Function already exists, queries `platform_admins` table directly via `auth.uid()`. No auth-layer changes needed. Cleaner than Foreman's original Option A formulation. |
| D2 | One policy per table, ALL operations (not split SELECT vs INSERT/UPDATE/DELETE). | Reduces row-count of `pg_policies` for these tables from 3 to 4 each. SELECT path is unchanged (the existing `owner_view` + `public_view` still grant tenant + public access; the new `platform_admin_bypass` is additive — RLS policies are OR-combined). |
| D3 | Idempotent migration: `DROP POLICY IF EXISTS` before each `CREATE POLICY`. | Standard project pattern; matches Iron Rule 11 (atomic/safe-to-replay) intent for any DDL change. |
| D4 | Verify negative path explicitly (non-admin tenant user → 403). | Without the negative test, the SPEC cannot prove the bypass is narrow. Tier C VFV requires both positive and negative. |
| D5 | Apply on both demo AND Prizma (same DB project). | Single Supabase project shared by both tenants; policies are tenant-agnostic. One migration covers both. |
| D6 | NO polish-by-validation closure. If Executor finds the policies already exist, STOP and escalate. | Memory `feedback_no_polish_by_validation.md` — binding rule. (Pre-flight probe verified policies do NOT exist 2026-05-18 night — see §1 evidence.) |

## 6. Dependencies

- **Upstream:** Stage 2A (`M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A`) closed 🟡 on develop. This Brief unblocks Stage 2A's 4 creation modals.
- **Cross-module:** Iron Rule 15 (canonical RLS pattern). This is the FIRST instance in the project of an "is X admin? then bypass" pattern via direct function call inside policy USING/WITH CHECK. Future similar bypasses (M11 supplier portal, M13 loyalty config, M14 platform settings) will reuse this pattern — Module Strategist documents it in SPEC §5 as a precedent.
- **Downstream:** Stage 2B (Excel import) cannot start until this SPEC closes 🟢, because the bulk-import flow depends on the same modal submit paths.

## 7. Cross-module contracts to honor

- **Iron Rule 15:** every RLS policy uses the canonical USING/WITH CHECK pattern. The function call form `public.is_platform_super_admin()` is the canonical way to express "this user is an admin" in policy clauses going forward.
- **Iron Rule 11:** the function definition itself is already in DB; no atomic-RPC concern. This Brief adds policies, not RPCs.
- **Iron Rule 21:** Module Strategist runs the cross-reference check — no policy named `platform_admin_bypass` exists today on any table; this is a new name, no collision.
- **Iron Rule 32:** declare destructive ops. `DROP POLICY IF EXISTS` is destructive even if idempotent — must be declared in SPEC §Destructive Operations.

## 8. Open questions for the Module Strategist

None at the strategic level. Module Strategist owns:
- SPEC.md with the exact migration SQL (4 DROP + 4 CREATE).
- Pre-flight: verify `platform_admins` table has at least one `super_admin` + `status='active'` row on both demo AND Prizma. If not, the test path can't run — escalate before authoring full SPEC.
- Tier C VFV protocol: 4 positive submit tests + 4 negative submit tests = 8 verification cases minimum.

## 9. Anti-patterns to avoid

1. **Adding a JWT claim mint instead of using the existing function** — wasted scope.
2. **Granting service_role to client code** — Iron Rule 23 violation. The new RLS policy makes this unnecessary.
3. **Combining this SPEC with T-INFRA-1** — different concerns, separate decision-point.
4. **Skipping the negative test** — the bypass must be proven narrow.
5. **Touching policy clauses other than `platform_admin_bypass`** — the existing `owner_view` / `public_view` / `service_bypass` policies stay verbatim.

## 10. Deliverables

1. SPEC.md by Module Strategist.
2. ACTIVATION_PROMPT.md sibling.
3. ONE migration file (4 DROP + 4 CREATE).
4. EXECUTION_REPORT.md.
5. FINDINGS.md.
6. Tier C VFV evidence: 4 positive submit screenshots + 4 negative submit screenshots (or DB row count assertions). Document on demo only; Prizma policies inherit automatically (single DB project).
7. FOREMAN_REVIEW.md within 24h.

## 11. Position in plan

| Stage | Description | Status |
|---|---|---|
| 1 | Mockup-faithful screens | ✅ |
| 2A | Platform Catalog Admin full build | 🟡 (this Brief unblocks 🟡 → 🟢 in practice) |
| **RLS UNBLOCKER** | **This Brief — RLS write bypass for platform-super-admin** | **next** |
| 2B | Excel import dialog (per-category file, 3-step preview-with-corrections) | queued (gated on this SPEC) |
| 3 | Daniel loads actual Excel through 2B's UI | queued |
| 4 | Tenant-side inventory screen — proper two sub-tabs | queued |
| 5 | Demo tests + M1 phase close | queued |

## 12. Stop triggers

- Pre-flight finds the 4 policies already exist → STOP, escalate (polish-by-validation guard).
- Pre-flight finds `platform_admins` table empty on demo or Prizma → STOP, escalate (cannot run test).
- Negative test passes for a tenant user that SHOULD have been rejected → STOP, the bypass is too wide.
- Migration fails on Prizma after succeeding on demo → STOP, investigate per-DB drift.

---

**End of Brief.** Module Strategist (`opticup-strategic`) authors the SPEC from here.
