# Brand Image Unification — SPEC

**Status:** ⬜ DRAFT — awaiting approval to execute
**Created:** 2026-04-13
**Module:** Module 3 (Storefront) + Module 1.5 (Shared) — touches Studio and storefront render
**Branch:** develop
**Target tenants:** demo first → Prizma after QA

---

## 1. Motivation

Today brand images live in a parallel universe to the rest of the image system:

- **Brand logos + carousel images** → uploaded to `tenant-logos` bucket (public), URLs stored directly in `brands.logo_url` and `brands.brand_gallery`. Invisible to the rest of the app.
- **All other images** (products, campaigns, blog, store) → managed through the `media-library` bucket (private) + `media_library` table, with a full Studio UI for reuse.

This means: if the same image is needed in two places, Daniel must upload it twice. It also violates Rule 21 (No Duplicates) — two parallel systems that do the same job.

**Goal:** One unified media library per tenant. Brand images become first-class citizens alongside everything else.

## 2. Current State (verified 2026-04-13)

**Storefront-visible brands:** ~40 brands (post-filter through `v_storefront_brands`).

**Logo distribution:**
- **19 brands** — logo is a static file checked into the repo: `/public/images/brands/*.png`. Not in any bucket.
- **21 brands** — logo lives in `tenant-logos` bucket at path `brands/{tenant_id}/{brand_id}_{timestamp}.png`.
- **2 orphan duplicates**: Moscot and Mykita each have 2 logo files in storage; only one is referenced by `logo_url`.

**Gallery (carousel) images:** ~75 total across ~15 brands, all in `tenant-logos` at path `brands/{tenant_id}/{brand_id}/gallery/{timestamp}_{hash}.webp`.

**Brand filter pipeline (already working correctly):**
`v_storefront_brands` applies: `active=true`, `exclude_website IS NOT TRUE`, product with `website_sync IN ('full','display')`, at least one product image. **No changes needed to filter logic.**

## 3. Architectural Decision

**Approach chosen:** Physical migration to `media-library` bucket (not "register in place").

