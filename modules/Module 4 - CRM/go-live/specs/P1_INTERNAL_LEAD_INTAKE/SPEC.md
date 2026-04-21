# SPEC — P1_INTERNAL_LEAD_INTAKE

> **Location:** `modules/Module 4 - CRM/go-live/specs/P1_INTERNAL_LEAD_INTAKE/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-21
> **Module:** 4 — CRM
> **Phase:** P1 (Go-Live)
> **Execution environment:** Claude Code local (Windows desktop or laptop)

---

## 1. Goal

Build a `lead-intake` Edge Function that receives form submissions from the
storefront, validates them, checks for duplicates, and inserts new leads
directly into Supabase — with zero Make involvement. This replaces the
Monday.com → Make → Monday pipeline for lead creation.

---

## 2. Background & Motivation

The Go-Live initiative replaces Monday.com with the internal CRM. Phase A–B9
built the CRM schema (23 tables) and UI (19 JS files). The old C1 SPEC tried
to replicate the Make scenario with HTTP modules — that approach was abandoned
(see `C1_LEAD_INTAKE_PIPELINE/FINDINGS.md` for why).

New architecture decision (2026-04-21): all business logic is internal. Edge
Functions handle form intake. Make is only a message dispatcher (P3 scope).

This SPEC builds **only** the data pipeline. No messages are sent (P3+P4 scope).
No CRM UI changes (the Tier 1 tab from old C1 already works).

**Depends on:** CRM Phase A schema (done), CRM on `main` (done).
**Feeds into:** P3 (Make message dispatcher) and P4 (CRM→Make trigger hookup).

**Reference:** `campaigns/supersale/FLOW.md` §"שלב 1: הרשמה ראשונית" for
the full business flow.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop`, clean | `git status` → "nothing to commit" |
| 2 | Edge Function source exists | `supabase/functions/lead-intake/index.ts` | `ls supabase/functions/lead-intake/index.ts` → exit 0 |
| 3 | Edge Function deployed | Slug `lead-intake` appears in Supabase | Supabase MCP `list_edge_functions` → includes `lead-intake` |
| 4 | CORS preflight works | OPTIONS returns 200 with correct headers | `curl -X OPTIONS` → 200 |
| 5 | New lead: valid payload | POST with test lead → 201, lead in DB | Supabase MCP: `SELECT * FROM crm_leads WHERE phone = '+972537889878' AND tenant_id = '8d8cfa7e-...'` → 1 row, status = `new` |
| 6 | All fields populated | Test lead has all fields from payload | Query shows: full_name, phone (E.164), email, source, eye_exam (in notes), terms_approved, marketing_consent, UTMs |
| 7 | Phone normalization | Input `0537889878` stored as `+972537889878` | DB query → phone = `+972537889878` |
| 8 | Duplicate: same phone | POST same phone again → 409, no new row | DB count = 1, response has `duplicate: true` and existing lead's `full_name` |
| 9 | Validation: missing name | POST without `name` → 400 | Response body has `error` field |
| 10 | Validation: invalid phone | POST with `phone: "abc"` → 400 | Response body has `error` field |
| 11 | Validation: wrong tenant | POST with non-existent tenant slug → 401 | Response body: `{ error: "invalid tenant" }` |
| 12 | Response includes lead ID | New lead response has `id` (uuid) | Parse response JSON → `id` is valid uuid |
| 13 | Response includes `is_new` flag | New lead → `is_new: true`, duplicate → `is_new: false` | Parse response JSON |
| 14 | `verify_jwt` = false on deploy | Edge Function allows unauthenticated calls | Supabase MCP → `verify_jwt: false` |
| 15 | File size | `index.ts` ≤ 350 lines | `wc -l` → ≤ 350 |
| 16 | Docs updated | SESSION_CONTEXT, CHANGELOG, MODULE_MAP | File inspection |
| 17 | Cleanup: test lead removed | Test data cleaned after verification | `SELECT count(*) FROM crm_leads WHERE phone = '+972537889878' AND tenant_id = '8d8cfa7e-...'` → 0 |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Read any file in the repo
- Create `supabase/functions/lead-intake/index.ts` (and `deno.json` if needed)
- Deploy Edge Function via Supabase MCP (`deploy_edge_function`)
- Run read-only SQL against Supabase (Level 1)
- INSERT test lead rows in `crm_leads` on demo tenant via Edge Function test (Level 2 — approved)
- DELETE test lead rows (phone=`+972537889878`) on demo tenant after testing (Level 2 — approved)
- Commit and push to `develop`
- Update MODULE_MAP, SESSION_CONTEXT, CHANGELOG
- Decide internal code structure (helper functions, error handling, validation flow)
- Choose phone normalization approach (regex, library, manual)
- Choose CORS origin policy (start permissive `*`, tighten later)

### What REQUIRES stopping and reporting

