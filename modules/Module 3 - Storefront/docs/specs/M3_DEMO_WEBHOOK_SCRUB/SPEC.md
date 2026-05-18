# SPEC — M3_DEMO_WEBHOOK_SCRUB

**Module:** Module 3 — Storefront
**Author:** opticup-strategic (Site Overseer, acting as Foreman)
**Created:** 2026-05-18 (immediately after M3_DEMO_TENANT_SEED_FROM_PRIZMA closed 🟡)
**Type:** Targeted fixes — closes the 1 failing criterion + 2 HIGH findings from prior SPEC
**Severity:** HIGH (blocking demo M4 form-flow testing; SEO/social leak)
**Predecessor:** `M3_DEMO_TENANT_SEED_FROM_PRIZMA` closed 🟡 PARTIAL — see its `FINDINGS.md` (F-1 CRITICAL, F-2 HIGH, F-3 HIGH).

---

## 1. Goal

Close the 3 SaaS-isolation gaps in the demo tenant that the prior seed SPEC left open due to a jsonb-text escape-character defect in its `replace()` patterns.

**Three deliverables, one SPEC:**

1. **F-1 — Webhook scrub.** Empty out the prizma Make webhook URL on demo's `/supersale/` HE form so demo lead submissions stop firing prizma's CRM automation.
2. **F-2 — Email rewrite.** Replace 3 prizma support emails (`service@`, `nayedet@`, `events@`) inside demo storefront_pages with `demo@prizma-optic.co.il` (single demo support address, per Daniel directive of prior SPEC §3 Step 4).
3. **F-3 — SEO identity flip.** Update demo's `storefront_config.seo` so `<title>` + meta description identify demo as demo, not prizma. Switch canonical/og/twitter URLs to demo's vercel hostname (this is partly already handled by `storefront_config.custom_domain='opticup-storefront-demo.vercel.app'` set by the prior SPEC; the verification step confirms).

---

## 2. Background — verified live 2026-05-18 (read-only)

### F-1 webhook target — confirmed exact stored bytes

```sql
SELECT slug, lang,
  substring(blocks::text,
    position('jewyavndaly' in blocks::text)-25,
    75) AS raw_around
FROM storefront_pages
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND blocks::text LIKE '%jewyavndaly%';
```

Returns 1 row: `/supersale/` HE. Raw bytes around the webhook ID:
```
ttps://hook.eu2.make.com/jewyavndaly70jd59tj9pt85s9ad1pki\" redirect_url=\"
```

Hex dump confirms `\"` is stored as 2 bytes: `5c 22` (backslash + quote). The matching pattern in a postgres E-string is `E'webhook_url=\\"...\\"'` (4 chars: `\\` + `"` per quote).

### F-2 email targets — confirmed counts (29 total in 9 distinct slug × lang combos)

```sql
SELECT
  count(*) FILTER (WHERE blocks::text LIKE '%service@prizma-optic.co.il%') = 24,
  count(*) FILTER (WHERE blocks::text LIKE '%nayedet@prizma-optic.co.il%') = 3,
  count(*) FILTER (WHERE blocks::text LIKE '%events@prizma-optic.co.il%') = 2,
  count(*) FILTER (WHERE blocks::text LIKE '%@prizma-optic.co.il%') = 29
```

The 24 + 3 + 2 ≠ 29 — some rows contain multiple email types. The `replace()` on `@prizma-optic.co.il` substring would be over-broad; we use 3 distinct full-email replacements to keep precise.

### F-3 SEO identity — confirmed source-of-truth

```sql
SELECT hero_title, hero_subtitle, seo->>'title', seo->>'description'
FROM storefront_config
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb';
```

Returns:
- `hero_title`: NULL (already empty — nothing to fix here)
- `hero_subtitle`: NULL (already empty)
- `seo->>'title'`: `"אופטיקה פריזמה | משקפיים ועדשות מגע"` ← target for rewrite
- `seo->>'description'`: `"אופטיקה פריזמה - מגוון רחב של משקפי שמש, משקפי ראייה ועדשות מגע מהמותגים המובילים"` ← target for rewrite

The `<title>` tag the storefront emits is built from `seo.title`. Updating these 2 keys flips the demo's branded identity.

### Custom domain — already correct after prior SPEC

`storefront_config.custom_domain='opticup-storefront-demo.vercel.app'` was set by M3_DEMO_TENANT_SEED_FROM_PRIZMA Step 2. The 22 `prizma-optic.co.il` occurrences flagged by the post-fix verification subagent come from canonical/og/twitter/JSON-LD which are emitted from `storefront_config.custom_domain` — they will switch automatically once Astro picks up the value on next request. The subagent's fetch may have been served from a brief stale slice. Verification step in this SPEC re-checks.

