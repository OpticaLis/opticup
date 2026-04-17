# SPEC — STOREFRONT_LANG_AND_VIDEO_FIX

> **Location:** `modules/Module 3 - Storefront/docs/specs/STOREFRONT_LANG_AND_VIDEO_FIX/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-17
> **Module:** 3 — Storefront
> **Phase:** Pre-DNS-Switch Fixes
> **Author signature:** Cowork session cool-jolly-franklin

---

## 1. Goal

Fix the three remaining pre-DNS-switch blockers: (1) diagnose and fix why EN/RU
pages return 404 on Vercel despite having published content in DB and correct
catch-all route files, (2) fix Russian text corruption on `/prizmaexpress/`,
(3) replace remaining `youtube-nocookie.com` URLs with `youtube.com` in
StepsBlock and VideoBlock.

---

## 2. Background & Motivation

The DNS_SWITCH_READINESS_QA audit (2026-04-16) found 4 CRITICAL issues. Daniel
deferred 2 (contact form, optometry draft). The remaining 2 plus one LOW finding
are this SPEC's scope:

- **CRITICAL-1+2:** 14 of 18 EN slugs and 14 of 18 RU slugs return 404 on
  Vercel preview. `/en/` and `/ru/` root paths redirect to `/` (HE homepage).
  All data is in DB: `v_storefront_pages` returns published rows for all 34
  EN+RU page/lang combos. Route files exist at `src/pages/en/[...slug].astro`
  and `src/pages/ru/[...slug].astro` with correct query logic.
- **CRITICAL-4:** `/prizmaexpress/` RU page has 2 words with embedded Hebrew
  letters: `лиןз` (should be `линз`) and `каталоגים` (should be `каталоге`).
  Confirmed via regex query on 2026-04-17.
- **LOW-1:** `StepsBlock.astro` and `VideoBlock.astro` still use
  `youtube-nocookie.com` (3 occurrences total). All other video-embedding
  blocks were already fixed to `youtube.com` on 2026-04-16.

**Runtime identifier verification (per A-1 proposal):**
Prizma tenant UUID confirmed via live DB: `6ad0781b-37f0-47a9-92e3-be9ed1477e1c`
(`SELECT id FROM tenants WHERE slug='prizma'` — verified 2026-04-17).

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected Value | Verify Command |
|---|-----------|---------------|----------------|
| SC-1 | EN homepage serves | HTTP 200 at `/en/` | `curl -sL -o /dev/null -w '%{http_code}' localhost:4321/en/` → 200 |
| SC-2 | RU homepage serves | HTTP 200 at `/ru/` | Same with `/ru/` → 200 |
| SC-3 | EN `/about/` serves | HTTP 200 | `curl -sL -o /dev/null -w '%{http_code}' localhost:4321/en/about/` → 200 |
| SC-4 | RU `/about/` serves | HTTP 200 | Same with `/ru/about/` → 200 |
| SC-5 | EN `/lab/` serves | HTTP 200 | Same with `/en/lab/` → 200 |
| SC-6 | EN `/שאלות-ותשובות/` serves | HTTP 200 | `curl -sL -o /dev/null -w '%{http_code}' 'localhost:4321/en/%D7%A9%D7%90%D7%9C%D7%95%D7%AA-%D7%95%D7%AA%D7%A9%D7%95%D7%91%D7%95%D7%AA/'` → 200 |
| SC-7 | EN `/משקפי-מולטיפוקל/` serves | HTTP 200 | Same pattern → 200 |
| SC-8 | All 17 EN published slugs serve | 17/17 HTTP 200 | Batch curl all 17 slugs (see §A inventory) → 0 non-200 |
| SC-9 | All 17 RU published slugs serve | 17/17 HTTP 200 | Same for RU → 0 non-200 |
| SC-10 | HE pages still work | 30/30 HTTP 200 | Batch curl HE slugs → 0 regressions |
| SC-11 | `/prizmaexpress/` RU has no Hebrew chars | 0 matches | `SELECT count(*) FROM storefront_pages WHERE slug='/prizmaexpress/' AND lang='ru' AND tenant_id='6ad0781b-...' AND blocks::text ~ '[\u0590-\u05FF]'` → 0 |
| SC-12 | `youtube-nocookie` gone from StepsBlock | 0 matches | `grep -c 'youtube-nocookie' src/components/blocks/StepsBlock.astro` → 0 |
| SC-13 | `youtube-nocookie` gone from VideoBlock | 0 matches | `grep -c 'youtube-nocookie' src/components/blocks/VideoBlock.astro` → 0 |
| SC-14 | `youtube-nocookie` zero in entire storefront | 0 files | `grep -rn 'youtube-nocookie' src/ --include='*.astro' --include='*.ts'` → no output |
| SC-15 | Build passes | exit 0 | `npm run build` → exit 0 |
| SC-16 | Full test passes | exit 0 | `node scripts/full-test.mjs --no-build` → exit 0 |
| SC-17 | Branch is develop, clean after commits | clean | `git status` → nothing to commit |

**Note on SC-1 through SC-10:** These require the dev server running at
`localhost:4321`. Start it with `npm run dev` before testing. If the dev server
cannot be started, test against `https://opticup-storefront.vercel.app` after
pushing — but localhost is preferred as it reflects the code on `develop`.

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Read any file in both repos
- Run read-only SQL (Level 1 autonomy) — SELECT only
- Edit `.astro` and `.ts` files in the storefront repo to fix routing
- Edit `astro.config.mjs` if the i18n config is the root cause
- Run `npm run dev`, `npm run build`, `node scripts/full-test.mjs`
- Execute the Level 2 SQL UPDATE for the `/prizmaexpress/` RU fix (pre-approved
  by Daniel — exact 2-word replacement, scope is 1 row)
