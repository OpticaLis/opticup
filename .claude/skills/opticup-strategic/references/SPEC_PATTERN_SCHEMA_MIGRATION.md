# SPEC Pattern: Schema migration + code carve-out + DROP in one SPEC

## Use when
Replacing an existing DB column or table with a richer model, where shadow-keeping
the old field as a compatibility layer is acceptable for a single SPEC duration.

## Six commits, exact order

1. Add new columns/tables (DDL).
2. Install one-way sync trigger from new → old.
3. Backfill new from old.
4. Add any RPCs/templates that consume the new shape.
5. Carve out: replace every read/write of old → new in active code (JS, TS, EFs, views).
6. Drop old + close SPEC.

## Key safety properties

- Sync trigger is ONE-WAY (new → old). Bidirectional creates an infinite loop.
- Backfill happens AFTER trigger so new writes during backfill stay consistent.
- DROP happens LAST and ONLY after `grep` returns 0 references in active code.
- View recreation may be a 6th migration (separate from the count-of-X criteria) —
  count physical .sql files explicitly.
- QA must include a CHECK-constraint rejection test, RPC error-path tests, and
  a UI smoke test for any pre-existing UI that touched the old field.

## Reference implementation

`modules/Module 4 - CRM/docs/specs/M4_ATTENDEE_PAYMENT_SCHEMA/SPEC.md`
(closed verdict 🟢 2026-04-25, commit `ddad783`).
