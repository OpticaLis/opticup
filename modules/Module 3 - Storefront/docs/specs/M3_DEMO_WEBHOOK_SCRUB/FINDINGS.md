# FINDINGS — M3_DEMO_WEBHOOK_SCRUB

**SPEC closed:** 2026-05-18, status 🟡 **PARTIAL** (8 of 9 success criteria pass)
**Executor:** opticup-executor (Claude Opus 4.7)

---

## HIGH severity

### F-1. Rendered `<title>` source is `storefront_pages.meta_title`, NOT `storefront_config.seo.title` — SPEC §2 assumption was wrong

**Location:** demo tenant, `storefront_pages` 3 rows where `slug='/' AND page_type='homepage'` (lang=he/en/ru). Plus broader leakage:
- 48 of 64 demo pages have `meta_title` containing פריזמה / prizma
- 36 of 64 have `meta_description` containing פריזמה / prizma
- 10 of 64 have `title` containing פריזמה / prizma

Curl of `https://opticup-storefront-demo.vercel.app/` returns:
```html
<title>אופטיקה פריזמה — משקפי ראייה ושמש מהמותגים המובילים</title>
<meta name="description" content="אופטיקה פריזמה — חנות אופטיקה מקצועית עם 40 שנות ניסיון...">
<meta property="og:title" content="אופטיקה פריזמה — משקפי ראייה ושמש מהמותגים המובילים">
```

These strings match `storefront_pages WHERE slug='/' AND lang='he'`.meta_title + .meta_description exactly. They do NOT match `storefront_config.seo.title` (which is now `אופטיקה דמו | סביבת בדיקה` after Step 4 of this SPEC).

**Why it matters:** demo's branded identity is still "אופטיקה פריזמה" in the browser tab, search engine results (if indexed), and social-share previews on EVERY page. The SPEC's F-3 fix flipped the storefront_config.seo (likely a fallback) but didn't touch the per-page meta_title which is what Astro actually renders.

**Root cause:** SPEC §2 stated "The `<title>` tag the storefront emits is built from `seo.title`. Updating these 2 keys flips the demo's branded identity." The author probed `storefront_config.seo.title` but didn't curl the rendered page to confirm the source mapping. The actual mapping (verified post-run):
1. Astro reads `storefront_pages.meta_title` for the matching slug/lang as PRIMARY source for `<title>`.
2. Falls back to `storefront_config.seo.title` only if `meta_title` is NULL.

**Why not auto-fixed mid-run:** SPEC §4 declared destructive list only authorizes UPDATE on the `blocks` column for storefront_pages. UPDATE on `meta_title`/`meta_description`/`title` is NOT declared. Per Iron Rule 32 (non-overridable), the Executor cannot perform a destructive operation outside §4.

**Suggested action — NEW SPEC `M3_DEMO_PAGE_META_REWRITE`:**
- Author: opticup-strategic (Site Overseer / Foreman).
- Scope: UPDATE on `storefront_pages` (demo only) rewriting `meta_title`, `meta_description`, and `title` columns where they contain `פריזמה` or `prizma`.
- Add to §4 declared destructive list: `UPDATE storefront_pages.meta_title/meta_description/title WHERE tenant_id=demo`.
- Implementation sketch:
  ```sql
  -- HE pages
  UPDATE storefront_pages
  SET meta_title = replace(meta_title, 'אופטיקה פריזמה', 'אופטיקה דמו'),
      meta_description = replace(meta_description, 'אופטיקה פריזמה', 'אופטיקה דמו'),
      updated_by = 'M3_DEMO_PAGE_META_REWRITE',
      updated_via = 'seed',
      updated_at = now()
  WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
    AND (meta_title LIKE '%פריזמה%' OR meta_description LIKE '%פריזמה%');

  -- EN pages
  UPDATE storefront_pages
  SET meta_title = replace(replace(meta_title, 'Prizma Optic', 'Demo Optic'), 'Prizma', 'Demo'),
      meta_description = replace(replace(meta_description, 'Prizma Optic', 'Demo Optic'), 'Prizma', 'Demo'),
      updated_by = 'M3_DEMO_PAGE_META_REWRITE',
      updated_via = 'seed',
      updated_at = now()
  WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
    AND (meta_title ILIKE '%prizma%' OR meta_description ILIKE '%prizma%');

  -- RU pages
  UPDATE storefront_pages
  SET meta_title = replace(meta_title, 'Оптика Призма', 'Оптика Демо'),
      meta_description = replace(meta_description, 'Оптика Призма', 'Оптика Демо'),
      updated_by = 'M3_DEMO_PAGE_META_REWRITE',
      updated_via = 'seed',
      updated_at = now()
  WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
    AND (meta_title LIKE '%Призма%' OR meta_description LIKE '%Призма%');

  -- title column (less critical but completes the identity flip)
  UPDATE storefront_pages
  SET title = CASE lang
                WHEN 'he' THEN replace(title, 'פריזמה', 'דמו')
                WHEN 'en' THEN replace(title, 'Prizma', 'Demo')
                WHEN 'ru' THEN replace(title, 'Призма', 'Демо')
              END,
      updated_by = 'M3_DEMO_PAGE_META_REWRITE',
      updated_via = 'seed',
      updated_at = now()
  WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
    AND (title LIKE '%פריזמה%' OR title ILIKE '%prizma%' OR title LIKE '%Призма%');
  ```
- Estimated effort: 30 min (4 UPDATEs + curl verification + commit). After this lands, demo's identity is fully flipped across all 64 pages.

---

## MEDIUM severity

