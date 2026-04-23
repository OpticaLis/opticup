# SPEC — FINAL_FIXES

> **Module:** Module 4 — CRM
> **Location:** `modules/Module 4 - CRM/final/FINAL_FIXES/`
> **Author:** opticup-strategic (Cowork)
> **Written:** 2026-04-23
> **Status:** READY FOR EXECUTION
> **Priority:** FINAL — last code changes before merge to main

---

## 1. Goal

Fix all critical and important issues found in the FINAL_QA_AUDIT.
This is the LAST code SPEC before merge.

---

## 2. Tracks

### Track A — CRITICAL: Activity Log tab broken (M4-QA-02)

**File:** `modules/crm/crm-bootstrap.js`
**Problem:** `showCrmTab` override dispatches to 6 tabs but has no case for
`'activity-log'`. Same regression class as M4-BUG-04.
**Fix:** Add one case to the tab dispatch. Pattern matches existing cases.

After the last `else if` (for messaging), add:
```js
else if (name === 'activity-log' && typeof renderActivityLog === 'function') {
  var host = document.getElementById('activity-log-host');
  if (host) renderActivityLog(host);
}
```

**Success criterion:** Click "לוג פעילות" in CRM nav → content renders with
filters and table (not just header).

---

### Track B — CRITICAL: Public form registration doesn't send confirmations (M4-QA-03)

**File:** `supabase/functions/event-register/index.ts`
**Problem:** After `register_lead_to_event` RPC, the EF returns without
dispatching confirmation messages. Only UI-side registration fires the
automation rule. Public form registrations = silence.

**Fix:** After the RPC succeeds and the attendee row exists, call `send-message`
EF internally (same cross-EF fetch pattern used in `lead-intake/index.ts` for
`lead_intake_new` / `lead_intake_duplicate` dispatch).

Logic:
1. Determine template base slug from RPC result:
   - `result.status === 'registered'` → `event_registration_confirmation`
   - `result.status === 'waiting_list'` → `event_waiting_list_confirmation`
2. Build variables: `{ name, phone, email, event_name, event_date, event_time, event_location }`
   from the lead + event data already fetched in the GET handler.
3. Call `send-message` EF twice (SMS + email) via `Promise.allSettled` — same
   pattern as `lead-intake` dispatch. Use the hardcoded legacy JWT anon key
   (same workaround as `lead-intake`, documented in P3c+P4 SESSION_CONTEXT).
4. Do NOT let dispatch failure affect the form response — lead registration
   succeeded, confirmation is fire-and-forget.

**Success criteria:**
- Submit public registration form → attendee created AND 2 log rows
  (`event_registration_confirmation_sms_he` + `event_registration_confirmation_email_he`)
  with `status=sent`.
- Submit when event full → waiting_list AND 2 log rows
  (`event_waiting_list_confirmation_sms_he` + `event_waiting_list_confirmation_email_he`).
- Form response is NOT delayed by dispatch (Promise.allSettled, fire-and-forget).

**NOTE:** The `event-register` EF must be deployed to Supabase after this change.
Deploy command: `npx supabase functions deploy event-register --project-ref tsxrrxzmdxaenlvocyit`

---

### Track C — CRITICAL: Registration URL fix (M4-QA-01)

**Problem:** `crm-automation-engine.js:151` builds
`https://app.opticalis.co.il/modules/crm/public/event-register.html?event_id=X&lead_id=Y`.
This file doesn't exist on `main` (GitHub Pages). Even after merge, it exposes
raw UUIDs.

**Two-part fix:**

#### C1 — Immediate: Fix the URL to work after merge

**File:** `modules/crm/crm-automation-engine.js` (lines 146-154)
**Change:** Update the fallback URL to use the correct GitHub Pages path.
After merge, the file WILL be at `app.opticalis.co.il/modules/crm/public/event-register.html`.
So the URL is technically correct — just needs the file to exist on `main`.
No code change needed here for go-live IF we merge. But we should shorten it.

Create a redirect file at repo root:
- New file: `r.html` (in repo root, next to `index.html`)
- Content: minimal HTML that reads `?t=` or `?event_id=&lead_id=` from URL
  and redirects to `modules/crm/public/event-register.html` with the same params.
