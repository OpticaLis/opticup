# M4_SHORT_LINKS_DASHBOARD_REDESIGN — Architecture Brief

> **Status:** Brief sealed 2026-05-20 · Owner: Architect · Pipeline: Full-Auto
>
> **One-line:** Restructure the "קישורים קצרים" tab from a flat 7,000-row list (mostly 0-clicks) into a layered analytics view: broadcast-level summary at top + smart filter (clicks ≥ 1 by default) + drill-down list at bottom. Surface both per-recipient links (unsubscribe-style) and template-static links (e.g., /r/gpw).
>
> **Risk class:** LOW. Read-only queries + frontend redesign. No DB writes, no EF changes, no triggers, no schema.

---

## 1. Goal

Today the tab dumps every short_link ever created — 7,009 rows on Prizma, ~99% with 0 clicks. Useless for daily operations. Daniel needs to:
- See which broadcasts have high engagement (CTR%, unsubscribe rate).
- Filter out the noise (0-click rows).
- Drill down to specific broken links if needed.
- See both per-recipient links (unsubscribe per lead) and template-static links (gateway payment, Waze, etc.) in one view.

After this Brief: Daniel opens the tab → sees 10-30 broadcasts (current month) → spots best/worst CTR → optionally drills into per-link data. 99% of the 7,009 rows get filtered out by default, surfacing only signal.

## 2. Background

**Current state** (verified live 2026-05-20):
- Prizma has 7,009 `short_links` rows + 47 `short_link_clicks` rows. Ratio: ~150:1.
- Demo has 805 short_links rows.
- Two link categories exist:
  - **`link_type='per_recipient'`** — unique link per lead per broadcast (unsubscribe, registration tokens). 99% of all rows.
  - **`link_type='template_static'`** — shared link, same for everyone (gateway payment `/r/gpw`, Waze static URLs, etc.). Few rows (estimated < 20 on Prizma) but high click volume each.
- Click data is in `short_link_clicks` with columns `short_link_id`, `clicked_at`, `broadcast_id` — already designed for aggregation.
- Existing supporting tables: `crm_broadcasts` (with `name`, `total_sent`, `created_at`), `crm_message_log` (per-recipient send events).

**Why now:** the 4-line URL-limit hotfix (`M4_SHORT_LINKS_400_FIX`, 2026-05-20) made the tab functional again. Now that it loads, Daniel saw the actual UX problem and asked for redesign.

**Why this is a signal source:** click-through rate (CTR) is the most direct measure of message effectiveness. A broadcast with 1,000 sends and 50 clicks = 5% CTR — Daniel can compare to other broadcasts and improve the high-CTR ones. Per-recipient noise drowns out this signal today.

## 3. Scope

### 3.1 In scope

**Three connected components on the same screen:**

**Component 1 — Broadcast aggregation table (top, primary view)**

For every broadcast in the last 30 days (configurable date range later):

| Column | Source |
|---|---|
| Broadcast name | `crm_broadcasts.name` |
| Sent date | `crm_broadcasts.created_at` |
| Channel | `crm_broadcasts.channel` |
| Recipients sent | `crm_broadcasts.total_sent` |
| Link clicks total | `count(short_link_clicks)` where `broadcast_id = b.id` |
| Unique-click leads | `count(distinct lead_id)` from clicks |
| CTR% | clicks / sent * 100 |
| Unsubscribe count | clicks on `link_type='per_recipient'` AND target contains `/unsubscribe` |
| Unsubscribe rate% | unsubs / sent * 100 |

Sorted by sent date desc by default. Click a row → expand to Component 3 filtered to that broadcast.

**Component 2 — Smart filter bar (middle)**

Three filter chips:

| Chip | Default | Behavior |
|---|---|---|
| "Only clicked links" | ON | Hides rows with `total_clicks = 0` |
| Date range | Last 30 days | Standard preset + custom |
| Link type | All | All / Per-recipient only / Template-static only |

**Component 3 — Drill-down link list (bottom, secondary view)**

The existing table (already built). Hidden by default until user clicks a broadcast row OR clicks "show all links" button.

Shows individual short_links matching active filters. Columns same as today: code, target, type, total clicks, last click.

**Add: template-static links section.** A dedicated card above Component 1 showing the small list of `link_type='template_static'` links (gateway, Waze, etc.) with their click counts — these aren't broadcast-bound so they don't fit Component 1's grouping.

### 3.2 Out of scope (explicitly)

- New DB tables or views (we'll prove the queries work with raw SELECTs first; if they're slow, future SPEC adds a materialized view).
- Click-attribution to lead source / UTM. That's a future Funnel Dashboard tile, not this SPEC.
- Modifying short_link_clicks ingestion logic.
- Deleting old short_links rows (the 7,009 rows are cheap; storage is not the problem).
- Change to the unsubscribe link generation logic.
- CSV export (deferred to follow-up if Daniel asks).
- Time-series chart of clicks over time (Phase 2.5 dashboard territory).

## 4. Cross-Module Safety Audit

### 4.1 What this SPEC touches

| Surface | Access | Reason |
|---|---|---|
| `modules/crm/crm-short-links-stats.js` | MODIFY | Replace flat-list rendering with 3-component layout |
| Possibly new `modules/crm/crm-short-links-tiles/` subdirectory if Iron Rule 12 demands | NEW | One file per component, clean separation |
| `short_links` table | **READ-ONLY** (SELECT) | Existing access |
| `short_link_clicks` table | **READ-ONLY** (SELECT) | Existing access |
| `crm_broadcasts` table | **READ-ONLY** (SELECT) | Already used by other CRM modules |
| `crm_leads` table | **READ-ONLY** (SELECT) | Distinct-lead-count aggregation |

