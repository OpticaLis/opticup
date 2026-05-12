# Prizma CRM Bug Fix Backport — Auto-Attach + Wrong Audience

**Brief version:** v1
**Date:** 2026-05-12
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Full Auto Pipeline (single chat)
**Owning module:** Module 4 — CRM
**Severity:** HIGH — bug is actively affecting Prizma production

---

## 1. Purpose

The bug fixed in demo on 2026-05-11 (E2E audit SPEC) is **still active in Prizma production**. Every event Prizma opens for registration:
1. Sends `event_invite_waiting_list` template to the wrong audience (all Tier 2 leads, not just main-board waitlist leads)
2. Auto-attaches every recipient to the new event under `status='invited'`, preempting capacity

This SPEC ports the demo fix to Prizma's `crm_automation_rules` rows. Same data-only change, applied to Prizma's tenant_id with appropriate caution since this is production.

The fix is data-only (UPDATE on 2 rows in `crm_automation_rules`). No code changes needed — the `leads_by_status` resolver and the absence of `post_action_attendee_upsert` already work on both tenants.

## 2. Strategy: Mirror Demo's Fix to Prizma

### Demo's fix (already shipped 2026-05-11)

Two rules updated:
- Rule `a06be5d8` "אירוע פתח להרשמה - הזמנת רשימת המתנה" (trigger: `registration_open`)
- Rule `ee0a6f24` "שינוי סטטוס: הזמנה ממתינים" (trigger: `invite_waiting_list`)

For each, `action_config` was changed from:
```json
{
  "recipient_type": "cross_event_active_waitlist",
  "post_action_attendee_upsert": {"status": "invited"},
  ...other fields preserved
}
```
to:
```json
{
  "recipient_type": "leads_by_status",
  "recipient_status_filter": ["waitlist"],
  ...other fields preserved
  // post_action_attendee_upsert: REMOVED
}
```

### Prizma's expected equivalent

Prizma should have rules with the SAME template_slug + trigger combination but with Prizma's `tenant_id`. The Pipeline locates them via:
```sql
SELECT id, name, action_config
FROM crm_automation_rules
WHERE tenant_id = <prizma_uuid>
  AND (action_config->>'template_slug' = 'event_invite_waiting_list'
       OR name LIKE '%רשימת המתנה%');
```

If Prizma's rules are structurally identical to demo's pre-fix state → apply the same fix.
If Prizma's rules already differ in some way (someone fixed them already, or they were structured differently from day 1) → STOP and escalate with the actual content.

## 3. Pre-Flight Verification

Before any write to Prizma, the Pipeline MUST:

1. **Query Prizma's rules** matching the criteria above. Save the actual rows to `DIAGNOSIS.md`.
2. **Compare to demo's POST-fix rules** (which are the target state).
3. **Compare to demo's PRE-fix snapshot** from the predecessor E2E audit SPEC's reports.
4. **Decide the fix:**
   - If Prizma's rules look like demo's pre-fix → apply the exact same UPDATE (Path A — confident)
   - If Prizma's rules differ structurally from demo's pre-fix → STOP and escalate with the actual content (Path B — needs Architect inspection)
5. **Document the comparison** in DIAGNOSIS.md as a side-by-side table.

## 4. Fix Application

If Path A:

```sql
-- Capture pre-state for rollback
SELECT id, action_config, updated_at
FROM crm_automation_rules
WHERE tenant_id = <prizma_uuid>
  AND id IN (<list-of-rule-ids>);
-- Save output to DIAGNOSIS.md before UPDATE

-- Apply fix (one UPDATE per rule, atomic)
BEGIN;
UPDATE crm_automation_rules
SET action_config =
  (action_config - 'post_action_attendee_upsert')
  || jsonb_build_object(
       'recipient_type', 'leads_by_status',
       'recipient_status_filter', '["waitlist"]'::jsonb
     )
WHERE id = <rule-id-1> AND tenant_id = <prizma_uuid>;
-- repeat per rule
COMMIT;
```

Verify post-state matches demo's post-fix pattern.

## 5. Localhost-Tester Verification (MANDATORY)

After the UPDATE, the Localhost-Tester MUST verify:

1. **Read-only inspection** of Prizma's updated rules — confirm `recipient_type='leads_by_status'` + `recipient_status_filter=['waitlist']` + no `post_action_attendee_upsert` key.
2. **EF dry-run** — invoke `automation-engine` in `mode='evaluate'` for Prizma tenant + a hypothetical event status change. **DO NOT send actual messages.** Verify the plan_items target only `crm_leads.status='waitlist'` leads on the main board, and 0 attendees would be created.
3. **Compare to pre-fix behavior** — if possible, query historical activity_log entries from the past week for Prizma to see how many leads were wrongly auto-attached. Document the impact (not for action, just awareness).

