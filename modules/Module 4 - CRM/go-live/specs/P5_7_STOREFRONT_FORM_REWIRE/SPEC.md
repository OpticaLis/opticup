# SPEC — P5_7_STOREFRONT_FORM_REWIRE

> **Module:** Module 4 — CRM
> **Cross-repo:** the bulk of code edits land in `opticalis/opticup-storefront`, but the SPEC + retrospective lives in this ERP repo per Authority Matrix.
> **Location:** `modules/Module 4 - CRM/go-live/specs/P5_7_STOREFRONT_FORM_REWIRE/`
> **Authored by:** opticup-strategic (Foreman) — 2026-04-29
> **Status:** READY FOR EXECUTION — **CUTOVER-BLOCKING**, must complete before 2026-05-03 morning.
> **Estimated effort:** 3–5h.
> **Origin:** Discovered 2026-04-29 during QA: storefront form posts to `/api/leads/submit` → `cms_leads`, NOT to lead-intake EF → `crm_leads`. The 2026-05-03 cutover assumes the EF is the production entry point. Without this rewire, real customer leads on cutover day silently land in the legacy `cms_leads` table and never trigger T1/T2/T5 messaging.

---

## 1. Goal

Repoint the SuperSale lead-intake form on the storefront from the legacy `/api/leads/submit` Astro endpoint to the `lead-intake` Supabase Edge Function, so cutover-day customer submissions land in `crm_leads` and trigger the V2 automation pipeline (T1/T2/T5 templates, attendee upsert, automation_runs visibility) end-to-end.

---

## 2. Background & Motivation

### Current production pipeline (legacy)
```
SuperSale form on prizma-optic.co.il
    │ POST /api/leads/submit
    ▼
opticup-storefront/src/pages/api/leads/submit.ts
    ├─► INSERT cms_leads (storefront-side table, NOT crm_leads)
    ├─► Resend.emails.send() → service@prizma-optic.co.il (notification only, not automation)
    └─► fetch(make_webhook_url) IF configured per-component
```
- `cms_leads` is the storefront's own lead table, never read by the CRM.
- T1/T2/T5 templates never fire for these leads.
- automation-history is empty for storefront-originated leads.

### Cutover destination (this SPEC ships)
```
SuperSale form on prizma-optic.co.il
    │ POST {SUPABASE_URL}/functions/v1/lead-intake
    ▼
supabase/functions/lead-intake (v16, deployed 2026-04-29)
    ├─► validate (incl. email-required as of v16)
    ├─► dup check on (tenant_id, phone)
    ├─► INSERT crm_leads
    ├─► open crm_automation_runs synthetic row
    ├─► dispatch T1/T2/T5 via send-message EF
    └─► (if active event) upsert crm_event_attendees + dispatch T5
```
- Real customer leads land in `crm_leads`, get T1/T2/T5 messages, show up in CRM admin "לידים נכנסים" tab, automation-history populates.

### Why this is cutover-blocking
On 2026-05-03 morning Daniel ships V2 to production. If the storefront still posts to `/api/leads/submit`:
- Real customer leads land in `cms_leads`, never reach CRM admin.
- Operators monitoring "לידים נכנסים" see nothing.
- T1/T2/T5 messages never go out — every customer is silent-dropped.
- The entire V2 cutover effort is functionally a no-op for new customer traffic.

### Why this is its own SPEC (not folded into the cutover-day work)
The rewire has 4 distinct moving parts (storefront form, validation, EF integration, legacy-table migration) that each need verification windows. Bundling them into the cutover-morning checklist is asking for a rollback. Land them separately, verify independently, then the cutover-morning work is just "flip the env flag."

---

## 3. Success Criteria (Measurable)

### Part A — Storefront form code change

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| A1 | The SuperSale lead form's submit handler calls `${SUPABASE_URL}/functions/v1/lead-intake` (not `/api/leads/submit`) | grep target script | `grep -rn "functions/v1/lead-intake" opticup-storefront/src/` |
| A2 | Request body matches the EF's contract: `{ tenant_slug, name, phone, email, language, source, terms_approved, marketing_consent, utm_*, eye_exam?, notes? }` | exact key set | code review + deno-style EF unit test |
| A3 | Authorization header carries the legacy-format anon key (not the `sb_publishable_*` key) — the EF gateway rejects the new format. Same constant inlined in `dispatch.ts:18`. | header value matches | grep |
| A4 | Form's tenant_id is replaced by `tenant_slug` (the EF resolves slug → tenant_id server-side) | `tenant_slug:'prizma'` in payload, `tenant_id` absent | grep |
| A5 | Source field is `'supersale_form'` (the EF default) so cms_leads/crm_leads can be reconciled in audit | grep | grep |

