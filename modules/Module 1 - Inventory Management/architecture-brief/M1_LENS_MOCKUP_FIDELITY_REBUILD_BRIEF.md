# M1 Lens — Mockup Fidelity Rebuild (Honor the 5 Approved Mockups)

**Author:** opticup-architect (Cowork, 2026-05-18 morning)
**Owning module:** Module 1 — Inventory Management
**Type:** UI rebuild to match user-approved mockups
**Mode:** Multi-phase Full Auto Pipeline with mandatory per-screen mockup-fidelity gate
**Estimated duration:** 12-18 hours (sequential per-screen rebuild + verification)

**Predecessors:**
- M1 lens department functionally live as of 2026-05-18 morning
- 5 approved mockups exist at `modules/Module 1 - Inventory Management/architecture-brief/mockups/` (ratified by Daniel via decisions D-M1-02 through D-M1-14 on 2026-05-14)
- Audit on 2026-05-18 morning revealed 124 gaps between mockups and live UI (9 CRITICAL + 27 HIGH + 60 MEDIUM + 28 LOW)

**Source:**
- Daniel discovered the gap during manual demo verification 2026-05-18 morning ("איך זה הגיע למצב הזה?!")
- Decision codified as P-AR-16 (CRITICAL, non-overridable): mockup files are MANDATORY Brief inputs going forward
- Pending entry `2026-05-18_mockup_fidelity_mandate.md` applies P-AR-16 to skill files in Phase 5 of this Pipeline

---

## 1. Purpose

The M1 lens UI must match the 5 user-approved mockups. Today it shares the structural skeleton but lacks the design fidelity Daniel ratified.

This Pipeline rebuilds the 7 lens tabs (lens-inventory, lens-active-designs, lens-pricing, lens-purchase-order, lens-pos-list, lens-goods-receipt, lens-catalog-admin) plus the private catalog component to match their mockups visually + structurally.

Strict mode: per P-AR-16 + new Tester Tier C Mockup Fidelity Check, each screen MUST pass side-by-side Chrome MCP comparison before its Phase closes 🟢. No drift on CRITICAL or HIGH elements.

---

## 2. Mandatory Mockup Inputs (per P-AR-16)

The Executor MUST read ALL these files BEFORE writing any code:

| # | Mockup | Path | Decision |
|---|--------|------|----------|
| 1 | Lens Inventory | `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_INVENTORY_MOCKUP.html` | D-M1-02 |
| 2 | Active Designs Selection | `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_DESIGNS_SELECTION_MOCKUP.html` | D-M1-03 |
| 3 | Catalog & Pricing | `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_PRICING_MOCKUP.html` | D-M1-04 |
| 4 | Purchase Order | `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_PURCHASE_ORDER_MOCKUP.html` | D-M1-07 |
| 5 | Goods Receipt (v3) | `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_GOODS_RECEIPT_MOCKUP.html` | D-M1-14 |
| 6 | Platform Catalog Admin | `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_PLATFORM_CATALOG_ADMIN_MOCKUP.html` | D-M1-06 (sketch) |
| 7 | Active POs List | `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_ACTIVE_POS_LIST_MOCKUP.html` | D-M1-08 (sketch) |

**Audit report** (basis for this rebuild): the 2026-05-18 Cowork audit identified 124 gaps. Re-run the audit during Pre-flight to get current state (in case anything was already fixed). Output as `_archive/m1-mockup-audit-2026-05-18/AUDIT_REPORT.md`.

---

## 3. Phased Rebuild Structure

7 Phases, one per screen. Each Phase:
1. Re-reads the corresponding mockup at the start
2. Rebuilds the live HTML partial + JS module + CSS to match
3. Runs Tier C VFV with Mockup Fidelity Check
4. Returns 🟢 only when fidelity check shows zero CRITICAL/HIGH drift

**Time-budget rule:** if session approaches 4-hour mark, close cleanly at next Phase boundary. Daniel restarts new session for remaining Phases. Phases must be completable independently (no cross-Phase dependencies).

**Priority order (highest user impact first, in case session terminates early):**