### Tenant UUID lock

All writes scoped to: `tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'` (demo). No writes to prizma.

---

## 3. Step 0 — Pre-flight checks (MANDATORY before any write)

Run in order. STOP if any fails.

```sql
-- 0a. Confirm tenant UUID
SELECT count(*) FROM tenants WHERE id='8d8cfa7e-ef58-49af-9702-a862d459cccb' AND slug='demo';
-- Expected: 1

-- 0b. Confirm webhook is still present (i.e., predecessor's F-1 still open)
SELECT count(*) FROM storefront_pages
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND blocks::text LIKE '%jewyavndaly%';
-- Expected: 1. If 0, F-1 was already fixed elsewhere — STOP, re-investigate.

-- 0c. Confirm 29 prizma emails are still present (i.e., predecessor's F-2 still open)
SELECT count(*) FROM storefront_pages
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND blocks::text LIKE '%@prizma-optic.co.il%';
-- Expected: 29. If different, scope drift — STOP.

-- 0d. Confirm demo's seo still says prizma (i.e., predecessor's F-3 still open)
SELECT seo->>'title' LIKE '%פריזמה%' AS still_says_prizma
FROM storefront_config
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb';
-- Expected: true. If false, F-3 was already fixed — note and skip Step 4.

-- 0e. Confirm prizma is UNTOUCHED — count prizma's storefront_pages
SELECT count(*) FROM storefront_pages
WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
  AND status='published' AND (is_deleted IS NULL OR is_deleted=false);
-- Expected: 64. If different, the prior SPEC affected prizma — escalate.

-- 0f. Pipeline coordination
node scripts/pipeline-coordination.mjs claim site-overseer-m3-demo-webhook-scrub \
  --files "modules/Module 3 - Storefront/docs/specs/M3_DEMO_WEBHOOK_SCRUB/**" \
  --db-tables "storefront_pages,storefront_config" \
  --tenant-scope "demo-only"
node scripts/pipeline-coordination.mjs check-collision --spec-slug M3_DEMO_WEBHOOK_SCRUB --self
# (use --self flag per F-6 of prior SPEC if implemented; otherwise pass --session-id from lock file)
# Expected: clean. If parallel session locks storefront_* tables on demo tenant → STOP.
```

If 0a–0f all pass: proceed. If any fails: STOP.

---

## 4. Destructive Operations

Per Iron Rule 32 — declared list. All writes scoped to `tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'` (demo). No writes to prizma.

1. **UPDATE on `storefront_pages.blocks`** WHERE `tenant_id=demo AND slug='/supersale/' AND lang='he'`. Single row. Replaces the prizma Make webhook URL with empty string inside jsonb-text via escape-aware `replace()`.
2. **UPDATE on `storefront_pages.blocks`** WHERE `tenant_id=demo AND blocks::text LIKE '%@prizma-optic.co.il%'`. Up to 29 rows. Replaces 3 distinct prizma support emails with `demo@prizma-optic.co.il`.
3. **UPDATE on `storefront_config.seo` jsonb keys** WHERE `tenant_id=demo`. Single row. Sets `seo.title` + `seo.description` to demo-branded strings.

NOT in this SPEC:
- No INSERT, no DELETE.
- No `DROP`, no `TRUNCATE`, no `ALTER TABLE`.
- No writes to prizma (`6ad0781b-...`) — verified by tenant_id-locked WHERE clauses.
- No code changes in either repo.
- No new files in either repo (this SPEC produces only `BACKUPS/`, `EXECUTION_REPORT.md`, `FINDINGS.md`).
- No `main` branch operations.

---

## 5. Files Owned

- `modules/Module 3 - Storefront/docs/specs/M3_DEMO_WEBHOOK_SCRUB/**`
- DB rows: `storefront_pages` (demo tenant only, blocks column), `storefront_config` (demo tenant only, seo column)

NOT owned: code files, prizma rows, any other table.

---

## 6. Implementation Steps

### Step 1 — Snapshot demo's affected rows (rollback safety)

```sql
-- BACKUPS/demo_blocks_pre.json — 30 demo HE pages incl. /supersale/ and the 29 email-bearing rows
SELECT json_agg(json_build_object(
  'id', id, 'slug', slug, 'lang', lang, 'blocks', blocks
))
FROM storefront_pages
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND (blocks::text LIKE '%jewyavndaly%' OR blocks::text LIKE '%@prizma-optic.co.il%');

-- BACKUPS/demo_seo_pre.json — current demo storefront_config.seo
SELECT seo
FROM storefront_config
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb';
```

