-- STOREFRONT_PUBLIC_DATA_LAYER — trigger E2E test suite
-- Source: modules/Module 1.5 - Shared Components/docs/specs/STOREFRONT_PUBLIC_DATA_LAYER_2026_05_15/SPEC.md
-- Authored: 2026-05-15 (incrementally extended per commit).
-- Run as: psql / Supabase SQL editor with service_role privileges.
-- Each block is idempotent: any marker rows it creates are reverted at the end.
-- A block raises EXCEPTION on failure; on RAISE, the DO halts and the test FAILS.
-- No marker survives the suite. Net data delta = 0.
--
-- Tenant under test: demo (slug=demo, UUID=8d8cfa7e-ef58-49af-9702-a862d459cccb).
-- Never run against Prizma — markers there would touch production rows.

-- =====================================================================
-- Block 1 — branches_public (source: tenant_branches)
-- 4 cases: INSERT, UPDATE-while-visible, DELETE, UPDATE-to-invisible.
-- =====================================================================

DO $$
DECLARE
  v_marker_id uuid;
  v_cnt int;
BEGIN
  INSERT INTO public.tenant_branches (tenant_id, slug, name_he, street_he, city_he, display_order)
  VALUES ('8d8cfa7e-ef58-49af-9702-a862d459cccb', '__e2e_marker_branches_2026_05_15__',
          'E2E Marker Branch', 'E2E Street', 'E2E City', 999)
  RETURNING id INTO v_marker_id;

  SELECT count(*) INTO v_cnt FROM public.branches_public WHERE id = v_marker_id;
  IF v_cnt <> 1 THEN RAISE EXCEPTION 'E2E branches-1 FAIL — INSERT not mirrored (got %)', v_cnt; END IF;

  UPDATE public.tenant_branches SET name_he='E2E Marker Branch (Updated)' WHERE id = v_marker_id;
  IF (SELECT name_he FROM public.branches_public WHERE id = v_marker_id) <> 'E2E Marker Branch (Updated)'
    THEN RAISE EXCEPTION 'E2E branches-2 FAIL — UPDATE-while-visible did not propagate'; END IF;

  DELETE FROM public.tenant_branches WHERE id = v_marker_id;
  IF (SELECT count(*) FROM public.branches_public WHERE id = v_marker_id) <> 0
    THEN RAISE EXCEPTION 'E2E branches-3 FAIL — DELETE did not remove mirror row'; END IF;

  INSERT INTO public.tenant_branches (tenant_id, slug, name_he, street_he, city_he, status, display_order)
  VALUES ('8d8cfa7e-ef58-49af-9702-a862d459cccb', '__e2e_marker_branches_v2__',
          'E2E Visibility Test', 'E2E Street', 'E2E City', 'published', 998)
  RETURNING id INTO v_marker_id;

  UPDATE public.tenant_branches SET status='draft' WHERE id = v_marker_id;
  IF (SELECT count(*) FROM public.branches_public WHERE id = v_marker_id) <> 0
    THEN RAISE EXCEPTION 'E2E branches-4 FAIL — status=draft flip did not remove mirror row'; END IF;

  DELETE FROM public.tenant_branches WHERE id = v_marker_id;
  RAISE NOTICE 'branches_public E2E 4/4 PASS.';
END;
$$;

-- =====================================================================
-- Block 2 — storefront_config_public (source: storefront_config)
-- 3 state-transition cases on demo's existing row. Original state restored.
-- Pure INSERT/DELETE not run (table has effective per-tenant uniqueness).
-- =====================================================================

DO $$
DECLARE
  v_demo uuid := '8d8cfa7e-ef58-49af-9702-a862d459cccb';
  v_row_id uuid;
  v_orig_enabled boolean;
  v_orig_hero text;
  v_cnt int;
