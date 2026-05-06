# SPEC — M4_UNSUB_SUPPRESSION_CRIT

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_UNSUB_SUPPRESSION_CRIT/SPEC.md`
> **Authored by:** opticup-strategic (Foreman) — at the request of Daniel + Phase 2 audit T14-CRIT-1
> **Authored on:** 2026-05-06
> **Module:** 4 — CRM
> **Phase:** post-cutover critical hotfix
> **Severity:** CRITICAL (CAN-SPAM-equivalent regulatory exposure — customers continue receiving messages after unsubscribing)

## 1. Goal

Add a suppression gate to `supabase/functions/send-message/index.ts` that rejects any dispatch to a lead where `crm_leads.unsubscribed_at IS NOT NULL` OR `crm_leads.status = 'unsubscribed'`. The rejection produces a `crm_message_log` row with `status='rejected'` + `error_message='lead_unsubscribed'` for audit visibility. Single Edge Function deploy; no schema changes; covers all channels (SMS + email) and all callers (CRM staff path, automation engine, public form, dispatch-queue).

## 2. Background & Motivation

Phase 2 audit T14-CRIT-1 (2026-05-06) confirmed end-to-end:
- Lead `b52e8fbc-...` unsubscribed at `12:57:54.829Z` via the production `unsubscribe` EF flow (storefront link → resolve-link → unsubscribe EF → DB updated `status='unsubscribed'` + `unsubscribed_at` set, customer-side message "הוסרת בהצלחה" displayed)
- 61 milliseconds later, follow-up SMS via `send-message` returned `status='sent'` with `error_message=null`
- Source review of `send-message/index.ts` v18 confirmed: NO `unsubscribed_at` check anywhere in the EF or its imports (`lead-variables.ts`, `event-variables.ts`, `dispatch.ts`, `url-builders.ts`)

**Root cause:** `injectLeadVariables` reads `id, full_name, phone, email` only — not `unsubscribed_at` or `status`. The EF's gating layers are: required_variables → payment_url scan → unsubstituted placeholder scan → recipient validation → phoneAllowed (test_mode_sms_allowlist) → writeDispatchAndSend. **No suppression layer.**

**Customer impact:** Every customer who clicks "הסרה מרשימה" (unsubscribe link in SMS or email) receives the success message + DB row updates correctly, but any subsequent automation rule, broadcast, manual send, or queue-dispatched message reaches them anyway. CAN-SPAM equivalent.

**Architecture decision (already locked by current code):** suppression is all-channels. The unsubscribe EF sets `unsubscribed_at` (timestamp) AND `status='unsubscribed'` (enum) — both are set in a single UPDATE. This SPEC checks both: `unsubscribed_at IS NOT NULL` is the canonical gate; `status='unsubscribed'` is a defense-in-depth backstop in case someone manually flips status without the timestamp.

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify |
|---|-----------|---------------|--------|
| 1 | Branch state at end | `develop`, clean | `git status` → "nothing to commit" |
| 2 | Commits produced | 1 (fix) + 1 (retrospective) = 2 | `git log origin/develop..HEAD --oneline \| wc -l` → 2 |
| 3 | EF deployed | `send-message` v19 (current is v18) | Supabase MCP `get_edge_function('send-message')` reports `version >= 19` |
| 4 | Source change scope | exactly 2 logical edits in send-message tree (1 SELECT widening in `lead-variables.ts` + 1 gate insertion in `index.ts`) | `git diff develop~2 develop -- supabase/functions/send-message/` shows ≤25 lines changed |
| 5 | E2E Test 1 — unsubscribed lead, SMS suppressed | message_log row with `status='rejected'` + `error_message='lead_unsubscribed'` | SQL on `crm_message_log` |
| 6 | E2E Test 2 — unsubscribed lead, email suppressed | same, channel='email' | SQL |
| 7 | E2E Test 3 — re-subscribed lead receives messages | clear `unsubscribed_at` + `status='waiting'` → next send → `status='sent'` | SQL |
| 8 | E2E Test 4 — never-unsubscribed lead unaffected | normal lead, send → `status='sent'` (regression check) | SQL |
| 9 | Whitelist enforcement during E2E | every fired/rejected message → phone `+972537889878`, email `daniel@prizma-optic.co.il` | inspect message_log content + lead row |
| 10 | Prizma writes during run | 0 | `SELECT COUNT(*) FROM crm_message_log WHERE tenant_id={prizma} AND created_at >= START_TIMESTAMP` → 0 |
| 11 | Integrity gate | `npm run verify:integrity` exit 0 or 2 | shell |
| 12 | Customer-facing literal "lead_unsubscribed" string nowhere in template body | grep | source grep on changes |

## 4. Autonomy Envelope

### CAN do without asking
- Edit `supabase/functions/send-message/lead-variables.ts` (widen SELECT to fetch `unsubscribed_at, status`)
- Edit `supabase/functions/send-message/index.ts` (insert suppression gate after `injectLeadVariables` call, before recipient validation)
- Deploy the EF via Supabase MCP `deploy_edge_function` after edits — if MCP returns 5xx twice, escalate to Daniel for CLI deploy (per OPEN-021 pattern; canonical command spelled out in §10)
- Run E2E tests on demo tenant with whitelist contacts only
- SELECT-only on prizma for sanity verification
- Soft-delete demo test data + clear unsubscribed state at end of run
- Commit + push to `develop`
- Update Module's CHANGELOG.md (single line) + SESSION_CONTEXT.md (current focus update)

### REQUIRES stopping
- Any prizma-tenant write
- Test-message firing to non-whitelist contact (whitelist: phone `0537889878` + email `daniel@prizma-optic.co.il`)
- Any source-file edit beyond `send-message/index.ts` and `send-message/lead-variables.ts` — if a related bug surfaces (e.g., dispatch-queue also bypasses), log in FINDINGS, do not bundle into this SPEC
- Any DDL on either tenant
- Iron Rule 12 violation — `send-message/index.ts` is currently 318 lines; gate insertion adds ~10-15 lines (~330 post-edit); MUST stay under 350. If post-edit exceeds, extract the gate to a helper file (`lead-suppression.ts`) — that's a Bounded Autonomy decision the executor can make.
- Merge to main
- Total runtime exceeding 90 minutes

## 5. Stop-on-Deviation Triggers

- Test 1 or Test 2 still produces `status='sent'` after the gate is in place → STOP, the fix is incomplete; do NOT redeploy speculatively. Inspect log row to see what happened.
- Test 3 (re-subscribe) shows the message getting suppressed → STOP, regression in the gate logic; the gate must let through cleared leads.
- Test 4 (never-unsubscribed lead) shows suppression → STOP, regression; the gate is over-broad.
- Prizma write attempt → STOP, log CRITICAL incident, revert if needed.
- EF deploy fails — retry once via MCP; second failure → STOP and escalate to Daniel for CLI deploy. Canonical CLI command:
  ```
  supabase functions deploy send-message --no-verify-jwt --project-ref tsxrrxzmdxaenlvocyit
  ```
  **Note `--no-verify-jwt` flag:** the `send-message` EF currently has `verify_jwt=true` in deployed config (it's an internal-only EF called by service-role + Make). Confirm with `get_edge_function` before adding the flag — match deployed config exactly.

## 6. Rollback Plan

- Two commits on develop; `git revert {fix_hash}` reverts the source change (skip the retrospective commit on revert).
- EF rollback: redeploy previous version (the last v18 source) via Supabase MCP — current code is in git at HEAD~2 after fix lands.
- Demo cleanup:
  ```sql
  -- Clear unsubscribed state on test lead so re-runs are clean
  UPDATE crm_leads
     SET unsubscribed_at=NULL, status='waiting'
   WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
     AND phone='+972537889878'
     AND created_at >= '{START_TIMESTAMP}';
  -- Soft-delete test leads
  UPDATE crm_leads
     SET is_deleted=true
   WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
     AND phone='+972537889878'
     AND created_at >= '{START_TIMESTAMP}';
  ```

## 7. Out of Scope (DO NOT touch)

- Per-channel suppression (SMS-only or email-only opt-out) — current schema is all-channels; per-channel is a future SPEC if Daniel decides the business needs it
- The `unsubscribe` EF itself (writing the timestamp) — that side works correctly per Phase 2
- The storefront `/unsubscribe` Astro page — works correctly per Phase 2
- The hardcoded anon JWT in storefront/EFs (G-HIGH-2, separate SPEC)
- The `verify_jwt` config drift on `unsubscribe` EF (G-HIGH-1 → re-classified to LOW per Phase 2)
- Tenant isolation hardening (G-CRIT-1/2/3, separate SPEC `M4_TENANT_ISOLATION_HARDENING_CRIT`)
- Hardcoded Prizma values (G-CRIT-4, separate SPEC `M4_HARDCODED_PRIZMA_REMOVAL`)
- Any storefront repo change
- Any Edge Function other than `send-message`

## 8. Expected Final State

### Modified file 1: `supabase/functions/send-message/lead-variables.ts`

**Edit A** — line 23 (the lead SELECT):
- BEFORE: `.select("id, full_name, phone, email")`
- AFTER:  `.select("id, full_name, phone, email, unsubscribed_at, status")`

The function continues NOT to expose those new columns as substitution variables (they're not customer-facing). They are returned to the caller via a return value change OR via a sibling helper. **Recommended pattern:** add a sibling helper `loadLeadForSuppression(db, leadId, tenantId): Promise<{unsubscribed_at: string|null, status: string|null} | null>` and call it once from `index.ts` next to (or instead of, with internal share) `injectLeadVariables`. Executor's choice between:
- (a) Change `injectLeadVariables` signature to return the lead row, threading through index.ts
- (b) Add a new helper `loadLeadForSuppression` that does its own SELECT (1 extra DB round trip, negligible at our scale; no signature change)
- (c) Refactor: have `injectLeadVariables` accept a `suppressionOut` ref param

(b) is the minimum-blast-radius choice. (a) is more efficient. Executor decides under Bounded Autonomy.

### Modified file 2: `supabase/functions/send-message/index.ts`

**Edit B** — insert suppression gate. Location: AFTER `await injectLeadVariables(db, leadId, tenantId, variables);` (line 158) and BEFORE the auto-URLs / event-vars injectors (line 163-170). Insertion text (illustrative — executor may adjust based on choice from Edit A):

```ts
// --- Suppression gate (M4_UNSUB_SUPPRESSION_CRIT) ---
// CAN-SPAM equivalent: respect `unsubscribed_at` on every dispatch.
// Architecture: all-channels suppression — a single UPDATE in the
// unsubscribe EF sets both `unsubscribed_at` and `status='unsubscribed'`,
// so EITHER condition suppresses. Defense in depth.
const supRow = await loadLeadForSuppression(db, leadId, tenantId);
if (supRow && (supRow.unsubscribed_at != null || supRow.status === 'unsubscribed')) {
  await db.from("crm_message_log").insert({
    tenant_id: tenantId, lead_id: leadId, event_id: eventId, run_id: runId,
    template_id: null, channel, content: "",
    status: "rejected", error_message: "lead_unsubscribed",
  });
  return jsonResponse({ ok: false, error: "lead_unsubscribed" }, 200);
}
```

The `templateId` is `null` here because the gate fires BEFORE template resolution. The HTTP status `200` matches the existing `phone_not_allowed` reject (line 303) — both are intentional rejections, not server errors. The `crm_message_log` row gives operators visibility into how often suppression fires (useful for fraud detection + customer-care queries like "did they really unsubscribe?").

### EF deploy: `send-message` v19 deployed.

### Modified docs (1 single-line append each)
- `modules/Module 4 - CRM/docs/CHANGELOG.md` — append a hotfix line under today's date
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — single-line update

### NOT modified
- `MODULE_MAP.md` (a new helper function `loadLeadForSuppression` if executor chose option (b) — but it lives inside `lead-variables.ts`, no new file. Add 1 line to MODULE_MAP under "send-message helpers" if (b) is chosen.)
- `GLOBAL_MAP.md` / `GLOBAL_SCHEMA.sql` (no schema change)
- `MASTER_ROADMAP.md` (this is a hotfix; module isn't closing)

## 9. Commit Plan

ONE fix commit + ONE retrospective commit (executor protocol):

- **Commit 1:** `fix(crm): send-message rejects dispatch to unsubscribed leads (M4_UNSUB_SUPPRESSION_CRIT)`
  - `supabase/functions/send-message/lead-variables.ts` (Edit A)
  - `supabase/functions/send-message/index.ts` (Edit B)
  - `modules/Module 4 - CRM/docs/CHANGELOG.md` (append line)
  - `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` (current focus update)
  - `modules/Module 4 - CRM/docs/MODULE_MAP.md` (1 line if option (b) was chosen)
- **Commit 2:** `chore(spec): close M4_UNSUB_SUPPRESSION_CRIT with retrospective`
  - SPEC.md + EXECUTION_REPORT.md + FINDINGS.md

Push to `origin/develop`. Do NOT merge to main — Daniel handles main merges (Iron Rule 9.7).

## 10. Dependencies / Preconditions

- Branch `develop`, clean
- Supabase MCP available (`deploy_edge_function`, `execute_sql`, `get_edge_function`)
- Demo tenant accessible — login PIN `12345`
- Whitelist contacts available: phone `0537889878`, email `daniel@prizma-optic.co.il`
- Test lead on demo with whitelist phone+email — soft-delete + recreate freely
- Note: M4_PUBLIC_FORM_VARIABLES_HIGH (the prior SPEC) is already CLOSED with v14 of `event-register` deployed — irrelevant to this SPEC's scope but reflects current production state.

### Edge Function deploy fallback
If MCP `deploy_edge_function` returns 5xx after 1 retry, STOP and ask Daniel to run from his desktop:
```
supabase functions deploy send-message --no-verify-jwt --project-ref tsxrrxzmdxaenlvocyit
```
**Verify the `--no-verify-jwt` flag matches deployed state first** via `get_edge_function('send-message')` — current config is `verify_jwt=true`, so DROP the flag from the CLI command. Final correct command:
```
supabase functions deploy send-message --project-ref tsxrrxzmdxaenlvocyit
```
(No `--no-verify-jwt` because the deployed config has `verify_jwt=true`.)

## 11. Lessons Already Incorporated

- **From M4_PUBLIC_FORM_VARIABLES_HIGH/FOREMAN_REVIEW.md (just closed):** schema-impossibility check (column nullability before citing in SPEC) — applied here. The `crm_leads.unsubscribed_at` column was verified to exist + accept NULL. The `crm_leads.status` column was verified to accept `'unsubscribed'` value (Phase 2 confirmed lead `b52e8fbc-...` had `status='unsubscribed'` post-unsub).
- **From M4_PUBLIC_FORM_VARIABLES_HIGH/FOREMAN_REVIEW.md (just closed):** CLI deploy command spelled out in §10 (with the verify_jwt-flag note, since `send-message` config differs from `event-register`).
- **From `M4_OVERNIGHT_AUDIT/PHASE2_REPORT.md` T14-CRIT-1:** root cause + reproduction + DB evidence already documented at code level. This SPEC implements the recommended fix.
- **From `feedback_test_phone_numbers.md`:** real SMS fires on demo. §3 #9 + §4 hard-gate whitelist.
- **From `feedback_production_discipline_post_cutover.md`:** prizma is live. §3 #10 hard-gates prizma writes.
- **From `feedback_clean_repo_in_specs.md`:** §3 #1 enforces clean tree at end.
- **From `Pattern P12` (loud failure on missing payment_url):** preserved — this SPEC adds a NEW gate (suppression) without modifying the existing payment-url loud-failure path.
- **Defense in depth (Iron Rule 22):** the gate checks BOTH `unsubscribed_at IS NOT NULL` AND `status='unsubscribed'`. A single UPDATE in unsubscribe EF sets both, but if a future tool flips just one (e.g., manual operator action via SQL), the gate still catches it.

**Cross-Reference Check (Step 1.5):** This SPEC introduces ZERO new tables, columns, RPCs, views, T-constants, FIELD_MAP entries, or config keys. It introduces ONE new helper function (`loadLeadForSuppression` in `lead-variables.ts`) IF executor picks option (b) — that helper is a private function inside an existing file, not a new global. Cross-reference sweep: 0 collisions, 0 hits.

## 12. QA Plan

After EF deploy, before marking SPEC closed:

1. Pre-flight: confirm whitelist demo lead exists with phone `+972537889878`, email `daniel@prizma-optic.co.il`. Soft-delete + recreate if needed. Note its `id`.
2. Pre-flight: confirm `send-message` EF v19 deployed; note `ezbr_sha256`.

**Test 1 — Unsubscribed lead, SMS:**
3. Set lead's `unsubscribed_at = NOW()`, `status = 'unsubscribed'` via direct SQL (simulating what unsubscribe EF would do)
4. POST to `send-message`: tenant=demo, lead_id=<test_lead>, channel=`sms`, template_slug=`event_registration_open` (or any active template)
5. Expected response: `{"ok":false, "error":"lead_unsubscribed"}` (HTTP 200)
6. Verify `crm_message_log` row: `status='rejected'`, `error_message='lead_unsubscribed'`, `channel='sms'`
7. Verify NO Make webhook hit (no `external_id`, body is empty `""`)

**Test 2 — Unsubscribed lead, email:**
8. Same lead (still unsubscribed). POST to send-message: channel=`email`, same template
9. Expected: same rejection, channel='email'

**Test 3 — Re-subscribed lead:**
10. Clear: `UPDATE crm_leads SET unsubscribed_at=NULL, status='waiting' WHERE id=<test_lead>`
11. POST to send-message: channel=`sms`, same template
12. Expected: `{"ok":true, "log_id":..., "status":"sent"}`. `crm_message_log` row: `status='sent'`. Daniel's phone receives the SMS.

**Test 4 — Regression check, never-unsubscribed lead:**
13. Create a separate test lead (or reuse) where `unsubscribed_at` was always NULL. POST to send-message.
14. Expected: normal `status='sent'` flow, no rejection.

**Cleanup:**
15. Soft-delete test leads + reset their unsubscribed state per §6.
16. Verify §3 success criteria #1-#12.

If any test fails → revert (rollback plan), do NOT redeploy speculatively.

*End of SPEC.*
