# SPEC — BROADCAST_EVENT_LINK_SUPPORT

> **Location:** `modules/Module 4 - CRM/docs/specs/BROADCAST_EVENT_LINK_SUPPORT/SPEC.md`
> **Authored by:** opticup-architect (Foreman hat)
> **Authored on:** 2026-05-13
> **Module:** 4 — CRM
> **Phase:** Post-cutover hotfix (rescue dispatch for Event #24)
> **Author signature:** Cowork architect session, 2026-05-13 evening

---

## 0. Pre-Authoring Reality Check

- **Live state probed in DB on 2026-05-13 22:30 IL:**
  - Event 24 (`a7c9f174-a099-48b7-88bb-e4d0fa6236e2`) — `אירוע המותגים - מאי 2026`, event_date 2026-05-15, status `registration_open`, max_capacity 50, 13 attendees (10 registered + 3 invited).
  - Broadcast attempt 09:13-09:26 IL produced **552 message_log rows ALL `status=failed`**, error_message `unsubstituted_placeholder: registration_url`. ZERO SMS reached customers (the `send-message` EF guard at `scanForUnsubstitutedPlaceholders` blocks dispatch BEFORE Make webhook is called — verified at `functions/send-message/index.ts:158-167`).
  - Eligible audience for Group (A): **1,187 leads** on Prizma (`is_deleted=false`, `unsubscribed_at IS NULL`, `status NOT IN (rejected/lost/blacklist/duplicate/unsubscribed/confirmed)`, NOT registered to event 24). 1,186 of them have both phone + email.

- **Code paths grep-verified on 2026-05-13:**
  - `modules/crm/crm-messaging-broadcast.js` — 334 lines, IIFE `(function(){...})()`. State container `_wizard` (line 25). Wizard step renders at `wizardStepBody()` (line 168). Final send at `doWizardSend()` (line 314). **Does NOT contain any reference to `event_id` or `eventId`.**
  - `modules/crm/crm-messaging-broadcast-queue.js` — 167 lines. `enqueueBroadcast(wizard, leadIds, employeeId, sb)` builds queue rows via `buildQueueRows()` (line 74). The row object explicitly omits `event_id` — only `tenant_id`, `lead_id`, `channel`, `language`, `variables`, `status`, `scheduled_at`, plus `template_slug` or `body`+`subject`. `crm_broadcasts` insert at `insertBroadcastRecord()` (line 107) likewise has no event column.
  - `crm_message_queue` table (DB) — column `event_id uuid NULL` ALREADY EXISTS (verified via `information_schema.columns`). NO DDL CHANGE NEEDED.
  - `send-message` EF v23 — `index.ts:96` calls `await injectAutoUrls(db, leadId, tenantId, eventId, variables)` which (per `event-variables.ts:252-260`) builds `%registration_url%` via `buildRegistrationUrl()` only when `eventId` is truthy. **The EF already supports event-linked broadcasts end-to-end; the wizard simply never passes `event_id`.**

- **Iron Rule 21 (No Orphans / No Duplicates) cross-reference sweep:**
  - No new tables, columns, RPCs, EF functions, or DB objects introduced. Purely client-side state + 1 added queue column value.
  - New JS identifier: `_wizard.eventId` — grepped, 0 hits anywhere in repo. Clean.
  - No new files. No new T-constants. No FIELD_MAP additions.

- **Lessons applied from recent FOREMAN_REVIEWs:**
  - `STATUS_CHANGE_TRIGGERS_FRAMEWORK/FOREMAN_REVIEW.md` Author Proposal #1 (live baselines) — every numeric value in §0 above runs through SQL or `wc -l`, not memory.
  - `MIGRATION_4_STOREFRONT_STUDIO/FOREMAN_REVIEW.md` Author Proposal #2 (per-form count discipline) — N/A, no token swaps.
  - `SETTINGS_PERMISSIONS_CONSOLIDATION/FOREMAN_REVIEW.md` Author Proposal #2 (pre-existing untracked files) — surveyed at execution start; selective `git add` by filename throughout.
  - `ATOMIC_CONFIRMATION_FLOW/FOREMAN_REVIEW.md` Executor Proposal #2 (Rule-21 orphans co-staging) — no new helper functions; only state field + UI dropdown.
  - `STATUS_CHANGE_TRIGGERS_FRAMEWORK/FOREMAN_REVIEW.md` Executor Proposal #2 (DEPLOY_FALLBACK verify_jwt warning) — N/A, no EF deploy in this SPEC.

- **Pre-existing untracked files survey:** Executor MUST run `git status --porcelain | grep '^??'` BEFORE editing and snapshot to FINDINGS as the baseline. Selective `git add` by filename throughout.

- **Cross-Reference Check completed 2026-05-13 against GLOBAL_SCHEMA + GLOBAL_MAP:** 0 collisions. The change is additive to existing schema (uses already-nullable `crm_message_queue.event_id`) and existing EF logic (uses already-shipped `injectAutoUrls` event-aware path).

---

## 1. Goal

Add optional "Linked event" support to the CRM Broadcast Wizard so that broadcasts can carry `event_id` end-to-end into `crm_message_queue`, allowing the `send-message` Edge Function to compute per-recipient `%registration_url%` (signed JWT token with `lead_id + event_id + tenant_id`). Unblocks the Event #24 rescue dispatch that failed 552/552 on 2026-05-13 morning with `unsubstituted_placeholder: registration_url`.

---

## 2. Background & Motivation

Event #24 (`אירוע המותגים - מאי 2026`, Fri 2026-05-15) opened registration on 2026-05-03 but accumulated only 10 registered attendees vs the historical 50-90 baseline (events #20/22/23 closed at 56/90/73). Daniel composed a manual broadcast to ~1,200 active Prizma leads carrying the `%registration_url%` token at 09:13 IL on 2026-05-13. All 552 attempted rows failed (`status=failed`, error `unsubstituted_placeholder: registration_url`) and ZERO SMS reached customers — verified by inspecting `crm_message_log` and confirming `send-message` EF rejects dispatch BEFORE calling Make when an unresolved `%placeholder%` survives substitution.

**Root cause:** the Broadcast Wizard never collects nor forwards `event_id`. `crm-messaging-broadcast-queue.js:buildQueueRows()` constructs queue rows without `event_id`, so the dispatch-queue passes `event_id=null` to `send-message`, which then skips the `injectAutoUrls()` event-token branch (`event-variables.ts:252` `if (eventId)` guard) and never computes a per-lead registration URL. The template body retains the literal `%registration_url%`, the safety scan catches it, and the row dies as `failed`.

**Why now:** Event #24 is in 36-40 hours. Without this fix, the only path to dispatch a per-lead event-linked broadcast is a code change. With this fix, Daniel re-opens the Broadcast Wizard, picks Event #24 from the new dropdown, and re-sends; the same 1,187 leads receive their per-lead signed token within ~20 min (1-second SMS throttle × 1,187 = ~20 min).

**What this SPEC does NOT touch:**
- The `send-message` EF (already correct).
- The `dispatch-queue` EF (passes `event_id` through transparently — it reads queue row and POSTs to `send-message` with all columns).
- The `crm_message_queue` schema (`event_id` already nullable).
- Any automation-engine code path (those already pass `event_id` correctly).

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop`, clean before start | `git status --short` → empty |
| 2 | Commits produced | 3 (code + retro + ack of close) | `git log origin/develop..HEAD --oneline \| wc -l` → 3 |
| 3 | Files modified | Exactly 2 JS files | `git diff --name-only develop~3..develop` → `modules/crm/crm-messaging-broadcast.js`<br>`modules/crm/crm-messaging-broadcast-queue.js` |
| 4 | Broadcast Wizard UI shows "Linked event" dropdown | dropdown rendered in wizard step 1 (Recipients) OR step 3 (Summary — TBD by executor based on flow); options = events with `status IN ('scheduled','registration_open','event_day')` AND `is_deleted=false`, ordered by `event_date DESC`, plus a leading "— ללא קישור לאירוע —" option that maps to `null` | Chrome MCP: open `localhost:3000/crm.html#messaging`, click "+ שליחה חדשה", confirm dropdown exists |
| 5 | `_wizard.eventId` defaults to null | initial value null, dropdown sets it on change | `evaluate_script` returning `window.__lastWizardSnapshot.eventId` after wizard open |
| 6 | `enqueueBroadcast` signature unchanged | function signature still `enqueueBroadcast(wizard, leadIds, employeeId, sb)` — `wizard.eventId` is the carrier | grep file |
| 7 | `buildQueueRows()` includes `event_id` when set | inspecting the rows passed to `crm_message_queue.insert`, `event_id` = `wizard.eventId` (or omitted if null) | code review + demo smoke |
| 8 | `crm_broadcasts` row stores `event_id` in `filter_criteria` jsonb OR new column TBD | recorded for audit | DB query post-test |
| 9 | Demo E2E smoke: pick event, queue 1 row, dispatch fires real SMS to a whitelisted demo phone | `crm_message_log.status='sent'` for the demo row, `content` contains `prizma-optic.co.il/r/<8-char-code>` OR `/event-register?token=` (short-link OR long-form) and NO `%registration_url%` literal substring | SQL: `SELECT content FROM crm_message_log WHERE created_at > <start> AND lead_id = <demo_lead> AND status='sent';` |
| 10 | Demo E2E negative path: pick "ללא קישור לאירוע", queue 1 row that does NOT reference `%registration_url%` in body — sends successfully | same as current behavior, regression check | SQL same shape |
| 11 | Demo E2E negative path: pick event but use body that DOES reference `%registration_url%` AND has a placeholder unknown to substitution (e.g. `%nonsense%`) — fails with `unsubstituted_placeholder: nonsense` (not registration_url) | regression check that the safety scan still works | SQL same shape |
| 12 | No Prizma writes during dev/smoke | exact pre/post row counts of `crm_message_queue`, `crm_message_log`, `crm_broadcasts` for `tenant_id = prizma` MUST be identical at SPEC start and at SPEC end | DB query at start + end |
| 13 | Integrity Gate (Iron Rule 31) | exit 0 or 2 | `npm run verify:integrity; echo $?` → 0 or 2 |
| 14 | Pre-commit hooks all pass | 0 errors | committed = hooks ran clean |
| 15 | File-size compliance (Iron Rule 12) | `crm-messaging-broadcast.js` ≤ 350 lines<br>`crm-messaging-broadcast-queue.js` ≤ 350 lines | `wc -l` on both |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in the repo
- Run read-only SQL on demo + Prizma (Level 1 autonomy — for verification)
- Edit the 2 JS files listed in §3 #3
- Decide where in the wizard flow the event-dropdown lives (step 1 Recipients vs step 3 Summary) — executor's judgment, document in EXECUTION_REPORT §3
- Decide whether `crm_broadcasts` records `event_id` as a new column (would need DDL — STOP, see below) OR inside the existing `filter_criteria` jsonb (preferred — no DDL). **Preferred path: no DDL.**
- Commit and push to `develop`
- Run all standard verify scripts
- Smoke-test on demo tenant via Chrome MCP + Supabase MCP SQL

### What REQUIRES stopping and reporting
- ANY DDL change (Iron Rule 15 — Level 3 autonomy is never autonomous). If executor judges that `crm_broadcasts` truly needs a new `event_id` column rather than stuffing into `filter_criteria` jsonb — STOP and ask Foreman.
- Any modification to `send-message`, `dispatch-queue`, `event-register`, or any other EF — out of scope.
- Any merge to `main` — Daniel-only.
- Any Prizma row write outside the queue (`crm_message_queue`/`crm_message_log`/`crm_broadcasts` for Prizma must remain UNTOUCHED throughout dev + smoke).
- Demo smoke produces a customer-facing SMS to a non-allowlisted phone — STOP, allowlist failure means the test recipient isn't whitelisted.
- File-size cap breached (Iron Rule 12 — 350 lines).

---

## 5. Stop-on-Deviation Triggers (additional to CLAUDE.md §9)

- If `crm_message_queue.event_id` column is somehow missing or non-nullable when queried at execution start — STOP, this contradicts §0 baseline and means another change landed since SPEC authored.
- If the demo smoke shows the new wizard dropdown but the queue row arrives with `event_id=null` despite UI selection — STOP, plumbing is wrong.
- If the demo smoke fires the SMS but `content` STILL contains the literal `%registration_url%` substring — STOP, `injectAutoUrls` is not engaging (would mean the EF environment lost something between v23 and now).
- If any Prizma message_log/message_queue row gets created during dev or smoke (other than the existing 552 failed rows from this morning) — STOP, scope leak.

---

## 6. Rollback Plan

Single-commit revert is enough. Pre-execution safety:

```
git tag pre-broadcast-event-link-support
```

If smoke fails OR a regression is found on demo:
- `git reset --hard pre-broadcast-event-link-support`
- `git push --force-with-lease origin develop` (executor MUST get Daniel approval before force-push per CLAUDE.md §9 rule 7 — but this is a fresh-tag revert, not main; document the request)
- No DB rollback needed (no DDL, no Prizma writes).

---

## Destructive Operations

None.

(This SPEC does no file deletes, no mass renames, no rebases, no resets except the rollback tag above, no SQL `DROP`/`TRUNCATE`/`DELETE`, no governance-doc deletions, no `main` modifications. The Iron-Rule-32 gate will forbid all destructive ops for this SPEC's run.)

---

## 7. Out of Scope (explicit)

- `send-message` EF — already supports event-linked dispatch end-to-end. Do NOT redeploy, do NOT touch source.
- `dispatch-queue` EF — passes `event_id` transparently. Do NOT touch.
- `event-register` EF — irrelevant to broadcast path.
- The "tofes-tafas-mekom" bug ("`invited` attendees occupy a slot but render as not occupying one") — separate follow-up SPEC after this one. Tracked in `roles/campaign-overseer/OPEN_EVENTS_TICKETS.md` as a future ticket.
- The "broadcast 1000-cap" follow-up (POST-1) — separate concern.
- `crm_broadcasts` table — DDL changes are out of scope. If executor decides storing `event_id` in `filter_criteria` jsonb is correct (preferred), no schema change. If executor judges a dedicated column is needed → STOP and escalate, do not add it autonomously.
- `crm_message_queue` view definitions or RLS — already correct.
- Any storefront-side code (`opticup-storefront`).
- Multi-tenant URL strategy (TD-3) — independent concern.

### Subset relationship clarification
The dropdown lists events `IN ('scheduled', 'registration_open', 'event_day')`. The set of all events the tenant has is a superset. This is intentional — broadcasts to closed/completed/cancelled events are out of scope; a broadcaster who needs that can use a future SPEC to widen the filter.

---

## 8. Expected Final State

### New files
None.

### Modified files
- `modules/crm/crm-messaging-broadcast.js` — adds:
  - `_wizard.eventId` field (defaults `null`) inside the wizard initialization object (line ~124, alongside `step`, `channel`, `templateId`, etc.).
  - Event-list cache. The wizard already has `_events` (used by `CrmBroadcastFilters.renderRecipientsStep`); reuse it. If filter shape is different (events for filtering vs events for linking), executor decides — either (a) reuse `_events` if it carries enough metadata, or (b) extend the `loadEvents()` helper to surface a richer rowset. Document choice in EXECUTION_REPORT.
  - Dropdown rendered in wizard step. Two reasonable placements:
    - **(A) Step 1 Recipients** — alongside other filter dropdowns. Pro: groups with other audience selectors. Con: visually mixes filter (who) with link (link-to-what).
    - **(B) Step 3 Template/Body** — alongside template picker. Pro: thematically near `%registration_url%`-bearing templates. Con: easy to miss.
    - **(C) Step 4 Schedule/Summary** — as a final review-and-confirm field. Pro: surfaced as the last decision.
    - Executor decides — document in EXECUTION_REPORT §3. Foreman accepts any of A/B/C.
  - `captureStep(root)` extended to read the dropdown value and write `_wizard.eventId`.
  - `doWizardSend()` passes the `_wizard.eventId` through `CrmBroadcastQueue.enqueueBroadcast` (already does — the queue file reads `wizard.eventId`).

- `modules/crm/crm-messaging-broadcast-queue.js` — adds:
  - `event_id: wizard.eventId || null` in the row object emitted by `buildQueueRows()` (line 76-93).
  - `event_id: wizard.eventId || null` (or stored inside `filter_criteria.event_id`) in the `crm_broadcasts` row emitted by `insertBroadcastRecord()` (line 107). **Preferred: store in `filter_criteria.event_id` to avoid DDL.**

### Deleted files
None.

### DB state
- No schema change.
- `crm_message_queue` row count for Prizma untouched.
- `crm_message_log` row count for Prizma untouched.
- `crm_broadcasts` row count for Prizma untouched.

### Build-side-effect file expectations
None. No build step in this SPEC.

### Docs updated (MUST include)
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — short entry at top: "2026-05-13: BROADCAST_EVENT_LINK_SUPPORT closed; Broadcast Wizard now carries `event_id` end-to-end."
- `modules/Module 4 - CRM/docs/CHANGELOG.md` — new section.
- `modules/Module 4 - CRM/docs/MODULE_MAP.md` — already lists `crm-messaging-broadcast.js` and queue file; add note "supports event-linked broadcast since 2026-05-13".
- `MASTER_ROADMAP.md` §3 (Current State) — one-line addition under "M4 closure backlog" noting the wizard fix.
- `OPEN_TASKS.md` — no new active task; if "Group A" rescue-dispatch is queued, add it as an active task with note "ready as soon as wizard fix lands".

NOT updated by this SPEC:
- `docs/GLOBAL_MAP.md` — no contract change.
- `docs/GLOBAL_SCHEMA.sql` — no schema change.

---

## 9. Commit Plan

1. **Commit 1** — `feat(crm-broadcast): carry event_id through wizard → queue → EF` — both JS files. Single conceptual change.
2. **Commit 2** — `docs(m4): note BROADCAST_EVENT_LINK_SUPPORT in SESSION_CONTEXT + CHANGELOG + MODULE_MAP + MASTER_ROADMAP` — docs updates.
3. **Commit 3** — `chore(spec): close BROADCAST_EVENT_LINK_SUPPORT with retrospective` — EXECUTION_REPORT.md + FINDINGS.md (if any) into the SPEC folder.

---

## 10. Dependencies / Preconditions

- Branch `develop`, clean tree.
- Demo tenant accessible via Supabase MCP for SQL + Chrome MCP for UI smoke.
- Demo tenant has at least one event in `scheduled`/`registration_open`/`event_day` status for dropdown population. If absent, executor creates a throwaway demo event for the test, soft-deletes at end. (Foreman accepts this — same pattern as ATTENDEE_COUNTER_DISPLAY_FIX demo event #11.)
- Demo SMS allowlist contains a phone the executor can verify dispatch to (`0537889878` per project memory).
- Chrome running with `--remote-debugging-port=9222` for the UI smoke. If not running, executor must request before proceeding past commit 1.

### Browser readiness pre-flight (executor instructs at start)
SPEC §3 #4 + §3 #5 require Chrome MCP. Executor confirms Chrome is running with `--remote-debugging-port=9222` BEFORE editing any file. If not, surface in readiness sentence: "Browser-QA required by SPEC §3 #4-#5 but Chrome debug-port not detected — please start Chrome with `--remote-debugging-port=9222` before I proceed past commit 1."

---

## 11. Lessons Already Incorporated

- FROM `STATUS_CHANGE_TRIGGERS_FRAMEWORK/FOREMAN_REVIEW.md` Author Proposal #1 — every numeric baseline (552 failed rows, 1,187 eligible leads, 13/10/3 attendee split) was measured via live SQL on 2026-05-13 22:30 IL, NOT memory-estimated.
- FROM `STATUS_CHANGE_TRIGGERS_FRAMEWORK/FOREMAN_REVIEW.md` Executor Proposal #1 (multi-channel allowlist) — N/A this SPEC ships SMS-only smoke; email allowlist pre-flight noted for executor's reference but the smoke is SMS-only.
- FROM `STATUS_CHANGE_TRIGGERS_FRAMEWORK/FOREMAN_REVIEW.md` Executor Proposal #2 (DEPLOY_FALLBACK verify_jwt warning) — N/A no EF deploy.
- FROM `MIGRATION_4_STOREFRONT_STUDIO/FOREMAN_REVIEW.md` Author Proposal #1 (color-form completeness) — N/A no visual re-skin.
- FROM `MIGRATION_3_CRM/FOREMAN_REVIEW.md` Author Proposal #1 (no `## 6.5` fractional Destructive Operations heading) — APPLIED, this SPEC uses bare `## Destructive Operations`.
- FROM `SETTINGS_PERMISSIONS_CONSOLIDATION/FOREMAN_REVIEW.md` Author Proposal #2 (codify pre-existing untracked files leave-alone) — APPLIED in §0.
- FROM `ATOMIC_CONFIRMATION_FLOW/FOREMAN_REVIEW.md` (Rule-21 orphans co-staging) — N/A no new helper functions.

---

## 12. Pre-Merge Checklist

- [ ] All §3 success criteria pass with actual values captured in `EXECUTION_REPORT.md` §2.
- [ ] Demo E2E smoke #1 (criterion 9): event-linked send produces sent SMS with real registration URL substituted.
- [ ] Demo E2E smoke #2 (criterion 10): non-event send still works (regression check).
- [ ] Demo E2E smoke #3 (criterion 11): event-linked send with separate unknown placeholder still fails on THAT placeholder (regression check).
- [ ] Integrity Gate (Iron Rule 31): `npm run verify:integrity` returns exit 0 or 2.
- [ ] `git status --short` returns empty.
- [ ] HEAD pushed to `origin/develop`.
- [ ] EXECUTION_REPORT.md + FINDINGS.md (if any) written in SPEC folder.
- [ ] Docs updated per §8.
- [ ] Pre-commit `pre-broadcast-event-link-support` tag created BEFORE commit 1.
- [ ] No Prizma writes during the entire SPEC run (criterion 12 verified pre/post).

---

*End of SPEC. Author: opticup-architect (Foreman hat). Dispatch to opticup-executor via Claude Code on Daniel's Windows machine.*
