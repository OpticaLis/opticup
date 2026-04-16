# SPEC — STOREFRONT_S2S3_QA

> **Location:** `modules/Module 3 - Storefront/docs/specs/STOREFRONT_S2S3_QA/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-16
> **Module:** 3 — Storefront
> **Phase (if applicable):** Post-R2 polish / pre-NAV_FIX
> **Author signature:** Cowork session `friendly-awesome-carson`

---

## 1. Goal

Verify all code and DB changes from storefront sessions 2+3 (Header fixed positioning,
ContactForm wiring + hide, /about/ story_teaser pages, BaseLayout pt-16), confirm
nothing was broken on adjacent pages or components, and apply two language quality
fixes found during the EN/RU language audit (EN optometry page title, RU FAQ
em-dash).

---

## 2. Background & Motivation

Sessions 2 and 3 on 2026-04-16 produced significant storefront changes that Daniel
has not yet committed (changes exist on-disk at the Windows machine). These include:

- **Header.astro**: `sticky` → `fixed`, mobile booking CTA added to header bar, duplicate
  CTA removed from mobile dropdown, i18n key corrected.
- **BaseLayout.astro**: `hideContactForm = true` default, `pt-16` added to `<main>`,
  `tenantId` prop wired through.
- **ContactForm.astro**: Fully rewritten — all fields + checkbox required, loading/
  success/error states, fetch to `/api/leads/submit`, self-resolves `tenantId`.
- **submit.ts**: Resend email notification added (non-blocking).
- **he.json**: `nav.book_exam` spelling fixed: "ראיה" → "ראייה".
- **DB `storefront_pages`**: `/about/` in HE/EN/RU replaced with 2 `story_teaser` blocks
  each (Daniel's content + images). Em dashes replaced with hyphens across all 3 rows.
- **index.astro × 3** (HE/EN/RU homepages): `tenantId={tenant?.id}` added, stale
  `hideContactForm={false}` prop removed.

Additionally, an EN/RU language audit was conducted and found two issues to fix:
- **EN optometry page** (`/optometry/`): Hero title "40 years of expertise. Vision that
  finds the precision." is awkward (Hebrew-influenced word order). Fix needed.
- **RU FAQ page** (`/שאלות-ותשובות/`): One FAQ answer uses a plain hyphen ` - до 7`
  instead of Russian typographic em-dash ` — до 7`.

Prior SPEC: `HOMEPAGE_LUXURY_REVISIONS_R2` (closed 🟢 2026-04-16).

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command / method |
|---|-----------|---------------|-------------------------|
| 1 | Header `position` class | `fixed top-0 inset-x-0 z-50` in `<header>` element | `grep -n "fixed top-0 inset-x-0" opticup-storefront/src/components/Header.astro` → match on line ~53 |
| 2 | Mobile booking CTA in header bar | Block exists with class `lg:hidden` + `nav.book_exam` key BEFORE `<button id="mobile-menu-btn"` | `grep -n "lg:hidden.*nav.book_exam\|nav.book_exam.*lg:hidden" Header.astro` OR Read file and confirm ordering |
| 3 | No booking CTA inside mobile dropdown | No `nav.book_exam` inside `<nav id="mobile-menu"` block | Read Header.astro → mobile-menu nav section contains ONLY navItems loop + language switcher |
| 4 | he.json spelling | `nav.book_exam` = `"תיאום בדיקת ראייה"` (two yuds in ראייה) | `grep "book_exam" he.json` → exact string match |
| 5 | BaseLayout `hideContactForm` default | `hideContactForm = true` (NOT false) | `grep "hideContactForm" BaseLayout.astro` → `hideContactForm = true,` in destructure |
| 6 | BaseLayout `<main>` class | `class="flex-1 pt-16"` | `grep "pt-16" BaseLayout.astro` → match in `<main>` tag |
| 7 | ContactForm hidden | `{!hideChrome && !hideContactForm && <ContactForm ...>}` in BaseLayout | Read BaseLayout.astro → confirm both guards present |
| 8 | ContactForm tenantId | `tenantId={tenantId \|\| ''}` passed to ContactForm | Read BaseLayout.astro → confirm tenantId prop threaded through |
| 9 | ContactForm self-resolves tenantId | `resolveTenant(Astro.request)` fallback in ContactForm.astro when prop empty | Read ContactForm.astro → confirm fallback block in frontmatter |
| 10 | submit.ts Resend: non-blocking | Resend email block guarded by `if (resendKey)` + no await at top level / no throw | Read submit.ts → confirm `if (resendKey)` guard, email failure path does not call `return error(...)` |
| 11 | /about/ HE block count | 2 story_teaser blocks | Supabase MCP: `SELECT jsonb_array_length(blocks), jsonb_path_query_array(blocks,'$[*].type') FROM storefront_pages WHERE slug='/about/' AND lang='he' AND tenant_id=(SELECT id FROM tenants WHERE slug='prizma')` → `[2, ["story_teaser","story_teaser"]]` |
| 12 | /about/ EN block count | 2 story_teaser blocks | Same query with `lang='en'` → `[2, ["story_teaser","story_teaser"]]` |
| 13 | /about/ RU block count | 2 story_teaser blocks | Same query with `lang='ru'` → `[2, ["story_teaser","story_teaser"]]` |
| 14 | /about/ HE block 1 layout | `layout: "image-start"` | Supabase MCP: `SELECT blocks->0->'data'->>'layout' FROM storefront_pages WHERE slug='/about/' AND lang='he' AND ...` → `"image-start"` |
| 15 | /about/ HE block 2 layout | `layout: "image-end"` | Same query with `blocks->1` → `"image-end"` |
| 16 | /about/ EN block 1 layout | `layout: "image-start"` | Same for `lang='en'` blocks->0 → `"image-start"` |
| 17 | No em dashes in /about/ blocks | 0 occurrences of `—` in any /about/ row | `SELECT COUNT(*) FROM storefront_pages WHERE slug='/about/' AND blocks::text LIKE '%—%' AND tenant_id=...` → 0 |
| 18 | EN optometry page title fixed | Hero block title = `"40 years of expertise. Precision vision, personal care."` | Supabase MCP: `SELECT blocks->0->'data'->>'title' FROM storefront_pages WHERE slug='/optometry/' AND lang='en' AND tenant_id=...` → exact string match |
| 19 | RU FAQ hyphen fixed | No ` - до` in FAQ page blocks | Supabase MCP: `SELECT COUNT(*) FROM storefront_pages WHERE slug='/שאלות-ותשובות/' AND lang='ru' AND blocks::text LIKE '% - до%' AND tenant_id=...` → 0 |
| 20 | Homepage EN/RU tenantId wired | `tenantId={tenant?.id}` present in en/index.astro + ru/index.astro | `grep "tenantId" src/pages/en/index.astro src/pages/ru/index.astro` → match in both |
| 21 | No stale hideContactForm on homepages | No `hideContactForm` prop on BaseLayout in any of the 3 homepage files | `grep "hideContactForm" src/pages/index.astro src/pages/en/index.astro src/pages/ru/index.astro` → 0 results |
| **Daniel-side** | Header stickiness on scroll | Header remains pinned at top while page scrolls, on desktop AND mobile | Open localhost:4321/ → scroll down → header stays |
| **Daniel-side** | Mobile CTA without menu open | "תיאום בדיקת ראייה" button visible in HE header bar without tapping hamburger | Open localhost:4321/ on mobile viewport → verify button visible in header bar |
| **Daniel-side** | All 3 locales: mobile CTA | Same button visible in EN (/en/) and RU (/ru/) header bars | Open /en/ and /ru/ on mobile viewport |
| **Daniel-side** | /about/ pages render correctly | HE: image right + text left, then text right + image left. EN: mirrored (image left first). RU: same as EN. | Browse /about/, /en/about/, /ru/about/ |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in either repo
- Run read-only SQL (Level 1 autonomy)
- Apply the two targeted DB fixes in §6 below via Supabase MCP UPDATE (Level 2 — scoped WHERE clauses, Prizma tenant only, non-schema DDL)
- Run `tsc --noEmit` in the storefront repo if node_modules is available
- Create EXECUTION_REPORT.md + FINDINGS.md in this SPEC folder
- Commit SPEC artifacts to ERP develop branch (opticup repo only)

### What REQUIRES stopping and reporting
- Any file in `FROZEN_FILES.md` being touched
- Any schema DDL (CREATE/ALTER/DROP) — Level 3, never autonomous
- Any merge to `main` in either repo
- Any `npm run build` or TypeScript error that reveals a real bug in the session 2+3 changes
- Any DB query returning unexpected values (e.g., /about/ block count ≠ 2, wrong layout values)
- Any criterion in §3 with an actual vs expected mismatch that is not the two known language fixes

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- If `/about/` block count ≠ 2 in any locale → STOP (DB update may not have landed)
- If `Header.astro` does NOT contain `fixed top-0 inset-x-0` → STOP (change may not have been saved to disk yet — confirm with Daniel)
- If `he.json` `nav.book_exam` still contains one yud (`ראיה`) → STOP and flag that Daniel's disk changes may not be present in the mounted folder
- If EN optometry page `slug='/optometry/' AND lang='en'` returns 0 rows → STOP (page may not exist yet in DB)
- If the RU FAQ hyphen fix UPDATE returns 0 rows affected → verify the exact block structure before retrying

---

## 6. The Two Language Quality Fixes (Level 2 SQL — Executor applies)

Both are targeted, non-schema DB updates on CMS content. Pre-state must be captured before each.

### Fix A — EN Optometry Page Title

**Current (broken):** Hero block title = `"40 years of expertise. Vision that finds the precision."`
**Target:** `"40 years of expertise. Precision vision, personal care."`

**Pre-fix verification:**
```sql
SELECT blocks->0->'data'->>'title' AS hero_title
FROM storefront_pages
WHERE slug = '/optometry/'
  AND lang = 'en'
  AND tenant_id = (SELECT id FROM tenants WHERE slug = 'prizma')
  AND is_deleted = false;
