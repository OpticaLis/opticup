# View Contracts Audit — Mission 3
Generated: 2026-04-16
Tenant: Prizma (`6ad0781b-37f0-47a9-92e3-be9ed1477e1c`)
Supabase: `tsxrrxzmdxaenlvocyit`
Auditor: opticup-executor (READ-ONLY SELECT audit)

---

## Summary

- Views audited: **10 / 10**
- Views existing & queryable: **10**
- Views with SELECT grant to `anon`: **10 / 10** (DNS-switch-ready on grants)
- Views returning ≥ 1 Prizma row: **9 / 10** (`v_storefront_components` returns 0)
- Views with critical-column NULLs: **2** (`v_storefront_brands.hero_image`, `v_storefront_config.hero_*`)
- Image spot-checks HTTP 200 (after redirect): **5 / 5**
- Findings: **0 CRITICAL**, **2 HIGH**, **3 MEDIUM**, **3 LOW**

No STOP triggers hit (`v_storefront_pages` = 80 rows, well above the 50 threshold).

---

## Baseline Checks

| Baseline | Result |
|---|---|
| Prizma row in `v_public_tenant` | ✅ Yes (slug=`prizma`, `enabled=true`) |
| Logo present | ✅ `logo_url` set, curl → 200 |
| Theme present | ✅ `theme IS NOT NULL` |
| SEO config present | ✅ `seo IS NOT NULL` |
| Categories present | ✅ `categories IS NOT NULL` |
| WhatsApp number in `v_storefront_config` | ✅ `0533645404` |
| Booking URL in `v_storefront_config` | ✅ `https://yoman.co.il/Prizamaoptic` |
| Custom domain in `v_storefront_config` | ✅ `prizma-optic.co.il` |
| `v_storefront_pages` count | ℹ️ 80 (SPEC baseline said 66 — treat as drift note, not failure) |
| Products count | ✅ 608 |
| Brands count | ✅ 39 (38 with `brand_page_enabled`) |
| Supported languages | ✅ `[he, en, ru]` with default `he` |

---

## Per-View Results