### 4.2 EXPLICITLY NOT TOUCHED

| Surface | Confirmed unchanged |
|---|---|
| `crm_message_log` | not touched |
| `crm_message_queue` | not touched |
| `crm_message_templates` | not touched |
| `crm_automation_rules` | not touched |
| `crm_status_change_events` | not touched |
| `crm_capi_dispatch_queue` | not touched |
| Any EF | not touched |
| Any DB trigger | not touched |
| Any other module | not touched |

### 4.3 Stop-trigger
If executor pre-flight finds need to modify any item in §4.2 → STOP, escalate.

## 5. Locked Decisions

**D1. Three components on one screen, not three separate tabs.** Same workflow loop (see big picture → filter → drill down) should happen in one continuous view, not require navigation. Each component fits in ~200px vertical when collapsed.

**D2. "Only clicked links" filter is ON by default.** Daniel's primary use case is "what's working" — 0-click rows are by definition not working. Power-user toggle reveals them.

**D3. Template-static links surfaced in a dedicated card, not mixed into the broadcast table.** They have no `broadcast_id` association — they're shared infrastructure. Mixing them with broadcasts would distort CTR math.

**D4. Drill-down stays SQL-driven, not pre-aggregated.** Queries run on click; results cached in browser memory for 5 minutes per pair (broadcast_id × link_type). Avoids materialized-view complexity until scale demands it.

**D5. Iron Rule 22 defense-in-depth.** Every `.select()` chains `.eq('tenant_id', tid)` even though RLS enforces. Confirmed in opticup-architect SKILL.md Step 0.7.

**D6. Mobile responsive.** Component 1 (broadcast table) shrinks to card layout on mobile. Filter chips stack. Drill-down table remains scrollable horizontally.

**D7. NO new DB objects in v1.** If a query becomes slow (> 500ms p95), follow-up SPEC adds a materialized view `mv_crm_broadcast_link_stats` refreshed every 5min. v1 just runs SELECT queries directly.

## 6. Pipeline

Standard Full-Auto Pipeline:

1. **Foreman (opticup-strategic)** authors SPEC.
2. **Executor (opticup-executor)** implements 3 components + filter logic. Model: Sonnet.
3. **Reviewer (opticup-reviewer)** validates Iron Rules 12/21/22/31/32 + Cross-Module Safety §4.
4. **Localhost-Tester** runs smoke + Chrome MCP verification: opens tab on demo → confirms broadcast table renders with at least 1 broadcast → toggles filter → confirms drill-down expand on row click.
5. **Foreman closes** with FOREMAN_REVIEW.md.

## 7. Success Criteria

1. New broadcast aggregation table renders at top with at least 1 row on demo.
2. CTR% column displays as percentage with 1 decimal.
3. "Only clicked links" filter ON by default; toggle works.
4. Date range filter defaults to "Last 30 days"; preset chips for 7/30/90 days + custom.
5. Link type filter (All / per-recipient / template-static).
6. Template-static dedicated card shows links that aren't bound to a broadcast.
7. Drill-down section hidden by default, expands when broadcast row clicked OR "show all links" button.
8. Mobile responsive (Daniel verifies on iPhone before merge).
9. All queries < 500ms p95 on demo.
10. Smoke 8/8 PASS.
11. Iron Rule 31 + 32 + 34 (Chrome MCP triplet) gates pass.
12. Cross-Module Safety §4 holds — Reviewer confirms.
13. Working tree clean at SPEC close.

## 8. Stop-Triggers

Executor MUST stop on any of:
- §4.3 violation.
- Query exceeds 500ms p95 on demo → STOP, escalate (probably need materialized view, which is D7 scope creep).
- More than 2 link types found in `short_links.link_type` enum (would mean schema changed since investigation).
- Iron Rule 31 fails.
- Smoke regresses.

## 9. Rollback Plan

Pure frontend revert. No DB, no EF, no schema. `git revert <commit>` and the tab returns to the (now-fixed) flat list.

## 10. Expected Final State

- 1-3 modified JS files (`crm-short-links-stats.js` + optional sub-files).
- Possibly 1 modified CSS file.
- Demo Chrome MCP screenshots showing all 3 components functional.
- Smoke + integrity GREEN.

## 11. Commit Plan

- C1: Broadcast aggregation table component + filter logic.
- C2: Template-static dedicated card.
- C3: Drill-down integration + smart filter wiring.
- C4: FOREMAN_REVIEW + docs.

## 12. Cross-References

- `M4_SHORT_LINKS_400_FIX` (closed 2026-05-20) — the URL-limit hotfix that made this tab functional again.
- `roles/site-overseer/knowledge-build/funnel-q3/M2_FUNNEL_HEALTH_DASHBOARD_DATA_MODEL.md` — Phase 2.5 will add a sibling broadcast-level tile on the funnel dashboard. This SPEC's queries are reusable.
- `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md` — no overlap (this SPEC doesn't touch automation).
- Iron Rules 12, 21, 22, 31, 32, 34.

## 13. Author Notes

This is the right size of fix — the 4-line hotfix made the page work technically; this SPEC makes the page useful. Same investment ratio: ~2-3 hours autonomous work for 10× the daily-ops value.

The Iron Rule 34 Chrome MCP verification is mandatory because this is heavy UI work — Daniel needs to confirm the 3-component layout actually fits on his screen before merge.

---

*End of Brief. Activation Prompt in sibling file `M4_SHORT_LINKS_DASHBOARD_REDESIGN_ACTIVATION_PROMPT.md`.*