### F-2. Step 5-B verification check assumed Astro renders `webhook_url` attribute literally — it doesn't

**Location:** SPEC §6 Step 5 check B. Pattern: `grep -oE 'webhook_url="[^"]*"' /tmp/demo-ss-post.html`, expected `webhook_url=""`. Actual: zero matches.

**Why it matters:** This is a SPEC verification-recipe defect, not a data defect. The underlying SaaS-isolation goal (the webhook URL doesn't appear in the rendered HTML) IS satisfied — check A confirms 0 hits of `jewyavndaly`. Astro processes the form block server-side and emits a JS form-submit closure (`onsubmit="return scSubmitForm_sc_form_b0s1e4(event)"`); the literal `webhook_url=` text never reaches the browser. The webhook URL itself (stored in the block's html attribute) is consumed at server build/render time and presumably embedded in the JS function via a different mechanism (or the empty string we substituted is now properly empty in the generated JS).

**Why low-mid severity:** the substantive SaaS-isolation outcome is achieved. Only the verification recipe is misaligned.

**Suggested action:** none required for the data. SPEC author should refine future verification recipes to grep for the URL itself (`grep -c 'jewyavndaly'`) rather than the literal source-form attribute. Already captured in EXECUTION_REPORT §9 Proposal #2 (executor-skill change suggesting "spirit-satisfied 🟡" classification).

### F-3. Prizma's own `/supersale/` still has 1 `service@prizma-optic.co.il` occurrence (informational — confirms scope discipline)

**Location:** curl of `https://www.prizma-optic.co.il/supersale/`.

**Why it matters:** confirms this SPEC did NOT leak any UPDATE to prizma. Every UPDATE was WHERE-scoped to `tenant_id='8d8cfa7e-...'`. Prizma's data is intact: 64 published pages, 6 rows with `jewyavndaly` (which includes the 1 PUBLISHED supersale + drafts/dups across other pages), 29 rows with `service@prizma-optic.co.il`. Suggests the prior SPEC's `/supersale/` HE seed correctly copied only 1 webhook occurrence from prizma's PUBLISHED set (drafts/dups were excluded).

**Suggested action:** none. Informational confirmation that SaaS isolation worked at the WHERE-clause level.

### F-4. Snapshot extraction required Python workaround due to MCP 30k-char limit (Step 1)

**Location:** Step 1 snapshot of 29 affected rows returned 402,279 chars from MCP, exceeding the 30k limit. Tool auto-saved result to disk file; Executor used Python to unwrap doubly-escaped JSON envelope and write clean snapshot to `BACKUPS/demo_blocks_pre.json` (433KB).

**Why it matters:** routine large-result handling cost ~3 minutes of unwrapping. Will recur on any future SPEC that snapshots > ~30 rows of jsonb blocks.

**Suggested action:** Track as TECH_DEBT entry — propose MCP wrapper enhancement or document the Python-unwrap pattern in opticup-executor SKILL.md references. Already captured in EXECUTION_REPORT §9 Proposal (mentioned).

---

## LOW severity

### F-5. Hebrew word "פריזמה" inside the new demo SEO description is intentional

**Location:** `storefront_config.seo.description` (set by Step 4). Value: `סביבת בדיקה (demo) של פלטפורמת אופטיקה. תוכן מבוסס על אופטיקה פריזמה לצורך טסטים.`

**Why it matters:** A naive `seo->>'description' LIKE '%פריזמה%'` query would return `true` for demo, suggesting the SPEC didn't fully strip the prizma identity. But this occurrence is intentional and benign — it's a self-aware disclosure that demo's content is sourced from prizma for testing. Not a SaaS-isolation defect.

**Suggested action:** none. If a future audit flags it, point them here.

---

## Out-of-scope items the SPEC explicitly deferred (re-list per `feedback_no_polish_by_validation`)

Per SPEC §8, these are NOT in scope and are NOT failures:
- 22 prizma-optic.co.il occurrences in canonical/og/twitter/JSON-LD on homepage — these come from `storefront_config.custom_domain` which was set correctly by prior SPEC. Cross-check: they DID drop to 0 for non-email URL references (canonical/og URLs now point at `opticup-storefront-demo.vercel.app`).
- Demo-specific Make webhook URLs (Daniel will set when ready).
- Demo lens inventory (deferred to future SPEC).
- WP-legacy `<img src="/wp-content/uploads/...">` markup (works via Astro image proxy).
- Schema changes, code changes, file changes.

---

## Summary table — Success Criteria scorecard

| # | Criterion | Status |
|---|---|---|
| 1 | demo storefront_pages: 0 rows contain jewyavndaly | ✅ |
| 2 | demo storefront_pages: 0 rows contain old prizma support emails; replaced with demo@ | ✅ |
| 3 | demo storefront_pages: all blocks still jsonb_typeof='array' | ✅ |
| 4 | demo storefront_config.seo.title contains דמו | ✅ |
| 5 | curl demo /supersale/ returns 0 jewyavndaly | ✅ |
| 6 | curl demo /privacy/ returns 0 old prizma support emails | ✅ |
| 7 | curl demo / title contains דמו, not פריזמה | ❌ (F-1) |
| 8 | curl prizma /supersale/ returns jewyavndaly ≥ 1 | ✅ |
| 9 | prizma storefront_pages published count = 64 | ✅ |

**8 PASS / 1 FAIL → SPEC closes 🟡 PARTIAL.**

---

*End of FINDINGS.md. Foreman: please read EXECUTION_REPORT + this file. Primary follow-up: M3_DEMO_PAGE_META_REWRITE (closes F-1 — bigger blast radius than expected at SPEC-author time).*
