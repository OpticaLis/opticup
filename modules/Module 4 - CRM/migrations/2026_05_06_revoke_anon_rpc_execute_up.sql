-- M4_TENANT_ISOLATION_HARDENING_PART2 (forward, consolidated)
-- Closes Phase 1 audit G-CRIT-2 — last of the 4 audit CRITICALs.
--
-- 12 SECURITY DEFINER RPCs were created with `EXECUTE TO PUBLIC` (Postgres
-- default for new functions) PLUS direct grants to anon/authenticated/service.
-- The SPEC's first attempt (REVOKE EXECUTE FROM anon) stripped only the direct
-- anon grant; anon still inherited via PUBLIC. To actually deny anon access we
-- must also REVOKE EXECUTE FROM PUBLIC. Both stages live here.
--
-- Group 1 — REVOKE-ANON (9 RPCs): authenticated still has direct grant; anon does not.
-- Group 2 — REVOKE-ANON-AND-AUTH (2 RPCs): only service_role / DB trigger context.
-- Group 3 — KEEP-ANON (3 RPCs): unchanged. Public ingress paths.
--
-- Defense in depth (Iron Rule 22): GRANT revocation is the FIRST layer; the RPC
-- bodies' `WHERE tenant_id = p_tenant_id` clauses are the SECOND. Both stay.
--
-- This file is the canonical source of truth. The actual deploy was applied via
-- two MCP apply_migration calls:
--   m4_revoke_anon_rpc_execute             — REVOKE FROM anon/authenticated direct grants (Stage 1)
--   m4_revoke_anon_rpc_execute_v2_strip_public — REVOKE FROM PUBLIC inheritance (Stage 2 corrective)
-- Re-running this consolidated file from scratch on a fresh DB produces the same
-- final state.

BEGIN;

-- Stage 1 — strip direct grants on anon (and authenticated for Group 2)
REVOKE EXECUTE ON FUNCTION public.move_attendee_between_events(uuid, uuid)              FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_in_attendee(uuid, uuid)                         FROM anon;
REVOKE EXECUTE ON FUNCTION public.transfer_credit_to_new_attendee(uuid, uuid)           FROM anon;
REVOKE EXECUTE ON FUNCTION public.next_crm_event_number(uuid, uuid)                     FROM anon;
REVOKE EXECUTE ON FUNCTION public.restore_event_from_log(uuid, uuid)                    FROM anon;
REVOKE EXECUTE ON FUNCTION public.soft_delete_event_if_empty(uuid, uuid)                FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_lead_status_from_attendee(uuid, uuid)            FROM anon;
REVOKE EXECUTE ON FUNCTION public.cascade_attendee_soft_delete()                        FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.import_leads_from_monday(uuid, text, jsonb)           FROM anon, authenticated;

-- Stage 2 — strip the PUBLIC EXECUTE inheritance Postgres adds at function creation.
-- Without this, anon still has EXECUTE via has_function_privilege('anon', ...) inheriting from PUBLIC.
REVOKE EXECUTE ON FUNCTION public.move_attendee_between_events(uuid, uuid)              FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_in_attendee(uuid, uuid)                         FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.transfer_credit_to_new_attendee(uuid, uuid)           FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.next_crm_event_number(uuid, uuid)                     FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.restore_event_from_log(uuid, uuid)                    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.soft_delete_event_if_empty(uuid, uuid)                FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_lead_status_from_attendee(uuid, uuid)            FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cascade_attendee_soft_delete()                        FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.import_leads_from_monday(uuid, text, jsonb)           FROM PUBLIC;

-- Group 3 — KEEP-ANON (no SQL — documenting the intentional non-action):
--   register_lead_to_event(uuid, uuid, uuid, text)        — public form + WhatsApp QR
--   submit_storefront_lead(uuid, uuid, text, text)        — storefront ingress
--   verify_campaign_page_password(uuid, text, text)       — storefront password gate
-- These keep PUBLIC=X + direct anon=X. Tenant validation in the body remains the defense.

COMMIT;
