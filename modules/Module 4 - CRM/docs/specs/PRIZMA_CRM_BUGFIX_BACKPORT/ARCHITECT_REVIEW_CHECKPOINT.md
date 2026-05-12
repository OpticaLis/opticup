# ARCHITECT REVIEW CHECKPOINT — Prizma Backport

**For:** Daniel + Architect (Cowork session, pre-main-merge review)
**Date:** 2026-05-12
**Status:** ⏳ awaiting Architect review

Use this file to do a final side-by-side diff before merging the SPEC commits to `main` via GitHub PR. The Pipeline has auto-classified the diff verdict at the bottom of this file.

---

## Rule 1: אירוע פתח להרשמה - הזמנת רשימת המתנה (`d2585fc4-182d-43b2-a5a6-949ded00402e`)

**Trigger:** event.status_change → `registration_open`
**Tenant:** Prizma (`6ad0781b-37f0-47a9-92e3-be9ed1477e1c`)
**sort_order:** 25
**is_active:** true
**Pre-fix `action_config_md5`:** `19ab6b2da49b14590d6fc108ffa3caf5`
**Post-fix `action_config_md5`:** `7ec3948c2318158800035b39c20c2451` (byte-identical to demo `a06be5d8` post-fix)

### Before
```json
{
  "channels": ["sms", "email"],
  "language": "he",
  "template_slug": "event_invite_waiting_list",
  "recipient_type": "cross_event_active_waitlist",
  "post_action_attendee_upsert": {"status": "invited"}
}
```

### After
```json
{
  "channels": ["sms", "email"],
  "language": "he",
  "template_slug": "event_invite_waiting_list",
  "recipient_type": "leads_by_status",
  "recipient_status_filter": ["waitlist"]
}
```

### Diff highlights
- **Removed keys:** `post_action_attendee_upsert`
- **Changed keys:** `recipient_type`: `"cross_event_active_waitlist"` → `"leads_by_status"`
- **Added keys:** `recipient_status_filter`: `["waitlist"]`
- **Preserved keys:** `channels`, `language`, `template_slug`
- **Unexpected keys (present in Prizma but NOT in demo's pre-fix):** none

---

## Rule 2: שינוי סטטוס: הזמנה ממתינים (`c25feaf7-86ae-4938-b55a-3443a8b94ff9`)

**Trigger:** event.status_change → `invite_waiting_list`
**Tenant:** Prizma (`6ad0781b-37f0-47a9-92e3-be9ed1477e1c`)
**sort_order:** 80
**is_active:** true
**Pre-fix `action_config_md5`:** `fc85cd5c9088a3511e13ae451e50200c`
**Post-fix `action_config_md5`:** `0e070698e17958c596ffbff5191c0764` (byte-identical to demo `ee0a6f24` post-fix)

### Before
```json
{
  "channels": ["sms", "email"],
  "template_slug": "event_invite_waiting_list",
  "recipient_type": "cross_event_active_waitlist",
  "post_action_attendee_upsert": {"status": "invited"}
}
```

### After
```json
{
  "channels": ["sms", "email"],
  "template_slug": "event_invite_waiting_list",
  "recipient_type": "leads_by_status",
  "recipient_status_filter": ["waitlist"]
}
```

### Diff highlights
- **Removed keys:** `post_action_attendee_upsert`
- **Changed keys:** `recipient_type`: `"cross_event_active_waitlist"` → `"leads_by_status"`
- **Added keys:** `recipient_status_filter`: `["waitlist"]`
- **Preserved keys:** `channels`, `template_slug` (no `language` key — same as demo's `ee0a6f24` post-fix shape)
- **Unexpected keys (present in Prizma but NOT in demo's pre-fix):** none

---

## Out-of-scope rules touched by the broader filter (informational)

The brief's discovery filter (`template_slug='event_invite_waiting_list' OR name LIKE '%רשימת המתנה%'`) also matched these 2 Prizma rules. **They were NOT modified.**

| id | name | template_slug | recipient_type | Why ignored |
|----|------|---------------|----------------|-------------|
| `0e3bb277-d429-4492-aee9-e2e572d607ab` | שינוי סטטוס: רשימת המתנה | `event_waiting_list` | `attendees_all_statuses` | Different template + recipient; is_active=false |
| `f13d874a-5622-4539-b47e-95f82f817fe2` | הרשמה: אישור רשימת המתנה | `event_waiting_list` | `trigger_lead` | Single-lead confirmation; different template + recipient |

Neither has `post_action_attendee_upsert`. Neither shares the bug shape.

---

## EF dry-run summary (`automation-engine` `mode=evaluate`, 2026-05-12)

| Trigger | Run ID | fired | total_plan_items | from `event_invite_waiting_list` template | sent | failed | rejected | queued |
|---------|--------|-------|------------------|--------------------------------------------|------|--------|----------|--------|
| `registration_open` | `0184fddd-9e35-40c1-94e9-e9a45cc43b15` | 2 | 1999 | **0** (our rule produced zero) | 0 | 0 | 0 | 0 |
| `invite_waiting_list` | `b5d494ca-e12a-4d6b-80b6-0a87a718489d` | 1 | 0 | **0** | 0 | 0 | 0 | 0 |

Side-effect counts on Prizma unchanged: `crm_message_log` 396→396, `crm_message_queue` 0→0, `crm_event_attendees` 219→219.

Full detail in `TEST_REPORT.md`.

---

## Diff Verdict

🟢 **Clean — only intended keys changed, no surprises → safe to merge.**

Auto-classification reasoning:
1. Both target rules' pre-fix shapes were byte-identical structurally to demo's pre-fix SNAPSHOT.
2. Both target rules' post-fix shapes are byte-identical (md5 equality) to demo's post-fix STATE.
3. The 14 non-target rules on Prizma had aggregate md5 `f10eaae8ed273ee42fa7b393cc289153` both pre- and post-write — zero collateral damage.
4. Demo's 2 fixed rules retain their post-E2E-audit md5s — zero regression on demo.
5. EF dry-run in `evaluate` mode produced ZERO outbound messages, ZERO attendee inserts, ZERO queue writes.
6. The OTHER rule that fires on `registration_open` is unrelated to this SPEC and behaves identically before/after — it was never going to be modified.

**No 🟡 conditions:** no unexpected keys preserved, no minor surprises.
**No 🔴 conditions:** no structural mismatches, no unintended writes, no demo regression.

---

## Pre-merge checklist (Daniel)

- [ ] Read this file end-to-end.
- [ ] Open `READY-FOR-MAIN-MERGE.md` for the PR title + body.
- [ ] Open GitHub compare URL (in `READY-FOR-MAIN-MERGE.md`).
- [ ] Open GitHub PR; merge via dashboard (squash or merge, your call).

---

*End of ARCHITECT_REVIEW_CHECKPOINT.*
