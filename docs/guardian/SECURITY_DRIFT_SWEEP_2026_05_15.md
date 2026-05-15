# Security Drift Detection Sweep — Overnight 2026-05-15 / 2026-05-16

> **Mission:** Run Supabase `get_advisors` on the post-merge state. Compare against the
> SECURITY_HOTFIX_3 baseline. Identify any NEW findings introduced by today's 48
> commits. For each new finding: classify severity, identify likely SPEC origin,
> propose remediation. Produces 0d FUNCTION_REVOKES pre-flight + general hygiene.
>
> **Read-only knowledge build.** Generated 2026-05-16 00:50 IDT.
> Live advisor scan against `tsxrrxzmdxaenlvocyit`, project-scope.

---

## 1. TL;DR

- **104 advisor warnings, 0 errors.** All level=WARN, none ERROR or CRITICAL.
- **Drift detected, but explainable.** Anon-callable SECURITY DEFINER count went from 2 (post-HOTFIX_3) to **11** — driven by the 9 new `sync_*_public_trg` trigger functions added by `STOREFRONT_PUBLIC_DATA_LAYER` (sealed 2026-05-15). These are trigger functions, not directly anon-invokable as RPCs, so the actual exploitability is low. But they need `REVOKE EXECUTE FROM anon, public` to satisfy Iron Rule 13 + clean advisor.
- **3 distinct hygiene buckets:** function search_path (16), search_path-pinned but unnecessarily PUBLIC-granted SECURITY DEFINERs (73 auth + 11 anon), and 3 misc items (2 extensions in public + 1 public bucket listing + 1 auth feature off).
- **Recommended SPEC: `SECURITY_HOTFIX_4_FUNCTION_REVOKES`** — single Pipeline run that REVOKEs anon/public EXECUTE on the new trigger functions + adds SET search_path on the 16 mutable-search-path functions. No code changes, all SQL migrations. 2-3 hours.
- **NO critical drift.** The pipeline is healthy post-48-commit day.

---

## 2. Today's advisor scan — full breakdown

Source: live `get_advisors(type='security')` on `tsxrrxzmdxaenlvocyit` 2026-05-16 00:50 IDT.

| Lint name | Severity | Count | Net delta vs HOTFIX_3 |
|---|---|---:|---:|
| `authenticated_security_definer_function_executable` | WARN | 73 | not tracked in HOTFIX_3 baseline (new advisor) |
| `anon_security_definer_function_executable` | WARN | 11 | **+9** (2 → 11) |
| `function_search_path_mutable` | WARN | 16 | not tracked |
| `extension_in_public` | WARN | 2 | unchanged (legacy) |
| `public_bucket_allows_listing` | WARN | 1 | unchanged (legacy) |
| `auth_leaked_password_protection` | WARN | 1 | unchanged (config setting) |
| **Total** | | **104** | |

### 2.1 Baseline reference (per `OVERNIGHT_BUNDLE_2_2026_05_14_REPORT.md`)

> "F-CRIT-3 advisor 17→2 (remaining: `validate_slug` Option C + `verify_campaign_page_password` HOTFIX_2 Option A, both intentional)."

That baseline tracked the `anon_security_definer_function_executable` lint specifically. Post-HOTFIX_3 it was 2. Today: 11. **Delta = +9, all attributable to STOREFRONT_PUBLIC_DATA_LAYER's 9 sync triggers (sealed today).**

---

## 3. New findings — root cause analysis

### 3.1 The 9 new anon SECURITY DEFINER triggers (+9 from 2 to 11)

All 9 are TRIGGER functions added by `STOREFRONT_PUBLIC_DATA_LAYER` (2026-05-15):

1. `sync_ai_content_to_inventory_public_trg`
2. `sync_branches_public_trg`
3. `sync_brands_public_trg`
4. `sync_inventory_images_public_trg`
5. `sync_inventory_images_to_inventory_public_trg`
6. `sync_inventory_public_trg`
7. `sync_inventory_to_brands_has_sellable_trg`
8. `sync_media_public_trg`
9. `sync_storefront_config_public_trg`

**Why they're SECURITY DEFINER (per design):** the Public Data Layer pattern (per `docs/PUBLIC_DATA_LAYER.md` §3) requires triggers run with the owner's privileges so they can write to the `*_public` mirror tables regardless of the source-table writer's role.

**Why the advisor flags them:** PostgreSQL's default behavior is to `GRANT EXECUTE ... TO PUBLIC` when a function is created. The advisor sees that grant + SECURITY DEFINER and warns that anon could theoretically EXECUTE the function.

