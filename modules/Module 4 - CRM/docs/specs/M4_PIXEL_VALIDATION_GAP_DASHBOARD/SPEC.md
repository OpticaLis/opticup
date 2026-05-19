# SPEC — M4_PIXEL_VALIDATION_GAP_DASHBOARD

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_PIXEL_VALIDATION_GAP_DASHBOARD/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, M4)
> **Authored on:** 2026-05-19
> **Module:** 4 — CRM
> **Phase:** FUNNEL_ROADMAP Phase 2 P2.2 (dashboard consumer of the P2.1 substrate + M3_FUNNEL_PIXEL_BACKWIRE back-wire)
> **Author signature:** Claude Code single-chat Full-Auto Pipeline (Opus author → Sonnet executor → default reviewer → default LH-Tester → Opus closure)
> **Brief origin:** `modules/Module 4 - CRM/architecture-brief/M4_PIXEL_VALIDATION_GAP_DASHBOARD_BRIEF.md` (sealed 2026-05-19)
> **Risk class:** LOW. Zero schema changes (one OPTIONAL gated index). Zero triggers. Zero EF code. Zero writes. Pure SELECT + frontend tile.

---

## 0. Pre-Authoring Reality Check

Required before drafting any later section. Confirms the SPEC is grounded in actual repo + DB state, not Brief assumptions.

- ✅ Brief read in full on 2026-05-19, including §4 Cross-Module Safety Audit (binding).
- ✅ `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md` read — Iron Rule 35 boundary confirmed: this SPEC adds ZERO placeholders, ZERO action_types, ZERO trigger types.
- ✅ `M4_FB_CAPI_HYBRID_DEDUPLICATION/SPEC.md` skimmed for schema reference (P2.1 substrate). `docs/FB_CAPI.md` read in full — canonical reference for `fb_event_id`, `fb_pixel_fired_at`, `crm_capi_dispatch_queue`.
- ✅ Parent file identified: `modules/crm/crm-messaging-performance.js` (186 lines, exports `window.renderMessagingPerformance(host)` — registered in `crm-messaging-tab.js` as the `performance` sub-tab "📊 ביצועי הודעות" of the Messaging Hub). Only ONE viable parent — no escalation needed per Brief §8 ("more than 2 placement candidates → STOP").
- ✅ Modal utility verified: `shared/js/modal-builder.js` exposes `Modal.show({title, content, size, closeOnEscape, closeOnBackdrop, onClose})` returning `{el, close}`. RTL-friendly (Hebrew aria labels already in place).
- ✅ Cross-Reference Check (Rule 21) completed 2026-05-19 — see §0.4 below.
- ✅ Runtime semantics rehearsed — see §0.5 below.
- ✅ Knowledge-map availability check: the file `roles/site-overseer/knowledge-build/funnel-q3/M4_PIXEL_VALIDATION_GAP_QUERY.md` cited in the Brief and the Activation Prompt **does not exist on disk**. It was a planned deliverable in `OVERNIGHT_KNOWLEDGE_BUILD_2026_05_15` Mission 4 that never landed. Brief §1 + §3 + §4.1 + §7 provide complete semantic definition; SPEC §3.5 below specifies the 3 queries verbatim, derived from those Brief sections + FB_CAPI.md schema. Documented as FINDING-AT-AUTHOR F-A1 (informational).

### 0.4 Cross-Reference Check (Iron Rule 21 — done at author time)

| New name | Search target | Hits | Resolution |
|---|---|---|---|
| `modules/crm/crm-pixel-gap-tile.js` (new file) | `docs/FILE_STRUCTURE.md`, `modules/crm/` listing | 0 | Genuinely new — proceed |
| `window.renderPixelGapTile` (new global) | `grep -rn "renderPixelGap" --include="*.js"` | 0 | Genuinely new |
| `window.openPixelGapDrillDownModal` (new global, internal-only — not added to window if not needed) | `grep -rn "PixelGapDrillDown" --include="*.js"` | 0 | Genuinely new |
| `idx_crm_leads_capi_gap_partial` (gated index — only if §3 D4 fires) | `docs/GLOBAL_SCHEMA.sql`, `pg_indexes WHERE indexname LIKE '%capi_gap%'` | 0 | Genuinely new |
| 3 SELECT queries on `crm_leads` + `crm_capi_dispatch_queue` | `grep -rn "fb_event_id" --include="*.js"` | 0 (in ERP JS — no current consumer of these columns) | Net-new consumer |
| Hebrew label set ("פער פיקסל", "נשלחו לפייסבוק") | `grep -rn "פער פיקסל" --include="*.js"` | 0 | Genuinely new |

Cross-Reference Check completed 2026-05-19 against GLOBAL_SCHEMA + GLOBAL_MAP + FILE_STRUCTURE: **0 collisions / 6 hits resolved.**

### 0.5 Runtime Semantics Rehearsal (per skill §1.5 Step 5.3)

This SPEC is JS-only (no new RPCs, no RLS changes, no view changes, no GRANT changes). The runtime semantics relevant here are:

