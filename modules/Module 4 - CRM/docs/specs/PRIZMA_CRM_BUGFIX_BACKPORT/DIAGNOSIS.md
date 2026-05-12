# DIAGNOSIS — PRIZMA_CRM_BUGFIX_BACKPORT

**Captured:** 2026-05-12
**Tenants:**
- Prizma (`6ad0781b-37f0-47a9-92e3-be9ed1477e1c`)
- Demo (`8d8cfa7e-ef58-49af-9702-a862d459cccb`)

---

## 1. Prizma rules matching the bug-shape filter

Filter used:
```sql
WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
  AND (action_config->>'template_slug' = 'event_invite_waiting_list'
       OR name LIKE '%רשימת המתנה%')
ORDER BY sort_order, id
```

4 rows returned. Per-row classification:

| # | id | name | sort | trigger | template_slug | recipient_type | post_action_attendee_upsert | classification |
|---|----|------|------|---------|---------------|----------------|-----------------------------|----------------|
| 1 | `d2585fc4-182d-43b2-a5a6-949ded00402e` | אירוע פתח להרשמה - הזמנת רשימת המתנה | 25 | event.status_change → `registration_open` | `event_invite_waiting_list` | `cross_event_active_waitlist` | `{"status":"invited"}` | **BUG-SHAPE MATCH → fix target #1** |
| 2 | `0e3bb277-d429-4492-aee9-e2e572d607ab` | שינוי סטטוס: רשימת המתנה | 50 | event.status_change → `waiting_list` | `event_waiting_list` | `attendees_all_statuses` | (absent) | OUT OF SCOPE — different template + recipient + is_active=false |
| 3 | `c25feaf7-86ae-4938-b55a-3443a8b94ff9` | שינוי סטטוס: הזמנה ממתינים | 80 | event.status_change → `invite_waiting_list` | `event_invite_waiting_list` | `cross_event_active_waitlist` | `{"status":"invited"}` | **BUG-SHAPE MATCH → fix target #2** |
| 4 | `f13d874a-5622-4539-b47e-95f82f817fe2` | הרשמה: אישור רשימת המתנה | 110 | attendee.created → `waiting_list` | `event_waiting_list` | `trigger_lead` | (absent) | OUT OF SCOPE — different template + single-lead confirmation |

Pre-fix md5 per target row:
- `d2585fc4` `action_config_md5` = `19ab6b2da49b14590d6fc108ffa3caf5`
- `c25feaf7` `action_config_md5` = `fc85cd5c9088a3511e13ae451e50200c`

Full pre-fix `action_config` for each target row:

**Rule `d2585fc4` (registration_open) — pre-fix:**
```json
{
  "channels": ["sms", "email"],
  "language": "he",
  "template_slug": "event_invite_waiting_list",
  "recipient_type": "cross_event_active_waitlist",
  "post_action_attendee_upsert": {"status": "invited"}
}
```

**Rule `c25feaf7` (invite_waiting_list) — pre-fix:**
```json
{
  "channels": ["sms", "email"],
  "template_slug": "event_invite_waiting_list",
  "recipient_type": "cross_event_active_waitlist",
  "post_action_attendee_upsert": {"status": "invited"}
}
```

