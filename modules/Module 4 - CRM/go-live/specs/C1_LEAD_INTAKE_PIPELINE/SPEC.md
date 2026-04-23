# SPEC — C1_LEAD_INTAKE_PIPELINE

> **Location:** `modules/Module 4 - CRM/go-live/specs/C1_LEAD_INTAKE_PIPELINE/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-21
> **Module:** 4 — CRM
> **Phase:** C1 (Go-Live)
> **Execution environment:** Claude Code local (Windows desktop or laptop)

---

## 1. Goal

Build the complete lead intake pipeline so that when a person submits the
SuperSale registration form, their data flows into Supabase (`crm_leads`
with status `new`) and they receive SMS + Email confirmation — all without
touching Monday.com. Verify end-to-end on demo tenant with test lead
phone `0537889878`, email `danylis92@gmail.com`.

---

## 2. Background & Motivation

CRM Module 4 phases A–B9 are complete and merged to main. The CRM UI
displays imported Monday data but has no live data pipeline. Today, new
leads enter through a Monday Forms webhook → Make Scenario 1A-S → Monday
boards. This SPEC replaces that flow with: Storefront form → Make (Demo
folder) → Supabase.

The existing Make Scenario 1A-S (ID 8247377, 23 modules) is documented in
`campaigns/supersale/make/scenario-1a-supersale.md`. The full lead intake
flow is documented in `campaigns/supersale/FLOW.md` §"שלב 1: הרשמה ראשונית".

Depends on: CRM on `main` (done). No prior Go-Live SPECs.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop`, clean | `git status` → "nothing to commit" |
| 2 | CRM has "Incoming Leads" tab | 6th tab visible in crm.html sidebar | Open CRM in browser → tab labeled "לידים נכנסים" appears |
| 3 | Tier 1 tab shows leads with status in (`new`, `invalid_phone`, `too_far`, `no_answer`, `callback`) | Table renders with columns: name, phone, email, status, date, source, UTMs | Browser verification |
| 4 | Tier 1 tab has status filter | Dropdown with 5 Tier 1 statuses | Browser verification |
| 5 | Existing "Leads" tab renamed | Tab label is "רשומים" (was "לידים") | Browser verification |
| 6 | Existing "Leads" tab filters to Tier 2 only | Shows only leads with status in (`waiting`, `invited`, `confirmed`, `confirmed_verified`, `not_interested`, `unsubscribed`) | Browser verification |
| 7 | Make: Demo folder exists | Folder "Demo" created in Make team 402680 | Make API or manual check |
| 8 | Make: Demo Scenario 1A-S clone exists | Scenario in Demo folder, receives webhook, writes to Supabase | Make scenario visible and active |
| 9 | Make: Scenario reads/writes Supabase | HTTP modules point to Supabase REST API (`tsxrrxzmdxaenlvocyit.supabase.co`) | Inspect scenario modules |
| 10 | Make: Duplicate detection works | Query `crm_leads` by phone before insert | Inspect scenario logic |
| 11 | Make: SMS sent on new lead | Global SMS module fires | SMS log check after test |
| 12 | Make: Email sent on new lead | Gmail module fires (events@prizma-optic.co.il) | Gmail sent folder check after test |
| 13 | End-to-end test: new lead | Submit form with phone `0537889878` → lead appears in CRM Tier 1 tab within 30 seconds, status `new`, all UTMs populated | Browser + Supabase query |
| 14 | End-to-end test: duplicate | Submit same form again → no duplicate row, "already registered" SMS sent | Supabase query (count = 1) + SMS log |
| 15 | Message templates in DB | SMS + Email templates for lead intake stored in `crm_message_templates` | `SELECT count(*) FROM crm_message_templates WHERE trigger_event LIKE 'lead_intake%'` → ≥ 2 |
| 16 | Make reads templates from DB | Scenario fetches template text from Supabase before sending | Inspect scenario modules |
| 17 | Zero console errors | CRM page loads with 0 JS errors | Browser console check |
| 18 | All new JS files ≤ 350 lines | File line count check | `wc -l` on new files |
| 19 | Docs updated | SESSION_CONTEXT.md, CHANGELOG.md, MODULE_MAP.md | File inspection |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Read any file in the repo
- Create, edit, move files within `modules/crm/` and `crm.html` and `css/crm*.css`
- Create new JS files under `modules/crm/` for Tier 1 tab functionality
- Run read-only SQL against Supabase (Level 1)
- INSERT/UPDATE rows in `crm_message_templates` on demo tenant (Level 2 — approved for this SPEC)
- INSERT test lead rows in `crm_leads` on demo tenant for testing (Level 2 — approved)
- DELETE test lead rows (phone=`0537889878`) on demo tenant after testing (Level 2 — approved)
- Commit and push to `develop`
- Create Make scenarios via Make MCP tools (if available) or document manual steps
- Rename tab labels in crm.html
- Modify `crm-leads-tab.js` to filter by tier
- Add a new JS file for Tier 1 tab (e.g., `crm-incoming-tab.js`)
- Decide how to split UI code between Tier 1 and Tier 2 tabs
- Choose the best approach for status filtering (client-side vs separate query)
- Improve UX patterns if they see a better way (document what and why)

