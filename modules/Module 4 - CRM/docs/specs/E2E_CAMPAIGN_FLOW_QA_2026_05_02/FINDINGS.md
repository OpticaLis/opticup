# FINDINGS — E2E_CAMPAIGN_FLOW_QA_2026_05_02

> Findings logged during execution. Severity → CRITICAL = blocks Sunday 2026-05-03 cutover; HIGH = cutover-day risk (real customer harm if it triggers); MEDIUM = post-cutover backlog; LOW/INFO = nice-to-fix.

---

## F1 — CRITICAL — Storefront `/supersale/` form bypasses Supabase entirely

**Severity:** 🔴 **CRITICAL — hard cutover blocker for Sunday 2026-05-03**

**Where:** `https://www.prizma-optic.co.il/supersale/` form → `POST https://www.prizma-optic.co.il/api/leads/submit` (Vercel/Astro server-side endpoint), not the Supabase `lead-intake` Edge Function

**Symptom:** customer submits form → UI redirects to `/successfulsupersale/` showing "נרשמת בהצלחה למערכת האירועים!" → **zero rows written to `crm_leads`, `crm_message_log`, or `crm_automation_runs` on Prizma tenant.** No SMS/email dispatched. Customer is invisible to CRM but believes they're registered.

**Reproduction:**
1. Open `https://www.prizma-optic.co.il/supersale/` (cached + page-loaded fine).
2. Click "בדיקת התאמה ושריון מקום" CTA → modal opens.
3. Fill: שם=דניאל טסט 1 storefront, טלפון=0537889878, אימייל=daniel@prizma-optic.co.il, בדיקת ראייה=צריך בדיקת ראייה, terms checkbox=on, marketing checkbox=on.
4. Click "שריינו לי מקום" → button toggles to "שולח..." → response 200 → redirect to `/successfulsupersale/`.
5. Query Supabase: `SELECT * FROM crm_leads WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c' AND created_at > '<pre_submit_ts>'` → **0 rows.**
6. Query: `SELECT * FROM crm_message_log WHERE tenant_id=... AND created_at > '<pre_submit_ts>'` → **0 rows.**
7. Query: `SELECT * FROM crm_automation_runs WHERE tenant_id=... AND started_at > '<pre_submit_ts>'` → **0 rows.**

Confirmed twice: once with phone A having an existing active lead (which would have hit the duplicate path inside lead-intake), and once after soft-deleting that existing lead so the phone was clean. Same null result both times.

**Network capture (Chrome devtools, reqid=265):**
- Method: `POST`
- URL: `https://www.prizma-optic.co.il/api/leads/submit`
- Response: 200, `server: Vercel`, `x-vercel-cache: MISS`
- Request body (single JSON): `{"name":"דניאל טסט 1 storefront","phone":"0537889878","email":"daniel@prizma-optic.co.il","בדיקת ראייה":"צריך בדיקת ראייה","הערות":"","checkbox_0":"on","checkbox_1":"on","page_url":"https://www.prizma-optic.co.il/supersale/","source":"shortcode_lead_form","tenant_id":"6ad0781b-37f0-47a9-92e3-be9ed1477e1c","form_id":"supersale-form","form_name":"הרשמה + קטלוג המחירים לאירוע הקרוב","webhook_url":"https://hook.eu2.make.com/jewyavndaly70jd59tj9pt85s9ad1pki"}`

**Diagnosis hint** (not a fix, just a starting point):
- The body includes `webhook_url: "https://hook.eu2.make.com/..."` — the storefront seems to expect the Vercel endpoint to forward the lead to Make.com, which would then call the Supabase pipeline (or write directly).
- Hebrew field keys (`בדיקת ראייה`, `הערות`) and `checkbox_0/checkbox_1` naming look like a generic shortcode form bridge — the kind of body shape a WordPress/Make.com pipeline expects, not the kind `lead-intake` EF expects.
- Either (a) the Vercel endpoint is forwarding to Make and Make is silently failing, OR (b) the Vercel endpoint accepts the POST and just returns 200 without doing anything, OR (c) the Make scenario wired to the webhook is deactivated on Prizma (cf. F4 below — same Make-deactivation pattern).
- Phase 1 V3 (this morning) succeeded because it `POST`ed **directly** to `https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/lead-intake` — bypassing the storefront. The native lead-intake EF works. The storefront's path to it is the broken link.

