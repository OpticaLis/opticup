# SPEC — RECEIPT_FORM_FIXES_FROM_MANAGER

> **Location:** `modules/Module 1 - Inventory Management/docs/specs/RECEIPT_FORM_FIXES_FROM_MANAGER/SPEC.md`
> **Authored by:** opticup-strategic (Foreman) — Cowork session
> **Authored on:** 2026-05-06
> **Module:** 1 — Inventory Management
> **Phase:** post-Phase 5.9 hotfix bundle
> **Author signature:** Cowork strategic chat — daniel@prizma-optic.co.il

---

## 1. Goal

Ship three small but high-value fixes to the **Goods Receipt** form in
`inventory.html` that the Prizma branch manager flagged after live use. All
three address ergonomic / data-safety problems in the day-to-day receiving
workflow. Together they prevent a recurrence of the **2026-05-05 receipt
8119464877 mis-pricing** (4 MiuMiu rows, +3,710.64 ₪ over the invoice) by
giving the receiver a real-time invoice-vs-system total comparison.

The three fixes:
- **Item 13** — Lock column-header sorting in the receipt items table by
  default; add a 🔒/🔓 toggle so accidental clicks no longer scramble the
  manager's tray order.
- **Item 14** — Add a per-row **"סה"כ לשורה"** (line total = qty × cost)
  display column AND a top-of-form **"סה"כ חשבונית"** input that shows live
  match/mismatch against the running cost total. Confirm-receipt is gated
  behind explicit acknowledgement when there is a mismatch.
- **Item 15** — Persist the original entry order of receipt rows so that
  after "אשר קבלה ועדכן מלאי" the rows reload (and barcode-export Excel)
  in the order the manager typed them, matching the physical tray order.

---

## 2. Background & Motivation

The branch manager submitted a written list of 15 ERP fixes after using the
inventory module in real receiving sessions. Items 1–12 were already
addressed in prior phases. Items 13/14/15 remain.

**Item 14 has a measured production incident behind it:** receipt
`8119464877` (Luxottica delivery, 67 units) was confirmed on 2026-05-05 with
`total_amount = 38,394.12 ₪`, while the supplier invoice totals
`34,683.48 ₪`. Investigation (this SPEC §0 measurements) shows the manager
copied the line-total column (₪927.66 for 2 units) from the Italian
Luxottica DDT into the per-unit `cost_price` field on 4 MiuMiu rows, instead
of the per-unit price (₪463.83). Because every other row had qty=1 (where
unit price and line total are the same number), the human eye missed the
deviation on the four qty=2 rows. Result: Prizma's supplier-debt liability
to Luxottica is overstated by ₪3,710.64 until manually corrected.

The data correction is **out of scope for this SPEC** (Daniel will fix the
4 rows manually). What IS in scope is preventing the same class of error
on the next receipt by surfacing a total-vs-invoice mismatch *before*
confirmation.

**Items 13 and 15** are pure ergonomic fixes the manager has been
requesting since the receipt-form workflow was redesigned. Both have been
escalated to "blocks tray-based receiving workflow" because they multiply
the manager's barcode-printing time when broken (he must re-sort barcodes
to match physical tray order).

---

## 0. Reproduce-the-bug-first measurements (recorded 2026-05-06)

These are the actual measurements taken from prod before authoring this
SPEC. They are the live baseline that §3 stop-triggers reference.

### 0.1 Receipt 8119464877 — confirmed mis-priced state

```sql
SELECT id, receipt_number, total_amount, status, receipt_date
FROM goods_receipts
WHERE receipt_number = '8119464877';
```

Returns:
- `id`: `d1a3ecb3-e587-4d6c-b678-33669b084eeb`
- `total_amount`: `38394.12`
- `status`: `confirmed`
- `receipt_date`: `2026-05-05`

### 0.2 The 4 mis-priced inventory rows

```sql
SELECT i.barcode, b.name AS brand, i.model, i.color, i.size,
       i.cost_price, i.quantity
FROM inventory i
JOIN brands b ON b.id = i.brand_id
WHERE i.barcode IN ('0004292','0004293','0004294','0004295')
  AND i.tenant_id = (SELECT id FROM tenants WHERE slug='prizma');
```

Returns 4 rows, all `MiuMiu VMU01X size 50`, `cost_price = 927.66`,
`quantity = 2`. **Correct value per Luxottica DDT 8119464877 = 463.83.**
Total over-charge: `4 × (927.66 − 463.83) × 1 = 3,710.64 ₪`. (Multiplier
is 1, not 2, because cost_price is per-unit and the inventory row already
holds qty=2; the over-statement is the per-row delta × number of rows,
since the qty multiplier is applied identically by both correct and
incorrect math.) The receipt total mismatch (38,394.12 − 34,683.48 =
3,710.64) confirms the calculation.

