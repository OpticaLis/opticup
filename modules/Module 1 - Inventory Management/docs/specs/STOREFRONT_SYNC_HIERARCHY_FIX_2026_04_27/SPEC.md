# SPEC — STOREFRONT_SYNC_HIERARCHY_FIX_2026_04_27

> **Location:** `modules/Module 1 - Inventory/docs/specs/STOREFRONT_SYNC_HIERARCHY_FIX_2026_04_27/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, Cowork session)
> **Authored on:** 2026-04-27
> **Module:** 1 — Inventory (with cross-cuts to Module 3 — Storefront)
> **Phase:** Hotfix (post-FINAL_CLEANUP_2026_04_27)
> **Author signature:** Cowork-strategic — 2026-04-27 evening hotfix

---

## 1. Goal

Restore the storefront's brand visibility logic to a single, deterministic
4-level override hierarchy driven by the **per-product** sync flag (`inventory.website_sync`)
— NOT by the brand-level default — so that:

- Products with `website_sync='full'` show as in-stock (no prices, ever — HARD RULE).
- Products with `website_sync='display'` show as catalog (no price, no out-of-stock badge, "ask for price").
- Products with `website_sync='none'` are removed from the storefront entirely.
- Products with `website_sync IS NULL` keep their current behavior unchanged.

Side effect: this fixes the "section 2 empty" + "prices showing on luxury brands"
regressions that landed during today's earlier hotfix attempts.

---

## 2. Background & Motivation

Today (2026-04-27) the FINAL_CLEANUP SPEC closed cleanly, but a follow-up
incident exposed two stacked bugs:

**Bug A — Prices showing on storefront.** The D3+D4 view rewrite + the brand-level
`display_mode='store_all'` mass-update caused 215 brands' products to render with
ILS prices on the catalog/product pages. Daniel's hard rule (memory:
`feedback_no_storefront_prices.md`) is that storefront NEVER shows prices for any
brand without explicit per-brand approval. Cowork's first-pass fix was a code-side
override forcing `showPrice=false` in 5 storefront-repo files, which Daniel pushed
to `main` (commit `d1f67c4`). That commit IS the hard guardrail and stays.

**Bug B — Supersale section 2 empty.** The brand-level mass-update from `catalog`
→ `store_all` left only 2 brands at `display_mode='catalog'` with 0 in-stock
products. The supersale-stock page's section 2 ("luxury / limited") reads brands
where `display_mode='catalog'` AND `quantity > 0`, so it shows "0 דגמים / אין מותגים".

**The architectural error** behind both bugs: storefront visibility was being
driven by `brands.display_mode` (a brand-level field) instead of `inventory.website_sync`
(a per-product field that Daniel actually edits in the ERP main inventory grid).
Daniel's stated hierarchy (this conversation, 2026-04-27):

```
Brands tab "default sync"   ← seed for new products only, NEVER an override
        ↓
Inventory.website_sync      ← per-product, the real visibility decision
        ↓
Studio "Brands" tab         ← override: brand-level page-show toggle (Module 3 Studio)
        ↓
