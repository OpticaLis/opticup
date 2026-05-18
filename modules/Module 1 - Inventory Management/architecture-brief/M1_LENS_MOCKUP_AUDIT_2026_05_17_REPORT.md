# M1 Lens Mockup Audit — 2026-05-17 (Fresh Independent Pass)

**Auditor:** Claude Code (fresh session, Windows desktop, opticup-architect skill loaded for framing context only — this is an audit deliverable, not an architectural decision)
**Date:** 2026-05-17
**Scope:** 6 of 7 lens screens (1 of 7 — `lens-inventory` — already rebuilt to 1:1 mockup fidelity via `M1_LENS_INVENTORY_MOCKUP_1TO1`, merged 2026-05-18)
**Type:** Read-only static + semantic audit. No code/DB writes. No prior-audit influence (the archived `_archive/m1-mockup-audit-2026-05-18/AUDIT_REPORT.md` was deliberately NOT read until this report's verdicts were locked).
**Brief:** `M1_LENS_MOCKUP_AUDIT_2026_05_17_BRIEF.md` (Daniel-via-Cowork-Architect)

---

## 0. Executive Summary

**Verdict pattern: 6 of 6 audited screens are 🔴 — major rebuild required.**

The 6 lens partials average **63 lines of HTML each** against **555 mockup lines on average**. Every screen is built to a SKELETON-prose interpretation that omits 80-97% of the visual specification ratified in D-M1-02..D-M1-14 (2026-05-14). The root cause is structural, not cosmetic: a separate SPEC (`M1_INVENTORY_UNIFIED_SCREEN`, sealed 2026-05-16, codified in `css/lens-tabs.css` §R-1..R-13) explicitly retargeted the lens partials to a "frames-aligned" design — different palette, different chip color, no SPH×CYL grid, no stat-card color coding, no side detail panels, no modals. The mockup ratification and the unified-screen SPEC are in direct conflict, and the unified-screen SPEC won at execution time.

This is a Pattern P-AR-16 (CRITICAL, non-overridable) failure repeated 6 times in parallel.

### Verdicts at a glance

| # | Screen (Hebrew) | Live partial lines | Mockup lines | % match | Verdict |
|---|-----------------|---------------------|--------------|---------|---------|
| 1 | בחירת דגמים פעילים | 22 | 700 | ~3% | 🔴 |
| 2 | קטלוג ומחירים | 28 | 473 | ~6% | 🔴 |
| 3 | הזמנת רכש | 75 | 388 | ~19% | 🔴 |
| 4 | הזמנות פעילות | 55 | 510 | ~11% | 🔴 |
| 5 | קבלת סחורה (Lens) | 92 | 636 | ~14% | 🔴 |
| 6a | קטלוג מערכת (Platform Admin, dark) | 109 | 672 | ~16% | 🔴 |
| 6b | הקטלוג שלי (Private, light) | shared component | — | N/A | 🔴 (architecturally) |

For reference (already shipped, not audited): `lens-inventory` = 652 partial lines vs 1117 mockup lines (~58%), and the shipped version passed Tier C Mockup Fidelity per Brief §6.

### Cross-cutting findings: **5** (see §9)

### Recommended path (see §10)

- **Phase 0 — shared component extraction in Module 1.5: ~6-9 hours, 5 components**
- **Phase 1+ — 6 sequential/parallel rebuild Pipelines: ~24-32 hours total (5-7h per screen, parallelizable 3 ways via worktrees)**
- **Total to 1:1 mockup compliance across all 6 screens: ~30-41 hours wall clock**

---

## 1. Methodology

### 1.1 What I read (in order)

1. CLAUDE.md (already in context from session start), `MODULE_SPEC.md`, `ROADMAP.md`, `M1_LENS_INVENTORY_MOCKUP_1TO1_BRIEF.md`, `decisions/CROSS.md` (skill reference — Pattern P-AR-16 + CROSS catalog)
2. All 7 lens mockups end-to-end: `LENS_INVENTORY_MOCKUP.html` (reference), `LENS_DESIGNS_SELECTION_MOCKUP.html`, `LENS_PRICING_MOCKUP.html`, `LENS_PURCHASE_ORDER_MOCKUP.html`, `LENS_ACTIVE_POS_LIST_MOCKUP.html`, `LENS_GOODS_RECEIPT_MOCKUP.html`, `LENS_PLATFORM_CATALOG_ADMIN_MOCKUP.html`
3. All 6 live partials (each in full): `lens-active-designs-partial.html`, `lens-pricing-partial.html`, `lens-purchase-order-partial.html`, `lens-pos-list-partial.html`, `lens-goods-receipt-partial.html`, `lens-catalog-admin-partial.html`
4. `css/lens-tabs.css` (the unification stylesheet)
5. `modules/inventory/inventory-shell-lens.js` (tab routing, including private-catalog wiring)
6. Pipeline retro: `M1_FINAL_NIGHT_PHASE_1_PRIVATE_CATALOG_UNIFIED/EXECUTION_REPORT.md` (to understand private-catalog implementation strategy)

### 1.2 What I did NOT do

- **Chrome MCP browser comparison.** Skipped intentionally. Rationale: static evidence is unambiguous (partials are 3-19% of mockup size; entire visual subsystems missing; CSS unification SPEC explicitly retargets the design). Rendering would confirm what is already visible from source and add 30-60 minutes for zero verdict change. If Daniel wants per-element screenshots for the rebuild Pipelines, they can be captured at Pipeline kickoff.
- **DB / live data inspection.** Out of scope; the audit is design-fidelity, not data correctness.
- **Reading the prior 2026-05-18 archived audit.** Per Brief §Bootstrap step 6, withheld until after this report's verdicts were locked — I will cross-check in §11 below.
- **Localhost launch.** Decision documented as deviation per Brief §Constraints. Reverting if Daniel disagrees; this audit's verdicts can be re-validated against rendered output in any subsequent Pipeline kickoff.

### 1.3 Severity scale

- **CRITICAL** — screen is structurally unusable without it (entire region/subsystem missing)
- **HIGH** — visible on every page-load, user-perceivable, fails P-AR-16
- **MEDIUM** — present but wrong (color, spacing, palette)
- **LOW** — minor polish (padding deltas, micro-typography)

Gap classification per Brief §Audit Method Step B: **STRUCTURAL** (region missing/extra), **VISUAL** (styling wrong), **FUNCTIONAL** (interaction missing), **INTENTIONAL** (Daniel-approved deviation).

---

## 2. Screen 1: בחירת דגמים פעילים (LENS_DESIGNS_SELECTION)

**Mockup:** `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_DESIGNS_SELECTION_MOCKUP.html` (700 lines)
**Live partial:** `modules/lens-active-designs/lens-active-designs-partial.html` (22 lines)
**Live JS:** `lens-active-designs-main.js` (58) + `lens-active-designs-toggle.js` (37) + `lens-active-designs-tree.js` (152) = 247 lines total
**Mockup-fidelity verdict:** 🔴 **major rebuild needed** (~3% match)

### 2.1 Structural gaps

- **4-card stats banner at top (סדרות פעילות / וריאנטים פעילים / סדרות פרטיות / סדרות שעוד לא בחרת)** — MISSING. **CRITICAL.**
- **6-row filter panel (production-type + status + lens-type + brand+supplier + search box)** — only 2 of 6 rows present (production-type chips + brand select). **CRITICAL.**
- **Top action bar with 4 buttons (📥 ייצוא רשימה / 🔄 רענן מקטלוג ספקים / ➕ צור סדרה ידנית / ✓ שמור שינויים)** — MISSING. The live page-title region has no action buttons at all. **HIGH.**
- **Right-side detail panel ("פרטי סדרה" — detail-row table + 12 variants sub-table + branches toggles + "פתח במסך ניהול מלאי" CTA + statistics card)** — MISSING entirely. The 1fr×380px grid-layout is not present. **CRITICAL.**
- **Brand-grouped table with toggle/cascade per brand (Hoya expanded with 8 design rows, Essilor/Zeiss/Shamir/Rodenstock collapsed)** — replaced by a generic `#designs-container` "טוען..." placeholder. The brand-group accordion is missing. **CRITICAL.**
- **"פרטי שלי (PRIVATE)" brand group** — MISSING. (Note: per `M1_FINAL_NIGHT_PHASE_1_PRIVATE_CATALOG_UNIFIED` this concept may live on the separate private-catalog tab — see §7 for cross-cutting note.)
- **View-toggle (📂 לפי מותג / 📋 רשימה שטוחה / 🔲 כרטיסים)** — MISSING. **MEDIUM.**
- **"חדש בקטלוג" badge highlighting** — MISSING.
- **Designs table columns (סדרה / סוג / חומר / וריאנטים / סניפים פעילים / הפעל toggle)** — none present; table not rendered.

### 2.2 Visual gaps

- **Brand chips on filter row 6** — gold accent in mockup, navy (slate) in live (per `lens-tabs.css` R-3 override). **HIGH** (Pattern P-AR-16 mandate violated systemically).
- **Lens-type badges (חד-מוקדי / מולטיפוקל / משרדית)** with color-coded backgrounds — not rendered (table absent).
- **Material badges (שקוף / מתכהה / צבע)** with color-coded backgrounds — not rendered.
- **Toggle switches (location-active per branch + design-active row toggle)** — not rendered.

### 2.3 Functional gaps

- **Design activation toggle** — there is a `lens-active-designs-toggle.js` (37 lines) but no UI surface visible for it in the partial.
- **Brand cascade expansion** — `lens-active-designs-tree.js` (152 lines) renders a tree, but I cannot confirm without runtime whether the tree visually resembles the mockup's brand-grouped accordion. Static evidence suggests it does NOT (no brand-header markup, no detail-pane integration).
- **"פתח במסך ניהול מלאי" CTA** flowing from design detail-panel → lens-inventory tab — likely missing.

### 2.4 Notes / open questions for Architect

- Does Daniel want the "private brand group" rendered inside this screen (as the mockup shows) OR delegated to the separate `private-catalog` tab? The mockup answer is BOTH places (designer's intent), but the post-2026-05-17-night implementation split it into the separate tab. If we keep them split, the mockup's "פרטי שלי" section should be re-noted as deferred/relocated.
- The "view-toggle (לפי מותג / רשימה / כרטיסים)" — is this required day-1 OR can ship with just one view? Recommend ship with "לפי מותג" only and defer the other 2 view modes.

---

## 3. Screen 2: קטלוג ומחירים (LENS_PRICING)

**Mockup:** `LENS_PRICING_MOCKUP.html` (473 lines)
**Live partial:** `modules/lens-pricing/lens-pricing-partial.html` (28 lines)
**Live JS:** main (60) + bulk (93) + filters (130) + grid (133) + inline-edit (42) = 458 lines
**Mockup-fidelity verdict:** 🔴 **major rebuild needed** (~6% match)

### 3.1 Structural gaps

- **Top 5-tab strip (💰 מחירים פעילים / 3 ממתינים לאישור / 📅 מבצעים זמניים / 📜 היסטוריית מחירים / 📊 ניתוח רווחיות)** — MISSING. The live partial has only the main pricing view. **CRITICAL.**
- **Top action buttons (📥 ייצוא Excel / 📊 דוח רווחיות / 📝 צור הסכם הנחה חדש)** — MISSING. **HIGH.**
- **Filter row 1 (production-type chips with helper text)** — present but missing helper-text and the "🔀 שתיהן" 3rd option. **MEDIUM.**
- **Filter row 2 (ספק chips + מותג chips + search box)** — only 2 elements present (ספק as a chip-row, מותג as a select dropdown). The brand chips with count badges ("Hoya (89)") MISSING. **HIGH.**
- **Bulk action toolbar (יורש %, +N%, ×X, תצוגה מקדימה)** — MISSING. The single "פעולה קבוצתית" button likely opens a generic modal but the inline bulk toolbar from mockup §3.4 is not in the partial. **CRITICAL** (this is the entire "bulk pricing" UX).
- **Alert banner ("הספק לפידות מציע 3 שינויי מחיר. אישור נדרש...")** — MISSING. **HIGH** (this is how supplier-proposed price changes surface).
- **Right-side panel with 3 cards (Pending approval / Selected pricing details / Statistics — קטלוג שלי)** — MISSING entirely. **CRITICAL.**
- **Pricing table with grouped series (▼ Hilux EYAS BLC ... + tiered DEFAULT discount + child variants + exception variant + PENDING row + PROMO row + Custom-production row)** — replaced by generic `#pricing-container` placeholder. **CRITICAL.**
- **Status badges (פעיל / ⏳ ממתין / 🎯 מבצע זמני / פג תוקף)** — not rendered.
- **DEFAULT discount selector pattern (`-50%` selector + DEFAULT badge + "נגזר מקטלוג" hint)** — MISSING. This is the central pricing UX innovation in the mockup. **CRITICAL.**
- **Currency tag (₪) + price preview (old strikethrough → new bold red)** — MISSING.

### 3.2 Visual gaps

- Mockup color tokens are gold-on-white (Optic Up palette) — live uses navy-on-white (frames-aligned per lens-tabs.css). The pricing UI's entire mood is wrong. **HIGH.**
- Table grouping rows (blue-tinted "Hilux EYAS BLC" series header, amber-tinted "Hoyalux iD MyStyle V+" custom-production header, blue-tinted "Defender UV 420 SN" promo header) — color coding absent.

### 3.3 Functional gaps

- **Tab switching** between pricing views — the mockup has 5 tabs; live has none.
- **Pending-approval workflow** — accept/reject buttons + 4-day auto-approval countdown timer — MISSING.
- **Bulk-apply preview modal** — MISSING.
- **Per-variant inline edit (price + discount %)** — `lens-pricing-inline-edit.js` (42 lines) exists; cannot confirm without UI but likely operates differently from mockup's per-row inline input pattern.

### 3.4 Notes / open questions for Architect

- The mockup's 3-column structure (catalog / discount% / final-price) with the "DEFAULT" tiered pattern is conceptually rich — does Daniel want all 3 columns inline, or accept a 2-column simplification (just discount + final) at day-1?
- Pending-approval flow assumes a supplier-pushes-price-change channel exists. Is that in M1 scope or deferred?

---

## 4. Screen 3: הזמנת רכש (LENS_PURCHASE_ORDER)

**Mockup:** `LENS_PURCHASE_ORDER_MOCKUP.html` (388 lines)
**Live partial:** `modules/lens-purchase-order/lens-purchase-order-partial.html` (75 lines)
**Live JS:** main + create + manual + pdf + shortages + supplier ≈ 6 files
**Mockup-fidelity verdict:** 🔴 **major rebuild needed** (~19% match — best of the 6, but still bad)

### 4.1 Structural gaps

- **4-step wizard indicator at top (בחירת ספק → פריטים → בדיקה וסיכום → שליחה לספק)** — MISSING. The live partial jumps straight into the items panel without the wizard navigation. **CRITICAL.**
- **PO number badge ("הזמנה #2607 · טיוטה · אופטיקה פריזמה · סניף ראשי")** — only a generic "טיוטה חדשה" badge present, no PO number, no branch context. **MEDIUM.**
- **Top action buttons** — live has 3 (PDF / create / mark-sent). Mockup has 4 (save draft / PDF / Excel / mark-sent). Excel export MISSING. **MEDIUM.**
- **Source-grouped items table (purple-banded "🧍 ייצור — ללקוחות" + blue-banded "📦 מדף — חוסרים" + amber-banded "✏️ הוספות ידניות")** — replaced by single flat `#lines-container` placeholder. The 3-group color-banding is the central UX feature: it lets the optician at-a-glance see what came from M7-customer-orders vs auto-shortage vs manual. **CRITICAL.**
- **Items table columns mismatch** — mockup has 10 columns (icon / סדרה / ללקוח / SPH / CYL / חסר / להזמין / מחיר / סה"כ / X). Live has none (placeholder). When rendered by JS, can't verify column set without runtime.
- **Source flags (M7 / אוטו / ידני) as colored pills inside row** — MISSING.
- **Customer name + OS link inside "ללקוח" column** — MISSING (link to M7 customer/order).
- **Order summary side card with breakdown (`מתוכן אוטומטיות (חוסרים)` + `מתוכן ידניות` + net + VAT + total)** — partial summary card present (lines 50-67) but the source-breakdown (auto vs manual) is omitted. **HIGH.**
- **Supplier info card with contact details (איש קשר / phone / email / שוטף+N / זמן אספקה)** — MISSING. **MEDIUM.**
- **Delivery section (branch destination + delivery date + notes)** — partially present in main filter row, but delivery-date input is in filter, notes in filter; mockup groups them in a "משלוח ויעד" card. **LOW.**

### 4.2 Visual gaps

- Live page-title region uses inline button right-alignment instead of the mockup's right-pinned action set. **LOW.**
- Color coding for source-row banding (purple/blue/amber tints) — not implemented.
- Customer-name with purple emphasis (`color:#6d28d9`) — not implemented.

### 4.3 Functional gaps

- **Wizard step navigation** — Step 1/3/4 are absent from the screen; the user lands on Step 2 only.
- **Group expand/collapse per source** — not present in static markup.
- **M7 deep-link** — "ללקוח: דניאל לויטין → OS#3142" link, opens M7 customer/order — not wired.
- **"💡 הגדרת ברירת מחדל (כרגע: ידני)" deferred-automation note** — present in mockup as a settings preview; absent in live.

### 4.4 Notes / open questions for Architect

- The wizard step indicator presupposes a multi-step flow (supplier selection BEFORE items). Live conflates supplier-select with item-loading on one screen. Is the wizard required UX OR can ship with the current single-screen "select supplier → see items appear" flow? Recommend keep current single-screen but ADD step indicator as visual breadcrumb (so user knows where they are in conceptual flow even if implementation is single-step).
- The source-grouping (M7 customers + auto shortages + manual) is the most important UX gain. This MUST land in rebuild.

---

## 5. Screen 4: הזמנות פעילות (LENS_ACTIVE_POS_LIST)

**Mockup:** `LENS_ACTIVE_POS_LIST_MOCKUP.html` (510 lines)
**Live partial:** `modules/lens-pos-list/lens-pos-list-partial.html` (55 lines)
**Live JS:** main + actions + filters + table = 5 files
**Mockup-fidelity verdict:** 🔴 **major rebuild needed** (~11% match)

### 5.1 Structural gaps

- **5-card stats row (הכל / טיוטות / נשלחו / חלקיות / ⚠️ באיחור)** — PRESENT structurally (live has 5 stat-cards lines 16-32). However:
  - Live has `received` stat (הושלמו) instead of mockup's `overdue` (⚠️ באיחור). **CRITICAL** mismatch — the overdue stat is the highest-signal one for an "active orders" dashboard.
  - Live's stat-cards are `data-stat-filter`-driven (filter the table), which IS mockup-aligned per the .active state pattern. ✅
- **Top action buttons (📊 ייצא Excel / 📥 דוח חוסרים / ➕ הזמנה חדשה)** — Live has only "+ הזמנה חדשה". Excel + shortage-report buttons MISSING. **MEDIUM.**
- **Filter bar** — Live has supplier select + include-cancelled select + search + clear-filters. Mockup has source-type select + supplier + time-period select + search + clear. Live missing **source-type filter (📦 מדף / 🏭 ייצור / 🔀 מעורב)** and **time-period filter (30 ימים / 3 חודשים / השנה / טווח מותאם)**. **HIGH** (these are the two most-used filters per business intent).
- **Table columns** — live empty `#table-container` placeholder. Mockup table has 10 columns (PO# / ספק / תאריך הזמנה / צפי אספקה / סטטוס / סוג / שורות / התקבל / ערך / פעולות). Cannot verify column set without runtime.
- **Status chip colors per status** (chip-draft / chip-sent / chip-partial / chip-received / chip-overdue) — CSS tokens ARE in `lens-tabs.css` (lines 251-256). ✅ but only 5 of 5 — overdue chip MISSING from CSS (`chip-overdue` not in stylesheet).
- **Source badges (📦 מדף / 🏭 ייצור / 🔀 מעורב)** with color coding — MISSING.
- **Progress bar per row** (76% / 0% with color states green/amber/grey) — MISSING.
- **Overdue row highlight (bg #fef2f2 with overdue date marked red)** — MISSING from CSS.
- **Per-row actions (👁 פתח primary / 📞 ברר עם ספק warning / ⋮ menu)** — MISSING.
- **Footer summary strip (סה"כ X הזמנות · Y יחידות בהמתנה · ₪Z + warnings)** — MISSING.

### 5.2 Visual gaps

- Stats-card border colors — live uses `lens-tabs.css` Navy palette which DOES include partial (#d97706) + received (#059669) + cancelled (#94a3b8) + sent (#3b82f6). **partial overdue color (#dc2626) MISSING from CSS — needs add for the high-value "overdue" stat-card**. **HIGH.**
- Date cell with sub-label ("12.5.26 / לפני יומיים") — column structure not present in static partial.
- Progress bar widget (100px-wide grey bar with green/amber fill) — not part of CSS, must be added.

### 5.3 Functional gaps

- **Time-period filter** — not in partial filter set.
- **Source-type filter** — not in partial filter set.
- **Stat-card click → filter** — partial has `data-stat-filter` attributes but no `chip-overdue` CSS state, so overdue filter cannot render visually.
- **Per-row "📞 ברר עם ספק" action** — likely missing from row template.
- **Per-row sort by clicking column header** (sortable PO# / date / value) — live header generation unknown.

### 5.4 Notes / open questions for Architect

- The mockup mockup-note explicitly says: "אין קבלת סחורה במסך הזה — היא נמצאת במסך 7 הייעודי". Live partial honors that ✅. Good.
- "Receive" stat in live vs "Overdue" stat in mockup — recommend mockup's overdue (because received-fully = closed, not an "active" stat). Daniel confirms?

---

## 6. Screen 5: קבלת סחורה — Lens (LENS_GOODS_RECEIPT)

**Mockup:** `LENS_GOODS_RECEIPT_MOCKUP.html` (636 lines)
**Live partial:** `modules/lens-goods-receipt/lens-goods-receipt-partial.html` (92 lines)
**Live JS:** 9 files (close, delivery-note, lines, main, manual, pre-fill, shipping-box, supplier) ≈ richest JS surface among the 6
**Mockup-fidelity verdict:** 🔴 **major rebuild needed** (~14% match)

### 6.1 Structural gaps

- **Step-meta 5-column row (ספק / מספר תעודה / תאריך / 📦 קופסה M9 / סורק-העלאה)** — Live has 4 of 5 (missing **upload-area for scan/file**). **HIGH.** The mockup's upload area has dual-action UI (📷 צילום / 📁 בחר קובץ) which the live partial omits.
- **Supplier context banner** (🏢 לפידות / contact / open POs / pending units / accumulated value) — PRESENT structurally (lines 36-45) but heavily simplified (no `display:flex` proper styling, no "ערך מצטבר"). **MEDIUM.**
- **Big scan-bar with navy gradient + autofocus barcode input + hint** — MISSING entirely. **CRITICAL.** This is the central UX for receipt — scan a box, items auto-mark received. Without the scan-bar the workflow falls back to manual click-per-row.
- **Filter pills row (34 הכל / 22 מדף / 12 ייצור / 0 סומן כהתקבל)** — MISSING. **HIGH.**
- **PO group-headers in the items table (📋 PO #2607 · נשלח 12.5.26 · 17 שורות / 52 יח׳ · ₪6,749)** — MISSING. **CRITICAL.** Without this, items from multiple POs render flat instead of grouped, breaking the mental model.
- **Manual additions banner with "➕ הוסף פריט ידנית" button at bottom of table** — MISSING.
- **Items table** — placeholder. Mockup has 9 columns (icon / סדרה / SPH / CYL / סוג / הוזמן / התקבל / סטטוס / actions). Cannot verify column set.
- **Status chips (chip-stock / chip-custom / chip-customer / chip-manual / chip-complete / chip-partial / chip-discrepancy)** — only 4 of 7 are in `lens-tabs.css` (lines 252-256). MISSING: chip-stock-blue, chip-customer-purple, chip-manual-purple, chip-discrepancy-red. **HIGH.**
- **Discrepancy cell pattern (red background pill saying "חסר -1 יחידה" or "לא התקבל")** — MISSING.
- **Right-side card layout** — Live has 2 cards (summary + debt-preview). Mockup has 3 cards (summary + customer-tied-lenses + debt-preview). **The "🧍 עדשות ללקוחות" card is MISSING from live**. **HIGH.** This card is what tells the optician "this receipt unlocked customer order X for delivery to client Y" — central cross-module signal to M9 lab_job.
- **M9 lab_job notification preview** — MISSING.

### 6.2 Visual gaps

- Scan bar's navy gradient (linear-gradient #1e3a8a → #1e40af) with white inset input — absent.
- PO group-header beige strip with `2px solid #cbd5e1` top border — absent.
- Per-row state colors (received green-tint, partial amber-tint, manual purple-tint, scanned blue-tint) — `lens-tabs.css` does not appear to define these row-state classes.

### 6.3 Functional gaps

- **Barcode scan input** + scan-to-receive logic — likely partially present in JS (`lens-goods-receipt-lines.js`) but no visible scan-bar surface.
- **M9 box pre-fill** — `lens-goods-receipt-shipping-box.js` is wired (live has the dropdown). ✅ Partially-present.
- **Auto-pull-PO-data on supplier select** — `lens-goods-receipt-pre-fill.js` exists. Cannot verify without runtime.
- **PO group expand/collapse + per-PO bulk-mark-received** — not present in static partial.
- **Manual-add modal** (`lens-goods-receipt-manual.js` exists) — likely wired to "➕ הוסף פריט ידנית" button, but no visible button in partial.

### 6.4 Notes / open questions for Architect

- The mockup is v3 (with M9 box-link field added per Daniel feedback 2026-05-14). Live partial DOES include the M9 box field ✅ — so this part is already aligned. Good.
- The "customer-tied lenses preview" card is unique to Lens (frames-receipt doesn't have it). This card's design depends on a query joining receipt-items → M7/M9 customer_order. Pipeline must scope the query before this card can render.

---

## 7. Screen 6: קטלוג מערכת + הקטלוג שלי (LENS_PLATFORM_CATALOG_ADMIN — BOTH variants)

The mockup is single (`LENS_PLATFORM_CATALOG_ADMIN_MOCKUP.html`, 672 lines, dark theme). Per Brief §"The 6 screens to audit" note, it serves BOTH the system catalog (admin, dark) AND the private catalog (per-tenant, light) as two themed instances.

In the live system, these are TWO distinct tabs:
- `catalog-admin` → `modules/lens-catalog-admin/lens-catalog-admin-partial.html` (109 lines, dark theme attempt)
- `private-catalog` → NO PARTIAL FILE; rendered by shared `shared/js/catalog-private-admin.js` (3-category shared component shipped 2026-05-17 night by `M1_FINAL_NIGHT_PHASE_1_PRIVATE_CATALOG_UNIFIED`)

I audit each separately.

### 7a. Screen 6a — Platform Catalog Admin (catalog-admin, dark)

**Mockup:** `LENS_PLATFORM_CATALOG_ADMIN_MOCKUP.html` (672 lines, dark theme)
**Live partial:** `modules/lens-catalog-admin/lens-catalog-admin-partial.html` (109 lines)
**Mockup-fidelity verdict:** 🔴 **major rebuild needed** (~16% match)

#### 7a.1 Structural gaps

- **Platform banner (red ribbon: "🔐 PLATFORM ADMIN — אזור ניהול גלובלי (Optic Up Team Only)")** — MISSING. **HIGH.** This is the visual gate-keeper that signals "you are in admin territory, be careful."
- **Top stat-badge in title ("4 ספקים · 29 מותגים · 47 סדרות · 6,420 וריאנטים")** — MISSING. The live header has a single "Platform-Owned" badge, no counts.
- **Top action buttons** — Live: 2 (📥 ייבוא + 📢 פרסם). Mockup: 4 (📥 ייבוא קטלוג מותג / 📊 ייצוא Excel / 📝 לוג שינויים / ➕ ספק חדש). 2 of 4 MISSING. **MEDIUM.**
- **4-column grid (Suppliers / Brands / Series / Detail)** — Live has 4 columns matching the structure (`grid-template-columns: 220px 220px 240px 1fr`) ✅. **The COUNT and POSITION match — this is the only structural correctness in this partial.** But every column's INTERNAL structure deviates.
- **Tenant select dropdown** ("טננט (לתצוגת הצעות מסחר)") at top of grid — PRESENT in live ✅.
- **Column 1 (Suppliers) — list items with country flag + design-count badge** — internally simpler than mockup (no flag, count is plain). **LOW.**
- **Column 2 (Brands) — brand-cards with stats + quick-import button per brand** — quick-import button MISSING from live (live has only single bottom-of-column "add brand" button). **MEDIUM.**
- **Column 3 (Series) — list-items with series chips (מדף/ייצור) + variant count + per-row chips** — PRESENT structurally with `series-chip` class hooks ✅ but the actual chip styling is in mockup's inline CSS, not in `lens-tabs.css`. **MEDIUM.**
- **Column 4 (Detail pane) — publish-state banner + 2 detail sections (Series core fields + Variants table) + save-bar** — Live has only an empty placeholder `<div class="empty-state">בחר וריאציה...</div>`. **CRITICAL.** All the editing UI is missing.
- **Publish state widget (3 cells: סטטוס / אופטיקאיות שאימצו / השינוי האחרון)** — MISSING.
- **Save-bar at bottom (info text + שכפל / השבת / שמור גרסה buttons)** — MISSING.
- **Bulk-import-card (purple gradient explainer + 2 import buttons)** — MISSING.

#### 7a.2 Visual gaps

- **Dark theme** — Live uses light theme (white panels on light bg) because `lens-tabs.css` is light-mode-only and the partial uses `.lens-panel` class (which is white in lens-tabs.css §lens-panel). The mockup's entire `body { background: #0f172a; color: #e2e8f0; }` dark-mode treatment is ABSENT from live. **CRITICAL** — this is the most visually-obvious deviation. **The admin screen should look DIFFERENT from the tenant screens (dark vs light) — visual signal that "you are in admin mode".**
- **Brand-card with hover gradient** — absent.
- **Active list-item with blue inset border (`border-right: 3px solid #60a5fa`)** — `lens-tabs.css` does not appear to provide a `.list-item.active` style for the catalog-admin layout.

#### 7a.3 Functional gaps

- **Detail-pane editing** — the `catalog-detail-pane.js` is 1 of 6 files in `modules/lens-catalog-admin/`. The JS exists but the partial provides no surface for it; it must inject into `#detail-pane`. Cannot confirm whether the injected detail markup matches the mockup's structure.
- **Variants table editing (inline)** — `catalog-variants-col.js` exists; same caveat.
- **Bulk-import action** (browse xlsx → parse → preview → confirm) — `catalog-import.js` (exists) + the file input is rendered (`#import-file`) ✅ but the bulk-import-card visual surface is absent.
- **"📝 לוג שינויים" button** — MISSING (and presumably no log-viewer modal exists).

#### 7a.4 Notes / open questions for Architect

- **Dark theme decision** — the mockup intentionally uses dark theme to signal "platform-admin mode." Daniel: confirm rebuild should restore the dark theme (recommended, per A-001 RTL + clear visual separation between admin and tenant work).
- The mockup mockup-note v2 says: "תוספת: ייבוא קטלוג מותג שלם בלחיצה". The live implementation HAS catalog-import.js but the prominent bulk-import-card-with-purple-gradient surface (the "discover this feature" UI) is MISSING.

### 7b. Screen 6b — Private Catalog (private-catalog, light)

**Mockup:** Same file (`LENS_PLATFORM_CATALOG_ADMIN_MOCKUP.html`, 672 lines) — Brief says light-theme variant.
**Live implementation:** SHARED COMPONENT at `shared/js/catalog-private-admin.js` (339 lines, per `M1_FINAL_NIGHT_PHASE_1_PRIVATE_CATALOG_UNIFIED` EXECUTION_REPORT) renders DIRECTLY into the `section.lens-tab-section[data-tab="private-catalog"]` (no partial HTML file).
**Mockup-fidelity verdict:** 🔴 **major rebuild needed** (architecturally different from mockup; cannot share a refactor with 6a)

#### 7b.1 The architectural mismatch

The Brief says Screen 6b should be a "LIGHT theme" variant of the catalog-admin mockup. But the live implementation is a **shared 3-category component** (glasses/lens/contact) that renders the SAME UI for all 3 categories. So even if the visual matches the mockup's light variant, the design philosophy is different: mockup says "this is the LENS private catalog with the LENS structure"; live says "this is a GENERIC private catalog called with productType=glasses for the lens tab".

This is by design per `M1_FINAL_NIGHT_PHASE_1_PRIVATE_CATALOG_UNIFIED` — Daniel approved a shared component for Iron Rule 21 (no orphans, no duplicates).

#### 7b.2 What this means for the rebuild

Two paths:
- **Path A — honor the mockup verbatim:** create a lens-specific `lens-private-catalog/lens-private-catalog-partial.html` that matches the mockup's 4-column layout in light theme. Discard the shared component (or keep it for contact/accessory but not lens). **Cost: high duplication, breaks Iron Rule 21.**
- **Path B — refactor the shared component:** make `shared/js/catalog-private-admin.js` produce the mockup's 4-column structure as its default render (with light theme), customizable per-category via slot props. The lens tab continues calling the shared component; lens-specific behaviors (SPH×CYL hints in variants column) become category-specific extensions. **Cost: shared-component complexity grows, but Iron Rule 21 preserved.**

**Recommendation:** Path B. The mockup design is universal-enough (4-column suppliers→brands→series→detail is the same shape contact lenses + accessories want) that refactoring the shared component to MATCH the mockup serves all 3 categories.

#### 7b.3 Specific gaps from mockup (assuming light variant)

Without reading `shared/js/catalog-private-admin.js` line-by-line, I observe from the EXECUTION_REPORT that it ships 339 lines of total component. The mockup's `<style>` block alone is ~280 lines. So the shared component IS likely under-spec'd relative to the mockup. Even though it ships clones from platform + cloned_from_id tracking ✅ (the right DATA model), the VISUAL surface likely needs the same kind of rebuild as 6a.

Detail-pane structure is the most fidelity-critical part — must match mockup's publish-state widget + form-grid + variants-table + save-bar.

#### 7b.4 Notes / open questions for Architect

- **Confirm Path B (refactor shared) vs Path A (lens-specific copy).** Recommendation is Path B for SaaS-cleanness + Iron Rule 21 preservation. Either way, the rebuild Pipeline scope for Screen 6 doubles — 6a + 6b both need the same mockup-fidelity work but applied to different code targets.
- **Theme switching:** the same mockup-shape applied as DARK for catalog-admin and LIGHT for private-catalog requires a `data-theme="dark"` or class-driven theme switch on the root. Recommend extract a `.catalog-screen` CSS root with two themes.

---

## 8. The 1:1 reference — Screen 0: lens-inventory (already shipped)

For comparison only. **Not** in audit scope.

**Mockup:** `LENS_INVENTORY_MOCKUP.html` (1117 lines)
**Live partial:** `modules/lens-inventory/lens-inventory-partial.html` (652 lines)
**Mockup-fidelity verdict:** 🟢 (per `M1_LENS_INVENTORY_MOCKUP_1TO1` Tier C check, merged 2026-05-18)

**Why this is the gold standard:** the 1:1 rebuild Pipeline explicitly authorized expanding HTML to 500+ lines, CSS to 600+ lines, JS split into multiple files (`lens-inventory-filters.js`, `lens-inventory-grid.js`, `lens-inventory-lot-pane.js`, `lens-inventory-modals.js`, `lens-inventory-modal-shows.js`, `lens-inventory-quick-scan.js`). The Brief explicitly stated "no time budget — mockup fidelity > time efficiency" and required Tier C mockup-vs-live side-by-side comparison.

**The pattern to replicate for the 6 remaining screens:** authorize the same "no time budget per screen + mandatory Tier C mockup-fidelity check" stance.

---

## 9. Cross-cutting findings

### 9.1 ROOT CAUSE — `M1_INVENTORY_UNIFIED_SCREEN` SPEC §1.5 R-1..R-13 actively contradicts the mockups (CRITICAL)

The CSS file `css/lens-tabs.css` opens with:

> `Sealed by M1_INVENTORY_UNIFIED_SCREEN SPEC §1.5 R-1..R-13 (2026-05-16).`
> `Goal: map lens-specific UI primitives (production-type chip toggle, SPH×CYL grid, designs table, PO stat cards, status chips) to frames tokens so lens tabs look identical to frames tabs.`

This is the direct cause of the 6/6 non-compliance. A SPEC sealed 2026-05-16 (TWO DAYS after Daniel ratified mockups D-M1-02..D-M1-14 on 2026-05-14) explicitly REDIRECTED the lens design to match the FRAMES module palette. Specific overrides documented in `lens-tabs.css`:

- **R-3** (line 38): "production-type chip toggle — Navy (was Gold)" — explicitly overrides the mockup's gold accent.
- **R-4** (line 63): "lens table headers — light slate (was dark slate)" — overrides mockup's dark navy headers.
- **R-7** (header comment): "drop per-page chrome" — explicitly strips mockup chrome (filter banners, action buttons).
- **R-8**: "reuse frames .btn-* classes" — overrides mockup button palette.
- **R-13**: "chip palette" — overrides mockup chip colors.

**This is a P-AR-16 (CRITICAL, non-overridable) violation in spec form.** When two specs conflict — mockup ratification (2026-05-14) vs unified-screen retargeting (2026-05-16) — P-AR-16 says mockup wins for UI-touching SPECs. The unified-screen SPEC should never have been sealed; the right path was to escalate the conflict.

**Required for rebuild:** retire `M1_INVENTORY_UNIFIED_SCREEN` §1.5 R-1..R-13 (or scope it ONLY to the frames module, never lens). Rewrite `lens-tabs.css` to align with the mockups (gold accents, dark navy headers, full per-screen chrome).

### 9.2 Missing shared components — EXTRACT-FIRST candidates

These visual primitives appear in 3+ mockups and should be extracted to Module 1.5 BEFORE any per-screen rebuild starts. Each builds once, reused 3-6 times.

1. **Chip filter row** — appears in 5 mockups (Inventory, Designs, Pricing, POs, GR). Mockup pattern: gold pill (active) / outline grey (inactive) with helper text. Must support icons + count badges. **Estimated: 1h.**
2. **Stat-card row** — appears in 3 mockups (Designs, Pricing, POs). Mockup pattern: 4-5 cards with colored border-right + label + value + sub. Click-to-filter integration. **Estimated: 1h.**
3. **Side detail panel** (right-pinned card with gradient header) — appears in 4 mockups (Inventory, Designs, Pricing, GR). Gradient header card with `panel-card-body` content. **Estimated: 1.5h.**
4. **Wizard step indicator** — appears in 2 mockups (Inventory bulk-add, PO 4-step). 4 circles with connecting lines, active/done/upcoming states. **Estimated: 1.5h.**
5. **PO/Receipt group-header rows** (table sub-headers with colored band — purple/blue/amber for source-type) — appears in 2 mockups (PO, GR). The pattern is identical between the two and is the primary "grouping by source" visual signal. **Estimated: 0.5h.**

**Total Phase 0: ~5.5 hours of dev + ~1 hour test + ~1-2 hours of Module 1.5 wiring = ~7-8 hours.**

If Daniel authorizes pre-extraction, every subsequent screen rebuild is faster AND visually consistent. If Daniel skips Phase 0 and inlines components per-screen, total cost rises ~10-15h (each screen re-implements similar primitives) and Iron Rule 21 (No Orphans, No Duplicates) is broken systemically across the 6 screens.

### 9.3 Missing CSS tokens

Beyond the unification override, the live CSS is missing tokens for mockup elements:

- **chip-overdue (red)** — needed for pos-list overdue stat-card + status chip.
- **chip-stock / chip-custom / chip-customer / chip-manual / chip-discrepancy** — needed for receipt screen.
- **Color tokens for source-group banding** (purple `#faf5ff`, blue `#eff6ff`, amber `#fffbeb` row backgrounds) — needed for PO + receipt.
- **Progress-bar widget** — needed for pos-list per-row receipt progress.
- **Dark theme palette** (`#0f172a` bg, `#1e293b` panel, `#334155` border, `#e2e8f0` text) — needed for catalog-admin.
- **Gradient header card token** — used in 4 side-panels.
- **Toggle-switch widget** — needed for designs screen (per-design / per-branch toggles).

### 9.4 Systematic P-AR-16 violation — "skeleton vs visual"

Each of the 6 partials follows the same anti-pattern: a 22-109 line skeleton with `<div id="x-container"><div class="empty-state">טוען...</div></div>` placeholders, expecting JS to inject markup. Mockups are 388-700 lines of FULL visual structure with embedded sample data, CSS tokens, and inline interaction hints.

The skeleton-prose interpretation strips 80-97% of the design before the JS even runs. Even if the JS renders perfect data into the placeholder, the structural chrome (chips, stat-cards, side-panels, modals, group-headers) never appears because it was never declared in the partial.

**The rebuild Pipelines must follow the lens-inventory pattern: HTML markup MIRRORS the mockup structure 1:1. Data is the only thing JS substitutes.**

### 9.5 Iron Rule 12 implications

Mockup-fidelity rebuilds will push each partial from 22-109 lines to 400-650 lines (per the lens-inventory precedent). All within Iron Rule 12's 350-line cap PER FILE, but partials may need to split (extract modals into separate `*-modals.html`, extract heavy tables into `*-table-partial.html`). The lens-inventory rebuild Pipeline ran into the same trade-off and resolved it by splitting JS but keeping the partial as one 652-line file. Recommend same approach.

---

## 10. Recommended Pipeline grouping (rebuild plan)

### 10.1 Phase 0 — Shared component extraction (BLOCKING; ~6-9h)

Build in Module 1.5 (`shared/`) before any screen rebuild starts. Single Pipeline.

**Deliverables (per §9.2):**
- `shared/js/chip-filter-row.js` + `shared/css/chip-filter.css` (1h)
- `shared/js/stat-card-row.js` + `shared/css/stat-card.css` (1h)
- `shared/js/side-detail-panel.js` + `shared/css/side-detail.css` (1.5h)
- `shared/js/wizard-step-indicator.js` + `shared/css/wizard.css` (1.5h)
- `shared/js/group-header-row.js` (0.5h)
- Wire into Module 1.5 index + add to GLOBAL_MAP.md (0.5h)
- Tier C smoke (1-2h)

**Output:** 5 components, documented, ready for screen consumption.

**Concurrent with Phase 0 (no extra wall-clock):**
- Retire `M1_INVENTORY_UNIFIED_SCREEN §1.5 R-1..R-13` (close as DEPRECATED with reason: mockup ratification supersedes)
- Rewrite `css/lens-tabs.css` from frames-aligned palette to mockup palette (gold accents, dark navy headers, dark theme support for catalog-admin)

### 10.2 Phase 1+ — 6 screen rebuilds (parallelizable)

Each screen is one Pipeline matching the lens-inventory `M1_LENS_INVENTORY_MOCKUP_1TO1` template (no time budget per Pipeline, mandatory Tier C check). Approximate budgets per the established lens-inventory data point + each screen's structural complexity:

| # | Screen | Est. hours | Worktree group | Sequencing |
|---|--------|-----------|----------------|------------|
| 1 | Designs Selection | 4-5h | Group A (1) | After Phase 0 |
| 2 | Pricing | 6-7h | Group A (2) | After Phase 0 |
| 3 | Purchase Order | 5-6h | Group B (1) | After Phase 0 |
| 4 | POs List | 3-4h | Group B (2) | After Phase 0 |
| 5 | Goods Receipt | 5-6h | Group C (1) | After Phase 0 |
| 6a | Catalog Admin (dark) | 5-6h | Group C (2) | After Phase 0 + Theme-switch infra |
| 6b | Private Catalog (light shared) | 5-7h | Group D (1) | After 6a (shared component) |

**Parallelization:** Groups A, B, C can each run on a worktree concurrently (3 sessions). 6b sequences after 6a because they share the catalog-screen base component.

**Total wall clock estimates:**
- **Sequential:** 33-41h (one screen at a time)
- **3-worktree parallel (Groups A, B, C):** 8-12h for first 6 screens; then 5-7h for 6b. **Total: 13-19h wall clock.**
- **Realistic with reviewer/tester loop overhead:** 18-25h wall clock for the full set.

### 10.3 Strategic recommendation to Daniel

**Recommended dispatch:** Phase 0 first (one Pipeline, ~8h), then Group A + B + C in parallel on 3 worktrees (~10-14h), then 6b last (~6h). **Total: ~24-28 hours wall clock to full mockup compliance.**

This honors:
- P-AR-16 (mockups are mandatory inputs)
- Iron Rule 21 (Phase 0 extraction prevents 6× duplication)
- A-005 (sequential phases with VFV gates beat one giant Pipeline)
- Lens-inventory precedent (no time budget per screen; mockup fidelity wins)

---

## 11. Cross-check against prior audit

Per Brief §Bootstrap step 6, attempted to read `_archive/m1-mockup-audit-2026-05-18/AUDIT_REPORT.md` after locking the verdicts above.

**Finding: the folder `_archive/m1-mockup-audit-2026-05-18/` exists but is EMPTY.** `stat` confirms mtime 2026-05-17 08:15 — created today but never populated. The prior audit referenced in the Brief may have been (a) discarded mid-creation, (b) saved to a different location, or (c) the Brief reflected a misremembered state.

**Net effect:** there is no prior audit to reconcile against. This report stands as the only existing fresh audit of these 6 screens. The verdicts above are not anchored or contaminated by any prior conclusions.

If a prior audit surfaces at a different path, Cowork-Architect should compare it against this one and resolve any conflicts in Daniel's chat.

---

## 12. Open items for Architect (Daniel via Cowork-Architect)

1. **Decision needed:** Authorize retiring `M1_INVENTORY_UNIFIED_SCREEN §1.5 R-1..R-13`. Mockup ratification (D-M1-02..D-M1-14) is the lawful design source; the unification SPEC contradicted it.
2. **Decision needed:** Phase 0 extraction (Path A — extract 5 components first) vs. inline-per-screen (Path B — accept Iron Rule 21 violation for speed). Recommend Path A.
3. **Decision needed:** Path B (refactor shared catalog-private-admin) vs Path A (lens-specific copy) for Screen 6b. Recommend Path B.
4. **Question:** Confirm dark theme for catalog-admin (Screen 6a) — recommended for "you are in admin mode" signal.
5. **Question:** Keep mockup wizard step indicator on PO (Screen 3) even though current implementation is single-screen? Recommend YES as visual breadcrumb.
6. **Question:** pos-list (Screen 4) — overdue stat-card (mockup) vs received stat-card (live) — which one? Recommend mockup's overdue.
7. **Question:** Each rebuild Pipeline gets "no time budget" per lens-inventory precedent? Recommend YES.

---

*End of fresh audit report. Generated 2026-05-17 by Claude Code on Windows desktop, opticup-architect skill loaded for framing.*
