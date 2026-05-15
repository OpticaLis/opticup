# M1 Expansion — Strategic Audit & Path-Forward Recommendation

**Author:** opticup-architect (Cowork)
**Date:** 2026-05-15
**Type:** Read-only strategic audit. NO code changes, NO file modifications, NO commits.
**Mode:** Single-pass Architect audit running through Full-Auto Pipeline shell, but the executor produces ONE deliverable: an audit report.

---

## 1. Purpose

Daniel wants a comprehensive review of where M1 Expansion (Lens / Contact-Lens / Accessories inventory) currently stands, before committing to the next build phase. The audit must:

1. **Inventory what has been decided and what has been built so far** — across the architecture-brief folder, SPEC folders, decisions log, and mockups.
2. **Identify weaknesses, gaps, or risks** — schema decisions that may not survive contact with M7/M9 build, mockup decisions that look good in isolation but break when stitched together, locked decisions that contradict each other, missing settings panels, untested edge cases.
3. **Recommend the strategic next step** — given everything that exists, what is the highest-value next move? Is it Phase 1B (customer screens + procurement) as currently planned? Is it something else? Is there a sequence reorder that reduces risk?

The goal is NOT to write new SPECs or build anything. The goal is to give Daniel a clear strategic picture before he decides where to put energy next.

---

## 2. Context — What Daniel Already Knows

- M1 Expansion was sealed conceptually in `M1_EXPANSION_SESSION_HANDOFF.md` (2026-05-12) — 18 tables for lenses/contact-lenses/accessories.
- Phase 1A (schema + platform admin) was closed 2026-05-14 — docs and DB structure landed.
- A parallel Architect session is currently evaluating monorepo (Turborepo) vs multi-repo split — this audit must NOT touch that decision; assume monorepo for the purposes of "what's next on M1."
- Phase 1B is currently planned as TWO sub-phases: Foundation (permissions + auth) + Procurement (purchase orders + goods receipt). Briefs exist for both.
- Customer-facing screens (Phase 1B Customer Screens) have a SPEC folder but I (Architect) want to verify it hasn't drifted from the original sketches.
- 7 mockup HTML files exist; some have been revised, some are originals.
- 16 decisions logged in `decisions/M1.md`.

---

## 3. Read List — MANDATORY before writing the report

The executor MUST read these files in this order. Do not skim; read them end-to-end.

### Tier 1 — Foundation (read first, understand the shape)

1. `modules/Module 1 - Inventory Management/architecture-brief/M1_EXPANSION_SESSION_HANDOFF.md` — the original 18-table sealing document.
2. `.claude/skills/opticup-architect/references/decisions/M1.md` — all 16 logged decisions.
3. `modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_PHASE_1_BRIEF.md` — Phase 1 overall framing.

### Tier 2 — Sub-phase briefs (what's planned next)

4. `modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_PHASE_1B_FOUNDATION_BRIEF.md`
5. `modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_PHASE_1B_PROCUREMENT_BRIEF.md`
6. `modules/Module 1 - Inventory Management/architecture-brief/M1B0_PURCHASE_ORDER_SCHEMA_BRIEF.md`
7. `modules/Module 1 - Inventory Management/architecture-brief/M1B_FOUNDATION_PERMISSIONS_HOTFIX_BRIEF.md`

### Tier 3 — Cross-module impact

8. `modules/Module 1 - Inventory Management/architecture-brief/M1_M9_OVERLAP_REPORT.md` — already-completed cross-module analysis with M9.

### Tier 4 — Mockups (open in browser if helpful; read the HTML for layout intent)

9. `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_INVENTORY_MOCKUP.html`
10. `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_DESIGNS_SELECTION_MOCKUP.html`
11. `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_GOODS_RECEIPT_MOCKUP.html`
12. `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_PLATFORM_CATALOG_ADMIN_MOCKUP.html`
13. `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_ACTIVE_POS_LIST_MOCKUP.html`
14. `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_PRICING_MOCKUP.html`
15. `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_PURCHASE_ORDER_MOCKUP.html`

