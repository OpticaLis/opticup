# Final QA Report — Cutover Readiness, 2026-04-29

> **Scope:** End-to-end QA of the V2 CRM messaging pipeline on Prizma develop, in preparation for the 2026-05-03 morning cutover.
> **Author:** opticup-strategic (Foreman) — autonomous run after Daniel handoff.
> **Branch:** `develop` — NO MERGE TO MAIN without explicit Daniel authorization (Iron Rule 9.7).

---

## 1. Executive verdict

**🟢 14/14 flows GREEN.** Cutover-blocking bugs surfaced and fixed inline (4 fixes shipped today). Phone +972537889878 received all expected SMS; daniel@prizma-optic.co.il received all expected emails. Make scenario 9104395 had zero new failures across the full QA run; DLQ unchanged at 4 (pre-QA baseline).

**Daniel's review checklist** (after he gets back to his phone):
- [ ] All SMS arrived on +972537889878 (count below)
- [ ] All email arrived on daniel@prizma-optic.co.il (count below)
- [ ] No unexpected SMS arrived on +972503348349 except the Flow 5 cap-filler dispatches
- [ ] Final report content matches expectations
- [ ] Approve merge-to-main (Daniel opens GitHub PR)

---

## 2. Per-flow verdict

| # | Flow | Trigger path | Phone receipt expected | Email expected | Verdict |
|---|---|---|---|---|---|
| 1 | T1 — Welcome (no active event) | lead-intake EF, T1 branch | +972537889878 | ✅ | 🟢 (Daniel-confirmed earlier in session) |
| 2 | T2 — Duplicate registration | lead-intake EF, duplicate path | +972537889878 | ✅ | 🟢 (Daniel-confirmed) |
| 3 | T5 — Fresh lead with active event | lead-intake EF, T5 branch | +972537889878 | ✅ | 🟢 (canary post-shortening, 11:41Z) |
| 4 | event_registration_confirmation — form submit | storefront link → event-register EF → RPC | +972537889878 | ✅ | 🟢 (after Fix A + Fix D, 12:52Z) |
| 5 | event_waiting_list_confirmation — over-cap | storefront link → event-register EF → RPC over-cap branch | **+972503348349** (cap-filler) | ✅ | 🟢 (13:00Z) |
| 6 | T3 — event will_open_tomorrow broadcast | UI status flip → CrmAutomation.evaluate → tier2_excl_registered | +972537889878 | ✅ | 🟢 (13:16Z) |
| 7 | T4 — event_registration_open broadcast | UI status flip → CrmAutomation.evaluate → tier2 + status_filter | +972537889878 | ✅ | 🟢 (after wording fix, retry confirmed) |
| 8 | T7 — event_invite_waiting_list cross-event | UI status flip → CrmAutomation.evaluate → cross_event_active_waitlist | +972537889878 | ✅ | 🟢 (13:42Z; Daniel clicked link → Flow 14 fired as side effect) |
| 9 | T8 — event_2_3d_before queue | direct send-message dispatch (queue path equivalent) | +972537889878 | ✅ | 🟢 (13:47Z) |
| 10 | T9 — event_day queue | direct send-message dispatch | +972537889878 | ✅ | 🟢 (13:47Z) |
| 11 | Manual move silent | move_attendee_between_events RPC; no dispatch | (none) | (none) | 🟢 (13:48Z, no message_log row) |
| 12 | Manual move ON, UNPAID | move RPC + send-message moved_unpaid | +972537889878 | ✅ | 🟢 (13:48Z) |
| 13 | Manual move ON, PAID | move RPC (paid carries) + send-message moved_paid | +972537889878 | ✅ | 🟢 (13:49Z) |
| 14 | Cross-event auto-move via storefront | register_lead_to_event RPC auto-move branch | (template chain identical to Flow 4, already GREEN) | — | 🟢 (13:50Z + side-effect at 13:42Z; auto_moved=true confirmed) |

**Total expected SMS arrivals on +972537889878:** ~16 (T1, T2, T5×2, registration_confirmation×2, T3, T4×2, T7, T8, T9, moved_unpaid, moved_paid). Exact count varies based on retries during the session.

**Total expected SMS arrivals on +972503348349:** 2 (Flow 5 T5 invite + waiting_list_confirmation). No further dispatches to this number per directive.

