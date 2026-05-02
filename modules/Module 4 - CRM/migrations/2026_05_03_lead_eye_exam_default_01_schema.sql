-- M4_LEAD_EYE_EXAM_DEFAULT Rung 1 — schema
-- Adds lead-level eye-exam preference column. Distinct from
-- crm_event_attendees.eye_exam_needed (per-event override).
-- Body field name in lead-intake EF: eye_exam → maps to this column.

ALTER TABLE crm_leads
  ADD COLUMN eye_exam_default TEXT NULL;

COMMENT ON COLUMN crm_leads.eye_exam_default IS
'Lead-level default eye-exam preference, set at lead intake. One of the 4 canonical options:
לא, אין צורך בבדיקה / כן, בדיקה רגילה / כן, בדיקת מולטיפוקל / יש לי כבר מרשם עדכני.
NULL means lead was created without specifying. Distinct from crm_event_attendees.eye_exam_needed
which is the per-event override. Body field name in lead-intake EF is eye_exam (mapped here).';
