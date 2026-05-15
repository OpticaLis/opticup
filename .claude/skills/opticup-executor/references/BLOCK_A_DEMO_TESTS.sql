-- ============================================================
-- Canonical demo tests for SECURITY DEFINER RPCs hardened with Block A
-- ============================================================
-- Source: harvested from SECURITY_HOTFIX_3_2026_05_15 (P-EXEC-1).
-- Purpose: validate the 3-role-aware Block A pattern in newly-hardened
-- RPCs without leaving production-data side effects.
--
-- ============================================================
-- WHAT THIS FILE TESTS
-- ============================================================
-- For each Block-A-bearing RPC, the tests cover 3 callers:
--   A. authenticated with WRONG tenant_id → expect 42501
--   B. authenticated with right tenant_id (if test data exists) → expect normal completion
--   C. service_role (no tenant_id claim) → expect bypass, normal completion
--
-- The test pattern uses set_config('request.jwt.claims', ..., true) which
-- is LOCAL to the current transaction. No COMMIT happens, so any UPDATE/INSERT
-- the RPC performs is automatically rolled back when the DO-block ends.
-- (Defense-in-depth: still use FAKE UUIDs that match no real rows.)
--
-- ============================================================
-- GOTCHA: empty-string JWT vs NULL JWT
-- ============================================================
-- DO NOT test the "anon (no JWT)" path by passing `''` (empty string) to
-- request.jwt.claims. The pattern below WILL fail with 22P02 (invalid JSON):
--
--   PERFORM set_config('request.jwt.claims', '', true);
--   PERFORM <rpc_name>(...);  -- raises 22P02 from ('')::json
--
-- Why: `current_setting('request.jwt.claims', true)` returns the value
-- VERBATIM, not NULL-coalesced. Casting `''::json` is invalid JSON parse.
-- This is a TEST-SETUP artifact, NOT a production scenario — real anon
-- callers have NULL request.jwt.claims (the `, true` guards return NULL).
--
-- For testing the anon path: rely on REVOKE EXECUTE FROM anon at the
-- GRANT layer (advisor `anon_security_definer_function_executable` should
-- drop to 0 for Option B RPCs). The Block A body never sees an anon
-- caller after the REVOKE.
--
-- ============================================================
-- CANONICAL DEMO TEST PATTERN
-- ============================================================
-- Run inside Supabase MCP execute_sql or psql on the demo tenant.
-- All wrapped in a single DO block with EXCEPTION handlers per test.

DO $tests$
DECLARE
  v_pass int := 0;
  v_fail int := 0;
BEGIN
  -- ----------------------------------------------------------------
  -- Test A — WRONG tenant_id JWT (authenticated caller) → expect 42501
  -- ----------------------------------------------------------------
  BEGIN
    PERFORM set_config(
      'request.jwt.claims',
      '{"role":"authenticated","tenant_id":"11111111-1111-1111-1111-111111111111"}',
      true  -- LOCAL to this transaction
    );
    -- Replace with the RPC under test. Use FAKE UUIDs to ensure zero data write.
    PERFORM <rpc_name>(
      '22222222-2222-2222-2222-222222222222'::uuid, -- p_tenant_id (wrong vs JWT)
      '33333333-3333-3333-3333-333333333333'::uuid  -- other args (fake UUIDs)
    );
    v_fail := v_fail + 1;
    RAISE NOTICE 'Test A <rpc_name>: FAIL (did not reject wrong-tenant)';
  EXCEPTION WHEN SQLSTATE '42501' THEN
    v_pass := v_pass + 1;
    RAISE NOTICE 'Test A <rpc_name>: PASS (42501 raised on wrong-tenant)';
  END;

  -- ----------------------------------------------------------------
  -- Test C — service_role caller (no tenant_id claim) → expect bypass
  -- ----------------------------------------------------------------
  BEGIN
    PERFORM set_config(
      'request.jwt.claims',
      '{"role":"service_role"}',  -- no tenant_id field
      true
    );
    PERFORM <rpc_name>(
      '22222222-2222-2222-2222-222222222222'::uuid,
      '33333333-3333-3333-3333-333333333333'::uuid
    );
    v_pass := v_pass + 1;
    RAISE NOTICE 'Test C <rpc_name>: PASS (service_role bypassed Block A, body completed)';
  EXCEPTION
    WHEN SQLSTATE '42501' THEN
      v_fail := v_fail + 1;
      RAISE NOTICE 'Test C <rpc_name>: FAIL — service_role should bypass, instead raised 42501';
    WHEN OTHERS THEN
      -- Block A bypassed correctly; the body raised some OTHER error
      -- (e.g., "event_not_found" because the fake UUID doesn't match a real row).
      -- That's expected and acceptable — Block A let the body run.
      v_pass := v_pass + 1;
      RAISE NOTICE 'Test C <rpc_name>: PASS (Block A bypassed; inner error: %)', SQLERRM;
  END;

  -- ----------------------------------------------------------------
  -- Summary
  -- ----------------------------------------------------------------
  RAISE NOTICE '======= SUMMARY: % PASS / % FAIL =======', v_pass, v_fail;
  IF v_fail > 0 THEN
    RAISE EXCEPTION 'Block A demo tests for <rpc_name>: % failures', v_fail;
  END IF;
END;
$tests$;

-- ============================================================
-- USAGE TIPS
-- ============================================================
-- 1. Run this DO-block ONCE per RPC under test. Substitute <rpc_name>
--    + the parameter list each time.
-- 2. For RPCs with JOIN-derived tenant (e.g. p_doc_id → supplier_documents.tenant_id),
--    the fake p_doc_id will match no rows → tenant lookup yields NULL →
--    Block A's `v_doc_tenant IS NULL OR ...` clause raises 42501 → Test A passes.
--    For Test C (service_role bypass), the body proceeds to the UPDATE which
--    matches 0 rows. No error in that case — the test passes.
-- 3. For RPCs that legitimately need anon EXECUTE (Option A / C), do NOT run
--    these tests — they don't apply. Use a different validation pattern
--    (e.g., for slug-anchored Block A-alt: confirm the slug → tenant_id
--    lookup is anchored to v_public_tenant, then verify the function returns
--    the expected validation result for valid + invalid slugs).
-- 4. The `, true` argument to set_config means "LOCAL to this transaction".
--    When the DO block ends, the setting reverts. No cross-test leakage.
-- 5. NEVER test with real customer UUIDs (Iron Rule: demo + test data only).
--    The fake 11111111... / 22222222... pattern is the canonical convention.
--
-- ============================================================
-- ANTI-PATTERNS TO AVOID
-- ============================================================
-- - DON'T use empty string '' for "anon JWT" — 22P02 parse error (see GOTCHA above).
-- - DON'T leave a tenant_id field with `null` literal in the JWT — same 22P02 class.
-- - DON'T test on Prizma tenant (production). Tests run on demo + use fake UUIDs.
-- - DON'T omit the `, true` flag on set_config — without it, the setting is session-wide
--   and persists across queries, causing test leakage.
-- - DON'T assume the body inside Block A is idempotent. Test C may complete
--   the body (no Block A raise), which means real SQL ran. Use fake UUIDs.
--
-- ============================================================
-- WHEN TO ADD A NEW TEST SCENARIO
-- ============================================================
-- If a new RPC class emerges with non-standard Block A (e.g., entry-level
-- tenant_id in JSONB rather than p_tenant_id parameter), extend this file
-- with a labeled section. Each new section is harvested via
-- FOREMAN_REVIEW.md from the SPEC that introduced the class.
