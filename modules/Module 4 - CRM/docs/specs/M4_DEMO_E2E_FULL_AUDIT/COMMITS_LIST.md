# Commits — M4_DEMO_E2E_FULL_AUDIT Pipeline run

**Run window:** 2026-05-11 19:46-19:55 UTC
**Branch:** develop
**Author:** Full-Auto Pipeline (Claude Opus 4.7 1M)

| # | Hash | Commit message (1-line) |
|---|---|---|
| 1 | `b692ca4` | `docs(spec): author M4_DEMO_E2E_FULL_AUDIT SPEC + pre-fix rule snapshot` |
| 2 | `f6245b1` | `fix(crm): redirect event_invite_waiting_list audience + remove auto-attach side-effect` |
| 3 | (pending closure commit) | `chore(spec): close M4_DEMO_E2E_FULL_AUDIT 🟢 + reports + FOREMAN_REVIEW` |

## Detail

### Commit 1 — `b692ca4`
- `modules/Module 4 - CRM/docs/specs/M4_DEMO_E2E_FULL_AUDIT/SPEC.md` (created)
- `modules/Module 4 - CRM/docs/specs/M4_DEMO_E2E_FULL_AUDIT/PRE_FIX_RULE_SNAPSHOT.json` (created)
- 340 lines inserted, 0 deleted
- Scope: SPEC authoring + rollback snapshot of the 2 affected rules + Prizma pre-state baseline

### Commit 2 — `f6245b1`
- `modules/Module 4 - CRM/docs/specs/M4_DEMO_E2E_FULL_AUDIT/POST_FIX_RULE_STATE.json` (created)
- `modules/Module 4 - CRM/docs/specs/M4_DEMO_E2E_FULL_AUDIT/FIX_VERIFICATION.md` (created)
- 151 lines inserted, 0 deleted
- Scope: Bug §3 audit trail (DB UPDATE was applied via Supabase MCP directly; the commit records the DB state pre/post + EF-level verification evidence)

### Commit 3 — (closure)
- This file + AUDIT_REPORT.md + TEST_ARTIFACTS_LOG.md + EXECUTION_REPORT.md + FINDINGS.md + FOREMAN_REVIEW.md
- + module CHANGELOG.md update + SESSION_CONTEXT.md update

## DB-side writes (not in git)

The actual fix was 2 `UPDATE` statements applied via Supabase MCP — not git-tracked because the rules table is data, not code. Audit trail of the writes:

```sql
-- Applied 2026-05-11 19:49:50 UTC
UPDATE crm_automation_rules
SET action_config = '{"channels":["sms","email"],"language":"he","template_slug":"event_invite_waiting_list","recipient_type":"leads_by_status","recipient_status_filter":["waitlist"]}'::jsonb
WHERE id = 'a06be5d8-4dd6-43fa-bb53-b0e3be07a548'
  AND tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';

UPDATE crm_automation_rules
SET action_config = '{"channels":["sms","email"],"template_slug":"event_invite_waiting_list","recipient_type":"leads_by_status","recipient_status_filter":["waitlist"]}'::jsonb
WHERE id = 'ee0a6f24-1a3e-43f4-9ea6-fc4c1d081787'
  AND tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';

-- Cleanup 2026-05-11 19:55 UTC
UPDATE crm_events SET is_deleted = true
WHERE id = '39148c4d-5213-42bb-a0fe-6e818ee5ff12'
  AND tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
```

Rollback SQL preserved in `PRE_FIX_RULE_SNAPSHOT.json`.
