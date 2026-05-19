# BRIEF — Sequential Numbering: Investigation + Migration Plan

**For:** Claude Code on Daniel's Windows desktop. Acting as opticup-architect (or sub-agent for the investigation phase).

**Type:** 2-phase task. **Phase 1 = investigation only (~30-45 min, read-only).** Phase 2 (the actual migration SPEC) is **deferred until after M1 lens completes 100%**.

**Daniel directive (2026-05-18):** Run Phase 1 investigation now (does not block Group C). Phase 2 SPEC deferred to after M1 lens close.

---

## Context

Today (2026-05-18) the Pipeline ran into a defect class around sequential numbering:

- 8 RPCs (`next_lot_number`, `next_receipt_number`, `next_po_number`, `next_transfer_number`, `next_box_number`, `next_internal_doc_number`, `next_purchase_order_number`, `next_return_number`) all use the same pattern: `MAX(CAST(SUBSTRING(...) AS INT)) + 1` on the data column.
- A single row with a non-numeric suffix (e.g., `LOT-PO300005-1` on demo `stock_lot`) makes the CAST throw, the RPC returns NULL, and every future insert via that RPC fails.
- 2 resilience SPECs today applied a regex guard `WHERE ... ~ '^[0-9]+$'` to filter non-conforming rows before the CAST. This is a tactical patch, not the structural fix.

**The structural question Daniel raised:**

> "מספור אחיד בסדר עולה שלא יכול להישבר" — a unified numbering system in ascending order that cannot break.

Daniel recalled prior conversations where Orders + Customers modules use PostgreSQL `SEQUENCE` objects with `nextval()` for guaranteed monotonic numbering. The architect's recollection is uncertain. Phase 1 verifies this empirically.

---

## Phase 1 — Investigation (NOW, ~30-45 min, READ-ONLY)

**Goal:** Produce a structured report that answers 4 questions. NO code changes. NO migrations. NO file writes outside `architecture-brief/`.

### Question 1 — Do Orders + Customers modules actually use PostgreSQL SEQUENCEs for their numbering?

Search Supabase live DB:
```sql
SELECT
  sequence_schema, sequence_name, data_type, start_value, increment
FROM information_schema.sequences
WHERE sequence_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY sequence_name;
```

Then cross-reference with `pg_proc` for all functions with names matching `next_*` or starting with `generate_`:
```sql
SELECT
  proname,
  pg_get_function_arguments(oid) AS args,
  pg_get_functiondef(oid) AS body
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND (proname LIKE 'next_%' OR proname LIKE 'generate_%')
ORDER BY proname;
```

Document the findings in the report:
- Which functions use `nextval()` from a sequence? List them.
- Which functions use `MAX(CAST(...))` pattern? List all 8 we already know + any others.
- Which functions use something else entirely?

### Question 2 — What sequences (if any) already exist?

If sequences exist for Orders/Customers/anywhere, document:
- Sequence name
- Current `last_value` (via `SELECT last_value FROM <seq>;`)
- Which table.column uses it (`pg_depend` joins, or grep for `nextval('seq_name'`)
- Whether it's tenant-scoped or global
- Format of the consuming column (e.g., `prefix-{nextval}` vs raw `nextval`)

### Question 3 — Format heterogeneity across the 8 fragile RPCs

Quote the actual data format observed per RPC's target column:

| RPC | Target table.column | Format observed on demo | Format observed on Prizma | Has branch prefix? | Has reset cycle? |
|---|---|---|---|---|---|
| `next_lot_number` | stock_lot.lot_number | e.g. LOT-000017 | ??? | | |
| `next_receipt_number` | purchase_receipt.receipt_number | e.g. RCP-9016-0001 | ??? | YES (9016 = branch) | |
| `next_po_number` | purchase_order.po_number | e.g. PO-300007 | ??? | | |
| `next_transfer_number` | ??? | ??? | ??? | | |
| `next_box_number` | shipment_box.box_number | e.g. BOX-0002 | ??? | | |
| `next_internal_doc_number` | ??? | ??? | ??? | | |
| `next_purchase_order_number` | ??? — is this duplicate of next_po_number? | ??? | ??? | | |
| `next_return_number` | ??? | e.g. RET-9016-0003 | ??? | YES (9016 = branch) | |

**Critical sub-question:** Is `next_purchase_order_number` actually a duplicate of `next_po_number`? If yes, one should be deprecated (Iron Rule 21).

### Question 4 — Consumer surface area

