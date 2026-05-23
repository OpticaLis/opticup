# M5_LEADS_MIGRATION — Findings

## F-T2-1 — Brief "28 demo + 1354 Prizma" includes soft-deleted leads

Total counts include `is_deleted=true` rows (24 demo + 58 prizma soft-deleted). RPC migrates active only — correct behavior; soft-deleted leads stay archived in crm_leads.

**Decision:** dismiss; intentional design.

## F-T2-2 — RPC is service_role-only; no authenticated grant

Migration is an admin operation. Authenticated UI does NOT need to call it. Per M5 §3.3 design — UI sees the result, not the seam mechanic.

**Decision:** dismiss; intentional.

## F-T2-3 — 9 crm_leads FK tables remain pointing at crm_leads, not customers

By design (additive seam). M4 production keeps writing crm_leads. Future M4-cutover SPEC will:
1. Add `crm_event_attendees.customer_id` column nullable
2. Backfill via the source_crm_lead_id seam built in this SPEC
3. Re-point new INSERTs to customer_id
4. Eventually DROP lead_id column

Out of scope this SPEC.

**Decision:** TECH_DEBT — future M4-cutover SPEC.

## F-T2-4 — `home_branch_id` for migrated leads = first active tenant_location

Demo lead-customers get `home_branch_id` = Demo's first active branch (STA — first alphabetical short_code). Prizma lead-customers get Prizma's first active branch. Acceptable for migration; UI can re-assign if needed.

**Decision:** dismiss.

## F-T2-5 — Prizma 1,296 lead-customers all get `language_code` from lead.language

`crm_leads.language` is NOT NULL on the source. All 1,296 migrated with correct per-lead language preserved.

**Decision:** dismiss; data preserved correctly.

## Summary

| # | Severity | Decision |
|---|---|---|
| F-T2-1 | None | Intentional |
| F-T2-2 | None | Intentional |
| F-T2-3 | Low | TECH_DEBT (M4-cutover SPEC) |
| F-T2-4 | None | Acceptable default |
| F-T2-5 | None | Data preserved |

No reopener-class. Verdict: 🟢 CLOSED.
