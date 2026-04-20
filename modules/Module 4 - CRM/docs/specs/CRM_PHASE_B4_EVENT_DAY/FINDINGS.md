# FINDINGS — CRM_PHASE_B4_EVENT_DAY

> **Location:** `modules/Module 4 - CRM/docs/specs/CRM_PHASE_B4_EVENT_DAY/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — rule-21-orphans hook false-positives on local `var` bindings

- **Code:** `TOOL-DEBT-01`
- **Severity:** LOW
- **Discovered during:** Commit 4 pre-commit hook run
- **Location:** `.husky/pre-commit` (rule-21-orphans detector) — reports 2 violations at `modules/crm/crm-events-detail.js:165,166` and `modules/crm/crm-event-day-manage.js` for identifiers `name` and `phone`
- **Description:** The rule-21-orphans detector treats identical local `var`
  bindings across two files as "function defined in 2 files." In reality, these
  are local `var name = (r.full_name || '').toLowerCase();` and `var phone = ...`
  bindings inside separate IIFEs — they are **not** global functions and cannot
  collide. The detector appears to match on bare-identifier patterns without
  checking scope or whether the identifier is bound to a function vs a value.
- **Reproduction:**
  ```
  grep -n 'var name\|var phone' modules/crm/crm-events-detail.js modules/crm/crm-event-day-manage.js
  ```
  Both files have the pattern `var name = ...toLowerCase();` inside their IIFE.
- **Expected vs Actual:**
  - Expected: 0 violations (local vars in separate IIFEs do not duplicate anything)
  - Actual: 2 violations flagged, commit still allowed through (so the hook is
    non-blocking for this rule class, which is correct behavior for a
    low-confidence detector)
- **Suggested next action:** TECH_DEBT
- **Rationale for action:** The detector is working in a useful direction (catching real duplicates elsewhere) but generates noise on this pattern. A small improvement — filter to only `function foo()` or `const foo = () =>` / `var foo = function` declarations, skip plain value bindings — would eliminate this noise without losing real coverage. Not blocking; can be addressed when the rule-21 hook is next revised.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — CRM module has not migrated to `DB.*` wrapper (shared/js/supabase-client.js)

- **Code:** `M4-DEBT-02`
- **Severity:** LOW
- **Discovered during:** Iron-Rule self-audit against Rule 7 (API abstraction)
- **Location:** all CRM module JS files: `modules/crm/crm-*.js`
- **Description:** Rule 7 says "All DB interactions pass through `shared.js` helpers (`fetchAll`, `batchCreate`, etc.) — never call `sb.from()` directly except for specialized joins impossible through helpers." The Module 1.5 `DB.*` wrapper (`shared/js/supabase-client.js`) goes further and adds auto-tenant, error classification, and retry. All CRM code (B3 era and this SPEC's B4 code) uses raw `sb.from(...)` / `sb.rpc(...)` directly. This is **consistent** — every CRM file works this way — but it's inconsistent with the rule and with Inventory/Admin modules that use `DB.*`.
- **Reproduction:**
  ```
  grep -rn 'sb\.from\|sb\.rpc' modules/crm/*.js | wc -l
  # Expect: ~20+ direct calls
  grep -rn 'DB\.select\|DB\.insert\|DB\.update' modules/crm/*.js | wc -l
  # Expect: 0
  ```
- **Expected vs Actual:**
  - Expected per Rule 7: CRM uses `DB.*` wrapper or shared helpers
  - Actual: CRM uses raw `sb.from()` / `sb.rpc()` everywhere
- **Suggested next action:** NEW_SPEC
- **Rationale for action:** Migrating an entire module to `DB.*` is a mechanical but non-trivial refactor with real blast radius (every query gets rewritten). Worth its own SPEC so that (a) Foreman can scope it, (b) a snapshot + systematic replacement can be planned, and (c) the post-migration verification can catch any missing tenant_id defense or error handling. Do not absorb into an unrelated future SPEC — let this be its own phase.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — Demo tenant has ZERO CRM data (no events, no attendees, no leads, no statuses)

- **Code:** `M4-DATA-03`
- **Severity:** MEDIUM
- **Discovered during:** §12 pre-flight check (SQL on Supabase)
- **Location:** `crm_events`, `crm_event_attendees`, `crm_leads`, `crm_statuses` where `tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'` (demo)
- **Description:** The CRM schema exists on demo tenant (Phase A migration ran globally), but **no data** exists. Phase B2 imported 893 leads / 11 events / 149 attendees on Prizma only. For any future SPEC that requires behavioral QA via browser automation or MCP, demo is currently unusable — browser tests either have to run on Prizma (which is production, not ideal for destructive write tests) or pre-seed demo first. Seeding from scratch requires at minimum: 1 row in `crm_statuses` per entity type (lead/event/attendee, several rows each), 1 row in `crm_campaigns`, 1 row in `crm_events`, 3 rows in `crm_leads`, 3 rows in `crm_event_attendees` — roughly 15+ INSERTs across 5 tables.
- **Reproduction:**
  ```sql
  SELECT
    (SELECT count(*) FROM crm_events WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb') AS events,
    (SELECT count(*) FROM crm_event_attendees WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb') AS attendees,
    (SELECT count(*) FROM crm_leads WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb') AS leads,
    (SELECT count(*) FROM crm_statuses WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb') AS statuses;
  -- All 4 return 0
  ```
- **Expected vs Actual:**
  - Expected per SPEC §14: If demo has 0 events, seed minimal test data (1 event + 3 attendees)
  - Actual: Demo has 0 of everything. A full seed is much more than 1 event + 3 attendees; it spans 5+ tables and resembles a mini-migration, not "seeding."
- **Suggested next action:** NEW_SPEC
- **Rationale for action:** A dedicated "CRM demo-tenant seed" SPEC is the right home for this — it can clone a subset of Prizma's CRM data onto demo with deterministic IDs, giving all future CRM SPECs a reliable test tenant. Also matches the pattern of `modules/Module 1.5 - Shared Components/scripts/clone-tenant.sql` referenced in `CLAUDE.md §9`. Do not try to inline this into an unrelated SPEC.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 4 — SPEC §12 "pending commits from Cowork" was stale

- **Code:** `SPEC-QUAL-01`
- **Severity:** LOW
- **Discovered during:** Session-start First Action (step 4, clean-repo check)
- **Location:** `modules/Module 4 - CRM/docs/specs/CRM_PHASE_B4_EVENT_DAY/SPEC.md` §12
- **Description:** §12 listed 6 files as "saved on disk but not yet committed" and instructed the executor to commit them first. In reality, 5 of 6 were already committed (commits `2512f59` "add B3 FOREMAN_REVIEW, fix nav CSS selector, create Module 4 docs" on 2026-04-19 and `4b36310` "add CRM_PHASE_B4_EVENT_DAY SPEC" on 2026-04-20). The SPEC was authored assuming those commits had not yet landed. A small staleness that required manual reconciliation. This is meta-feedback for the Foreman skill — not a code bug.
- **Reproduction:** Compare SPEC §12's file list against `git log --oneline` at SPEC authoring time.
- **Expected vs Actual:**
  - Expected per §12: 6 files untracked
  - Actual at session start: 5 of 6 already committed
- **Suggested next action:** DISMISS (for code) but NEW_SPEC or FOREMAN_SKILL_UPDATE for the Foreman's authoring protocol
- **Rationale for action:** Not an executor problem to fix. Feeds directly into Proposal 1 of EXECUTION_REPORT §8 (add a reconciliation step to the executor protocol) **and** suggests that the Foreman skill should add a "SPEC freshness check" before dispatching — verify pending-commit sections against actual `git log` at dispatch time.
- **Foreman override (filled by Foreman in review):** { }

---
