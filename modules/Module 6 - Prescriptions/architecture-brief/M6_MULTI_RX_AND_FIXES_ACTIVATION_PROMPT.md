You are running the Optic Up Full-Auto Pipeline to add the multi-prescription stage flow + fix 3 bugs
in the Module 6 prescription editor (live on demo). Work on develop; never merge/push to main. Read
CLAUDE.md first (Iron Rules incl. 21+32+34, §3a sync, §9 Bounded Autonomy) and the localhost-tester
VFV gate (loaded-state mandatory — empty-state screenshots are a FAIL).

Your Brief is at:
modules/Module 6 - Prescriptions/architecture-brief/M6_MULTI_RX_AND_FIXES_BRIEF.md
Approved mockup (build 1:1):
modules/Module 6 - Prescriptions/architecture-brief/M6_PRESCRIPTION_EDITOR_MOCKUP.html
Read both fully. Run in two parts — Part A fixes first (ship-ready), then Part B flow.

Pre-flight: branch=develop, git pull, verify clean tree on THIS machine (Cowork FUSE phantom count is
not real dirt — §3a). Re-confirm the live commit_prescription signature before editing the call.

PART A — 3 fixes:
- A1: populate the "סוג בדיקה" exam-type picker from the exam_type enum (final/old/subjective/objective
  = סופי/ישן/סובייקטיבי/אובייקטיבי), Hebrew labels + enum-value codes; autosave on change. Same for
  contacts view.
- A2: fix "סגור מרשם" — rx-center.js calls commit_prescription with only 3 args; the live RPC needs 5
  (p_tenant_id, p_prescription_id, p_kind, p_type_id, p_eyes_data). Send p_type_id (from A1) +
  p_eyes_data (inspect the RPC body for the exact jsonb shape, build from the eye rows). Verify a real
  DRAFT→COMMITTED on demo (status flips + print strip enables) with DB evidence.
- A3: (a) force the minus/sign to render LEFT of the number in RTL (LTR isolate on the numeric input);
  (b) clean-edit-mode must strip the "-" placeholder on focus of an EMPTY field too (rx-field-format.js
  bindInput focus handler).

PART B — multi-Rx stage flow (NO schema change; fields + FK already exist):
- Multiple prescription rows per ONE eye_exam, each carrying its exam_type stage. Add an M6-owned
  read-only view listing prescriptions per exam if missing.
- Build the stage strip per the mockup: 4 stages (old/objective/subjective/final); click loads that
  stage into the editor; stages OPTIONAL — empty stage renders dimmed-grey + dashed + "(דולג)",
  activates automatically when filled (no skip button); final default-selected; "copy from previous
  stage" rolls eye values forward; "compare" button DISABLED/future. History sidebar stays DISTINCT
  from the stage strip — do not merge.
- New-stage creation via create_prescription_draft (extend args additively if it needs stage type +
  exam_id; declare any RPC arg change — no table/column changes).

Closure (hardened loaded-state VFG): verify on demo in the LOADED editor (a visit with ≥2 stages,
BOTH glasses + contacts). Demonstrate picker populated, DRAFT→COMMITTED succeeds (DB evidence), minus
on LEFT + no stray "-" on empty focus, stage strip filled/active/dimmed states + click-switch +
copy-from-previous. Loaded-state screenshots + region table in TEST_REPORT.md AND FOREMAN_REVIEW.md.
Confirm each stage = a distinct prescription row under one eye_exam with correct exam_type.

Iron Rule 32 §Destructive Operations: declare None. (additive only). Clean-repo gate: commit every
file by explicit filename. No git add -A. Demo only, no Prizma writes. Stop only on genuine deviation.

At the end, write a Hebrew morning summary: what changed (Part A + Part B), the loaded-state VFG result
(table + screenshot paths so the Architect can SEE the pixels), any RPC-arg change made, and — if
merge-ready — the GitHub compare URL + a one-line PR title. Then stop for the Architect's visual review.
