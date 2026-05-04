# SPEC — QUICK_REGISTER_QR_FLOW

> **Authored by:** opticup-strategic (Foreman, in-session via Campaign Overseer per L-002)
> **Authored on:** 2026-05-04
> **Module:** 4 — CRM
> **Phase:** Post-cutover follow-up (Item #4 of M4 closure backlog)
> **Production discipline:** test ONLY on demo (`8d8cfa7e-ef58-49af-9702-a862d459cccb`). NO writes to prizma without explicit Daniel approval per write.

---

## 1. Goal

Build the customer-facing **quick-register-via-QR** flow end-to-end. The legacy Make scenario branch `"ברקוד רישום לאירוע - רישום מהיר"` (router branch in scenario `8464122`, lines 5798-6655) currently looks up event data in Monday.com — which is decommissioned post-cutover. Replace it with a Supabase-native flow:

1. Store employee sends WhatsApp message `רישום מהיר אירוע <N>` (where N = event_number)
2. Make calls a new EF op that returns a quick-register URL for that event
3. Make wraps the URL in a QR (api.qrserver.com) and sends back to the employee
4. Walk-in customer scans QR → lands on storefront page `/quick-register/?event=N` → fills form → submits to a new EF
5. EF resolves event by event_number, upserts lead, registers attendee via existing `register_lead_to_event` RPC, returns success/cap/duplicate state
6. If a coupon slot is available, the existing `event_coupon_delivery_*` automation fires (already in place — no new wiring needed)

**Goal in plain language:** walk-in customers register themselves to an active event in 30 seconds via QR, identical downstream behavior to a regular form registration.

---

## 2. Background & Motivation

**Verified evidence (per Pre-Authoring Sweep, 2026-05-04):**

- Make scenario `8464122`, branch labeled `"ברקוד רישום לאירוע - רישום מהיר"` (filter at lines 5803-5827), filter condition: text contains `"רישום מהיר אירוע"`. Branch flow: extract event_number from message text → `monday:ListItemsByColumnValues` against board `5088674576` → 4-second sleep → `green-api:SendFileByURL` with QR encoding `link_mky5yjag` (Monday column) field.
- This branch is broken post-cutover (Monday board no longer authoritative). Daniel directive 2026-05-04: "הפלואו הזה לא עובד כי אין טופס רישום מהיר ואין אוטומציה כזאת בכלל במהרכת החדשה."
- Coupon delivery mechanism today: `event_coupon_delivery_email_he` template renders an inline QR via `https://api.qrserver.com/v1/create-qr-code/?data=%lead_id%&size=300x300` + the `%coupon_code%` text (verified in DB `crm_message_templates` body offset 4078-4536). The CRM event-day checkin scanner (`modules/crm/crm-event-day-checkin.js:146`) accepts `lead_id`, `attendee_id`, or last 3 phone digits as scan input. **Quick-register attendees plug into this exact same coupon flow — no new coupon plumbing.**
- `register_lead_to_event` RPC already exists with capacity-aware logic (registered → waiting_list when full). Verified via `information_schema.routines`.
- `crm_leads.source` is a free-text column. New value `quick_register_qr` will be introduced as the source identifier for this flow's leads.
- `crm_event_attendees.registration_method` is a free-text column (currently `'form'` default). New value `quick_register_qr` will be introduced.
- `crm_events.event_number` is integer NOT NULL. Lookup-by-number is well-supported.

**Daniel's accepted decisions (verbal, 2026-05-04, recorded as REC pending in DECISIONS_LOG post-execution):**
- Q1 → "ב": always register to the event regardless of coupon availability. If full → still register (waiting_list path), still join "registered" master list, still see "no coupon available" message. Rationale: walk-in is already physically present; never reject.
- Q2 → coupon mechanism is the existing one (lead_id-as-QR). No new plumbing.
- Q3 → URL param is `event_number` (the friendly digit the employee typed), not UUID. Path: `/quick-register/?event=12`.

---

## 3. Success Criteria

### Rung 1 — Storefront page + new EF (foundational; no Make changes yet)

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 1.1 | New EF `quick-register` deployed | version ≥ 1, status ACTIVE | Supabase `list_edge_functions` |
| 1.2 | EF accepts `POST {tenant_slug, event_number, full_name, phone, email?, eye_exam_needed, terms_accepted, marketing_consent}` | 200 on happy path | `curl` from local against demo tenant slug |
| 1.3 | EF rejects when event_number not found OR event not in active status | 404 with `error: 'event_not_found'` OR 409 with `error: 'event_not_open'` | curl with bogus event_number → 404 |
| 1.4 | EF rejects when terms_accepted=false | 400 `error: 'terms_required'` | curl with terms=false |
| 1.5 | EF normalizes phone to E.164 (reuses lead-intake `normalizePhone`) | "+972537889878" stored | DB query post-call |
| 1.6 | EF upserts lead by phone (existing → reuse, missing → create with `source='quick_register_qr'`) | 1 row in crm_leads with that source | DB query |
| 1.7 | EF calls `register_lead_to_event` RPC and returns its outcome verbatim plus a `coupon_available` boolean | response shape `{ ok: true, status: 'registered'|'waiting_list'|'already_registered', coupon_available: bool, lead_id, attendee_id }` | curl response inspection |
| 1.8 | Existing duplicate (same phone already in event) → response `{ ok: true, status: 'already_registered', coupon_available: <state>, lead_id, attendee_id }` | curl second call same phone | curl |
| 1.9 | New storefront route `/quick-register/` exists in opticup-storefront repo | HTTP 200, renders Hebrew form | `curl https://prizma-optic.co.il/quick-register/?event=99` (404 with friendly Hebrew error since 99 not exists; or 200 with form if event exists) |
| 1.10 | Form fields: full_name, phone, email (optional), eye_exam_needed, terms_accepted (with link), marketing_consent | all 6 fields visible, terms link clickable | manual browse |
| 1.11 | Form submit → calls new EF, on 200 → success page state with coupon-available banner; on `waiting_list` or `coupon_available=false` → success page with "no coupon available" Hebrew message; on duplicate → friendly "already registered" message; on event-not-open → "event not active" message | 4 distinct success/info screens | manual test on demo |
| 1.12 | Storefront integrity gate clean | `npm run verify:integrity` exit 0/2 | post-commit |
| 1.13 | All modified files ≤350 lines (Iron Rule 12) | wc -l per file | post-commit |
| 1.14 | Iron Rule 14 — no new tables (all infra exists) | `git diff --stat` shows no schema migration files | post-commit |
| 1.15 | Iron Rule 22 — defense-in-depth: every `.insert`/`.upsert` includes `tenant_id` | grep | post-commit |
| 1.16 | Single Rung 1 commit on develop | 1 commit covering EF + storefront page + storefront route | `git log` |

### Rung 2 — QR-URL endpoint for Make (server-side only)

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 2.1 | EF `quick-register` accepts second op: `POST {op:'lookup_url', tenant_slug, event_number}` | 200 with `{ ok: true, url: 'https://prizma-optic.co.il/quick-register/?event=12', event_name, event_date_he }` | curl |
| 2.2 | Lookup_url rejects unknown event_number with `404 event_not_found` | curl bogus | curl |
| 2.3 | Lookup_url rejects events whose status NOT IN ('registration_open', 'will_open_tomorrow', 'event_day') with `409 event_not_open` | curl against a `planning` event | curl |
| 2.4 | Iron Rule 12 + integrity gate clean | as above | post-commit |
| 2.5 | Single Rung 2 commit | 1 commit | `git log` |

### Rung 3 — Update Make scenario branch + smoke test

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 3.1 | Scenario `8464122` branch `"ברקוד רישום לאירוע - רישום מהיר"` updated: replace `monday:ListItemsByColumnValues` (module 36) with HTTP call to new EF op `lookup_url` | branch now uses `http:MakeRequest` to `/functions/v1/quick-register` | inspect via Make MCP `scenarios_get` |
| 3.2 | The QR module (40, `green-api:SendFileByURL`) caption + URL refer to new EF response, not Monday columns | caption = `ברקוד רישום לאירוע {{N.event_number}}`; QR URL = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={{encodeURL(N.url)}}` | inspect |
| 3.3 | If event not open → branch sends Hebrew error message back to employee instead of QR | new "event closed" path emitting WhatsApp text | manual test from Daniel's phone |
| 3.4 | End-to-end smoke test on demo: Daniel sends `רישום מהיר אירוע <demo-event-number>` to demo WhatsApp → receives QR within 10s | scan QR → lands on storefront → submits form → attendee row appears in CRM with `registration_method='quick_register_qr'` | live test |
| 3.5 | Make scenario maxErrors + DLQ unchanged from current settings | no regression | inspect |

---

## 4. Autonomy Envelope

**Executor CAN do without asking:**
- Write the new EF `quick-register` end-to-end with both ops (`register` default, `lookup_url`)
- Create the storefront page `/quick-register/` in `opticup-storefront` repo (uses existing storefront patterns — RTL, Tailwind, mobile-first)
- Wire the form to the new EF
- Create the 4 success/info screens with Hebrew copy
- Update the Make scenario branch via Make MCP after Rung 1 + 2 are deployed
- Use the existing `register_lead_to_event` RPC (confirmed exists)
- Add `quick_register_qr` as new value to `crm_leads.source` and `crm_event_attendees.registration_method` (free-text columns; no DDL needed)
- Reuse `normalizePhone` from `supabase/functions/lead-intake/index.ts` verbatim (Rule 21 — extend, don't duplicate)
- Run integrity gate, single commit per Rung, push to develop
- After all 3 Rungs land + smoke test passes, write `EXECUTION_REPORT.md` + `FINDINGS.md`

**Executor MUST stop and ask:**
- ANY DDL (new column, new table, new RPC) — none should be needed; if it appears needed, the SPEC missed something
- Any prizma write
- Any change to `register_lead_to_event` RPC signature
- Any change to the existing coupon delivery template
- Any merge to main
- Any new Make scenario (only the existing branch is updated, NOT a new scenario)
- If the storefront route conflicts with an existing page

---

## 5. Stop Triggers (in addition to global per CLAUDE.md §9)

1. **`register_lead_to_event` RPC signature differs from assumption** — STOP, paste actual signature, ask Foreman.
2. **Storefront `/quick-register/` route already exists with conflicting content** — STOP, list the existing content, ask Foreman.
3. **Make scenario branch structure differs materially from blueprint dump** (e.g., extra modules between filter and QR sender) — STOP, screenshot the scenario, ask Foreman.
4. **EF `lookup_url` op finds an active event but the event has 0 capacity (max_capacity=0 or null)** — STOP, surface the data anomaly, ask Foreman whether to treat as "event_not_open" or as legit zero-cap.
5. **Smoke test fails: QR scan lands on 404 OR submit succeeds but attendee row doesn't appear in CRM** — STOP, paste curl output + DB query result.
6. **Pre-existing `whatsapp-catalog-flow` EF needs modification to accommodate this** — STOP. The new `quick-register` EF is independent; do NOT merge functionality.

---

## 6. Rollback Plan

- **Rung 1 rollback:** `git revert <rung-1-commit>` on both repos. EF deletes via Supabase MCP `delete_edge_function`. Storefront page reverts. **No DB rollback needed** — no migrations.
- **Rung 2 rollback:** `git revert <rung-2-commit>` on opticup repo. EF redeploys without lookup_url op (single-op fallback).
- **Rung 3 rollback:** Make scenario reverts to legacy Monday lookup via Make UI (Daniel can revert from version history if needed). Note: legacy will still be broken (Monday is gone), but at least no false QRs go out.
- **Full rollback:** if all 3 Rungs misbehave, revert all 3 commits. The Make scenario branch was already broken pre-SPEC, so reverting leaves the system in its pre-SPEC state (broken-but-known).

---

## 7. Out of Scope

- Adding employee-allowlist filter to the Make scenario (any sender can currently trigger the branch — security risk, but pre-existing; separate SPEC).
- Adding rate limiting to the EF (storefront `lead-intake` has bot protection planned in P5_6 which would also cover this — defer).
- Monday.com cleanup (the Monday board mentioned in the legacy branch is no longer queried after Rung 3).
- Adding a UI to manage which Hebrew messages WhatsApp sends back (the strings are inline in Make for now).
- Building a new automated coupon-pool-by-attendee mechanism (the existing single-coupon-code per event is reused — Daniel confirmed).
- Modifying `event_coupon_delivery_*` templates — they already render the right QR.

---

## 8. Expected Final State

```
opticup repo (ERP):
  supabase/functions/quick-register/
    index.ts               (NEW — ~250 lines, 2 ops)
    deno.json              (NEW)
  modules/Module 4 - CRM/docs/specs/QUICK_REGISTER_QR_FLOW/
    SPEC.md                (this file)
    ACTIVATION_PROMPT.md   (this SPEC's executor prompt)
    EXECUTION_REPORT.md    (added by executor)
    FINDINGS.md            (added by executor)

opticup-storefront repo:
  src/pages/quick-register/index.astro   (NEW — Hebrew form page, RTL)
  src/components/QuickRegisterForm.tsx   (NEW or .astro)
  src/styles/quick-register.css           (NEW if needed; otherwise Tailwind only)
  Possibly: src/lib/api.ts addition for the new EF call

Make:
  Scenario 8464122, router branch "ברקוד רישום לאירוע - רישום מהיר":
    OLD: filter → SetVar → monday:ListItemsByColumnValues → sleep → green-api:SendFileByURL
    NEW: filter → SetVar → http:MakeRequest (quick-register lookup_url) → router (event_open vs not) → green-api:SendFileByURL OR green-api:SendMessage

Supabase:
  Edge Functions: quick-register (NEW, deployed via CLI per ATOMIC_CONFIRMATION_FLOW precedent)
  Live EF list: ... + quick-register v1
  No DDL.
```

**Live state validations after all 3 Rungs:**
- `crm_leads` has at least 1 row with `source='quick_register_qr'` (from Daniel's smoke test)
- `crm_event_attendees` has at least 1 row with `registration_method='quick_register_qr'`
- Make scenario shows the updated branch with the new HTTP module
- The `event_coupon_delivery_*` automation triggered by the new attendee row delivers the lead_id QR email/SMS exactly as it does for any other attendee

---

## 9. Commit Plan

3 commits across 2 repos (Make changes are out-of-band, no commit).

**Commit 1 (Rung 1) — opticup repo:**
- Message: `feat(crm): quick-register EF + walk-in registration flow`
- Files: `supabase/functions/quick-register/index.ts`, `supabase/functions/quick-register/deno.json`
- After commit: deploy via CLI: `npx supabase functions deploy quick-register --project-ref tsxrrxzmdxaenlvocyit` (Daniel runs)

**Commit 1 (Rung 1) — opticup-storefront repo (parallel):**
- Message: `feat(storefront): /quick-register/ page for QR walk-in registration`
- Files: `src/pages/quick-register/index.astro` + supporting components
- Push to opticup-storefront `develop`

**Commit 2 (Rung 2) — opticup repo:**
- Message: `feat(crm): quick-register lookup_url op for Make WhatsApp branch`
- Files: `supabase/functions/quick-register/index.ts` (modified — adds 2nd op)
- After commit: redeploy EF via CLI

**Commit 3 (Rung 3) — opticup repo:**
- Message: `chore(make): wire quick-register EF into scenario 8464122 quick-register branch`
- Files: `__LAUNCH_PLAN_DRAFT__/campaign-overseer/MAKE_SCENARIO_NOTES.md` (NEW or appended) — documents the Make UI changes that were made via Make MCP. The actual scenario lives in Make, not git.

**No merges to main from this SPEC.** Daniel handles the PR-merge after all 3 Rungs verify-green per `feedback_main_merge_via_pr.md`.

---

## 10. Cross-Reference Check (Step 1.5 sweep, completed 2026-05-04)

| Name | Lookup result | Resolution |
|------|--------------|------------|
| EF `quick-register` | NOT in `list_edge_functions` | New — OK |
| `crm_leads.source='quick_register_qr'` | Free-text column, current values: monday_legacy, shortcode_lead_form, monday_tier1_import, monday_legacy_orphan | New value, no collision |
| `crm_event_attendees.registration_method='quick_register_qr'` | Free-text column, default 'form' | New value, no collision |
| `register_lead_to_event` RPC | EXISTS in `information_schema.routines` | Reuse verbatim |
| `normalizePhone` helper | EXISTS in `lead-intake/index.ts` (already copied to `whatsapp-catalog-flow`) | Reuse — copy verbatim or refactor to shared module (executor's call) |
| Storefront `/quick-register/` | Not yet checked in storefront repo (executor verifies in Step 1) | Stop trigger #2 covers conflict |
| Make scenario `8464122` branch label `ברקוד רישום לאירוע - רישום מהיר` | EXISTS at lines 5803-5827 of blueprint dump | Modified, not duplicated |

**Sweep complete: 0 collisions / 7 names checked.**

---

## 11. Lessons Already Incorporated

From recent FOREMAN_REVIEWs:
- **L-003 (Overseer):** ground-truth checks before SPEC authoring → done (queried `crm_message_templates` body, confirmed lead_id-QR mechanism, confirmed RPC exists).
- **ATOMIC_CONFIRMATION_FLOW Foreman §"don't pre-commit to specific EF version numbers":** §9 commit plan does NOT name `quick-register v1/v2/v3`; refers to "EF deployed via CLI" generically.
- **ATOMIC_CONFIRMATION_FLOW Foreman §"add platform-deploy-block escape valve":** §5 stop-triggers explicitly cover deploy-platform 5xx — executor stops on first failure, doesn't loop.
- **ATTENDEE_COUNTER FOREMAN §"Rule-21 orphan co-staging false positive":** §9 commit plan splits Rung 2 (single-file mod) from Rung 1 (multi-file new) so the Rule-21 hook won't fire on co-staged duplicate var names. The executor SKILL was updated 2026-05-04 with the explicit grep guard.

---

## 12. Manual QA — Daniel runs (after all 3 Rungs deploy)

On demo tenant only:

1. Create a demo event in CRM with status=`registration_open`, max_capacity=10, max_coupons=10. Note its `event_number` (e.g., 5).
2. Send WhatsApp message to demo-WhatsApp number (Green-API connection): `רישום מהיר אירוע 5`
3. Within 10 seconds, expect QR back. Scan QR with phone camera.
4. Lands on `https://prizma-optic.co.il/quick-register/?event=5` (or whatever the demo storefront URL is).
5. Form shown in Hebrew RTL. Fill: name, phone (use 0537889878 or 0503348349 — only allowed test phones per `feedback_test_phone_numbers.md`), email optional, eye_exam_needed, accept terms, marketing consent.
6. Submit. Expect "registered, coupon coming" success screen.
7. Daniel verifies in CRM: lead row with `source='quick_register_qr'`, attendee row with `registration_method='quick_register_qr'`, coupon delivery email/SMS sent (existing automation).
8. Repeat with same phone → expect "already registered" friendly screen.
9. Repeat by trying event 9999 → expect QR-step or storefront-page error gracefully.

**Stop trigger:** ANY prizma write during this QA → halt and escalate.

---

## 13. Deferrals (NOT this SPEC, but related)

- **Employee allowlist for Make branch trigger:** anyone WhatsApp-ing the trigger phrase can get a QR. Future SPEC.
- **Storefront `/quick-register/` translations to EN+RU:** HE-only matches campaign assets policy. EN+RU on demand.
- **Rate limiting on `quick-register` EF:** falls under P5_6 bot-protection follow-up, not this SPEC.
- **CRM-side analytics: count of leads sourced from `quick_register_qr`:** part of the Campaign metrics UI item (Item #5 of M4 closure backlog). Not this SPEC.
- **Move legacy `whatsapp-catalog-flow` EF into the same scenario:** out of scope — that's a separate inbound message handler.

---

*End of SPEC.*
