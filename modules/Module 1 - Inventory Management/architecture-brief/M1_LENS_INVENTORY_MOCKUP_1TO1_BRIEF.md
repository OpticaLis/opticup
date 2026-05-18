# M1 Lens — Lens Inventory Mockup 1:1 Rebuild

**Author:** opticup-architect (Cowork, 2026-05-18 afternoon)
**Owning module:** Module 1 — Inventory Management
**Type:** Single-screen mockup-to-live 1:1 rebuild
**Mode:** Single-Phase Pipeline; ONE screen only; no time pressure
**Estimated duration:** **AS LONG AS NEEDED.** Mockup fidelity > time budget. If the session terminates, the next session resumes the SAME Phase A. We do not advance to other screens until this one is byte-faithful to the mockup.

**Predecessor:** `M1_LENS_MOCKUP_FIDELITY_REBUILD` Phase A shipped 136 lines of partial — only 12% of the 1117-line mockup. Daniel rejected the result. This Brief replaces that approach.

**Source:** Daniel directive 2026-05-18 afternoon — "למה אנחנו עושים מוקאפים אם הוא לא יכול לעשות אחד לאחד כמו שסיכמנו?!" The mockup is a 1117-line complete visual specification including 388 lines of CSS, embedded sample data, full chip-filter UI, SPH×CYL grid, lot detail panel, and 4 bottom tabs with transaction history. The Executor's 136-line build is unacceptable.

---

## 1. Purpose — Read This First

The mockup at `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_INVENTORY_MOCKUP.html` is the design specification. It is NOT a sketch, NOT a sample, NOT a "starting point." It is the final design Daniel approved on 2026-05-14 (D-M1-02).

The Executor's job is to make `lens-inventory-partial.html` + supporting CSS + JS look 1:1 identical to that mockup when rendered in Chrome at 1920×1080. The same chip filters. The same grid. The same colors. The same lot panel. The same tabs. The same sample data structure (replaced with real DB data, but structure identical).

If the Executor cannot complete this in one session — that is acceptable. The next session resumes. The Pipeline doesn't advance to Phase B until Phase A is 1:1.

---

## 2. The Mockup — Mandatory Read Before Any Code

**File:** `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_INVENTORY_MOCKUP.html`

**Size:** 1117 lines, 48 KB

**Contents (verified by Cowork audit 2026-05-18 afternoon):**

- Lines 1–5: HTML doctype + head
- Lines 6–394: 388 lines of embedded CSS (colors, typography, layouts, shadows, responsive grids, modals, animations)
- Lines 395–417: Header bar with page title "ניהול מלאי עדשות-ראייה" + breadcrumb + 4 action buttons (Reports / Excel Export / Quick Search / Scan-Out / Scan-In / Wizard Multi-Add)
- Lines 419–471: Filter chip rows
  - Row 1: סוג ייצור (Stock/Custom) — 2 chips + helper text
  - Row 2: סוג עדשה (חד-מוקדי / מולטיפוקל / דו-מוקדי / פרוגרסיב משרדית) — 4 chips
  - Row 3: חומר/גוון (שקוף / מתכהה Photochromic / צבע Tinted / פולורואיד) — 4 chips
  - Row 4: Index (1.74 / 1.67 / 1.6 / 1.56 / 1.5) — 5 chips
  - Row 5: מצב מלאי (הכל / חסר (אזל) / מתחת לייעד / תואם לייעד / עודף / ללא יעד) — 6 chips with color dots
  - Row 6: ספק (Hoya / Essilor / Zeiss / Shamir / Rodenstock | לפידות / בדולח / סגם) — brand chips + supplier chips
  - Each chip styled as pill, gold accent when active, light grey when inactive
- Lines 472–516: Series cascade selectors (Design / Index×Diameter / Variant) + Variant range hint
- Lines 517–544: SPH × CYL grid header bar + grid container
- Lines 545–583: Right side panel "תא נבחר" with lot table + qty controls
- Lines 585–612: Selected cell title + variant info
- Lines 614–688: Four bottom tabs (תנועות מלאי / מחירים והנחות / התראות / ניתוח מלאי) with sample transaction table
- Lines 690–808: Reports modal (5 sub-tabs, "Missing stock" table with 14 rows)
- Lines 810–908: Scan modal (barcode input, movement-reason selector, 5 scanned-items list)
- Lines 910–977: Bulk Add Wizard modal (5 steps, preview "65 rows to create")
- Lines 980–1073: JS for grid generation + cell selection + modal toggles + sample stock data object
- Lines 1074–1117: Closing scripts and footer

