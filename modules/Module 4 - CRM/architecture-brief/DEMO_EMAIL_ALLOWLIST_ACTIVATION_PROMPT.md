# Activation: Demo Email Allowlist Infrastructure + Population

טען `opticup-strategic` ב-Full-Auto Pipeline mode.

**Brief:** `modules/Module 4 - CRM/architecture-brief/DEMO_EMAIL_ALLOWLIST_BRIEF.md`

**Mission:** Add `ui_config.test_mode_email_allowlist` jsonb infrastructure to mirror the existing SMS allowlist contract. Wire the email-sending Edge Function to respect it. Populate demo with Daniel's 3 emails. Prizma untouched (its absence of the key preserves "send to all" current behavior).

**Values for demo's email allowlist:**
- `danylis92@gmail.com`
- `daniel@prizma-optic.co.il`
- `alkimovich94@gmail.com`

Target tenant: `8d8cfa7e-ef58-49af-9702-a862d459cccb` (demo).

**Deliverables:**
- DIAGNOSIS.md identifying the email-sending EF + the SMS allowlist mirror pattern + current ui_config shape (both tenants, read-only for Prizma)
- Edge Function code change: email-sending function now respects `ui_config.test_mode_email_allowlist`
- EF redeployed successfully
- ONE row UPDATE on demo's `tenants.ui_config` using `jsonb_set` to add the email allowlist key
- Verify post-UPDATE: demo has exactly the 3 emails listed
- Verify Prizma's ui_config unchanged
- `docs/GLOBAL_SCHEMA.sql` updated with the new key documentation
- EXECUTION_REPORT.md + FINDINGS.md + FOREMAN_REVIEW.md
- DECISIONS_LOG entry

**Continuous-Run Mandate:**
- Run in ONE Claude Code chat.
- Status lines (one Hebrew line per phase) only.
- Stop only on: Iron Rule violation, EF can't be located, SMS allowlist pattern not findable.

**Destructive Operations Envelope:**
- EF code change + redeploy (one specific email-sending function)
- ONE single-row UPDATE on `tenants` for demo only (jsonb_set)
- Docs file edit (`docs/GLOBAL_SCHEMA.sql`)
- NO column adds, NO schema changes, NO DELETE
- NO touching Prizma's tenants row
- NO modifying SMS allowlist logic
- NO outbound email during the SPEC
- NO force-push, NO merge to main
- Anything outside envelope → STOP + escalate

**Pre-Flight Diagnostic (run first):**
1. Search `supabase/functions/` for the email-sending codepath — grep `sendEmail|email|smtp|sendgrid|resend|gmail`
2. Find the SMS allowlist enforcement pattern — likely in `send-message` EF — read it as the model to mirror
3. Identify where dropped recipients are logged (activity_log? console? telemetry?)
4. Read current `ui_config` shape for both demo and Prizma (read-only)
5. Save findings to DIAGNOSIS.md

**Implementation Phase:**
1. Modify the email-sending function to:
   - Read `tenant.ui_config.test_mode_email_allowlist` (jsonb array)
   - If array exists AND non-empty → filter recipients to those in the array; log dropped recipients
   - If array missing or empty → send normally (current behavior preserved for Prizma)
2. Mirror the SMS allowlist's logging pattern exactly
3. Deploy the updated EF via Supabase MCP `deploy_edge_function`

**Database UPDATE Phase:**
```sql
UPDATE tenants
SET ui_config = jsonb_set(
  COALESCE(ui_config, '{}'::jsonb),
  '{test_mode_email_allowlist}',
  '["danylis92@gmail.com", "daniel@prizma-optic.co.il", "alkimovich94@gmail.com"]'::jsonb
)
WHERE id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
```

Capture pre-value of demo's ui_config BEFORE the UPDATE — save to DIAGNOSIS.md.

**Verification Phase:**
1. SELECT demo's `ui_config->'test_mode_email_allowlist'` — must equal exactly the 3 emails
2. SELECT Prizma's `ui_config` — must NOT contain `test_mode_email_allowlist` key (verify with `ui_config ? 'test_mode_email_allowlist'` returns false)
3. SELECT Prizma's tenants row updated_at — must match pre-snapshot
4. Read updated EF code post-deploy — confirm the filter logic is present
5. Save verification to TEST_REPORT.md

**Success Criteria:**
1. DIAGNOSIS.md with EF identification + SMS pattern + ui_config shapes
2. Email EF code change deployed successfully
3. Demo's `ui_config.test_mode_email_allowlist` = exactly 3 emails listed
4. Prizma's ui_config unchanged (no new key added, updated_at identical)
5. `docs/GLOBAL_SCHEMA.sql` updated
6. `npm run verify:integrity` exit 0
7. `npm run smoke` 7/7 PASS
8. Working tree clean
9. Pushed to `origin/develop` (NOT main)
10. DECISIONS_LOG entry

**Closure:** Pipeline writes FOREMAN_REVIEW.md + 2 lessons each. End with ONE Hebrew summary:

> ✅ Demo Email Allowlist CLOSED 🟢 — תשתית email allowlist נוספה (ui_config jsonb), דמו עם 3 מיילים מותרים, Prizma ללא רגרסיה. דמו מוכן לסבב הטסטים הידני המלא.

Begin with the diagnostic phase.