```
Expected: `"40 years of expertise. Vision that finds the precision."` — if different, STOP.

**Fix:**
```sql
UPDATE storefront_pages
SET blocks = jsonb_set(
  blocks,
  '{0,data,title}',
  '"40 years of expertise. Precision vision, personal care."'::jsonb
)
WHERE slug = '/optometry/'
  AND lang = 'en'
  AND tenant_id = (SELECT id FROM tenants WHERE slug = 'prizma')
  AND is_deleted = false;
```

**Post-fix verify:** Re-run the pre-fix SELECT → must return the new string exactly.

---

### Fix B — RU FAQ Em-Dash

**Current (broken):** One FAQ answer in `/שאלות-ותשובות/` (lang=`ru`) contains ` - до 7` (plain hyphen).
**Target:** Replace ` - до` with ` — до` (proper Russian typographic em-dash with spaces).

**Pre-fix verification:**
```sql
SELECT id,
       blocks::text LIKE '% - до%' AS has_hyphen_issue
FROM storefront_pages
WHERE slug = '/שאלות-ותשובות/'
  AND lang = 'ru'
  AND tenant_id = (SELECT id FROM tenants WHERE slug = 'prizma')
  AND is_deleted = false;
```
Expected: one row with `has_hyphen_issue = true` — if false, STOP (already fixed or different text).

**Fix:**
```sql
UPDATE storefront_pages
SET blocks = REPLACE(blocks::text, ' - до', ' — до')::jsonb
WHERE slug = '/שאלות-ותשובות/'
  AND lang = 'ru'
  AND tenant_id = (SELECT id FROM tenants WHERE slug = 'prizma')
  AND is_deleted = false;
