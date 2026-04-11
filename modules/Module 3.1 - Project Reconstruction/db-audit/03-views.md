# Block 3 — Views in public schema (with full definitions)

**Date:** 2026-04-11
**Source:** Manual baseline from Supabase Dashboard SQL Editor run by Daniel during Phase 3A Manual Action #2
**Status:** One-time manual collection. Automated `run-audit.mjs` script is deferred to Module 3 Phase B preamble (see `MASTER_ROADMAP.md` Module 3 Phase B preamble checklist for details).
**Row count:** 24
**Note:** View definitions are reproduced verbatim from `pg_views.definition`. The `v_storefront_products` view contains the canonical "Golden Reference" images subquery that must NEVER be modified (per `CLAUDE.md` regression rule). Long view definitions span multiple lines within their table cell.

---

| view_name                  | view_definition                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | is_updatable | is_insertable_into |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------------ |
| v_admin_campaign_templates |  SELECT id,
    tenant_id,
    name,
    slug,
    description,
    preview_image,
    category,
    blocks,
    meta_template,
    variables,
    is_global,
    is_deleted,
    created_at,
    updated_at
   FROM campaign_templates
  WHERE (is_deleted = false)
  ORDER BY created_at DESC;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | YES          | YES                |
| v_admin_campaigns          |  SELECT id,
    tenant_id,
    name,
    slug,
    description,
    status,
    start_date,
    end_date,
    created_at,
    updated_at,
    is_deleted,
    ( SELECT count(*) AS count
           FROM storefront_pages p
          WHERE ((p.campaign_id = c.id) AND (p.status <> 'archived'::text))) AS page_count
   FROM campaigns c
  WHERE (is_deleted = false)
  ORDER BY created_at DESC;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | YES          | YES                |
| v_admin_component_presets  |  SELECT id,
    tenant_id,
    category,
    name,
    description,
    shortcode,
    config,
    sort_order,
    is_deleted,
    created_at,
    updated_at
   FROM storefront_component_presets
  WHERE (is_deleted = false)
  ORDER BY category, sort_order, name;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | YES          | YES                |
| v_admin_components         |  SELECT id,
    tenant_id,
    type,
    name,
    config,
    placements,
    is_active,
    created_at,
    updated_at
   FROM storefront_components;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | YES          | YES                |
| v_admin_leads              |  SELECT id,
    tenant_id,
    name,
    phone,
    email,
    message,
    source,
    page_url,
    product_id,
    component_id,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    webhook_status,
    created_at
   FROM cms_leads
  ORDER BY created_at DESC;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | YES          | YES                |
| v_admin_media              |  SELECT id,
    tenant_id,
    filename,
    original_filename,
    storage_path,
    mime_type,
    file_size,
    width,
    height,
    title,
    caption,
    description,
    alt_text,
    tags,
    folder,
    uploaded_by,
    is_deleted,
    created_at,
    updated_at
   FROM media_library
  WHERE (is_deleted = false)
  ORDER BY created_at DESC;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | YES          | YES                |
| v_admin_pages              |  SELECT id,
    tenant_id,
    slug,
    title,
    blocks,
    previous_blocks,
    meta_title,
    meta_description,
    status,
    page_type,
    is_system,
    lang,
    updated_by,
    updated_via,
    sort_order,
    tags,
    campaign_id,
    created_at,
    updated_at
   FROM storefront_pages p
  WHERE (COALESCE(is_deleted, false) = false);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | YES          | YES                |
| v_admin_product_picker     |  SELECT i.id,
    i.tenant_id,
    i.barcode,
    b.name AS brand_name,
    i.model,
    i.color,
    i.quantity,
    i.product_type,
    i.sell_price,
    i.sell_discount,
    i.original_price,
    i.sale_label,
    i.website_sync,
    COALESCE(( SELECT json_agg(('/api/image/'::text || img.storage_path) ORDER BY img.sort_order, img.created_at) AS json_agg
           FROM inventory_images img
          WHERE (img.inventory_id = i.id)), '[]'::json) AS images
   FROM (inventory i
     JOIN brands b ON ((i.brand_id = b.id)))
  WHERE (i.is_deleted = false);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | NO           | NO                 |
