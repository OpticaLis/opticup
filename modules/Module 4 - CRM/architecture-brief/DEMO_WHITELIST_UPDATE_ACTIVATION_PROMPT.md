# Activation: Demo Tenant — Whitelist Update for Manual Test Cycle

טען `opticup-strategic` ב-Full-Auto Pipeline mode.

**Brief:** `modules/Module 4 - CRM/architecture-brief/DEMO_WHITELIST_UPDATE_BRIEF.md`

**Mission:** Update demo tenant's SMS + Email whitelist to Daniel's contact channels before his manual test cycle. Diagnose field shapes first, apply single-row UPDATE(s) scoped to demo only, verify.

**Whitelist values to apply:**

Phones:
- `0537889878`
- `0503348349`
- `0507168471`

Emails:
- `danylis92@gmail.com`
- `daniel@prizma-optic.co.il`
- `alkimovich94@gmail.com`

Target tenant: `8d8cfa7e-ef58-49af-9702-a862d459cccb` (demo).

**Deliverables:**
- `DIAGNOSIS.md` documenting field paths + demo's pre-UPDATE values + Prizma's read-only shape inspection
- UPDATE(s) applied to demo row only
- Post-UPDATE SELECT verifies values are exactly the 6 listed
- Prizma row untouched (compare updated_at pre/post)
- EXECUTION_REPORT.md + FINDINGS.md + FOREMAN_REVIEW.md
- DECISIONS_LOG entry
- OPEN_TASKS.md update if needed

**Continuous-Run Mandate:**
- Run in ONE Claude Code chat.
- No mid-pipeline questions UNLESS the email whitelist mechanism does not exist (planned escalation).
- Status lines (one Hebrew line per phase) only.

**Destructive Operations Envelope:**
- 1-2 single-row UPDATE(s) on `tenants` for demo only
- NO schema changes (no ADD COLUMN)
- NO touching Prizma's row
- NO code changes (no Edge Function, no RPC modifications)
- NO outbound test message
- NO force-push
- NO merge to main
- Anything outside envelope → STOP + escalate

**Diagnostic Phase (run first, read-only):**
1. `SELECT column_name FROM information_schema.columns WHERE table_name = 'tenants' AND (column_name LIKE '%allowlist%' OR column_name LIKE '%whitelist%' OR column_name LIKE '%test_mode%');`
2. `SELECT id, test_mode_sms_allowlist, ui_config FROM tenants WHERE id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';` (or whatever fields surfaced in step 1)
3. Same SELECT for Prizma (read-only, to compare shape)
4. Determine: does an email whitelist field exist? At column level? Inside ui_config jsonb? Or does the send-message EF use a different mechanism for email filtering?

Write DIAGNOSIS.md with findings.

**Fix Phase:**

Path A (SMS whitelist field exists):
```sql
UPDATE tenants
SET test_mode_sms_allowlist = ARRAY['0537889878', '0503348349', '0507168471']
WHERE id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
```

Path B (Email whitelist field exists):
```sql
UPDATE tenants
SET <email_whitelist_field> = ARRAY['danylis92@gmail.com', 'daniel@prizma-optic.co.il', 'alkimovich94@gmail.com']
WHERE id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
```

If email whitelist field is jsonb path (e.g. `ui_config->'whitelist'->'emails'`) — use `jsonb_set` accordingly.

Path C (Email whitelist mechanism does not exist):
- STOP and escalate. Don't auto-add a column.
- Write escalation: "Email whitelist mechanism not found. Options: (1) add column to tenants table — schema change; (2) add jsonb key to ui_config — soft; (3) accept that email filtering is currently uncontrolled. Recommend option (2) for minimal disruption."

**Verification Phase:**
1. SELECT demo's row — confirm exactly 3 phones + (3 emails if Path B) present
2. SELECT Prizma's row updated_at vs pre-snapshot — must be identical (no Prizma write)
3. Save verification to TEST_REPORT.md

**Success Criteria:**
1. DIAGNOSIS.md exists with field paths
2. Demo's SMS whitelist = exactly the 3 phones
3. Demo's Email whitelist = exactly the 3 emails (OR escalation logged with Architect decision)
4. Prizma's row untouched (updated_at identical)
5. No code changes
6. `npm run verify:integrity` exit 0
7. Working tree clean
8. Pushed to `origin/develop`
9. DECISIONS_LOG entry

**Closure:** Pipeline writes FOREMAN_REVIEW.md + 2 lessons each. End with ONE Hebrew summary:

> ✅ Demo Whitelist Update CLOSED 🟢 — 3 מספרים + 3 מיילים מותרים בדמו. Prizma ללא רגרסיה. דמו מוכן לסבב הטסטים הידני.

Begin with diagnosis.