### 0.3 `goods_receipt_items` has NO order column today

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'goods_receipt_items'
ORDER BY ordinal_position;
```

Returns 22 columns; **none of them is `sort_order`, `position`, `seq`,
`row_num`, or `order_index`**. The `id` column is a UUID v4 — useless for
row ordering. There is also no `created_at` timestamp on this table, so
"insert order" cannot be reconstructed even approximately. Every query
that returns receipt items today is at the mercy of PostgreSQL's
implementation-defined row order.

### 0.4 Naming convention discovered (Rule 21 enforcement)

```sql
SELECT table_name FROM information_schema.columns
WHERE column_name = 'sort_order' AND table_schema = 'public';
```

Returns 18 tables already using `sort_order` (incl. `inventory_images`,
`supplier_document_files`, `crm_statuses`, `storefront_pages`,
`storefront_block_templates`). The new column on `goods_receipt_items`
**must** also be named `sort_order` (NOT `position`, NOT `seq`).

### 0.5 Receipt items query sites that today lack `.order(...)`

```bash
grep -rn "from(T.RCPT_ITEMS)\\.select" modules/goods-receipts/ shared/ js/
```

Confirmed sites missing an explicit order clause that return rows for UI
display or printing:
- `modules/goods-receipts/receipt-confirm-items.js:2` — confirm flow
- `modules/goods-receipts/receipt-form.js:134` — `openExistingReceipt`
- `modules/goods-receipts/receipt-excel.js:181` — `exportReceiptBarcodes`

These three are the fix targets in §8 for item 15. Other sites that select
RCPT_ITEMS for **counting/aggregation only** (e.g., `receipt-list.js:40`)
do not need `.order()` because order is irrelevant to their result.

### 0.6 Current sort handler in receipt-form-items.js

`modules/goods-receipts/receipt-form-items.js:333–357` is a delegated
click handler that sorts `tbody` rows when any `<th data-sort-key="…">`
in `#rcpt-items-thead` is clicked. There is **no lock** today — every
click sorts. Item 13 wraps this handler in a "lock check".

---

## 3. Success Criteria (Measurable)

Every criterion has an exact expected value verifiable by a single command.