BEGIN
  SELECT id, enabled, hero_title INTO v_row_id, v_orig_enabled, v_orig_hero
    FROM public.storefront_config WHERE tenant_id = v_demo;

  UPDATE public.storefront_config SET enabled=true WHERE id = v_row_id;
  IF (SELECT count(*) FROM public.storefront_config_public WHERE id = v_row_id) <> 1 THEN
    UPDATE public.storefront_config SET enabled=v_orig_enabled, hero_title=v_orig_hero WHERE id=v_row_id;
    RAISE EXCEPTION 'E2E config-1 FAIL — UPDATE-to-visible did not insert into mirror';
  END IF;

  UPDATE public.storefront_config SET hero_title='__E2E_TEST_TITLE__' WHERE id = v_row_id;
  IF (SELECT hero_title FROM public.storefront_config_public WHERE id = v_row_id) <> '__E2E_TEST_TITLE__' THEN
    UPDATE public.storefront_config SET enabled=v_orig_enabled, hero_title=v_orig_hero WHERE id=v_row_id;
    RAISE EXCEPTION 'E2E config-2 FAIL — UPDATE-while-visible hero_title did not propagate';
  END IF;

  UPDATE public.storefront_config SET enabled=false WHERE id = v_row_id;
  IF (SELECT count(*) FROM public.storefront_config_public WHERE id = v_row_id) <> 0 THEN
    UPDATE public.storefront_config SET enabled=v_orig_enabled, hero_title=v_orig_hero WHERE id=v_row_id;
    RAISE EXCEPTION 'E2E config-3 FAIL — UPDATE-to-invisible did not remove mirror row';
  END IF;

  UPDATE public.storefront_config SET enabled=v_orig_enabled, hero_title=v_orig_hero WHERE id=v_row_id;
  RAISE NOTICE 'storefront_config_public E2E 3/3 PASS — demo row restored.';
END;
$$;

-- =====================================================================
-- Block 3 — media_public (source: media_library)
-- 5 cases: INSERT, UPDATE-while-visible, soft-delete, undelete, hard DELETE.
-- =====================================================================

DO $$
DECLARE
  v_demo uuid := '8d8cfa7e-ef58-49af-9702-a862d459cccb';
  v_marker_id uuid;
BEGIN
  INSERT INTO public.media_library (tenant_id, filename, original_filename, storage_path, mime_type, title)
  VALUES (v_demo, '__e2e_marker_media__.webp', '__e2e_orig__.webp', 'e2e-test/__marker__.webp', 'image/webp', 'E2E Marker Media')
  RETURNING id INTO v_marker_id;
  IF (SELECT count(*) FROM public.media_public WHERE id = v_marker_id) <> 1
    THEN DELETE FROM public.media_library WHERE id = v_marker_id;
         RAISE EXCEPTION 'E2E media-1 FAIL — INSERT not mirrored'; END IF;

  UPDATE public.media_library SET title='E2E Marker Media (Updated)' WHERE id = v_marker_id;
  IF (SELECT title FROM public.media_public WHERE id = v_marker_id) <> 'E2E Marker Media (Updated)'
    THEN DELETE FROM public.media_library WHERE id = v_marker_id;
         RAISE EXCEPTION 'E2E media-2 FAIL — UPDATE not propagated'; END IF;

  UPDATE public.media_library SET is_deleted=true WHERE id = v_marker_id;
  IF (SELECT count(*) FROM public.media_public WHERE id = v_marker_id) <> 0
    THEN DELETE FROM public.media_library WHERE id = v_marker_id;
         RAISE EXCEPTION 'E2E media-3 FAIL — soft-delete did not remove mirror row'; END IF;

  UPDATE public.media_library SET is_deleted=false WHERE id = v_marker_id;
  IF (SELECT count(*) FROM public.media_public WHERE id = v_marker_id) <> 1
    THEN DELETE FROM public.media_library WHERE id = v_marker_id;
         RAISE EXCEPTION 'E2E media-4 FAIL — undelete did not restore mirror row'; END IF;

  DELETE FROM public.media_library WHERE id = v_marker_id;
  IF (SELECT count(*) FROM public.media_public WHERE id = v_marker_id) <> 0
    THEN RAISE EXCEPTION 'E2E media-5 FAIL — hard DELETE did not remove mirror row'; END IF;

  RAISE NOTICE 'media_public E2E 5/5 PASS.';
END;
$$;

-- Blocks 4-6 (brands_public, inventory_images_public, inventory_public) added in Commit 3.

SELECT 'STOREFRONT_PUBLIC_DATA_LAYER trigger E2E suite — blocks 1-3 complete.' AS status;
