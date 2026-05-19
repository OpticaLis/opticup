-- =============================================================================
-- Migration: M4_DUAL_PATH_CLEAN_FIX_2026_05_19
-- SPEC: modules/Module 4 - CRM/docs/specs/M4_DUAL_PATH_CLEAN_FIX_2026_05_19/SPEC.md
-- Date: 2026-05-19
-- =============================================================================
-- Adds Layer 2 (idempotency) + Layer 3 (loop guard) to crm_status_change_events.
--
-- Layer 2: dispatch_lock_key + skip_reason + UNIQUE INDEX. Same-second dual-INSERT
-- collapses to one row via ON CONFLICT DO NOTHING in the 3 trigger functions.
--
-- Layer 3: originated_by_rule_id column. Trigger functions populate from
-- current_setting('m4.originated_by_rule_id', true). EF post-actions set the
-- session var before lead-status UPDATE. Consumer passes the value through to
-- evaluate(); engine filters self-referencing rules within a 1-hour window.
--
-- Iron Rule compliance:
--   14: no new tables.
--   15: no new RLS policies (existing canonical pair preserves tenant isolation).
--   18: new UNIQUE INDEX is tenant-scoped (tenant_id, dispatch_lock_key).
--   22: no new write paths; existing tenant_id propagation preserved.
--   32: 8 destructive ops declared in SPEC §4 (3 ADD COLUMN, 2 CREATE INDEX, 3 CREATE OR REPLACE FUNCTION).
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- pgcrypto required for digest() — already installed in supabase by default,
-- but explicit CREATE EXTENSION IF NOT EXISTS makes the dependency visible.
-- -----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Layer 2 columns: dispatch_lock_key + skip_reason
-- -----------------------------------------------------------------------------

ALTER TABLE crm_status_change_events
  ADD COLUMN IF NOT EXISTS dispatch_lock_key text;

COMMENT ON COLUMN crm_status_change_events.dispatch_lock_key IS
  'M4_DUAL_PATH_CLEAN_FIX_2026_05_19 Layer 2: SHA256 hex of (entity_type:entity_id:old_status:new_status:date_trunc(second, occurred_at)). Populated by the 3 SCE-producer trigger functions. Tenant-scoped UNIQUE INDEX collapses same-second dual-INSERT to one row via ON CONFLICT DO NOTHING.';

ALTER TABLE crm_status_change_events
  ADD COLUMN IF NOT EXISTS skip_reason text;

COMMENT ON COLUMN crm_status_change_events.skip_reason IS
  'M4_DUAL_PATH_CLEAN_FIX_2026_05_19 Layer 2: marker for SCEs deliberately consumed-on-insert (operator clicked "אישור ללא הודעות" or future operator suppression flow). NULL = normal SCE. Future-use; not populated in the initial Pipeline.';

-- -----------------------------------------------------------------------------
-- 2. Layer 3 column: originated_by_rule_id
-- -----------------------------------------------------------------------------

ALTER TABLE crm_status_change_events
  ADD COLUMN IF NOT EXISTS originated_by_rule_id uuid REFERENCES crm_automation_rules(id);

COMMENT ON COLUMN crm_status_change_events.originated_by_rule_id IS
  'M4_DUAL_PATH_CLEAN_FIX_2026_05_19 Layer 3: when populated, this SCE was caused by a rule''s post_action (e.g. lead status flip via post_action_lead_status_update). Set by SCE-producer triggers reading current_setting(''m4.originated_by_rule_id'', true). Consumer passes the value to automation-engine evaluate; engine filters out rules where rule.id matches AND occurred_at > NOW() - INTERVAL ''1 hour'' (architectural self-loop guard).';

-- -----------------------------------------------------------------------------
-- 3. Indexes (Layer 2 unique + Layer 3 lookup)
-- -----------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS uq_sce_dispatch_lock
  ON crm_status_change_events (tenant_id, dispatch_lock_key)
  WHERE dispatch_lock_key IS NOT NULL;

COMMENT ON INDEX uq_sce_dispatch_lock IS
  'M4_DUAL_PATH_CLEAN_FIX_2026_05_19 Layer 2: tenant-scoped uniqueness on (tenant_id, dispatch_lock_key). Same-second dual-INSERT collapses (one row wins, the other silently ON CONFLICT DO NOTHING in the trigger function).';

