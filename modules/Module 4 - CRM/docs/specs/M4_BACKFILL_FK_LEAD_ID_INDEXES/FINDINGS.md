# FINDINGS — M4_BACKFILL_FK_LEAD_ID_INDEXES

## F-01 (resolved in this SPEC) — Audit Risk #1 closed
- **Severity:** HIGH originally, resolved here.
- **What:** 4 missing FK indexes turning lead deletes into O(N×M) seq scans across child tables. Diagnosed during M4 full audit teardown.
- **Resolution:** 4 `CREATE INDEX IF NOT EXISTS ... WHERE lead_id IS NOT NULL`. Verified via EXPLAIN + sample DELETE timing.

## F-02 (INFO) — `apply_migration` doesn't auto-write the migration file to disk
- **Severity:** INFO.
- **What:** Supabase MCP `apply_migration` registers the migration in the live DB but does not write the `.sql` file to `supabase/migrations/`. Each SPEC must manually mirror.
- **Status:** mirrored manually here. Same pattern noted in `M4_SCE_CONSUMER_RACE_FIX` FINDINGS earlier today.

## F-03 (INFO — future-watch) — `crm_capi_dispatch_queue.lead_id` already has an index (good), `crm_lead_tags.lead_id` already has an index (good), `crm_event_attendees.lead_id` already has an index (good), `crm_message_queue.lead_id` already has an index + `ON DELETE CASCADE` (good). No additional FK index gaps detected at audit time.

---
*End of findings.*