- This gives us `app.opticalis.co.il/r.html?event_id=X&lead_id=Y` — shorter.

Update `crm-automation-engine.js:151`:
```js
vars.registration_url = 'https://app.opticalis.co.il/r.html'
  + '?event_id=' + encodeURIComponent(triggerData.eventId)
  + '&lead_id=' + encodeURIComponent(lead.id || '');
```

#### C2 — Token-based URL (deferred to post-merge SPEC)

The token approach (HMAC signed `{eventId:leadId:tenantId:expiry}`) is the
right long-term solution but is NOT part of this SPEC. It requires changes
to 4 files and edge function redeployment. Will be a dedicated SPEC.

**Success criteria:**
- `r.html` exists at repo root, redirects correctly.
- `crm-automation-engine.js` builds URL with `/r.html?event_id=...`.
- After merge to main, clicking the link loads the registration form.

---

### Track D — REMOVED

> Track D (utm_campaign_id) was removed from this SPEC. The `utm_campaign_id`
> column is populated by the Affiliates board (Facebook Ads enrichment data),
> NOT by form submissions. The lead-intake EF correctly captures the 5
> form-based UTMs (source, medium, campaign, content, term). No change needed.

---

### Track E — Typo fix: "אוטומטיה" → "אוטומציה" (M4-QA-06)

**Files:** 2 files, 4 occurrences:
1. `modules/crm/crm-messaging-rules.js` — lines 92, 113, 184: replace
   `אוטומטיה` with `אוטומציה`
2. `modules/crm/crm-messaging-tab.js` — line 10: same replacement

**Success criterion:** `grep -rn "אוטומטיה" modules/crm/*.js` returns 0 hits.

---

### Track F — Confirmation Gate: `%unsubscribe_url%` preview (M4-QA-05)