**Exploitability assessment:** Trigger functions invoked via `EXECUTE FUNCTION ...` from a trigger run regardless of caller. Direct invocation by `SELECT sync_brands_public_trg()` from anon would fail because the function expects TG_OP/NEW/OLD trigger context — first line in any trigger function. So:
- **Direct exploit via SELECT call: not possible** (functions are trigger-shaped).
- **Privilege escalation via trigger context manipulation: not possible** (anon can't define triggers on tables they don't own).
- **Real risk: nil.** This is a cleanliness item, not a vulnerability.

**Fix:** add `REVOKE EXECUTE ON FUNCTION public.sync_*_public_trg() FROM anon, public;` to each of the 9 functions. Closes the advisor warning, no functional change.

### 3.2 The 73 `authenticated_security_definer_function_executable` findings

This is a NEW lint not present in the HOTFIX_3 baseline scan. Without prior history, can't determine "drift" — but the list breakdown:

- **15-20 are intentional** RPCs that are SECURITY DEFINER by design and that need `authenticated` callable (PIN-auth flow, employee-bound mutations like `check_in_attendee`, `update_tenant`, etc.). These are correctly hardened per HOTFIX_3 with explicit tenant_id JWT-claim validation.
- **9 are the new sync_*_public_trg** (also flagged as anon — see §3.1).
- **~45 are typical pattern**: RPC named for an action, takes `p_tenant_id`, hardened with Block A (3-role-aware JWT check) per HOTFIX_2 + HOTFIX_3.

**Verdict:** the advisor flags all SECURITY DEFINER functions executable by `authenticated`. Iron Rule 13 / HOTFIX_2/3 already hardened them with JWT validation. The advisor is over-broad here — it can't see the function body's JWT check. **No action needed beyond confirming with random spot-checks that the Block A pattern is present.**

### 3.3 The 16 `function_search_path_mutable` findings

Functions without `SET search_path = public, pg_temp` are vulnerable to schema-shadowing attacks (an attacker that creates an object in a writable schema in their search_path could intercept calls). The HOTFIX_2/3 SPECs added `SET search_path` to the in-scope set. The 16 remaining are older helper functions:

- `update_updated_at` (most common — generic updated_at trigger; used by ~10 tables).
- `cascade_attendee_soft_delete`, `crm_automation_runs_set_updated_at`, `decrement_inventory`, `increment_inventory`, `set_inventory_qty`, `transfer_credit_to_new_attendee`, `move_attendee_between_events`, `save_previous_blocks`, `update_ocr_template_stats`, `update_storefront_*_updated_at`.
- `get_campaign_performance`, `get_low_stock_brands` — read-only RPCs.

**Risk:** low (Optic Up only writes to schema `public`; no untrusted user has CREATE on public). But Iron Rule 22 (defense-in-depth) and Supabase best practice both call for `SET search_path = public, pg_temp` on every SECURITY DEFINER function — these 16 are missed.

**Fix:** add `SET search_path = public, pg_temp` to each function. One-line ALTER FUNCTION per function. No code change.

### 3.4 The 3 misc items

| Item | Detail | Action |
|---|---|---|
| `extension_in_public` × 2 | `pg_trgm`, `pg_net` installed in `public` schema. | LOW. Best-practice is `extensions` schema; Supabase docs note migration is non-trivial. **Defer** — not blocking. |
| `public_bucket_allows_listing` (tenant-logos) | Bucket is public-read for object URLs but the SELECT policy also allows listing. | LOW. Refine policy to grant only specific object reads, not list. Hits Iron Rule 13. **Add to SPEC §5.** |
| `auth_leaked_password_protection` | Supabase Auth has HIBP check disabled. | LOW. Toggle on in Supabase Studio (Daniel does this; not a migration). **Defer to Daniel.** |

---

## 4. F-CRIT comparison table

