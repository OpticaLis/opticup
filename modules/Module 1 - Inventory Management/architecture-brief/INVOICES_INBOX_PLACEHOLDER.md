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
