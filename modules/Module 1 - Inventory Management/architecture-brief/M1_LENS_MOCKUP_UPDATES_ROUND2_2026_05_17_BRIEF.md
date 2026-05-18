# BRIEF — M1 Lens Mockup Updates Round 2 (post-review, 2026-05-17)

**For:** Claude Code on Daniel's Windows desktop. Same session as Round 1 or new.

**Type:** Apply 2 corrections to mockups based on Daniel's visual review of Round 1 (commit `ae1a5de`). NO source-code changes.

**Estimated wall clock:** 30-45 min.

---

## Context

Daniel reviewed Round 1 mockup updates and approved them with 2 corrections:

**Correction 1 (Inventory mockup):** The Quick Receipt drawer captures delivery-note + supplier correctly. But the OTHER entry points (existing "הוספה מרובה" / scanner / manual-add) ALSO need to flow through delivery-note capture — not bypass it. **Resolution:** Make the Quick Receipt drawer the SOLE inventory-entry path. All other "add to stock" UI funnels through it.

**Correction 2 (Pricing mockup):** Add a "פרטים נוספים" button per row that opens a side modal/drawer with 2 tabs: **לוגים** (history of price changes + stock movements, read-only always) + **הערות** (read-only in view mode, editable + "הוסף הערה" button in edit mode). Notes are freeform multi-line text with timestamp + author per note.

---

## Bootstrap

1. Load skill `opticup-executor`.
2. Standard First Action.
3. Read these in order:
   - `modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_MOCKUP_UPDATES_2026_05_17_BRIEF.md` (Round 1 brief for context)
   - `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_INVENTORY_MOCKUP.html` (currently 1456 lines — you will modify)
   - `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_PRICING_MOCKUP.html` (currently 756 lines — you will modify)

---

## Deliverable 1 — Inventory mockup: Quick Receipt drawer becomes the SOLE entry path

### 1.1 — Remove direct-to-stock from existing entry points

Audit every place in `LENS_INVENTORY_MOCKUP.html` that currently appears to add to stock directly (without going through the Quick Receipt drawer). Specifically:

