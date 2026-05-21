# Code Conventions — opticup (ERP)

> **Purpose:** Recurring patterns, idioms, and UI flows used across the ERP codebase.
> **Read when:** You're about to implement a pattern that sounds like it might already have a standard way of being done. Or when you see an unfamiliar pattern in existing code and need to understand it.
> **Rule:** If you need a new pattern that isn't here — add it here in the same commit (Rule 21). Don't silently invent a second way to do something that already has a convention.

> **Distinction from Iron Rules:** Iron rules (in `CLAUDE.md`) are enforceable "never break" rules. Conventions are "this is how we do it here, follow it unless you have a good reason." If you have a good reason to deviate — document it in the code and in the module's `MODULE_SPEC.md`.

---

## 1. Cascading Dropdowns

**Pattern:** brand → model → size/color.

**Used in:** reduction search, entry forms, PO items, receipt items.

**How it works:** Each level queries Supabase for distinct values filtered by the parent level's selection. Changing a parent dropdown resets all child dropdowns and re-queries them.

**Implementation home:** `js/search-select.js` + inline logic in the form files that use it.

## 2. Two-Step Wizard (PO Creation)

**Pattern:** Step 1 selects the supplier. Step 2 generates the PO number and opens the item editor.

**Bridge function:** `proceedToPOItems()` — called when the user clicks "continue" after selecting a supplier. Generates PO number via atomic RPC (Rule 11), then loads the item editor.

**Why two steps:** PO numbers are `PO-{supplier_number}-{sequential 4-digit}` per supplier (see Convention 9). We can't generate the number until the supplier is locked in.

**General principle:** when a form requires server-generated state (like a sequential number) after a user choice, split into two steps. Don't generate the number client-side.

## 3. Accordion Pattern (Entry History)

**Pattern:** Entry history groups logs by date. Each group expands/collapses.

**Function:** `toggleHistGroup(groupId)` — toggles visibility of a group's detail rows.

**Reusable for:** any grouped list where the user wants to see headers first and drill down on demand. PO history, receipt history, debt document history all follow this pattern.

## 4. Barcode-First Flow

**Pattern:** Receipts and reduction searches start with a barcode input. Manual search is the fallback.

**Why:** Scanning is faster and error-free. The UI puts the barcode field in focus on load and treats Enter-in-barcode-field as "find and select."

**Implementation:** Barcode input → exact match query → if found, select; if not, offer manual search.

**Applies to:** receipt items, reduction search, stock count, inventory-return.

## 5. Searchable Dropdowns

**Pattern:** Fixed-position filtered dropdown with typeahead.

**API:** `createSearchSelect(config)` in `js/search-select.js`.

**Used for:**
- Brands in entry forms and PO items
- Suppliers in PO and receipt forms

**Why fixed position:** prevents the dropdown from being clipped by scrollable containers or modals.

## 6. Immediate Save vs. Batch Save

**Two distinct behaviors, used deliberately:**

**Immediate save (DB write on every click):**
- Checkbox toggles: `setBrandActive(brandId, isActive)`, `saveBrandField(...)`
- Status flips and boolean toggles
- Reason: no "undo" expected, instant feedback is desired

**Batch save (requires explicit "Save" button):**
- Row edits in brands table
- Row edits in inventory table
- Multi-field forms
- Reason: users expect to change several things, then commit together. Also provides a natural "cancel" path.

**Rule:** never mix the two in the same row. If a row has toggles, they're immediate. If a row has text fields, they're batched behind Save.

## 7. PIN Verification (Two Types)

**Login PIN** (session start):
- Calls `pin-auth` Edge Function
- Server-side validation
- Returns signed JWT
- Do NOT refactor without explicit instruction (Iron Rule 8)

**Mid-session PIN** (action verification):
- `verifyPinOnly()` — client-side query
- Used for: quantity changes, soft delete, permanent delete (twice), inventory reduction
- Not a security boundary — it's a deliberate friction gate to prevent accidental mutations

**Reusable modal:** `js/pin-modal.js` → `promptPin()` — returns a Promise resolving to the PIN (or rejecting on cancel).

## 8. Temp Negative Swap (UNIQUE Constraint Dance)

**Pattern:** When reassigning supplier numbers (which have a UNIQUE constraint), swap via temporary negative values.

**Why:** If you try to swap supplier 1 and supplier 2 directly, the UNIQUE constraint blocks the intermediate state. Using `-1` and `-2` as temp values routes around it.

**Applies to:** any two-row swap on a UNIQUE column during concurrent operations.

## 9. PO Number Format

**Format:** `PO-{supplier_number}-{sequential 4-digit}`
- Example: `PO-0012-0034` (supplier 12, PO sequence 34)

**Generated:** at Step 2 of PO creation wizard (see Convention 2).

**Via:** atomic RPC `next_po_number` (Iron Rule 11).

**Similar formats for other sequential numbers:** `RET-{supplier}-{seq}` for returns, `BOX-{seq}` for shipments.

## 10. Soft Delete

**Pattern:** `is_deleted = true` flag instead of physical DELETE.

**Rules:**
- All `.select()` queries must filter `.eq('is_deleted', false)`
- Permanent delete requires double PIN confirmation (user confirms, enters PIN, confirms again, enters PIN again)
- Soft-deleted rows remain visible to admin-mode users for restore

**Why:** audit trail, accidental recovery, referential integrity for historical records.

## 11. writeLog Pattern

**Pattern:** Every data mutation calls `writeLog(action, inventoryId, details)`.

**`details` object contains field-level changes** for audit trail:
```js
{
  changes: [
    { field: 'quantity', old: 5, new: 7 },
    { field: 'sell_price', old: 120, new: 150 }
  ]
}
```

