# SPEC — P5_5_PHONE_EMAIL_HARDENING

> **Module:** Module 4 — CRM
> **Location:** `modules/Module 4 - CRM/go-live/specs/P5_5_PHONE_EMAIL_HARDENING/`
> **Authored by:** opticup-strategic (Foreman) — 2026-04-29
> **Status:** DRAFT — handed back to Daniel for review + scheduling. **Do NOT execute pre-cutover.**
> **Cutover relationship:** lands AFTER cutover (2026-05-03). The cutover ships without this hardening.
> **Estimated effort:** 4–6h, two execution blocks (DB+EF first, UI second).
> **Origin:** Daniel's directive 2026-04-29 — Issue 2 of the post-QA review. Strategic decision to skip OTP and harden validation/normalization/bounce-tracking instead.

---

## 1. Goal

Harden the lead pipeline against the two real failure modes the SuperSale rollout has hit: (a) leads entering the CRM with malformed/non-Israeli phones or invalid emails such that downstream messaging silently fails, and (b) operators having no way to filter out leads with chronic delivery problems. Ship strong validation + canonical E.164 normalization at every ingress, a Hebrew-friendly local display format inside templates, and bounce-aware status columns the admin UI can filter on.

OTP is **explicitly out of scope** — the strategic decision (Daniel, 2026-04-29) is that for Prizma's volume, OTP's ~20% step-drop cost is not justified by the benefit OTP provides over good validation + normalization + bounce tracking.

---

## 2. Background & Motivation

Today's pipeline:

| Layer | Phone handling | Email handling |
|---|---|---|
| Storefront landing page (TBD location — verify in Step 1) | unknown — no validation enforced | unknown |
| `lead-intake` EF (`supabase/functions/lead-intake/index.ts:61`) | E.164 normalization already implemented | only trim/null |
| `register_lead_to_event` RPC | n/a (takes IDs only) | n/a |
| Manual lead-add in CRM ERP (`modules/crm/crm-lead-actions.js`) | client-side only — no server-side normalize | client-side only |
| Templates (`%phone%`) | renders whatever DB stored, including raw `+972…` for SMS body | n/a |
| Send-message EF | dispatches; reports failure to log but does not flag the lead | same |

Audit (2026-04-29 SQL): both demo + Prizma have **0** non-E.164 phones in `crm_leads.phone` — the EF normalization is already canonical at intake. The gap is at the **manual-lead** path in the CRM, the **future storefront landing page**, and **bounce visibility**: there's no `crm_leads.phone_status` or `email_status` column, so failed sends are only visible by drilling into `crm_message_log` per lead.

The user-visible pain is exactly that visibility gap. SMS bounces from invalid numbers stay buried in the log; staff don't know who to switch to WhatsApp.

---

## 3. Success Criteria (Measurable)

### Part A — DB schema additions

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| A1 | `crm_leads` has `phone_status TEXT NOT NULL DEFAULT 'unverified'` with CHECK constraint `IN ('unverified','valid','invalid')` | column + check exist | `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name='crm_leads' AND column_name='phone_status'` |
| A2 | `crm_leads` has `email_status TEXT NOT NULL DEFAULT 'unverified'` with the same 3-value CHECK | column + check exist | same query for `email_status` |
| A3 | Both columns indexed: `idx_crm_leads_phone_status_tenant`, `idx_crm_leads_email_status_tenant`, both on `(tenant_id, phone_status)` / `(tenant_id, email_status)` | 2 indexes exist | `pg_indexes` query |
| A4 | FIELD_MAP entries added in `js/shared.js` for both columns (Iron Rule 5) | map updated | `grep "phone_status\\|email_status" js/shared.js` |
| A5 | Both columns added to `docs/DB_TABLES_REFERENCE.md` and `modules/Module 4 - CRM/docs/db-schema.sql` | doc updated | grep |
| A6 | Migration is reversible: a `down.sql` exists alongside the migration in the SPEC folder, dropping both columns + indexes | file exists | `ls down.sql` |

