# ROLLBACK.md — M1_LENS_PHASE_1B_FOUNDATION

> **Location:** `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_FOUNDATION/ROLLBACK.md`
> **Authored by:** opticup-strategic (Foreman), 2026-05-15
> **Trigger:** ONLY if SPEC fails partway through and Daniel explicitly authorizes revert. Never autonomous.

This SPEC declares §7 Destructive Operations = `None.` — so this ROLLBACK is audit-only unless explicit revert is needed.

---

## Pre-execution snapshot

Executor MUST capture HEAD before any code change:

```bash
git tag rollback-base-M1_LENS_PHASE_1B_FOUNDATION  # HEAD before Commit 1
```

---

## Per-Block DOWN (reverse dependency order — most-recent-first)

### DOWN Block 4 — `bulk_apply_pricing_overlay`

```sql
DROP FUNCTION IF EXISTS public.bulk_apply_pricing_overlay(uuid, jsonb, uuid[]);
```

### DOWN Block 3 — `upsert_pricing_overlay`

```sql
DROP FUNCTION IF EXISTS public.upsert_pricing_overlay(uuid, jsonb);
```

### DOWN Block 2 — `toggle_active_offering`

```sql
DROP FUNCTION IF EXISTS public.toggle_active_offering(uuid, uuid, boolean, uuid);
```

### DOWN Block 1 — Permission seed rows

```sql
DELETE FROM public.permissions
WHERE id IN ('lens.inventory.view','lens.designs.manage','lens.pricing.manage');
```

(Tenant-scoped DELETE — the keys live on demo + prizma only; no other tenants seeded.)

---

## Smoke-time data (kept by default)

The Smoke #2 + #4 + #5 INSERTs (1+ `tenant_active_offerings` row, 4 `pricing_overlay` rows on demo) are **kept** as M1A-DEBT-04 lineage fixtures by default. They do not block rollback because they were created legitimately via the RPCs and represent valid demo data. If a hard reset is required, append:

```sql
-- HARD RESET ONLY — Daniel must explicitly authorize.
DELETE FROM public.pricing_overlay
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND created_at >= '<SPEC start>';

DELETE FROM public.tenant_active_offerings
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND created_at >= '<SPEC start>';
```

---

## Per-screen DOWN (git tag rollback)

If revert is authorized:

```bash
git reset --hard rollback-base-M1_LENS_PHASE_1B_FOUNDATION
git push --force-with-lease origin develop  # Daniel-only; never autonomous.
```

(Or surgical revert of specific file commits via `git revert <hash>` — preferred non-destructive path.)

---

## What this rollback does NOT cover

- `MASTER_ROADMAP.md` / `TECH_DEBT.md` updates by Foreman — those are post-close, outside executor scope.
- Skill self-improvements applied in `M1_SKILL_IMPROVEMENT_HARVEST` — those were applied in a separate prior Pipeline and are not in scope.
- M1A + M1B0 artifacts — out of scope, frozen.

---

*End of ROLLBACK.md. opticup-strategic Foreman, 2026-05-15.*