- Replace `youtube-nocookie.com` → `youtube.com` in StepsBlock and VideoBlock
- Add `&iv_load_policy=3` to YouTube embed URLs that don't have it
- Commit and push to `develop`

### What REQUIRES stopping and reporting

- Any change to `v_storefront_pages` View definition (Rule 29 — View
  Modification Protocol)
- Any change to files in `FROZEN_FILES.md`
- Any new file creation outside existing patterns
- Any change that would break HE page rendering (regression on the working
  30/30 pages)
- If the routing diagnosis reveals an architectural issue requiring more than
  ~50 lines of code changes — STOP and describe the fix approach before
  proceeding
- If `npm run build` fails after changes
- Any merge to `main`

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

### 5a. STOP-ESCALATE (halt execution, report to Foreman/Daniel)
- If fixing EN/RU routing would require modifying Supabase Views → STOP
- If the routing fix breaks any existing HE page (curl check returns non-200
  for a previously working HE slug) → STOP and revert
- If `npm run build` fails with TypeScript errors after routing changes → STOP
- If the diagnosis reveals the problem is NOT in the storefront code but in
  Vercel deployment config → STOP and report (Vercel config changes need Daniel)

### 5b. STOP-SUMMARIZE (log finding, continue other tasks)
- If a specific EN/RU slug still 404s after the fix but most work — log which
  slugs still fail, continue with video and DB fixes

---

## 6. Rollback Plan

**Label: BOUNDED — code + 1 DB row**

### Code rollback
```bash
git reset --hard {START_COMMIT}
git push origin develop --force-with-lease
```
Where `START_COMMIT` = the commit hash from `git log -1 --format=%H` taken
before any changes.

### DB rollback
The only DB change is the `/prizmaexpress/` RU text fix. Before applying the
UPDATE, the executor MUST capture the current value:
```sql
SELECT blocks FROM storefront_pages
WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
  AND slug = '/prizmaexpress/' AND lang = 'ru';
```
Save the result. If rollback is needed, restore with:
```sql
UPDATE storefront_pages SET blocks = '{saved_value}'
WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
  AND slug = '/prizmaexpress/' AND lang = 'ru';
```

