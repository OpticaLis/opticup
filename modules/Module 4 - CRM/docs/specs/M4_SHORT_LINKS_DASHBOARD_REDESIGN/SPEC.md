# SPEC — M4_SHORT_LINKS_DASHBOARD_REDESIGN

> **Class:** Feature — frontend redesign + new aggregation queries (read-only).
> **Authored by:** opticup-strategic (Foreman, M4)
> **Authored on:** 2026-05-20
> **Branch:** develop
> **Pipeline:** FULL-AUTO — Foreman → Executor (Sonnet) → Reviewer → Localhost-Tester → Foreman closure.
> **Risk class:** LOW-MEDIUM. Read-only queries + heavy UI redesign. No DB writes, no EF changes, no triggers, no schema.

---

## 0. Pre-Authoring Reality Check (Strategic Skill Step 5.3)

Per Strategic Skill §"Step 5.3 Runtime Semantics Rehearsal" — rehearsing semantics + DB-state before sealing the SPEC.

### 0.1 §8 Stop-Trigger Resolution (recorded — Daniel-approved 2026-05-20)

**Brief §8 fired:** *"More than 2 link types found in `short_links.link_type` enum (would mean schema changed since investigation)."* Actual enum distribution probed live:

| link_type | rows (Prizma) |
|---|---|
| `unsubscribe` | 6,278 |
| `registration` | 2,714 |
| `template_static` | 6 |
| `registration_url` | 1 (legacy) |
| `test` | 1 |

**Resolution (Option 1 — self-resolve via 2-category mapping, Daniel-approved):**

The Brief's *design intent* (two categories: per-recipient vs template-static) is internally consistent — only the enum-value naming was wrong. Canonical category mapping codified for this SPEC:

| Category | Maps to enum values |
|---|---|
| **Per-recipient** | `unsubscribe`, `registration`, `registration_url`, `test` |
| **Template-static** | `template_static` |

Simplification: "Unsubscribe count" column in Component 1 queries `link_type='unsubscribe'` directly. No target-URL `LIKE '%unsubscribe%'` check needed — the enum already encodes the type.

### 0.2 Brief Data Drift (noted — non-blocking)

| Brief said | Actual | Action |
|---|---|---|
| Prizma has 47 short_link_clicks | Prizma has **473** clicks (10× higher) | Positive surprise; no SPEC change |
| link:click ratio ~150:1 | Actually ~15:1 | Still fine, query still fast |
| `link_type='per_recipient'` is an enum value | **Not in enum**; conflates category + value | Resolved per §0.1 |

### 0.3 Schema Verification — `crm_broadcasts`

Live probe confirmed all 12 columns NOT NULL except `template_id`. Columns the SPEC depends on: `id`, `tenant_id`, `employee_id`, `name`, `channel`, `template_id`, `total_recipients`, `total_sent`, `total_failed`, `status`, `created_at`. All exist. `total_sent` populated on **all 11 demo + 4 Prizma broadcasts** in the last 30 days. No nulls.

### 0.4 Performance Probe — D7 gate satisfied

EXPLAIN ANALYZE of the full Prizma broadcast-aggregation query (4 broadcasts × 3 sub-aggregates each) — **Execution Time: 117.708ms**. Well under the 500ms ceiling defined by Brief §D7. Index `idx_short_link_clicks_tenant_broadcast_clicked` exists and the planner uses index-only scans + memoization. v1 inline SELECTs are sufficient; no materialized view needed per D7.

### 0.5 Runtime Semantics Rehearsal