### Part B — Backend phone normalization helpers

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| B1 | `normalize_phone_il(raw text) RETURNS text` PL/pgSQL function exists, returns canonical `+972…` or NULL on invalid input | function exists, idempotent | `SELECT normalize_phone_il('0537889878') = '+972537889878'` and `normalize_phone_il('053-788-9878') = '+972537889878'` and `normalize_phone_il('+1 555 1234') IS NULL` |
| B2 | `normalize_phone_il` accepts: `0XXXXXXXXX` (10 digits with hyphens/spaces), `972XXXXXXXXX`, `+972XXXXXXXXX`, with arbitrary `-`/space separators | all four canonicalize | `SELECT` test matrix |
| B3 | `normalize_phone_il` rejects: empty, < 9 digits, non-Israeli country code | returns NULL | tests |
| B4 | Manual-lead-creation path in CRM ERP (path TBD — Step 1 must locate; candidates: `crm-leads-detail.js`, `crm-lead-actions.js`) calls `normalize_phone_il` server-side via a thin wrapper RPC `create_lead_with_normalization(p_tenant_id, p_full_name, p_phone, p_email, …) RETURNS jsonb` | RPC exists; rejects invalid phone with explicit error | call with bad phone returns `{ok:false, error:'invalid_phone'}` |
| B5 | `lead-intake` EF's existing `normalizePhone()` and the new `normalize_phone_il` SQL function are kept in sync (regex + branches identical, both reject the same inputs) | DRY-anchor doc comment in the SQL function pointing at `lead-intake/index.ts:61–88` | grep |
| B6 | `register_lead_to_event` RPC: optional but verified — does NOT need normalization (takes IDs); add a comment confirming this design choice | comment present | grep RPC body |

### Part C — Storefront landing-page validation + normalization (TBD location)

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| C1 | Step 1 of execution **must locate** the public registration form (likely under `opticup-storefront/src/pages/...` or in `campaigns/supersale/`). If no public form exists today, this Part is deferred to a follow-up SPEC and the executor logs a finding. | location identified or deferral logged | written into FINDINGS.md |
| C2 | Phone `<input type="tel" pattern="...">` HTML5 validation: only `^0\\d{9}$` or `^\\+972\\d{9}$` allowed before submit | `pattern` attribute present | grep |
| C3 | Real-time validation as the user types: visible Hebrew error message under the input ("מספר טלפון לא תקין — חייב להתחיל ב-05 ועוד 8 ספרות"); error clears on valid entry | inline error visible in browser | manual UAT |
| C4 | Email validation: HTML5 `type="email"` + JS regex `/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/` on submit | both layers active | grep + manual UAT |
| C5 | Empty required fields: blocked at submit with Hebrew error toast ("נא למלא את כל השדות הנדרשים") | submit prevented | manual UAT |
| C6 | Client-side normalization before POST: `0537889878` / `053-788-9878` / `+972 53 788 9878` / `972537889878` all serialize to `+972537889878` in the request body | DevTools network tab inspection | manual UAT |

### Part D — Display formatting in templates

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| D1 | `send-message` EF, when substituting `%phone%` into a template body/subject, formats the stored E.164 as `0XXXXXXXXX` (Hebrew local) | substitution produces `0537889878`, not `+972537889878` | unit test in `send-message/event-variables.ts` |
| D2 | DB storage stays in E.164 — no migration changes `crm_leads.phone` values; the reformat is **display-only at substitution time** | `crm_leads.phone` unchanged | SQL audit |
| D3 | If a lead's `phone` is non-Israeli (rare: stored as e.g. `+15551234`), `%phone%` substitutes the raw E.164 without reformatting | edge-case test | unit test |

### Part E — Bounce / failure tracking

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| E1 | `send-message` EF: when SMS dispatch returns the global-sms 404 / "number does not exist" failure mode (or any provider response classified as `permanent_invalid_phone`), it `UPDATE crm_leads SET phone_status='invalid' WHERE id=lead_id AND tenant_id=tenant_id` in addition to writing the existing `crm_message_log.status='failed'` row | UPDATE visible in DB after a deliberate test send to a known-bad number | DB inspection |
| E2 | Email path: when the email provider returns a hard bounce (5xx SMTP / Gmail bounce notification — implementation: piggyback on existing `crm_message_log` failure path classifying via error_message regex), `email_status='invalid'` is set on the lead | tested with a contrived bad address | DB inspection |
| E3 | The classifier function `classify_send_failure(error_text text) RETURNS text` returns one of `transient`, `permanent_invalid_phone`, `permanent_invalid_email`, `unknown`. Only `permanent_*` flips the lead's status. | function exists, deterministic | unit test |
| E4 | Browser engine recipient resolvers (`crm-automation-recipient-resolvers.js`): SMS-channel resolvers exclude leads where `phone_status='invalid'`; email-channel resolvers exclude `email_status='invalid'`. Mixed-channel rules (sms+email) include the lead but only the still-valid channel goes out. | resolver result diff after flagging | functional test |
| E5 | Admin UI filter on the leads tab: a new "סינון: בעיות שליחה" dropdown with options `הכל`, `טלפון לא תקין`, `אימייל לא תקין`, `כל הבעיות`. Filter is tenant-scoped and respects existing search. | filter visible + functional | manual UAT |
| E6 | Lead detail modal shows phone_status / email_status badges next to the contact fields (red "לא תקין" pill if invalid; gray "לא אומת" if unverified; no pill if valid) | badges render | manual UAT |
| E7 | Operator can manually override: clicking the badge opens a small modal asking "סמן כתקין מחדש?" — on confirm flips back to `unverified` (not `valid` — re-verification happens on next successful send) | round-trip works | manual UAT |