### What REQUIRES stopping and reporting

- Any schema change (DDL) — ALTER TABLE, CREATE TABLE, etc.
- Any modification to `js/shared.js` beyond FIELD_MAP additions
- Any modification to files outside Module 4 scope (except `index.html` MODULES config if needed)
- Any write to Prizma tenant (only demo tenant writes allowed)
- Any merge to `main`
- Make scenario changes that affect production scenarios (only Demo folder)
- Any step where actual output diverges from §3 expected values

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- If `crm_leads` table structure doesn't match §2 schema (columns missing/different) → STOP, report actual schema
- If Make MCP tools are not available → STOP, document what manual Make steps Daniel needs to do, continue with CRM-side work only
- If test lead insert fails (RLS, constraint, etc.) → STOP, report exact error
- If existing CRM tabs break after adding Tier 1 tab → STOP, do not proceed until fixed
- If any existing CRM JS file exceeds 350 lines after modifications → STOP, split first

---

## 6. Rollback Plan

- **Code:** `git reset --hard {START_COMMIT}` — no destructive DB changes
- **DB:** DELETE test rows: `DELETE FROM crm_leads WHERE phone = '0537889878' AND tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'`
- **DB:** DELETE inserted templates: `DELETE FROM crm_message_templates WHERE trigger_event LIKE 'lead_intake%' AND tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'`
- **Make:** Delete cloned scenario from Demo folder (manual — Daniel)
- SPEC marked REOPEN, not CLOSED.

---

## 7. Out of Scope (explicit)

- **Scenario 1B** (welcome email + Tier 2 move) — that's Phase C2
- **Tier 1 → Tier 2 transfer button** — that's Phase C2
- **Lead status change UI** in Tier 1 — that's Phase C2
- **Notes/updates on leads** — that's Phase C2
- **Auto-approval logic** (Tier 1 → Tier 2 automatic) — that's Phase C2
- **Event creation/opening** — that's Phase C3
- **Registration form for events** — that's Phase C4
- **Storefront demo page creation** — the form submission goes through Make webhook; the actual storefront page cloning is deferred to when we have storefront repo access. For now, test via direct webhook call (curl or Make test button)
- **Production Monday scenarios** — do NOT modify any existing Make scenario
- **WhatsApp integration** — Scenario 1WA is Phase C7
- **Any changes to the 893 existing leads** — read-only for imported data

---

## 8. Expected Final State

### New files
- `modules/crm/crm-incoming-tab.js` (~150-200 lines) — Tier 1 "לידים נכנסים" tab: fetch leads with Tier 1 statuses, render table, status filter, search

