You are the opticup-executor. The Foreman has revised the P23 SPEC.

SPEC location: modules/Module 4 - CRM/go-live/specs/P23_ATTENDEE_CANCELLATION_FLOW/SPEC.md

This is v2 — supersedes v1. v2 includes a Step-0 refactor that brings crm-event-day-manage.js back under the line-count cap, recovers stash@{0} (lifecycle guards) into commit 0.5, and only then adds the cancel UI. Read the full SPEC before executing.

Start protocol:
1. Run the Cowork-VM sync gate (Phase 1 + 2 per CLAUDE.md §1) and First Action steps 1–8.
2. Read the SPEC.md in full before touching anything.
3. Run pre-flight: cross-reference grep, wc -l on every file in §2.3, DB query to confirm §2.4 distinct values still hold, git stash list to confirm stash@{0} still exists.
4. Execute commits in the order in §8 — start with commit 0 (refactor), then 0.5 (apply stash + drop), then 1–6.
5. Run all 11 QA scenarios in §10 on demo tenant.
6. Write EXECUTION_REPORT.md and FINDINGS.md into the SPEC folder.
7. End with a clean working tree on develop.

Tenant for QA: demo only (slug=demo, UUID 8d8cfa7e-ef58-49af-9702-a862d459cccb, PIN 12345). NEVER on Prizma.

This is NOT a cutover blocker. Stop on any deviation per §5. No --no-verify under any circumstances.

When done, push develop and notify Daniel that the SPEC is ready for Foreman review.