Commit both files to the SPEC folder BEFORE any write.

### Step 2 — Webhook scrub (F-1)

```sql
UPDATE storefront_pages
SET blocks = replace(
               blocks::text,
               E'webhook_url=\\"https://hook.eu2.make.com/jewyavndaly70jd59tj9pt85s9ad1pki\\"',
               E'webhook_url=\\"\\"'
             )::jsonb,
    updated_by = 'M3_DEMO_WEBHOOK_SCRUB',
    updated_via = 'seed',
    updated_at = now()
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND slug='/supersale/'
  AND lang='he';
```

Verify:
```sql
SELECT count(*) FROM storefront_pages
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND blocks::text LIKE '%jewyavndaly%';
-- Expected: 0

SELECT blocks::text LIKE '%webhook_url=\\"\\"%' AS has_empty_webhook
FROM storefront_pages
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND slug='/supersale/' AND lang='he';
-- Expected: true

-- Confirm the row is still valid jsonb array (Rule 23 + REC-SITE-003 CHECK constraint):
SELECT jsonb_typeof(blocks)='array' AS still_array
FROM storefront_pages
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND slug='/supersale/' AND lang='he';
-- Expected: true
```

If `affected_rows ≠ 1` OR any verification fails → STOP, write FINDINGS, halt before Step 3.

### Step 3 — Email rewrite (F-2)

3 separate UPDATE statements (one per email — more precise than a single substring replace, avoids over-broad matching):

```sql
-- 3a. service@
UPDATE storefront_pages
SET blocks = replace(blocks::text, 'service@prizma-optic.co.il', 'demo@prizma-optic.co.il')::jsonb,
    updated_by = 'M3_DEMO_WEBHOOK_SCRUB',
    updated_via = 'seed',
    updated_at = now()
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND blocks::text LIKE '%service@prizma-optic.co.il%';
-- Expected: affected_rows = 24

-- 3b. nayedet@
UPDATE storefront_pages
SET blocks = replace(blocks::text, 'nayedet@prizma-optic.co.il', 'demo@prizma-optic.co.il')::jsonb,
    updated_by = 'M3_DEMO_WEBHOOK_SCRUB',
    updated_via = 'seed',
    updated_at = now()
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND blocks::text LIKE '%nayedet@prizma-optic.co.il%';
-- Expected: affected_rows = 3

-- 3c. events@
UPDATE storefront_pages
SET blocks = replace(blocks::text, 'events@prizma-optic.co.il', 'demo@prizma-optic.co.il')::jsonb,
    updated_by = 'M3_DEMO_WEBHOOK_SCRUB',
    updated_via = 'seed',
    updated_at = now()
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND blocks::text LIKE '%events@prizma-optic.co.il%';
-- Expected: affected_rows = 2
```

Note: emails are stored UNESCAPED in jsonb-text (no inner quotes around them — they sit inside HTML `<a href="mailto:..."` where the outer quotes belong to the JSON string itself, but the email body itself contains no quotes). So plain `'service@prizma-optic.co.il'` matches correctly. Verified by hex dump earlier.

Verify:
```sql
SELECT count(*) FROM storefront_pages
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND blocks::text LIKE '%@prizma-optic.co.il%'
  AND blocks::text NOT LIKE '%demo@prizma-optic.co.il%';
-- Expected: 0 (any '@prizma-optic.co.il' occurrence must be the demo@ replacement)

-- Confirm all rows are still valid jsonb arrays:
SELECT count(*) FROM storefront_pages
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND jsonb_typeof(blocks) <> 'array';
-- Expected: 0
```

If totals diverge → STOP, write FINDINGS.

### Step 4 — SEO identity flip (F-3)

```sql
UPDATE storefront_config
SET seo = jsonb_set(
            jsonb_set(seo, '{title}', '"אופטיקה דמו | סביבת בדיקה"'::jsonb, true),
            '{description}',
            '"סביבת בדיקה (demo) של פלטפורמת אופטיקה. תוכן מבוסס על אופטיקה פריזמה לצורך טסטים."'::jsonb,
            true
          ),
    updated_at = now()
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb';
```

Note: `hero_title` + `hero_subtitle` are already NULL on demo — no update needed there. The `<title>` tag rendered by Astro is built from `seo.title`.

Verify:
```sql
SELECT seo->>'title' AS new_title, seo->>'description' AS new_desc
FROM storefront_config
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb';
-- Expected: new_title contains 'דמו', new_desc contains 'סביבת בדיקה'
```

