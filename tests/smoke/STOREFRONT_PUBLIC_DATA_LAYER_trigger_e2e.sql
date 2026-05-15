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

-- =====================================================================
-- Block 4 — brands_public (source: brands)
-- 5 cases: INSERT, UPDATE, UPDATE-to-invisible (active=false), re-active, DELETE.
-- =====================================================================

DO $$
DECLARE
  v_demo uuid := '8d8cfa7e-ef58-49af-9702-a862d459cccb';
  v_marker_id uuid;
BEGIN
  INSERT INTO public.brands (tenant_id, name, slug)
  VALUES (v_demo, '__E2E_Marker_Brand__', '__e2e_brand__')
  RETURNING id INTO v_marker_id;
  IF (SELECT count(*) FROM public.brands_public WHERE id=v_marker_id) <> 1
    THEN DELETE FROM public.brands WHERE id=v_marker_id;
         RAISE EXCEPTION 'E2E brands-1 FAIL'; END IF;

  UPDATE public.brands SET name='__E2E_Marker_Brand_Updated__' WHERE id=v_marker_id;
  IF (SELECT name FROM public.brands_public WHERE id=v_marker_id) <> '__E2E_Marker_Brand_Updated__'
    THEN DELETE FROM public.brands WHERE id=v_marker_id;
         RAISE EXCEPTION 'E2E brands-2 FAIL'; END IF;

  UPDATE public.brands SET active=false WHERE id=v_marker_id;
  IF (SELECT count(*) FROM public.brands_public WHERE id=v_marker_id) <> 0
    THEN DELETE FROM public.brands WHERE id=v_marker_id;
         RAISE EXCEPTION 'E2E brands-3 FAIL — active=false did not remove mirror row'; END IF;

  UPDATE public.brands SET active=true WHERE id=v_marker_id;
  IF (SELECT count(*) FROM public.brands_public WHERE id=v_marker_id) <> 1
    THEN DELETE FROM public.brands WHERE id=v_marker_id;
         RAISE EXCEPTION 'E2E brands-4 FAIL'; END IF;

  DELETE FROM public.brands WHERE id=v_marker_id;
  IF (SELECT count(*) FROM public.brands_public WHERE id=v_marker_id) <> 0
    THEN RAISE EXCEPTION 'E2E brands-5 FAIL'; END IF;
  RAISE NOTICE 'brands_public E2E 5/5 PASS.';
END;
$$;

-- =====================================================================
-- Block 5 — inventory_images_public (source: inventory_images)
-- 3 cases: INSERT, UPDATE, DELETE. Uses an existing demo inventory row for FK.
-- =====================================================================

DO $$
DECLARE
  v_demo uuid := '8d8cfa7e-ef58-49af-9702-a862d459cccb';
  v_inv_id uuid;
  v_marker_id uuid;
BEGIN
  SELECT id INTO v_inv_id FROM public.inventory WHERE tenant_id=v_demo LIMIT 1;
  IF v_inv_id IS NULL THEN RAISE EXCEPTION 'E2E inv_images setup FAIL — no demo inventory row'; END IF;

  INSERT INTO public.inventory_images (tenant_id, inventory_id, storage_path, url, sort_order)
  VALUES (v_demo, v_inv_id, 'e2e-test/__marker__.webp', 'https://example.com/__marker__.webp', 99)
  RETURNING id INTO v_marker_id;
  IF (SELECT count(*) FROM public.inventory_images_public WHERE id=v_marker_id) <> 1
    THEN DELETE FROM public.inventory_images WHERE id=v_marker_id;
         RAISE EXCEPTION 'E2E inv_images-1 FAIL'; END IF;

  UPDATE public.inventory_images SET sort_order=88 WHERE id=v_marker_id;
  IF (SELECT sort_order FROM public.inventory_images_public WHERE id=v_marker_id) <> 88
    THEN DELETE FROM public.inventory_images WHERE id=v_marker_id;
         RAISE EXCEPTION 'E2E inv_images-2 FAIL'; END IF;

  DELETE FROM public.inventory_images WHERE id=v_marker_id;
  IF (SELECT count(*) FROM public.inventory_images_public WHERE id=v_marker_id) <> 0
    THEN RAISE EXCEPTION 'E2E inv_images-3 FAIL'; END IF;
  RAISE NOTICE 'inventory_images_public E2E 3/3 PASS.';
END;
$$;

-- =====================================================================
-- Block 6 — inventory_public + 2 satellite triggers (ai_content + inventory_images)
-- 6 cases: visibility-by-image, image-add satellite, UPDATE,
--          ai_content satellite INSERT, ai_content satellite UPDATE,
--          last-image-DELETE removes mirror.
-- product_type must be 'eyeglasses' or 'sunglasses' (CHECK constraint).
-- =====================================================================

