# FOREMAN_REVIEW — BRAND_GALLERY_MEDIA_CONSOLIDATION

> **SPEC:** `modules/Module 3 - Storefront/docs/specs/BRAND_GALLERY_MEDIA_CONSOLIDATION/SPEC.md`
> **Reviewed by:** opticup-strategic (retro-backfill via overnight hygiene sweep, 2026-05-09)
> **Verdict:** 🟡 **CLOSED WITH FOLLOW-UPS**

## Summary

Consolidated brand-gallery images into the media library as the single source of truth. Soft-deleted 168 legacy `media_library` rows, inserted 97 unique gallery images, converted 25 brands' `brand_gallery` from storage-path arrays to `media_library` UUID arrays. Recreated `v_storefront_brand_page` + `v_storefront_brands` views with UUID→path resolution subqueries (storefront sees zero breaking change). Built reusable `studio-media-picker.js` (263 lines) and integrated into the brand editor. Migration SQL at `126-brand-gallery-to-media-ids.sql`.

## Strengths

- **Backward compat via view-layer subqueries**: external consumers (storefront) saw no path change. Iron Rule 13 (views are the contract) honored — the breaking move happened entirely below the view boundary.
- **Reusable picker component** (`studio-media-picker.js`) — under 300 lines, with folder filtering + free-text search + multi-select. Reused by brand editor; available for future Studio integrations (avoids Rule 21 orphans by design).
- **Single migration file** (`126-brand-gallery-to-media-ids.sql`) — atomic, reviewable.

## Weaknesses / Open follow-ups

- 168 soft-deleted `media_library` rows: cleanup path not specified. They sit indefinitely with `is_deleted=true` taking up space + clouding queries. Author should have added "cleanup-after-N-days" as a follow-up SPEC.
- Migration SQL is committed but no `_down.sql` (rollback path). Project pattern — but worth flagging for a future `MIGRATIONS_HYGIENE` SPEC.

## Author improvement proposals (for `opticup-strategic` skill)

1. **Add to author checklist: every soft-delete migration must include a cleanup SPEC pointer** — either "permanent delete after N days" or "manual cleanup gated on Daniel review". Without it, the soft-deleted rows become silent debt.
2. **Document the "below-the-view-boundary refactor" pattern in `opticup-strategic` SKILL** — when changing data shape, prefer migrating the underlying table + updating views to maintain the public contract. This SPEC executed it well but isn't yet documented as a reusable pattern.

## Executor improvement proposals (for `opticup-executor` skill)

1. **Add to SKILL: "after a successful schema migration, verify the view layer with a manual SELECT before committing"** — confirm the subquery resolution returns expected paths for at least 1 brand. Caught early prevents storefront-visible breakage.
2. **Reusable component check**: when executor creates a new shared `*-picker.js` / `*-builder.js` / `*-modal.js`, run a pre-flight grep for similar names project-wide (Iron Rule 21). Add to executor First Action.
