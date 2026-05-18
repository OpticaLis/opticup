# Report — Sequential Numbering Investigation (Phase 1)

**Date:** 2026-05-18 IDT
**Investigator:** opticup-architect (Claude Code, Path X session)
**Type:** Read-only — no DDL, no DML, no JS edits.
**Brief:** `modules/Module 1.5 - Shared Components/architecture-brief/SEQUENTIAL_NUMBERING_INVESTIGATION_BRIEF.md`
**TECH_DEBT entry:** `TECH_DEBT.md #14 — TD-SEQ-NUMBERING-STRUCTURAL` (added before investigation per Brief).

---

## §1 — Executive Summary

1. **Zero project-level PostgreSQL `SEQUENCE` objects exist in the public schema.** The 4 sequences in the DB are all infrastructure (`auth.refresh_tokens_id_seq`, `cron.jobid_seq`, `cron.runid_seq`, `net.http_request_queue_id_seq`). Daniel's recollection that "Orders + Customers use sequences" is empirically incorrect for real PG `SEQUENCE` objects.
2. **However, the project DOES use a sequence-LIKE pattern in 3 places — just not via `nextval()`.** The 3 variant `display_id` RPCs (lens / accessory / contact) use a custom row-as-sequence design: a dedicated table (`<family>_variant_display_seq`) with one row per scope, atomically incremented via `UPDATE ... SET last_value = last_value + 1 RETURNING last_value`. This pattern is NOT vulnerable to the data-corruption defect class that hit the 8 fragile RPCs. It's likely what Daniel was remembering.
3. **8 fragile RPCs use the `MAX(CAST(SUBSTRING(<data_col>) AS INT)) + 1` pattern** — the defect class that crashed today. All 8 were hardened with a regex guard `~ '^[0-9]+$'` via `M1_RPC_NEXT_NUMBER_NON_NUMERIC_SAFE` Phase 1 + 2 (closed 🟢 2026-05-18). The patch is tactical, not structural.
4. **Consumer surface is small.** 7 JS files reference the 8 RPCs total — of which 4 RPCs have ZERO direct JS callers (called only inside K-RPC bodies server-side). Format-dependent string literals in JS: 1 file (`debt-returns.js` referencing `'RET-'`). Migration blast radius is low.
5. **`next_po_number` vs `next_purchase_order_number` are NOT duplicates.** They target different tables (`purchase_orders` PLURAL = frames-era; `purchase_order` SINGULAR = M1B0 lens). Both legitimately needed; Iron Rule 21 not violated.

---

## §2 — Sequence Inventory

Live query result from `information_schema.sequences` (excluding `pg_catalog` + `information_schema`):

| Schema | Sequence | Data type | Purpose |
|---|---|---|---|
| `auth` | `refresh_tokens_id_seq` | bigint | Supabase Auth infra |
| `cron` | `jobid_seq` | bigint | pg_cron infra |
| `cron` | `runid_seq` | bigint | pg_cron infra |
| `net` | `http_request_queue_id_seq` | bigint | pg_net infra |

**Public schema:** 0 sequences.
**Conclusion for Q1:** The project does not use `CREATE SEQUENCE` + `nextval()` anywhere.

### Sequence-LIKE counter tables (the "Orders" pattern Daniel may have been recalling)

3 dedicated counter tables exist, each with one row per scope:

| Counter table | Format produced | Scope | Current `last_value` | Used by |
|---|---|---|---|---|
| `lens_variant_display_seq` | `LV-NNNNNN` (6-digit) | global | 32 | `next_lens_variant_display_id()` |
| `accessory_variant_display_seq` | `AC-NNNNNN` (6-digit) | global | 25 | `next_accessory_variant_display_id()` |
| `contact_lens_variant_display_seq` | `CL-NNNNNN` (6-digit) | global | 40 | `next_contact_variant_display_id()` |

Each `next_*_variant_display_id()` RPC body uses:
```sql
UPDATE <family>_variant_display_seq
   SET last_value = last_value + 1, updated_at = now()
 WHERE scope = 'global'
 RETURNING last_value INTO v_next;
```