DO $$
DECLARE
  v_demo uuid := '8d8cfa7e-ef58-49af-9702-a862d459cccb';
  v_brand_id uuid;
  v_inv_id uuid;
  v_img_id uuid;
  v_ai_id uuid;
BEGIN
  SELECT id INTO v_brand_id FROM public.brands
   WHERE tenant_id=v_demo AND active=true AND COALESCE(exclude_website,false)=false
     AND (brand_page_visibility IS NULL OR brand_page_visibility <> 'hidden')
   LIMIT 1;
  IF v_brand_id IS NULL THEN RAISE EXCEPTION 'E2E inv setup FAIL — no eligible demo brand'; END IF;

  INSERT INTO public.inventory (tenant_id, brand_id, barcode, model, color, size, quantity, product_type, website_sync)
  VALUES (v_demo, v_brand_id, 'E2E99999', 'E2E Marker Model', 'Black', 'M', 5, 'eyeglasses', 'full')
  RETURNING id INTO v_inv_id;
  IF (SELECT count(*) FROM public.inventory_public WHERE id=v_inv_id) <> 0
    THEN DELETE FROM public.inventory WHERE id=v_inv_id;
         RAISE EXCEPTION 'E2E inv-1 FAIL — visible without image'; END IF;

  INSERT INTO public.inventory_images (tenant_id, inventory_id, storage_path, url, sort_order)
  VALUES (v_demo, v_inv_id, 'e2e-test/__inv_marker__.webp', 'https://example.com/__inv_marker__.webp', 1)
  RETURNING id INTO v_img_id;
  IF (SELECT count(*) FROM public.inventory_public WHERE id=v_inv_id) <> 1
     OR (SELECT array_length(image_paths,1) FROM public.inventory_public WHERE id=v_inv_id) <> 1
    THEN DELETE FROM public.inventory_images WHERE id=v_img_id;
         DELETE FROM public.inventory WHERE id=v_inv_id;
         RAISE EXCEPTION 'E2E inv-2 FAIL — image satellite did not bring to visibility'; END IF;

  UPDATE public.inventory SET model='E2E Marker Model (Updated)' WHERE id=v_inv_id;
  IF (SELECT model FROM public.inventory_public WHERE id=v_inv_id) <> 'E2E Marker Model (Updated)'
    THEN DELETE FROM public.inventory_images WHERE id=v_img_id;
         DELETE FROM public.inventory WHERE id=v_inv_id;
         RAISE EXCEPTION 'E2E inv-3 FAIL'; END IF;

  INSERT INTO public.ai_content (tenant_id, entity_type, entity_id, content_type, content, language, status)
  VALUES (v_demo, 'product', v_inv_id, 'description', 'E2E AI description', 'he', 'auto')
  RETURNING id INTO v_ai_id;
  IF (SELECT ai_description FROM public.inventory_public WHERE id=v_inv_id) <> 'E2E AI description'
    THEN DELETE FROM public.ai_content WHERE id=v_ai_id;
         DELETE FROM public.inventory_images WHERE id=v_img_id;
         DELETE FROM public.inventory WHERE id=v_inv_id;
         RAISE EXCEPTION 'E2E inv-4 FAIL — ai_content satellite INSERT did not propagate'; END IF;

  UPDATE public.ai_content SET content='E2E AI description (Updated)' WHERE id=v_ai_id;
  IF (SELECT ai_description FROM public.inventory_public WHERE id=v_inv_id) <> 'E2E AI description (Updated)'
    THEN DELETE FROM public.ai_content WHERE id=v_ai_id;
         DELETE FROM public.inventory_images WHERE id=v_img_id;
         DELETE FROM public.inventory WHERE id=v_inv_id;
         RAISE EXCEPTION 'E2E inv-5 FAIL — ai_content satellite UPDATE did not propagate'; END IF;

  DELETE FROM public.inventory_images WHERE id=v_img_id;
  IF (SELECT count(*) FROM public.inventory_public WHERE id=v_inv_id) <> 0
    THEN DELETE FROM public.ai_content WHERE id=v_ai_id;
         DELETE FROM public.inventory WHERE id=v_inv_id;
         RAISE EXCEPTION 'E2E inv-6 FAIL — last image DELETE did not remove mirror row'; END IF;

  DELETE FROM public.ai_content WHERE id=v_ai_id;
  DELETE FROM public.inventory WHERE id=v_inv_id;
  RAISE NOTICE 'inventory_public + satellites E2E 6/6 PASS.';
END;
$$;

SELECT 'STOREFRONT_PUBLIC_DATA_LAYER trigger E2E suite — all 6 blocks complete. Total cases: 4+3+5+5+3+6 = 26.' AS status;
