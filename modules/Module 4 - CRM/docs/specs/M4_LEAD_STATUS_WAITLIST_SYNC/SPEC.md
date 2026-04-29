# SPEC — M4_LEAD_STATUS_WAITLIST_SYNC

> **Module:** Module 4 — CRM
> **Location:** `modules/Module 4 - CRM/docs/specs/M4_LEAD_STATUS_WAITLIST_SYNC/`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-28
> **Status:** READY FOR EXECUTION
> **Priority:** Pre-Rung-3 prerequisite (Rung 3's RPC step #8 depends on `sync_lead_status_from_attendee`).
> **Origin:** Daniel flagged 2026-04-28 — when attendee status flips to `המתנה`, the lead's leads-board status MUST also reflect `רשימת המתנה`. Foreman verified no sync exists today.

---

## 1. Goal

Add a `waitlist` lead status (Hebrew "רשימת המתנה") and a server-side sync function `sync_lead_status_from_attendee(p_lead_id, p_tenant_id)` that maps the lead's most-recent active attendee row to a corresponding `crm_leads.status`. Wire the sync from three call-sites: the registration RPC (over-capacity branch), the existing `attendee_upsert` post-action (Rung 2), and the manual-move RPC (Rung 3).

After this Rung the leads board reflects each lead's most current event-context state automatically.

---

## 2. Background & Motivation

Today (verified 2026-04-28):
- `crm_leads.status` Tier 2 set: `waiting / invited / confirmed / confirmed_verified / not_interested / unsubscribed`. **No `waitlist`.**
- `crm_event_attendees.status` per-event values: `המתנה / הוזמן / מאושר / מבוטל-עבר`.
- The only existing sync is `promoteWaitingLeadsToInvited` (waiting → invited after T5 dispatch). No mapping for `המתנה → waitlist`.

Daniel's directive is the leads board must show "רשימת המתנה" for any lead currently on a waitlist for an open event. This requires both (a) the enum value to exist, and (b) a deterministic sync rule.

**Mapping (locked):**

| Most-recent attendee.status (active event) | Lead.status |
|---|---|
| `מאושר` (confirmed) | `confirmed` |
| `מאושר ומאומת` (confirmed_verified, if it exists) | `confirmed_verified` |
| `הוזמן` (invited) | `invited` |
| `המתנה` (waitlist) | `waitlist` (NEW) |
| `מבוטל-עבר` (cancelled-moved) | derived from the new attendee row created by the move (handled by sync re-running post-move) |
| no active attendee row | `waiting` (default Tier-2) |

"Active event" = `crm_events.status NOT IN ('completed','cancelled')` AND `is_deleted=false`.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 1 | New row in `crm_statuses` for entity_type=`lead`, slug=`waitlist`, name_he=`רשימת המתנה`, color=`#FF9800` (orange), is_default=false | 1 row inserted on demo (Prizma scope: separate cutover SPEC; this SPEC is demo-only) | `SELECT slug, name_he, color FROM crm_statuses WHERE entity_type='lead' AND slug='waitlist' AND tenant_id='demo-uuid'` |
| 2 | `'waitlist'` added to `TIER2_STATUSES` array in `crm-helpers.js` | 7-element array (was 6) | `grep -A8 "var TIER2_STATUSES" modules/crm/crm-helpers.js` |
| 3 | New RPC `sync_lead_status_from_attendee(p_lead_id uuid, p_tenant_id uuid) RETURNS jsonb` exists, atomic, RLS-aware (uses tenant_id parameter) | RPC defined and callable | `SELECT pg_get_functiondef('sync_lead_status_from_attendee'::regproc::oid)` |
| 4 | RPC implements the mapping in §2 (table) — picks most-recent active attendee row, applies mapping, updates `crm_leads.status` ONLY if mapping result differs from current value | Idempotent: re-running with no state change → no UPDATE | Test: call RPC twice in row, second call returns `{updated:false}` |
| 5 | RPC returns `{ok, updated, old_status, new_status}` | jsonb shape | Test: from→to=`waiting→waitlist` returns those values |
| 6 | RPC NEVER touches `crm_leads.status` for leads with current `status IN ('not_interested','unsubscribed')` (lifecycle terminal — sync should not override) | Test: lead in `unsubscribed` → call RPC → status unchanged | SQL test |
| 7 | `crm-automation-post-actions.js` `attendeeUpsert` post-action (from Rung 2) also calls `sync_lead_status_from_attendee` for each affected lead after the upsert | Post-action calls the RPC | `grep "sync_lead_status_from_attendee" modules/crm/crm-automation-post-actions.js` |
| 8 | `register_lead_to_event` RPC (existing) calls `sync_lead_status_from_attendee` after every status write to `crm_event_attendees` | RPC body updated | `pg_get_functiondef` of the RPC shows the new call |
| 9 | Backfill: existing demo data — for every lead with at least one `crm_event_attendees` row in an active event, run sync once → `crm_leads.status` reflects mapping. Idempotent. | Pre/post counts match expected mapping | `SELECT lead.status, count(*) FROM crm_leads JOIN ... GROUP BY 1` before vs after backfill |
| 10 | `register_lead_to_event` RPC pg_get_functiondef snapshot saved before edit (rollback safety, per POST_WAITING_LIST_FIXES F1) | snapshot saved as artifact | `modules/Module 4 - CRM/docs/specs/M4_LEAD_STATUS_WAITLIST_SYNC/register_lead_to_event-pre.sql` |
| 11 | All CRM JS files ≤350 lines after change | Rule 12 | `wc -l modules/crm/*.js` |
| 12 | Iron Rule 31 integrity gate passes | exit 0 | `npm run verify:integrity` |
| 13 | Phones: only approved set used in any test | No deviation | grep test commands |
| 14 | Commits | 4–5 commits | `git log --oneline` from start hash |

---

## 4. Autonomy Envelope

### CAN do
- Read/write SQL on demo (Level 2 pre-authorized): INSERT into `crm_statuses` for demo, CREATE OR REPLACE the new RPC, ALTER `register_lead_to_event` RPC.
- Modify `modules/crm/crm-helpers.js` and `modules/crm/crm-automation-post-actions.js`.
- Run backfill on demo only.
- Update `SESSION_CONTEXT.md`, `MODULE_MAP.md`, `db-schema.sql`.

### REQUIRES stopping
- Any write touching production tenant `83bd9d0a-...` — demo-only.
- Modification of `register_lead_to_event` semantics beyond adding the sync call (e.g., changing recipient logic, changing the new-attendee-row write).
- Any change to `TIER1_STATUSES`.
- Any DDL beyond the new RPC.

---

## 5. Stop-on-Deviation Triggers

1. Existing leads on demo have `status='waitlist'` already (collision — slug repurposed elsewhere).
2. RPC backfill changes >50 leads on demo (signals a misconfigured mapping; demo has ~3 leads today).
3. `register_lead_to_event` RPC has paths the SPEC didn't account for (executor must read the full function body before editing).

---

## 6. Rollback Plan

- Restore `register_lead_to_event` from `register_lead_to_event-pre.sql` snapshot (criterion #10).
- DROP the new sync RPC.
- DELETE the `waitlist` row from `crm_statuses` for demo.
- Revert `crm-helpers.js` (remove `'waitlist'` from array).
- Revert `crm-automation-post-actions.js` (remove sync call).
- `git revert` the docs commits.

---

## 7. Out of Scope

- Production tenant `crm_statuses` seed — separate cutover SPEC.
- Any UI change to status dropdown filters (`waitlist` will appear automatically since UI reads from `crm_statuses`).
- Changes to `TIER1_STATUSES`.
- Rebuilding the leads board to show event-context — the sync makes the existing board correct; no UI rewrite needed.
- Color/style of the waitlist badge beyond `#FF9800` orange.

---

## 8. Expected Final State

### Modified files

| File | Current | Expected | Change |
|------|---------|----------|--------|
| `modules/crm/crm-helpers.js` | (unchanged from current) | +1 line | Add `'waitlist'` to TIER2_STATUSES with comment `// רשימת המתנה לאירוע ספציפי` |
| `modules/crm/crm-automation-post-actions.js` | post-Rung-2 | +5 lines | After `attendeeUpsert`, call sync RPC for each affected lead |

### New files

- `modules/Module 4 - CRM/docs/specs/M4_LEAD_STATUS_WAITLIST_SYNC/register_lead_to_event-pre.sql` — pg_get_functiondef snapshot

### DB state (demo only)

- `crm_statuses`: +1 row (entity_type=lead, slug=waitlist).
- New RPC `sync_lead_status_from_attendee` created.
- `register_lead_to_event` RPC modified (CREATE OR REPLACE) to call sync after each attendee write.
- Backfill: existing demo leads' statuses re-derived (≤3 leads affected on demo).

### Docs

- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — M4_LEAD_STATUS_WAITLIST_SYNC CLOSED.
- `modules/Module 4 - CRM/docs/db-schema.sql` — add the new RPC signature.

---

## 9. Commit Plan

| # | Message | Files |
|---|---------|-------|
| 1 | `feat(crm): add waitlist lead status + sync RPC for attendee→lead status reflection` | DB SQL artifact + helpers.js change |
| 2 | `feat(crm): wire sync into register_lead_to_event + attendeeUpsert post-action` | RPC + post-actions.js |
| 3 | `chore(crm): backfill demo lead statuses from current attendee rows` | SQL artifact (idempotent) |
| 4 | `docs(crm): close M4_LEAD_STATUS_WAITLIST_SYNC` | SESSION_CONTEXT + db-schema |
| 5 | `chore(spec): close M4_LEAD_STATUS_WAITLIST_SYNC with retrospective` | EXECUTION_REPORT + FINDINGS |

Budget: 5 commits ± 1.

---

## 10. Dependencies / Preconditions

| Dependency | Status |
|------------|--------|
| Rung 2 CLOSED (provides `attendeeUpsert` post-action to wire into) | ⚠️ HARD BLOCKER (Rung 2 must close first) |
| `crm_statuses` table exists with proper shape | ✅ VERIFIED (P2a Commit 0) |
| `register_lead_to_event` RPC exists and is well-understood | ✅ VERIFIED (Phase A + M4_ATTENDEE_PAYMENT_SCHEMA + CRM_RESUBSCRIBE_FIX) |

---

## 11. Lessons Already Incorporated

- POST_WAITING_LIST_FIXES F1 — pg_get_functiondef snapshot before RPC edit (criterion #10).
- WORKING_TREE_RECOVERY FR Proposal 1 — STATE_SNAPSHOT before destructive backfill (executor captures lead status counts pre/post).
- **Cross-Reference Check:** `waitlist` slug in `crm_statuses` — 0 hits → unique. `sync_lead_status_from_attendee` function name — 0 hits → unique.

---

## 12. Technical Design

### 12.1 RPC body

```sql
CREATE OR REPLACE FUNCTION sync_lead_status_from_attendee(
  p_lead_id   uuid,
  p_tenant_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_lead          crm_leads%ROWTYPE;
  v_active_status text;
  v_target_status text;
BEGIN
  SELECT * INTO v_lead FROM crm_leads
   WHERE id = p_lead_id AND tenant_id = p_tenant_id AND is_deleted = false;
  IF v_lead IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'lead_not_found');
  END IF;

  -- Terminal lifecycle statuses are never overridden by sync
  IF v_lead.status IN ('not_interested','unsubscribed') THEN
    RETURN jsonb_build_object('ok', true, 'updated', false, 'reason', 'terminal_status');
  END IF;

  -- Most-recent attendee row in an active event (ignores מבוטל-עבר and inactive events)
  SELECT a.status
    INTO v_active_status
    FROM crm_event_attendees a
    JOIN crm_events e ON e.id = a.event_id AND e.tenant_id = a.tenant_id
   WHERE a.lead_id = p_lead_id
     AND a.tenant_id = p_tenant_id
     AND a.status <> 'מבוטל-עבר'
     AND e.status NOT IN ('completed','cancelled')
     AND e.is_deleted = false
   ORDER BY a.updated_at DESC NULLS LAST, a.created_at DESC
   LIMIT 1;

  v_target_status := CASE v_active_status
    WHEN 'מאושר ומאומת' THEN 'confirmed_verified'
    WHEN 'מאושר'        THEN 'confirmed'
    WHEN 'הוזמן'        THEN 'invited'
    WHEN 'המתנה'        THEN 'waitlist'
    ELSE 'waiting'  -- no active attendee → default Tier-2
  END;

  IF v_lead.status = v_target_status THEN
    RETURN jsonb_build_object('ok', true, 'updated', false, 'old_status', v_lead.status, 'new_status', v_target_status);
  END IF;

  UPDATE crm_leads
     SET status = v_target_status, updated_at = now()
   WHERE id = p_lead_id AND tenant_id = p_tenant_id;

  RETURN jsonb_build_object(
    'ok', true,
    'updated', true,
    'old_status', v_lead.status,
    'new_status', v_target_status
  );
END$$;

GRANT EXECUTE ON FUNCTION sync_lead_status_from_attendee(uuid, uuid) TO authenticated, service_role;
```

### 12.2 `register_lead_to_event` extension

After EVERY existing branch that INSERTs/UPDATEs `crm_event_attendees`, append:

```sql
PERFORM sync_lead_status_from_attendee(p_lead_id, p_tenant_id);
```

Specifically: at the end of the new-registration branch, the soft-delete-revival branch, and the waiting-list branch (per CRM_RESUBSCRIBE_FIX 3-branch retro).

### 12.3 Post-action wiring (`crm-automation-post-actions.js`)

After `attendeeUpsert` finishes its loop, call:
```js
for (var leadId of upsertedLeadIds) {
  await sb.rpc('sync_lead_status_from_attendee', { p_lead_id: leadId, p_tenant_id: tenantId() });
}
```
Errors logged via `console.warn`, never throw — sync is best-effort.

### 12.4 Backfill

```sql
-- Idempotent — applies the mapping to all demo leads with active attendees.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT DISTINCT a.lead_id
      FROM crm_event_attendees a
      JOIN crm_events e ON e.id = a.event_id
     WHERE a.tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
       AND e.status NOT IN ('completed','cancelled')
       AND e.is_deleted = false
       AND a.status <> 'מבוטל-עבר'
  LOOP
    PERFORM sync_lead_status_from_attendee(r.lead_id, '8d8cfa7e-ef58-49af-9702-a862d459cccb');
  END LOOP;
END$$;
```

### 12.5 `crm_statuses` seed (demo)

```sql
INSERT INTO crm_statuses (tenant_id, entity_type, slug, name_he, name_en, color, sort_order, is_default)
VALUES (
  '8d8cfa7e-ef58-49af-9702-a862d459cccb',
  'lead',
  'waitlist',
  'רשימת המתנה',
  'Waitlist',
  '#FF9800',
  35,  -- between invited (likely 30) and confirmed (likely 40); executor verifies
  false
)
ON CONFLICT (tenant_id, entity_type, slug) DO NOTHING;
```

Executor verifies `sort_order` slot against existing rows before INSERT.

---

## 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Existing UI status filter relies on hardcoded TIER2 list and doesn't auto-pick up `waitlist` | LOW | LOW | TIER2_STATUSES is the single source for the leads-board status filter (CRM_UX_REDESIGN_AUTOMATION); UI iterates the array. Adding the value is enough. |
| `crm_statuses` UNIQUE constraint different from assumed `(tenant_id, entity_type, slug)` | LOW | LOW | Executor verifies via `\d crm_statuses` before INSERT; adjusts ON CONFLICT clause accordingly. |
| `register_lead_to_event` has more branches than expected | MEDIUM | MEDIUM | Snapshot-first (criterion #10) + read-before-write. Append sync call to every UPDATE/INSERT branch. |
| Backfill changes a status the operator was relying on | LOW | LOW | Demo only. Daniel inspects pre/post counts before promoting to Prizma in cutover SPEC. |
| Hebrew status string `מאושר ומאומת` doesn't exist in attendee enum (only `מאושר`) | MEDIUM | LOW | RPC's CASE handles either presence. If absent in real data, the branch is dead but harmless. Executor verifies against `\d+ crm_event_attendees` for the CHECK constraint values. |

---

*End of SPEC — M4_LEAD_STATUS_WAITLIST_SYNC*
