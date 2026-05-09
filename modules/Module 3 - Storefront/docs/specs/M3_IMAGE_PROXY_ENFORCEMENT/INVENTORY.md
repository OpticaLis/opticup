# INVENTORY — M3_IMAGE_PROXY_ENFORCEMENT

> **Phase:** Pre-change inventory (SPEC §4-A safety net)
> **Author:** opticup-executor (2026-05-09)
> **Purpose:** complete enumeration of every image-render site that today emits a direct `supabase.co/storage` URL. NO edits made before this file is complete.

---

## 1. Source-code references (storefront repo `src/`)

```bash
grep -rln "supabase\.co/storage\|/storage/v1/\|STORAGE_URL\|storage/object/public" src/
```

**Result: 0 matches.** No source file contains a literal Supabase storage URL or constant. All such URLs flow from DB content into render functions at runtime.

## 2. Existing helper (already in repo)

`src/lib/image-utils.ts` defines:

| Function | Behavior today |
|---|---|
| `resolveStorageUrl(path)` | Routes storage paths to `/api/image/{path}`. **BUG:** if input is a full `https://...supabase.co/...` URL, it returns the URL unchanged ("passthrough on http(s)://"). This is the root cause of the 3 live render sites still emitting Supabase URLs. |
| `resolveStaticBrandLogo(slug, proxyUrl)` | Maps known brand slugs to local `/images/brands/{slug}.png`; falls through to `proxyUrl` otherwise. Already correct. |
| `resolveStorageUrls(paths[])` | Maps array via `resolveStorageUrl`. Same bug since it delegates. |

## 3. Existing proxy endpoint (already in repo)

`src/pages/api/image/[...path].ts` lines 1-50:

- Accepts paths starting with `frames/` → routes to `frame-images` bucket.
- Accepts paths starting with `media/` (or legacy `media-library/media/`) → routes to `media-library` bucket.
- Returns **HTTP 403** for any other prefix.

**The `tenant-logos` bucket is NOT supported by the proxy today** — proxying a logo URL into `/api/image/tenant-logos/...` would 403.

## 4. DB-backed image URL inventory (verified live 2026-05-09)

Counts of rows for `tenant_id=prizma` whose URL field contains the literal string `supabase.co/storage`:

| Table.column | Hits | Sample (truncated) |
|---|---|---|
| `tenants.logo_url` | **1** | `tenant-logos/<id>/logo.png?t=...` |
| `brands.logo_url` | **2** | `tenant-logos/brands/<id>/...png` (Rayban + Stella McCartney) |
| `brands.hero_image` | 0 | — |
| `brands.video_url` | 0 | — |
| `inventory_images.url` | 0 | — |
| `inventory_images.thumbnail_url` | 0 | — |
| `blog_posts.featured_image` | 0 | — |
| `blog_posts.og_image` | 0 | — |
| `storefront_pages.blocks` | 0 | — |
| `storefront_pages.previous_blocks` | 0 | — |
| `storefront_config.*url*` columns | 0 | — |
| `storefront_config.footer_config` (jsonb scan) | 0 | — |

**Total live DB sources of direct Supabase URLs for prizma:** **3 rows** (1 tenant + 2 brand logos).

All 3 hits are in the `tenant-logos` bucket — which the proxy doesn't currently support.

## 5. Render call sites (where the buggy passthrough surfaces)

The 3 DB rows above are read at runtime and passed through `resolveStorageUrl()` in:

| File | Line | Field source |
|---|---|---|
| `src/components/blocks/BrandsBlock.astro` | 33 | `brands.logo_url` (via storefront query) |
| `src/components/blocks/Tier1SpotlightBlock.astro` | 51, 52, 55, 56 | `brands.hero_image`, `brands.logo_url` (some are static asset paths, some are full URLs) |
| `src/components/blocks/Tier2GridBlock.astro` | 37, 46 | `brands.logo_url` |
| `src/lib/brands.ts` | 74, 139, 141, 144 | `brands.logo_url`, `brands.hero_image`, `brands.brand_gallery` |
| `src/components/BrandsCarousel.astro` | 20 | uses `resolveStaticBrandLogo` (not affected by passthrough bug) |
| `src/components/blocks/BrandStripBlock.astro` | 27 | uses `resolveStaticBrandLogo` (not affected) |

`tenants.logo_url` flows via `tenant.logo_url` to:
- Header/Footer site logos (not directly via `resolveStorageUrl` — separate inspection required during edit).

## 6. Other render contexts (CSS, structured data, OG meta)

| Context | Searched | Hits |
|---|---|---|
| CSS `background-image: url(...)` in src/styles/ + components | grep `background-image.*url` | 0 with supabase URL |
| Structured data JSON-LD `image:` field | grep | 0 with literal supabase URL (renderers consume the same DB-backed values that flow through resolveStorageUrl) |
| OG / Twitter meta tags | grep `og:image\|twitter:image` | 0 with literal supabase URL |
| Favicon | `storefront_config.favicon_url` | 0 hits per DB query |
| Hero image | `storefront_config.hero_image_url` | 0 hits per DB query |

## 7. Conclusion — required edits

**Storefront source (2 small edits):**
1. **`src/lib/image-utils.ts`** — extend `resolveStorageUrl()` to detect `https://*.supabase.co/storage/v1/object/public/<bucket>/<path>` in the URL passthrough branch and rewrite to `/api/image/<bucket>/<path>`. Idempotent + safe on non-Supabase URLs (Etag with regex). Will be inline in the existing helper rather than creating a new `src/lib/image-url.ts` (would be a Rule 21 duplicate).
2. **`src/pages/api/image/[...path].ts`** — add `tenant-logos/` bucket prefix support so the proxied URLs resolve correctly. SPEC §6 originally MUST-NOT'd this UNLESS broken; the proxy is "effectively broken" relative to this SPEC's criterion 11 ("0 supabase.co/storage URLs in rendered HTML") because without `tenant-logos` support the rewritten URLs would 403. Logged as a deviation in EXECUTION_REPORT.

**Build-time guardrail (per SPEC §4-E):**
3. **CREATE `scripts/check-no-direct-supabase-image.mjs`** — scans `dist/**/*.html` for `supabase.co/storage` and exits non-zero on hit.
4. **MODIFY `package.json`** — chain the check after `astro build`.

**DB migrations:** **0 needed.** All DB rows hold full URLs that the fixed `resolveStorageUrl()` will rewrite at render time. No `jsonb_set` migration of `storefront_pages.blocks` (0 hits). No backfill of `tenants.logo_url` or `brands.logo_url` (the renderer wraps them — keeping the original URLs in DB preserves audit/migration ease).

**Bucket privacy:** `tenant-logos` is currently public. Iron Rule 25 calls out only `frame-images` for required privacy. `tenant-logos` privacy flip is out of scope for this SPEC; logged as INFO finding (per SPEC §F + criterion 19).

**Deviation flag:** SPEC §6 says "MUST NOT modify `/api/image/[...path].ts` UNLESS it's broken." This SPEC's criterion 11 cannot be met without proxy support for `tenant-logos`. Treating that as "effectively broken" relative to the SPEC's required end state. Will document in EXECUTION_REPORT and FINDINGS.

---

*End of INVENTORY.md.*
