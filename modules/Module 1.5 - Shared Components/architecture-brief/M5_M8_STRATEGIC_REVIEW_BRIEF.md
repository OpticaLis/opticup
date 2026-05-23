# Module Brief — M5/M6/M7/M8 Strategic Review (Business-Logic + Cross-Contract Audit)

**Brief version:** v1
**Date:** 2026-05-18
**Author:** Architect
**Skill to load:** `opticup-strategic`
**Mode:** **READ-ONLY review.** No code changes, no SQL writes, no commits. Output is one report file.
**Sibling Brief (parallel):** `M5_M8_CODE_REVIEW_BRIEF.md` (separate Claude Code chat, `opticup-reviewer`).

---

## 1. Purpose

Four modules — M5 (Customers), M6 (Prescriptions), M7 (Orders), M8 (Payments) — were built schema-only across 3 fast overnight chains (2026-05-17 + 2026-05-18). Each closed 🟢 with its own smoke, but **no human or independent role has audited the four together — especially the contracts between them.** Before M9 (Lab) builds on top of M7, and before any UI builds on top of all four, we want a fresh adversarial strategic audit.

This Brief commissions the **business-logic + cross-contract audit**. Its sibling commissions the code/security/RLS audit. Both run in parallel, READ-ONLY, and converge into a Daniel-Architect review before M9.

