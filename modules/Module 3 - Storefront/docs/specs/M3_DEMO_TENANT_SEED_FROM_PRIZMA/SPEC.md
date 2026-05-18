# SPEC — M3_DEMO_TENANT_SEED_FROM_PRIZMA

**Module:** Module 3 — Storefront
**Author:** opticup-strategic (Site Overseer, acting as Foreman)
**Created:** 2026-05-18
**Type:** Data seeding + tenant fix (DB-only, no code change)
**Severity:** HIGH (demo storefront completely broken — every page renders raw WP-legacy text without CSS, blocking M4 form-flow testing in isolation from prizma)

---

## 1. Goal — restore demo storefront to a working state mirroring prizma content, while keeping demo's M4 flow fully isolated

**One sentence:** Seed the `demo` tenant in Supabase so its storefront renders correctly on `opticup-storefront-demo.vercel.app`, with content cloned from `prizma` BUT with M4-side URLs (lead-intake submit_url, Make webhooks, redirect URLs) and tenant_slug references rewritten so demo form submissions land in demo's own M4 flow — never touch prizma.

### Why this is needed

Daniel reported all demo storefront pages render as raw, unstyled text (e.g. `/lab/` shows raw paragraphs with broken `<img src="/wp-content/uploads/...">` markup). Root cause verified read-only:

| What | prizma | demo |
|---|---|---|
| `storefront_config.enabled` | `true` | **`false`** ← primary failure |
| `storefront_config.custom_domain` | `www.prizma-optic.co.il` | NULL |
| `storefront_config.supported_languages` | `['he','en','ru']` | `['he']` |
| `storefront_config.footer_config` | populated | NULL |
| `storefront_pages` published | 64 (30 HE + 17 EN + 17 RU) | **0** |
| `tenants.logo_url` | populated | NULL |
| `tenants.business_email` | service@prizma-optic.co.il | NULL |
| `tenant_branches` | 1 (Ashkelon) | 0 |

The demo tenant has **never been seeded** with storefront content. Vercel build for demo runs the same code as prizma, looks up tenant by hostname → falls back to NULL config + zero pages → Astro renderer falls back to WP-legacy raw output. This is not a code regression; demo simply has no data.

### Why not just "clone prizma to demo"

Daniel directive 2026-05-18: demo must be functionally isolated from prizma's M4 pipeline. The supersale form on prizma posts to a Make webhook that fires prizma's automation. If demo's `/supersale/` posts to the same webhook, demo testing will leak data into prizma's CRM. So this is a **selective seed + rewrite**, not a raw clone.

---

## 2. Background — verified live 2026-05-18 (read-only queries)

### Counts of prizma published pages by language

| lang | pages | total blocks size |
|---|---|---|
| he | 30 | 661,854 bytes |
| en | 17 | 302,691 bytes |
| ru | 17 | 296,930 bytes |
| **total** | **64** | **1,261,475 bytes** |

### Pages with M4 / prizma-domain references (require rewriting on copy)

29 prizma pages contain `prizma-optic.co.il`, `hook.eu2.make.com`, or `tenant_slug="prizma"` strings in their `blocks` jsonb. Examples (HE only shown):

| slug | has prizma URL | has Make webhook | has `tenant_slug=prizma` |
|---|---|---|---|
| `/supersale/` | ✓ | ✓ | ✓ |
| `/successfulsupersale/` | ✓ | — | — |
| `/multisale-brands-cat/` | ✓ | ✓ | — |
| `/premiummultisale/` | ✓ | ✓ | — |
| `/eventsunsubscribe/` | — | ✓ | — |
| `/מיופיה/` | — | ✓ | — |
| `/successfulmulti/` | ✓ | — | — |
| `/supersalepricescatalog/` | ✓ | — | — |
| `/multisale-brands-cat2/` | ✓ | — | — |
| `/multi-takanon/` | ✓ | — | — |
| `/multifocal-guide/` | ✓ | — | — |
| (legal pages /terms/, /privacy/, /deal/, /accessibility/, /צרו-קשר/, /שאלות-ותשובות/, /משלוחים-והחזרות/, /prizma-express-terms/ — × 3 langs) | ✓ | — | — |

