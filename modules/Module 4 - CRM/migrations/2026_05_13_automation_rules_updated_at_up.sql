-- =============================================================================
-- 2026_05_13_automation_rules_updated_at_up.sql
-- SPEC: M4_AUTOMATION_RULES_UPDATED_AT
-- Brief: M4_OVERNIGHT_AUDIT_HARVEST_BRIEF.md §4.2 (pre-approved single ALTER TABLE ADD COLUMN)
-- Source debt: M4-DEBT-CRM-AUTO-RULES-UPDATED-AT (PRIZMA_CRM_BUGFIX_BACKPORT 2026-05-12)
--
-- WHAT: Add updated_at column + trigger to crm_automation_rules, backfill from created_at.
-- WHY:  Closes the "when was this rule last edited?" gap. Matches pattern on
--       crm_automation_runs + storefront_pages + storefront_components.
-- =============================================================================

BEGIN;

-- 1. Add column (NOT NULL with DEFAULT now() handles brand-new rows; backfill below for existing).
ALTER TABLE public.crm_automation_rules
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 2. Backfill existing rows so updated_at chronologically matches created_at
--    (instead of the migration timestamp). Single UPDATE, tenant-scoped via
--    Iron Rule 14 (all rows have tenant_id NOT NULL).
UPDATE public.crm_automation_rules
   SET updated_at = created_at
 WHERE updated_at >= now() - interval '5 minutes'
   AND created_at < now() - interval '5 minutes';

-- 3. Trigger using the project's canonical generic update_updated_at() function.
--    The function already exists in the schema (used by storefront_pages,
--    storefront_components, etc.). Body: NEW.updated_at = NOW(); RETURN NEW.
DROP TRIGGER IF EXISTS crm_automation_rules_set_updated_at_trg ON public.crm_automation_rules;
CREATE TRIGGER crm_automation_rules_set_updated_at_trg
  BEFORE UPDATE ON public.crm_automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

COMMENT ON COLUMN public.crm_automation_rules.updated_at IS
  'Auto-stamped on every UPDATE via crm_automation_rules_set_updated_at_trg. Backfilled to created_at on column add (2026-05-13 M4_AUTOMATION_RULES_UPDATED_AT).';

COMMIT;
