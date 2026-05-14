-- M4_TEMPLATE_VALIDATION_UNIFIED Commit 2 — 2026-05-14
-- Phase 2 P2.3 of FUNNEL_ROADMAP / KNOWLEDGE_MAP Layer 6.
--
-- Adds crm_automation_rules.last_error so the automation-engine pre-enqueue
-- validator can surface a structured failure message for the operator
-- without disabling the rule. Daniel's directive (FUNNEL_ROADMAP Q5):
-- operator must SEE the error, not silent suppression.
--
-- Iron Rule 14 (tenant_id NOT NULL): already satisfied by existing column.
-- Iron Rule 15 (RLS canonical 2-policy): already satisfied by existing
-- policies on crm_automation_rules; new column inherits coverage.
-- Iron Rule 18 (UNIQUE includes tenant_id): N/A — no UNIQUE constraint
-- added by this migration.
-- Iron Rule 32 destructive ops: declared **None.** in SPEC.md;
-- this migration is purely additive (ADD COLUMN with no DEFAULT, no
-- DROP, no rename, no data mutation).

ALTER TABLE public.crm_automation_rules
  ADD COLUMN IF NOT EXISTS last_error text NULL;

COMMENT ON COLUMN public.crm_automation_rules.last_error IS
  'Operator-facing error surface populated by automation-engine when a '
  'rule fires and any of its dispatched messages fails template-output '
  'validation pre-enqueue (M4_TEMPLATE_VALIDATION_UNIFIED, 2026-05-14). '
  'NULL when last evaluation passed all dispatched items. The rule is '
  'NOT auto-disabled — last_error is a hint, not a kill-switch.';
