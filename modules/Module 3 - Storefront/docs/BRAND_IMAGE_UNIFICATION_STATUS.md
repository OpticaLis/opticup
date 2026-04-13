# Brand Image Unification — COMPLETE ✅

> Last updated: April 13, 2026
> Status: **Done** — all stages complete, verified on localhost:4321

## Summary

All brand images migrated from `tenant-logos` bucket and static files to unified `media-library` bucket.
40 logos + 67 gallery images now live at `media/{tid}/logos/` and `media/{tid}/models/`.
All logos normalized to 400×200 canvas. Old files deleted from `tenant-logos`.

## What Was Done

### Stage 1: Code Changes (committed to develop in both repos)

**Storefront (`opticup-storefront`) — commit c7e148d:**
- `src/lib/image-utils.ts` — NEW: `resolveStorageUrl()` + `resolveStorageUrls()` utility
  - Handles 3 formats: full URLs (passthrough), static assets (passthrough), storage paths (`media/{tid}/...` → `/api/image/media/{tid}/...`)
  - Also strips legacy `media-library/` prefix for robustness
- `src/lib/brands.ts` — `logo_url`, `hero_image`, `brand_gallery` resolved through `resolveStorageUrl` at data layer
- `src/pages/api/image/[...path].ts` — Added `media-library/` prefix stripping (robustness layer)

**ERP (`opticup`) — commit 373028c:**
- `scripts/migrate-brand-images.mjs` — Main migration: copies files between buckets, updates DB records
- `modules/storefront/studio-brands.js` — New gallery uploads store `storagePath` directly (no bucket prefix)

### Stage 2: Migration Run (April 13, 2026)

- `migrate-brand-images.mjs --tenant=prizma --run` — 30 logos + 67 gallery images migrated
- 10 static logos failed HTTP fetch (expected — Vercel doesn't serve them)
- `upload-missing-logos.mjs --run` — 10 missing logos uploaded from local filesystem
- **Result:** 40 logos + 67 gallery images in `media-library` bucket, 40 brands updated in DB

### Stage 3: Logo Normalization (April 13, 2026)

- `normalize-brand-logos.mjs --run` — 9 logos normalized from various sizes to 400×200 canvas
- 31 logos already 400×200 (uploaded through Studio with normalize-logo API)
- **Result:** All 40 brand logos are now consistent 400×200px

### Stage 4: Cleanup (April 13, 2026)

- `cleanup-tenant-logos.mjs --run` — 96 old files deleted from `tenant-logos` bucket
- `tenant-logos` bucket still exists (contains tenant site logos, not brand-related)

### Verified on localhost:4321
- `/brands/` — All 40 brands with images display correctly, logos uniform size
- Brand pages with galleries — working (Cazal, Fred, KameManNen, etc.)

## Scripts Created

| Script | Purpose | Safe to re-run |
|---|---|---|
| `scripts/migrate-brand-images.mjs` | Main migration: tenant-logos → media-library | Yes (upsert) |
| `scripts/upload-missing-logos.mjs` | Upload 10 static logos from local filesystem | Yes (upsert) |
| `scripts/normalize-brand-logos.mjs` | Normalize all logos to 400×200 canvas | Yes (skips already-normalized) |
| `scripts/cleanup-tenant-logos.mjs` | Delete old brand files from tenant-logos bucket | Idempotent |

## Architecture Decision Record

**Storage format:** `media/{tid}/logos/{file}` (just the storage path, no bucket prefix)
**Resolution:** Storefront `resolveStorageUrl()` prepends `/api/image/` → proxy routes `media/` to `media-library` bucket
**Domain model:** Storage paths are domain-agnostic. Prizma gets custom domain, other tenants get shared domain — the `/api/image/` relative path works for both.
**Backward compatible:** `resolveStorageUrl` passes through full URLs (http...) unchanged.

## Known Gaps (not blocking)

- **Gallery images from old WordPress site** (Dior, Fendi, Gucci, Prada) — `prizma-optic.co.il/wp-content/...` URLs were skipped. These are legacy and will be replaced when new gallery images are uploaded through Studio.
- **Brand Image Picker UI** — ERP Studio UI for selecting images from Media Gallery when editing brand pages — deferred, not in scope for this migration.
