# Legacy Dispatch Decommission — Morning Summary

**Date:** 2026-05-14 (Pipeline run started overnight)
**Brief:** `modules/Module 4 - CRM/architecture-brief/M4_LEGACY_DISPATCH_DECOMMISSION_BRIEF.md`
**Pipeline:** Full Auto Pipeline (single Claude Code chat, Opus model, autonomous overnight)
**Run duration:** ~30 minutes (halted early after Phase 1 due to Brief premise blocker — quality > speed per Brief §2.8)

---

## Pipeline verdict: 🛑 NO-GO. Do NOT merge to main from this run.

**Reason:** The Brief's premise is contradicted by live state on three independent counts (queue coverage, DDL authorization, operator-UX policy). The Pipeline did not modify any code or DB row. The safety tag is unused. The morning decision Daniel needs to make is a **Brief revision**, not a merge.

There is nothing to merge — `git status` for files relevant to this Brief shows zero modifications.

---

## Master safety tag

```
Tag:    pre-legacy-dispatch-decommission-2026-05-14
Commit: 24409fd063072cd620a27d5fdec4b69156d2c17d
Pushed: yes (origin)
```

**Rollback command (NOT NEEDED — no changes were made):**
```
git reset --hard pre-legacy-dispatch-decommission-2026-05-14
git push --force origin develop   # only if you previously pushed; not the case here
```

---

## Top 3 takeaways for Daniel

1. **The Brief was written against a stale architecture snapshot.** The literal symbol `CrmAutomation.evaluate` no longer exists; the actual symbol is `CrmAutomationClient.evaluate(...)` since `M4_AUTOMATION_ENGINE_SERVER_SIDE` Rung 2. Cosmetic, not blocking on its own.

2. **3 of 5 callsites cannot be migrated without DDL.** `lead_intake`, `event_registration`, and `attendee_moved` have no DB-trigger queue producer. Adding triggers would be DDL on production-shape schema, which Brief §2.6 explicitly forbids. Either the Brief authorizes the DDL, or it scopes itself to only the 2 status-change callsites.

3. **All 5 callsites use the operator-confirmation modal (`CrmConfirmSend`); the queue path does not.** The most recent SPEC author (`M4_STATUS_TRIGGER_FRAMEWORK_EXTENSION`, 2026-05-14, only hours before this Brief) explicitly chose to keep both paths active in parallel because the queue path is "a decoupled bus for monitoring and future-rule wiring", NOT a replacement for the operator-driven modal-based dispatch (`crm-automation-engine.js` lines 38–44). Decommissioning legacy = removing operator preview/approve UX — a Brief-level UX policy decision Daniel must own.

---

## Per-phase results

### Phase 0 — Pre-flight (Brief §2.1, §2.3, §2.5)

| Check | Result |
|---|---|
| Safety tag created + pushed | ✅ `pre-legacy-dispatch-decommission-2026-05-14` |
| Localhost `:3000` reachable | ✅ HTTP 200, no `start-local.ps1` invocation needed |
| SMS allowlist on demo matches Brief §2.3 | ✅ `[+972537889878, +972503348349, +972507168471]` (E.164 normalized to local format by `allowlists.ts`) |
| Email allowlist on demo matches Brief §2.3 | ⚠️ SUPERSET — extra entry `danylis92@gmail.com` not in Brief whitelist |

Allowlist superset escalation written: `escalations/2026-05-14T00-15Z_LEGACY_DISPATCH_DECOMMISSION_ALLOWLIST_SUPERSET.md`. Pipeline did NOT modify the live allowlist (per Brief §2.3 hard rule). Pipeline applied recipient-selection discipline (test recipients restricted to Brief whitelist) — but Phase 2 never started, so no test message ever fired.

### Phase 1 — Discovery: ✅ COMPLETE

Output: `docs/audits/LEGACY_DISPATCH_INVENTORY_2026_05_14.md` (full callsite × queue-coverage × rule matrix).

Headline numbers:
- 5 live `CrmAutomationClient.evaluate(...)` callsites in 4 files (`crm-attendee-move.js`, `crm-event-actions.js`, `crm-event-register.js`, `crm-lead-actions.js`).
- 16 active automation rules across the 5 trigger categories. Well under the Brief's 30-rule halt threshold.
- 3 live DB queue-producer triggers — all UPDATE-only, all status-delta-guarded.
- 0 INSERT triggers, 0 MOVE triggers.
- Queue covers 2 of 5 trigger types cleanly. 3 of 5 require DDL.

Brief mentions of `attendee-cancel` and `broadcast-send` as legacy callsites are **inaccurate**: cancellation already flows through the queue (`trg_attendee_status_change_event` fires when `crm-attendee-cancel.js` UPDATEs `status='cancelled'`), and broadcast-send is a separate one-shot dispatch path, not a `crm_automation_rules` evaluator.

### Phase 2 — Per-automation migration: ⛔ SKIPPED

Cause: Brief premise blocker. Escalation: `escalations/2026-05-14T00-30Z_LEGACY_DISPATCH_DECOMMISSION_BRIEF_PREMISE_BLOCKER.md`.

