You are Claude Code on the Optic Up project at `C:\Users\User\opticup`.

Execute SPEC `M1_LENS_PHASE_1B_GAP_CLOSURE` via Full Auto Pipeline (single chat, end-to-end, no human-in-the-loop per commit).

**Brief:** `modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_PHASE_1B_GAP_CLOSURE_BRIEF.md`

Pipeline skill chain per the Brief §9:
1. Load `opticup-strategic`. Run §8 Pre-Flight probes against live Supabase. Author SPEC.md at `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_GAP_CLOSURE/SPEC.md` including a `## 1.5 Pre-flight findings` section.
2. Load `opticup-executor`. Execute the SPEC commit-by-commit on develop. Iron Rule 32 destructive-ops as declared in Brief §6.
3. Load `opticup-reviewer`. Validate against the 14 success criteria in Brief §7.
4. Load `opticup-localhost-tester`. Runtime smoke on demo tenant — all 4 LENS_* HTML pages + functional verification of F-1, F-2, F-3 per Brief §7.1-§7.7.
5. Load `opticup-strategic` again. Close: FOREMAN_REVIEW.md + harvest skill improvements + Hebrew summary per Brief §10.

**Constraints:**
- Develop branch only. Daniel-only authorization for main merge.
- Iron Rules 1, 14, 15, 18, 19/P19/P40, 21, 22, 31, 32 all enforced.
- Pattern P40: `stock_adjustment_reason` is a config table (P19), NOT an enum — verify in SPEC.md.
- 3 superseded draft Briefs (`M1_K2_RECEIPT_COMPLETION_BRIEF.md`, `M1_RECEIPT_VARIANT_LESS_LINES_BRIEF.md`, `M1_STOCK_ADJUSTMENT_INFRA_BRIEF.md`) + 1 superseded stub (`M1_LENS_INVENTORY_PHASE_1B_CUSTOMER_SCREENS/SPEC.md`) get `STATUS: SUPERSEDED by M1_LENS_PHASE_1B_GAP_CLOSURE (2026-05-15)` headers in the same Pipeline.
- Smoke 7/7 must remain PASS throughout.
- Prizma untouched: row-count delta = 0 on Prizma lens-related tables pre vs post.

**Escalation:** if Pre-Flight reveals divergence from Brief assumptions, OR any CRITICAL deviation surfaces mid-execution, write `modules/Module 1 - Inventory Management/escalations/{ISO_TS}_GAP_CLOSURE_BLOCKER.md` + emit ONE Hebrew line to Daniel.

Return the Hebrew summary in the exact shape of Brief §10 when 🟢 (or 🟡 with notes).

Begin.