**Executor MUST READ THE FILE END-TO-END before opening lens-inventory-partial.html.**

---

## 3. Scope — Mockup 1:1 Rebuild

### 3.1 Files to Modify

1. `modules/lens-inventory/lens-inventory-partial.html` — REWRITE to match mockup structure
2. `modules/lens-inventory/lens-inventory.js` — EXTEND to drive all the new UI elements (chip filters, grid generator, modal handlers)
3. `css/lens-inventory-page.css` — EXPAND from 197 to ~600+ lines matching the mockup's 388 lines of CSS
4. NEW: `modules/lens-inventory/lens-inventory-modals.html` (if extracted partials make sense) OR keep modals inline

### 3.2 What "1:1" Means

For each visual element in the mockup, the live version MUST have:
- Same **position** (left/right side, top/bottom, header/footer)
- Same **shape** (pill / rectangle / round / chip)
- Same **color** (gold accent #c9a555, dark navy headers, white surfaces)
- Same **typography** (font sizes, weights, alignment)
- Same **state-visualization** (active chip = filled gold, inactive = outline grey, color dots on stock-status chips)
- Same **interaction** (chip click toggles active state; grid cell click opens detail panel; tabs switch content)

It does NOT have to mean:
- Same JavaScript implementation (use existing patterns where they work)
- Same sample data values (use real DB data)
- Same HTML element nesting if functionally equivalent (but match the visual outcome)

### 3.3 Sub-Phase A1 — CSS

Copy the 388 lines of CSS from the mockup's `<style>` block (lines 6–394) into `css/lens-inventory-page.css`. Scope each rule under `.lens-inv-page` so it doesn't leak. Verify visual rendering matches when the partial loads.

### 3.4 Sub-Phase A2 — HTML Structure

Rewrite `lens-inventory-partial.html` to mirror mockup lines 395–688 (excluding modals which can stay inline OR be extracted). Each element from §2 above must have a corresponding HTML element with the same class names + structure.

### 3.5 Sub-Phase A3 — JS Wiring

Extend `lens-inventory.js` to:
- Render the chip filters with active-state toggling
- Generate the SPH × CYL grid (replicate mockup's lines 980–1073 logic, adapted to use `tenant_lens_stock` data instead of hardcoded sample)
- Wire the lot detail panel + qty controls (➕➖) to existing RPC `record_stock_movement` (no new RPC needed)
- Wire the 4 bottom tabs (transactions / prices / alerts / analytics)
- Wire the 3 modals (Reports / Scan / Wizard) with their content

### 3.6 Sub-Phase A4 — Sample Data Replacement

The mockup uses hardcoded sample stock data. The live version queries `tenant_lens_stock` + `stock_lot` + `stock_movement` etc. Real data may be sparser than mockup data — that is acceptable. The grid renders with whatever real data exists. Empty cells show "—" per mockup convention.

If the demo tenant lacks enough data to make the screen feel populated, seed additional data on demo (per the prior night-Pipeline Hoya/Zeiss seeding).

---

## 4. NOT in Scope

- Mockup modals are full-featured (Reports has 5 sub-tabs with detailed filters). The minimum: modal opens with correct content; full functionality of every sub-tab can be deferred.
- Other 6 screens (catalog admin, pricing, PO, etc.) — Phase B+ separate SPECs.
- Permission changes — none needed.
- DB schema changes — none needed.
- Performance optimization — focus on visual fidelity first.

---

## 5. Iron Rule Compliance

- Rule 12 (file size): if `lens-inventory.js` grows past 350 lines, split into `lens-inventory-grid.js` + `lens-inventory-filters.js` + `lens-inventory-modals.js`
- Rule 21 (No Orphans): if the chip-filter pattern is generalizable, extract to `shared/js/filter-chips.js` as a future helper — but NOT required for this Pipeline
- Rule 31 (integrity gate): exit 0 every commit
- Rule 32 (destructive ops): see §7

---

## 6. Mandatory Tier C VFV with Mockup Fidelity Check

**Per P-AR-16 + updated Tester Tier C.**

After Sub-Phase A3, the Tester MUST:

1. Open the mockup file in Chrome MCP (tab 1) at 1920×1080
2. Open the live URL in Chrome MCP (tab 2) at 1920×1080 — `http://localhost:3000/inventory.html?t=demo&cat=lenses&tab=inventory`
3. Capture screenshots of both
4. **Element-by-element diff**:
   - Header (title + 4 action buttons)
   - Filter chip row 1 (Stock/Custom) — presence + active state visual
   - Filter chip row 2 (lens type — 4 chips)
   - Filter chip row 3 (material — 4 chips)
   - Filter chip row 4 (index — 5 chips)
   - Filter chip row 5 (stock status — 6 chips with color dots)
   - Filter chip row 6 (brands + suppliers)
   - Cascade selectors (Design / Index×Diameter / Variant)
   - Variant range hint
   - SPH × CYL grid header
   - Grid cells with color states
   - Right side panel header ("תא נבחר")
   - Lot table
   - Qty controls (➕➖ with PIN)
   - Bottom tabs (4)
   - Action buttons (Reports / Excel Export / Quick Search / Scan / Wizard)

5. For each element: mark as ✅ MATCH or ❌ DRIFT
6. If any ❌ → Tester returns 🔴, loops to Executor for fix
7. Maximum fix loops: unlimited within Pipeline (no time pressure on this one)
8. Pipeline returns 🟢 only when 100% of elements ✅ MATCH

---

## 7. Destructive Operations (Iron Rule 32)

Declared:

1. Rewrite of `modules/lens-inventory/lens-inventory-partial.html` (current 136 lines → expected 500+ lines)
2. Expansion of `css/lens-inventory-page.css` (197 → 600+ lines)
3. Extension/split of `modules/lens-inventory/lens-inventory.js` + possibly new files under same folder
4. `git tag pre-m1-lens-inv-1to1-2026-05-18` before any commit

**NOT authorized:**
- Touching other lens screens (Phase B+)
- DB writes
- RPC changes
- Permission changes
- Touching main branch
- Modifying the mockup file

---

## 8. Success Criteria

🟢 Pipeline returns ONLY when:

1. **Side-by-side Chrome MCP screenshots show 100% of mockup elements present** in live (per §6 element list)
2. Element states (active filter chips, selected grid cell, populated lot table) render correctly with real demo data
3. The 3 modals open + display their content (sub-tab details can be partial, but modals MUST open)
4. Smoke 7/7 PASS
5. Iron Rule 31 integrity gate exit 0 every commit
6. No regression on the existing functional behavior (PIN flow / ➕➖ / lot drill-down all still work)
7. Prizma row-count delta = 0 (no DB writes)

🟡 NOT ACCEPTED. Either 🟢 or 🔴.

🔴 if any mockup element is missing OR styled wrong OR placed wrong.

---

## 9. Pre-Flight

1. Read the entire mockup file (1117 lines) — confirm understanding by listing the 6 chip filter rows + grid columns/rows + bottom tabs in the SPEC
2. Read current `lens-inventory-partial.html` (136 lines) — note what to remove/replace vs extend
3. Read current `css/lens-inventory-page.css` (197 lines) — note what to expand
4. Read current `lens-inventory.js` — note what to wire
5. Capture pre-rebuild Chrome MCP screenshot of the live screen
6. Capture mockup Chrome MCP screenshot
7. Place safety tag

---

## 10. Autonomous Decision Authority

The Executor MAY:
- Use existing project CSS variables (e.g., `--cat-sidebar-width`) where they match mockup intent
- Reuse existing components (Modal, Toast, PIN modal) where they fit
- Decide whether to split JS into multiple files (recommended if > 350 lines per Rule 12)
- Decide whether modals stay inline in partial or get extracted

The Executor MUST NOT:
- Skip any mockup element to save time
- Substitute a different visual (dropdown instead of chips) "because it's similar"
- Defer "for next session" — if the session ends, the next session resumes the SAME Phase A
- Apply a "scope-realism reduction" that omits mockup elements

---

## 11. Time Budget Stance — NEW

**There is no time budget for this Pipeline.**

If the Executor's first session covers only Sub-Phase A1 (CSS) — that's acceptable. The next session starts with A2 (HTML). And so on. Each session completes whatever it can; the next session continues.

The ONLY way this Pipeline returns 🟢 is when Tier C Mockup Fidelity Check shows 100% element match.

This stance replaces the prior "4-hour soft cap" approach. Mockup fidelity > time efficiency.

---

## 12. Hebrew Status Template

```
M1_LENS_INVENTORY_MOCKUP_1TO1 — [סטטוס בסשן הזה]

CSS: [סיים / בעבודה / לא התחיל]
HTML מבנה: [סטטוס]
JS חיווט: [סטטוס]
Tier C Fidelity Check: [N/N elements match]

הסיבה לעצירה (אם רלוונטי): [session timeout / element missing / blocker]
המשך בסשן הבא: [מה השלב הבא לפתוח בו]
```

---

*End of Brief. ONE screen. 1:1 mockup fidelity. No time budget. No element omissions. Multi-session continuation acceptable. Iron Rule 32 §Destructive Operations declared.*