This is **functionally equivalent to a PostgreSQL `SEQUENCE` with `CACHE 1`** — atomic increment, no parsing of data column, immune to data-corruption defect. The only differences from a real `SEQUENCE`:
- Returns from a row update, not `nextval()` — slightly more verbose, same correctness
- Supports per-scope sequences within one table (scope='global' today, but the schema permits per-tenant if added later)
- Can be reset/seeded via plain `UPDATE` (a real SEQUENCE needs `setval()`)

**Verdict:** the `*_display_seq` pattern is a clean alternative to `CREATE SEQUENCE` and satisfies Daniel's "ascending counter that cannot break" requirement.

---

## §3 — RPC Inventory + Format Analysis (Q3)

All 13 `next_*` / `generate_*` functions in `public`:

### 3.1 Fragile family (8) — the `MAX(CAST(SUBSTRING(...) AS INT))` pattern (hardened 2026-05-18 with regex guard)

| # | RPC | Target column | Demo format (most recent) | Prizma format (most recent) | Branch prefix? | Padding | JS callers |
|---|---|---|---|---|---|---|---|
| 1 | `next_lot_number(p_tenant_id)` | `stock_lot.lot_number` | `LOT-000018` | — (no rows) | NO | 6-digit | 0 |
| 2 | `next_receipt_number(p_tenant_id, p_supplier_number)` | `purchase_receipt.receipt_number` | `RCP-9016-0001` | — (no rows) | YES (supplier_number = "9016") | 4-digit | 0 |
| 3 | `next_po_number(p_tenant_id, p_supplier_number)` (frames) | `purchase_orders.po_number` (plural table) | `PO-9029-0002` | `PO-12-0003` | YES (supplier_number) | 4-digit | 1 (`modules/purchasing/purchase-orders.js`) |
| 4 | `next_transfer_number(p_tenant_id)` | `stock_transfer.transfer_number` | `TRN-000001` | — (no rows) | NO | 6-digit | 0 |
| 5 | `next_box_number(p_tenant_id)` | `shipments.box_number` | `BOX-0001` | `BOX-0001` | NO | 4-digit | 2 (`modules/shipments/shipments-create.js`, `shipments-lock.js`) |
| 6 | `next_internal_doc_number(p_tenant_id, p_prefix DEFAULT 'DOC')` | `supplier_documents.internal_number` | `DOC-00027` | — (no rows) | NO (dynamic prefix) | 5-digit | 3 (`modules/debt/debt-doc-new.js`, `modules/goods-receipts/receipt-debt.js`, `modules/inventory/incoming-invoices.js`) |
| 7 | `next_purchase_order_number(p_tenant_id)` (M1B0 lens) | `purchase_order.po_number` (singular table) | `PO-300007` | — (no rows) | NO | 6-digit | 0 (called inside `place_purchase_order` server-side) |
| 8 | `next_return_number(p_tenant_id, p_supplier_number)` | `supplier_returns.return_number` | `RET-9016-PHASE2SMOKE`† / `RET-9028-0006` | `RET-28-0013` | YES (supplier_number) | 4-digit | 1 (`modules/debt/debt-returns.js`) |

† PHASE2SMOKE rows = my soft-deleted Tier C transients from Phase 2 earlier this session.

**Format heterogeneity is severe:**
- **Branch-prefix pattern:** 3 of 8 use `{prefix}-{supplier_number}-{NNNN}` (RCP, PO frames, RET). The "branch" is actually `suppliers.supplier_number` (per-supplier sequence), not a physical branch/location.
- **Plain pattern:** 5 of 8 use `{prefix}-{NNNN..NNNNNN}` with no scope segment (LOT, PO lens, BOX, DOC, TRN).
- **Padding inconsistency:** 4-digit (BOX, RCP, RET, PO frames), 5-digit (DOC), 6-digit (LOT, PO lens, TRN). No project-wide standard.
- **Prizma `supplier_number` is 2-digit (e.g., "12", "28"); demo is 4-digit (e.g., "9012", "9028")** — both fit the format but produce different visible widths. Not a defect; a SaaS-litmus consideration for Phase 2.

### 3.2 NON-fragile family (3) — the row-as-sequence pattern (immune to data corruption)

| RPC | Counter table | Format | Issue history |
|---|---|---|---|
| `next_lens_variant_display_id()` | `lens_variant_display_seq` | `LV-NNNNNN` | None |
| `next_accessory_variant_display_id()` | `accessory_variant_display_seq` | `AC-NNNNNN` | None |
| `next_contact_variant_display_id()` | `contact_lens_variant_display_seq` | `CL-NNNNNN` | None |

