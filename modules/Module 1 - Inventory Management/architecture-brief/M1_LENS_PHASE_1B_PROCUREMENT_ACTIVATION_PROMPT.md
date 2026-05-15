# Activation Prompt — M1_LENS_PHASE_1B_PROCUREMENT

> Paste the block below into a fresh Claude Code chat.
> Full Auto Pipeline (Strategic → Executor → Reviewer → Strategic Foreman).
> Sibling Brief: `modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_PHASE_1B_PROCUREMENT_BRIEF.md`
>
> **DO NOT dispatch until ALL pre-conditions are met:**
> 1. `M1_SKILL_IMPROVEMENT_HARVEST` closed 🟢
> 2. `M1_LENS_PHASE_1B_FOUNDATION` closed 🟢
> 3. Daniel manual QA on the 3 foundation screens on demo: PASS

---

```
Full Auto Pipeline — M1_LENS_PHASE_1B_PROCUREMENT (3 write-heavy procurement screens: PO + POs List + Goods Receipt; plus ➕➖ wiring on inventory).

Brief: modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_PHASE_1B_PROCUREMENT_BRIEF.md

Activate `opticup-strategic` skill first. Skill state inherits all harvested patterns
(Inner-call arity + Smoke-touched schema audits + Concurrent-Pipeline envelope + MIGRATION.md
Applied Log convention + advisors-for-objects.mjs gate).

Read the Brief end-to-end. Run §6 pre-flight probes (10 live checks confirming M1B0 fixtures
intact, foundation screens deployed, permission keys seeded, K2+K3 wiring, PIN-auth EF,
PDF generation pattern, threshold column, etc.). Pin every result as §0 baseline.

Author the SPEC at:
  modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_PROCUREMENT/SPEC.md

Required SPEC sections:
- §0 Pre-Authoring Reality Check (probes + mandatory audits)
- §1 Purpose
- §2 Scope (3 screens + ➕➖ wiring + possibly 1 new RPC + functional smoke from Brief §2)
- §3 Success Criteria (23+ from Brief §5, all measurable)
- §4 Autonomy envelope
- §5 Stop triggers
- §6 Rollback plan
- §7 Destructive Operations: None
- §10 Commit plan (12-18 commits, single-concern)
- §11 Lessons Already Incorporated + Concurrent-Pipeline envelope

Then hand off to `opticup-executor`:
1. Step 0 — repo/branch/integrity-gate.
2. Step 1 — load SPEC + executor pre-flight.
3. Steps 2–N — build 3 screens + wire ➕➖ on inventory + (optionally) ship force_mark_po_received RPC.
   - All new RPCs (if any): M1A_OPERATIONS_RPCS_FIX discipline.
   - All screen JS: Phase 1A G-1+G-6 lessons (DB wrapper, escapeHtml from shared, Modal.* not prompt).
   - PIN protection on stock-decrement (Iron Rule 1) via existing pin-auth EF.
   - PDF generation: browser-side, vanilla window.print + print stylesheet Day-1.
4. **MANDATORY FUNCTIONAL SMOKE** before close (Brief §2 + §5 #10): 14 steps end-to-end on demo
   exercising full procurement lifecycle (PO create → mark sent → GR full happy path → GR short
   shipment → GR manual line → cancel PO → POs list display → ➖ adjust → ➕ deep-link →
   anon-reject → cross-tenant guard → permission gates → no console errors → PDF export).
   NO 🟢 verdict without 14/14 PASS. Capture in TEST_REPORT.md.
5. If DDL applied (new RPC or threshold migration), write MIGRATION.md Applied Log.
6. Write EXECUTION_REPORT + FINDINGS + TEST_REPORT + ROLLBACK.

Then `opticup-reviewer`:
- Re-runs §3 criteria.
- Runs advisors-for-objects.mjs against any new objects.
- 3+ spot-checks (PO lifecycle states, supplier_debt totals, stock_movement chain integrity).
- Writes REVIEW.md.

Then `opticup-strategic` Foreman-reviews — writes FOREMAN_REVIEW.md with skill proposals
(Self-Improvement counter advances — this is the SPEC that closes Phase 1B; the Module
Close Ceremony per architect SKILL.md §"Module Close Ceremony" fires after this SPEC).

Pipeline returns ONE Hebrew status line:
  "M1_LENS_PHASE_1B_PROCUREMENT [🟢/🟡/🔴]. דו"חות: SPEC/EXECUTION/TEST/REVIEW/FOREMAN.
   Phase 1B סגור."

Iron Rules in sharp focus: 1 (PIN on stock decrement), 2 (writeLog), 7, 8, 11, 12, 14, 15,
18, 19, 21, 22, 23, 31, 32.

Out of scope:
- The 3 foundation screens (already closed)
- Quick-receipt modal (deep-link instead)
- Auto-send PO (Phase 2+)
- Custom-per-customer M7 wiring (M7 not built; placeholder)
- Payment-allocation tables (M8)
- Discrepancy resolution workflow (Phase 2)
- FX conversion
- 21 FK indexes (separate parallel SPEC)
- Modifying mockups, decisions/M1.md, Phase 1 Brief
- Modifying Phase 1A / M1B0 / foundation artifacts beyond ➕➖ wiring
- Prizma data
- Merge to main (Daniel-only after Pipeline closes 🟢)

On escalation: write escalations/{ISO_TS}_{topic}.md + one Hebrew line. Halt.

Stop on deviation, not on success. This is the most complex SPEC of the module — trust the
discipline, trust the smoke, close 🟢 only on 14/14.

Post-close: trigger Module 1 Close Ceremony per opticup-architect SKILL.md §"Module Close
Ceremony" — read all FOREMAN_REVIEWs in M1, extract 1-2 lessons, update SKILL.md if
recurring patterns surface.
```

---

## Pre-flight checklist for the dispatcher (Daniel)

- [ ] `M1_SKILL_IMPROVEMENT_HARVEST` closed 🟢
- [ ] `M1_LENS_PHASE_1B_FOUNDATION` closed 🟢
- [ ] Daniel manual QA on foundation screens on demo: PASS
- [ ] M1B0 fixtures still present on demo
- [ ] Foundation screens deployed (3 HTML + 3 JS folders) and reachable
- [ ] Permission keys from foundation seeded
- [ ] No other M1 SPEC in flight
- [ ] Supabase MCP connected
- [ ] Working directory confirmed

---

## Expected execution timeline

- §6 pre-flight probes + §0 baselines: ~25 min
- SPEC authoring (12-18 commits planned): ~60 min
- Optional RPC + threshold migration: ~30 min
- 3 screens built (PO, POs List, GR — most complex): ~4-5 hours
- ➕➖ wiring + PIN-auth integration: ~45 min
- PDF export integration: ~30 min
- Functional smoke (14 steps on demo): ~45 min
- Reports (EXECUTION/FINDINGS/TEST/REVIEW/FOREMAN): ~60 min

**Total estimate: 8-10 hours of Pipeline time.** Largest single SPEC in the module — may want to split into two Claude Code sessions if energy/context budget becomes tight. The 3 screens are loosely independent.

---

## What happens after this SPEC closes

1. Pipeline returns Hebrew status line.
2. **Phase 1B fully closed.** Module 1 Lens scope complete pre-LIVE.
3. **Module 1 Close Ceremony** fires (architect SKILL.md mandate).
4. Daniel decides merge timing (`develop → main` via PR).
5. **M7 + M9 unblocked.** Architect can author M7 + M9 build Briefs.
6. The 3 deferred M1 extensions (contact lenses, accessories) become candidates for future M1 phases — Daniel decides priority.

---

*End of activation prompt.*
