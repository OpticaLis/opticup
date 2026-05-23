# Activation Prompt — M7 + M8 SCHEMA Overnight Build

> Paste into a fresh Claude Code chat. Run-to-end, ~10-12 hours.
> Brief: `modules/Module 7 - Orders/architecture-brief/M7_M8_SCHEMA_OVERNIGHT_BRIEF.md`

---

```
Overnight Full-Auto Pipeline CHAIN — M7 + M8 SCHEMA (schema-only, no UI, no provider integration).

Brief: modules/Module 7 - Orders/architecture-brief/M7_M8_SCHEMA_OVERNIGHT_BRIEF.md

Activate `opticup-strategic` skill. Skill state inherits all harvested patterns (mandatory §0
Inner-call arity audit + Smoke-touched schema audit + Concurrent-Pipeline awareness envelope +
MIGRATION.md Applied Log + advisors-for-objects.mjs + P42 self-validate-before-delivery).

Read the overnight Brief end-to-end FIRST, then read both sealed module Briefs:
- modules/Module 7 - Orders/architecture-brief/M7_ORDERS_BRIEF.md
- modules/Module 8 - Payments/architecture-brief/M8_PAYMENTS_BRIEF.md

Run §6 pre-flight probes (7 SQL + shell — confirm M7/M8 tables don't exist, dependencies present
[M5 customers + M6 prescriptions + M1 inventory + purchase_order_line.sale_order_id], whether M1
decrement_inventory RPC exists, inventory shape, next_*_number pattern, demo fixtures from last
night's M5/M6 smoke, event-trigger pattern). Pin every result as §0 baseline.

THIS IS A CHAIN. Two halves, M7 first (M8 FKs to orders):

=== HALF 1 — M7 Orders schema ===
Author MODULE_7_ROADMAP.md + M7_SCHEMA SPEC at
  modules/Module 7 - Orders/docs/specs/M7_SCHEMA/SPEC.md
Then opticup-executor builds:
- Tables: orders (FK customer_id→M5, order_number sequential atomic), sub_orders (multi-state via
  flags active/quote/reservation + is_repair + has_open_task — NOT separate tables; FK
  prescription_glasses_id/prescription_contacts_id→M6), sub_order_items (FK inventory_id→M1),
  order_general_discounts, order_sequences.
- Views per Brief §4 (v_order_customer_summary, v_lab_queue surface, order summaries).
- RPCs: order create (atomic + order_number), sub-order add/edit, decrement_inventory/
  increment_inventory (atomic FOR UPDATE — M1 contract §4.3; check if M1 already has them via
  Probe 3, build thin wrappers only if absent), discount apply. All M1A discipline.
**MANDATORY M7 smoke ≥8/8 on demo**: create order + order_number allocated + sub-order flag
variants + line item + decrement_inventory atomic + increment on cancel + discount + cross-tenant
guard + anon-reject. Capture TEST_REPORT.md. Fail → STOP, escalate, HALT chain.

=== HALF 2 — M8 Payments schema ===
Author MODULE_8_ROADMAP.md + M8_SCHEMA SPEC at
  modules/Module 8 - Payments/docs/specs/M8_SCHEMA/SPEC.md
Then opticup-executor builds:
- Tables: payments (FK order_id→M7, state-machine, salary-deduction-pending status,
  returned-check reopen), payment_methods (config P19), payment_channels (config + state-machine),
  payment_capabilities (global pool), payment_adapters (SKELETON manifest config rows ONLY — seed
  Mock + Gama + Z Credit as config with capability flags, ZERO integration code), salary_deduction_pending
  (a View not a table).
- Views: v_order_payment_summary(order_id) [M7 reads], getPaymentsByCustomer surface [M5],
  v_payments_for_reports [M11 — unified across statuses].
- RPCs: record_payment (atomic, FK to order, emits first-payment event), refund/reverse,
  salary-deduction status transitions, check-returned handler (emits event to M7 + M4).
  Event mechanism: mirror M1's K3 trigger pattern (AFTER INSERT → queue table). M8 NEVER calls M7
  directly — emits events, M7 listens. Same discipline as Half 1.
**MANDATORY M8 smoke ≥8/8 + cross-contract smoke 6/6 on demo**: record_payment + FK enforced +
state transition + salary-deduction status + check-returned emits event + payment_methods config +
cross-tenant + anon-reject; THEN cross-contract: create_customer (M5) → create order → add
sub-order with prescription (M6) + line item (M1) inventory decrements → record_payment → first-payment
event fires → v_order_payment_summary shows total_paid → order status auto-advances quote→active.
Fail → STOP, escalate, HALT.

=== CLOSE ===
- opticup-reviewer reviews each half → REVIEW.md + advisors-for-objects.mjs.
- opticup-strategic Foreman → FOREMAN_REVIEW.md per module.
- Module docs (SESSION_CONTEXT + CHANGELOG + MODULE_MAP + ROADMAP — schema done, UI + adapter +
  migration pending). GLOBAL_MAP + GLOBAL_SCHEMA + DB_TABLES_REFERENCE merged additive.
  MIGRATION.md Applied Log. T-constants + FIELD_MAP.

Pipeline returns ONE Hebrew status line at chain end (finish-the-sequence — no pause between M7
and M8 unless real deviation):
  "M7 + M8 SCHEMA [🟢/🟡/🔴]. M7 smoke 8/8 + M8 smoke 8/8 + cross-contract 6/6. דו"חות בתיקיות הספקים.
   M9 פתוח לבנייה (FK ל-orders קיים). UI + adapter integration + migration = ספקים נפרדים."

Iron Rules in sharp focus: 1, 11, 14, 15, 16, 18, 19, 22, 23, 31, 32.

Out of scope (HARD — do NOT touch):
- ANY UI (checkout, order screen, daily-close, provider-config, print forms) — separate UI SPECs
- Real payment-provider integration (IPaymentProvider code, Gama/Z Credit charge/refund, webhooks,
  card tokenization) — payment_adapters is config-manifest SKELETON only; integration is separate SPEC
- M9 Lab schema — separate overnight run (M9 FKs to M7)
- M11/M12/M13 build — M7/M8 emit Views + events; consumers build later
- OpticPlus order/payment migration — separate SPEC
- Prizma data writes — DDL both tenants, smoke data demo only
- Merge to main (Daniel-only after QA)
- Relitigating sealed M7 + M8 decisions

On escalation: write modules/Module {7,8}/escalations/{ISO_TS}_{topic}.md + one Hebrew line. Halt.

Stop on deviation, not on success. Run-to-end. No 🟢 without M7 8/8 + M8 8/8 + cross-contract 6/6
all passing on demo. Per P42, self-validate every file write (line count + tail + markers) before
declaring any phase complete.
```

