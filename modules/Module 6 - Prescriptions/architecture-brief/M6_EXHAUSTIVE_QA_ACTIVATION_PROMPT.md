You are running the Optic Up Full-Auto Pipeline for an EXHAUSTIVE QA sweep of Module 6 (Prescriptions)
on the demo tenant, fixing anything broken in-place. Work on develop; never merge/push to main. Read
CLAUDE.md (Iron Rules 21+32+34, §3a, §9) + the localhost-tester VFV gate (loaded-state mandatory —
empty-state screenshots FAIL).

Your Brief is at:
modules/Module 6 - Prescriptions/architecture-brief/M6_EXHAUSTIVE_QA_BRIEF.md
Read it fully. Mode: fix-as-you-go. Demo tenant ONLY (slug demo, PIN 12345). ZERO Prizma writes. Do
NOT delete the test data you create — label it as QA data so Daniel can inspect it.

Pre-flight: branch=develop, git pull, verify clean tree on THIS machine (§3a). FIRST write a test
matrix (every flow + scenario from Brief §1) so coverage is provable, THEN execute it.

Exercise EVERY flow and scenario in M6 on demo (see Brief §1 for the full list): both entry paths
(direct URL + via customer card); empty/one/many-visit customers; the full multi-Rx stage flow (4
stages under one eye_exam, skipped/dimmed stages, click-switch, copy-from-previous, strip renders on
BOTH paths); per-eye input behavior (sign defaults, 0.25 snap, °/△/mm suffixes, minus-on-left, clean
edit-mode, copy-R→L, save persistence to DB) INCLUDING the deferred polish (PD whole-number 32mm;
BC/DIA 1dp 8.4mm); state machine (draft→commit→read-only, cancel, clone, recall axes); contacts-
specific fields + glasses↔contacts toggle; M5 customer-card tab-3 + Vision tab light-up; health-fund
display; permission gating; edge cases (AXIS>180, invalid numbers, empty-required-on-commit, two tabs
on one draft, rapid stage-switch, narrow viewport / no horizontal overflow).

Fix-as-you-go: when a scenario fails, diagnose root cause, fix in-place (additive code/RPC/view — NO
schema table/column changes without escalation), re-test until green, record bug+fix. Keep going. STOP
+ escalate only on a genuine deviation needing a Daniel decision (real model change, destructive op,
or a Prizma-touch need).

Deliverables (keep everything, no deletion): modules/Module 6 - Prescriptions/docs/specs/
M6_EXHAUSTIVE_QA/TEST_REPORT.md (full matrix: every scenario PASS/FIXED/FAIL + what broke + how fixed
+ loaded-state screenshots for major flows committed by explicit filename) + FINDINGS.md +
FOREMAN_REVIEW.md. Leave the labeled QA data in demo.

Closure (hardened loaded-state VFG): screen scenarios need loaded-state screenshots, not script
assertions; embed the scenario table in TEST_REPORT.md AND FOREMAN_REVIEW.md; DB evidence for
state/data scenarios. Iron Rule 32 §Destructive Operations: None. (additive). Clean-repo gate: commit
every file by explicit filename incl. screenshots. No git add -A. Stop only on genuine deviation.

End with a Hebrew morning summary: total scenarios tested, passed-clean vs fixed counts, the list of
bugs fixed, screenshot paths so the Architect can SEE the major flows, the QA-data location in demo,
and — if merge-ready — the GitHub compare URL + a one-line PR title. Then stop for the Architect's
visual review.
