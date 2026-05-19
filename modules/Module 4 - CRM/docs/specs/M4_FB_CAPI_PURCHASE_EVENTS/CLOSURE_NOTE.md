# CLOSURE_NOTE — M4_FB_CAPI_PURCHASE_EVENTS

> **Written by:** opticup-strategic (Foreman, M4)
> **Written on:** 2026-05-19
> **Purpose:** Pivot this SPEC's verdict from 🔴 (LH-Tester RED) to 🟡 CLOSED-WITH-HOTFIX-DEPENDENCY-CLOSED.
> **Cross-ref:** `modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX/` — the hotfix that closed this SPEC's dependency.

---

## What happened

This SPEC shipped the substrate for full-funnel CAPI events (CompleteRegistration + EventAttended + Purchase) via 3 DB triggers + EF branching + constraint swap. Executor + Reviewer phases were clean (🟢). Localhost-Tester phase 4 caught a P0 regression: the 3 trigger functions referenced `public.uuid_generate_v5(public.uuid_ns_oid(), ...)`, but `uuid-ossp` actually installs into the `extensions` schema on this Supabase project. Every INSERT/UPDATE on `crm_event_attendees` raised SQLSTATE 42883 — production-broken.

LH-Tester escalated. Daniel authorized a hotfix SPEC.

## What the hotfix did

`M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX` swapped the schema qualifier from `public.` to `extensions.` in all 3 trigger function bodies (6 string changes total) via 3 `CREATE OR REPLACE FUNCTION` calls in a single migration. Zero new objects, zero schema changes, zero destructive ops.

After hotfix:
- INSERT into `crm_event_attendees` no longer fails.
- 6 deferred E2E tests (this SPEC's criteria 14–19) all PASS on demo.
- Events transitioned to `status='sent'` (not the parent SPEC's predicted `skipped_no_token`) because demo's `fb_capi_token` has been populated since this SPEC was authored.
- Meta returned `events_received: 1` + `fbtrace_id` for all 3 dispatched events.

## Verdict pivot

| Phase | This SPEC verdict | Final state |
|---|---|---|
| Executor | 🟢 | confirmed |
| Reviewer | 🟢 (3 INFO concerns) | confirmed |
| LH-Tester | 🔴 (P0 regression) | RESOLVED via hotfix |
| Foreman closure (this note) | 🟡 CLOSED-WITH-HOTFIX-DEPENDENCY-CLOSED | this verdict supersedes the LH-Tester's RED |

## Dependency closure

Parent SPEC §3 criteria 14–19 (the E2E tests) are now closed via the hotfix's TEST_REPORT.md §2–§6. The parent's TEST_REPORT.md remains as the historical record of the original RED state + the escalation.

Parent SPEC's:
- Criterion 14 (CompleteRegistration) — ✅ via hotfix TEST_REPORT §2.
- Criterion 15 (EventAttended) — ✅ via hotfix TEST_REPORT §3.
- Criterion 16 (Purchase + value + currency) — ✅ via hotfix TEST_REPORT §4. EF source line 199 confirmed building `custom_data: { value, currency: 'ILS' }`. Meta `events_received: 1`.
- Criterion 17 (Idempotency on EventAttended) — ✅ via hotfix TEST_REPORT §5.
- Criterion 18 (Refund direction no-op) — ✅ via hotfix TEST_REPORT §6.
- Criterion 19 (Typo correction no-op) — ✅ via hotfix TEST_REPORT §6.

All 6 deferred criteria green via the hotfix's execution.

## Lessons captured

The hotfix's FOREMAN_REVIEW.md promotes 4 skill improvements (2 per side):

- **P-AUTHOR-1:** Probe `pg_proc.namespace` at SPEC author time for any extension function call (Foreman pre-flight blind spot — caught by hotfix LH-Tester).
- **P-AUTHOR-2:** Migration line-budget includes a 5-7 line header-comment buffer by default.
- **P-EXEC-1:** Executor Step 1.5 schema-qualified function probe (defense-in-depth for the same blind spot).
- **P-EXEC-2:** Baseline drift annotation standard in EXECUTION_REPORT criteria tables.

These will be applied to the opticup-strategic and opticup-executor SKILL.md files in a future skill-improvement sweep.

## Why this is 🟡 not 🟢

The parent SPEC shipped a P0 production regression that required a same-day hotfix. The 🟡 verdict acknowledges that closure happened via TWO SPECs (this one + the hotfix), not just one. This is more honest than re-pivoting to 🟢 outright. Functional state: equivalent to 🟢. Historical state: dual-SPEC closure with a known correction loop.

## Cross-references

- Hotfix SPEC: `modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX/`
- Hotfix FOREMAN_REVIEW: `.../M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX/FOREMAN_REVIEW.md`
- LH-Tester escalation that caught the bug: `modules/Module 4 - CRM/escalations/2026-05-19T15-50-00Z_M4_FB_CAPI_PURCHASE_EVENTS_UUID_OSSP_SCHEMA.md`
- Supervisor Shadow proposal: `modules/Module 4 - CRM/escalations/ARCHITECT_DECISION_2026-05-19T15-50-00Z_M4_FB_CAPI_PURCHASE_EVENTS_UUID_OSSP_SCHEMA.md`
- Commit range (parent + hotfix): `28738f6..e88b1bd`.

---

*End of CLOSURE_NOTE.*
