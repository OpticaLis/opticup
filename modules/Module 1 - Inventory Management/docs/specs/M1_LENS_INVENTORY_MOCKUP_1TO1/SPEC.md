# SPEC — M1_LENS_INVENTORY_MOCKUP_1TO1

**Authored by:** opticup-executor (Claude Code) under dispatcher directive 2026-05-18 evening
**Brief source:** `modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_INVENTORY_MOCKUP_1TO1_BRIEF.md`
**Owning module:** Module 1 — Inventory Management
**Mockup reference:** `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_INVENTORY_MOCKUP.html` (1117 lines, D-M1-02)
**Pre-execution tag:** `pre-m1-lens-inv-1to1-2026-05-18`

---

## 1. Goal

Make `modules/lens-inventory/lens-inventory-partial.html` + `css/lens-inventory-page.css` + `modules/lens-inventory/lens-inventory-*.js` render **1:1 with the mockup** when loaded at 1920×1080 on demo tenant. Predecessor `M1_LENS_MOCKUP_FIDELITY_REBUILD` Phase A delivered only 12% of mockup elements. Daniel rejected. This SPEC replaces that with a single-screen pipeline focused exclusively on lens-inventory and zero advance to Phase B until Tier C shows 100% element match.

**No time budget.** Multi-session continuation acceptable. Pipeline returns 🟢 ONLY when Tier C Mockup Fidelity Check shows 100% match per Brief §6.

---

## 1.5 Mockup Comprehension Catalogue (Brief §2 + dispatcher §1.5 requirement)

The Executor has read all 1117 lines of `LENS_INVENTORY_MOCKUP.html`. Confirming understanding by enumerating every element to be replicated:

### Header (mockup lines 402-416)
- Title: "ניהול מלאי עדשות־ראייה" with badge "Optic Up · אופטיקה פריזמה · סניף ראשי"
- **6 action buttons** in this exact order, RTL: [📊 דוחות] [📥 ייצוא Excel] [🔍 חיפוש מתקדם] [📷 סריקה — הורדה red `#fef0ef` border `#e74c3c`] [📷 סריקה — הוספה green `#e8f8ef` border `#27ae60`] [➕ הוספה מרובה (Wizard) gold `#c9a555`]

### Filter Panel — 6 chip rows (mockup lines 418-472)

**Row 1 — סוג עדשה / production type (EMPHASIZED blue):** background `#eff6ff` border `#bfdbfe` label color `#1e3a8a`. 3 chips:
- "📦 מדף (Stock)" — active state: solid navy `#1e3a8a` + white text
- "🏭 ייצור (Custom)" — outline state: border `#d97706` text `#92400e`
- "🔀 שתיהן" — secondary outline grey
- Helper hint at end: "💡 הסינון מסנן את כל המסך — גריד, חוסרים, מצב מלאי"

**Row 2 — סוג עדשה / lens type:** label + 4 chips:
- חד-מוקדי (active gold) / דו-מוקדי / מולטיפוקל / פרוגרסיב משרדית

**Row 3 — חומר/גוון / material:** label + 4 chips:
- שקוף (active gold) / מתכהה (Photochromic) / צבע (Tinted) / פולורואיד

**Row 4 — Index:** label + 5 chips:
- 1.5 / 1.56 / 1.6 / 1.67 (active gold) / 1.74

**Row 5 — מצב מלאי / stock status:** label + 6 colored-border chips:
- הכל (active gold)
- 🔴 חסר (אזל) — border `#e74c3c` text `#c0392b`
- 🟡 מתחת ליעד — border `#f4c430` text `#856404`
- 🟢 תואם ליעד — border `#27ae60` text `#1e8449`
- 🔷 עודף — border `#1abc9c` text `#0e7a6a`
- ⚪ ללא יעד — secondary grey

**Row 6 — מותג + ספק (combined):** "מותג" label + 5 secondary chips (Hoya active navy `#34495e`, Essilor, Zeiss, Shamir, Rodenstock) — then "ספק" label (margin-start-24) + 3 secondary chips (לפידות active navy, בדולח, סגם)

