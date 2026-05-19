# TEST_REPORT — M4_PIXEL_VALIDATION_GAP_DASHBOARD

> **Tester:** opticup-localhost-tester (skill, v1)
> **SPEC ref:** `modules/Module 4 - CRM/docs/specs/M4_PIXEL_VALIDATION_GAP_DASHBOARD/SPEC.md`
> **Phase:** 4 of 5 (Full-Auto Pipeline)
> **Status:** 🟢 **GREEN** — all SPEC §3 criteria verified; Iron Rule 34 triplet captured.

---

## §0 Metadata

| Field | Value |
|---|---|
| Run timestamp | 2026-05-19 17:25–17:30 local (UTC+03) |
| Machine | 🖥️ Windows desktop (`C:\Users\User\opticup`) |
| Repo | `opticalis/opticup`, branch `develop`, HEAD `929bb4d` (Reviewer audit) |
| Sibling repo | `opticalis/opticup-storefront`, HEAD `4f5f328` (pixel-fired back-wire) |
| Browser | Chrome MCP (`mcp__chrome-devtools__*`) |
| Demo tenant_id | `8d8cfa7e-ef58-49af-9702-a862d459cccb` (slug=`demo`, PIN 12345) |
| Prizma tenant | `prizma` (resolved via `SELECT id FROM tenants WHERE slug='prizma'`) |
| Supabase project_id | `tsxrrxzmdxaenlvocyit` |
| Pipeline-coordination lock | `2026-05-19T14-23-25-189Z_M4_PIXEL_VALIDATION_GAP_DASHBOARD_pid-43308-8666713c.lock` |

---

## §1 Startup Result

```
=== Optic Up - Local Stack Launcher ===
ERP root:        C:\Users\User\opticup
Storefront root: C:\Users\User\opticup-storefront
ERP already up on :3000 - skipping launch
Storefront already up on :4321 - skipping launch

=== ALL UP ===
ERP:        http://localhost:3000
Storefront: http://localhost:4321
```

Both servers already up (no relaunch needed). Health-check: PASS.

---

## §2 Smoke 7/7 POST Result

```
opticup baseline smoke — 7 tests
Tenant: 8d8cfa7e-ef58-49af-9702-a862d459cccb (demo)

  PASS  1. PIN login returns JWT with tenant_id=demo  (922ms)
  PASS  2. Create CRM lead succeeds (M4)  (261ms)
  PASS  3. Read inventory count for demo tenant (M1)  (373ms)
  PASS  4. Storefront homepage returns 200  (1632ms)
  PASS  5. Storefront /supersale lead-form page returns 200  (957ms)
  PASS  6. Cross-module: lead from test-2 visible via crm_leads SELECT  (424ms)
  PASS  7. No 5xx on critical pages (HEAD only)  (1198ms)

7/7 passed, 0 failed
```

**Verdict:** 🟢 7/7 PASS.

---

## §3 Chrome MCP Demo Verification

### §3.1 Navigation flow

