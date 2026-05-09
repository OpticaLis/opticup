# SPEC — A1: Product image compression (Prizma media-library)

> **Author:** opticup-executor (OVERNIGHT_M1_M3_BURNDOWN T7, Tier 2)
> **Created:** 2026-04-27
> **Severity:** HIGH — egress optimization
> **Parent:** `M1_FIXES_2026_04_26/ROADMAP.md` row A1
> **Owning module:** Module 3 — Storefront / Studio (media library)

---

## Goal

Compress 27 oversized product images in Prizma's media-library to ~200-300 KB each via 1200px max + WebP q80. Reduce total media-library egress per pageview by ~98%.

## Discovery deviation from activation prompt

The activation prompt's data model assumed the 27 files were referenced by `inventory_images.url` and `inventory_images.thumbnail_url`. **That was wrong.**

Actual data model (verified 2026-04-27 via SQL probe):
- `inventory_images` rows reference the **`frame-images` bucket** (different bucket entirely; small thumbnail files at 11-38 KB each).
- The 27 oversized files in `media-library/products/` are referenced by **`media_library.storage_path`** (the media-library table, not inventory_images).
- These files are used by Studio Pages, Brand Pages, Blog posts — wherever the Studio's media picker inserts an image, not by the Inventory tab.

Plan adjusted accordingly: update `media_library.storage_path` per row instead of `inventory_images.url`.

## Implementation

`scripts/compress-product-images.mjs` — written for this SPEC. Per-file pattern:

1. Download original from `media-library/products/<original-name>.webp`.
2. Backup to `media-library/products-backup-2026-04-26/<original-name>.webp` (idempotent — skip if backup already exists).
3. Compress with sharp (1200px max + WebP q80).
4. Upload compressed to NEW path `media-library/products/<media_library.id>.webp` (UUID filename for stability).
5. Verify upload (storage list confirms file present + size).
6. UPDATE `media_library` row (`storage_path`, `file_size`, `updated_at`) with `tenant_id` guard.
7. SELECT to verify the row update.
8. Log + continue. On any per-file error: log + skip, don't fail the batch.

**Originals are NOT deleted by this script.** Per Daniel's T7 constraint, originals remain at `media-library/products/<original-name>.webp` until explicit "go delete originals" approval. Backups stay regardless.

## Success Criteria

1. ✅ 27/27 files compressed without errors.
2. ✅ All 27 backups present at `products-backup-2026-04-26/` with original sizes.
3. ✅ All 27 compressed files present at `products/<uuid>.webp` (avg ~31 KB).
4. ✅ All 27 `media_library` rows updated to point to new `<uuid>.webp` paths.
5. ✅ `file_size` column matches actual compressed bytes.
6. ✅ Originals still in place (intentional — pending Daniel's delete authorization).
7. ✅ `npm run verify:integrity` passes after script + commit.

## Stop-on-Deviation

- Sharp not installed → STOP, ask Daniel (HIT — installed with explicit Daniel "go" → commit `466c6f4`).
- Per-file backup upload fails → log + skip that file, continue (script behavior).
- Per-file compressed upload fails → log + skip, continue.
- Per-row DB update fails or verify mismatch → log + skip, continue.
- Demo tenant data touched → STOP (script filtered to PRIZMA_TENANT only).
- Originals deleted before Daniel's go → MUST NOT happen (script never deletes).

## Out-of-Scope

- Deleting originals from `media-library/products/<original-name>.webp` — gated on Daniel's explicit "go delete originals".
- Compressing other media-library folders (e.g. `general/`, `videos/`) — only `products/` in scope per A1.
- Demo tenant — no media in products/ folder anyway (verified empty).
- Auto-compression on upload — that's A2 (separate SPEC, T9).

## Commit Plan

Two commits:

1. `feat(scripts): add compress-product-images.mjs for T7 (A1)` — adds the script + ROADMAP update.
2. `chore(spec): close T7 with retrospective` — SPEC.md (this) + EXECUTION_REPORT.md.

(Plus the prerequisite dependency commit `466c6f4 chore(deps): add sharp` already landed.)

---

*End of SPEC.*
