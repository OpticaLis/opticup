# ROLLBACK_SQL — PRIZMA_CRM_BUGFIX_BACKPORT

**Captured:** 2026-05-12 by Full-Auto Pipeline before applying UPDATEs.
**Purpose:** revert Prizma's 2 rules to pre-fix state if main-merge regression is found.
**Source-of-truth for pre-state:** `DIAGNOSIS.md` §1 (verbatim `action_config` rows + per-row `action_config_md5`).

If you need to roll back: copy and run the two statements below in a single SQL editor session against the Prizma project (`tsxrrxzmdxaenlvocyit`). Each statement is one row, scoped by `id` + `tenant_id`. **Do NOT bundle into a transaction with other unrelated writes.**

---

## Rollback statement #1 — rule `d2585fc4` (registration_open)

```sql
-- Restores Prizma's "אירוע פתח להרשמה - הזמנת רשימת המתנה" rule (sort_order=25)
-- to its pre-fix bug-shape. After running, the rule WILL again resolve recipients
-- via cross_event_active_waitlist and WILL again auto-attach them as 'invited'.
-- Only use if main-merge is being reverted.
UPDATE crm_automation_rules
SET action_config = '{"channels":["sms","email"],"language":"he","template_slug":"event_invite_waiting_list","recipient_type":"cross_event_active_waitlist","post_action_attendee_upsert":{"status":"invited"}}'::jsonb
WHERE id = 'd2585fc4-182d-43b2-a5a6-949ded00402e'
  AND tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';

-- Verify the rollback restored the original md5:
SELECT md5(action_config::text) AS post_rollback_md5
FROM crm_automation_rules
WHERE id = 'd2585fc4-182d-43b2-a5a6-949ded00402e';
-- Expected: 19ab6b2da49b14590d6fc108ffa3caf5
```

## Rollback statement #2 — rule `c25feaf7` (invite_waiting_list)

```sql
-- Restores Prizma's "שינוי סטטוס: הזמנה ממתינים" rule (sort_order=80)
-- to its pre-fix bug-shape. After running, the rule WILL again resolve recipients
-- via cross_event_active_waitlist and WILL again auto-attach them as 'invited'.
-- Only use if main-merge is being reverted.
UPDATE crm_automation_rules
SET action_config = '{"channels":["sms","email"],"template_slug":"event_invite_waiting_list","recipient_type":"cross_event_active_waitlist","post_action_attendee_upsert":{"status":"invited"}}'::jsonb
WHERE id = 'c25feaf7-86ae-4938-b55a-3443a8b94ff9'
  AND tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';

-- Verify the rollback restored the original md5:
SELECT md5(action_config::text) AS post_rollback_md5
FROM crm_automation_rules
WHERE id = 'c25feaf7-86ae-4938-b55a-3443a8b94ff9';
-- Expected: fc85cd5c9088a3511e13ae451e50200c
```

---

## Why rolling back is undesirable

Both rollback statements re-introduce the bug. Use only if a downstream regression — e.g., a customer-impacting issue from missing the `cross_event_active_waitlist` audience that nobody anticipated — is detected after main-merge. In that case, opening an `escalations/` entry is also required before running these statements.

The git tag `pre-backport-prizma-event-invite-fix` (annotated on HEAD `bccbc1a1a264fa9c126176e96d532d18c0e9495d`) marks the pre-write commit. Rolling back the SPEC commits via `git revert <hashes>` is a separate, code-only operation and does NOT roll back the DB rows above — the DB must be rolled back manually using these statements.

---

*End of ROLLBACK_SQL.*
