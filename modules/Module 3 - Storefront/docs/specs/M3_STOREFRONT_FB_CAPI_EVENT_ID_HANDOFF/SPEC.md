# SPEC — M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF

> **Location:** `modules/Module 3 - Storefront/docs/specs/M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF/SPEC.md`
> **Authored by:** opticup-strategic (Foreman) — Full-Auto Pipeline single chat
> **Authored on:** 2026-05-15 (evening)
> **Module:** 3 — Storefront (ERP-side authority per CLAUDE.md §7 phase-label ownership; code lands in sibling repo `opticalis/opticup-storefront`)
> **Phase (if applicable):** Phase 2 P2.1 — completion half (substrate shipped 2026-05-15 by M4_FB_CAPI_HYBRID_DEDUPLICATION 🟡)
> **Author signature:** opticup-architect → opticup-strategic Foreman session, Daniel-authorized via M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF_BRIEF.md sealed 2026-05-15 evening
> **Brief:** `modules/Module 3 - Storefront/architecture-brief/M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF_BRIEF.md`
> **Target repo for code:** `opticalis/opticup-storefront` on `develop` branch. This (ERP) repo is read-only for this SPEC except for closeout doc updates.

---

## 0. Pre-Authoring Reality Check

- **Brief read in full** on 2026-05-15 (evening). All Locked Decisions D1-D7 carried into this SPEC.
- **Parent SPEC `M4_FB_CAPI_HYBRID_DEDUPLICATION` closed 🟡** 2026-05-15 evening. ERP substrate live on demo: `crm_leads.fb_event_id` column (uuid, nullable) populated; `crm_capi_dispatch_queue` table + pg_cron consumer ready; `fb-capi-dispatch` EF deployed; `lead-intake` EF v28 accepts optional `fb_event_id` (D6 forward-compatible). M4 SPEC closeout note explicitly named this storefront SPEC as the remaining blocker (1 of 2 — the other is Daniel populating Prizma `tenants.fb_capi_token`).
- **Sibling repo state verified** at SPEC-authoring time:
  - `opticup-storefront` on `develop`, remote `https://github.com/OpticaLis/opticup-storefront.git`.
  - Working tree clean except for untracked `.claude/prompts/`, `.claude/settings.local.json`, `.spec-output/` (all are dev tooling, not code). Executor will leave them alone — selective `git add` by filename only.
  - Node engine: `>=22.12.0`. Astro `^6.1.1`. `crypto.randomUUID()` available natively in all target browsers (no polyfill needed for Astro 6 / Node 22 baseline).
  - No browserslist override in `package.json` — Astro/Vite defaults apply (ES2020+).
