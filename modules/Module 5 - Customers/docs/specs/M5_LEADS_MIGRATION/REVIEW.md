# M5_LEADS_MIGRATION — Reviewer Pass

> **Role:** opticup-reviewer. 2026-05-23.

## Iron Rule conformance

| Rule | Status |
|---|---|
| 1 atomic | RPC is single-tx — all leads migrate or none ✅ |
| 11 sequential | customer_number per migrated lead via allocate_tenant_number — contiguous ✅ |
| 14 tenant_id | new customers tenant_id = lead.tenant_id (NOT NULL preserved) ✅ |
| 15 RLS canonical | customers RLS unchanged ✅ |
| 18 UNIQUE tenant-scoped | partial UNIQUE on (source_crm_lead_id, tenant_id) ✅ |
| 19 enum vs config | 'lead' is bounded enum value ✅ |
| 21 no orphans | reuses allocate_tenant_number ✅ |
| 22 defense-in-depth | RPC Block A + service_role-only + tenant_id param ✅ |
| 23 no secrets | none ✅ |
| 31 Integrity Gate | clean at commit time ✅ |
| 32 Destructive Ops | declared INSERT + UPDATE-link + ADD COLUMN + ADD VALUE; NO DROP ✅ |

## Data integrity audit

- 4/4 demo leads migrated correctly (post T2-S2 re-link).
- 1,296/1,296 Prizma leads migrated (1:1).
- crm_leads totals UNCHANGED (28 demo / 1,354 prizma — verified post-write).
- 9 crm_leads FK tables intact (zero orphans).
- M4 demo write/delete test passes — no schema regression.

## Security audit

- RPC service_role-only (no authenticated EXECUTE grant). Confirmed via aclexplode pattern.
- Block A header verbatim.
- ALTER TYPE ADD VALUE is irreversible but additive — no data risk.

## Smoke

5/5 demo PASS + Prizma execution confirmed (1,296 migrated). Backup note pre-write captured.

## Advisors

0 new HIGH/ERROR.

## Verdict

**🟢 PASS.** Recommend 🟢 CLOSED.
