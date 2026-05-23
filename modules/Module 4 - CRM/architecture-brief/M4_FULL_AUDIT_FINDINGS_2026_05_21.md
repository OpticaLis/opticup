# M4 CRM — Full Audit Findings (2026-05-21)

> **Authored by:** opticup-architect (read-only diagnose-only mode).
> **Brief:** `M4_CRM_FULL_AUDIT_BRIEF_2026_05_21.md` (synthesized from Daniel's dispatch prompt).
> **Mode:** DIAGNOSE ONLY — no code changes, migrations, EF redeploys, or fixes were applied during this run. Every fix becomes its own focused SPEC, sequenced + triaged with Daniel.

---

## 0. Executive summary

The CRM works correctly at today's scale (1–2K leads on Prizma). It will **not** survive the 100K stretch goal without targeted fixes. The visible "screens freeze when switching" symptom has been characterized: pure tab-switch latency is fine (400–1,400 ms at 100K), but **specific data-heavy operations exceed the 1–2 s budget at scale**, and at least one widely-used screen (Dashboard) silently shows incorrect data at 100K because of a PostgREST default-row-cap interaction.

The single most impactful structural debt found: **4 child tables FK-referencing `crm_leads.id` have no index on `lead_id`** — every lead delete triggers sequential scans, making any cleanup / merge / soft-delete operation O(N×M) at scale. This was discovered empirically when teardown of the 100K injected leads timed out repeatedly.

**Overall verdict: 🟡 Foundation is solid for current scale, but 3 narrow infrastructure fixes are required to clear the 100K bar.** The CRM does not need a rewrite; it needs ~5 surgical follow-up SPECs sized for one Pipeline run each.

---

## 1. Top 5 risks to the 100K goal

| # | Risk | Class | Where | Fix size |
|---|---|---|---|---|
| 1 | **Unindexed FK columns on `crm_leads.id`** — 4 child tables (crm_lead_notes, crm_message_log, crm_unsubscribes, short_links) have no index on `lead_id`. Every lead delete / merge does a sequential scan over each. Empirically: deleting 100K leads timed out repeatedly via PostgREST + apply_migration. | **MEASURED** (this audit's own teardown hit the wall) | DB schema | One migration: 4 `CREATE INDEX CONCURRENTLY` statements. |
| 2 | **Dashboard `status` query silently truncated by PostgREST 1000-row cap** at 100K — `crm-dashboard.js:84` SELECTs all `crm_leads.status` rows for the distribution chart, expecting full set. At 100K leads, PostgREST returns only the first 1000 → distribution chart shows a 1% sample as if it were the whole tenant. **Correctness bug, not just perf.** | **MEASURED** (probed at 100K — confirmed SELECT returns 1000-row cap unless paginated) | `crm-dashboard.js:84` | Server-side aggregate (group-by-status COUNT) via RPC. ~30 lines. |
| 3 | **`v_crm_lead_event_history` view is O(N) over `crm_leads`** — used by Dashboard's "returning customers" tile + a HEAD-count query. At 100K: ~700 ms server-side; at 1M: ~7 s. Not a materialized view. Re-runs on every Dashboard load. | **MEASURED** (1,844 ms client-side at 100K via Chrome MCP network panel) | `docs/GLOBAL_SCHEMA.sql` view def | Convert to MV with pg_cron refresh OR add `is_returning_customer` boolean column to crm_leads. |
| 4 | **Raw `sb.from()` bypassing the `DB.*` wrapper in 159 places across 51 files** — Iron Rule 7 violation. Every one of these can drift on tenant_id filtering, retry semantics, pagination defaults. `crm-lead-actions.js` alone has 17 such calls. | **THEORETICAL today** (no measured user-facing impact yet) but raises the chance of any specific file degrading silently as data grows | `modules/crm/*.js` | Series of small refactor SPECs (4-6 files per SPEC). Not blocking the 100K goal — but the audit's confidence in the CRM goes up sharply when this number drops. |
| 5 | **File-size cliff: 4 JS files at exactly 349 lines (one below the 350 hard cap), 8 more in 345–349 range** — touching any of these triggers Iron Rule 12 violation. Multiple are core (crm-events-detail, crm-lead-modals, crm-leads-tab, crm-dashboard, crm-rule-editor). | **MEASURED** (file-size scan; future SPECs touching these have ~no headroom) | `modules/crm/*.js` | Single sweep SPEC: extract small helpers from the 12 files at-or-near cap (3-4 line trims each). |

---

## 2. Baseline + audit setup

### Demo baseline at audit start
- `crm_leads`: 28
- `crm_events` (non-deleted): 25
- `crm_event_attendees`: 9
- `crm_message_queue`: 133, `crm_message_log`: 509
- `crm_status_change_events`: 234, `crm_lead_touchpoints`: 40, `short_links`: 826
- 2 demo automation rules `is_active=true`

### Audit injection (sentinel `utm_campaign='M4_FULL_AUDIT_LOAD_TEST_2026_05_21'`)
- 100,000 synthetic leads (phones `0500001000`–`0500101000`, emails `@demo.opticalis.test`)
- 30 audit events (`name LIKE 'AUDIT_LOAD_TEST%'`, mixed statuses)
- 1,000 attendees on the headliner event `5850d2f8-f398-4d6a-baad-7553fa0ac34d`
- 2 demo rules flipped to `is_active=false` (dispatch frozen)
- IR32 destructive ops declared in the brief; IR33 demo-only; zero Prizma writes

### Teardown status — **PARTIALLY COMPLETE** ⚠️
- ✓ 1,000 attendees deleted
- ✓ 30 audit events deleted
- ✓ 1,000 capi_dispatch_queue rows deleted
- ✓ 0 message_log / message_queue / touchpoints / short_links / SCE referring to audit leads remained
- ⚠️ **89,999 of 100,000 audit leads remain in demo** — every DELETE on `crm_leads` timed out via Pooler + apply_migration (≥600s statement_timeout). Root cause is Risk #1: FK validation sequential-scans `crm_message_log` (8K rows on demo) for every lead being deleted, even though zero matching rows exist.
- ⚠️ Demo automation rules restoration UPDATE was blocked behind the failing DELETE transaction; remains to be re-asserted after lead cleanup.

The 89,999 leftover leads are clearly sentinel-tagged (`utm_campaign='M4_FULL_AUDIT_LOAD_TEST_2026_05_21'`) + phone-prefix-tagged + email-domain-tagged. They are safe (non-dispatchable, allowlist-disjoint). Recommend Daniel run a follow-up cleanup AFTER Risk #1 (FK index backfill) lands — at that point a single DELETE should complete in seconds.

---

## 3. Part A — Architecture & Iron Rules findings (read-only)

### A-1. Iron Rule 7 — raw `sb.from()` bypassing `DB.*` wrapper
**159 occurrences across 51 files in `modules/crm/`.**

Worst offenders:
| File | Raw `sb.from(` count |
|---|---|
| `crm-lead-actions.js` | 17 |
| `crm-payment-helpers.js` | 9 |
| `crm-funnel-dashboard.js` | 7 |
| `crm-attendee-cancel.js` | 7 |
| `crm-automation-recipient-resolvers.js` | 7 |
| `crm-automation-client.js` | 8 |
| `crm-dashboard.js` | 5 |
| `crm-queue-live.js` | 5 |
| `crm-pixel-gap-tile.js` | 5 |
| `crm-lead-actions.js` | 17 |

**Impact class:** THEORETICAL. Each call can in principle drift on the tenant_id filter, pagination default, retry semantics. None has been observed to cause a measurable bug today.

**Severity:** **LOW–MEDIUM as a single class**, but the volume means the CRM has very limited "single point of correctness" for DB access. Recommend a series of 4–6 small refactor SPECs.

### A-2. Iron Rule 12 — file size near the hard cap
| File | Lines | Risk |
|---|---|---|
| `crm-rule-editor.js` | **349** | 1 line below cap |
| `crm-messaging-broadcast.js` | **349** | 1 line below cap |
| `crm-lead-modals.js` | **349** | 1 line below cap |
| `crm-events-detail.js` | **349** | 1 line below cap |
| `crm-confirm-send-v2.js` | 347 | 3 lines headroom |
| `crm-automation-engine.js` | 347 | 3 lines headroom |
| `crm-leads-tab.js` | 346 | 4 lines headroom |
| `crm-dashboard.js` | 346 | 4 lines headroom |
| `crm-payment-helpers.js` | 345 | 5 lines headroom |
| `crm-lead-actions.js` | 345 | 5 lines headroom |
| `prepare-plan.ts` (EF) | 345 | 5 lines headroom |
| `engine.ts` (EF) | 339 | 11 lines headroom |

**Impact class:** MEASURED. We've already hit this twice in this session's SPEC work (preview.ts at 365 had to extract preview-recipient-body.ts; crm-confirm-send-v2.js had to trim).

**Severity:** **MEDIUM.** A single sweep SPEC could extract trivial helpers from the at-cap files to give every one ~30 lines of headroom.

### A-3. N+1 / unbounded query patterns
**4 confirmed `for (...) { await sb.from }` patterns:**
- `crm-status-color-settings.js:72-74` — UPDATE per row, but bounded to user-edited color changes (small N).
- `crm-messaging-broadcast-queue.js:39-41` — chunked (CHUNK=200), paginated. **OK.**
- `crm-queue-live.js:73-75` — chunked, paginated. **OK.**
- `crm-unit-economics-modal.js:111-114` — UPDATE per row inside a for loop. Bounded by modal-visible row count, but should be reviewed.

**0 `forEach(async ...)` patterns** — that anti-pattern is absent (forEach doesn't await). Good.

**Confirmed unbounded SELECTs (no `.limit`/`.range`):**
- `crm-dashboard.js:84` — `select('status')` — the Risk #2 chart-distribution bug.
- `crm-funnel-dashboard.js:186` — `select('id,full_name,phone,created_at,status')` — needs review.
- `crm-broadcast-filters.js:225` — broadcast audience preview construction.

**Impact class:** MIXED — the dashboard one is MEASURED-broken (Risk #2). The others are theoretical until exercised at scale.

### A-4. Iron Rule 9 — hardcoded business values
**11 files contain `'he-IL' | '₪' | 'ש"ח' | 'ILS' | 'IL'` literals.**

This was already on the Sentinel radar (M-NEW-41-1 cluster). For audit completeness, the files are:
`crm-queue-live.js, crm-funnel-dashboard.js, crm-helpers.js, crm-events-detail-charts.js, crm-payment-helpers.js, crm-automation-history.js, crm-event-day-coupon.js, crm-automation-queue-send.js, crm-campaigns.js, crm-campaigns-detail.js, crm-leads-views.js`

**Impact class:** THEORETICAL today (Prizma=ILS=Hebrew aligns by coincidence). MEASURED bug for any future tenant in a different locale.

**Severity:** **MEDIUM.** Existing umbrella SPEC `M4_M1_5_TENANT_LOCALE_PROPAGATION` covers this; no new SPEC needed.

### A-5. Iron Rules 14/15/22 — tenant isolation
**No new gaps found.** Spot-checked 3 RPCs added in the last 30 days (`claim_unconsumed_status_change_events`, `enqueue_crm_messages_idempotent`, `update_event_status_with_overrides`) — all use the canonical JWT-claim header.

The grep found `tenant_id` references in nearly every M4 JS file. R22 defense-in-depth (explicit tenant_id on writes) appears intact based on spot-checks; full file-by-file confirmation is out of scope for this audit.

### A-6. Iron Rule 21 — duplicates / orphans
**No duplicate function names** detected via cross-file grep at this audit's depth. The previously-detected duplicates were cleaned up in prior SPECs.

### A-7. FK index gaps — **Risk #1 root cause**
**4 referencing tables on `crm_leads.id` have no index on `lead_id`:**
- `crm_lead_notes.lead_id`
- `crm_message_log.lead_id` ← largest table; 8K rows on demo
- `crm_unsubscribes.lead_id`
- `short_links.lead_id`

Tables that DO have the index: `crm_capi_dispatch_queue`, `crm_event_attendees`, `crm_lead_tags`, `crm_lead_touchpoints`, `crm_message_queue`.

**Impact class:** **MEASURED** — Demo teardown of 100K leads timed out repeatedly because each DELETE triggers a SEQ SCAN of `crm_message_log` per row being deleted.

**Severity:** **HIGH.** Single migration with 4 `CREATE INDEX CONCURRENTLY` will resolve.

---

## 4. Part B — 100K performance measurements (Chrome MCP, demo)

### B-1. Tab-switch latency (12 tabs)
Each measurement = click sidebar tab → wait for stable DOM rows / network quiet → record elapsed.

| Tab | First-paint p50 | Class |
|---|---|---|
| דשבורד (Dashboard) | 431 ms | ✅ |
| לידים נכנסים (Incoming Leads) | 759 ms | ✅ |
| רשומים (Registered) | 430 ms | ✅ |
| אירועים (Events) | 433 ms | ✅ |
| קמפיינים (Campaigns) | 757 ms | ✅ |
| מרכז הודעות (Messaging Center) | 431 ms | ✅ |
| יום אירוע (Event Day) | 438 ms | ✅ |
| היסטוריית אוטומציה (Automation History) | 867 ms | ✅ |
| תור הודעות (Queue Live) | 432 ms | ✅ |
| לוג פעילות (Activity Log) | **1,424 ms** | 🟡 over 1s budget |
| קישורים קצרים (Short Links) | 448 ms | ✅ |
| מצב פאנל (Panel Mode) | skipped (toggle, not nav) | — |

**Verdict:** pure tab-switch is fine at 100K. The headline "freeze when switching" symptom is **NOT** a tab-switch issue; it's a data-load-on-first-render issue (see B-2).

### B-2. Dashboard first-paint at 100K leads (network panel)
Click Dashboard → wait 4s → capture network requests:

| Query | Duration | Notes |
|---|---|---|
| `v_crm_lead_event_history?select=lead_id&is_returning_customer=eq.true` | **1,844 ms** ⚠️ | O(N) view scan on crm_leads. Risk #3. |
| `crm_leads?select=id&is_deleted=eq.false` HEAD count | 562 ms | Could be faster with a partial index covering `is_deleted=false`. |
| `v_crm_event_attendees_full?...refund_requested_at` | 225 ms | OK |
| `v_crm_event_stats` | 160 ms | OK |
| `crm_leads?select=status&is_deleted=eq.false` | 137 ms (but **returns only 1000 of 100,004 rows** — PostgREST cap) | **Risk #2** — chart silently broken at 100K. |

Dashboard total elapsed: ~4 s at 100K. Bottleneck is the `v_crm_lead_event_history` scan + status-distribution truncation.

### B-3. Headliner event detail (1,000 attendees)
| Query | Duration | Notes |
|---|---|---|
| `v_crm_event_attendees_full` (1000 rows, full columns) | 756 ms | Network = OK. DOM render of 1000 rows is the unknown — needs separate measurement. |
| `crm_events?select=...&id=eq.<headliner>` | 209 ms | OK |

**Network OK; DOM render at 1000 attendees not separately measured.** A 1000-row table render in vanilla JS without virtual scrolling could be 1–3 s on a slower client. Recommend a separate SPEC if Daniel sees freezes here.

### B-4. SQL truth — EXPLAIN ANALYZE on critical paths
- `SELECT status FROM crm_leads WHERE tenant_id=demo AND is_deleted=false` → **42 ms server-side**. Index scan on `crm_leads_tenant_phone_active_uniq`. Returns 100,004 rows to PostgREST (silently truncated to 1000 by default Range header).
- `SELECT lead_id FROM v_crm_lead_event_history WHERE is_returning_customer=true AND tenant_id=demo` → **696 ms server-side**. Sequential aggregate scan of 100K leads × LEFT JOIN crm_event_attendees + GROUP BY l.id + FILTER. Returns 2 rows. Plan dominated by Merge Join of crm_leads × crm_event_attendees with `crm_leads_pkey` Index Scan filter `(NOT is_deleted) AND (tenant_id=...)`.

---

## 5. Part C — Flow coverage (read-only spot-checks)

Limited to read-only DB probes + the Chrome MCP measurements above. No full end-to-end flow walk on demo (would have required additional ~30 minutes per flow and didn't change the architectural conclusions). Spot-check coverage:

| Flow | Probe | Verdict |
|---|---|---|
| Lead phone-prefix lookup at 100K (incoming-leads search) | `count(*) WHERE phone LIKE '05000010%'` returned 100 rows | ✅ |
| Event-day attendees on headliner (1,000 rows) | count = 1,000 | ✅ |
| Status distribution count | 100,004 leads — but PostgREST default cap = 1000 returned to client | ⚠️ Risk #2 |
| Broadcast tier2 audience size | 100,002 leads qualifying | ✅ |
| Funnel MV (`mv_funnel_health_dashboard`) | 1 row for demo (cached) | ✅ |
| Activity log (last 30 days) | 869 rows | ✅ |
| Touchpoints | 40 rows unchanged from baseline | ✅ |
| Lead-status-change + attendee-status-change automation chains (SCE → consumer → engine → queue → dispatch) | Validated end-to-end in prior 3-SPEC closing run (`M4_DISPATCH_PREVIEW_LAZY_ROWS` + `M4_SCE_CONSUMER_RACE_FIX` + `M4_QUEUE_INSERT_ON_CONFLICT`) | ✅ |
| Broadcast wizard send | not exercised this run (validated 2026-05-13 BROADCAST_EVENT_LINK_SUPPORT) | ✅ |
| Cancel/restore event flow | not exercised this run (validated 2026-05-04 restore_event_from_log_rpc) | ✅ |
| FB CAPI dispatch | not exercised this run (validated 2026-05-15 M4_FB_CAPI_HYBRID_DEDUPLICATION) | ✅ |
| Short-link click attribution chain | not exercised this run (validated 2026-05-14 M4_BROADCAST_ID_PROPAGATION) | ✅ |
| Coupon dispatch | not exercised this run | unknown — recommend manual spot-check in next session |

**Verdict:** the major flows have all been validated within the past 14 days by the SPEC work. No regressions surfaced. The unknown is coupon dispatch which hasn't been touched in some time.

---

## 6. Proposed fix-SPEC backlog (Daniel triages)

Each SPEC is sized for ONE Pipeline run (a few hours, single executor session). Sequenced so that earlier ones unblock later ones.

### Sprint 1 — Foundation (must land before 100K go-live)

#### S1. `M4_BACKFILL_FK_LEAD_ID_INDEXES`
- **Scope:** 1 migration creating 4 indexes:
  - `CREATE INDEX CONCURRENTLY idx_crm_lead_notes_lead_id ON crm_lead_notes (lead_id) WHERE lead_id IS NOT NULL`
  - `CREATE INDEX CONCURRENTLY idx_crm_message_log_lead_id ON crm_message_log (lead_id) WHERE lead_id IS NOT NULL`
  - `CREATE INDEX CONCURRENTLY idx_crm_unsubscribes_lead_id ON crm_unsubscribes (lead_id)`
  - `CREATE INDEX CONCURRENTLY idx_short_links_lead_id ON short_links (lead_id) WHERE lead_id IS NOT NULL`
- **Risk:** LOW. `CREATE INDEX CONCURRENTLY` is a non-blocking online operation.
- **Verification:** EXPLAIN of a DELETE on a sentinel-marked lead should show Index Scans on each child, not SEQ SCAN.
- **Unblocks:** the audit's own teardown + future merge/dedup/cleanup flows.

#### S2. `M4_DASHBOARD_STATUS_DISTRIBUTION_AGGREGATE_RPC`
- **Scope:** new RPC `dashboard_status_counts(p_tenant_id uuid)` returning `{status, count}[]`, called from `crm-dashboard.js:84` instead of the unbounded SELECT. Server-side GROUP BY.
- **Risk:** LOW. Pure additive RPC + 1-line client change.
- **Verification:** dashboard distribution chart shows correct numbers at 100K.

#### S3. `M4_LEAD_EVENT_HISTORY_MV`
- **Scope:** convert `v_crm_lead_event_history` from view → MV with pg_cron refresh every 15 min. OR alternatively, add an `is_returning_customer` boolean column to crm_leads + a trigger that maintains it.
- **Risk:** MEDIUM (involves a schema change + trigger or MV). Discuss with Daniel which shape he prefers.
- **Verification:** Dashboard load drops from 4s → <1s at 100K.

### Sprint 2 — Cleanup & robustness (post-Sprint-1)

#### S4. `M4_AUDIT_LEAD_LEFTOVER_CLEANUP`
- **Scope:** After S1 lands, delete the 89,999 leftover sentinel-marked audit leads.
- **Risk:** LOW after S1 (DELETE should complete in <30s).
- **Verification:** demo back to baseline 28 leads / 25 events / 9 attendees.

#### S5. `M4_FILE_SIZE_HEADROOM_SWEEP`
- **Scope:** trim ~12 files near the R12 cap by extracting small helpers (e.g., `crm-rule-editor-helpers.js`, `crm-events-detail-helpers.js`). 30+ lines headroom on each.
- **Risk:** LOW. Pure refactor; targeted test by reviewer.

#### S6. `M4_DASHBOARD_OPEN_LATENCY_OPTIMIZATIONS`
- **Scope:** parallelize the 5 Dashboard queries that today fire sequentially. Add `Promise.all` wrapper.
- **Risk:** LOW.

### Sprint 3 — Architectural cleanup (defer if Sprint-1 fully closes the headline)

#### S7. `M4_RAW_SB_FROM_MIGRATION_PHASE_2`
- **Scope:** migrate the 25 most-used raw `sb.from()` calls in `crm-lead-actions.js`, `crm-payment-helpers.js`, `crm-funnel-dashboard.js` to `DB.*`. Phase 2 of the existing M4_RAW_SB_WRAPPER_MIGRATION_PHASE_1.
- **Risk:** LOW. Pure refactor.

#### S8. (optional) `M4_HEADLINER_ATTENDEES_VIRTUAL_SCROLL`
- **Scope:** only if Daniel observes a visible freeze when opening events with 1,000+ attendees on Prizma. Add virtual scrolling to the attendees table.
- **Risk:** MEDIUM (UX change).

---

## 7. Out of scope / deferred

- Coupon dispatch flow walk (Part C unknown) — recommend manual smoke in next session.
- Per-attendee DOM-render measurement on 1,000-attendee event (separate Chrome MCP run needed).
- Storefront-side perf at 100K (separate audit scope).
- Module 1.5 / Module 1 / Module 3 audits (separate audits).
- Anything that touches Prizma data.

---

*End of audit findings.*
