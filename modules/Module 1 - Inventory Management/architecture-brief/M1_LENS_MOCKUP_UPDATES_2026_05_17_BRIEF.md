# BRIEF — M1 Lens Mockup Updates (pre-rebuild, 2026-05-17)

**For:** Claude Code session on Daniel's Windows desktop. Can be same session as the audit Pipeline or a new one.

**Type:** Update existing mockup HTML files + add 1 short architecture note. NO code changes outside `architecture-brief/`. NO commits to live source files.

**Estimated wall clock:** 45-75 min.

**Why this Brief exists:** Daniel reviewed the audit report (commit 9085c02) and approved scope. Three feature additions surfaced during Q&A that need mockup updates BEFORE the rebuild Pipelines dispatch. The visual decisions need to be drawn into mockups so the rebuild executor can implement to 1:1 fidelity per Pattern P-AR-16.

---

## Bootstrap

1. Load skill `opticup-executor`.
2. Standard First Action — confirm desktop, repo, branch develop, pull latest.
3. Read these in order:
   - `modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_MOCKUP_AUDIT_2026_05_17_REPORT.md` (the audit context)
   - `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_INVENTORY_MOCKUP.html` (file you'll update — 1117 lines)
   - `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_PRICING_MOCKUP.html` (file you'll update — 472 lines)
   - `.claude/skills/opticup-architect/references/decisions/CROSS.md` for Pattern P-AR-16 (Mockup Fidelity Mandate)

---

## Daniel's decisions (16 total — for context)

Sealed by Cowork-Architect 2026-05-17 evening:

1. Retire `M1_INVENTORY_UNIFIED_SCREEN §1.5 R-1..R-13` (lens CSS retargeting). Rewrite `lens-tabs.css` to mockup palette.
2. Phase 0 mandatory: 5 shared components in Module 1.5 BEFORE any screen rebuild.
3. Recurring patterns (tables, etc.) → extract to `shared/` to avoid 20× rework.
4. Catalog screens 6a + 6b = ONE shared component with `theme` prop (`dark`/`light`) + `scope` prop (`global`/`tenant`).
5. 6a admin = dark theme. 6b "הקטלוג שלי" = light theme + scope=tenant + identical tooling otherwise.
6. Keep wizard 4-step indicator on PO (visual breadcrumb).
7. "Overdue" stat-card on POs list (per mockup, not "received").
8. No time budget per screen Pipeline — mockup fidelity wins.
9. **NEW — Quick Receipt drawer in inventory screen.** Adds receive-into-stock flow to inventory without removing the dedicated goods-receipt screen. Two entry points: scanner + manual add → both open the drawer, not direct-to-stock.
10. **NEW — Catalog "הקטלוג שלי" is 1:1 visual clone of admin catalog.** Light theme only difference. All tools (add/edit/delete/search/filters) identical, scoped to tenant's own catalog.
11. **NEW — Price columns in inventory screen.** "מחיר מכירה" always visible. "מחיר עלות" gated by permission `inventory.view_cost_price` (admin only).
12. **NEW — Catalog & Pricing screen gets 2 view modes.** Edit mode (admin/manager) = as currently planned. Read-only mode (worker) = flat sortable list with quick filters, shows all lenses in tenant's catalog regardless of stock presence.
13. **NEW — Column permission flexibility.** Every column in inventory/catalog tables is `permissions`-gated. Cost-price column is the first instance. Future: discount columns, supplier columns, etc.
14. **NEW — Delivery note number mandatory on inventory entry.** Every receipt into stock (Quick Receipt drawer + existing scanner + manual add) must capture `delivery_note_number` (TEXT). Checkbox "אין תעודה" sets `has_no_invoice=TRUE` flag for manager audit reports.
15. **NEW — Bulk receive in Quick Receipt drawer.** User scans/adds N lenses, enters delivery note + supplier ONCE, all N receive same metadata in audit trail. Don't force per-item delivery note.
16. **NOT IN SCOPE — Invoice Inbox screen.** Future screen for matching scanned invoice documents to receipts. This Pipeline only ensures DB schema supports it (`delivery_note_number` + `supplier_id` + `has_no_invoice` already there per decision 14). Placeholder note required.

---

## Deliverable 1 — Update `LENS_INVENTORY_MOCKUP.html`

### 1.1 — Add price columns to the main stock table

Currently the inventory table shows columns like חברה / קוטר / SPH/CYL / כמות / actions. Need to add:

- **`מחיר מכירה`** (sale price) — TEXT column, formatted `₪ X,XXX`, always visible.
- **`מחיר עלות`** (cost price) — TEXT column, formatted `₪ X,XXX`, **gated by `permissions.inventory.view_cost_price`** (admin only). Use a CSS class `.col-permission-gated` + data attribute `data-permission="inventory.view_cost_price"` on `<th>` + `<td>` so the JS layer (downstream rebuild Pipeline) can hide/show based on session permissions.

Place the price columns between SPH/CYL and כמות. Sample rows: 3 with both columns shown, 1 with cost-price column hidden (commented as "this row visible to worker — admin sees cost too") to make the permission gating visually obvious to the rebuild executor.

### 1.2 — Add Quick Receipt drawer (right-pinned panel)

Currently the inventory mockup has a scanner area + manual-add area. Need to add a **right-pinned drawer** (initially hidden) that opens when:
- User scans a barcode AND the barcode matches an open PO line, OR
- User clicks the existing "הוסף ידנית" button, OR
- User clicks a new explicit button "קבל סחורה" near the scanner

**Drawer structure (use existing mockup colors — gold accent, white bg):**

```
[drawer header — sticky top]
  title: "קבלת סחורה למלאי"
  close button (×)

[drawer body]
  Section A — פרטי תעודה (collapses after 1st item; defaults open):
    - מספר תעודת משלוח [text input — required unless checkbox below]
    - ☐ אין תעודה (checkbox — when checked, disables the text input + shows red helper text "ייסומן בדוח החריגים")
    - ספק [searchable dropdown — required]
    - תאריך קבלה [date input — defaults today]

  Section B — פריטים שנוספו לקבלה הזו:
    - empty state: "סרוק או הוסף ידנית פריטים. כל הפריטים שתוסיף יקושרו לפרטי התעודה למעלה"
    - non-empty: list of cards, each card shows:
      - שם עדשה (חברה + סדרה + קוטר + SPH/CYL)
      - כמות [number input, defaults 1, +/- buttons]
      - delete button (×) to remove from this receipt session
    - sample: show 3 cards populated to make the pattern obvious

  [drawer footer — sticky bottom]
    [סיים קבלה] gold button — submits whole receipt session (1 delivery note + supplier + N items)
    [ביטול] outline button — closes drawer, items lost
```

### 1.3 — Add a comment block near the drawer explaining the bulk flow

```html
<!--
  Bulk Receipt Flow (per Daniel decision #15):
  - User opens drawer
  - User scans/adds N items (each item gets staged in Section B)
  - User fills delivery_note_number + supplier_id ONCE in Section A
  - On "סיים קבלה": all N items receive same delivery_note_number + supplier_id + receipt_date in their audit trail
  - DB schema: each item gets its own stock entry, but delivery_note_id (TEXT) is shared across all
  - has_no_invoice (BOOLEAN) is set per delivery_note when "אין תעודה" was checked
-->
```

### 1.4 — Modify the existing scanner + manual-add areas

The existing scanner UI + manual-add UI in the inventory mockup should NOT add directly to stock anymore. Instead:
- Scanner: scanning a barcode adds the item to Section B of the Quick Receipt drawer (auto-opens drawer if closed)
- Manual-add button: opens drawer to Section B with empty form fields ready for the new item

Add a small note at each existing entry point:
```html
<!-- This entry adds to Quick Receipt drawer staging (Section B), NOT directly to stock. -->
```

---

## Deliverable 2 — Update `LENS_PRICING_MOCKUP.html`

### 2.1 — Add view-mode toggle at the top of the screen

Just below the main title, add a **tab row** (similar to existing tab patterns in mockup):

```
[ עריכה ]   [ צפייה ]
   ↑          ↑
admin/mgr   worker default
```

Style the toggle as a 2-button pill switch. Default-active depends on permission (rebuild executor implements; mockup shows both states inline via two parallel sections — see 2.2 + 2.3).

### 2.2 — Edit mode section (keep existing)

Everything currently in the mockup IS the edit-mode view. Keep it. Add a wrapper `<section data-view-mode="edit">` around it.

### 2.3 — Add Read-only mode section (NEW)

Add a new `<section data-view-mode="readonly">` (initially hidden in mockup, but draw it inline below the edit section so reviewers can see both) containing:

**Layout:**
- Compact filter row at top: חברה (dropdown) / סוג עדשה (dropdown) / קוטר (dropdown) / SPH (range) / CYL (range) / חיפוש (text input). Mockup-fidelity: use the chip-filter component pattern from `LENS_INVENTORY_MOCKUP.html`.
- **Flat sortable table** below. Columns:
  - חברה
  - סדרה (sub-brand / design)
  - סוג (single vision / progressive / etc.)
  - קוטר
  - SPH
  - CYL
  - מחיר מכירה (always visible)
  - מחיר עלות (gated by `permissions.lens_pricing.view_cost_price`)
  - הנחה (always visible)
  - כמות במלאי (always visible — shows 0 in grey if not in stock; bold number if in stock)

Sample data: 10-12 rows including a mix of "in stock" and "not in stock". Visually distinguish the not-in-stock rows with subtle muted text color (existing Prizma muted color `#94a3b8` is fine).

### 2.4 — Comment block explaining the dual-mode pattern

```html
<!--
  Dual View Mode (per Daniel decision #12):
  - Edit mode: admin/manager — bulk pricing tools, approval flow, hierarchy
  - Read-only mode: worker — flat sortable list with quick filters
  - Permission gating: permissions.lens_pricing.edit → defaults to edit mode
                       otherwise → defaults to readonly
  - User with edit permission can still switch to readonly via the toggle (e.g., to use it as a sales reference)
  - DB query is identical; only presentation changes
-->
```

---

## Deliverable 3 — Add `INVOICES_INBOX_PLACEHOLDER.md` (architecture note, NOT a mockup)

Create new file:
```
modules/Module 1 - Inventory Management/architecture-brief/INVOICES_INBOX_PLACEHOLDER.md
```

Contents:

```markdown
# Invoices Inbox — Placeholder Note (NOT in current rebuild scope)

**Status:** future screen — out of scope for M1 lens mockup rebuild Pipeline (2026-05-17).

## Purpose

Eventually: a dedicated screen for the bookkeeper to scan/upload all incoming invoice documents (delivery notes + supplier invoices) and match them to receipts that were captured in inventory/goods-receipt screens.

Workflow:
1. Receipt flow (in inventory + goods-receipt screens) — captures `delivery_note_number` TEXT + `supplier_id` + `has_no_invoice` BOOLEAN per receipt session
2. **(future) Invoices Inbox screen** — bookkeeper scans/uploads invoice documents (PDF/image) into a queue
3. **(future) Matching tool** — links each invoice document to the corresponding receipts via `delivery_note_number` match
4. **(future) AI assist** — once we have enough labeled data, AI auto-matches and the bookkeeper just confirms

## DB schema requirements (must be in place during M1 lens rebuild)

Every receipt-into-stock event must capture:
- `delivery_note_number` TEXT
- `supplier_id` UUID REFERENCES suppliers(id)
- `has_no_invoice` BOOLEAN DEFAULT FALSE (set TRUE when the user checked "אין תעודה")
- `receipt_date` DATE (defaults to today)

These fields are tenant-scoped (RLS via tenant_id on the parent stock entry).

## When this screen gets built

Likely after M7 (Orders) and M9 (Goods Receipt full module) settle. The placeholder exists so the M1 rebuild executor knows to:
- Include delivery_note fields in the Quick Receipt drawer (per Daniel decision #14)
- Not invent a separate matching UI now
- Leave a TECH_DEBT note `M1-DEBT-XX — Invoice Inbox screen pending` in the rebuild Pipeline's FINDINGS.md

## Cross-references

- Daniel decision #14 (delivery note mandatory): see `M1_LENS_MOCKUP_UPDATES_2026_05_17_BRIEF.md`
- Audit report context: `M1_LENS_MOCKUP_AUDIT_2026_05_17_REPORT.md`
```

---

## Constraints

- **No code changes to live source files.** All edits are within `modules/Module 1 - Inventory Management/architecture-brief/`.
- **Preserve all existing mockup content.** Add new sections; don't delete or rewrite existing ones. The audit verdicts (3-19% match) are about the LIVE code, not the mockup — the mockup itself is the canonical design.
- **Use existing Prizma palette** — gold (`#c9a555`), dark navy headers, white cards, light grey muted text. Don't introduce new colors.
- **RTL-first** — all new sections must use `dir="rtl"` and logical properties (no `left:`/`right:` literals, use `inset-inline-*`).
- **Iron Rule 12** — each mockup file may grow up to ~1600 lines. If you exceed 1600, split the new section into a separate mockup file (e.g., `LENS_INVENTORY_QUICK_RECEIPT_DRAWER.html`) and reference it from the main mockup via a comment.

## Stop-on-deviation triggers

- If the existing mockup file is malformed (HTML doesn't parse) → stop, report
- If the lens-inventory mockup is significantly different from the audit's description → stop, report (might be a different mockup file than I documented)
- If you find that an "existing" feature you're meant to modify doesn't exist in the mockup → stop, report

## Deliverable + commit

After all 3 deliverables:

```powershell
cd C:\Users\User\opticup
git add "modules\Module 1 - Inventory Management\architecture-brief\mockups\LENS_INVENTORY_MOCKUP.html"
git add "modules\Module 1 - Inventory Management\architecture-brief\mockups\LENS_PRICING_MOCKUP.html"
git add "modules\Module 1 - Inventory Management\architecture-brief\INVOICES_INBOX_PLACEHOLDER.md"
git add "modules\Module 1 - Inventory Management\architecture-brief\M1_LENS_MOCKUP_UPDATES_2026_05_17_BRIEF.md"
git commit -m "docs(m1): mockup updates for Quick Receipt drawer + price cols + dual-view + invoices placeholder (Daniel decisions 2026-05-17)"
git push origin develop
```

Report:
- Commit hash
- Final line counts of LENS_INVENTORY_MOCKUP.html + LENS_PRICING_MOCKUP.html (before → after)
- Confirm INVOICES_INBOX_PLACEHOLDER.md exists

After push lands, Cowork-Architect will review the rendered mockups visually (via Chrome MCP from a future session or by sending file paths to Daniel for direct review) before authorizing the rebuild Pipelines.

---

**END BRIEF**