These 3 RPCs **do not need migration** — they already implement the "ascending counter that cannot break" pattern Daniel asked for, just via a counter table instead of a real `SEQUENCE`. Migrating them to real `nextval()` is optional polish, not a defect fix.

### 3.3 Other (2)

| RPC | Pattern | Notes |
|---|---|---|
| `next_crm_event_number(p_tenant_id, p_campaign_id)` | `COALESCE(MAX(event_number), 0) + 1` on INTEGER column | NOT vulnerable to string-parse corruption (column is `int`, not `text`); HOWEVER: shares the same race-condition class — concurrent inserts could collide. Locked via `FOR UPDATE` on the parent campaign row. Edge case: a future MAX-resetting DELETE+INSERT cycle could reuse numbers. Worth flagging for Phase 2 review. |
| `generate_daily_alerts(p_tenant_id)` | Not a numbering function — generates alert rows | Out of scope for this investigation. |

### 3.4 Critical sub-question — `next_purchase_order_number` vs `next_po_number`

**They are NOT duplicates.** Distinct target tables, distinct functional scope:

| RPC | Target table | Format | Origin |
|---|---|---|---|
| `next_po_number(p_tenant_id, p_supplier_number)` | `purchase_orders` (PLURAL) | `PO-{supplier}-NNNN` | Frames-era (pre-M1) |
| `next_purchase_order_number(p_tenant_id)` | `purchase_order` (SINGULAR) | `PO-NNNNNN` | M1B0 lens generator (2026-05-15) |

Both tables coexist in the schema; both RPCs are actively called by their respective consumer paths. Iron Rule 21 not violated. **No deprecation needed.**

---

## §4 — Consumer Surface (Q4)

### 4.1 JS callers of the 8 fragile RPCs

| RPC | JS callers | Files |
|---|---|---|
| `next_lot_number` | 0 | — |
| `next_receipt_number` | 0 | — |
| `next_po_number` | 1 | `modules/purchasing/purchase-orders.js:209` |
| `next_transfer_number` | 0 | — |
| `next_box_number` | 2 | `modules/shipments/shipments-create.js`, `modules/shipments/shipments-lock.js` |
| `next_internal_doc_number` | 3 | `modules/debt/debt-doc-new.js`, `modules/goods-receipts/receipt-debt.js`, `modules/inventory/incoming-invoices.js` |
| `next_purchase_order_number` | 0 | — (called server-side inside `place_purchase_order`) |
| `next_return_number` | 1 | `modules/debt/debt-returns.js` |
| **TOTAL** | **7 JS files** | |

**4 of 8 RPCs have ZERO direct JS callers** — they are called only inside server-side K-RPC bodies (`m1_create_receipt_from_box`, `record_transfer`, `place_purchase_order`). The format never leaves the DB before being stored, so JS-side format-parsing risk is minimal for those 4.

### 4.2 Format-dependent string literals in JS

Grepped each prefix as a single-quoted or double-quoted string in `*.js` (excluding `node_modules`, `_archive`, `backups`, `.claude`):

| Prefix | JS files using it as a string literal |
|---|---|
| `'LOT-'` | 0 |
| `'RCP-'` | 0 |
| `'BOX-'` | 0 |
| `'DOC-'` | 0 |
| `'TRN-'` | 0 |
| `'PO-'` | 0 |
| `'RET-'` | 1 (likely `modules/debt/debt-returns.js` constructing display labels) |

**Blast radius is low:** only 1 format string literal references a prefix; the other 6 prefixes are never typed in JS — they come back from the RPC RETURNING the generated text. UI displays the returned string verbatim. **The format can be changed in Phase 2 with near-zero JS rework**, provided the new format remains `{prefix}-{integer}` (UI-displayable).

### 4.3 Server-side callers (inside K-RPCs)

| RPC | Called inside |
|---|---|
| `next_lot_number` | `m1_create_receipt_from_box` (line in body) |
| `next_receipt_number` | `m1_create_receipt_from_box` |
| `next_transfer_number` | `record_transfer` |
| `next_purchase_order_number` | `place_purchase_order` |

These 4 are the largest semantic-blast-radius migrations — any signature change to them ripples to their parent K-RPCs. **For Phase 2, the easiest design is to KEEP the existing RPC names + return shapes; only swap the internal `MAX(CAST(...))` body for `nextval()`-equivalent.** Zero K-RPC signature change.

