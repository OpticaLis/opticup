# TEST_REPORT — M4_SHORT_LINKS_CODE_TENANT_SCOPED_UNIQUE

## 1. Verification approach (when execution resumes)
1. **Pre-check** (mandatory gate):
   ```sql
   SELECT code, count(DISTINCT tenant_id) AS tenant_count, array_agg(DISTINCT tenant_id) AS tenants
     FROM short_links GROUP BY code HAVING count(DISTINCT tenant_id) > 1;
   ```
   Expected: **0 rows.** If any rows return → STOP.

2. **Apply** via `apply_migration` after pre-check passes.

3. **Post-apply check:**
   ```sql
   SELECT indexname, indexdef FROM pg_indexes
    WHERE schemaname='public' AND tablename='short_links' AND indexname LIKE '%code%';
   ```
   Expected: `short_links_tenant_code_unique` listed; `short_links_code_unique` absent.

4. **Sanity test A (cross-tenant codes allowed):**
   ```sql
   -- on demo
   INSERT INTO short_links (tenant_id, code, target_url, link_type, expires_at, ...)
   VALUES ('demo-uuid', 'TEST1234', '...', 'template_static', ...);
   -- on prizma — same code, different tenant — should SUCCEED post-migration
   INSERT INTO short_links (tenant_id, code, target_url, link_type, expires_at, ...)
   VALUES ('prizma-uuid', 'TEST1234', '...', 'template_static', ...);
   ```

5. **Sanity test B (same-tenant duplicate codes still blocked):**
   ```sql
   -- on demo — try to re-insert the same code — should FAIL with UNIQUE violation
   INSERT INTO short_links (tenant_id, code, target_url, link_type, expires_at, ...)
   VALUES ('demo-uuid', 'TEST1234', '...', 'template_static', ...);
   ```

6. **Cleanup the 2 test rows.**

## 2. Status this Sprint
- Migration file: authored + committed.
- Pre-check: **could not run** due to Supabase outage.
- Apply: not attempted.
- Post-checks: not applicable.

## 3. Verdict
🟡 **AUTHORED ONLY — EXECUTION DEFERRED.** Resume path documented in EXECUTION_REPORT + migration file header.

---
*End of test report.*