**Customer impact** (if shipped to Sunday cutover unchanged):
- 100% of storefront-form-submitted leads will be invisible to CRM staff.
- Customers will see green "נרשמת בהצלחה" → expect SMS/email → never receive any → either treat it as silent failure OR bombard support asking why they didn't hear back.
- All campaign attribution / funnel metrics for the Sunday launch will show zero leads.
- Dependent flows (T1 welcome, T5 invitation when an event opens, T8 reminder, etc.) cannot fire because there's no lead to fire on.

**Suggested next action:** open new SPEC `STOREFRONT_LEAD_INTAKE_REWIRE` with options:
- (a) rewrite `prizma-optic.co.il/api/leads/submit` to call `lead-intake` EF directly (preferred — removes Make.com from the customer-critical path);
- (b) verify + activate the Make.com scenario at the webhook URL on Prizma if (a) is judged out-of-scope;
- (c) at minimum, change the storefront to surface a real failure UI when the underlying call doesn't succeed (the current "always-success" UX masks every failure mode).

The endpoint's response body would be the next thing to read (we couldn't capture it during this run because Chrome had already evicted it — re-run with body persistence enabled).

---

## F2 — HIGH — Bug 2 (V10) recipient resolver returns 0 candidates on a known-positive case

**Severity:** 🟠 **HIGH — cutover-day risk**

**Where:** event-day status_change dispatch path, recipient_type = `attendees_with_active_coupon`. Rule id `d62ce92b-aa6f-4f83-95db-fc12604cad16` ("שינוי סטטוס: יום אירוע"). Dispatch logic lives in the dispatch-queue / send-message stack post-V10 reconciliation.

**Symptom:** the status_change → automation_runs pipeline now fires (good — Phase 1 Bug 2 is no longer "silent"), but the recipient resolver picks up 0 attendees from a state where exactly 1 valid candidate exists.