- **Caller context.** Tile renders inside the ERP CRM tab — caller is `authenticated` role with the operator's JWT (tenant_id claim populated by `pin-auth` EF). RLS on `crm_leads` + `crm_capi_dispatch_queue` is canonical 2-policy (`tenant_isolation` for `public`/`authenticated`); JWT-claim USING clause already filters to operator's tenant. No anon / service_role considerations.
- **Defense-in-depth (Iron Rule 22).** All 3 `.select()` calls add `.eq('tenant_id', getTenantId())` even though RLS would already filter. Belt + suspenders.
- **0-state.** Demo tenant currently has 0 leads with `fb_event_id IS NOT NULL` (D-AUTH-3 from `M4_FB_CAPI_HYBRID_DEDUPLICATION` — demo has no token, no `fb_event_id` written by lead-intake on fresh demo submissions because the storefront generates the UUID only on the live `/supersale/` flow; demo's lead-intake path can write it if a manual test passes one). Tile MUST render gracefully ("אין נתונים עדיין" placeholder) when the aggregate query returns `{ total_with_event_id: 0, gap_count: 0, pixel_fired_count: 0 }`.
- **Empty drill-down.** When `gap_count = 0` the drill-down modal opens with an empty-state message in Hebrew, NOT an error. Acceptance criterion 8.
- **Performance.** Current row counts: Prizma `crm_leads` ≈ ~thousands of leads, of which `fb_event_id IS NOT NULL` ≈ leads created after 2026-05-15 (P2.1 ship date) ≈ small-double-digit count today. Sequential scan filtered by `tenant_id` is sub-100ms on this volume. The gated index in §3 D4 is a forward-looking SaaS safeguard.

### Lessons Applied from Prior 3 FOREMAN_REVIEWs (M4)

| From SPEC | Lesson | How honored in this SPEC |
|---|---|---|
| `M4_FB_CAPI_HYBRID_DEDUPLICATION` Author Proposal #1 (pg_cron SQL pattern probe) | Pre-author probe of existing patterns when SPEC adds pg_cron jobs | N/A — this SPEC adds zero pg_cron jobs |
| `M4_FB_CAPI_HYBRID_DEDUPLICATION` Author Proposal #2 (CLI command pre-verification in ROLLBACK) | If ROLLBACK prescribes CLI commands, pre-verify they exist | §9 Rollback uses ONLY `git revert <commit>` + (optional) `DROP INDEX IF EXISTS` SQL — no exotic CLI commands. Safe. |
| `M4_DUAL_PATH_CLEAN_FIX_2026_05_19` (Iron Rule 34 introduction) | UI-touching SPECs require live Chrome MCP verification at closure | §3 success criteria 13 + §6 Pipeline §4 explicitly require Chrome MCP screenshot + `window.__pixelGapTrace` runtime trace + DB-query evidence. |
| `M4_DUAL_PATH_CLEAN_FIX_2026_05_19` (Iron Rule 35 introduction) | Campaign Overseer authority boundary — no new placeholders/action_types/trigger types | This SPEC adds ZERO of these. Read-only consumer of existing schema. |
| `M4_AUTO_PROMOTE_GOVERNANCE` Executor Proposal — verify-only-staged before commit | `git diff --cached --name-only` discipline before every `git commit` | §4 Autonomy Envelope codifies this — Executor MUST run the check before every commit. |
| `M4_MODAL_DEFAULT_ALL_CHECKED` — explicit empty-state semantics for modals | Modal must handle 0-row case with explicit Hebrew message, not an error | §3 criterion 8 + §3.5 Q3 drill-down explicit 0-row handler |

### Live DB Baselines (referenced by §3 Success Criteria as `BASE_*`)

| Symbol | Source | Value (captured 2026-05-19) |
|---|---|---|
| `BASE_PIXEL_GAP_TILE_GLOBAL` | `grep -rn "renderPixelGap" --include="*.js"` | 0 (Rule 21 clean) |
| `BASE_CRM_PIXEL_GAP_FILE` | `ls modules/crm/crm-pixel-gap-tile.js` | does-not-exist (Rule 21 clean) |
| `BASE_PERFORMANCE_PARENT_LINES` | `wc -l modules/crm/crm-messaging-performance.js` | 186 (executor must keep ≤ 350 absolute, target ≤ 300 per Iron Rule 12; small additions only) |
| `BASE_MESSAGING_TAB_PARENT_LINES` | `wc -l modules/crm/crm-messaging-tab.js` | 103 (NOT modified — tab registration stays unchanged per Brief Placement Hint) |
| `BASE_FB_CAPI_DOC_LINES` | `wc -l docs/FB_CAPI.md` | 278 (Executor appends ~5-10 lines under §"Dashboard Surface" — keeps doc under 350) |
| `BASE_INDEX_CAPI_GAP_PARTIAL` | `SELECT count(*) FROM pg_indexes WHERE indexname='idx_crm_leads_capi_gap_partial'` | 0 (does not exist — gated by §3 D4) |
| `BASE_DEMO_LEADS_FB_EVENT_ID_NOTNULL` | `SELECT count(*) FROM crm_leads WHERE tenant_id=demo AND fb_event_id IS NOT NULL` | Executor captures at Step 1.5 pre-flight. Expected: small (0-10) for demo. |
| `BASE_PRIZMA_LEADS_FB_EVENT_ID_NOTNULL` | `SELECT count(*) FROM crm_leads WHERE tenant_id=prizma AND fb_event_id IS NOT NULL` | Executor captures at Step 1.5 pre-flight. Expected: small-to-medium double-digit count (leads created since 2026-05-15). |

### D-AUTH (Foreman decisions pre-committed at author time)

- **D-AUTH-1 (embed approach).** Tile appears as a SECTION ABOVE the existing performance table inside the existing `performance` sub-tab of Messaging Hub. NOT a new sub-tab. NOT a new page. The Executor extends `renderMessagingPerformance(host)` to insert a `<div id="pixel-gap-tile-wrap">` BEFORE the existing `<div id="msg-perf-wrap">`, then calls `window.renderPixelGapTile(host_or_subhost)` to populate. Brief §3 + Placement Hint confirm this is the canonical embed.

- **D-AUTH-2 (drill-down via Modal.show).** Drill-down uses `shared/js/modal-builder.js` `Modal.show({title, content, size: 'lg', closeOnEscape: true, closeOnBackdrop: true})`. Content = a `<table>` with the drill-down rows. Reuses existing modal classes. NO new modal CSS.

- **D-AUTH-3 (file budget).** New file `modules/crm/crm-pixel-gap-tile.js` MUST be ≤ 100 lines per Brief §3 and Iron Rule 12. Parent file `crm-messaging-performance.js` grows from 186 → ≤ 230 lines (a single ~30-line insert: aggregate-tile wrap div + sparkline placeholder + call to `window.renderPixelGapTile`). FB_CAPI.md grows from 278 → ≤ 295.

- **D-AUTH-4 (query window).** The aggregate query bounds leads to `created_at >= NOW() - INTERVAL '30 days'` AND `created_at < NOW() - INTERVAL '1 hour'`. Rationale: (a) the older history is irrelevant for "today's pixel chain health"; (b) very fresh leads (last 1 hour) may not have had time for the storefront thank-you POST to land in `pixel-fired` EF, so excluding them removes false positives. The 7-day trend uses the same `created_at >= NOW() - INTERVAL '7 days'` + same `< NOW() - INTERVAL '1 hour'` exclusion. Drill-down respects the same 30-day cap to bound to 100 rows max.

- **D-AUTH-5 (gated index decision).** §3 D4 success criterion (performance) determines whether the partial index ships in C1.5 (pre-tile commit) or defers to a follow-up SPEC. **Gating rule:** during Step 1.5 pre-flight on demo, Executor runs each of the 3 queries 3 times via `EXPLAIN (ANALYZE, BUFFERS)` in MCP `execute_sql`. Median Execution Time captured. If any query's median > 100ms → ship the index in C1.5 (a separate migration commit, demo-first per Iron Rule 33 — but this is a public table not in the M4 config-table list, so promotion to Prizma is direct). If all three < 100ms → defer; document in FINDINGS as "index unnecessary at current row counts; revisit at first multi-tenant scale milestone."

- **D-AUTH-6 (Iron Rule 32 declared destructive op count).** §Destructive Operations declares `None.` All work additive: 1 new JS file, 1 modified JS file, 1 modified doc, optionally 1 new index. No file deletes, no DROP TABLE, no ALTER...DROP, no migrations beyond the optional CREATE INDEX. The Iron-Rule-32 hook will pass at every commit boundary. If the Executor encounters a need for any destructive op → STOP per Brief §8.

- **D-AUTH-7 (Iron Rule 34 — Chrome MCP closure evidence).** This SPEC modifies a `.js` file consumed by a browser → live Chrome MCP verification at closure is MANDATORY (per Iron Rule 34). Localhost-Tester at §6 must:
  (a) screenshot the tile rendered on demo + on Prizma (2 screenshots);
  (b) capture `window.__pixelGapTrace` runtime trace showing the 3 queries fired in order with their result row counts;
  (c) screenshot the drill-down modal opened in its empty-state + (if rows exist on Prizma) a populated state.
  All 3 artifacts pasted into TEST_REPORT.md. Without all three, the SPEC is NOT closed.

- **D-AUTH-8 (Iron Rule 35 — no Campaign Overseer surface touched).** This SPEC adds ZERO `%var_name%` placeholders, ZERO new `action_type` values, ZERO new `trigger_type` slugs, ZERO entries in `crm_trigger_type_registry`. It reads `crm_leads` + `crm_capi_dispatch_queue` only. Tier-1 confirmation per Brief §4.9.

- **D-AUTH-9 (FB_CAPI.md doc update).** Executor appends a new `## 12. Dashboard Surface` section at end of `docs/FB_CAPI.md` (~10-15 lines). Mentions: the tile location, the 3 query semantics, the drill-down modal, the gated index status (shipped / deferred). Updates §11 Future Work table row for `M4_PIXEL_VALIDATION_GAP_DASHBOARD` from "UNBLOCKED — substrate live as of 2026-05-16" to "✅ CLOSED 2026-05-19".

### Findings at SPEC Author Time (FINDINGS-AT-AUTHOR)

| # | Finding | Severity | Disposition |
|---|---|---|---|
| F-A1 | `roles/site-overseer/knowledge-build/funnel-q3/M4_PIXEL_VALIDATION_GAP_QUERY.md` (cited in Brief §12 + Activation Prompt) does not exist on disk. Was a planned deliverable in `OVERNIGHT_KNOWLEDGE_BUILD_2026_05_15` Mission 4. | INFO | This SPEC §3.5 supplies the 3 queries verbatim, derived directly from Brief §1 (3-state model) + Brief §3 + Brief §4.1 + FB_CAPI.md schema. Executor implements §3.5 queries; the missing knowledge-map file is unrelated work — will be tracked in FINDINGS.md at SPEC close if still missing then. |

---

## 1. Goal

Ship a read-only ERP dashboard tile + drill-down modal inside the existing CRM Messaging Hub "📊 ביצועי הודעות" sub-tab that surfaces the count of leads where `fb_event_id IS NOT NULL` AND `fb_pixel_fired_at IS NULL` — i.e., CAPI dispatched but the browser Pixel never fired. Closes FUNNEL Phase 2 P2.2 (P2.1 ERP substrate landed 2026-05-15; M3_FUNNEL_PIXEL_BACKWIRE landed 2026-05-19; this is the visible read of those two columns).

---

## 2. Background & Motivation

P2.1 (`M4_FB_CAPI_HYBRID_DEDUPLICATION`, 2026-05-15) added the ERP substrate: `crm_leads.fb_event_id`, `crm_leads.fb_pixel_fired_at`, `crm_capi_dispatch_queue` table, `fb-capi-dispatch` EF, `fb_capi_dispatch_consumer` pg_cron job, `lead-intake` v26 accepting `fb_event_id` from the storefront. M3_FUNNEL_PIXEL_BACKWIRE (2026-05-19) shipped the `pixel-fired` EF and the storefront thank-you-page POST that stamps `fb_pixel_fired_at = NOW()` when the browser Pixel actually fires.

The measurement loop is now closed structurally — but the data has no visible consumer in the ERP. Daniel cannot see the pixel-fire gap without running ad-hoc SQL. This SPEC ships the smallest customer-visible deliverable: a single tile + drill-down so the next time the pixel chain breaks (ad-blocker prevalence rises, storefront thank-you page changes URL pattern, redirect chain breaks), the number on the dashboard signals it before customers notice.

After this lands, FUNNEL Phase 2 is complete (P2.1 substrate + P2.3 unified template validation already shipped; P2.2 dashboard ships here).

---

## 3. Success Criteria (Measurable)

Every criterion has an exact expected value + a verify command.

| # | Criterion | Expected value | Verify command |
|---|-----------|----------------|----------------|
| 1 | Branch state | On `develop`, working tree clean at SPEC close | `git status --short` → empty |
| 2 | Commits produced | 3 commits in this SPEC's range: C1 (SPEC.md seal) + C2 (tile file + parent embed + docs) + C3 (retrospective trio) — ±1 acceptable for Pipeline-mode consolidation. If §3 D4 fires (index ships) → 4 commits with C1.5 (migration) between C1 and C2. | `git log {SPEC_SEAL_COMMIT}..HEAD --oneline \| wc -l` → 2–4 |
| 3a | New file `modules/crm/crm-pixel-gap-tile.js` exists | exists | `test -f modules/crm/crm-pixel-gap-tile.js && echo OK` |
| 3b | New file line count (Iron Rule 12) | ≤ 100 lines | `wc -l modules/crm/crm-pixel-gap-tile.js` → ≤ 100 |
| 3c | Tile file exposes `window.renderPixelGapTile(host)` | exists | `grep -n "window.renderPixelGapTile" modules/crm/crm-pixel-gap-tile.js` → 1 |
| 4a | Parent file `modules/crm/crm-messaging-performance.js` modified | yes — call to `renderPixelGapTile` added near top of `renderMessagingPerformance` | `grep -n "renderPixelGapTile\\|pixel-gap-tile-wrap" modules/crm/crm-messaging-performance.js` → ≥ 1 hits |
| 4b | Parent file line count after edit (Iron Rule 12) | ≤ 230 lines (was 186; allows ~44-line insert; target absolute ≤ 350 / target ≤ 300) | `wc -l modules/crm/crm-messaging-performance.js` → ≤ 230 |
| 4c | Script tag for new file in `crm.html` | line added between existing `crm-messaging-log.js` (line ~410) and `crm-messaging-performance.js` (line ~411) OR added immediately after the latter | `grep -n "crm-pixel-gap-tile.js" crm.html` → 1 |
| 4d | `crm-messaging-tab.js` UNTOUCHED (per D-AUTH-1 — no new sub-tab) | identical to pre-SPEC content | `git diff HEAD~3 -- modules/crm/crm-messaging-tab.js` → empty |
| 5 | 3 queries implemented per §3.5 verbatim semantics | all 3 functions exist in `crm-pixel-gap-tile.js` | `grep -cE "loadGapAggregate\|loadGapTrend\|loadGapDrillDown" modules/crm/crm-pixel-gap-tile.js` → 3 |
| 6a | Tile renders gracefully on 0-state (demo, when `fb_event_id IS NOT NULL` count = 0) | Hebrew placeholder "אין נתונים עדיין — לא נשלחו עדיין אירועי CAPI לפייסבוק" (or equivalent) shown; no console error | Chrome MCP: navigate to demo CRM Messaging Hub → "📊 ביצועי הודעות" sub-tab; screenshot shows placeholder; `console.errors` empty |
| 6b | Tile renders aggregate on populated state (Prizma OR demo after manual test insert) | numeric values shown: `total_with_event_id`, `gap_count`, `pixel_fired_count`; Hebrew labels per §3.5 | Chrome MCP: Prizma session OR demo after Foreman inserts 1 test lead with `fb_event_id` populated; screenshot shows 3 numbers |
| 6c | 7-day trend renders as sparkline OR ordered list (executor's choice, must be ≤ 100 lines total) | up to 7 day rows, oldest → newest | Chrome MCP screenshot |
| 7 | Drill-down button opens Modal.show with title "פערי פיקסל — לידים מושפעים" | Modal opens; closes via Escape + backdrop click + ✕ button | Chrome MCP: click "צפה ברשימת הלידים המושפעים" button → modal opens; ESC → modal closes; click backdrop → modal closes |
| 8 | Drill-down 0-row state | Hebrew placeholder "אין לידים בפער כעת" inside modal body; no error | Chrome MCP on demo |
| 9 | Drill-down populated state (if any rows exist on Prizma) | ≤ 100 rows, columns: שם, טלפון, תאריך יצירה, סטטוס CAPI, סיבת חוסר אישור (אם ידוע) | Chrome MCP on Prizma |
| 10 | `docs/FB_CAPI.md` appended with §12 Dashboard Surface section | new section, ≤ 15 lines, references the tile + drill-down + index status | `grep -n "## 12. Dashboard Surface" docs/FB_CAPI.md` → 1 |
| 11 | `docs/FB_CAPI.md` §11 Future Work row for `M4_PIXEL_VALIDATION_GAP_DASHBOARD` flipped from "UNBLOCKED" to "✅ CLOSED 2026-05-19" | yes | `grep -A1 "M4_PIXEL_VALIDATION_GAP_DASHBOARD" docs/FB_CAPI.md` → row contains "CLOSED" |
| 12 | `docs/FB_CAPI.md` line count after edits | ≤ 295 lines | `wc -l docs/FB_CAPI.md` |
| 13a | Iron Rule 34 — Chrome MCP screenshots in TEST_REPORT.md | ≥ 2 screenshots (tile + modal) | Localhost-Tester pastes paths to PNG artifacts in TEST_REPORT.md |
| 13b | Iron Rule 34 — `window.__pixelGapTrace` runtime trace in TEST_REPORT.md | trace object with 3 entries: `aggregate`, `trend`, `drilldown`; each has `start_ms`, `end_ms`, `row_count` | Localhost-Tester pastes `JSON.stringify(window.__pixelGapTrace)` output in TEST_REPORT.md |
| 13c | Iron Rule 34 — DB-query evidence in TEST_REPORT.md | for each of the 3 queries, an MCP `execute_sql` block with the EXACT SQL the tile fires + the result | Localhost-Tester pastes 3 SQL+result blocks in TEST_REPORT.md |
| 14 | Iron Rule 31 integrity gate passes at every commit | `npm run verify:integrity` exit 0 (or exit 2 warn-only) at each commit boundary | Executor records each gate result in EXECUTION_REPORT |
| 15 | Iron Rule 32 — Destructive Ops gate passes | declared `None.`; no destructive op fires | pre-commit hook |
| 16 | Cross-Module Safety Audit §4 (Brief) holds — Reviewer verifies | no item in Brief §4.2, §4.4, §4.6 touched | Reviewer reads `git diff` against Brief §4 enumeration |
| 17a | Query D4 — p95 < 100ms for aggregate query on demo | median < 100ms | `EXPLAIN (ANALYZE, BUFFERS)` × 3 in MCP, captured at Step 1.5 |
| 17b | Query D4 — p95 < 100ms for 7-day trend query on demo | median < 100ms | same |
| 17c | Query D4 — p95 < 100ms for drill-down query on demo | median < 100ms | same |
| 18 | If any of 17a/17b/17c > 100ms → partial index `idx_crm_leads_capi_gap_partial` shipped in C1.5; if all < 100ms → no index, defer to follow-up | gated decision, documented in EXECUTION_REPORT §3 D-AUTH-5 path taken | `SELECT count(*) FROM pg_indexes WHERE indexname='idx_crm_leads_capi_gap_partial'` → 0 OR 1 (matches recorded decision) |
| 19 | Smoke 7/7 PASS post-state | 7 passing, 0 failing | Localhost-Tester runs `node tests/smoke/baseline.test.mjs` |
| 20 | RLS unchanged | 0 rows in `git diff` for `pg_policies` snapshot | Reviewer probes |
| 21 | Iron Rule 35 — no new placeholder / action_type / trigger_type | 0 new entries in `crm_message_templates` body placeholder set, `crm_automation_rules.action_type` set, `crm_trigger_type_registry` slug set | Reviewer probes via 3 SQL queries on demo |

### 3.5 The 3 SELECT Queries — Verbatim Semantics

The Executor implements these 3 queries inside `modules/crm/crm-pixel-gap-tile.js` using existing `sb` client + `shared.js` helpers. Defense-in-depth `.eq('tenant_id', getTenantId())` on every `.select()` per Iron Rule 22 + Brief §4.1.

**Q1 — Aggregate counter (returns 1 row).**

Semantic: count leads in the last 30 days (excluding last 1 hour to avoid pixel-fire false positives) split by 3 states:
- `total_with_event_id` = leads where `fb_event_id IS NOT NULL`
- `gap_count` = leads where `fb_event_id IS NOT NULL AND fb_pixel_fired_at IS NULL` (the metric we measure)
- `pixel_fired_count` = leads where `fb_event_id IS NOT NULL AND fb_pixel_fired_at IS NOT NULL`

Executor's choice of mechanism (any of):
- Single PostgREST `.select()` with `count('exact')` × 3 separate calls (3 round-trips)
- Single RPC wrapping the SQL (overkill — adds RPC creation work)
- **PREFERRED:** Single `.select('fb_event_id, fb_pixel_fired_at')` filtered to `created_at >= NOW() - 30d AND created_at < NOW() - 1h`, then JS-side reduce into 3 counters. Avoids 3 round-trips; row count is small (target ≤ a few hundred).

If the JS-side reduce returns > 500 rows → switch to 3 `.select('id', { count: 'exact', head: true })` calls per Brief perf threshold.

**Q2 — 7-day trend (returns up to 7 rows).**

Semantic: per-day gap_count for the last 7 days.

```
DATE_TRUNC('day', created_at) AS day, COUNT(*) FILTER (WHERE fb_event_id IS NOT NULL AND fb_pixel_fired_at IS NULL) AS gap_count
WHERE tenant_id = <current>
  AND created_at >= NOW() - INTERVAL '7 days'
  AND created_at < NOW() - INTERVAL '1 hour'
GROUP BY day
ORDER BY day ASC
```

Implementation choice (any of):
- PostgREST cannot do `GROUP BY DATE_TRUNC` directly via `.select()` — Executor uses Postgres RPC OR runs the per-day filter client-side after pulling all 7-day rows. **PREFERRED:** client-side — pull `crm_leads.created_at, fb_event_id, fb_pixel_fired_at` for 7-day window, JS-bucket by day. Row count remains bounded (low hundreds at current scale).

The result is presented as a small sparkline (CSS-only stacked div bars, no chart library) OR an ordered horizontal list of day-count badges (executor's choice based on space — both keep file ≤ 100 lines).

**Q3 — Drill-down detail (up to 100 rows).**

Semantic: list of leads currently in the gap (state #2 — `fb_event_id IS NOT NULL AND fb_pixel_fired_at IS NULL`), joined to `crm_capi_dispatch_queue` for CAPI status visibility.

```sql
SELECT
  l.id, l.name, l.phone, l.created_at, l.fb_event_id,
  q.status AS capi_status, q.processed_at AS capi_processed_at, q.error_message AS capi_error
FROM crm_leads l
LEFT JOIN crm_capi_dispatch_queue q
  ON q.lead_id = l.id AND q.tenant_id = l.tenant_id
WHERE l.tenant_id = <current>
  AND l.fb_event_id IS NOT NULL
  AND l.fb_pixel_fired_at IS NULL
  AND l.created_at >= NOW() - INTERVAL '30 days'
  AND l.created_at < NOW() - INTERVAL '1 hour'
ORDER BY l.created_at DESC
LIMIT 100
```

PostgREST translation:
```js
sb.from('crm_leads')
  .select('id, name, phone, created_at, fb_event_id, crm_capi_dispatch_queue!left(status, processed_at, error_message)')
  .eq('tenant_id', tid)
  .not('fb_event_id', 'is', null)
  .is('fb_pixel_fired_at', null)
  .gte('created_at', thirtyDaysAgoIso)
  .lt('created_at', oneHourAgoIso)
  .order('created_at', { ascending: false })
  .limit(100)
```

If PostgREST relation traversal `crm_capi_dispatch_queue!left(...)` fails because the relationship is not auto-detected (foreign key naming) → Executor falls back to 2 separate queries: first `crm_leads`, then `crm_capi_dispatch_queue.select(...).in('lead_id', leadIds)`, JS-merge.

### 3.6 Partial Index (gated by §3 D4 — only ships if any query > 100ms on demo)

```sql
CREATE INDEX IF NOT EXISTS idx_crm_leads_capi_gap_partial
ON crm_leads (tenant_id, created_at DESC)
WHERE fb_event_id IS NOT NULL AND fb_pixel_fired_at IS NULL;
```

Migration filename if it ships: `supabase/migrations/{YYYYMMDDHHMMSS}_m4_pixel_gap_partial_index.sql`.

Per Iron Rule 33: this is NOT a `crm_message_templates` / `crm_automation_rules` / `crm_statuses` / `crm_field_visibility` / `crm_tags` row — it is a DDL on the `crm_leads` base table. Rule 33's demo-first-then-promote flow does not apply (the index lives in the database directly, applied to both tenants by a single migration replay). Executor applies the migration via `mcp__claude_ai_Supabase__apply_migration` once; result is shared across all tenants automatically.

---

## 4. Autonomy Envelope

### CAN do autonomously

- Read any file in either repo (`opticalis/opticup` or `opticalis/opticup-storefront`).
- Run Level 1 read-only SQL via Supabase MCP `execute_sql` (SELECT-only on demo or Prizma).
- Run Level 2 SQL ONLY for: (a) the gated index migration in §3.6 (if D4 fires), applied via MCP `apply_migration` to demo first, observed via `pg_indexes` SELECT, then applied to Prizma (the same migration call applies to both — single DB).
- Insert ONE test lead with `fb_event_id` populated into demo `crm_leads` if needed to exercise §3 criterion 6b — but ONLY if §3.5 BASE_DEMO_LEADS_FB_EVENT_ID_NOTNULL = 0. Cleanup the test row at TEST_REPORT close via `DELETE FROM crm_leads WHERE id = <inserted_uuid>` AND tenant_id = demo.
- Modify the 3 declared files only: `modules/crm/crm-pixel-gap-tile.js` (new), `modules/crm/crm-messaging-performance.js` (modified), `docs/FB_CAPI.md` (modified). Plus `crm.html` for the script-tag insert.
- Use existing `shared/js/modal-builder.js` `Modal.show()` for the drill-down — no Modal modifications.
- Reuse `escapeHtml`, `formatDate`, `getTenantId`, `sb` from `shared.js` — no new globals beyond `window.renderPixelGapTile` (which Brief explicitly authorizes).
- Stage files by explicit name. Run `git diff --cached --name-only` before every commit. Unexpected files → `git reset HEAD <file>` to unstage, then commit.
- Each commit is followed by `npm run verify:integrity` — exit 0 or 2 only; exit 1 = STOP.

### MUST STOP

- Need to modify any file outside the 4 declared in §4.CAN.
- Brief §4.2 / §4.4 / §4.6 table — ANY touch on these tables, EFs, or triggers.
- Need to add ANY trigger (new or modified).
- Need to add ANY new table or column.
- Need to add ANY new template placeholder, trigger_type, or action_type (Iron Rule 35).
- Need to write to Prizma `crm_leads` (read-only on Prizma; writes only to demo for §3 criterion 6b test row).
- Need to modify any EF source.
- Need to modify `crm-messaging-tab.js` (the parent sub-tab registry — Brief Placement Hint forbids this).
- Need to modify any `pg_policies` USING clause.
- More than 2 candidate parent files emerge (Brief §8). Currently only `crm-messaging-performance.js` is viable per §0.
- Iron Rule 31 integrity gate fails (exit 1).
- Iron Rule 32 destructive-ops gate fires.
- Smoke 7/7 regresses post-state (fewer than 7 passing).
- Need to add `Modal.show` modifications.
- `Modal.show` is not available (`window.Modal` undefined) — STOP, investigate; this would be a regression in shared/ outside the SPEC's scope.

### Bounded handling of EXPECTED deviations

- **PostgREST relation join (Q3) fails to auto-detect FK relationship** → fallback to 2 separate queries + JS-merge (documented in §3.5 Q3). NOT a stop trigger — Executor handles inline + logs as a deviation D-N with rationale.
- **`crm_capi_dispatch_queue` rows for a lead have `status='no_match'` or `status='skipped_no_token'`** — these are terminal non-error states (per FB_CAPI.md §3). Drill-down displays them in the `capi_status` column. NOT a problem.
- **Aggregate query returns ALL three counters as 0 on demo** — expected for demo (D-AUTH-3 of P2.1 — demo has no CAPI token). Tile shows the 0-state placeholder per §3 criterion 6a. NOT a stop trigger — this is the predicted demo state.
- **Demo's small row counts mean the gated index decision favors "defer"** — expected; document in FINDINGS with the median query times observed.

---

## 5. Stop-Triggers (extended beyond CLAUDE.md §9 + Brief §8)

In addition to global stop triggers in CLAUDE.md §9 and the Brief's §8:

1. **Brief §4.9 enforcement.** Touch on any table in Brief §4.2, any EF in §4.4, any trigger in §4.6 → STOP, escalate to Architect via `modules/Module 4 - CRM/escalations/{ISO_TS}_{SLUG}.md`.
2. **Iron Rule 35.** Any new `%var%` placeholder, `action_type`, or `trigger_type` slug — STOP, escalate.
3. **Cross-tenant write.** Any INSERT/UPDATE/DELETE against Prizma data — STOP.
4. **Modal regression.** If `Modal.show()` doesn't return `{el, close}` or doesn't render — STOP (shared/ regression).
5. **File budget violation.** New tile file > 100 lines OR parent > 230 lines — STOP, refactor, do not commit.
6. **D4 ambiguity.** Median query time straddles 100ms (e.g., 90-110ms) on demo → ship the index (favor safety; it's cheap).

---

## 6. Pipeline

Standard Full-Auto Pipeline:

1. **Foreman (opticup-strategic, Opus)** authors this `SPEC.md` (DONE — this file).
2. **Executor (opticup-executor, Sonnet 4.6 — `claude-sonnet-4-5-20250629` or current Sonnet model)** implements:
   - Step 1.5 pre-flight (DB baselines, query timing, parent file confirm, Rule 21 cross-ref re-check).
   - C1: SPEC.md commit (this file).
   - C1.5 (gated): if D4 fires, ship the partial index migration. Commit.
   - C2: write `modules/crm/crm-pixel-gap-tile.js`, modify `modules/crm/crm-messaging-performance.js` to embed, modify `crm.html` to add script tag, append §12 to `docs/FB_CAPI.md`, flip §11 Future Work row. Single commit.
   - C3: write `EXECUTION_REPORT.md` + `FINDINGS.md` to SPEC folder. Commit.
3. **Reviewer (opticup-reviewer, default model)** validates against §3 + §5 + Brief §4 + Iron Rules 12/21/22/31/32/34/35. Writes `REVIEW.md` to SPEC folder. Commit.
4. **Localhost-Tester (opticup-localhost-tester, default model)** runs smoke 7/7 + Chrome MCP verification on demo + on Prizma. Captures the Iron Rule 34 artifact triplet (screenshot + window.__pixelGapTrace + DB-query evidence). Writes `TEST_REPORT.md` to SPEC folder. Commit.
5. **Foreman closes (opticup-strategic, Opus)** with `FOREMAN_REVIEW.md` containing the 4 skill improvement proposals + memory update + Hebrew status line to Daniel.

---

## 7. Out of Scope

Explicit list of what NOT to touch. Anything here → stop trigger.

- `fb-capi-dispatch` EF source.
- `pixel-fired` EF source.
- `automation-engine` EF source.
- `dispatch-queue` EF source.
- `send-message` EF source.
- `lead-intake` EF source.
- `submit-lead` EF source.
- `pin-auth` EF source.
- `crm_leads` schema (no new columns; no ALTER on existing).
- `crm_capi_dispatch_queue` schema.
- `crm_message_log`, `crm_message_queue`, `crm_message_templates`, `crm_automation_rules`, `crm_automation_runs`, `crm_status_change_events`, `crm_event_attendees`, `crm_events`, `crm_broadcasts`, `crm_statuses`, `crm_lead_touchpoints` — all left alone (Brief §4.2).
- `trg_event_status_change_event`, `trg_lead_status_change_event`, `trg_attendee_status_change_event`, `trg_promote_lead_on_message_sent`, all `sync_*_public_trg` triggers (Brief §4.6).
- `crm_trigger_type_registry`.
- Storefront repo (`opticalis/opticup-storefront`) — zero changes.
- Make scenarios — zero changes.
- Real-time refresh (Brief D7).
- New "back-wire unverified" banner (Brief D5 — back-wire already shipped).
- Phase 2.5 multi-tile dashboard (separate future SPEC).
- Meta API integration beyond what P2.1 already does.
- Any change to `pg_policies`, `pg_proc`, `pg_class`, RLS, GRANTs, schemas.
- `crm-messaging-tab.js` (Brief Placement Hint forbids).
- Any UI change to other Messaging Hub sub-tabs (templates, rules, broadcast, log).

---

## 8. Expected Final State

**Files added/modified:**

| File | Action | Expected size |
|---|---|---|
| `modules/crm/crm-pixel-gap-tile.js` | NEW | ≤ 100 lines |
| `modules/crm/crm-messaging-performance.js` | MODIFIED | 186 → ≤ 230 lines |
| `crm.html` | MODIFIED | +1 line (`<script src="modules/crm/crm-pixel-gap-tile.js"></script>`) |
| `docs/FB_CAPI.md` | MODIFIED | 278 → ≤ 295 lines |
| `supabase/migrations/{ts}_m4_pixel_gap_partial_index.sql` | NEW (CONDITIONAL — only if D4 fires) | ~5 lines |
| `modules/Module 4 - CRM/docs/specs/M4_PIXEL_VALIDATION_GAP_DASHBOARD/SPEC.md` | NEW (this file) | ~400 lines |
| `.../EXECUTION_REPORT.md` | NEW (by Executor) | ~150 lines |
| `.../FINDINGS.md` | NEW (by Executor, even if empty) | ~30 lines |
| `.../REVIEW.md` | NEW (by Reviewer) | ~100 lines |
| `.../TEST_REPORT.md` | NEW (by Localhost-Tester) | ~80 lines |
| `.../FOREMAN_REVIEW.md` | NEW (by Foreman closure) | ~250 lines |

**Memory update at closure:**

- `project_fb_capi_p21_state.md` → flip P2.2 from "queued / unblocked" to "fully closed (substrate + dashboard)" with the commit hash range.

**Git state:**

- 3-4 commits on `develop` (C1 + C1.5? + C2 + C3 + Reviewer + LH-Tester + Foreman = 6-7 total commit-bearing artifacts including SPEC-lifecycle commits).
- Working tree clean.
- No push to `main` (per CLAUDE.md §9.7 — Daniel-only authority).

**DB state:**

- 0 schema changes on `crm_leads` / `crm_capi_dispatch_queue`.
- 0 or 1 new index (`idx_crm_leads_capi_gap_partial`) depending on D4 gate.
- 0 row writes on Prizma.
- ≤ 1 test row inserted into demo `crm_leads` during Localhost-Tester verification, deleted at TEST_REPORT close.

**Live ERP state on demo (after Localhost-Tester):**

- Messaging Hub "📊 ביצועי הודעות" sub-tab renders with the new tile above the existing performance table.
- Tile shows the 3 numbers (likely "0 / 0 / 0" on demo with the test row removed).
- Drill-down button opens Modal with empty-state Hebrew placeholder.

---

## 9. Rollback Plan

Pure revert. No DB rollback needed.

**If C2 (tile file + parent + docs) is bad:**
```
git revert <c2_commit_hash>
```
This restores `crm-messaging-performance.js` to its pre-SPEC state, removes the tile file (since git revert of an add = delete), removes the FB_CAPI.md additions, removes the `crm.html` script tag line.

**If C1.5 (gated index migration) ships and needs reversal:**
```sql
DROP INDEX IF EXISTS idx_crm_leads_capi_gap_partial;
```
Apply via MCP `apply_migration` with a separate migration name (forward-only migration discipline). The index is on `crm_leads` — dropping it has zero data impact (it's an index, not a constraint).

**Rollback authorization:** Foreman OR Daniel may authorize C2 rollback during the SPEC's chat session. C1.5 rollback (the index) only by Daniel since it's a DB change — but very unlikely needed (partial indexes are append-safe and don't change query semantics).

No `_down.sql` artifact. No CLI commands (`supabase functions delete` etc.) — Iron-Rule-32-clean SPEC has no destructive ops to reverse.

---

## 10. Commit Plan

- **C1.** `chore(spec): seal M4_PIXEL_VALIDATION_GAP_DASHBOARD — read-only dashboard tile + drill-down`
  - Files: this `SPEC.md`.
- **C1.5 (CONDITIONAL — only if §3 D4 fires after pre-flight EXPLAIN ANALYZE).** `feat(m4): M4_PIXEL_VALIDATION_GAP_DASHBOARD — partial index idx_crm_leads_capi_gap_partial`
  - Files: `supabase/migrations/{ts}_m4_pixel_gap_partial_index.sql`.
  - Applied via MCP `apply_migration` before commit.
- **C2.** `feat(m4): M4_PIXEL_VALIDATION_GAP_DASHBOARD — tile + drill-down in Messaging Hub`
  - Files: `modules/crm/crm-pixel-gap-tile.js`, `modules/crm/crm-messaging-performance.js`, `crm.html`, `docs/FB_CAPI.md`.
- **C3.** `chore(spec): M4_PIXEL_VALIDATION_GAP_DASHBOARD — Executor retrospective (EXECUTION_REPORT + FINDINGS)`
  - Files: `modules/Module 4 - CRM/docs/specs/M4_PIXEL_VALIDATION_GAP_DASHBOARD/EXECUTION_REPORT.md`, `.../FINDINGS.md`.

Reviewer + Localhost-Tester + Foreman each add their own commits at their respective phases. All commits run pre-commit hooks: Iron Rule 21 orphan check, Iron Rule 31 integrity gate, Iron Rule 32 destructive ops gate, Iron Rule 14 tenant_id check, Iron Rule 15 RLS check. All must exit 0 or 2 (warn-only).

---

## 11. Destructive Operations

**`None.`** (per Iron Rule 32).

This SPEC performs zero destructive operations. All changes are additive:
- New JS file (additive).
- Parent JS file modification = code addition, no deletions.
- `docs/FB_CAPI.md` modification = section addition + one table-row update (additive — overwriting the same row in-place, not deleting any row).
- `crm.html` modification = 1 line added.
- Optional new index (additive DDL).
- No file deletes. No `git rm`. No mass renames. No `git rebase`. No `git reset --hard`. No `git push --force`. No `DROP TABLE`, `DROP COLUMN`, `DROP POLICY`, `TRUNCATE`. No DML mass-delete. No CLAUDE.md / SKILL.md section deletion. No `main` branch modification.

If the Executor encounters a need for any destructive op mid-run → STOP, write escalation file at `modules/Module 4 - CRM/escalations/{ISO_TS}_M4_PIXEL_VALIDATION_GAP_DASHBOARD.md`, emit ONE Hebrew line to Daniel, halt the pipeline.

---

## 12. Cross-References

- `modules/Module 4 - CRM/architecture-brief/M4_PIXEL_VALIDATION_GAP_DASHBOARD_BRIEF.md` — sealed 2026-05-19; this SPEC's binding source.
- `modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_HYBRID_DEDUPLICATION/` — P2.1 substrate (closed 2026-05-15).
- `modules/Module 3 - Storefront/docs/specs/M3_FUNNEL_PIXEL_BACKWIRE/` — back-wire (closed 2026-05-19).
- `modules/Module 3 - Storefront/docs/specs/M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF/` — storefront UUID gen (closed 2026-05-15).
- `docs/FB_CAPI.md` — canonical CAPI reference (this SPEC appends §12).
- `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md` — confirms no template/rule/placeholder changes required (this SPEC is pure read).
- `roles/site-overseer/FUNNEL_ROADMAP.md` — P2.2 row will flip to ✅ at SPEC close.
- `MASTER_ROADMAP.md` — M4 section will reflect P2.2 closure at SPEC close.
- Iron Rules 12, 21, 22, 31, 32, 33, 34, 35.
- Memory: `project_fb_capi_p21_state.md` (to be updated at closure).
- **Missing-knowledge-map note:** `roles/site-overseer/knowledge-build/funnel-q3/M4_PIXEL_VALIDATION_GAP_QUERY.md` cited in Brief §12 + ACTIVATION_PROMPT does NOT exist on disk. SPEC §3.5 contains the queries derived from Brief §1+§3+§4.1 + FB_CAPI.md schema as a self-sufficient replacement. Logged as FINDING-AT-AUTHOR F-A1.

---

## 13. Author Notes

This is the smallest customer-visible deliverable in FUNNEL Phase 2 — a single tile + drill-down modal that closes the P2.2 loop. After this lands:

- Daniel can monitor pixel-fire chain health daily without running ad-hoc SQL.
- The next time the pixel chain breaks (ad-blocker spike, storefront thank-you redirect breaks, etc.), the number on the dashboard signals it before customers notice.
- The tile is forward-compatible with the eventual Phase 2.5 multi-tile dashboard — that SPEC will move (or compose-on-top-of) this single tile.

**Why this SPEC trusts the Brief over the missing knowledge map:** Brief §1 (3-state model) + §3 (3 queries enumerated by semantic) + §4.1 (table access list) + §7 (12 success criteria) + FB_CAPI.md schema together fully constrain the queries. The knowledge map file was a planned deliverable from `OVERNIGHT_KNOWLEDGE_BUILD_2026_05_15` Mission 4 that never landed — but the Brief author (Architect) wrote a self-sufficient Brief precisely because they expected the knowledge map might not be ready by the time this SPEC ran. SPEC §3.5 makes the inheritance explicit so the Executor doesn't have to derive the queries from §1+§3+§4.1 themselves.

**Cross-Module Safety Audit §4 of the Brief is BINDING.** Reviewer at §6.3 enforces it by reading `git diff` against the §4.2 / §4.4 / §4.6 enumeration. Any leak is a STOP trigger handled by Brief §8.

---

*End of SPEC.*
