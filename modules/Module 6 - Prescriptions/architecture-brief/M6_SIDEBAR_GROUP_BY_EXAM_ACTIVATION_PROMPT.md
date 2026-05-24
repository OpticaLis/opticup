You are resuming the Optic Up Full-Auto Pipeline for ONE targeted fix to the M6 prescription editor
sidebar. The stage data-model is already correct (one eye_exam per visit, multiple prescriptions under
it). The only remaining defect: the history sidebar still lists one row PER PRESCRIPTION (so the stages
of one visit appear as separate history rows). Fix: the sidebar must show ONE ROW PER VISIT (exam).
Work on develop; never merge/push to main. Read CLAUDE.md (Iron Rules 21+32+34, §3a, §9) + the
localhost-tester VFV gate (loaded-state mandatory).

Root cause (Architect-diagnosed): `modules/prescriptions/rx-sidebar.js` queries
`v_prescriptions_list_for_customer` (one row per prescription). It should list EXAMS instead.

Fix:
- Change the sidebar to list exams — source `v_exam_for_customer` (columns: id, tenant_id,
  customer_id, exam_date, status, outcome, optometrist_id), one row per visit, ordered by exam_date
  desc. If a richer sidebar row is wanted (stage count, final-stage R/L summary, latest status),
  extend that view (or add an M6-owned `v_customer_exams_summary`) additively — your call; keep it a
  read-only view, security_invoker=on, tenant-scoped.
- Clicking an exam row loads THAT visit: the stage strip fills from the prescriptions under that
  exam_id; the default-selected stage is the final (or the latest filled). The stage strip remains the
  ONLY place the individual stages appear — never the sidebar.
- Keep search + filter pills working against the exam list.
- No change to the stage strip, the editor body, commit, or the data model — sidebar query/render only.

Pre-flight: branch=develop, git pull, verify clean tree on THIS machine (§3a). Inspect rx-sidebar.js
render + selectPrescription wiring so clicking an exam row drives the strip correctly. Clean any
mis-shaped demo test rows first (demo only).

Closure (hardened loaded-state VFG): on demo, a customer with ≥1 multi-stage visit must show ONE
sidebar row for that visit; clicking it loads the strip with the stages; a second visit on a different
date = a second sidebar row. Loaded-state screenshot showing the sidebar with one-row-per-visit +
the strip populated, region table in TEST_REPORT.md AND FOREMAN_REVIEW.md. DB evidence: sidebar row
count == distinct exam count (not prescription count).

Iron Rule 32 §Destructive Operations: declare None. unless you replace a view (CREATE OR REPLACE is
fine; declare any DROP). Clean-repo gate: commit every file by explicit filename. No git add -A.
Demo only, no Prizma writes. Stop only on genuine deviation. End with a Hebrew morning summary: the
fix, the loaded-state VFG result (table + screenshot path so the Architect can SEE it), and — if
merge-ready — the GitHub compare URL + a one-line PR title. Then stop for the Architect's review.