---

## 7. Out of Scope (explicit)

- **Contact form (`/api/leads/submit`) fix** — deferred by Daniel
- **`/optometry/` draft→published** — deferred by Daniel
- **SEO meta template fixes** (canonical host, hreflang, og:image) — separate SPEC
- **Studio tenant_id hardening** — separate SPEC
- **EN/RU content quality improvements** — separate editorial task
- **Brand hero images** — needs Daniel's image selection
- **Any change to HE page content or rendering**
- **Modifying Supabase Views**

---

## 8. Expected Final State

### Modified files (storefront repo)

| File | Change |
|------|--------|
| `src/components/blocks/StepsBlock.astro` | `youtube-nocookie.com` → `youtube.com` + add `iv_load_policy=3` |
| `src/components/blocks/VideoBlock.astro` | `youtube-nocookie.com` → `youtube.com` (2 occurrences) + add `iv_load_policy=3` |
| **Routing fix files** — exact files TBD by diagnosis. Candidates: `astro.config.mjs` (i18n config), `src/pages/en/[...slug].astro`, `src/pages/ru/[...slug].astro`, `src/pages/en/index.astro`, `src/pages/ru/index.astro`, or middleware if one needs to be created. |

### New files
- None expected. If routing fix requires a new middleware file, log it in
  EXECUTION_REPORT.

### Deleted files
- None.

### DB state
- `storefront_pages` row for `/prizmaexpress/` lang=`ru` tenant=Prizma:
  `лиןз` → `линз` and `каталоגים` → `каталоге` in the JSONB blocks column.

### Docs updated
- `modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md` — update status
- This SPEC folder: `EXECUTION_REPORT.md` + `FINDINGS.md`

---

## 9. Commit Plan

- **Commit 1:** `fix(storefront): replace youtube-nocookie with youtube in StepsBlock and VideoBlock` — StepsBlock.astro, VideoBlock.astro
- **Commit 2:** `fix(storefront): fix EN/RU page routing — [description based on diagnosis]` — routing files (exact files TBD)
- **Commit 3:** `chore(spec): close STOREFRONT_LANG_AND_VIDEO_FIX with retrospective` — EXECUTION_REPORT.md, FINDINGS.md, SESSION_CONTEXT.md

The `/prizmaexpress/` RU DB fix is a SQL UPDATE, not a code commit. Log it in
EXECUTION_REPORT.md with the exact query executed and the before/after values.

---

## 10. Dependencies / Preconditions

| # | Precondition | How to verify |
|---|-------------|---------------|
| P-1 | Machine is Windows desktop | Confirm path `C:\Users\User\opticup-storefront` |
| P-2 | Storefront repo on `develop`, pulled | `git branch` + `git pull origin develop` |
| P-3 | ERP repo accessible (for SPEC + SESSION_CONTEXT) | `ls C:\Users\User\opticup\CLAUDE.md` |
| P-4 | Supabase MCP connected | `execute_sql SELECT 1` → returns 1 |
| P-5 | `npm run build` passes before any changes | `npm run build` → exit 0 |
| P-6 | Dev server can start | `npm run dev` → localhost:4321 responds |

---

## 11. Lessons Already Incorporated

