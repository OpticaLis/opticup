# P35 — Media Library Cleanup + Reconciliation

> **Status:** authored 2026-05-01 by opticup-strategic (Foreman) at Daniel's request
> **Origin:** Daniel reported missing thumbnails in storefront-studio.html media library. Investigation surfaced 4 categories of inconsistency between `media_library` table and Supabase Storage: 12 dead WP-URL rows, 25 orphan backup files, 30 unregistered legacy logos, 8 misallocated null-tenant files.
> **Module:** 3 — Storefront (admin-side)
> **Position in roadmap:** post-P34 cleanup; not cutover-blocking.
> **Type:** DB writes + Storage operations. NO code changes. ~1-2 hours work.

---

## 1. Goal

Bring `media_library` (DB) and `media-library` Storage bucket into full consistency. Every DB row must point to a real file. Every Storage file must be registered in DB. Zero duplicates. Zero `null` tenant paths.

**Four coordinated cleanups:**

1. **DELETE 12 broken WP rows** — `media_library` rows whose `storage_path` is a `https://prizma-optic.co.il/wp-content/...` URL. The old WordPress site is dead (DNS cut over to Astro). The files are unrecoverable.
2. **DELETE backup folder** `media/{tenant}/products-backup-2026-04-26/` — 25 .webp files, ~70 MB. Created by SPEC `A1_PRODUCT_IMAGE_COMPRESSION` as a safety net 5 days ago. SPEC closed clean. Zero references in code or DB.
3. **REGISTER 30 wp-migrated files** — files at `media/{tenant}/wp-migrated/...` that exist in Storage but have no `media_library` row. Add rows so they appear in the admin UI.
4. **FIX `media/null/general/` 8 files** — early bug uploaded 8 brand logos under literal `null` instead of tenant_id. Move to correct path under `media/{tenant}/general/`, dedupe (each appears 2x with slightly different names), register surviving copies in DB.

---

## 2. Background — Live State (probed 2026-05-01)

### 2.1 Counts before P35

| Source | Count | Note |
|---|---|---|
| `media_library` rows for Prizma | 244 unique (425 total — 181 duplicate path entries) | duplicates already filtered by DISTINCT in count |
| `storage.objects` in `media-library` bucket | 303 | physical files |
| DB rows missing physical file | 12 | the WP-URL rows |
| Storage files missing DB row | 71 | orphans |

### 2.2 The 12 broken WP rows (DELETE in step 1)

All 12 created at `2026-04-17 07:47:16.271684+00` (single bulk import). All have `storage_path` = `https://prizma-optic.co.il/wp-content/uploads/2025/09/<filename>.jpg`. All have a stray `"` in `filename`. WordPress site is gone — `curl -L` returns 404 from Vercel. Wayback Machine: not archived.

Filenames (for reference if Daniel finds local copies later):
- Dior-1.jpg, UltraDiorO-S1U.jpg
- Fendi-FE50007u-A.jpg, Fendi-FE50007u-B.jpg, Fendi-FE50009U.jpg
- Gucci-GG10922OA.jpg, Gucci-GG1208O.jpg, Gucci-GG1313O.jpg, Gucci-opt.jpg
- IMG_2053-scaled-e1757379040329.jpg, IMG_2054-scaled-e1757379269162.jpg, IMG_2107-scaled-e1757379219226.jpg

### 2.3 The 25 backup files (DELETE in step 2)

Path prefix: `media/6ad0781b-37f0-47a9-92e3-be9ed1477e1c/products-backup-2026-04-26/`
Created `2026-04-27 03:14-15` UTC by SPEC `A1_PRODUCT_IMAGE_COMPRESSION`'s pre-compression backup step.
Total ~66.8 MB across 25 .webp files (Bottega Veneta, Cazal, Dior, Fendi, Fred, Gotti, Gucci, Henry Jullien, Hublot, John Dalia, KameManNen, Porsche Design, Prada, Serengeti, Swarovski, Tejesta, Yohji Yamamoto).

Verified safe to delete:
- 0 rows in `media_library` reference this prefix
- 0 code references in `opticup` repo (only doc/SPEC mentions)
- A1 SPEC EXECUTION_REPORT confirms compressed versions live at `media/{tenant}/products/<uuid>.webp` — the backup is purely insurance that has expired its useful life