### Part F — One-time backfill migration

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| F1 | A `backfill.sql` script in the SPEC folder iterates every `crm_leads` row across both demo + Prizma tenants and applies `normalize_phone_il(phone)` to overwrite `phone` | script idempotent (running twice is a no-op) | dry-run + actual run |
| F2 | Pre-run audit: SQL counter of rows where `normalize_phone_il(phone) IS DISTINCT FROM phone` printed before the UPDATE | counter shown | log |
| F3 | Post-run audit: same counter is 0 | confirmed | log |
| F4 | Rows where `normalize_phone_il(phone) IS NULL` (truly invalid) are NOT touched in this migration; instead `phone_status='invalid'` is set on them. | counter of these rows logged + status updated | log |
| F5 | Today's audit baseline (2026-04-29) confirms 0 non-E.164 in either tenant — so the backfill is expected to be a near-no-op. The SPEC keeps it as defense-in-depth in case manual-lead paths leaked between now and execution. | baseline noted in script header | grep |

### Part G — Tests

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| G1 | Test matrix file `test-cases.md` in this SPEC folder enumerates 12 phone inputs (valid + invalid + edge cases) with expected normalize output | file present | review |
| G2 | A `qa-hardening.mjs` script in the SPEC folder runs end-to-end: creates a lead with bad phone (expects rejection), creates one with good phone (expects normalization), triggers a send to a known-bad SMS-only number (expects `phone_status='invalid'` after), filters leads-tab by "טלפון לא תקין" (expects the test lead). | script exits 0 with all 4 assertions | run on demo |
| G3 | Integrity gate (Iron Rule 31 / `npm run verify:integrity`) green at every commit | exit 0 | hook output |
| G4 | All file size + Rule 21 / 22 / 23 checks pass on `verify.mjs --staged` | exit 0 | pre-commit |

---

## 4. Autonomy Envelope

**Executor MAY without asking:**
- Read any file in this repo and the storefront repo.
- Write the migration SQL, normalize_phone_il function, classifier function, EF code edits, JS UI edits.
- Deploy the updated `send-message` EF (this is the only EF this SPEC redeploys).
- Run the backfill SQL on **demo** without further approval.
- Use chrome-devtools for UI verification.

**Executor MUST stop and report on:**
- Any name collision discovered during the Pre-Flight check (Rule 21 hit on `phone_status`, `email_status`, or any of the new function/RPC names).
- Backfill on **Prizma** — Daniel must explicitly authorize that one. The demo run + audit must precede.
- Any case where Part C (storefront form) cannot be located — log a finding, defer Part C to a follow-up SPEC, continue with the rest.
- Any scenario where flipping a lead to `phone_status='invalid'` or `email_status='invalid'` would cascade-suppress > 5 leads in a single tenant on the spot. Report the count, wait.

---

## 5. Stop-on-Deviation Triggers

In addition to CLAUDE.md §9 globals:

- The classifier mis-classifies a known-good error message (false positive on `permanent_invalid_phone`).
- A unit test for `normalize_phone_il` returns a value that disagrees with the EF's `normalizePhone` for any of the 12 test cases.
- The leads-tab filter accidentally returns rows from the wrong tenant.
- Browser engine fails to skip an `invalid` lead in a single-channel SMS rule (Iron Rule 22 / defense-in-depth concern).

---

## 6. Rollback Plan

- DB: `down.sql` drops both new columns + indexes + the two new functions. Storage cost: negligible. Rollback is non-destructive (no data was ever stored in the new columns until E1/E2 fire).
- EF: redeploy the prior `send-message` version (every EF deploy is a new immutable version per Supabase platform).
- UI: `git revert` the JS commits.
- Backfill: pre-run snapshot of `crm_leads(id, phone)` saved as `pre-backfill-snapshot.csv` in the SPEC folder; restore from there if necessary.

---

## 7. Out of Scope

- OTP / one-time-password verification. Strategic decision (Daniel 2026-04-29).
- WhatsApp channel integration as a fallback for `phone_status='invalid'` leads. Can be a follow-up SPEC.
- Automatic re-verification (e.g., scheduled retry on transient failures). Phase 2 thinking — out of scope here.
- Email validation beyond regex + hard-bounce flagging (no DNS MX lookup, no captcha).
- International (non-IL) phone support beyond accepting/storing whatever E.164 the user types — the validator rejects anything that isn't `+972…`. If Prizma later onboards an international tenant the validator becomes config-per-tenant; that's a separate SPEC.

