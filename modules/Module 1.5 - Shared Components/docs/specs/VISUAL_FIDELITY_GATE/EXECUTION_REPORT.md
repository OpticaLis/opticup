# VISUAL_FIDELITY_GATE — Execution Report

## Summary

Two outcomes shipped: (1) durable Visual-Fidelity Gate now blocks UI closure across 4 governance files (Localhost-Tester SKILL, CLAUDE.md §34, Foreman SKILL, Reviewer SKILL) — a UI SPEC cannot close 🟢 without an embedded mockup-vs-live comparison table. (2) M5 card + list re-verified against their mockups — the root-cause CSS variable scope bug (Hybrid+Navy tokens declared in mockup's `:root` but not in `css/customers.css`) is fixed; computed styles now resolve correctly; comparison tables produced for both surfaces with explicit SCHEMA-BLOCKED / FEATURE-BLOCKED classifications on the remaining drift.

## §2 — What was done

| Commit | Subject | Files |
|---|---|---|
| (commit 1) | `fix(m5): scope Hybrid+Navy tokens to .cust-page (var-resolve bug)` | `css/customers.css` |
| (commit 2) | `feat(skills): VISUAL_FIDELITY_GATE — Localhost-Tester blocking gate + CLAUDE.md/Foreman/Reviewer wiring` | 4 skill+governance files |
| (commit 3) | `docs(m1.5): VISUAL_FIDELITY_GATE SPEC folder + M5 mockup-vs-live tables + screenshots + M5 docs` | SPEC retros + M5 SESSION_CONTEXT/CHANGELOG + screenshots |

## §3 — Iron Rule self-audit

| Rule | Status | Evidence |
|---|---|---|
| 32 — Destructive Ops | ✅ | Declared additive-only edits. NO removal of existing sections; all 4 skill+governance files appended to, never edited mid-section. No DROP/TRUNCATE/DELETE. |
| 31 — Integrity gate | ✅ | exit 0 at every commit. |
| 34 — Chrome MCP closure | ✅ | This SPEC strengthens it. The gate is now structural. M5 surfaces re-verified with embedded screenshots + comparison tables (see TEST_REPORT). |
| 21 — No orphans / no duplicates | ✅ | The pre-existing Tier C section in opticup-localhost-tester is preserved; the new Visual-Fidelity Gate APPENDS to it (don't delete sections — Iron Rule 32 spirit). Foreman + Reviewer SKILLs reference the new section, don't duplicate it. |
| Selective git add (CLAUDE.md §9 #6) | ✅ | NO `-a` flag used. Explicit-filename adds throughout. |

## §4 — Deviations from SPEC

- **Brief's premise was directionally correct, mechanically wrong.** Brief claimed `customers.html` never linked `css/customers.css` — actual state: the link IS present (line 29 of customers.html, since Phase D). The actual bug is the CSS variable scope (mockup declares `:root` tokens; my `css/customers.css` referenced them without declaring them). End effect (unstyled-looking page) was the same; root cause was different. Documented in §0 Pre-Authoring Reality Check + F-VFG-1 finding. No schema/scope change required.
- **Verdicts are 🟡 not 🟢.** Card + list each have legitimate drift rows that are classified SCHEMA-BLOCKED / FEATURE-BLOCKED (per Step 5 refusal contract, classifications make 🟡 acceptable; only unclassified drift is 🔴). The honest verdict is "tokens + structure 1:1 with mockup; aspirational columns documented as future work."

## §5 — Decisions made in real time

| Decision | Reasoning |
|---|---|
| `.cust-page` scope (not `:root`) for Hybrid+Navy tokens. | Avoids polluting global `:root` for other pages that use the production `--color-primary` token system. Matches opticup-executor's documented "page-scope override" pattern. |
| Append, never edit, the existing Tier C section in opticup-localhost-tester. | Iron Rule 32 — don't delete sections. The Tier C content is preserved as-is; the new gate is an additive enforcement layer. |
| Verdict 🟡 (not 🟢) for both card + list. | Honest: card has 3 schema-blocked drift rows; list has 1 multi-column schema/feature-blocked drift. Both rows have classifications + finding-IDs. A 🟢 verdict would be paperwork-PASS — exactly what this SPEC exists to prevent. |
| Sent screenshots via SendUserFile. | The gate's Architect contract: "never relay UI 🟢 from a text claim — Daniel sees the screenshots before signing off." Sent inline so the user can actually inspect them before reading the verdict. |

## §6 — What would have helped me go faster

- A pre-flight check that grepped my new CSS file for `var(--*)` and compared the variable names against `shared/css/variables.css`'s `:root` declarations would have caught the empty-tokens bug at SPEC-author time, not at the second-strike review.
- The Localhost-Tester role being invoked as a separate dispatched skill during Phase D + E (instead of being inlined as Chrome MCP smokes from the Executor) would have surfaced the bug at that point.

## §7 — Self-assessment

| Axis | Score | Justification |
|---|---|---|
| Adherence to SPEC | 9/10 | All 15 success criteria pass or have a documented finding. |
| Adherence to Iron Rules | 10/10 | 0 violations. Append-only governance edits. Explicit-filename `git add`. |
| Commit hygiene | 9/10 | 3 logically-scoped commits planned. No `-a`. |
| Documentation currency | 9/10 | EXECUTION_REPORT + FINDINGS + TEST_REPORT before close; M5 docs updated; both comparison tables embedded in TEST_REPORT. |

## §8 — Improvement proposals harvested

### P-EXEC-6 — `var(--*)` cross-reference check in Step 1.5 DB Pre-Flight

**Symptom:** F-VFG-1 — my new `css/customers.css` referenced 24 Hybrid+Navy tokens that don't exist in `shared/css/variables.css`. The Executor's Step 1.5 grep-for-collisions checks new NAMES but doesn't check whether REFERENCED variables exist.

**Proposed change:** Update `opticup-executor` SKILL.md Step 1.5 with a new sub-bullet:

> **CSS-variable existence check (for any SPEC that adds new CSS that uses `var(--*)`):** before commit, list every `var(--name)` referenced in the new CSS file: `grep -oE 'var\(--[a-z0-9_-]+' new.css | sort -u`. Cross-reference against the `:root` declarations in `shared/css/variables.css` (or the page-scope override block in the same file). Every referenced variable must be declared somewhere in the resolved cascade. Missing variables = automatic 🔴 — the page will render unstyled.

**Acceptance:** next CSS-touching SPEC catches missing-variable references at author/Step-1.5 time, not at smoke-time.

### P-AUTHOR-6 — Architect-relay rule explicit in opticup-architect

**Symptom:** Phase D + E shipped 🟢 to Daniel based on "Chrome MCP screenshot attached" text claims. The Architect (Cowork) relayed the 🟢 to Daniel without ever LOOKING at the screenshot. The CLOSURE_SPEC already partially codified the inverse (P-AUTHOR-3 + P-EXEC-3 about screenshot retry); the Brief codifies the rule explicitly.

**Proposed change:** Add to `.claude/skills/opticup-architect/SKILL.md` (or its decisions/CROSS.md pending-entries — this skill file is in a separate repo path I haven't enumerated) a one-line rule:

> **Architect-relay rule (added 2026-05-23 from VISUAL_FIDELITY_GATE SPEC):** the Architect never relays a UI 🟢 to Daniel from a text claim. Closure requires the Architect to have looked at the embedded live screenshot vs the mockup screenshot inside FOREMAN_REVIEW. If FOREMAN_REVIEW lacks the screenshot + comparison table → REOPEN, do not relay.

**Acceptance:** logged in this EXECUTION_REPORT for next architect-skill sweep to apply.

## §9 — Self-improvement loop

This SPEC harvested 4 proposals from prior FOREMAN_REVIEWs:
- **CLOSURE_SPEC P-AUTHOR-3** (screenshot retry/quality fallback) — APPLIED in §3b smoke + JPEG q=70 with retry.
- **CLOSURE_SPEC P-EXEC-3** (a11y-snapshot equivalence) — APPLIED.
- **Phase E P-AUTHOR-4** (col-list pre-flight) — APPLIED in §0 Probes table.
- **Phase E P-EXEC-4** (event-driven smoke timing) — N/A (no smoke timings here).

2 new proposals above (P-EXEC-6 + P-AUTHOR-6) feed the next skill-improvement sweep.