**Rewrite rules** (applied at INSERT time via SQL `replace()`):
- `https://prizma-optic.co.il` → `https://opticup-storefront-demo.vercel.app`
- `https://www.prizma-optic.co.il` → `https://opticup-storefront-demo.vercel.app`
- `tenant_slug="prizma"` → `tenant_slug="demo"` (only matches in `/supersale/` HE)
- **WEBHOOK URLs:** the SPEC LEAVES THESE EMPTY (placeholder `webhook_url=""`). Reason: Daniel needs to provide demo-specific Make webhook URLs separately. Form will still submit (Edge Function lead-intake handles it), Make automation simply won't fire until Daniel sets the webhook. This is INTENTIONAL — preserves M4 isolation.

### Tenant UUIDs (verified)

- prizma: `6ad0781b-37f0-47a9-92e3-be9ed1477e1c`
- demo:   `8d8cfa7e-ef58-49af-9702-a862d459cccb`

### Current demo `tenants.ui_config` is healthy and must NOT be touched

Demo's `tenants.ui_config` already has:
- Distinct green brand color (`#059669`) — preserve
- Distinct phone `050-000-0000` — preserve
- Distinct whatsapp `972500000000` — preserve
- 3-email test_mode_email_allowlist — preserve
- `storefront_url: https://opticup-storefront-demo.vercel.app` — preserve

The SPEC does NOT touch `tenants.ui_config`. Only `tenants.logo_url` + `tenants.business_email` are updated.

---

## 3. Step 0 — Pre-flight checks (MANDATORY before any write)

Run these in order. STOP if any fails.

```sql
-- 0a. Confirm tenant UUIDs match what this SPEC expects
SELECT id, slug FROM tenants WHERE slug IN ('prizma','demo');
-- Expected exactly 2 rows; prizma=6ad0781b-... demo=8d8cfa7e-...

-- 0b. Confirm prizma published page count = 64
SELECT count(*) FROM storefront_pages
WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
  AND status='published' AND (is_deleted IS NULL OR is_deleted=false);
-- Expected: 64

-- 0c. Confirm demo has 0 published pages (this SPEC's INSERT must be the first)
SELECT count(*) FROM storefront_pages
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND status='published' AND (is_deleted IS NULL OR is_deleted=false);
-- Expected: 0. If > 0, STOP — prior seeding exists and this SPEC would create duplicates.

-- 0d. Confirm demo storefront_config row exists (we UPDATE, not INSERT)
SELECT count(*), max(enabled::text) FROM storefront_config
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb';
-- Expected: count=1, enabled='false'

-- 0e. Confirm prizma storefront_config row exists (we read FROM here)
SELECT enabled, footer_config IS NOT NULL AS has_footer,
       supported_languages, custom_domain
FROM storefront_config
WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
-- Expected: enabled=true, has_footer=true, supported_languages=['he','en','ru'],
--           custom_domain='www.prizma-optic.co.il'

-- 0f. Confirm demo tenant_branches is empty (we INSERT 1 row)
SELECT count(*) FROM tenant_branches
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND is_deleted=false;
-- Expected: 0

-- 0g. Confirm live broken state (sanity-check before fix)
curl -sL https://opticup-storefront-demo.vercel.app/lab/ \
  -A "Mozilla/5.0" -o /tmp/demo-lab-before.html
grep -c '<style>' /tmp/demo-lab-before.html
# Expected: low number, typically <= 2 (because page-specific styles not rendered).
# Save this file as evidence of pre-state.

-- 0h. Pipeline coordination — claim site-overseer lock
node scripts/pipeline-coordination.mjs claim site-overseer-m3-demo-seed \
  --files "modules/Module 3 - Storefront/docs/specs/M3_DEMO_TENANT_SEED_FROM_PRIZMA/**" \
  --db-tables "storefront_config,storefront_pages,tenants,tenant_branches" \
  --tenant-scope "demo-only"
node scripts/pipeline-coordination.mjs check-collision
# Expected: clean. Parallel ERP session (per Foreman coordination 2026-05-18) confirmed
# Module 1 only — no overlap. If check-collision reports otherwise → STOP.
```