**Evidence (event #7, status flip to `event_day` at 2026-05-02 15:56:25 UTC):**
- `crm_automation_runs` row `dcb0cb51-7e89-409e-8ade-c12c5e28a1c3`: status=`completed`, total_recipients=`0`, sent_count=`0`, failed_count=`0`, rule="שינוי סטטוס: יום אירוע", trigger_type=`event_status_change`.
- `crm_message_log` for event #7: 0 rows.
- Event #7 attendees at the time:
  - `22285b70` QA-A (lead `e1db152f`, +972537889878): status=`registered`, **`coupon_sent=true`** → **MATCHES** the resolver criterion.
  - `5e53654a` QA-B (+972503348349): status=`cancelled` → correctly excluded.
  - `a0b11c3a` QA-C (+972500000003): status=`registered`, `coupon_sent=false` → correctly excluded.

Per the activation prompt's S9 expected outcome — "EXACTLY 1 row in `crm_message_log` for this event. Recipient = QA-A (+972537889878). Zero for QA-B + QA-C." — the actual outcome (0 rows) is a fail.

**Phase 1 / V10 history context:**
- Phase 1 V10 finding (this morning): `UPDATE crm_events SET status='event_day' ...` produced **zero** automation_runs. That's the original Bug 2.
- V10 reconciliation commits `cd2b2f7` + `8b6f529` + `2e14346` + `f5cc902` landed on origin/main. Commit messages describe "recipient resolver + event-time fix".
- Post-reconciliation evidence (this run): pipeline now fires 1 automation_run, but resolver returns 0 candidates. So the fix moved the failure from the trigger source to the resolver — not a regression, but the operational outcome (zero customer messages on event day) is the same.

**Diagnosis hint:** the resolver implementation for `attendees_with_active_coupon` is the place to instrument. A few candidate failure modes worth testing in order:
- Tenant-id propagation: is the resolver running with a service-role context that can see the attendee rows? If RLS bites here, it'd return 0 silently.
- Filter clause shape: does it require `coupon_sent=true` AND something else (e.g., `coupon_sent_at IS NOT NULL`)? QA-A's `coupon_sent_at` was `null` despite `coupon_sent=true` — possibly a state inconsistency (cf. F3 below).
- "Active" interpretation: maybe the resolver demands `payment_status='paid'` or excludes `pending_payment`. QA-A's payment_status was `pending_payment`; if that's a disqualifier, the rule's intent + naming need adjustment ("active coupon" ≠ "paid attendee").

**Customer impact:** event-day reminder SMS will not fire to any registered+couponed attendees on Sunday. Operationally that's the most important message in the cycle — every attendee who has a confirmed slot needs the day-of reminder. Without it, no-shows spike.

**Suggested next action:** open SPEC `V10_RECIPIENT_RESOLVER_FIX_FOR_ACTIVE_COUPON` to debug the resolver against the proven event-#7 fixture. Re-running event #7's flip after the fix (or a dry-run RPC mode) will confirm the 1-recipient outcome.

---

## F3 — MEDIUM — `coupon_sent=true` but `coupon_sent_at IS NULL` on attendee rows

**Severity:** 🟡 **MEDIUM**

**Where:** `crm_event_attendees` table on Prizma, all 3 attendees on event #7 created at 2026-05-02 13:44:58 by Phase 1/V10 setup.

**Symptom:** attendees `22285b70` (QA-A) and `5e53654a` (QA-B) both have `coupon_sent=true` but `coupon_sent_at=NULL`. State inconsistency — these two columns are supposed to move together (boolean flips when timestamp is set).

**Likely cause:** the V10 setup script wrote `coupon_sent=true` directly without going through the canonical "send coupon" code path that would also set `coupon_sent_at=now()`.

**Why it might be load-bearing:** if F2's resolver query uses `coupon_sent_at IS NOT NULL` instead of (or in addition to) `coupon_sent=true`, that alone would explain the 0-recipients outcome. Worth checking before opening a separate fix.

**Suggested next action:** decide canonical contract — is `coupon_sent` the boolean source of truth (then drop the `_at` column) or is `coupon_sent_at IS NOT NULL` the canonical source (then `coupon_sent` becomes a denormalized cache that needs an INSERT/UPDATE trigger to keep in sync). One direction or the other; not both.

---

## F4 — INFO (carries forward from Phase 1) — Storefront UI shows identical success page for fresh and duplicate cases

**Severity:** 🟢 **LOW** (UX papercut, not a launch blocker on its own — but compounds F1)

**Where:** `https://www.prizma-optic.co.il/successfulsupersale/`

**Symptom:** when a customer submits the form, they always land on `/successfulsupersale/` with "נרשמת בהצלחה למערכת האירועים!" — regardless of whether the back-end returned `outcome='created'`, `outcome='duplicate'`, or in F1's case, no outcome at all. The customer can't tell from the UI which of those happened.

**Why it matters:**
- Compounds F1: the always-success UX is what hides the F1 failure. If the storefront surfaced "we couldn't reach our systems, please try again", F1 would have been caught the first time a customer submitted.
- For the duplicate case (T2) specifically, the UX is fine ("you're already in our system" is reasonable to silently treat as success). For the failure case, it's not.

**Suggested next action:** in the same SPEC that fixes F1, change the storefront submit handler to surface a real failure state when the underlying API doesn't return a known-good outcome.

---

## Summary table

| ID | Severity | Title | Blocks cutover? |
|----|----------|-------|------------------|
| F1 | 🔴 CRITICAL | Storefront `/supersale/` form bypasses Supabase entirely | YES — hard blocker |
| F2 | 🟠 HIGH | V10 recipient resolver returns 0 candidates on known-positive case | YES — event-day SMS won't fire |
| F3 | 🟡 MEDIUM | `coupon_sent` ↔ `coupon_sent_at` state inconsistency | possibly — only if F3 is what causes F2 |
| F4 | 🟢 LOW | Storefront success page identical for fresh/duplicate/failure | not on its own; compounds F1 |

**Verdict for Sunday 2026-05-03 cutover:** 🔴 NOT READY. F1 + F2 must close. F3 should be inspected as part of F2 diagnosis. F4 should land in the same SPEC as F1.

---

*End of FINDINGS.md.*
