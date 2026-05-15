# ROLLBACK — M4_FAILED_MESSAGE_BADGE_CLEANUP

> **Authored:** 2026-05-15 alongside the migration commit.
> **When to use:** Only if a critical issue surfaces post-merge that requires undoing this SPEC.
> **Why this file instead of `_down.sql`:** Per `M4_TEMPLATE_VALIDATION_UNIFIED/FOREMAN_REVIEW.md` Author Proposal #1 — purely-additive migrations with `## Destructive Operations` declared as targeted Level-2 UPDATEs only get a ROLLBACK.md rather than a `_down.sql`. Keeps the migration folder additive-only.

## Rollback steps (in order)

Run these as `service_role` via Supabase SQL editor. **DO NOT** run partial rollback — run all 6 or skip rollback entirely.

### 1. Reverse the 758-row Prizma UPDATE (only if cleanup ran)

```sql
UPDATE crm_message_log
SET acknowledged_at = NULL, acknowledged_by = NULL, acknowledged_reason = NULL
WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
  AND acknowledged_reason LIKE '2026_05_13_unsubstituted_placeholder%';
-- Expected: 758 rows updated.
```

### 2. Drop the RPC

```sql
DROP FUNCTION IF EXISTS public.acknowledge_failed_messages(uuid[], text);
```

### 3. Drop the index

```sql
DROP INDEX IF EXISTS public.idx_crm_message_log_ack;
```

### 4. Drop the 3 columns

```sql
ALTER TABLE public.crm_message_log
  DROP COLUMN IF EXISTS acknowledged_at,
  DROP COLUMN IF EXISTS acknowledged_by,
  DROP COLUMN IF EXISTS acknowledged_reason;
```

### 5. Revoke the permission key

```sql
DELETE FROM public.role_permissions
WHERE permission_id = 'crm.message_log.acknowledge';

DELETE FROM public.permissions
WHERE id = 'crm.message_log.acknowledge';
```

### 6. Revert code commits

```bash
# Identify the commit range introduced by this SPEC:
git log --oneline --all -- "modules/Module 4 - CRM/docs/specs/M4_FAILED_MESSAGE_BADGE_CLEANUP/" \
  modules/crm/crm-failed-messages-modal.js \
  modules/crm/crm-leads-tab.js \
  modules/crm/crm-leads-detail-messages.js \
  crm.html

# Then on develop:
git revert <oldest_commit_hash>..<newest_commit_hash>
git push origin develop
```

## Verification after rollback

```sql
-- 1. Columns gone
SELECT COUNT(*) FROM information_schema.columns
WHERE table_schema='public' AND table_name='crm_message_log'
  AND column_name LIKE 'acknowledged_%';
-- Expected: 0

-- 2. Index gone
SELECT COUNT(*) FROM pg_indexes
WHERE schemaname='public' AND indexname='idx_crm_message_log_ack';
-- Expected: 0

-- 3. RPC gone
SELECT COUNT(*) FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='acknowledge_failed_messages';
-- Expected: 0

-- 4. Permission gone
SELECT COUNT(*) FROM permissions WHERE id='crm.message_log.acknowledge';
-- Expected: 0

-- 5. Prizma chip count back to 760
SELECT COUNT(DISTINCT lead_id) FROM crm_message_log
WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
  AND status='failed' AND lead_id IS NOT NULL
  AND created_at >= now() - interval '90 days';
-- Expected: 760
```

## Idempotency

This rollback is idempotent — running it twice produces the same end state (no errors on the second run because of `IF EXISTS` / DELETE conditions). Safe to retry if interrupted.

End of ROLLBACK.
