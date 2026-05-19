# SPEC — M3_DEMO_TENANT_SLUG_FIX

**Module:** Module 3 — Storefront
**Author:** opticup-strategic (Site Overseer, acting as Foreman)
**Created:** 2026-05-18 (after empirical proof that demo `/supersale/` lead landed in prizma's CRM despite predecessor SPECs)
**Type:** Root-cause SaaS-isolation fix — closes the actual lead-routing leak
**Severity:** CRITICAL (active production: every demo form submission is INSERTed into prizma's CRM)
**Predecessors:**
- `M3_DEMO_TENANT_SEED_FROM_PRIZMA` 🟡 — seeded demo with prizma content; intended `tenant_slug=prizma → demo` rewrite missed due to jsonb-text escape defect
- `M3_DEMO_WEBHOOK_SCRUB` 🟡 — scrubbed 1 webhook + emails + seo; did NOT fix tenant_slug routing or 3 other webhooks

---

## 1. Goal — actually close the lead leak this time

Daniel filled the demo `/supersale/` form at 13:10 UTC and the lead landed in prizma's `crm_leads` table (verified read-only: `tenant_id='6ad0781b-...'`, prizma's UUID). The 2 prior SPECs targeted the Make webhook layer (notification side) but **did not fix the actual routing layer**: the rendered HTML's inline JS submit handler ships `data.tenant_slug='prizma'` to the `lead-intake` Edge Function. The EF resolves slug→UUID and INSERTs into `crm_leads` with prizma's tenant_id directly. The Make webhook is a notification chain that runs AFTER the INSERT — scrubbing it does not stop the leak.

**Three deliverables, one SPEC:**

1. **F-A — Fix `tenant_slug` in `/supersale/` HE form** (escape-aware). UPDATE `storefront_pages.blocks` so the shortcode parameter `tenant_slug=\"prizma\"` becomes `tenant_slug=\"demo\"`. This is the routing fix.
2. **F-B — Scrub 3 additional Make webhooks** discovered in demo's pages (not just `/supersale/`): `/eventsunsubscribe/`, `/multisale-brands-cat/`, `/premiummultisale/`, `/מיופיה/`. Each contains a different prizma webhook ID. All 4 webhooks emptied.
3. **F-C — Document decision on prizma UUID in image paths** (22 pages). Decision: leave as-is. Image proxy resolves by UUID-in-path and the assets live under prizma's storage tenant; demo would show broken images if rewritten. Not a SaaS-isolation defect (no data leak — only asset serving). Logged in FINDINGS.

---

## 2. Background — verified live 2026-05-18 (read-only)

### F-A — The actual routing leak (rendered HTML evidence)

The rendered HTML of `https://opticup-storefront-demo.vercel.app/supersale/` contains this inline submit handler:

```javascript
function scSubmitForm_sc_form_6ad9d8(e) {
  ...
  data.tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';  // demo UUID — set first
  data.form_id = 'supersale-form';
  ...
  delete data.tenant_id;                                     // then deleted
  data.tenant_slug = 'prizma';                               // ← routing payload
  data.language = 'he';
  fetch('https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/lead-intake', ...);
}
```

The `tenant_slug='prizma'` is generated at build/render time from the shortcode in the page's blocks. Stored bytes in DB:

```sql
SELECT substring(blocks::text,
  position('tenant_slug' in blocks::text)-10, 100)
FROM storefront_pages
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND slug='/supersale/' AND lang='he';
```

Returns:
```
-intake\" tenant_slug=\"prizma\" display=\"popup\" logo=\"true\" title=\"הרשמה + קטלוג המחירים לאירו
```

Inner quotes are escaped as `\"` (2 bytes: backslash + quote). Predecessor SPEC's `replace('tenant_slug="prizma"', 'tenant_slug="demo"')` matched 0 occurrences because the stored form is `tenant_slug=\"prizma\"`. The correct postgres E-string pattern is `E'tenant_slug=\\"prizma\\"'`.

### F-A proof — the leak actually fired

```sql
SELECT id, tenant_id,
  (SELECT slug FROM tenants WHERE id=cl.tenant_id) AS tenant_slug,
  full_name, source, created_at
FROM crm_leads cl
WHERE created_at > now() - interval '30 minutes'
ORDER BY created_at DESC LIMIT 1;
```

Returns at 13:10 UTC:
```
id='a0da1210-0ce9-40cf-89d9-ccf018de5b19'
tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'  ← prizma UUID
tenant_slug='prizma'                              ← prizma tenant
full_name='TEST4343'
source='shortcode_lead_form'
created_at='2026-05-18 13:10:34.214406+00'
```

The lead was filled on the demo storefront but landed in prizma's tenant. This is the leak F-A closes.

### F-B — 4 webhooks total in demo's pages (predecessor SPEC fixed 1 of 4)

```sql
SELECT slug, lang,
  substring(blocks::text,
    position('hook.eu2.make.com' in blocks::text)-30,
    80) AS webhook_context
FROM storefront_pages
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND blocks::text LIKE '%hook.eu2.make.com%';
```

Returns 4 rows (all HE):

| slug | webhook ID | shortcode attribute |
|---|---|---|
| `/eventsunsubscribe/` | `tdeh8dmdgms371ve2pk8ewtevw6cseb7` | inline `<script>fetch('...')...` (not a `[lead_form]` shortcode — direct fetch in HTML body) |
| `/multisale-brands-cat/` | `v8skbdwxt925tlhig7psdq4b3isw6efx` | `webhook_url=\"...\"` (in `[lead_form]` shortcode) |
| `/premiummultisale/` | `v8skbdwxt925tlhig7psdq4b3isw6efx` | `webhook_url=\"...\"` (in `[lead_form]` shortcode) |
| `/מיופיה/` | `tdeh8dmdgms371ve2pk8ewtevw6cseb7` | `webhook_url=\"...\"` (in `[lead_form]` shortcode) |

Note: `/eventsunsubscribe/` uses a direct inline fetch, not a `[lead_form]` shortcode. Its pattern is `fetch('https://hook.eu2.make.com/<id>'` — different form. Handled separately in §6 Step 3a.

### F-C — Image UUIDs (22 pages, accepted as-is)

```sql
SELECT count(*) FROM storefront_pages
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND blocks::text LIKE '%6ad0781b-37f0-47a9-92e3-be9ed1477e1c%';
-- Returns 22 — all are /api/image/media/{prizma-uuid}/... paths
```

These are image proxy paths. Daniel decision 2026-05-18: leave them. Rewriting to demo UUID would point at demo's empty media bucket → broken images everywhere. Document and move on.

### Tenant UUID lock

All writes scoped to: `tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'` (demo). No writes to prizma.

---

## 3. Step 0 — Pre-flight (MANDATORY)

Run in order. STOP if any fails.

```sql
-- 0a. Confirm demo tenant UUID
SELECT count(*) FROM tenants WHERE id='8d8cfa7e-ef58-49af-9702-a862d459cccb' AND slug='demo';
-- Expected: 1

-- 0b. Confirm tenant_slug=prizma leak still present (escape-aware pattern)
SELECT count(*) FROM storefront_pages
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND blocks::text LIKE '%tenant_slug=\\"prizma\\"%';
-- Expected: 1 (just /supersale/ HE).
-- If 0 → F-A already fixed somehow. STOP, re-investigate before writing.

-- 0c. Confirm 4 distinct webhook URLs still in demo pages
SELECT count(DISTINCT slug || ':' || lang) FROM storefront_pages
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND blocks::text LIKE '%hook.eu2.make.com%';
-- Expected: 4

-- 0d. Confirm prizma untouched
SELECT count(*) FROM storefront_pages
WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
  AND status='published' AND (is_deleted IS NULL OR is_deleted=false);
-- Expected: 64

-- 0e. Pipeline coordination
node scripts/pipeline-coordination.mjs claim site-overseer-m3-tenant-slug-fix \
  --files "modules/Module 3 - Storefront/docs/specs/M3_DEMO_TENANT_SLUG_FIX/**" \
  --db-tables "storefront_pages" \
  --tenant-scope "demo-only"
node scripts/pipeline-coordination.mjs check-collision --spec-slug M3_DEMO_TENANT_SLUG_FIX --self
-- Expected: clean.
```

If 0a–0e all pass: proceed.

---

## 4. Destructive Operations

Per Iron Rule 32 — declared list. ALL writes scoped to `tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'` (demo).

1. **UPDATE on `storefront_pages.blocks`** WHERE `tenant_id=demo AND slug='/supersale/' AND lang='he'`. Single row. Replaces `tenant_slug=\"prizma\"` with `tenant_slug=\"demo\"` via escape-aware `replace()`.
2. **UPDATE on `storefront_pages.blocks`** WHERE `tenant_id=demo AND slug IN ('/multisale-brands-cat/', '/premiummultisale/', '/מיופיה/') AND lang='he'`. Up to 3 rows. Replaces `webhook_url=\"https://hook.eu2.make.com/<id>\"` with `webhook_url=\"\"` for each row's specific webhook ID.
3. **UPDATE on `storefront_pages.blocks`** WHERE `tenant_id=demo AND slug='/eventsunsubscribe/' AND lang='he'`. Single row. Replaces the direct-fetch URL `https://hook.eu2.make.com/tdeh8dmdgms371ve2pk8ewtevw6cseb7` with `about:blank` (so the fetch fires but harmlessly fails — preserves shape of the inline script).

NOT in this SPEC:
- No INSERT, no DELETE.
- No DDL.
- No writes to prizma — every WHERE clause includes the demo UUID literal.
- No code changes in either repo.
- No changes to image proxy paths (F-C decision: accept).
- No `main` operations.

---

## 5. Files Owned

- `modules/Module 3 - Storefront/docs/specs/M3_DEMO_TENANT_SLUG_FIX/**`
- DB rows: `storefront_pages` blocks column, demo tenant only, 5 specific (slug, lang) tuples.

NOT owned: code, prizma rows, other tables.

---

## 6. Implementation Steps

### Step 1 — Snapshot (rollback safety)

```sql
-- BACKUPS/demo_blocks_pre.json — 5 rows that will be UPDATE'd
SELECT json_agg(json_build_object(
  'id', id, 'slug', slug, 'lang', lang, 'blocks', blocks
))
FROM storefront_pages
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND slug IN ('/supersale/', '/multisale-brands-cat/', '/premiummultisale/', '/מיופיה/', '/eventsunsubscribe/')
  AND lang='he';
```

Commit BEFORE writes. Note: MCP 30k-char limit may force the Python-unwrap pattern from prior SPEC's F-4. Account for it.

### Step 2 — F-A: tenant_slug fix on /supersale/

```sql
UPDATE storefront_pages
SET blocks = replace(blocks::text, E'tenant_slug=\\"prizma\\"', E'tenant_slug=\\"demo\\"')::jsonb,
    updated_by = 'M3_DEMO_TENANT_SLUG_FIX',
    updated_via = 'seed',
    updated_at = now()
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND slug='/supersale/' AND lang='he';
-- Expected affected_rows: 1
```

Verify:
```sql
SELECT count(*) FROM storefront_pages
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND blocks::text LIKE '%tenant_slug=\\"prizma\\"%';
-- Expected: 0

SELECT count(*) FROM storefront_pages
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND blocks::text LIKE '%tenant_slug=\\"demo\\"%';
-- Expected: 1 (or more if there are other demo-rewriting occurrences in other slugs)

SELECT jsonb_typeof(blocks)='array' FROM storefront_pages
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND slug='/supersale/' AND lang='he';
-- Expected: true (Rule 31 + REC-SITE-003 CHECK preserved)
```

### Step 3 — F-B: 3 additional webhook scrubs

Step 3a — `[lead_form]` shortcode webhooks (3 slugs, 2 distinct IDs):

```sql
-- multisale-brands-cat + premiummultisale share webhook v8skbdwxt925tlhig7psdq4b3isw6efx
UPDATE storefront_pages
SET blocks = replace(
               blocks::text,
               E'webhook_url=\\"https://hook.eu2.make.com/v8skbdwxt925tlhig7psdq4b3isw6efx\\"',
               E'webhook_url=\\"\\"'
             )::jsonb,
    updated_by = 'M3_DEMO_TENANT_SLUG_FIX',
    updated_via = 'seed',
    updated_at = now()
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND slug IN ('/multisale-brands-cat/', '/premiummultisale/')
  AND lang='he';
-- Expected affected_rows: 2

-- מיופיה uses webhook tdeh8dmdgms371ve2pk8ewtevw6cseb7 (same as eventsunsubscribe)
UPDATE storefront_pages
SET blocks = replace(
               blocks::text,
               E'webhook_url=\\"https://hook.eu2.make.com/tdeh8dmdgms371ve2pk8ewtevw6cseb7\\"',
               E'webhook_url=\\"\\"'
             )::jsonb,
    updated_by = 'M3_DEMO_TENANT_SLUG_FIX',
    updated_via = 'seed',
    updated_at = now()
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND slug='/מיופיה/'
  AND lang='he';
-- Expected affected_rows: 1
```

Step 3b — direct-fetch URL in `/eventsunsubscribe/`:

```sql
UPDATE storefront_pages
SET blocks = replace(
               blocks::text,
               'https://hook.eu2.make.com/tdeh8dmdgms371ve2pk8ewtevw6cseb7',
               'about:blank'
             )::jsonb,
    updated_by = 'M3_DEMO_TENANT_SLUG_FIX',
    updated_via = 'seed',
    updated_at = now()
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND slug='/eventsunsubscribe/'
  AND lang='he';
-- Expected affected_rows: 1
```

Note: `/eventsunsubscribe/` has the URL in a different context (direct `fetch('...')` not `webhook_url=...`), so the pattern is different. The match string contains NO quotes (the URL is inside `fetch('...')` single quotes which Astro preserves as `fetch(\'...\')` or similar). Probe before run if needed.

Verify all 4 webhooks scrubbed:
```sql
SELECT count(*) FROM storefront_pages
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND blocks::text LIKE '%hook.eu2.make.com%';
-- Expected: 0
```

If non-zero → STOP, write FINDINGS with which slug + which webhook ID still leaks.

### Step 4 — F-C: log image UUID decision (no DB write)

Write FINDINGS entry F-3 documenting: 22 demo pages contain `/api/image/media/6ad0781b-37f0-47a9-92e3-be9ed1477e1c/...` paths. Decision: leave as-is. Demo's media bucket is empty; rewriting to demo UUID breaks all images. Image proxy handles cross-tenant serving by UUID-in-path so this works in practice. If/when demo gets its own media library, follow-up SPEC `M3_DEMO_MEDIA_SEED` can rewrite all 22 paths in a single UPDATE.

### Step 5 — Verification (CRITICAL — includes live form-submit test)

**5a — DB-level checks (necessary but not sufficient):**

```sql
-- All 4 webhook leaks scrubbed
SELECT count(*) FROM storefront_pages
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND blocks::text LIKE '%hook.eu2.make.com%';
-- Expected: 0

-- tenant_slug routing fix landed
SELECT count(*) FROM storefront_pages
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND blocks::text LIKE '%tenant_slug=\\"prizma\\"%';
-- Expected: 0

-- All affected rows still valid jsonb arrays
SELECT count(*) FROM storefront_pages
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND updated_by='M3_DEMO_TENANT_SLUG_FIX'
  AND jsonb_typeof(blocks) <> 'array';
-- Expected: 0

-- Prizma untouched
SELECT count(*) FROM storefront_pages
WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
  AND blocks::text LIKE '%tenant_slug=\\"prizma\\"%';
-- Expected: same as pre-write (don't care about exact value, just that we didn't touch prizma)
```

**5b — Rendered HTML check:**

```bash
curl -sL https://opticup-storefront-demo.vercel.app/supersale/ -A "Mozilla/5.0" -o /tmp/demo-ss-post.html
grep -c "tenant_slug = 'prizma'" /tmp/demo-ss-post.html
# Expected: 0
grep -c "tenant_slug = 'demo'" /tmp/demo-ss-post.html
# Expected: ≥ 1
```

**5c — LIVE FORM SUBMIT TEST (MANDATORY — this SPEC does NOT close 🟢 without it):**

The Executor MUST perform an actual form submission against the demo `/supersale/` form and confirm the lead lands in demo's CRM, NOT prizma's. Two acceptable methods:

**Method A (preferred) — direct EF curl with the body the form would send:**

```bash
RESPONSE=$(curl -sS -X POST 'https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/lead-intake' \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://opticup-storefront-demo.vercel.app' \
  -H 'apikey: <PUBLISHABLE_ANON_KEY_FROM_CLAUDE_MD>' \
  -d '{
    "tenant_slug":"demo",
    "language":"he",
    "form_id":"supersale-form",
    "form_name":"M3_DEMO_TENANT_SLUG_FIX verification probe",
    "name":"SPECTEST_TENANT_SLUG_FIX",
    "phone":"+972503348349",
    "email":"daniel@prizma-optic.co.il",
    "בדיקת ראייה":"לא צריך",
    "הערות":"automated spec verification — discard"
  }')
echo "$RESPONSE"
```

Note: phone must be `+972503348349` (the second approved demo test number, per `feedback_test_phone_numbers`). DO NOT use `+972537889878` (Daniel's primary; would pollute his CRM). DO NOT use a random number (Make sends real SMS).

Wait 10 seconds for INSERT to complete, then:

```sql
SELECT id, tenant_id,
  (SELECT slug FROM tenants WHERE id=cl.tenant_id) AS tenant_slug,
  full_name, source, created_at
FROM crm_leads cl
WHERE full_name='SPECTEST_TENANT_SLUG_FIX'
  AND created_at > now() - interval '2 minutes'
ORDER BY created_at DESC LIMIT 1;
```

**Required:** `tenant_slug='demo'` (NOT `prizma`). If `tenant_slug='prizma'` → CRITICAL FAIL, the routing fix did NOT work, STOP and close 🟡 with FINDINGS naming why.

**Method B (fallback) — Playwright/headless browser fills the actual form on `https://opticup-storefront-demo.vercel.app/supersale/`** using the same phone + name + body. Then same DB check.

**Method C (last resort) — if Methods A+B both blocked: localhost.** Per Daniel directive 2026-05-18: "אם צריך, הLOCALHOST למעלה." Bring up the storefront on `localhost:4321` via `scripts/start-local.ps1` (per docs/AUTONOMOUS_MODE.md Safety-Infra), submit the form there, do the same DB check. Localhost build will pick up the updated `storefront_pages` from the live Supabase DB so the test is equivalent.

**5d — Cleanup the test lead:**

```sql
DELETE FROM crm_leads
WHERE full_name='SPECTEST_TENANT_SLUG_FIX'
  AND tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb';
-- Expected: 1 row deleted (the verification probe)
```

The DELETE is added to the destructive ops list below (§4 item 4 — added 2026-05-18).

---

## 7. Success Criteria

This SPEC closes 🟢 GREEN only if ALL true:

1. `storefront_pages` for demo: 0 rows contain `tenant_slug=\"prizma\"` (escape-aware match).
2. `storefront_pages` for demo: 0 rows contain `hook.eu2.make.com` (all 4 webhooks scrubbed).
3. All UPDATEd rows still have `jsonb_typeof(blocks)='array'` (Rule 31).
4. Rendered HTML of demo `/supersale/` contains `tenant_slug = 'demo'`, NOT `'prizma'`.
5. **LIVE FORM SUBMIT TEST PASSES**: a test lead submitted to demo `/supersale/` lands in `crm_leads` with `tenant_id='8d8cfa7e-...'` (demo), NOT prizma's UUID.
6. Prizma's `storefront_pages` untouched (still 64 published).
7. Prizma's `crm_leads` did NOT receive any row with `full_name='SPECTEST_TENANT_SLUG_FIX'`.

If criterion #5 fails → CRITICAL — close 🟡 PARTIAL, write FINDINGS, and DO NOT claim the leak is fixed. The prior 2 SPECs already failed this check by not running it; this SPEC must not repeat the mistake.

---

## 8. Out of Scope

- The 22 image-proxy paths with prizma UUID — accepted per Daniel decision 2026-05-18.
- Demo-specific Make webhook URLs — kept empty (or `about:blank` for the direct-fetch case). Daniel sets demo-specific webhooks separately if/when demo needs full automation chain.
- The cosmetic `<title>` issue from prior SPEC (deferred by Daniel 2026-05-18).
- Schema changes, code changes, file changes (none of these needed).
- Demo lens inventory.

---

## 9. Rollback

If Step 5c LIVE FORM SUBMIT fails despite Steps 2-3 succeeding:

```sql
-- Restore demo blocks from BACKUPS/demo_blocks_pre.json
-- Per-row UPDATE storefront_pages SET blocks=<original> WHERE id=<row_id>
```

Verification after rollback:
```sql
SELECT count(*) FROM storefront_pages
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND blocks::text LIKE '%tenant_slug=\\"prizma\\"%';
-- Expected after rollback: 1 (back to pre-state)
```

Notify Daniel that the routing fix is more complex than the SPEC's hypothesis and needs deeper investigation (e.g., shortcode renderer code, not just DB content).

---

## 10. Stop Triggers (non-overridable)

- Step 0 pre-flight count mismatch.
- Step 2 affected_rows ≠ 1.
- Step 3a affected_rows ≠ 2 (multisale + premium).
- Step 3a second statement affected_rows ≠ 1 (מיופיה).
- Step 3b affected_rows ≠ 1 (eventsunsubscribe).
- Step 5a: any "expected 0" returns > 0.
- Step 5b: rendered HTML still contains `tenant_slug = 'prizma'`.
- **Step 5c (live form): test lead lands in prizma — CRITICAL, Daniel directly.**
- Any indication of prizma tenant write.

Per ABSOLUTE RULES: close 🟡 PARTIAL on STOP, write FINDINGS, do not silent-close.

---

## 11. Authorities

- **Level 2 SQL UPDATE** on demo `storefront_pages.blocks` (5 rows total) — AUTHORIZED per §4 #1-3.
- **Level 2 SQL DELETE** on `crm_leads` WHERE `full_name='SPECTEST_TENANT_SLUG_FIX' AND tenant_id=demo` — AUTHORIZED per §4 #4 (cleanup of verification probe).
- **EF call to `lead-intake`** with the test body — informational call, not a write to a project-owned table. AUTHORIZED.
- **Localhost storefront startup** via `scripts/start-local.ps1` if Methods A/B blocked — AUTHORIZED per Daniel directive 2026-05-18.
- **NO DDL.** **NO Vercel redeploy** (SSR — no need). **NO main branch ops.**

Commit message: `fix(demo): tenant_slug routing + 3 additional webhooks scrubbed + live form-submit verified (closes M4 cross-tenant leak)`.

---

## 12. Deliverables

In the SPEC folder:
- `SPEC.md` (this file)
- `ACTIVATION_PROMPT.md` (sibling)
- `BACKUPS/demo_blocks_pre.json` (5 rows)
- `EXECUTION_REPORT.md` — must include Step 5c live-test outcome with the test lead's `tenant_id` quoted verbatim
- `FINDINGS.md` — F-C image UUIDs decision + anything else
- (later) `FOREMAN_REVIEW.md` by Foreman

Per `feedback_no_polish_by_validation`: FINDINGS must distinguish:
- "Executed and verified live" (the live form-submit test passing is the gold standard — explicitly required by Daniel 2026-05-18)
- "Verified at DB level only" (necessary but NOT sufficient)
- "Deferred/out-of-scope"

No silent 🟢 close. The 2 prior SPECs closed 🟡 because they didn't run the live test. This SPEC must.

---

## 13. Notes for the Executor — why this is the 3rd SPEC

The first 2 SPECs failed to close the actual leak because:

1. **SPEC #1 `M3_DEMO_TENANT_SEED_FROM_PRIZMA`** — `replace()` patterns didn't account for jsonb-text escaping. `tenant_slug="prizma"→demo` and webhook URL rewrites both produced 0 affected rows. Closed 🟡.

2. **SPEC #2 `M3_DEMO_WEBHOOK_SCRUB`** — fixed 1 webhook (jewyavndaly) with correct E-string escape. But:
   - Did NOT discover the 3 other webhooks (`/eventsunsubscribe/`, `/multisale-brands-cat/`, `/premiummultisale/`, `/מיופיה/`).
   - Did NOT fix the `tenant_slug=prizma` routing (it was outside that SPEC's declared §4).
   - Verification was DB-level only — did not submit a real form. The "8/9 success criteria pass" hid the still-open routing leak.
   - Closed 🟡.

3. **THIS SPEC** — closes both the routing leak (F-A) and the remaining 3 webhooks (F-B), AND requires a live form-submit test as a non-skippable success criterion (Daniel directive 2026-05-18 after empirical proof of leak).

The pattern lesson, in one line: **DB-level verification is necessary but NEVER sufficient for SaaS-isolation SPECs. The live form-submit (or end-to-end path traversal) is the gold standard.** This goes into LEARNINGS as L-SITE-004.

---

*End of SPEC. Author: opticup-strategic (Site Overseer Foreman). 2026-05-18, third SPEC in the demo-isolation chain.*
