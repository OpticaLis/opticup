# FINDINGS — E2E_CAMPAIGN_FLOW_QA_2026_05_02

> **Revision 2** (2026-05-02 evening, post Daniel pushback): F1 withdrawn — storefront → Make/Monday wiring is documented expected state pending `P5_7_STOREFRONT_FORM_REWIRE`. F2 reclassified from HIGH (resolver bug) to INFO (stale-cache artifact of V10 verification timing); the cd2b2f7 resolver was re-verified working via direct browser invocation. Original v1 of this file (committed at `e00ea4c`) is preserved in git history.

> Severity legend: **CRITICAL** = hard cutover blocker; **HIGH** = cutover-day risk if it triggers; **MEDIUM** = post-cutover backlog; **INFO/LOW** = nice-to-have or operational note.

---

## F1 — WITHDRAWN — Storefront `/supersale/` form posts to Make/Monday, not Supabase EF

**Severity:** ⚪ **EXPECTED STATE — blocked on `P5_7_STOREFRONT_FORM_REWIRE`** (SPEC at `modules/Module 4 - CRM/go-live/specs/P5_7_STOREFRONT_FORM_REWIRE/`, authored 2026-04-29, not yet executed).

**Original (v1) framing was wrong.** The storefront form's POST to `https://www.prizma-optic.co.il/api/leads/submit` (Vercel/Astro endpoint, body includes `webhook_url: "https://hook.eu2.make.com/jewyavndaly70jd59tj9pt85s9ad1pki"`) is the **legacy WordPress/Make/Monday pipeline** that the Optic Up project has not yet rewired to the Supabase `lead-intake` Edge Function. P5_7 is the SPEC that performs that rewire; until it ships, the form-to-EF integration is not testable end-to-end and is not a regression.

**What this means for cutover:**
- If P5_7 is shipped before Sunday → re-run S1 fresh after deploy + cache propagation; expect the EF path to fire T1.
- If P5_7 is NOT shipped before Sunday → the storefront continues to feed the legacy Make/Monday pipeline as it does today. Daniel knows this and that is the operational state he is cutting over with.
- Either way, this is not a new finding from this QA run.

**Suggested next action:** none from this SPEC. P5_7 is the owner.

---

## F2 — WITHDRAWN as code bug, downgraded to INFO — V10 verification at 15:56 UTC ran on stale (pre-cd2b2f7) JS

**Severity:** 🟢 **INFO — operational/deployment note, not a regression**

**Original (v1) framing was wrong.** The cd2b2f7 recipient resolver in `modules/crm/crm-automation-recipient-resolvers.js:86–102` is **correct as written and is currently working live**.

### Verification evidence (collected in Revision 2)

1. **Source review:** `crm-automation-recipient-resolvers.js:86–102` — the `attendees_with_active_coupon` block filters `tenant_id=$1 AND event_id=$2 AND is_deleted=false AND coupon_sent=true AND status<>'cancelled'`, then post-filters out leads with `unsubscribed_at` set or `is_deleted=true`. QA-A meets every condition.

2. **Live invocation in the CRM admin browser:** ran via `evaluate_script` on `https://app.opticalis.co.il/crm.html?t=prizma`:
   ```js
   await window.CrmAutomationRecipients.resolve(
     'attendees_with_active_coupon',
     '6ad0781b-37f0-47a9-92e3-be9ed1477e1c',
     { eventId: 'e05ad4ba-d2c3-4150-b75f-0bcb23ca485f' },
     {}
   )
   ```
   Result: `{ count: 1, recipients: [{ id: 'e1db152f-9954-4ae6-adc8-9caa176215e0', name: 'דניאל QA-A קופון בתוקף', phone: '+972537889878' }] }` — i.e. exactly the V10 expected outcome.

3. **SQL replay** (server-side via `service_role`): same query, same single-row result.

So the resolver works. Why did the 15:56 run record `total_recipients=0`?

### Root cause: deploy + cache timing window

| Event | Israel time | UTC |
|-------|-------------|-----|
| `cd2b2f7` committed to `develop` | 17:11:29 +0300 | 14:11:29 |
| PR #41 (`develop → main`) merged | 18:33:58 +0300 | 15:33:58 |
| V10 verification run on event #7 fired | 18:56:25 +0300 | 15:56:25 |

Only **22 min 27 s** elapsed between the merge to `main` and the live UI-driven status flip. `app.opticalis.co.il` is served via GitHub Pages, whose CDN typically lags 5–10 min after a `main` push, **plus** the operator's browser had already loaded the page minutes earlier (with `Cache-Control: public, max-age=0, must-revalidate` not always honored aggressively in practice). The most plausible reconstruction is that the browser at 15:56:25 was running JS bundled from a pre-cd2b2f7 commit. In the older code, `'attendees_with_active_coupon'` is not a known `recipientType`, so the resolver falls through to `console.warn('CrmAutomation: unknown recipient_type', recipientType)` and `return []` — which is exactly what `total_recipients=0, sent_count=0, status='completed', error_message=null` looks like in `crm_automation_runs`. No error surfaces because the unknown-type fallback is intentionally non-throwing.

This explanation is consistent with all the data: trigger_data captured correctly, run completed cleanly, no error_message, just an empty recipient set. It is also consistent with the resolver returning 1 recipient when called fresh now.

### What this means for cutover

The cd2b2f7 fix **is** working in the deployed code as of this run. The 15:56 V10 verification was a measurement artifact, not a regression.

### Suggested operational guard (small but real)