For each of the 8 RPCs, document:
- Which JS files call it (`grep -rn "<rpc_name>" js/ modules/ supabase/functions/`)
- Whether the JS parses/displays the returned number (e.g., displaying "PO-300007" in UI)
- Whether the JS depends on the **format** (prefix, padding, branch suffix) — i.e., would the UI break if we changed the format?

This determines the blast radius of the future Phase 2 migration.

### Phase 1 Deliverable

Write the report to:
```
modules/Module 1.5 - Shared Components/architecture-brief/SEQUENTIAL_NUMBERING_INVESTIGATION_REPORT.md
```

Structure:
- **§1 Executive summary** (3-5 bullets — does the project use sequences anywhere? if yes where, if no, why)
- **§2 Sequence inventory** (table — every existing sequence)
- **§3 RPC inventory** (8 RPCs + any others found, with format analysis per Q3)
- **§4 Consumer surface** (per-RPC JS callers + format dependencies per Q4)
- **§5 Foreman recommendation for Phase 2** (the actual migration SPEC scope — what to keep, what to migrate, what to deprecate)

Then commit + push:
```
docs(arch): sequential numbering investigation report (Phase 1)
```

Notify Daniel with a 5-line Hebrew summary:
- האם sequences כבר בשימוש בפרויקט (Q1)?
- כמה RPCs יש שצריך לטפל בהם (Q3)?
- האם יש כפילות (Q3.purchase_order)?
- כמה JS callers צריכים שינוי (Q4)?
- Phase 2 estimate (hours).

---

## Phase 2 — Migration SPEC (DEFERRED until after M1 lens 100%)

**Do NOT execute Phase 2 now.** Phase 2 is a separate Pipeline that:
- Designs the unified numbering system (uniform pattern across all 8 RPCs OR per-RPC sequences with consistent shape)
- Writes one migration creating the sequences + setting their `lastval` to current MAX
- Rewrites the 8 RPCs to use `nextval()` instead of `MAX(CAST(...))`
- Updates JS consumers if format changes
- Removes the regex-guard patches (since they're no longer needed)
- Full Tier C VFV on all 8 RPCs (insert + verify monotonic + verify cannot break under corrupt seed data)

Phase 2 estimate (rough): 4-6 hours.

**Phase 2 trigger:** Daniel authorizes after M1 lens 100% closes (after Group C — Catalog Admin + Private Catalog — completes).

---

## Constraints (Phase 1)

- READ-ONLY: no DDL, no DML, no JS edits
- Output stays in `modules/Module 1.5 - Shared Components/architecture-brief/`
- Uses Supabase MCP `execute_sql` (Level 1 read-only) + grep
- Iron Rule 31 gate at commit time (the report file itself)
- Does NOT block any other Pipeline; Group C dispatch is independent

## Stop-on-deviation (Phase 1)

- If Q1 query reveals 50+ sequences in the schema → STOP, summarize and ask Daniel before going deeper (might be too big to investigate in 45 min)
- If consumer grep reveals 20+ JS files depending on format → STOP, flag as major blast radius
- If Q3 reveals 2+ of the 8 RPCs are actually duplicates → STOP, document and flag for Daniel cleanup decision

---

## TECH_DEBT entry to add

Before starting Phase 1, ADD an entry to `TECH_DEBT.md` at repo root:

```markdown
## TD-XX — Sequential Numbering: structural migration to PostgreSQL SEQUENCEs (2026-05-18)

**Status:** TECH_DEBT, pending Phase 2 SPEC.
**Severity:** MEDIUM — current regex-guard patch (8 RPCs hardened with `~ '^[0-9]+$'` filter, 2026-05-18) prevents crash but is not the structural fix.
**Scope:** 8 sequential-number RPCs across the project use `MAX(CAST(SUBSTRING(...) AS INT)) + 1` instead of PostgreSQL SEQUENCE objects. Class is fragile to data corruption.
**Trigger to act:** after M1 lens 100% closes.
**Investigation status:** Phase 1 investigation Pipeline authored 2026-05-18. Report at `modules/Module 1.5 - Shared Components/architecture-brief/SEQUENTIAL_NUMBERING_INVESTIGATION_REPORT.md` when complete.
**Estimated effort (Phase 2 migration):** 4-6 hours.
**Daniel-directed:** Yes — Daniel raised the architectural concern 2026-05-18 evening.
```

Get the real TD-XX number from existing TECH_DEBT.md.

---

**END BRIEF**

_Authored by Cowork-Architect 2026-05-18 evening. Phase 1 authorized for immediate execution. Phase 2 deferred per Daniel directive._
