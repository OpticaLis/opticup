# Escalation: SECURITY_HOTFIX_2 §3a Block A — JWT header is BOTH too lax (NULL-comparison loophole) AND too strict (breaks service_role Edge Function callers)

> Created by: opticup-executor (Step 1.5 + Step 1 SPEC validation)
> Created at: 2026-05-15T10:10:00Z
> SPEC: modules/Module 1.5 - Shared Components/docs/specs/SECURITY_HOTFIX_2_2026_05_15/SPEC.md
> Status: OPEN

---

**Stuck at:** SPEC §3a Block A definition. Pre-execution grep + precedent review surfaced two defects in the proposed header. Neither was caught by the Foreman.

**What I found:**

### Defect 1 — NULL-comparison loophole (header is silently NO-OP for anon callers without JWT)

SPEC §3a Block A as written:
```sql
IF p_tenant_id IS NULL OR p_tenant_id != ((current_setting('request.jwt.claims', true)::json ->> 'tenant_id'::text))::uuid THEN
  RAISE EXCEPTION 'tenant_id mismatch or missing JWT claim (security_hotfix_2)';
END IF;
```

If a caller has NO JWT (e.g. anon without auth header, OR service_role's JWT which has no `tenant_id` claim):
- `current_setting('request.jwt.claims', true)::json ->> 'tenant_id'` → NULL
- `NULL::uuid` → NULL
- `p_tenant_id != NULL` → NULL (NOT TRUE — Postgres `!= NULL` is NULL, not false-y-but-truthy in IF)
- `p_tenant_id IS NULL OR NULL` → NULL (if p_tenant_id is provided, the OR is NULL)
- `IF NULL THEN ...` → does NOT fire RAISE EXCEPTION

**Consequence:** Block A literally never blocks anon callers, defeating the entire purpose of F-CRIT-3 closure. The header looks like it validates, but doesn't.

### Defect 2 — Even with fixed NULL handling, breaks Edge Function callers using service_role

Pre-flight grep against `supabase/functions/` shows multiple Edge Functions create a Supabase client with `SERVICE_ROLE_KEY`:
- `resolve-link/index.ts`, `lead-intake/index.ts` → call `_record_touchpoint` (Block A target)
- `translate-content/index.ts` → calls `create_translated_page` (Block A target)
- Pattern repeated in `event-register`, `dispatch-queue`, `whatsapp-catalog-flow` (use service_role for other RPCs not in the 24)

Service_role JWT has claims `{ role: "service_role", iss: "supabase", ... }` — **no `tenant_id` claim**.

If we tighten Block A using the canonical pattern from prior `SECURITY_HOTFIX_2026_05_13` §6.4 (which uses `nullif + IS NULL OR <>`):
```sql
DECLARE
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
BEGIN
  IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
  END IF;
```
Then service_role callers fail (`v_jwt_tenant IS NULL` → exception) and Edge Functions break.

The prior hotfix avoided this by NOT adding the JWT header to RPCs that service_role calls — they were either revoked-anon-only (no header) or moved behind a service_role-only EF. My SPEC doesn't make that distinction; Block A applies to all 24 RPCs including the EF-called ones.

### The conflict

Block A must:
1. Reject anon callers (no tenant_id claim) — defect 1 prevents this
2. Reject authenticated callers passing a wrong tenant_id — both versions handle this
3. Allow service_role callers (Edge Functions) to proceed — defect 2 prevents this in the strict version

**The correct pattern that handles all three (proposed):**
```sql
DECLARE
  v_jwt_role text := ((current_setting('request.jwt.claims', true))::json ->> 'role');
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
BEGIN
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;
  -- … original body follows …
```

Behavior:
- **service_role:** bypassed (matches the canonical RLS `service_bypass` policy pattern from Iron Rule 15)
- **authenticated:** must have JWT tenant_id matching p_tenant_id, else 42501
- **anon:** `v_jwt_role` is `'anon'` (anon's JWT has `role: anon`), so fails the inner check unless tenant matches — and anon has no tenant_id claim → 42501

This pattern aligns with:
- Prior hotfix's `nullif + IS NULL OR <>` strictness for non-service_role
- Canonical Iron Rule 15 two-policy pattern (service_bypass + tenant_isolation)
- Edge Functions' service_role usage

**What I tried:**
- Re-read SECURITY_HOTFIX_2026_05_13 SPEC §6.4 — confirmed the prior hotfix used a stricter pattern WITHOUT a service_role bypass. That hotfix avoided the issue by only adding JWT headers to RPCs called exclusively by authenticated context. My SPEC's 24 RPCs include EF-called ones.
- Pre-flight greps:
  - `_record_touchpoint` callers: `supabase/functions/resolve-link/index.ts`, `supabase/functions/lead-intake/index.ts` (both service_role)
  - `create_translated_page` callers: ERP studio (authenticated via PIN), `supabase/functions/translate-content/index.ts` (service_role), and `opticup-storefront/scripts/translate-direct.cjs` (anon-key CLI dev script — NOT production)
  - `is_feature_enabled` callers: `shared/js/plan-helpers.js` (authenticated context only)
  - `check_plan_limit`, admin tenant ops: all authenticated platform-admin context
- Verified via SQL probe: `current_setting('request.jwt.claims', true)` returns NULL when called from MCP (postgres role / superuser bypass), but PostgREST routes JWT claims into this setting.

**Options I see:**
- **Option A — Adopt the proposed 3-role-aware pattern (service_role bypass + strict non-service_role check).** _Pros:_ closes F-CRIT-3 for real, doesn't break Edge Functions. Aligns with Iron Rule 15 two-policy paradigm. _Cons:_ Block A grows from 3 lines to 7; service_role bypass increases blast radius if service_role key ever leaks (already a worst-case scenario anyway since service_role bypasses RLS).
- **Option B — Keep SPEC §3a Block A literal (NULL-comparison loophole intact), only add Block C revokes for Option B subset.** _Pros:_ literal SPEC compliance; Edge Functions keep working. _Cons:_ F-CRIT-3 isn't actually closed — the JWT header is decorative; anon with valid EXECUTE grant could still slip through if any Option B candidate is later mis-assigned to A.
- **Option C — Skip §1.3 JWT header for the 5–7 EF-called RPCs (`_record_touchpoint`, `create_translated_page`, `import_leads_from_monday`, `restore_event_from_log`, possibly others), apply tight check on the remaining 17–19.** _Pros:_ no service_role breakage. _Cons:_ leaves a partial fix; the EF-called RPCs still accept any p_tenant_id from a misbehaving service_role caller (but service_role is already trusted — by definition that's not the attack surface F-CRIT-3 covers).
- **Option D — STOP this hotfix. Foreman amends SPEC §3a to specify Option A's 3-role pattern explicitly, re-runs pre-flight to confirm no EF callers fall through service_role bypass.** _Pros:_ cleanest. _Cons:_ delays closure; another Foreman cycle.

**My recommendation:** **Option A.** The 3-role-aware pattern is the technically correct closure of F-CRIT-3. It aligns with Iron Rule 15's `service_bypass` paradigm (service_role is already trusted; bypassing the JWT check for it parallels how the two-policy RLS pattern lets service_role read all rows). The 4 extra lines per function are cheap, and Block A becomes a reusable template for future SECURITY DEFINER RPCs. The FOREMAN_REVIEW will harvest "Block A must handle service_role explicitly" as an author-skill improvement for the next hotfix authoring template.

**Question for Architect:** Should I adopt Option A (3-role-aware JWT header that bypasses service_role + strictly validates authenticated/anon), Option C (skip header on 5–7 EF-called RPCs), keep Option B (literal but functionally no-op), or Option D (abort + amend SPEC)?

---

## Architect Decision (filled in by Architect from Cowork, then ingested by the paused skill)

**Resolution:** Option A — adopt 3-role-aware Block A (service_role bypass + strict non-service_role check).

**Reasoning for Foreman/Executor:** Closes F-CRIT-3 properly while preserving Edge Function operation. The 3-role-aware pattern parallels Iron Rule 15's two-policy `service_bypass + tenant_isolation` paradigm at the RPC level: service_role is already a trusted privileged role (its leakage is a worse incident than F-CRIT-3 by orders of magnitude), so bypassing the JWT check for it is correct. Authenticated callers must match JWT `tenant_id` claim. Anon callers (with `role: anon` claim) fail the strict check. The 4 extra lines per RPC are cheap. Block A-alt (slug-based, for `verify_campaign_page_password`) stays as-is — its per-page password check is the actual auth boundary.

**Resume instruction:** Apply 3-role-aware Block A from the recommendation block above to all 24 RPCs in §1.3. Block A-alt remains unchanged for `verify_campaign_page_password`. Document the SPEC §3a amendment in EXECUTION_REPORT.md §4 Deviations + §5 Decisions in Real Time. FOREMAN_REVIEW will harvest "Block A must explicitly handle service_role + use nullif + IS DISTINCT FROM 'service_role'" as an author-skill improvement for the SPEC_TEMPLATE.md. CLI dev-script `opticup-storefront/scripts/translate-direct.cjs` line 108 calling `create_translated_page` with anon key will break post-migration — log in FINDINGS.md as a follow-up SPEC for the storefront repo (executor doesn't fix dev tooling here; one concern per task).

Decided 2026-05-15T10:15Z by Daniel via AskUserQuestion in the same chat.

---

## Resolution log

Once the Architect's decision is pasted in above AND the pipeline successfully resumes, prepend `RESOLVED_` to this file's name.
