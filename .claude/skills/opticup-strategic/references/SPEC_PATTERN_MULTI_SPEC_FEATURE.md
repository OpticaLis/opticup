# SPEC Pattern: Multi-SPEC feature delivered in trio (Schema → UI → Automation)

## Use when
A new feature requires (a) DB schema changes, (b) UI to interact with the schema,
and (c) automations that operate on the schema based on UI/system events.

## Three SPECs, exact order

1. **Schema SPEC** — DB columns, RPCs, indexes, helper migrations. Cross-tenant
   by design (DDL is one-shot global). Reference: `M4_ATTENDEE_PAYMENT_SCHEMA`.
2. **UI SPEC** — buttons, modals, status indicators, notifications. Surfaces
   the schema to staff. Reference: `M4_ATTENDEE_PAYMENT_UI`.
3. **Automation SPEC** — system events that trigger schema-state side effects.
   Reference: `M4_ATTENDEE_PAYMENT_AUTOMATION`.

## Why this order is mandatory

- Schema first because UI + automations both depend on it.
- UI before automations because automations may reuse UI's helper modules
  (e.g., bell refresh).
- Automations last because they may need to test against UI-driven state changes.

## Common pitfalls (with prevention)

- **Premature scope creep:** UI SPEC may want to add "helpful" automations.
  Don't. Defer.
- **Helper module sprawl:** if SPEC #2 + #3 both create helpers, plan their
  separation of concern in advance (e.g., #2 = rendering helpers, #3 =
  side-effect helpers).
- **Inline F1 fixes are normal in trio.** UI SPECs often surface schema-side
  bugs (column reference typos, etc.). Bundle the fix as inline commit, not
  a new SPEC.
- **The trio's QA reveals scope leftover.** Examples in this trio: parity gap
  (event-day vs event-detail) and coupon status logic — both surfaced AFTER
  UI SPEC closed, addressed via small inline-style SPEC
  (`M4_EVENT_DAY_PARITY_FIX`). Plan for ~1 mid-trio fix SPEC.

## Reference implementation

6 SPECs + 3 inline F1 fixes closed in one strategic-chat session (2026-04-25).
Total: schema migration, full UI, two automations, parity fix, all clean.