CREATE INDEX IF NOT EXISTS idx_sce_origin_rule
  ON crm_status_change_events (tenant_id, originated_by_rule_id, occurred_at DESC)
  WHERE originated_by_rule_id IS NOT NULL;

COMMENT ON INDEX idx_sce_origin_rule IS
  'M4_DUAL_PATH_CLEAN_FIX_2026_05_19 Layer 3: supports the consumer''s self-loop guard lookup (does THIS rule''s id appear in any SCE row''s originated_by_rule_id within the past hour?).';

-- -----------------------------------------------------------------------------
-- 4. Helper function: compute_dispatch_lock_key
-- -----------------------------------------------------------------------------
-- Stable hash of the SCE identity. Pulled into a function so the 3 trigger
-- functions stay short.

CREATE OR REPLACE FUNCTION compute_dispatch_lock_key(
  p_entity_type text,
  p_entity_id   uuid,
  p_old_status  text,
  p_new_status  text,
  p_occurred_at timestamptz
) RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  -- pgcrypto installs digest() into the `extensions` schema, not `public`. The
  -- trigger functions invoke this from a SECURITY DEFINER context with
  -- search_path = public, pg_temp — `extensions` is not on that path. Qualify
  -- explicitly so the function works regardless of caller search_path.
  SELECT encode(
    extensions.digest(
      p_entity_type || ':' ||
      p_entity_id::text || ':' ||
      coalesce(p_old_status, '∅') || ':' ||
      p_new_status || ':' ||
      date_trunc('second', p_occurred_at)::text,
      'sha256'
    ),
    'hex'
  );
$$;

COMMENT ON FUNCTION compute_dispatch_lock_key(text, uuid, text, text, timestamptz) IS
  'M4_DUAL_PATH_CLEAN_FIX_2026_05_19 Layer 2: SHA256 hex of the SCE identity tuple, truncated to per-second granularity. Used by the 3 SCE-producer trigger functions.';

-- -----------------------------------------------------------------------------
-- 5. SCE-producer trigger functions — updated to populate Layer 2 + Layer 3
-- -----------------------------------------------------------------------------

-- 5a. attendee
CREATE OR REPLACE FUNCTION attendee_status_change_event_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_origin_rule uuid;
  v_now timestamptz := now();
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    BEGIN
      v_origin_rule := nullif(current_setting('m4.originated_by_rule_id', true), '')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_origin_rule := NULL;
    END;
    INSERT INTO crm_status_change_events (
      tenant_id, entity_type, entity_id, old_status, new_status, payload,
      dispatch_lock_key, originated_by_rule_id, occurred_at
    ) VALUES (
      NEW.tenant_id,
      'attendee',
      NEW.id,
      OLD.status,
      NEW.status,
      jsonb_build_object(
        'event_id', NEW.event_id,
        'lead_id',  NEW.lead_id
      ),
      compute_dispatch_lock_key('attendee', NEW.id, OLD.status, NEW.status, v_now),
      v_origin_rule,
      v_now
    )
    ON CONFLICT (tenant_id, dispatch_lock_key) WHERE dispatch_lock_key IS NOT NULL
    DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION attendee_status_change_event_fn() IS
  'M4_DUAL_PATH_CLEAN_FIX_2026_05_19: Layer 2 dispatch_lock_key + ON CONFLICT DO NOTHING. Layer 3 originated_by_rule_id from m4.originated_by_rule_id session var.';

-- 5b. lead
CREATE OR REPLACE FUNCTION lead_status_change_event_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_origin_rule uuid;
  v_now timestamptz := now();
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    BEGIN
      v_origin_rule := nullif(current_setting('m4.originated_by_rule_id', true), '')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_origin_rule := NULL;
    END;
    INSERT INTO crm_status_change_events (
      tenant_id, entity_type, entity_id, old_status, new_status, payload,
      dispatch_lock_key, originated_by_rule_id, occurred_at
    ) VALUES (
      NEW.tenant_id,
      'lead',
      NEW.id,
      OLD.status,
      NEW.status,
      jsonb_build_object(
        'phone',  NEW.phone,
        'source', NEW.source
      ),
      compute_dispatch_lock_key('lead', NEW.id, OLD.status, NEW.status, v_now),
      v_origin_rule,
      v_now
    )
    ON CONFLICT (tenant_id, dispatch_lock_key) WHERE dispatch_lock_key IS NOT NULL
    DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION lead_status_change_event_fn() IS
  'M4_DUAL_PATH_CLEAN_FIX_2026_05_19: Layer 2 dispatch_lock_key + ON CONFLICT DO NOTHING. Layer 3 originated_by_rule_id from m4.originated_by_rule_id session var.';

