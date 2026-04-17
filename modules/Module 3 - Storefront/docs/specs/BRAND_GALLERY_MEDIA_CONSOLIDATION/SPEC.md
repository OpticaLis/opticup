# SPEC — BRAND_GALLERY_MEDIA_CONSOLIDATION

> **Location:** `modules/Module 3 - Storefront/docs/specs/BRAND_GALLERY_MEDIA_CONSOLIDATION/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-17
> **Module:** 3 — Storefront
> **Author signature:** Cowork session `admiring-vigilant-edison`

---

## 1. Goal

Consolidate brand gallery images into the media library as the single source
of truth, and replace the current upload-only brand gallery UI with a media
picker that lets users select existing images from the media library — with
folder filtering, free-text search, and multi-select.

After this SPEC, every image used in a brand carousel will live in
`media_library` exactly once, and `brands.brand_gallery` will store media
library UUIDs instead of raw storage paths.

---

## 2. Background & Motivation

Currently, brand gallery images are managed in two parallel systems:

- **`brands.brand_gallery`** — a JSONB array of raw storage paths on the
  `brands` table. This is what the storefront reads to render carousels.
- **`media_library`** — a separate table with full metadata (alt_text, tags,
  folder, captions). The studio already registers gallery uploads here as a
  side effect (since brand upload code was added), but the two systems are not
  linked.

**Current data state (verified 2026-04-17):**
- `media_library` "models" folder: **168** images
- `brand_gallery` unique images across all brands: **97**
- Already in both systems (duplicate): **85**
- In gallery but missing from media_library: **12**
- In media_library but not referenced by any brand (orphaned): **17**

**Problems this solves:**
1. **Duplication** — 85 images stored twice wastes storage and creates drift
2. **No reuse** — to use the same model photo on two brands, you re-upload
3. **No metadata** — gallery images have no alt text, tags, or captions
4. **Bad UX** — upload-only with no browse/search capability

Daniel requested this change on 2026-04-17 and confirmed the architecture.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop`, clean after commit | `git status` |
| 2 | `brands.brand_gallery` column type | Still JSONB | `SELECT data_type FROM information_schema.columns WHERE table_name='brands' AND column_name='brand_gallery'` → `jsonb` |
| 3 | `brand_gallery` content format | Array of media_library UUIDs (not paths) | `SELECT brand_gallery->0 FROM brands WHERE brand_gallery IS NOT NULL AND jsonb_array_length(brand_gallery) > 0 LIMIT 1` → returns a UUID string |
| 4 | Total images in media_library "models" folder | ≥ 168 (existing) + 12 (migrated) = ≥ 180 | `SELECT COUNT(*) FROM media_library WHERE folder='models' AND is_deleted=false` → ≥ 180 |
| 5 | Orphaned media_library "models" entries | 0 orphans deleted without Daniel's review | Executor must LIST the 17 orphans and get Daniel's approval before deleting |
| 6 | Storefront brand pages render correctly | Brand gallery images display on storefront | Manual check on localhost:4321 for a brand with gallery images (e.g., Tejesta) |
| 7 | Media Picker in ERP Studio | Opens from brand edit, shows media_library images with folder filter + search | Manual check on localhost:3000 |
| 8 | Multi-select in Picker | Can select multiple images at once | Manual check |
| 9 | Folder filter in Picker | Filter by media_library folder (defaults to "models") | Manual check |
| 10 | Free-text search in Picker | Search by filename/title/tags | Manual check |
| 11 | No direct upload in gallery section | Gallery section uses picker only, not file upload | Code review: no `<input type="file">` in gallery section |
| 12 | ERP build passes | Zero console errors on brand edit page | Manual check on localhost:3000 |
| 13 | Storefront build passes | `npm run build` exits 0 | Run in storefront repo |
| 14 | `studio-brands.js` stays under 350 lines | File size limit respected | `wc -l studio-brands.js` ≤ 350 (currently 871 — see §7 note) |

**Note on criterion 14:** `studio-brands.js` is currently 871 lines, well over
the 350-line Iron Rule 12 limit. This SPEC does NOT fix that pre-existing
violation — it must not make it worse. The media picker component MUST be in
a separate file (`studio-media-picker.js`). If the gallery section removal
reduces `studio-brands.js` enough, great; if not, file-splitting is a separate
future SPEC.

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in either repo
- Run read-only SQL (Level 1)
- Create new files: `studio-media-picker.js`, migration SQL
- Edit `studio-brands.js` — gallery section only (remove upload UI, add picker trigger)
- Edit `storefront-brands.js` — if needed for data loading
- Edit storefront `lib/brands.ts` + `image-utils.ts` — to resolve UUIDs via view
- Edit/recreate `v_storefront_brand_page` view — to JOIN media_library for gallery resolution
- Run Level 2 SQL (writes): INSERT missing 12 images into media_library, UPDATE brand_gallery from paths to UUIDs
- Commit and push to `develop`

### What REQUIRES stopping and reporting
- The 17 orphaned media_library images — LIST them to Daniel, wait for delete/keep decision
- Any change to `v_storefront_products` or other views not listed above
- Any schema DDL beyond view recreation (ALTER TABLE, new columns, etc.)
- Any test/build failure
- Any change to frozen files (`FROZEN_FILES.md`)
- If more than 12 brand_gallery images are found missing from media_library (data drift since audit)

---

## 5. Stop-on-Deviation Triggers

- If the migration UPDATE changes more than 30 brand rows → STOP (currently ~15 brands have galleries)
- If any brand_gallery UUID after migration doesn't resolve to a valid media_library row → STOP
- If `v_storefront_brand_page` recreation drops any existing column → STOP
- If storefront `npm run build` fails after view change → STOP

