# Module Brief — M1 Lens Inventory Phase 1A — Strategic Review (Business-Logic Audit)

**Brief version:** v1
**Date:** 2026-05-15
**Author:** Architect
**Skill to load:** `opticup-strategic` (Module Strategist)
**Mode:** **READ-ONLY review.** No code changes, no SQL writes, no commits. Output is one report file.
**Sibling Brief (parallel):** `M1_PHASE_1A_CODE_REVIEW_BRIEF.md` (executes in a separate Claude Code chat with `opticup-reviewer`)

---

## 1. Purpose

Phase 1A of M1 Lens Inventory is closed (🟡 with follow-ups per the existing FOREMAN_REVIEW). The schema is live on demo + prizma, the Platform Catalog Admin screen exists, 3 maintenance debts were resolved, and 4 skill improvements were applied. Before we open Phase 1B (the 6 customer-facing screens), we want a **fresh external strategic audit** — independent of the Foreman who authored the SPEC.

This Brief commissions a **business-logic audit** of everything we've decided and shipped in Phase 1A. Its sibling Brief commissions a **code/security/RLS audit** of what was built. The two reviews run in parallel and converge into a Daniel-Architect review session before Phase 1B begins.

**This review is NOT:**
- A re-execution of the SPEC.
- A code review (that's the sibling Brief).
- An attempt to find new features to add.
- A rubber-stamp of the Foreman's self-review.

**This review IS:**
- A skeptical, second-pair-of-eyes pass over the 16 D-M1 decisions + the 7 mockups + the M1↔M9 overlap + the Phase 1 Brief scope.
- A hunt for unspecified edge cases, contradictions between decisions, missing flows, and SaaS-litmus failures.
- A pre-Phase-1B sanity check: "given what we've committed to, will the 6 customer-facing screens land cleanly, or have we painted ourselves into a corner?"

---

## 2. Scope — In

The reviewer reads everything Phase 1A produced + Phase 1A's strategic context, and tests it for business-logic soundness across **eight axes**:

### Axis A — Decision coherence (D-M1-01 through D-M1-16)

Read all 16 D-M1 decisions in `.claude/skills/opticup-architect/references/decisions/M1.md`. For each decision:

- **Internal consistency:** does any decision contradict another? (Example: if D-M1-04 says "no separate edit screen" and D-M1-09 says X about goods-receipt, do they pull in opposite directions?)
- **SaaS litmus:** does this decision survive tenant #2 (a different optical chain, different country, different VAT regime, different supplier list)?
- **Open-question residue:** the Phase 1 Brief §7 lists 4 open questions for the Module Strategist. Were they actually resolved in Phase 1A, or did they slip into Phase 1B unresolved?
- **Forward-compat to v2 features:** the handoff §"v2 features" lists bundle pricing, supplier rebates, consignment stock, drop-ship as "additive, no migration." Re-test that claim against the current schema.

### Axis B — End-to-end flow walkthrough (7 mockups + the schema)

Take three concrete scenarios and walk them through the 7 mockups + the 18-table schema:

1. **Happy path:** Optic Up admin seeds 1 brand → optic curates → customer orders custom-per-customer lens → PO created → supplier sends → goods receipt → stock movement → debt entry → done. Does every step have a screen, a table, an RPC, and a known actor?
2. **Edge: returned/defective lens.** A stock lot arrives with 5 units; 1 is defective. What screen handles the deduction? What table records the return? Does FIFO break? Is supplier_debt adjusted? Phase 1 brief doesn't mention this — is it deferred, or a gap?
3. **Edge: same variant from 2 suppliers.** Brand X sold by both Supplier A and Supplier B (the 1:N future-ready case per D-M1-04). The optic carries A as primary. Mid-month, A is out-of-stock — can the optic place a one-shot PO to B? Where does the PO screen surface this? Does pricing_overlay handle two simultaneous supplier prices for the same variant?

For each scenario, the reviewer marks: ✅ fully covered / 🟡 partially covered / 🔴 gap. Gaps become findings.

### Axis C — Cross-module contracts (M1 ↔ M9, M1 ↔ M7, M1 ↔ M5/M6)

Read `M1_M9_OVERLAP_REPORT.md` end-to-end. Then test:

- **K1-K5 contracts:** are they each pin-down enough that an M9 strategist could implement the M9 side without ambiguity? Sketch a one-paragraph contract for each (purpose, signature, side effects, RLS context, who calls it).
- **M1 ↔ M7 surface:** the Brief says "M7 cannot build until M1 Lens schema exists." Identify which exact rows/columns M7's order-line code will read or write. Is `tenant_active_offerings` enough, or does M7 also need `pricing_overlay`? What about `supplier_catalog_offering`?
- **M1 ↔ M5/M6 surface:** the custom-per-customer PO line references a customer (M5) and a prescription (M6). M6 owns AXIS (per D-M1, AXIS belongs to prescription). What's the precise FK chain from PO line → customer → prescription, and is it documented in the schema?

### Axis D — Phase 1B readiness gate

The 6 Phase 1B screens (Lens Inventory Mgmt, Active Designs, Catalog & Pricing, PO, Active POs List, Goods Receipt) all live on top of the Phase 1A schema. For each Phase 1B screen, identify:

- **Tables it reads.**
- **RPCs it calls.**
- **RPCs that DON'T YET EXIST but the screen needs** (e.g., `record_stock_movement` for the inventory screen, `place_purchase_order` for the PO screen, etc.).
- **Any missing schema element** (column, index, FK, view) that Phase 1B will discover late.

If a Phase 1B screen would block on something Phase 1A didn't ship — that's a finding (severity = the realism of the surprise).

### Axis E — Currency + VAT design

`currencies` ended up per-tenant + empty (Finding M1A-SPEC-02, currently in TECH_DEBT). `M1A_CURRENCIES_GLOBAL_HOTFIX` was a sibling SPEC that promoted currencies to global. `vat_rates` is also new.

- Test the resulting design (currencies global, vat_rates new) against three real tenant scenarios: Israeli optic (ILS + 18% VAT), EU optic (EUR + 21% VAT), British optic (GBP + 20% VAT). Does the schema express each correctly?
- Is the relationship `currencies ↔ vat_rates ↔ tenants ↔ pricing_overlay` clear enough that a Phase 1B PO screen can render a 3-currency mixed cart correctly?
- Bonus: at what layer does VAT round (line, document, total)? Israeli law says line-level; what does our schema currently assume?

### Axis F — Bulk-import / Platform Catalog Admin reality check

The bulk-import EF (`lens-catalog-import`) ships v1 with structured xlsx input (per Brief §7 open question 4, the Architect recommendation was "structured Excel upload Phase 1; LLM agent Phase 2+").

- Does the actual import EF match the recommendation, or did it land closer to LLM-driven? (Read `supabase/functions/lens-catalog-import/`.)
- Is there a public spec for the xlsx schema the import expects, or is it embedded in the EF code? If embedded — that's a finding (vendors who feed us catalogs need a schema doc).
- The Platform Catalog Admin screen creates rows in `lens_brand`, `lens_design`, `lens_variant`. If a brand is later renamed or deleted, what's the cascade behavior? Is soft-delete used? (Iron Rule 3.) Is the cascade specified anywhere?

### Axis G — Reviewer of own role (the Foreman's self-review)

The existing FOREMAN_REVIEW.md is the Foreman reviewing themselves and the executor. The reviewer (this Brief's audience) is a fresh strategic role doing a meta-review.

- For each of the FOREMAN_REVIEW's 6 Author-skill proposals + 2 Executor-skill proposals: do you concur? Disagree? Have a better proposal? Each one is worth a paragraph of agree/disagree-with-rationale.
- The Foreman's verdict was 🟡 CLOSED WITH FOLLOW-UPS. Do you read the deliverables and conclude 🟢, 🟡, or 🔴? Defend your verdict.

### Axis H — Hidden risks for Phase 1B

What could go wrong in Phase 1B that we haven't flagged?

- Risks from the schema (FK chains that produce unexpected DELETE cascades, unique constraints that surface only when 2 tenants run side-by-side).
- Risks from the mockup-to-implementation gap (a mockup that "looks easy" but hides a data model surprise).
- Risks from the M1↔M9 build sequence (Phase 1B runs before M9 builds — what M9-side stubs do we need?).
- Risks from the team's velocity assumption (Phase 1B = 6 screens; is that realistic in one SPEC or does it need to split?).

---

## 3. Scope — Out

The reviewer **does not**:

- Run any SQL writes, migrations, RPC invocations, or DDL. **Read-only**: `execute_sql` for SELECTs is fine; never INSERT/UPDATE/DELETE/CREATE/DROP/ALTER.
- Touch any file in the repo except the output report `STRATEGIC_REVIEW_REPORT.md`.
- Commit, branch, push, or merge.
- Open follow-up SPECs. Findings go into the report; Daniel + Architect decide which become SPECs.
- Review code, security, RLS policies, performance, or migrations — that's the sibling reviewer's job.
- Re-litigate sealed decisions D-M1-01 through D-M1-16 unless the reviewer has concrete evidence that a decision will fail.

---

## 4. Deliverable

ONE file: `modules/Module 1 - Inventory Management/architecture-brief/STRATEGIC_REVIEW_REPORT.md`

**Required structure:**

```
# Strategic Review Report — M1 Lens Inventory Phase 1A

**Reviewer:** opticup-strategic (fresh independent session)
**Reviewed:** SPEC + EXECUTION_REPORT + FINDINGS + FOREMAN_REVIEW + Brief + handoff + decisions/M1.md + 7 mockups + M1↔M9 overlap report
**Verdict:** 🟢 / 🟡 / 🔴 (with one-paragraph rationale)
**Phase 1B readiness:** READY / READY-WITH-FOLLOWUPS / BLOCKED

## 1. Axis-by-axis findings (A through H)
For each axis, list findings with: title, severity (CRITICAL/HIGH/MEDIUM/LOW),
evidence (file+line OR DB row OR mockup screenshot OR decision number),
proposed action (defer / new SPEC / clarify in Phase 1B SPEC / dismiss).

## 2. Concurrence with FOREMAN_REVIEW
For each of the 6 author-skill + 2 executor-skill proposals — agree / disagree / amend.

## 3. Top 5 risks for Phase 1B
Ranked. Each with a one-line mitigation.

## 4. Pre-Phase-1B questions for Daniel
Strategic questions that need a Daniel answer before Phase 1B SPEC is authored.
ONE recommendation per question.

## 5. Final verdict + Phase 1B gate
Repeat the verdict at the top + spell out the gate condition explicitly.
```

**Severity definitions** (per `opticup-guardian` skill — every finding must be backed by evidence):

- **CRITICAL** — Phase 1B will fail or production will break if not resolved before Phase 1B starts.
- **HIGH** — Phase 1B will land with visible regressions or SaaS-litmus failure for tenant #2 if not resolved.
- **MEDIUM** — Should be resolved before LIVE but doesn't block Phase 1B start.
- **LOW** — Nice-to-have; document and defer.

**Target length:** 1500–3000 words. Not 10000. Tight reasoning, evidence-backed, no padding.

---

## 5. Reading list (in this order)

1. `CLAUDE.md` §4–§7 — Iron Rules + Authority Matrix.
2. `MASTER_ROADMAP.md` — confirm M1 build sequence + cross-module contracts state.
3. `modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_PHASE_1_BRIEF.md` — the original Phase 1 plan.
4. `modules/Module 1 - Inventory Management/architecture-brief/M1_EXPANSION_SESSION_HANDOFF.md` — the full 18-table schema + decisions log.
5. `modules/Module 1 - Inventory Management/architecture-brief/M1_M9_OVERLAP_REPORT.md` — K1-K5 contracts + boundary analysis.
6. `.claude/skills/opticup-architect/references/decisions/M1.md` — D-M1-01 through D-M1-16.
7. `modules/Module 1 - Inventory Management/architecture-brief/mockups/*.html` — all 7 mockups (open in browser if helpful).
8. `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/SPEC.md` — the executed SPEC.
9. `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/EXECUTION_REPORT.md` — what shipped.
10. `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/FINDINGS.md` — Foreman's 8 findings.
11. `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/FOREMAN_REVIEW.md` — Foreman's self-review (🟡 CLOSED).
12. `modules/Module 1 - Inventory Management/docs/specs/M1A_CURRENCIES_GLOBAL_HOTFIX/*.md` — sibling SPEC closure.
13. `modules/Module 1 - Inventory Management/docs/specs/M1A_DEBT_SWEEP/*.md` — debt-sweep SPEC closure.
14. `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_PHASE_1B_CUSTOMER_SCREENS/SPEC.md` — Phase 1B stub (helps anchor Axis D).
15. Live Supabase via MCP `execute_sql` (read-only) — sanity-check claimed table counts, RLS policy shapes, sample row counts on demo.

Reading any other file is fine if it supports a finding. Do not modify any file in the repo.

---

## 6. Iron Rules to enforce in the review

The reviewer flags ANY violation observed of:

- **Rule 6** — index.html stays in repo root (sanity-check after Phase 1A — new HTML page `lens-catalog-admin.html` was added at root; was it allowlisted in `scripts/checks/root-allowlist.json`?).
- **Rule 13** — Views-only for external reads. The K5 view `v_suppliers_for_m9` exists. Is `security_invoker=on`? Are anon SELECTs revoked unless explicitly granted?
- **Rule 14, 15, 18** — every new table has tenant_id (or owner_tenant_id) + RLS + tenant-scoped UNIQUE.
- **Rule 16** — modules talk only through contracts. Phase 1A established K1-K5. Are there any direct M9 table reads/writes in M1 code?
- **Rule 17** — Views for external access. Confirm the Phase 1A view shape against expected M9 needs.
- **Rule 19** — Configurable values as tables. `currencies`, `vat_rates` are tables ✅. Is anything else (e.g. `payment_methods`, `status enum`) hardcoded that shouldn't be?
- **Rule 20** — SaaS litmus on every decision.

---

## 7. Pre-flight checks (before writing the report)

1. Confirm branch is `develop`, repo is `opticalis/opticup`.
2. Confirm Phase 1A commits exist in git log (the 12 commits per EXECUTION_REPORT §3).
3. Confirm `lens-catalog-admin.html` at repo root.
4. Confirm `modules/lens-catalog-admin/` exists.
5. Confirm 5 migrations under `supabase/migrations/20260514180*.sql`.
6. Confirm Supabase MCP is connected (the reviewer needs read-only SELECTs).

If any pre-flight fails → STOP and write a one-paragraph escalation note in the report explaining what's missing, then halt.

---

## 8. What "good" looks like

A high-quality strategic review report:

- Names ≥ 3 findings the Foreman missed (no value if it just re-states the existing FINDINGS).
- Concurs OR disagrees with each of the 8 Foreman skill proposals — with reasoning.
- Walks through the 3 scenarios in Axis B and produces a concrete gap-or-no-gap verdict for each.
- Produces a Phase 1B readiness verdict that's stronger than "looks fine."
- Is < 3000 words. Tight, not bloated.

A low-quality report:

- Just summarizes what already shipped.
- Says "looks good" without evidence.
- Re-litigates D-M1-01..D-M1-16 without new evidence.
- Proposes 20 features Phase 1A didn't include.
- Padding, repetition, ceremony.

---

## 9. Hand-off

After the report is written + committed (single commit, message: `docs(m1): add Phase 1A strategic review report`), the reviewer emits ONE short Hebrew line to Daniel of the form:

> "Strategic Review הסתיים. Verdict: [🟢/🟡/🔴]. דו"ח: `modules/Module 1 - Inventory Management/architecture-brief/STRATEGIC_REVIEW_REPORT.md`."

That's all. Architect (Daniel + Cowork session) will read both reports + the sibling code review in one sitting and decide Phase 1B kickoff.

---

*End of Brief. Read-only audit, single report, no code changes.*
