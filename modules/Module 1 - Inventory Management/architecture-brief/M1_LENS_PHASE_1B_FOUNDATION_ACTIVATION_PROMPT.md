# Activation Prompt — M1_LENS_PHASE_1B_FOUNDATION

> Paste the block below into a fresh Claude Code chat.
> Full Auto Pipeline (Strategic → Executor → Reviewer → Strategic Foreman).
> Sibling Brief: `modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_PHASE_1B_FOUNDATION_BRIEF.md`
>
> **DO NOT dispatch until `M1_SKILL_IMPROVEMENT_HARVEST` closes 🟢.**

---

```
Full Auto Pipeline — M1_LENS_PHASE_1B_FOUNDATION (3 read-heavy screens: Inventory + Active Designs + Catalog & Pricing).

Brief: modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_PHASE_1B_FOUNDATION_BRIEF.md

Activate `opticup-strategic` skill first. The skill state was frozen by
M1_SKILL_IMPROVEMENT_HARVEST — your SPEC_TEMPLATE now mandates Inner-call arity audit +
Smoke-touched schema audit + Concurrent-Pipeline awareness envelope. Apply them in §0.

Read the Brief end-to-end. Run §6 pre-flight probes (9 live Supabase + shell checks
confirming demo fixtures from M1A+M1B0 smoke, schema shapes, permission infrastructure,
existing JS conventions). Pin every result as §0 baseline.

Author the SPEC at:
  modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_FOUNDATION/SPEC.md

Required SPEC sections:
- §0 Pre-Authoring Reality Check (probes + 2 new MANDATORY audits)
- §1 Purpose (1 paragraph from Brief §1)
- §2 Scope (3 screens + 3 RPCs + functional smoke from Brief §2)
- §3 Success Criteria (18+ from Brief §5, all measurable)
- §4 Autonomy envelope (Level-2 for UI; Level-3 for the 3 new RPCs)
- §5 Stop triggers
- §6 Rollback plan (per-screen + per-RPC DOWN steps)
- §7 Destructive Operations: None
- §10 Commit plan (8-12 commits, single-concern)
- §11 Lessons Already Incorporated — including Concurrent-Pipeline awareness envelope
  (this SPEC touches lens-inventory.html, lens-active-designs.html, lens-pricing.html,
  modules/lens-*/ folders, 3 new RPCs; WILL NOT conflict with M4 / M9 / Storefront work)

Then hand off to `opticup-executor`:
1. Step 0 — repo/branch/integrity-gate per CLAUDE.md §1 First Action.
2. Step 1 — load SPEC + run executor pre-flight.
3. Steps 2–N — build 3 screens + 3 RPCs in commit order. Apply M1A_OPERATIONS_RPCS_FIX
   discipline on the new RPCs (REVOKE/GRANT, search_path, JWT guard, canonical RLS).
   Apply Phase 1A G-1+G-6 lessons on screen JS (DB wrapper only, escapeHtml from shared,
   no window.prompt/confirm — use Modal.*).
4. **MANDATORY FUNCTIONAL SMOKE** before close (Brief §2 + §5 #9): 9 steps end-to-end on
   demo. NO 🟢 verdict without 9/9 pass. Capture in TEST_REPORT.md.
5. If any DDL applied (new RPCs are DDL), write MIGRATION.md Applied Log per harvested E1.
6. Write EXECUTION_REPORT.md + FINDINGS.md + TEST_REPORT.md + ROLLBACK.md.

Then `opticup-reviewer`:
- Re-runs §3 criteria.
- Runs scripts/audit/advisors-for-objects.mjs against the 3 new RPCs.
- 3+ spot-checks against live state.
- Writes REVIEW.md.

Then `opticup-strategic` Foreman-reviews — writes FOREMAN_REVIEW.md with 2 author + 2
executor skill-improvement proposals (Self-Improvement Mandate counter advances).

Pipeline returns ONE Hebrew status line:
  "M1_LENS_PHASE_1B_FOUNDATION [🟢/🟡/🔴]. דו"חות: SPEC/EXECUTION/TEST/REVIEW/FOREMAN."

Iron Rules in sharp focus: 7, 8, 11, 12, 14, 15, 18, 21, 22, 23, 31, 32.

Out of scope:
- The 3 procurement screens (PO + POs List + GR) — sibling SPEC
- Wiring inventory ➕➖ buttons to actual stock movements — sibling SPEC
- Modifying Phase 1A / M1B0 / lens-catalog-admin
- Modifying mockups, decisions/M1.md, Phase 1 Brief
- FX conversion (tenant-2)
- Custom-per-customer M7 linkage (M7 not built)
- 21 FK indexes (separate parallel SPEC)
- Sequence generator refactor (defer)
- Prizma data (smoke on demo only)
- Merge to main (Daniel-only after Pipeline closes 🟢)

On escalation: write modules/Module 1 - Inventory Management/escalations/{ISO_TS}_{topic}.md
and emit one Hebrew line. Halt the Pipeline.

Stop on deviation, not on success. M1A+M1B0 demonstrated functional smoke catches bugs no
existential check finds. The new mandatory audits in your SPEC_TEMPLATE further reduce
mid-execution pivots. Trust the discipline; run end-to-end; close 🟢 only on 9/9 smoke.
```

---

## Pre-flight checklist for the dispatcher (Daniel)

- [ ] `M1_SKILL_IMPROVEMENT_HARVEST` closed 🟢 (confirm via FOREMAN_REVIEW commit hash)
- [ ] M1B0 fixtures present on demo (2 PO + 4 lines + 1 receipt + 1 debt)
- [ ] No other M1 SPEC in flight
- [ ] Demo tenant accessible
- [ ] Supabase MCP connected
- [ ] Working directory confirmed

---

## Expected execution timeline

- §6 pre-flight probes + §0 baselines: ~20 min
- SPEC authoring (8-12 commits planned): ~45 min
- 3 RPCs deployed + permission seeding (if needed): ~45 min
- 3 screens built (inventory + designs + pricing): ~2.5-3 hours
- Functional smoke (9 steps on demo): ~30 min
- Reports (EXECUTION/FINDINGS/TEST/REVIEW/FOREMAN): ~45 min

**Total estimate: 5-6 hours of Pipeline time.** Single uninterrupted Claude Code session — long but tractable.

---

## What happens after this SPEC closes

1. Pipeline returns Hebrew status line.
2. **Daniel runs manual QA on demo** for the 3 foundation screens. This is a gate before the procurement SPEC dispatches.
3. On QA-pass: Architect dispatches `M1_LENS_PHASE_1B_PROCUREMENT` (Brief + Activation Prompt already in repo).
4. On QA-fail: hotfix SPEC authored to address issues, then procurement.

---

*End of activation prompt.*
