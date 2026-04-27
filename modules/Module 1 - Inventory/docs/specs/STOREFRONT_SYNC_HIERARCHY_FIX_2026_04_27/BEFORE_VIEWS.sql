-- BEFORE_VIEWS.sql — verbatim DDL of v_storefront_products and v_storefront_brands
-- Captured 2026-04-27 via pg_get_viewdef() BEFORE this SPEC's view rewrite.
-- For §6 rollback: re-apply each block via apply_migration to restore prior state.

-- ============================================================================
-- v_storefront_products (BEFORE)
-- ============================================================================
CREATE OR REPLACE VIEW public.v_storefront_products AS
 SELECT i.id,
    i.tenant_id,
    i.barcode,
    b.name AS brand_name,
    b.id AS brand_id,
    b.brand_type,
    i.model,
    i.color,
    i.size,
    i.quantity,
    i.product_type,
    i.sell_price,
    i.sell_discount,
    i.website_sync,
    b.display_mode,
    i.display_mode_override,
    COALESCE(( SELECT json_agg('/api/image/'::text || img.storage_path ORDER BY img.sort_order, img.created_at) AS json_agg
           FROM inventory_images img
          WHERE img.inventory_id = i.id), '[]'::json) AS images,
    lower((((((COALESCE(b.name, ''::text) || ' '::text) || COALESCE(i.model, ''::text)) || ' '::text) || COALESCE(i.color, ''::text)) || ' '::text) || COALESCE(i.barcode, ''::text)) AS search_text,
    COALESCE(i.display_mode_override, b.display_mode, 'catalog'::text) AS resolved_mode,
    ( SELECT ai_content.content
           FROM ai_content
          WHERE ai_content.entity_type = 'product'::text AND ai_content.entity_id = i.id AND ai_content.content_type = 'description'::text AND ai_content.language = 'he'::text AND ai_content.is_deleted = false
          ORDER BY ai_content.version DESC
         LIMIT 1) AS ai_description,
    ( SELECT ai_content.content
           FROM ai_content
          WHERE ai_content.entity_type = 'product'::text AND ai_content.entity_id = i.id AND ai_content.content_type = 'seo_title'::text AND ai_content.language = 'he'::text AND ai_content.is_deleted = false
          ORDER BY ai_content.version DESC
         LIMIT 1) AS ai_seo_title,
    ( SELECT ai_content.content
           FROM ai_content
          WHERE ai_content.entity_type = 'product'::text AND ai_content.entity_id = i.id AND ai_content.content_type = 'seo_description'::text AND ai_content.language = 'he'::text AND ai_content.is_deleted = false
          ORDER BY ai_content.version DESC
         LIMIT 1) AS ai_seo_description
   FROM inventory i
     JOIN brands b ON i.brand_id = b.id
  WHERE i.is_deleted = false
    AND b.active = true
    AND b.exclude_website IS NOT TRUE
    AND COALESCE(i.display_mode_override, b.display_mode, 'catalog'::text) <> 'hidden'::text
    AND (i.website_sync = ANY (ARRAY['full'::text, 'display'::text]))
    AND (i.website_sync = 'display'::text OR i.website_sync = 'full'::text AND i.quantity > 0)
    AND (EXISTS ( SELECT 1
           FROM inventory_images img
          WHERE img.inventory_id = i.id))
    AND i.barcode IS NOT NULL;

-- ============================================================================
-- v_storefront_brands (BEFORE)
-- ============================================================================
CREATE OR REPLACE VIEW public.v_storefront_brands AS
 SELECT b.id AS brand_id,
    b.tenant_id,
    b.name AS brand_name,
    b.slug,
    b.hero_image,
    b.video_url,
    b.logo_url,
    b.brand_description,
    b.brand_description_short,
    ( SELECT jsonb_agg(ml.storage_path ORDER BY arr.idx) AS jsonb_agg
           FROM jsonb_array_elements_text(b.brand_gallery) WITH ORDINALITY arr(val, idx)
             LEFT JOIN media_library ml ON ml.id = arr.val::uuid AND ml.is_deleted = false
          WHERE ml.storage_path IS NOT NULL) AS brand_gallery,
    b.seo_title,
    b.seo_description,
    b.brand_page_enabled,
    b.display_mode,
    b.brand_page_visibility,
    b.show_brand_products,
    count(DISTINCT i.id) FILTER (WHERE i.is_deleted = false
        AND (i.website_sync = ANY (ARRAY['full'::text, 'display'::text]))
        AND (i.website_sync = 'display'::text OR i.quantity > 0)
        AND COALESCE(i.display_mode_override, b.display_mode, 'catalog'::text) <> 'hidden'::text
        AND (EXISTS ( SELECT 1 FROM inventory_images img WHERE img.inventory_id = i.id))) AS product_count
   FROM brands b
     LEFT JOIN inventory i ON i.brand_id = b.id AND i.tenant_id = b.tenant_id
  WHERE b.is_deleted = false AND b.active = true AND b.exclude_website IS NOT TRUE
  GROUP BY b.id, b.tenant_id, b.name, b.slug, b.hero_image, b.video_url, b.logo_url,
           b.brand_description, b.brand_description_short, b.brand_gallery,
           b.seo_title, b.seo_description, b.brand_page_enabled, b.display_mode,
           b.brand_page_visibility, b.show_brand_products
 HAVING count(DISTINCT i.id) FILTER (WHERE i.is_deleted = false
        AND (i.website_sync = ANY (ARRAY['full'::text, 'display'::text]))
        AND (i.website_sync = 'display'::text OR i.quantity > 0)
        AND COALESCE(i.display_mode_override, b.display_mode, 'catalog'::text) <> 'hidden'::text
        AND (EXISTS ( SELECT 1 FROM inventory_images img WHERE img.inventory_id = i.id))) > 0;
