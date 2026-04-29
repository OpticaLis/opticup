# SPEC — P5_V2_REBUILD_RUNG3_FEATURES

> **Module:** Module 4 — CRM
> **Location:** `modules/Module 4 - CRM/go-live/specs/P5_V2_REBUILD_RUNG3_FEATURES/`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-28 (locked from DRAFT after Daniel approved implementation outline)
> **Parent SPEC:** `../P5_V2_TEMPLATE_REBUILD/SPEC.md`
> **Status:** READY FOR EXECUTION (Rungs 1, 2, and M4_LEAD_STATUS_WAITLIST_SYNC must close first)
> **Priority:** Pre-cutover. Estimated 2.5h.
> **Origin:** Manual-move feature. Daniel approved outline 2026-04-28.

---

## 1. Goal

Build the manual attendee-move feature: new RPC `move_attendee_between_events` (atomic, audit-logged), an extension to `register_lead_to_event` for the public-form auto-move case, and a CRM admin UI dialog with two entry points (events board and leads board) that includes a "שלח עדכון ללקוח" toggle. When the toggle is ON, Rule 2.7 (already wired in Rung 2) fires the appropriate UNPAID/PAID V2 template pair.

After this Rung the V2 flow is fully operational on demo: automated rules + manual override + audit trail + customer-notification opt-in.

---

## 2. Background & Motivation

Rung 2 wired Rule 2.7 (2 inert rules, UNPAID + PAID branches) on the new trigger `attendee_moved`, but no code emits that trigger today. Rung 3 builds the emitters: the manual-move RPC + the auto-move detection in `register_lead_to_event`. M4_LEAD_STATUS_WAITLIST_SYNC must close first because the move RPC calls `sync_lead_status_from_attendee` to keep the leads board correct.

**Daniel's mental model (locked):** operator opens a lead/event, picks "העבר לאירוע…", selects target, optionally checks "שלח עדכון ללקוח", confirms. RPC handles everything else.

---

## 3. Success Criteria (Measurable)

### Part A — `move_attendee_between_events` RPC

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 1 | RPC exists with signature `move_attendee_between_events(p_attendee_id uuid, p_target_event_id uuid) RETURNS jsonb` | Function callable | `pg_get_functiondef('move_attendee_between_events'::regproc)` |
| 2 | RPC is atomic (single transaction, locks source row with `FOR UPDATE`) | `SELECT ... FOR UPDATE` present | grep RPC body |
| 3 | RPC validates: same_event → error; already_moved (status=מבוטל-עבר) → error; target_not_found → error; cross-tenant → error | 4 explicit RAISE EXCEPTION clauses | grep |
| 4 | Source row → status=`מבוטל-עבר`, updated_at=now() | UPDATE applied | SQL test |
| 5 | Target row → INSERT or UPSERT with status decided by capacity check (`מאושר` if room, `המתנה` if at/over capacity), payment_status + paid_at + credit_expires_at copied from source | UPSERT visible in body | SQL test with capacity edge |
| 6 | Audit: `activity_log` row inserted with action=`crm.attendee.moved`, full payload | Row visible | `SELECT * FROM activity_log WHERE action='crm.attendee.moved'` |
| 7 | RPC calls `sync_lead_status_from_attendee(lead_id, tenant_id)` after the moves so leads board reflects new state | grep | RPC body |
| 8 | RPC returns `jsonb { ok, new_attendee_id, new_status, payment_status, lead_id, source_event_id, target_event_id, fee_mismatch, source_fee, target_fee }` | All keys present | Test call |
| 9 | RPC does NOT auto-charge or refund on `booking_fee` mismatch — returns `fee_mismatch=true` plus the two values; the operator handles manually | No payment write in mismatch branch | grep |
| 10 | Pre-edit snapshot of `register_lead_to_event` saved as artifact for rollback | `register_lead_to_event-pre-rung3.sql` exists | `ls modules/Module 4 - CRM/go-live/specs/P5_V2_REBUILD_RUNG3_FEATURES/` |
| 11 | `register_lead_to_event` extended: when called for a lead that already has a row in `המתנה`/`הוזמן` for a DIFFERENT active event, internally call `move_attendee_between_events` (with `send_notification` always FALSE in the public-form path — public form already shows on-screen confirmation; no SMS spam) before proceeding | New branch present | grep + functional test |

