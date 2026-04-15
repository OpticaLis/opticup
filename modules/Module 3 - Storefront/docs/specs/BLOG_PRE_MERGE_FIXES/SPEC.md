# SPEC — BLOG_PRE_MERGE_FIXES

> **Location:** `modules/Module 3 - Storefront/docs/specs/BLOG_PRE_MERGE_FIXES/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-15
> **Module:** 3 — Storefront
> **Phase (if applicable):** Pre-merge content cleanup (blocks develop→main merge)
> **Author signature:** cowork session 2026-04-15 (beautiful-adoring-galileo)

---

## 1. Goal

Remediate every CRITICAL and HIGH finding from `BLOG_PRE_MERGE_AUDIT` + `FINDINGS_IMAGES` so the multilingual blog (174 published posts across he/en/ru) is production-safe before the DNS switch and the develop→main merge. The primary fix is migrating 132 posts' embedded WordPress images into the existing Studio Media Library (`media-library` bucket, `blog` folder) and rewriting their URLs in `blog_posts.content`; the secondary fixes handle Hebrew slugs on en/ru rows, the nonsensical grammar article, hardcoded tenant values, and internal WordPress `<a>` links.

---

## 2. Background & Motivation

Two prior audits in this folder (`FINDINGS.md` 2026-04-15, `FINDINGS_IMAGES.md` 2026-04-15) established, with evidence, that:

- 132/174 posts (76%) contain `<img>` and `<a>` tags pointing to the legacy WordPress domain `prizma-optic.co.il` — some already 404, all will 404 post-DNS-switch.
- 41 posts (21 en + 20 ru) have Hebrew slugs on non-Hebrew rows.
- 1 post ("משקפיים זה בלשון זכר או נקבה? 🤔") is a Hebrew-grammar article whose en and ru translations are nonsensical in the target language → Daniel decided: soft-delete en+ru variants.
- 7 posts contain hardcoded tenant values (`optic_prizma`, address, phone).

Daniel approved Option A for images on 2026-04-15: **full migration to Supabase Storage through the existing Studio Media Library**, landing in the `blog` folder (`value='blog'`, label `"בלוג"`). Using the existing Studio Media pipeline (`media-library` bucket + `media_library` table) keeps images consistent with Studio-uploaded media and preserves the `/api/image/` proxy URL pattern already used across the storefront.

This SPEC is the final pre-merge content cleanup. Once closed and verified, Module 3 is clear for develop→main merge pending the remaining QA pass in `QA_HANDOFF_2026-04-14.md`.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command / query |
|---|-----------|---------------|------------------------|
| 1 | Branch state at start and end | On `develop`, clean tree | `git branch` → `* develop`; final `git status` → "nothing to commit" |
| 2 | No tables altered | Zero DDL in this SPEC | `git log origin/develop..HEAD -p -- '*.sql' \| grep -E '^\+(CREATE\|ALTER\|DROP)'` → empty |
| 3 | All WordPress image URLs migrated | 0 remaining `prizma-optic.co.il` img src in content | `SELECT COUNT(*) FROM blog_posts WHERE is_deleted=false AND status='published' AND content ~ '<img[^>]+prizma-optic\.co\.il'` → `0` |
| 4 | New `media_library` rows in `blog` folder | ≥ (unique WP image count minus reused rows) rows, all tenant=Prizma | `SELECT COUNT(*) FROM media_library WHERE folder='blog' AND tenant_id='<PRIZMA_UUID>' AND is_deleted=false` → ≥ catalog count minus reused |
| 4b | **Deduplication against existing media_library** — before uploading, every candidate image is checked against existing rows in `media_library` (folder='blog', same tenant). Reuse hits: same `original_filename` OR same file hash OR same Supabase Storage object already present at the target path. Every reuse is logged. | 0 duplicate uploads | `EXECUTION_REPORT.md` section "Dedup Results" lists every candidate → (uploaded \| reused \| skipped_already_404) |
| 5 | Storage objects uploaded | Matching row count in `media-library` bucket under `<tenant>/blog/` prefix | Supabase MCP `execute_sql` on `storage.objects` |
| 6 | New URLs use the storefront `/api/image/` proxy pattern OR the Supabase public URL pattern used by existing Studio media (whichever is canonical for the `media-library` bucket at execution time — executor chooses based on how existing blog featured_image URLs are stored) | Every new src matches one of the two documented patterns | `SELECT content FROM blog_posts WHERE content ~ '<img' LIMIT 20` — spot check |
| 7 | Grammar article en+ru soft-deleted | 2 rows with `is_deleted=true` | `SELECT id, lang, is_deleted FROM blog_posts WHERE translation_of='66e93a9f-0c4b-4c97-9acd-3e66abfb8dee' OR id IN ('c3b13a1c-c29f-4616-adc7-c1753271fb3b','0640cf3d-8b43-4458-a1a0-213eacb093dc')` → en+ru both `true`, he row untouched |
| 8 | Hebrew slugs removed from en/ru rows | 0 posts with Hebrew chars in slug on non-he rows | `SELECT COUNT(*) FROM blog_posts WHERE slug ~ '[א-ת]' AND lang IN ('en','ru') AND is_deleted=false AND status='published'` → `0` |
| 9 | Slug uniqueness preserved | No duplicate slug within a language | `SELECT slug, lang, COUNT(*) FROM blog_posts WHERE is_deleted=false AND status='published' GROUP BY slug, lang HAVING COUNT(*) > 1` → empty |
| 10 | Internal WordPress `<a>` links rewritten or stripped | 0 remaining `href="https://prizma-optic.co.il/..."` in published content | `SELECT COUNT(*) FROM blog_posts WHERE is_deleted=false AND status='published' AND content ~ 'href=["'']https?://prizma-optic\.co\.il'` → `0` |
| 11 | Post counts unchanged for he | he language still 58 published non-deleted | `SELECT COUNT(*) FROM blog_posts WHERE lang='he' AND is_deleted=false AND status='published'` → `58` |
| 12 | Post counts adjusted for en, ru | en = 57 (grammar article deleted), ru = 57 | Same query for en and ru → `57` each |
| 13 | Hardcoded tenant values flagged | 7 posts listed in `FINDINGS_TENANT.md` with exact src text; NO auto-fix applied (content work deferred) | `ls modules/Module 3 - Storefront/docs/specs/BLOG_PRE_MERGE_FIXES/FINDINGS_TENANT.md` → exit 0 |
| 14 | Browser spot-check passes | 3 previously-broken posts render with no broken-image icons on `localhost:4321/{slug}/` | Manual visual check by executor after migration; document in EXECUTION_REPORT.md |
| 15 | Storefront build passes | 0 errors | `npm run build` in the sibling `opticup-storefront` repo → exit 0 (if reachable; else UNVERIFIED with note) |
| 16 | All blog list pages load | `/blog` for he/en/ru all return 200 | `curl -s -o /dev/null -w "%{http_code}" localhost:4321/blog/` per language → `200` |
| 17 | Retrospective committed | `EXECUTION_REPORT.md` + `FINDINGS.md` present in this folder | `ls modules/Module 3 - Storefront/docs/specs/BLOG_PRE_MERGE_FIXES/{EXECUTION_REPORT,FINDINGS}.md` → both exit 0 |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in the repo; run read-only SQL (Level 1).
- Download public images via `curl`/`wget` from `prizma-optic.co.il` while it is still reachable.
- Upload to the `media-library` Supabase Storage bucket (using the existing service-role path pattern used by `studio-media.js` and `studio-brands.js`).
- Insert rows into `media_library` using the existing field shape (see §10 Dependencies).
- Run scoped `UPDATE` on `blog_posts.content` / `blog_posts.slug` / `blog_posts.is_deleted` under Level 2 autonomy — this SPEC's approval from Daniel (2026-04-15, "כן") is the pre-approval; executor proceeds without re-asking per commit.
- Create helper scripts under `modules/Module 3 - Storefront/scripts/blog-migration/` (new subfolder).
- Create a backup snapshot of `blog_posts` into a file under `modules/Module 3 - Storefront/backups/blog_pre_merge_fixes_2026-04-15/` before Phase 3 writes begin (Working Rule §9.8).
- Commit and push by explicit filename on `develop`.

### What REQUIRES stopping and reporting
- Any DDL (CREATE / ALTER / DROP) — not expected, flag as deviation.
- Discovering that `media_library` has a column the executor doesn't understand how to populate safely → STOP and surface schema in EXECUTION_REPORT.
- Any unique WP image URL that returns neither 200 nor 404 (e.g. 5xx, timeout, auth) → record under `UNVERIFIED` and ask whether to proceed without that image.
- Hitting a post whose `content` parses as invalid HTML and cannot be round-tripped without structural change → STOP, surface the post_id, do not silently reflow HTML.
- Any slug collision after transliteration that cannot be resolved with a numeric suffix (e.g. two posts transliterate to the same English slug and the title-based disambiguator also collides) → STOP with the pair.
- Net row-count change to `blog_posts` other than the 2 soft-deletes authorized in §3 criterion 7.
- Any attempted merge to `main` — forbidden (CLAUDE.md §9.7).

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- If the number of unique WordPress image URLs discovered in Phase 1 is ≤10 or ≥500 → STOP and surface (audit found ~150–200 range expected; extremes suggest a parser bug or missed scope).
- If Phase 3 produces more than 10 rows in `media_library` that fail to insert with a non-obvious error → STOP.
- If Phase 4's `UPDATE` statement (per-post) affects 0 rows when a change was expected → STOP on the first such case.
- If the post-migration re-query for Criterion 3 returns any nonzero count → STOP (do not attempt a second pass silently).
- If any post ends up with empty `content` (LENGTH <50) after rewriting → STOP (may indicate over-aggressive regex).
- If the Prizma-Optics WordPress domain becomes unreachable mid-migration → STOP, save catalog of uncompleted downloads, surface to Daniel before continuing with fallback plan.

---

## 6. Rollback Plan

Every write phase has a matching rollback:

- **Phase 3 (Storage uploads + `media_library` inserts):** rollback by `DELETE FROM media_library WHERE folder='blog' AND created_at >= '<phase_3_start_timestamp>'` and `storage.objects` deletion in the same path prefix. Storage objects are harmless if orphaned but should be cleaned up.
- **Phase 4 (content rewrites):** restore from the pre-phase backup taken per §4 (SQL dump of affected `blog_posts.content` keyed by `id` → `UPDATE … SET content = <original>` on each).
- **Phase 5 (grammar article soft-delete):** `UPDATE blog_posts SET is_deleted=false WHERE id IN ('c3b13a1c-c29f-4616-adc7-c1753271fb3b','0640cf3d-8b43-4458-a1a0-213eacb093dc')`.
- **Phase 6 (slug transliteration):** restore from backup using the same `id`-keyed `UPDATE`.
- **Git:** `git reset --hard <START_COMMIT>` if multiple phases need to unwind. Because pushes happen per-phase, the remote will carry partial state — note this in EXECUTION_REPORT if rollback is exercised.

If rollback is exercised, SPEC is marked 🔴 REOPEN by the Foreman review, not CLOSED.

---

## 7. Out of Scope (explicit)

The following look related but MUST NOT be touched in this SPEC:

- **Storefront Astro code (`opticup-storefront/` repo).** No changes to rendering logic, image proxy, or routes. URL patterns in rewritten content must match what the storefront already supports — do not invent a new one.
- **`media_library` table schema or RLS.** It currently uses the legacy `app.tenant_id` RLS pattern (see `modules/Module 3.1.../04-policies.md`). That's pre-existing and separately tracked. Do not "fix" it in this SPEC.
- **Hardcoded-tenant-value rewriting inside post content.** Criterion 13 requires only flagging + listing; the actual rewording is content work for Daniel post-SPEC.
- **Redirect map for old slugs.** Changing 41 slugs will break bookmarks/external inbound links to those posts. A redirects table is handled separately (blog redirects TBD by Daniel; this SPEC does not create redirect rows).
- **WordPress images referenced from posts on other tenants.** Only Prizma's published posts are in scope.
- **Images in `featured_image` column.** The prior audit confirmed those are fine; they are not touched here.
- **Any other module (Inventory, Platform Admin, CRM, etc.).**

---

## 8. Expected Final State

### New files
- `modules/Module 3 - Storefront/scripts/blog-migration/01_catalog_wp_urls.mjs` — read-only scan, produces `_catalog.json`.
- `modules/Module 3 - Storefront/scripts/blog-migration/02_download_wp_images.mjs` — fetches each URL, saves to `./_downloads/` (gitignored).
- `modules/Module 3 - Storefront/scripts/blog-migration/03_upload_to_media_library.mjs` — uploads to Supabase Storage + inserts `media_library` rows (folder='blog').
- `modules/Module 3 - Storefront/scripts/blog-migration/04_rewrite_content.mjs` — applies per-post content rewrites.
- `modules/Module 3 - Storefront/scripts/blog-migration/05_transliterate_slugs.mjs` — generates en/ru slugs from titles, updates DB.
- `modules/Module 3 - Storefront/scripts/blog-migration/06_soft_delete_grammar.mjs` — soft-deletes the 2 grammar-article rows.
- `modules/Module 3 - Storefront/scripts/blog-migration/.gitignore` — excludes `_downloads/`, `_catalog.json`.
- `modules/Module 3 - Storefront/scripts/blog-migration/README.md` — usage + order.
- `modules/Module 3 - Storefront/docs/specs/BLOG_PRE_MERGE_FIXES/FINDINGS_TENANT.md` — list of 7 posts with hardcoded tenant values (no fixes applied; deferred to content owner).
- `modules/Module 3 - Storefront/docs/specs/BLOG_PRE_MERGE_FIXES/EXECUTION_REPORT.md` — full retrospective.
- `modules/Module 3 - Storefront/docs/specs/BLOG_PRE_MERGE_FIXES/FINDINGS.md` — any new findings not foreseeable from the two audit files.
- `modules/Module 3 - Storefront/backups/blog_pre_merge_fixes_2026-04-15/blog_posts_before.sql` — pre-migration snapshot (SQL dump of the columns we will mutate).

### Modified files
- None outside the scripts/ folder and docs/specs/ folder. This SPEC is data-only for `blog_posts` + `media_library` + `storage.objects`.

### Deleted files
- None.

### DB state
- `blog_posts` row count by language: he=58, en=57, ru=57 (grammar article en+ru soft-deleted).
- `blog_posts.content` for 132 posts rewritten so no `prizma-optic.co.il` remains in `<img src>` or `<a href>`.
- `blog_posts.slug` for 41 posts (21 en + 20 ru) replaced with language-appropriate slugs.
- `media_library` has N new rows (where N = unique WP image count from Phase 1) with `folder='blog'`, `tenant_id=<PRIZMA>`, `is_deleted=false`.
- `storage.objects` in `media-library` bucket has matching N objects under `<PRIZMA_UUID>/blog/` prefix.

### Docs updated (MUST include)
- Module 3 `SESSION_CONTEXT.md` — one-line status entry pointing at this SPEC folder.
- Module 3 `CHANGELOG.md` — new section with this SPEC's commit hashes.
- `docs/guardian/GUARDIAN_ALERTS.md` — clear any alerts that were blocked on this fix; nothing currently there for blog specifically, but re-verify.
- `MASTER_ROADMAP.md` §3 — if this closes a pre-merge blocker, reflect that.

---

## 9. Commit Plan

Six phased commits on `develop`, pushed after each. No squashing.

- **Commit 1** — `feat(m3-blog): add WP image migration scripts (catalog + download + upload)` → scripts 01, 02, 03 + README + .gitignore.
- **Commit 2** — `feat(m3-blog): migrate WP images into media-library/blog folder (dedup against existing)` → executes Phase 3 with mandatory dedup check first (see Criterion 4b): for each candidate WordPress image, (a) compute SHA-256 of downloaded bytes, (b) query `media_library` for folder='blog' + tenant=Prizma with same `original_filename` OR with an existing row whose file hash matches, (c) if found → REUSE its `storage_path`, do NOT upload again, do NOT create a new row, (d) if not found → upload + insert. The script logs every candidate as `uploaded` / `reused` / `skipped_already_404` / `skipped_error`. Produces the new `media_library` rows + storage objects only for the `uploaded` set. Content not yet rewritten.
- **Commit 3** — `fix(m3-blog): rewrite WP URLs in blog_posts.content to media-library paths` → Phase 4 writes. Criterion 3 + 10 now satisfied.
- **Commit 4** — `fix(m3-blog): soft-delete grammar article en+ru variants` → Phase 5. Criterion 7 + 12 satisfied.
- **Commit 5** — `fix(m3-blog): transliterate Hebrew slugs on en/ru rows to language-appropriate slugs` → Phase 6. Criterion 8 + 9 satisfied.
- **Commit 6** — `docs(m3): close BLOG_PRE_MERGE_FIXES with retrospective + tenant findings` → EXECUTION_REPORT.md + FINDINGS.md + FINDINGS_TENANT.md + SESSION_CONTEXT + CHANGELOG updates.

---

## 10. Dependencies / Preconditions

- `develop` branch is clean except for already-flagged pre-existing pending work (per First Action step 4).
- `/sessions/…/mnt/opticup-storefront/` sibling repo reachable for spot-check against `localhost:4321` — if not, Criterion 14 & 16 are marked UNVERIFIED with an explicit note.
- Supabase MCP (`tsxrrxzmdxaenlvocyit`) reachable for SQL + Storage operations.
- Service-role credentials (or equivalent via `pin-auth`) available in `$HOME/.optic-up/credentials.env` — otherwise executor cannot write to the `media-library` private bucket.
- Prizma tenant UUID known (executor reads it from `tenants` table via slug `prizma`).
- `media_library` table has the following columns (verified via existing code in `modules/storefront/studio-media.js` + `studio-brands.js` — executor must re-query to confirm before Phase 3):
  `tenant_id`, `filename`, `original_filename`, `storage_path`, `mime_type`, `file_size`, `folder`, `tags`, `alt_text`, `title`, `description`, `uploaded_by`, `is_deleted`, `created_at`, `updated_at`.
- The canonical URL pattern for rendered storefront images (proxy `/api/image/...` vs. Supabase public URL) is a run-time decision the executor makes by inspecting how existing `blog_posts.featured_image` values look. Whatever convention is already in use — match it, do not invent.

---

## 11. Lessons Already Incorporated

This SPEC folder is the first in Module 3 to have had two prior audit outputs before the fixes SPEC was drafted. Lessons harvested from them:

- **FROM `BLOG_PRE_MERGE_AUDIT/FINDINGS.md` + user feedback** → "Sampling and extrapolating in an audit produces false confidence; Section C claimed '291 images 200 OK' after checking 10." **APPLIED in §3** — every success criterion is a full enumeration query, not a sample. **APPLIED in §5** — stop-trigger on zero-match scenarios forbids silent retries.
- **FROM `BLOG_PRE_MERGE_AUDIT/FINDINGS_IMAGES.md`** → "HEAD-checking featured_image misses embedded `<img>` tags in content." **APPLIED in §3 Criterion 3** — the regex explicitly targets `<img[^>]+prizma-optic\.co\.il` inside content, not featured_image.
- **FROM Daniel's feedback ("תמונות שצריכות לעבור דרך המדיה בסטודיו → תיקיה בלוג")** → **APPLIED in §4 + §10** — executor uses the existing `media_library` / `media-library` bucket / `folder='blog'` pipeline rather than a new bucket or direct path.
- **FROM CLAUDE.md Rule 21 (No Orphans)** → **APPLIED** — no new table, no new bucket, no new function. Only data rows and scripts.
- **FROM CLAUDE.md Rule 9 (No hardcoded tenant values)** → **APPLIED in §3 Criterion 13 + §7 Out of Scope** — we flag the 7 offending posts but do NOT auto-fix them to avoid introducing a different kind of hardcode. Manual content rewrite is deferred.
- **FROM project memory "feedback_migration_lessons"** → "Update consumers BEFORE data, no Hebrew in Storage paths." **APPLIED** — migration uses tenant UUID + English folder name (`blog`) + sanitized ASCII filenames derived from originals (executor must normalize Hebrew filenames to ASCII before upload).
- **FROM project memory "feedback_daniel_comms"** → Daniel is not a developer; post-execution report to him will summarize "how many posts fixed / how many images migrated / next step" with no technical detail. This is an executor responsibility, reinforced here.

### Cross-Reference Check (§1.5)

Sweep completed 2026-04-15 for all new names this SPEC introduces:

- **No new DB tables/columns/views/RPCs** — this SPEC is data-only.
- **New storage paths** (`<PRIZMA_UUID>/blog/<filename>` under `media-library` bucket): pattern matches existing Studio convention (`studio-brands.js:583-591`) — no collision.
- **New script files** under `modules/Module 3 - Storefront/scripts/blog-migration/`: folder does not exist today; no collision.
- **`folder='blog'` value in `media_library`**: already a valid enum value per `studio-media.js:13-21` (`MEDIA_FOLDERS`) — extension, not invention. ✓
- **0 collisions / 1 extension** — cross-reference check complete.

---

*End of SPEC.*
