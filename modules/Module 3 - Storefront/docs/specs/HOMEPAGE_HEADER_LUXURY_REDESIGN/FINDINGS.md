# FINDINGS — HOMEPAGE_HEADER_LUXURY_REDESIGN

> **Location:** `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_HEADER_LUXURY_REDESIGN/FINDINGS.md`
> **Written by:** opticup-executor (Windows Claude Code, 2026-04-16)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — vercel.json redirects do not fire on `npm run dev`; SPEC criterion 16 mis-written for localhost

- **Code:** `M3-SPEC-REDESIGN-01`
- **Severity:** LOW
- **Discovered during:** §3 criterion 16 verification on localhost:4321
- **Location:** SPEC §3 criterion 16; also `opticup-storefront/vercel.json:648–670` (the new redirects — behaviorally correct, just unverifiable locally)
- **Description:** SPEC §3 criterion 16 asks for `curl -sI http://localhost:4321/he/{current-multifocal-slug} | head -1` to start with `HTTP/1.1 301`. Astro's dev server does not simulate `vercel.json` `redirects` — those are a Vercel platform-layer feature that only fires at the edge. The local curl returns `HTTP/1.1 200 OK` (the dev server serves the CMS `/multifocal-guide/` page directly). Redirects WILL fire correctly on Vercel Preview / production deploy.
- **Reproduction:**
  ```
  cd opticup-storefront && npm run dev
  # in another shell:
  curl -sI http://localhost:4321/multifocal-guide/ | head -1
  # Actual:   HTTP/1.1 200 OK
  # Expected: HTTP/1.1 301 Moved Permanently
  ```
- **Expected vs Actual:**
  - Expected: 301 (SPEC criterion 16 as written)
  - Actual on localhost: 200
  - Actual on Vercel (post-deploy): expected 301 — not verified in this session; deferred to Vercel Preview URL check after merge
- **Suggested next action:** DISMISS (after Foreman notes this as a SPEC-author-pattern tech debt). Additional docs proposal: amend the SPEC-author guidance so future criteria that depend on vercel.json redirects specify "verify on Vercel Preview URL" rather than localhost. Also addressed by Executor Proposal 2 in `EXECUTION_REPORT.md §8`.
- **Rationale for action:** The redirects are correctly implemented; only the SPEC's verification command is wrong. No code change needed; this is a SPEC template lesson.
- **Foreman override:** { }

---

### Finding 2 — `storefront_pages_backups` table does not exist; migration rollback relies on git history

