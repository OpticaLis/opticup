-- M4_TENANT_ISOLATION_HARDENING_PART2 (rollback)
-- Restores GRANT EXECUTE on the 11 RPCs revoked by the forward migration:
-- restores both the direct grants (anon for Group 1, anon+authenticated for
-- Group 2) AND the PUBLIC EXECUTE inheritance Postgres applies by default.

BEGIN;

-- Restore PUBLIC EXECUTE
GRANT EXECUTE ON FUNCTION public.move_attendee_between_events(uuid, uuid)              TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_in_attendee(uuid, uuid)                         TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_credit_to_new_attendee(uuid, uuid)           TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_crm_event_number(uuid, uuid)                     TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.restore_event_from_log(uuid, uuid)                    TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.soft_delete_event_if_empty(uuid, uuid)                TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_lead_status_from_attendee(uuid, uuid)            TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.cascade_attendee_soft_delete()                        TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.import_leads_from_monday(uuid, text, jsonb)           TO PUBLIC;

-- Restore direct grants
GRANT EXECUTE ON FUNCTION public.move_attendee_between_events(uuid, uuid)              TO anon;
GRANT EXECUTE ON FUNCTION public.check_in_attendee(uuid, uuid)                         TO anon;
GRANT EXECUTE ON FUNCTION public.transfer_credit_to_new_attendee(uuid, uuid)           TO anon;
GRANT EXECUTE ON FUNCTION public.next_crm_event_number(uuid, uuid)                     TO anon;
GRANT EXECUTE ON FUNCTION public.restore_event_from_log(uuid, uuid)                    TO anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_event_if_empty(uuid, uuid)                TO anon;
GRANT EXECUTE ON FUNCTION public.sync_lead_status_from_attendee(uuid, uuid)            TO anon;
GRANT EXECUTE ON FUNCTION public.cascade_attendee_soft_delete()                        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.import_leads_from_monday(uuid, text, jsonb)           TO anon, authenticated;

COMMIT;
