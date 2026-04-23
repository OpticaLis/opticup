# Claude Code — Execute P5 Message Content SPEC

> **Machine:** 🖥️ Windows desktop
> **Repo:** opticalis/opticup
> **Branch:** develop
> **Skill:** Load `opticup-executor`

---

## Context

P5 is a content-authoring SPEC. No new code features, no schema changes. The
messaging pipeline is already operational (P3c+P4 ✅). P5 fills it with real
content: SMS text and HTML email templates for all 10 SuperSale campaign triggers.

**SPEC location:** `modules/Module 4 - CRM/go-live/specs/P5_MESSAGE_CONTENT/SPEC.md`

Read the full SPEC before executing. It has everything: success criteria (§3),
autonomy envelope (§4), technical design (§12), execution sequence (§13).

---

## Pre-Flight

1. Session start protocol (CLAUDE.md §1) — verify repo, branch, pull latest
2. Read the SPEC: `modules/Module 4 - CRM/go-live/specs/P5_MESSAGE_CONTENT/SPEC.md`
3. Read the content source: `campaigns/supersale/FLOW.md`
4. Read the HTML email templates: `campaigns/supersale/messages/*.html` (10 files)
5. Read the current UI file: `modules/crm/crm-messaging-templates.js`
6. Check existing templates on demo: `SELECT slug, channel, name FROM crm_message_templates WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb' ORDER BY slug`

---

## Execution (follow SPEC §13)

### Commit 1: UI Variable Format Fix

Edit `modules/crm/crm-messaging-templates.js`:
- Replace VARIABLES array (line ~11–21): change all `{{var}}` keys to `%var%` keys
- Add `%email%` entry (was missing): `{ key: '%email%', desc: 'אימייל' }`
- Update key names: `event_address` → `event_location`, `coupon` → `coupon_code`, `registration_link` → `registration_url`, `unsubscribe_link` → `unsubscribe_url`
- Replace `substitute()` function (line ~253–264): change all `{{var}}` regex to `%var%` regex
- Add `%email%` substitution line to `substitute()`
- Update preview values to match Prizma defaults (see SPEC §12)
- Verify file ≤350 lines

```
git add modules/crm/crm-messaging-templates.js
git commit -m "fix(crm): convert template editor variables from {{}} to %var% format"
```

### Commit 2: Seed All Templates

**Method:** Write a SQL file with all INSERT statements, then execute via Supabase MCP.

1. Create `modules/Module 4 - CRM/go-live/seed-templates-demo.sql` with:
   - DELETE existing templates on demo tenant (clean start): `DELETE FROM crm_message_templates WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'`
   - INSERT 20 templates (10 SMS + 10 Email) using the slugs from SPEC §12

2. For SMS bodies: copy text from FLOW.md, replace Make variables with `%var%`:
   - `{{name}}` (any variant) → `%name%`
   - `{{shortURL}}` / unsubscribe URLs → `%unsubscribe_url%`
   - `{{shortURL_registration}}` → `%registration_url%`
   - `{{event_name}}` (any variant) → `%event_name%`
   - `{{event_date}}` (any variant) → `%event_date%`
   - `{{event_hours}}` → `%event_time%`

3. For Email bodies: read each HTML file from `campaigns/supersale/messages/`, do the same variable replacement on the full HTML, then INSERT with the HTML as the `body` field. Extract subject from the file's comment header.

4. Execute the SQL on demo tenant via Supabase MCP `execute_sql`.

5. Verify:
   - `SELECT count(*) FROM crm_message_templates WHERE tenant_id = '8d8cfa7e-...' AND is_active = true` → ≥20
   - `SELECT slug, channel FROM crm_message_templates WHERE tenant_id = '8d8cfa7e-...' AND body LIKE '%{{%'` → 0 rows
   - Spot-check one SMS body: `SELECT body FROM crm_message_templates WHERE slug = 'lead_intake_new_sms_he' AND tenant_id = '8d8cfa7e-...'` → contains `%name%`

```
git add modules/Module\ 4\ -\ CRM/go-live/seed-templates-demo.sql
git commit -m "feat(crm): seed all SuperSale message templates on demo tenant"
```

### Browser QA

Open CRM on `localhost:3000/crm.html?t=demo` → Messaging Hub → Templates tab:
- Template list shows ≥20 templates
- Click any template → editor loads with content
- Variable dropdown shows `%var%` format (10 variables)
- 3-panel preview substitutes correctly
- 0 console errors

### Commit 3: Documentation

Update:
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — P5 CLOSED with template count
- `modules/Module 4 - CRM/go-live/ROADMAP.md` — P5 ✅

```
git add modules/Module\ 4\ -\ CRM/docs/SESSION_CONTEXT.md modules/Module\ 4\ -\ CRM/go-live/ROADMAP.md
git commit -m "docs(crm): update P5 session context and changelog"
```

### Commit 4: Retrospective

Write EXECUTION_REPORT.md + FINDINGS.md in the SPEC folder.

```
git add modules/Module\ 4\ -\ CRM/go-live/specs/P5_MESSAGE_CONTENT/
git commit -m "chore(spec): close P5_MESSAGE_CONTENT with retrospective"
git push origin develop
```

---

## Budget

4 commits (±1 fix). No schema changes. No Edge Function changes.

## Key Files

| File | Action |
|------|--------|
| `modules/crm/crm-messaging-templates.js` | EDIT — variable format fix |
| `modules/Module 4 - CRM/go-live/seed-templates-demo.sql` | CREATE — template seed SQL |
| `campaigns/supersale/FLOW.md` | READ — SMS content source |
| `campaigns/supersale/messages/*.html` | READ — email content source |
| `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` | EDIT — P5 CLOSED |
| `modules/Module 4 - CRM/go-live/ROADMAP.md` | EDIT — P5 ✅ |
