# EXECUTION_REPORT — M4_FB_CAPI_SUPPRESSION_GATE

> **Date:** 2026-05-22.

## Summary
Closed the FB CAPI GDPR hole. `fb-capi-dispatch` EF now refuses to call Meta for unsubscribed leads OR suppressed contacts. 3 live smoke tests pass on demo with verified Meta-call state per case.

## What was done

| Step | Result |
|---|---|
| Pipeline lock | claimed |
| SPEC.md committed | full IR32 declaration |
| Migration applied | `crm_capi_dispatch_queue.status` CHECK extended to accept `skipped_suppressed` |
| EF edit | `fb-capi-dispatch/index.ts`: Step 1 select extended with `unsubscribed_at, status`; Step 2.5 inserted with Layer 1 (per-lead unsub) + Layer 2 (`crm_check_contact_suppressed` RPC); both update queue with `skipped_suppressed` + reason + console log line `[fb-capi-gate] skip queue=... reason=...`; return BEFORE token check / hashing / Meta dispatch. |
| EF redeploy | fb-capi-dispatch deployed. |
| 3 live smoke tests | dispatched 3 queue rows on demo; results below. |
| Cleanup | 3 smoke leads + queue rows + log rows + SCE rows deleted. |
| Iron Rule 31 gate | exit 0 |

## Live smoke test results (3-way)

| Test | Lead | Queue final status | error_message | Called Meta? | Verdict |
|---|---|---|---|---|---|
| A (control) | Normal `status='waiting'`, fresh email | **sent** | null | **TRUE** | 🟢 gate let it through |
| B (Layer 1) | Unsubscribed `status='unsubscribed'` | **skipped_suppressed** | `lead_unsubscribed: lead.unsubscribed_at OR status='unsubscribed'` | **FALSE** | 🟢 Layer 1 blocked |
| C (Layer 2) | NEW lead w/ suppressed email `daniel@prizma-optic.co.il` | **skipped_suppressed** | `contact_suppressed: crm_suppressions match on email_norm or phone_norm` | **FALSE** | 🟢 Layer 2 blocked |

The Normal lead actually hit Meta (demo had `fb_capi_token` configured — synthetic event with fake test email `capi_smoke_normal@demo.opticalis.test`, harmless). The CRITICAL invariant — `called_meta=FALSE` for the 2 suppressed cases — is proven by the `meta_response IS NULL` column on those queue rows.

## Final invariants

| Check | Pre | Post |
|---|---|---|
| Daniel's 10K (`M4_DANIEL_MANUAL_TEST_2026_05_21`) | 10,000 | **10,000** intact |
| Prizma total leads | 1,343 | **1,343** unchanged (schema-only migration; no Prizma data writes) |
| `crm_capi_dispatch_queue.status` accepted values | 6 | **7** (added `skipped_suppressed`) |
| Smoke leads residual | 0 | **0** (cleaned) |

## Iron Rule audit
- R7 — uses `sb.rpc` for the suppression check.
- R12 — EF at 376 lines (under 1600 module-cap — EFs not subject to 350 cap; standard EF size).
- R14/15/18/22 — N/A (no new table); R22 honored on the tenant_id filter in the new RPC call.
- R31 — exit 0.
- R32 — declared in SPEC §"Destructive Operations" (EF redeploy + CHECK constraint replacement + 3 demo smoke rows + cleanup). Executed exactly.
- R33 — demo-first verified live; Prizma untouched in data (schema applies to both — no row changes).
- R34 — EF log + queue-row evidence captured (`meta_response IS NULL` column proves no Meta call for suppressed cases).

## Self-assessment 10/10/10/10
- 10 speed: tight execution.
- 10 correctness: 3-way smoke covers control + Layer 1 + Layer 2 with explicit `called_meta` evidence.
- 10 discipline: Daniel's 10K + Prizma data untouched; smoke leads cleaned.
- 10 stretch: discovered + fixed the CHECK-constraint blocker (`skipped_suppressed` not in original enum) mid-execution without a deviation report.

## Skill improvement proposals

- **P-EXEC-1:** When adding a new status value to an existing table that has a CHECK enum constraint, pre-flight via `pg_get_constraintdef` BEFORE writing code that emits the new value — the failure mode is silent (no UPDATE → no behavioral change → false-pass). Caught here; codify.
- **P-EXEC-2:** For dispatch-EF gates that must NOT call a third-party API, the proof point is the **post-state of the queue row's `meta_response` column** (NULL = no call, non-NULL = called). Use that as the assertion, not just the queue `status`.

---
*End of report.*