### 2.4 The 30 wp-migrated logos (REGISTER in step 3)

Path prefix: `media/6ad0781b-37f0-47a9-92e3-be9ed1477e1c/wp-migrated/`
Uploaded `2026-04-08 02:57:08-15` UTC during initial WordPress→Optic Up migration.
30 brand logos + product photos: Armani Exchange, Balenciaga, Celine, Emporio Armani, Gucci-logo, Hoya Corporation, IMG-20241230-WA*, Kenzo, Leica, Miumiu, Moscot, Prada, Ray-Ban, Zeiss, MultiSale-Lenses-Difference-2, plus 7 raw UUIDs (`132ec7c1-...`, `21729b-1`, `30d59d-2`, `48585dd1-...`, `7f560a01-...`, `aa169e-`, `dde6be28-...`, `e4820205-...`, `fdc3c5f7-...`, `693042-2024-12-09-090254`, `774cf3-300x203`, `e7d7d7-2024-10-30-124356-300x300`, `ClipDrop-2024-01-30-at-11.58.25-300x300-1-150x150`).

These are physical files with no DB row. Adding rows makes them visible in storefront-studio admin UI without re-uploading.

### 2.5 The 8 null-tenant files (FIX in step 4)

Path prefix: `media/null/general/`
Created `2026-04-06 12:57-13:03` UTC.
Each file appears **twice** with slightly different filename punctuation (e.g., `Hoya_Logo_*.webp` AND `Hoya-Logo_*.webp`). The two copies are byte-identical (same `size_bytes` per pair).

Pairs:
- Hoya: `Hoya_Logo_1775480266266.webp` (12:57:47) + `Hoya-Logo_1775480603134.webp` (13:03:24) — both 17134 bytes
- Leica: `Leica_logo_1775480265196.svg` + `Leica-logo_1775480602105.svg` — both 76833 bytes
- Rodenstock: `Rodenstock_Logo_1775480266650.webp` + `Rodenstock-Logo_1775480603712.webp` — both 9608 bytes
- Zeiss: `Zeiss_logo_svg_1775480267079.webp` + `Zeiss-logo_svg_1775480604205.webp` — both 7756 bytes

Bug: tenant_id was `null` (string) when the path was constructed. Fixed in code later, but these 8 stale files remain.

### 2.6 What stays untouched

Out of the original 71 orphans, after step 2 (delete 25 backup) + step 3 (register 30 wp-migrated) + step 4 (fix 8 null), there remain 8 files:
- `6ad0781b-.../videos/hero-background.mp4` (videos folder — separate organization)
- `media/{tenant}/logos/dior.png`, `fendi.png`, `gucci.png` (used directly by storefront brand pages, not via library)
- `media/{tenant}/general/multifocal-hero.webp` (storefront page)
- `media/{tenant}/wp-migrated/Gucci-logo-300x177.jpg` (counted in 30 above)

These are in active use by the storefront via direct path references. Registering them is optional (would surface them in the library UI). For P35, **leave them alone** — separate "library coverage" SPEC if Daniel wants 100% coverage later.

---

## 3. Success Criteria

### 3.1 Step 1 — DELETE 12 broken WP rows

| # | Criterion | Expected | Verify |
|---|---|---|---|
| 1 | 12 rows deleted from `media_library` | exact 12 | `DELETE … RETURNING id` count = 12 |
| 2 | All 12 deleted IDs match the IDs documented in §2.2 (no other rows touched) | id-by-id match | RETURNING list compared to inventory |
| 3 | Post-delete: `SELECT count(*) FROM media_library WHERE storage_path LIKE 'https://%' AND tenant_id=...` returns 0 | 0 | DB |

### 3.2 Step 2 — DELETE backup folder

| # | Criterion | Expected | Verify |
|---|---|---|---|
| 4 | 25 storage objects deleted from bucket `media-library` under prefix `media/6ad0781b-.../products-backup-2026-04-26/` | exact 25 | `storage.from('media-library').remove([...])` returns success for all |
| 5 | Pre-delete count = 25; post-delete count = 0 under that prefix | DB query | `storage.objects` |
| 6 | Total bucket size drops by ~66.8 MB | bucket size before/after | `SELECT sum((metadata->>'size')::int)` |

