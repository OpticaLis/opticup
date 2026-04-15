# Blog Pre-Merge DB Changes — Execution Results

**Executed:** 2026-04-15  
**Executor:** opticup-executor (Cowork session)

## Commit 3 — Content Rewrite

- **19 image URL replacements** applied via `replace()` chains to all published non-deleted posts
- **4 broken (404) image `<img>` tags** stripped via `regexp_replace`
- **WP internal `<a href>` links** stripped (anchor text preserved) via `regexp_replace`
  - First pass used `([^<]*)` — stripped simple links
  - Second pass used `(([^<]|<[^/]|</[^a])*)` — stripped links with nested HTML inside anchor
- **Verification:** `COUNT(*) WHERE content LIKE '%prizma-optic.co.il%' = 0` ✓

## Commit 4 — Grammar Article Soft-Delete

- Soft-deleted en: `c3b13a1c-c29f-4616-adc7-c1753271fb3b` (lang=en, slug=משקפיים-זה-בלשון-זכר-או-נקבה-🤔)
- Soft-deleted ru: `0640cf3d-8b43-4458-a1a0-213eacb093dc` (lang=ru, slug=משקפיים-זה-בלשון-זכר-או-נקבה-🤔)
- Hebrew variant untouched: `66e93a9f-0c4b-4c97-9acd-3e66abfb8dee` (lang=he, is_deleted=false) ✓
- **Verification:** en=true, ru=true, he=false ✓

## Commit 5 — Slug Transliteration

- **19 en posts** updated: Hebrew slugs → English ASCII slugs derived from title
- **39 ru posts** updated: Hebrew slugs → Russian Cyrillic slugs derived from title
- **Total: 58 posts** (2 grammar en/ru already soft-deleted, correctly excluded)
- SPEC expected 60 (20 en + 40 ru) — deviation: grammar articles excluded since is_deleted=true at time of update. See EXECUTION_REPORT §3.
- Collision resolution applied (no collisions needed suffixes)
- **Verification:**
  - `COUNT(*) WHERE lang IN ('en','ru') AND is_deleted=false AND slug ~ '[א-ת]' = 0` ✓
  - `GROUP BY lang, slug HAVING COUNT(*) > 1` → empty result ✓