### Modified files
- `crm.html` — add 6th sidebar tab "לידים נכנסים" (icon: inbox or user-plus), add `<div id="crm-incoming-panel">` container, add `<script>` tag for new file. Rename existing leads tab label from "לידים" to "רשומים"
- `modules/crm/crm-init.js` — add `showCrmTab('incoming')` routing for new tab
- `modules/crm/crm-leads-tab.js` — add filter: only show leads where status is in Tier 2 statuses (`waiting`, `invited`, `confirmed`, `confirmed_verified`, `not_interested`, `unsubscribed`)
- `modules/crm/crm-helpers.js` — add `TIER1_STATUSES` and `TIER2_STATUSES` constants (arrays of status slugs) so both tabs can reference them
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — update to C1 status
- `modules/Module 4 - CRM/docs/CHANGELOG.md` — add C1 section
- `modules/Module 4 - CRM/docs/MODULE_MAP.md` — add new file + functions

### DB state (demo tenant only)
- `crm_message_templates`: 2+ new rows with `trigger_event` = `lead_intake_new` (SMS + Email for new lead) and `lead_intake_duplicate` (SMS for duplicate)
- Template content copied from `campaigns/supersale/FLOW.md` §"הודעות שלב 1" (exact SMS text + Email subject/summary)
- Test lead may or may not be present (cleaned up after testing)

### Make state
- Folder "Demo" exists in team 402680
- Scenario "Demo 1A-S — Lead Intake (Supabase)" exists and is active
- Scenario uses HTTP modules to: (1) query `crm_leads` by phone for duplicate check, (2) INSERT new lead with all fields, (3) query `crm_message_templates` for message text, (4) send via Global SMS + Gmail

---

## 9. Commit Plan

- **Commit 1:** `feat(crm): add Tier 1 incoming leads tab and rename Leads to Registered` — new `crm-incoming-tab.js`, modified `crm.html`, `crm-init.js`, `crm-leads-tab.js`, `crm-helpers.js`
- **Commit 2:** `feat(crm): seed lead intake message templates for Make integration` — SQL insert for `crm_message_templates` (documented in commit, executed via Supabase MCP)
- **Commit 3:** `docs(crm): document Make Demo scenario setup for C1 lead intake` — if Make scenario was created via MCP, document its configuration. If manual steps needed, write instructions file
- **Commit 4:** `docs(crm): update C1 session context, changelog, module map`
- **Commit 5:** `chore(spec): close C1_LEAD_INTAKE_PIPELINE with retrospective` — EXECUTION_REPORT.md + FINDINGS.md

---

## 10. Dependencies / Preconditions

- CRM Module 4 merged to `main` ✅ (confirmed by Daniel)
- `crm_leads` table exists with correct schema ✅ (Phase A migration)
- `crm_statuses` table seeded with lead statuses ✅ (Phase A)
- `crm_message_templates` table exists ✅ (Phase A)
- Supabase MCP available for SQL execution
- Make MCP available for scenario creation (if not → manual steps documented)
- Demo tenant exists: slug=`demo`, UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`

---

## 11. Lessons Already Incorporated

- FROM `CRM_PHASE_B9/FOREMAN_REVIEW.md` → "Environment Pre-Flight: verify
  executor can access required tools before starting" → APPLIED: §header
  specifies "Claude Code local" as execution environment; §5 has Make MCP
  availability stop-trigger with graceful fallback
- FROM `CRM_PHASE_B9/FOREMAN_REVIEW.md` → "EXECUTION_REPORT.md and
  FINDINGS.md are mandatory deliverables" → APPLIED: §9 Commit 5 explicitly
  requires both files
- FROM `CRM_PHASE_B9/FOREMAN_REVIEW.md` → "All findings must be in
  FINDINGS.md, not just session output" → APPLIED: noted in §9
- FROM `CRM_PHASE_B9/FOREMAN_REVIEW.md` → "M4-UX-06: No add-lead button" →
  ADDRESSED: C1 builds the incoming leads tab which is the natural home for
  a future "add lead" button (C2 scope)
- Cross-Reference Check completed 2026-04-21 against CRM_SCHEMA_DESIGN.md v3
  and MODULE_MAP.md: 0 collisions. New file `crm-incoming-tab.js` does not
  conflict with any existing file. New constants `TIER1_STATUSES` /
  `TIER2_STATUSES` do not conflict with existing globals (grepped).

---

## 12. Make Scenario Architecture (Reference for Executor)

The new Demo Scenario 1A-S should follow this flow:

```
Webhook (receives form data: name, phone, email, eye_exam, notes, terms, marketing, UTMs)
  ↓