### Part B — Admin UI dialog + 2 entry points

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 12 | New file `modules/crm/crm-attendee-move.js` (~120 lines, ≤350 cap) exposes `window.CrmAttendeeMove.open(attendeeId, ctx)` | File exists, function callable | `wc -l` + browser console test |
| 13 | Dialog body: read-only lead name + source event name; dropdown of target events (other open/waitlist active events for same tenant, ordered by date ASC, max 50); read-only warning lines for capacity-full and fee-mismatch; checkbox "שלח עדכון ללקוח" default OFF; Confirm + Cancel | Visual check on demo | Browser QA |
| 14 | Confirm calls RPC, on `{ok:true}` calls `CrmAutomation.evaluate('attendee_moved', payload)` IFF toggle was ON, else skip the rule | grep + browser test | dialog flow |
| 15 | Entry point A — events board: button "↔ העבר לאירוע" appears in attendees table per row (in `crm-events-detail.js`), opens dialog | Button present | Browser QA |
| 16 | Entry point B — leads board: per Tier-2 row with status `waitlist` or `invited` having an active attendee row, action "↔ העבר לאירוע" in row menu opens the same dialog | Action present | Browser QA |
| 17 | UI refreshes the visible table on success without full page reload | Patch in place (not full reload) | Browser test |
| 18 | `wc -l` for all touched JS files ≤ 350 (Rule 12). `crm-events-detail.js` and `crm-leads-tab.js` are at-cap; if exceeded, executor splits | All ≤350 | `wc -l` |

### Part C — End-to-end smoke test on demo

| # | Criterion | Expected |
|---|-----------|----------|
| 19 | Move with toggle OFF, source `pending_payment` → no log row, no SMS/email; activity_log row exists; lead status synced; attendee row updates correct | log diff, activity_log present |
| 20 | Move with toggle ON, source `pending_payment` → fires `event_attendee_moved_unpaid_*_he` pair (SMS+email); 2 log rows | log query |
| 21 | Move with toggle ON, source `paid` → fires `event_attendee_moved_paid_*_he` pair; 2 log rows | log query |
| 22 | Capacity edge: target full → new attendee status = `המתנה`; rule still fires correct pair (UNPAID/PAID) since branching is on payment status, not capacity | smoke test |
| 23 | Fee-mismatch edge: source booking_fee=50, target booking_fee=75 → RPC returns `fee_mismatch=true`; UI shows warning before confirm; operator can still proceed (move happens, payment_status copied, no auto-charge) | smoke test |
| 24 | Public-form auto-move: lead has attendee row with `המתנה` on event A; lead registers via storefront for event B → event A row → `מבוטל-עבר`, event B row created with appropriate status, leads board syncs, NO SMS sent (toggle defaults to false in public path) | smoke test |
| 25 | Cross-tenant safety: every RPC query and UI query includes `tenant_id` filter | grep |

### Part D — Repo + DB hygiene

| # | Criterion | Expected |
|---|-----------|----------|
| 26 | Iron Rule 31 integrity gate passes at every commit | exit 0 |
| 27 | All test sends use approved phones | only 3 phones |
| 28 | Demo baseline restored after smoke (test data cleaned) | Pre/post counts match |
| 29 | Commits | 5–7 commits |
| 30 | `crm.html` script tag added for `crm-attendee-move.js` | Visible | grep |

---

## 4. Autonomy Envelope

### CAN do
- Read all files, all SQL.
- Modify `crm-events-detail.js`, `crm-leads-tab.js`, create `crm-attendee-move.js`.
- CREATE OR REPLACE the 2 RPCs (with snapshots first).
- Add a new script tag in `crm.html`.
- Run all smoke-test SQL on demo (Level 2 pre-authorized).
- Use `Modal.show` and existing `CrmAutomation.evaluate` patterns.
- Commit + push to develop.

### REQUIRES stopping
- Any change to RLS policies on `crm_event_attendees` or `crm_leads`.
- Any DDL beyond the new RPC + extending the existing one.
- Any change to V2 templates.
- Any UPDATE to production tenant `83bd9d0a-...`.
- Any phone outside the approved list.
- Any auto-charge/refund logic on fee mismatch (locked: manual operator handling).
- More than 7 commits.

---

## 5. Stop-on-Deviation Triggers

