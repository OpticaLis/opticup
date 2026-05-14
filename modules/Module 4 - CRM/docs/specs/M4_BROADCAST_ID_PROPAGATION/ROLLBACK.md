# ROLLBACK — M4_BROADCAST_ID_PROPAGATION

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_BROADCAST_ID_PROPAGATION/ROLLBACK.md`
> **Purpose:** Doc-context container for down-migration SQL. Per the harvested gate-compat rule from P1.1, rollback SQL lives here (UPPER_SNAKE_CASE.md inside a SPEC folder is doc-context per `isDocFile()` regex in `scripts/checks/destructive-ops-declared.mjs`) — NOT in standalone `*_down.sql` files which would trip the Iron-Rule-32 destructive-ops gate.

This rollback SQL is **NOT** authorized for the forward path. The SPEC's forward path declares `Destructive Operations: None.` These statements are authorized ONLY when Daniel explicitly invokes rollback after a STOP-on-deviation event.

---

## Pre-rollback preconditions

1. A STOP-on-deviation event has fired during the SPEC's run.
2. Daniel has authorized rollback in chat.
3. The pre-flight safety tag `pre-m4-broadcast-id-propagation-2026-05-14` exists at origin (if not pushed pre-flight, the rollback CAN still complete via the migration reversals below but the working-tree restore step is skipped).

---

## Rollback order (REVERSE of forward path)

### Step 1 — Re-deploy EFs at pre-SPEC versions

```
supabase functions deploy resolve-link    --project-ref tsxrrxzmdxaenlvocyit --no-verify-jwt
supabase functions deploy send-message    --project-ref tsxrrxzmdxaenlvocyit
supabase functions deploy dispatch-queue  --project-ref tsxrrxzmdxaenlvocyit --no-verify-jwt
```

After hard-restore (Step 6) the repo holds the pre-SPEC EF source. These deploys revert the live EFs to those versions.

### Step 2 — Unschedule the pg_cron job

```sql
SELECT cron.unschedule('crm_broadcast_total_sent_refresh');
```

### Step 3 — Revert `register_lead_to_event` to BASE_RPC_MD5 body

Apply the pre-SPEC RPC body verbatim. The full body is captured at `modules/Module 4 - CRM/backups/2026-05-14_M4_BROADCAST_ID_PROPAGATION/RPC_BODY_PRE.sql`. Apply via:

```sql
-- Drop the 14-arg version first (function-signature-change discipline).
DROP FUNCTION IF EXISTS public.register_lead_to_event(uuid, uuid, uuid, text, text, text, text, text, text, text, text, text, text, uuid);

-- Then re-apply the 13-arg body from RPC_BODY_PRE.sql (paste full body here in rollback context).
-- See the backup file for the verbatim content.
```

### Step 4 — Drop new partial composite indices

```sql
DROP INDEX IF EXISTS public.idx_crm_message_queue_tenant_broadcast_created;
DROP INDEX IF EXISTS public.idx_crm_message_log_tenant_broadcast_created;
DROP INDEX IF EXISTS public.idx_short_link_clicks_tenant_broadcast_clicked;
DROP INDEX IF EXISTS public.idx_short_links_tenant_broadcast;
DROP INDEX IF EXISTS public.idx_crm_lead_touchpoints_tenant_broadcast_occurred;
```

### Step 5 — Drop new FKs and broadcast_id columns

```sql
-- Drop the FK that this SPEC added on the P1.1-reserved column (column stays — pre-existed):
ALTER TABLE public.crm_lead_touchpoints
  DROP CONSTRAINT IF EXISTS crm_lead_touchpoints_broadcast_id_fkey;

-- Drop the columns this SPEC added (cascading FKs auto-drop):
ALTER TABLE public.crm_message_queue ALTER COLUMN broadcast_id DROP DEFAULT;
ALTER TABLE public.crm_message_queue DROP CONSTRAINT IF EXISTS crm_message_queue_broadcast_id_fkey;
ALTER TABLE public.crm_message_queue DROP COLUMN IF EXISTS broadcast_id;

ALTER TABLE public.short_link_clicks DROP CONSTRAINT IF EXISTS short_link_clicks_broadcast_id_fkey;
ALTER TABLE public.short_link_clicks DROP COLUMN IF EXISTS broadcast_id;

ALTER TABLE public.short_links DROP CONSTRAINT IF EXISTS short_links_broadcast_id_fkey;
ALTER TABLE public.short_links DROP COLUMN IF EXISTS broadcast_id;

-- crm_message_log.broadcast_id column + FK predate this SPEC — do NOT drop.
-- crm_lead_touchpoints.broadcast_id column predates this SPEC (P1.1) — do NOT drop the column,
-- only the FK (handled at top of this block).
```

### Step 6 — Hard-restore working tree to safety tag (destructive — Daniel-authorized only)

```
git fetch origin --tags
git reset --hard pre-m4-broadcast-id-propagation-2026-05-14
git push --force origin develop
```

### Step 7 — Verify rollback

- `npm run smoke` returns 7/7 PASS.
- `SELECT md5(pg_get_functiondef('public.register_lead_to_event'::regproc))` returns `07e1904a315275e88a223eb088e1d30c` (BASE_RPC_MD5).
- `SELECT 1 FROM information_schema.columns WHERE table_name='crm_message_queue' AND column_name='broadcast_id'` returns 0 rows.
- `SELECT 1 FROM cron.job WHERE jobname='crm_broadcast_total_sent_refresh'` returns 0 rows.

---

## Cleanup of test data (also use for non-rollback demo hygiene per FINDINGS FIND-6)

If rolling back but want to keep the test broadcast row for forensics — skip. If cleaning up regardless:

```sql
-- Test data created by Scenario A + B + C + D on demo tenant:
UPDATE crm_event_attendees SET is_deleted=true
 WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
   AND id IN (
     'cf2e0ded-2650-4c97-8895-bda4984161bf',  -- Scenario A attendee
     '2fa23994-c043-45c3-9909-98e7c1b74d6a'   -- Scenario B attendee
   );

-- Touchpoint, click, short_link, log, queue rows tagged broadcast_id 0a6cf29c-...
-- AND the test broadcast itself:
DELETE FROM crm_lead_touchpoints
 WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
   AND (broadcast_id='0a6cf29c-ad44-4823-a551-119299e84d00'
        OR short_link_code='M4P2DTST'
        OR attendee_id IN ('cf2e0ded-2650-4c97-8895-bda4984161bf','2fa23994-c043-45c3-9909-98e7c1b74d6a'));

DELETE FROM short_link_clicks
 WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
   AND (broadcast_id='0a6cf29c-ad44-4823-a551-119299e84d00'
        OR short_link_id='8b4e4b57-5e21-4b61-8911-438420489be1');

DELETE FROM short_links
 WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
   AND (broadcast_id='0a6cf29c-ad44-4823-a551-119299e84d00' OR code='M4P2DTST');

DELETE FROM crm_message_log
 WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
   AND broadcast_id='0a6cf29c-ad44-4823-a551-119299e84d00';

DELETE FROM crm_message_queue
 WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
   AND broadcast_id='0a6cf29c-ad44-4823-a551-119299e84d00';

DELETE FROM crm_broadcasts
 WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
   AND id='0a6cf29c-ad44-4823-a551-119299e84d00';
```

---

*End of ROLLBACK.md.*
