# Leads-Migration Reconciliation — Prizma 1354 vs 1296

> **Author:** opticup-reviewer · **Date:** 2026-05-23 · **Mode:** READ-ONLY (SELECT only — zero writes).
> **Brief:** `modules/Module 5 - Customers/architecture-brief/LEADS_MIGRATION_VERIFY_BRIEF.md`
> **Migration SPEC:** `modules/Module 5 - Customers/docs/specs/M5_LEADS_MIGRATION/` (EXECUTION_REPORT + FINDINGS).
> **Tenant scope:** Prizma (`6ad0781b-37f0-47a9-92e3-be9ed1477e1c`).

---

## 0. TL;DR

**Verdict: ✅ delta fully explained. Zero unexplained Prizma leads.**

The 58-row delta between the Brief's projected `1354` and the night-run's reported migrated `1296` resolves cleanly to **58 soft-deleted Prizma leads** that the migration RPC correctly excludes by design (`WHERE is_deleted = false`). This matches `FINDINGS.md` F-T2-1 and `EXECUTION_REPORT.md` deviations table exactly. The reconciliation equation balances to 0.

```
starting (1354) = migrated (1296) + soft-deleted (58) + null/empty-phone (0) + other (0)
                = 1354  ✅
```

No production data fix required. No escalation needed.

---

## 1. Method

Reconciled against the rules the migration **actually used** (read from SPEC + EXECUTION_REPORT + FINDINGS — not invented):

- **D4 / phone-dedup:** if a non-deleted customer already exists with the lead's phone in the same tenant → UPDATE-link, do not INSERT. Else INSERT new lifecycle='lead' customer.
- **Soft-delete exclusion:** RPC iterates `crm_leads WHERE tenant_id = p AND is_deleted = false`. Rows with `is_deleted = true` are not scanned.
- **NULL/empty phone exclusion:** SPEC §0 notes `crm_leads.phone` is NOT NULL on source; in practice rows with NULL/empty phone would still INSERT (no dedup possible), but this case turned out empty for Prizma.
- **Idempotency:** if `customers.source_crm_lead_id = lead.id` already exists → skipped.

All counts below are live SELECTs against the production Supabase project (`tsxrrxzmdxaenlvocyit`) executed via the Supabase MCP `execute_sql` tool on 2026-05-23.

---

## 2. Starting Count — Prizma `crm_leads`

**Query:**

```sql
SELECT
  count(*) AS total_leads,
  count(*) FILTER (WHERE is_deleted = false) AS active_leads,
  count(*) FILTER (WHERE is_deleted = true)  AS soft_deleted_leads,
  count(*) FILTER (WHERE phone IS NULL)      AS null_phone_leads,
  count(*) FILTER (WHERE phone = '')         AS empty_phone_leads,
  count(*) FILTER (WHERE is_deleted = false AND (phone IS NULL OR phone = '')) AS active_with_bad_phone
FROM crm_leads
WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'::uuid;
```

**Result:**

| total | active (`is_deleted=false`) | soft-deleted (`is_deleted=true`) | NULL phone | empty phone | active w/ bad phone |
|---:|---:|---:|---:|---:|---:|
| **1354** | **1296** | **58** | 0 | 0 | 0 |

Brief projection of `1354` matches `count(*)` exactly. The split into 1296 active + 58 soft-deleted is the entire delta source. Zero leads have NULL or empty phones — `phone` is `NOT NULL` per the `crm_leads` schema, confirmed.

---

## 3. Migrated Count — Prizma `customers WHERE source_crm_lead_id IS NOT NULL`

**Query:**

```sql
SELECT
  count(*) AS migrated_total,
  count(*) FILTER (WHERE lifecycle_stage = 'lead')  AS inserted_as_new_lead,
  count(*) FILTER (WHERE lifecycle_stage <> 'lead') AS linked_to_existing,
  count(*) FILTER (WHERE is_deleted = true)         AS migrated_then_deleted
FROM customers
WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'::uuid
  AND source_crm_lead_id IS NOT NULL;
```

**Result:**

| migrated_total | inserted as new (`lifecycle='lead'`) | linked-to-existing (`lifecycle <> 'lead'`) | migrated then soft-deleted |
|---:|---:|---:|---:|
| **1296** | **1296** | 0 | 0 |

