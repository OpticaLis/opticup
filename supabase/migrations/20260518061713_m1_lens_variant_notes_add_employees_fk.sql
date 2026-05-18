-- M1_LENS_VARIANT_NOTES_AUTHOR_FK_FIX 2026-05-18 IDT
-- Re-add FK targeting public.employees(id) which is the canonical
-- employees table used by pin-auth Edge Function (tenant_employee.id
-- in sessionStorage = employees.id).
--
-- ON DELETE SET NULL chosen to preserve historic notes if an employee
-- is removed. Column is NOT NULL today — the clause is reserved-for-future
-- when column becomes nullable; no-op for now since no deletes occur.

ALTER TABLE public.lens_variant_notes
  ADD CONSTRAINT lens_variant_notes_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES public.employees(id) ON DELETE SET NULL;