### Step 5 — Verification curls (post-write)

```bash
# A. Demo /supersale/ no longer contains prizma webhook ID
curl -sL https://opticup-storefront-demo.vercel.app/supersale/ \
  -A "Mozilla/5.0" -o /tmp/demo-ss-post.html
grep -c 'jewyavndaly' /tmp/demo-ss-post.html
# Expected: 0

# B. Demo /supersale/ form's webhook_url is now empty (not absent — empty string)
grep -oE 'webhook_url="[^"]*"' /tmp/demo-ss-post.html
# Expected: webhook_url=""

# C. Demo /privacy/ HE no longer shows prizma support email
curl -sL https://opticup-storefront-demo.vercel.app/privacy/ \
  -A "Mozilla/5.0" -o /tmp/demo-privacy-post.html
grep -c 'service@prizma-optic.co.il\|nayedet@prizma-optic.co.il\|events@prizma-optic.co.il' /tmp/demo-privacy-post.html
# Expected: 0

# D. Demo /privacy/ HE now shows the demo email (or no contact email at all if page didn't have one originally — both acceptable)
grep -c 'demo@prizma-optic.co.il' /tmp/demo-privacy-post.html
# Expected: ≥ 0 (informational; ≥1 if /privacy/ originally had service@, 0 if didn't)

# E. Demo <title> no longer says פריזמה
curl -sL https://opticup-storefront-demo.vercel.app/ \
  -A "Mozilla/5.0" -o /tmp/demo-home-post.html
grep -oE '<title>[^<]+</title>' /tmp/demo-home-post.html
# Expected: contains 'דמו', does NOT contain 'פריזמה'

# F. Prizma production verified UNCHANGED
curl -sL https://www.prizma-optic.co.il/supersale/?_vercel_share=FVaZOU1QLwsZwSwLwktvkB60cI4rrIWY \
  -A "Mozilla/5.0" -o /tmp/prizma-ss-after.html
grep -c 'jewyavndaly' /tmp/prizma-ss-after.html
# Expected: ≥ 1 (prizma's own webhook still wired — unchanged)
grep -c 'service@prizma-optic.co.il' /tmp/prizma-ss-after.html 2>/dev/null || true
# Informational — prizma's own page may or may not have this email; we only care that we didn't touch it
```

All 5 (A, B, C, E, F) must pass. D is informational. If any fails → close 🟡 PARTIAL with FINDINGS, do NOT close 🟢 silently.

---

## 7. Success Criteria

This SPEC closes 🟢 GREEN only if ALL of these are true:

1. `storefront_pages` for demo: 0 rows contain `jewyavndaly` (webhook scrubbed).
2. `storefront_pages` for demo: 0 rows contain any of `service@prizma-optic.co.il`, `nayedet@prizma-optic.co.il`, `events@prizma-optic.co.il`. All occurrences are now `demo@prizma-optic.co.il`.
3. `storefront_pages` for demo: every row's `blocks` is still `jsonb_typeof()='array'` (Rule 31 integrity preserved).
4. `storefront_config.seo.title` for demo contains `דמו`, does NOT contain `פריזמה`.
5. Curl of demo `/supersale/` returns 0 occurrences of `jewyavndaly`.
6. Curl of demo `/privacy/` returns 0 occurrences of the 3 prizma support emails.
7. Curl of demo `/` returns `<title>` containing `דמו`, not `פריזמה`.
8. Curl of prizma `/supersale/` returns `jewyavndaly` ≥ 1 (prizma untouched).
9. `storefront_pages` count for prizma published = 64 (prizma untouched).

If ANY of 1–9 fails → close 🟡 PARTIAL with FINDINGS, NOT 🟢. Per `feedback_no_polish_by_validation`.

---

## 8. Out of Scope

