# SPEC — CRM_HOTFIXES

> **Location:** `modules/Module 4 - CRM/final/CRM_HOTFIXES/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-24
> **Module:** 4 — CRM
> **Priority:** CRITICAL — multiple broken flows blocking production use

---

## 1. Goal

Fix 4 CRM bugs found during E2E testing that block production use: (1)
send-message EF not using short links (deploy issue), (2) lead status not
changing to "invited" after sending event invitation, (3) "שלח הודעה" button
in event detail not working, (4) capacity vs coupon count verification.

---

## 2. Background & Motivation

SHORT_LINKS SPEC (commit `33f57a6`) added short link code to `send-message`
EF and deployed it, but edge function logs still show `version: 4` and the
`short_links` table has 0 rows — the deploy may not have taken effect.
Additionally, OPEN_ISSUES.md (commit `6b6d0b3`) documents 7 issues; this
SPEC covers issues #1 (short links deploy), #2 (status→invited), #4 (send
button), and #5 (capacity check). Issues #3, #6, #7 are deferred to
EVENT_CONFIRMATION_EMAIL SPEC.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | send-message EF version | v5 with short link imports | `curl` to send-message or check EF logs for `version: 5` after deploy |
| 2 | short_links table has rows after test send | ≥1 row | `SELECT COUNT(*) FROM short_links` → ≥1 |
| 3 | SMS content contains `/r/` short URL | URL ~38 chars, format `prizma-optic.co.il/r/XXXXXXXX` | `SELECT content FROM crm_message_log ORDER BY created_at DESC LIMIT 1` → contains `/r/` |
| 4 | Lead status changes to "invited" after invite send | `crm_leads.status = 'invited'` for test lead | `SELECT status FROM crm_leads WHERE id = '<test_lead_id>'` → `invited` |
| 5 | "שלח הודעה" button in event detail opens compose modal | Button is clickable, opens a modal with body textarea + send button | Visual verification in browser or code inspection |
| 6 | Capacity logic: registration at max capacity goes to waiting list | RPC returns `status: 'waiting_list'` when at capacity | `SELECT register_lead_to_event(...)` with event at max capacity |
| 7 | Extra coupons don't inflate available spots count | `max_capacity` remains the registration cap; extra coupons are separate | Code review of capacity check logic |
| 8 | git status clean | Nothing to commit | `git status` → clean |
| 9 | No console errors on CRM pages | 0 errors | Browser console check or code inspection |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in either repo (ERP + storefront)
- Run read-only SQL (Level 1)
- Write-level SQL for test data on demo tenant only (Level 2)
- Redeploy existing EFs that are already committed (send-message, resolve-link)
- Edit JS/HTML files in `modules/crm/` to fix broken handlers
- Add `data-action` attributes to existing buttons
- Wire event handlers for existing but non-functional buttons
- Create new helper functions in existing CRM modules
- Update `crm_leads.status` logic in automation engine
- Commit and push to `develop`
- Run verify scripts

### What REQUIRES stopping and reporting
- Any new DB table or column creation
- Any modification to EFs other than send-message (especially unsubscribe, event-register)
- Any change to RLS policies
- Changes to shared.js or shared components
- File exceeding 350 lines after edits
- Any behavior change that affects non-CRM modules

---

## 5. Stop-on-Deviation Triggers

- If send-message EF deploy returns an error → STOP (do not retry blindly)
- If any existing test (SMS to 0537889878) stops working after a fix → STOP
- If `crm-events-detail.js` exceeds 350 lines after adding the handler → extract to a new file, then continue
- If capacity RPC behavior differs from what's documented in memory (3-tier model) → STOP and clarify

---

## 6. Rollback Plan

- **Code:** `git reset --hard` to commit before first change
- **EF:** Redeploy previous send-message version via Supabase MCP
- **DB:** No schema changes in this SPEC; data changes are test-only on demo tenant

---

## 7. Out of Scope

- QR Code generation (OPEN_ISSUES #6) → EVENT_CONFIRMATION_EMAIL SPEC
- Styled confirmation email (OPEN_ISSUES #7) → EVENT_CONFIRMATION_EMAIL SPEC
- Bulk status change UI (OPEN_ISSUES #3) → EVENT_CONFIRMATION_EMAIL SPEC
- SaaS-ification of STOREFRONT_ORIGIN hardcoding (M4-DEBT-FINAL-02)
- Changes to event-register or unsubscribe EFs
- Storefront code changes
- Merge to main

---

## 8. Expected Final State

### Modified files
- `modules/crm/crm-automation-engine.js` — after successful automation send
  of type "invitation", update lead status to `invited` (only if current
  status is lower: `waiting`)
- `modules/crm/crm-events-detail.js` — wire "שלח הודעה" button with
  `data-action="send-message"` and add handler that opens a compose modal
  (textarea for body, recipient picker by attendee status, send button)

### EF deploys
- `send-message` redeployed — confirm v5 with short link imports is active

### DB state (after test verification)
- `short_links` table has ≥1 row (from test SMS)
- Test lead status = `invited` after sending invitation

### Docs updated
- `modules/Module 4 - CRM/final/OPEN_ISSUES.md` — mark issues #1, #2, #4, #5 as resolved

---

## 9. Commit Plan

- Commit 1: `fix(crm): redeploy send-message EF v5 with short links` — if any code fix needed
- Commit 2: `fix(crm): update lead status to invited after event invitation send`
- Commit 3: `fix(crm): wire send-message button in event detail`
- Commit 4: `fix(crm): verify capacity vs coupon logic` — if code fix needed, otherwise note in report
- Commit 5: `chore(spec): close CRM_HOTFIXES with retrospective`

---

## 10. Dependencies / Preconditions

- SHORT_LINKS SPEC must be closed (it is — commit `48b1e5e`)
- `short_links` table must exist in Supabase (it does — 10 columns verified)
- `resolve-link` EF must be deployed (it is — v1, ACTIVE)
- Supabase MCP must be available for EF deployment

---

## 11. Lessons Already Incorporated

- FROM SHORT_LINKS FOREMAN_REVIEW: "line-count projection before editing" →
  APPLIED: §5 includes stop-trigger for files exceeding 350 lines.
- FROM SHORT_LINKS FOREMAN_REVIEW: "rollback plan must be explicit" →
  APPLIED: §6 includes EF rollback via MCP redeploy.
- FROM STOREFRONT_FORMS_BUGFIX FOREMAN_REVIEW: "ACTIVATION_PROMPT should not
  hardcode branch names" → APPLIED: no branch names in this SPEC.
- Cross-Reference Check completed 2026-04-24 against GLOBAL_SCHEMA: 0
  collisions. No new DB objects created in this SPEC.