- **Pixel firing path mapped** at SPEC-authoring time:
  - **Single project-source pixel call:** `src/lib/analytics.ts:91` — `getPixelEventsScript(events)` generates inline JS that, on thank-you-page load, iterates `pixel_events` rules from `storefront_config.analytics.pixel_events[]` and fires `fbq('track', r.e)` (2-arg form, no `eventID` today). This is the SINGLE point to wire `{eventID: uuid}` injection.
  - `docs/wp-*.html` archive files contain literal `fbq('init', ...)` calls but those are legacy WordPress static archives, NOT active Astro routes. Excluded from scope. (If the Executor's pre-flight finds an active route that hardcodes `fbq('track', 'Lead', ...)` outside `analytics.ts` → STOP and escalate per §5 below.)
- **Form locations mapped** at SPEC-authoring time:
  - Supersale source forms: `src/pages/supersale-stock/index.astro` + `src/pages/supersale-takanon/index.astro` + `src/pages/api/supersale-stock.ts` (API route — may or may not be in scope; executor decides per pre-flight).
  - NotifyMe component: `src/components/NotifyMe.astro` — inline `<script define:vars={...}>` form submit handler from line 65.
  - HE/EN/RU variants: executor confirms in pre-flight. Brief D4 authorizes only **2 forms** (supersale + NotifyMe) — language variants count as the same form. If a third lead-creating form (not supersale, not NotifyMe) is found → STOP per §5.
- **Cross-Reference Check (Rule 21 enforcement at author time)** — performed against authoritative sources:
  - `fb_event_id` in storefront repo: 0 hits (new name, no collision). ERP side has `crm_leads.fb_event_id` column — matches by design (the wire field name).
  - `?fbe=` URL param convention: 0 hits in storefront repo (new convention, no collision).
  - `eventID` fbq argument: 0 hits in storefront repo (new usage, no collision).
  - `crypto.randomUUID` already used elsewhere in storefront repo: scan returned 0 explicit hits — first use will be in this SPEC's form-submit JS. Browser availability confirmed via Astro 6 / Node 22 engine pin.
  - Sweep completed 2026-05-15 against storefront repo HEAD; **0 collisions / 0 hits resolved**. New names are clean.
- **Lessons applied from prior FOREMAN_REVIEWs (3 most recent in this module + parent SPEC):**
  - FROM `M4_FB_CAPI_HYBRID_DEDUPLICATION/FOREMAN_REVIEW.md` (parent SPEC, 2026-05-15) → Author Proposal #2 (ROLLBACK CLI command pre-verification) → APPLIED in §6 (rollback uses only `git` commands — universally available, no CLI verification needed).
  - FROM `M4_FB_CAPI_HYBRID_DEDUPLICATION/FOREMAN_REVIEW.md` → D-AUTH-3 predicted-state (`skipped_no_token` for demo's tenants.fb_capi_token=NULL) → APPLIED in §3 SC #11 (E2E test expects `crm_capi_dispatch_queue.status='skipped_no_token'` for demo — NOT `processed`; token absence is the predicted terminal state until Daniel populates).
  - FROM `M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT/FOREMAN_REVIEW.md` (2026-05-11) → Author Proposal A1 (Pre-author MCP surface scan for external infra) → NOT APPLICABLE (this SPEC touches only repo code; no external infra provisioning, no Vercel/Cloudflare/GitHub MCP calls planned).
  - FROM `M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT/FOREMAN_REVIEW.md` → Author Proposal A2 (Forbid `updated_at`-as-proof in SCs) → APPLIED in §3 — all E2E DB criteria use substantive columns (`fb_event_id IS NOT NULL`, `crm_capi_dispatch_queue.event_id`, `fb_pixel_fired_at`), never `updated_at` as proof.
- **Pre-existing untracked files in storefront repo** surveyed at author time: 3 paths (`.claude/prompts/`, `.claude/settings.local.json`, `.spec-output/`). All dev tooling. Executor leaves them alone — selective `git add` by filename throughout.
- **CLAUDE.md heading convention** confirmed: `## N. Title` plain numbered (no `§` prefix — destructive-ops-declared.mjs regex requires this).

### Baselines (referenced by §3 Success Criteria as `BASE_*`)

| Symbol | File | Metric | Value (captured 2026-05-15) |
|---|---|---|---|
| `BASE_FBQ_ARG_COUNT` | `opticup-storefront/src/lib/analytics.ts:91` | fbq('track', r.e) — argument count today | 2 (track verb + event name, no customData, no eventID) |
| `BASE_FB_EVENT_ID_HITS_STOREFRONT` | `opticup-storefront/**` | grep `fb_event_id` count | 0 (new name in this SPEC) |
| `BASE_NOTIFYME_LINES` | `opticup-storefront/src/components/NotifyMe.astro` | `wc -l` | ~120 (executor confirms exact in pre-flight) |
| `BASE_FORMS_IN_SCOPE` | `opticup-storefront/src/**` | lead-creating forms POSTing to lead-intake or submit-lead | 2 (supersale + NotifyMe per Brief D4; executor pre-flight confirms no 3rd form) |
| `BASE_ERP_LEAD_INTAKE_VERSION` | ERP Supabase Edge Function `lead-intake` | deployed version accepting fb_event_id | v28 (D6 forward-compatible — accepts but doesn't require) |

---

## 1. Goal

Ship the storefront-side completion of FUNNEL_ROADMAP P2.1 (FB CAPI Hybrid Deduplication). Add (a) client-side UUID v4 generation at form-submit on the **2 in-scope lead-creating forms** (supersale variants + NotifyMe), (b) a hidden `fb_event_id` field on the POST payload to the `lead-intake` and `submit-lead` Edge Functions, and (c) a thank-you-page hand-off via URL param `?fbe=<uuid>` so the Facebook Pixel call fires with `eventID: <uuid>` as its 4th argument, enabling Meta to dedup the server-side CAPI event (already shipped by M4) against the browser-side Pixel event into one conversion.

Without this SPEC, the ERP's M4-shipped CAPI substrate is dormant: `lead-intake` always stores `fb_event_id=null`, the dispatch queue can never carry an `event_id`, and Meta cannot dedup. With it, the only remaining gate to end-to-end Meta dispatch is Daniel populating `tenants.fb_capi_token` for Prizma.

---

## 2. Background & Motivation

`M4_FB_CAPI_HYBRID_DEDUPLICATION` (parent SPEC, ERP side) closed 🟡 on 2026-05-15 evening. All 17 ERP success criteria passed. ERP smoke 7/7 GREEN. The substrate is verified working on demo:

- `crm_leads.fb_event_id` column ready (uuid, nullable).
- `crm_capi_dispatch_queue` table with 13 columns, RLS canonical pattern, byte-identical to `crm_message_queue` template.
- `fb_capi_dispatch_consumer` pg_cron job ticking every minute.
- `fb-capi-dispatch` Edge Function deployed.
- `lead-intake` EF v28 accepts optional `fb_event_id` from POST body; stores `null` when absent (D6 forward-compatible — ERP works regardless of whether storefront sends the field).

The end-to-end chain works on demo at the substrate level (POST → `crm_leads` → queue → cron tick → EF dispatch → terminal `status='skipped_no_token'` because demo's `tenants.fb_capi_token` is intentionally NULL per D-AUTH-3). What does NOT work yet: the storefront sends no `fb_event_id`, so no dedup ID flows. This SPEC adds the only missing piece.

After this SPEC closes, P2.1 graduates from 🟡 (substrate-only) to 🟢 (full chain wired). Final activation of Meta dispatch for Prizma requires Daniel populating `tenants.fb_capi_token` (one-time Meta Business Manager workflow, separate from any SPEC).

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Storefront repo branch state at SPEC start | On `develop`, commits ahead of `origin/develop` = 0 | `cd C:/Users/User/opticup-storefront && git status && git rev-list --count origin/develop..HEAD` → "nothing to commit" + `0` |
| 2 | Pre-flight form enumeration | Exactly 2 lead-creating forms identified: supersale (HE/EN/RU variants count as 1) + NotifyMe.astro | Executor pre-flight grep across `src/**` for `lead-intake` + `submit-lead`; report in EXECUTION_REPORT.md §1. If count > 2 → STOP per §5. |
| 3 | UUID generation in supersale form | `crypto.randomUUID()` called once per form-submit, result stored in a JS variable named `fbEventId` (or equivalent), no collision with existing names | Executor grep for `crypto.randomUUID` post-change: ≥ 1 hit in each in-scope supersale form file |
| 4 | UUID generation in NotifyMe.astro | Same pattern as #3 | Executor grep post-change: 1 hit in `NotifyMe.astro` |
| 5 | Hidden `fb_event_id` on supersale POST body | Form fetch payload includes `fb_event_id: <uuid>` field as a top-level POST body key | Network panel screenshot/HAR capture in TEST_REPORT.md showing `lead-intake` POST body contains `fb_event_id` key with UUID v4 value |
| 6 | Hidden `fb_event_id` on NotifyMe POST body | Form fetch payload includes `fb_event_id: <uuid>` | Same network panel evidence for `submit-lead` |
| 7 | Thank-you-page hand-off via URL param | Form-submit redirect URLs carry `?fbe=<uuid>` (URL-encoded if needed); thank-you-page JS reads `URLSearchParams.get('fbe')` | TEST_REPORT.md captures actual redirect URLs (e.g., `/successfulsupersale/?fbe=<actual-uuid>`) |
| 8 | Pixel call signature updated | `src/lib/analytics.ts` `getPixelEventsScript()` emits payload that passes `{eventID: <uuid>}` as 4th arg to `fbq('track', r.e, {}, {eventID: <uuid>})` when `?fbe=` param is present | Executor grep post-change: payload string contains `eventID` AND `URLSearchParams` (or equivalent reader) |
| 9 | Graceful degradation when no UUID | Direct navigation to thank-you-page (no `?fbe=` param) still fires `fbq('track', r.e)` as today (2-arg form) — zero regression | Manual browser test on demo: load `/successfulsupersale/` directly, verify Network panel shows `facebook.com/tr/` request with `ev=Lead` and NO `eid=` parameter |
| 10 | End-to-end demo test: ERP `crm_leads.fb_event_id` populated | After a real submission on `opticup-storefront-demo.vercel.app/supersale-stock/` (or whatever the demo supersale path is), the newly-created `crm_leads` row's `fb_event_id` column is NOT NULL and matches the UUID generated by the form | Supabase MCP `execute_sql`: `SELECT id, fb_event_id, created_at FROM crm_leads WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb' ORDER BY created_at DESC LIMIT 1` → `fb_event_id IS NOT NULL` |
| 11 | End-to-end demo test: `crm_capi_dispatch_queue` row matches | The queue row created from #10 has `event_id` equal to the UUID from #10 AND terminal `status='skipped_no_token'` (NOT `processed`, NOT `failed_*`) per D-AUTH-3 predicted state for demo (demo `tenants.fb_capi_token` IS NULL — this is correct, NOT a regression) | Supabase MCP `execute_sql`: `SELECT lead_id, event_id, status, retries, processed_at FROM crm_capi_dispatch_queue WHERE lead_id = '<id-from-#10>'` → `event_id` matches; `status='skipped_no_token'`; `processed_at IS NOT NULL` (cron tick has run) |
| 12 | End-to-end demo test: `fb_pixel_fired_at` set | After the thank-you-page loads in a real browser session and the Pixel fires, `crm_leads.fb_pixel_fired_at` is non-null. (Note: this is a downstream column populated by a separate mechanism — see §10 Dependencies; if the storefront does not have a pixel-fired-back-to-ERP wire, this criterion is observational only and may be DEFERRED with explicit note in TEST_REPORT.md.) | Supabase MCP query for the same lead row; if `fb_pixel_fired_at IS NULL` post-pixel-fire, log as KNOWN-GAP in FINDINGS.md (not a STOP) |
| 13 | Network panel evidence: Pixel call contains `eid` | The browser-side Facebook Pixel request URL contains `&eid=<uuid>` query parameter matching the UUID from #10 | TEST_REPORT.md captures the `facebook.com/tr/?...&eid=<uuid>` request URL |
| 14 | Meta Test Events validation (manual, one-time) | With Daniel's Meta Events Manager test code applied (out-of-band), a test submission shows ONE deduplicated event in the Test Events panel — not two | Daniel runs this manually after SPEC closure. Logged as DEFERRED-MANUAL in TEST_REPORT.md. NOT a SPEC-closure blocker (the substrate is correct even if Daniel hasn't run the manual check). |
| 15 | Storefront safety-net smoke remains GREEN post-change | All existing storefront smoke tests pass | `cd C:/Users/User/opticup-storefront && npm run verify:full` → exit 0 |
| 16 | ERP smoke remains GREEN post-change | All 7 ERP baseline tests pass on demo (the ERP didn't change, but a sanity-check confirms no cross-repo regression from the new POST field) | `cd C:/Users/User/opticup && node tests/smoke/baseline.test.mjs` → exit 0 |
| 17 | Storefront repo Iron Rules 24-30 unviolated | No new direct table access; no image proxy bypass; RTL preserved; mobile-first preserved; no View modifications; safety-net still gates | Reviewer audits during the Reviewer phase; reported in REVIEW.md |
| 18 | Integrity Gate (Iron Rule 31 — storefront repo) | `npm run verify:integrity` (or storefront equivalent) returns exit 0 or 2 (no null-byte ERROR) on every commit | Storefront pre-commit hook + `cd C:/Users/User/opticup-storefront && npm run verify:staged` → exit 0 or 2 |
| 19 | Destructive Operations declared (Iron Rule 32 — ERP repo for SPEC.md commit) | This SPEC's `## Destructive Operations` section reads `None.` and the storefront commits introduce zero destructive operations | ERP pre-commit hook on SPEC.md acceptance + storefront diff review confirming no deletes / renames / drops |
| 20 | Storefront repo commits land on `develop` cleanly | Storefront repo HEAD ahead of `origin/develop` by exactly the planned commit count (per §9), each commit message in English `type(scope): description` format | `cd C:/Users/User/opticup-storefront && git log origin/develop..HEAD --oneline \| wc -l` → matches §9 count |
| 21 | ERP repo closeout commits land on `develop` cleanly | ERP repo gains 1-2 closeout commits per §9: SPEC folder lifecycle artifacts + OPEN_TASKS/MASTER_ROADMAP/memory/M4 addendum doc updates. Pre-existing M-state files untouched. | `cd C:/Users/User/opticup && git log origin/develop..HEAD --oneline \| wc -l` → matches §9 plan |
| 22 | Both working trees clean at SPEC close | `git status --short` returns empty in both repos | `cd C:/Users/User/opticup-storefront && git status --short` → empty; same for ERP repo (within the closeout scope — pre-existing untracked files untouched per CLAUDE.md §1.4 and the user's session-start decision) |

**Every SPEC must include an Integrity Gate criterion** — fulfilled by SC #18.
**Every SPEC must declare Destructive Operations** — fulfilled below.

---

## 3a. Shared Edit Block (multi-file SPECs only)

This SPEC applies a similar UUID-generation + hidden-field pattern to **2 distinct forms** (supersale + NotifyMe). The forms' submit handlers differ in shape (supersale uses a more complex multi-field POST, NotifyMe is simpler), so a byte-identical block is NOT viable. Instead, the SAME LOGIC must be applied with per-file adjustment:

### Block A — UUID generation snippet (logical pattern, per-file adjusted)

- **Insertion location:** Inside each form's submit handler, BEFORE the `fetch()` / POST call to the Edge Function, AFTER the existing field collection (phone, email, etc.).
- **Logic pattern** (each form adapts to its own variable names + payload object):
  ```javascript
  // Generate per-submission UUID v4 for FB CAPI dedup.
  // Safe: crypto.randomUUID() is available natively in Astro 6 / Node 22 target browsers.
  const fbEventId = crypto.randomUUID();
  // Add to POST payload as fb_event_id (matches ERP lead-intake / submit-lead v28 contract).
  // Carry to thank-you-page via ?fbe= URL param so the Pixel call dedups against the CAPI event.
  ```
- **Files this block applies to:**
  - All supersale form variants (executor confirms HE/EN/RU paths in pre-flight)
  - `src/components/NotifyMe.astro`

### Block B — Thank-you-page reader + pixel signature update (single location)

- **Insertion location:** `src/lib/analytics.ts` `getPixelEventsScript(events)` function — modify the inline JS payload string.
- **Logic pattern** (single-source change, applies to all thank-you-pages because the inline script is generated once and embedded everywhere via `BaseLayout.astro`):
  ```javascript
  // Read ?fbe= param if present (carries fb_event_id from form submit page).
  var fbEventId = '';
  try { fbEventId = new URLSearchParams(window.location.search).get('fbe') || ''; } catch(_){}
  // Existing rule-matching loop, but pass eventID as 4th arg when present.
  rules.forEach(function(r){
    if(path===r.p || path===r.p.replace(/\/$/,'') || path+'/'===r.p) {
      if (fbEventId) {
        fbq('track', r.e, {}, {eventID: fbEventId});
      } else {
        fbq('track', r.e);  // graceful degradation — unchanged 2-arg form
      }
    }
  });
  ```
- **File this block applies to:** `src/lib/analytics.ts` (single location; the inline payload generated here is embedded into every page via `BaseLayout.astro`).

The Reviewer can verify Block A's intent on each form file independently (the variable names + payload object will differ per file) and verify Block B's text on `analytics.ts` byte-faithfully against the pattern above.

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in either repo.
- Run read-only SQL on Supabase (Level 1 autonomy) for E2E DB verification.
- Create, edit, and commit files in `opticup-storefront/develop` per §8 Expected Final State.
- Commit and push to `opticup-storefront/develop` (storefront-side; matches storefront branch model per memory `feedback_storefront_branch_model.md`).
- Commit and push closeout artifacts to ERP `opticup/develop` per §9.
- Run storefront verify scripts (`npm run verify:staged`, `npm run verify:full`).
- Run ERP smoke (`tests/smoke/baseline.test.mjs`) once for cross-repo sanity check (SC #16).
- Execute Supabase MCP `execute_sql` for read-only E2E DB verification (SC #10-#12).
- Apply any executor-improvement proposals from recent FOREMAN_REVIEWs that directly help (e.g., transient-ID stash for chained MCP calls per `M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT/FOREMAN_REVIEW.md` E2).
- Decide on the exact JavaScript variable naming + payload shape per form (`fbEventId` vs `fb_event_id` vs `eventId`) — the WIRE name is fixed (`fb_event_id` in the POST body; `fbe` in the URL param; `eventID` in the fbq 4th arg), but JS internal names are at executor's discretion.
- Use `history.replaceState` to cosmetically strip `?fbe=...` from the visible URL after the pixel fires on thank-you-page (optional cosmetic enhancement; do NOT block on it).

### What REQUIRES stopping and reporting
- A 3rd or 4th lead-creating form discovered in pre-flight that is NOT supersale and NOT NotifyMe → STOP per §5. Brief D4 authorizes exactly 2.
- A pixel firing path OTHER than `src/lib/analytics.ts` `getPixelEventsScript()` (e.g., hardcoded `fbq('track', 'Lead', ...)` in an Astro component) → STOP per §5. Brief assumes the single firing path; if there's a hidden second path, the SPEC is incomplete.
- `crypto.randomUUID()` not available on storefront's target browser baseline (executor pre-flight check) → STOP. Brief D1 authorizes native; polyfill would widen scope.
- ERP `crm_leads.fb_event_id` NOT populated after a real demo submission → STOP (wiring bug; either the storefront didn't send the field or `lead-intake` v28 didn't store it).
- Any DDL on Supabase (Level 3 autonomy is never autonomous). This SPEC declares zero schema changes.
- Any merge to `main` in either repo (Iron Rule §9 #7 — Daniel-only).
- Storefront repo branch protection rejects the develop push (must work on develop only per memory `feedback_storefront_branch_model.md`) → STOP.
- Iron Rules 24-30 violation in storefront repo (especially #24 Views/RPCs only — this SPEC must not introduce any new direct table read/write; it only changes the POST payload to an existing EF).
- A storefront safety-net test that was previously GREEN goes RED after the change.
- Any need to delete, rename, or drop anything in either repo (Iron Rule 32 — declared `None.` below; needing one = stop trigger).

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

The Executor MUST stop on any of:

- **>2 forms in scope.** Pre-flight grep for `lead-intake` + `submit-lead` (and any other lead-creating EF the executor finds via pixel_events config or Edge Function logs) returns > 2 distinct call sites. Brief D4 authorizes only supersale + NotifyMe.
- **`crypto.randomUUID()` unavailable.** Storefront's effective browserslist (or Astro 6 default) lists a target browser without native support. Per Brief D1, polyfilling widens scope without authorization.
- **`pixel_events` config schema unexpected.** If executor's pre-flight finds that `storefront_config.analytics.pixel_events[]` rule objects have fields differing from `{url_pattern, event, label?}` per `src/lib/analytics.ts:8-12` `PixelEvent` interface → STOP.
- **Pixel firing path outside `analytics.ts`.** Any active Astro route (not legacy `docs/wp-*.html` archives) that contains a literal `fbq('track', 'Lead', ...)` call NOT routed through `getPixelEventsScript()` → STOP. The hand-off must wire into ALL pixel paths.
- **Meta Test Events validation fails after manual run** (SC #14) — if Daniel runs the manual check and sees 2 events instead of 1 dedup'd → STOP (the substrate is wrong; do NOT close this SPEC).
- **ERP `crm_leads.fb_event_id` NOT populated** after a test submission (SC #10 fails) → STOP. Means storefront UUID isn't reaching ERP — wiring bug, not a graceful-degradation case.
- **Storefront PR rejected by branch protection** (must merge to develop only) → STOP per memory `feedback_storefront_branch_model.md`.
- **Iron Rules 24-30 violation** in storefront repo (especially #24 Views/RPCs only, #29 View modification protocol).
- **Any destructive operation needed mid-run** (Brief authorizes None per Iron Rule 32 — see §"Destructive Operations" below). If executor encounters a need for `git rm`, `Remove-Item`, SQL `DROP`/`TRUNCATE`, mass rename (≥5 files), `git reset --hard`, `git push --force`, or governance-doc deletion → STOP and write an escalation file per Iron Rule 32 protocol.

---

## 6. Rollback Plan

All changes are additive and contained to the storefront repo + a small closeout block in the ERP repo. Rollback is clean revert:

- **Annotated tags pinned by the Executor before any change:**
  - Storefront repo: `pre-fb-capi-handoff-storefront-{TIMESTAMP}` on the commit at executor session start (before any storefront edit).
  - ERP repo: `pre-fb-capi-handoff-erp-{TIMESTAMP}` on the commit at executor session start (before any closeout edit).

- **Storefront rollback (worst case):**
  ```
  cd C:/Users/User/opticup-storefront
  git fetch origin
  git reset --hard pre-fb-capi-handoff-storefront-<TIMESTAMP>
  git push --force-with-lease origin develop   # ONLY with Daniel's explicit go-ahead
  ```
  **Note:** `git push --force-with-lease` requires Daniel's explicit authorization in chat at rollback time. Without that authorization, leave the rollback as local-only and ask. This SPEC does NOT pre-authorize a force push.

- **ERP rollback (worst case):**
  ```
  cd C:/Users/User/opticup
  git fetch origin
  git reset --hard pre-fb-capi-handoff-erp-<TIMESTAMP>
  # Closeout commits are doc-only; revert is safe.
  # Force-push to ERP develop requires Daniel's explicit go-ahead at rollback time.
  ```

- **DB rollback:** None needed. This SPEC introduces ZERO schema changes. `crm_leads.fb_event_id` will simply receive `null` again on subsequent submissions until the storefront code is re-deployed with the change. The ERP `lead-intake` v28 is forward-compatible (D6) — storing `null` is its existing behavior.

- **CLI commands used in rollback:** Only `git` (universally available). Per Author Proposal #2 from `M4_FB_CAPI_HYBRID_DEDUPLICATION/FOREMAN_REVIEW.md`, no further CLI pre-verification needed. No `supabase`/`vercel`/`gh` commands in this rollback.

- **Foreman notification:** SPEC is marked REOPEN (not CLOSED) if rollback fires; new SPEC iteration must address the failure root cause before reattempting.

---

## Destructive Operations

Per Iron Rule 32: **None.**

This SPEC is purely additive across both repos:
- **Storefront repo:** new UUID generation code, new hidden form field, new pixel argument, new docs file (`docs/FB_CAPI_HANDOFF.md` or equivalent — executor decides extension to existing docs vs new file).
- **ERP repo:** new SPEC folder artifacts + appends to OPEN_TASKS/MASTER_ROADMAP/memory/M4 FOREMAN_REVIEW addendum.

Zero file deletes. Zero renames. Zero schema changes. Zero SQL `DROP`/`TRUNCATE`/`DELETE`. Zero governance-doc deletions. Zero modifications to `main` branch in either repo.

If the executor encounters a need for ANY destructive operation mid-run → STOP, write an escalation file per Iron Rule 32 protocol, halt the pipeline.

---

## 7. Out of Scope (explicit)

Things that look related but MUST NOT be touched in this SPEC:

- **Purchase events.** Deferred to future SPEC `M4_FB_CAPI_PURCHASE_EVENTS` post-7-day Lead-event stability window. Per F-5 from M4 FOREMAN_REVIEW, that future SPEC must change `crm_capi_dispatch_queue` UNIQUE constraint from `(lead_id, tenant_id)` to `(lead_id, tenant_id, event_name)` — explicitly OUT of this SPEC's scope.
- **WhatsApp QR walk-in registration** (`/quick-register/` paths). Different funnel, different attribution, separate SPEC if ever needed. Even though `src/pages/quick-register/index.astro` appears in pixel_events config, it is NOT a lead-creating form (it's a post-WhatsApp-message registration step). Executor's pre-flight may surface it; the answer is "out of scope, don't touch."
- **Custom or standard events beyond `Lead`** for v1. The `pixel_events` config may carry `PageView`, `ViewContent`, `AddToCart`, etc. — those are out of this SPEC. Only the `Lead` event-firing path gets the `eventID` wiring. If the executor chooses to wire `eventID` for ALL events generated via `getPixelEventsScript()` (because it's actually the same code path), that is acceptable IF the URL-param read produces an empty string when no `?fbe=` is present (graceful degradation per Brief D5 and SC #9).
- **`pixel_events` config schema in DB.** `storefront_config.analytics.pixel_events[]` is read by the storefront; we do NOT modify the schema, we do NOT modify rule contents. Just the way the rules' `track` calls are emitted.
- **ERP-side changes.** All ERP work shipped in M4_FB_CAPI_HYBRID_DEDUPLICATION. If executor finds a gap in the ERP side mid-run → STOP and escalate (do not silently patch ERP). The only ERP edits this SPEC authorizes are the closeout doc updates listed in §8.
- **Meta Events Manager configuration.** Daniel handles that side independently (Pixel ID, allowed domains, test event codes, fb_capi_token). Out of every SPEC.
- **`tenants.fb_capi_token` population for Prizma.** Daniel-only manual action. Not a SPEC.
- **Touching the M4 SPEC folder beyond the FOREMAN_REVIEW addendum.** The M4 SPEC is closed. The only addition is an addendum noting that this downstream SPEC has completed.
- **Pre-existing untracked files in either repo.** Storefront repo's `.claude/prompts/`, `.claude/settings.local.json`, `.spec-output/` and ERP repo's 158 pre-existing untracked files (mostly architecture-brief activation prompts and M-state files) stay untouched per CLAUDE.md §1.4 and the user's session-start "leave alone, use selective git add" decision. Selective `git add` by filename throughout.

---

## 8. Expected Final State

After the executor finishes, the repos should contain:

### Storefront repo (`opticalis/opticup-storefront`)

**New / modified files:**
- `src/lib/analytics.ts` — modified: `getPixelEventsScript(events)` payload reads `?fbe=` URL param and passes `{eventID: fbEventId}` as 4th arg to `fbq('track', ...)` when present. Graceful degradation when absent (matches today's 2-arg behavior).
- Each in-scope supersale form file (executor confirms exact paths in pre-flight — likely `src/pages/supersale-stock/index.astro` + `src/pages/supersale-takanon/index.astro` + any HE/EN/RU variants under `src/pages/{he,en,ru}/supersale*/`):
  - Inline `<script>` form-submit handler generates `crypto.randomUUID()` before the POST.
  - POST body includes `fb_event_id: <uuid>` field.
  - Post-submit redirect URL includes `?fbe=<uuid>` query parameter.
- `src/components/NotifyMe.astro` — same 3 changes (UUID generation, hidden field on POST, URL-param hand-off if the component has a thank-you redirect; if it shows inline success without redirect, the URL-param part may not apply — executor decides per UX).
- `docs/FB_CAPI_HANDOFF.md` (new) OR extension to an existing storefront doc file (executor decides) — explains the UUID-on-form-submit pattern, the `?fbe=` URL-param contract, and the `eventID` 4th-arg convention. ~50-100 lines.

**New / modified docs in storefront repo:**
- Optional: `src/lib/analytics.ts` JSDoc on `getPixelEventsScript` extended to document the `?fbe=` URL-param contract.

**No deletions. No renames. No schema changes. No image-pipeline changes. No DB writes from storefront code (Iron Rule 24 — Views/RPCs only).**

### ERP repo (`opticalis/opticup`) — closeout doc updates only

- `modules/Module 3 - Storefront/docs/specs/M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF/SPEC.md` (this file — committed by Foreman BEFORE executor begins).
- `modules/Module 3 - Storefront/docs/specs/M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF/EXECUTION_REPORT.md` (executor writes at close).
- `modules/Module 3 - Storefront/docs/specs/M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF/FINDINGS.md` (executor writes if findings).
- `modules/Module 3 - Storefront/docs/specs/M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF/REVIEW.md` (Reviewer writes).
- `modules/Module 3 - Storefront/docs/specs/M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF/TEST_REPORT.md` (Localhost-Tester writes).
- `modules/Module 3 - Storefront/docs/specs/M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF/FOREMAN_REVIEW.md` (Foreman writes at closure with 4 skill improvement proposals: 2 author + 2 executor).
- `OPEN_TASKS.md` — append: P2.1 marked 🟢 fully closed, with note "End-to-end Meta dispatch contingent on Daniel populating Prizma `tenants.fb_capi_token`." (One additional row — does not disturb existing rows.)
- `MASTER_ROADMAP.md` §3 — append/update: P2.1 row flipped to 🟢, brief one-liner.
- Memory file `C:/Users/User/.claude/projects/C--Users-User-opticup/memory/project_fb_capi_p21_state.md` — updated to reflect storefront completion.
- `modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_HYBRID_DEDUPLICATION/FOREMAN_REVIEW.md` — small addendum at end noting that the downstream storefront SPEC has completed; M4 SPEC retains 🟡 verdict (it correctly captured the "partial closure" state at its own seal time), but the addendum points readers to this SPEC for the rest of the story.

### DB state (read-only — zero writes from this SPEC's executor)

- No new tables. No new columns. No new RPCs. No new views. No new RLS policies.
- After the E2E test, demo's `crm_leads` will have ≥ 1 row with `fb_event_id` populated and a matching `crm_capi_dispatch_queue` row with `status='skipped_no_token'` (D-AUTH-3 predicted state — this is the correct demo behavior until Daniel populates demo's `tenants.fb_capi_token`, which is intentionally NULL).

### Pre-existing untracked files

Untouched in both repos. Executor uses selective `git add` by filename throughout.

---

## 9. Commit Plan

Indicative. Executor adjusts after pre-flight; deviations logged in EXECUTION_REPORT.md §4.

### Storefront repo (`opticalis/opticup-storefront` — branch `develop`)

- **C1**: `feat(supersale): generate fb_event_id on form submit and pass via URL param` — files: in-scope supersale form Astro pages (HE/EN/RU as confirmed in pre-flight) + `src/lib/analytics.ts` reader/4th-arg wiring. Possibly split into C1a (form submit edits) + C1b (analytics.ts pixel-call signature update) if executor judges single commit > 250 lines.
- **C2**: `feat(notify-me): generate fb_event_id on stock-notify submission` — file: `src/components/NotifyMe.astro`.
- **C3** (optional): `docs(storefront): document FB CAPI fb_event_id handoff` — file: `docs/FB_CAPI_HANDOFF.md` (or extension to existing docs).

Expected total storefront commits: **2-3**. Each commit independently passes `npm run verify:staged`. Each commit message in English `type(scope): description` format. No `--no-verify`, no `--amend`.

### ERP repo (`opticalis/opticup` — branch `develop`)

- **C-ERP-1**: `chore(spec): seal M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF SPEC.md` — committed by Foreman BEFORE executor begins. Adds this file (SPEC.md). Selective `git add` of just `modules/Module 3 - Storefront/docs/specs/M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF/SPEC.md`.
- **C-ERP-2** (optional, if executor produces FINDINGS.md mid-run): `chore(spec): M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF EXECUTION_REPORT.md + FINDINGS.md` — executor writes.
- **C-ERP-3**: `chore(spec): M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF REVIEW.md` — Reviewer.
- **C-ERP-4**: `chore(spec): M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF TEST_REPORT.md` — Localhost-Tester.
- **C-ERP-5**: `chore(spec): close M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF with FOREMAN_REVIEW + ERP doc updates` — Foreman closure: writes FOREMAN_REVIEW.md, updates OPEN_TASKS.md, MASTER_ROADMAP.md §3, memory file, M4 SPEC FOREMAN_REVIEW addendum. Selective `git add` by filename ONLY for the closeout files — does NOT disturb the 158 pre-existing untracked files or 9 pre-existing M-state files.

Expected total ERP commits: **3-5** (depending on how many SPEC-lifecycle commits each agent produces).

**No commits to `main` in either repo.** Daniel-only per Iron Rule §9 #7.

---

## 10. Dependencies / Preconditions

- **Parent SPEC `M4_FB_CAPI_HYBRID_DEDUPLICATION` 🟡 closed** on 2026-05-15 evening — ERP substrate must be live. Verified: `crm_leads.fb_event_id` column exists; `lead-intake` v28 deployed; queue + cron + EF live on demo.
- **Demo storefront live** at `https://opticup-storefront-demo.vercel.app` (per `M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT/FOREMAN_REVIEW.md` 2026-05-11, 🟡 closed pending Daniel's manual `SUPABASE_SERVICE_ROLE_KEY` add). For this SPEC's E2E test (SC #10-#13), the demo storefront must be reachable and the supersale form must be submittable; if logo is broken (because Daniel hasn't added SERVICE_ROLE_KEY) but form POSTs to `lead-intake` succeed, the E2E test is valid. If form POST itself fails for any reason → STOP and escalate.
- **Demo tenant** UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb` (slug `demo`, PIN 12345) — confirmed in CLAUDE.md §9 QA section.
- **`crypto.randomUUID()` browser availability** — verified at SPEC-authoring time via Astro 6.1.1 + Node 22.12 engine pin; storefront ships ES2020+ to browsers via Vite default. Pre-flight re-verifies.
- **Supabase MCP access** for the Executor + Localhost-Tester to run read-only SQL on demo for E2E verification (SC #10-#12).
- **Storefront safety-net + verify scripts** present and passing pre-change (Executor verifies in Step 1 baseline).
- **No coordinated cross-repo cutover required** per Brief D6. The ERP `lead-intake` v28 is forward-compatible: it accepts the optional `fb_event_id` field but stores `null` when absent. The storefront can ship before or after any other related work without breaking the existing submission flow.

---

## 11. Lessons Already Incorporated

Every FOREMAN_REVIEW proposal from prior SPECs in this module + the parent SPEC was considered. Disposition:

- **FROM `M4_FB_CAPI_HYBRID_DEDUPLICATION/FOREMAN_REVIEW.md` (parent, 2026-05-15) → Author Proposal #1 (pg_cron SQL pattern probe at SPEC author time)** → NOT APPLICABLE. This SPEC introduces zero pg_cron jobs; no `net.http_post` calls to Edge Functions are added or modified. The storefront work is browser-side JS only.
- **FROM same → Author Proposal #2 (ROLLBACK CLI command pre-verification)** → APPLIED in §6. Rollback uses ONLY `git` commands (universally available). No `supabase`/`vercel`/`gh` CLI in rollback. The `git push --force-with-lease` is explicitly gated on Daniel's chat-time go-ahead (not pre-authorized).
- **FROM same → Executor Proposal #1 (worktree-aware CLI deploy pre-flight)** → APPLIED IN AUTONOMY ENVELOPE (§4). Executor explicitly authorized to verify CWD before any CLI run; the storefront repo is at `C:/Users/User/opticup-storefront` (not in `.claude/worktrees/`). No EF deploys planned in this SPEC, so the CLI-CWD trap is narrowed (only Supabase MCP `execute_sql` for E2E read-only checks).
- **FROM same → Executor Proposal #2 (pg_cron SQL pattern pre-check)** → NOT APPLICABLE (no pg_cron in this SPEC).
- **FROM same → F-5 (UNIQUE(lead_id, tenant_id) blocks future Purchase event re-enqueue)** → APPLIED in §7 Out of Scope (explicit reference to future `M4_FB_CAPI_PURCHASE_EVENTS` SPEC that will handle the constraint widening).
- **FROM same → D-AUTH-3 predicted-state for demo (skipped_no_token)** → APPLIED in §3 SC #11 (E2E test EXPECTS `status='skipped_no_token'` for demo, NOT `processed` — token absence is correct for demo per parent SPEC's locked decision).
- **FROM `M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT/FOREMAN_REVIEW.md` (2026-05-11) → Author Proposal A1 (Pre-author MCP surface scan for external infra)** → NOT APPLICABLE. This SPEC touches only repo code; no external infra provisioning, no Vercel/Cloudflare/GitHub MCP calls planned.
- **FROM same → Author Proposal A2 (Forbid `updated_at`-as-proof in UPDATE success criteria)** → APPLIED in §3. Every E2E DB criterion uses substantive columns: SC #10 reads `crm_leads.fb_event_id IS NOT NULL`, SC #11 reads `crm_capi_dispatch_queue.event_id` + `status` + `processed_at`, SC #12 reads `fb_pixel_fired_at`. Never `updated_at` as proof.
- **FROM same → Executor Proposal E1 (External-API integration pre-flight)** → APPLIED IN AUTONOMY ENVELOPE (§4 — pre-flight + the §0 MCP surface check at author time confirmed no external infra needed; only Supabase MCP read SQL).
- **FROM same → Executor Proposal E2 (Transient-ID stash for chained API calls)** → NOT APPLICABLE (no chained external API calls in this SPEC; single Supabase MCP read is sufficient for E2E verification).
- **FROM `MIGRATION_4_STOREFRONT_STUDIO/FOREMAN_REVIEW.md` (2026-05-12) → Author Proposals about color-form completeness** → NOT APPLICABLE (this is not a visual re-skin SPEC).
- **FROM `SECURITY_HOTFIX_2_2026_05_15/FOREMAN_REVIEW.md` → Author Proposal P-AUTHOR-1 (canonical JWT validation header)** → NOT APPLICABLE (no SECURITY DEFINER RPCs added in this SPEC).
- **Pre-existing untracked files survey policy** (codified after MIGRATION_1, MIGRATION_2, SETTINGS_PERMISSIONS_CONSOLIDATION, MIGRATION_3_CRM) → APPLIED in §0 + §7. Executor leaves all 158 ERP-side + 3 storefront-side untracked files alone; selective `git add` by filename throughout.

This represents the 6th consecutive SPEC in this module's FOREMAN_REVIEW convergence-streak. Newly-applicable proposals: A2 (`updated_at` anti-pattern) + D-AUTH-3 predicted-state pattern.

---

## 12. Pre-Merge Checklist

Every SPEC must pass these items before the executor closes it. Any item failing → SPEC is REOPEN, not CLOSED.

- [ ] All §3 success criteria pass with actual values captured in EXECUTION_REPORT.md §2.
- [ ] **Integrity Gate (Iron Rule 31 — storefront repo):** `npm run verify:integrity` (or storefront's pre-commit hook chain) returns exit 0 or 2. Null-byte ERROR (exit 1) anywhere in storefront HEAD blocks closure.
- [ ] **Destructive Operations Gate (Iron Rule 32 — ERP repo for SPEC.md commit):** ERP pre-commit hook accepts this SPEC.md (the `## Destructive Operations` section declares `None.`).
- [ ] `git status --short` returns empty in both repos (within the closeout scope — pre-existing untracked / M-state files are NOT in scope, untouched per §7).
- [ ] HEAD pushed to `origin/develop` in both repos.
- [ ] EXECUTION_REPORT.md + FINDINGS.md (if any) + REVIEW.md + TEST_REPORT.md + FOREMAN_REVIEW.md all written in the ERP SPEC folder.
- [ ] Storefront verify scripts (`npm run verify:full`) GREEN.
- [ ] ERP smoke (`tests/smoke/baseline.test.mjs`) GREEN.
- [ ] OPEN_TASKS.md + MASTER_ROADMAP.md §3 + memory `project_fb_capi_p21_state.md` + M4 SPEC FOREMAN_REVIEW addendum all updated by the Foreman closure commit.
- [ ] E2E demo test evidence (SC #10-#13) captured in TEST_REPORT.md with Supabase MCP query results + Network panel screenshots/HAR excerpts.
- [ ] Manual Meta Test Events validation (SC #14) flagged as DEFERRED-MANUAL — not a closure blocker; explicit follow-up for Daniel.
- [ ] Verdict written in FOREMAN_REVIEW.md: 🟢 CLOSED / 🟡 CLOSED WITH FOLLOW-UPS / 🔴 REOPEN.

---

*End of SPEC. Executor begins via opticup-executor skill load with explicit Sonnet model recommendation per activation prompt.*
