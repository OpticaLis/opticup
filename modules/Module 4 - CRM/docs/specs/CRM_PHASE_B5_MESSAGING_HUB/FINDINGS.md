# FINDINGS — CRM_PHASE_B5_MESSAGING_HUB

> **Written by:** opticup-executor (Claude Code / Windows desktop)
> **Written on:** 2026-04-20
> **Scope:** issues discovered during B5 execution that are out of scope for this SPEC.

---

## M4-B5-01 — `crm_broadcasts.status='sent'` is misleading while dispatch is deferred

- **Severity:** MEDIUM
- **Location:** `modules/crm/crm-messaging-broadcast.js:163` (and symmetrically `crm_message_log.status='sent'` at line 172)
- **Description:** The SPEC instructs the executor to write broadcasts with `status='sent'` and `total_sent=recipients`, and to log per-recipient rows with `status='sent'`. But §7 explicitly keeps external dispatch out of scope — nothing is actually sent. A database observer reading these rows today will see "sent" messages that no customer ever received. This is a minor integrity bug and a real auditability hazard if we ship to production before the dispatch integration lands.
- **Suggested next action:** Before `develop → main` merge, either (a) change the UI to write `status='draft'` / `status='queued'` / `status='pending_dispatch'` until the dispatch wiring exists (requires a tiny SPEC amendment), or (b) gate the "send" button behind a feature flag so it's not callable in production. Either is acceptable. Foreman to decide.

---

## M4-B5-02 — `crm_broadcasts.channel` is singular but SPEC UI sketched multi-channel checkboxes

- **Severity:** LOW
- **Location:** DB schema vs `CRM_PHASE_B5_MESSAGING_HUB/SPEC.md §8` broadcast section
- **Description:** DB column is `channel TEXT NOT NULL` (single value). SPEC §8 showed "Channel checkboxes: SMS / WhatsApp / Email". I chose radio buttons to match the DB. If the product intent was "one broadcast fires across multiple channels in one click," the DB must change (either `channels text[]` array or normalized `crm_broadcast_channels` table) — which is a Phase-A-style schema change, NOT a UI tweak.
- **Suggested next action:** Foreman clarifies the product intent. If multi-channel per broadcast is needed: new SPEC with DDL. If single-channel is fine: update SPEC §8 language to match the shipped UI and close the loop. No rework needed today.

---

## M4-B5-03 — SPEC §10 referenced `crm_leads.status_id`; actual column is `status`

- **Severity:** LOW (author-side fix)
- **Location:** `CRM_PHASE_B5_MESSAGING_HUB/SPEC.md §10 "Broadcast recipient count query"`
- **Description:** SPEC snippet used `.eq('status_id', statusFilter)`. Actual `crm_leads` schema has `status` (text). Matches `crm-leads-tab.js` existing usage. Executor silently adjusted when writing `buildLeadIdsQuery()`.
- **Suggested next action:** Foreman SPEC-authoring protocol already mandates column verification — this one slipped through. Edit the SPEC in-place if desired (post-execution edit for history), or just let the FOREMAN_REVIEW log it as a SPEC-quality item and update the authoring-protocol checklist.

---

## M4-B5-04 — `rule-21-orphans` hook flagged 7 false positives on IIFE-local helpers

- **Severity:** LOW (known issue)
- **Location:** `scripts/verify.mjs` rule-21 detector / pre-commit hook
- **Description:** On commit `684d3be`, the hook flagged `logWrite`, `toast`, `renderTable`, `readForm`, `validate`, `save`, `toggleActive` as duplicated between `crm-messaging-templates.js` and `crm-messaging-rules.js`. These are module-private inside IIFE closures — they are not globals, and there is no actual collision. Same class of false positive reported in B3 (`M4-TOOL-01`) and B4 (`TOOL-DEBT-01`). The hook is informational (commit landed), but every noisy run erodes signal.
- **Suggested next action:** Merge with existing `M4-TOOL-01` entry. The fix is scope-awareness in the detector: only flag duplicates when both definitions are at file top level outside `(function(){...})()` IIFE wrappers. Single fix closes all three entries.

---

## M4-B5-05 — Automation rules are storage-only; no scheduler exists to execute them

- **Severity:** INFO (by design, noted in SPEC §7)
- **Location:** `crm_automation_rules` table + `modules/crm/crm-messaging-rules.js` UI
- **Description:** The UI lets you author rules with triggers like "lead.status_change" and actions like "send_message via WhatsApp after 60min". These rows are persisted but no background scheduler, Edge Function, or Supabase cron watches them. Everything in the rules sub-tab is essentially a configuration stub for a future dispatcher. A staff member who saves a rule today will reasonably expect it to fire tomorrow, and it won't.
- **Suggested next action:** Either (a) add a "not yet active" banner to the rules sub-tab until the dispatcher lands, or (b) prioritize the dispatcher SPEC (candidate B6 scope). The SPEC itself flagged this as future scope but it's worth a user-visible note on the UI until the feature is real.

---

## M4-B5-06 — B4 FOREMAN_REVIEW.md remains untracked in git

- **Severity:** LOW (housekeeping)
- **Location:** `modules/Module 4 - CRM/docs/specs/CRM_PHASE_B4_EVENT_DAY/FOREMAN_REVIEW.md` (file exists on disk, untracked)
- **Description:** B4 closed with commit `5709799` titled "chore(spec): close CRM_PHASE_B4_EVENT_DAY with retrospective" — that commit should have included the FOREMAN_REVIEW.md but didn't. The file has been sitting untracked since. I chose not to commit it under the B5 umbrella (one concern per task) but it's an outstanding docs-currency item.
- **Suggested next action:** Commit it in a standalone `docs(crm): archive B4 FOREMAN_REVIEW` commit, or fold it into the next CRM docs commit. Trivial fix.