### Part B — Client-side validation (Hebrew + RTL)

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| B1 | Email field has `<input type="email" required>` + JS regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` validation on input event | both present | grep |
| B2 | Phone field has `<input type="tel" required pattern="0\d{9}">` + JS regex `/^0\d{9}$/` on input event (matches lead-form-validation.ts mirror) | both present | grep |
| B3 | Submit button is disabled until BOTH phone + email pass real-time validation (button.disabled = true on load) | manual UAT | chrome-devtools |
| B4 | Inline `<span class="sc-field-error">` under each invalid field shows Hebrew error message (matches lead-form-validation.ts copy exactly) | "אנא הזינו מספר טלפון תקין (למשל 0537889878)" / "אנא הזינו כתובת מייל תקינה (למשל name@example.com)" | manual UAT |
| B5 | On submit failure, branded modal shows the SPECIFIC error per failure type, exactly as ee282af shipped to the storefront's lead-form shortcode: phone format / email format / server-side / network. NOT a generic "שגיאה". | manual UAT | chrome-devtools |
| B6 | The form REUSES `lead-form-validation.ts` from the lead-form shortcode (already deployed at storefront `ee282af`). DO NOT duplicate the modal/validation code in a new file. | grep — should see one source | grep |

### Part C — End-to-end happy path

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| C1 | Submit a fresh form on prizma-optic.co.il SuperSale page with a brand-new (allowlisted, demo) phone + valid email + tenant_slug=prizma. EF returns 201. | curl + manual | UAT |
| C2 | New row visible in `crm_leads` with: full_name, phone (canonical E.164 +972...), email (lowercased? — see Part D), source='supersale_form', terms_approved=true if box checked, language='he' | DB query | SELECT |
| C3 | If an active event exists in Prizma with status='registration_open', a `crm_event_attendees` row is created for the lead with status='invited'; lead.status syncs to 'invited' via `sync_lead_status_from_attendee`. T5 (event_invite_new) message sent. | DB + Make exec log | SELECT + MCP |
| C4 | If no active event, T1 (lead_intake_new) SMS+email sent. Daniel's phone receives the SMS. | Daniel UAT | Daniel confirms |
| C5 | `crm_automation_runs` row exists with `trigger_type='lead_intake'`, `rule_name='ליד חדש לאירוע פעיל (T5)'` or `'ליד חדש — ברוך הבא (T1)'`, status='completed', sent_count matches log | DB query | SELECT |
| C6 | `crm_message_log` rows carry `run_id` linking back to the run row | DB query | SELECT |
| C7 | CRM admin "לידים נכנסים" tab shows the new lead within 5 seconds of submission | manual UAT | chrome-devtools on app.opticalis.co.il |

### Part D — Edge cases (tested in browser)

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| D1 | Submit duplicate phone on existing lead → EF 409, T2 (lead_intake_duplicate) fires, NO new row | DB count unchanged + Make exec | SELECT + MCP |
| D2 | Submit with phone in `053-788-9878` format → normalized to `+972537889878` and stored | DB | SELECT |
| D3 | Submit with email `Daniel@PRIZMA-OPTIC.CO.IL` → stored as-typed (no lowercasing) **OR** lowercased — pick one and document. Recommendation: lowercase at EF level for canonicalization. If lowercasing chosen, add to lead-intake EF (1-line patch). | DB | SELECT |
| D4 | Submit with empty email → form prevents submission (B3); if bypassed via DevTools, EF returns 400 'Missing email' (already enforced as of v16) | manual UAT + curl | direct EF curl |
| D5 | Submit with very long Hebrew name (>200 chars) → accepted, stored, no truncation in DB or templates | DB | SELECT |
| D6 | Submit with special chars (₪, 🎉, RTL marks) in name → stored verbatim, T1 SMS renders correctly | DB + Daniel UAT | SELECT + Daniel confirms |
| D7 | Network failure during submit (chrome-devtools offline mode) → branded modal shows "אין חיבור לאינטרנט. בדקו את החיבור ונסו שנית." | manual UAT | chrome-devtools offline |

### Part E — Legacy `cms_leads` decision

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| E1 | Decision documented: stop writing new rows to `cms_leads` (preferred) OR write to BOTH cms_leads + crm_leads during a transition period (defense-in-depth) | doc in EXECUTION_REPORT.md | review |
| E2 | If "stop writing": the storefront's `/api/leads/submit` Astro endpoint is either (a) deleted, (b) repurposed to call the EF and DELETE the cms_leads insert, or (c) left in place but unreferenced. Daniel chooses (a) or (c) at execution time. | code review | grep |
| E3 | If "write to both": ensure the EF's duplicate check picks up cms_leads-originated leads — but they're in a different table, so this is impossible. Therefore "write to both" is NOT recommended — flag it. | doc | review |
| E4 | Existing `cms_leads` rows on Prizma (any?) are migrated to `crm_leads` via a one-time migration script in this SPEC folder, OR explicitly left as historical artifact (Daniel decides). Pre-flight count: `SELECT COUNT(*) FROM cms_leads WHERE tenant_id='6ad0781b-...';` — captured in EXECUTION_REPORT.md §10. | one-time SQL | review |

### Part F — Production verification

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| F1 | Pre-prod: rewire deployed to a Vercel preview environment first; Daniel submits 1 test from the preview URL | Daniel confirms | UAT |
| F2 | Prod: storefront main branch deploys with the rewire; Daniel submits 1 test from prizma-optic.co.il | Daniel confirms | UAT |
| F3 | The storefront's old `/api/leads/submit` endpoint is monitored for 24h post-rewire to confirm it receives 0 calls (no orphaned form caching, no other surfaces still posting to it) | endpoint hit count = 0 | Vercel logs |
| F4 | Cutover-day rollback plan: if the rewire breaks production, revert to the legacy `/api/leads/submit` is a 1-commit revert + Vercel redeploy (~3 min). Document this in §6 Rollback Plan. | doc | review |

### Part G — Documentation + integrity

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| G1 | `opticup-storefront/CLAUDE.md` updated with the new lead-flow path (replace the `/api/leads/submit` description in §architecture) | grep | review |
| G2 | `docs/GLOBAL_MAP.md` (ERP repo) gains a "Lead intake" contract entry pointing at the EF | grep | review |
| G3 | Iron Rule 31 integrity gate green on every commit | exit 0 | hook |
| G4 | All file size + Rule 21/22/23 checks pass on `verify.mjs --staged` (in both repos) | exit 0 | pre-commit |

---

## 4. Autonomy Envelope

**Executor MAY without asking:**
- Read any file in either repo.
- Write the storefront form code edits.
- Deploy to a Vercel preview branch for F1.
- Run read-only DB queries on Prizma + demo.
- Use chrome-devtools MCP for manual UAT.
- Use Make MCP for execution-log verification.

**Executor MUST stop and report on:**
- The cms_leads decision (Part E1) — Daniel chooses.
- Email lowercasing decision (Part D3) — Daniel chooses.
- Production deploy (F2) — Daniel triggers.
- Rollback (F4) — Daniel triggers.
- Any case where the EF rejects a payload that the form successfully validated client-side (suggests contract mismatch).

---

## 5. Stop-on-Deviation Triggers

In addition to CLAUDE.md §9 globals:
- The form's POST URL change accidentally also impacts non-SuperSale forms (e.g., contact form, brand-page form). Each form must be evaluated separately.
- A test submission produces 0 `crm_message_log` rows but EF returned 201 — implies dispatchFreshLead failed silently.
- Daniel's test SMS/email doesn't arrive within 60 seconds.

---

## 6. Rollback Plan

- **Storefront-side:** `git revert <commit_hash>` of the form-rewire commit + push to main + Vercel auto-redeploys (~2–3 min). Form returns to posting at `/api/leads/submit`.
- **EF-side:** `lead-intake` v15 still callable; v16 is additive. No EF rollback needed.
- **DB-side:** any rows already in `crm_leads` from the rewire stay (they're real customer leads). No data loss in either direction.

Total rollback time: ~5 minutes.

---

## 7. Out of Scope

- Phone normalization improvements (covered by P5_5_PHONE_EMAIL_HARDENING).
- WhatsApp channel as a fallback (post-cutover SPEC).
- Migrating historical `cms_leads` rows from before SuperSale (Daniel decides at execution; default is "leave as historical").
- Other forms on the storefront (contact, brand-page, notify-me) — those continue using `/api/leads/submit` until we explicitly migrate them in a follow-up SPEC.

---

## 8. Expected Final State

After execution:
- prizma-optic.co.il SuperSale form posts to `lead-intake` EF.
- Every form submission either creates a `crm_leads` row (201) or hits T2 dup (409) — both visible in CRM admin and automation-history.
- Form has email-required client-side + server-side.
- Branded modal shows specific Hebrew errors per failure mode.
- `cms_leads` either stops receiving new rows (Daniel's preferred path) or is explicitly noted as a parallel write.
- Cutover-day customer traffic flows through the V2 pipeline end-to-end.

---

## 9. Commit Plan

- **Commit 1 (storefront):** `feat(supersale-form): repoint to lead-intake EF + add email-required validation`
- **Commit 2 (storefront):** `feat(supersale-form): wire branded modal + lead-form-validation reuse` (if not already inherited)
- **Commit 3 (storefront):** `chore(api/leads): mark legacy /api/leads/submit deprecated for SuperSale path` (only if Daniel chooses option E2.a or E2.c)
- **Commit 4 (ERP):** `docs(crm): record P5_7 storefront form rewire in GLOBAL_MAP.md + Module 4 SESSION_CONTEXT.md`
- **Commit 5 (this SPEC folder, ERP):** `chore(spec): close P5_7_STOREFRONT_FORM_REWIRE with retrospective` — EXECUTION_REPORT.md + FINDINGS.md.

---

## 10. Pre-Flight Checks (Step 1 of Execution)

1. Confirm the SuperSale form's actual location: scan `opticup-storefront/src/` for the page that renders the SuperSale lead form. Likely candidates: a CMS-driven page using `LeadFormBlock`, OR a custom page under `src/pages/supersale-*`. Document the exact file path.
2. Inspect the form's current implementation (LeadFormBlock vs lead-form shortcode vs custom). Decide if the rewire is a config change (CMS data) or a code change (component edit).
3. `grep -rn "/api/leads/submit" opticup-storefront/src/` — list every caller. Confirm SuperSale is the only one being repointed in this SPEC.
4. Run `SELECT COUNT(*) FROM cms_leads WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c';` — capture pre-state row count.
5. Confirm `lead-intake` EF v16 is live (`mcp__claude_ai_Supabase__list_edge_functions` → version=16).

