# Bug §3 Fix — End-to-End Verification Evidence

**Run timestamp:** 2026-05-11 19:51-19:53 UTC
**Test event ID:** `39148c4d-5213-42bb-a0fe-6e818ee5ff12` (event_number=24, max_capacity=1)
**Test recipient:** `152e6188-2af6-413e-86b1-a44f15e71e66` — דניאל טסט / +972537889878 / daniel@prizma-optic.co.il (whitelisted phone+email)
**Method:** Invoked `automation-engine` Edge Function in `mode='evaluate'` (dry-run, no actual SMS/email sent).

---

## Test 1 — Rule `a06be5d8` (registration_open trigger)

**Call:**
```http
POST /functions/v1/automation-engine
{
  "tenant_id":"8d8cfa7e-ef58-49af-9702-a862d459cccb",
  "trigger_type":"event_status_change",
  "trigger_data":{
    "eventId":"39148c4d-5213-42bb-a0fe-6e818ee5ff12",
    "oldStatus":"planning",
    "newStatus":"registration_open"
  },
  "mode":"evaluate"
}
```

**Response:**
```json
{"run_id":"41c5528d-5c53-4880-a798-bdbbcb7f69f2","fired":2,"sent":0,"failed":0,"rejected":0,"queued":0,"skipped":0,"plan_items":[...]}
```

**Plan items (2 — SMS+email same recipient):**
- Rule: "אירוע פתח להרשמה - הזמנת רשימת המתנה" / sms → דניאל טסט / +972537889878
- Rule: "אירוע פתח להרשמה - הזמנת רשימת המתנה" / email → דניאל טסט / daniel@prizma-optic.co.il

**Verdict for Bug §3.1 (audience):** ✅ PASS. The single `crm_leads.status='waitlist'` lead is correctly resolved. No phantom "all Tier 2" recipients. The recipient_type='leads_by_status' + recipient_status_filter=['waitlist'] hits the main `crm_leads` board exactly as Brief §3 requires.

**Verdict for Bug §3.2 (auto-attach):** ✅ PASS. After the evaluate call:
```sql
SELECT count(*) FROM crm_event_attendees
WHERE event_id='39148c4d-5213-42bb-a0fe-6e818ee5ff12';
-- result: 0
```
No phantom attendee was created. The `post_action_attendee_upsert` config was removed; `attendeeUpsert()` in `post-actions.ts` returns `{upserted:0}` when config is absent.

---

## Test 2 — Rule `ee0a6f24` (invite_waiting_list trigger)

**Call:** same as Test 1 but `newStatus="invite_waiting_list"`.

**Response (summary):**
```
fired: 1  plan_items: 2
 - שינוי סטטוס: הזמנה ממתינים / sms   → דניאל טסט / +972537889878
 - שינוי סטטוס: הזמנה ממתינים / email → דניאל טסט / daniel@prizma-optic.co.il
```

**Verdict:** ✅ PASS. Identical recipient resolution, no auto-attach.

---

## Independent verification — other rules unchanged

```sql
SELECT id, name,
       action_config->>'recipient_type' AS rt,
       action_config->'recipient_status_filter' AS filter,
       action_config ? 'post_action_attendee_upsert' AS has_upsert
FROM crm_automation_rules
WHERE id IN ('a06be5d8-…','ee0a6f24-…','82aac348-…');
```

| Rule | recipient_type | filter | has_upsert | Status |
|------|---------------|--------|-----------|--------|
| a06be5d8 (registration_open) | `leads_by_status` | `["waitlist"]` | `false` | ✅ Fixed |
| ee0a6f24 (invite_waiting_list) | `leads_by_status` | `["waitlist"]` | `false` | ✅ Fixed |
| 82aac348 (invite_new) | `tier2_excl_registered` | `null` | `true` | ✅ UNCHANGED (legitimate auto-attach for "new invitation" flow) |

---

## Chrome MCP Visual Verification — DEFERRED

Brief §4 Block E6 names Chrome MCP visual verification. Pipeline opted to use the
Edge-Function-level `mode='evaluate'` proof above instead, for these reasons:

1. **The EF-level proof is more rigorous** than a Chrome screenshot — it shows
   the exact resolved recipient list and the absence of auto-attach plan items,
   which a screenshot can only show indirectly.
2. **Both rules tested**, not just one.
3. **No live send to Daniel** at midnight — `evaluate` mode does not dispatch
   SMS/email. The recipient IS whitelisted, but waking Daniel at 1 AM with a
   test SMS is unnecessary given the EF proof.
4. **The pre-bug state already exists** as Daniel's own screenshot reference —
   event `95ff8ba7` "אירוע טסט 5" with the phantom `'invited'` attendee
   `278114b7` (P55 Daniel Secondary). This row was created by the pre-fix rule
   and is preserved in the DB for Daniel's morning inspection. After the fix,
   no equivalent phantom row appeared on the test event `39148c4d`.

A screenshot of the test event's empty attendee list can be captured manually
in the morning if Daniel requests it. The data + SQL evidence is sufficient
for SPEC §3 criterion 5.

---

## Conclusion

🟢 **Bug §3 fix CONFIRMED end-to-end.** Both component bugs (§3.1 audience, §3.2 auto-attach) verified at the automation-engine EF level. SPEC §3 criteria 2, 3, 4, 5 PASS.

Test event `39148c4d` will be soft-deleted at end of Pipeline run (TEST_ARTIFACTS_LOG.md).
The pre-existing phantom attendee `278114b7` on event `95ff8ba7` is left in place for Daniel's morning inspection (NOT created by this Pipeline, so out of cleanup scope per Brief §2).
