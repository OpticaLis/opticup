# ESCALATION — Prizma default_supplier_id backfill authorization

**SPEC:** `M1_LENS_INVENTORY_UNIFIED_FLOW` (Pipeline)
**Phase:** A — DB Schema (tenants.default_supplier_id + audit columns)
**Brief reference:** §11 Destructive Operations §5 + §13 Pre-Flight §1
**Type:** Single-row UPDATE on Prizma production tenant — REQUIRES DANIEL AUTHORIZATION
**Filed:** 2026-05-18 evening (Claude Code, Pipeline Foreman)
**Status:** PENDING DANIEL DECISION

---

## What was probed

Per Brief §13 Pre-Flight item #1, executor probed Prizma's `suppliers` table for a row matching the supplier name "בדולח" using `name ILIKE '%בדולח%'`.

## Result — exact single match

```json
{
  "id":         "0b868b66-e814-4a4b-af57-f300e5a95a5f",
  "name":       "בדולח",
  "active":     true,
  "tenant_id":  "6ad0781b-37f0-47a9-92e3-be9ed1477e1c",
  "created_at": "2026-03-16T20:38:10.441999+00:00"
}
```

- **1 of 1 match.** No ambiguity, no alternates, exact-equal name.
- Active = true, so usable as a working default supplier.
- Total Prizma suppliers = 38 (all active).

## Authorization request

Phase A's autonomous portion will execute everything EXCEPT the Prizma backfill. The Prizma backfill requires Daniel's explicit go-ahead:

```sql
UPDATE tenants
SET default_supplier_id = '0b868b66-e814-4a4b-af57-f300e5a95a5f'
WHERE id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
-- Expected: 1 row updated. Idempotent. Reversible by setting to NULL.
```

## Daniel — three options

1. **Authorize the backfill (recommended)** — reply "אישור" or "בצע ב-פריזמה"; Cowork runs the UPDATE via Supabase MCP; Pipeline continues to Phase B.
2. **Skip the backfill** — Daniel will set Prizma's default later via the Settings UI shipped in Phase B; Pipeline continues to Phase B with Prizma's `default_supplier_id` left NULL.
3. **Change the supplier choice** — name a different active Prizma supplier; Cowork runs the UPDATE with the new id.

## Demo tenant (autonomous — already proceeds)

Demo will be backfilled autonomously to its first active supplier `AZMON (דמו)` (`bb4bdec6-5fe0-4e27-b6b6-ba097cf37112`). No Daniel action needed for demo.

## What is NOT blocked by this escalation

- Schema ALTER TABLE migrations (additive, NULL-able / DEFAULT-safe) — run autonomously.
- Existing-row backfill of `purchase_receipt.is_documented = true` (no-op for current behavior) — run autonomously.
- Permission key seeding (`inventory.add.undocumented` + `inventory.manager_review.approve` for both tenants) — run autonomously.
- Phase B (Settings UI) SPEC authoring + executor dispatch — can proceed in parallel; the UI itself doesn't require the backfill, only Phase B Tier C VFV's "Re-open inventory screen → manual-add panel auto-fills with the default" criterion does (so Phase B can close with Prizma section deferred until backfill applied).

## What IS blocked

- Phase B Tier C VFV step 4 (auto-fill verification on Prizma) — deferred until backfill applied.
- Phase C (3 add-stock flows) — relies on the default being set for the auto-fill UX; demo proceeds autonomously, Prizma awaits Daniel's decision.

---

*Escalation filed per Iron Rule 32 + Brief §11. No Prizma DB writes will be performed by Claude Code in this Pipeline until Daniel responds. Demo writes proceed.*
