You are running the Optic Up Full-Auto Pipeline to add professional INPUT BEHAVIOR to the Module 6
prescription editor (live on demo). Work on develop; never merge/push to main. Read CLAUDE.md first
(Iron Rules incl. 21 + 34, §3a sync, §9 Bounded Autonomy) and the localhost-tester VFV gate (loaded
state mandatory — empty-state screenshots are a FAIL).

Your Brief is at:
modules/Module 6 - Prescriptions/architecture-brief/M6_EDITOR_INPUT_BEHAVIOR_BRIEF.md
Read it fully and implement §2 exactly (all Daniel-approved). Do NOT build §4 (those are proposals for
Daniel — surface them in the morning summary only).

Pre-flight: branch=develop, git pull, verify clean tree on THIS machine (Cowork FUSE phantom count is
not real dirt — §3a). The editor code is in modules/prescriptions/ (rx-param-table.js,
rx-contacts-params.js, rx-add-block.js, rx-meta-grid.js, rx-secondary.js); inputs carry
data-eye+data-field and already fire a `change` listener → window.RxEditor.autosaveField().

Implement (Iron Rule 21 — ONE shared formatter, no duplicated sign logic):
- Create modules/prescriptions/rx-field-format.js exposing formatField(fieldKey, raw) +
  stripForEdit(fieldKey, display). All input files call it.
- Normalize on COMMIT (Enter OR blur): write formatted value back to the input, THEN autosave the
  NORMALIZED value (not raw). Per Brief §2 table: SPH/CYL default minus + 0.25 snap + 2dp; ADD axes
  default plus + 0.25 + 2dp; AXIS/K-axis integer 0–180 + °; PRISM value + △ + 0.25 + 2dp; PD/BC/DIA/
  Pupil/axial + mm; K1/K2/Kavg 2dp; VA preserves 6/x; BASE stays a picker.
- Default sign applies ONLY when the user typed no sign; respect explicit +/-; empty stays empty.
- Momentary highlight (~1s flash / accent sign color) when a sign is AUTO-applied (Daniel safety rule);
  no highlight when the user typed the sign.
- Clean edit-mode: strip sign/unit on focus, re-apply on commit.

Closure (hardened VFG — loaded state): on demo, open a DRAFT in BOTH glasses + contacts and DEMONSTRATE
each behavior with before/after loaded-state screenshots (SPH 5→-5.00 + highlight; +5→+5.00 no
highlight; AXIS 175→175°; PRISM 4→4.00△; ADD 1.5→+1.50; PD 32→32mm; focus strips to clean number) +
DB-write evidence that the NORMALIZED value is autosaved. Embed the screenshots + behavior table in
TEST_REPORT.md AND FOREMAN_REVIEW.md. Do NOT mark 🟢 on an empty-state or text-only PASS.

Clean-repo gate: commit every file you touch by explicit filename. No git add -A. No schema changes.
No Prizma writes (demo only). Stop only on genuine deviation.

At the end, write a Hebrew morning summary: what changed, the loaded-state VFG result (table +
screenshot paths so the Architect can SEE the pixels), the §4 UX proposals as options for Daniel, and
— if merge-ready — the GitHub compare URL + a one-line PR title. Then stop for the Architect's review.