| v_admin_reviews            |  SELECT id,
    tenant_id,
    source,
    author_name,
    rating,
    text,
    review_date,
    google_review_id,
    is_visible,
    sort_order,
    created_at,
    updated_at
   FROM storefront_reviews
  ORDER BY sort_order, created_at DESC;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | YES          | YES                |
| v_ai_content               |  SELECT id,
    tenant_id,
    entity_type,
    entity_id,
    content_type,
    language,
    content,
    status,
    version,
    is_deleted,
    created_at,
    updated_at
   FROM ai_content
  WHERE (is_deleted = false);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | YES          | YES                |
| v_content_translations     |  SELECT id,
    tenant_id,
    entity_type,
    entity_id,
    field_name,
    lang,
    value,
    status,
    translated_by,
    confidence,
    created_at,
    updated_at
   FROM content_translations
  WHERE (status = ANY (ARRAY['approved'::text, 'draft'::text]));                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | YES          | YES                |
| v_public_tenant            |  SELECT t.id,
    t.slug,
    t.name,
    sc.enabled,
    sc.theme,
    t.logo_url,
    sc.categories,
    sc.seo,
    t.business_phone AS phone,
    t.business_email AS email
   FROM (tenants t
     JOIN storefront_config sc ON ((sc.tenant_id = t.id)))
  WHERE ((t.is_active = true) AND (sc.enabled = true));                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | NO           | NO                 |
| v_storefront_blog_posts    |  SELECT id,
    tenant_id,
    slug,
    lang,
    title,
    content,
    excerpt,
    featured_image,
    categories,
    tags,
    seo_title,
    seo_description,
    og_image,
    status,
    source,
    translation_of,
    published_at,
    created_at,
    updated_at
   FROM blog_posts
  WHERE ((is_deleted = false) AND (status = 'published'::text));                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | YES          | YES                |
| v_storefront_brand_page    |  SELECT id AS brand_id,
    tenant_id,
    name AS brand_name,
    slug,
    hero_image,
    video_url,
    logo_url,
    brand_description,
    brand_description_short,
    brand_gallery,
    seo_title,
    seo_description,
    brand_page_enabled,
    brand_page_visibility,
    show_brand_products
   FROM brands b
  WHERE ((is_deleted = false) AND (active = true) AND (exclude_website IS NOT TRUE) AND (brand_page_enabled = true) AND (EXISTS ( SELECT 1
           FROM v_storefront_products p
          WHERE ((p.brand_id = b.id) AND (p.tenant_id = b.tenant_id)))));                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | YES          | YES                |
| v_storefront_brands        |  SELECT b.id AS brand_id,
    b.tenant_id,
    b.name AS brand_name,
    b.slug,
    b.hero_image,
    b.video_url,
    b.logo_url,
    b.brand_description,
    b.brand_description_short,
    b.brand_gallery,
    b.seo_title,
    b.seo_description,
    b.brand_page_enabled,
    b.display_mode,
    b.brand_page_visibility,
    b.show_brand_products,
    count(DISTINCT i.id) FILTER (WHERE ((i.is_deleted = false) AND (i.website_sync = ANY (ARRAY['full'::text, 'display'::text])) AND ((i.website_sync = 'display'::text) OR (i.quantity > 0)) AND (COALESCE(i.storefront_mode_override, b.storefront_mode, 'catalog'::text) <> 'hidden'::text) AND (EXISTS ( SELECT 1
           FROM inventory_images img
          WHERE (img.inventory_id = i.id))))) AS product_count
   FROM (brands b
     LEFT JOIN inventory i ON (((i.brand_id = b.id) AND (i.tenant_id = b.tenant_id))))
  WHERE ((b.is_deleted = false) AND (b.active = true) AND (b.exclude_website IS NOT TRUE))
  GROUP BY b.id, b.tenant_id, b.name, b.slug, b.hero_image, b.video_url, b.logo_url, b.brand_description, b.brand_description_short, b.brand_gallery, b.seo_title, b.seo_description, b.brand_page_enabled, b.display_mode, b.brand_page_visibility, b.show_brand_products, b.storefront_mode
 HAVING (count(DISTINCT i.id) FILTER (WHERE ((i.is_deleted = false) AND (i.website_sync = ANY (ARRAY['full'::text, 'display'::text])) AND ((i.website_sync = 'display'::text) OR (i.quantity > 0)) AND (COALESCE(i.storefront_mode_override, b.storefront_mode, 'catalog'::text) <> 'hidden'::text) AND (EXISTS ( SELECT 1
           FROM inventory_images img
          WHERE (img.inventory_id = i.id))))) > 0);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | NO           | NO                 |
