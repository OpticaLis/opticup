-- =============================================================================
-- Migration: M4_AUTO_PROMOTE_GOVERNANCE
-- SPEC: modules/Module 4 - CRM/docs/specs/M4_AUTO_PROMOTE_GOVERNANCE/SPEC.md
-- Date: 2026-05-19
-- =============================================================================
-- Layer 1: replaces promote_lead_on_message_sent() trigger function to honor
--   action_config.auto_promote_lead_status (new explicit opt-in) +
--   action_config.skip_auto_promote (legacy intent, back-compat).
--   Looks up the originating rule via crm_automation_runs.rule_id and only
--   promotes if the rule explicitly opted in. Captures origin via
--   m4.originated_by_rule_id transaction-local session var so the resulting
--   SCE row from trg_lead_status_change_event carries originated_by_rule_id
--   (closes the gap Daniel observed 2026-05-19 13:22 IL).
--
-- Layer 3: UPDATE every active demo rule's action_config to add explicit
--   auto_promote_lead_status (no rule remains ambiguous). Drops the legacy
--   skip_auto_promote flag from the 2 rules that had it (will_open_tomorrow)
--   since auto_promote_lead_status:null now expresses the same intent.
--
-- Iron Rule compliance:
--   12: no new tables; function body well within line limits.
--   14, 15, 18: no new tables or constraints.
--   22: trigger preserves explicit tenant_id filter on UPDATE crm_leads.
--   32: 1 CREATE OR REPLACE FUNCTION + 14 UPDATE + 2 UPDATE (jsonb -) declared
--       in SPEC §4.
--   33: demo only; Prizma promotion is Daniel's manual step post-SPEC via
--       scripts/promote-config-to-prizma.mjs.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Layer 1 — replace promote_lead_on_message_sent
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.promote_lead_on_message_sent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_rule_id  uuid;
  v_target   text;
  v_skip     boolean;
  v_cfg      jsonb;
BEGIN
  -- Same short-circuits as the prior trigger (Iron Rule 22 unchanged).
  IF NEW.status <> 'sent' THEN RETURN NEW; END IF;
  IF OLD.status = 'sent' THEN RETURN NEW; END IF;
  IF NEW.lead_id IS NULL OR NEW.run_id IS NULL THEN RETURN NEW; END IF;

  -- Look up the originating rule's action_config via the run row. LEFT JOIN
  -- + NULL-safe — if the run was deleted or rule was hard-deleted (rare),
  -- v_cfg stays NULL and the function returns without promoting.
  SELECT r.rule_id, ar.action_config
    INTO v_rule_id, v_cfg
    FROM crm_automation_runs r
    LEFT JOIN crm_automation_rules ar ON ar.id = r.rule_id
   WHERE r.id = NEW.run_id;

  IF v_cfg IS NULL THEN RETURN NEW; END IF;

  -- Back-compat: legacy skip_auto_promote: true wins (treats opt-out as final).
  v_skip := coalesce((v_cfg->>'skip_auto_promote')::boolean, false);
  IF v_skip THEN RETURN NEW; END IF;

  -- New explicit opt-in: auto_promote_lead_status. Null/absent/empty → no promotion.
  v_target := nullif(v_cfg->>'auto_promote_lead_status', '');
  IF v_target IS NULL THEN RETURN NEW; END IF;

  -- Capture origin so trg_lead_status_change_event populates the SCE row's
  -- originated_by_rule_id column (M4_DUAL_PATH_CLEAN_FIX Layer 3 mechanism).
  PERFORM set_config('m4.originated_by_rule_id', coalesce(v_rule_id::text, ''), true);

  -- Preserve the safety constraint: only promote leads currently in 'waiting'.
  -- Never overwrite a lead already in invited/confirmed/etc.
  UPDATE crm_leads
     SET status = v_target, updated_at = NOW()
   WHERE id = NEW.lead_id
     AND tenant_id = NEW.tenant_id
     AND status = 'waiting';

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.promote_lead_on_message_sent() IS
  'M4_AUTO_PROMOTE_GOVERNANCE (2026-05-19): honors action_config.auto_promote_lead_status + skip_auto_promote. Captures m4.originated_by_rule_id so the resulting lead-SCE row carries originated_by_rule_id (Layer 3 mechanism from M4_DUAL_PATH_CLEAN_FIX). Only promotes leads currently in waiting status; never overwrites invited/confirmed/etc.';

-- -----------------------------------------------------------------------------
-- 2. Layer 3 — Explicit auto_promote_lead_status per demo rule
-- -----------------------------------------------------------------------------
-- 14 demo rules. Defaults per recipient_type matrix (SPEC §2 Layer 3 table).
-- All UPDATEs are tenant-scoped (Iron Rule 22 belt-and-suspenders).

DO $$
DECLARE
  v_demo uuid := '8d8cfa7e-ef58-49af-9702-a862d459cccb';
BEGIN
  -- Set null (no promotion) for all rules whose recipient_type means already-in-funnel.
  UPDATE crm_automation_rules
     SET action_config = jsonb_set(action_config, '{auto_promote_lead_status}', 'null'::jsonb, true)
   WHERE tenant_id = v_demo
     AND is_active = true
     AND (action_config->>'recipient_type') IN (
       'trigger_lead', 'attendees', 'attendees_with_active_coupon',
       'attendees_waiting', 'attendees_all_statuses', 'cross_event_active_waitlist'
     );

  -- Set 'invited' for invitation-flow recipient_types.
  UPDATE crm_automation_rules
     SET action_config = jsonb_set(action_config, '{auto_promote_lead_status}', '"invited"'::jsonb, true)
   WHERE tenant_id = v_demo
     AND is_active = true
     AND (action_config->>'recipient_type') IN ('tier2', 'tier2_excl_registered', 'leads_by_status');

  -- Override: שינוי סטטוס: ייפתח מחר rule keeps null (Daniel's expressed intent
  -- documented previously as skip_auto_promote:true).
  UPDATE crm_automation_rules
     SET action_config = jsonb_set(action_config, '{auto_promote_lead_status}', 'null'::jsonb, true)
   WHERE tenant_id = v_demo
     AND id = '819e46c9-38af-4e3a-8491-7d3aa1f402af'; -- שינוי סטטוס: ייפתח מחר

  -- Drop the legacy skip_auto_promote flag from the row that had it (now
  -- redundant since auto_promote_lead_status: null expresses the same intent).
  UPDATE crm_automation_rules
     SET action_config = action_config - 'skip_auto_promote'
   WHERE tenant_id = v_demo
     AND id = '819e46c9-38af-4e3a-8491-7d3aa1f402af';
END $$;

COMMIT;
