# M4_STATUS_MODEL_FINETUNES — SPEC

**Module:** 4 — CRM
**Author:** opticup-strategic (Foreman)
**Date:** 2026-05-14
**Brief:** `M4_OVERNIGHT_HARVEST_ROUND_2_BRIEF.md` §3.3
**Run context:** Overnight Round 2, SPEC #3 of 4. SPEC #2 escalated; this SPEC is independent of #2 and proceeds.

---

## 0. Pre-Authoring Reality Check

Brief §3.3 called for two finetunes: F2 (trigger naming normalization) and F-CSF-3 (composite-NULL idiom). Pre-flight against live DB on 2026-05-14:

**F2 scope correction (the Brief's premise is partially off):**

- Project-wide trigger inventory:
  - **NEW pattern** (`<table>_set_updated_at_trg`): 3 triggers — all in Module 4 (`crm_automation_rules`, `crm_event_attendees`, `crm_lead_notes`).
  - **LEGACY pattern** (`trg_<table>_updated`): 4 triggers — all in Module 1 (`brands`, `inventory`, `purchase_orders`, `suppliers`).
- Within Module 4 itself, every `updated_at` maintenance trigger already uses the new convention. The "inconsistency" the Brief calls out is cross-module — between M1 (legacy) and M4 (new).
- Renaming the 4 M1 triggers would be **out-of-scope** for this overnight run (Brief is M4-only) AND would risk a destructive operation (DROP + CREATE per Iron Rule 32) on Module-1 production tables without M1-scoped pre-flight or smoke.

**Decision:** Drop F2 trigger-rename work from this SPEC. Reflect the cross-module convention asymmetry as documentation only — that lands in SPEC #4 (M4_STATUS_MODEL_DOC_UPDATE) as a §6 note. This SPEC focuses on F-CSF-3 only.

**F-CSF-3 confirmed (the Brief's premise is correct):**

The live body of `sync_lead_status_from_attendee(p_lead_id, p_tenant_id)` contains the literal line:

```sql
IF v_lead IS NULL THEN
  RETURN jsonb_build_object('ok', false, 'error', 'lead_not_found');
END IF;
```

`v_lead` is `crm_leads%ROWTYPE`. The PL/pgSQL composite `IS NULL` only returns true when every column is NULL — fragile under future refactors (e.g., OUTER JOIN, or any future column addition that defaults non-NULL). The canonical "SELECT INTO produced no row" idiom is `IF NOT FOUND THEN`. The fix is a 1-line replacement.

### Baselines
- `BASE_SYNC_FN_LINES` = body of the function above; 1 specific line replaced.
- `BASE_TRIGGERS_M4_NEW_PATTERN` = 3 (consistent within M4).
- `BASE_TRIGGERS_M1_LEGACY_PATTERN` = 4 (NOT being touched).

### Rule 21
The fix is in-place edit of an existing function. No new DB names. No collisions to check.

---

## 1. Goal

Replace the composite-NULL check in `sync_lead_status_from_attendee` with the canonical `IF NOT FOUND` idiom, eliminating the latent defect surfaced by F-CSF-3 in `M4_CANCEL_SYNC_FIX/FINDINGS.md`. No behavior change today; correctness under future refactor.

---

## 2. Scope

**In scope:**
- 1 SQL migration containing `CREATE OR REPLACE FUNCTION sync_lead_status_from_attendee(...)` with the 1-line fix and an updated body comment naming this SPEC.
- DDL applied via `apply_migration`. File saved locally in `supabase/migrations/`.
- Smoke: call the RPC on demo with a known lead (verify ok=true), call it with a non-existent UUID (verify error='lead_not_found').

**Explicitly out of scope:**
- F2 trigger rename (see §0).
- Any other body changes to `sync_lead_status_from_attendee` (mapping CASE, ORDER BY, terminal-status logic — leave untouched).
- STATUS_MODEL.md edits — those land in SPEC #4.

---

## 3. Destructive Operations

`CREATE OR REPLACE FUNCTION` is **NOT** destructive per Iron Rule 32 — it replaces the function body in place; no DROP. The function's signature stays identical, so no dependent objects need recreation.

**Declared destructive operations: None.**

---

## 4. Success Criteria

```sql
-- C1: function still exists with the same signature
SELECT count(*) FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='sync_lead_status_from_attendee';
-- expected: 1

-- C2: body contains 'NOT FOUND' (the new idiom)
SELECT (pg_get_functiondef(oid) LIKE '%NOT FOUND%') AS has_not_found
FROM pg_proc WHERE proname='sync_lead_status_from_attendee';
-- expected: t

-- C3: body NO LONGER contains 'IF v_lead IS NULL'
SELECT (pg_get_functiondef(oid) LIKE '%IF v_lead IS NULL%') AS still_has_old
FROM pg_proc WHERE proname='sync_lead_status_from_attendee';
-- expected: f
```

Smoke (demo only):
- **S1** Call `sync_lead_status_from_attendee(<existing demo lead uuid>, '8d8cfa7e-...')`. Verify `ok=true`. (Idempotent — the lead's status is what it already is OR what the current sync logic derives.)
- **S2** Call with `p_lead_id='00000000-0000-0000-0000-000000000000'`. Verify `error='lead_not_found'`. (This is the path the fix actually changes.)

File / line metrics:
- 1 new migration file ≤ 80 lines.
- No edits to JS/TS files.
- 1–2 commits.
- `verify:integrity` exit 0 or 2.

---

## 5. Implementation Plan

### Step 1 — Apply migration

Create `supabase/migrations/<ts>_m4_sync_rpc_not_found_idiom.sql`:

```sql
BEGIN;

CREATE OR REPLACE FUNCTION public.sync_lead_status_from_attendee(p_lead_id uuid, p_tenant_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
AS $function$
DECLARE
  v_lead          crm_leads%ROWTYPE;
  v_active_status text;
  v_target_status text;
BEGIN
  SELECT * INTO v_lead FROM crm_leads
   WHERE id = p_lead_id AND tenant_id = p_tenant_id AND is_deleted = false;
  -- M4_STATUS_MODEL_FINETUNES (2026-05-14, F-CSF-3): canonical SELECT-INTO miss
  -- idiom. Composite `IS NULL` only returns true when every column is NULL —
  -- fragile under future refactors; `NOT FOUND` is the correct check.
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'lead_not_found');
  END IF;

  IF v_lead.status IN ('not_interested','unsubscribed') THEN
    RETURN jsonb_build_object('ok', true, 'updated', false, 'reason', 'terminal_status');
  END IF;

  SELECT a.status INTO v_active_status
    FROM crm_event_attendees a
    JOIN crm_events e ON e.id = a.event_id AND e.tenant_id = a.tenant_id
   WHERE a.lead_id = p_lead_id AND a.tenant_id = p_tenant_id
     AND a.is_deleted = false
     AND a.status NOT IN ('cancelled')
     AND e.status NOT IN ('completed','cancelled')
     AND e.is_deleted = false
   ORDER BY (CASE WHEN a.status = 'waiting_list' THEN 0 ELSE 1 END),
            COALESCE(a.confirmed_at, a.checked_in_at, a.purchased_at, a.registered_at, a.created_at) DESC
   LIMIT 1;

  v_target_status := CASE v_active_status
    WHEN 'confirmed' THEN 'confirmed'
    WHEN 'registered' THEN 'confirmed'
    WHEN 'manual_registration' THEN 'confirmed'
    WHEN 'quick_registration' THEN 'confirmed'
    WHEN 'attended' THEN 'confirmed_verified'
    WHEN 'purchased' THEN 'confirmed_verified'
    WHEN 'no_show' THEN 'confirmed'
    WHEN 'invited' THEN 'invited'
    WHEN 'waiting_list' THEN 'waitlist'
    WHEN 'event_closed' THEN 'waiting'
    WHEN 'duplicate' THEN 'waiting'
    ELSE 'waiting'
  END;

  IF v_lead.status = v_target_status THEN
    RETURN jsonb_build_object('ok', true, 'updated', false, 'old_status', v_lead.status, 'new_status', v_target_status);
  END IF;

  UPDATE crm_leads SET status = v_target_status, updated_at = now()
   WHERE id = p_lead_id AND tenant_id = p_tenant_id;

  RETURN jsonb_build_object('ok', true, 'updated', true, 'old_status', v_lead.status, 'new_status', v_target_status);
END
$function$;

COMMIT;
```

Apply via `mcp__claude_ai_Supabase__apply_migration`.

### Step 2 — Verify C1–C3 + run S1/S2.

### Step 3 — Commit + push.

Commit message: `fix(m4,crm,rpc): tighten sync_lead_status_from_attendee with NOT FOUND idiom (F-CSF-3)`.

---

## 6. Autonomy Envelope

Executor can:
- Apply migration.
- Run RPCs in smoke.
- Commit + push.

Executor stops if:
- The CREATE OR REPLACE alters the function signature (it should not — pre-flight pinned the signature).
- Any of C1–C3 / S1–S2 doesn't match expected.

---

## 7. Out of Scope

- F2 trigger rename (see §0).
- Any other body change to the sync RPC.
- Doc edits (SPEC #4 owns).

---

## 8. Rollback

If needed:
```sql
-- Restore the original function (the body captured in §0 pre-flight).
-- The IF v_lead IS NULL line is the only difference.
```

Or `git reset --hard pre-overnight-m4-r2-2026-05-14` for full overnight rollback.

---

## 9. Lessons Already Incorporated

- **Pre-flight discipline:** §0 reframed F2 scope before drafting; only F-CSF-3 carried forward.
- **Iron Rule 32 destructive-ops gate:** declared None in §3.
- **No mid-SPEC scope creep:** F2 cross-module work flagged as out-of-scope explicitly.

---

*End of SPEC.*