| Scenario | Expected behavior |
|---|---|
| Demo tenant (1 broadcast with clicks, 14 without) | Component 1 shows 1 broadcast row when filter ON, 11 rows total when filter OFF (current month's broadcasts) |
| Prizma tenant (4 broadcasts last 30d, 1 with clicks) | Component 1 shows 1 row filter-ON, 4 rows filter-OFF |
| Click row with `broadcast_id IS NULL` (Prizma: 51 such clicks) | Counted in template-static card aggregates, NOT in Component 1 (Component 1 inner-joins by `broadcast_id`) |
| User toggles "Only clicked links" OFF | Component 1 re-queries WITHOUT the `HAVING total_clicks > 0` filter; existing rows redisplay |
| User clicks broadcast row | Component 3 (drill-down) expands, queries short_links WHERE broadcast_id = clicked row's id; cached 5-min per pair |
| `link_type='test'` (1 Prizma row) | Counted in "per-recipient" category per §0.1 |

### 0.6 Cross-Reference Check (Strategic Skill Step 1.5)

| New name introduced by SPEC | Collision check | Result |
|---|---|---|
| `loadCrmShortLinksBroadcasts` (Component 1 entry) | `grep -rn "loadCrmShortLinksBroadcasts" --include="*.js" --include="*.html"` | 0 hits — clean |
| `loadCrmShortLinksFilters` (Component 2) | grep | 0 hits — clean |
| `loadCrmShortLinksTemplateStatic` (template card) | grep | 0 hits — clean |
| `loadCrmShortLinksDrilldown` (Component 3) | grep | 0 hits — clean |
| `crm-short-links-tiles/` subdir | `ls modules/crm/` | does not exist — clean |

**Cross-Reference Check completed 2026-05-20 against GLOBAL_MAP rev 2026-05-19: 0 collisions / 5 hits resolved (all 0-hit).**

No new DB objects (D7). No new HTML structure (host `<div id="short-links-host">` already in `crm.html:349`). No new CSS file required — Tailwind utility classes suffice.

### 0.7 DOM-State Mental Rehearsal (Strategic Skill §5.4)

The redesign adds 4 visual sections inside `#short-links-host`. Stacked vertically, default state:

```
┌─ #short-links-host ─────────────────────────────────┐
│ <h4>🔗 קישורים קצרים — סטטיסטיקה</h4>              │
│ <p>caption</p>                                       │
│ ┌─ #short-links-template-static-card ────────────┐ │  ← Card: 6 Prizma / 2 demo
│ │ "קישורים סטטיים (משותפים)"                       │ │     template-static rows
│ │ table: code | target | clicks | last            │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─ #short-links-filter-bar ──────────────────────┐ │
│ │ [✓ קליקים בלבד] [30 ימים ▼] [סוג: הכל ▼]        │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─ #short-links-broadcasts-table ────────────────┐ │  ← Component 1 (primary)
│ │ table: שידור | תאריך | ערוץ | נשלחו | קליקים   │ │     1 row demo, 4 Prizma
│ │       | ייחודיים | CTR% | הסרות | הסרה%        │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─ #short-links-drilldown (hidden by default) ──┐ │  ← Component 3 (secondary)
│ │ <div class="hidden">                             │ │     Visible only when
│ │   table: per-link drill-down                     │ │     broadcast row clicked
│ │ </div>                                           │ │     OR "show all" toggled
│ └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

Each section has a stable element id. RTL flow inherited from `<html dir="rtl">` in `crm.html`. Tailwind `space-y-4` between sections gives ~16px gaps. No `position: fixed` overlays. No grid-template-columns swaps. Mobile: each card is `w-full` + Tailwind responsive `md:` breakpoints for column-stacking inside Component 1's table.

**DOM-state rehearsed: yes — 4 stacked siblings inside #short-links-host, each `w-full` with explicit height by content; no overlap risk; mobile path = vertical stack + `overflow-x-auto` on the wider tables.**

---

## 1. Background + Root Cause

Per `modules/Module 4 - CRM/architecture-brief/M4_SHORT_LINKS_DASHBOARD_REDESIGN_BRIEF.md`:

Yesterday's hotfix (`M4_SHORT_LINKS_400_FIX`, closed 2026-05-20) made the tab structurally load again — the broken IN-clause query no longer hits PostgREST's 16KB URL ceiling. Once it loaded, the actual UX problem surfaced: the tab dumps every `short_link` ever created (7,009 on Prizma, ~99% with 0 clicks). Useless for daily operations.

**Daniel's daily-ops workflow:**
1. See which broadcasts have high engagement (CTR%, unsubscribe rate).
2. Filter out the noise (0-click rows).
3. Drill into specific broken links if needed.
4. See template-static infrastructure links (gateway, Waze) separately from broadcast links.

---

## 2. Goal

Redesign the tab from a flat 7,000-row list into a **3-component layered analytics view** on a single screen:
- **Component A** — Template-static card (top): the 6 shared infrastructure links with click counts.
- **Component B** — Broadcast aggregation table (primary): one row per broadcast in date range, with CTR% + unsubscribe rate%.
- **Component C** — Smart filter bar: "Only clicked links" ON by default + date range + link-type category.
- **Component D** — Drill-down link list (secondary, hidden by default): the existing flat table, scoped to a clicked broadcast.

After this SPEC: Daniel opens the tab → sees the 6 template-static rows in their dedicated card + 4-30 broadcast rows in Component B (filtered to clicks ≥ 1 by default) → optionally drills into per-link data via Component D.

---

## 3. Scope

### 3.1 In scope

**Frontend redesign of `modules/crm/crm-short-links-stats.js`.** Likely split into 4 sub-files under a new directory `modules/crm/crm-short-links-tiles/` if line count projects > 300 (Iron Rule 12):

| File | Responsibility | Est. lines |
|---|---|---|
| `crm-short-links-stats.js` (orchestrator) | host scaffold + tile coordination + shared state (filters, cache) | ~120 |
| `crm-short-links-tiles/broadcasts-table.js` | Component B (broadcast aggregation table) | ~140 |
| `crm-short-links-tiles/filter-bar.js` | Component C (filter chips state + UI) | ~70 |
| `crm-short-links-tiles/template-static-card.js` | Component A (top dedicated card) | ~80 |
| `crm-short-links-tiles/drilldown.js` | Component D (refactored from current renderTable + sortRows) | ~120 |

**Executor decides at implementation time** whether to split. If the orchestrator + components fit cleanly in a single file at ≤ 300 lines, that's allowed. If split, all sub-files use the IIFE-wrapped pattern and attach their entry function to `window`.

**Queries (read-only):**
- Existing: `short_links` filtered by `tenant_id` + `expires_at > now()` (already in place from hotfix).
- New: `short_link_clicks` aggregation joined with `crm_broadcasts` for Component B (verified 117ms on Prizma).
- New: `short_link_clicks` JOIN `short_links` filtered by `link_type='template_static'` for Component A.
- New: `short_link_clicks` filtered by `broadcast_id = <clicked-row-id>` for Component D drill-down (cached 5-min per broadcast_id × link_type pair in browser memory per D4).

**Components A through D as specified in §0.7 DOM layout.**

### 3.2 Out of scope (explicit)

- New DB tables, views, RPCs, or migrations (D7).
- Click-attribution to lead source / UTM (Phase 2.5 funnel-dashboard territory).
- Modifying short_link_clicks ingestion logic.
- Deleting old short_links rows.
- Change to unsubscribe-link generation logic.
- CSV export (deferred).
- Time-series chart of clicks over time.
- Modifications to any file outside `modules/crm/crm-short-links-stats.js` or `modules/crm/crm-short-links-tiles/*` (with one exception below).
- Edits to `crm.html` — host scaffold (`<div id="short-links-host">`) already exists at line 349. **One allowed addition:** if Executor splits into the tiles subdirectory, `crm.html` MUST get one new `<script src="modules/crm/crm-short-links-tiles/*.js"></script>` line per file inserted immediately after the existing `crm-short-links-stats.js` script tag at line 447. Limit: ≤ 4 new script tags. No other HTML edits.

### 3.3 Category mapping (codified per §0.1)

```javascript
// Used by Component C filter + Component B unsubscribe count.
var PER_RECIPIENT_TYPES = ['unsubscribe', 'registration', 'registration_url', 'test'];
var TEMPLATE_STATIC_TYPES = ['template_static'];
```

Filter chip "Link type" options: `All` (no filter) / `Per-recipient` (link_type IN PER_RECIPIENT_TYPES) / `Template-static` (link_type IN TEMPLATE_STATIC_TYPES).

### 3.4 Real-vs-raw metric separation (added F-BOT-NOISE amendment-3, 2026-05-20)

Daniel's live verification on Prizma surfaced that SMS-gateway link-preview bots (anti-phishing scanners, URL warming, message-preview fetchers) fire ~95% of clicks in the first 6 minutes after each broadcast send. Click-based metrics (count(*), DISTINCT lead_id, COUNT(link_type='unsubscribe')) all measure bot behavior more than human behavior on broadcasts to large audiences. Component B was misleading even on accurate data.

The fix: Component B exposes TWO columns per concept, raw vs real:

| Column | Source | Bot-polluted? | Use |
|---|---|---|---|
| `raw_clicks` | `COUNT(short_link_clicks)` | YES | Sanity check that sends fired |
| `unique_clickers` | `COUNT(DISTINCT short_links.lead_id)` via clicks | YES | Sanity check |
| `ctr_raw` | `raw_clicks / total_sent` | YES | Sanity check |
| `ctr_real` | `real_actions / total_sent` | NO | Marketing signal |
| `real_unsubs` | `COUNT(DISTINCT lead) WHERE lead.unsubscribed_at IN [b.created_at, +7d] AND lead has short_link for b` | NO | Marketing signal |
| `unsub_real_pct` | `real_unsubs / total_sent` | NO | Marketing signal |

**v1 scope:** `real_actions = real_unsubs`. So `ctr_real === unsub_real_pct` in v1. They diverge in v2 when registrations + purchases get added.

**Attribution window:** 7 days from `broadcast.created_at`. A lead unsubscribing more than 7d after a broadcast is unlikely to have been triggered by it (empirical heuristic; tunable in a future SPEC if Daniel finds it wrong).

**Why NOT count `link_type='unsubscribe'` clicks as "real unsubs":** because bot fetchers click the unsubscribe link too. The authoritative business-state signal lives in `crm_leads.unsubscribed_at` — that field is only set when the unsubscribe action is server-side confirmed via the unsubscribe page's POST handler, which bots typically do not complete.

**Visual emphasis:** raw columns rendered in `text-slate-500` (de-emphasized); real columns in `font-semibold` (signal-bearing). An amber-background explanatory caption sits between the section title and the table, reading: *"שים לב: המספרים הגולמיים כוללים בוטים שסורקים קישורי SMS (התראות, אבטחה, תצוגה מקדימה). ה-CTR האמיתי נמדד לפי פעולות שלקוחות ביצעו בפועל (כרגע: הסרה; בעתיד: גם הרשמה ורכישה)."*

**Live numbers measured at SPEC-author time (Prizma broadcast `מחר אירוע מאי 2026`):**

| Metric | Value |
|---|---|
| total_sent | 1,179 |
| raw_clicks | 427 |
| unique_clickers | 233 |
| ctr_raw | 36.2% |
| **real_unsubs** | **17** |
| **ctr_real** | **1.4%** |
| **unsub_real_pct** | **1.4%** |

Bot pollution: ~96% of click traffic.

---

## 4. Cross-Module Safety Audit (mirrored from Brief §4)

### 4.1 Touches

| Surface | Access | Reason |
|---|---|---|
| `modules/crm/crm-short-links-stats.js` | MODIFY | Refactor to orchestrator |
| `modules/crm/crm-short-links-tiles/*.js` | NEW (optional, line-count gated) | One file per component |
| `crm.html` | ≤ 4 new `<script>` lines (script tags only, no other edits) | Load split files |
| `short_links` | READ-ONLY (SELECT) | Existing access pattern |
| `short_link_clicks` | READ-ONLY (SELECT) | Existing access pattern |
| `crm_broadcasts` | READ-ONLY (SELECT) | New access for this SPEC |
| `crm_leads` | NONE | Removed from Brief scope — `lead_id` already lives on `short_links` directly; the JOIN to `crm_leads` is not required. |

### 4.2 EXPLICITLY NOT TOUCHED

| Surface | Confirmed unchanged |
|---|---|
| `crm_message_log`, `crm_message_queue`, `crm_message_templates`, `crm_automation_rules`, `crm_status_change_events`, `crm_capi_dispatch_queue` | not touched |
| Any EF (`send-message`, `dispatch-queue`, `automation-engine`, etc.) | not touched |
| Any DB trigger / function | not touched |
| Any RLS policy | not touched |
| Any other module (M1, M1.5, M2, M3) | not touched |
| `modules/crm/crm-init.js` and `modules/crm/crm-bootstrap.js` | not touched (existing `loadCrmShortLinksStats(slHost)` call stays the same entry point) |

### 4.3 Stop-trigger
If Executor pre-flight finds need to modify any item in §4.2 → STOP, escalate.

---

## 5. Success Criteria

| # | Criterion | Expected | Verify |
|---|---|---|---|
| 1 | Component B (broadcasts table) renders | ≥ 1 row on demo | Chrome MCP open tab; visual confirmation |
| 2 | CTR% formatted | "X.X%" (1 decimal); 0% allowed when clicks=0 | inspect rendered text |
| 3 | "Only clicked links" filter ON by default | toggle visible; default state = ON; OFF state shows hidden rows | Chrome MCP toggle interaction |
| 4 | Date range filter | Default = "Last 30 days"; preset chips = 7d / 30d / 90d / custom | Chrome MCP confirm chip labels |
| 5 | Link-type filter | 3 options: All / Per-recipient / Template-static | Chrome MCP confirm dropdown |
| 6 | Component A (template-static card) | Separate section above filter bar; ≥ 2 rows on demo, exactly 6 on Prizma | Chrome MCP |
| 7 | Component D (drill-down) hidden by default | `display: none` (or class `hidden`) on page load | DOM inspect |
| 8 | Drill-down expands on broadcast-row click | Click row → Component D becomes visible + populated | Chrome MCP click interaction |
| 9 | Mobile responsive | Component B table → card layout at < 768px; chips stack | Chrome MCP responsive viewport (375px) |
| 10 | All queries < 500ms p95 | Browser DevTools Network panel; measure 3 queries (broadcasts, template-static, drilldown) | DevTools timings |
| 11 | Smoke 8/8 PASS | `node tests/smoke/baseline.test.mjs` exits 0 with 8/8 | smoke output |
| 12 | Iron Rule 31 integrity gate | exit 0 | pre-commit hook |
| 13 | Iron Rule 32 destructive ops | 0 declared, 0 detected | pre-commit hook |
| 14 | Iron Rule 34 Chrome MCP triplet | mention "Chrome MCP" + screenshot reference + runtime trace in FOREMAN_REVIEW | pre-commit hook |
| 15 | Cross-Module Safety §4 holds | Reviewer confirms | review artifact |
| 16 | Working tree scope-clean post-commit | only pre-existing-unrelated paths dirty | `git status --short` |

---

## 6. Autonomy Envelope

### CAN
- Modify `modules/crm/crm-short-links-stats.js`.
- Create `modules/crm/crm-short-links-tiles/*.js` (up to 5 files including orchestrator).
- Add up to 4 `<script>` tags to `crm.html` (in the script-tag region near line 447 only).
- Issue read-only SELECT queries during Tester verification (no service-role keys used in browser; anon JWT only).
- Use Tailwind utility classes already in use across CRM module. No new CSS file.
- Use IIFE pattern matching the existing `crm-short-links-stats.js` (vanilla JS, no build step).
- Commit on develop. Push.

### MUST STOP
- Need to modify any DB object (table / view / RPC / trigger / RLS / function).
- Need to deploy or modify any Edge Function.
- Need to modify any file outside the declared scope in §4.1.
- Query p95 > 500ms on Prizma demo data (D7).
- Iron Rule 31 / 32 / 34 gates fail.
- Smoke regresses.
- Daniel-visible UI broken on demo (Chrome MCP shows blank state or console error).

---

## 7. Stop-Triggers (extended over Brief §8)

1. §4.3 violation (touching anything in §4.2).
2. Any query > 500ms p95 on Prizma data (D7 escalation — would need materialized view, scope creep).
3. Schema changes since this SPEC was authored (new `link_type` enum value, missing column on `crm_broadcasts`, etc.).
4. Smoke regression.
5. Iron Rule 12 file-size cap exceeded on any single file (300 target, 350 hard) — split into tiles subdirectory if needed.
6. PostgREST URL ceiling re-hit (any `.in()` with > 200 UUIDs would risk this — use chunked or inverted patterns per yesterday's hotfix lesson).
7. Chrome MCP server unreachable for the Tester step → escalate to Daniel for live verification (yesterday's IR34 bypass precedent applies).

---

## 8. Rollback Plan

Pure frontend revert. No DB, no EF, no schema. `git revert <commit>` and the tab returns to yesterday's flat-list (now-functional) state. Each commit in §12 is independently revertable.

---

## 9. Expected Final State

- `modules/crm/crm-short-links-stats.js` — refactored to orchestrator (~120 lines).
- `modules/crm/crm-short-links-tiles/` — new directory with 0-4 component files OR not created if Executor keeps everything in one file under 300 lines.
- `crm.html` — 0-4 new `<script>` lines after line 447. No other edits.
- 3-4 Chrome MCP screenshots saved under `_archive/M4_SHORT_LINKS_DASHBOARD_REDESIGN/verification/` (per IR34).
- `FOREMAN_REVIEW.md` documenting verification + 4 skill proposals (2 P-AUTHOR + 2 P-EXEC).
- Smoke + integrity + IR34 gates GREEN.
- Demo tenant: Daniel opens tab → 3 components render → filter toggle works → drill-down expand works.
- Prizma tenant: same, with the 6 template-static rows visible.

---

## 10. Pipeline

Standard Full-Auto:
1. **Foreman (Opus, this thread)** authors SPEC. ✅ done.
2. **Executor (opticup-executor, Sonnet)** implements components + filter logic + caches.
3. **Reviewer (opticup-reviewer, Sonnet)** validates Iron Rules 12/21/22/31/32/34 + Cross-Module Safety §4 + perf measurements from EXECUTION_REPORT.
4. **Localhost-Tester (opticup-localhost-tester, Sonnet)** runs smoke + Chrome MCP live verification on demo: opens tab, screenshots 3 components, toggles filter, clicks broadcast row, screenshots drill-down expansion. Saves runtime trace + 3-4 PNGs under `_archive/M4_SHORT_LINKS_DASHBOARD_REDESIGN/verification/`.
5. **Foreman closes** with FOREMAN_REVIEW.md (IR34-compliant, includes screenshots reference + runtime trace + 4 skill proposals).

---

## 11. Destructive Operations

**Count: 0.**

This SPEC is pure frontend additive work + read-only SELECT queries. No `DROP`, no `DELETE`, no `UPDATE`, no `ALTER`, no `git rebase`, no force-push, no mass file rename. Iron Rule 32 hook is expected to detect 0 destructive operations across the staged tree.

---

## 12. Commit Plan

C1 — Component B (broadcasts aggregation table) + category mapping + smart filter bar wiring. Includes new query, sort/filter state. File: orchestrator + broadcasts-table.js (+ optionally filter-bar.js).
> `feat(crm): M4_SHORT_LINKS_DASHBOARD_REDESIGN C1 — broadcast aggregation + smart filter`

C2 — Component A (template-static card). New dedicated card above filter bar.
> `feat(crm): M4_SHORT_LINKS_DASHBOARD_REDESIGN C2 — template-static dedicated card`

C3 — Component D (drill-down integration). Refactor existing renderTable into drill-down behavior + 5-min cache.
> `feat(crm): M4_SHORT_LINKS_DASHBOARD_REDESIGN C3 — drill-down integration + 5-min memory cache`

C4 — FOREMAN_REVIEW + EXECUTION_REPORT + FINDINGS + Chrome MCP screenshots.
> `docs(crm): M4_SHORT_LINKS_DASHBOARD_REDESIGN — close Pipeline + IR34 verification artifacts`

**Acceptable variation:** Executor may merge C1+C2+C3 into a single commit if it keeps the diff coherent. The 4-commit plan is a guideline, not a hard requirement. Hard requirement: C4 (docs commit) is separate so the implementation history is clean.

---

## 13. Cross-References

- `M4_SHORT_LINKS_400_FIX/` (closed 2026-05-20) — the URL-limit hotfix that made this tab functional again.
- `modules/Module 4 - CRM/architecture-brief/M4_SHORT_LINKS_DASHBOARD_REDESIGN_BRIEF.md` — Daniel's Brief.
- `roles/site-overseer/knowledge-build/funnel-q3/M2_FUNNEL_HEALTH_DASHBOARD_DATA_MODEL.md` — Phase 2.5 sibling tile; this SPEC's queries are reusable there.
- `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md` — no overlap (no automation touch).
- Iron Rules 12, 21, 22, 31, 32, 34.
- Existing index: `idx_short_link_clicks_tenant_broadcast_clicked` (covers the new aggregation query — 117ms p95 verified live).

---

## 14. Lessons Already Incorporated

- **From yesterday's M4_SHORT_LINKS_400_FIX P-AUTHOR-2:** PostgREST URL size limit (~16KB) is now part of project knowledge. Drill-down query uses `.eq('broadcast_id', id)` (single value, not `.in()`), so the new code cannot hit this ceiling.
- **From yesterday's M4_SMS_RATE_LIMIT_HOTFIX P-AUTHOR-2:** any DML > 10 rows requires snapshot. This SPEC declares 0 DML → no snapshot requirement.
- **From IR34 enforcement (yesterday's commit `e871f1a`):** Chrome MCP triplet must appear in FOREMAN_REVIEW for UI-touching SPECs. Tester step is explicitly tasked with producing the artifacts.
- **From Strategic Skill §5.3:** Runtime semantics rehearsed in §0.5 for 6 scenarios including null-broadcast_id clicks (51 Prizma rows).
- **From Strategic Skill §5.4:** DOM-state mental rehearsal in §0.7 — 4 stacked siblings, no overlay risk, mobile path traced.
- **From Strategic Skill Step 1.5 Cross-Reference Check:** 5 new names grepped, 0 collisions.

---

*End of SPEC. Hand off to Executor.*