-- 5c. event
CREATE OR REPLACE FUNCTION event_status_change_event_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_origin_rule uuid;
  v_now timestamptz := now();
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    BEGIN
      v_origin_rule := nullif(current_setting('m4.originated_by_rule_id', true), '')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_origin_rule := NULL;
    END;
    INSERT INTO crm_status_change_events (
      tenant_id, entity_type, entity_id, old_status, new_status, payload,
      dispatch_lock_key, originated_by_rule_id, occurred_at
    ) VALUES (
      NEW.tenant_id,
      'event',
      NEW.id,
      OLD.status,
      NEW.status,
      jsonb_build_object(
        'event_date', NEW.event_date,
        'event_name', NEW.name
      ),
      compute_dispatch_lock_key('event', NEW.id, OLD.status, NEW.status, v_now),
      v_origin_rule,
      v_now
    )
    ON CONFLICT (tenant_id, dispatch_lock_key) WHERE dispatch_lock_key IS NOT NULL
    DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION event_status_change_event_fn() IS
  'M4_DUAL_PATH_CLEAN_FIX_2026_05_19: Layer 2 dispatch_lock_key + ON CONFLICT DO NOTHING. Layer 3 originated_by_rule_id from m4.originated_by_rule_id session var.';

-- -----------------------------------------------------------------------------
-- 6. Helper RPC: set_m4_origin_rule (for EF service-role client)
-- -----------------------------------------------------------------------------
-- The supabase-js client's .rpc() exposes set_config indirectly. Wrapping in
-- a stable RPC name makes the EF code clearer + makes the contract explicit.

CREATE OR REPLACE FUNCTION set_m4_origin_rule(p_rule_id uuid)
RETURNS void
LANGUAGE sql
VOLATILE
AS $$
  SELECT set_config('m4.originated_by_rule_id', coalesce(p_rule_id::text, ''), true);
$$;

COMMENT ON FUNCTION set_m4_origin_rule(uuid) IS
  'M4_DUAL_PATH_CLEAN_FIX_2026_05_19 Layer 3: sets transaction-local m4.originated_by_rule_id session var. Called by automation-engine EF before lead-status UPDATE post-actions. The 3 SCE-producer trigger functions read this var and populate crm_status_change_events.originated_by_rule_id.';

-- -----------------------------------------------------------------------------
-- 7. RPC: update_lead_status_with_origin (atomic origin-tagged UPDATE)
-- -----------------------------------------------------------------------------
-- supabase-js .rpc() auto-commits per call, so set_config('m4.originated_by_rule_id', ..., true)
-- in one .rpc() call doesn't carry over to a subsequent .from(crm_leads).update().
-- This RPC wraps both ops in one transaction so the SCE-producer trigger sees the value.

CREATE OR REPLACE FUNCTION update_lead_status_with_origin(
  p_tenant_id      uuid,
  p_lead_ids       uuid[],
  p_new_status     text,
  p_origin_rule_id uuid
) RETURNS TABLE (id uuid, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_origin_text text := coalesce(p_origin_rule_id::text, '');
BEGIN
  PERFORM set_config('m4.originated_by_rule_id', v_origin_text, true);
  RETURN QUERY
    UPDATE crm_leads l
       SET status = p_new_status, updated_at = NOW()
     WHERE l.tenant_id = p_tenant_id
       AND l.id = ANY(p_lead_ids)
    RETURNING l.id, l.status;
END;
$$;

COMMENT ON FUNCTION update_lead_status_with_origin(uuid, uuid[], text, uuid) IS
  'M4_DUAL_PATH_CLEAN_FIX_2026_05_19 Layer 3: atomic origin-tagged lead status UPDATE. Sets m4.originated_by_rule_id transaction-local before UPDATE so trg_lead_status_change_event populates crm_status_change_events.originated_by_rule_id with the rule UUID. Called by automation-engine post-actions.ts inside executePostActions.';

COMMIT;
