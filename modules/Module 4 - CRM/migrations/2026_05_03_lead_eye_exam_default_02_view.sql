-- M4_LEAD_EYE_EXAM_DEFAULT Rung 2 — view
-- Expose crm_leads.eye_exam_default through v_crm_leads_with_tags so the
-- CRM lead detail card can render the value (read-side wiring for Rung 1).
--
-- Column placement: appended at the very end of the SELECT list (after
-- tag_colors). Postgres CREATE OR REPLACE VIEW cannot insert new columns
-- mid-list (42P16) — it can only append. Authorized by Daniel as path A1
-- on 2026-05-03. JS selects by name, so view-column position is cosmetic.

CREATE OR REPLACE VIEW public.v_crm_leads_with_tags AS
 SELECT l.id,
    l.tenant_id,
    l.full_name,
    l.phone,
    l.email,
    l.city,
    l.language,
    l.status,
    l.source,
    l.utm_source,
    l.utm_medium,
    l.utm_campaign,
    l.utm_content,
    l.utm_term,
    l.utm_campaign_id,
    l.client_notes,
    l.terms_approved,
    l.terms_approved_at,
    l.marketing_consent,
    l.unsubscribed_at,
    l.verified_phone,
    l.monday_item_id,
    l.created_at,
    l.updated_at,
    l.is_deleted,
    COALESCE(array_agg(t.name ORDER BY t.sort_order) FILTER (WHERE t.id IS NOT NULL), '{}'::text[]) AS tag_names,
    COALESCE(array_agg(t.color ORDER BY t.sort_order) FILTER (WHERE t.id IS NOT NULL), '{}'::text[]) AS tag_colors,
    l.eye_exam_default
   FROM crm_leads l
     LEFT JOIN crm_lead_tags lt ON l.id = lt.lead_id AND l.tenant_id = lt.tenant_id
     LEFT JOIN crm_tags t ON lt.tag_id = t.id
  WHERE l.is_deleted = false
  GROUP BY l.id;
