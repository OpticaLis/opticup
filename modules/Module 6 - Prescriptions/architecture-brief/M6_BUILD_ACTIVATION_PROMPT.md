You are running a long autonomous Full-Auto Pipeline for Optic Up to BUILD Module 6 (Prescriptions)
UI. No time cap. Work on develop only; never merge/push to main. Read CLAUDE.md first (Iron Rules +
§3a sync gate + §9 Bounded Autonomy + Iron Rule 34 strengthened Visual-Fidelity Gate), then load the
skills you need (executor / reviewer / localhost-tester / strategic).

This is pure execution of SPECs already sealed + approved. The editor mockup is approved + locked,
the field audit PASSED (zero schema gaps, zero migrations needed), and the per-eye ADD is already
schema-backed by prescription_glasses_eyes (read_add/bif_add/mul_add/int_add). Do not re-litigate
design — build to the SPEC + mockup.

Pre-flight: branch=develop, git pull, verify clean tree on THIS machine (Cowork FUSE phantom count is
not real dirt — verify on the executing machine per §3a; never git clean without the survey).
Reference the approved mockup at:
modules/Module 6 - Prescriptions/architecture-brief/M6_PRESCRIPTION_EDITOR_MOCKUP.html
and the field audit at:
modules/Module 6 - Prescriptions/architecture-brief/M6_EDITOR_FIELD_AUDIT.md

Execute these 3 sealed SPECs end-to-end under Bounded Autonomy, in this order (E → F → C):
1. modules/Module 6 - Prescriptions/docs/specs/M6_PRESCRIPTION_EDITOR/SPEC.md  (Phase E — editor UI)
   Reuse ALL M5 customer-card patterns (shell, per-field debounced autosave, DRAFT→COMMITTED→EXPIRED
   state, coming-soon registry). Both glasses + contacts views incl. the per-eye ADD block + copy-R→L.
2. modules/Module 6 - Prescriptions/docs/specs/M6_M5_CARD_WIRING/SPEC.md  (Phase F — wire into M5
   customer card: light up tab-3 prescriptions + the Vision tab via v_customer_vision_function_history;
   these two stub tabs flip to live).
3. modules/Module 6 - Prescriptions/docs/specs/M6_RECALL_ENGINE/SPEC.md  (Phase C — recall cron +
   engine function; infra, no UI).

Stop only on genuine deviation (a real schema gap the field audit missed, an unexpected destructive
need, a smoke/VFV failure you cannot resolve within the SPEC). Escalate via the standard escalation
file + one Hebrew line.

Closure is governed by Iron Rule 34 (strengthened): each UI SPEC (E + F) closes ONLY with the
Visual-Fidelity Gate — first-load styled-check + region-by-region mockup-vs-live comparison TABLE
embedded in TEST_REPORT.md AND FOREMAN_REVIEW.md, plus Chrome MCP screenshots. A screenshot without
the table is NOT valid closure. Do NOT mark any UI SPEC 🟢 on a paperwork PASS.

Clean-repo gate: commit every file you touch by explicit filename before ending. No git add -A.
No merge to main. No Prizma data writes (demo tenant only for QA).

At the end, write a Hebrew morning summary for Daniel: what was built, the Visual-Fidelity Gate result
per UI SPEC (with the comparison table + screenshot paths so the Architect can SEE the pixels before
relaying 🟢), any deviations, and — if merge-ready — the GitHub compare URL + a one-line PR title.
Then stop for the visual-fidelity review (the one deliberate human touchpoint).