---

## Pre-flight checklist for Daniel

- [ ] Brief sealed at `modules/Module 7 - Orders/architecture-brief/M7_M8_SCHEMA_OVERNIGHT_BRIEF.md`
- [ ] M5 + M6 schema closed (done 2026-05-17) — confirmed dependencies present
- [ ] No other Claude Code session running on the same repo (or both claim pipeline-coordination locks)
- [ ] Demo tenant accessible + has the M5/M6 smoke fixtures (10 customers + 5 prescriptions)
- [ ] Supabase MCP connected
- [ ] Running in Claude Code, NOT Cowork

---

## Expected timing

- §6 probes + dependency pin: ~25 min
- M7 SPEC + ROADMAP: ~45 min
- M7 schema + Views + RPCs build: ~3 hours
- M7 smoke: ~30 min
- M8 SPEC + ROADMAP: ~45 min
- M8 schema + Views + RPCs + event mechanism: ~3-4 hours
- M8 + cross-contract smoke: ~45 min
- Reviews + Foreman + docs per module: ~1.5 hours

**Total: ~10-12 hours.** Single Claude Code session.

---

## What you'll have after the run

- M7 Orders: 5 tables + Views + RPCs, smoke 8/8.
- M8 Payments: 6 tables (adapters skeleton) + Views + RPCs + event mechanism, smoke 8/8 + cross-contract 6/6.
- **The full customer→order→payment data spine is live on demo** (M5→M6→M7→M8 + M1 inventory).
- **M9 (Lab) becomes buildable** — next overnight run.

**Next waves (Daniel-in-loop):** M9 Lab schema (10 tables + 5 engines), then UI SPECs for M5/M6/M7/M8, then payment-adapter live integration, then OpticPlus migration.

---

*End of activation prompt. Overnight schema-only chain. Two modules. No UI. No provider integration.*
