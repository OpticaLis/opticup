-- M6: v_customer_visits_for_sidebar — one row per exam (visit) for the sidebar.
-- Groups prescriptions by exam_id. Returns stage_count, best_rx_status, default_rx_id.
-- security_invoker=on, tenant-scoped via eye_exams + prescription joins.
-- Created by M6_SIDEBAR_FIX run (2026-05-25).

CREATE OR REPLACE VIEW public.v_customer_visits_for_sidebar
WITH (security_invoker = on)
AS
 SELECT e.id AS exam_id,
    e.tenant_id,
    e.customer_id,
    e.exam_date,
    e.status AS exam_status,
    'glasses'::text AS kind,
    count(pg.id)::integer AS stage_count,
        CASE
            WHEN bool_or(pg.status::text = 'committed'::text) THEN 'committed'::text
            WHEN bool_or(pg.status::text = 'draft'::text) THEN 'draft'::text
            WHEN bool_or(pg.status::text = 'expired'::text) THEN 'expired'::text
            ELSE 'draft'::text
        END AS best_rx_status,
    ( SELECT pg2.id
           FROM prescriptions_glasses pg2
          WHERE pg2.exam_id = e.id AND pg2.tenant_id = e.tenant_id AND pg2.is_deleted = false
          ORDER BY (
                CASE pg2.exam_type
                    WHEN 'final'::exam_type THEN 0
                    ELSE 1
                END), pg2.created_at DESC
         LIMIT 1) AS default_rx_id
   FROM eye_exams e
     JOIN prescriptions_glasses pg ON pg.exam_id = e.id AND pg.tenant_id = e.tenant_id AND pg.is_deleted = false
  WHERE e.is_deleted = false
  GROUP BY e.id, e.tenant_id, e.customer_id, e.exam_date, e.status
UNION ALL
 SELECT e.id AS exam_id,
    e.tenant_id,
    e.customer_id,
    e.exam_date,
    e.status AS exam_status,
    'contacts'::text AS kind,
    count(pc.id)::integer AS stage_count,
        CASE
            WHEN bool_or(pc.status::text = 'committed'::text) THEN 'committed'::text
            WHEN bool_or(pc.status::text = 'draft'::text) THEN 'draft'::text
            WHEN bool_or(pc.status::text = 'expired'::text) THEN 'expired'::text
            ELSE 'draft'::text
        END AS best_rx_status,
    ( SELECT pc2.id
           FROM prescriptions_contacts pc2
          WHERE pc2.exam_id = e.id AND pc2.tenant_id = e.tenant_id AND pc2.is_deleted = false
          ORDER BY (
                CASE pc2.exam_type
                    WHEN 'final'::exam_type THEN 0
                    ELSE 1
                END), pc2.created_at DESC
         LIMIT 1) AS default_rx_id
   FROM eye_exams e
     JOIN prescriptions_contacts pc ON pc.exam_id = e.id AND pc.tenant_id = e.tenant_id AND pc.is_deleted = false
  WHERE e.is_deleted = false
  GROUP BY e.id, e.tenant_id, e.customer_id, e.exam_date, e.status;