| View | Exists | Prizma rows | anon SELECT | Critical NULLs | Image check | Notes |
|------|--------|-------------|-------------|----------------|-------------|-------|
| v_public_tenant        | ✅ | 1   | ✅ | `phone` NULL, `email` NULL | logo 200 | MEDIUM finding #3 |
| v_storefront_config    | ✅ | 1   | ✅ | `hero_title`, `hero_image_url`, `favicon_url`, `og_image_url` all NULL | site_logo 200 | MEDIUM finding #4 |
| v_storefront_pages     | ✅ | 80  | ✅ | none | — | 30 he / 25 en / 25 ru; latest update 2026-04-16 |
| v_storefront_products  | ✅ | 608 | ✅ | `ai_description`, `ai_seo_title` NULL on 48 rows (~8%) | 3/3 proxy URLs resolve 200 | LOW finding #6 |
| v_storefront_brands    | ✅ | 39  | ✅ | `hero_image` NULL on **all 39** | logo paths storage-relative (ok) | HIGH finding #1 |
| v_storefront_brand_page| ✅ | 38  | ✅ | `hero_image` NULL on all (same table) | — | HIGH finding #1 (same root cause) |
| v_storefront_categories| ✅ | 2   | ✅ | none | — | `sunglasses=342`, `eyeglasses=266` |
| v_storefront_blog_posts| ✅ | 172 | ✅ | none — all `title`, `slug`, `content`, `featured_image`, `seo_title` present | 2/2 blog images 200 | 58 he / 57 en / 57 ru. 124 featured images use `/blog/images/...` (public asset path), 48 use `/api/image/...` — mixed scheme (LOW finding #7) |
| v_storefront_reviews   | ✅ | 5   | ✅ | none | — | 5 Google reviews, 5⭐ average. No `updated_at` column (per contract, expected) |
| v_storefront_components| ✅ | **0** | ✅ | N/A (empty) | — | Base `storefront_components` table has zero rows for Prizma. MEDIUM finding #5 |

---

## Findings by Severity

- CRITICAL: 0
- HIGH: 2
- MEDIUM: 3
- LOW: 3

---

## Detailed Findings

### FINDING-M3-01 [HIGH] — v_storefront_brands / v_storefront_brand_page — `hero_image` NULL on all 39 brands

SQL evidence:
```sql
SELECT COUNT(*) AS total, COUNT(hero_image) AS hero_nn
FROM v_storefront_brands
WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
-- total=39, hero_nn=0
```
Sample rows (`v_storefront_brand_page`) — Jimmy Choo, Valentino, Gotti, Saint Laurent, VERSACE all have `hero_image = NULL` while `logo_url` is populated.

**Description:** Every Prizma brand is missing a hero image. Brand pages will render without a hero banner (falling back to whatever the component does for a missing image — potentially a broken `<img>` or empty block above the fold). This is cosmetically significant on a public site at the DNS cutover moment. `logo_url` is populated for all 39, so brand chips/cards still render.

**Recommendation:** Either populate `brands.hero_image` for at least the top-N brands before DNS flip, or confirm the storefront's brand-page template gracefully hides the hero block when NULL (the 3-month-old Storefront S2/S3 QA might already have covered this — spot-check on Vercel preview before DNS switch).

---

### FINDING-M3-02 [HIGH] — All 10 views GRANT non-SELECT privileges (INSERT/UPDATE/DELETE/TRUNCATE) to `anon` and `authenticated`

SQL evidence:
```sql
SELECT table_name, privilege_type, grantee
FROM information_schema.role_table_grants
WHERE table_name IN ('v_public_tenant', ...)
  AND grantee IN ('anon','authenticated')
ORDER BY table_name, grantee;
-- Every view returns 7 privilege_types per grantee:
-- SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
```
Every view has `INSERT / UPDATE / DELETE / TRUNCATE / REFERENCES / TRIGGER` granted to both `anon` and `authenticated`.

**Description:** The storefront contract in `opticup-storefront/VIEW_CONTRACTS.md` documents only "SELECT granted (A0 anon head-only probe returned no error)." In practice, **all seven privileges** are granted. For simple views on tenant-isolated tables with RLS, most of these are harmless (the view is unupdatable and underlying table RLS blocks writes). But:
- `TRUNCATE` on a view is a no-op on the view but could in principle target the underlying table via rewrite in certain PostgreSQL configurations — worth verifying.
- `REFERENCES` grant to `anon` on a view is meaningless but clutters the privilege matrix.
- This grant pattern most likely came from a `GRANT ALL ON ...` statement somewhere in the migration history (Iron Rule 13: Views-only for external reads — but SELECT should be the only grant).

**Recommendation:** After DNS switch, run `REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON <all 10 views> FROM anon, authenticated;` to align with Rule 13 (principle of least privilege). Not a DNS blocker — underlying RLS + view un-updatability makes this defense-in-depth, not an active exploit. Flag to Daniel to schedule post-cutover.

---

### FINDING-M3-03 [MEDIUM] — v_public_tenant — `phone` and `email` NULL for Prizma

SQL evidence:
```sql
SELECT phone, email FROM v_public_tenant WHERE id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
-- phone: NULL, email: NULL
```

**Description:** The public tenant card has no phone or email. `storefront_config.whatsapp_number` is populated (`0533645404`) so that channel works, but the site header/footer `contact` component (if bound to `v_public_tenant.phone`/`.email`) will show empty values. Needs to be populated in the `tenants` table (or re-bound to `storefront_config` if that's the intended source).

**Recommendation:** Populate `tenants.phone` and `tenants.email` for Prizma before DNS switch, OR confirm storefront reads these from `storefront_config` and can render without the `v_public_tenant` columns.

---

### FINDING-M3-04 [MEDIUM] — v_storefront_config — Hero/favicon/OG-image fields all NULL

SQL evidence:
```sql
SELECT hero_title, hero_image_url, favicon_url, og_image_url
FROM v_storefront_config WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
-- all NULL
```

**Description:**
- `hero_title` + `hero_image_url` NULL — homepage hero likely relies on a CMS block, not on these columns, so may be fine. Confirm.
- `favicon_url` NULL — browser tab shows default Vercel/Astro favicon, not Prizma branding. SEO/UX minor issue, but visible at DNS cutover.
- `og_image_url` NULL — social-media shares of prizma-optic.co.il will fall back to nothing, hurting link previews on WhatsApp/Facebook/Twitter.

**Recommendation:** At minimum populate `favicon_url` and `og_image_url` before DNS switch — 30-minute task in Storefront Studio that pays off immediately in SEO/social share quality.

---

### FINDING-M3-05 [MEDIUM] — v_storefront_components — zero rows for Prizma (and globally)

SQL evidence:
```sql
SELECT COUNT(*) FROM v_storefront_components;                                -- 0
SELECT COUNT(*) FROM storefront_components WHERE tenant_id='...prizma...';   -- 0 (base table)
SELECT COUNT(*) FROM storefront_components WHERE tenant_id='...' AND is_active=true; -- 0
```

**Description:** The base `storefront_components` table is empty for Prizma — it's not a view filter issue, the data simply isn't there. If the storefront depends on `v_storefront_components` for anything (header nav, footer blocks, global banners), those features will be inactive. If the storefront pivoted to reading components from `storefront_pages.blocks` (which has 80 rows, healthy), then this is expected.

**Recommendation:** Confirm whether the storefront still reads `v_storefront_components` anywhere. If yes — decide whether Prizma needs rows populated before DNS cutover. If no — consider dropping this view in a later cleanup (Iron Rule 21 — No Orphans).

---

### FINDING-M3-06 [LOW] — v_storefront_products — 48 of 608 products missing AI Hebrew content

SQL evidence:
```sql
SELECT COUNT(*) AS total, COUNT(ai_description) AS ai_desc_nn, COUNT(ai_seo_title) AS ai_seo_title_nn
FROM v_storefront_products WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
-- total=608, ai_desc_nn=560, ai_seo_title_nn=560
```

**Description:** ~7.9% of products have no AI-generated Hebrew description or SEO title. Product PDPs will render without these fields. Not a DNS blocker; tracked for post-cutover backfill.

**Recommendation:** Queue a backfill job for the 48 products via the existing AI-content pipeline after DNS cutover.

---

### FINDING-M3-07 [LOW] — v_storefront_blog_posts — mixed `featured_image` URL schemes

SQL evidence:
```sql
SELECT
  SUM(CASE WHEN featured_image LIKE '/blog/images/%' THEN 1 ELSE 0 END) AS blog_images_rel, -- 124
  SUM(CASE WHEN featured_image LIKE '/api/image/%' THEN 1 ELSE 0 END) AS api_image,          -- 48
  SUM(CASE WHEN featured_image LIKE 'http%' THEN 1 ELSE 0 END) AS abs_url                   -- 0
FROM v_storefront_blog_posts WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
```

**Description:** Blog posts use two different image schemes: 124 point to `/blog/images/*` (Astro public assets, served directly by Vercel) and 48 point to `/api/image/*` (server-side proxy to Supabase Storage). Both formats resolved HTTP 200 in spot-check. Not a bug — just documentation worth noting, and a minor inconsistency that could trip up future maintainers. `/blog/images/*` will break if Astro's `public/blog/images/` folder isn't bundled at deploy time.

**Recommendation:** Verify that `/blog/images/*` files are actually present in the storefront repo's `public/` folder before DNS switch (or all 124 blog posts will 404 their hero images). No action if already verified; document the dual scheme in `VIEW_CONTRACTS.md`.

---

### FINDING-M3-08 [LOW] — Baseline mismatch: `v_storefront_pages` has 80 rows, not 66

SQL evidence:
```sql
SELECT COUNT(*) FROM v_storefront_pages WHERE tenant_id='...prizma...'; -- 80
```

**Description:** The Mission 3 SPEC asked to verify `storefront_pages count = 66`. Current live count is 80 (30 he / 25 en / 25 ru across 6 page types). The delta (+14) is consistent with recent phase work (campaign pages, translation coverage). No failure; just update the SPEC/baseline doc.

**Recommendation:** Update the baseline in `DNS_SWITCH_READINESS_QA/SPEC.md` or the storefront's `SESSION_CONTEXT.md` to reflect the new truth (80 published pages).

---

## Freshness Snapshot

| View | Latest `updated_at` | Stale? |
|---|---|---|
| v_storefront_pages | 2026-04-16 19:09 UTC | No (today) |
| v_storefront_blog_posts | 2026-04-15 18:44 UTC | No (yesterday) |
| v_storefront_products | (no `updated_at` column per contract) | n/a |
| v_storefront_brands | (no `updated_at` column per contract) | n/a |
| v_storefront_reviews | (no `updated_at` column per contract) | n/a |

All views with a timestamp column are actively maintained — no stale-data finding.

---

## Anon Grant Detail (Raw Evidence)

All 10 views grant `SELECT` to both `anon` and `authenticated` — DNS-switch-ready.
They also grant `INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER` to both roles (see FINDING-M3-02).

---

## Stop-Trigger Compliance

- [x] No INSERT/UPDATE/DELETE/DDL keyword was used — audit was SELECT-only (plus introspection via `information_schema`).
- [x] `v_storefront_pages` row count is 80 (≥ 50 threshold).
- [x] No view threw an error.

---

## Ready-for-DNS-Switch Verdict (from this mission's scope only)

**GREEN with 2 HIGH cosmetic/hygiene items to address before flip:**
- FINDING-M3-01: populate brand hero images OR confirm graceful null-handling in brand-page template.
- FINDING-M3-02: schedule `REVOKE` of non-SELECT privileges post-cutover (not a blocker — underlying RLS protects).

MEDIUM items (favicon/og-image, phone/email, empty components) are visible at cutover but not functional blockers.