| v_storefront_categories    |  SELECT tenant_id,
    product_type AS name,
    count(*) AS count
   FROM v_storefront_products
  WHERE (product_type IS NOT NULL)
  GROUP BY tenant_id, product_type
  ORDER BY (count(*)) DESC;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | NO           | NO                 |
| v_storefront_components    |  SELECT id,
    tenant_id,
    type,
    name,
    config,
    placements,
    is_active
   FROM storefront_components
  WHERE (is_active = true);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | YES          | YES                |
| v_storefront_config        |  SELECT tenant_id,
    whatsapp_number,
    booking_url,
    notification_method,
    analytics,
    custom_domain,
    hero_title,
    hero_subtitle,
    hero_image_url,
    favicon_url,
    og_image_url,
    google_place_id,
    google_rating,
    google_review_count,
    footer_config,
    site_logo_url,
    supported_languages,
    default_language,
    auto_translate_languages,
    auto_publish_threshold
   FROM storefront_config;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | YES          | YES                |
| v_storefront_media         |  SELECT id,
    tenant_id,
    storage_path,
    title,
    caption,
    alt_text,
    width,
    height,
    folder,
    tags
   FROM media_library
  WHERE (is_deleted = false);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | YES          | YES                |
| v_storefront_pages         |  SELECT id,
    tenant_id,
    slug,
    title,
    blocks,
    status,
    page_type,
    lang,
    meta_title,
    meta_description,
    sort_order,
    tags,
    translation_group_id,
    created_at,
    updated_at
   FROM storefront_pages p
  WHERE (status = 'published'::text);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | YES          | YES                |
| v_storefront_products      |  SELECT i.id,
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
    COALESCE(( SELECT json_agg(('/api/image/'::text || img.storage_path) ORDER BY img.sort_order, img.created_at) AS json_agg
           FROM inventory_images img
          WHERE (img.inventory_id = i.id)), '[]'::json) AS images,
    lower(((((((COALESCE(b.name, ''::text) || ' '::text) || COALESCE(i.model, ''::text)) || ' '::text) || COALESCE(i.color, ''::text)) || ' '::text) || COALESCE(i.barcode, ''::text))) AS search_text,
    COALESCE(i.storefront_mode_override, b.storefront_mode, 'catalog'::text) AS resolved_mode,
    ( SELECT ai_content.content
           FROM ai_content
          WHERE ((ai_content.entity_type = 'product'::text) AND (ai_content.entity_id = i.id) AND (ai_content.content_type = 'description'::text) AND (ai_content.language = 'he'::text) AND (ai_content.is_deleted = false))
          ORDER BY ai_content.version DESC
         LIMIT 1) AS ai_description,
    ( SELECT ai_content.content
           FROM ai_content
          WHERE ((ai_content.entity_type = 'product'::text) AND (ai_content.entity_id = i.id) AND (ai_content.content_type = 'seo_title'::text) AND (ai_content.language = 'he'::text) AND (ai_content.is_deleted = false))
          ORDER BY ai_content.version DESC
         LIMIT 1) AS ai_seo_title,
    ( SELECT ai_content.content
           FROM ai_content
          WHERE ((ai_content.entity_type = 'product'::text) AND (ai_content.entity_id = i.id) AND (ai_content.content_type = 'seo_description'::text) AND (ai_content.language = 'he'::text) AND (ai_content.is_deleted = false))
          ORDER BY ai_content.version DESC
         LIMIT 1) AS ai_seo_description
   FROM (inventory i
     JOIN brands b ON ((i.brand_id = b.id)))
  WHERE ((i.is_deleted = false) AND (b.active = true) AND (b.exclude_website IS NOT TRUE) AND (COALESCE(i.storefront_mode_override, b.storefront_mode, 'catalog'::text) <> 'hidden'::text) AND (i.website_sync = ANY (ARRAY['full'::text, 'display'::text])) AND ((i.website_sync = 'display'::text) OR ((i.website_sync = 'full'::text) AND (i.quantity > 0))) AND (EXISTS ( SELECT 1
           FROM inventory_images img
          WHERE (img.inventory_id = i.id))));                                                                                                                                                                                                                                                                                                                                                                             | NO           | NO                 |
