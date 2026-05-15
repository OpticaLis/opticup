# FINDINGS — STOREFRONT_PUBLIC_DATA_LAYER_2026_05_15

Issues discovered during execution that are NOT fixed inside this SPEC.
Each entry: severity / location / description / suggested next action.

---

## F-1 — SPEC monotonic heading renumbering needed

- **Severity:** MEDIUM (Foreman's SPEC quality)
- **Location:** `SPEC.md` (this folder)
- **Description:** SPEC has **two `## 3.` headings** (line 199 `## 3. Success Criteria` and originally line 379 `## 3. Destructive Operations`). The latter ALSO violated the Iron-Rule-32 hook regex due to trailing parenthetical text. Fixed in Commit 1 by renaming the second heading to bare `## Destructive Operations` (canonical hook form), but the whole SPEC's section numbering remains non-monotonic: `0, 1, 2, 1.5, 3, 4, 5, 6, (unnumbered), 7, 8, 9, 10, 11, 12, 13`.
- **Why:** Author wrote `## 1.5 Pre-flight Findings` between §2 and §3, and `## Destructive Operations` between §6 and §7 — but kept #1-#13 sequential as if those insertions weren't there.
- **Suggested next action:** Next opticup-strategic touch to this SPEC (or its Foreman review) should renumber monotonically: §0 → §1 Goal → §2 Background → §3 Pre-flight Findings → §4 Success Criteria → §5 Autonomy Envelope → §6 Stop-on-Deviation → §7 Pattern A/B Decision → §8 Destructive Operations → §9 Out of Scope → §10 Expected Final State → §11 Commit Plan → §12 Dependencies → §13 Lessons Incorporated → §14 Pre-Merge Checklist → §15 Notes for next Foreman. Update internal cross-references (`§3 #14` → `§4 #14`, etc.).

---

## F-2 — Brief §3.1 column allow-list incomplete for inventory_public

- **Severity:** LOW (SPEC defect, caught + fixed in Commit 4)
- **Location:** `architecture-brief/STOREFRONT_PUBLIC_DATA_LAYER_BRIEF.md` §3.1 table for inventory
- **Description:** The Brief listed `barcode, brand_id, model, color, size, quantity, product_type, website_sync, display_mode_override, computed display fields` as the inventory projection. The actual `v_storefront_products` projection ALSO includes:
  - `ai_description, ai_seo_title, ai_seo_description` (from `ai_content` subqueries) — covered by my AI cache columns ✓
  - `images` JSON array (from `inventory_images` aggregation) — covered by my `image_paths text[]` cache ✓
  - Visibility depends on `EXISTS inventory_images` — covered by the 8-condition trigger filter ✓

  These were caught only by reading the live `pg_get_viewdef` (which I did during pre-flight in Commit 2-3). Future SPEC authors who trust the Brief tables verbatim would build undersized mirrors.
- **Suggested next action:** Next Brief authoring template should mandate `pg_get_viewdef(target_view)` paste BEFORE writing the projection table; the table should ENUMERATE all columns (not "...computed fields...") with explicit JOIN/EXISTS dependencies.

---

## F-3 — BASE_INVENTORY_BACKFILL=8612 used wrong filter

- **Severity:** LOW (caught + corrected in Commit 3)
- **Location:** `SPEC.md` §0 baselines table
- **Description:** `BASE_INVENTORY_BACKFILL = 8612 (project-wide)` was computed against the Brief §3.1 partial filter (inventory-side conditions only). The correct full filter — matching v_storefront_products' actual WHERE — yields 1133 rows project-wide (= Prizma's 1133 + demo's 0). The 8612 number is the result of `count(*) FROM inventory WHERE is_deleted=false AND COALESCE(website_sync,'full')<>'none' AND barcode IS NOT NULL AND (display_mode_override IS NULL OR display_mode_override <> 'hidden')` WITHOUT the brand-side conditions AND WITHOUT the EXISTS inventory_images check. The mirror MUST mirror what the view returns, not what the loose filter returns.
- **Why:** Same root cause as F-2 — the Brief table didn't enumerate all conditions.
- **Suggested next action:** When updating GLOBAL_SCHEMA or future BASE-tracking docs, replace 8612 with 1133 and add a note that the latter is the v_storefront_products-equivalent count. Also fold this into the Brief-authoring template improvement from F-2.

---

## F-4 — Brand state changes don't propagate to inventory_public visibility

- **Severity:** LOW (known eventual-consistency gap)
- **Location:** Trigger architecture (sync_brands_public_trg + sync_inventory_public_trg + 2 satellites)
- **Description:** If a brand flips `active=false`, `exclude_website=true`, or `brand_page_visibility='hidden'`, the brands_public mirror reflects the change (the row is removed from brands_public via the main brands trigger). BUT the inventory_public rows for that brand are NOT removed — `sync_brands_public_trg` doesn't cascade into inventory_public; only `sync_inventory_public_trg` removes inventory_public rows, and it fires on inventory changes, not brand changes. Result: stale storefront for a brand that has been deactivated — products keep showing until the next inventory touch in that brand.
- **Mitigation today:** The rewritten `v_storefront_products` JOINs `brands_public` (which has only active brands), so a deactivated brand's products are filtered OUT at view-read time. The mirror is stale but the view contract is preserved.
- **Suggested next action:** 4th satellite trigger `tr_sync_brands_to_inventory_public_visibility` — on brand UPDATE, re-evaluate visibility of all inventory rows in that brand and update inventory_public accordingly. Out of scope for this SPEC (SPEC §3 declared exactly 2 satellites). Queue as `STOREFRONT_PUBLIC_DATA_LAYER_BRAND_VISIBILITY_CASCADE` follow-up SPEC.

---

## F-5 — 10 new SECDEF function findings in advisor

- **Severity:** LOW (new instances of EXISTING lint types; SPEC §3 #17 satisfied)
- **Location:** Supabase advisor `authenticated_security_definer_function_executable` + `anon_security_definer_function_executable` lints
- **Description:** My 9 new trigger functions (6 main + 3 satellites) are SECURITY DEFINER (correctly — they need to write to mirror tables that have RLS). The advisor flags them because they're EXECUTABLE BY anon/authenticated, opening a theoretical privilege-escalation path. In practice, anon/authenticated cannot meaningfully call them: they're trigger handlers (RETURNS TRIGGER), so direct `SELECT sync_branches_public_trg();` errors with "NEW/OLD not set". But the advisor doesn't model that.
- **Suggested next action:** `REVOKE EXECUTE ON FUNCTION public.sync_<entity>_public_trg() FROM anon, authenticated;` for each of the 9 functions. NOT done in this SPEC because it would be an undeclared destructive op (REVOKE on functions wasn't in SPEC §Destructive Operations). Queue as a 1-commit follow-up SPEC `STOREFRONT_PUBLIC_DATA_LAYER_FUNCTION_REVOKES`.

---

## F-6 — Storefront `/brands/<slug>/` 404 on pre-existing brand-page-enabled brands

- **Severity:** INFO (pre-existing storefront-app behavior, not migration regression)
- **Location:** `https://www.prizma-optic.co.il/brands/<slug>/` for any slug
- **Description:** v_storefront_brand_page returns 45 rows on Prizma, but visiting individual brand-page URLs (e.g. `/brands/alexander-mcqueen/`) returns 404. Verified pre-existing: `sitemap-dynamic.xml` does NOT enumerate individual brand-page URLs. The Astro storefront app doesn't statically build them OR doesn't have a `[slug].astro` route for that path.
- **Why:** Storefront-side concern; v_storefront_brand_page is consumed only by `src/lib/brands.ts` per SPEC §1.5.5, which may not power the dynamic brand-page route (or may need a separate Astro page that doesn't exist).
- **Suggested next action:** Storefront-side SPEC to either (a) build `src/pages/brands/[slug].astro` that consumes v_storefront_brand_page + renders a brand landing, OR (b) remove v_storefront_brand_page from the storefront contract if intentionally unused. NOT my SPEC's concern.

---

## F-7 — Storefront `/about/` 404 on both tenants

- **Severity:** INFO (pre-existing missing route)
- **Location:** `https://prizma-optic.co.il/about/`, `https://opticup-storefront-demo.vercel.app/about/`
- **Description:** Both tenants return 404 on `/about/`. The SPEC §3 #19 listed `/about/` as one of the 7 storefront pages to verify. This is a pre-existing missing app route, not a migration regression.
- **Suggested next action:** Storefront-side: build the route OR remove from the SPEC's required-pages list in the next iteration. Currently logged here as evidence the migration did not cause the 404.

---

## F-8 — `/brands/<slug>/` URL pattern unclear (singular vs plural)

- **Severity:** INFO (clarification needed for next storefront SPEC)
- **Location:** Same as F-6
- **Description:** The SPEC referenced `/brands/<slug>/` but no static build exists. Some other CMS systems use `/brand/<slug>/` (singular). The dynamic-sitemap has no enumeration of either. Storefront-side investigation needed to determine the actual URL pattern + route handler.
- **Suggested next action:** Same as F-6.

---

## Summary

8 findings logged. All non-blocking — SPEC closed cleanly per Verdict 🟢 in EXECUTION_REPORT §1.

| Severity | Count | List |
|---|---|---|
| MEDIUM | 1 | F-1 (SPEC renumber) |
| LOW | 4 | F-2 (Brief column allow-list), F-3 (BASE filter), F-4 (brand state cascade), F-5 (SECDEF function findings) |
| INFO | 3 | F-6 (/brands/<slug>/ 404), F-7 (/about/ 404), F-8 (URL pattern) |

3 follow-up SPECs queued:
- `STOREFRONT_PUBLIC_DATA_LAYER_BRAND_VISIBILITY_CASCADE` — 4th satellite trigger (F-4)
- `STOREFRONT_PUBLIC_DATA_LAYER_FUNCTION_REVOKES` — REVOKE EXECUTE on 9 functions (F-5)
- Storefront-side brand-page route SPEC (F-6 + F-8) — owned by Module 3, not Module 1.5
