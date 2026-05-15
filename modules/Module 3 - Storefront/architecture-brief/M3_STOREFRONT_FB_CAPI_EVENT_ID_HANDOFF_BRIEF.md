# M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF — Architecture Brief

> **Status:** Brief sealed 2026-05-15 evening · Owner: Architect · Pipeline: Full-Auto
>
> **Target repo:** `opticalis/opticup-storefront` (sibling, NOT this repo). All commits land in the storefront repo's `develop` branch. ERP repo is read-only for this SPEC.
>
> **One-line:** Storefront-side completion of P2.1. Generate a UUID at form-submit time, send it to the ERP `lead-intake` and `submit-lead` EFs as `fb_event_id`, and hand it off to the thank-you-page pixel so `fbq('track', 'Lead')` fires with the same `eventID`. Without this SPEC, Meta dedup cannot work — the ERP substrate (closed 2026-05-15) is dormant until this ships.

---

## 1. Goal

Close the only structural gap preventing FB CAPI hybrid deduplication from working end-to-end. The ERP side accepts `fb_event_id`, stores it on `crm_leads`, enqueues server-side dispatch — everything works **once** the storefront sends a UUID. This SPEC adds the storefront-side three pieces: (a) UUID generation at form-submit, (b) hidden field on POST payload to EFs, (c) hand-off mechanism so thank-you-page browser pixel can use the same UUID via `fbq('track', 'Lead', {}, {eventID: uuid})`.

## 2. Background

**Why this Brief exists:**

`M4_FB_CAPI_HYBRID_DEDUPLICATION` 🟡 CLOSED WITH FOLLOW-UPS on 2026-05-15 evening. ERP substrate shipped:
- `crm_leads.fb_event_id` column (UUID, nullable) ready.
- `crm_capi_dispatch_queue` table + pg_cron consumer ready.
- `fb-capi-dispatch` Edge Function deployed.
- `lead-intake` EF v28 accepts `fb_event_id` from POST body.
- Make scenario 8542928 retired.

All 17 ERP success criteria PASS. Smoke 7/7 GREEN. But: end-to-end Meta dispatch does not work yet because the storefront never sends a `fb_event_id`. Per the closure note: *"NOT YET working end-to-end: blocked on (1) M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF SPEC in sibling repo for UUID handoff, (2) Daniel populating Prizma `tenants.fb_capi_token`."*

This SPEC closes blocker (1). Once it lands + Daniel populates the token (2), the full chain works: form → UUID → ERP DB → CAPI EF dispatches with `event_id` → thank-you-page pixel fires same `event_id` → Meta dedups → one conversion counted.

## 3. Scope

**In scope (storefront repo only):**

- **Per-form UUID generation** at form-submit time. UUID v4. Generated client-side using `crypto.randomUUID()` (native browser API, available everywhere modern enough to load the storefront).
- **Hidden field `fb_event_id`** on the POST payload of:
  - `supersale` form (and any language variant — HE/EN/RU) → calls `lead-intake` EF.
  - `NotifyMe.astro` "Notify me when in stock" component → calls `submit-lead` EF.
  - **Any other lead-creating form on the storefront** — executor pre-flight discovers (see §8 stop-trigger).
- **Hand-off to thank-you-page pixel.** Two patterns acceptable; executor picks per ergonomics:
  - **Pattern A: URL param.** Redirect to `/successfulsupersale/?fbe=<uuid>` (and `/en/...`, `/ru/...`, `/successfulmulti/` variants). Thank-you-page reads `URLSearchParams.get('fbe')`.
  - **Pattern B: sessionStorage.** Form submit writes `sessionStorage.setItem('fb_event_id', uuid)` before redirecting. Thank-you-page reads `sessionStorage.getItem('fb_event_id')`.
  - **Recommended:** Pattern A. Robust to session loss between submit and redirect; URL is the natural carrier; trivial to remove from URL after pixel fires (`history.replaceState`).