- **Scanner UI** (top area) — when in "in" mode, MUST open the drawer with the scanned item pre-loaded into Section B. Do NOT add directly to stock.
- **Manual add button** (anywhere it appears — top header, bottom panel, side panel) — MUST open the drawer with the manual-add form pre-loaded into Section B's "add item" mini-form.
- **Bulk add UI** (the "הוספה מרובה" pattern Daniel mentioned — locate it in the current mockup; if it doesn't have an explicit name, find any place where multiple items can be staged-then-added) — MUST funnel through the drawer. The drawer's Section B already supports staging multiple items; ensure the bulk-add UI just stages into the drawer's Section B rather than maintaining its own staging list.

For each existing entry point, add an inline `<!-- comment -->` that explicitly states:
```html
<!-- Entry point: feeds Quick Receipt drawer Section B. NO direct stock writes from here. -->
```

### 1.2 — Reinforce in the drawer's bulk-flow comment block

The existing bulk-flow comment block (added in Round 1) should be expanded to state explicitly:

```html
<!--
  Quick Receipt drawer = SOLE inventory-entry path (Daniel decision Round 2, 2026-05-17).

  All inventory additions must capture delivery_note_number (or has_no_invoice=TRUE)
  PLUS supplier_id PLUS receipt_date. There is NO bypass UI. Entry points:
  - Scanner (in-mode): scanned item → Section B staging
  - Manual add button: opens drawer to Section B with manual-add form
  - Bulk add ("הוספה מרובה"): items staged into Section B, single delivery-note for all

  Manager audit: receipts with has_no_invoice=TRUE appear in a daily exception report.
-->
```

### 1.3 — Add visual cue: small badge near the scanner that says "כל הוספה למלאי דורשת תעודה"

A small persistent helper-text strip below the scanner area:
```html
<div class="entry-helper-strip">
  <span class="icon-info">ℹ️</span>
  <span>כל הוספה למלאי דורשת מספר תעודה (או סימון "אין תעודה" לבדיקה עתידית).</span>
</div>
```

Style: light blue background `#eff6ff`, dark blue text `#1e40af`, small icon, RTL aligned.

---

## Deliverable 2 — Pricing mockup: "פרטים נוספים" button + side drawer

### 2.1 — Add a "פרטים נוספים" button per row

In BOTH the Edit-mode section AND the Read-only mode section of `LENS_PRICING_MOCKUP.html`, add a **button column** (rightmost or leftmost — match the row-action pattern from `LENS_INVENTORY_MOCKUP.html`).

Button label: `פרטים נוספים`
Style: outline button, gold border, small size. On hover: filled gold.

Clicking the button (in mockup, simulate with `onclick` placeholder or just static comment) opens the side drawer (Deliverable 2.2).

### 2.2 — Add Side Drawer "פרטי עדשה" (right-pinned, like Quick Receipt drawer)

**Drawer structure:**

```
[drawer header — sticky top]
  title: "פרטי עדשה — {brand} {series} ({sph}/{cyl}/{diameter})"
  close button (×)

[drawer tabs row — sticky below header]
  [ לוגים ]  [ הערות ]
   active     inactive
   (default: לוגים when opened)

[drawer body — Tab: לוגים]
  Two sections:

  Section A — היסטוריית מחירים (price change log, read-only ALWAYS):
    Compact table:
    | תאריך | סוג שינוי | ערך לפני | ערך אחרי | שינה |
    Sample 4 rows showing: price change, discount change, cost change, approval

  Section B — היסטוריית תנועות מלאי (stock movements log, read-only ALWAYS):
    Compact table:
    | תאריך | סוג תנועה | כמות | תעודה | ספק/לקוח | שמתשמ |
    Sample 6 rows showing: receipt, sale, return, transfer, adjustment, count

[drawer body — Tab: הערות]
  Edit mode (when permissions.lens_pricing.edit = true):
    - List of existing notes as cards:
      - Each card: timestamp + author name + free text body
      - Sample 3 notes:
        - "2026-04-15 — דניאל: חברה הפסיקה לייצר קוטר 65mm. מומלץ להציע חלופה."
        - "2026-03-22 — שרה: מחיר מבצע עד 31/3/26 — 800 שח במקום 1100."
        - "2026-02-10 — דניאל: פנייה ספציפית מקוסטומר X לחיוב 6 חודשים על בסיס אספקה."
    - "הוסף הערה" button at top — opens inline textarea + "שמור" button

  Read-only mode (when permissions.lens_pricing.edit = false):
    - Same 3 notes as cards, BUT no "הוסף הערה" button
    - No edit/delete controls per note
    - Display-only

[drawer footer]
  [סגור] outline button
```

### 2.3 — Comment blocks explaining the pattern

Above the drawer in the mockup:
```html
<!--
  Lens Details Drawer (Daniel decision Round 2, 2026-05-17):
  - Opens from "פרטים נוספים" button on every row in both view modes
  - Tab 1 (לוגים): always read-only — price history + stock movements
  - Tab 2 (הערות): free-form multi-line notes per variant
    - Edit mode: can add/edit/delete notes, full CRUD
    - View mode: read-only, no add button
  - Notes table DB schema (downstream): lens_variant_notes (id, variant_id, tenant_id, author_id, body TEXT, created_at, updated_at)
  - Permissions: 'lens_pricing.edit' gates write access to notes; everyone with view access reads them
-->
```

### 2.4 — Optional polish: connect the toggle in 2.1 to drawer visibility

The mockup is static, but include `data-drawer-target="lens-details"` attribute on the buttons so the rebuild executor knows which drawer to open. Mirror the pattern used by the Quick Receipt drawer in `LENS_INVENTORY_MOCKUP.html`.

---

## Constraints

- All edits stay within `architecture-brief/mockups/` and `architecture-brief/` — no live code.
- Use existing Prizma palette — gold `#c9a555`, dark navy, white, muted grey. No new colors.
- RTL-first. Logical properties only.
- Iron Rule 12: each mockup may grow up to ~1800 lines. If you'd exceed 1800, split into a sibling file and cross-reference.
- Preserve all existing content from Round 1. Only add or modify per this brief.

## Stop-on-deviation triggers

- If the "הוספה מרובה" UI is genuinely absent from the mockup → note in your summary; still apply the comment-block reinforcement to make the rule explicit for the rebuild executor.
- If the side-drawer pattern conflicts visually with an existing Pricing mockup section → stop, report, ask.

## Commit + push

```powershell
cd C:\Users\User\opticup
git add "modules\Module 1 - Inventory Management\architecture-brief\mockups\LENS_INVENTORY_MOCKUP.html"
git add "modules\Module 1 - Inventory Management\architecture-brief\mockups\LENS_PRICING_MOCKUP.html"
git add "modules\Module 1 - Inventory Management\architecture-brief\M1_LENS_MOCKUP_UPDATES_ROUND2_2026_05_17_BRIEF.md"
git commit -m "docs(m1): mockup updates Round 2 — Quick Receipt sole entry + Lens Details drawer with logs+notes tabs"
git push origin develop
```

Report:
- Commit hash
- Line counts before → after for both mockups
- Confirm the entry-helper-strip is visible below the scanner in inventory mockup
- Confirm 3 sample notes visible in the new pricing drawer

---

**END BRIEF**