If 0a–0g all pass: proceed. If any fails: STOP, report deviation, do not write.

---

## 4. Destructive Operations

Per Iron Rule 32 — declared list. All operations are **scoped to `tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'` (demo) only**. No writes to prizma.

1. **UPDATE 1 row in `storefront_config`** where `tenant_id=demo`. Copies fields from prizma's row. Reversible via Step 0 snapshot.
2. **INSERT ~64 rows into `storefront_pages`** where `tenant_id=demo`. All new IDs are fresh `gen_random_uuid()`. Reversible via DELETE on `updated_by='M3_DEMO_TENANT_SEED_FROM_PRIZMA'`.
3. **UPDATE 1 row in `tenants`** where `id=demo`. Only `logo_url` + `business_email` columns. Reversible via Step 0 snapshot.
4. **INSERT 1 row into `tenant_branches`** where `tenant_id=demo`. Reversible via DELETE.

NOT in this SPEC:
- No `DROP`, no `TRUNCATE`, no `ALTER TABLE`, no `DROP COLUMN`.
- No mass file deletes, no `git rebase`, no `git reset --hard`, no `git push --force`.
- No edits to CLAUDE.md, SKILL.md, or any governance file.
- No writes to `main` branch directly — final commit lands on `develop`, then optional PR-to-main is Daniel-approved.
- No DELETE from prizma.

---

## 5. Files Owned

This SPEC owns these globs for the duration of execution:

- `modules/Module 3 - Storefront/docs/specs/M3_DEMO_TENANT_SEED_FROM_PRIZMA/**` (SPEC docs, snapshots, reports)
- DB tables, **demo tenant_id only**: `storefront_config`, `storefront_pages`, `tenants` (only `logo_url`+`business_email` columns), `tenant_branches`

NOT owned:
- Any ERP code file (HTML/JS/CSS). Zero code changes in this SPEC.
- Any `opticup-storefront` repo file. Zero storefront code changes.
- prizma tenant rows in any table. Read-only on prizma.
- Module 1 lens tables (parallel session owns these).

---

## 6. Implementation Steps

### Step 1 — Snapshot demo state (rollback safety)

```sql
-- Save current demo state to backup JSON files in this SPEC folder.
-- Run from psql client; redirect output to files in
-- modules/Module 3 - Storefront/docs/specs/M3_DEMO_TENANT_SEED_FROM_PRIZMA/BACKUPS/

-- File: demo_tenants_pre.json
SELECT row_to_json(t) FROM tenants t WHERE id='8d8cfa7e-ef58-49af-9702-a862d459cccb';

-- File: demo_storefront_config_pre.json
SELECT row_to_json(sc) FROM storefront_config sc
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb';

-- File: demo_storefront_pages_pre.json
SELECT json_agg(row_to_json(sp)) FROM storefront_pages sp
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb';

-- File: demo_tenant_branches_pre.json
SELECT json_agg(row_to_json(tb)) FROM tenant_branches tb
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb';
```

Commit these JSON files in the SPEC folder BEFORE any writes. They are the rollback source of truth.

### Step 2 — UPDATE `storefront_config` of demo (copy structure from prizma)