| v_storefront_reviews       |  SELECT id,
    tenant_id,
    source,
    author_name,
    rating,
    text,
    review_date,
    sort_order
   FROM storefront_reviews
  WHERE (is_visible = true)
  ORDER BY sort_order, created_at DESC;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | YES          | YES                |
| v_tenant_i18n_overrides    |  SELECT id,
    tenant_id,
    lang,
    key_path,
    value,
    created_at,
    updated_at
   FROM tenant_i18n_overrides;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | YES          | YES                |
| v_translation_dashboard    |  SELECT tenant_id,
    translation_group_id,
    max(
        CASE
            WHEN (lang = 'he'::text) THEN title
            ELSE NULL::text
        END) AS title,
    max(
        CASE
            WHEN (lang = 'he'::text) THEN slug
            ELSE NULL::text
        END) AS slug,
    max(
        CASE
            WHEN (lang = 'he'::text) THEN page_type
            ELSE NULL::text
        END) AS page_type,
    (max(
        CASE
            WHEN (lang = 'he'::text) THEN (id)::text
            ELSE NULL::text
        END))::uuid AS he_page_id,
    max(
        CASE
            WHEN (lang = 'he'::text) THEN status
            ELSE NULL::text
        END) AS he_status,
    max(
        CASE
            WHEN (lang = 'he'::text) THEN seo_score
            ELSE NULL::integer
        END) AS he_seo_score,
    (max(
        CASE
            WHEN (lang = 'he'::text) THEN (noindex)::text
            ELSE NULL::text
        END))::boolean AS he_noindex,
    (max(
        CASE
            WHEN (lang = 'en'::text) THEN (id)::text
            ELSE NULL::text
        END))::uuid AS en_page_id,
    max(
        CASE
            WHEN (lang = 'en'::text) THEN translation_status
            ELSE NULL::text
        END) AS en_status,
    max(
        CASE
            WHEN (lang = 'en'::text) THEN status
            ELSE NULL::text
        END) AS en_publish_status,
    max(
        CASE
            WHEN (lang = 'en'::text) THEN seo_score
            ELSE NULL::integer
        END) AS en_seo_score,
    (max(
        CASE
            WHEN (lang = 'en'::text) THEN (noindex)::text
            ELSE NULL::text
        END))::boolean AS en_noindex,
    max(
        CASE
            WHEN (lang = 'en'::text) THEN stale_since
            ELSE NULL::timestamp with time zone
        END) AS en_stale_since,
    (max(
        CASE
            WHEN (lang = 'ru'::text) THEN (id)::text
            ELSE NULL::text
        END))::uuid AS ru_page_id,
    max(
        CASE
            WHEN (lang = 'ru'::text) THEN translation_status
            ELSE NULL::text
        END) AS ru_status,
    max(
        CASE
            WHEN (lang = 'ru'::text) THEN status
            ELSE NULL::text
        END) AS ru_publish_status,
    max(
        CASE
            WHEN (lang = 'ru'::text) THEN seo_score
            ELSE NULL::integer
        END) AS ru_seo_score,
    (max(
        CASE
            WHEN (lang = 'ru'::text) THEN (noindex)::text
            ELSE NULL::text
        END))::boolean AS ru_noindex,
    max(
        CASE
            WHEN (lang = 'ru'::text) THEN stale_since
            ELSE NULL::timestamp with time zone
        END) AS ru_stale_since
   FROM storefront_pages p
  WHERE ((status <> 'archived'::text) AND (is_deleted = false))
  GROUP BY tenant_id, translation_group_id; | NO           | NO                 |