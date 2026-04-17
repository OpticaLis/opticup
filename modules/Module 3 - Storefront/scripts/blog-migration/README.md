# Blog Migration Scripts — BLOG_PRE_MERGE_FIXES

Migrates 23 WordPress image URLs embedded in `blog_posts.content` from
`prizma-optic.co.il/wp-content/uploads/…` into the Supabase `media-library`
bucket under `<PRIZMA_UUID>/blog/`, rewrites slugs, and soft-deletes the
grammar article en/ru variants.

**Executed on:** 2026-04-15 via SPEC `BLOG_PRE_MERGE_FIXES`
**SPEC location:** `modules/Module 3 - Storefront/docs/specs/BLOG_PRE_MERGE_FIXES/`

---

## Prerequisites

```bash
# Required env vars (in $HOME/.optic-up/credentials.env or shell):
export SUPABASE_URL=https://tsxrrxzmdxaenlvocyit.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=<service_role_key>

npm install @supabase/supabase-js
```

Without `SUPABASE_SERVICE_ROLE_KEY`, scripts 03–06 will not execute writes.
Script 01 (read-only catalog) and script 02 (downloads) work with the anon key.

---

## Run Order

```bash
node 01_catalog_wp_urls.mjs        # → _catalog.json
node 02_download_wp_images.mjs     # → _downloads/*.{jpg,png,…}
node 03_upload_to_media_library.mjs  # Dedup → upload → DB insert
node 04_rewrite_content.mjs        # UPDATE blog_posts.content
node 05_transliterate_slugs.mjs    # UPDATE blog_posts.slug (en/ru)
node 06_soft_delete_grammar.mjs    # Soft-delete grammar article en+ru
```

---

## Notes

- Storage path: `media/<PRIZMA_UUID>/blog/<sanitized_ascii_filename>`
- Content URL pattern: `/api/image/media/<PRIZMA_UUID>/blog/<filename>`
- Hebrew filenames are transliterated to ASCII before upload (Rule 11 §25).
- Every dedup candidate is logged: `uploaded | reused | skipped_already_404 | skipped_error`.
- `media_library` rows inserted with `tenant_id = PRIZMA_UUID`, `folder = 'blog'`.
- No DDL — data-only SPEC.

---

## Rollback

See `SPEC.md §6 Rollback Plan` in the SPEC folder.
Backup snapshot: `../../backups/blog_pre_merge_fixes_2026-04-15/blog_posts_before.sql`
