# TEST_REPORT — M4_FB_CAPI_HYBRID_DEDUPLICATION

**Date:** 2026-05-15 16:16 UTC
**Tester:** opticup-localhost-tester (skill)
**Repo:** opticalis/opticup, branch `develop`, HEAD `58703f3`
**Tenant under test:** demo (`8d8cfa7e-ef58-49af-9702-a862d459cccb`)
**Verdict:** 🟢 GREEN

---

## §1 — Smoke PRE (delegated)

Per SPEC §3 delegation policy, the PRE state is anchored to the most recent
green M4 smoke run rather than re-executed:

- **Anchor SPEC:** `M4_BROADCAST_ID_PROPAGATION`
- **Anchor TEST_REPORT:** `modules/Module 4 - CRM/docs/specs/M4_BROADCAST_ID_PROPAGATION/TEST_REPORT.md`
- **Anchor commit:** `c8b5279` — _chore(spec): M4_BROADCAST_ID_PROPAGATION localhost-tester smoke report (7/7 PASS)_
- **Anchor verdict:** 7/7 PASS on demo, 2026-05-14
- **Substrate continuity:** Between the anchor commit and this run, no M4
  baseline-touching code was modified (changes were additive: new table
  `crm_capi_dispatch_queue`, 2 nullable columns on `crm_leads`, new EF
  `fb-capi-dispatch`, new pg_cron job, lead-intake bumped to v28 with a
  fully optional `fb_event_id` field). PRE green therefore remains valid.

No PRE re-run was performed.

---

## §2 — Smoke POST

### Servers (verified up before running tests)

- ERP        `http://localhost:3000`  → 200
- Storefront `http://localhost:4321`  → 200

Stack from a prior aborted LH-Tester attempt was already up and re-used.

### Baseline (`npm run smoke` → `tests/smoke/baseline.test.mjs`)

**Run 1 — 5/7 PASS** (flake from leftover state)

