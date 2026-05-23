# M5_LEADS_MIGRATION — Execution Report

> **Status:** 🟢 CLOSED. 2026-05-23 NIGHT_RUN Track 2. Demo 5/5 + Prizma 1,296 migrated.

## What was built (3 MCP migrations + 2 RPC calls)

- ALTER TYPE customer_lifecycle_stage ADD VALUE 'lead' (idempotent).
- ALTER customers ADD COLUMN source_crm_lead_id uuid REFERENCES crm_leads(id) + partial UNIQUE index.
- CREATE OR REPLACE migrate_crm_leads_to_customers RPC — service_role-only, idempotent, phone-dedup + LINK-or-INSERT.

## Migration outcomes

- **Demo:** 4 active leads → 4 inserted as new customers (no phone dedup matches with the 10 prior demo customers); after T2-S2 link-test, 4 active leads → 4 lead-origin customers with `source_crm_lead_id` populated. 19 demo customers active total.
- **Prizma:** 1,296 active leads → 1,296 lead-lifecycle customers. 0 prior prizma customers (no dedup possible). crm_leads UNCHANGED at 1,354 total / 1,296 active.
- 9 crm_leads FK tables untouched. M4 demo write test passes.

## §3 criteria — 17/17 pass

Pre-Prizma backup note captured in `backup/PRE_PRIZMA_BACKUP_NOTE.md`. Idempotent re-runs verified.

## Deviations from Brief

| Item | Note |
|---|---|
| Brief said "28 demo + 1,354 Prizma" | These are total counts incl. soft-deleted. RPC migrates `is_deleted=false` only → 4 demo + 1,296 Prizma. Documented in MIGRATION.md. No correction needed — soft-deleted leads correctly excluded. |

## Outputs

7 SPEC folder files + backup note + 3 MCP migrations + 2 RPC calls (demo + Prizma).

## Hand-off

Chain proceeds. M4 cutover (re-pointing the 9 crm_leads FK tables) is a separate far-future SPEC. M5 UI can now build against unified `customers` (including 'lead' lifecycle people).
