# SECURITY_HOTFIX_2_2026_05_15 — Architecture Brief

**Type:** Production security hotfix. Closes 3 CRITICAL findings surfaced by overnight Bundle 2 (T5 architecture debt sweep + T6 Sentinel deep dive). Direct sequel to `SECURITY_HOTFIX_2026_05_13` — same regime (one focused SPEC, all findings closed in one merge to main).

**Why this exists:**
- **F-CRIT-1** — Regression of SECURITY_HOTFIX_2026_05_13 hardening: `sync_lead_status_from_attendee` function lost its `search_path='public'` setting at some point after the original hotfix (likely via a later `CREATE OR REPLACE` that didn't include the `SET search_path` clause).
- **F-CRIT-2** — 17 views (including all `v_storefront_*`) are missing `security_invoker=on`. Same bug class that SECURITY_HOTFIX_2026_05_13 §6.3 was meant to close — incomplete coverage at the time, plus drift since.
- **F-CRIT-3** — 24 SECURITY DEFINER RPCs accept a `p_tenant_id` parameter without validating it against JWT claims. 7 of these are anon-callable. Severity: a misbehaving caller (anon or authenticated) can pass any tenant_id and the RPC will operate on that tenant's data — cross-tenant breach class.

All 3 findings re-confirmed by the morning pre-merge validation (2026-05-15) — none was silently fixed in any intervening commit.

**Scope confirmation post-merge:** SECURITY_HOTFIX_2026_05_13 baseline is now on main. SECURITY_HOTFIX_2 starts from a clean main + develop sync. Standard regime.

---

## 1. Scope

**In scope — 3 work areas:**

### §1.1 — F-CRIT-1: Restore `search_path` on `sync_lead_status_from_attendee`

Apply `CREATE OR REPLACE FUNCTION ... SET search_path='public'` to restore the hardening. Single ALTER FUNCTION equivalent via migration. Preserve the function body byte-for-byte except the SET clause addition. Verify post-migration via `pg_proc.proconfig` shows `search_path=public`.

### §1.2 — F-CRIT-2: Add `security_invoker=on` to 17 views

Pre-flight: Foreman queries the exact 17 view names via:
```
SELECT n.nspname, c.relname
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace=n.oid
WHERE n.nspname='public' AND c.relkind='v'
  AND NOT EXISTS (SELECT 1 FROM unnest(c.reloptions) AS opt WHERE opt = 'security_invoker=on');
```

For each view, apply `ALTER VIEW <name> SET (security_invoker=on)`. This is metadata-only — does NOT modify the view's SELECT body, does NOT change consumer behavior unless a consumer is bypassing RLS via the view (which is the bug class we're closing).

Special attention for storefront views (`v_storefront_*`): per Iron Rule 13, the storefront reads ONLY from views + RPCs. If `security_invoker=on` causes a view to filter rows that the storefront EXPECTED (because the storefront calls anonymously), the storefront will break. Foreman must:
- Identify which views are storefront-facing.
- Verify each storefront-facing view has the right `GRANT SELECT TO anon` AND its underlying RLS policies on the BASE tables allow anon to see what the storefront needs.
- If a view would break the storefront → STOP, escalate, do NOT silently fix in a way that breaks production.

### §1.3 — F-CRIT-3: Add JWT-claim tenant validation to 24 SECURITY DEFINER RPCs

Pre-flight: Foreman queries the exact 24 RPC names + signatures via grep over `pg_proc` definitions for SECURITY DEFINER + `p_tenant_id` parameter + absence of JWT-claim validation pattern.

For each RPC, add at the top of the body:
```sql
IF p_tenant_id IS NULL OR p_tenant_id != (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid THEN
  RAISE EXCEPTION 'tenant_id mismatch or missing JWT claim';
END IF;
```
(Adjusted to existing project pattern — match the canonical RLS USING clause from CLAUDE.md §5 Rule 15.)

**Anon-callable subset (7 of 24):** For RPCs that legitimately need anon access (e.g. storefront-facing submit RPCs), Foreman must decide per-RPC:
- **A** — RPC is intentionally anon-callable + the `p_tenant_id` is derived from a trusted source (e.g. a slug lookup on a public `v_public_tenant`). In this case, keep anon-callable but validate that `p_tenant_id` matches a known-tenant slug-based lookup. Document in SPEC.
- **B** — RPC was never meant to be anon-callable. REVOKE EXECUTE FROM anon. Update callers to use the anon-safe alternative (a different RPC or Edge Function with Origin allowlist, per the SECURITY_HOTFIX_2026_05_13 §6.5 pattern).

