# RECOMMENDATIONS — FINAL_QA_AUDIT

> **Companion to:** `QA_TEST_REPORT.md`
> **Date:** 2026-04-23
> **Scope:** Everything the CRM needs before go-live, organized by urgency.

---

## 1. Critical fixes (must fix before merge to main)

### 1.1 M4-QA-01 — Registration URL is non-functional
- **Issue:** `crm-automation-engine.js:151` hardcodes `https://app.opticalis.co.il/modules/crm/public/event-register.html?event_id=<uuid>&lead_id=<uuid>`. The `main` branch does not contain `modules/crm/public/event-register.html` (only `develop` does). Confirmed via `git log origin/main -- …` returning empty. Every outgoing registration-open / invite-new / invite-waiting-list message today carries a link that will 404 when clicked from production.
- **Why it matters:** This is the primary CTA in 8 of the 10 automation rules. Without it, registration via automated messaging is impossible — which is the whole point of the CRM go-live.
- **Suggested fix:** See §5 for full investigation. Short version: merge develop → main (after this audit's fixes), OR implement token-based URL (§5 Option A) + per-tenant `registration_form_url` override. Recommended compromise: **merge + token + shorter slug (`/r/<token>`) in the same SPEC.**
- **Effort:** Small if just merging (part of go-live); Medium if adding token + short slug.
- **Files affected:** `crm-automation-engine.js`, `supabase/functions/event-register/index.ts`, `modules/crm/public/event-register.html/js` (or new redirect page), tenant config.

### 1.2 M4-QA-02 — Activity Log tab broken
- **Issue:** Click "לוג פעילות" → header renders, but content host stays empty. Root cause: `crm-bootstrap.js:38-43` override of `window.showCrmTab` never dispatches to the activity-log handler. Exact same regression class as M4-BUG-04 from P3a.
- **Why it matters:** Daniel (and QA) would reasonably expect this tab to work. It was shipped in P12 but the bootstrap override wasn't updated. Every nav button on the CRM sidebar must work.
- **Suggested fix:** Add one line to `crm-bootstrap.js:43`:
  ```js
  if (name === 'activity-log' && typeof renderActivityLog === 'function') {
    var host = document.getElementById('activity-log-host');
    if (host) renderActivityLog(host);
  }
  ```
- **Effort:** Tiny.
- **Files affected:** `modules/crm/crm-bootstrap.js` (one hunk).

### 1.3 M4-QA-03 — Public form registrations do NOT send confirmations
- **Issue:** The `event-register` Edge Function calls `register_lead_to_event` RPC directly (via service_role), bypassing `CrmAutomation.evaluate('event_registration', …)`. Only UI-side registrations (`crm-event-register.js` → `registerLeadToEvent`) trigger the confirmation rule. For the real-world high-volume flow (lead follows link → form submits → expects confirmation SMS/email), zero confirmation dispatch happens.
- **Why it matters:** A lead registers, receives an in-page "ההרשמה בוצעה בהצלחה" popup, then silence. No SMS, no email. This creates support calls ("did my registration go through?"), inflates no-show rates, and contradicts the automation promise Shir (the event manager) will rely on.
- **Suggested fix:** After the `register_lead_to_event` RPC succeeds inside `event-register/index.ts`, call the `send-message` EF for both `event_registration_confirmation` (on success) and `event_waiting_list_confirmation` (on waiting_list outcome) — mirroring what `dispatchRegistrationConfirmation` does in the client. Best done server-side in the EF so the automation rule is honored from any entry point (UI or public form). Could also be done by exposing the automation engine as a server-side RPC; that's cleaner long-term but larger.
- **Effort:** Small.
- **Files affected:** `supabase/functions/event-register/index.ts` (add a post-success dispatch block).

---

## 2. Important improvements (should fix before merge)

### 2.1 M4-QA-04 — Orphan `pending_review` log rows on Confirmation Gate cancel
- **Issue:** When the Confirmation Gate is opened it creates `crm_message_log` rows with `status='pending_review'` (seen 4 such rows from the cancelled B2 attempt). If the user clicks "בטל" instead of "אשר ושלח", those rows stay in `pending_review` forever.
- **Why it matters:** Pollutes the log, shows misleading "ממתין לאישור" counts in the messaging history, and would fail any "zero pending_review older than X hours" health check.
- **Suggested fix:** On cancel, DELETE the pending_review rows (or add a TTL sweep in a nightly cron EF). Simpler: don't persist log rows until after the user confirms — do the `INSERT` in the "אשר ושלח" handler instead of at gate-open time.
- **Effort:** Small.
- **Files affected:** `modules/crm/crm-confirm-send.js`, possibly `crm-messaging-send.js`.

### 2.2 M4-QA-05 — Confirmation Gate preview shows literal `%unsubscribe_url%`
- **Issue:** In the gate's SMS preview, the last line reads `להסרה: %unsubscribe_url%` — unsubstituted. The actual substitution happens inside `send-message` EF at send time (which is correct for token freshness — tokens expire in 90 days), but the preview is misleading: Daniel can't verify the link without sending.
- **Suggested fix:** In `crm-automation-engine.js` client-side preview, generate a placeholder token of the form `<lead_id>.preview` or inject the literal `<tenant-domain>/unsubscribe?token=…` with the real leadId so it's obviously a real link. Alternatively, replace the literal with `[קישור יצורף אוטומטית בזמן שליחה]` for clarity.
- **Effort:** Tiny.
- **Files affected:** `modules/crm/crm-automation-engine.js`, `modules/crm/crm-confirm-send.js`.

### 2.3 M4-QA-06 — UI label typo: "אוטומטיה" → "אוטומציה"
- **Issue:** The messaging hub tab label says "כללי אוטומטיה", while the page subtitle on the same screen says "…אוטומציה…" The two Hebrew words are different: אוטומציה = automation (correct), אוטומטיה = "automatic-ness" (typo-like). 4 occurrences:
  - `modules/crm/crm-messaging-rules.js:92`, `:113`, `:184`
  - `modules/crm/crm-messaging-tab.js:10`
- **Suggested fix:** Replace all 4 occurrences with `אוטומציה`. No logic change.
- **Effort:** Tiny.
- **Files affected:** 2 files, 4 lines.

### 2.4 M4-QA-07 — Event detail modal does not refresh after public form submission
- **Issue:** If Shir is viewing the event detail modal while a lead submits the public form, her counter cards / attendee list stay stale until she closes/reopens the modal. Happened in the audit (QA Audit event showed "0 משתתפים" after the form submission landed).
- **Why it matters:** Shir will wonder "did they really register?" and potentially cancel the event by mistake, or double-book. Not catastrophic; surprising.
- **Suggested fix:** Either (a) auto-refresh the modal on an interval while open (15-30s poll of v_crm_event_stats), (b) add a "🔄 רענן" button next to the KPI cards, or (c) subscribe to Supabase realtime on `crm_event_attendees` for the open event_id.
- **Effort:** Small (option b) or Medium (option c).
- **Files affected:** `modules/crm/crm-events-detail.js`.

### 2.5 M4-QA-08 — Accessibility: form labels + id/name
- **Issue:** Chrome a11y panel flags 23 form fields without `<label for=…>` association and 8 form elements without id/name across the CRM. Appears mostly in the modal bodies (lead create, lead edit, event create, broadcast wizard).
- **Why it matters:** Screen readers cannot announce fields properly. Keyboard-only users get disoriented. Also a legal-ish issue if the tenant ever has to comply with Israeli accessibility regulations (IS 5568).
- **Suggested fix:** Wire `<label for>` + input `id` on every field in the modals. This is a dedicated polish SPEC, not one-commit work.
- **Effort:** Medium.
- **Files affected:** ~6 modal renderers.

### 2.6 F-DATA-01 — Pre-existing stray lead on demo
- **Issue:** Demo tenant has a lead `4ea21299` named "טסט" with phone `+972500000000` (not an approved test phone) and email `TESTD@GMAIL.COM` (unknown ownership). Created 2026-04-23 10:47 by an earlier session. If the automation rules were to fire on a random tier2 promotion it would attempt to email an unknown address.
- **Suggested fix:** Soft-delete (or hard-delete) the stray. Before Prizma cutover, do a final demo cleanup SPEC to lock the baseline to a small, known set.
- **Effort:** Tiny.

---

## 3. Nice-to-have enhancements (can fix after merge)

### 3.1 UX — Silent note-add
A4's "Add note" path succeeds but emits no toast. The note appears in the list but there's no positive feedback (particularly on large screens where the list is below the fold). Add a `Toast.success('הערה נוספה')` in `crm-lead-actions.js` after insert.

### 3.2 Duplicate log tables on "שליחה ידנית"
The "שליחה ידנית" sub-tab shows both the "+ שליחה חדשה" wizard launcher AND the full message log table. "היסטוריה" sub-tab shows essentially the same log. Consider moving the log to only "היסטוריה" to reduce cognitive load on the ידנית screen.

### 3.3 Event manager can't see which messages are pending review
Every cancelled Confirmation Gate creates `pending_review` rows that show up in the log as "ממתין לאישור". There's no "re-open this gate" button — the rows are just dead. Either clean them up automatically (§2.1 fix) or add a "re-dispatch" action to each pending_review row.

### 3.4 File-size headroom
`crm-events-detail.js` and `crm-leads-detail.js` are at 349/350 lines. The next feature touching either will blow the ceiling. Plan a logical split now (e.g., extract the 5 sub-tab renderers from leads-detail into `crm-leads-detail-tabs.js`).

### 3.5 Phone format on display
Messaging log shows phones in Israeli format "050-334-8349" but DB stores "+972503348349". Good for Shir, but inconsistent with lead detail header which shows "050-000-0000" for the stray. Consider a single `formatPhoneForDisplay(e164)` helper in shared.

### 3.6 Broadcast wizard step 2 vs step 3 channel inconsistency
Per P6 finding: if step-2 WhatsApp is selected but step-3 picks an SMS template, the actual send is SMS silently. Either lock step-2 to channels that exist on the chosen template, or show a warning.

---

## 4. Future features (post-merge roadmap)

1. **Scheduler for time-based reminders.** `event_2_3d_before` and `event_day` templates + rules exist, but nothing fires them. Needs a scheduled EF that computes "events with event_date = today + N" and iterates attendees. SPEC scope: ~120 lines Deno + cron.
2. **Level-2 automation rules.** "Wait X days, then send" delay semantics. Requires scheduler + a new `pending_action` queue table with `run_at` column.
3. **Rule reordering UI.** `sort_order` column exists but drag-and-drop isn't wired.
4. **Lead-intake EF uses hardcoded template slugs.** The client-side rule engine can't intercept those. Future SPEC: port engine to Deno/TS and share, or call a server-side rule evaluator from the EF.
5. **Message detail modal.** Current click-to-expand in the log shows content + metadata. A dedicated modal could show dispatch history, Make response payload, retries — useful when a send fails.
6. **Pagination beyond 50.** Lead-detail Messages tab + Hub log both cap at 50 rows. Prizma will grow past 50 per lead within months.
7. **Storefront-hosted registration form.** Move the form from ERP repo to the storefront at `prizma-optic.co.il/event-register` so the URL is short and trustworthy. Requires a new Astro page in `opticup-storefront` that calls the same EF.
8. **Analytics dashboard for event managers.** Per-event funnel (invited → registered → confirmed → arrived → purchased) with cohort comparisons across events. The view `v_crm_event_stats` already has most columns; needs a dashboard skin.
9. **`auth.uid()` alignment.** The project uses JWT-claim RLS (canonical) correctly, but some automation rules expect `getCurrentEmployee()` for audit fields. A future pass should ensure every CRM write has a consistent employee_id even when triggered by the EF.

---

## 5. Registration URL investigation (SPEC §4)

### Current state (verified 2026-04-23)

```js
// crm-automation-engine.js:148-154
if (evt.registration_form_url) {
  vars.registration_url = evt.registration_form_url;
} else if (triggerData && triggerData.eventId) {
  vars.registration_url = 'https://app.opticalis.co.il/modules/crm/public/event-register.html'
    + '?event_id=' + encodeURIComponent(triggerData.eventId)
    + '&lead_id=' + encodeURIComponent(lead.id || '');
}
```

- The per-event override column `crm_events.registration_form_url` IS checked first (✅ SaaS-friendly escape hatch).
- Fallback builds the `app.opticalis.co.il/modules/crm/public/...` URL.
- **The file does not exist on `main`.** Only `develop` has it (commit `c0f3c94`, 2026-04-23). GitHub Pages serves `main`.
- The URL exposes raw UUIDs.
- The `event-register` EF GET/POST takes raw `event_id` + `lead_id` UUIDs. "Security model" per the EF comments: "the tenant+lead+event UUID triplet is the auth". That is functionally weak once one UUID is leaked — anyone can register that lead, or see lead_name via the GET endpoint.

### Option A — Token-based URL (recommended, reuses P10 pattern)

Mirror the `unsubscribe` EF pattern:

- In `send-message` EF (or `crm-automation-engine` client-side), generate `token = b64url(payload) + "." + b64url(HMAC-SHA256(SERVICE_ROLE_KEY, payload))` where `payload = "${leadId}:${eventId}:${tenantId}:${expiryEpoch}"`.
- Store TTL = 30 days (or `event_date + 1 day`, whichever is sooner).
- URL becomes `https://app.opticalis.co.il/r?t=<token>` or even better `https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/event-register?t=<token>`.
- `event-register` EF GET parses the token, validates HMAC + expiry, derives `leadId/eventId/tenantId` internally, bootstraps same JSON.
- `event-register` EF POST accepts the same token and re-validates before registering.

Benefits:
- No more UUID exposure in URL (privacy win).
- TTL makes old invite links auto-expire → lower attack surface.
- URL becomes shorter and more shareable (WhatsApp, SMS character count).
- Single integration point with existing HMAC infra — same `SUPABASE_SERVICE_ROLE_KEY` → same rotation story as unsubscribe.

Lines changed estimate:
- `crm-automation-engine.js` — ~15 lines (build token client-side, or move this whole step to `send-message` EF).
- `send-message/index.ts` — ~40 lines (token generation function + inject into variables).
- `event-register/index.ts` — ~60 lines (add token-decode path that's equivalent to the current event_id+lead_id path; keep the old path for a transition period if desired, behind a feature flag).
- `modules/crm/public/event-register.js` — ~10 lines (accept `?t=` in addition to `?event_id=&lead_id=`).

### Option B — URL path options

If token work is deferred, the minimum fix for go-live is simply merging develop → main so `modules/crm/public/event-register.html` becomes reachable. Then:
- `app.opticalis.co.il/modules/crm/public/event-register.html?event_id=…&lead_id=…` is the permanent URL.
- Pros: zero code change.
- Cons: ugly URL, exposes UUIDs, requires ERP domain in every outbound SMS/email.

A shorter redirect at `app.opticalis.co.il/r.html` that reads query params and forwards is a Tiny-effort way to clean up the ugliness.

### Option C — Storefront integration (future)

Eventually the registration form should live at `prizma-optic.co.il/event-register` (storefront domain, looks like an official tenant URL).
- Needs: new Astro page in `opticup-storefront` that calls the existing `event-register` EF.
- The Astro page can be the visual owner (RTL, mobile-first, tenant-branded in storefront colors already) and the EF remains the business logic.
- Would unify brand experience: registration form looks like the storefront, not a standalone micro-site.
- Cross-repo SPEC, Medium effort.

### Option D — Per-event `registration_form_url` override

Already implemented! `crm_events.registration_form_url` exists. An event manager with DB access can set it per event to override the default. The UI does NOT currently expose this field in the event-create / event-edit modal — it's only SQL-settable.
- **Recommendation:** Add the field to the event-create modal (with "השאר ריק לברירת מחדל" placeholder) so Shir can point individual events at custom landing pages. Tiny effort.

### Recommended combined approach for go-live

1. **Before merge** — fix M4-QA-02 activity log (tiny), M4-QA-03 public-form confirmation dispatch (small).
2. **Merge develop → main.** That immediately fixes the registration URL by making the file exist on the served branch.
3. **Follow-up SPEC (week 1 of production)** — token-based URL (Option A) + optional UI field for `registration_form_url` (Option D). Addresses privacy + URL aesthetics without blocking go-live.
4. **Future SPEC (Q2)** — storefront-hosted form (Option C) once the storefront is DNS-switched and the optical chain of registration logos/styling is finalized.

---

## 6. Self-service gaps (SPEC §5)

For each dimension, **☑ = Shir can do it today independently**, **⚠ = works but with friction**, **✗ = blocked by missing feature or developer-only step**.

### 1. Can she create an event and open registration without help? ⚠
- ☑ "יצירת אירוע +" button in Events tab → fills 7 fields → auto-numbered. Campaign defaults populate capacity/fee/coupon.
- ☑ Status change → "הרשמה פתוחה" → Confirmation Gate shows preview.
- ⚠ **She cannot set a custom registration URL per event** from the UI (Option D above). The column exists but has no input field in the modal. For most events the default URL is fine; for a "Campaign-specific micro-site" it isn't.
- ⚠ She cannot preview the actual sent SMS until she clicks "אשר ושלח" — the preview is HTML with `%unsubscribe_url%` literal (M4-QA-05).

### 2. Can she send invitations to the right audience? ☑
- ☑ Broadcast wizard step 1 has 3 boards (incoming / registered / by_event), status filter, language filter, source filter, "אירועים פתוחים בלבד" checkbox.
- ☑ "נמצאו X נמענים" updates live, clickable for preview popup with full recipient list.
- ☑ Automation rules already cover the main lifecycle transitions — she doesn't NEED to craft a broadcast for "registration opened" / "invite new" / "event day" / "thank you".

### 3. Can she monitor registrations as they come in? ⚠
- ☑ Events tab table shows "נרשמו / הגיעו / רכשו / הכנסות" columns.
- ☑ Event detail modal has capacity bar + 6 KPI counters + SVG funnel.
- ⚠ **Modal doesn't auto-refresh** (M4-QA-07) — she'd need to close/reopen to see new registrations that land while the modal is open.
- ⚠ Dashboard is a snapshot; no "recent registrations" live feed (the activity feed is derived from eventStats, not a real stream).

### 4. Can she manage event day independently? ☑
- ☑ Event day mode with 3-column check-in layout, barcode scanner input auto-focused, role toggle (admin/team) hides revenue for team mode.
- ☑ Coupon ceiling enforced with Hebrew toast. "Extra coupons" editor in detail modal — self-service.
- ☑ Arrival-aware coupon badges + running-total badge (admin only).
- Minor friction: event day opens via "מצב יום אירוע" button inside event detail — not directly from the top nav. The top nav's "יום אירוע" tab requires an event to already be selected.

### 5. Can she send follow-up messages after the event? ☑
- ☑ Automation rule "שינוי סטטוס: אירוע נסגר" fires `event_closed` template on event transition to `event_closed` → attendees (incl. attended, purchased, no_show per P14 fix) get the closing message.
- ☑ For non-template follow-ups (e.g. "thanks for buying X"), broadcast wizard board=by_event + raw-mode email covers it.
- ⚠ **No scheduler** — she can't set up "send this 2 days before the event" without triggering it manually. Templates exist (`event_2_3d_before`, `event_day`), but no time-based trigger. See §4 item 1.

### 6. Are automated messages working correctly? ✗ (critical blockers)
- ✗ **M4-QA-01 registration URL broken** — any registration_open / invite_new message carries a dead link today.
- ✗ **M4-QA-03 public-form registration silence** — confirmation doesn't fire from the form path.
- ☑ Unsubscribe works end-to-end.
- ☑ Confirmation Gate preview works, blocks rogue sends.

### 7. Template management — can she edit content? ☑
- ☑ Messaging Hub → Templates tab → click template → right-side dark code editor with line numbers + variable menu + 3-panel preview (WhatsApp / SMS / Email).
- ☑ "משתנים זמינים" panel exposes all 10 variables with click-to-copy.
- ⚠ Template creation (new template from scratch) is possible via "+ תבנית חדשה" but not exercised in this audit.
- ⚠ HTML email templates contain hardcoded Prizma content (Herzl 32, wa.me/972533645404, Instagram) — she can't change the address without editing HTML. Not strictly a CRM issue but will bite the second tenant.

### 8. Can she see event ROI? ⚠
- ☑ Event detail shows revenue (admin only) + conversion funnel.
- ☑ Coupon funnel (P22) shows sent → arrived → not arrived → redeemed.
- ⚠ Dashboard KPI "הכנסות אירוע אחרון" is static for the latest event only; no historical comparison.
- ⚠ No "cohort" view — can't compare this event's funnel against prior events of the same campaign.

### 9. Critical flows IMPOSSIBLE without developer help
- ✗ Running a time-based reminder (scheduler missing).
- ✗ Setting `registration_form_url` override per event (column exists, no UI field).
- ✗ Bulk SMS/WhatsApp action in the bulk selection bar (placeholder "בקרוב").
- ✗ Event-day quick-scan / mass check-in mode (placeholder).
- ✗ Unsubscribing many leads at once (must wait for each to unsubscribe via their own link, or run SQL).
- ✗ Re-running a cancelled Confirmation Gate (currently those rows are dead; see §3.3).
- ✗ Deleting / soft-deleting the pre-existing stray "טסט" lead (no UI for permanent delete; need double-PIN flow or SQL).

### 10. Scheduled reminders
- Templates exist: `event_2_3d_before` (SMS + Email), `event_day` (SMS + Email). Automation rules exist (`trigger_condition: status_equals status='2_3_days_before'` and `='day_of'`). But nothing transitions an event's status to those values automatically — Shir would have to manually flip the event status on the right day to trigger the dispatch.
- Effectively a 5-minute manual task per event per day (at most), so not a go-live blocker — but it IS the kind of thing that gets missed on weekends. If Prizma runs 2+ events/week, a scheduler is worth doing in Q1.

---

*End of RECOMMENDATIONS.md*