### Tier 5 — Prior reviews (don't reinvent — read what's already been said)

16. `modules/Module 1 - Inventory Management/architecture-brief/CODE_REVIEW_REPORT.md`
17. `modules/Module 1 - Inventory Management/architecture-brief/STRATEGIC_REVIEW_REPORT.md`

### Tier 6 — Spot-check SPECs (read SPEC.md of each; skim EXECUTION_REPORT if exists)

18. `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/SPEC.md` + EXECUTION_REPORT if exists
19. `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_PHASE_1B_CUSTOMER_SCREENS/SPEC.md` (if exists)
20. `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_FOUNDATION/SPEC.md` (if exists)
21. `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_PROCUREMENT/SPEC.md` (if exists)

### Tier 7 — Current module state

22. `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md` — current state
23. `modules/Module 1 - Inventory Management/ROADMAP.md` — phases plan

---

## 4. Deliverable — `M1_EXPANSION_STRATEGIC_AUDIT_REPORT.md`

Path: `modules/Module 1 - Inventory Management/architecture-brief/M1_EXPANSION_STRATEGIC_AUDIT_REPORT.md`

### Section 1 — What's locked

A clean table of every locked decision, its source, and its current implementation status:

| # | Decision | Source file | Implemented? | Risk if changed later |
|---|---|---|---|---|

Cover all 16 decisions from `decisions/M1.md` + any decisions embedded in briefs that aren't in the log.

### Section 2 — What's built

A table of what physically exists today vs what's still planned:

| Artifact | Type (schema / RPC / view / mockup / SPEC / code) | Status (built / planned / partial) | Source SPEC |
|---|---|---|---|

### Section 3 — Weaknesses, gaps, risks

For each finding, provide:
- **What** — one-sentence description
- **Why it matters** — business impact (not technical impact)
- **Severity** — CRITICAL / HIGH / MEDIUM / LOW per opticup-guardian severity rubric (live-customer-harm vs theoretical-edge-case)
- **Recommended action** — fix now / fix during next phase / accept and document / defer

Look specifically for:

- **Cross-decision contradictions** — does decision D-M1-N say one thing about stock/custom while D-M1-M says another? Does the M9 contract assume X while M1 schema delivers Y?
- **Missing settings panels** — per Pattern P33, every Pattern P19 config table needs a settings UI. Are any P19 tables (currencies, prescription_types, stock_types, etc.) missing their settings sketch?
- **Mockup-vs-schema drift** — does a mockup show a field that doesn't exist in schema? Does schema have a field with no UI?
- **Mockup-vs-mockup contradiction** — does mockup #1 show stock-flag-only while mockup #5 lets you mix?
- **Locked decisions that contradict Iron Rules** — anything that breaks Rule 14 (tenant_id), Rule 15 (RLS), Rule 18 (UNIQUE per-tenant), Rule 19 (config tables not enums)?
- **Day-1 vs deferred ambiguity (P17)** — are the briefs clear about what's day-1 skeleton vs deferred-rich-behavior, or is scope likely to creep?
- **M1↔M7 contracts** — what does M7 (Orders) need from M1 Lens that isn't explicitly contracted yet?
- **M1↔M9 contracts** — the overlap report exists, but are the K1-K5 contracts reflected in the actual Phase 1B briefs?
- **M1↔M3 (Storefront)** — does the public-data-layer foundation (closed today) require any new lens-specific views or columns? Are they in scope of Phase 1B?

### Section 4 — Strategic Path-Forward Recommendation

The MAIN deliverable. Three sub-sections:

**4.1 — What's the simplest viable next step?**
Apply Pattern P24 (don't add complexity — restate the goal and find the simplest model). What is the smallest, lowest-risk next move that unblocks the most downstream work?

**4.2 — Recommended sequence (next 2-4 SPECs)**
List, in order:
1. SPEC name
2. Purpose (1 line)
3. What it unblocks
4. Estimated effort (S/M/L — small=<1 day, medium=1-3 days, large=1+ weeks)
5. Dependencies on other SPECs

**4.3 — What NOT to do next**
List candidate next moves that LOOK attractive but are wrong. For each, one sentence why deferring is better.

### Section 5 — Skill-update proposals

If during the audit the executor catches a pattern that would have prevented a problem if it had been a rule in opticup-architect SKILL.md, list it as a P-AR-XX proposal. Format per existing P-AR-01 through P-AR-06 in SKILL.md.

Maximum 3 proposals. Each must be ROI-quantified (minutes saved per future SPEC).

### Section 6 — Open questions for Daniel

A SHORT list (max 5) of strategic questions Daniel must answer before the next SPEC is written. Each question follows P22 format: one-line question + one-line recommendation + one-line reason. Do NOT include technical detail (no table names, no field names — per P20).

---

## 5. Constraints — what executor must NOT do

- **NO code changes.** No edits to any file outside the deliverable report.
- **NO git operations** except the final commit of the audit report.
- **NO SPEC creation** — even if obvious gaps are found, surface them in Section 4, don't author SPECs.
- **NO modifications to mockups or briefs** — even if errors are found, list them in Section 3.
- **NO writes to DB.** This is an audit; database access is read-only for verification only.
- **NO new decisions logged.** Decisions belong to Architect-Daniel dialogue, not Executor.

---

## 6. Destructive Operations

None. This SPEC is read-only with a single file written (the audit report). Iron Rule 32 declares zero destructive operations.

---

## 7. Success Criteria

The audit is successful when:

1. Report file `M1_EXPANSION_STRATEGIC_AUDIT_REPORT.md` exists at the declared path.
2. All 6 sections are filled — none are "TODO" or skipped.
3. Section 3 has at least 5 findings with severity classified per opticup-guardian rubric.
4. Section 4.2 has a numbered sequence of next-SPEC recommendations with estimated effort.
5. Section 6 has between 1-5 open questions in P22 format.
6. The report's recommendation is internally consistent — Section 3 findings drive Section 4 recommendations.
7. No code, schema, or non-audit files were modified.
8. One commit lands on develop with message `docs(m1): strategic audit of M1 Expansion state`.
9. Smoke test 7/7 passes (sanity check that audit did not break anything).
10. Hebrew summary returned to Daniel: 4-line max, plain language, ending with the top strategic recommendation.

---

## 8. Execution Pattern

Single-pass audit. No Full-Auto skill chaining needed (no Executor/Reviewer/Localhost-Tester loop — this is read-only). The executor reads all 23 source files, synthesizes, writes the report, commits, returns Hebrew summary.

Estimated executor effort: 2-4 hours of careful reading + 1-2 hours of synthesis. No external dependencies, no escalations expected — every input file is in repo.

If during reading the executor finds the read list is incomplete (e.g., a critical file referenced by the briefs that wasn't listed), the executor should READ the referenced file and proceed. Do not write an escalation for a missing read-list entry; it's an audit, expand scope as needed.

If during reading the executor finds a CRITICAL inconsistency that genuinely blocks the audit (e.g., two locked decisions that physically cannot both be true), STOP and write an escalation file at `modules/Module 1 - Inventory Management/escalations/{ISO_TS}_AUDIT_BLOCKER.md`.

---

## 9. Hebrew summary template

At end, return to Daniel exactly this shape (substitute the bracketed parts):

```
האודיט הסטרטגי של הרחבת M1 נסגר. דוח: modules/Module 1 - Inventory Management/architecture-brief/M1_EXPANSION_STRATEGIC_AUDIT_REPORT.md.
[N] נקודות חולשה — מתוכן [X] חמורות. ההמלצה האסטרטגית: [שורה אחת בעברית מה לעשות הבא].
[Y] שאלות פתוחות לדניאל.
מוכן להמשך.
```

End of Brief.