Log all in EXECUTION_REPORT.md §10.

---

## 11. Lessons Already Incorporated

- **Cross-Reference Check completed 2026-04-29:** 0 collisions for the proposed Vercel env-var name `PUBLIC_LEAD_INTAKE_URL` (if used). 0 collisions for any new helper file names.
- **Iron Rule 21 (No Duplicates):** Part B6 mandates reusing `lead-form-validation.ts` already deployed at storefront commit `ee282af` (the branded-modal validation), NOT duplicating the modal+validation logic in a new file.
- **Iron Rule 22 (Defense-in-depth):** Part B (client-side) + EF v16 (server-side) — both layers reject empty/invalid email.
- **Iron Rule 23 (No secrets):** the legacy anon key is already in `js/shared.js` and `dispatch.ts:18`. Reusing the same constant in storefront does NOT introduce a new exposure.
- **Past lesson from M4_LEAD_STATUS_WAITLIST_SYNC:** when adding a server-side write that triggers downstream automation, verify `sync_lead_status_from_attendee` actually runs. EF's dispatchFreshLead path uses `db.from("crm_event_attendees").upsert(...)` — confirmed as of `bb4c4c9` to call sync via the engine's attendee_upsert post-action; this SPEC's Part C3 verifies it end-to-end.
- **Past lesson from 2026-04-29 QA failure:** server-side scripts that bypass the production code path produce false-positive verdicts. Part F MANDATES Daniel-driven UAT in the actual browser, not curl-driven testing.
- **Past lesson from 2026-04-29 Issue 1:** server-side dispatch paths must write `crm_automation_runs` rows. Already enforced in EF v15+ via `dispatch.ts:openRun`/`closeRun`. Verified by Part C5+C6.

---

*End of SPEC. Cutover-blocking — must close before 2026-05-03 morning.*