| # | Test                                                              | Result   |
|---|-------------------------------------------------------------------|----------|
| 1 | PIN login returns JWT with tenant_id=demo                         | PASS     |
| 2 | Create CRM lead succeeds (M4)                                     | **FAIL** — `duplicate key value violates unique constraint "crm_leads_tenant_phone_active_uniq"` |
| 3 | Read inventory count for demo tenant (M1)                         | PASS     |
| 4 | Storefront homepage returns 200                                   | PASS     |
| 5 | Storefront /supersale lead-form page returns 200                  | PASS     |
| 6 | Cross-module: lead from test-2 visible via crm_leads SELECT       | **FAIL** — cascaded from test-2 (test-6 depends on test-2's lead) |
| 7 | No 5xx on critical pages (HEAD only)                              | PASS     |

**Root cause of Run 1 failure:** the previous LH-Tester attempt that stalled
mid-task left 2 orphan `crm_leads` rows on demo with phone `+972500000000`
(baseline's hard-coded test phone), preventing test-2 from re-inserting.
This is environmental leftover state, not a regression in the SPEC's changes.

**Remediation:** swept all 9 FK-referencing tables (`crm_capi_dispatch_queue`,
`crm_event_attendees`, `crm_lead_notes`, `crm_lead_tags`, `crm_lead_touchpoints`,
`crm_message_log`, `crm_message_queue`, `crm_unsubscribes`, `short_links`) +
deleted the 2 orphan leads on demo only, scoped to `phone='+972500000000'`.
Per skill retry policy ("retry ONCE on flakiness"), reran smoke.

**Run 2 — 7/7 PASS** ✅

| # | Test                                                              | Result | Duration |
|---|-------------------------------------------------------------------|--------|----------|
| 1 | PIN login returns JWT with tenant_id=demo                         | PASS   | 1891 ms  |
| 2 | Create CRM lead succeeds (M4)                                     | PASS   |  322 ms  |
| 3 | Read inventory count for demo tenant (M1)                         | PASS   |  440 ms  |
| 4 | Storefront homepage returns 200                                   | PASS   | 2450 ms  |
| 5 | Storefront /supersale lead-form page returns 200                  | PASS   | 1082 ms  |
| 6 | Cross-module: lead from test-2 visible via crm_leads SELECT       | PASS   |  155 ms  |
| 7 | No 5xx on critical pages (HEAD only)                              | PASS   | 1253 ms  |

7/7 passed, 0 failed. Total runtime ~7.6s.

---

## §3 — CAPI substrate end-to-end verification

Lightweight check that the new substrate is wired correctly end-to-end. This
is the value-add of THIS SPEC and exercises every new piece the SPEC shipped
in a single integration probe.

### 3.1 — POST lead with `fb_event_id`

```http
POST https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/lead-intake
Headers: Content-Type: application/json
         Origin:       https://demo.opticalis.co.il
         Authorization: Bearer <demo anon publishable key>
Body: { "tenant_slug": "demo",
        "name":        "FB CAPI LH-Test",
        "email":       "fb-capi-lh-test-1778872506@example.com",
        "phone":       "+972500000001",
        "source":      "supersale",
        "fb_event_id": "5a402fa4-9c08-44fe-9c9b-ebca9881ce29" }

→ 201 Created
→ { "id": "20bcdbf1-db36-4f80-acd3-4c46f4474a59", "is_new": true }
```

(Note: first call without an Authorization header returned 401 — Supabase
Edge Functions still gate on the publishable-key Bearer even when
`verify_jwt=false`. Real browser callers send it via `supabase-js`'s
default headers, so this is not a SPEC defect.)

### 3.2 — DB verification

**`crm_leads` row:**
```
id              : 20bcdbf1-db36-4f80-acd3-4c46f4474a59
full_name       : FB CAPI LH-Test
email           : fb-capi-lh-test-1778872506@example.com
phone           : +972500000001
source          : supersale
fb_event_id     : 5a402fa4-9c08-44fe-9c9b-ebca9881ce29   ← matches POST
fb_pixel_fired_at: null                                   ← expected (no browser pixel)
created_at      : 2026-05-15 16:15:26.760618+00
```

**`crm_capi_dispatch_queue` row (initial — t+0s):**
```
id            : 2ec1162e-f625-4299-a129-e3b74dd79d03
lead_id       : 20bcdbf1-db36-4f80-acd3-4c46f4474a59
tenant_id     : 8d8cfa7e-ef58-49af-9702-a862d459cccb  (demo)
event_id      : 5a402fa4-9c08-44fe-9c9b-ebca9881ce29  (matches fb_event_id)
event_name    : Lead
status        : queued
retries       : 0
created_at    : 2026-05-15 16:15:27.16708+00
scheduled_at  : 2026-05-15 16:15:27.16708+00
processed_at  : null
```

Lead-intake (v28) correctly enqueued a row with the same `event_id` as the
caller-supplied `fb_event_id`, identifying it as a `Lead` event scoped to
the demo tenant. ✅

### 3.3 — Cron consumer tick verification

`cron.job_run_details` for `fb_capi_dispatch_consumer`:

| start_time              | end_time                | status    | return_message |
|-------------------------|-------------------------|-----------|----------------|
| 2026-05-15 16:14:00 UTC | 2026-05-15 16:14:00 UTC | succeeded | `0 rows`       |
| 2026-05-15 16:15:00 UTC | 2026-05-15 16:15:00 UTC | succeeded | `0 rows`       |
| **2026-05-15 16:16:00 UTC** | 2026-05-15 16:16:00 UTC | **succeeded** | **`1 row`** ← our lead picked up |

The 16:16 tick (37s after enqueue) is the one that processed our row.

### 3.4 — `crm_capi_dispatch_queue` final state (t+62s)

```
status        : skipped_no_token
retries       : 0
error_message : no fb_capi_token configured for tenant in storefront_config.analytics
processed_at  : 2026-05-15 16:16:02.089+00
meta_response : null
age_seconds   : 62
```

**This is the exact behaviour SPEC §D-AUTH-3 predicted** for the demo
tenant (which has no Meta CAPI token configured). The consumer correctly:
1. Picked the row from the queue at the next minute tick (~37s wait).
2. Read `storefront_config.analytics.fb_capi_token` for tenant `demo`.
3. Found no token → set `status='skipped_no_token'` + populated `error_message`.
4. Set `processed_at` so the row is not re-picked next tick.
5. Did NOT retry (retries=0) — correct for terminal "no-token" state.

Full substrate proof: **lead-intake → crm_leads.fb_event_id → enqueue →
cron tick → consumer → token check → terminal status**, exercising every
new artifact this SPEC shipped.

### 3.5 — Cleanup

Single idempotent block from SPEC §3.1 ran against demo only, scoped by
`email LIKE 'fb-capi-test-%@example.com' OR email LIKE 'fb-capi-lh-test-%@example.com'`
and `tenant_id=demo`. Swept all 9 FK-referencing tables before deleting
`crm_leads`. Post-cleanup SELECT returned 0 matching rows. Verified.

---

## §4 — Integrity gate

```
$ npm run verify:integrity
> opticup@1.0.0 verify:integrity
> node scripts/verify-tree-integrity.mjs

All clear — 156 files scanned in 6ms (Iron Rule 31 gate)
EXIT_CODE=0
```

Exit 0 = clean. ✅

---

## §5 — Verdict

| Gate                                                            | Result    |
|-----------------------------------------------------------------|-----------|
| Servers up (ERP :3000, Storefront :4321)                        | ✅ both 200 |
| Smoke PRE (delegated to `M4_BROADCAST_ID_PROPAGATION` @ c8b5279)| ✅ 7/7      |
| Smoke POST (after one retry to clear leftover state)            | ✅ 7/7      |
| CAPI substrate end-to-end (POST → queue → cron → terminal status)| ✅ skipped_no_token (D-AUTH-3 path)|
| Integrity gate (Iron Rule 31)                                   | ✅ exit 0   |

**Verdict: 🟢 GREEN**

The SPEC's runtime behaviour matches every predicted path on demo. Lead-intake
v28 accepts the new optional `fb_event_id` field, persists it on `crm_leads`,
and enqueues a queue row whose `event_id` matches. The pg_cron job
`fb_capi_dispatch_consumer` fires on the `* * * * *` schedule, the
`fb-capi-dispatch` Edge Function processes the row, and tenants with no
Meta token settle to the `skipped_no_token` terminal state with retries=0.
No 5xx, no regressions in the baseline 7/7, no integrity violations.

## Hand-off

GREEN → handing back to Foreman (`opticup-strategic`) for `FOREMAN_REVIEW.md`.
SPEC is ready to close.

---

### Notes for Foreman (post-mortem candidates)

1. **Leftover state from aborted LH-Tester runs is a recurring drag.** The
   first smoke run failed because a previous LH-Tester process stalled
   mid-task with two unfinished demo leads on `+972500000000` still in
   `crm_leads`. A "teardown on signal/exit" hook in
   `tests/smoke/baseline.test.mjs` (or a pre-run sweep on the test phone)
   would have caught this before the assertion. Consider adding a
   pre-test sweep keyed on the hardcoded test phone for the next baseline
   iteration.
2. **`lead-intake` requires `Authorization: Bearer <anon>` even with
   `verify_jwt=false`.** The SPEC's example curl in §3.1 of the dispatch
   prompt omitted this and got a 401. Real callers (storefront via
   `supabase-js`) pass it automatically, so this isn't a defect — but any
   future Tester/Reviewer doing manual EF probes will hit the same wall.
   Worth adding a one-liner to the SPEC's "manual verification" section.