```sql
WITH src AS (
  SELECT theme, footer_config, pages, hero_title, hero_subtitle, hero_image_url,
         favicon_url, og_image_url, categories, seo, analytics,
         google_place_id, google_rating, google_review_count,
         site_logo_url, site_logo_white_url, booking_url,
         notification_method
  FROM storefront_config
  WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
)
UPDATE storefront_config
SET enabled = true,
    custom_domain = 'opticup-storefront-demo.vercel.app',
    supported_languages = '["he","en","ru"]'::jsonb,
    default_language = 'he',
    auto_translate_languages = '["en","ru"]'::jsonb,
    -- Copy structural fields from prizma
    theme = (SELECT theme FROM src),
    footer_config = (SELECT footer_config FROM src),
    pages = (SELECT pages FROM src),
    hero_title = (SELECT hero_title FROM src),
    hero_subtitle = (SELECT hero_subtitle FROM src),
    hero_image_url = (SELECT hero_image_url FROM src),
    favicon_url = (SELECT favicon_url FROM src),
    og_image_url = (SELECT og_image_url FROM src),
    categories = (SELECT categories FROM src),
    seo = (SELECT seo FROM src),
    analytics = (SELECT analytics FROM src),
    site_logo_url = (SELECT site_logo_url FROM src),
    site_logo_white_url = (SELECT site_logo_white_url FROM src),
    booking_url = (SELECT booking_url FROM src),
    notification_method = (SELECT notification_method FROM src),
    -- Do NOT copy: google_place_id/rating/review_count (prizma-specific)
    -- Do NOT copy: whatsapp_number (demo has its own in tenants.ui_config)
    updated_at = now()
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb';
```

Verify post-update:
```sql
SELECT enabled, custom_domain, supported_languages,
       footer_config IS NOT NULL AS has_footer
FROM storefront_config WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb';
-- Expected: enabled=true, custom_domain='opticup-storefront-demo.vercel.app',
--           supported_languages=['he','en','ru'], has_footer=true
```

### Step 3 — INSERT 64 storefront_pages rows (with URL rewrites)

```sql
INSERT INTO storefront_pages (
  id, tenant_id, slug, title, blocks, previous_blocks,
  meta_title, meta_description, status, page_type, is_system,
  lang, updated_by, updated_via, sort_order, tags, noindex,
  is_deleted, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  '8d8cfa7e-ef58-49af-9702-a862d459cccb',  -- demo tenant_id
  slug, title,
  -- Rewrite blocks: prizma URLs → demo, tenant_slug, drop webhooks
  (
    replace(
      replace(
        replace(
          replace(
            blocks::text,
            'https://www.prizma-optic.co.il',
            'https://opticup-storefront-demo.vercel.app'
          ),
          'https://prizma-optic.co.il',
          'https://opticup-storefront-demo.vercel.app'
        ),
        'tenant_slug="prizma"',
        'tenant_slug="demo"'
      ),
      'webhook_url="https://hook.eu2.make.com/jewyavndaly70jd59tj9pt85s9ad1pki"',
      'webhook_url=""'
    )
  )::jsonb,
  NULL,  -- previous_blocks reset
  meta_title, meta_description, status, page_type, is_system,
  lang,
  'M3_DEMO_TENANT_SEED_FROM_PRIZMA',
  'spec-seed',
  sort_order, tags, noindex,
  false,
  now(),
  now()
FROM storefront_pages
WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
  AND status='published'
  AND (is_deleted IS NULL OR is_deleted=false);
```

**Webhook strategy explanation:** the single Make webhook `jewyavndaly70jd59tj9pt85s9ad1pki` (prizma supersale lead intake) is the ONLY known webhook URL hard-coded in current prizma blocks. Replacing it with empty string ensures demo forms submit successfully to the lead-intake Edge Function (which writes to DB) but Make automation chain stays disconnected. If/when Daniel sets up demo-specific Make webhooks, he can run a follow-up UPDATE to replace `webhook_url=""` with the new ID. Documented in FINDINGS.