If the dry-run reveals the fix doesn't behave correctly on Prizma's data → `git revert` the UPDATE via the rollback snapshot, STOP, escalate.

## 6. Merge-to-Main Authorization Gate

Per the existing Iron Rule on `main` access: **only Daniel can authorize merge to main, after QA on demo.**

This SPEC ships the fix to `develop`. The merge to `main` is a separate, Daniel-only action via the GitHub PR flow. The Pipeline writes a clear "READY-FOR-MAIN-MERGE.md" file in the SPEC folder when develop work is complete, with the exact PR title + body + URL pattern.

## 7. Scope — Out

- Schema changes
- Code changes to `automation-engine` EF or any other code
- Touching Prizma's `tenants` row
- Touching demo's rules (already fixed)
- Touching other tenants if they exist
- Reaching into past activity_log entries to "undo" past wrong auto-attaches — those are historical data, not fixable retroactively without high risk
- Adding new automation rules
- Building a regression test (covered by demo's existing tests)

## 8. Locked Decisions

| # | Decision | Source |
|---|---|---|
| 1 | Backport demo's fix to Prizma's matching rules | Daniel 2026-05-12 |
| 2 | Pre-flight read of Prizma's actual rules before any write | Architect 2026-05-12 |
| 3 | If Prizma's rules don't match demo's pre-fix shape → escalate, don't auto-fix | Architect 2026-05-12 |
| 4 | EF dry-run on Prizma in evaluate mode (no actual sends) | Architect 2026-05-12 |
| 5 | Ship to develop; main-merge is Daniel-only | Iron Rule existing |
| 6 | Pre-commit git tag `pre-backport-prizma-event-invite-fix` | Architect 2026-05-12 |
| 7 | Continuous-Run Mandate with planned escalation on structural mismatch | Architect 2026-05-12 |

## 9. Quality Bar — Acceptance Criteria

1. `DIAGNOSIS.md` documents Prizma's rules pre-fix + comparison to demo's post-fix shape
2. If Path A: 2 UPDATEs on `crm_automation_rules` for Prizma tenant only
3. Post-UPDATE: Prizma's `action_config` for the 2 rules matches demo's post-fix `action_config` structure
4. EF dry-run on Prizma (evaluate mode) produces correct recipient list + 0 attendee inserts (logged in TEST_REPORT.md)
5. Demo's rules unchanged (verified via SELECT — `action_config` byte-identical to post-E2E-audit state)
6. `READY-FOR-MAIN-MERGE.md` created with PR title/body
7. Pre-commit git tag exists
8. `npm run verify:integrity` exit 0
9. `npm run smoke` 7/7 PASS
10. Working tree clean
11. Pushed to `origin/develop` (NOT main — Daniel does that separately)

## 10. Destructive Operations

Declared:
- **2 single-row UPDATEs** on `crm_automation_rules` (tenant_id = Prizma's UUID, scoped to the specific rule IDs)
- Pre-commit git tag creation

Forbidden:
- ANY write to Prizma's `tenants` row
- ANY write to demo's rules (already fixed — must verify byte-identical to E2E audit close state)
- ANY DELETE
- ANY schema change
- ANY code change
- Sending any live message during verification
- Force-push
- Direct push or merge to `main` (the PR flow is Daniel-only)

If Prizma's rules don't match demo's pre-fix shape → STOP + escalate (Path B). Do NOT improvise a different fix.

## 11. Continuous-Run Mandate

Run end-to-end in ONE Claude Code chat. Stop on:
- Iron Rule 31/32 violation
- Prizma's rules structurally differ from demo's pre-fix → escalate (Path B)
- EF dry-run shows the fix doesn't behave correctly → rollback + escalate
- Any sign of writing to demo's rules accidentally (signal of code bug — STOP immediately)

## 12. Anti-Patterns

- DO NOT improvise a different fix shape if Prizma's rules don't match expected pre-fix — escalate instead
- DO NOT send any test message
- DO NOT write to demo's rules (they're done)
- DO NOT auto-merge to main — even if everything looks perfect
- DO NOT touch historical activity_log entries
- DO NOT skip the EF dry-run — Prizma is production; we verify before relying on the fix

## 13. References

- Predecessor SPEC: `modules/Module 4 - CRM/docs/specs/M4_DEMO_E2E_FULL_AUDIT/`
- Demo's fix audit: `M4_DEMO_E2E_FULL_AUDIT/AUDIT_REPORT.md` + `FIX_VERIFICATION.md`
- The 2 rule IDs from demo's fix (Prizma's IDs will differ, found via tenant_id + name/template_slug match)
- Auto-memory `feedback_production_discipline_post_cutover.md` — Prizma is LIVE, treat with care
- Auto-memory `feedback_main_merge_via_pr.md` — main-merge is GitHub PR, never direct push

---

*End of brief.*