| Source | Proposal | Applied? |
|--------|----------|----------|
| `DNS_SWITCH_READINESS_QA/FOREMAN_REVIEW` → A-1 | Runtime identifier verification | APPLIED — Prizma UUID verified via live DB in §2, value `6ad0781b-...` confirmed |
| `DNS_SWITCH_READINESS_QA/FOREMAN_REVIEW` → A-2 | Two-tier stop triggers | APPLIED — §5 uses STOP-ESCALATE and STOP-SUMMARIZE tiers |
| `DNS_SWITCH_READINESS_QA/EXECUTION_REPORT` → E-1 | Pre-dispatch UUID verify | APPLIED — UUID in §2 is live-verified |
| `STOREFRONT_S2S3_QA/FOREMAN_REVIEW` → A2 | Mount preconditions | APPLIED — §10 P-3 explicitly checks ERP repo access |
| `HOMEPAGE_LUXURY_REVISIONS_R2/FOREMAN_REVIEW` → E-2 | JSONB partial-update pattern | APPLIED — §B Task 2 uses targeted text replacement, not full JSONB overwrite |

**Cross-Reference Check completed 2026-04-17:** This SPEC introduces 0 new DB
objects, 0 new tables, 0 new views, 0 new RPCs. It modifies 2 existing `.astro`
files (StepsBlock, VideoBlock) and will modify routing-related files (exact set
TBD by diagnosis). No name collisions possible. DB change is a targeted text
fix in 1 existing row. Grep for `youtube-nocookie` in codebase confirmed only
2 files remain: `StepsBlock.astro` (1 hit), `VideoBlock.astro` (2 hits).

---

## A. EN/RU Routing Diagnosis Plan

This is the investigation-first part of the SPEC. The executor must diagnose
before fixing.

### What we know (verified 2026-04-17)

1. **Route files exist and look correct:**
   - `src/pages/en/[...slug].astro` — catches `/en/{anything}`, queries
     `v_storefront_pages` with correct slug normalization and `lang='en'`
   - `src/pages/en/index.astro` — handles `/en/` homepage
   - Same pair exists for `ru/`

2. **DB data is present and correct:**
   - `v_storefront_pages` returns 34+ rows for EN+RU, all `status='published'`
   - Slugs have leading and trailing slashes (e.g., `/about/`) — matches the
     normalization in the route code

3. **Astro i18n config is active:**
   ```js
   i18n: {
     defaultLocale: 'he',
     locales: ['he', 'en', 'ru'],
     routing: { prefixDefaultLocale: false }
   }
   ```

4. **The symptom on Vercel preview:**
   - `/en/` → 302 redirect to `/` (HE homepage)
   - `/en/about/` → 404
   - `/en/blog/` → works (200)
   - HE pages → all work

### Diagnostic steps (executor MUST follow this order)

**Step D-1: Reproduce locally.**
Start `npm run dev`. Test these URLs against `localhost:4321`:
```
/en/                     (should be 200)
/en/about/               (should be 200)
/en/lab/                 (should be 200)
/ru/                     (should be 200)
/ru/about/               (should be 200)
/שאלות-ותשובות/          (HE — should be 200, baseline)
/en/שאלות-ותשובות/       (EN — should be 200)
```

If localhost reproduces the 404s → the problem is in code. Proceed to D-2.
If localhost works fine → the problem is Vercel-specific (deployment, env vars,
or build output). Report as STOP-ESCALATE — may need Daniel to re-deploy or
check Vercel config.

**Step D-2: Check Astro i18n middleware interference.**
Astro 6's `i18n` config with `output: 'server'` may add automatic middleware
that intercepts `/en/` and `/ru/` requests before they reach the page files.

Check:
- Does Astro auto-generate a locale redirect middleware?
- Is there a `_middleware.ts` in the build output?
- Does removing or adjusting `i18n.routing` in `astro.config.mjs` change the
  behavior?

Possible fixes:
- Set `routing: { prefixDefaultLocale: false, redirectToDefaultLocale: false }`
- Set `routing: 'manual'` and handle locale routing entirely via our own page files
- Add explicit `fallback` config

**Step D-3: Check if the catch-all is being shadowed.**
Astro routes have priority order. Check if any other route under `en/` could
be shadowing `[...slug].astro`:
- `en/blog.astro` — does this catch too many paths?
- `en/brands/`, `en/categories/`, etc. — could these interfere?
- Is there an `en/404.astro` that catches unmatched?