### Variant Selector Bar (mockup lines 474-498)
3 columns: Design (select) + Diameter (select) + Range hint ("✓ SPH: -10.00 עד +6.00 · CYL: 0.00 עד -4.00", green `#27ae60`)

### Main Grid Panel (mockup lines 504-539)
- Grid header: h3 "רשת SPH × CYL — {variant context}" + 6-state legend (תואם ליעד / מתחת ליעד / אזל / עודף / 0 ללא יעד / לא אצל הספק)
- Grid body: 50px corner cell `#34495e` (SPH ↓ / CYL →) + 12 CYL column-headers (0.00 down to -2.75 step 0.25) + SPH row-headers (mockup: +2.00 down to -6.00, ~29 values) + cells classified by 6-state logic:
  - `qty=0, target=0` → white "0" no-target
  - `qty=0, target>0` → red `#ffe0e0` text `#c0392b` out-needed
  - `qty<target` → yellow `#fff7e0` text `#856404` low
  - `qty=target` → green `#e8f5e9` text `#1b5e20` on-target
  - `qty>target` → turquoise `#d1f5ef` text `#0e7a6a` over-target
  - in `notAtSupplier` → grey `#ecf0f1` opacity 0.4 "—" unavailable, not clickable
  - `.selected` → gold `#c9a555` + white text + shadow

### Side Panel (mockup lines 541-609)
Two panel-cards stacked:

**Card 1 — "תא נבחר" (selected cell)**
- Card header (grey bg `#f8f9fb`, single line "תא נבחר")
- Body contains:
  - Gold-gradient banner (linear-gradient 135deg `#c9a555 → #b8954a`) with SPH × CYL value, label, meta diameter
  - lots-table: cols [אצווה, נכנס, עלות, נותר] with FIFO #1 pill on first row
  - Stock/Target row: 2-col flex with במלאי (qty green) + יעד (numeric input + ✓ button)
  - Status hint (e.g. "✓ עודף 2 מעל היעד" turquoise bg `#d1f5ef` text `#0e7a6a`)
  - qty-controls: [−] red `#e74c3c` / [5] / [+] green `#27ae60` round buttons

**Card 2 — "הוספה ידנית" (manual add)**
- Card header "הוספה ידנית"
- Body: barcode input + 📷 button; SPH+CYL 2-col inputs; Qty+Cost 2-col inputs; "➕ הוסף למלאי" green-button

### Bottom Tabs (mockup lines 612-688)
- 4 tabs: 📋 תנועות מלאי (active gold `#c9a555` + bottom-border) / 💰 מחירים והנחות / ⚠️ התראות (3) / 📊 ניתוח מלאי
- Active tab content: movements-table with 8 columns [תאריך, סוג תנועה, SPH × CYL, אצווה, כמות, עלות יחידה, מסמך, משתמש] + 5 sample rows. Movement-type pills with 5 variants: purchase (green) / sale (red) / return (yellow) / transfer (blue) / adjustment (grey)

### Modals (mockup lines 690-977)

**Reports Modal** — width 1000px, navy gradient header `#34495e → #2c3e50`. 5 sub-tabs (🔴 חסרים 14 / 🟡 מתחת ליעד 23 / 🔷 עודף 8 / 📋 כל המלאי 412 / 🎯 לפי סינון נוכחי). Filter strip: 4 selects + 3 action buttons (Export Excel / Print / Order missing gold). Table 12 cols with sample rows; sticky-bottom navy total footer.

**Scan Modal** — width 720px, dynamic header gradient (green for IN, red for OUT). Big scan input area with 2px-dashed gold border. Reason row (only OUT): 6 chips for אבד/החזרה לספק/etc + free-text comment. Scanned-items table with 5 sample rows (last marked yellow "unknown barcode"). Footer: Cancel + colored Submit button.

**Bulk Wizard Modal** — gold gradient header. 5 wizard steps (numbered circles): Variant display / SPH range / CYL range / target per cell / initial qty + cost. Gold-dashed preview banner "65 שורות מלאי + יעדים".