**Why:**
1. Rule 21 — one source of truth, not two parallel systems
2. Rule 20 (SaaS litmus) — a new tenant joining tomorrow gets one consistent media model
3. `tenant-logos` bucket returns to its original purpose (the tenant's own store logo), eventually deprecated for all other uses
4. Storefront already has an image proxy (`/api/image/[...path].ts`) for serving private-bucket files — same pattern will be used for brand images

## 4. Scope

### 4.1 New Media Library Folders
Create two new folders recognized by the Studio Media Gallery:
- `לוגו` (logos) — brand logos
- `דוגמנים` (models) — brand page carousel/hero images

Folders are implicit (no table — just `folder` TEXT column on `media_library`). Add to the hardcoded folder list in `studio-media.js`.

### 4.2 File Migration

**Source → Target mapping:**

| Source | Count | Target folder in `media-library` |
|---|---|---|
| `tenant-logos/brands/{tid}/{brand_id}_*.png` (logo files) | 21 | `media/{tid}/לוגו/{filename}.png` |
| `tenant-logos/brands/{tid}/{brand_id}/gallery/*.webp` | ~75 | `media/{tid}/דוגמנים/{filename}.webp` |
| Repo: `/public/images/brands/*.png` (static logos) | 19 | `media/{tid}/לוגו/{filename}.png` |

**Orphan handling:** The 2 duplicate logos (Moscot, Mykita) — migrate only the referenced file, leave orphans behind for Stage 4 cleanup.

**Filename collisions:** If the same filename would land in the same target folder, suffix with `_{shortid}`.

**DB rows:** For each migrated file, INSERT a row into `media_library`:
```
tenant_id, filename, original_filename, storage_path, mime_type,
file_size, width, height, folder, tags, uploaded_by='system-migration'
```

### 4.3 URL Updates on `brands` Table

**Domain model context:** Prizma has its own custom domain (`prizma-optic.co.il`). All other future tenants will share a common domain with tenant slug routing (e.g., `{slug}.opticalis.co.il` or `opticalis.co.il/{slug}` — TBD). There is no "one domain per tenant" model.

**Decision: store the storage path, not a full URL.**

Format: `media-library/media/{tid}/{folder}/{filename}.ext`

This is the bucket + path — a stable reference that never changes even if the tenant's domain changes. The render layer (storefront and ERP) resolves it to a full URL at display time:
- **Storefront** (same domain): `/api/image/{storage_path}` — relative, works for any tenant regardless of domain
- **ERP Studio** (different domain): reads `storefront_domain` from tenant config → `https://{storefront_domain}/api/image/{storage_path}`

A small resolver utility `resolveMediaUrl(storagePath, context)` will live in `shared.js` (ERP side) and in a storefront helper. This keeps DB values domain-agnostic.

**Migration update targets:**
- `brands.logo_url` — replace public URL / static path with `media-library/media/{tid}/לוגו/{filename}`
- `brands.brand_gallery` (array) — same treatment for each element

Wrap the UPDATE in a single transaction. Keep a pre-migration backup of `brands.logo_url` and `brands.brand_gallery` in `backups/brands_pre_unification_{date}.json` per Rule 9.9.

### 4.4 Storefront Code Changes

- `BrandPage.astro` — update image `src` construction to prepend `/api/image/` to the storage-path values from DB. Small change, one place.
- `/api/image/[...path].ts` — verify it accepts the `media-library` bucket paths (may already handle it). If not, extend.
- Remove 19 static PNGs from `/public/images/brands/` in the storefront repo AFTER migration verified on demo. This is a separate commit in the storefront repo.

### 4.5 ERP Code Changes (opticup repo)

**`modules/storefront/studio-brands.js` — `handleStudioGalleryUpload`:**
- Change upload target bucket from `tenant-logos` to `media-library`
- Change path from `brands/{tid}/{brandId}/gallery/...` to `media/{tid}/דוגמנים/...`
- After upload, INSERT a `media_library` row (this is the key change — makes new uploads discoverable in the Media Gallery)
- Returned URL → proxy URL, not direct public URL

**Logo upload flow:** Same pattern — write to `media-library` bucket + `media_library` row.

**Studio Media Gallery (`studio-media.js`):**
- Add `'לוגו'` and `'דוגמנים'` to the folder list
- No other changes — the existing Gallery already reads from `media_library` table

**Brand-image picker (new small feature):**
- When Daniel edits a brand in Studio, the gallery/logo upload dialog now offers TWO modes: "העלה חדש" and "בחר מהמאגר". The second opens a filtered Media Library view (by folder).
- Picking an existing image writes only the URL reference to `brands.logo_url` / `brands.brand_gallery`. No file copy.

### 4.6 Stage 4 Cleanup

After migration verified on Prizma:
1. Delete the 2 orphaned duplicate logos from `tenant-logos` (Moscot, Mykita)
2. Delete all migrated brand files from `tenant-logos` (logos + galleries)
3. `tenant-logos` bucket now contains only tenant's own store logos (original purpose restored)

## 5. Execution Plan — Four Stages

### Stage 1 — Infrastructure + Demo Dry Run (2-3h)

1. Add `'לוגו'` and `'דוגמנים'` folders to `studio-media.js` folder list
2. Write migration script: `scripts/migrate-brand-images.mjs`
   - Reads `brands` table for target tenant
   - Downloads each logo/gallery file from `tenant-logos` (or repo for static)
   - Uploads to `media-library` at new path
   - Inserts `media_library` rows
   - Updates `brands.logo_url` and `brands.brand_gallery`
   - Writes backup JSON before any UPDATE
   - Supports `--dry-run` and `--tenant={slug}` flags
3. Modify `studio-brands.js` upload handlers (gallery + logo) per §4.5
4. Run on DEMO tenant: `node scripts/migrate-brand-images.mjs --tenant=demo --dry-run` then without `--dry-run`
5. Verify on demo storefront: brand pages render, images visible, proxy serves correctly
6. Verify in demo Studio: Media Gallery shows the two new folders with migrated images, picker works

**Gate:** All demo checks pass. No console errors. Image proxy responds 200 for sample paths.

### Stage 2 — Run on Prizma (1-2h, scheduled quiet window)

1. Final backup: `pg_dump` of `brands` table + full listing of `tenant-logos` objects before migration
2. Run migration script on Prizma tenant
3. Verify: 10 spot-checked brand pages on live storefront render correctly; Studio Media Gallery populated
4. Monitor for 15 minutes — any 404s on brand images → rollback

**Rollback:** script has an `--rollback --from={backup.json}` mode that restores `brands.logo_url`/`brand_gallery` from backup JSON. `media-library` files can be deleted separately.

### Stage 3 — Code Cutover for New Uploads (1h)

1. Deploy the new `studio-brands.js` upload handlers (already prepared in Stage 1)
2. Test: upload a new logo + gallery image via Studio → appears in Media Gallery → visible on storefront
3. Commit to develop, tag as `m3.brand-unify.stage3`

### Stage 4 — Cleanup (30m)

1. Delete 2 orphan duplicates from `tenant-logos` (Moscot, Mykita)
2. Delete all migrated brand files from `tenant-logos`
3. Storefront repo: remove `/public/images/brands/*.png` (19 files), update any remaining fallback references
4. Commit, tag as `m3.brand-unify.stage4`

## 6. Non-Goals (explicitly out of scope)

- Changing anything about the brand filter pipeline (`v_storefront_brands`). It already works.
- Migrating non-brand images (products, campaigns, blog, store) — they're already in `media-library`.
- Moving the tenant's own store logo out of `tenant-logos` — that bucket keeps its original purpose.
- Building a bulk-import UI for historical brand images — script-only.
- Adding new folders beyond "לוגו" and "דוגמנים" in this spec.

## 7. Rules Compliance Check

| Rule | How this spec satisfies |
|---|---|
| R7 — writes via `shared.js` helpers | Migration script uses `sb.from('media_library').insert()` via sb client, no direct table SQL |
| R9 — no hardcoded business values | Tenant UUID/slug passed as CLI arg |
| R14 — tenant_id on every row | Every `media_library` INSERT includes `tenant_id` |
| R18 — UNIQUE tenant-scoped | No new UNIQUE constraints added |
| R21 — No orphans/duplicates | Whole point of this spec — eliminate the duplication |
| R22 — defense in depth | INSERTs include `tenant_id` + `.eq('tenant_id', ...)` on selects |
| R25 (storefront) — image proxy | All new URLs go through `/api/image/[...path].ts` |
| R7 working-rules — never wildcard git | All stages add files by explicit name |
| R8 working-rules — never merge to main without Daniel | This spec stops at develop; main merge deferred |

## 8. Success Criteria (explicit, verifiable)

**Stage 1 (demo):**
- [ ] `media_library` table has exactly N new rows for demo tenant (N = demo logos + gallery count)
- [ ] Studio → Media Gallery → "לוגו" folder shows all migrated logos; "דוגמנים" shows all gallery images
- [ ] A random brand page on demo storefront loads with console clean
- [ ] Image proxy returns 200 for 3 spot-checked migrated paths
- [ ] Migration script's backup JSON exists and is complete

**Stage 2 (Prizma):**
- [ ] Same as Stage 1, scaled to Prizma counts (expected: ~115 new `media_library` rows)
- [ ] 10 spot-checked brand pages load on https://prizma-optic.co.il
- [ ] No 404s in 15-min post-migration monitoring

**Stage 3 (code cutover):**
- [ ] New upload via Studio creates `media_library` row
- [ ] Uploaded image appears in gallery picker
- [ ] Image renders on storefront

**Stage 4 (cleanup):**
- [ ] `tenant-logos` bucket contains only tenant store logos (not brand images)
- [ ] `/public/images/brands/` directory empty or removed in storefront repo

## 9. Resolved Decisions

1. **Timing for Prizma stage** — RESOLVED: same day, after demo verified. Run in quiet hours.
2. **URL format** — RESOLVED: store storage path only (domain-agnostic). Render layer resolves per context. Supports future multi-tenant domain model (Prizma=custom domain, all other tenants=shared domain with slug).
3. **Brand-image picker UI** — RESOLVED: deferred to follow-up spec. Not on critical path.

## 10. Files Touched

**New files:**
- `scripts/migrate-brand-images.mjs` (ERP repo)
- `modules/Module 3 - Storefront/backups/brands_pre_unification_{date}.json` (generated)

**Modified files:**
- `modules/storefront/studio-media.js` — add 2 folders to list
- `modules/storefront/studio-brands.js` — rewrite upload handlers
- `opticup-storefront/src/pages/api/image/[...path].ts` — verify/extend bucket support (possibly no change)
- `opticup-storefront/public/images/brands/` — delete 19 PNGs (Stage 4)

**Minor changes:**
- `BrandPage.astro` — update image `src` to prepend `/api/image/` to storage-path values
- `shared.js` — add `resolveMediaUrl()` helper for ERP-side URL resolution

**No changes:**
- `brands` table schema
- `media_library` table schema
- `v_storefront_brands` view

---

**End of SPEC.** Ready for Daniel's approval to execute Stage 1.