Foreman picks A or B per RPC + documents rationale.

**Out of scope:**
- Refactoring RPC bodies beyond the JWT validation header.
- Changing RLS policies on tables (those are separate findings if any).
- Changing storefront code (unless §1.2 finds a storefront-breaking view + the fix requires storefront-side adjustment — in which case STOP + escalate).
- Other Bundle 2 findings (HIGH/MEDIUM/LOW) — those wait for future hotfix.
- Backfill of historical audit trail.

---

## 2. Critical Design Constraints

**Tenant scope:** Prizma reads + writes are limited to the function/view/RPC structural changes ONLY. No data UPDATEs on Prizma rows.

**Backup requirements:**
- Pre-edit: `pg_get_functiondef` of all 1 + 24 = 25 affected functions/RPCs.
- Pre-edit: `pg_get_viewdef` of all 17 affected views.
- All stored as JSON/SQL files under `modules/Module 1.5 - Shared Components/backups/{YYYY-MM-DD}_SECURITY_HOTFIX_2_2026_05_15/`.

**Backward compatibility:**
- §1.1: search_path restoration is invisible to callers (function behaves identically; only Postgres' resolution order is now hardened).
- §1.2: `security_invoker=on` may filter rows for unauthenticated callers; storefront views need explicit testing per §1.2.
- §1.3: callers passing a wrong tenant_id will now ERROR (was silent success on wrong tenant). This IS a behavior change — but the wrong-tenant call was a bug; we're now refusing it. Storefront callers passing tenant from session/URL must still pass the right tenant_id matching their JWT.

**SaaS-clean (Iron Rules 14, 15, 18, 20):** All fixes restore or extend the canonical patterns. No tenant-specific behavior.

**Forward-compat:** F-CRIT-3 closure adds a JWT validation header that becomes the template for all future SECURITY DEFINER RPCs. Document in opticup-strategic SKILL.md SPEC_TEMPLATE.

**Performance:** Sub-millisecond impact per RPC call (single JWT claim lookup). View metadata change has zero query-plan impact.

---

## 3. Method (high-level for Foreman)

1. **Pre-flight queries (mandatory):**
   - Query exact 17 view names per §1.2.
   - Query exact 24 RPC names + signatures + bodies per §1.3.
   - Identify anon-callable subset of 24 via `pg_proc.proacl`.
   - Identify storefront-facing views (cross-reference `opticup-storefront` repo's source for view names called via Supabase client).
   - Snapshot all 25 function bodies + 17 view definitions to backup.

2. **STOP gates before any write:**
   - If §1.2 pre-flight surfaces a storefront-facing view where `security_invoker=on` would block legitimate anon reads → STOP, escalate.
   - If §1.3 pre-flight surfaces an anon-callable RPC where Foreman cannot decide A or B per Brief — STOP, escalate.
   - If the exact counts deviate significantly (e.g. 17 views found but pre-flight says 14 or 22) — STOP, document, re-confirm scope with Daniel.

3. **Apply migrations in order via MCP `apply_migration` (idempotent per Iron Rule discipline):**
   - §1.1 first (smallest blast radius).
   - §1.2 second (per-view ALTER, can batch as one migration file but executed one ALTER at a time so partial failures are recoverable).
   - §1.3 third (largest blast radius; per-RPC `CREATE OR REPLACE` with new JWT header).

4. **Demo integration tests (per work area):**
   - §1.1: call `sync_lead_status_from_attendee` on demo; verify behavior unchanged + `proconfig` shows search_path.
   - §1.2: for each storefront-facing view fixed, curl-probe a storefront page that uses it → still HTTP 200 + still returns expected rows.
   - §1.3: for 3 random RPCs from the 24, call with WRONG tenant_id → expect ERROR. Call with RIGHT tenant_id → expect success.

5. **Reviewer verifies all success criteria.**

6. **Localhost-Tester runs smoke 7/7 PASS pre- AND post-migration.**

7. **Foreman closes** with FOREMAN_REVIEW + updates the Bundle 2 T5/T6 findings as RESOLVED.

---

## 4. Destructive Operations

Per Iron Rule 32:

1. **CREATE OR REPLACE FUNCTION** × 25 (1 in §1.1 + 24 in §1.3). Not destructive per Rule 32 (additive replace). Pre-edit body snapshots backed up.
2. **ALTER VIEW ... SET (security_invoker=on)** × 17. Metadata-only; not destructive.
3. **REVOKE EXECUTE FROM anon** × N (count from §1.3 "B" decisions). Reversible via GRANT. Declared destructive — could break a misbehaving anon caller, but THAT'S THE POINT.

**No DROP, no DELETE, no schema removal, no row deletion, no main deploys.**

Iron Rule 32 declaration: "25 CREATE OR REPLACE FUNCTION + 17 ALTER VIEW + N REVOKE FROM anon (count determined by §1.3 anon-callable decisions). No DROP, no DELETE."

---

## 5. Success Criteria

| # | Criterion | Method |
|---|---|---|
| 1 | Pre-flight queries documented in SPEC: exact 17 view names + exact 24 RPC names + anon-callable subset count + storefront-facing view count | SPEC.md grep |
| 2 | `sync_lead_status_from_attendee` post-migration: `proconfig` contains `search_path=public` | `pg_proc` query |
| 3 | 17 views post-migration: ALL have `security_invoker=on` in reloptions | `pg_class` query, count must be 0 missing |
| 4 | 24 RPCs post-migration: ALL have JWT-claim tenant validation header | grep `pg_get_functiondef` output |
| 5 | Anon-callable subset post-migration: each RPC has Option A (anon-safe with slug-based validation) OR Option B (REVOKE FROM anon) documented + applied | SPEC.md + `pg_proc.proacl` |
| 6 | Storefront-facing views: each still returns expected rows for anon callers (curl probe per view) | live storefront probe |
| 7 | Demo integration test §1.1: function call works + proconfig hardened | demo test |
| 8 | Demo integration test §1.2: storefront pages still return HTTP 200 with expected data | demo + manual probe |
| 9 | Demo integration test §1.3: 3 random RPCs reject wrong tenant_id, accept right | demo test |
| 10 | Prizma: NO data row UPDATEs/INSERTs (function/view/RPC structural changes only) | audit log check |
| 11 | Smoke 7/7 PASS pre- AND post-migration | `npm run smoke` |
| 12 | Integrity gate exit 0 | `npm run verify:integrity` |
| 13 | Bundle 2 T5/T6 findings: F-CRIT-1/2/3 all marked RESOLVED in their respective audit reports | grep |
| 14 | Supabase advisor security: 3 known CRITICAL findings GONE; no new findings introduced | `get_advisors` |
| 15 | `OPEN_TASKS.md` updated to reflect SECURITY_HOTFIX_2 closure | grep |
| 16 | Backup folder contains 25 function snapshots + 17 view snapshots pre-migration | ls |
| 17 | Repo clean at close | `git status` |

---

## 6. Notes for the Foreman

- **Pre-flight is critical.** Counts in this Brief (17/24/7) are from the morning validation. Re-run the queries before sealing the SPEC to ensure exact match.
- **§1.2 storefront verification is the highest risk** — `security_invoker=on` CAN break a view that was working around RLS. Test each storefront-facing view BEFORE the migration goes live (read the view as anon role pre-migration; pretend security_invoker is on; verify same row count).
- **§1.3 Option A vs Option B per RPC** — if Foreman is unsure for any RPC, default to Option A (safer; keeps the RPC functional with hardened validation). Only escalate if Option A introduces an obvious break.
- **Estimated effort:** 4-5 hours total (pre-flight = 30 min + §1.1 = 15 min + §1.2 = 1-1.5 hr + §1.3 = 2-2.5 hr + tests + close).
- **Mandatory backup** under `modules/Module 1.5 - Shared Components/backups/{YYYY-MM-DD}_SECURITY_HOTFIX_2_2026_05_15/`.
- **Cross-repo:** if §1.2 storefront-facing view verification surfaces an issue requiring storefront-side change → that's a separate SPEC, NOT this one.

---

## 7. Bounded Autonomy

Pipeline runs end-to-end in ONE Claude Code chat. STOP triggers (in addition to standard CLAUDE.md §9):

- Pre-flight counts deviate >5% from Brief expectations (17/24/7) → STOP, document, escalate.
- §1.2: a storefront-facing view fails the pre-migration anon-read test → STOP, escalate.
- §1.3: an anon-callable RPC cannot be cleanly assigned Option A or B → STOP, escalate.
- Demo integration test fails for any §1.x → STOP, rollback that work area, do NOT proceed.
- Smoke <7/7 PASS pre-migration → STOP.
- Advisor returns NEW findings beyond the 3 known CRITICAL → STOP, list them.

End of Brief.
