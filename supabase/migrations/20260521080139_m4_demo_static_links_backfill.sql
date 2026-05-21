-- ============================================================================
-- Migration: M4_DEMO_STATIC_LINKS_BACKFILL — backfill 2 template_static rows
-- ============================================================================
-- Source SPEC:    modules/Module 4 - CRM/docs/specs/M4_DEMO_STATIC_LINKS_BACKFILL/SPEC.md
-- Source Brief:   modules/Module 4 - CRM/architecture-brief/M4_DEMO_STATIC_LINKS_BACKFILL_BRIEF.md
-- Source Request: roles/campaign-overseer/briefs/2026-05-21_DEMO_STATIC_LINKS_BACKFILL_SPEC_REQUEST.md
-- Source Analyst: roles/campaign-overseer/analyses/2026-05-21_short_links_screen_visibility.md
--
-- Goal: insert 2 link_type='template_static' rows on the demo tenant so the
-- "קישורים סטטיים (משותפים)" screen renders 4 rows (matching prizma), enabling
-- Iron Rule 33 demo-first testing of the event_registration_open template
-- change (stock URL -> pricing-catalog URL).
--
-- Scope: demo tenant only. Prizma already has both rows (5CBy1Do4 stock,
-- CEiBGCWj pricing) and MUST NOT be touched. Additive only -- no DDL,
-- no schema change, no destructive ops. Iron Rule 32 declaration: None.
--
-- Idempotency: WHERE NOT EXISTS keyed on (tenant_id, link_type, target_url).
-- Re-running this migration after a successful first apply inserts 0 rows.
--
-- Iron Rule compliance:
--   IR14 (tenant_id NOT NULL): each INSERT supplies tenant_id explicitly.
--   IR15 (RLS): short_links carries canonical 2-policy RLS; service_role
--               (used by Supabase MCP apply_migration) bypasses per policy.
--   IR18 deviation: short_links_code_unique is global, not tenant-scoped.
--               Codes generated below avoid ALL existing codes (not just
--               demo-scoped). Separate tech-debt SPEC tracks the fix.
--   IR21 (No Duplicates): idempotency guard prevents re-insert; pre-flight
--               confirmed 0 existing rows match the (tenant_id, link_type,
--               target_url) keys before this migration.
--   IR22 (defense-in-depth): tenant_id specified explicitly.
--   IR32 (Destructive Ops): None. Additive INSERTs only.
-- ============================================================================

DO $$
DECLARE
  v_demo_tenant_id      uuid := '8d8cfa7e-ef58-49af-9702-a862d459cccb';
  v_expires_at          timestamptz := '2099-12-31 23:59:59+00';
  v_target_stock        text := 'https://www.prizma-optic.co.il/supersale-stock/';
  v_target_pricing      text := 'https://www.prizma-optic.co.il/supersalepricescatalog/';
  v_new_code            text;
  v_collision_retries   int;
  v_inserted_stock      int := 0;
  v_inserted_pricing    int := 0;
BEGIN
  -- Sanity guard: demo tenant must exist.
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = v_demo_tenant_id AND slug = 'demo') THEN
    RAISE EXCEPTION 'Demo tenant id % not found or slug mismatch -- migration aborted.', v_demo_tenant_id;
  END IF;

  -- ------------------------------------------------------------------------
  -- Row 1: stock page  (target_url = https://www.prizma-optic.co.il/supersale-stock/)
  -- ------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM short_links
    WHERE tenant_id = v_demo_tenant_id
      AND link_type = 'template_static'
      AND target_url = v_target_stock
  ) THEN
    v_collision_retries := 0;
    LOOP
      -- 8-char base62-ish code: md5 hex slice. Matches existing code shape
      -- (`f9Avttrn`, `5CBy1Do4`, etc -- mixed case alphanumeric).
      v_new_code := substr(md5(random()::text || clock_timestamp()::text || 'stock'), 1, 8);
      EXIT WHEN NOT EXISTS (SELECT 1 FROM short_links WHERE code = v_new_code);
      v_collision_retries := v_collision_retries + 1;
      IF v_collision_retries >= 5 THEN
        RAISE EXCEPTION 'Code-generation collision exhaustion (5 retries) for stock row -- migration aborted.';
      END IF;
    END LOOP;

    INSERT INTO short_links (
      tenant_id, code, target_url, link_type, expires_at,
      lead_id, event_id, broadcast_id, message_log_id
    ) VALUES (
      v_demo_tenant_id, v_new_code, v_target_stock, 'template_static', v_expires_at,
      NULL, NULL, NULL, NULL
    );
    v_inserted_stock := 1;
    RAISE NOTICE 'Inserted demo template_static row: code=%, target=%', v_new_code, v_target_stock;
  ELSE
    RAISE NOTICE 'Demo template_static row already present for target=% -- no-op.', v_target_stock;
  END IF;

  -- ------------------------------------------------------------------------
  -- Row 2: pricing-catalog page
  -- ------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM short_links
    WHERE tenant_id = v_demo_tenant_id
      AND link_type = 'template_static'
      AND target_url = v_target_pricing
  ) THEN
    v_collision_retries := 0;
    LOOP
      v_new_code := substr(md5(random()::text || clock_timestamp()::text || 'pricing'), 1, 8);
      EXIT WHEN NOT EXISTS (SELECT 1 FROM short_links WHERE code = v_new_code);
      v_collision_retries := v_collision_retries + 1;
      IF v_collision_retries >= 5 THEN
        RAISE EXCEPTION 'Code-generation collision exhaustion (5 retries) for pricing row -- migration aborted.';
      END IF;
    END LOOP;

    INSERT INTO short_links (
      tenant_id, code, target_url, link_type, expires_at,
      lead_id, event_id, broadcast_id, message_log_id
    ) VALUES (
      v_demo_tenant_id, v_new_code, v_target_pricing, 'template_static', v_expires_at,
      NULL, NULL, NULL, NULL
    );
    v_inserted_pricing := 1;
    RAISE NOTICE 'Inserted demo template_static row: code=%, target=%', v_new_code, v_target_pricing;
  ELSE
    RAISE NOTICE 'Demo template_static row already present for target=% -- no-op.', v_target_pricing;
  END IF;

  RAISE NOTICE 'M4_DEMO_STATIC_LINKS_BACKFILL applied: stock_inserted=%, pricing_inserted=%, total=%',
    v_inserted_stock, v_inserted_pricing, (v_inserted_stock + v_inserted_pricing);
END $$;

-- ============================================================================
-- Post-apply verification (read-only -- caller may run separately)
-- ============================================================================
-- SELECT count(*) FROM short_links
-- WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
--   AND link_type = 'template_static';
-- Expected: 4 (was 2 pre-apply)
--
-- SELECT count(*) FROM short_links
-- WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
--   AND link_type = 'template_static';
-- Expected: 4 (unchanged)