- **Pixel firing update.** Wherever `pixel_events` config currently leads to `fbq('track', 'Lead')` on URL pattern match (per `storefront_config.analytics.pixel_events`), pass an `eventID` 4th argument: `fbq('track', 'Lead', {}, {eventID: uuid})`. If `uuid` is empty (no hand-off), fire pixel without `eventID` — graceful degradation, behavior unchanged from today.
- **No new copy or UI changes.** Hidden field is hidden; UUID is invisible to the user.
- **Documentation** at `docs/FB_CAPI_HANDOFF.md` in the storefront repo (or extension to existing storefront docs — executor decides).

**Out of scope:**

- Purchase events (deferred to `M4_FB_CAPI_PURCHASE_EVENTS` post-7-day stability).
- WhatsApp QR walk-in registration (`/quick-register/`) — different funnel, different attribution, separate SPEC if ever needed.
- Custom or standard events beyond `Lead` for v1.
- Changing the `pixel_events` schema in DB. Today the storefront iterates `storefront_config.analytics.pixel_events[]` and matches URL patterns. We **read** that config and add an `eventID` argument when a hand-off UUID is present. Schema unchanged.
- ERP-side changes. All ERP work shipped in `M4_FB_CAPI_HYBRID_DEDUPLICATION`. If executor finds a gap in the ERP side mid-run → STOP and escalate (do not silently patch ERP).
- Meta Events Manager configuration. Daniel handles that side independently (token, allowed domains, test event codes).

## 4. Destructive Operations

Per Iron Rule 32: **None.**

This SPEC is purely additive: new UUID generation, new hidden field, new pixel argument. No deletions, no renames, no schema changes. If executor encounters a need for any destructive op mid-run → STOP and escalate.

## 5. Pipeline

Standard Full-Auto Pipeline:

1. **Foreman (opticup-strategic)** authors `SPEC.md` from this Brief — at `modules/Module 3 - Storefront/docs/specs/M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF/SPEC.md` (ERP-side authority per CLAUDE.md §7; storefront sibling repo doesn't get the SPEC folder, only the code change PR).
2. **Executor (opticup-executor)** clones / works in `opticup-storefront` repo. Wires UUID generation in form components, updates pixel firing path, lands changes on storefront `develop`. Default model: Sonnet (mechanical TypeScript/Astro edits — STOREFRONT_PUBLIC_DATA_LAYER session lesson about content-filter false positives on heavy-vocab phases still applies if the change touches many files).
3. **Reviewer (opticup-reviewer)** validates: pixel hand-off contract; no PII in UUID (UUIDs are not PII but reviewer confirms); no regression in pixel firing when `fb_event_id` is absent.
4. **Localhost-Tester** runs storefront smoke + simulates a full form submit on the demo storefront (`opticup-storefront-demo.vercel.app`), captures Network panel evidence that the POST body contains `fb_event_id` and the thank-you-page pixel call includes `eventID`.
5. **Foreman closes** with FOREMAN_REVIEW.md + 4 skill improvement proposals + an `OPEN_TASKS.md` update marking P2.1 fully closed (🟡 → 🟢) and capturing the remaining condition (Daniel must populate Prizma token to activate Meta dispatch).

## 6. Locked Decisions

**D1. UUID generated client-side with `crypto.randomUUID()`.**

No server round-trip to get a UUID. The form already submits via JS (FormData / fetch); generating a UUID is one line. Browser support is universal among target devices. If `crypto.randomUUID` is somehow unavailable (legacy browser), polyfill with a v4 generator — executor decides. Either way, UUID is generated **before** the POST request leaves the browser so the request body carries it.

**D2. Pattern A (URL param `?fbe=<uuid>`) for thank-you-page hand-off.**

Pattern B (sessionStorage) is more elegant but fragile: if the redirect happens via `window.location.href = '/successfulsupersale/'` and the browser drops sessionStorage between submit and load (private mode + cross-domain edge cases + iOS Safari quirks), the hand-off breaks silently. URL param is robust against all of those. After the thank-you-page fires the pixel, executor MAY use `history.replaceState` to strip `?fbe=...` from the visible URL (cosmetic; not required for correctness).

**D3. Pass UUID to pixel as 4th argument `{eventID: uuid}`.**

`fbq('track', 'Lead', {}, {eventID: uuid})`. The 3rd argument is `customData` (kept empty `{}` for v1); the 4th is `customProperties`. Per Meta's spec, `eventID` in the 4th arg is the canonical place for dedup ID. Same `event_name` (`Lead`) + same `event_id` within Meta's 7-day window → dedup'd to one conversion.

**D4. Two forms in scope: supersale + NotifyMe. Executor pre-flight enumerates all other lead-creating forms.**

If pre-flight discovers a 3rd or 4th form that POSTs to `lead-intake`, `submit-lead`, or any other lead-creating EF — STOP and escalate (D5 case). Brief authorizes only the 2 known forms; additional forms widen scope without authorization.

**D5. Graceful degradation: when no UUID is present, pixel fires as today (no `eventID`).**

If a user reaches `/successfulsupersale/` via direct link / bookmark / browser-back (no `?fbe=...` in URL, no sessionStorage), the existing `pixel_events` flow still fires `Lead` without `eventID`. Meta will see it as a non-dedup'd event. This is the same behavior as today — zero regression. The new behavior is **additive**: when a UUID IS present, we get dedup; when it's not, we don't.

**D6. Storefront ↔ ERP version compatibility.**

ERP `lead-intake` EF v28 (deployed 2026-05-15) accepts the optional `fb_event_id` field but doesn't require it. If a user submits the form **before** this SPEC ships (in a window where ERP has v28 but storefront hasn't updated yet), `lead-intake` simply stores `null` for `fb_event_id` — no error, no regression. So this SPEC can ship without coordinated cutover; ERP is forward-compatible.