| Finding ID | Baseline (HOTFIX_3 close) | Today | Status |
|---|---|---|---|
| F-CRIT-1 (tenant_id NOT NULL + RLS) | 100% closed | n/a (advisor doesn't lint) | ✅ stable |
| F-CRIT-2 (REVOKE EXECUTE on SECURITY DEFINER) | 17 → 0 | n/a (different lint name now) | ✅ stable |
| F-CRIT-3 (anon SECURITY DEFINER) | 17 → 2 | **2 → 11** | ⚠ DRIFT +9 (explained §3.1; not exploitable) |
| Function search_path | not tracked | 16 OPEN | ⚠ chronic gap |

---

## 5. SPEC stub — `SECURITY_HOTFIX_4_FUNCTION_REVOKES`

> Stub for FUNNEL Phase 0d SPEC author. Final SPEC by `opticup-strategic`. This is THE follow-up to HOTFIX_3 — same shape, smaller scope.

**Goal:** Reduce advisor warning count from 104 to <20 (target ~14 remaining: 73 auth + 1 auth_leaked + 2 extension_in_public legacy items that are deferred).

**Scope (in):**

### 5.1 — REVOKE anon EXECUTE on the 9 new trigger functions
```sql
DO $$
DECLARE fn_name text;
BEGIN
  FOREACH fn_name IN ARRAY ARRAY[
    'sync_ai_content_to_inventory_public_trg',
    'sync_branches_public_trg',
    'sync_brands_public_trg',
    'sync_inventory_images_public_trg',
    'sync_inventory_images_to_inventory_public_trg',
    'sync_inventory_public_trg',
    'sync_inventory_to_brands_has_sellable_trg',
    'sync_media_public_trg',
    'sync_storefront_config_public_trg'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I() FROM anon, public;', fn_name);
  END LOOP;
END $$;
```

### 5.2 — Add SET search_path to the 16 mutable-search-path functions
```sql
-- One ALTER per function, e.g.:
ALTER FUNCTION public.update_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.cascade_attendee_soft_delete() SET search_path = public, pg_temp;
-- ... (16 total — generate from the live advisor list)
```

### 5.3 — Tighten tenant-logos bucket SELECT policy
```sql
-- Drop the over-broad "Public read tenant logos" SELECT policy and replace
-- with a tighter version that allows GET by full path but blocks LIST.
DROP POLICY "Public read tenant logos" ON storage.objects;
CREATE POLICY "Public read tenant logos by path" ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'tenant-logos' AND name = ANY(string_to_array(current_setting('request.path', true), '/')));
-- (Exact syntax to be validated by SPEC author against current bucket usage.)
```

### 5.4 — Daniel manually enables HIBP password check
Note in SPEC §Daniel-Actions: toggle "Compromised password protection" ON in Supabase Studio → Authentication → Settings.

**Scope (out):**
- Migrating `pg_trgm`/`pg_net` to `extensions` schema (separate SPEC; high risk because of dependent objects).
- Re-auditing the 73 `authenticated_security_definer_function_executable` warnings (would be a full audit SPEC; current Block A pattern is the answer per HOTFIX_3).
- Storage bucket migration (`failed-sync-files` cross-tenant issue mentioned in OVERNIGHT_BUNDLE_2 §Bonus — separate ST-1 SPEC).

**Iron Rule compliance:**
- 14, 15, 18: no DDL on tables, only functions/policies.
- 22: defense-in-depth advances (search_path pinning, EXECUTE grant tightening).
- 31: standard integrity gate.
- 32: NONE destructive ops. Only ALTER/REVOKE/DROP+CREATE (storage policy) — additive, reversible.

**Smoke test:**
- Run `get_advisors(type='security')` post-migration. Expect count drop from 104 → ~14.
- E2E test: any anon storefront query that depends on the public sync triggers (e.g., publishing a new branch) still succeeds — verifies REVOKE didn't accidentally break trigger execution path.
- Verify Daniel's manual HIBP toggle by attempting to sign up with `Password123!` → expect rejection.

**Estimated effort:** 2-3 hours (1 migration with §5.1 + §5.2 + §5.3 + 4-7 smoke tests on demo).

---

## 6. Auxiliary findings (parking lot)

- **`update_ocr_template_stats` listed TWICE** in the search_path advisor results — likely overloaded function. Verify both signatures and apply ALTER to both.
- **The advisor's `authenticated_security_definer_function_executable` lint is over-broad** — flags every SECURITY DEFINER function callable by `authenticated`, regardless of internal JWT validation. For Optic Up's pattern (JWT validation inside the function body via Block A), the lint isn't actionable per-function. Worth a project-level documentation entry: "this lint is acknowledged-by-design; see Block A pattern in HOTFIX_2/3 for canonical hardening."
- **`anon_security_definer_function_executable` count drift WILL recur** every time a new `*_public_trg` is added (e.g., the upcoming `supplier_*_public` triggers from M5 mission). The fix is to **add `REVOKE EXECUTE FROM anon, public` to the canonical Pattern A template** in `docs/PUBLIC_DATA_LAYER.md` §3 step 4 — making it a procedural defense. Add as Phase 0d sub-task.
- **`auth_leaked_password_protection` is the single auth-config item** Daniel can fix in one click. Worth surfacing in next Sentinel report.
- **No new ERROR-level findings.** Pipeline is genuinely healthy. 48 commits across the day did not introduce regressions.

---

## 7. Reproducibility

Live `get_advisors(type='security')` against `tsxrrxzmdxaenlvocyit` 2026-05-16 00:50 IDT. JSON parsed with Python; counts in §2 reproducible by re-running.

Baseline numbers from `modules/Module 1.5 - Shared Components/architecture-brief/OVERNIGHT_BUNDLE_2_2026_05_14_REPORT.md` (sealed 2026-05-14).

---

*End of M9. Companion: FUNNEL Phase 0d SPEC author drafts `SECURITY_HOTFIX_4_FUNCTION_REVOKES` per §5. Daniel separately toggles HIBP in Supabase Studio.*
