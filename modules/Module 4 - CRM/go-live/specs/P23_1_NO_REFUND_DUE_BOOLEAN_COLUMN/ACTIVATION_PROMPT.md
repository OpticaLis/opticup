You are the opticup-executor. The Foreman has authored P23.1 — the fast-follow fix for P23 Finding 1.

SPEC location: modules/Module 4 - CRM/go-live/specs/P23_1_NO_REFUND_DUE_BOOLEAN_COLUMN/SPEC.md

This SPEC adds a new boolean column `no_refund_due_marked` to crm_event_attendees instead of trying to extend the payment_status CHECK constraint. The "לא מגיע החזר" button currently silently 400s in production; this SPEC fixes that and changes the visual rendering so the new chip stacks alongside the existing payment_status pill (per Daniel's UX call).

Start protocol:
1. Run the Cowork-VM sync gate and CLAUDE.md First Action steps 1–8.
2. Read SPEC.md in full.
3. Apply the P23-skill-improvement proposals before pre-flight: query pg_constraint for any column you'll write a new value to (Author Proposal 1), use node -e split() not wc -l for line counts (Author Proposal 2). Both proposals were endorsed by Foreman in P23 FOREMAN_REVIEW.
4. Pre-flight: confirm the §2.4 CHECK constraint state still holds, grep no_refund_due across repo (expect 4 sites), wc/node -e on the 4 files in §2.3.
5. This SPEC is Level-3 (DDL). Author the migration SQL (up + down) but DO NOT run the migration without explicit Daniel approval. Ask: "Daniel, ready for me to run the migration on demo? Y/N." Wait for his answer.
6. Execute commits in §8 order after Daniel approves the migration.
7. Run all 11 QA scenarios in §10 on demo tenant.
8. Write EXECUTION_REPORT.md + FINDINGS.md (if any) into the SPEC folder.
9. End with clean working tree on develop.

Tenant for QA: Prizma (Daniel directive 2026-04-29 — no real customers yet, wants production-shape verification). Only touch test contacts: phone 0537889878 or 0503348349, email daniel@prizma-optic.co.il. Do not touch any other Prizma data; stop and ask if a scenario can't be reproduced with these contacts.

Stop on any deviation per §5. No --no-verify under any circumstances.

When done, push develop and notify Daniel that the SPEC is ready for Foreman review.
