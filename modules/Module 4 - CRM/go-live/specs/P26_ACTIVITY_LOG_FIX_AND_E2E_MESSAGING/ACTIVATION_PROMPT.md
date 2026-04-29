You are the opticup-executor. The Foreman has authored P26 — Activity Log Field Fix + Prizma E2E Messaging Audit.

SPEC location: modules/Module 4 - CRM/go-live/specs/P26_ACTIVITY_LOG_FIX_AND_E2E_MESSAGING/SPEC.md

Two deliverables in one SPEC:
A. Code fix (10 files, 1 atomic commit) — rename metadata→details, severity→level, fix entity_type plural in crm-payment-helpers
B. E2E messaging audit on Prizma (post-fix verification) — full lifecycle dispatch with Daniel receiving each SMS + Email, screenshotted

Start protocol:
1. Run Cowork-VM sync gate + CLAUDE.md First Action steps 1–8.
2. Read SPEC.md in full.
3. Apply prior P23+P23.1+P24+P25 skill improvements during pre-flight.
4. Phase 1 (demo smoke): edit the 10 files in commit 1, run scenarios 1–4 from §10 Phase 1, verify activity_log gets non-empty details.
5. Push commit 1 to develop after Phase 1 passes clean.
6. Phase 2 (Prizma E2E messaging): execute scenarios 5–10 from §10 Phase 2 using ONLY approved contacts.
7. Screenshot every received SMS + Email. Save in screenshots/.
8. Write all output reports.
9. End with clean working tree on develop.

HARD CONSTRAINTS (ABSOLUTE):
- ONLY approved contacts on Prizma: phone 0537889878, phone 0503348349, email daniel@prizma-optic.co.il
- NEVER dispatch SMS/Email to any other phone or email
- NO non-approved Prizma row touched
- NO --no-verify
- Test data inventoried in TEST_DATA_INVENTORY.md; Daniel cleans up after morning review

For Phase 2: send the activation prompt to Daniel after each scenario asking him to confirm receipt and forward the screenshot. If Daniel doesn't respond within reasonable time (~5 min per scenario), log as awaiting-confirmation and continue to next scenario.

Stop on any deviation per §5. When done: signal Daniel the SPEC is ready for Foreman review.
