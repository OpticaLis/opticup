You are resuming the Optic Up Full-Auto Pipeline for ONE precise bug fix in the M6 prescription editor
stage strip. Work on develop; never merge/push to main. Read CLAUDE.md (Iron Rules 21+32+34, §3a, §9)
+ the localhost-tester VFV gate (loaded-state mandatory).

The bug (Daniel-reported, Architect-diagnosed):
Clicking a dimmed/skipped stage (e.g. "ישן/קיים") WITHOUT entering any data makes that stage show as
FILLED/active instead of staying dimmed "(דולג)". So it looks like there's an old prescription when
there is none. Root cause in modules/prescriptions/rx-stage-strip.js:
- Line ~60/66: clicking a stage immediately calls createStage() → DB.rpc('create_prescription_draft')
  → an EMPTY prescription row is created for that stage.
- Line ~39: a stage is "filled" if a row with that exam_type merely EXISTS (`var filled = !!match`),
  regardless of whether it has any data. So the just-created empty row flips the stage to filled.

Fix (keep it minimal — only this behavior):
Make an empty stage STAY dimmed/"(דולג)" until it actually has data. Preferred approach:
- Do NOT create a prescription row just because the user clicked/entered a dimmed stage. Open the stage
  for editing in a transient way; create the prescription row LAZILY only when the user actually enters
  data (the same lazy-init pattern already used elsewhere — eye-rows / exam auto-create on first real
  input). Until data exists, the stage renders dimmed "(דולג)".
- AND/OR compute "filled" from whether the stage's prescription has real eye data (not just row
  existence), so a data-less draft never counts as filled.
- If empty draft rows were already being created on click, ensure they don't linger as phantom filled
  stages: either don't create them, or treat data-less drafts as dimmed and clean them up. No orphan
  empty prescriptions left behind (Iron Rule 21).
Do not change the data model, the sidebar, or other stages' behavior. Glasses + contacts both.

Pre-flight: branch=develop, git pull, verify clean tree on THIS machine (§3a). Read rx-stage-strip.js
fully + how createStage/render/selectPrescription interact before editing. Demo only, no Prizma writes.

Closure (hardened loaded-state VFG): on demo, open a visit, click a dimmed stage WITHOUT entering data
→ screenshot shows it STILL dimmed "(דולג)" (not filled); then enter a value → it becomes filled/active;
confirm no empty phantom prescription row was left in the DB (DB evidence: stage shows filled only when
its prescription has data). Commit loaded-state screenshots (before/after entering data) by explicit
filename; embed the table in TEST_REPORT.md AND FOREMAN_REVIEW.md.

Iron Rule 32 §Destructive Operations: declare None. unless you must DELETE phantom empty drafts created
by the old behavior (if so, declare it + scope it to demo QA rows only). Clean-repo gate: commit every
file by explicit filename incl. screenshots. No git add -A. Stop only on genuine deviation. End with a
Hebrew morning summary: the fix, the before/after screenshot paths so the Architect can SEE it, and —
if merge-ready — the GitHub compare URL + a one-line PR title. Then stop for the Architect's review.