All 1,296 migrated rows were **inserted as new customers** with `lifecycle_stage='lead'`. Zero dedup-link occurred — expected because Prizma had **zero prior customers** before this migration (per `EXECUTION_REPORT.md` "0 prior prizma customers (no dedup possible)").

---

## 4. Delta Buckets

The Brief asked for every excluded/collapsed row to be classified into a reason bucket. Result:

| Bucket | Count | Source / Rule | Evidence |
|---|---:|---|---|
| Dedup-merged into existing customer (phone-match) | **0** | SPEC §0 D4 — phone dedup link | §3 query: `linked_to_existing = 0`. Prizma had 0 prior customers, so dedup branch was unreachable. |
| Soft-deleted lead (excluded by design) | **58** | RPC body `WHERE is_deleted = false` (SPEC §9 M5_T2_03) — also FINDINGS F-T2-1 | §2 query: `soft_deleted_leads = 58`. Distribution by status: 38 `waiting` + 19 `new` + 1 `pending_terms` (Probe 4e). 5-row sample inspected — all `is_deleted=true` with non-NULL `updated_at` (Probe 4d'). |
| Empty / malformed phone (excluded by design) | **0** | `crm_leads.phone` is NOT NULL on source; SPEC §0 confirms | §2 query: `null_phone_leads = 0`, `empty_phone_leads = 0`, `active_with_bad_phone = 0`. |
| Other documented exclusion | **0** | — | None declared by SPEC. |

---

## 5. Reconciliation Equation

```
starting = migrated + dedup-linked + soft-deleted + null/empty-phone + other
   1354  =   1296   +       0      +      58      +         0        +   0
   1354  =   1354   ✅
```

**Sums exactly. No unexplained rows.**

---

## 6. Integrity Cross-Checks (must all be zero)

These probes confirm no Prizma lead was **silently lost** — even if the equation happened to balance by coincidence.

| # | Check | Query (summarized) | Expected | Result |
|---|---|---|---:|---:|
| 6a | Every active Prizma lead has a customer row pointing back via `source_crm_lead_id` | `crm_leads WHERE active AND NOT EXISTS (customers WHERE source_crm_lead_id=l.id)` | 0 | **0** ✅ |
| 6b | No soft-deleted lead was accidentally migrated | `crm_leads WHERE soft-deleted AND EXISTS (customers WHERE source_crm_lead_id=l.id)` | 0 | **0** ✅ |
| 6c | No `customers.source_crm_lead_id` points at a non-existent `crm_leads.id` (FK guard) | `customers WHERE source_crm_lead_id IS NOT NULL AND NOT EXISTS (crm_leads)` | 0 | **0** ✅ |
| 6d | No cross-tenant seam violation (a customer.tenant_id ≠ lead.tenant_id) | `customers WHERE source_crm_lead_id IS NOT NULL AND tenant_id <> lead.tenant_id` | 0 | **0** ✅ |

All four integrity invariants hold. The bijection between {Prizma active `crm_leads`} and {Prizma `customers` WHERE `source_crm_lead_id IS NOT NULL`} is complete: 1,296 ↔ 1,296.

---

## 7. Verdict

✅ **Delta fully explained. No action required.**

- Brief projection (`1354`) was the total Prizma `crm_leads` row count.
- Migration RPC scope (`1296`) was the active Prizma `crm_leads` row count (`is_deleted = false`).
- Delta (`58`) = exactly the soft-deleted Prizma leads, excluded by design per SPEC §9 RPC body and acknowledged in `FINDINGS.md` F-T2-1 + `EXECUTION_REPORT.md` deviations table.
- Bidirectional integrity (active-leads ↔ customers seam) is complete (1296 ↔ 1296) with zero orphans, zero stray migrations, zero FK dangling pointers, zero cross-tenant violations.

**No Prizma leads were silently lost.** Chain may proceed.

---

## 8. Out of Scope (this report)

Per Brief §4 — not investigated here:
- Demo tenant reconciliation (28 total → 4 active → 4 migrated). Already covered in `EXECUTION_REPORT.md`.
- M5–M9 visual / UI QA (separate Cowork chat).
- Re-running or amending the migration.
- The 9 `crm_leads` FK tables — `FINDINGS.md` F-T2-3 tracks as TECH_DEBT for a future M4-cutover SPEC.

---

*End of reconciliation. Read-only audit. Single deliverable per Brief §2.*