### Mockup-note banner (mockup lines 398-400)
Yellow-bg "סקיצה" note. **EXCLUDED** from live (it's a mockup-only indicator).

---

## 2. Success Criteria

🟢 returned only when ALL hold:

1. Tier C Mockup Fidelity Check: 100% of 16 elements ✅ MATCH per Brief §6 (header, 6 chip rows, variant cascade row, range hint, grid header, grid cells with color states, side-panel "תא נבחר" header, lots table, qty controls, bottom tabs, 6 header buttons)
2. The 3 modals (Reports, Scan, Wizard) open and display their full mockup content (sub-tab functionality MAY be partial — opening + content presence is required, full filter wiring deferred)
3. Existing functional behavior preserved:
   - Permission gate `lens.inventory.view`
   - PIN-gated ➖ flow via `record_adjustment_lost` RPC
   - Brand → Design → Variant cascade still loads data
   - Click cell → load lots into the gold-gradient card
4. Iron Rule 31 integrity gate exit 0 on every commit
5. Iron Rule 32: declared destructive ops only
6. Prizma row-count delta = 0 (no DB writes)
7. No regression in console: app loads without errors

🟡 not accepted. Either 🟢 or 🔴 (Brief §8).

🔴 if ANY mockup element is missing OR styled wrong OR placed wrong.

---

## 3. Plan — 4 Sub-Phases

### Sub-Phase A1 — CSS Expansion (197 → ~600 lines, split if needed per Rule 12)
Expand `css/lens-inventory-page.css` to include all mockup styles scoped under `.lens-tab-section .lens-inv-page`:
- Restyle Row 1 (production) as blue-emphasized + add "שתיהן" chip + hint
- Add chip variants: navy-active for production, color-bordered chips for stock-status row, secondary navy for brand/supplier
- Add `.field-group` styles for the new Design + Diameter selects
- Restyle grid: 50px corner + 12 CYL cols + 6-state cell classes (on-target / low / out-needed / over-target / no-target / unavailable / selected)
- Side-panel gold-gradient `.selected-cell-info` banner with `.label` / `.value` / `.meta`
- `.lots-table` with `.fifo-tag` blue pill
- Target editor row + status hint
- `.qty-controls` round red/green buttons (32px circles, large)
- Manual-add card body grid (2-col inputs)
- Bottom-tab gold-active + bottom-border underline
- `.movements-table` cell padding + 5 `.movement-type` pill variants (purchase/sale/return/transfer/adjustment)
- Modal styles: `.modal-overlay` `.modal` `.modal-header` (3 variants: gold/navy/dynamic) `.modal-body` `.modal-footer` `.modal-close`
- Reports modal: `.rpt-tab` strip + filter strip + sticky-top + sticky-bottom navy total
- Scan modal: dashed gold scan area + reason chip row + items-table
- Wizard modal: `.wizard-step` + `.step-num` circle + `.range-inputs` 3-col grid + gold-dashed `.wizard-preview`

If CSS exceeds 600 lines, split into:
- `css/lens-inventory-page.css` — page chrome + filters + grid + side panel + bottom tabs
- `css/lens-inventory-modals.css` — the 3 modals

### Sub-Phase A2 — HTML Rewrite (`lens-inventory-partial.html` 136 → ~700 lines)
Rewrite the partial to mirror mockup structure. Preserve existing JS contracts:
- `#access-gate`, `#app`
- `#filter-brand`, `#filter-design`, `#filter-variant` selects (keep for cascade JS compatibility — the visible mockup-style Design + Diameter selects are the public face, brand stays as a hidden-but-functional companion driven by the brand chip row 6)
- `#variant-range-display`
- `#grid-container`, `#lot-container`
- `#selected-cell-coords`

Add new structure:
- Header with badge + 6 buttons matching mockup exactly
- 6 chip filter rows with proper `data-*` attributes for click handlers
- Variant selector row (Design + Diameter visible; Brand select kept but visually integrated as chips driven by row 6)
- Grid panel with 6-state legend
- Side panel: gold-gradient banner + lots-table + target editor + qty controls + manual-add card
- Bottom tabs (4) with full movements-table content (sample structure, real data injection deferred since Brief §3.6 allows it)
- 3 inline modals (Reports / Scan / Wizard) — full mockup content

If HTML partial exceeds 350 lines, extract modals to `modules/lens-inventory/lens-inventory-modals-partial.html` (sibling fetch).

### Sub-Phase A3 — JS Wiring
- `lens-inventory-filters.js` — add chip toggle handlers for Rows 1-6. Row 6 brand chips programmatically set `#filter-brand` and dispatch `change` to preserve cascade. Other rows are cosmetic active-state toggles this Phase (real filter logic deferred to Phase B+).
- `lens-inventory-grid.js` — extend `renderGrid` to use 6-state classification. If `tenant_lens_stock_target` table exists and has data → query it and apply; if not → all classified cells render with 2-state (qty>0 → on-target green, qty=0 → no-target white) but CSS-ready for 6-state.
- `lens-inventory-modals.js` — add `openReportsModal()`, `openScanModal(mode)`, `openWizardModal()`. Wire to the 6 `data-lens-inv-action` buttons replacing the existing Toast stubs.
- `lens-inventory-main.js` — replace Toast stub binding with the new modal open calls; wire bottom-tab body content (movements row injection).
- File-size discipline: if any file exceeds 350 lines, split into a sibling file scoped by responsibility.

### Sub-Phase A4 — Data integration sanity
- Sample data hardcoded in mockup STAYS in the modals (Reports/Scan/Wizard show static sample for now — Brief §4 permits this).
- The lots-table in side panel STILL reads from `stock_lot` via existing `showLotsFor()` — but the gold-gradient banner is added above it.
- Movements-table in the bottom-tabs body shows static sample rows initially; real query deferred (Brief §4 permits).
- Reports modal: opens with the 5 sample missing-stock rows; real query deferred (Brief §4 permits).

---

## 4. Destructive Operations

Declared:

1. **REWRITE** of `modules/lens-inventory/lens-inventory-partial.html` (current 136 lines → expected ~600-700 lines)
2. **EXPANSION** of `css/lens-inventory-page.css` (current 197 lines → expected ~600 lines). If split: new file `css/lens-inventory-modals.css`.
3. **EDIT** of `modules/lens-inventory/lens-inventory-filters.js` — extend chip handlers (current 141 → ≤350 lines)
4. **EDIT** of `modules/lens-inventory/lens-inventory-grid.js` — 6-state classification (current 106 → ≤350 lines)
5. **EDIT** of `modules/lens-inventory/lens-inventory-modals.js` — add 3 open*Modal functions (current 208 → ≤350 lines; split if needed into `lens-inventory-modals-handlers.js` for the 3 new modals OR keep ➖ flow separate)
6. **EDIT** of `modules/lens-inventory/lens-inventory-main.js` — replace header stubs with modal calls
7. **EDIT** of `inventory.html` — may add a second `<link>` if CSS is split
8. **POSSIBLE NEW FILES** (split per Rule 12):
   - `css/lens-inventory-modals.css`
   - `modules/lens-inventory/lens-inventory-modals-partial.html`
   - `modules/lens-inventory/lens-inventory-modal-handlers.js`
9. Git tag `pre-m1-lens-inv-1to1-2026-05-18` was placed BEFORE first commit (already done)

**NOT authorized:**
- Touching the mockup file (`LENS_INVENTORY_MOCKUP.html`)
- Any DB writes (DML/DDL)
- Any RPC changes (DROP/CREATE/ALTER)
- Any RLS / policy / permission changes
- Touching `main` branch (merge/push/checkout)
- Touching other lens screens (catalog-admin, designs, pricing, PO, GR, pos-list)
- Touching the 5 ERP HTML pages outside `inventory.html`

---

## 5. Rollback Plan

If any phase causes regression:
```
git reset --hard pre-m1-lens-inv-1to1-2026-05-18
```
The pre-execution tag locks the prior state. Recovery is a single command.

---

## 6. Out of Scope

- Real filtering logic for chip rows 2-6 (lens-type, material, index, stock-status, supplier) — they're cosmetic active-toggle this SPEC. Filter wiring deferred to next SPEC.
- Real data for Reports modal sub-tabs — opens with mockup sample rows. Real RPC query deferred.
- Real data for Scan modal scanned-items list — opens with mockup sample. Real scan ingestion deferred.
- Real data for Wizard modal preview count — uses static "65 שורות" sample. Real preview math + bulk-create RPC deferred.
- Movements-table real query — uses static 5 rows from mockup. Real `stock_movement` query deferred.
- Target editor wiring — the input renders, but PATCH-to-DB on save button click is deferred.
- `tenant_lens_stock_target` integration — if table doesn't exist or has no target data on demo, grid falls back to 2-state classification.
- Pricing / Alerts / Analytics bottom-tab bodies — they render placeholder strings (current behavior).
- Mobile/tablet responsive refinement beyond the existing `@media (max-width: 900px)` block.

---

## 7. Expected Final State

After all sub-phases:
- `lens-inventory-partial.html` ≈ 600-700 lines (or split if exceeds 350)
- `css/lens-inventory-page.css` ≈ 500-700 lines (split if exceeds limit)
- 5 JS files in `modules/lens-inventory/`, each ≤350 lines
- `inventory.html` has 1 or 2 `<link>` tags for the lens-inventory CSS
- Pre-rebuild screenshot exists at `screenshots/00_pre_rebuild_live.png`
- Mockup reference screenshot at `screenshots/00_mockup_reference.png`
- Post-rebuild screenshot at `screenshots/99_post_rebuild_live.png` with side-by-side diff log
- EXECUTION_REPORT.md + FINDINGS.md committed
- Tier C result documented in EXECUTION_REPORT §3

---

## 8. Commit Plan

One commit per sub-phase, all on `develop`:

1. `chore(spec): seed M1_LENS_INVENTORY_MOCKUP_1TO1 SPEC + safety tag + baselines`
2. `feat(m1-lens-inventory): A1 — expand CSS to mockup-fidelity styles`
3. `feat(m1-lens-inventory): A2 — rewrite partial HTML to mockup structure + 3 inline modals`
4. `feat(m1-lens-inventory): A3 — JS wiring for 6 chip rows + 6-state grid + 3 modals`
5. (optional, if Tier C demands) `fix(m1-lens-inventory): Tier C drift fix — {what}`
6. `chore(spec): close M1_LENS_INVENTORY_MOCKUP_1TO1 with EXECUTION_REPORT + FINDINGS`

Every commit: explicit-filename `git add`, English subject, scoped prefix.

---

## 9. Pre-Flight (Brief §9) — completed before this SPEC was committed

- [x] Read entire mockup (1117 lines)
- [x] Read current `lens-inventory-partial.html` (136 lines)
- [x] Read current `css/lens-inventory-page.css` (197 lines)
- [x] Read current 5 JS files (`-main.js` 154, `-filters.js` 141, `-grid.js` 106, `-lot-pane.js` 72, `-modals.js` 208)
- [x] Read predecessor `M1_LENS_MOCKUP_FIDELITY_REBUILD` `FINDINGS.md` + `EXECUTION_REPORT.md`
- [x] Both localhost servers reachable (ERP 3000 / Storefront 4321 both HTTP 200)
- [x] Pre-rebuild Chrome MCP screenshot captured (1920×1080)
- [x] Mockup Chrome MCP screenshot captured (1920×1080)
- [x] Safety tag `pre-m1-lens-inv-1to1-2026-05-18` placed
- [x] Iron Rule 31 integrity gate exit 0
- [x] `git remote -v` confirms `opticalis/opticup` + branch `develop`

---

## 10. Stop-on-Deviation Triggers (Beyond Bounded Autonomy defaults)

- DB writes attempted by any code path (verify via Supabase log if suspicious)
- Iron Rule 31 integrity gate exit != 0 on any commit
- Iron Rule 32 destructive op not in §4 declared list
- File exceeds 350 lines without a split plan
- An existing functional behavior regresses (permission gate / PIN flow / cascade / lot drill-down)
- Console errors after partial rewrite
- Any commit message includes "WIP" or trails an uncommitted scope
- Tier C diff repeatedly fails the same element across 3 fix loops → STOP and ask Foreman

---

*SPEC sealed by opticup-executor 2026-05-18 evening. Mockup-fidelity > time efficiency. Multi-session continuation acceptable. Tier C must be 100% before 🟢.*