```
Phase A — Lens Inventory (CRITICAL — core daily workflow)
   ↓ fidelity gate
Phase B — Catalog Admin + Private Catalog Visual Inheritance (CRITICAL — admin work + the gap Daniel just flagged)
   ↓ fidelity gate
Phase C — Purchase Order (CRITICAL — source-split visibility for buyers)
   ↓ fidelity gate
Phase D — Goods Receipt (HIGH — source-split + M9 box linkage)
   ↓ fidelity gate
Phase E — Pricing (HIGH — 3-column structure, bulk actions)
   ↓ fidelity gate
Phase F — Active Designs Selection (HIGH — stats banner, brand grouping)
   ↓ fidelity gate
Phase G — Active POs List (MEDIUM — stats filtering)
   ↓ fidelity gate
Phase H — Apply pending entry (P-AR-16 + Tier C Mockup Fidelity Check) to skill files
   ↓ verification
Foreman Close
```

---

## 4. Per-Phase Scope Details

### Phase A — Lens Inventory

**Mockup:** LENS_INVENTORY_MOCKUP.html

**Key elements per mockup (re-verify during Phase A pre-flight):**
- Page header with Hebrew title "ניהול מלאי עדשות" + status badge
- Filter strip: production_type chips (Stock/Custom toggle) + Brand → Design → Variant cascading selects + sticky toolbar
- Main content: SPH × CYL grid (13 columns: SPH header + 12 CYL values) with qty cells
- Side panel: lot details + qty controls (➕/➖ buttons with PIN gate)
- Bottom tabs: תנועות מלאי / מחירים / התראות / ניתוח
- Color scheme: gold (#c9a555) primary accent + dark navy headers

**Build:** rewrite `modules/lens-inventory/lens-inventory-partial.html` + `lens-inventory.js` + lens-tabs.css sections relevant to inventory.

### Phase B — Catalog Admin + Private Catalog Visual Inheritance

**Two screens, same design system per Daniel's 2026-05-18 decision:**

1. **Platform Catalog Admin** (admin only, dark theme)
   - Mockup: LENS_PLATFORM_CATALOG_ADMIN_MOCKUP.html
   - Build: `modules/lens-catalog-admin/`

2. **Per-tenant Private Catalog** (CEO/branch_manager, **light theme — Daniel decision**)
   - Inherit ALL structural + behavioral elements from the admin mockup
   - Only difference: lighter color palette (background, text, accents) so it reads as "your own catalog" not "platform admin"
   - Build: `shared/js/catalog-private-admin.js` (existing component — refactor to match)
   - The component already exists from prior Pipeline; this Phase makes it match the admin mockup's 4-column drill-down + side detail panel

**Both screens share:**
- 4-column drill-down: Suppliers → Brands → Series → Details
- Bulk import card for catalog upload
- Side detail panel showing variants table + publish state
- Platform admin: "🔐 PLATFORM ADMIN" banner (dark version)
- Private admin: "📚 הקטלוג שלי" header (light version)

### Phase C — Purchase Order

**Mockup:** LENS_PURCHASE_ORDER_MOCKUP.html

**Key elements:**
- Wizard 4-step indicator (active/done/pending states)
- Items table with **source-split categorization** (3 sections — CRITICAL gap from audit):
  - Custom-per-customer (auto from M7)
  - Stock-shortage (auto from inventory thresholds)
  - Manual additions
- Supplier info card on right panel (supplier name, payment terms, last order, contact)
- Order summary card (qty totals, value totals, VAT)

**Build:** rewrite `modules/lens-purchase-order/lens-purchase-order-partial.html` + `lens-purchase-order.js`.

### Phase D — Goods Receipt

**Mockup:** LENS_GOODS_RECEIPT_MOCKUP.html (v3 — with M9 box linkage)

**Key elements:**
- Supplier-first filter (emphasized select at top of page)
- M9 box linkage field (purple accent, optional, hint text "📦 קופסה נכנסת מ-M9")
- Items table with **source-split sections** (same 3 groupings as PO)
- Filter pills with item counts (סינון מהיר: All / Custom / Stock / Manual)
- Customer-tied lenses card on right panel (shows which receipt lines are for specific customers)

**Build:** rewrite `modules/lens-goods-receipt/lens-goods-receipt-partial.html` + `lens-goods-receipt.js`.

### Phase E — Pricing

**Mockup:** LENS_PRICING_MOCKUP.html

**Key elements:**
- Top tabs: מחירים פעילים / ממתינים / מבצעים / היסטוריה
- 3-column table: catalog price | discount% | final retail price (CRITICAL — explicit columns, not just placeholder)
- Inline edit on discount + final price (permission-gated)
- Bulk toolbar: select multiple rows → apply discount/markup (3.4 feature)
- Series-level grouping with inherit/override mechanics
- Approval card on right panel (pending supplier price changes awaiting review)
- Currency tags + status badges

**Build:** rewrite `modules/lens-pricing/lens-pricing-partial.html` + `lens-pricing.js`.

### Phase F — Active Designs Selection

**Mockup:** LENS_DESIGNS_SELECTION_MOCKUP.html

**Key elements:**
- Stats banner (4 cards at top: סדרות פעילות / וריאנטים פעילים / סדרות פרטיות שלי / סך וריאנטים)
- Brand-grouped rows with expand/collapse (Hoya, Essilor, Zeiss, ... + "פרטיות שלי" group at the end)
- Toggle switch per design row for activation
- Side panel detail card: variants table + activation history

**Build:** rewrite `modules/lens-active-designs/lens-active-designs-partial.html` + `lens-active-designs.js`.

### Phase G — Active POs List

**Mockup:** LENS_ACTIVE_POS_LIST_MOCKUP.html

**Key elements:**
- Stat cards (All / Draft / Sent / Partial / Overdue) acting as filters
- Table columns: PO# / Supplier / Order Date / Delivery Date / Status / **Type** (source-split badge) / Rows / **Received %** (progress bar) / Value / Actions
- Overdue rows highlighted in red
- Quick action buttons per row (view / edit / cancel)

**Build:** rewrite `modules/lens-pos-list/lens-pos-list-partial.html` + `lens-pos-list.js`.

### Phase H — Apply skill pending entries

Apply `_archive/architect-pending-entries/2026-05-18_mockup_fidelity_mandate.md`:
1. opticup-architect SKILL.md — P-AR-16
2. opticup-strategic SKILL.md — Mockup Fidelity §7 template
3. opticup-localhost-tester SKILL.md — Tier C Mockup Fidelity Check
4. opticup-architect references/decisions/M1.md — 2026-05-18 decision entry

Verify markers via grep + delete the pending entry file. Commit message: `chore(skills): apply P-AR-16 Mockup Fidelity Mandate to 3 skill files + M1 decisions log`.

---

## 5. Per-Phase Tier C VFV with Mockup Fidelity Check

For each Phase A-G, the Tester MUST:

1. Open the mockup file in Chrome MCP (tab 1) at 1920×1080
2. Open the live URL in Chrome MCP (tab 2) at 1920×1080  
3. Capture screenshots of both
4. Side-by-side comparison
5. List every material visual difference
6. Classify each as INTENTIONAL DEVIATION or DRIFT
7. Compute fidelity verdict per opticup-localhost-tester SKILL.md updated section

**Phase closes 🟢 only when:**
- 0 CRITICAL drift items
- 0 HIGH drift items
- MEDIUM drift items either fixed OR documented as TECH_DEBT with explicit reason
- Functional VFV (per existing Tier C) also passes

**If any DRIFT on CRITICAL/HIGH:** Phase loops back to Executor for fix, then re-VFV. Max 2 fix attempts per Phase. After that → Tier 3 deferral (Phase logged as 🟡 for next-session followup, Pipeline continues to next Phase).

---

## 6. Iron Rule Compliance

Standard:
- Rule 1, 12, 14, 15, 18, 19, 21, 22, 31, 32 — all enforced
- No new DB tables, no new RPCs (this is pure UI rebuild)
- All work on develop

---

## 7. Destructive Operations (Iron Rule 32)

Declared:

1. **Rewrite of 7 partial HTML files** (lens-inventory, lens-active-designs, lens-pricing, lens-purchase-order, lens-pos-list, lens-goods-receipt, lens-catalog-admin)
2. **Rewrite of 7 JS modules** (corresponding files)
3. **Modification of `shared/js/catalog-private-admin.js`** to match admin mockup structure with light theme
4. **Modification of CSS** (lens-tabs.css + any per-screen CSS files) to apply mockup styles
5. **Apply skill updates** (Phase H — 3 skill files + 1 decisions log)
6. **`git rm` of consumed pending entry** at Phase H end
7. **`git tag` × 8** — pre-Phase tag per A-H + master `pre-m1-lens-mockup-fidelity-2026-05-18`

**NOT authorized:**
- Any DB write (no schema, no data)
- Any RPC change
- Any permission key change
- Touching main branch
- Force-push, rebase outside Tier 5
- Modifying Prizma data
- Modifying mockup files (they ARE the spec; don't drift the spec to match the build)

---

## 8. Success Criteria

🟢 Pipeline overall when:

1. ALL 7 Phases close with 0 CRITICAL/HIGH drift in fidelity check
2. Side-by-side screenshots in `_archive/m1-mockup-fidelity-2026-05-18/` for each of 7 screens
3. The private catalog component visually inherits from the admin mockup with light theme
4. Phase H applies all 4 skill updates + deletes the pending entry
5. Smoke 7/7 PASS at every Phase boundary
6. Iron Rule 31 integrity gate exit 0 every commit
7. Prizma row-count delta = 0 (this Pipeline doesn't touch DB)
8. Pre-existing seeded demo data preserved (Hoya/Zeiss/private brands still visible)
9. All commits pushed to develop
10. Morning summary written + Daniel's manual-verification checklist

🟡 Acceptable if 1-2 lower-priority Phases (E/F/G/H) deferred due to time budget — provided Phase A/B/C/D all 🟢.

🔴 If Phase A or B fails to close 🟢 within Pipeline session OR Prizma data touched.

---

## 9. Pre-Flight (mandatory before Phase A Commit 1)

1. Re-run the mockup-vs-live audit (Explore agent) to confirm gaps haven't changed since 2026-05-18 morning audit. Save as `_archive/m1-mockup-audit-2026-05-18/AUDIT_REPORT.md`.
2. Concurrency guard — only this CLI session active
3. Smoke 7/7 baseline PASS
4. Both localhost servers reachable
5. Capture Prizma row-count snapshot
6. Read ALL 7 mockup files (per P-AR-16 mandate) before Phase A SPEC authoring
7. `git tag pre-m1-lens-mockup-fidelity-2026-05-18` before any commit

If any pre-flight reveals divergence → escalation + STOP. Do not proceed silently.

---

## 10. Autonomous Decision Authority

The Pipeline MAY decide internally:

1. **Implementation specifics for matching mockup designs** — when the mockup is unambiguous, build to it; document choice in EXECUTION_REPORT
2. **CSS organization** — extend existing `lens-tabs.css` OR create per-screen CSS files; pick whichever yields cleaner separation
3. **Animation/transition decisions** — match mockup if specified; default to existing project conventions otherwise
4. **Component extraction** — if a UI primitive appears in 3+ screens (e.g., source-split section, side detail panel), extract to a shared module in `shared/js/` per Iron Rule 21 + Daniel's pattern C-002

**Background processes legitimate** per prior briefs §9.2 — Sentinel cron, Watcher, Desktop spawns.

**Escalate to Daniel ONLY for:**
- A mockup is ambiguous on a decision Daniel hasn't made (Brief author missed it) — write escalation, propose interpretation, halt
- Iron Rule 31 fails repeatedly
- Demo becomes unusable
- A mockup decision contradicts an Iron Rule (e.g., mockup shows enum dropdown for a value that should be a config table per Rule 19) — escalate for decision

---

## 11. Hebrew Morning Summary Template

```
🌅 בוקר טוב, דניאל.

ריצת תיקון נאמנות מוקאפים הסתיימה [🟢/🟡/🔴]. משך: [hh:mm].

שלב A (מלאי עדשות): [status] — drift items: 0 / [N]
שלב B (קטלוג אדמין + פרטי): [status] — drift items: 0 / [N]
שלב C (הזמנת רכש): [status]
שלב D (קבלת סחורה): [status]
שלב E (מחירים): [status]
שלב F (דגמים פעילים): [status]
שלב G (רשימת הזמנות): [status]
שלב H (סקילים — P-AR-16): [status]

נאמנות למוקאפים: [✅ כל המסכים תואמים / ⚠️ N מסכים עם תיעוד חוב טכני]
דמו: כל הנתונים מאתמול נשמרו (Hoya + Zeiss + פרטי).
פריזמה: ללא נגיעה (delta = 0).

צילומי השוואה: _archive/m1-mockup-fidelity-2026-05-18/[screen]_side_by_side.png

[אם דרושה פעולה ממך: שורה. אחרת: "כל המסכים תואמים את מה שאישרת. מוכן לבדיקה ידנית."]
```

---

*End of Brief. Mandatory mockup inputs per P-AR-16. Tier C Mockup Fidelity Check per Tester SKILL update. 7 sequential per-screen Phases + skill updates. Iron Rule 32 §Destructive Operations declared. No DB writes. Demo data preserved. Background processes legitimate.*
