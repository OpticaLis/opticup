# SPEC — STUDIO_BRANDS_VISIBILITY_REWORK_2026_04_27

> **Location:** `modules/Module 1 - Inventory/docs/specs/STUDIO_BRANDS_VISIBILITY_REWORK_2026_04_27/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, Cowork session)
> **Authored on:** 2026-04-27
> **Module:** 3 — Storefront (with cross-cuts to Module 1 — Inventory)
> **Phase:** Hotfix (post-STOREFRONT_SYNC_HIERARCHY_FIX)
> **Author signature:** Cowork-strategic — 2026-04-27 evening, second hotfix
> **Severity:** HIGH — UX confusion + accidental data loss surface

---

## 1. Goal

Replace the current confusing brand-visibility UI in Studio (3 overlapping
controls — `display_mode`, `exclude_website`, `brand_page_visibility`) with
a single radio-group that maps to Daniel's stated mental model of 3 visibility
modes. Add a bulk "change all products of this brand to {sync mode}" action
with explicit confirmation. Add a visible AI thinking indicator. Recover the
Alexander McQueen brand state. Delete the dead "Brands" link from the Studio
top nav. No customer data is lost or migrated incorrectly.

---

## 2. Background & Motivation

Daniel reported two issues today (2026-04-27, after STOREFRONT_SYNC_HIERARCHY_FIX
closed):

**Issue A — Studio top-nav "Brands" link is dead.** Clicking "🏷️ מותגים" loads
`storefront-studio.html` (the same page) instead of a real Brands editor page,
because `storefront-brands.html` was never built. Daniel wants this link removed.
The actual Brands editor lives inside Studio as a tab, not a separate page.

**Issue B — The "hide" button in the brand editor is destructive.** Daniel
clicked "hide" on Alexander McQueen and the brand disappeared with all 9
products from the storefront. Investigation:

- `inventory.is_deleted` is FALSE for all 9 McQueen products → **products NOT actually deleted**.
- `brands.is_deleted` is FALSE for the McQueen row → **brand NOT actually deleted**.
- What got toggled: `exclude_website=true` AND `brand_page_enabled=false`.
- After STOREFRONT_SYNC_HIERARCHY_FIX, the new view's WHERE clause kept the
  pre-existing `b.exclude_website = false` filter. McQueen now has
  `exclude_website=true` so it disappears from the storefront entirely.

The data is recoverable; what's broken is the UI. The brand editor exposes
THREE overlapping controls that all do related-but-different things, with no
clear hierarchy or labels:

1. `display_mode` — `catalog | store_all | store | hidden` (4 options, last one
   means "hide the brand from the storefront")
2. `exclude_website` — boolean ("hide the brand from the storefront entirely")
3. `brand_page_visibility` — `listed | unlisted | hidden` (3 options about the
   brand-page only)

Daniel's mental model — confirmed in this conversation — is THREE modes:

| Mode | Meaning | Effect on storefront |
|---|---|---|
| **A** | Hide brand-card from /brands page only | No card on /brands; brand page accessible by URL; products show in catalog/sunglasses/eyeglasses; SEO/Google still find the brand page |
| **B** | Hide everything customer-facing, keep brand page for SEO | No brand card; no products in any storefront listing; brand page itself still served (Google indexes it for domain authority) |
| **C** | Hide everything completely | Brand and products invisible to public; brand page 404s; only the row in `brands` table remains so Daniel can re-enable later |

The 3 existing DB fields are sufficient — but they need to be DRIVEN by a
single radio-group in the UI, not exposed as 3 independent controls. The
mapping in §8 below preserves all DB semantics while presenting one decision.

**Issue C — Bulk "change all products to" action.** Daniel wants a button on
the brand editor that overwrites `inventory.website_sync` for every product
of that brand to one of: `display` (catalog), `full` (חנות כולל אזל מלאי),
`store-in-stock-only` (חנות רק במלאי). The third option doesn't exist as a
distinct `website_sync` value — it's `full` + a brand-level filter. We map it
to `website_sync='full'` + `brands.display_mode='store'` as the storage form,
since that's what the existing storefront filter expects post-SYNC_HIERARCHY_FIX.

**Issue D — AI thinking indicator.** Currently the AI button text changes to
"🤖 מייצר תוכן..." while disabled. Daniel wants a visible thinking indicator
(spinner / animated dots) so it's clear something is happening.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 1 | ERP repo on `develop`, clean | "nothing to commit" | `git -C C:/Users/User/opticup status` |
| 2 | ERP commit count this SPEC | 4 commits | `git log origin/develop..HEAD --oneline \| wc -l` → 4 |
| 3 | `storefront-studio.html` no longer references "Brands" link | 0 hits | `grep -c 'storefront-studio.html.*מותגים\|🏷️ מותגים' storefront-studio.html` → 0 |
| 4 | Alexander McQueen restored to default visible state | `exclude_website=false`, `brand_page_enabled=true`, all 9 products with `website_sync='full'` | Supabase MCP query, see §8 |
| 5 | `studio-brands.js` exposes a 3-mode radio | UI element `<input type="radio" name="brand-visibility-mode">` with 3 options A/B/C present in modal HTML | `grep -c 'name="brand-visibility-mode"' modules/storefront/studio-brands.js` → ≥3 (3 radio inputs) |
| 6 | Old 3 controls (display_mode select, exclude_website checkbox, brand_page_visibility select) replaced by the radio group | Old IDs `sbe-display-mode`, `sbe-exclude-website`, `sbe-page-visibility` no longer present in source | `grep -c 'id="sbe-display-mode"\\|id="sbe-exclude-website"\\|id="sbe-page-visibility"' modules/storefront/studio-brands.js` → 0 |
| 7 | Bulk-mode action present | function `bulkApplyBrandModeToProducts` exists in `studio-brands.js` | `grep -c 'function bulkApplyBrandModeToProducts' modules/storefront/studio-brands.js` → 1 |
| 8 | Bulk-mode requires explicit confirmation | `Modal.confirm` or equivalent before any UPDATE | `grep -B 5 'sb.from(T.INVENTORY).update' modules/storefront/studio-brands.js \| grep -c 'confirm\\|Modal.confirm'` → ≥1 |
| 9 | AI thinking indicator visible | spinner element appended to button OR shown next to it during AI call | `grep -c 'spinner\\|loader\\|animation' modules/storefront/studio-brands.js` → ≥1 new occurrence vs baseline |
| 10 | No `is_deleted` toggling on brand-hide path | brand-hide path never sets `is_deleted=true` | `grep -A 20 'visibility-mode\\|hideBrand\\|brand.*hide' modules/storefront/studio-brands.js \| grep -c 'is_deleted' ` → 0 |
| 11 | No `inventory.is_deleted` toggling on bulk-mode path | the bulk-update never modifies `is_deleted` | `grep -A 30 'bulkApplyBrandModeToProducts' modules/storefront/studio-brands.js \| grep -c 'is_deleted'` → 0 |
| 12 | ERP `npm run verify:integrity` | exit 0 | `cd opticup && npm run verify:integrity` |
| 13 | Storefront after deploy shows McQueen | API returns McQueen in store_all section | `curl 'https://www.prizma-optic.co.il/api/supersale-stock?section=store_all&offset=0&limit=200' \| jq '.brands[] \| select(.brand_name=="Alexander McQueen")'` → not null |
| 14 | EXECUTION_REPORT.md exists | file present | `ls SPEC_FOLDER/EXECUTION_REPORT.md` |
| 15 | FINDINGS.md exists | file present | `ls SPEC_FOLDER/FINDINGS.md` |
| 16 | BEFORE_STATE.json captured | file present, contains baseline brands counts + McQueen pre-state | `ls SPEC_FOLDER/BEFORE_STATE.json && jq '.mcqueen_pre' SPEC_FOLDER/BEFORE_STATE.json` |

**Live-state baseline already probed (Foreman pre-flight per Improvement Proposal A from prior FOREMAN_REVIEW):**
- Total Prizma brands (active, not deleted): **232**
- Brands with `exclude_website=true`: **3** (LOOL, Tom Ford, Alexander McQueen) — only McQueen is to be restored. LOOL and Tom Ford stay as-is per Daniel's prior decisions.
- Brands with `brand_page_enabled=false`: ~180 (most of the catalog — this is the default state, not a regression).
- McQueen current state: `display_mode='store_all'`, `default_sync='full'`, `exclude_website=true` (the bug), `brand_page_enabled=false`, `brand_page_visibility='listed'`.
- McQueen products: 9 total, 7 in stock, all `website_sync='full'`, all with images, none soft-deleted.

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read all `modules/storefront/*.js`, `storefront-studio.html`, and the related views.
- Run read-only SQL via Supabase MCP.
- Modify `modules/storefront/studio-brands.js` (this is the primary change file).
- Modify `storefront-studio.html` to remove the dead nav link only.
- Apply ONE targeted UPDATE on the `brands` table (McQueen restoration only — exact statement in §8).
- Commit and push to `develop`.
- Run `npm run verify:integrity` and visually QA at `localhost:3000`.

### What REQUIRES stopping and reporting
- Any change to `inventory.is_deleted` or `brands.is_deleted` on any row, ever.
- Any change to `inventory.website_sync` on any McQueen product (the products are correct as-is).
- Any UPDATE on more than ONE row of `brands` (McQueen restoration is the only DB write).
- Any change to any view definition.
- Any change to any file outside §8 list.
- Any change that affects LOOL or Tom Ford (other `exclude_website=true` brands).
- Any test failure.

---

## 5. Stop-on-Deviation Triggers

- If the SQL probe of McQueen at execution start returns anything other than the expected pre-state (§3 baseline) — STOP. The state may have changed since this SPEC was authored.
- If the bulk-mode handler's first execution shows it's about to update >500 rows for the test-brand selected — STOP. Means a query bug.
- If `studio-brands.js` grows beyond 1,100 lines after edits (current 875 + ~150 expected) — STOP. Means the change wasn't surgical enough.
- If after deploy McQueen still doesn't appear in storefront — STOP. View cache may be stale, or the McQueen UPDATE didn't commit.

---

## 6. Rollback Plan

1. ERP repo: `git -C C:/Users/User/opticup reset --hard {START_COMMIT}` — recorded by executor in pre-flight.
2. McQueen DB rollback (only if needed): re-apply the pre-state from `BEFORE_STATE.json`:
   ```sql
   UPDATE brands SET exclude_website = true, brand_page_enabled = false
    WHERE id = '{mcqueen_id_from_pre_state}'
      AND tenant_id = '{prizma_id}';
   ```
3. Force-push only if Daniel approves. Otherwise the rollback is local-only and we re-engage.
4. Notify Foreman; SPEC marked REOPEN.

---

## 7. Out of Scope (explicit)

- **`v_storefront_products` and `v_storefront_brands` views.** Untouched. The fix is UI-only + one targeted DB UPDATE.
- **`inventory.website_sync` data.** Daniel's settings are sacred — read-only in this SPEC except for the bulk-mode user action (which is explicit and confirmation-gated).
- **`brands.default_sync` data.** Untouched.
- **LOOL and Tom Ford brands.** They have `exclude_website=true` for legitimate reasons (Daniel's prior decisions) — DO NOT touch them, even if the "fix" path could affect them.
- **Building a separate `storefront-brands.html` page.** Daniel explicitly chose to delete the dead link, not build the page.
- **Any change to brand-page rendering on the storefront** (`opticup-storefront/src/pages/brands/[slug].astro`). The new visibility mode mapping uses existing storefront filters; no `.astro` changes.
- **Any merge to ERP `main`.** Daniel-only authorization.
- **Storefront repo.** Zero commits expected. The price-guard `d1f67c4` stays intact.

---

## 8. Expected Final State

### Pre-flight artifacts (mandatory, captured BEFORE first edit)

- `BEFORE_STATE.json` in SPEC folder, structure:
  ```json
  {
    "captured_at": "2026-04-27T...",
    "tenant_id": "{prizma_uuid}",
    "mcqueen_pre": {
      "id": "{uuid}",
      "exclude_website": true,
      "brand_page_enabled": false,
      "brand_page_visibility": "listed",
      "display_mode": "store_all",
      "products_count": 9,
      "products_in_stock": 7
    },
    "totals": {
      "brands_total": 232,
      "brands_exclude_website_true": 3,
      "brands_with_exclude_website_true_names": ["LOOL", "Tom Ford", "Alexander McQueen"]
    }
  }
  ```

### Modified files

#### `storefront-studio.html`

- **Remove line 85:** `<a href="storefront-studio.html">🏷️ מותגים</a>`
- That's the only change in this file.

#### `modules/storefront/studio-brands.js` (primary change)

The current modal HTML has 3 separate controls (`sbe-display-mode`, `sbe-exclude-website`, `sbe-page-visibility`). Replace them with ONE radio-group + a separate "products mode" select that maps cleanly to `inventory.website_sync` semantics. New modal section structure:

```html
<div class="brand-editor-section">
  <h4 style="font-weight:700; margin-bottom:8px;">נראות באתר</h4>
  <p style="color:var(--g500); font-size:.78rem; margin-bottom:8px;">
    בחר איך המותג יוצג באתר הציבורי. ההגדרה כאן לא משפיעה על הסנכרון של הדגמים הבודדים.
  </p>

  <label class="brand-visibility-radio">
    <input type="radio" name="brand-visibility-mode" value="full" id="sbe-vis-full" />
    <div>
      <strong>מוצג רגיל</strong>
      <span style="font-size:.78rem; color:var(--g500); display:block;">
        עמוד מותג פעיל, כרטיס מופיע בעמוד "מותגים", המוצרים נראים בכל המקומות באתר
      </span>
    </div>
  </label>

  <label class="brand-visibility-radio">
    <input type="radio" name="brand-visibility-mode" value="hide-card" id="sbe-vis-hide-card" />
    <div>
      <strong>הסתר רק את הכרטיס בעמוד "מותגים"</strong>
      <span style="font-size:.78rem; color:var(--g500); display:block;">
        עמוד המותג נשאר זמין (URL פעיל, גוגל מוצא, תורם ל-SEO). כרטיס המותג לא מופיע בלוח המותגים. המוצרים ממשיכים להופיע בכל הלוחות (משקפי שמש, ראייה, חיפוש).
      </span>
    </div>
  </label>

  <label class="brand-visibility-radio">
    <input type="radio" name="brand-visibility-mode" value="hide-customer-keep-seo" id="sbe-vis-hide-customer" />
    <div>
      <strong>הסתר מהאתר אבל השאר ל-SEO</strong>
      <span style="font-size:.78rem; color:var(--g500); display:block;">
        המוצרים והכרטיס לא מופיעים בשום מקום ציבורי. עמוד המותג עדיין מוגש (גוגל מוצא, מקדם דומיין). מתאים למותגים שאתה רוצה את ה-SEO שלהם בלי שלקוחות יראו שהם זמינים.
      </span>
    </div>
  </label>

  <label class="brand-visibility-radio">
    <input type="radio" name="brand-visibility-mode" value="hide-all" id="sbe-vis-hide-all" />
    <div>
      <strong>הסתר לחלוטין</strong>
      <span style="font-size:.78rem; color:var(--g500); display:block;">
        המותג לא יופיע בשום מקום באתר. עמוד המותג עצמו לא יוגש (404). הכרטיס נשאר כאן בסטודיו כדי שתוכל להחזיר.
      </span>
    </div>
  </label>
</div>

<div class="brand-editor-section">
  <h4 style="font-weight:700; margin-bottom:8px;">שינוי מסיבי של דגמי המותג</h4>
  <p style="color:var(--g500); font-size:.78rem; margin-bottom:8px;">
    מאלץ את הסנכרון של <strong>כל הדגמים</strong> תחת המותג הזה לערך הנבחר.
    הגדרות ידניות שעשית ברמת הדגם יידרסו.
  </p>

  <label class="brand-editor-label">החל על כל הדגמים:</label>
  <select id="sbe-bulk-target" class="brand-editor-input">
    <option value="">— בחר מצב —</option>
    <option value="display">קטלוג (תדמית) - בלי מחיר, בלי "אזל"</option>
    <option value="full-all">חנות - כולל אזל מלאי</option>
    <option value="full-in-stock">חנות - רק מה שבמלאי</option>
  </select>
  <button type="button" id="sbe-bulk-apply-btn" class="btn btn-primary" style="margin-top:8px;">
    🔄 החל על כל הדגמים
  </button>
</div>
```

**Mapping radio value → DB columns** (the SAVE function applies all 3):

| Radio value | `display_mode` | `exclude_website` | `brand_page_visibility` | `brand_page_enabled` |
|---|---|---|---|---|
| `full` | `store_all` (or current `catalog`/`store` if Daniel set differently — preserve) | `false` | `listed` | `true` |
| `hide-card` | preserve current | `false` | `unlisted` | `true` |
| `hide-customer-keep-seo` | preserve current | `true` | `listed` | `true` |
| `hide-all` | preserve current | `true` | `hidden` | `false` |

Note: `display_mode` (legacy field) stays preserved — it's a "seed" field per the prior SYNC_HIERARCHY_FIX SPEC. The radio drives the 3 visibility fields only.

**Mapping bulk-target → `inventory.website_sync` UPDATE:**

| Target | Action | Confirmation message |
|---|---|---|
| `display` | `UPDATE inventory SET website_sync='display' WHERE brand_id=? AND tenant_id=? AND is_deleted=false` | "האם להחיל 'קטלוג (תדמית)' על כל N הדגמים תחת {brandName}? הגדרות ידניות יידרסו." |
| `full-all` | `UPDATE inventory SET website_sync='full' ...` + `UPDATE brands SET display_mode='store_all' ...` | "האם להחיל 'חנות - כולל אזל מלאי' על כל N הדגמים? הגדרות ידניות יידרסו." |
| `full-in-stock` | `UPDATE inventory SET website_sync='full' ...` + `UPDATE brands SET display_mode='store' ...` | "האם להחיל 'חנות - רק במלאי' על כל N הדגמים? הגדרות ידניות יידרסו." |

The bulk action MUST:
1. Show a `Modal.confirm` (or equivalent) with the exact product count and brand name.
2. Only proceed if user clicks confirm.
3. Use the project's standard `sb.from(T.INVENTORY).update(...).eq('brand_id', ...)` pattern (Iron Rule 7 — DB via helpers; defense-in-depth tenant_id per Iron Rule 22).
4. Show a toast on success with the exact row count updated.
5. **NEVER** modify `is_deleted`, `quantity`, `images`, or any field other than `website_sync`.

#### AI thinking indicator (lines ~795–860)

Replace the current minimal feedback (text-only "🤖 מייצר תוכן...") with a visible spinner + a status label. The minimal change:
1. After `btn.disabled = true;` on line ~797, add the spinner element next to the button (e.g., `<span class="ai-thinking-spinner"></span>` injected dynamically).
2. The spinner uses CSS `@keyframes` rotation (no library — keep dependency footprint zero).
3. On success/error, remove the spinner before re-enabling the button.

CSS for the spinner — add to whatever stylesheet `studio-brands.js` already pulls in (likely `studio.css` — confirm at execution). If no shared stylesheet, inject inline `<style>` once in `studio-brands.js` init.

### Modified DB rows

Exactly ONE row of `brands`:

```sql
UPDATE brands
   SET exclude_website = false,
       brand_page_enabled = true,
       updated_at = NOW()
 WHERE name = 'Alexander McQueen'
   AND tenant_id = (SELECT id FROM tenants WHERE slug = 'prizma');
```

This restores McQueen's customer-facing visibility. NO other column is touched. NO inventory rows are touched.

### New SPEC retrospective files (mandatory)

- `EXECUTION_REPORT.md`
- `FINDINGS.md`
- `BEFORE_STATE.json`

### Deleted files

- None.

### Docs updated

- `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md` — append entry.
- `modules/Module 1 - Inventory Management/docs/CHANGELOG.md` — append commit hashes.
- `MASTER_ROADMAP.md` — NOT NEEDED (hotfix, not phase).
- `docs/GLOBAL_MAP.md` — NOT NEEDED (no new functions or contracts; one new internal helper `bulkApplyBrandModeToProducts` lives only in `studio-brands.js`).
- `docs/GLOBAL_SCHEMA.sql` — NOT NEEDED (no schema change).

---

## 9. Commit Plan

ERP repo (`opticup`, on `develop`):

- **Commit 1** — `fix(studio): remove dead Brands link from Studio top-nav`
  - Touches: `storefront-studio.html` only (one line)
- **Commit 2** — `feat(studio-brands): replace 3-control visibility UI with single 4-mode radio + bulk-mode action + AI spinner`
  - Touches: `modules/storefront/studio-brands.js` only
- **Commit 3** — `fix(brands): restore Alexander McQueen visibility (exclude_website=false, page_enabled=true)`
  - Touches: nothing in repo (DB UPDATE captured in commit message body for audit trail)
- **Commit 4** — `docs(m1): record studio brands visibility rework in SESSION_CONTEXT + CHANGELOG`
  - Touches: SESSION_CONTEXT.md + CHANGELOG.md + closes SPEC folder with EXECUTION_REPORT/FINDINGS/BEFORE_STATE

Storefront repo: zero commits expected.

---

## 10. Dependencies / Preconditions

- ERP `develop` clean (handled by First Action sync gate).
- Supabase MCP authenticated.
- Storefront price-guard `d1f67c4` intact.
- The previous SPEC `STOREFRONT_SYNC_HIERARCHY_FIX_2026_04_27` is closed (it is — verified `b8ab61f`).

---

## 11. Lessons Already Incorporated

Harvested from FOREMAN_REVIEWs of: STOREFRONT_SYNC_HIERARCHY_FIX_2026_04_27,
FINAL_CLEANUP_2026_04_27, D5_HIDDEN_PRODUCT_RECOVERY, B3_BRAND_TYPE_FILTER_VIA_JOIN.

- **FROM `STOREFRONT_SYNC_HIERARCHY_FIX/FOREMAN_REVIEW.md` Strategic Improvement Proposal A (Live-State Baseline Probe)** → **APPLIED**: §3 includes baseline numbers I probed before authoring. The 232 brand count, the 3 `exclude_website=true` brands, McQueen's exact pre-state — all captured before writing thresholds.
- **FROM `STOREFRONT_SYNC_HIERARCHY_FIX/FOREMAN_REVIEW.md` Strategic Improvement Proposal B (Rendered-DOM verify, not source-grep)** → **NOT APPLICABLE**: this SPEC has no UI-rendering audit; the verify commands are file-grep on JS source which is appropriate when checking that DOM elements exist in the source HTML.
- **FROM `STOREFRONT_SYNC_HIERARCHY_FIX/FINDINGS.md` (verify-script existence check)** → **APPLIED**: §3 only references `npm run verify:integrity` which I confirmed exists in ERP `package.json` before writing the criterion.
- **FROM `D5_HIDDEN_PRODUCT_RECOVERY/FOREMAN_REVIEW.md` (capture pre-change state for rollback)** → **APPLIED**: `BEFORE_STATE.json` mandated in §8 + §6 rollback uses it.
- **FROM `B3_BRAND_TYPE_FILTER_VIA_JOIN/FOREMAN_REVIEW.md` (single source of truth)** → **APPLIED**: SPEC explicitly preserves `display_mode` as a legacy seed field and drives the new radio off the 3 dedicated visibility fields, not by mass-overloading one column.

### Cross-Reference Check

Cross-Reference Check completed 2026-04-27 against GLOBAL_SCHEMA + studio-brands.js:
- 0 new DB objects (no new tables, columns, RPCs, functions).
- 1 new internal JS function (`bulkApplyBrandModeToProducts` in `studio-brands.js`) — confirmed not present anywhere else via `grep -rn 'bulkApplyBrandModeToProducts' modules/ js/ shared/`. No collision.
- 0 new HTML element IDs that collide with existing IDs (`sbe-vis-*`, `sbe-bulk-*` — confirmed absent in current `studio-brands.js`).
- Existing fields being USED (not modified): `brands.exclude_website`, `brands.brand_page_enabled`, `brands.brand_page_visibility`, `brands.display_mode`, `inventory.website_sync`, `inventory.brand_id` — all already in GLOBAL_SCHEMA.

---

## 12. QA Acceptance — End-to-End

After all 4 commits land + Vercel deploys:

1. **Studio nav** — open `storefront-studio.html` → top-nav has no "מותגים" link. ✅
2. **Open brand editor** for any brand → see ONE radio group with 4 options (full / hide-card / hide-customer-keep-seo / hide-all) instead of the old 3 separate controls. ✅
3. **AI button** — click "🤖 יצירת תוכן AI" → visible spinner appears next to button while running. ✅
4. **Bulk mode** — open McQueen brand editor → select "חנות - כולל אזל מלאי" → click "החל על כל הדגמים" → confirm prompt shows "9 דגמים" → click confirm → toast confirms 9 rows updated. ✅
5. **Live storefront** — `https://www.prizma-optic.co.il/api/supersale-stock?section=store_all&offset=0&limit=200` returns Alexander McQueen with non-zero product count. ✅
6. **Hide-all sanity** — pick a low-traffic test brand (NOT McQueen, NOT LOOL, NOT Tom Ford), set to "hide-all", reload `/brands` page → brand absent. Reset to "full" before closing SPEC. ✅
7. **No data loss** — `SELECT COUNT(*) FROM inventory WHERE brand_id = '{mcqueen_id}' AND is_deleted = false` returns 9 (unchanged). ✅

Attach all 7 results verbatim to `EXECUTION_REPORT.md` §QA.

---

## 13. Notes for the Executor

- This SPEC is UI-heavy + 1 DB UPDATE. The DB UPDATE is for ONE specific brand (McQueen). DO NOT apply it to LOOL or Tom Ford — those `exclude_website=true` settings are legitimate per Daniel's prior decisions.
- The bulk-mode SQL UPDATE is the most dangerous change in this SPEC. It MUST be confirmation-gated and tenant-scoped. Run it once on a test brand during QA (step 6) and reset.
- The radio-group HTML labels are in Hebrew. Don't translate them.
- The spinner must be CSS-only — no library import, no new npm dependency.
- Daniel reviews QA before merge. Stop after QA, write EXECUTION_REPORT, do NOT merge to main (Daniel-only authorization).
- The current `studio-brands.js` is 875 lines. After this SPEC, expected ~1,000 lines. If it exceeds 1,100 — STOP, the change wasn't surgical.