| # | Criterion | Expected value | Verify |
|---|-----------|---------------|--------|
| 1 | Branch state at end | On `develop`, clean (no untracked, no modified) | `git status --porcelain \| wc -l` → `0` |
| 2 | Commits produced | 4 commits ahead of `origin/develop` (3 feat + 1 close-spec) | `git log origin/develop..HEAD --oneline \| wc -l` → `4` |
| 3 | DB migration applied | New column `goods_receipt_items.sort_order INT` exists, default `NULL`, no NOT NULL constraint (back-compat) | `SELECT column_name FROM information_schema.columns WHERE table_name='goods_receipt_items' AND column_name='sort_order'` → 1 row |
| 4 | DB migration is idempotent | Running it twice does not error | apply twice, second is a no-op |
| 5 | DB index exists | `idx_rcpt_items_sort` on `(receipt_id, sort_order)` | `SELECT indexname FROM pg_indexes WHERE tablename='goods_receipt_items' AND indexname='idx_rcpt_items_sort'` → 1 row |
| 6 | Item 13 — sort lock UI | `#rcpt-sort-lock-btn` exists in `inventory.html`, default state = locked, clicking a `<th data-sort-key>` while locked does NOT reorder rows | manual test on Demo |
| 7 | Item 14a — line total column | `#rcpt-items-thead` contains a new `<th>סה"כ לשורה</th>`; each `<tbody>` row has matching `<td class="rcpt-line-total">` that updates live as qty/cost change | manual test on Demo |
| 8 | Item 14b — invoice total input | New input `#rcpt-invoice-total` exists in the receipt form header area; on input change, `#rcpt-items-stats` shows ✅/❌ status with the delta | manual test on Demo |
| 9 | Item 14c — confirm-receipt gate | Clicking `confirmReceipt()` while `#rcpt-invoice-total` is filled AND `Math.abs(invoiceTotal − systemTotal) > 1.00` opens a confirmation dialog `"⚠️ פער X ₪ מול החשבונית — להמשיך בכל זאת?"`. If `#rcpt-invoice-total` is empty, no gate (back-compat). | manual test on Demo with intentional mismatch |
| 10 | Item 15 — order persisted on save | New `goods_receipt_items` rows are written with `sort_order = 1, 2, 3, …` matching DOM `data-row` ascending | insert a 5-row receipt on Demo, query DB, confirm sort_order is 1..5 |
| 11 | Item 15 — order preserved on reload | Re-opening a saved receipt via `openExistingReceipt()` renders rows in `sort_order ASC` order | manual test on Demo |
| 12 | Item 15 — order preserved in barcode export | `exportReceiptBarcodes(receiptId)` returns rows in `sort_order ASC` order | manual test on Demo, inspect Excel output |
| 13 | Item 15 — back-compat for old receipts | Receipts confirmed BEFORE this SPEC (where `sort_order IS NULL` for all rows) still render without errors; row order falls back to `id ASC` (deterministic, even if not the manager's original order) | open receipt `8119464877` on Demo (after applying SPEC); no JS errors |
| 14 | File-size compliance (Iron Rule 12) | All modified files remain ≤350 lines | `wc -l modules/goods-receipts/receipt-form-items.js modules/goods-receipts/receipt-confirm-items.js modules/goods-receipts/receipt-excel.js modules/goods-receipts/receipt-form.js` → all ≤350 |
| 15 | Integrity gate passes | `npm run verify:integrity` exits 0 | run before commit |
| 16 | Console errors | Zero on `inventory.html` after the changes | manual check, reload page |
| 17 | RLS untouched | No new RLS policy on `goods_receipt_items`; existing two-policy pattern (service_bypass + tenant_isolation) preserved | `SELECT polname FROM pg_policies WHERE tablename='goods_receipt_items'` → unchanged count |
| 18 | tenant_id discipline (Iron Rule 22) | Every new `.insert()` / `.upsert()` writing receipt items still includes `tenant_id: getTenantId()`; new SQL writes do NOT touch tenant scoping | grep modified files for new `.insert(` / `.upsert(` → each contains `tenant_id` |
| 19 | SESSION_CONTEXT updated | New entry at top of `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md` describing the bundle | manual diff |
| 20 | Activation log | `EXECUTION_REPORT.md` + `FINDINGS.md` exist in this SPEC folder at close | `ls modules/Module 1 - Inventory Management/docs/specs/RECEIPT_FORM_FIXES_FROM_MANAGER/` |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in the repo, including all 19 `modules/goods-receipts/*.js` files.
- Run read-only SQL via Supabase MCP for verification.
- **Apply the schema migration** (one DDL statement: `ALTER TABLE goods_receipt_items ADD COLUMN sort_order INT;` + `CREATE INDEX`) once §0 §0.3 has been re-verified live (the column truly does not exist yet).
- Edit the files listed in §8 ("Modified files").
- Add a single new file: `db-migrations/063_receipt_items_sort_order.sql` (idempotent).
- Commit and push to `develop` (PR-only flow does NOT apply — `develop` accepts direct pushes; only `main` is PR-gated per `feedback_main_merge_via_pr.md`).
- Run `npm run verify:integrity` and `npm run verify --staged` before each commit.

### What REQUIRES stopping and reporting
- The DB pre-flight (§0 §0.3) returns ANY column named `sort_order`, `position`, `seq`, or `row_num` on `goods_receipt_items` — STOP, the schema has changed since SPEC was authored.
- Any of the 3 query sites in §0.5 cannot be located in the codebase as named, OR a 4th query site is discovered that returns rows for UI/printing without `.order(...)` — STOP, surface the 4th site, do NOT silently extend scope.
- File-size growth would push any modified file past 350 lines (Iron Rule 12).
- ANY change to RLS policies, ANY change to `tenant_id` columns or constraints.
- Any test failure that cannot be diagnosed in a single retry.
- Any criterion in §3 fails by more than the noted tolerance.
- Manager-flagged behavior (the §1 problems) reproduces on Demo after the fix is shipped.

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- If a `data-row` DOM ordering check on a freshly-saved receipt does NOT
  match the `sort_order` values in the DB after `confirmReceipt()` runs →
  STOP. The save path is writing in the wrong order; data is corrupting
  prospectively.
- If applying the migration takes >5 seconds → STOP. The table should be
  small (one row per line item, total << 1M rows), and the migration is
  pure metadata (no rewrite). Slowness suggests an unexpected lock.
- If `verify:integrity` reports null bytes in any modified file → STOP per
  Iron Rule 31. Investigate, do not bypass.
- If, during item 13 testing, the lock toggle button appears but clicks
  on `<th>` STILL reorder rows → STOP. The handler wrapping is wrong;
  surface before continuing.
- If item 14's confirmation dialog ever blocks legitimate confirmations
  (i.e., `#rcpt-invoice-total` empty triggers the gate) → STOP, fix
  back-compat path, do not ship.

---

## 6. Rollback Plan

If the SPEC fails partway through and must be reverted:

1. **Code:** `git reset --hard {START_COMMIT}` where `{START_COMMIT}` is
   the commit hash captured at the very start of execution (executor
   records this in `EXECUTION_REPORT.md` §A).
2. **DB schema:** the migration adds a nullable column + an index. To
   revert:
   ```sql
   DROP INDEX IF EXISTS idx_rcpt_items_sort;
   ALTER TABLE goods_receipt_items DROP COLUMN IF EXISTS sort_order;
   ```
   No data loss — the column is additive.
3. **Receipts created during the failed window:** `sort_order` values
   they hold are simply discarded with the column. The receipts
   themselves remain valid (all other columns unchanged).
4. Notify Foreman; SPEC is marked REOPEN, not CLOSED.

---

## 7. Out of Scope (explicit)

These look related but **MUST NOT** be touched in this SPEC:

- **Fixing the 4 mis-priced rows from receipt 8119464877.** Daniel will
  correct `inventory.cost_price` (and `goods_receipts.total_amount` if
  he chooses) manually. The executor MUST NOT issue any UPDATE on
  `inventory` or `goods_receipts` data rows.
- **Receipt OCR flow** (`receipt-ocr*.js`) — unchanged. The OCR pipeline
  fills `unit_cost` from Claude Vision parsing of invoices; that path is
  out of scope here. The new line-total column will pick up OCR-filled
  values automatically because it computes from `unit_cost × quantity`
  on render — no OCR-side changes needed.
- **PO-driven receipts** — the existing per-row PO/non-PO branch logic
  in `addReceiptItemRow()` is preserved as-is. The new column appears
  in both branches.
- **Items 1–12** from the manager's list — already addressed.
- **Items 7, 8, 9, 10, 11, 12** of the inventory-table side (not the
  receipt-form side) — out of this SPEC's scope.
- **Migration of the 4 buggy rows in `inventory`** — Daniel handles
  manually.
- **Currency / multi-currency support** for the invoice-total comparison
  — assume ₪. If a future tenant uses USD/EUR, the comparison will need
  a currency selector; that is a future SPEC.
- **`goods_receipts.total_amount` recalculation** for old receipts. The
  field already exists and is set on confirm; no migration of historical
  values.

---

## 8. Expected Final State

### New files

- `db-migrations/063_receipt_items_sort_order.sql` — idempotent migration
  adding the `sort_order` column + index. Bundled in
  `goods-receipts/db-migrations/` if a per-module convention is in use;
  otherwise the project root pattern (verify with `ls db-migrations/`
  during execution).

### Modified files (with line-level scope notes)

- `inventory.html`
  - `<thead id="rcpt-items-thead">` (around line 494–496) — add a new
    `<th>סה"כ לשורה</th>` between the **מחיר עלות** column and the
    **מחיר מכירה** column. **Do not** add `data-sort-key` (this column
    is computed; sorting is meaningless).
  - In the receipt-form header strip (search for `<input id="rcpt-number">`
    or the doc-numbers row), add a sibling input: `<input
    type="number" id="rcpt-invoice-total" placeholder="סה"כ חשבונית
    (₪)" step="0.01" min="0">` with a small label "סה"כ חשבונית".
    Place near the date/document-number row. Add a small `<span
    id="rcpt-invoice-total-status"></span>` next to it for ✅/❌ display.
  - Near the `<button onclick="exportReceiptExcel()">` block (~line
    488–490), add `<button id="rcpt-sort-lock-btn" class="btn btn-sm"
    title="נעילת סדר העמודות" onclick="toggleRcptSortLock()">🔒
    סדר נעול</button>`.

- `modules/goods-receipts/receipt-form-items.js`
  - **Line 43–72 (the `tr.innerHTML` template):** insert a new `<td
    class="rcpt-line-total" style="text-align:end;font-variant-numeric:tabular-nums">—</td>`
    between the `rcpt-sprice` cell and the `rcpt-sdisc` cell (i.e.,
    after **מחיר מכירה**, before **הנחה %**). Match the new `<th>`
    position in the HTML. **Wait** — re-read manager's request: line
    total goes between **מחיר עלות** and **מחיר מכירה**. Place the new
    `<td>` AFTER `rcpt-ucost` and BEFORE `rcpt-sprice`. Adjust HTML
    `<th>` order to match.
  - **`updateReceiptItemsStats()` (lines 236–256):**
    - For each `tr[data-row]`, compute `lineTotal = (qty || 0) *
      (unit_cost || 0)`, write to that row's `.rcpt-line-total` cell
      formatted via `toLocaleString('he-IL', {minimumFractionDigits: 2,
      maximumFractionDigits: 2})` + " ₪". Empty/zero displays as "—".
    - Continue computing the existing `totalCost` (already there).
    - **NEW:** read `#rcpt-invoice-total`. If it has a numeric value,
      compute `delta = invoiceTotal − totalCost`. Append to the stats
      block: `✅ תואם חשבונית` if `Math.abs(delta) ≤ 1.00`, else
      `❌ פער ${delta.toFixed(2)} ₪ מול החשבונית` with red color.
      Write status indicator into `#rcpt-invoice-total-status` (✅ or
      ❌ icon only, for at-a-glance visibility next to the input).
    - If `#rcpt-invoice-total` is empty → no comparison line, no status
      icon. Back-compat: existing receipts without this field behave
      exactly as before.
  - **Line 333–357 (the `_rcptSortKeyMap` + delegated click handler):**
    wrap the handler body in `if (window._rcptSortLocked === false)
    { …existing handler… } else { return; }`. Initialize
    `window._rcptSortLocked = true` at the top of the file (after the
    `_rcptSortKeyMap` declaration).
  - **NEW function** at the bottom of the file (before line 358):
    ```js
    function toggleRcptSortLock() {
      window._rcptSortLocked = !window._rcptSortLocked;
      var btn = document.getElementById('rcpt-sort-lock-btn');
      if (btn) {
        btn.innerHTML = window._rcptSortLocked
          ? '🔒 סדר נעול'
          : '🔓 מיון פתוח';
        btn.style.background = window._rcptSortLocked ? '' : '#fbbf24';
      }
      // Visually mute headers when locked
      document.querySelectorAll('#rcpt-items-thead th[data-sort-key]')
        .forEach(function(th) {
          th.style.opacity = window._rcptSortLocked ? '0.6' : '1';
          th.style.cursor  = window._rcptSortLocked ? 'default' : 'pointer';
        });
    }
    // Initialize lock visuals on page load
    document.addEventListener('DOMContentLoaded', toggleRcptSortLock);
    document.addEventListener('DOMContentLoaded', toggleRcptSortLock);
    // (Note: toggleRcptSortLock starts with _rcptSortLocked=true above
    // and the function FLIPS the value — so we need to call init differently.)
    ```
    **Correction:** the init pattern above is wrong (double-flip). Use
    instead an explicit init function:
    ```js
    function _initRcptSortLockUI() {
      var btn = document.getElementById('rcpt-sort-lock-btn');
      if (btn) {
        btn.innerHTML = '🔒 סדר נעול';
      }
      document.querySelectorAll('#rcpt-items-thead th[data-sort-key]')
        .forEach(function(th) {
          th.style.opacity = '0.6';
          th.style.cursor  = 'default';
        });
    }
    document.addEventListener('DOMContentLoaded', _initRcptSortLockUI);
    ```
    Then `toggleRcptSortLock()` flips `_rcptSortLocked` and updates UI
    based on the new value (no init double-call needed). Use the
    pattern below in implementation:
    ```js
    function toggleRcptSortLock() {
      window._rcptSortLocked = !window._rcptSortLocked;
      var locked = window._rcptSortLocked;
      var btn = document.getElementById('rcpt-sort-lock-btn');
      if (btn) {
        btn.innerHTML = locked ? '🔒 סדר נעול' : '🔓 מיון פתוח';
        btn.style.background = locked ? '' : '#fbbf24';
      }
      document.querySelectorAll('#rcpt-items-thead th[data-sort-key]')
        .forEach(function(th) {
          th.style.opacity = locked ? '0.6' : '1';
          th.style.cursor  = locked ? 'default' : 'pointer';
        });
    }
    ```
  - **NEW:** add an `input` event listener on `#rcpt-invoice-total` so
    the comparison re-runs as the user types: `document.addEventListener
    ('DOMContentLoaded', function () { var el =
    document.getElementById('rcpt-invoice-total'); if (el) el.oninput =
    updateReceiptItemsStats; });` (or attach with a selector-delegated
    pattern if cleaner).

- `modules/goods-receipts/receipt-confirm.js` (or wherever
  `confirmReceipt()` is defined — verify with grep; if it lives in
  `receipt-confirm.js` use that, otherwise wherever the entry point is)
  - Wrap the existing `confirmReceipt()` body in a precheck: if
    `#rcpt-invoice-total` has a value AND `Math.abs(invoiceTotal −
    systemTotalCost) > 1.00`, show `confirm("⚠️ פער X ₪ מול החשבונית —
    להמשיך בכל זאת?")` (or use the project's existing `Modal.confirm`
    pattern if one is in use — check `shared/`). If user cancels →
    return. If accepts → proceed with the existing flow.

- `modules/goods-receipts/receipt-confirm-items.js`
  - **Line 2** (`select('*').eq('receipt_id', …)`): add
    `.order('sort_order', { ascending: true, nullsFirst: false })`.
    For old receipts where every row has `sort_order = NULL`, fall
    back to deterministic order via secondary sort: chain
    `.order('id', { ascending: true })` so the result is stable.
  - **In the loop that creates new `goods_receipt_items` rows on save**
    (find by grepping for `sb.from(T.RCPT_ITEMS).insert(` or
    `batchCreate('goods_receipt_items'`): assign `sort_order` to each
    row equal to its DOM `data-row` position (1-based, matches the
    typed order). The DOM order IS the typed order because
    `addReceiptItemRow()` appends — never inserts at top. Use
    `Array.from(document.querySelectorAll('#rcpt-items-body
    tr[data-row]')).forEach((tr, idx) => …)` to derive `sort_order =
    idx + 1`. **Verify before commit:** the assignment must happen
    BEFORE the insert, and the insert payload must include `sort_order`
    plus the existing `tenant_id` (Rule 22).

- `modules/goods-receipts/receipt-form.js`
  - **Line 134** (`select('*').eq('tenant_id', …).eq('receipt_id',
    …)`): add `.order('sort_order', { ascending: true, nullsFirst:
    false }).order('id', { ascending: true })` for stable order.

- `modules/goods-receipts/receipt-excel.js`
  - **Line 181–184** (`exportReceiptBarcodes` query): add
    `.order('sort_order', { ascending: true, nullsFirst: false })
    .order('id', { ascending: true })`.

### Deleted files
None.

### DB state

- `goods_receipt_items` gains one nullable column: `sort_order INT`.
- New index: `CREATE INDEX IF NOT EXISTS idx_rcpt_items_sort ON
  goods_receipt_items (receipt_id, sort_order);`.
- All existing rows have `sort_order IS NULL` after migration — that is
  expected and handled by the `nullsFirst: false` clause + secondary
  `id ASC` sort.

### Docs updated (MANDATORY)

- `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md` —
  prepend a new section dated 2026-05-06 describing the bundle.
- `modules/Module 1 - Inventory Management/docs/db-schema.sql` — add the
  new `sort_order` column to the `goods_receipt_items` definition (with
  a comment cross-referencing this SPEC + migration 063).
- `modules/Module 1 - Inventory Management/docs/CHANGELOG.md` — new
  entry for "RECEIPT_FORM_FIXES_FROM_MANAGER (2026-05-06)" listing the
  3 commits.
- `docs/GLOBAL_SCHEMA.sql` — append the `sort_order` column to the
  `goods_receipt_items` block (Integration Ceremony rule: GLOBAL_SCHEMA
  is updated only at module phase boundaries; this is a sub-phase
  hotfix, so update is at executor's discretion. **Recommendation:
  YES — update at this SPEC's close**, because TD-2 git-drift backlog
  already exists and we don't want to add to it.)
- `MASTER_ROADMAP.md` — NOT updated (this is a hotfix bundle, not a
  phase boundary).
- `docs/GLOBAL_MAP.md` — NOT updated (no new functions / contracts;
  `toggleRcptSortLock` is local to receipt-form-items.js scope).

---

## 9. Commit Plan

Four commits, in this order:

1. **`feat(receipts): item 13 — lock receipt-items column sort by default`**
   - `inventory.html` (sort-lock button)
   - `modules/goods-receipts/receipt-form-items.js` (lock state, toggle, init, wrapped handler)
   - **No DB changes in this commit.**

2. **`feat(receipts): item 14 — add line-total column + invoice-total compare`**
   - `inventory.html` (new `<th>`, new `<input>`)
   - `modules/goods-receipts/receipt-form-items.js` (line-total cell, stats line, status icon)
   - `modules/goods-receipts/receipt-confirm.js` (or wherever confirm lives — confirmation dialog gate)
   - **No DB changes in this commit.**

3. **`feat(receipts): item 15 — preserve receipt items entry order via sort_order column`**
   - `db-migrations/063_receipt_items_sort_order.sql`
   - `modules/Module 1 - Inventory Management/docs/db-schema.sql`
   - `modules/goods-receipts/receipt-confirm-items.js` (assign sort_order on insert + order on select)
   - `modules/goods-receipts/receipt-form.js` (order on openExistingReceipt select)
   - `modules/goods-receipts/receipt-excel.js` (order on barcode export)
   - **DB migration applied in this commit** via `mcp__supabase__apply_migration`.
   - `docs/GLOBAL_SCHEMA.sql` updated.

4. **`chore(spec): close RECEIPT_FORM_FIXES_FROM_MANAGER with retrospective`**
   - `modules/Module 1 - Inventory Management/docs/specs/RECEIPT_FORM_FIXES_FROM_MANAGER/EXECUTION_REPORT.md`
   - `modules/Module 1 - Inventory Management/docs/specs/RECEIPT_FORM_FIXES_FROM_MANAGER/FINDINGS.md` (even if empty — write "No findings beyond SPEC scope.")
   - `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md` (top-of-file new entry)
   - `modules/Module 1 - Inventory Management/docs/CHANGELOG.md`

After commit 4: `git push origin develop`. Final `git status --porcelain
| wc -l` MUST be 0.

---

## 10. Dependencies / Preconditions

- Repo on branch `develop`, clean (no uncommitted, no untracked).
- `npm run verify:integrity` passes from a clean checkout (Iron Rule 31
  pre-flight).
- Supabase MCP available with project `tsxrrxzmdxaenlvocyit`.
- No active Sentinel CRITICAL alert on `goods_receipt_items` (check
  `docs/guardian/GUARDIAN_ALERTS.md`).
- Tenant `prizma` cutover state remains LIVE — this SPEC ships changes
  to a production module. Test on Demo tenant first; confirm working
  before merging-to-main flow (which is Daniel-only, post-SPEC).

---

## 11. Lessons Already Incorporated

This SPEC was authored after running the full Step 0.1 Pre-Authoring
Sweep checklist:

- **Live-state baseline probe** ✓ — §0 §0.1 / §0.2 measure the actual
  buggy data on prod before §3 cites it.
- **Identifier verification** ✓ — `T.RCPT_ITEMS` confirmed in use; all
  3 query sites verified by grep (§0.5).
- **Cross-asset coupling survey** ✓ — sort-lock change touches handler
  + HTML + button only; line-total touches HTML `<th>`/`<td>` + JS
  template + stats function only; sort_order touches DB + 3 JS sites +
  module schema + GLOBAL_SCHEMA. No CSS rules depend on the affected
  selectors today.
- **Inter-commit dependency check** ✓ — Commit 3 introduces
  `sort_order` and code that uses it together; Commits 1 + 2 do not
  reference DB. Commit 3 is the only one that must run with
  matching code+migration.
- **Cross-section consistency check** ✓ — §3 cites 4 commits; §9 plans
  4. §4 forbids DB schema change without re-verifying §0.3, §3 #3
  asserts the column exists post-migration.
- **Per-consumer enumeration when preserving coupling** ✓ — §0.5 lists
  the 3 query sites. The SPEC explicitly preserves
  `_rcptSortKeyMap`-based sort logic for unlock mode (just gates it).
- **Verify-command tooling for UI checks** ✓ — UI items (13/14a/14b/14c)
  use "manual test on Demo" because they are user-visible behavior;
  DB-side items use SQL.

Lessons from past SPECs applied:
- **From `STOREFRONT_SYNC_HIERARCHY_FIX/FOREMAN_REVIEW.md`** → "use
  rendered-DOM checks, not source-grep, for UI verification" → APPLIED
  in §3 #6–#9 (all are manual visual checks).
- **From `PERMISSIONS_HOTFIX_NULL_BYTES`** → "always run §0
  reproduce-the-bug-first measurements" → APPLIED in §0.1–§0.6.
- **From `PERMISSIONS_PHASE2_FIX`** → "preserve coupling explicitly,
  enumerate consumers" → APPLIED — sort-lock keeps the existing sort
  handler intact, just gates its entry.
- **From `feedback_clean_repo_in_specs.md`** → "every SPEC must
  enforce clean repo at end" → APPLIED in §3 #1 + §9 final note.
- **From `feedback_main_merge_via_pr.md`** → "ERP main merge via PR,
  never direct push" → APPLIED in §10 (note: this SPEC pushes only to
  `develop`, not `main`).
- **From `feedback_check_before_asking_daniel.md`** → "verify yourself
  first; Daniel is not a QA tester" → APPLIED — executor is
  responsible for Demo testing before reporting.
- **From `project_migrations_git_drift.md` (TD-2)** → "every new MCP
  migration adds to git-drift backlog until TD-2 is fixed" →
  ACKNOWLEDGED but accepted: the migration in §8 is added to git as
  `db-migrations/063_receipt_items_sort_order.sql`, mitigating drift
  for this specific change.

---

## 12. QA Plan (Demo Tenant)

After all 4 commits land on `develop`, executor runs this QA on Demo:

1. **Sort lock** — open `inventory.html` → קבלת סחורה tab → start a new
   receipt with 5 manual rows (or load via barcode search). Click on
   the **דגם** column header. Expected: nothing happens (rows do not
   reorder). Click 🔒 button → it switches to 🔓; click **דגם** again;
   rows reorder. Click 🔓 again → back to 🔒.

2. **Line total** — in the same form, set qty=2 cost=100. The new "סה"כ
   לשורה" column should display "200.00 ₪" on that row. Set qty=3, see
   "300.00 ₪". Clear cost → "—".

3. **Invoice-total compare (match)** — enter "סה"כ חשבונית" = 200.
   Stats line shows ✅ תואם חשבונית. Status icon ✅ next to input.

4. **Invoice-total compare (mismatch)** — change to 250. Stats line
   shows ❌ פער 50.00 ₪ מול החשבונית in red. Status icon ❌ next to
   input.

5. **Confirm gate (mismatch)** — click **אשר קבלה ועדכן מלאי** while
   mismatch shown. Browser confirm dialog appears: "⚠️ פער 50 ₪ מול
   החשבונית — להמשיך בכל זאת?". Cancel → confirm aborts. Click confirm
   again → click OK on the dialog → confirm proceeds normally.

6. **Confirm without invoice-total (back-compat)** — clear "סה"כ
   חשבונית". Click **אשר קבלה** → no dialog appears, flow proceeds
   normally.

7. **Order preservation — save** — start a NEW receipt with 5 rows
   typed in this order: A, B, C, D, E (use distinct brand+model so
   they're distinguishable). Confirm the receipt. Query DB:
   ```sql
   SELECT brand, model, sort_order
   FROM goods_receipt_items
   WHERE receipt_id = '{new_id}'
   ORDER BY sort_order;
   ```
   Expected: rows appear in order A,B,C,D,E with sort_order 1,2,3,4,5.

8. **Order preservation — reload** — close the receipt, reopen via
   "עריכה" or "צפייה". Rows render in order A,B,C,D,E.

9. **Order preservation — barcode export** — export barcodes Excel.
   Excel rows appear in order A,B,C,D,E (multiplied by qty if any
   row has qty>1).

10. **Back-compat — old receipts** — open receipt 8119464877 (or any
    receipt confirmed before this SPEC). Rows render without errors.
    Order is by `id ASC` (deterministic, even if not the original
    typed order).

11. **Console check** — DevTools console must be free of errors and
    warnings on every page used above.

Each QA step PASSES → executor records pass in `EXECUTION_REPORT.md` §C.
Any FAIL → STOP per §4 stop-triggers.

---

*End of SPEC.*

---

## 13. Amendment 1 — File-Size Compliance Fix (added 2026-05-06 mid-execution)

**Triggered by:** Executor pre-flight caught a contradiction between §3 #14
("all modified files ≤350 lines") and §4 stop-trigger ("file-size growth
would push any modified file past 350 lines"). Pre-state of
`receipt-form-items.js` is **357 lines** (already 7 over the absolute max);
adding ~35–50 lines for items 13 + 14 would push it to 390–410.

**Root cause of the SPEC defect:** Foreman did not run a `wc -l` baseline
check on the target files before committing to the file-size criterion in
§3. This is a Step 0.1 #1 (Live-state baseline probe) failure on the
file-size axis — addressed in Foreman improvement proposal in the
forthcoming FOREMAN_REVIEW.

**Resolution:** Iron Rule 12 says "split only where there is a clear
logical separation — never arbitrarily by line count. **One responsibility
per file.**" Items 13 (sort lock) and 14 (invoice-total compare) are
**both UI-validation features distinct from row management** (which is
`receipt-form-items.js`'s sole responsibility). Splitting them out is the
correct architectural move regardless of file size.

### 13.1 New file (replaces previous "Modified files" entry for `receipt-form-items.js`)

- `modules/goods-receipts/receipt-form-validate.js` — new file holding:
  - `window._rcptSortLocked` initial state (= `true`)
  - `toggleRcptSortLock()`
  - `_initRcptSortLockUI()`
  - The sort-lock guard wrapper (the executor MUST move the gating logic
    into this file by replacing the existing handler in
    `receipt-form-items.js` lines 333–357 with a thin shim that defers to
    `window._rcptSortLocked` checked from the new file's exported state)
  - `_updateRcptInvoiceCompare()` — pure function that reads
    `#rcpt-invoice-total`, computes delta vs `totalCost` (passed in as a
    parameter from `updateReceiptItemsStats`), and writes status to
    `#rcpt-invoice-total-status` + appends to `#rcpt-items-stats`.
  - `_initRcptInvoiceCompareListener()` — attaches the `oninput` handler
    to `#rcpt-invoice-total`.
  - The `#rcpt-invoice-total` confirm-gate guard (used by `confirmReceipt`
    in `receipt-confirm.js`); export as `_rcptInvoiceTotalDelta()` →
    returns `{delta, hasInvoiceTotal}` so the gate logic in
    `receipt-confirm.js` can call it.

### 13.2 Reduced scope of changes to `receipt-form-items.js`

In this file, the executor only adds:
- One new line in `addReceiptItemRow()` template: the `<td
  class="rcpt-line-total">—</td>` cell (~1 line).
- A 4-line block inside `updateReceiptItemsStats()` that loops rows and
  writes the per-row line-total + calls `window._updateRcptInvoiceCompare`
  if it is defined (function defined in the new file).
- Replacement of the existing sort handler (lines 333–357) with a 3-line
  guard: `if (window._rcptSortLocked === true) return;` at the top of the
  existing handler, keeping the rest of the handler intact.

**Net growth in `receipt-form-items.js`:** ~5–8 lines, leaving the file
at ~365 — **still over 350**. Therefore the executor must ALSO extract a
small section of dead-code-or-easily-extracted logic from this file into
the new `receipt-form-validate.js`. Specifically: move the entire
`_rcptSortKeyMap` declaration AND the click handler body (lines 333–357)
to the new file, leaving NOTHING of sort logic in `receipt-form-items.js`.

**Revised target net change in `receipt-form-items.js`:**
- Pre-state: 357
- Add: ~5 lines (line-total cell + stats loop)
- Remove: ~25 lines (sort handler + map, moved to new file)
- **Post-state: ~337 — under 350 ✓**

### 13.3 New script tag in `inventory.html`

Add `<script src="modules/goods-receipts/receipt-form-validate.js"></script>`
**immediately after** the existing `<script
src="modules/goods-receipts/receipt-form-items.js"></script>` tag. The
new file depends on `_rcptSortKeyMap` being available (it owns it now,
no longer needed by the items file) and on `updateReceiptItemsStats`
being globally defined (it is — defined in the items file).

### 13.4 Updated §3 success criterion #14

| # | Criterion | Expected value | Verify |
|---|-----------|---------------|--------|
| 14 (revised) | File-size compliance (Iron Rule 12) | ALL modified files ≤350 lines AND new file `receipt-form-validate.js` ≤350 lines | `wc -l modules/goods-receipts/receipt-form-items.js modules/goods-receipts/receipt-confirm-items.js modules/goods-receipts/receipt-excel.js modules/goods-receipts/receipt-form.js modules/goods-receipts/receipt-confirm.js modules/goods-receipts/receipt-form-validate.js` → all ≤350 |

### 13.5 Updated §3 success criterion #2 — commit count UNCHANGED

The bundling of items 13 + 14 into a single new file does not change the
commit plan. Both items still ship in commits 1 and 2 respectively (item
13 = sort-lock pieces in the new file + the guard shim in the existing
file + script tag; item 14 = line-total cell + stats in the existing file
+ invoice-compare pieces in the new file + confirm-gate in
receipt-confirm.js).

The new file is **created in commit 1**, then **extended in commit 2**.

### 13.6 Updated §8 docs requirements

- `docs/FILE_STRUCTURE.md` — add the new file path and one-line description.
- `modules/Module 1 - Inventory Management/docs/MODULE_MAP.md` — register
  new file with its 4 functions.
- `docs/GLOBAL_MAP.md` — NOT updated (still no new cross-module
  contracts; all functions are local to receipt-form scope).

### 13.7 Updated §4 stop-trigger

**Replace:** "File-size growth would push any modified file past 350
lines (Iron Rule 12)."

**With:** "File-size growth would push any file past 350 lines —
including the new `receipt-form-validate.js`. If the new file approaches
350, surface and we'll split items 13 and 14 into TWO new files."

---

*End of Amendment 1.*

