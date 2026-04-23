# FINDINGS — P20_CONFIRMATION_GATE

> **Location:** `modules/Module 4 - CRM/go-live/specs/P20_CONFIRMATION_GATE/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Rules

1. One entry per finding. Never merge two unrelated issues.
2. Findings are things discovered OUTSIDE the SPEC's declared scope.
3. Do NOT fix findings inside this SPEC.
4. Every finding has a suggested next action: NEW_SPEC / TECH_DEBT / DISMISS.
5. Severity: CRITICAL / HIGH / MEDIUM / LOW / INFO.

---

## Findings

### Finding 1 — `crm_message_log.metadata` column does not exist but SPEC referenced it

- **Code:** `M4-SPEC-P20-01`
- **Severity:** MEDIUM
- **Discovered during:** Track A implementation of cancel flow (SPEC §2 A4)
- **Location:** `campaigns/supersale/migrations/001_crm_schema.sql:280-293` (schema), `modules/Module 4 - CRM/go-live/specs/P20_CONFIRMATION_GATE/SPEC.md:110` (SPEC reference)
- **Description:** SPEC §2 A4 specifies writing `metadata = { rule_name, cancelled_by: 'user', cancelled_at: ISO }` on cancelled dispatch log rows. `crm_message_log` has no `metadata` column — its columns are `id, tenant_id, lead_id, event_id, template_id, broadcast_id, channel, content, status, external_id, error_message, created_at`. SPEC §7 explicitly forbids schema changes. Executor shipped without metadata; rule context is carried only via `template_id`.
- **Reproduction:**
  ```
  grep -n "^  \(metadata\|\w*\)" campaigns/supersale/migrations/001_crm_schema.sql
  # No "metadata" column in the CREATE TABLE crm_message_log block.
  ```
- **Expected vs Actual:**
  - Expected (per SPEC §2 A4): cancelled rows carry rule_name + timestamp + cancelled_by in a JSONB metadata field
  - Actual: cancelled rows carry template_id (→ template name/slug indirectly) and created_at (→ cancel time). No rule_name audit trail; no explicit "cancelled by user" marker distinguishing pending_review from a truly-stuck pending send.
- **Suggested next action:** NEW_SPEC (small — one migration + 2-line code change)
- **Rationale for action:** The intent (audit trail of why a dispatch was cancelled) is valid product-wise. Options the next SPEC should weigh:
  (a) add `metadata JSONB` column + index, update cancel insert, Rule 5 FIELD_MAP update;
  (b) overload `error_message` with a non-error prefix like `[cancelled_by_user:2026-04-23T10:00Z rule=<name>]` — cheaper but contaminates a column with a different semantic;
  (c) add a dedicated `cancelled_at timestamptz` + `cancellation_reason text` pair — more self-documenting than generic JSONB.
  Recommend (a) for cross-module consistency — `crm_leads.metadata`, `crm_events.metadata` already exist.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — `modules/Module 4 - CRM/docs/MODULE_MAP.md` is 3–4 files behind the actual filesystem

- **Code:** `M4-DOC-P20-02`
- **Severity:** LOW
- **Discovered during:** Pre-flight Rule 21 check for `crm-confirm-send.js` ownership
- **Location:** `modules/Module 4 - CRM/docs/MODULE_MAP.md` (header says "Last updated: 2026-04-22"; body lists 22 JS files but codebase now has ~26)
- **Description:** MODULE_MAP.md's JS file table predates at least these files: `crm-automation-engine.js` (237L), `crm-messaging-log.js` (151L), `crm-activity-log.js`, `crm-send-dialog.js`. The header mentions P3c+P4 messaging pipeline but the map body doesn't reflect the P8 automation engine or the P8 log split. New `crm-confirm-send.js` (added this SPEC) also not in the map.
- **Reproduction:**
  ```
  ls modules/crm/*.js | wc -l   →  26
  grep -c "^| \`crm-" modules/Module\ 4\ -\ CRM/docs/MODULE_MAP.md   →  (lower count)
  ```
- **Expected vs Actual:**
  - Expected: MODULE_MAP lists every JS file under `modules/crm/` with line counts and one-line purposes.
  - Actual: several newer files absent; executor couldn't use MODULE_MAP as an authoritative Rule-21 lookup and fell back to `Glob` + `Grep`.
- **Suggested next action:** NEW_SPEC (thin — docs-only refresh, one commit)
- **Rationale for action:** Keeping MODULE_MAP as "Authoritative per Module's code map" (CLAUDE.md §7) requires it to be current. A 5-minute bulk refresh SPEC (list every `modules/crm/*.js`, populate line counts and purposes, merge into MODULE_MAP) would restore its value. Same exercise likely needed for other modules that have churned heavily (e.g., Module 3 storefront).
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — P20 QA on demo tenant is owed but not in SPEC success criteria

- **Code:** `M4-QA-P20-03`
- **Severity:** MEDIUM
- **Discovered during:** Track B+C completion (no step in SPEC asks the executor to exercise the UI flow)
- **Location:** SPEC §3 Success Criteria + §4 Autonomy Envelope
- **Description:** The SPEC lists 10 success criteria (modal appears on status change, approve/cancel paths, log badge visibility, zero console errors) — all stated as "Visual" or "Functional test" without naming who runs them or where. The executor shipped code that compiles, passes staged verify, and conforms to the SPEC's structural requirements — but nobody has clicked through the flow on the demo tenant (`8d8cfa7e-ef58-49af-9702-a862d459cccb`). The criteria are measurable but un-assigned.
- **Reproduction:** N/A — this is a process gap, not a bug.
- **Expected vs Actual:**
  - Expected: SPEC names a QA owner (Daniel or an automated script) and a test scenario with specific event/lead fixtures on demo tenant.
  - Actual: criteria are passive assertions ("modal appears"). Executor can't run browser-based QA headlessly.
- **Suggested next action:** DISMISS if Daniel performs manual UI QA in the same session; otherwise NEW_SPEC or extend SPEC template to require a §"QA Owner" section.
- **Rationale for action:** The Guardian Protocol (CLAUDE.md "QA on demo tenant") implicitly makes Daniel the QA owner; this is not a new requirement. But for future SPECs, making this explicit ("QA Owner: Daniel, runs after executor signals close; must verify on demo tenant `8d8cfa7e-…` with lead phones +972537889878 or +972503348349") would remove ambiguity and make the "close" signal more meaningful.
- **Foreman override (filled by Foreman in review):** { }

---