**This is the legacy inventory-specific logger.** The newer project-wide logger is `shared/js/activity-logger.js` which writes to `activity_log` table. Both exist — `inventory_logs` is inventory-specific history; `activity_log` is project-wide audit. Don't conflate them.

## 12. Hebrew ↔ English Maps

**Pattern:** `FIELD_MAP` (column names) and `ENUM_MAP` (enum values).

**Directions:**
- `FIELD_MAP` — English → Hebrew
- `FIELD_MAP_REV` — Hebrew → English
- `ENUM_MAP` — English → Hebrew
- `ENUM_REV` — Hebrew → English

**Helpers:** `enToHe()`, `heToEn()`

**Rule (Iron Rule 5):** every new DB field must be added to `FIELD_MAP` in `js/shared.js`.

## 13. Brand Filters

**Pattern:** A global `allBrandsData[]` array stores all brands (including `currentQty`). `renderBrandsTable()` reads 4 filter dropdowns and re-renders:
- `brand-filter-active`
- `brand-filter-sync`
- `brand-filter-type`
- `brand-filter-low-stock`

**Immediate-save toggles:** `setBrandActive(brandId, isActive)` updates DB immediately and re-renders the table.

**Why in-memory:** brands are a small bounded set (dozens, not thousands), so filtering client-side is fast and responsive.

## 14. tenant_id on All Writes (Defense in Depth)

**Pattern:** Every `.insert()` and `.upsert()` must include `tenant_id: getTenantId()`.

**Every `.select()` should also filter:** `.eq('tenant_id', getTenantId())` as defense-in-depth alongside RLS.

**Why both:** RLS is the security boundary, but explicit filtering catches bugs during development (when you're testing impersonation or switching tenants) and protects against hypothetical RLS policy mistakes.

**This is Rule 22 in `CLAUDE.md`.** Listed here too because it shows up constantly in code.

---

## N. PostgREST query patterns (added 2026-05-20 from `M4_SHORT_LINKS_400_FIX` P-AUTHOR-2 + `M4_SHORT_LINKS_DASHBOARD_REDESIGN` P-AUTHOR-4)

PostgREST (the REST layer Supabase exposes) has two well-known soft-limits the project has tripped over multiple times. Codifying them here so the fourth occurrence doesn't burn another hour:

### N.1 URL-size limit — `.in('id', [list of N UUIDs])`

PostgREST builds queries into the URL. The default URL-size limit lands somewhere around **16 KB** in production (the exact ceiling varies by deployment, but assume 16 KB to be safe). A 36-char UUID plus the `%2C` separator costs ~40 bytes per item. Empirically the limit fires around **~200 UUIDs per `.in()` call**.

**Symptoms:** request returns 400 Bad Request, `URL too long` in the error body. The 1001st item silently dropped is even worse — no error, just incomplete results.

**Patterns to use:**
- **Chunked fetch.** When a `.in('id', [list])` needs N > 200 items, fetch in chunks of 200 and merge in JS. Reference: `crm-messaging-broadcast-queue.js` `fetchLeadRows` (200/chunk) + `crm-queue-live.js` `fetchLeadsForRows` (200/chunk).
- **Server-side join.** If the parent set is itself a SELECT (`crm_message_queue WHERE status='queued'`), use a PostgREST embedded join `crm_message_queue.select('*, crm_leads(...)')` so the join happens server-side and no `.in()` payload is needed.

### N.2 Response-row 1000-row default cap

PostgREST's default response cap is **1000 rows**. A `.select(...)` against a table with more than 1000 matching rows returns 1000 — silently, no error, no Range-header warning unless you opt in.

**Symptoms:** "the count looks low," "broadcast-specific rows are missing," "the dashboard says X but the SQL probe says 10X."

**Patterns to use:**
- **Embedded JOIN for parent-child fetches.** When fetching parents + their children, use PostgREST's embed: `tableA.select('*, tableB(*)')`. The embed runs the child query as a subquery scoped to the returned parent IDs, which bypasses the 1000-row cap on the child side. Reference: `crm-short-links-tiles/drilldown.js` after `M4_SHORT_LINKS_DASHBOARD_REDESIGN` amendment-2.
- **Explicit `.range(0, N)` + chunked pagination.** When embed isn't viable (e.g., the child set is independent and you need it sorted), iterate with explicit ranges.
- **Server-side aggregate.** When the metric is "count" or "sum" only, write a SECURITY DEFINER RPC or a materialized view rather than fetching individual rows through PostgREST.

**Cardinality estimate is mandatory** for every `.select(...)` against `crm_message_log` (Prizma ~6K), `short_links` (Prizma ~8K), `crm_event_attendees` (Prizma ~230), `crm_leads` (Prizma ~1300). Estimate in the SPEC §0; verify with `SELECT count(*) FROM <table> WHERE tenant_id=<prizma>`.

---

## How to Add a New Convention

1. **First check if it already exists.** Read through this file and Ctrl+F. Per Rule 21, don't add a second way to do something that already has a convention.
2. **Try to pattern-match with an existing one.** If your new pattern is a variation of an existing convention, extend the existing entry instead of creating a new one.
3. **If it's genuinely new:** add a numbered entry with: name, pattern description, where it's used, how it works, and why. Commit the convention with the first code that uses it.
4. **Never a convention-of-one.** If only one file does it, it's not a convention — it's a one-off. Wait until you see the pattern repeat before promoting it here.

---

*Conventions evolve. If a pattern becomes Iron Rule material (enforceable, never-break), promote it to `CLAUDE.md` Iron Rules section and delete it from here (Rule 21).*
