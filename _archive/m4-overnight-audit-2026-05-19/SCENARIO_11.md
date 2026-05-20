# SCENARIO 11 — Soft-delete lead + restore

**Status:** 🟡 PARTIAL — soft-delete + activity_log work cleanly; **restore RPC/UI not implemented**
**Date:** 2026-05-20
**Tenant:** demo
**Lead under test:** `fedd793f-f4dd-44fb-935d-9ca07120b35e` (Audit S5 Lead2)

## Soft-delete (Brief §3.3 ¶11 "Verify activity_log row + restore RPC + UI")

```js
await window.CrmLeadActions.softDeleteLead('fedd793f-…');
// → { id: 'fedd793f-…' }
```

DB after:
- `crm_leads.is_deleted = true` ✓
- `crm_leads.status = 'confirmed'` (unchanged — status is independent of deletion)

Activity log:
```
crm.lead.soft_delete | 2026-05-20 04:09:05.211279+00 | {"lead_name": null}
crm.lead.create      | 2026-05-20 04:02:46.349085+00 | {phone, source, full_name}
```

Exactly one `crm.lead.soft_delete` row ✓.

🟡 sub-finding on activity_log details: `lead_name=null` while the lead's `full_name` is well-populated. The softDeleteLead helper may not be reading the lead's name into the details JSON. Cosmetic only (the entity_id resolves the lead) — not a regression.

## Restore (Brief said "restore RPC + UI")

`window.CrmLeadActions.restoreLead` → **NOT FOUND**

Grep across the entire repo (`scripts/sync-watcher.js`, `modules/`, `shared/`, `supabase/functions/`) for `restoreLead`, `undeleteLead`, `restore_lead`:

> 0 matches in any `crm-*.js` file.

Hits in `crm-funnel-dashboard.js` are the new dashboard's read queries, not restore actions. Hits in watcher / scripts / catalog are unrelated.

**There is no UI path or JS helper to restore a soft-deleted lead on demo.** The only way to restore is direct SQL:

```sql
UPDATE crm_leads SET is_deleted = FALSE WHERE id = 'fedd793f-…';
-- → confirmed: is_deleted = false, status = confirmed (unchanged)
```

This UPDATE succeeds at the data layer (no constraint or trigger blocks it), but there is no operator-facing surface.

## Impact

Brief §3.3 ¶11 implied a restore RPC + UI should exist. Either:

1. **Brief drift:** the project never built restore on demo (it's not in any closed SPEC I can find). The Brief should say "soft-delete + activity_log" without the "+ restore" claim.
2. **Feature gap:** the project intended to ship restore but didn't. In which case this audit is the first time it's flagged.

Either way, **DB layer correctly supports restoration** — the lead row stays intact, FKs hold, status is preserved. Adding restore is a 1-day SPEC: write `CrmLeadActions.restoreLead(leadId)` + add to a "Trash" tab in the leads UI + activity_log write `crm.lead.restore`.

## Verdict 🟡 PARTIAL

- Soft-delete works: row flagged, activity_log written ✓
- Restore at data layer works (direct UPDATE) ✓
- **Restore via UI / JS helper / RPC: missing** — recommendation: write a follow-up SPEC.
- No regression vs prior behavior (this gap likely existed since lead-actions was first written; the audit just made it explicit).