(Note: rule `c25feaf7` has NO `language` key — matches demo's `ee0a6f24` shape EXACTLY which also lacks `language`.)

## 2. Side-by-side comparison: Prizma pre-fix ↔ demo pre-fix ↔ demo post-fix

| Key | Prizma `d2585fc4` (pre) | Demo `a06be5d8` (pre, from SNAPSHOT) | Demo `a06be5d8` (post-fix, target) |
|---|---|---|---|
| `channels` | `["sms","email"]` | `["sms","email"]` | `["sms","email"]` |
| `language` | `"he"` | `"he"` | `"he"` |
| `template_slug` | `event_invite_waiting_list` | `event_invite_waiting_list` | `event_invite_waiting_list` |
| `recipient_type` | `cross_event_active_waitlist` | `cross_event_active_waitlist` | **`leads_by_status`** |
| `recipient_status_filter` | (absent) | (absent) | **`["waitlist"]`** |
| `post_action_attendee_upsert` | `{"status":"invited"}` | `{"status":"invited"}` | **(removed)** |

| Key | Prizma `c25feaf7` (pre) | Demo `ee0a6f24` (pre, from SNAPSHOT) | Demo `ee0a6f24` (post-fix, target) |
|---|---|---|---|
| `channels` | `["sms","email"]` | `["sms","email"]` | `["sms","email"]` |
| `language` | (absent) | (absent) | (absent) |
| `template_slug` | `event_invite_waiting_list` | `event_invite_waiting_list` | `event_invite_waiting_list` |
| `recipient_type` | `cross_event_active_waitlist` | `cross_event_active_waitlist` | **`leads_by_status`** |
| `recipient_status_filter` | (absent) | (absent) | **`["waitlist"]`** |
| `post_action_attendee_upsert` | `{"status":"invited"}` | `{"status":"invited"}` | **(removed)** |

**Verdict:** Prizma's 2 target rules are **byte-identical in structure** to demo's pre-fix snapshot. No unexpected keys, no missing-from-demo keys, no different value shapes.

## 3. Demo post-fix regression check (rules unchanged since 2026-05-11)

| id | name | action_config_md5 (now) | Source-of-truth md5 (from `POST_FIX_RULE_STATE.json` round-trip) | Match? |
|----|------|--------------------------|------------------------------------------------------------------|---------|
| `a06be5d8-4dd6-43fa-bb53-b0e3be07a548` | אירוע פתח להרשמה - הזמנת רשימת המתנה | `7ec3948c2318158800035b39c20c2451` | (matches shape exactly) | ✅ |
| `ee0a6f24-1a3e-43f4-9ea6-fc4c1d081787` | שינוי סטטוס: הזמנה ממתינים | `0e070698e17958c596ffbff5191c0764` | (matches shape exactly) | ✅ |

Demo's 2 fixed rules retain their post-E2E-audit shape exactly. No drift.

## 4. Prizma baseline metrics (pre-UPDATE)

| Metric | Value | Purpose |
|--------|-------|---------|
| `crm_automation_rules` total for Prizma | 16 | Untouched-baseline scope |
| `crm_automation_rules` aggregate `md5(string_agg(action_config))` | `2791080fca7181a05c7e28cbcd882418` | Matches PRE_FIX_RULE_SNAPSHOT.json §prizma_baseline → **zero drift since 2026-05-11**. |
| `crm_automation_rules` non-target 14 rules aggregate md5 | `f10eaae8ed273ee42fa7b393cc289153` | Collateral-damage proof |
| `crm_message_log` rows (Prizma) | 396 | Side-effect proof (must remain 396 after dry-run) |
| `crm_message_queue` rows (Prizma) | 0 | Side-effect proof (must remain 0 after dry-run) |
| `crm_event_attendees` rows (Prizma, not deleted) | 219 | No-auto-attach proof (must remain 219) |
| `crm_automation_runs` rows (Prizma) | 120 | EF invocation will add 1-2 evaluation rows (total_recipients=0, status='completed') |
| Leads by status (Prizma) | waiting=1156, unsubscribed=56, new=12, not_interested=2, **waitlist=0** | Resolver inputs |

## 5. Behavioral simulation: who would the rule resolve TODAY?

| Resolver | Logic | Recipients on Prizma right now |
|----------|-------|--------------------------------|
| PRE-fix `cross_event_active_waitlist` | Attendees of OTHER events whose own status ∈ `{registration_open, waiting_list}` AND attendee status ∈ `{waiting_list, invited}` | 0 — Prizma has **0 active other events** (in those statuses) currently |
| POST-fix `leads_by_status=['waitlist']` | Leads where `status='waitlist'` AND not deleted AND not unsubscribed | **0** — Prizma has 0 waitlist leads currently |

**Caveat:** the bug's PRODUCTION exposure on Prizma is **prospective**. Both resolvers happen to return 0 right now because of Prizma's current data shape (no parallel open events, no waitlist-status leads). The fix prevents future auto-attach when an event flips to `registration_open` AND parallel events with waitlist/invited attendees become active. The auto-attach side of the bug (`post_action_attendee_upsert={status:'invited'}`) is the real production risk currently — applying the fix neutralizes it before the next event flip.

This is not a stop-trigger. The fix is still correct; the EF dry-run will demonstrate 0 recipients + 0 attendee inserts cleanly today, and after the fix the engine will only ever route to actual `waitlist`-status leads.

## 6. Path Decision

**Path A — proceed with UPDATE.**

Reasoning:
1. Exactly 2 rules on Prizma match the bug-shape filter (criterion #1 of stop-trigger evaluation passed: count = 2).
2. Both target rules' `recipient_type` = `cross_event_active_waitlist` ✓
3. Both target rules' `post_action_attendee_upsert` = `{"status":"invited"}` ✓ (exact value match)
4. No unexpected keys in either target rule (only `channels`, `language` [rule 1 only], `template_slug`, `recipient_type`, `post_action_attendee_upsert`) — all in demo's pre-fix shape's "safe to preserve" set.
5. Aggregate Prizma md5 unchanged since 2026-05-11 — no drift to investigate.
6. Demo post-fix rules' md5 confirms no regression on demo since the E2E audit closed.

No stop-trigger fires. Path A confirmed.

## 7. Planned UPDATEs (idempotent, defense-in-depth `WHERE` clauses)

```sql
-- Tag pre-state first (HEAD before SPEC commits)
-- git tag -a pre-backport-prizma-event-invite-fix HEAD -m "..."

-- UPDATE #1: rule d2585fc4 (registration_open) — Prizma
UPDATE crm_automation_rules
SET action_config =
  (action_config - 'post_action_attendee_upsert')
  || jsonb_build_object(
       'recipient_type', 'leads_by_status',
       'recipient_status_filter', '["waitlist"]'::jsonb
     )
WHERE id = 'd2585fc4-182d-43b2-a5a6-949ded00402e'
  AND tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
  AND action_config->>'recipient_type' = 'cross_event_active_waitlist'
  AND action_config ? 'post_action_attendee_upsert';

-- UPDATE #2: rule c25feaf7 (invite_waiting_list) — Prizma
UPDATE crm_automation_rules
SET action_config =
  (action_config - 'post_action_attendee_upsert')
  || jsonb_build_object(
       'recipient_type', 'leads_by_status',
       'recipient_status_filter', '["waitlist"]'::jsonb
     )
WHERE id = 'c25feaf7-86ae-4938-b55a-3443a8b94ff9'
  AND tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
  AND action_config->>'recipient_type' = 'cross_event_active_waitlist'
  AND action_config ? 'post_action_attendee_upsert';
```

Each UPDATE is its own statement (not bundled) so the per-row outcome is observable; the extra `AND` clauses make either statement a NO-OP if the row is already in post-fix shape.

## 8. Findings (informational, not stop-triggers)

- **DIAG-INFO-1** — `crm_automation_rules` table has NO `updated_at` column. Pre-flight query had to fall back to `created_at`. The post-write rows will have an unchanged `created_at` (the row was created 2026-04-28; UPDATE doesn't touch `created_at`). Suggests adding `updated_at` is a future debt item; out of scope here. Logged in FINDINGS.md.
- **DIAG-INFO-2** — `crm_events` column is `name`, not `event_name` (as the brief draft suggested when authoring the SPEC). Minor — affected one pre-flight query only.

---

*End of DIAGNOSIS.*