- Any schema change (DDL) — ALTER TABLE, CREATE TABLE, etc.
- Any modification to existing Edge Functions (especially `pin-auth`)
- Any modification to `js/shared.js` beyond FIELD_MAP additions
- Any write to Prizma tenant (only demo tenant writes allowed)
- Any merge to `main`
- Any step where actual output diverges from §3 expected values
- If `crm_leads` table structure doesn't match expected schema

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- If `crm_leads` table is missing expected columns (full_name, phone, email, status, etc.) → STOP, report actual schema
- If Edge Function deploy fails (permission, syntax, runtime error) → STOP, report exact error
- If UNIQUE constraint on `(tenant_id, phone)` doesn't exist → STOP, this is a prerequisite
- If the Supabase MCP `deploy_edge_function` tool is not available → STOP, document manual deploy steps
- If test INSERT via the Edge Function returns RLS violation → STOP, report. The function uses service_role internally so this should not happen — if it does, there's a config issue.

---

## 6. Rollback Plan

- **Code:** `git reset --hard {START_COMMIT}`
- **Edge Function:** Delete via Supabase dashboard (manual) or leave inactive
- **DB:** `DELETE FROM crm_leads WHERE phone = '+972537889878' AND tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'`
- SPEC marked REOPEN, not CLOSED.

---

## 7. Out of Scope (explicit)

- **Sending messages** (SMS, Email, WhatsApp) — that's P3+P4
- **CRM UI changes** — the Tier 1 "לידים נכנסים" tab already exists from C1
- **Storefront form changes** — the storefront form currently posts to a Make webhook; changing its target URL to this Edge Function will happen when we connect P4 (or may require a separate storefront-repo SPEC)
- **Make scenarios** — no Make work in this SPEC at all
- **Tier 1→Tier 2 transfer** — that's P2
- **Auto-approval logic** — that's P2
- **Lead status changes** — the Edge Function sets `status: 'new'`, period
- **Message templates** — already seeded in C1, will be refined in P5
- **Production (Prizma) tenant** — demo only
- **`eye_exam` as a dedicated column** — the field is stored in `client_notes` (existing schema has no `eye_exam` column). Do NOT add columns.
- **`lead_tier` column changes** — `crm_leads` has no `lead_tier` column in the current schema. Tier is derived from status membership in TIER1/TIER2 arrays. Do NOT add columns.

---

## 8. Expected Final State

### New files
- `supabase/functions/lead-intake/index.ts` (≤ 350 lines) — Deno Edge Function

### Modified files
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — update P1 status
- `modules/Module 4 - CRM/docs/CHANGELOG.md` — add P1 section
- `modules/Module 4 - CRM/docs/MODULE_MAP.md` — add Edge Function entry

### DB state (demo tenant only)
- No schema changes
- After testing: 0 test rows remain (cleanup)

### Supabase state
- Edge Function `lead-intake` deployed, `verify_jwt: false`, status ACTIVE

---

## 9. Commit Plan

- **Commit 1:** `feat(crm): add lead-intake Edge Function for direct form submission` — `supabase/functions/lead-intake/index.ts`
- **Commit 2:** `docs(crm): update P1 session context, changelog, module map`
- **Commit 3:** `chore(spec): close P1_INTERNAL_LEAD_INTAKE with retrospective` — EXECUTION_REPORT.md + FINDINGS.md

---

## 10. Dependencies / Preconditions