Verify post-insert:
```sql
SELECT lang, count(*), sum(length(blocks::text)) AS total_size
FROM storefront_pages
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND updated_by='M3_DEMO_TENANT_SEED_FROM_PRIZMA'
GROUP BY lang ORDER BY lang;
-- Expected: he=30, en=17, ru=17, total ~1.26 MB across all langs (some bytes saved by replace)

-- No prizma URL leaked:
SELECT count(*) FROM storefront_pages
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND blocks::text LIKE '%prizma-optic.co.il%';
-- Expected: 0

-- No prizma Make webhook leaked:
SELECT count(*) FROM storefront_pages
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND blocks::text LIKE '%hook.eu2.make.com/jewyavndaly70jd59tj9pt85s9ad1pki%';
-- Expected: 0

-- No tenant_slug=prizma leaked:
SELECT count(*) FROM storefront_pages
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND blocks::text LIKE '%tenant_slug="prizma"%';
-- Expected: 0

-- All rows still valid jsonb arrays (Rule 23 + REC-SITE-003 CHECK constraint will enforce):
SELECT count(*) FROM storefront_pages
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND updated_by='M3_DEMO_TENANT_SEED_FROM_PRIZMA'
  AND jsonb_typeof(blocks) <> 'array';
-- Expected: 0
```

### Step 4 — UPDATE `tenants` of demo (logo + email only)

```sql
UPDATE tenants
SET logo_url = (SELECT logo_url FROM tenants WHERE slug='prizma'),
    business_email = 'demo@prizma-optic.co.il',
    updated_at = now()
WHERE id='8d8cfa7e-ef58-49af-9702-a862d459cccb';
```

Verify:
```sql
SELECT logo_url IS NOT NULL AS has_logo, business_email
FROM tenants WHERE id='8d8cfa7e-ef58-49af-9702-a862d459cccb';
-- Expected: has_logo=true, business_email='demo@prizma-optic.co.il'
```

### Step 5 — INSERT 1 tenant_branches row for demo

```sql
INSERT INTO tenant_branches (
  id, tenant_id, slug, display_order,
  name_he, name_en, name_ru,
  street_he, street_en, street_ru,
  city_he, city_en, city_ru,
  country_code, phone, whatsapp_e164,
  hours, gallery, status, is_deleted, updated_by, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '8d8cfa7e-ef58-49af-9702-a862d459cccb',
  'demo-branch', 1,
  'סניף דמו', 'Demo Branch', 'Демо филиал',
  'רחוב דמו 1', 'Demo Street 1', 'Демо улица 1',
  'תל אביב', 'Tel Aviv', 'Тель-Авив',
  'IL', '050-000-0000', '972500000000',
  '{"monday":{"open":"09:00","close":"18:00"},"tuesday":{"open":"09:00","close":"18:00"},"wednesday":{"open":"09:00","close":"18:00"},"thursday":{"open":"09:00","close":"18:00"},"friday":{"open":"09:00","close":"14:00"},"saturday":null,"sunday":{"open":"09:00","close":"18:00"}}'::jsonb,
  '[]'::jsonb,
  'active', false,
  'M3_DEMO_TENANT_SEED_FROM_PRIZMA',
  now(), now()
);
```

Verify:
```sql
SELECT count(*) FROM tenant_branches
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb' AND is_deleted=false;
-- Expected: 1
```

### Step 6 — Vercel redeploy of opticup-storefront-demo

Trigger redeploy of demo project (does NOT touch production prizma project). Use Vercel MCP `deploy_to_vercel` or, if unavailable, redeploy the latest READY production deployment of `opticup-storefront-demo` from the Vercel UI.

Required: deployment must reach state=READY before Step 7.

### Step 7 — Verification (post-deploy fetches)

