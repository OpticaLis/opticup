# FINDINGS — M1_5_SHARED_COMPONENTS_PHASE_0

> Findings raised during execution that were OUT of this SPEC's scope but
> should not be lost. One concern per task (Iron Rule for Executors); these
> are logged for Foreman triage.

---

## F-1 — INFO — SPEC baseline mismatch (shared/css file count)

**Location:** `M1_5_SHARED_COMPONENTS_PHASE_0/SPEC.md` §0 Baselines table.

**Description:** SPEC §0 said `BASE_SHARED_CSS_FILES = 10`. Actual at session start was 9 (cat-sidebar, components, components-extra, forms, layout, modal, table, toast, variables). The SPEC author appears to have over-counted by 1, possibly anticipating a `tokens.css` that did not yet exist. Not a functional bug — captured in this SPEC's RULE_21_INVESTIGATION.md §0 with the actual count and a note that `tokens.css` would be the file that brings the count to 10 (now actually 16 after this SPEC's 7 new CSS files + tokens.css ship).

**Severity:** INFO.

**Suggested next action:** DISMISS. Foreman may want to add to opticup-strategic's "SPEC authoring checklist" a "run `ls shared/css/*.css | wc -l` to confirm baseline at SPEC authoring time" check.

---

## F-2 — LOW — Pre-existing untracked ACTIVATION_PROMPT misplacement (Module 1 vs Module 1.5)

**Location:** `modules/Module 1 - Inventory Management/docs/specs/M1_5_SHARED_COMPONENTS_PHASE_0/ACTIVATION_PROMPT.md`.

**Description:** An ACTIVATION_PROMPT for SPEC 2 of the M1 Lens Rebuild was placed in **Module 1**'s specs folder rather than **Module 1.5**'s (where the SPEC itself lives). The real SPEC.md and its retrospective folder are correctly placed in Module 1.5; only the activation prompt diverged. The misplacement is harmless (the prompt is informational) but creates folder-tree drift between Module 1's `docs/specs/` (which acquired a folder for a SPEC not actually owned by Module 1) and Module 1.5's `docs/specs/` (which is the real home).

Two parallel sister occurrences exist for SPEC 3 (`M1_LENS_DB_SCHEMA_RECEIPTS_NOTES`) and SPEC 4a (`M1_LENS_INVENTORY_QUICK_RECEIPT_INTEGRATION`) — those ARE correctly owned by Module 1, so their placements are fine.

**Severity:** LOW.

**Suggested next action:** Foreman to either (a) move the misplaced ACTIVATION_PROMPT into Module 1.5's SPEC folder with a `git mv`, OR (b) leave it as a cross-module hand-off note (Module 1 owners reading their specs folder discover the M1.5 dependency). Both are defensible. Tiny — the Foreman can decide in 30 seconds.

---

## F-3 — INFO — modal-wizard.js vs new wizard-step-indicator.js — dual existence

**Location:** `shared/js/modal-wizard.js` + `shared/js/wizard-step-indicator.js`.

**Description:** SPEC's RULE_21_INVESTIGATION.md §1 classified these as DISTINCT primitives:
- `modal-wizard.js` → in-modal multi-step wizards via `Modal.wizard()`; CSS uses `.wizard-step-*` in modal.css.
- `wizard-step-indicator.js` → page-level standalone steppers (PO 4-step mockup); CSS uses `.wstep-*` in wizard-step-indicator.css.

The two systems are NOT structurally unified. A future unification (e.g., shared underlying state-machine) would be a separate refactor SPEC, not in this SPEC's scope.

**Severity:** INFO (architectural observation, not a defect).

**Suggested next action:** Consider whether a future SPEC `M1_5_WIZARD_UNIFICATION` is worth ~3-4h. ROI: low until a 3rd wizard surface appears that wants both styles. Recommend DEFER.

---

## F-4 — LOW — Lens-details-drawer note edit UX uses window.prompt + window.confirm

**Location:** `shared/js/lens-details-drawer.js` `_handleNotesClick()`.

**Description:** Note edit captures the new text via `window.prompt()` and confirms deletes via `window.confirm()`. The mockup (`LENS_PRICING_MOCKUP.html` lines 291-330) shows an inline textarea-on-card edit pattern that would feel more polished. The decision (EXECUTION_REPORT §5 E-4) was to keep the file under cap; the host page (Pricing screen, future Inventory side-panel) can compose `Modal.form()` / `Modal.confirm()` instead and pass the result to the existing `onEditNote` / `onDeleteNote` callbacks — the API is callback-driven, no internal change needed.

**Severity:** LOW.

**Suggested next action:** Decide at SPEC 4a or SPEC 5 (Pricing rebuild) consumption time: either (a) accept the host-page polish pattern and document in the consumer SPEC, or (b) post-MVP refactor of `lens-details-drawer.js` to use an inline textarea-replace pattern, +~40 lines.

---

## F-5 — INFO — Pre-commit file-size hook reports table-builder.js as "350" lines

**Location:** `scripts/checks/file-size.mjs` (assumed; pre-commit warning surface).

**Description:** `wc -l shared/js/table-builder.js` reports 349 lines. The pre-commit hook reported "shared\js\table-builder.js:350 — file exceeds 300-line soft target (350 lines)" as a WARNING. The number "350" in the hook output appears to be 1-indexed counting (lines = last-line-number) while `wc -l` is 0-indexed counting (lines = newline count). The hook treated 350 as a WARNING not a violation (the absolute cap is 350 inclusive), so it did NOT block.

**Severity:** INFO.

**Suggested next action:** DISMISS. The off-by-one between `wc -l` and the hook's counting is a known minor harmless reporting quirk. If anyone wants to harmonize, it's a one-line fix to the hook's display logic, but the gate is functioning correctly.

---

*End of FINDINGS. 5 entries — 2 INFO, 2 LOW, 0 MEDIUM, 0 HIGH, 0 CRITICAL.*
