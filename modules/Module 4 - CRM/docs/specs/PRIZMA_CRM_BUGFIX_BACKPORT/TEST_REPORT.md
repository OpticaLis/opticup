# TEST_REPORT — PRIZMA_CRM_BUGFIX_BACKPORT

**Tested:** 2026-05-12
**Tenant under test:** Prizma (`6ad0781b-37f0-47a9-92e3-be9ed1477e1c`)
**Test event:** `a7c9f174-a099-48b7-88bb-e4d0fa6236e2` (טסט 3, event_date 2026-05-12, status=planning)
**Mode:** `evaluate` (no dispatch, no live messages, no DB side effects in dispatch tables)
**EF version:** `automation-engine` v8 (deployed 2026-04-10)

---

## 1. Pre-test baselines (post-UPDATE, pre-EF-call)

| Metric | Value |
|--------|-------|
| `crm_message_log` rows (Prizma) | 396 |
| `crm_message_queue` rows (Prizma) | 0 |
| `crm_event_attendees` rows (Prizma, not deleted) | 219 |
| `crm_automation_runs` rows (Prizma) | 120 |
| Prizma rule `d2585fc4` `action_config_md5` | `7ec3948c2318158800035b39c20c2451` (post-fix) |
| Prizma rule `c25feaf7` `action_config_md5` | `0e070698e17958c596ffbff5191c0764` (post-fix) |

## 2. Dry-run invocations

Two `mode='evaluate'` invocations of `automation-engine`, each exercising one trigger condition that our fixed rules fire on. Payload format:

```json
{
  "tenant_id": "6ad0781b-37f0-47a9-92e3-be9ed1477e1c",
  "trigger_type": "event_status_change",
  "trigger_data": {
    "eventId": "a7c9f174-a099-48b7-88bb-e4d0fa6236e2",
    "newStatus": "<registration_open | invite_waiting_list>"
  },
  "mode": "evaluate"
}
```

Auth: legacy ANON JWT (Supabase Gateway `verify_jwt: true`). Service-role inside the EF.

### 2.1 Trigger `newStatus=registration_open` (rule `d2585fc4`)

The EF executes ALL Prizma `crm_automation_rules` whose `is_active=true AND trigger_entity='event' AND trigger_event='status_change' AND trigger_condition->>'status'='registration_open'`. On Prizma this matches **two** rules:
- Our fixed rule `d2585fc4` ("אירוע פתח להרשמה - הזמנת רשימת המתנה", template `event_invite_waiting_list`, post-fix recipient `leads_by_status=['waitlist']`).
- An unrelated rule that uses template `event_registration_open` and a broad audience resolver. Out of scope for this SPEC.

Two invocations were made (initial + summary re-run); both returned the same shape.

| Run ID | `fired` | `total_recipients` | plan_items per rule_name / template_slug | `sent` | `failed` | `rejected` | `queued` | `status` |
|--------|---------|---------------------|------------------------------------------|--------|----------|------------|----------|----------|
| `007d5b94-ad0b-43de-b000-0a862ec3a6d6` | 2 | 1999 | 1999 items, all `template_slug=event_registration_open` (the OTHER rule); **0 items with template_slug=`event_invite_waiting_list`** | 0 | 0 | 0 | 0 | completed |
| `0184fddd-9e35-40c1-94e9-e9a45cc43b15` | 2 | 1999 | identical breakdown (idempotent) | 0 | 0 | 0 | 0 | completed |

**Verdict on our rule (`d2585fc4`):** fired ✓, resolved 0 recipients ✓ — `leads_by_status=['waitlist']` correctly returns the empty set (Prizma has 0 waitlist-status leads currently). No `event_invite_waiting_list` template appeared in `plan_items`.

**Verdict on the OTHER rule:** out of scope; mentioned only because EF returns its plan_items in the combined response. It is unaffected by this SPEC and was correctly evaluated.

### 2.2 Trigger `newStatus=invite_waiting_list` (rule `c25feaf7`)

Only one rule on Prizma fires on this condition: our fixed rule `c25feaf7`.

| Run ID | `fired` | `total_recipients` | plan_items | `sent` | `failed` | `rejected` | `queued` | `status` |
|--------|---------|---------------------|------------|--------|----------|------------|----------|----------|
| `703e1941-1890-4a5c-bd59-b1bfe815cd3f` | 1 | 0 | 0 items | 0 | 0 | 0 | 0 | completed |
| `b5d494ca-e12a-4d6b-80b6-0a87a718489d` | 1 | 0 | 0 items | 0 | 0 | 0 | 0 | completed |

**Verdict:** fired ✓, resolved 0 recipients ✓, 0 attendee inserts (per EF source code `evaluate` mode skips `attendeeUpsert` even if rule had the key — but our post-fix rule no longer has the key anyway).

## 3. Post-test side-effect verification

Compared against §1 pre-test baselines:

| Metric | Pre-EF | Post-EF | Δ | OK? |
|--------|--------|---------|---|-----|
| `crm_message_log` rows (Prizma) | 396 | 396 | 0 | ✅ |
| `crm_message_queue` rows (Prizma) | 0 | 0 | 0 | ✅ |
| `crm_event_attendees` rows (Prizma) | 219 | 219 | 0 | ✅ |
| `crm_automation_runs` rows (Prizma) | 120 | 124 | +4 | Expected (4 dry-run rows, status='completed', all counts=0) |
| `crm_message_log` rows tied to any of the 4 dry-run `run_id`s | 0 | 0 | 0 | ✅ — concrete proof zero outbound messages |

Zero outbound SMS/email. Zero attendee upserts. Zero queue inserts.

## 4. Behavioral verdict

The data-only fix on Prizma's `crm_automation_rules` rows behaves correctly:

1. The post-fix recipient resolver (`leads_by_status=['waitlist']`) returns ONLY leads with `crm_leads.status='waitlist'` (currently 0 on Prizma — the empty set, which is the right answer for the current data state).
2. The removed `post_action_attendee_upsert` key means the EF's `attendeeUpsert` path is skipped (no `cfg.status` to read → returns 0 upserted).
3. The other rule that fires on `registration_open` (`event_registration_open` template, broad audience) is unaffected.
4. No live messages dispatched. Verified by 0 message_log rows tied to the 4 dry-run `run_id`s.

The fix is ready to merge to `main`. See `READY-FOR-MAIN-MERGE.md`.

## 5. Risk notes

- **Prospective exposure:** Prizma currently has 0 `waitlist`-status leads AND 0 active "other" events (status in `registration_open`/`waiting_list`). Both the pre-fix and post-fix resolvers return 0 today, so the test cannot show a difference in recipient count this moment. The fix's real value is **forward-looking** — preventing the next event flip to `registration_open` from auto-attaching cross-event waitlist attendees as `invited`.
- **EF re-invocations were idempotent** — running each trigger twice produced identical plan_items counts and zero new side-effects.
- **OTHER rule audit** — the `event_registration_open` rule resolving to 1999 plan_items (≈ all Prizma's `waiting`-status leads × 2 channels) is unrelated to this SPEC. If its audience is wider than intended, that's a separate finding. Logged in FINDINGS.md.

---

*End of TEST_REPORT.*
