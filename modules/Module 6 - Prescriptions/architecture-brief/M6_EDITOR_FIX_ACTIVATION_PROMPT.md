You are resuming the Optic Up Full-Auto Pipeline to FIX + properly verify the Module 6 prescription
editor. The previous M6 build run shipped code but its Visual-Fidelity verification was INVALID — it
captured the editor's EMPTY state, so none of the editor regions were actually verified, and there is
a layout-overflow defect. Daniel + the Architect reopened it. Work on develop; never merge/push to
main. Read CLAUDE.md first (Iron Rules + §3a + §9 + Iron Rule 34) and the UPDATED localhost-tester
VFV section (it now forbids empty-state screenshots — see below).

What was wrong (from the Architect's visual review of vfg-glasses-view.png):
- The screenshot showed the empty state ("בחר מרשם מהרשימה או צור חדש") — the meta grid, per-eye
  parameter table, ADD block, secondary row, notes, recall axes, and print strip were NOT rendered.
- The VFV table claimed 16/16 MATCH for regions that were not visible in the image — a fabricated PASS.
- A real layout-overflow defect: the sidebar is pushed off the right edge and the header is truncated
  (S2A cut off). Horizontal overflow.

Required fixes (the editor MUST match the approved mockup 1:1 —
modules/Module 6 - Prescriptions/architecture-brief/M6_PRESCRIPTION_EDITOR_MOCKUP.html):
1. Fix the layout so there is NO horizontal overflow: sidebar fully visible, header not truncated,
   content body + sidebar both fully on-screen at 1920×1080 (and degrade cleanly narrower). Match the
   mockup's grid (sidebar + center) and RTL placement exactly.
2. Ensure the editor body renders every region from the mockup when a prescription is open, for BOTH
   glasses and contacts views: meta grid (7 / 7-CL cells), per-eye parameter table (17 cols glasses /
   14 cols contacts, R·OD + L·OS, section colors), the per-eye ADD block (4 add-axes × 2 eyes + the
   copy-R→L button), secondary row, notes, recall axes, health-fund display, print strip. 1:1 with the
   mockup — same fields, same order, same labels, same colors/tokens, same RTL.

Verification — under the UPDATED VFV gate (non-negotiable):
- Drive the editor into its LOADED state before every screenshot: open (or create) a DRAFT
  prescription so the FULL body renders. An empty-state / "select a record" screenshot is a VFV FAIL
  and is explicitly forbidden now.
- Capture loaded-state screenshots for BOTH glasses and contacts views (and the M5 card tab-3 / Vision
  tab from Phase F in their live state).
- Produce the region-by-region mockup-vs-live comparison TABLE — but only mark a region MATCH if it is
  actually visible in the captured loaded-state screenshot. Any region not visible = UNVERIFIED, not
  MATCH. Confirm no horizontal overflow.
- Embed the table + screenshot paths in TEST_REPORT.md AND FOREMAN_REVIEW.md per Iron Rule 34.

Also commit (clean-repo gate — do NOT leave these as orphan edits):
- The Architect already edited `.claude/skills/opticup-localhost-tester/SKILL.md` (added step 0
  loaded-state requirement + new Forbidden Shortcut for empty-state captures + no-overflow check +
  the 5th-firing history entry). Commit that file by explicit filename as part of this run.
- Commit every file you touch by explicit filename. No git add -A. No Prizma writes (demo only).

Stop only on genuine deviation. At the end, write a Hebrew morning summary: what was fixed, the
loaded-state VFV result per view (table + screenshot paths so the Architect can SEE the pixels), and —
if merge-ready — the GitHub compare URL + a one-line PR title. Then stop for the Architect's visual
review.
