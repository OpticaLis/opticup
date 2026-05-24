You are resuming the Optic Up Full-Auto Pipeline for ONE precise bug fix in the M6 prescription editor:
the stage strip never renders. Work on develop; never merge/push to main. Read CLAUDE.md (Iron Rules
21+32+34, §3a, §9) + the localhost-tester VFV gate (loaded-state mandatory).

Root cause (Architect-diagnosed, confirmed across all module files):
- modules/prescriptions/rx-stage-strip.js exposes window.RxStageStrip = { load, render, mount }.
  render() returns '' (empty) unless _examId is set, and _examId is ONLY set inside load().
- rx-center.js:99 calls RxStageStrip.render() — but NOTHING ever calls RxStageStrip.load() (grep
  across all 12 modules/prescriptions/*.js = 0 calls). So _examId stays null -> render() returns '' ->
  the strip never appears. The strip's mount() (click handlers) is also never called.

Fix (sequencing only — do not rewrite the strip):
- In the editor load path (rx-editor.js loadPrescription/selectPrescription OR rx-center.render before
  it builds html), call: await window.RxStageStrip.load() so _examId + _stages populate BEFORE
  RxStageStrip.render() runs.
- After container.innerHTML = html in rx-center.js, call window.RxStageStrip.mount() alongside the
  other component mounts (RxMetaGrid.mount etc.) so stage click + copy-from-previous handlers bind.
- Must work for BOTH entry paths: (a) direct URL with prescription_id, (b) via customer card -> visit.
  The strip renders whenever a prescription with an exam_id is loaded.

Pre-flight: branch=develop, git pull, verify clean tree on THIS machine (§3a). Read rx-editor.js +
rx-center.js first to confirm exact call sites. Demo only, no Prizma writes.

Closure (hardened loaded-state VFG — this exact bug slipped past two prior VFG runs, so be strict):
Open the SAME direct URL Daniel used:
prescriptions.html?t=demo&customer_id=65c872c1-0670-46e0-8663-08fa55d8f580&prescription_id=e64c8e84-35f4-49d7-b1d5-7bc0479a92ed&kind=glasses
AND a via-card path. In BOTH, the horizontal stage strip MUST be visible above the editor with its
stages (active/filled/dimmed). Commit a loaded-state screenshot for EACH path clearly showing the
strip; embed both + a region row per path in TEST_REPORT.md AND FOREMAN_REVIEW.md. A screenshot
without the strip visible = FAIL. Commit screenshots by explicit filename.

Iron Rule 32 Destructive Operations: None. Clean-repo gate: commit every file by explicit filename,
including screenshots. No git add -A. Stop only on genuine deviation. End with a Hebrew morning
summary: the fix, both loaded-state screenshot paths showing the strip, and — if merge-ready — the
GitHub compare URL + a one-line PR title. Then stop for the Architect's visual review.