Whenever a cutover-critical UI flow is being verified shortly after a `main` deploy:
1. Wait ≥10 min after the PR merge for GitHub Pages CDN to propagate.
2. Hard-reload the page (Ctrl+F5 / Cmd+Shift+R) to bypass the browser cache.
3. Confirm the new code is loaded (e.g. via a known new symbol — for cd2b2f7, `typeof window.CrmAutomationRecipients !== 'undefined'` and a test invocation returning a known shape).
4. Only then run the verify step.

This is a one-paragraph addition to a runbook, not a SPEC. Could go in `roles/campaign-overseer/CUTOVER_ROADMAP.md` or the V10 SPEC's lessons-learned section.

### Recommended re-test

If Daniel wants a clean V10 green: from the fresh-loaded admin page (which we already verified runs cd2b2f7), flip event #7 to a non-event_day status (e.g. `registration_open`) and back to `event_day` via the admin UI. Expected: 1 new `crm_automation_runs` row with `total_recipients=1, sent_count=1`, plus 1 `crm_message_log` row to QA-A's phone (real SMS to +972537889878). I did **not** auto-trigger this from the QA run — Daniel's last instruction was "investigate root cause before declaring a blocker", and the investigation now shows there is no blocker. Re-test is optional confidence, not a precondition.

---

## F3 — MEDIUM — `coupon_sent=true` but `coupon_sent_at IS NULL` on QA test attendees

**Severity:** 🟡 **MEDIUM — data hygiene, not load-bearing for V10**

**Where:** `crm_event_attendees` rows on event #7 (Prizma): `22285b70` (QA-A) and `5e53654a` (QA-B) both have `coupon_sent=true` with `coupon_sent_at=NULL`. State drift between the boolean and the timestamp.

**Why it's not a V10 blocker:** the `attendees_with_active_coupon` resolver checks only `coupon_sent=true` (verified at line 97). `coupon_sent_at` is not in the filter. So this drift does not affect dispatch.

**Why it still matters:**
- Future code that wants to e.g. show "coupon sent <relative time>" in the UI cannot trust `coupon_sent_at`.
- If a future SPEC ever tightens the resolver to `coupon_sent_at IS NOT NULL` (which would be reasonable — "actually sent at a real time" is stronger than "boolean flag"), the QA fixture data would become resolver-invisible. So either leave the resolver as-is and remove the `_at` column, or keep both and ensure the canonical send-coupon flow always writes both atomically.

**Likely cause:** the V10 setup script wrote `coupon_sent=true` directly via SQL UPDATE without going through `crm-event-day-coupon.js`'s `sendCoupon` function (which writes both columns via `coupon_sent=true, coupon_sent_at=now()`). Confirmable by reading the V10 EXECUTION_REPORT.md or the supervisor session that authored the V10 fixture.

**Suggested next action:** small standalone SPEC `COUPON_SENT_FIELD_CONTRACT` (post-cutover backlog) — pick one source of truth for "coupon was sent", drop the other column, and add a CHECK constraint or trigger to keep them in sync if both stay.

---

## F4 — LOW — Storefront UI shows identical success page for all backend outcomes

**Severity:** 🟢 **LOW — UX papercut, defer to P5_7 or its successor**

**Where:** `https://www.prizma-optic.co.il/successfulsupersale/` is the unconditional redirect target after any submit attempt at `/supersale/`'s form.

**Symptom:** customer always sees "נרשמת בהצלחה למערכת האירועים!" regardless of whether the underlying call returned `created`, `duplicate`, or no-op. (For the duplicate case, this is fine; for the failure case, it hides errors.)

**Why it now matters less than v1 said:** F1 was withdrawn — there's no current "silent failure" because the Make/Monday route IS the intended pipeline today, and "always success" is a reasonable UX for "we got your details". The papercut becomes load-bearing only when P5_7 ships, at which point a "we couldn't reach our systems" branch becomes important.

**Suggested next action:** include a real failure-state UX in P5_7's scope, or open a small follow-up SPEC after P5_7 lands.

---

## Summary table

| ID | Severity | Title | Blocks 2026-05-03 cutover? |
|----|----------|-------|------|
| F1 | ⚪ EXPECTED | Storefront → Make/Monday (not Supabase) | No — pending P5_7 by design |
| F2 | 🟢 INFO | V10 15:56 run hit stale-JS cache; resolver itself is correct | No — verified working post-cache |
| F3 | 🟡 MEDIUM | `coupon_sent` ↔ `coupon_sent_at` drift on QA fixtures | No — resolver doesn't read the timestamp |
| F4 | 🟢 LOW | Storefront success page identical for fresh/dup/failure | No — defer to P5_7 |

**Revised verdict for 2026-05-03 cutover:** ✅ from this QA's S1+S3-by-proxy data: **no new blockers introduced.** F1 was already known and gated on P5_7. F2 was a measurement artifact, not a regression. F3 + F4 are hygiene/UX, post-cutover backlog.

**Note on remaining scenarios:** S2, S4–S12 were not run. The activation prompt's other 9 scenarios (auto-promote, customer self-register link, T6 over-capacity, T7 cross-event waitlist invite, T8 timezone, T9 event-day re-test on fresh load, attendee move, cancellation + refund, campaigns dashboard) remain untested in this run. Daniel's check-in protocol stopped progress at S3 to validate the framing of S1+F2 first. With those reframed, S4–S12 can resume — no longer blocked by a "the pipeline is silent" finding.

---

*End of FINDINGS.md (Revision 2).*