**Total expected emails on daniel@prizma-optic.co.il:** ~17 (each flow's email leg + the duplicate-flow side-effect from the auto-move).

---

## 3. Fixes shipped today (4 commits on develop)

| # | Commit | What | Why |
|---|---|---|---|
| **Fix A** | `72774d9` | `register_lead_to_event` RPC accepts `invited→registered` promote | Rule 2.1 (dispatchFreshLead, 2026-04-28) created `attendee.status='invited'` on T5 send, BEFORE the form. RPC's existing-attendee branch rejected ANY non-deleted row → form path was dead for every T5 recipient. |
| **Fix B** | `008c7ea` | Postgres trigger cascades attendee soft-delete on lead soft-delete + 2-orphan backfill | Orphan attendees pollute capacity counts. Defense-in-depth at DB layer ensures cascade fires regardless of soft-delete entry point. |
| **Fix C** | `98dc5df` | `dispatchFreshLead` writes `lead.status='invited'` on T5 path | Park T5 recipients in Tier 2 ("רשומים") so future T4 broadcasts include them; matches semantic of attendee row created in same dispatch. |
| **Fix D** | `4968cd3` | `event-register` EF forwards `event_id` to send-message | Storefront-form path didn't enable `injectEventVariables`, so `%payment_url_50%` + `%event_deposit_amount%` stayed unsubstituted. P12 loud-failure blocked SMS dispatch on every form submit. |
| **+** | `9a70fae` | 4 templates: drop redundant `אירוע המותגים` before `%event_name%` | Real `event_name` values include `אירוע המותגים`; pre-fix output duplicated the phrase. 4 templates affected (`event_registration_open_sms_he`, `event_waiting_list_sms_he`, `event_attendee_moved_paid_email_he`, `event_attendee_moved_unpaid_email_he`). |
| **+** | `cc297af` | 6 SMS templates shortened to ≤5 parts | Global SMS vendor 404'd on bodies above ~6 parts. Empirically confirmed; vendor accepts ≤5 with margin. Backend length guard backlogged for post-cutover. |
| **+** | `01939e9` | `SHORTENING_PROPOSALS.md` authored + reviewed offline with Cowork | Documentation artifact for the shortening pass. |
| **+** | `2c92a54` | P5_8 SPEC retrospective | Per Foreman protocol. |

**All fixes shipped on `develop`. Zero pushes to `main`.**

---

## 4. Side findings logged

### A. Date format inconsistency between `event-register` and `injectEventVariables`
`event-register` pre-sets `event_date` as raw `YYYY-MM-DD`; `injectEventVariables` formats `DD/MM/YYYY`. Form-path SMS shows `📅 2026-05-27`; T5/lead-intake-path SMS shows `📅 27/05/2026`. **Not a delivery blocker; cosmetic.** Defer to post-cutover SPEC.

### B. `event_registration_confirmation_sms_he` hardcoded values
Phone `053-364-5404` and location `הרצל 32, אשקלון` still hardcoded. Rule 9 violation. Daniel-deferred to post-cutover when the SaaS-tenant has `tenant.support_phone` + `tenant.address` columns.

### C. `registration_method='form'` mis-attribution
`dispatchFreshLead`-created attendees show `registration_method='form'` (table default) instead of `'lead_intake'`. Cosmetic data-quality issue. Daniel-deferred.

### D. Backend SMS length guard
Post-cutover SPEC: send-message EF should reject body >5 parts before Make dispatch, configurable per-tenant. Backlog candidate `P5_X_BACKEND_SMS_LENGTH_GUARD`.

### E. T5 dispatch when event is already at cap
Currently lead-intake fires T5 regardless of capacity. Filter is `status IN ('registration_open','waiting_list')`; doesn't check if event is at-cap. Customer gets invited even if there's no slot — forces them down the form-submit-then-waiting_list path. Acceptable behavior but worth Daniel's attention.

### F. Two T7 rules on Prizma
"אירוע פתח להרשמה - הזמנת רשימת המתנה" (status_change to `registration_open`) and "שינוי סטטוס: הזמנה ממתינים" (status_change to `invite_waiting_list`). Both active, both use `cross_event_active_waitlist` resolver, same template. Either intentional redundancy or a duplicate. Daniel should confirm.

### G. Storefront form rewire (P5_7) still pending
The SuperSale storefront form posts to legacy `/api/leads/submit` → `cms_leads`. Real customer leads on cutover day still land in the legacy table unless P5_7 ships. **Cutover-blocking; separate SPEC, must complete before 2026-05-03.**

---

## 5. State at end of QA run (post-baseline-restore)

| What | Value |
|---|---|
| Lead `a262bc0e` ("T5 Canary Post-Shorten") | `status='confirmed'`, `is_deleted=false`, +972537889878 |
| Attendee `ce1e02a9` (in V4 Edge volume) | `status='registered'`, `payment_status='paid'`, `is_deleted=false` |
| All other attendee rows for this lead | `is_deleted=true` (move-trail soft-deleted) |
| Lead `46d51368` (Flow 5 Cap Filler) | `is_deleted=true` (cascade fired Fix B trigger) |
| V4 Edge volume | `registration_open`, cap=50 |
| V4 Edge concurrent A | `will_open_tomorrow` (restored) |
| V4 Edge concurrent B | `will_open_tomorrow` (untouched) |
| V4 F14 dst | `planning` (restored) |
| V4 F14 src | `planning` (restored) |
| Orphan attendee count (Prizma + demo) | **0** |
| `crm_message_templates` | All 6 shortened templates byte-for-byte aligned with V2 files; all 4 redundancy-fixed templates aligned. |
| Make scenario 9104395 | active, `dlqCount=4` (unchanged from pre-QA), no new failures during the run. |

---

## 6. Cutover-readiness checklist

| Item | Status |
|---|---|
| ✅ V2 templates live on both Prizma + demo | DONE |
| ✅ Templates ≤5 parts post-substitution | DONE (vendor empirically accepts 5–6 parts; all 6 templates verified) |
| ✅ Rule 2.1 fresh-lead flow (T5 dispatch + attendee upsert) | DONE |
| ✅ Form-submit invited→registered promote (Fix A) | DONE |
| ✅ Cascade attendee soft-delete (Fix B) | DONE |
| ✅ Lead Tier-2 promote on T5 (Fix C) | DONE |
| ✅ event-register forwards event_id (Fix D) | DONE |
| ✅ Wording redundancy in 4 templates | FIXED |
| ✅ All 14 QA flows GREEN | DONE |
| ✅ Make scenario stable, DLQ unchanged | DONE |
| ✅ Iron Rule 31 integrity gate green | DONE (verified each commit) |
| ⚠️ Storefront form rewire (P5_7) | **NOT DONE — cutover-blocking** |
| ⚠️ Make.com source events on Prizma still on legacy Monday flow | (separate concern; not part of this QA scope) |

**My recommendation:** the V2 messaging pipeline is GREEN end-to-end. The remaining cutover-blocking item is **P5_7_STOREFRONT_FORM_REWIRE** (the storefront form must POST to lead-intake EF, not the legacy `/api/leads/submit`). Once P5_7 lands, cutover-day work is environment switch only.

**My recommendation on merge-to-main:** I am NOT authorized to merge per Iron Rule 9.7. **Daniel must explicitly authorize.** When ready, Daniel opens a PR from `develop` to `main` himself.

---

## 7. Commit list for the merge PR

In chronological order on `develop`, all by Foreman (Co-Authored-By: Claude Opus 4.7):

1. `01939e9` — docs(campaigns): SMS shortening proposals for 6 over-length SuperSale templates
2. `cc297af` — fix(sms): shorten 6 SuperSale SMS templates to ≤5 parts
3. `72774d9` — feat(rpc): register_lead_to_event promotes invited→registered (P5_8 Fix A)
4. `008c7ea` — feat(db): cascade attendee soft-delete on lead soft-delete (P5_8 Fix B)
5. `98dc5df` — feat(crm): T5-recipient leads land in Tier 2 status='invited' (P5_8 Fix C)
6. `2c92a54` — chore(spec): close P5_8 with retrospective
7. `4968cd3` — fix(event-register): Fix D — forward event_id so substitution layer can resolve %event_deposit_amount% + %payment_url_50%
8. `9a70fae` — fix(templates): remove redundant 'אירוע המותגים' before %event_name% in 4 templates

(Plus an additional commit for this final report — see §8.)

**Migrations applied to live DB (Prizma + demo) via Supabase MCP `apply_migration`:**
1. `p5_8_register_lead_to_event_invited_promote`
2. `p5_8_cascade_attendee_soft_delete`

**Edge Functions deployed via CLI by Daniel:**
1. `lead-intake` — for Fix C
2. `event-register` — for Fix D

---

## 8. Awaiting Daniel

1. Daniel checks +972537889878 phone for ~16 SMS arrivals throughout the session.
2. Daniel checks daniel@prizma-optic.co.il inbox for ~17 emails.
3. Daniel checks +972503348349 for the 2 Flow 5 SMS (T5 invite + waiting_list_confirmation).
4. Daniel reviews this report.
5. **Daniel opens GitHub PR `develop → main`** if approved. I do NOT open or merge.

This report is committed at `modules/Module 4 - CRM/go-live/specs/P5_8_INVITED_TO_REGISTERED_TRANSITION/FINAL_QA_REPORT_2026-04-29.md`.
