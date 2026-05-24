-- M6 QA fix: add exam_type column to v_prescription_full_for_editor view.
-- The column was added to the table (prescriptions_glasses) by migration
-- m6_exam_type_on_prescription_not_exam but the view wasn't updated.
-- Appended at end (Postgres doesn't allow mid-view column insertion with
-- CREATE OR REPLACE).

CREATE OR REPLACE VIEW public.v_prescription_full_for_editor
WITH (security_invoker = on)
AS
 SELECT pg.id,
    pg.tenant_id,
    pg.customer_id,
    pg.exam_id,
    pg.prescription_type_id,
    pg.prescription_number,
    pg.status,
    pg.source,
    pg.exam_reason,
    pg.treatment_selected,
    pg.optometrist_id,
    pg.refraction_method,
    pg.recommended_lens_type,
    pg.recommended_lens_material,
    pg.health_fund_id,
    pg.valid_from,
    pg.expires_at,
    pg.next_followup_at,
    pg.bcva_binocular,
    pg.instructions_for_customer,
    pg.notes_internal,
    pg.status_changed_at,
    pg.status_changed_by,
    pg.committed_at,
    pg.created_by,
    pg.created_at,
    pg.updated_at,
    pg.is_deleted,
    pg.deleted_at,
    'glasses'::prescription_kind AS kind,
    pt.code AS type_code,
    pt.name_he AS type_name_he,
    pg.exam_type
   FROM prescriptions_glasses pg
     LEFT JOIN prescription_types pt ON pt.id = pg.prescription_type_id
  WHERE pg.is_deleted = false;