- CRM schema deployed (Phase A) ✅ — `crm_leads` table with UNIQUE(tenant_id, phone)
- Demo tenant exists ✅ — slug=`demo`, UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`
- Supabase MCP available for `deploy_edge_function` and `execute_sql`
- Existing Edge Function pattern: reference `supabase/functions/pin-auth/index.ts` for CORS, env vars, service_role usage, response helpers

---

## 11. Lessons Already Incorporated

- FROM `C1_LEAD_INTAKE_PIPELINE/FINDINGS.md` Finding 4 → "Webhook input format
  assumption: `1.fields.name.raw_value` may not match actual form" → APPLIED:
  this Edge Function defines its OWN input contract (flat JSON) rather than
  matching Monday Forms format. The storefront form will POST directly.
- FROM `C1_LEAD_INTAKE_PIPELINE/FINDINGS.md` Finding 1 → "Make template
  interpolation `{{}}` conflict" → NOT APPLICABLE: no Make in this SPEC.
- FROM `C1_LEAD_INTAKE_PIPELINE/FINDINGS.md` Finding 3 → "Cowork VM cannot
  test CRM UI" → APPLIED: §header specifies "Claude Code local" as execution
  environment. However, this SPEC does NOT require browser testing (no UI
  changes) — Edge Function is tested via curl/MCP only.
- FROM `C1_LEAD_INTAKE_PIPELINE/EXECUTION_REPORT.md` Decision 2 → "Use generic
  HTTP modules" → INVERTED: entire architectural direction changed. This SPEC
  uses no HTTP modules, no Make at all. Edge Function writes directly to DB.
- FROM Guardian Alert M4-DOC-09 → "CRM files have null byte padding" →
  NOTED: this SPEC creates a NEW file (index.ts) so null bytes are not a risk.
  However, if the executor edits existing CRM files, verify with `xxd` before
  committing.
- Cross-Reference Check completed 2026-04-21: `lead-intake` does not collide
  with any existing Edge Function slug, file, function, or table name. 0 hits
  in GLOBAL_SCHEMA, GLOBAL_MAP, FILE_STRUCTURE, MODULE_MAP.

---

## 12. Edge Function Technical Spec

### Input Contract (POST body)

```json
{
  "tenant_slug": "demo",
  "name": "ישראל ישראלי",
  "phone": "0537889878",
  "email": "test@example.com",
  "eye_exam": "כן",
  "notes": "optional text",
  "terms_approved": true,
  "marketing_consent": true,
  "language": "he",
  "utm_source": "facebook",
  "utm_medium": "cpc",
  "utm_campaign": "supersale_25",
  "utm_content": "hero_banner",
  "utm_term": "eyeglasses"
}
```

### Processing Steps

1. **Parse & validate** — required: `tenant_slug`, `name`, `phone`. Optional: all others.
2. **Resolve tenant** — query `tenants` table by slug → get `tenant_id` UUID. If not found → 401.
3. **Normalize phone** — strip non-digits, convert Israeli local (05x) to E.164 (`+972...`). If result is not 10–15 digits → 400.
4. **Check duplicate** — query `crm_leads` WHERE phone = normalized AND tenant_id = resolved. Use service_role client (bypasses RLS).
5. **If duplicate** → return 409 with `{ duplicate: true, is_new: false, existing_name: "..." }`.
6. **If new** → INSERT into `crm_leads` with:
   - `tenant_id`, `full_name`, `phone` (E.164), `email`, `status: 'new'`
   - `source: 'supersale_form'`, `language`, UTM fields
   - `terms_approved`, `terms_approved_at: now()` (if true)
   - `marketing_consent`
   - `client_notes` (combine `eye_exam` + `notes` if provided)
   - Return 201 with `{ id, is_new: true }`.
7. **Errors** → return appropriate HTTP status + `{ error: "message" }`.

### Environment Variables (already in Supabase)

- `SUPABASE_URL` — used for creating service_role client
- `SUPABASE_SERVICE_ROLE_KEY` — bypasses RLS for tenant-scoped reads/writes

### CORS

- Allow-Origin: `*` (tighten in P7 when production domains are known)
- Allow-Methods: `POST, OPTIONS`
- Allow-Headers: `content-type`

### Security Notes

- `verify_jwt: false` — the function is called from a public form (no auth)
- Service role is used SERVER-SIDE only — never exposed to the client
- Input sanitization: trim whitespace, validate types, escape for DB
- Rate limiting: not in V1 (Supabase has built-in rate limits on Edge Functions)

---

## 13. Test Protocol

Execute in this order after deployment:

### Test 1: CORS preflight
```bash
curl -X OPTIONS https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/lead-intake \
  -H "Origin: https://www.prizma-optic.co.il" -v
```
Expected: 200, `Access-Control-Allow-Origin: *`

### Test 2: Missing required fields
```bash
curl -X POST https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/lead-intake \
  -H "Content-Type: application/json" \
  -d '{"tenant_slug": "demo", "phone": "0537889878"}'
```
Expected: 400, `{ "error": "..." }` (missing name)

### Test 3: Invalid tenant
```bash
curl -X POST https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/lead-intake \
  -H "Content-Type: application/json" \
  -d '{"tenant_slug": "nonexistent", "name": "Test", "phone": "0537889878"}'
```
Expected: 401, `{ "error": "invalid tenant" }`

### Test 4: New lead (happy path)
```bash
curl -X POST https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/lead-intake \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_slug": "demo",
    "name": "Test Lead",
    "phone": "0537889878",
    "email": "danylis92@gmail.com",
    "eye_exam": "כן",
    "notes": "test from P1 SPEC",
    "terms_approved": true,
    "marketing_consent": true,
    "language": "he",
    "utm_source": "facebook",
    "utm_medium": "cpc",
    "utm_campaign": "demo_test",
    "utm_content": "p1_spec",
    "utm_term": "test"
  }'
```
Expected: 201, `{ "id": "<uuid>", "is_new": true }`

### Test 5: Verify in DB
```sql
SELECT id, full_name, phone, email, status, source, utm_campaign, terms_approved, client_notes
FROM crm_leads
WHERE phone = '+972537889878'
  AND tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
```
Expected: 1 row, status = `new`, source = `supersale_form`

### Test 6: Duplicate detection
Run Test 4 curl again.
Expected: 409, `{ "duplicate": true, "is_new": false, "existing_name": "Test Lead" }`
DB count still = 1.

### Test 7: Invalid phone
```bash
curl -X POST https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/lead-intake \
  -H "Content-Type: application/json" \
  -d '{"tenant_slug": "demo", "name": "Bad Phone", "phone": "abc"}'
```
Expected: 400

### Cleanup
```sql
DELETE FROM crm_leads
WHERE phone = '+972537889878'
  AND tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
```