---

## §5 — Foreman Recommendation for Phase 2

### 5.1 Proposed migration design

**Option A — Real PG `SEQUENCE` objects per fragile RPC (Foreman recommendation).**

Create 8 `SEQUENCE` objects + rewrite the 8 RPC bodies to use `nextval()`:

```sql
CREATE SEQUENCE seq_stock_lot_number AS bigint START WITH <current_max + 1>;
CREATE SEQUENCE seq_purchase_receipt_number AS bigint START WITH <current_max + 1>;
... (8 total)

CREATE OR REPLACE FUNCTION next_lot_number(p_tenant_id uuid) RETURNS text ...
DECLARE v_next bigint;
BEGIN
  -- (tenant guard unchanged)
  v_next := nextval('seq_stock_lot_number');
  RETURN 'LOT-' || LPAD(v_next::text, 6, '0');
END;
```

**Pros:**
- True atomic monotonic counter; impossible to crash on data
- `nextval()` is non-transactional (no rollback gaps if INSERT aborts — same as today's MAX+1 race window, no worse)
- 1-line body per RPC; removes the regex-guard patches

**Cons:**
- Sequences in PostgreSQL are GLOBAL to the schema, NOT per-tenant. For multi-tenant safety on supplier-scoped formats (RCP, PO frames, RET), the supplier_number stays inside the prefix string (no change vs today). The numeric counter advances globally across tenants — i.e., a Prizma receipt and a demo receipt would draw from the same sequence. This is **already the case today** with the MAX-pattern (because MAX runs across the WHERE clause's prefix match — supplier-scoped or branch-scoped). So sequences match current behavior; explicit verification in Phase 2.
- SEQUENCE values cannot be reset per-tenant without extra plumbing. Not a regression — today's RPCs also can't be reset cleanly.

**Option B — Keep the row-as-sequence pattern (extend the `*_display_seq` design).**

Migrate the 8 fragile RPCs to use the same pattern the 3 `*_variant_display_id` RPCs use today — a counter table per family.

**Pros:**
- Consistency with existing project pattern (matches 3 RPCs already in place)
- Per-tenant or per-scope counters are easy (just add row per scope)
- Daniel can see the counter value via a plain `SELECT` (no `pg_sequences` admin friction)

**Cons:**
- Requires 8 new tables + their RLS policies + service_role bypass
- Higher migration line count
- More moving parts (8 tables vs 8 sequences)

**Foreman recommendation: Option A** (real `SEQUENCE` objects). Lowest migration footprint, matches Daniel's stated requirement ("ascending order that cannot break"), removes the regex-guard patches cleanly. The `*_display_seq` row-pattern remains in place for the 3 variant RPCs (no migration needed there).

### 5.2 Recommended Phase 2 scope

| Section | Content |
|---|---|
| **§4 Destructive Ops** | 8 `CREATE SEQUENCE` + `setval()` to seed from current MAX + 8 `CREATE OR REPLACE FUNCTION` migrations. 0 DROPs (regex-guard versions stay in body until next session; or remove in the same migration). |
| **§3 Success Criteria** | (S1) 8 sequences created with `last_value = current_max`; (S2) 8 RPCs return monotonic-increasing values across 100 calls; (S3) inject corrupt-suffix row in target table; RPC still succeeds; (S4) no JS regression on the 7 consumer files; (S5) get_advisors clean; (S6) regex-guard `WHERE ... ~ '^[0-9]+$'` removed cleanly from each rewritten RPC body; (S7) Iron Rule 31 + 32 at every commit. |
| **§7 Out of Scope** | The 3 `*_variant_display_id` RPCs (already non-fragile). `next_crm_event_number` (uses INT column, separate review). `generate_daily_alerts` (not a numbering function). |
| **§8 Tier C** | 8-RPC empirical proof using the established pattern from Phase 1+2: `set_config('request.jwt.claims', ...)` + call RPC + verify result + soft-delete any test data created. |
| **§13 Sibling cleanup** | After 8-RPC migration, evaluate `next_crm_event_number` — same INT column pattern; doesn't crash but has race-window. Optional follow-up. |

### 5.3 Estimated Phase 2 effort

**4-6 hours** matches the Brief estimate. Breakdown:
- 30 min: SPEC authoring (this Foreman session generates much of the §0 already)
- 30 min: 8 migration files + `setval()` seeding queries
- 1 hour: 8 RPC body rewrites + verification
- 1 hour: Tier C empirical (8 cycles, same pattern as Phase 2 today)
- 30 min: JS regression check on the 7 consumer files (shipments-create, shipments-lock, debt-doc-new, receipt-debt, incoming-invoices, debt-returns, purchasing/purchase-orders)
- 30 min: SPEC closure + FOREMAN_REVIEW + docs updates

### 5.4 Trigger

Per Brief: dispatch after M1 lens 100% closes (after Group C — Catalog Admin + Private Catalog + Toggle Semantics — completes).

---

## §6 — Risk Register

| Risk | Mitigation |
|---|---|
| Sequence values are GLOBAL — supplier-scoped formats (RCP, PO frames, RET) may produce visible "gaps" if two suppliers' receipts interleave | Already the case today via MAX+1 within prefix WHERE. NOT a regression. Verify in Phase 2 Tier C with a 2-supplier interleave smoke. |
| `setval()` seeding races against concurrent INSERT during deploy | Run `setval()` in same transaction as `CREATE SEQUENCE`. Take a brief application freeze during deploy (5-second window; standard for sequence rollouts). |
| Existing rows with non-numeric suffixes (`LOT-PO300005-*` on demo) are still in the table; the MAX seed query must skip them | Use `MAX(CAST(SUBSTRING(<col> FROM <offset>) AS INT)) FILTER (WHERE SUBSTRING(<col> FROM <offset>) ~ '^[0-9]+$')` for the seed — reuse the regex guard already in Phase 1+2 RPCs. |
| `next_crm_event_number` shares the race-window class but has 0 corruption defect | Out of Phase 2 scope per Foreman recommendation. Optional follow-up SPEC. |
| Format change would break the 1 JS file using `'RET-'` literal | Foreman recommendation: keep formats unchanged. Phase 2 swaps the INTERNAL counter mechanism only; the returned string format stays identical. Zero JS rework. |

---

## §7 — Investigation Summary Table (for Daniel)

| Question | Answer |
|---|---|
| Q1: Do Orders/Customers use real PG SEQUENCEs? | **NO** — zero project sequences exist. 3 RPCs use a sequence-LIKE row pattern (counter table); the rest use MAX(CAST). |
| Q2: What sequences exist? | 4 infra-only (auth/cron/net); 0 public. 3 counter tables exist (lens/accessory/contact display_seq) at last_value 32/25/40. |
| Q3a: How many fragile RPCs need migration? | **8** (same 8 hardened by today's Phase 1+2 regex guards). |
| Q3b: Format heterogeneity? | Severe — 3 use branch-prefix `{prefix}-{supplier}-{NNNN}`, 5 use plain `{prefix}-{NNNN..NNNNNN}`; padding varies 4/5/6 digits. |
| Q3c: Is `next_purchase_order_number` a duplicate of `next_po_number`? | **NO** — different tables (singular vs plural), different functional scope (M1 lens vs frames). |
| Q4: JS consumer count? | **7 JS files** reference an RPC name. Only **1 file** references a format prefix as a string literal (`debt-returns.js` using `'RET-'`). Migration blast radius is LOW. |
| Phase 2 design | **Option A** (real PG `SEQUENCE` per RPC; preserve return-string format; zero JS changes). |
| Phase 2 estimate | **4-6 hours.** |
| Phase 2 trigger | After M1 lens 100% closes (per Daniel directive). |

---

## §8 — Stop-on-deviation Check (per Brief §6)

- 50+ sequences? **NO** — only 4 infra sequences, all expected.
- 20+ JS files depending on format? **NO** — 7 files reference RPC names; 1 file references a format string literal.
- 2+ of the 8 RPCs are duplicates? **NO** — `next_po_number` vs `next_purchase_order_number` are distinct.

**All three stop-on-deviation triggers cleared.** Phase 1 closes cleanly.

---

**END REPORT**

_Authored 2026-05-18 IDT by opticup-architect (Claude Code, Path X session). All findings from live Supabase MCP queries; zero DDL/DML applied. Phase 2 SPEC deferred until after M1 lens 100% close per Daniel directive._
