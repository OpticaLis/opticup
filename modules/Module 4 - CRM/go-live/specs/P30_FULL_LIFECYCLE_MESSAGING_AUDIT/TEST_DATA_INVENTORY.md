# TEST_DATA_INVENTORY — P30_FULL_LIFECYCLE_MESSAGING_AUDIT

> Every Prizma row created/modified during P30, with restore SQL.

---

## Status: **NO ROWS CREATED OR MODIFIED**

P30 was halted before live-fire (see EXECUTION_REPORT.md). All operations this session were read-only:

- `SELECT` against `crm_leads`, `crm_message_templates`, `crm_automation_rules`, `information_schema.columns`, `cron.job`, `pg_indexes`
- `mcp__claude_ai_Supabase__get_edge_function` (read-only EF source code)
- `mcp__chrome-devtools__list_pages` + `mcp__chrome-devtools__select_page` + `mcp__chrome-devtools__evaluate_script` (read-only browser inspection of `app.opticalis.co.il`)
- Local file writes only inside the SPEC folder

## Restore SQL

| id | tenant | type | scenario | pre-state | post-state | restore SQL |
|---|---|---|---|---|---|---|

*(intentionally empty — no rows changed)*

## Verification

```sql
SELECT count(*) FROM crm_leads
 WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
   AND created_at > '2026-04-30 00:00:00+03'::timestamptz;
-- expected: 0 P30-introduced leads

SELECT count(*) FROM crm_events
 WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
   AND created_at > '2026-04-30 00:00:00+03'::timestamptz;
-- expected: 0 P30-introduced events

SELECT count(*) FROM crm_message_log
 WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
   AND created_at > '2026-04-30 03:00:00+03'::timestamptz;
-- expected: 0 P30-introduced messages
```

---

*Inventory empty by design. Restore is a no-op. Once P30 resumes (post-deploy), this file gets the live-fire row inventory.*
