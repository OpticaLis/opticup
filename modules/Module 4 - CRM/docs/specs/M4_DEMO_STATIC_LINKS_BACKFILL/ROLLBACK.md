# ROLLBACK — M4_DEMO_STATIC_LINKS_BACKFILL

Rollback artifact for the forward migration. NOT executed in the forward Pipeline run; consulted only if `FOREMAN_REVIEW.md` verdict is 🔴 REOPEN.

Per `SPEC.md` §6, executing this rollback is a separate event requiring fresh Daniel confirmation per CLAUDE.md §9.

## SQL — undo the 2 demo INSERTs

```sql
-- Tenant-scoped + link_type-scoped + target_url-scoped DELETE.
-- Iron Rule 32: declared destructive op in §7 of THIS rollback artifact only
-- (the forward SPEC declares §7 = "None.").

BEGIN;

DELETE FROM public.short_links
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'  -- demo
  AND link_type = 'template_static'
  AND target_url IN (
    'https://www.prizma-optic.co.il/supersale-stock/',
    'https://www.prizma-optic.co.il/supersalepricescatalog/'
  );

-- Expected row count: 2 deleted (or 0 if already rolled back).
-- Verify: row count = 0 for these target_url + tenant_id + link_type combos.

SELECT count(*) AS post_rollback
FROM public.short_links
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND link_type = 'template_static'
  AND target_url IN (
    'https://www.prizma-optic.co.il/supersale-stock/',
    'https://www.prizma-optic.co.il/supersalepricescatalog/'
  );
-- Expected: 0

COMMIT;
```

## Git rollback

After the SQL above runs successfully:

```
git reset --hard pre-m4-demo-static-links-backfill
git push --force-with-lease origin develop  # only if commits already pushed
```

Tag `pre-m4-demo-static-links-backfill` is set by the Executor as a precondition to Commit 1.

## What this rollback does NOT undo

- Pipeline session lock — release manually via `node scripts/pipeline-coordination.mjs release --spec-slug M4_DEMO_STATIC_LINKS_BACKFILL`.
- `regopen_email_preview.html` EOF-padding repair at repo root — the file's HTML content is unchanged from Daniel's original; only 9 NUL bytes of EOF padding were removed. No reason to "un-repair" it.

## Re-verification after rollback

Run smoke S3 (demo template_static count) — should be 2 (the pre-SPEC baseline). Run smoke S4 (prizma) — should be 4 (unchanged throughout).