```

**Post-fix verify:**
```sql
SELECT blocks::text LIKE '% - до%' AS still_broken
FROM storefront_pages
WHERE slug = '/שאלות-ותשובות/'
  AND lang = 'ru'
  AND tenant_id = (SELECT id FROM tenants WHERE slug = 'prizma')
  AND is_deleted = false;
```
Expected: `still_broken = false`.

---

## 7. Out of Scope (explicit)

- **/about/ pages** — language quality review explicitly excluded by Daniel. Structure QA only (criteria 11–17).
- **`v_storefront_products` and any other Views** — no view changes in this SPEC.
- **Git commits for Daniel's pending storefront changes** — Daniel pushes from CMD. The executor verifies the files but does NOT commit or stage storefront files.
- **ContactForm re-enable** — ContactForm stays hidden (`hideContactForm = true`). Re-enable is a separate task pending Resend DNS verification at the DNS switch.
- **EN/RU homepage block parity divergence** (M3-DEBT-LOCALE-01 from R2 review) — tracked in TECH_DEBT, not addressed here.
- **`verify:full` baseline violations** (M3-EXEC-DEBT-02) — tracked in TECH_DEBT, separate SPEC queued.
- **Lighthouse scores, Web Vitals, Vercel preview deploy** — Daniel-side, not executor-runnable.

---

## 8. Expected Final State

### New files (SPEC artifacts in ERP repo)
- `modules/Module 3 - Storefront/docs/specs/STOREFRONT_S2S3_QA/SPEC.md` ← this file
- `modules/Module 3 - Storefront/docs/specs/STOREFRONT_S2S3_QA/EXECUTION_REPORT.md` (executor writes at close)
- `modules/Module 3 - Storefront/docs/specs/STOREFRONT_S2S3_QA/FINDINGS.md` (executor writes if there are findings)

### Storefront files (already on Daniel's disk, not committed by executor)
- No storefront file modifications by executor — verification only.

### DB state after SPEC
- `/optometry/` lang=`en`: hero block title = `"40 years of expertise. Precision vision, personal care."`
- `/שאלות-ותשובות/` lang=`ru`: 0 occurrences of ` - до` in blocks::text
- All other storefront_pages rows: unchanged

### Docs updated (MUST include)
- `modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md` — update "Pending QA SPEC" section to reflect SPEC executed + DB fixes applied + Daniel-side checklist
- `modules/Module 3 - Storefront/docs/CHANGELOG.md` — add STOREFRONT_S2S3_QA entry
- `MASTER_ROADMAP.md` — NO change (this is a QA polish commit, not a phase close)
- `docs/GLOBAL_MAP.md` — NO change (no new functions or contracts)
- `docs/GLOBAL_SCHEMA.sql` — NO change (no new tables/views)

---

## 9. Commit Plan

**ERP repo (`opticalis/opticup`) only — executor commits here:**

- **Commit 1:** `qa(m3): apply EN/RU language quality fixes from S2S3 audit`
  - DB-only changes (no code files to commit, applied via Supabase MCP)
  - Session commit documenting: EN optometry title fix + RU FAQ em-dash fix
  - Files: this SPEC folder (SPEC.md) + MODULE_3 SESSION_CONTEXT update (partial)

- **Commit 2 (SPEC close):** `chore(spec): close STOREFRONT_S2S3_QA with retrospective`
  - Files: EXECUTION_REPORT.md + FINDINGS.md (if any) + SESSION_CONTEXT.md + CHANGELOG.md

**Storefront repo — Daniel commits manually from CMD:**
- The pending changes (Header.astro, BaseLayout.astro, ContactForm.astro, submit.ts,
  he.json, .env.example, package.json, index.astro × 3) remain uncommitted until
  Daniel runs `git add` + `git push origin develop` from the Windows CMD.
- Suggested commit message for Daniel:
  `feat(storefront): fixed header, mobile booking CTA, ContactForm build, /about/ pages, i18n fix`

---

## 10. Dependencies / Preconditions

- Session 2+3 storefront file changes exist on Daniel's disk (mounted at
  `/sessions/friendly-awesome-carson/mnt/opticup-storefront/` in Cowork).
- Supabase MCP is available and connected to project `tsxrrxzmdxaenlvocyit`.
- `/optometry/` page exists in `storefront_pages` for `lang='en'` (verify in Step 1).
- No other session is concurrently modifying `storefront_pages` rows.

---

## 11. Lessons Already Incorporated

From `HOMEPAGE_LUXURY_REVISIONS_R2/FOREMAN_REVIEW.md`:

- **Proposal A1 (Reality Check on §1 Goal claims):** APPLIED — before writing Fix A and Fix B in §6, I confirmed the exact broken strings via Supabase MCP query in the authoring session. The EN optometry title ("Vision that finds the precision") and RU hyphen (" - до") were verified against live DB before being written into the SPEC.

- **Proposal A2 (Verify npm script names):** APPLIED — no `npm run X` scripts are cited in §3 success criteria that aren't standard (`tsc --noEmit`). The earlier `verify:full` / `safety-net` naming confusion is avoided. The `tsc --noEmit` check is labeled optional since Daniel's changes are not yet committed to the storefront repo.

- **Daniel-side label convention (from R2 FOREMAN_REVIEW §4 Finding #3 disposition):** APPLIED — all visual/browser checks in §3 are explicitly labeled `Daniel-side` to prevent the executor from attempting them in the autonomous flow (no running dev server in Cowork sandbox).

- **Cross-Reference Check completed 2026-04-16 against live DB via Supabase MCP:** 0 new DB objects introduced. No GLOBAL_SCHEMA collision check needed. The 2 SQL fixes in §6 are UPDATE statements on existing columns, not new objects.