- The 22 `prizma-optic.co.il` occurrences in canonical/og/twitter/JSON-LD on the homepage — these are emitted from `storefront_config.custom_domain` which was set by the prior SPEC to `opticup-storefront-demo.vercel.app`. They should already be correct on next request. If verification Step 5-E shows they're still pointing at prizma, that's a separate finding to log but NOT failed criterion of this SPEC (this SPEC fixes the data, not the emit logic).
- Demo Make webhook URLs (still empty by intent — Daniel sets demo-specific webhooks separately when he's ready).
- Demo lens inventory (out of scope, per prior SPEC).
- `<img src="/wp-content/uploads/...">` legacy markup (works via Astro image proxy, not a defect).
- Schema changes, code changes, file changes.

---

## 9. Rollback Procedure

If Step 2, 3, or 4 fails or any Step 5 verification deviates badly:

```sql
-- Restore demo blocks from BACKUPS/demo_blocks_pre.json
-- Manual reconstruction: per row, UPDATE storefront_pages SET blocks=<original> WHERE id=<row_id>

-- Restore demo seo from BACKUPS/demo_seo_pre.json
UPDATE storefront_config
SET seo=<original_seo_jsonb>
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb';
```

Rollback verification:
```sql
SELECT count(*) FROM storefront_pages
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND blocks::text LIKE '%jewyavndaly%';
-- Expected after rollback: 1 (back to pre-state)

SELECT seo->>'title'='אופטיקה פריזמה | משקפיים ועדשות מגע'
FROM storefront_config
WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb';
-- Expected after rollback: true
```

---

## 10. Stop Triggers

The Executor MUST stop and emit findings if ANY of these trip:

- Step 0 pre-flight count mismatch on any of 0a–0e.
- Step 2 affected_rows ≠ 1.
- Step 3a affected_rows ≠ 24, OR 3b ≠ 3, OR 3c ≠ 2 (total ≠ 29).
- After Step 2: `count(*) WHERE blocks::text LIKE '%jewyavndaly%'` returns anything other than 0.
- After Step 3: `count(*) WHERE blocks::text LIKE '%@prizma-optic.co.il%' AND NOT LIKE '%demo@%'` returns anything other than 0.
- After Step 3: ANY row in demo has `jsonb_typeof(blocks) <> 'array'`.
- Step 4 affected_rows ≠ 1.
- Step 5: A, B, C, E, OR F fails.
- Step 5-F: prizma loses its webhook (any DELETE/UPDATE leaked to prizma). **CRITICAL STOP — Daniel directly.**

Per ABSOLUTE RULES in dispatch: when STOP fires, choose PARTIAL CLOSE path (write FINDINGS + EXECUTION_REPORT + close 🟡), NOT silent rollback-and-abandon. Same regime as prior SPEC. Only `git revert` if Daniel directs.

---

## 11. Authorities

- **Level 2 SQL UPDATE** on demo `storefront_pages.blocks` (up to 30 rows) — AUTHORIZED per §4 declared list.
- **Level 2 SQL UPDATE** on demo `storefront_config.seo` (1 row) — AUTHORIZED per §4 declared list.
- **NO Level 3 DDL.** No `ALTER TABLE`. If schema mismatch surfaces → STOP.
- **No Vercel redeploy needed.** Storefront is SSR — DB changes propagate on next request (lesson from prior SPEC F-4).
- **Git ops:** 1 commit on `develop` + push. Files: SPEC folder only. NO main merge. NO new branches.

Commit message: `fix(demo): scrub prizma webhook + emails + seo identity (M3_DEMO_WEBHOOK_SCRUB) — closes F-1/F-2/F-3 of prior SPEC`.

---

## 12. Deliverables

In the SPEC folder:
- `SPEC.md` (this file)
- `ACTIVATION_PROMPT.md` (sibling)
- `BACKUPS/demo_blocks_pre.json` (30 rows: 1 supersale + 29 email-bearing)
- `BACKUPS/demo_seo_pre.json` (current seo object)
- `EXECUTION_REPORT.md` (Executor's retrospective)
- `FINDINGS.md` (anything surprising; 0 findings if all 9 success criteria pass)
- (later) `FOREMAN_REVIEW.md` by Foreman.

Per `feedback_no_polish_by_validation`: FINDINGS must distinguish executed-and-verified vs. verified-existing vs. skipped/deferred. No silent green closes.

---

## 13. Notes for the Executor — lessons learned from predecessor SPEC

The prior SPEC's `replace()` patterns failed because:

1. **jsonb-text stores inner quotes as `\"` (2 bytes)**, not `"`. Match patterns must use `E'...\\"...\\"'` (4 chars per quote in postgres E-string syntax).
2. **`LIKE` patterns use `\` as default escape character** — so `LIKE '%\\"...%'` could match unexpectedly if `\` is in the data. For verification, prefer substring `LIKE '%jewyavndaly%'` (no quotes in the marker).
3. **Always do a `position()` + `substring()` + `encode(... 'hex')` probe BEFORE writing `replace()` against jsonb-text** to confirm the exact stored byte form.

This SPEC's patterns were derived from the actual hex dump of demo's stored bytes (see §2 F-1). They should work on the first try. If they don't, STOP and write a FINDINGS entry — do not retry blindly.

---

*End of SPEC. Author: opticup-strategic (Site Overseer Foreman). 2026-05-18.*
