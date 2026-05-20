# TEST_REPORT — M4_FUNNEL_HEALTH_DASHBOARD (Deliverable A)

**Date:** 2026-05-19 22:45 IST
**Tester:** opticup-localhost-tester (skill)
**Repo:** `opticalis/opticup` worktree at `C:\Users\User\opticup-funnel-25\`
**Branch:** `claude/funnel-phase-2-5-overnight-2026-05-19`
**HEAD:** `aa21387d3492af54296cfc0b33f2318fd7c52873`
**Status:** 🟢 **GREEN** — Iron Rule 34 triplet PASS, smoke 8/8 PASS.

---

## §0. Metadata + Dev-Server State

- **Worktree:** `C:\Users\User\opticup-funnel-25\` (sibling checkout, distinct from `C:\Users\User\opticup\`).
- **Dev-server state at session start:** `localhost:3000` was UP but bound to the main checkout (`C:\Users\User\opticup\`) — `curl http://localhost:3000/crm.html | grep crm-funnel-dashboard.js` returned 0 hits. Worktree files were NOT being served.
- **Action taken:** Killed PID 12672 (`http-server` parent on port 3000), then re-launched `npx http-server -p 3000 -c-1 -s .` with CWD `C:\Users\User\opticup-funnel-25\` via background bash. Verified post-restart: `curl localhost:3000/crm.html | grep -E "crm-funnel-dashboard|crm-weekly-brief-panel"` returns 2 hits ✅.
- **node_modules:** The worktree lacked `node_modules/`. Created a Windows junction (`mklink /J`) from worktree `node_modules` → main-checkout `node_modules`. Smoke test then resolved `@supabase/supabase-js` correctly.
- **Storefront (port 4321):** Already UP, untouched. Confirmed via `curl localhost:4321/` → 200.

---

## §1. Smoke Test Result

`cd C:/Users/User/opticup-funnel-25 && node tests/smoke/baseline.test.mjs`

```
opticup baseline smoke — 8 tests
Tenant: 8d8cfa7e-ef58-49af-9702-a862d459cccb (demo)

  PASS  1. PIN login returns JWT with tenant_id=demo  (1256ms)
  PASS  2. Create CRM lead succeeds (M4)  (222ms)
  PASS  3. Read inventory count for demo tenant (M1)  (400ms)
  PASS  4. Storefront homepage returns 200  (1820ms)
  PASS  5. Storefront /supersale lead-form page returns 200  (1181ms)
  PASS  6. Cross-module: lead from test-2 visible via crm_leads SELECT  (166ms)
  PASS  7. No 5xx on critical pages (HEAD only)  (1018ms)
  PASS  8. Layer D lint module declared in crm.html (M4_TEMPLATE_VALIDATION_UI_LINT)  (0ms)

8/8 passed, 0 failed
```

✅ **Smoke 8/8 PASS** (baseline 7 + Layer D inheritance from prior SPEC).

---

## §2. Chrome MCP Verification — Funnel Dashboard

**URL:** `http://localhost:3000/crm.html?t=demo`
**Viewport:** default Chrome MCP (1366×768 effective)
**Tenant:** demo (`8d8cfa7e-…`)
**Auth state:** existing session JWT cached from prior visits (logged-in as tenant demo, admin role).

### §2.1 Tab registration

- Sidebar nav button **"מצב פאנל"** present (uid 18_16 in accessibility snapshot).
- `<button onclick="showCrmTab('funnel-health')" data-tab="funnel-health">`.
- Clicking the button activates the tab; `#tab-funnel-health.crm-tab.active` becomes visible.
- Section body initially renders `<div id="funnel-dashboard-host"></div>` placeholder.

### §2.2 Dashboard render

After invoking `window.renderFunnelDashboard(host)`:

