You are resuming the Optic Up Full-Auto Pipeline to CORRECT the data model of the M6 multi-prescription
stage flow. The prior run shipped working UI but built the WRONG model and the Architect + Daniel
reopened it. Work on develop; never merge/push to main. Read CLAUDE.md first (Iron Rules 21+32+34, §3a,
§9) and the localhost-tester VFV gate (loaded-state mandatory).

What's wrong (Architect diagnosis, confirmed against live DB):
The prior run made EACH STAGE its own eye_exam (added a `create_exam(..., p_exam_type)` overload) and
grouped the stage strip by visit-DATE. The sealed decision (decisions/M6.md 2026-05-25) is the INVERSE:
ONE eye_exam per visit, with MULTIPLE prescriptions under it, each prescription carrying its own
`exam_type` stage. Visible symptom: the 3 same-day stages appear as 3 separate entries in the lifetime
history sidebar — the stages are leaking into the long-term history instead of staying grouped under
one exam.

Correct model (build to this):
- ONE eye_exam per visit. `exam_type` (old/objective/subjective/final) lives on the PRESCRIPTION, not
  the exam. Each stage = one prescription row linked to the SAME eye_exam via exam_id, with its own
  exam_type.
- The stage strip lists the prescriptions under the CURRENT exam (this visit). The history sidebar
  lists EXAMS — one row per visit — NOT one row per stage. They must be distinct (the whole point).
- Retire/stop using the `create_exam(..., p_exam_type)` overload (stage type is no longer an exam
  attribute). Keep the original `create_exam` (4-arg) for creating the one visit-exam. Use
  `create_prescription_draft(..., p_exam_id)` to add each stage-prescription under that exam.
  Any RPC change is additive only; if the overload must be dropped, declare it in Iron Rule 32
  §Destructive Operations and confirm no other caller depends on it first.

Pre-flight: branch=develop, git pull, verify clean tree on THIS machine (§3a). Inspect the current
stage-strip grouping logic (rx-stage-strip.js) + the create_exam/create_prescription_draft callers
before changing. Migrate/clean any demo test rows the prior run created in the wrong shape so the
verification starts clean (demo only).

Closure (hardened loaded-state VFG): on demo, create a visit with ≥2 stages and confirm:
- The history sidebar shows ONE row for that visit (not one per stage).
- The stage strip shows the stages under that one exam; click switches between them; dimmed/skipped
  states intact; copy-from-previous works; commit still works (DRAFT→COMMITTED, recall axes).
- DB evidence: ONE eye_exam row, MULTIPLE prescription rows sharing that exam_id, each with its own
  exam_type. Loaded-state screenshots + region table in TEST_REPORT.md AND FOREMAN_REVIEW.md.

Clean-repo gate: commit every file by explicit filename. No git add -A. Demo only, no Prizma writes.
Stop only on genuine deviation. At the end, write a Hebrew morning summary: the corrected model, the
loaded-state VFG result (table + screenshot paths so the Architect can SEE it), any RPC change +
its §32 declaration, and — if merge-ready — the GitHub compare URL + a one-line PR title. Then stop
for the Architect's visual review.