Studio "Products" tab       ← override: per-product page-show (highest)
```

Field semantics confirmed in DB on 2026-04-27 (Cowork SQL probe):

| Per-product `website_sync` | Brands count | Products count | In-stock |
|---|---|---|---|
| `full` | 44 | 2,773 | 636 |
| `display` | 23 | 507 | 181 |
| `none` | 14 | 45 | 27 |
| NULL | 193 | 5,413 | 763 |

Note `brand_id` overlap across rows means the per-product flag really is the source
of truth — many brands have a mix of `full`/`display`/`null` products.

**Constraint from Daniel:** "ל לוודא שכל מה שהגדרתי כתדמית באמת יוצג כקטלוג באתר"
("verify that anything I marked as 'display' truly renders as catalog").

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state, ERP repo | On `develop`, clean | `git -C C:/Users/User/opticup status` → "nothing to commit" |
| 2 | Branch state, storefront repo | On `main`, clean | `git -C C:/Users/User/opticup-storefront status` → "nothing to commit" |
| 3 | Commit count this SPEC, ERP | 3 commits | `git log origin/develop..HEAD --oneline` → 3 lines |
| 4 | Commit count this SPEC, storefront | 1–2 commits | `git log origin/main..HEAD --oneline` → 1 or 2 lines |
| 5 | View `v_storefront_products` reflects per-product hierarchy | products with `website_sync='none'` ABSENT | `SELECT COUNT(*) FROM v_storefront_products WHERE tenant_id = $prizma AND barcode IN (SELECT barcode FROM inventory WHERE website_sync='none' AND tenant_id=$prizma)` → 0 |
| 6 | View `v_storefront_products` returns `resolved_mode='catalog'` for `website_sync='display'` | 100% match | `SELECT COUNT(*) FROM v_storefront_products vsp JOIN inventory i ON i.barcode=vsp.barcode AND i.tenant_id=vsp.tenant_id WHERE vsp.tenant_id=$prizma AND i.website_sync='display' AND vsp.resolved_mode <> 'catalog'` → 0 |
| 7 | View `v_storefront_products` returns non-catalog mode for `website_sync='full'` (with stock) | 100% match | `SELECT COUNT(*) FROM v_storefront_products vsp JOIN inventory i ON i.barcode=vsp.barcode AND i.tenant_id=vsp.tenant_id WHERE vsp.tenant_id=$prizma AND i.website_sync='full' AND i.quantity>0 AND vsp.resolved_mode='catalog'` → 0 |
| 8 | Supersale section 1 (store_all) populated | ≥40 brands, ≥500 products in-stock | curl `https://www.prizma-optic.co.il/api/supersale-stock?section=store_all&offset=0&limit=20` → JSON with `brands.length >= 40` AND `total >= 500` |
| 9 | Supersale section 2 (catalog) populated | ≥10 brands | curl `https://www.prizma-optic.co.il/api/supersale-stock?section=catalog&offset=0&limit=20` → JSON with `brands.length >= 10` |
| 10 | Storefront price audit — zero ILS strings on product pages | 0 occurrences of `₪` symbol or `ILS` price text on rendered `/products/{barcode}` HTML | curl 5 sample product URLs from each section, grep for `₪\|priceCurrency.*ILS` → 0 lines |
| 11 | Build passes, storefront | exit 0 | `cd opticup-storefront && npm run build` → exit 0 |
| 12 | Storefront verify gate | exit 0 | `cd opticup-storefront && npm run verify:integrity` → exit 0 |
| 13 | ERP verify gate | exit 0 | `cd opticup && npm run verify:integrity` → exit 0 |
| 14 | Schema docs sync | `docs/GLOBAL_SCHEMA.sql` view definition matches live DB | `npm run schema-diff` → exit 0 |
| 15 | EXECUTION_REPORT.md exists in SPEC folder | file present | `ls "modules/Module 1 - Inventory/docs/specs/STOREFRONT_SYNC_HIERARCHY_FIX_2026_04_27/EXECUTION_REPORT.md"` → exit 0 |
| 16 | FINDINGS.md exists in SPEC folder | file present | `ls "modules/Module 1 - Inventory/docs/specs/STOREFRONT_SYNC_HIERARCHY_FIX_2026_04_27/FINDINGS.md"` → exit 0 |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in either repo (`opticup`, `opticup-storefront`).
- Run read-only SQL via Supabase MCP (`execute_sql` Level 1).
- Modify the views `v_storefront_products` and `v_storefront_brands` via
  `apply_migration` (this is Level 3 DDL — but the SPEC explicitly authorizes
  these two views, no others).
- Edit the listed files in §8.
- Commit and push to `develop` (ERP) and `main` (storefront).
- Run `npm run build`, `npm run verify:integrity`, `npm run schema-diff`.
- Run curl requests against the live storefront for QA.

