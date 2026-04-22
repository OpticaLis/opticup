# Claude Code Activation — Execute P3c+P4 Messaging Pipeline

> **Machine:** 🖥️ Windows desktop
> **Repo:** opticalis/opticup
> **Branch:** develop

---

## Context: Architecture Decision v3

On 2026-04-22, Daniel decided Make should have **zero access to Supabase**.
The old P3b scenario (9104395, 8 modules with native Supabase Search Rows + Create Row)
is being replaced by a 3-module send-only pipe.

**New architecture:**
- **Edge Function `send-message`** does everything: template fetch, variable substitution, log write
- **Make** receives a ready-to-send message and forwards via SMS or Email. 3 modules only.
- Commit `0f6fc20` documents this decision in SESSION_CONTEXT and ROADMAP.

---

## Pre-existing Dirty Repo

The repo has many uncommitted files from Cowork sessions (skill files, plugin updates,
config files, etc.). These are **NOT part of this SPEC**. Handle per CLAUDE.md §9 First
Action step 4: choose option (b) — leave them alone and use selective `git add` by filename.
Do NOT add or commit any file that isn't listed in this SPEC.

---

## Execute the SPEC

Load the `opticup-executor` skill and execute:

```
modules/Module 4 - CRM/go-live/specs/P3C_P4_MESSAGING_PIPELINE/SPEC.md
```

### Execution is split into 3 phases:

### Phase A: Edge Function (you build, full autonomy)

1. Write `supabase/functions/send-message/index.ts` per §12 Technical Design
2. Deploy to Supabase using `deploy_edge_function` MCP tool
3. Test with curl on demo tenant:
   - Template SMS: `lead_intake_new` + channel `sms` → should return success (but SMS won't actually send yet — Make scenario not built)
   - Template Email: `lead_intake_new` + channel `email` → same
   - Error path: non-existent template slug → should return error + write `crm_message_log` with status `failed`
4. Verify `crm_message_log` rows are written for each attempt
5. **Commit 1:** `feat(crm): add send-message Edge Function`

### Phase B: Make Scenario (Daniel builds, you guide — MANDATORY STOP)

**⚠️ STOP here and tell Daniel:**
> "ה-Edge Function מוכנה ועובדת. עכשיו צריך לבנות סצנריו חדש ב-Make — 3 מודולים בלבד.
> קודם תמחק את הסצנריו הישן (9104395). אחר כך אדריך אותך צעד-צעד."

Wait for Daniel to confirm. Then guide him step-by-step:

1. **Delete** old scenario 9104395 in Make
2. **Create** new scenario in Demo folder (499779)
3. **Module 1:** Custom Webhook — create and register data structure
4. **Module 2:** Router with 2 routes
5. **Route 1 (SMS):** Global SMS (connection 13198122) — `recipient_phone` as recipient, `body` as message
6. **Route 2 (Email):** Gmail (connection 13196610) — `recipient_email` as to, `subject` as subject, `body` as HTML content
7. **Activate** scenario
8. Get the new webhook URL from Daniel

After Daniel confirms the scenario is active:
- Update `crm-messaging-config.js` with the new webhook URL
- Test end-to-end: Edge Function → Make webhook → SMS actually sent

### Phase C: Wire CRM Triggers (you build, full autonomy)

1. Update `crm-messaging-send.js` — `CrmMessaging.sendMessage()` now calls the Edge Function instead of Make directly
2. Update `lead-intake` Edge Function — add `send-message` calls:
   - After new lead INSERT → call send-message with `template_slug='lead_intake_new'`, both SMS + Email
   - After duplicate detected → call send-message with `template_slug='lead_intake_duplicate'`, both SMS + Email
3. **Commit 2:** `refactor(crm): rewire CRM messaging to use Edge Function`
4. **Commit 3:** `feat(crm): wire lead-intake to send-message on new/duplicate lead`

### Phase D: End-to-end Tests (MANDATORY)

Run these tests on demo tenant (`8d8cfa7e-ef58-49af-9702-a862d459cccb`):

1. **New lead via lead-intake:** `curl POST` to lead-intake with new phone → verify SMS + Email received at +972537889878 / danylis92@gmail.com
2. **Duplicate lead:** same curl → verify duplicate SMS + Email
3. **Error path:** send-message with non-existent template → verify `crm_message_log` row with status=failed
4. **Raw broadcast:** send-message with `body` instead of `template_slug` → verify SMS sent
5. **Clean up:** delete all test rows from `crm_message_log` on demo

### Phase E: Documentation

1. Update `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — P3c+P4 CLOSED
2. Update `modules/Module 4 - CRM/go-live/ROADMAP.md` — P3c+P4 ✅
3. Update `modules/Module 4 - CRM/go-live/make-send-message.md` — full rewrite for v3 architecture
4. Update `modules/Module 4 - CRM/docs/CHANGELOG.md` — P3c+P4 section
5. **Commit 4:** `docs(crm): close P3c+P4 — messaging pipeline fully operational`
6. Write `EXECUTION_REPORT.md` + `FINDINGS.md`
7. **Commit 5:** `chore(spec): close P3C_P4_MESSAGING_PIPELINE with retrospective`

---

## Key Technical Notes

**1. Edge Function auth:** `verify_jwt: true`. CRM calls it with the user's JWT.
Lead-intake calls it with the service_role key (internal function-to-function call).

**2. Make webhook payload is simple:**
```json
{ "channel": "sms", "recipient_phone": "+972537889878", "body": "Hello" }
```
or
```json
{ "channel": "email", "recipient_email": "a@b.com", "subject": "Subject", "body": "<html>..." }
```
No template_slug, no variables, no tenant_id. Make knows NOTHING about the business.

**3. Template variables use `%name%` format** (not `{{}}`). The Edge Function does
the substitution before calling Make.

**4. Available variables (documented in SPEC §12):**
`%name%`, `%phone%`, `%email%`, `%event_name%`, `%event_date%`, `%event_time%`,
`%event_location%`, `%coupon_code%`, `%registration_url%`, `%unsubscribe_url%`

**5. Demo tenant templates already in `%name%` format:**
4 templates exist: `lead_intake_new_sms_he`, `lead_intake_new_email_he`,
`lead_intake_duplicate_sms_he`, `lead_intake_duplicate_email_he`

**6. Do NOT modify Prizma tenant data.** All testing on demo only.

**7. Budget:** 5 commits + ±1 fix. If more than 6 commits needed → stop and reassess.

**End state:** Repo clean on develop, all 14 criteria pass, Make scenario active with 3 modules,
Edge Function deployed, lead-intake triggers messaging, EXECUTION_REPORT.md + FINDINGS.md written.