The Pipeline considered, then rejected, partial migration of the 2 callsites that DO have queue producers (`event_status_change`, `lead_status_change`). Reasons:
- Modal UX regression applies to those callsites equally and was not authorized by the Brief.
- The most recent SPEC author chose to keep both paths active intentionally.
- Phase 4 (legacy code removal) gates on ALL migrations being green, so partial migration leaves a worse code split than today (some callsites legacy, some not, helper files un-removable).
- Zero active rules currently exist in the `lead.status_change` slot on demo, so migrating callsite #4 would change behavior for nothing while removing operator preview UX for any future rule.

### Phase 3 — Full regression sweep: ⛔ SKIPPED (no migrations to regression-test)

### Phase 4 — Legacy code removal: ⛔ SKIPPED (hard gate not met)

### Phase 5 — Morning summary: ✅ This document.

---

## Per-automation matrix (would-have-been Phase 2 results)

| Rule (active) | Trigger callsite | Status |
|---|---|---|
| `הרשמה: אישור הרשמה` (event_registration_confirmation) | `crm-event-register.js:110` | BLOCKED — no INSERT trigger |
| `הרשמה: אישור רשימת המתנה` (event_waiting_list) | `crm-event-register.js:110` | BLOCKED — no INSERT trigger |
| `העברת משתתף ידנית - לא שילם` | `crm-attendee-move.js:111` | BLOCKED — no MOVE trigger |
| `העברת משתתף ידנית - שילם` | `crm-attendee-move.js:111` | BLOCKED — no MOVE trigger |
| `שינוי סטטוס: ייפתח מחר` | `crm-event-actions.js:217` | DEFERRED — needs UX-modal policy decision |
| `שינוי סטטוס: נפתחה הרשמה` | `crm-event-actions.js:217` | DEFERRED — needs UX-modal policy decision |
| `אירוע פתח להרשמה - הזמנת רשימת המתנה` | `crm-event-actions.js:217` | DEFERRED |
| `שינוי סטטוס: הזמנה חדשה` | `crm-event-actions.js:217` | DEFERRED |
| `שינוי סטטוס: 2-3 ימים לפני` (queue_send) | `crm-event-actions.js:217` | DEFERRED |
| `שינוי סטטוס: יום אירוע` (queue_send) | `crm-event-actions.js:217` | DEFERRED |
| `שינוי סטטוס: הזמנה ממתינים` | `crm-event-actions.js:217` | DEFERRED |
| `שינוי סטטוס: אירוע הושלם` | `crm-event-actions.js:217` | DEFERRED |
| `ליד חדש: ברוך הבא` (lead_intake_new) | `crm-lead-actions.js:143` | BLOCKED — no INSERT trigger |
| (no active rule) | `crm-lead-actions.js:9` (lead_status_change) | DEFERRED — no rule, but UX-modal policy still applies for future rules |

5 BLOCKED + 9 DEFERRED + 0 MIGRATED + 0 ESCALATED-individually + 0 REGRESSION.

---

## Open questions for Daniel

1. **Modal-preview UX policy** — keep the operator preview/approve modal for status-change automations, or accept fire-and-forget? If keeping, the queue path needs a separate operator-review UI before dispatch (a real SPEC of its own).
2. **DDL authorization scope** — is the legacy-decommission Brief allowed to add INSERT triggers on `crm_leads` and `crm_event_attendees` (and a MOVE producer for attendee moves)? Brief §2.6 says no; without that permission, 3 of 5 callsites cannot be migrated.
3. **Email allowlist housekeeping** — the live email allowlist on demo includes a 3rd entry `danylis92@gmail.com` not listed in the Brief. Two clean choices: (a) update future Briefs to reflect the live state, or (b) `UPDATE tenants SET ui_config = jsonb_set(ui_config, '{test_mode_email_allowlist}', '["daniel@prizma-optic.co.il","alkimovich94@gmail.com"]'::jsonb) WHERE id='8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid;` (Daniel-approved DML, not Pipeline).

---

## Recommended action

**Brief revision + re-run.** Specifically:

- Revise §1 to use the correct symbol name (`CrmAutomationClient.evaluate`).
- Either authorize DDL for INSERT triggers on `crm_leads` + `crm_event_attendees` and a MOVE producer for attendee moves — OR descope the Brief to only the `event_status_change` and `lead_status_change` callsites.
- Add an explicit §2.X clause on the operator-modal UX: keep / remove / replace with a queue-side review UI.
- After revision, run the new Brief — discovery will then return a green path for Phase 2.

Alternative (smaller scope, less risk): re-issue as `M4_LEGACY_DISPATCH_DECOMMISSION_PARTIAL` covering only the `event_status_change` callsite. Explicitly states the modal is removed for that callsite. Defer the rest to a later SPEC. This Pipeline can run that SPEC overnight as soon as it is written.

---

## Spot-check items for Daniel (per Brief §2.10 morning-review hygiene)

- The escalation files in `modules/Module 4 - CRM/escalations/` (2 files: allowlist superset + Brief premise blocker).
- The inventory at `modules/Module 4 - CRM/docs/audits/LEGACY_DISPATCH_INVENTORY_2026_05_14.md`.
- `git status` should show only documentation files added under `modules/Module 4 - CRM/`. No `.js`, `.html`, `.sql`, `.ts` files modified by this run.
- `git tag` should list `pre-legacy-dispatch-decommission-2026-05-14`.

If any of those four items are unexpected → that itself is a finding. Otherwise the run is a clean documentation-only halt.

---

*End of morning summary.*