**This review is NOT:** a re-execution, a code review (sibling's job), a feature-hunt, or a rubber-stamp of the 4 Foreman self-reviews.

**This review IS:** a skeptical pass over the customer→prescription→order→payment data spine, hunting for contract gaps, lifecycle inconsistencies, missing flows, and SaaS-litmus failures that the per-module smokes couldn't catch because each module was tested in isolation.

---

## 2. Scope — In

The reviewer reads all 4 modules' SPECs + EXECUTION_REPORTs + FINDINGS + FOREMAN_REVIEWs + the 4 sealed Architecture Briefs, plus live demo data, and tests across **eight axes**.

### Axis A — The customer→order→payment lifecycle end-to-end

Walk a real person through the full spine and verify every handoff has a contract:
1. Person registers (M5 `customers`, stage=prospect) → gets a prescription (M6) → places an order (M7) → pays (M8) → stage auto-advances to active (M5 trigger).
2. **Does every state transition fire correctly?** prospect→active on first payment (M7↔M8↔M5 chain — 3 modules must agree). Is the trigger on the M5 side, M7 side, or M8 side? Is it consistent with what each Brief claimed?
3. **Quote→active→...** order lifecycle (M7) vs payment lifecycle (M8) vs prescription lifecycle (M6 draft/committed). Three independent state-machines touching one transaction. Do they ever contradict?

### Axis B — Cross-module contract integrity (the core of this review)

For EACH cross-contract, verify the producing side and consuming side actually match:
- **M5↔M6:** `v_customer_prescriptions_summary` (M6 owns) + `create_prescription_draft(customer_id)`. Does M6's View expose what M5's card needs? Does the RPC signature match what M5 calls?
- **M5↔M7:** `v_order_customer_summary` + `orders.customer_id` FK + the prospect→active trigger.
- **M6↔M7:** `sub_orders.prescription_glasses_id`/`prescription_contacts_id` FK + prescription snapshot-ID (changing M6 prescription must NOT alter existing order — verify the snapshot mechanism exists).
- **M7↔M8:** `payments.order_id` FK + `v_order_payment_summary` + the first-payment event (M8 emits, M7 listens) + check-returned event. Verify M8 never calls M7 directly.
- **M7↔M1:** `sub_order_items.inventory_id` FK + `decrement_inventory`/`increment_inventory` atomic RPCs + the `decrements_inventory=true` lens rule.
- **M7↔M9 (future):** `lab_jobs.order_id` will FK to M7. Is `orders`/`sub_orders` shaped so M9 can build on it cleanly next run? (forward-readiness check)

For each contract: ✅ matches / 🟡 partial / 🔴 mismatch. Mismatches are findings.

### Axis C — Sealed-decision coherence across 4 modules

Read the decisions of all 4 (M5: 30, M6, M7, M8). Test for:
- **Contradictions between modules** (e.g., does M7's order_number scheme conflict with M5's customer_number scheme? Do they share the same `allocate_tenant_number` infra — and is that infra sound for both?).
- **SaaS litmus** across the spine: tenant #2 (different optical chain, different country) — does the whole customer→order→payment flow survive with zero code changes?
- **The crm_leads absorption (M5 §1.1):** M5 decided crm_leads is absorbed into customers. But the migration hasn't run — crm_leads is still live. Is there any place in M7/M8 that assumes the absorption already happened? (a latent bug)

### Axis D — Number allocation soundness

M5 customer_number, M7 order_number, M8 payment numbering all use the shared `allocate_tenant_number` RPC (per the M7/M8 retro). Verify:
- Is one shared sequence-allocator sound for 3 different entity kinds? Race conditions under concurrent order+payment+customer creation?
- Composite customer_number (M5 §12: TENANT+BRANCH+CUSTOMER) vs order_number scheme — consistent or divergent philosophy?

### Axis E — Event mechanism soundness (M8→M7→M5)

M8 introduced an event mechanism (`payment_events_queue` + trigger fns, per the retro — "Pattern P22 first formal codification"). Test:
- first-payment event → M7 listens → order status advances → M5 trigger fires (3-hop chain). Is each hop reliable? Idempotent (replay-safe)? What if the queue isn't drained?
- check-returned event → M7 reopen + M4 task. Both consumers wired?
- Is this event mechanism consistent with M1's K3 trigger pattern (the one it was told to mirror)?

### Axis F — Forward-readiness for M9 + UI

- **M9 (Lab) next run:** will `lab_jobs.order_id`/`sub_order_id` FK cleanly into M7? Does M7 expose `v_lab_queue` adequately? Is the barcode scheme (`<branch>-<order>-<sub>`) supported by the schema?
- **UI next wave:** are the Views rich enough that the customer card / order screen / checkout / daily-close can be built without schema changes? Spot-check 3 mockups against the actual Views.

### Axis G — Reviewer of the 4 Foreman self-reviews

For the accumulated findings (M6:8, M7:6, M8:8 = 22 findings) — sample 5-8 and assess: were they dispositioned correctly? Any 🟡 that should've been 🔴? Concur or dissent with each module's verdict.

### Axis H — Hidden risks for M9 + UI + migration

What could go wrong downstream that the per-module smokes didn't surface? (FK cascade surprises, the crm_leads-still-live latent bug, event-queue-never-drained, multi-module concurrent-write deadlock, OpticPlus migration field-mismatches.)

---

## 3. Scope — Out

- No SQL writes / DDL / RPC invocation. Read-only `execute_sql` SELECTs only. No INSERT/UPDATE/DELETE/CREATE/DROP/ALTER.
- No file touch except the output report `STRATEGIC_REVIEW_REPORT.md`.
- No commit/branch/push/merge.
- No follow-up SPECs. Findings → report; Daniel + Architect decide which become SPECs.
- No code/RLS/performance review — sibling's job.
- No relitigating sealed decisions unless concrete evidence shows one will fail.

---

## 4. Deliverable

ONE file: `modules/Module 1.5 - Shared Components/architecture-brief/M5_M8_STRATEGIC_REVIEW_REPORT.md`

**Structure:**
```
# Strategic Review Report — M5/M6/M7/M8 Schema
**Verdict:** 🟢 / 🟡 / 🔴 (one-paragraph rationale)
**M9-readiness:** READY / READY-WITH-FOLLOWUPS / BLOCKED
**UI-readiness:** READY / READY-WITH-FOLLOWUPS / BLOCKED

## 1. Axis-by-axis findings (A-H)
Per finding: title, severity (CRITICAL/HIGH/MEDIUM/LOW), evidence (file:line / DB query / contract ref / decision #), proposed action.

## 2. Cross-contract matrix
A table: every cross-module contract × {producer side ✅/🔴, consumer side ✅/🔴, match verdict}.

## 3. Concurrence with the 4 FOREMAN_REVIEWs
Sample 5-8 of the 22 accumulated findings — agree/dissent.

## 4. Top 5 risks for M9 + UI + migration

## 5. Pre-M9 + Pre-UI questions for Daniel (each with ONE recommendation)

## 6. Final verdict + gates (M9 gate + UI gate spelled out)
```

**Severity per opticup-guardian:** every CRITICAL/HIGH finding evidence-backed. **Target: 1500-3000 words.** Tight, evidence-dense, no padding.

---

## 5. Reading list (in order)

1. `CLAUDE.md` §4-§7 — Iron Rules + Authority Matrix.
2. The 4 sealed Architecture Briefs: `M5_CUSTOMERS_BRIEF.md`, `M6_PRESCRIPTIONS_BRIEF.md`, `M7_ORDERS_BRIEF.md`, `M8_PAYMENTS_BRIEF.md`.
3. The 4 SPEC folders end-to-end: `modules/Module {5,6,7,8}/.../docs/specs/M{5,6,7,8}_SCHEMA/` (SPEC + EXECUTION_REPORT + FINDINGS + FOREMAN_REVIEW + TEST_REPORT).
4. The 3 overnight Briefs: `M5_M6_SCHEMA_OVERNIGHT_BRIEF.md` + `M7_M8_SCHEMA_OVERNIGHT_BRIEF.md`.
5. `.claude/skills/opticup-architect/references/decisions/M5.md` + `M6.md` + `M7.md` + `M8.md`.
6. Live Supabase via MCP (read-only SELECT) — verify table/View/RPC/trigger shapes, sample the demo smoke fixtures (customers, prescriptions, orders, payments), trace a real cross-contract chain in data.
7. The 3 UI mockups (for Axis F forward-readiness): M5 card, M7 order, M8 checkout.

Reading any other file is fine if it supports a finding. Modify nothing except the report.

---

## 6. What "good" looks like

- Names ≥3 cross-contract issues the 4 Foremen missed (no value if it just restates existing FINDINGS).
- Produces the cross-contract matrix with a verdict per contract.
- Walks the full customer→order→payment lifecycle in real demo data and reports a concrete gap-or-no-gap.
- Gives M9-readiness + UI-readiness verdicts stronger than "looks fine."
- < 3000 words.

---

## 7. Hand-off

After the report is written + committed (single commit: `docs(m1.5): add M5-M8 strategic review report`), emit ONE Hebrew line:
> "Strategic Review (M5-M8) הסתיים. Verdict: [🟢/🟡/🔴]. M9-readiness: [...]. דו"ח: <path>."

That's all. Architect (Daniel + Cowork) reads both reports together + decides M9 kickoff.

---

*End of Brief. Read-only audit, single report, no code changes. Emphasis: cross-module contracts.*