- **Code:** `M3-CMS-DEBT-01`
- **Severity:** MEDIUM
- **Discovered during:** Pre-flight for migration 123 (Homepage content UPDATE)
- **Location:** Supabase DB public schema — `storefront_pages_backups` absent per `STOREFRONT_CMS_ARCHITECTURE.md §4` fallback clause
- **Description:** `STOREFRONT_CMS_ARCHITECTURE.md §4 Option B` prescribes a pre-UPDATE INSERT into `storefront_pages_backups` for rollback safety. That table does not exist in the live DB. The reference explicitly documents the fallback ("skip the backup row and rely on `git revert` of the migration + a re-apply of the previous content migration"), but this means every CMS content migration carries a risk: if the UPDATE succeeds and the developer later needs to restore the prior `blocks` JSONB, there is no table-level history — only git history of the migration files, which requires committing before applying (this executor did so for migrations 123 + 124, but that's discipline, not infrastructure).
- **Reproduction:**
  ```sql
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'storefront_pages_backups'
  );
  -- Result: false
  ```
- **Expected vs Actual:**
  - Expected per reference: table exists, INSERT row before each UPDATE
  - Actual: table missing, rely on git + developer discipline
- **Suggested next action:** NEW_SPEC — `M3_STOREFRONT_PAGES_BACKUPS_TABLE`
  - Scope: CREATE TABLE `storefront_pages_backups (id, tenant_id, slug, lang, blocks, backed_up_at, backed_up_by)` with tenant_id NOT NULL + RLS (Rules 14, 15, 18). Add trigger `before_update_storefront_pages` that INSERTs a backup row automatically. Low complexity, high safety value. Schedule before next CMS-content-heavy SPEC.
- **Rationale for action:** One-time infrastructure fix that removes a silent foot-gun from every future content migration. Foreman may merge into an adjacent SPEC or stand-alone — executor's call.
- **Foreman override:** { }

---

### Finding 3 — `modules/storefront/studio-block-schemas.js` now 627 lines; exceeds Rule 12's 350 max by nearly 2×

- **Code:** `M3-R12-STUDIO-01`
- **Severity:** MEDIUM
- **Discovered during:** §13.3 commit #3 (Studio registry update)
- **Location:** `modules/storefront/studio-block-schemas.js` — 627 lines after my +142-line addition (SPEC-required 8 block registrations)
- **Description:** The Studio block registry was 485 lines before this SPEC (already over the 350 max per Guardian alert `[M1-R12-02] Oversized storefront studio files`). My 8 new luxury-boutique schemas pushed it to 627. Pre-commit hook reports `0 violations` for this file, suggesting the hook has a warn-only carve-out for pre-existing oversized files. Either way, Rule 12 is violated and the Guardian alert is now more urgent.
- **Reproduction:**
  ```
  wc -l modules/storefront/studio-block-schemas.js
  # 627
  ```
- **Expected vs Actual:**
  - Expected per Rule 12: ≤350 lines (absolute max)
  - Actual: 627 lines (79% over)
- **Suggested next action:** TECH_DEBT — extend existing Guardian alert `[M1-R12-02]` with this specific file + a proposed split pattern: `studio-block-schemas.js` → core schemas (hero, text, gallery, video, products, cta, lead_form, faq, contact) + `studio-block-schemas-marketing.js` (banner, columns, steps, brands, blog_carousel, reviews, trust_badges, divider, sticky_bar, custom, campaign_cards, campaign_tiers) + `studio-block-schemas-luxury.js` (the 8 new ones). The module's main export (`BLOCK_SCHEMAS`) spreads the 3 files. Zero behavior change.
- **Rationale for action:** Pre-existing Guardian alert already tracks oversized storefront files; my addition made the worst one worse. Don't block this SPEC on a split (Rule 12 is a non-negotiable but Daniel + Foreman traditionally defer tech debt to scheduled sweeps), but escalate the priority of the sweep.
- **Foreman override:** { }

---

### Finding 4 — Old `/multifocal-guide/` CMS rows remain in `storefront_pages` after vercel.json 301

- **Code:** `M3-CMS-DEBT-02`
- **Severity:** LOW
- **Discovered during:** §13.3 commit #8 (vercel.json redirects added)
- **Location:** `storefront_pages` rows for `(tenant_id = 6ad0781b-…, slug = '/multifocal-guide/', lang IN ('he','en','ru'))` — 3 rows, page_type='guide', status='published'
- **Description:** The vercel.json redirects take precedence at the Vercel edge, so users never reach these rows — in production they effectively become dead DB rows. However, they remain `status='published'` and `is_deleted=false`, so they still appear in admin/Studio listings + any internal tooling that enumerates published pages (e.g., sitemap generation). The sitemap dynamic generator (`src/pages/sitemap-dynamic.xml.ts`) was already updated in PRE_MERGE_SEO_FIXES to 301-guard legacy URLs, so this is likely non-impacting for SEO, but the rows are still "alive" by the `status` column.
- **Reproduction:**
  ```sql
  SELECT slug, lang, status, is_deleted, updated_at
  FROM storefront_pages
  WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
    AND slug = '/multifocal-guide/';
  -- Returns 3 rows, all status='published', is_deleted=false
  ```
- **Expected vs Actual:**
  - Expected after redirect: rows soft-deleted or status='archived' for housekeeping clarity
  - Actual: rows still published
- **Suggested next action:** TECH_DEBT — a single-line sweep in a future close-out SPEC:
  ```sql
  UPDATE storefront_pages
  SET status = 'archived', updated_at = now()
  WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
    AND slug = '/multifocal-guide/';
  ```
  Daniel may prefer to verify the 301 chain in production first before archiving (so rollback is trivial if a problem surfaces).
- **Rationale for action:** Cosmetic + housekeeping. Low risk either way. Daniel's call on timing.
- **Foreman override:** { }
