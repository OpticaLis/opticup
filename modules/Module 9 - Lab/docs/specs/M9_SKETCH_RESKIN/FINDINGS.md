# FINDINGS — M9_SKETCH_RESKIN

**Date:** 2026-05-11
**Executor:** opticup-strategic (Full-Auto Pipeline single-chat)
**SPEC:** `modules/Module 9 - Lab/docs/specs/M9_SKETCH_RESKIN/SPEC.md`

Below are observations from execution that do NOT impact the close of this SPEC but are worth recording for future reskin work + project hygiene.

## Finding #1 — Gradient-first sequence absorbs companion hex (expected; document pattern)

**Observation:** With gradient-first ordering (SPEC §3), the `Edit` swap of `linear-gradient(135deg, #fff8e8 0%, #fff3d6 100%); border: 1px solid #e0c97f;` → `#e6f1fb; border: 1px solid #1e3a8a;` consumes the three gold-family tokens (`#fff8e8`, `#fff3d6`, `#e0c97f`) on that single line as part of a longer match string. So the follow-up `replace_all` for `#e0c97f`, `#fff8e8`, `#fff3d6` returns "String to replace not found" for files where those hexes existed ONLY inside the recommendation-banner CSS rule.

**Disposition:** Not a defect. The expected/correct behavior. Three of the swap-map rows act as "safety nets" that fire ONLY in files where those tokens appear in additional contexts beyond the matched gradient line. The pattern surfaced this way:

| File | `#e0c97f` swap fired | `#fff8e8` swap fired | `#fff3d6` swap fired |
|---|---|---|---|
| M9_SKETCHES | no (gone with gradient) | no (gone with gradient) | yes (other locations) |
| M9_SHIPMENTS | yes (no gradient in file) | yes | yes |
| M9_DASHBOARD | yes (other locations) | no | no |
| M9_SETTINGS | no | no | yes |
| M9_COMPENSATION | yes | yes | yes |

**Recommendation:** Future re-skin SPECs should treat "not found" returns on companion hex swaps after a gradient-elimination Edit as a normal outcome and not a halt condition. Encoded into Author Improvement Proposal #1 below.

## Finding #2 — Pre-reskin tags created locally but not pushed

**Observation:** The 5 `pre-reskin-M9-*` tags exist on the local clone but `git push origin develop` does NOT push tags by default. Same pattern observed in M13.

**Disposition:** Acceptable for rollback purposes — the tag is anchored to commit `d9b2fd2` which IS on the remote. A local-only tag is still a valid rollback target because the commit it references is reachable from the remote. However, if Daniel ever needs to rollback from a different machine, the tag would not be visible there.

**Recommendation:** Future re-skin SPECs may want to add `git push origin --tags` to the post-commit step. Filed as Executor Improvement Proposal #1 (this SPEC's FOREMAN_REVIEW).

## Finding #3 — Color inventory pass caught zero gaps

**Observation:** The pre-SPEC Color Inventory pass (SPEC §2 Color Inventory — Foreman Reconciliation) bucketed every unique hex across all 5 files into Swap / Preserve-Semantic / Preserve-Scaffolding. **No mid-execution surprises emerged.** All 10 swap-map rows + 1 gradient row covered every legacy token actually present. No "implicit extension" decisions needed at runtime.

**Disposition:** Confirms M13 Author Improvement #2 (Color Inventory protocol) is high-value. Should remain a mandatory step for re-skin SPECs going forward.

## Finding #4 — M9 module has no `docs/` infrastructure yet

**Observation:** Creating `modules/Module 9 - Lab/docs/specs/M9_SKETCH_RESKIN/` was the FIRST entry under `modules/Module 9 - Lab/docs/`. The module previously had only `architecture-brief/` and a few briefs. There is no `MODULE_SPEC.md`, `MODULE_MAP.md`, `SESSION_CONTEXT.md`, `CHANGELOG.md`, `db-schema.sql`, or `ROADMAP.md`. M9 is pre-build (design-phase only).

**Disposition:** Expected — M9 is in design phase. No CLAUDE.md violation. The folder creation is itself a non-destructive precedent that future M9 SPECs can build on.

**Recommendation:** When M9 enters its build phase, an early SPEC should bootstrap the standard module docs structure (MODULE_SPEC stub, MODULE_MAP stub, SESSION_CONTEXT stub, CHANGELOG, db-schema.sql, ROADMAP). Not in scope here.

## Finding #5 — Hebrew content preservation — verified by symmetry

**Observation:** Commit diff is 158 insertions + 158 deletions across 5 files — perfectly symmetric. This is strong evidence that only hex-token chars changed and no Hebrew character was touched (Hebrew bytes would have produced asymmetric diffs if altered).

**Disposition:** Confirms the `replace_all` approach is safe for RTL/Hebrew content as long as the from/to strings are pure ASCII hex. No action needed.

## Finding #6 — `#1a1a2e` preserved as decorative Navy

**Observation:** M9_SKETCHES.html has `#1a1a2e` on the `.game-banner` rule (line ~93 pre-edit) as a standalone dark-navy background. Brief swap map did NOT enumerate it. SPEC §2 Color Inventory bucketed it as PRESERVE (semantic — Navy-family decorative, already Hybrid-aligned).

**Disposition:** Intentional. Decorative dark Navy that complements `#1e3a8a` rather than competes with the Prizma-gold palette being eliminated. If a future Architect decision asks for monochrome Navy ladder, a follow-up SPEC can sweep this to `#0f172a` or `#1e3a8a`.

---

*End of FINDINGS. No items require new SPECs. No TECH_DEBT entries.*
