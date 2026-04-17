# FINDINGS — STOREFRONT_LANG_AND_VIDEO_FIX

> **Location:** `modules/Module 3 - Storefront/docs/specs/STOREFRONT_LANG_AND_VIDEO_FIX/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — EN/RU routing 404s on Vercel prod are a `develop → main` merge gap, not a code bug

- **Code:** `M3-ROUTING-01`
- **Severity:** HIGH
- **Discovered during:** SPEC §A Diagnostic Step D-1 (localhost reproduction) + follow-up git diff
- **Location:** `opticup-storefront` repo — branch-level difference between `origin/main` and `origin/develop` on `src/pages/en/[...slug].astro`, `src/pages/ru/[...slug].astro` (and their dependencies)
- **Description:** The SPEC hypothesized the 404s might be in code, in Astro i18n middleware, in route shadowing, or in Supabase runtime connection. Diagnosis showed none of those: localhost on `develop` serves 58/58 tested pages at HTTP 200 (24 EN + 24 RU + 10 HE). Vercel prod (deployed from `main`) serves only 3 EN/RU pages (`/about/`, `/privacy/`, `/accessibility/`) because those are hardcoded page files on `main`. All other EN/RU pages fall through to `main`'s `[...slug].astro`, which on `main` is a **blog-only catchall** — it calls `getPostBySlug` only. The CMS-page lookup (`getPageBySlug` → `v_storefront_pages`) was added to the catchall on `develop` in commit `f68c68e` ("Phase 3B complete: Blog migration") and is not on `main`. `main`'s latest commit is `bf655fe` (2026-03-30), 20+ commits behind `develop`.
- **Reproduction:**
  ```bash
  # In opticup-storefront:
  git show origin/main:src/pages/en/\[...slug\].astro | head -30
  #   → shows only getPostBySlug; no v_storefront_pages / getPageBySlug
  git show origin/develop:src/pages/en/\[...slug\].astro | head -40
  #   → shows getPageBySlug first, then getPostBySlug fallback
  git log origin/main..origin/develop --oneline | wc -l
  #   → 20+ commits ahead
  ```
  And:
  ```bash
  # Localhost on develop — PASSES:
  curl -sI http://localhost:4324/en/lab/       → 200
  curl -sI http://localhost:4324/ru/terms/     → 200
  # Vercel prod (main) — FAILS:
  curl -sI https://opticup-storefront.vercel.app/en/lab/    → 404
  curl -sI https://opticup-storefront.vercel.app/ru/terms/  → 404
  ```
- **Expected vs Actual:**
  - Expected per SPEC §3: EN/RU slugs serve HTTP 200 on Vercel
  - Actual: EN/RU slugs serve HTTP 200 on localhost (develop code); Vercel prod (main code) 404s except for 3 hardcoded pages
- **Suggested next action:** **NEW_SPEC** or direct Daniel-authorized merge
- **Rationale for action:** The fix is to merge `develop → main` so Vercel prod redeploys with the CMS-aware catchall. Only Daniel can authorize the merge per CLAUDE.md §9 rule 7. Before merging, Daniel may want a SPEC that (a) audits the full delta between `main` and `develop` (20+ commits span multiple features, not only routing), (b) verifies backwards compatibility of `v_storefront_pages` reads with what's currently live, and (c) plans the DNS switch sequence (merge → Vercel redeploy → DNS cutover). Pre-SPEC options: (1) "DEVELOP_TO_MAIN_SYNC" SPEC that reviews and stages the merge, or (2) Daniel performs the merge manually once Vercel preview on `develop` is confirmed green end-to-end.

---

### Finding 2 — SC-11 regex captures legitimate Hebrew CSS comments, not only corrupted words

- **Code:** `M3-LANG-SPEC-01`
- **Severity:** LOW
- **Discovered during:** SPEC §3 SC-11 verification after UPDATE landed
- **Location:** `storefront_pages` `slug='/prizmaexpress/' AND lang='ru'` — `blocks` JSONB contains `/* שונה לשמאל לימין */`, `/* אנימציה מותאמת ל-LTR */`, `/* מותאם לרוסית */` CSS comments inside `<style>` tags
- **Description:** The SPEC's SC-11 was written as `blocks::text ~ '[\u0590-\u05FF]'` → 0 matches. This is a superset of the actual intent (no Hebrew chars in user-visible Russian text). After the UPDATE that fixed the 2 corrupted words, the regex still matches because of legitimate Hebrew dev comments in CSS. The comments are not rendered by browsers and are invisible to users — they are RTL-oriented notes a developer wrote while converting the page from HE to RU. Removing them is a separate CSS-cleanup concern outside this SPEC's scope.
- **Reproduction:**
  ```sql
  SELECT regexp_matches(blocks::text, '[\u0590-\u05FF]+', 'g')
  FROM storefront_pages
  WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
    AND slug='/prizmaexpress/' AND lang='ru' AND is_deleted=false;
  -- Returns 8 rows: שונה, לשמאל, לימין, אנימציה, מותאמת, ל, מותאם, לרוסית
  -- All inside CSS comments: /* ... */
  ```
- **Expected vs Actual:**
  - Expected: SC-11 PASS (intent: no Hebrew chars in user-visible RU text)
  - Actual: SC-11 PARTIAL by literal criterion, PASS by intent (user-visible text is clean)
- **Suggested next action:** **DISMISS** (for this SPEC) + **TECH_DEBT** (for SPEC_TEMPLATE)
- **Rationale for action:** Two reasons: (a) The corrupted Russian words are genuinely fixed; the dev comments are developer-only and invisible in prod. (b) The SPEC_TEMPLATE should gain a precision-of-criteria sub-check (executor Proposal 2 in EXECUTION_REPORT §8). That proposal, if applied, prevents similar SC framings in future SPECs.

---

### Finding 3 — SPEC §C page inventory was 17 slugs per lang; DB now has 24 EN + 24 RU published

- **Code:** `M3-LANG-SPEC-02`
- **Severity:** INFO
- **Discovered during:** SC-8 / SC-9 verification loop
- **Location:** `storefront_pages` WHERE `status='published' AND tenant_id='6ad0781b-...' AND lang IN ('en','ru')`
- **Description:** SPEC §C listed 17 EN slugs and 17 RU slugs for SC-8/SC-9 batch testing. DB query at SPEC execution time returned 24 EN + 24 RU published (plus `supersale` without leading slash, which is a separate malformed-slug concern). New slugs present in DB but not in SPEC §C: `/eventsunsubscribe/`, `/premiummultisale/`, `/successfulsupersale/`, `/supersale-models-prices/`, `/supersale/`, `/supersalepricescatalog/`, `/מיופיה/`. Batch-tested all 24 EN + 24 RU — all 200 on localhost, all 404 on Vercel (per Finding 1). No behaviour issue; the SPEC inventory drifted between authoring (2026-04-16 audit baseline) and execution (2026-04-17). The `≥ 17/17` implicit floor was easily absorbed.
- **Reproduction:**
  ```sql
  SELECT lang, count(*) FROM v_storefront_pages
  WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
    AND status='published' AND lang IN ('en','ru') GROUP BY lang;
  -- en: 25, ru: 25 (one each is malformed "supersale" without slashes)
  ```
- **Expected vs Actual:**
  - Expected: 17 per lang
  - Actual: 24 per lang (well-formed slugs) + 1 per lang malformed (`supersale` without slashes)
- **Suggested next action:** **DISMISS** (no action needed for this SPEC) + possible future cleanup for the malformed `supersale` rows — tracked in Finding 4 below.

---

### Finding 4 — Malformed `supersale` slug (no leading slash) published in DB

- **Code:** `M3-DATA-01`
- **Severity:** MEDIUM
- **Discovered during:** SC-8 inventory enumeration
- **Location:** `storefront_pages` rows where `slug = 'supersale'` (literal, no slashes) for `lang IN ('he','en','ru')`
- **Description:** All three language rows with slug `supersale` (no leading/trailing slashes) sit in `storefront_pages` at `status='published'`. Every other published slug uses the convention `/foo/` (leading + trailing slash). `v_storefront_pages` returns these rows alongside the well-formed ones, which means any consumer that normalises `slug` to `/xxx/` will miss them, and any consumer that doesn't will accept a slug that doesn't route via the catchall's slug-normalisation path (which always adds slashes). The page routes reachable at `/supersale/` (well-formed) are what users see because those DO exist as well-formed rows. The malformed rows are latent data — probably a Studio-side bug that saved without normalising.
- **Reproduction:**
  ```sql
  SELECT slug, lang, status, updated_at FROM storefront_pages
  WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
    AND slug NOT LIKE '/%';
  -- Returns 3 rows: he/en/ru all slug='supersale' (no slashes), all published
  ```
- **Expected vs Actual:**
  - Expected: all published slugs follow `/foo/` convention
  - Actual: 3 rows break the convention with no adverse routing (because well-formed twins exist) but muddle the inventory
- **Suggested next action:** **TECH_DEBT**
- **Rationale for action:** Not a user-visible bug today, but should be cleaned up before DNS switch to keep the inventory and future sitemap builds coherent. Two sub-tasks: (a) check if the 3 rows are orphaned (no well-formed twin) or duplicates — if duplicates, soft-delete; if unique content, rename slug; (b) add a Studio-side validator that rejects slugs without leading+trailing slashes. Could fold into CONTACT_FORM_FIX or a dedicated STOREFRONT_SLUG_HYGIENE SPEC.

---
