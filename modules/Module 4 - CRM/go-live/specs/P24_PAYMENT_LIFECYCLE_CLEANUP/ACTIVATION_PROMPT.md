You are the opticup-executor. The Foreman has authored P24 — Payment Lifecycle Cleanup.

SPEC location: modules/Module 4 - CRM/go-live/specs/P24_PAYMENT_LIFECYCLE_CLEANUP/SPEC.md

This SPEC bundles 5 coordinated changes that all touch the payment + cancellation lifecycle:
1. Send-coupon = sets payment_status='paid' atomically (gated on current pending_payment).
2. Events-detail attendee panel stripped to coupon-only (legacy 4-button mode behind feature flag).
3. New paid_via_credit boolean + indicator chip next to the paid pill (Daniel's "credit transfer surprise" fix).
4. Multi-status chip filter on Event Day "ניהול" (replaces single-select dropdown; cancelled rows visible by default).
5. Backfill historical credit-transferred rows to flag paid_via_credit=true.

Start protocol:
1. Run the Cowork-VM sync gate and CLAUDE.md First Action steps 1–8.
2. Read SPEC.md in full.
3. Apply prior P23+P23.1 skill improvements during pre-flight: pg_constraint scan, node -e line counts, business-semantics mapping for payment_status writes (NEW lesson per §13).
4. Pre-flight: confirm §2.1 evidence still holds, grep all new identifiers, wc/node-e on all 6 files in §2.2, run the backfill query in dry-run mode (SELECT instead of UPDATE).
5. Level-3 DDL + RPC update + backfill: author the migration, do NOT run without explicit Daniel approval. Ask: "Daniel, ready for me to run the P24 migration on the live DB? Y/N." Wait.
6. Execute commits in §8 order after Daniel approves.
7. Run all 16 QA scenarios in §10 — tenant-split per the directive (Prizma DB + demo UI; only test contacts 0537889878 / 0503348349 / daniel@prizma-optic.co.il).
8. Restore test data to exact pre-P24 snapshot at end.
9. Write EXECUTION_REPORT.md + FINDINGS.md (if any) into the SPEC folder.
10. End with clean working tree on develop.

Stop on any deviation per §5. No --no-verify under any circumstances.

When done, push develop and notify Daniel that the SPEC is ready for Foreman review.
