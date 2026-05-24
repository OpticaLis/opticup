# Brief — M6 Prescription Editor: Multi-Rx Stage Flow + 3 Fixes

> **Author:** opticup-architect (Cowork), 2026-05-25. **Module:** 6 (Prescriptions).
> **Trigger:** Daniel tested the live editor on demo and found 3 bugs + requested the rolling
> multi-prescription-per-visit workflow.
> **Mockup (APPROVED + LOCKED):** `M6_PRESCRIPTION_EDITOR_MOCKUP.html` — stage strip + skipped-state
> + per-eye ADD block. Build 1:1 to it.
> **Run shape (Daniel-approved):** ONE run, two internal parts — Part A fixes first (small, certain),
> then Part B flow. If Part B stalls on a decision, Part A is already done and not locked behind it.

## 0. Pre-flight
Branch=develop, git pull, verify clean tree on THIS machine (Cowork FUSE phantom count is not real
dirt — §3a). Editor code is in `modules/prescriptions/`. Re-confirm the live `commit_prescription`
signature before changing the call (authored value below).

## PART A — 3 fixes (do first, ship-ready independently)

### A1 — "סוג בדיקה" (exam-type) picker is EMPTY → wire it to the enum
The `exam_type` Postgres enum already holds 4 values: `final / old / subjective / objective`
(= סופי / ישן / סובייקטיבי / אובייקטיבי). The editor's meta-grid "סוג בדיקה" select renders empty.
Populate it from the enum (Hebrew labels, enum value as the stored code). Same for the contacts view's
exam-type picker (its own value set per the mockup). Autosave the chosen value to the prescription's
type/exam-type column on change.

### A2 — "סגור מרשם" (commit_prescription) ERRORS → fix the call signature
Root cause (diagnosed against live DB): the UI calls `DB.rpc('commit_prescription', {p_tenant_id,
p_prescription_id, p_kind})` — only 3 args — but the live RPC requires 5:
`(p_tenant_id, p_prescription_id, p_kind, p_type_id, p_eyes_data)`. Postgres can't match 3→5 → error.
Fix `rx-center.js` commit handler to send all 5: `p_type_id` = the selected exam/prescription type id
(now available from A1), `p_eyes_data` = the per-eye payload jsonb the RPC expects. Confirm the exact
`p_eyes_data` shape the RPC reads (inspect the function body) and build it from the rendered eye rows.
Verify a real DRAFT→COMMITTED transition end-to-end on demo (DB row status flips + print strip enables).

### A3 — display fixes
(a) **Minus sign on the wrong side (RTL):** the sign currently renders to the RIGHT of the number in
RTL. Force the sign to ALWAYS appear to the LEFT of the digits (standard numeric notation), regardless
of RTL flow — e.g. wrap the value LTR (`dir="ltr"` / `unicode-bidi:plaintext` on the numeric input, or
format with an explicit LTR isolate). Applies to SPH/CYL/ADD/PRISM/POWER and any signed numeric.
(b) **"-" placeholder doesn't clear on focus of an EMPTY field:** the clean-edit-mode strip must fire
on focus even when the field is empty/placeholder, so entering a blank field gives a truly empty input
(no stray "-"). Hook into the existing `rx-field-format.js` bindInput focus handler.

## PART B — Multi-prescription stage flow (build to the approved mockup)

### B1 — data model (NO schema change — already supported)
Multiple `prescriptions_glasses` / `prescriptions_contacts` rows link to ONE `eye_exams` row via the
existing FK. Each row carries its `exam_type` stage (old/objective/subjective/final). The "stages of
this visit" = the set of prescriptions sharing the same `eye_exam_id`. Confirm the exam→prescriptions
FK + the view that lists them; if a list view per exam is missing, add a read-only view (M6-owned).

### B2 — stage strip UI (per the approved mockup)
Horizontal strip at top-center of the editor: 4 stages (ישן/קיים · אובייקטיבי·מכונה ·
סובייקטיבי·אופטומטריסט · סופי). Behavior:
- Click a stage → loads THAT prescription into the center editor.
- **Stages are OPTIONAL.** An empty/unused stage renders DIMMED-GREY (dashed border, "(דולג)" tag),
  inactive. A stage activates automatically when it gets data (no explicit skip button).
- The "סופי" (final) stage is the default-selected when present.
- "⤵ העתק מהשלב הקודם" copies the previous filled stage's eye values into the current stage (rolls
  values forward: machine → physical → final).
- "⇄ השוואה (בקרוב)" — render the button DISABLED/future (side-by-side compare is a later SPEC).
- The history sidebar (all Rx over time) stays DISTINCT from the stage strip (the 3-4 Rx of THIS
  visit) — do not merge them.

### B3 — creating stages
"+ מרשם" / new-stage flow creates a new prescription row under the current eye_exam with the chosen
stage type via the existing `create_prescription_draft` RPC (extend its args if it needs the stage
type + exam_id; if so, that's an additive RPC change — declare it). Reuse M5 dedup/draft patterns.

## 3. Closure (hardened loaded-state VFG gate — mandatory)
Per Iron Rule 34 + updated localhost-tester VFV (no empty-state screenshots):
- Verify on demo in the LOADED editor (a visit with ≥2 stages, BOTH glasses + contacts).
- Demonstrate: picker populated + selectable (A1); DRAFT→COMMITTED succeeds + print strip enables
  (A2) with DB-row evidence; minus renders LEFT + empty field has no stray "-" (A3); stage strip
  shows filled/active/dimmed-skipped states, click switches stage, copy-from-previous rolls values
  (B2). Screenshots in LOADED state + region table embedded in TEST_REPORT.md AND FOREMAN_REVIEW.md.
- Confirm DB writes: each stage = a distinct prescription row under one eye_exam with correct exam_type.

## 4. Anti-scope
- No schema change unless B3 needs an additive RPC arg (declare it; no table/column changes — fields
  exist). Iron Rule 32 §Destructive Operations expected `None.`
- Do NOT build the side-by-side compare view (future SPEC) — button stays disabled.
- Clean-repo gate: commit every file by explicit filename. No git add -A. Demo only, no Prizma writes.