### 3.3 Step 3 — REGISTER 30 wp-migrated rows

| # | Criterion | Expected | Verify |
|---|---|---|---|
| 7 | 30 INSERT rows in `media_library` with: tenant_id=Prizma, storage_path=actual storage name, filename=basename, original_filename=basename, mime_type=from storage metadata, file_size=from storage metadata, folder='wp-migrated', uploaded_by='system-recovery-p35' | exact 30 | `RETURNING id` count |
| 8 | Every new row points to an existing storage file | 0 mismatches | join check |
| 9 | No duplicate INSERTs (if a path already exists in `media_library`, skip) | 0 conflicts | INSERT … ON CONFLICT |
| 10 | After step 3, ALL `wp-migrated/` storage files have a DB row | parity | DB |

### 3.4 Step 4 — FIX null-tenant files

| # | Criterion | Expected | Verify |
|---|---|---|---|
| 11 | For each of 4 logo pairs: keep ONE copy (the one with cleaner filename — `Hoya-Logo`, `Leica-logo`, `Rodenstock-Logo`, `Zeiss-logo` — the second-uploaded set), delete the other (the underscore version) | 4 files kept, 4 deleted | storage operations |
| 12 | Move (copy + delete original) the 4 surviving files from `media/null/general/...` to `media/6ad0781b-.../general/...` | 4 files relocated | storage operations |
| 13 | Register 4 new rows in `media_library` for the relocated files (folder='general', uploaded_by='system-recovery-p35') | 4 INSERTs | DB |
| 14 | Post-step: 0 files under `media/null/` prefix in storage | 0 | DB |

### 3.5 Final state

