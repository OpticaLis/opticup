# ROLLBACK — M3_SHORTGY_TO_INTERNAL_REDIRECT

> **Location:** `modules/Module 4 - CRM/docs/specs/M3_SHORTGY_TO_INTERNAL_REDIRECT/ROLLBACK.md`
> **Doc-context:** UPPER_SNAKE_CASE.md inside a SPEC folder is doc-context per `isDocFile()` in `scripts/checks/destructive-ops-declared.mjs`. Iron-Rule-32 gate ignores destructive keywords here.
> **Per-step rollback, NOT all-or-nothing.** Each step below is independent.

---

## Pre-flight master safety tag

Before any UPDATE / INSERT, create a master safety tag:
```
git tag pre-M3_SHORTGY_TO_INTERNAL_REDIRECT HEAD
git push origin pre-M3_SHORTGY_TO_INTERNAL_REDIRECT
```

If the entire SPEC must be reverted in one shot:
```
git revert <range>   # for each commit in this SPEC's range
```

---

## Step-level rollback

### Step 1 — `short_links` INSERTs (6 rows)

Forward op: 6 `INSERT` rows with `link_type='template_static'`, `expires_at='2099-12-31'`.

Reverse op (SQL, **tenant-scoped via the predicate** — IR-32 gate-clean since it has a `WHERE` clause):
```sql
DELETE FROM short_links
WHERE link_type = 'template_static'
  AND created_at >= '2026-05-14T00:00:00Z'
  AND tenant_id IN (
    SELECT id FROM tenants WHERE slug IN ('demo', 'prizma')
  );
```
Expected rows removed: 6.

### Step 2 — Template body UPDATEs (10 rows)

Forward op: per-row UPDATE replacing `prizmaoptic.short.gy/<code>` with `<storefront>/r/<new-code>`.

Reverse op: per-row UPDATE from JSON backup at `backups/2026-05-14_M3_SHORTGY_TO_INTERNAL_REDIRECT/db-rows/template_<tprefix>_<id>.json`.

Manual restore script (10 rows; one statement per row):
```sql
UPDATE crm_message_templates
SET body = '<pre-edit body from JSON>',
    updated_at = now()
WHERE id = '<UUID from JSON>'
  AND tenant_id = '<tenant_id from JSON>';
```
Each restore is tenant-scoped via the WHERE clause.

### Step 3 — Tenants `payment_links` UPDATEs (2 rows)

Forward op: 2 UPDATEs swapping `payment_links."50"` from short.gy URL to `/r/<code>` URL.

Reverse op (per row, from JSON backup at `backups/.../db-rows/tenant_<slug>_payment_links.json`):
```sql
UPDATE tenants
SET payment_links = '{"50": "https://prizmaoptic.short.gy/gmapy"}'::jsonb
WHERE slug = 'demo';

UPDATE tenants
SET payment_links = '{"50": "https://prizmaoptic.short.gy/gmapy"}'::jsonb
WHERE slug = 'prizma';
```

### Step 4 — Content draft file edits (4 files)

Forward op: 4 file edits in `campaigns/supersale/MESSAGES UPDATE/`.

Reverse op: copy pre-edit `*_PRE.{txt,html}` files from `backups/2026-05-14_M3_SHORTGY_TO_INTERNAL_REDIRECT/content-drafts/` back over the live files, then `git checkout` the live paths if needed.

### Step 5 — `crm.html` + `modules/crm/crm-short-links-stats.js`

Forward op: add a new tab to `crm.html` + create `modules/crm/crm-short-links-stats.js`.

Reverse op: `git revert <commit>` of the feat(m4,erp) commit will restore both files together (the addition is atomic).

### Step 6 — Doc updates (KNOWLEDGE_MAP / FUNNEL_ROADMAP / M4 SESSION_CONTEXT / M4 db-schema / M4 MODULE_MAP)

Forward op: 1 commit modifying 5 doc files.

Reverse op: `git revert <commit>` of that single commit.

---

## Cleanup of any test artifacts (post-LH-Tester)

If LH-Tester creates test click-probe rows in `short_link_clicks` or `crm_lead_touchpoints` on the demo tenant, those can be left in place (demo is not customer-facing) OR cleaned with:
```sql
DELETE FROM crm_lead_touchpoints
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'   -- demo
  AND touchpoint_type = 'short_link_click'
  AND occurred_at >= '<LH-Tester start ISO>';

DELETE FROM short_link_clicks
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND created_at >= '<LH-Tester start ISO>';
```
Both predicates are tenant-scoped.

---

## Notify Foreman if rollback triggered

Any rollback step → SPEC marked REOPEN, not CLOSED. Surface to Foreman via EXECUTION_REPORT.md §4 Deviation log with the specific step + reason.

---

*End of ROLLBACK.md.*
