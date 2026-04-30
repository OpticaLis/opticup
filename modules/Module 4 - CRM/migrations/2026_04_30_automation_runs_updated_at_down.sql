-- P29 ROLLBACK — Automation Runs Observability
-- Drops trigger + function + column. Per SPEC §9 the 2 backfilled 'aborted'
-- rows STAY aborted (intentional — they were genuinely abandoned).

DROP TRIGGER IF EXISTS crm_automation_runs_updated_at ON public.crm_automation_runs;
DROP FUNCTION IF EXISTS public.crm_automation_runs_set_updated_at();
ALTER TABLE public.crm_automation_runs DROP COLUMN IF EXISTS updated_at;