| # | Criterion | Expected | Verify |
|---|---|---|---|
| 15 | `media_library` row count Prizma post-P35 | ~262 (244 - 12 deleted + 30 wp-migrated + 4 null-fix relocated) | DB query |
| 16 | `storage.objects` in `media-library` bucket post-P35 | ~282 (303 - 25 backup deleted - 4 null duplicates deleted + 4 null-relocated copies — net -25) | DB query |
| 17 | DB rows with broken storage_path (file doesn't exist) | 0 | join check |
| 18 | Storage files not registered in DB (orphans) | reduced from 71 to ~8 (the videos/logos in active use, see §2.6) | join check |
| 19 | Duplicates (same content, different paths) | 0 in remaining set | manual review |
| 20 | All admin UI thumbnails render in storefront-studio.html | visual smoke | manual screenshot |

---

## 4. Autonomy Envelope

**Executor MAY without asking:**
- Run all DELETE statements on `media_library` (Level 2 — writes with built-in safety: `RETURNING` to verify count + rollback in single transaction if count mismatch)
- Run storage `remove()` calls on the documented file lists
- Run storage `copy()` + `remove()` for the 4 null-tenant relocations
- INSERT new `media_library` rows for the 30 wp-migrated + 4 relocated files
- Run smoke test by opening storefront-studio.html and confirming the library renders
- Commit final reports to `develop` (no source code changes)

**Executor MUST stop and ask:**
- If pre-step count check returns unexpected number (e.g., 11 broken WP rows instead of 12 — means data shifted since SPEC authoring)
- If a storage file in §2.3 backup list is referenced by ANY `media_library` row OR `storefront_*` table OR storefront page (extra grep before delete)
- If a wp-migrated file's mime_type can't be determined (rare; surface specific filenames)
- If null-tenant pair has size mismatch (means they're not actually identical — needs review)

**Executor MAY NOT under any circumstances:**
- Touch any file or row outside the 4 documented sets (12 + 25 + 30 + 8)
- Modify schema (no ALTER TABLE)
- Skip the pre-step counts (every step starts with a count, every step ends with a verification count)
- Use `--no-verify`

---

## 5. Stop-on-Deviation Triggers

| Trigger | Action |
|---|---|
| Pre-step count differs from §2 documented numbers | STOP — data shifted; reconcile before proceeding |
| Storage `remove()` returns error for any file | STOP — investigate, do NOT continue with other deletes |
| INSERT in step 3 fails on conflict for an unexpected path | STOP — that path was registered between SPEC and execution; review |
| Smoke test (opening storefront-studio.html) shows broken thumbnails AFTER P35 | STOP — something we deleted was actually in use; restore from `RETURNING` data |
| Total `media_library` count post-P35 differs from §3.5 #15 by >5 | STOP — reconcile |

---

## 6. Out of Scope

- Re-uploading the 12 lost WP files from any local backup Daniel might find (separate task if/when files surface)
- Registering the 8 actively-used storefront files (videos/logos/multifocal-hero) in `media_library` — they work via direct path; library coverage is optional polish
- Deleting old `media-library` bucket structure changes (we work within current paths)
- The `frame-images` bucket (separate concern, M1 inventory product images, untouched by P35)
- Schema changes to `media_library`
- Storefront UI changes

---

## 7. Expected Final State

**Storage `media-library` bucket:**
- 282 objects total (was 303)
- 0 objects under `media/null/`
- 0 objects under `products-backup-2026-04-26/`
- All other paths preserved as-is

**`media_library` DB:**
- 262 rows for Prizma (was 244 unique / 425 total)
- 0 rows pointing to `https://%` URLs
- 0 rows with stray `"` in filename
- All rows point to a real storage file

**Reports written:**
- `EXECUTION_REPORT.md` — what ran, counts, before/after
- `RECOVERED_INVENTORY.md` — list of 30 wp-migrated + 4 null-relocated files now visible in library
- `DELETED_INVENTORY.md` — list of 12 broken rows + 25 backup files + 4 null duplicates (with original paths for audit trail)

**No code changes.** No git commits to source files.

---

## 8. Execution Plan

| Step | Action | Pre-check | Post-check |
|---|---|---|---|
| 0 | Pre-flight: rerun the 4 count queries from §2.1 — confirm numbers match | — | match documented |
| 1 | DELETE 12 broken WP rows (single SQL with RETURNING) | count = 12 | RETURNING = 12 |
| 2a | List 25 files under backup prefix | count = 25 | match |
| 2b | `storage.from('media-library').remove([list of 25])` | — | success per file |
| 2c | Verify 0 files remain under prefix | — | count = 0 |
| 3a | List 30 wp-migrated paths in storage minus paths already in `media_library` | count = 30 | match §2.4 |
| 3b | Build INSERT batch with filename/mime/size from storage.objects.metadata | — | 30 rows ready |
| 3c | INSERT … ON CONFLICT (storage_path) DO NOTHING; RETURNING id | RETURNING ≤ 30 | document any skipped |
| 4a | Identify 4 pairs in `media/null/general/`; pick canonical (the dash-separated set, second-uploaded) | 4 pairs identified | match §2.5 |
| 4b | DELETE the 4 underscore-version duplicates from storage | count = 4 | success |
| 4c | COPY the 4 dash-version files from `media/null/general/...` to `media/{tenant}/general/...` | count = 4 | each copy verified |
| 4d | DELETE the 4 originals at `media/null/general/...` | count = 4 | success |
| 4e | INSERT 4 new `media_library` rows for the relocated files | count = 4 | RETURNING = 4 |
| 5 | Verify final counts (§3.5) | — | match expectations |
| 6 | Manual smoke: open storefront-studio.html, scroll library, verify no broken thumbnails for the registered files | — | visual confirm |
| 7 | Write 3 reports + commit them under SPEC folder | — | files present |

---

## 9. Rollback Plan

P35 deletes data and storage files. **Recovery is possible but not free.**

For step 1 (12 DB rows): the DELETE returns RETURNING — log the full row content. If Daniel later finds the local files, re-INSERT with new storage_path after upload.

For step 2 (25 backup files): irreversible from app side. Supabase Storage has 7-day retention only on Pro+ tiers — verify project tier before delete. If Daniel needs them back later, they're gone.

For steps 3+4 (additive): no data loss, just re-running creates duplicates. Safe.

**Pre-execution Daniel ack required:** confirm that step 2 (deleting 70MB backup) is OK given Storage retention.

---

## 10. After Execution

The executor writes the 3 reports. Foreman writes `FOREMAN_REVIEW.md` after Daniel reviews + spot-checks the admin UI.

---

*End of SPEC.md*
