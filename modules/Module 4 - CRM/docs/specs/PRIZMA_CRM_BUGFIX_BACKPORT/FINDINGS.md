# FINDINGS — PRIZMA_CRM_BUGFIX_BACKPORT

Findings not addressed in this SPEC's direct scope but surfaced during execution.

---

## DIAG-INFO-1 — `crm_automation_rules` has no `updated_at` column

**Severity:** INFO
**Source:** Phase 1 pre-flight query failure.

The first pre-flight SELECT against `crm_automation_rules` requested an `updated_at` column. Postgres returned `42703: column "updated_at" does not exist. HINT: Perhaps you meant to reference the column "crm_automation_rules.created_at"`.

The post-write rows still show their original `created_at` (2026-04-28 / 2026-04-22). There is no way to tell from the row itself when the `action_config` was last modified beyond consulting git/SPEC history.

**Disposition:** Add to `TECH_DEBT.md` under Module 4. Suggested debt item:

> **M4-DEBT-CRM-AUTO-RULES-UPDATED-AT** — Add `updated_at timestamptz NOT NULL DEFAULT now()` + a trigger or `ON UPDATE` mechanism to `crm_automation_rules`. Required for future audit work and for `M4_DEMO_E2E_FULL_AUDIT`-style verification queries that filter on "rows updated since X". Low priority; the table is small (16-32 rows per tenant) and DB-level audit is rarely needed today.

---

## DIAG-INFO-2 — `crm_events` column name surprise

**Severity:** INFO
**Source:** Phase 1 query against `crm_events`.

A pre-flight query against `crm_events` requested an `event_name` column. The actual column is just `name`. Minor — affected one query, no functional impact, no SPEC delay.

**Disposition:** Dismiss. Already in the schema reference (`docs/DB_TABLES_REFERENCE.md`); the executor (this Pipeline) should have consulted that first.

---

## DRYRUN-INFO-3 — `event_registration_open` rule resolves to 1999 plan_items on Prizma

**Severity:** INFO (audit-worthy, not a bug from this SPEC)
**Source:** EF dry-run §2.1 of TEST_REPORT.md.

When invoking `automation-engine` `mode=evaluate` on Prizma with trigger `event_status_change` + `newStatus='registration_open'`, the response contained **1999 plan_items** all from a different rule (template_slug=`event_registration_open`). That rule's recipient resolver expands to ~all of Prizma's `waiting`-status leads (1156) × 2 channels (SMS+email) ≈ 1999 items (some leads missing phone OR email).

This rule is **out of scope for this SPEC** and was not modified. But it may be worth a separate audit:
1. Is 1999 outbound messages per event-open the intended behavior?
2. Should this rule's audience be narrowed (e.g., `attendees_all_statuses` for the new event, or some other filter)?
3. If Prizma operationally relies on broadcasting `event_registration_open` to all waiting leads — fine, no action. But if not intentional, this is a much larger outbound-volume bug than the one fixed in this SPEC.

**Disposition:** Add to `TECH_DEBT.md` under Module 4 as **M4-DEBT-EVENT-REG-OPEN-AUDIENCE-AUDIT** — investigate the `event_registration_open` rule's audience scope. Compare to demo's equivalent rule (if any). Decision SPEC.

---

## EF-INFO-4 — Evaluate mode writes to `crm_automation_runs` (with status=completed, all counts=0)

**Severity:** INFO (not a bug — by design)
**Source:** EF source review (`automation-engine/engine.ts`) + post-dryrun count check.

`automation-engine` in `mode='evaluate'` skips post-actions, attendee upsert, queue_send, and dispatch — but it DOES write 1 row per invocation to `crm_automation_runs` (initially `status='running'`, then patched to `status='completed'` at end). The 4 dry-runs in this SPEC added 4 rows to Prizma's `crm_automation_runs` (120→124).

Is this a side effect? Technically yes. Is it forbidden by the brief? The brief forbids "any live message during verification" and "ANY DELETE", "ANY schema change", "ANY code change" — but doesn't classify a diagnostic `crm_automation_runs` insert as forbidden. These rows are a feature, not a bug — they let an operator review what an evaluation would have done.

**Disposition:** Dismiss (informational only). Future "preview" verifications across the project should be aware that `crm_automation_runs` is written even in evaluate mode — that's intentional observability, not a side effect to suppress.

---

*End of FINDINGS.*