HTTP Module: GET crm_leads?phone=eq.{phone}&tenant_id=eq.{DEMO_TENANT_ID}
  ↓
Router:
  ├─ Lead exists (array length > 0):
  │   ├─ HTTP: GET crm_message_templates?trigger_event=eq.lead_intake_duplicate
  │   ├─ Global SMS: send template text (interpolated with {{name}})
  │   └─ (optional) Gmail: send "already registered" email
  │
  └─ Lead does NOT exist (array length = 0):
      ├─ HTTP: POST crm_leads (insert new lead with all fields + UTMs)
      ├─ HTTP: GET crm_message_templates?trigger_event=eq.lead_intake_new
      ├─ Global SMS: send SMS template (interpolated)
      ├─ Gmail: send welcome email template
      └─ HTTP: POST crm_message_log (log sent messages)
```

**Supabase REST API pattern:**
- Base URL: `https://tsxrrxzmdxaenlvocyit.supabase.co/rest/v1/`
- Headers: `apikey: {anon_key}`, `Authorization: Bearer {service_role_key}`,
  `Content-Type: application/json`, `Prefer: return=representation`
- For tenant-scoped reads: filter with `tenant_id=eq.{UUID}`
- For inserts: include `tenant_id` in body

**Important:** Use `service_role` key (not anon) in Make HTTP modules because
RLS requires JWT with tenant_id claim. Service role bypasses RLS. The key
lives in Make connection settings, never in code or docs.

---

## 13. Test Protocol

After building, execute these tests in order:

### Test 1: CRM UI — Tier 1 tab
1. Open CRM in browser (localhost:3000/crm.html or production URL)
2. Verify "לידים נכנסים" tab appears in sidebar
3. Click tab → table renders (may be empty on demo)
4. Verify status filter dropdown works
5. Verify "רשומים" tab still works with existing leads

### Test 2: Make webhook — new lead
1. Trigger webhook with test payload:
   ```json
   {
     "name": "Test Lead",
     "phone": "0537889878",
     "email": "danylis92@gmail.com",
     "eye_exam": "כן",
     "notes": "test from C1 SPEC",
     "terms_approved": true,
     "marketing_consent": true,
     "utm_source": "facebook",
     "utm_medium": "cpc",
     "utm_campaign": "demo_test",
     "utm_content": "c1_spec",
     "utm_term": "test"
   }
   ```
2. Check Supabase: `SELECT * FROM crm_leads WHERE phone = '0537889878' AND tenant_id = '8d8cfa7e-...'`
3. Verify all fields populated correctly
4. Check SMS log (Global SMS dashboard)
5. Check Gmail sent folder

### Test 3: Duplicate detection
1. Trigger same webhook again with same phone
2. Verify no new row created in `crm_leads`
3. Verify "already registered" SMS sent

### Test 4: CRM reflects new data
1. Refresh CRM page
2. Verify test lead appears in "לידים נכנסים" tab with status "חדש"
3. Verify test lead does NOT appear in "רשומים" tab

### Cleanup
- DELETE test lead: `DELETE FROM crm_leads WHERE phone = '0537889878' AND tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'`
- Or leave for C2 testing (executor's judgment)