```bash
# A. Homepage renders with full chrome
curl -sL https://opticup-storefront-demo.vercel.app/ -A "Mozilla/5.0" -o /tmp/demo-home.html
grep -c '<link rel="stylesheet"' /tmp/demo-home.html  # expected ≥ 2
grep -c '<header' /tmp/demo-home.html                  # expected ≥ 1
grep -c 'wp-content/uploads' /tmp/demo-home.html       # expected 0 (no WP-legacy leakage)

# B. /lab/ renders styled (the page Daniel reported as broken)
curl -sL https://opticup-storefront-demo.vercel.app/lab/ -A "Mozilla/5.0" -o /tmp/demo-lab.html
grep -c '<style>' /tmp/demo-lab.html                  # expected ≥ 2 (page-specific styles present)
grep -c 'wp-content/uploads' /tmp/demo-lab.html       # expected 0

# C. /supersale/ renders fully (was the second worst broken page)
curl -sL https://opticup-storefront-demo.vercel.app/supersale/ -A "Mozilla/5.0" -o /tmp/demo-ss.html
grep -c 'ss-hero-title' /tmp/demo-ss.html             # expected ≥ 1 (SuperSale CSS class present)
grep -c 'prizma-optic.co.il' /tmp/demo-ss.html        # expected 0 (no leak of prod URL)
grep -c 'hook.eu2.make.com/jewyavndaly' /tmp/demo-ss.html  # expected 0 (no leak of prod webhook)

# D. EN + RU homepages render
curl -sL https://opticup-storefront-demo.vercel.app/en/ -A "Mozilla/5.0" -o /tmp/demo-en.html
grep -c '<header' /tmp/demo-en.html                   # expected ≥ 1
curl -sL https://opticup-storefront-demo.vercel.app/ru/ -A "Mozilla/5.0" -o /tmp/demo-ru.html
grep -c '<header' /tmp/demo-ru.html                   # expected ≥ 1

# E. Confirm prizma production is UNCHANGED
curl -sL https://www.prizma-optic.co.il/lab/ -A "Mozilla/5.0" -o /tmp/prizma-lab-after.html
diff <(grep '<title>' /tmp/prizma-lab-after.html) <(echo '<title>מעבדת מסגורים</title>')
# Title unchanged → prizma untouched
```

All 5 checks must pass. If any fails → write FINDINGS with the specific failing assertion + raw curl output, do NOT close as success.

---

## 7. Success Criteria

This SPEC closes 🟢 GREEN only if ALL of these are true after Step 7:

1. `storefront_config.enabled=true` for demo, with non-NULL `footer_config`, `pages`, and `supported_languages=['he','en','ru']`.
2. `storefront_pages` count for demo = 64 (30+17+17), `updated_by='M3_DEMO_TENANT_SEED_FROM_PRIZMA'`.
3. Zero rows of demo's storefront_pages contain `prizma-optic.co.il`, `tenant_slug="prizma"`, or the specific prizma Make webhook ID.
4. `tenants.logo_url` non-NULL for demo, `business_email='demo@prizma-optic.co.il'`.
5. `tenant_branches` count for demo = 1.
6. Vercel `opticup-storefront-demo` latest deployment state=READY.
7. Curl of `https://opticup-storefront-demo.vercel.app/lab/` returns ≥ 2 `<style>` tags + 0 `wp-content/uploads` strings.
8. Curl of `https://opticup-storefront-demo.vercel.app/supersale/` contains `ss-hero-title` CSS class.
9. Curl of `https://www.prizma-optic.co.il/lab/` returns title `מעבדת מסגורים` (i.e., prizma unchanged).

If ANY of 1–9 fails → SPEC closes 🟡 PARTIAL with FINDINGS, NOT 🟢. No polish-by-validation (per `feedback_no_polish_by_validation`).

---

## 8. Out of Scope

These are NOT done by this SPEC. They are explicitly deferred and logged in FINDINGS if surfaced during execution:

- **Demo-specific Make webhook URLs.** Webhooks are emptied to `""`. Future SPEC will set them when Daniel provides demo Make scenarios.
- **Demo `tenants.ui_config` updates.** Current demo `ui_config` is healthy and preserved as-is.
- **Demo lens inventory population.** Per Daniel: demo runs without prizma inventory (deferred to a different SPEC if/when needed).
- **Schema changes (DDL).** No `ALTER TABLE`, no new columns.
- **Code changes in either repo.** Zero `.js`/`.ts`/`.astro`/`.html`/`.css` modifications.
- **Translation updates.** Demo's translation_group_id stays NULL on copied pages. Future SPEC can wire translation if needed.
- **Auto-fix of legacy `<img src="/wp-content/uploads/...">` markup inside copied blocks.** This markup exists in prizma pages too — site renders fine on prizma because of how Astro proxies images. If demo ends up with broken images, follow-up SPEC will rewrite paths.

