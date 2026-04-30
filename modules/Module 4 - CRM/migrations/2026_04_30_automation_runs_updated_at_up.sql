-- P29 — Automation Runs Observability
-- Adds updated_at column + auto-update trigger to crm_automation_runs.
-- Backfills existing rows. Marks 2 known-stuck Prizma rows as 'aborted'
-- so the post-deploy state is clean. See SPEC.md §3.1 + §3.2.

-- Iron Rule pre-flight (verified 2026-04-30):
--   pg_constraint scan: 0 CHECK on status — adding 'aborted' is safe
--   triggers scan: 0 existing — no conflict on new updated_at trigger

-- 1. Add updated_at column with default. IF NOT EXISTS makes this rerun-safe.
ALTER TABLE public.crm_automation_runs
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 2. Backfill existing rows: every row's updated_at = COALESCE(finished_at, started_at).
--    Idempotent: re-running this UPDATE produces the same value for each row.
UPDATE public.crm_automation_runs
   SET updated_at = COALESCE(finished_at, started_at);

-- 3. Auto-update trigger function (CREATE OR REPLACE makes this rerun-safe).
CREATE OR REPLACE FUNCTION public.crm_automation_runs_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger: fire BEFORE UPDATE on every row. DROP-then-CREATE makes this rerun-safe.
DROP TRIGGER IF EXISTS crm_automation_runs_updated_at ON public.crm_automation_runs;
CREATE TRIGGER crm_automation_runs_updated_at
  BEFORE UPDATE ON public.crm_automation_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.crm_automation_runs_set_updated_at();

-- 5. Backfill the 2 known-stuck Prizma rows to 'aborted'.
--    Selector is by exact id + tenant_id + status='running' — guarantees ≤2 rows.
--    Per §5 stop-trigger: "Backfill UPDATE affects more than 2 rows → STOP".
UPDATE public.crm_automation_runs
   SET status = 'aborted',
       error_message = 'Approval window expired (P29 backfill)',
       finished_at = COALESCE(finished_at, now())
 WHERE id IN (
         'a21e4d46-2179-4227-b502-2bb53f7f8885',
         '1195766b-b713-4687-99b6-893bc53c4708'
       )
   AND tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
   AND status = 'running';