**D7. Sibling-repo discipline.**

This SPEC lives at `modules/Module 3 - Storefront/docs/specs/M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF/` in the **ERP repo** (per CLAUDE.md §7 phase-label ownership: Module 3 phase status is ERP-authoritative). All code changes land in `opticup-storefront`'s `develop` branch. Executor commits in the storefront repo; cross-references the SPEC by its ERP-side path. After landing, executor returns to ERP repo to update `MASTER_ROADMAP.md` + `OPEN_TASKS.md` + the closure note in M4 SPEC's FOREMAN_REVIEW addendum.

## 7. Success Criteria

Every criterion measurable. SPEC author fills exact expected values where executor's pre-flight needs to determine them.

1. UUID v4 generated client-side at form-submit on the `supersale` form (HE primary + EN/RU if those routes exist; executor confirms).
2. Same generation on `NotifyMe.astro` ("Notify me when in stock") component.
3. Both POST payloads include `fb_event_id: <uuid>` field.
4. Network panel evidence captured: `lead-intake` POST body shows `fb_event_id`; `submit-lead` POST body shows `fb_event_id`.
5. Form-submit redirects carry `?fbe=<uuid>` to the thank-you URL (e.g. `/successfulsupersale/?fbe=<uuid>`).
6. Thank-you-page JS reads the UUID and passes it as `{eventID: uuid}` to `fbq('track', 'Lead', ...)`.
7. Network panel evidence captured: `facebook.com/tr/?...&id=<pixel_id>&ev=Lead&eid=<uuid>` request shows the `eid` parameter populated.
8. **Demo end-to-end test:** form submit on `opticup-storefront-demo.vercel.app/supersale/` → verify in ERP `crm_leads` table that the new row has `fb_event_id` populated → verify `crm_capi_dispatch_queue` shows the matching `event_id` → verify `fb_pixel_fired_at` is set on the row.
9. **Meta Test Events validation (manual one-time check):** with Daniel's Meta Events Manager test code applied, a test submission shows a single dedup'd event in Test Events panel — not two.
10. Direct navigation to `/successfulsupersale/` (no `?fbe=` param) still fires pixel `Lead` event (without `eventID`) — graceful degradation works.
11. All storefront unit tests + smoke pass post-change.
12. Storefront repo Iron Rules 24-30 unviolated (RTL, mobile-first, no direct table access, etc.).
13. ERP `OPEN_TASKS.md` updated: P2.1 marked 🟢 fully closed (with note about token population condition for Prizma).
14. Memory file `project_fb_capi_p21_state.md` updated to reflect storefront completion.
15. All commits land on `opticup-storefront/develop` + 1-2 ERP-side commits for the OPEN_TASKS/MASTER_ROADMAP/memory updates. Working tree clean both repos.

## 8. Stop-Triggers

The Executor MUST stop on any of:

- More than 2 forms POST to lead-creating EFs (Brief authorizes 2 — supersale + NotifyMe).
- `crypto.randomUUID()` not available on the storefront's target browser baseline (executor pre-flight: check `package.json` + any browserslist config).
- `pixel_events` config schema differs from KNOWLEDGE_MAP.md expectations.
- A storefront pixel firing path is found that does NOT go through `storefront_config.analytics.pixel_events` (i.e., hardcoded fbq call somewhere) — STOP, the hand-off must be wired into ALL pixel paths.
- Meta Test Events validation fails (still seeing 2 events not 1).
- The ERP `crm_leads.fb_event_id` is NOT populated after a test submission (means storefront UUID isn't reaching ERP — wiring bug).
- Sibling-repo PR cannot be created or doesn't merge to `develop` (branch protection issue).
- Iron Rules 24-30 violation in storefront repo (especially #24 Views/RPCs only, #29 View modification protocol).
- Any destructive operation needed (Brief authorizes none).

## 9. Rollback Plan

Per-commit annotated tags `pre-fb-capi-handoff-{step}` on storefront repo. Worst-case rollback:
- Revert pixel call signature changes (remove 4th-arg `eventID` parameter).
- Revert form submit JS (remove UUID generation + hidden field).
- Revert thank-you-page param reader.

All changes are additive; rollback is clean revert. The ERP side stays intact — it just sees `fb_event_id: null` on all submits (which is the current state until this SPEC ships).

## 10. Expected Final State

- Storefront repo `develop`: 1-3 commits (form submit logic + thank-you-page reader + pixel arg, possibly split per concern).
- ERP repo `develop`: 1-2 commits (OPEN_TASKS update + MASTER_ROADMAP §3 + memory).
- Both working trees clean.
- Demo end-to-end test validated (form → DB → queue → dispatch → pixel fires with eventID).
- Smoke + storefront smoke GREEN both repos.
- 🟢 P2.1 fully closed pending only Daniel populating Prizma `tenants.fb_capi_token`.

## 11. Commit Plan

Indicative. Executor adjusts after pre-flight.

**Storefront repo:**
- C1: UUID generation + hidden field on supersale form (HE/EN/RU variants).
- C2: UUID generation + hidden field on NotifyMe.astro.
- C3: Thank-you-page reader (`/successfulsupersale/` HE/EN/RU + `/successfulmulti/`) + pixel-call signature update.
- C4 (optional): `history.replaceState` cosmetic URL clean.
- C5: docs/FB_CAPI_HANDOFF.md.

**ERP repo:**
- C6: OPEN_TASKS.md + MASTER_ROADMAP §3 + memory update + FOREMAN_REVIEW addendum on M4 SPEC.

## 12. Out-of-Scope (explicit)

- Purchase events.
- WhatsApp QR walk-in registration.
- Custom or standard events beyond `Lead`.
- Changing `pixel_events` config schema in DB.
- ERP-side changes.
- Meta Events Manager configuration.

## 13. Cross-References

- `M4_FB_CAPI_HYBRID_DEDUPLICATION` (ERP-side substrate, 🟡 CLOSED 2026-05-15).
- Memory: `project_fb_capi_p21_state.md`.
- `roles/site-overseer/knowledge-build/KNOWLEDGE_MAP.md` Gap #5.
- `roles/site-overseer/FUNNEL_ROADMAP.md` Phase 2 P2.1.
- ERP `docs/FB_CAPI.md` (canonical reference).
- Iron Rules 24-30 (storefront-scoped) + Iron Rule 31 (integrity gate).

## 14. Author Notes

This is the smaller half of P2.1 — most of the architectural complexity (queue, EF, dedup logic) is already shipped on the ERP side. The storefront's job is simple: generate a UUID, send it twice (POST body + URL param), and use it in the pixel call. Three small commits, big business value: this is what makes Meta's measurement of our funnel match our internal measurement of our funnel.

After this lands, Prizma will need Daniel to populate `tenants.fb_capi_token`. Until then the chain works through the queue + EF but stops at the Meta call (skipped_no_token). Daniel's existing Meta Business Manager workflow generates that token; one-time set + done.

---

*End of Brief. Activation Prompt in sibling file `M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF_ACTIVATION_PROMPT.md`.*