### What REQUIRES stopping and reporting
- Touching ANY view other than `v_storefront_products` and `v_storefront_brands`.
- Touching `brands.display_mode` (we are NOT modifying brand-level state — we are
  removing the view's reliance on it; the column stays as-is for now).
- Touching `inventory.website_sync` data on any row (Daniel's settings are sacred).
- Touching `inventory.display_mode_override` data on any row.
- Any file outside the §8 list.
- Any merge to `main` of the ERP repo (storefront repo's `main` is fine — that's
  where its CI runs).
- Any test failure that cannot be diagnosed in a single retry.
- Any criterion in §3 returning a value that diverges from the expected.

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- If the rewritten `v_storefront_products` returns fewer than **1,200** total rows
  for Prizma (current baseline ≈1,366 rows after the D3+D4 work) → STOP.
  Significant data loss has occurred.
- If `npm run build` in storefront emits ANY new warning relative to the
  pre-SPEC baseline → STOP.
- If criterion #10 (price audit) finds even one `₪` on a rendered product
  page → STOP. The hard rule is non-negotiable.
- If `git diff` on the storefront repo touches any `.astro` page outside the
  §8 list → STOP, unstage, ask.

---

## 6. Rollback Plan

The risk surface of this SPEC is the view rewrite (DDL on 2 views). Rollback steps:

1. ERP repo: `git -C C:/Users/User/opticup reset --hard {START_COMMIT_ERP}`
   where `START_COMMIT_ERP` is the SHA recorded in the EXECUTION_REPORT pre-flight.
2. Storefront repo: `git -C C:/Users/User/opticup-storefront reset --hard {START_COMMIT_SF}`.
3. DB rollback: re-apply the pre-SPEC view definitions which the executor MUST
   capture verbatim into `BEFORE_VIEWS.sql` in the SPEC folder during pre-flight.
   `apply_migration` with the saved DDL restores the prior state exactly.
4. Force-push if already pushed: `git push --force-with-lease origin develop`
   (ERP) — only if Daniel approves in the moment.
5. Notify Foreman; SPEC is marked REOPEN, not CLOSED.

---

## 7. Out of Scope (explicit)

- **`brands.display_mode` column.** We do NOT modify any value, do NOT drop the
  column, do NOT migrate its data. It becomes a soft-deprecated seed field whose
  only consumer (the view) no longer reads from it.
- **`brands.default_sync` column.** Untouched. It remains the seed value the ERP
  uses when a new product is created from that brand.
- **Studio "Brands" tab override** (Module 3 Studio Brands editor `brand_page_visibility`).
  Already wired in `v_storefront_brands`; we do not alter its logic. The view rewrite
  must KEEP the existing brand-page-visibility override.
- **Studio "Products" tab override** (`inventory.display_mode_override`). Already
  the highest-priority override; we keep its CASE branch as the top one.
- **Module 3 Studio code.** No HTML / JS changes in `modules/storefront/` — Studio
  itself is healthy. Only the view it reads from changes.
- **Storefront repo redesign of supersale-stock.** No HTML/CSS/JS changes to
  `src/pages/supersale-stock/`, `public/js/supersale-stock.js`, or
  `src/styles/supersale-stock.css`. The fix is upstream in the view; the page
  shape stays.
- **Cleanup of NULL `website_sync` rows.** Daniel deferred this to a future SPEC.
  Current behavior for NULL = "treat as `full`" (the legacy default) MUST be
  preserved.
- **Any change to the `pin-auth` Edge Function or RLS policies.**
- **Any merge to ERP `main`.** Daniel-only authorization.

---

## 8. Expected Final State

### Pre-flight artifacts (executor MUST capture before any change)

- `modules/Module 1 - Inventory/docs/specs/STOREFRONT_SYNC_HIERARCHY_FIX_2026_04_27/BEFORE_VIEWS.sql`
  — verbatim `pg_dump`-style definitions of `v_storefront_products` and
  `v_storefront_brands` BEFORE this SPEC. Required for §6 rollback.
- `modules/Module 1 - Inventory/docs/specs/STOREFRONT_SYNC_HIERARCHY_FIX_2026_04_27/BEFORE_METRICS.json`
  — the row-count baselines for criteria #5, #6, #7, #8, #9 captured pre-change.
  Without baselines, "no regression" claims are unprovable.

### Modified DB objects (via `apply_migration`)

- View `public.v_storefront_products` — REWRITE the visibility/mode logic to:

```sql
-- Hierarchy (highest priority first):
-- 1. inventory.display_mode_override (Studio Products override) — wins all
-- 2. brands.brand_page_visibility (Studio Brands override) — gates whether brand shows at all
-- 3. inventory.website_sync (per-product, Daniel's main inventory grid) — primary driver
-- 4. (no fallback to brands.display_mode — it is now a seed field only)

WHERE
  i.is_deleted = false
  AND COALESCE(i.website_sync, 'full') <> 'none'   -- 'none' is hard-removed
  AND (b.brand_page_visibility IS NULL OR b.brand_page_visibility <> 'hidden')

SELECT
  ...,
  CASE
    WHEN i.display_mode_override IS NOT NULL THEN i.display_mode_override
    WHEN COALESCE(i.website_sync, 'full') = 'display' THEN 'catalog'
    WHEN COALESCE(i.website_sync, 'full') = 'full' THEN 'store_all'
    ELSE 'store_all'  -- safety: any unexpected value treats as full (legacy default)
  END AS display_mode,
  CASE
    WHEN i.display_mode_override = 'catalog' THEN 'catalog'
    WHEN COALESCE(i.website_sync, 'full') = 'display' THEN 'catalog'
    ELSE 'shop'
  END AS resolved_mode
```

  The exact final SELECT list, JOINs, WHERE filter, and column aliases MUST
  match the pre-SPEC view byte-for-byte EXCEPT for the visibility filter and
  the two CASE expressions above. Run a structural diff before applying.

- View `public.v_storefront_brands` — minimal rewrite to KEEP the existing
  brand-page-visibility filter but no longer rely on `brands.display_mode` as
  a hard filter. A brand should appear in the view if AT LEAST ONE of its
  non-`none` products in `inventory` exists. Suggested:

```sql
WHERE
  b.is_deleted = false
  AND b.active = true
  AND (b.brand_page_visibility IS NULL OR b.brand_page_visibility <> 'hidden')
  AND EXISTS (
    SELECT 1 FROM inventory i
    WHERE i.brand_id = b.id
      AND i.tenant_id = b.tenant_id
      AND i.is_deleted = false
      AND COALESCE(i.website_sync, 'full') <> 'none'
  )
```

  Keep the `display_mode` column in the view's SELECT — but derive it from
  per-product mix:

```sql
SELECT
  ...,
  CASE
    WHEN EXISTS (... website_sync='full' ...) THEN 'store_all'
    WHEN EXISTS (... website_sync='display' ...) THEN 'catalog'
    ELSE 'store_all'
  END AS display_mode
```

  This preserves the supersale-stock API's section split (`display_mode='catalog'`
  brands → section 2; `'store_all'` → section 1) without depending on the
  brand-level field.

### Modified ERP files

- `docs/GLOBAL_SCHEMA.sql` — replace the existing view definitions for
  `v_storefront_products` and `v_storefront_brands` with the new ones.
  Keep all surrounding context (other views, comments) unchanged.
- `modules/Module 1 - Inventory/docs/db-schema.sql` — same update if these
  views are mirrored there.
- `modules/Module 1 - Inventory/docs/SESSION_CONTEXT.md` — append a 5-line
  entry under "2026-04-27 — Storefront Sync Hierarchy Fix" describing the change.
- `modules/Module 1 - Inventory/docs/CHANGELOG.md` — add the new commit hashes
  under a 2026-04-27 entry.

### New SPEC retrospective files (mandatory)

- `modules/Module 1 - Inventory/docs/specs/STOREFRONT_SYNC_HIERARCHY_FIX_2026_04_27/EXECUTION_REPORT.md`
- `modules/Module 1 - Inventory/docs/specs/STOREFRONT_SYNC_HIERARCHY_FIX_2026_04_27/FINDINGS.md`
- `modules/Module 1 - Inventory/docs/specs/STOREFRONT_SYNC_HIERARCHY_FIX_2026_04_27/BEFORE_VIEWS.sql` (pre-flight)
- `modules/Module 1 - Inventory/docs/specs/STOREFRONT_SYNC_HIERARCHY_FIX_2026_04_27/BEFORE_METRICS.json` (pre-flight)

### Storefront repo files

- **NONE expected to change.** The hard-rule price guard (`d1f67c4`) is already
  in place and stays. If during QA the executor finds a residual price-display
  path, it is added here — but only with foreman approval (Daniel) at that moment.
  If no price residue is found, the storefront repo gets ZERO commits in this SPEC.

### Deleted files

- None.

### DB state

- 0 rows mutated in `inventory`, `brands`, or any other table.
- Only DDL (`CREATE OR REPLACE VIEW`) on the 2 named views.

### Docs updated (MUST include)

- `docs/GLOBAL_SCHEMA.sql` (view definitions).
- `modules/Module 1 - Inventory/docs/db-schema.sql` (if views mirrored there).
- Module's `SESSION_CONTEXT.md`.
- Module's `CHANGELOG.md`.
- `MASTER_ROADMAP.md` IF this SPEC closes a phase boundary — it does NOT in this
  case (it's a hotfix, not a phase). Skip.

---

## 9. Commit Plan

ERP repo (`opticup`, on `develop`):

- **Commit 1** — `feat(views): drive storefront visibility from inventory.website_sync, not brands.display_mode`
  - Touches: `docs/GLOBAL_SCHEMA.sql`, `modules/Module 1 - Inventory/docs/db-schema.sql`
  - The `apply_migration` call goes here. If the migration system records DDL
    history in a tracked file, that file is included.
- **Commit 2** — `docs(m1): record storefront sync hierarchy fix in SESSION_CONTEXT + CHANGELOG`
  - Touches: `modules/Module 1 - Inventory/docs/SESSION_CONTEXT.md`,
    `modules/Module 1 - Inventory/docs/CHANGELOG.md`
- **Commit 3** — `chore(spec): close STOREFRONT_SYNC_HIERARCHY_FIX with retrospective`
  - Touches: SPEC folder retrospective files only.

Storefront repo (`opticup-storefront`, on `main`): zero commits expected. If QA
finds a residual price-display issue, exactly ONE additional commit may be made
with foreman approval at that moment.

---

## 10. Dependencies / Preconditions

- ERP repo on `develop`, clean (handled by First Action sync gate).
- Storefront repo on `main`, clean.
- Supabase MCP available and authenticated.
- Vercel deploy pipeline functional (storefront).
- The price-guard commit `d1f67c4` (`fix(storefront): force showPrice=false ...`)
  is present on storefront `main` — verify with `git -C opticup-storefront log --oneline -10 | grep d1f67c4`.
- No active scheduled `opticup-sentinel` run that would write to `docs/guardian/`
  during execution.
- Foreman has confirmed (in this conversation) that brand-level mass-update of
  `display_mode` is NOT to be reverted — the new view simply ignores that field.

---

## 11. Lessons Already Incorporated

Harvested from the 3 most recent FOREMAN_REVIEWs (M1_FIXES_2026_04_26 batch):

- **FROM `D3_D4_DISPLAY_MODE_RECONCILIATION/FOREMAN_REVIEW.md`** → "schema duplication
  is the root anti-pattern; pick ONE source of truth per concept" → **APPLIED**:
  this SPEC formalizes `inventory.website_sync` as the single source of truth for
  per-product visibility, deprecating `brands.display_mode` to seed-only.

- **FROM `B3_BRAND_TYPE_FILTER_VIA_JOIN/FOREMAN_REVIEW.md`** → "always JOIN to the
  authoritative table at query time, never trust denormalized snapshot fields"
  → **APPLIED**: the new view JOINs `inventory ↔ brands` for visibility decisions
  rather than reading a denormalized `brands.display_mode`.

- **FROM `FINAL_CLEANUP_2026_04_27/FOREMAN_REVIEW.md`** (today's earlier close) →
  "every SPEC must enforce clean repo at end" → **APPLIED**: §3 criteria #1 + #2.

- **FROM `D5_HIDDEN_PRODUCT_RECOVERY/FOREMAN_REVIEW.md`** → "view-modification SPECs
  must capture pre-change definition for rollback" → **APPLIED**: §8 pre-flight
  artifacts mandate `BEFORE_VIEWS.sql`.

- **FROM `M1_RECEIPT_PO_COMPARE_SHRINK/FOREMAN_REVIEW.md`** → "always pin baseline
  metrics before claiming no regression" → **APPLIED**: §8 pre-flight `BEFORE_METRICS.json`.

### Cross-Reference Check

Cross-Reference Check completed 2026-04-27 against GLOBAL_SCHEMA rev (latest):
0 collisions / 2 hits resolved. Both hits (`v_storefront_products`,
`v_storefront_brands`) are EXISTING views being rewritten — not new objects. The
SPEC explicitly authorizes the view rewrites in §8 and captures rollback DDL in
the pre-flight `BEFORE_VIEWS.sql`. No new tables, columns, RPCs, T-constants, or
file paths are introduced.

---

## 12. QA Acceptance — End-to-End Smoke

After all 3 ERP commits land and the storefront has redeployed (Vercel), run
this end-to-end script and attach the result to `EXECUTION_REPORT.md`:

```bash
# 1. Prove the hierarchy works at the view level
SUPABASE_MCP execute_sql <criteria #5, #6, #7 from §3>

# 2. Prove the API responds with non-empty sections
curl -s "https://www.prizma-optic.co.il/api/supersale-stock?section=store_all&offset=0&limit=20" | jq '{brands: (.brands|length), total}'
curl -s "https://www.prizma-optic.co.il/api/supersale-stock?section=catalog&offset=0&limit=20"  | jq '{brands: (.brands|length), total}'

# 3. Prove no prices on a sample of 5 random product pages from each section
for url in $(<sample_urls.txt); do
  curl -s "$url" | grep -E '₪|priceCurrency.*ILS' && echo "FAIL: $url has price"
done

# 4. Prove a known 'display' product renders as catalog
# (executor picks one barcode from inventory where website_sync='display' AND brand_id IN luxury list)
curl -s "https://www.prizma-optic.co.il/products/<BARCODE>" | grep -c "contactForPrice"  # expect ≥1
curl -s "https://www.prizma-optic.co.il/products/<BARCODE>" | grep -c '₪'                  # expect 0

# 5. Prove a 'none' product 404s or 302-redirects
curl -s -o /dev/null -w "%{http_code}\n" "https://www.prizma-optic.co.il/products/<BARCODE_NONE>"  # expect 302 or 404

# 6. Repeat (4) for a 'full' product
curl -s "https://www.prizma-optic.co.il/products/<BARCODE_FULL>" | grep -c "askOnWhatsApp\|in_stock\|out_of_stock"  # expect ≥1
```

Attach the actual outputs (not summaries) to `EXECUTION_REPORT.md` §QA.

---

## 13. Notes for the Executor

- This SPEC touches PRODUCTION DATA-VISIBILITY for a live customer-facing site
  during business hours. Move deliberately. Capture pre-flight artifacts BEFORE
  the first migration. If anything in §3 returns a wrong value after the
  migration, stop instantly and run §6 rollback.
- The price-guard commit on storefront `main` is the last line of defense. Even
  if your view returns prices in `sell_price`, the storefront code refuses to
  render them. Do NOT remove or weaken that guard.
- When in doubt about whether to touch a file: don't. The §7 Out-of-Scope list
  is exhaustive for this SPEC.
- `display_mode_override` keeps its highest-priority slot. Do NOT skip it in the
  CASE expression. Daniel uses it in Studio for individual product overrides.
- After execution, the EXECUTION_REPORT MUST include: pre-flight artifact paths,
  start commit hashes (both repos), final commit hashes, all §3 criteria with
  actual measured values, and the §12 QA output verbatim.