**Step D-4: Check Supabase connection at runtime.**
The route queries `v_storefront_pages` via `supabase` client. If the client is
null at runtime (missing env vars on Vercel), `getPageBySlug` returns null and
the route falls through to 404.

Check:
- `console.log` in `getPageBySlug` — does the query fire at all?
- Are `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` set correctly?
- Does `supabase` from `src/lib/supabase.ts` initialize correctly?

**Step D-5: Apply fix based on diagnosis.**
Once root cause is identified, apply the minimal fix. Run the full verification
(SC-1 through SC-10) after the fix.

---

## B. Task Execution Order

1. **YouTube nocookie fix** (5 minutes, low risk, quick win)
   - Replace `youtube-nocookie.com` → `youtube.com` in StepsBlock.astro (1 hit)
   - Replace `youtube-nocookie.com` → `youtube.com` in VideoBlock.astro (2 hits)
   - Add `&iv_load_policy=3` to any embed URL that doesn't have it
   - Verify SC-12, SC-13, SC-14
   - Commit 1

2. **Prizmaexpress RU text fix** (5 minutes, low risk)
   - Backup current blocks value (save in EXECUTION_REPORT)
   - Execute targeted SQL UPDATE replacing the 2 corrupted words
   - Verify SC-11
   - Log in EXECUTION_REPORT (no git commit — DB change)

3. **EN/RU routing diagnosis and fix** (main task — 30 min to 2 hours)
   - Follow §A diagnostic steps D-1 through D-5
   - Apply fix
   - Verify SC-1 through SC-10 (all EN, RU, and HE pages)
   - Run `npm run build` (SC-15) and `full-test.mjs` (SC-16)
   - Commit 2

4. **Retrospective** (10 minutes)
   - Write EXECUTION_REPORT.md + FINDINGS.md
   - Update SESSION_CONTEXT.md
   - Commit 3

**Estimated total runtime:** 1–3 hours depending on routing diagnosis complexity.

---

## C. Full Page Inventory for Verification

### EN pages to verify (17 published slugs)

```
/en/
/en/about/
/en/accessibility/
/en/deal/
/en/lab/
/en/multi/
/en/multifocal-guide/
/en/privacy/
/en/prizma-express-terms/
/en/prizmaexpress/
/en/supersale-takanon/
/en/terms/
/en/terms-branches/
/en/%D7%9E%D7%A9%D7%9C%D7%95%D7%97%D7%99%D7%9D-%D7%95%D7%94%D7%97%D7%96%D7%A8%D7%95%D7%AA/
/en/%D7%9E%D7%A9%D7%A7%D7%A4%D7%99-%D7%9E%D7%95%D7%9C%D7%98%D7%99%D7%A4%D7%95%D7%A7%D7%9C/
/en/%D7%A6%D7%A8%D7%95-%D7%A7%D7%A9%D7%A8/
/en/%D7%A9%D7%90%D7%9C%D7%95%D7%AA-%D7%95%D7%AA%D7%A9%D7%95%D7%91%D7%95%D7%AA/
```

### RU pages to verify (17 published slugs)
Same list with `/ru/` prefix instead of `/en/`.

### HE regression check (30 slugs — sample 10)
```
/
/about/
/lab/
/multi/
/prizmaexpress/
/%D7%A9%D7%90%D7%9C%D7%95%D7%AA-%D7%95%D7%AA%D7%A9%D7%95%D7%91%D7%95%D7%AA/
/%D7%9E%D7%A9%D7%A7%D7%A4%D7%99-%D7%9E%D7%95%D7%9C%D7%98%D7%99%D7%A4%D7%95%D7%A7%D7%9C/
/%D7%A6%D7%A8%D7%95-%D7%A7%D7%A9%D7%A8/
/multifocal-guide/
/terms/
```