1. `mcp__chrome-devtools__select_page` → page 2 (`http://localhost:3000/crm.html?t=demo`).
2. Page redirect to `index.html?t=demo` (auth required) → clicked "🔒 התחברות".
3. PIN modal opened. Filled 5 single-digit boxes: `1` `2` `3` `4` `5`. JWT minted; redirected to ERP home with user "עובד בדיקה • סניף 00".
4. Clicked sidebar "📋 CRM — ניהול לידים" → navigated to `crm.html?t=demo`. CRM dashboard rendered (4 leads, 24 events).
5. Clicked sidebar "מרכז הודעות" → Messaging Hub sub-tabs strip appeared (📝 תבניות / ⚡ כללי אוטומציה / 📢 שליחה ידנית / 📜 היסטוריה / **📊 ביצועי הודעות**).
6. Clicked "📊 ביצועי הודעות" → tile rendered above the existing performance table (the SPEC's D-AUTH-1 embed).

### §3.2 Tile render — populated state on demo

Tile HTML (extracted via `evaluate_script`):
```
📡 פער פיקסל / CAPI
[ סה"כ CAPI: 3 ] [ בפער: 2 ] [ פיקסל אושר: 1 ]
טרנד 7י׳: 05-15:1 | 05-18:1
[ צפה ברשימת הלידים המושפעים ]
```

**Screenshot:** `artifacts/01_demo_tile_populated.png`

### §3.3 `window.__pixelGapTrace` JSON dump (Iron Rule 34 part b)

Captured via `JSON.stringify(window.__pixelGapTrace)` after tile load + drill-down open:

```json
{
  "aggregate": {
    "start_ms": 1779200771095,
    "end_ms":   1779200771472,
    "row_count": 25
  },
  "trend": {
    "start_ms": 1779200771472,
    "end_ms":   1779200771678,
    "row_count": 4
  },
  "drilldown": {
    "start_ms": 1779200801687,
    "end_ms":   1779200801963,
    "row_count": 2
  }
}
```

Durations: aggregate **377ms**, trend **206ms**, drilldown **276ms**. All 3 entries have `start_ms` + `end_ms` + `row_count` as required by SPEC §3 criterion 13b. Row counts match the underlying SELECT rowsets (verified in §5 below).

### §3.4 Drill-down modal — populated state

Clicked "צפה ברשימת הלידים המושפעים" (`window.openPixelGapDrillDown()`).

Modal opened with:
- **Title:** "פערי פיקסל — לידים מושפעים" ✅
- **Headers:** שם / טלפון / תאריך / סטטוס CAPI / שגיאה ✅
- **2 rows visible:**
  1. `TEST35353 | +972500000011 | 2026-05-18 | sent`
  2. `Localhost Tester E2E | +972503348349 | 2026-05-15 | skipped_no_token | no fb_capi_token configured for tenant in storefront_config.analytics`

**Screenshot:** `artifacts/02_demo_drilldown_populated.png`

### §3.5 Console errors

`mcp__chrome-devtools__list_console_messages` (filtered to `error` + `warn`):
- 0 errors.
- 2 warnings, both **pre-existing infrastructure** (not from this SPEC's code):
  1. `cdn.tailwindcss.com should not be used in production` — Tailwind CDN dev-mode warning (project-wide).
  2. `GoTrueClient ... Multiple GoTrueClient instances detected` — known Supabase JS multi-instance warning (project-wide; pre-dates this SPEC by months).

**Verdict:** 🟢 0 SPEC-related errors. SPEC §3 criterion 6a/6b expectation met.

---

## §4 Chrome MCP Prizma Verification — DEFERRED

**Status:** Live Chrome MCP run on Prizma DEFERRED to Foreman / Daniel manual check.

**Reason:** PIN 12345 is the demo-tenant test PIN. Prizma is the production tenant — I do not have Prizma operator credentials, and the localhost-tester skill explicitly forbids writes/auth attempts on Prizma production data ("Demo tenant only. Never run any test against Prizma production").

**Compensating evidence (Supabase MCP read-only — Iron-Rule-safe):**

Prizma aggregate counters as the tile would compute them — see §5 below (Q1-Prizma block). The tile on Prizma would render:
```
[ סה"כ CAPI: 30 ] [ בפער: 30 ] [ פיקסל אושר: 0 ]
```
586 rows in the 30-day window. This matches the SPEC §3 criterion 6b populated-state expectation. Daniel can verify by logging into Prizma + Messaging Hub + 📊 ביצועי הודעות sub-tab in his own session.

**Recommendation to Foreman:** in FOREMAN_REVIEW.md, note that Prizma live UI screenshot is deferred; the underlying data (30 gap rows) was confirmed via read-only SQL.

---

## §5 DB-Query Evidence (Iron Rule 34 part c)

### §5.1 Q1 — Aggregate (demo)

**SQL fired by tile** (verbatim from `crm-pixel-gap-tile.js` lines 20–21):
```sql
SELECT fb_event_id, fb_pixel_fired_at
FROM crm_leads
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid
  AND created_at >= NOW() - INTERVAL '30 days'
  AND created_at < NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

**Result:** 25 rows (matches `trace.aggregate.row_count: 25`).

| fb_event_id (truncated) | fb_pixel_fired_at | bucket |
|---|---|---|
| `500cc956...` | NULL | **gap** |
| `b2f7059a...` | NULL | **gap** |
| `a1b2c3d4...` | `2026-05-16 04:52:46` | **fired** |
| (22 more rows with `fb_event_id=NULL` — not counted) | | |

JS-side reduce: `total=3, gap=2, fired=1`. Matches tile render exactly.

### §5.2 Q2 — 7-day trend (demo)

**SQL fired by tile** (verbatim from lines 28–29):
```sql
SELECT created_at, fb_event_id, fb_pixel_fired_at
FROM crm_leads
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid
  AND created_at >= NOW() - INTERVAL '7 days'
  AND created_at < NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

**Result:** 4 rows (matches `trace.trend.row_count: 4`).

| created_at | fb_event_id | fb_pixel_fired_at | gap? | bucket-day |
|---|---|---|---|---|
| 2026-05-18 13:56 | `500cc956...` | NULL | ✅ | 05-18 |
| 2026-05-15 19:56 | `b2f7059a...` | NULL | ✅ | 05-15 |
| 2026-05-15 19:40 | `a1b2c3d4...` | 2026-05-16 | (fired) | — |
| 2026-05-14 14:02 | NULL | NULL | — | — |

JS-bucket: `{ '05-15': 1, '05-18': 1 }` → trend label "05-15:1 | 05-18:1". Matches tile.

### §5.3 Q3 — Drill-down (demo)

**SQL fired by drill-down** (verbatim from PostgREST `.select(...crm_capi_dispatch_queue!left(...)...)` lines 57–61):
```sql
SELECT
  l.id, l.full_name, l.phone, l.created_at, l.fb_event_id,
  q.status AS capi_status, q.error_message AS capi_error
FROM crm_leads l
LEFT JOIN crm_capi_dispatch_queue q
  ON q.lead_id = l.id AND q.tenant_id = l.tenant_id
WHERE l.tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid
  AND l.fb_event_id IS NOT NULL
  AND l.fb_pixel_fired_at IS NULL
  AND l.created_at >= NOW() - INTERVAL '30 days'
  AND l.created_at < NOW() - INTERVAL '1 hour'
ORDER BY l.created_at DESC
LIMIT 100;
```

**Result:** 2 rows (matches `trace.drilldown.row_count: 2` and the rendered table).

| full_name | phone | created_at | fb_event_id | capi_status | capi_error |
|---|---|---|---|---|---|
| TEST35353 | +972500000011 | 2026-05-18 13:56 | `500cc956...` | `sent` | — |
| Localhost Tester E2E | +972503348349 | 2026-05-15 19:56 | `b2f7059a...` | `skipped_no_token` | no fb_capi_token configured for tenant in storefront_config.analytics |

### §5.4 Q1-Prizma — Aggregate (Prizma, read-only sanity)

```sql
SELECT
  COUNT(*) FILTER (WHERE fb_event_id IS NOT NULL) AS total_with_event_id,
  COUNT(*) FILTER (WHERE fb_event_id IS NOT NULL AND fb_pixel_fired_at IS NULL) AS gap_count,
  COUNT(*) FILTER (WHERE fb_event_id IS NOT NULL AND fb_pixel_fired_at IS NOT NULL) AS pixel_fired_count,
  COUNT(*) AS rows_in_window
FROM crm_leads
WHERE tenant_id = (SELECT id FROM tenants WHERE slug='prizma')
  AND created_at >= NOW() - INTERVAL '30 days'
  AND created_at < NOW() - INTERVAL '1 hour';
```

**Result:** `total_with_event_id=30, gap_count=30, pixel_fired_count=0, rows_in_window=586`.

Reflects current Prizma state (P2.1 substrate live since 2026-05-15; back-wire shipped 2026-05-19 but pixel-fire stamping requires the storefront thank-you page to fire pixel + POST to `pixel-fired` EF — Prizma has not yet had a thank-you-page session that completed the loop, hence `pixel_fired_count=0`).

---

## §6 0-State Code-Read Evidence (SPEC §3 criterion 6a + 8)

Tile cannot exercise the 0-state branch on demo right now because `total = 3` (demo has 3 leads with `fb_event_id IS NOT NULL`). The 0-state branch is reachable via the same code path when a fresh tenant has 0 such leads.

**Code-read evidence:** `modules/crm/crm-pixel-gap-tile.js` line 35:
```js
if (!total) { b.innerHTML = '<p class="text-slate-500 py-2">אין נתונים עדיין — לא נשלחו עדיין אירועי CAPI לפייסבוק</p>'; return; }
```

Branch fires when `total === 0` after the JS reduce of Q1 rows. Hebrew empty-state string matches SPEC §3 criterion 6a exactly.

**Drill-down 0-state (SPEC §3 criterion 8):** line 91 ternary branch when `leads.length === 0`:
```js
: '<div class="text-center py-6 text-slate-500">אין לידים בפער כעת</div>'
```

Hebrew empty-state string matches SPEC §3 criterion 8 exactly. Not exercised live today (demo has 2 gap rows); will fire on any tenant with `total > 0` but `gap_count = 0`.

---

## §7 Drill-Down Modal Close-Mechanism Verification

All 3 close mechanisms tested in sequence:

| # | Mechanism | Method | Result |
|---|-----------|--------|--------|
| 1 | **ESC key** | `mcp__chrome-devtools__press_key` "Escape" | Modal closed cleanly. `document.querySelector('.modal-overlay')` returns `null` post-press. |
| 2 | **Backdrop click** | Re-opened modal; dispatched native `MouseEvent('mousedown')` on `.modal-overlay` with `target === overlay`. (`shared/js/modal-builder.js` line 113–116: backdrop handler listens to `mousedown` when `e.target === overlay`.) | Modal closed cleanly. `overlayInDom: false`. |
| 3 | **✕ close button** | Re-opened modal; queried `.modal-overlay button.modal-close[aria-label="סגור"]` → found. `.click()` invoked. | Modal closed cleanly. `modalGone: true`. |

All 3 paths verified working. No zombie modal-overlay nodes left in DOM after any close.

---

## §8 Iron Rule 34 Triplet Checklist

| Artifact | Status | Evidence location |
|---|---|---|
| (a) Chrome MCP screenshot — tile working | ✅ | `artifacts/01_demo_tile_populated.png` (tile populated state) |
| (a) Chrome MCP screenshot — drill-down modal | ✅ | `artifacts/02_demo_drilldown_populated.png` (modal populated state) |
| (b) `window.__pixelGapTrace` runtime trace | ✅ | §3.3 — 3 entries (aggregate / trend / drilldown), each with start_ms/end_ms/row_count |
| (c) DB-query evidence — 3 SQL + result blocks | ✅ | §5.1 (Q1) + §5.2 (Q2) + §5.3 (Q3); Prizma sanity block in §5.4 |

**Iron Rule 34 verdict:** ✅ **TRIPLET COMPLETE.** All three artifacts attached. SPEC is closable per Iron Rule 34.

---

## §9 SPEC §3 Criteria Verdict

| # | Criterion | LH-Tester verdict | Evidence |
|---|-----------|------------------|----------|
| 6a | 0-state Hebrew placeholder | ✅ (code-read) | §6 — line 35 branch exact-match |
| 6b | Populated-state aggregate render | ✅ | §3.2 demo render + §5.4 Prizma SQL confirm |
| 6c | 7-day trend as sparkline OR list | ✅ | §3.2 — "טרנד 7י׳: 05-15:1 \| 05-18:1" badge-list form |
| 7 | Drill-down Modal title + ESC + backdrop + ✕ | ✅ | §3.4 title match + §7 all 3 close mechanisms |
| 8 | Drill-down 0-row Hebrew empty-state | ✅ (code-read) | §6 — line 91 branch exact-match |
| 9 | Drill-down populated state ≤ 100 rows | ✅ | §3.4 rendered 2 rows; §5.3 SQL has `LIMIT 100` |
| 13a | Iron Rule 34 — ≥ 2 Chrome MCP screenshots | ✅ | §8 — 2 screenshots saved |
| 13b | Iron Rule 34 — `window.__pixelGapTrace` JSON | ✅ | §3.3 — full JSON dump |
| 13c | Iron Rule 34 — DB-query evidence | ✅ | §5 — 4 SQL+result blocks (Q1 demo, Q2 demo, Q3 demo, Q1 Prizma) |
| 19 | Smoke 7/7 PASS post-state | ✅ | §2 — 7/7 PASS |

**Verdict on all LH-Tester-owned criteria:** ✅ ALL PASS.

---

## §10 Smoke Cleanup Confirmation

I inserted **zero** test rows during this verification. The 2 gap rows on demo (`TEST35353` + `Localhost Tester E2E`) are pre-existing — `Localhost Tester E2E` was created earlier (2026-05-15) by the M3_FUNNEL_PIXEL_BACKWIRE / M4_FB_CAPI_HYBRID_DEDUPLICATION smoke runs and intentionally retained as production-relevant demo data; `TEST35353` was created 2026-05-18 by Daniel's manual storefront test.

Post-smoke cleanup probe (15-minute window on demo `crm_leads`):
```sql
SELECT id, full_name, phone, created_at
FROM crm_leads
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid
  AND created_at >= NOW() - INTERVAL '15 minutes'
ORDER BY created_at DESC;
```
**Result:** `[]` (0 rows). The baseline smoke test (§2 test 2) created + deleted its own row cleanly. No residue.

**Cleanup verdict:** ✅ no residue.

---

## §11 Findings

### F-LH-1 — Prizma live UI deferred (INFO)

Live Prizma Chrome MCP verification not performed — LH-Tester lacks Prizma operator PIN, and the skill forbids writes/auth attempts on production. Compensating Supabase MCP read-only sanity (§5.4) confirms the tile's Q1 against Prizma returns the populated state expected by SPEC §3 criterion 6b (30 / 30 / 0). Foreman or Daniel can complete live Prizma verification in a follow-up session.

### F-LH-2 — Demo currently has 2 gap rows (not 0)

D-AUTH-3 in the SPEC predicted demo would be in the 0-state (no `fb_event_id` writes on demo because demo has no FB token + storefront generates UUIDs only on live `/supersale/`). Reality: demo has 3 leads with `fb_event_id` because prior SPEC smoke runs intentionally seeded `fb_event_id` values via direct INSERT (M4_FB_CAPI_HYBRID_DEDUPLICATION) or via manual storefront submissions through demo. The 0-state branch is therefore not exercised live today, but its code path is verified in §6.

### F-LH-3 — Backdrop click via synthetic event requires target=overlay

The modal's backdrop handler listens to `mousedown` (not `click`) on `.modal-overlay`, filtering `e.target === overlay`. A naive `dispatchEvent(new MouseEvent('click'))` does NOT close the modal; only `mousedown` with the overlay as target does. Synthetic `mousedown` confirmed closes modal; a real human pointer click would dispatch both `mousedown` and `click`, which also closes (the mousedown fires first and closeFn runs synchronously). Documented for future Pipeline tests that may mock backdrop clicks — use `mousedown`, not `click`.

### F-LH-4 — No findings against the SPEC itself

All §3 criteria PASS. No regressions introduced. No code changes needed.

---

## §12 Verdict + Hand-off

🟢 **GREEN — handing back to Foreman (opticup-strategic) for FOREMAN_REVIEW.md.**

- Smoke 7/7 PASS post-state.
- Iron Rule 34 triplet captured (2 screenshots + window.__pixelGapTrace JSON + 3 DB-query evidence blocks).
- All LH-Tester-owned SPEC §3 criteria PASS (10/10).
- Drill-down close mechanisms all working (ESC + backdrop + ✕).
- 0-state code path verified by code-read; no live tenant available to exercise it today.
- 0 SPEC-related console errors.
- Smoke cleanup clean (no residue).

**Foreman closure notes:**
- Prizma live UI verification deferred (F-LH-1). Recommended action: Daniel walks Prizma's Messaging Hub → 📊 ביצועי הודעות sub-tab in next session and confirms the rendered numbers match §5.4's SQL counts (30 / 30 / 0).
- Reviewer's INFO concerns #1 (`check_in_attendee_sms_he` template) + #3 (pre-existing dirty paths) still outstanding for Foreman/Daniel disposition.
- FINDINGS F-4 (index revisit at scale milestone) — already captured by Executor + endorsed by Reviewer; needs TECH_DEBT.md row at closure.

---

*End of TEST_REPORT.*
