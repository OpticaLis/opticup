-- Migration: revert_crm_leads_broadcast_insert
-- SPEC: REALTIME_INSERT_NOT_RENDERING_DEBUG / Round 4 (Option E — polling fallback)
--
-- Reverts the trigger + function added in Round 3 (migration
-- 20260503180000_realtime_crm_leads_broadcast_insert). Original migration file
-- stays in git history (Iron Rule 21 — never rewrite history; new revert
-- migration is the way to undo prior schema changes).
--
-- Why reverted: Round 3 deploy regressed production. Daniel reported the
-- `[Realtime] subscribe status: SUBSCRIBED` log itself disappeared from the
-- console after the Round-3 client change, AND no INSERT events reached the
-- handler. Diagnostic capture (evidence_realtime_messages_pre_revert.txt in
-- this SPEC folder) showed the trigger DID write to realtime.messages
-- correctly — the gap is between realtime.messages and the WebSocket forwarder
-- (likely missing `private: true` on the channel subscription, or RLS on
-- realtime.messages). Post-cutover SPEC will investigate; for now we ship
-- polling at 30-second intervals.
--
-- Idempotent: DROP IF EXISTS makes re-runs safe.

DROP TRIGGER IF EXISTS crm_leads_broadcast_insert_trigger ON public.crm_leads;
DROP FUNCTION IF EXISTS public.crm_leads_broadcast_insert();

-- Post-application verification (read-only):
-- SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.crm_leads'::regclass;
--   Expected: crm_leads_broadcast_insert_trigger NOT in the list.
-- SELECT proname FROM pg_proc WHERE proname = 'crm_leads_broadcast_insert';
--   Expected: 0 rows.