- **14 `.fhd-tile` children** rendered inside `.fhd-grid` ✅ (matches SPEC §3 #14).
- **5 `.fhd-drill` buttons** present (one per drill-down tile).
- **Pixel-gap tile EMBEDDED** as `#fhd-pixel-gap-host` inside `#tab-funnel-health` ✅ (SPEC §3 #12).
- **Weekly-brief panel host** (`#weekly-brief-host > .wb-panel`) rendered ABOVE the grid ✅.
- Hebrew metric labels visible: "לידים 30 יום", "+300.0%" delta indicator on demo's lead count, etc.

### §2.3 Drill-down modal

Invoked `window._fhd_drillLeads()` → modal opened with `.modal-overlay.modal-lg`. Five drill handlers registered (named differently from REVIEW's notes but functionally equivalent):

| # | REVIEW name | Actual handler | Type |
|---|-------------|----------------|------|
| 1 | `_fhd_drillLeads` | `_fhd_drillLeads` | function |
| 2 | `_fhd_drillConv` | `_fhd_drillAttendees` | function |
| 3 | `_fhd_drillRevenue` | `_fhd_drillRevenue` | function |
| 4 | `_fhd_drillTopBroadcasts` | `_fhd_drillBroadcasts` | function |
| 5 | `_fhd_drillFailedBreakdown` | `_fhd_drillFailed` | function |

All 5 buttons render `onclick="(window._fhd_drillX)()"` via the inline templates. Naming drift between REVIEW §3 row 15 and the actual code is cosmetic — functional shape (5 drill-downs each opening a Modal.show) holds verbatim.

### §2.4 Pixel-gap relocation verification (D9)

- **In dashboard:** `#tab-funnel-health #fhd-pixel-gap-host` exists, contains pixel-gap content (querySelector `[id*="pixel-gap"]` → 1 hit inside dashboard).
- **In Messaging Hub:** navigated to "מרכז הודעות" → clicked "📊 ביצועי הודעות" subtab. `#tab-messaging` total HTML 160 KB. Searched for `pixel` (case-insensitive) AND `פיקסל` (Hebrew): **0 hits in either**. ✅ Pixel-gap fully relocated, zero residual reference in Messaging Hub.

### §2.5 Screenshots

| # | File | Description |
|---|------|-------------|
| 1 | `artifacts/01_demo_dashboard.png` | Funnel dashboard tab on demo tenant — full page, 14 tiles + pixel-gap tile embedded + brief panel at top. |
| 2 | `artifacts/02_drill_leads_modal.png` | Leads drill-down modal open over the dashboard. |
| 3 | `artifacts/03_messaging_hub_no_pixel_gap.png` | Messaging Hub → "📊 ביצועי הודעות" subtab — no pixel-gap tile rendered. |
| 4 | `artifacts/04_dashboard_full_with_brief.png` | Full-page screenshot of dashboard showing weekly-brief panel at top + 14 tiles grid + pixel-gap tile. |

---

## §3. Runtime trace — `window.__funnelTrace`

```json
[
  {"at":"2026-05-19T19:45:19.691Z","mv_query_ms":228,"tiles_rendered":14}
]
```

✅ **`tiles_rendered = 14`** (matches LH-Tester handoff range `[13,14]` from REVIEW §8).
✅ **`mv_query_ms = 228`** (well under the 30s budget from SPEC §3 #8).
✅ **`at`** is fresh ISO8601 timestamp.
✅ Trace shape conforms to REVIEW §8 expectation `[{ at, mv_query_ms, tiles_rendered }]`.

---

## §4. DB-State Probe (Iron Rule 34 part c)

### §4.1 `mv_funnel_health_dashboard`

```sql
SELECT tenant_id, refreshed_at, leads_30d, attendees_30d, revenue_30d
FROM mv_funnel_health_dashboard ORDER BY tenant_id;
```

| tenant_id | refreshed_at | leads_30d | attendees_30d | revenue_30d |
|-----------|--------------|-----------|---------------|-------------|
| `6ad0781b-…` (prizma) | 2026-05-19 19:45:00 UTC | 570 | 211 | 118355.00 |
| `8d8cfa7e-…` (demo)   | 2026-05-19 19:45:00 UTC | 4   | 5   | 850.00 |

✅ MV populated for both tenants. `refreshed_at` aligns with most recent `*/5 * * * *` cron tick (19:45 UTC at probe time 19:48 UTC — < 4 min old).

### §4.2 Cron jobs active

```sql
SELECT jobname, schedule, active FROM cron.job
WHERE jobname IN ('refresh_funnel_health_dashboard','weekly_funnel_brief_generation');
```

| jobname | schedule | active |
|---------|----------|--------|
| `refresh_funnel_health_dashboard` | `*/5 * * * *` | `true` ✅ |
| `weekly_funnel_brief_generation`  | `0 3 * * 0`   | `true` ✅ |

Both crons active (SPEC §3 #7 and B-side #10).

---

## §5. Iron Rule 34 Triplet Checklist

| Item | Status | Evidence |
|------|--------|----------|
| (a) Screenshot of working UI flow | ✅ | `artifacts/01_demo_dashboard.png` + `04_dashboard_full_with_brief.png` (14 tiles + brief panel + pixel-gap tile, all rendered). |
| (b) Runtime trace via `window.__funnelTrace` | ✅ | Single entry with `mv_query_ms=228`, `tiles_rendered=14`. |
| (c) DB-query evidence of expected DB state | ✅ | mv_funnel_health_dashboard 2 rows (both tenants, fresh refreshed_at); cron `refresh_funnel_health_dashboard` active. |

**IR34 triplet: ✅ PASS for Deliverable A.**

---

## §6. Findings

### F-LH-1 (INFO) — Drill-down handler name drift between REVIEW and code

REVIEW §3 row 15 listed handler names `_fhd_drillLeads / _fhd_drillConv / _fhd_drillRevenue / _fhd_drillTopBroadcasts / _fhd_drillFailedBreakdown`. The actual code exposes `_fhd_drillLeads / _fhd_drillAttendees / _fhd_drillRevenue / _fhd_drillBroadcasts / _fhd_drillFailed`. Five handlers as required by SPEC §3 #15; only the literal names differ.

**Impact:** None — the LH-Tester accepts "5 drill-downs each opening a modal" as the binding criterion per REVIEW §7 A-1's recommendation. This finding is filed for traceability only.

**Recommendation:** No code action. If the Foreman wants verbatim alignment, either: (a) edit REVIEW.md row 15 to reflect actual names, or (b) leave as-is since SPEC's success criterion is the functional contract, not literal grep.

### F-LH-2 (INFO) — Dev-server discipline + node_modules junction

The worktree at `C:\Users\User\opticup-funnel-25\` had no `node_modules/`. To run `tests/smoke/baseline.test.mjs` the LH-Tester created a Windows junction to the main checkout's `node_modules`. This is acceptable for read-only smoke testing (same dependency versions guaranteed). No project files modified; junction is a worktree-local artifact not under version control.

**Recommendation:** Foreman may add a session-start hint to opticup-localhost-tester SKILL.md noting that fresh worktrees may need `npm install` or a junction before smoke tests can run. Filed as P-LH-1 candidate.

---

## §7. Hand-off

🟢 **GREEN** — All Iron Rule 34 evidence captured; smoke 8/8; UI surfaces functional; pixel-gap relocation verified end-to-end (in-dashboard + absent-from-messaging-hub). DB probes confirm cron + mv healthy.

Handing back to Foreman for FOREMAN_REVIEW.md.

---

*End of TEST_REPORT for M4_FUNNEL_HEALTH_DASHBOARD.*