---

## 8. Expected Final State

After execution:
- Every new lead, regardless of entry path (storefront form, manual CRM, future imports), lands in `crm_leads` with `phone` in canonical `+972…` E.164 or is rejected.
- `crm_leads.phone_status` and `email_status` columns exist on both tenants, indexed, defaulting to `unverified`.
- `send-message` EF flips `phone_status='invalid'` on permanent SMS failures and `email_status='invalid'` on permanent email failures.
- Browser engine resolvers respect both flags.
- Leads tab in CRM has a working "סינון: בעיות שליחה" filter and per-lead badges.
- Templates render `%phone%` as `0537889878` (Hebrew local), DB still stores `+972537889878`.
- Backfill ran clean on demo (and on Prizma if Daniel approves at that gate).

---

## 9. Commit Plan

- **Commit 1:** `feat(crm): add phone_status + email_status columns + normalize_phone_il helper` — Part A1–A5, B1–B6, FIELD_MAP, doc updates, down.sql.
- **Commit 2:** `feat(crm): wire failure classifier + flip status on permanent bounces` — Part E1–E3 (EF code + classifier function), redeploy send-message EF.
- **Commit 3:** `feat(crm): respect phone_status/email_status in recipient resolvers` — Part E4.
- **Commit 4:** `feat(crm): leads-tab filter + per-lead status badges + manual override` — Part E5–E7 + UI.
- **Commit 5:** `feat(crm): %phone% display formatting (Hebrew local)` — Part D.
- **Commit 6:** `feat(storefront): real-time phone+email validation on landing form` — Part C (or deferred per C1).
- **Commit 7:** `chore(crm): one-time E.164 backfill on demo + Prizma` — Part F (Prizma run gated on Daniel authorization at §4).
- **Commit 8:** `chore(spec): close P5_5_PHONE_EMAIL_HARDENING with retrospective` — EXECUTION_REPORT.md + FINDINGS.md.

---

## 10. Pre-Flight Checks (Step 1 of Execution)

1. Confirm the public registration form's location. If absent, log the finding and skip Part C in this SPEC; otherwise add the discovered path to §3 Part C grep targets.
2. `grep -rn "phone_status\\|email_status\\|normalize_phone_il\\|classify_send_failure\\|create_lead_with_normalization" docs/ modules/ js/ supabase/` — Rule 21 collision check.
3. `grep -rn "FIELD_MAP" js/shared.js | head` — confirm FIELD_MAP location.
4. Re-confirm 2026-04-29 audit baseline: `SELECT COUNT(*) FROM crm_leads WHERE is_deleted=false AND phone NOT LIKE '+972%' AND phone IS NOT NULL` on both tenants — expected 0/0.
5. Snapshot `crm_leads(id, phone)` for both tenants → `pre-backfill-snapshot.csv` in this folder.

Log results in §10 of EXECUTION_REPORT.md.

---

## 11. Lessons Already Incorporated

- Cross-Reference Check completed 2026-04-29: 0 collisions found for `phone_status`, `email_status`, `normalize_phone_il`, `classify_send_failure`, `create_lead_with_normalization` — none exist in `docs/GLOBAL_SCHEMA.sql`, `docs/GLOBAL_MAP.md`, `docs/DB_TABLES_REFERENCE.md`, or any module's `db-schema.sql`/`MODULE_MAP.md`.
- Iron Rule 5: every new column gets a FIELD_MAP entry — explicit in A4.
- Iron Rule 14: tenant_id already on `crm_leads`; new columns inherit by definition.
- Iron Rule 18: no new UNIQUE constraint introduced; the new columns are status enums, not identifiers.
- Iron Rule 21: the existing `lead-intake` `normalizePhone` and the new SQL `normalize_phone_il` are kept in sync via the doc-anchor noted in B5 — explicitly NOT a duplicate orphan, but a deliberate two-language mirror documented at the source.
- Iron Rule 31: integrity gate green at every commit — explicit in G3.
- Past lesson from M4_LEAD_STATUS_WAITLIST_SYNC: when adding columns + their UI, do them in two separate commits (column first, UI second) so the column lands cleanly and bisects don't trip on UI churn — this SPEC's commit plan does that (commits 1 then 4–7).
- Past lesson from P5_V2 cutover-blocker (2026-04-29 Issue 1): server-side dispatch paths must be explicitly verified in addition to the browser path. Part E1/E2 enforces server-side flag flipping inside the `send-message` EF, not in any browser code.

---

*End of SPEC. Awaiting Daniel's review + scheduling decision. Do NOT execute pre-cutover.*