1. `register_lead_to_event` body has unexpected branches the SPEC didn't account for (executor reads full body before edit).
2. `Modal.show` API has changed signature or features the dialog needs.
3. Engine `evaluate('attendee_moved', ...)` returns 0 fired with both rules having `is_active=true` — Rung 2 wired wrong.
4. `activity_log` table requires fields the RPC doesn't have access to (employee_id resolution).
5. UI files exceed 350 lines after edit — split needed.
6. Smoke test #20 or #21 dispatches the WRONG branch (paid pair on unpaid attendee or vice versa) — branching condition is buggy.
7. Smoke test #24 (auto-move) accidentally fires SMS — public-form path must be silent.

---

## 6. Rollback Plan

- `move_attendee_between_events` RPC: `DROP FUNCTION` (it's new — no prior version).
- `register_lead_to_event` RPC: restore from `register_lead_to_event-pre-rung3.sql` snapshot.
- Code: `git revert` Rung 3 commits in reverse.
- Activity log rows: append-only — `DELETE FROM activity_log WHERE action='crm.attendee.moved' AND created_at > <session start>` if needed.
- Test data on demo: `DELETE` test attendee + lead rows created during smoke.

---

## 7. Out of Scope

- Bulk move (multi-attendee).
- Auto-charge/refund on fee mismatch.
- Production tenant deployment.
- Storefront UI changes (auto-move is RPC-only in this SPEC).
- Modifications to Rule 2.7 itself (Rung 2 owns those rows).
- New status values beyond what M4_LEAD_STATUS_WAITLIST_SYNC delivered.

---

## 8. Expected Final State

### Modified files

| File | Current | Expected | Change |
|------|---------|----------|--------|
| `modules/crm/crm-events-detail.js` | ~350 (at-cap) | ≤350 | Add 1 button per attendee row + open-dialog wire (~5 lines). May need split if exceeded. |
| `modules/crm/crm-leads-tab.js` | ~307 | ≤350 | Add row action for waitlist/invited leads (~10 lines). |
| `crm.html` | unchanged | +1 script tag | Add `<script src="modules/crm/crm-attendee-move.js"></script>` |

### New files

- `modules/crm/crm-attendee-move.js` — ~120 lines, dialog + RPC client + post-call rule fire.
- `modules/Module 4 - CRM/go-live/specs/P5_V2_REBUILD_RUNG3_FEATURES/register_lead_to_event-pre-rung3.sql` — pre-edit snapshot artifact.

### DB state (demo only)

- New RPC `move_attendee_between_events`.
- `register_lead_to_event` modified (CREATE OR REPLACE) to detect cross-event auto-move.
- Smoke test data cleaned at end.

### Docs

- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — close P5_V2_REBUILD_RUNG3_FEATURES.
- `modules/Module 4 - CRM/go-live/ROADMAP.md` — close the rung.
- `modules/Module 4 - CRM/docs/MODULE_MAP.md` — add new file entry.

---

## 9. Commit Plan

| # | Message | Files |
|---|---------|-------|
| 1 | `feat(crm): add move_attendee_between_events RPC + extend register_lead_to_event for auto-move` | DB SQL artifacts + snapshot |
| 2 | `feat(crm): attendee-move dialog with send-notification toggle` | `crm-attendee-move.js` (new) + `crm.html` |
| 3 | `feat(crm): wire attendee-move from events detail + leads tab` | `crm-events-detail.js` + `crm-leads-tab.js` |
| 4 | `docs(crm): mark P5_V2_REBUILD_RUNG3_FEATURES CLOSED` | SESSION_CONTEXT + ROADMAP + MODULE_MAP |
| 5 | `chore(spec): close P5_V2_REBUILD_RUNG3_FEATURES with retrospective` | EXECUTION_REPORT + FINDINGS |

Budget: 5 commits ± 2 fix.

---

## 10. Dependencies / Preconditions

| Dependency | Status |
|------------|--------|
| Rung 1 CLOSED | ⚠️ HARD |
| Rung 2 CLOSED | ⚠️ HARD (Rule 2.7 rows must exist; engine `attendee_moved` trigger registered) |
| M4_LEAD_STATUS_WAITLIST_SYNC CLOSED | ⚠️ HARD (RPC depends on `sync_lead_status_from_attendee`) |
| `Modal.show` available globally | ✅ STABLE (used across CRM) |
| `CrmAutomation.evaluate` accepts custom trigger types via dictionary lookup | ⚠️ EXECUTOR VERIFIES (Rung 2 should have registered `attendee_moved`) |
| `activity_log` table accepts JSONB details | ✅ VERIFIED (P12 + EVENT_CLOSE_COMPLETE_STATUS_FLOW) |

---

## 11. Lessons Already Incorporated

- POST_WAITING_LIST_FIXES F1 — pg_get_functiondef snapshot before RPC edit (criterion #10).
- POST_WAITING_LIST_FIXES F2 — Modal.confirm cheatsheet — executor reads pattern from existing `crm-confirm-send.js` and `crm-event-send-message.js` before writing the dialog.
- WORKING_TREE_RECOVERY FR Proposal 1 — STATE_SNAPSHOT before destructive: pre-state attendee + log counts captured.
- OVERNIGHT_M4_SCALE_AND_UI — phone allowlist guard.
- **Cross-Reference Check 2026-04-28:** `move_attendee_between_events` (0 hits → unique), `crm-attendee-move.js` (0 hits → unique), `CrmAttendeeMove` global (0 hits → unique). 0 collisions.

---

## 12. Technical Design

### 12.1 RPC body — `move_attendee_between_events`

```sql
CREATE OR REPLACE FUNCTION move_attendee_between_events(
  p_attendee_id      uuid,
  p_target_event_id  uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_src    crm_event_attendees%ROWTYPE;
  v_tgt    crm_events%ROWTYPE;
  v_src_ev crm_events%ROWTYPE;
  v_count  int;
  v_new_status text;
  v_new_id uuid;
  v_fee_mismatch boolean := false;
  v_employee uuid;
BEGIN
  -- Read employee context (best-effort; may be null in service-role calls)
  BEGIN v_employee := current_setting('app.employee_id', true)::uuid;
  EXCEPTION WHEN OTHERS THEN v_employee := NULL;
  END;

  -- 1. Lock + read source
  SELECT * INTO v_src FROM crm_event_attendees WHERE id = p_attendee_id FOR UPDATE;
  IF v_src IS NULL THEN RAISE EXCEPTION 'attendee_not_found' USING ERRCODE='P0002'; END IF;

  -- 2. Validate
  IF v_src.event_id = p_target_event_id THEN RAISE EXCEPTION 'same_event'; END IF;
  IF v_src.status = 'מבוטל-עבר' THEN RAISE EXCEPTION 'already_moved'; END IF;

  -- 3. Read target + source events
  SELECT * INTO v_tgt FROM crm_events
   WHERE id = p_target_event_id AND tenant_id = v_src.tenant_id AND is_deleted = false FOR SHARE;
  IF v_tgt IS NULL THEN RAISE EXCEPTION 'target_not_found'; END IF;

  SELECT * INTO v_src_ev FROM crm_events WHERE id = v_src.event_id;
  v_fee_mismatch := COALESCE(v_src_ev.booking_fee, 0) <> COALESCE(v_tgt.booking_fee, 0);

  -- 4. Capacity check on target
  SELECT count(*) INTO v_count FROM crm_event_attendees
   WHERE event_id = p_target_event_id AND status IN ('מאושר','הוזמן') AND tenant_id = v_src.tenant_id;
  v_new_status := CASE WHEN v_count >= COALESCE(v_tgt.max_capacity, 50) THEN 'המתנה'
                       WHEN v_src.status IN ('מאושר','הוזמן') THEN v_src.status
                       ELSE 'מאושר' END;

  -- 5. Source: 'מבוטל-עבר'
  UPDATE crm_event_attendees SET status = 'מבוטל-עבר', updated_at = now() WHERE id = p_attendee_id;

  -- 6. Target: UPSERT
  INSERT INTO crm_event_attendees
    (tenant_id, event_id, lead_id, status, payment_status, paid_at, credit_expires_at)
  VALUES
    (v_src.tenant_id, p_target_event_id, v_src.lead_id, v_new_status,
     v_src.payment_status, v_src.paid_at, v_src.credit_expires_at)
  ON CONFLICT (event_id, lead_id) DO UPDATE
     SET status = EXCLUDED.status,
         payment_status = EXCLUDED.payment_status,
         paid_at = EXCLUDED.paid_at,
         credit_expires_at = EXCLUDED.credit_expires_at,
         updated_at = now()
  RETURNING id INTO v_new_id;

  -- 7. Audit
  INSERT INTO activity_log(tenant_id, action, entity_type, entity_id, details, employee_id)
  VALUES (v_src.tenant_id, 'crm.attendee.moved', 'crm_event_attendees', v_new_id,
          jsonb_build_object(
            'source_event_id', v_src.event_id,
            'target_event_id', p_target_event_id,
            'source_attendee_id', p_attendee_id,
            'lead_id', v_src.lead_id,
            'old_status', v_src.status,
            'new_status', v_new_status,
            'payment_status', v_src.payment_status,
            'fee_mismatch', v_fee_mismatch,
            'source_fee', v_src_ev.booking_fee,
            'target_fee', v_tgt.booking_fee),
          v_employee);

  -- 8. Sync leads board
  PERFORM sync_lead_status_from_attendee(v_src.lead_id, v_src.tenant_id);

  RETURN jsonb_build_object(
    'ok', true,
    'new_attendee_id', v_new_id,
    'new_status', v_new_status,
    'payment_status', v_src.payment_status,
    'lead_id', v_src.lead_id,
    'source_event_id', v_src.event_id,
    'target_event_id', p_target_event_id,
    'fee_mismatch', v_fee_mismatch,
    'source_fee', v_src_ev.booking_fee,
    'target_fee', v_tgt.booking_fee
  );
END$$;

GRANT EXECUTE ON FUNCTION move_attendee_between_events(uuid, uuid) TO authenticated, service_role;
```

### 12.2 `register_lead_to_event` extension

At the START of the existing function (after lead+event lookup, before the new attendee write):

```sql
-- AUTO-MOVE: detect existing active attendee on a DIFFERENT event for same lead
DECLARE v_existing_attendee uuid;
BEGIN
  SELECT a.id INTO v_existing_attendee
    FROM crm_event_attendees a
    JOIN crm_events e ON e.id = a.event_id
   WHERE a.lead_id = p_lead_id
     AND a.tenant_id = p_tenant_id
     AND a.event_id <> p_event_id
     AND a.status IN ('המתנה','הוזמן')
     AND e.status NOT IN ('completed','cancelled')
     AND e.is_deleted = false
   ORDER BY a.updated_at DESC NULLS LAST, a.created_at DESC
   LIMIT 1;
  IF v_existing_attendee IS NOT NULL THEN
    PERFORM move_attendee_between_events(v_existing_attendee, p_event_id);
    -- The move RPC handled the source close + target write + sync. Return early.
    RETURN jsonb_build_object('ok', true, 'auto_moved', true,
      'attendee_id', (SELECT id FROM crm_event_attendees WHERE event_id=p_event_id AND lead_id=p_lead_id));
  END IF;
END;
-- (existing flow below unchanged)
```

Executor MUST verify by reading the full pre-edit body whether this insert point is correct (the function may have an early-return for unsubscribed leads or other guard conditions that should run first).

### 12.3 Dialog (`crm-attendee-move.js`)

Pattern follows `crm-event-send-message.js` (existing dialog file). Skeleton:

```js
(function () {
  'use strict';
  async function open(attendeeId, ctx) {
    // 1. Load source attendee + event
    const src = await sb.from('crm_event_attendees').select('id, event_id, lead_id, status, payment_status, crm_leads(full_name), crm_events(name, booking_fee, max_capacity)')
      .eq('id', attendeeId).single();
    // 2. Load target candidates (other open/waitlist active events, same tenant)
    const tgts = await sb.from('crm_events').select('id, name, event_date, booking_fee, max_capacity')
      .eq('tenant_id', getTenantId())
      .in('status', ['open_for_registration','waitlist_full'])
      .neq('id', src.data.event_id)
      .eq('is_deleted', false).order('event_date', { ascending: true }).limit(50);
    // 3. Build dialog HTML with dropdown, capacity warning, fee warning, toggle, confirm/cancel
    Modal.show({
      title: 'העברת משתתף לאירוע אחר',
      bodyHtml: buildBody(src.data, tgts.data),
      onConfirm: async () => {
        const targetId = document.querySelector('#move-target').value;
        const sendNotif = document.querySelector('#move-send-notif').checked;
        const r = await sb.rpc('move_attendee_between_events', { p_attendee_id: attendeeId, p_target_event_id: targetId });
        if (r.error || !r.data?.ok) { Toast.error(r.error?.message || 'move_failed'); return; }
        if (sendNotif) {
          const branch = r.data.payment_status === 'paid' ? 'paid' : 'unpaid';
          await CrmAutomation.evaluate('attendee_moved', {
            attendeeId: r.data.new_attendee_id,
            leadId: r.data.lead_id,
            sourceEventId: r.data.source_event_id,
            targetEventId: r.data.target_event_id,
            paymentStatus: r.data.payment_status,
            payment_status_branch: branch  // for status_equals condition
          });
        }
        Toast.success('המשתתף הועבר בהצלחה');
        if (ctx?.onAfter) await ctx.onAfter();
      }
    });
  }
  window.CrmAttendeeMove = { open };
})();
```

`Toast` and `Modal` are existing globals. `getTenantId()` and `sb` follow project conventions.

### 12.4 Entry-point wires

**A — events detail attendees table** (`crm-events-detail.js`):
```js
// In renderAttendeesRow, append:
'<button data-move-attendee="' + escapeHtml(att.id) + '" class="' + linkBtnCls + '">↔ העבר</button>'
// Wire:
container.addEventListener('click', function(e) {
  var t = e.target.closest('[data-move-attendee]');
  if (t) CrmAttendeeMove.open(t.getAttribute('data-move-attendee'), { onAfter: () => refreshAttendeesTable(eventId) });
});
```

**B — leads tab row action** (`crm-leads-tab.js`): for leads where `status IN ('waitlist','invited')`, add row action that resolves the active attendee row via `sb.from('crm_event_attendees').select('id').eq('lead_id', leadId).in('status', ['המתנה','הוזמן']).limit(1).single()` then calls `CrmAttendeeMove.open(attendeeId, { onAfter: () => refreshLeadsTable() })`.

### 12.5 Smoke test sequence

1. Capture pre-state: attendee + log + activity_log + lead status counts.
2. Test #19 (toggle OFF, unpaid): create demo event A + B both open_for_registration; add attendee on A with payment_status=`pending_payment`; open dialog; confirm with toggle OFF → verify no log row, source `מבוטל-עבר`, target `מאושר`, lead synced, activity_log row exists.
3. Test #20 (toggle ON, unpaid): repeat with toggle ON → 2 log rows for `event_attendee_moved_unpaid_*`.
4. Test #21 (toggle ON, paid): set source attendee to `paid` first, then move → 2 log rows for `event_attendee_moved_paid_*`.
5. Test #22 (capacity): fill event B to max_capacity; new move → target `המתנה`, rule still fires correct paid/unpaid pair.
6. Test #23 (fee mismatch): `UPDATE crm_events SET booking_fee=75 WHERE id='B'`; move → RPC returns `fee_mismatch=true`; UI shows warning; operator confirms; move proceeds; payment_status copied; no auto-charge.
7. Test #24 (auto-move via public form): seed event A waitlist for a lead, then call `register_lead_to_event(B, lead)` → event A row → `מבוטל-עבר`, event B row created, leads board synced, NO log rows (public path is silent).
8. Cleanup: delete test data, restore baseline.

---

## 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `register_lead_to_event` has paths I didn't account for | MEDIUM | HIGH | Pre-edit snapshot + read-full-body before edit. Stop-trigger #1. |
| `Modal.show` doesn't support custom `bodyHtml` + dynamic confirm | LOW | LOW | Pattern verified in `crm-event-send-message.js` and `crm-confirm-send.js`. |
| Engine `evaluate('attendee_moved', ...)` doesn't fire because Rung 2 named the trigger differently | LOW (Rung 2 verifies) | HIGH | Stop-trigger #3. |
| `crm-events-detail.js` exceeds 350 with the new button | MEDIUM | LOW | Currently at-cap; if needed, extract attendees-row rendering to `crm-events-detail-attendees.js` (small split). |
| Public-form auto-move triggers SMS unintentionally | LOW | MEDIUM | RPC's call from `register_lead_to_event` does NOT call CrmAutomation.evaluate — only the admin dialog does, and only when toggle is ON. Smoke test #24 verifies. |
| `activity_log` write fails (RLS or NOT NULL on a column) | LOW | MEDIUM | RPC uses SECURITY DEFINER; service-role bypasses RLS. NOT NULL columns covered by jsonb_build_object payload. |
| Capacity check race condition (two moves at same instant) | LOW | LOW | `FOR UPDATE` on source row + capacity SELECT inside transaction. Worst case: target ends up at max_capacity+1 momentarily; subsequent moves get `המתנה`. |

---

*End of SPEC — P5_V2_REBUILD_RUNG3_FEATURES (locked)*