---

## 9. Rollback Procedure

If any step fails or post-deploy verification fails (Step 7), rollback path:

```sql
-- A. Delete inserted storefront_pages
DELETE FROM storefront_pages
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND updated_by='M3_DEMO_TENANT_SEED_FROM_PRIZMA';

-- B. Delete inserted tenant_branches
DELETE FROM tenant_branches
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND updated_by='M3_DEMO_TENANT_SEED_FROM_PRIZMA';

-- C. Restore storefront_config from snapshot (read demo_storefront_config_pre.json,
--    apply UPDATE with original values + enabled=false)
-- Manual reconstruction from JSON; this is a 1-row UPDATE.

-- D. Restore tenants from snapshot (read demo_tenants_pre.json, apply UPDATE
--    with original logo_url=NULL + business_email=NULL)
```

Rollback verification:
```sql
SELECT count(*) FROM storefront_pages
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb';  -- Expected: 1 (just test-page)

SELECT enabled FROM storefront_config
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb';  -- Expected: false
```

Trigger a final demo redeploy after rollback so the site reflects the rolled-back DB state.

---

## 10. Stop Triggers (non-overridable)

The Executor MUST stop and emit an escalation file if ANY of these conditions trip during execution:

- Step 0 pre-flight: any of 0a–0g returns unexpected value.
- Step 2 UPDATE: affected_rows ≠ 1.
- Step 3 INSERT: affected_rows ≠ 64.
- Step 3 verification: ANY of the 4 "expected 0" leakage queries returns > 0.
- Step 4 UPDATE: affected_rows ≠ 1.
- Step 5 INSERT: affected_rows ≠ 1.
- Step 6 Vercel deploy: state=ERROR or stays in BUILDING > 10 min.
- Step 7: ANY of A–E curl assertions fails.
- Any unexpected error message returned from Supabase MCP.
- Any indication of a parallel session writing to one of this SPEC's owned tables (re-run `pipeline-coordination.mjs check-collision`).

Escalation file path: `modules/Module 3 - Storefront/escalations/{ISO_TIMESTAMP}_M3_DEMO_TENANT_SEED_FROM_PRIZMA.md`.

---

## 11. Authorities (Bounded Autonomy)

- **Level 2 SQL UPDATE** on demo `storefront_config` (1 row) + demo `tenants` (1 row): AUTHORIZED.
- **Level 2 SQL INSERT** on demo `storefront_pages` (64 rows) + demo `tenant_branches` (1 row): AUTHORIZED.
- **NO Level 3 DDL.** No `ALTER TABLE`. If schema mismatch surfaces → STOP.
- **Vercel redeploy** of `opticup-storefront-demo` project: AUTHORIZED.
- **Git ops:** `git add` of SPEC folder files + 1 commit on `develop` + push. NO main merge. NO branches.

Commit message: `feat(demo): seed demo tenant from prizma — 64 pages + config + branch + logo (REC-SITE-?)`.

---

## 12. Deliverables (at execution close)

In the SPEC folder:
- `SPEC.md` (this file — already exists)
- `ACTIVATION_PROMPT.md` (sibling — already exists)
- `BACKUPS/demo_tenants_pre.json`
- `BACKUPS/demo_storefront_config_pre.json`
- `BACKUPS/demo_storefront_pages_pre.json`
- `BACKUPS/demo_tenant_branches_pre.json`
- `EXECUTION_REPORT.md` — what was done, in order, with timestamps + counts
- `FINDINGS.md` — anything surprising, deferred webhooks list, follow-up SPEC suggestions
- (later) `FOREMAN_REVIEW.md` — written by opticup-strategic after reading EXECUTION_REPORT + FINDINGS

Per `feedback_no_polish_by_validation`: FINDINGS must distinguish "actually executed, verified working" vs "verified existing state" vs "skipped/deferred." No silent green closes.

---

*End of SPEC. Author: opticup-strategic (Site Overseer Foreman). 2026-05-18.*