---

## 6. Rollback Plan

- **Code:** `git reset --hard {START_COMMIT}`
- **DB — brand_gallery:** Keep a pre-migration backup:
  ```sql
  CREATE TABLE _backup_brand_gallery_20260417 AS
  SELECT id, brand_gallery FROM brands WHERE brand_gallery IS NOT NULL;
  ```
  Restore: `UPDATE brands SET brand_gallery = b.brand_gallery FROM _backup_brand_gallery_20260417 b WHERE brands.id = b.id;`
- **DB — media_library inserts:** Soft-delete: `UPDATE media_library SET is_deleted = true WHERE created_at > '{migration_start_time}' AND folder = 'models';`
- **View:** Recreate original view definition (captured in pre-migration backup)

---

## 7. Out of Scope (explicit)

- **Splitting `studio-brands.js`** into smaller files — pre-existing tech debt, separate SPEC
- **Uploading new images through the picker** — picker is browse/select only; new uploads still go through the existing Media tab. This is intentional: one upload path, one place images land.
- **Deleting the 17 orphaned media images** — requires Daniel's review first (see §4)
- **Storefront BrandGallery.astro component redesign** — visual appearance stays the same, only data source changes
- **EN/RU translation of picker UI** — ERP is Hebrew-only
- **`media-library` bucket vs `frame-images` bucket consolidation** — different concern
- **Hero image, logo, video fields** — only `brand_gallery` changes in this SPEC

---

## 8. Expected Final State

### New files (ERP repo)
- `modules/storefront/studio-media-picker.js` — reusable media picker modal component (~150–200 lines). Provides `openMediaPicker({ folder?, multi?, onSelect })` global function.
- `sql/126-brand-gallery-to-media-ids.sql` — migration: insert 12 missing images + convert all brand_gallery paths to UUIDs

### Modified files (ERP repo)
- `modules/storefront/studio-brands.js` — gallery section: remove upload UI, add "בחר ממדיה" picker button, read/write UUIDs instead of paths
- `modules/storefront/storefront-brands.js` — if it reads brand_gallery, update to handle UUIDs
- `modules/storefront/index.html` — add `<script src>` for `studio-media-picker.js`

### Modified files (Storefront repo)
- `src/lib/brands.ts` — type: `brand_gallery` becomes `string[]` of UUIDs (or resolved paths from view)
- `src/lib/image-utils.ts` — may need update if gallery resolution changes
- `src/components/brand/BrandGallery.astro` — if it does path resolution, update

### DB state
- `brands.brand_gallery` — contains arrays of `media_library.id` UUIDs (not paths)
- `media_library` — 12 new rows in "models" folder (images that were in gallery but not media)
- `v_storefront_brand_page` — view recreated with a subquery or lateral join that resolves UUIDs to storage paths, so the storefront still receives paths (not UUIDs)
- `_backup_brand_gallery_20260417` — temporary backup table (drop after QA confirms)

### View contract change
`v_storefront_brand_page.brand_gallery` currently returns raw JSONB paths array.
After this SPEC, it returns the same shape (array of path strings) but resolved
via JOIN to `media_library.storage_path`. **The storefront sees no breaking change.**

### Docs updated
- Module 3 `SESSION_CONTEXT.md` — updated with SPEC status
- Module 3 `CHANGELOG.md` — new entry
- `docs/GLOBAL_SCHEMA.sql` — if view definition changes warrant update
- This SPEC folder: `EXECUTION_REPORT.md` + `FINDINGS.md` at close

---

## 9. Commit Plan

- **Commit 1:** `feat(studio): add reusable media picker component` — `studio-media-picker.js`, script tag in `index.html`
- **Commit 2:** `feat(studio): integrate media picker into brand gallery` — `studio-brands.js` changes (remove upload, add picker)
- **Commit 3:** `feat(db): migrate brand_gallery from paths to media IDs` — SQL migration file + run
- **Commit 4:** `feat(storefront): resolve brand gallery UUIDs via view` — view recreation + storefront code updates
- **Commit 5:** `docs(spec): close BRAND_GALLERY_MEDIA_CONSOLIDATION` — EXECUTION_REPORT, FINDINGS, docs updates

---

## 10. Dependencies / Preconditions

- Supabase MCP available for SQL execution
- Both repos accessible (`opticup` + `opticup-storefront`)
- ERP dev server (`localhost:3000`) available for manual testing
- Storefront dev server (`localhost:4321`) available for manual testing
- No concurrent edits to `studio-brands.js` or `v_storefront_brand_page`

---

## 11. Lessons Already Incorporated

- FROM `HOMEPAGE_LUXURY_REVISIONS_R2/FOREMAN_REVIEW.md` → "Pre-SPEC Reality-Check on §1 Goal claims" → APPLIED: all data counts in §2 verified via live SQL queries on 2026-04-17, not assumed.
- FROM `HOMEPAGE_LUXURY_REVISIONS_R2/FOREMAN_REVIEW.md` → "Verify every `npm run X` cited in §3" → APPLIED: §3 cites only `npm run build` which exists in storefront `package.json`.
- FROM `HOMEPAGE_LUXURY_REVISIONS_R2/FOREMAN_REVIEW.md` → "HE/EN/RU parity pre-check" → NOT APPLICABLE: this SPEC doesn't modify CMS page blocks.
- Cross-Reference Check completed 2026-04-17 against GLOBAL_SCHEMA: `media_library` table exists, `v_storefront_brand_page` view exists, `studio-media-picker.js` does NOT exist (new file, no collision). `brand_gallery` column exists on `brands` — type stays JSONB, only content format changes. 0 collisions.