**File:** `modules/crm/crm-automation-engine.js`
**Problem:** `buildVariables()` does not include `unsubscribe_url`, so the
client-side preview shows the literal `%unsubscribe_url%` in SMS bodies.
The real substitution happens server-side in `send-message` EF (correct —
tokens have 90-day TTL and shouldn't be pre-generated at preview time).

**Fix:** In `buildVariables()`, add:
```js
vars.unsubscribe_url = '[קישור הסרה — יצורף אוטומטית]';
```

This replaces the raw `%unsubscribe_url%` with a human-readable Hebrew
placeholder in the preview. The server-side EF still generates the real
HMAC token at send time.

**Success criterion:** Confirmation Gate SMS preview shows
`להסרה: [קישור הסרה — יצורף אוטומטית]` instead of `להסרה: %unsubscribe_url%`.

---

### Track G — Confirmation Gate: pending_review cleanup on cancel (M4-QA-04)

**File:** `modules/crm/crm-confirm-send.js`
**Problem:** Opening the gate pre-creates `crm_message_log` rows with
`status='pending_review'`. Cancelling leaves them orphaned forever.

**Fix:** Investigate the current flow:
- If rows are created at gate-open time → on cancel, DELETE where
  `status='pending_review'` AND IDs match the current sendPlan.
- If rows can be deferred to approve-time → move the INSERT into the
  "אשר ושלח" handler instead. This is cleaner.

The executor should read `crm-confirm-send.js` to determine which approach
is simpler, then implement. Both are acceptable.

**Success criterion:** Open Confirmation Gate → Cancel → check
`crm_message_log WHERE status='pending_review'` → 0 new rows.

---

### Track H — Stray demo lead cleanup (F-DATA-01)

**Action:** Soft-delete the pre-existing stray lead on demo tenant:
```sql
UPDATE crm_leads
SET is_deleted = true, updated_at = now()
WHERE id = '4ea21299-a146-43d1-9c97-714daffb28cd'
  AND tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
```

Also fix P55 דנה כהן's unsubscribed_at (it was set by a prior audit session):
```sql
UPDATE crm_leads
SET unsubscribed_at = NULL, updated_at = now()
WHERE id = 'f49d4d8e-...'
  AND tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND unsubscribed_at IS NOT NULL;
```

(Executor: look up the actual UUID of P55 דנה כהן from the baseline.)

**Success criterion:** Demo tenant has exactly 2 active leads, both with
approved test phones, both with `unsubscribed_at IS NULL`.

---

## 3. Commit Plan

3 commits:

1. `fix(crm): activity log tab dispatch + registration URL redirect + typo fix + preview placeholders`
   - Track A (bootstrap fix)
   - Track C1 (r.html + URL update)
   - Track E (typo)
   - Track F (unsubscribe preview)
   - Track G (pending_review cleanup)

2. `fix(crm): event-register EF confirmation dispatch`
   - Track B (event-register EF)

3. `chore(crm): demo tenant data cleanup`
   - Track H (SQL, not committed to repo — just executed on demo)

After commits: deploy `event-register` Edge Function only (Track B).

---

## 4. Autonomy Envelope

**HIGH AUTONOMY** — all tracks are bug fixes with clear expected outcomes.

One checkpoint: **After Track B (event-register EF)** — verify the
confirmation dispatch works on demo by submitting the public form and checking
`crm_message_log` for new rows. If the rows appear with `status=sent`, continue.
If not, STOP and report.

---

## 5. Stop-on-Deviation Triggers

1. Any CRM file would exceed 350 lines after edits
2. Edge Function deployment fails
3. Confirmation dispatch sends to non-approved phone numbers
4. Registration form stops working (GET or POST returns error)
5. Any other tab breaks after bootstrap change

---

## 6. Files Affected

| File | Track | Current lines | Expected change |
|------|-------|--------------|----------------|
| `modules/crm/crm-bootstrap.js` | A | ~45 | +3 lines |
| `supabase/functions/event-register/index.ts` | B | ~200 | +40-60 lines (dispatch block) |
| `r.html` (NEW, repo root) | C1 | 0 | ~25 lines (redirect page) |
| `modules/crm/crm-automation-engine.js` | C1, F | ~303 | +2 lines (URL change + unsubscribe placeholder) |
| ~~`supabase/functions/lead-intake/index.ts`~~ | ~~D~~ | — | REMOVED (UTMs correct as-is) |
| `modules/crm/crm-messaging-rules.js` | E | ~311 | 0 net (replace text) |
| `modules/crm/crm-messaging-tab.js` | E | ~30 | 0 net (replace text) |
| `modules/crm/crm-confirm-send.js` | G | ~255 | +5-15 lines (cancel cleanup) |
| ~~`modules/crm/crm-incoming-tab.js`~~ | ~~D~~ | — | REMOVED |

---

## 7. Out of Scope

- Token-based registration URL (HMAC) — separate post-merge SPEC
- Storefront-hosted registration form — separate SPEC
- Scheduled reminders (event_2_3d_before / event_day) — separate SPEC
- Event detail auto-refresh (M4-QA-07) — nice-to-have, post-merge
- Accessibility fixes (M4-QA-08) — dedicated polish SPEC
- Affiliates board UI — separate SPEC (post-merge)
- `registration_form_url` UI field in event create modal — separate SPEC

---

## 8. Verification Evidence (Guardian Protocol)

| Claim | Verification |
|-------|-------------|
| Activity log bug location | M4-QA-02 in FINDINGS.md, confirmed via browser test G4 |
| Event-register EF missing dispatch | M4-QA-03 in FINDINGS.md, confirmed via test C3 |
| Registration URL broken | M4-QA-01, confirmed via B2 Confirmation Gate preview |
| ~~`utm_campaign_id` missing from EF~~ | REMOVED — UTMs correct, campaign_id is Facebook Ads enrichment |
| Typo locations | `grep -rn "אוטומטיה" modules/crm/*.js` = 4 hits |
| `crm-bootstrap.js` tab dispatch | Lines 38-43, 6 cases, no activity-log |
| Stray lead UUID | `4ea21299-a146-43d1-9c97-714daffb28cd` from QA baseline |

Cross-Reference Check completed 2026-04-23: `r.html` — 0 hits in repo. No collision.

---

*End of SPEC — FINAL_FIXES*
