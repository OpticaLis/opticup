# SHORT_LINKS_400_INVESTIGATION_REPORT — Read-only Diagnosis

> **Status:** Investigation only. NO code changes. NO DB writes. NO EF deploys.
> **Authored by:** opticup-strategic (Foreman, M4)
> **Authored on:** 2026-05-20
> **Trigger:** Daniel reproduced live — `crm.html?t=demo` → click "קישורים קצרים" → red "שגיאה בטעינה: Bad Request" within ~1s, on demo AND on Prizma production.

---

## 1. Exact Root Cause

**File:** `modules/crm/crm-short-links-stats.js` lines 54-76 (`loadData()`).

Query path (verbatim):

```js
// Query 1 — fetch every live short_link id for the tenant
var linksRes = await sb.from('short_links')
  .select('id, code, target_url, link_type, broadcast_id, created_at, click_count')
  .eq('tenant_id', tid)
  .gt('expires_at', new Date().toISOString());
// ... 806 rows on demo, 7,009 rows on Prizma ...

// Query 2 — aggregate clicks per link via IN clause on every link id
var linkIds = links.map(function (l) { return l.id; });
var clicksRes = await sb.from('short_link_clicks')
  .select('short_link_id, clicked_at, broadcast_id')
  .eq('tenant_id', tid)
  .in('short_link_id', linkIds);   // ← THIS is the failing query
```

**Why it fails:**
- PostgREST translates `.in('short_link_id', linkIds)` into a URL of the form `&short_link_id=in.(uuid1,uuid2,uuid3,...)`.
- Each UUID is 36 chars + 1 comma separator ≈ 37 chars per id.
- Demo: 805 live links × 37 ≈ **~30KB URL**.
- Prizma: 7,009 live links × 37 ≈ **~260KB URL**.
- PostgREST + Supabase reject URLs above ~8-16KB with `400 Bad Request` (the standard envoy/postgrest URL-length guardrail).
- Result: both tenants hit the 400 on every page-open of the tab.

**Why the existing `expires_at > now()` filter doesn't help:** the `newest_expiry` on both tenants is `2099-12-31` and the oldest active expiry is well in the future (Prizma: `2026-08-01`; demo: `2026-05-14`). Demo has 805 / 806 = **99.9% of links currently live**; Prizma has **100% of links currently live (7,009 / 7,009)**. The expires_at filter is essentially a no-op at present scale. Total link count grows roughly linearly with broadcasts shipped, so the bug worsens over time, not better.

**Architecture mismatch (the real design issue):**
- The query asks "for every one of N links, give me its clicks" — fetching the IDs upfront then filtering by them.
- Actual click cardinality is tiny: **15 clicks total on demo, 47 total on Prizma.** That's 150× fewer rows than the IDs sent in the URL.
- The query should be inverted: fetch all clicks for the tenant in ONE query (single `WHERE tenant_id = $1`), then map them to links client-side. The existing index `idx_short_link_clicks_tenant_id_clicked_at` already covers this pattern at sub-millisecond.

---

## 2. Scope of Impact

### Tenant counts (live DB probe 2026-05-20)

| Tenant | Live links (`expires_at > NOW()`) | Total links | Click rows | Distinct links clicked | URL size of IN clause |
|---|---|---|---|---|---|
| demo | **805** | 806 | 15 | 13 | **~30KB** (over PostgREST ~16KB limit) |
| prizma | **7,009** | 7,009 | 47 | 26 | **~260KB** (>>> limit) |

### Threshold at which it broke

- PostgREST URL limit is typically ~8-16KB (configurable but the Supabase default is in that range).
- The query breaks once `live_links > ~200-400` UUIDs.
- Demo crossed that threshold roughly when the storefront started inserting short_links at scale (post M3_SHORTGY_TO_INTERNAL_REDIRECT shipping, 2026-05-14).

### Was it always broken?

- File introduced: commit `bd950a8 feat(m4,erp): add MVP Short Link Stats tab in CRM` on **2026-05-14 20:29:36 +0300**.
- That same SPEC (`M3_SHORTGY_TO_INTERNAL_REDIRECT`) migrated all customer-facing short-links from `short.gy` to the internal `/r/<code>` system, which started auto-inserting `short_links` rows per broadcast.
- The MVP UI was tested with a small data set at SPEC author time. The query worked fine until the table grew past ~200-400 live links — likely happening within hours of the SPEC's first production broadcast.
- **The bug has been latent + broken on Prizma for ~6 days.** Daniel just noticed it after the recent Phase 2.5 work made the "קישורים קצרים" tab dispatch correctly (prior to today's hotfix, the tab didn't render at all — the wrapper-shadow bug masked it; with the hotfix landed, the 400 surface now reveals the underlying query bug).

### Why the regression is visible NOW and not when shipped

The funnel-tab hotfix `ddcbe47` (committed earlier today, in develop now, not yet on main) made `showCrmTab('short-links')` correctly dispatch to `loadCrmShortLinksStats()`. **Before the hotfix the entire tab was empty** (also broken, just for a different reason — the dispatcher didn't fire). Now that the dispatcher works, the 400 surfaces.

---

## 3. Affected Feature Surface

### Direct consumer of the broken query
- ONLY `modules/crm/crm-short-links-stats.js` — the "קישורים קצרים" tab UI.
- No other JS file does `.in('short_link_id', ...)`.

### Other consumers of `short_link_clicks` (live DB inventory)
1. **`v_crm_message_performance` view** — LEFT JOINs `short_link_clicks ON short_link_id = sl.id` via DB-side JOIN. **Safe** — DB-side joins don't pass UUID lists through URL.
2. **`resolve-link` Edge Function** — INSERTs a click row per `/r/<code>` redirect. Writes only; no SELECT pattern at risk.
3. **`crm_lead_touchpoints` chain** (per P1.1+P1.2 wiring) — DB triggers + EF code; no `.in('short_link_id', ...)` shape.
4. **`crm_broadcasts.total_sent` refresh cron** — aggregates `crm_message_log` (NOT `short_link_clicks`). Unaffected.

### Other places with potentially-unbounded `.in()` calls (latent bug-class audit)

Codebase scan of all `.in(<col>, <array>)` patterns in `modules/crm/`:

| File | Line | Pattern | Bounded? | Risk |
|---|---|---|---|---|
| `crm-messaging-broadcast-queue.js` | 44 | `.in('id', chunk)` | YES — explicit `LEAD_FETCH_CHUNK = 200` (file header line 10 documents the SAME bug class: "(a) overflowed PostgREST URL via .in('id', [1000+ UUIDs]) → 400 Bad Request"). | Safe |
| `crm-queue-live.js` | 78 | `.in('id', chunk)` | YES — chunked, file header lines 67-68 document the same risk. | Safe |
| `crm-helpers.js` | 220 | `.in('lead_id', ids)` | YES — comment says "caller passes a slice of up to SERVER_PAGE leads". | Safe |
| `crm-pixel-gap-tile.js` | 70 | `.in('lead_id', leads.map(l => l.id))` | YES — `leads` is `.limit(100)` upstream (~3.7KB max URL). | Safe |
| `crm-messaging-performance.js` | 77, 80 | `.in('id', eventIds)` / `.in('id', templateIds)` | YES — eventIds + templateIds come from `v_crm_message_performance` GROUP BY, which has bounded cardinality per template/event count (small). | Safe in practice; flag as audit-when-scale-grows. |
| `crm-automation-history.js` | 36 | `.in('run_id', runIds)` | runIds bounded by recent runs displayed; typically <100. | Safe in practice. |
| `crm-lead-actions.js` | 56 | `.in('id', leadIds)` | leadIds come from selected UI rows — bounded by visible page (typically <50). | Safe in practice. |
| `crm-notifications-bell.js` | 33 | `.in('id', leadIds)` | leadIds from recent notifications — bounded. | Safe in practice. |
| `crm-broadcast-filters.js` | 229 | `.in('id', idFilter)` | idFilter from selection — bounded. | Safe in practice. |
| **`crm-short-links-stats.js`** | **74** | `.in('short_link_id', linkIds)` | **NO — unbounded by table size** | **THE BUG** |

**Conclusion: 1 file is broken (this one). All other `.in()` patterns are either explicitly chunked or upstream-limited.** No siblings need refactoring.

---

## 4. Proposed Solutions

### Option 1 (RECOMMENDED) — Invert the query

Replace lines 71-76 with a single tenant-scoped click fetch (no IN clause):

```js
var clicksRes = await sb.from('short_link_clicks')
  .select('short_link_id, clicked_at, broadcast_id')
  .eq('tenant_id', tid);
```

**Why this works:**
- Click counts are tiny vs link counts (47 prizma / 15 demo).
- Existing index `idx_short_link_clicks_tenant_id_clicked_at` covers `(tenant_id, ...)` — sub-ms query.
- The downstream aggregation (`byLink[c.short_link_id]`) only counts clicks whose `short_link_id` appears in the live-links map → expired-link clicks are dropped client-side (same semantic as today).
- 1-line behavioral change, no architectural shift.

**Code change scope:**
- File: `modules/crm/crm-short-links-stats.js` only.
- Lines changed: 4 (delete `.in('short_link_id', linkIds)` line and the `var linkIds = ...` line above it — keep tenant filter).
- Estimated complexity: trivial.

**Cross-Module Safety:**
- Touches NO other JS file, NO DB schema, NO EF, NO trigger, NO view.
- Reads existing `short_link_clicks` table only via existing index.
- Iron Rule 22 (defense-in-depth tenant_id): PRESERVED — still chains `.eq('tenant_id', tid)`.
- Iron Rule 21 (no duplicates): no new function/global.
- Iron Rule 13 (storefront views only): N/A — this is ERP internal UI.

**Performance impact:**
- **Faster** — single sub-ms query vs 1× short_links fetch (medium) + 1× broken-with-400 IN. Even when the IN worked at small scale it returned more rows than needed.
- Round-trips: 2 → 2 (unchanged: 1 for links, 1 for clicks).
- Network bytes inbound (Prizma): ~250KB (link rows) + ~5KB (47 clicks) = ~255KB total. The link-fetch dominates; click query is negligible.
- At 100K clicks (10-15× current Prizma scale), this still returns <1MB and uses the existing index — no scale ceiling visible.

**Risk class: LOW.** The semantic change (clicks on expired links now silently dropped, vs previously not-fetched) is identical to current visible UI behavior (only live links appear in the table).

### Option 2 — Chunk the IN clause (mirror existing pattern)

Apply the same `LEAD_FETCH_CHUNK = 200` chunking pattern already documented + used in `crm-messaging-broadcast-queue.js` (lines 27, 37-49):

```js
var CHUNK = 200;
var clicks = [];
for (var i = 0; i < linkIds.length; i += CHUNK) {
  var chunk = linkIds.slice(i, i + CHUNK);
  var res = await sb.from('short_link_clicks')
    .select('short_link_id, clicked_at, broadcast_id')
    .eq('tenant_id', tid).in('short_link_id', chunk);
  if (res.error) throw new Error(res.error.message);
  clicks = clicks.concat(res.data || []);
}
```

**Why this works:** matches the existing project convention; bug-class-already-solved-once approach.

**Code change scope:** same file, ~10 lines added. Trivial complexity.

**Cross-Module Safety:** same as Option 1.

**Performance impact:**
- **Slower than Option 1** — for Prizma at 7009 links / 200 chunk = **36 round-trips** per tab-open vs 1 round-trip with Option 1.
- Each chunk URL is ~7.5KB (safe), but cumulative latency is real (~100ms per round-trip × 36 = ~3.6s tab-open on prizma).
- This is what the file at line 27 documents as the safe size — Option 1 makes this concern moot by avoiding the IN entirely.

**Risk class: LOW.** Pure JS, same Iron Rule profile as Option 1. But 36× slower than Option 1.

### Option 3 — DB-side view / RPC (long-term hardening)

Create a function-backed view `v_crm_short_link_stats` that pre-aggregates the JOIN in SQL:

```sql
CREATE OR REPLACE VIEW v_crm_short_link_stats AS
SELECT
  sl.tenant_id, sl.id AS short_link_id, sl.code, sl.target_url,
  sl.link_type, sl.broadcast_id, sl.created_at, sl.click_count,
  COUNT(c.id) AS total_clicks,
  MAX(c.clicked_at) AS last_clicked_at,
  COUNT(DISTINCT c.broadcast_id) FILTER (WHERE c.broadcast_id IS NOT NULL) AS broadcast_count,
  COUNT(c.id) FILTER (WHERE c.broadcast_id IS NOT NULL) AS clicks_with_broadcast,
  COUNT(c.id) FILTER (WHERE c.broadcast_id IS NULL) AS clicks_without_broadcast
FROM short_links sl
LEFT JOIN short_link_clicks c ON c.short_link_id = sl.id AND c.tenant_id = sl.tenant_id
WHERE sl.expires_at > NOW()
GROUP BY sl.id;
```

Then the frontend reads it as a single `SELECT * FROM v_crm_short_link_stats WHERE tenant_id = $1`.

**Why this works:** maximally efficient (single query, DB-side JOIN+aggregation). Scales without intermediate URL inflation. Pattern matches the project's `v_crm_message_performance` design (also LEFT JOINs short_link_clicks server-side).

**Code change scope:**
- 1 migration file (~30 lines) + RLS policy on the view (security_invoker) OR security_invoker default behavior.
- `crm-short-links-stats.js` change: ~15 lines deleted (the manual JS aggregation becomes a single `.select('*')`).

**Cross-Module Safety:**
- Adds 1 new VIEW. Iron Rule 21 (no duplicates) — new view name needs Rule 21 cross-ref check at SPEC time.
- Iron Rule 13 (Views are the contract layer): aligned with project pattern.
- Iron Rule 14 (tenant_id): view exposes tenant_id; frontend filters by it.
- Iron Rule 15 (RLS): security_invoker view inherits underlying table RLS automatically — no new policy needed (matches `v_crm_message_performance` precedent).
- Risk class: LOW (additive view, no schema change to existing tables).

**Performance impact:** **Fastest of all 3 options.** Single round-trip. DB-side aggregation. Scales to any link count.

**Trade-off vs Option 1:** more work (migration + SPEC). Useful only if the project wants to add MORE stats (e.g., click rates by hour, user-agent breakdown, etc.) — view becomes a natural home. For the current MVP table, Option 1 is sufficient.

---

## 5. The "Could This Break Something Else?" Deep Check

### Option 1 (invert query) — risk surface

| Question | Answer |
|---|---|
| Does the inverted query return data not previously returned? | YES — clicks on expired links. BUT those rows are silently dropped client-side (only live links appear in the result table). User-visible behavior IDENTICAL. |
| Does any other consumer depend on the OLD query shape? | NO — the query is local to one function in one file. |
| Could it return too much data? | Worst case at 100K clicks: ~10MB response, ~200ms parse. Still acceptable. Beyond 1M clicks: switch to Option 3 (view). |
| Does it affect storefront? | NO — ERP-only file. |
| Does it affect broadcasts / automation / dispatch chain? | NO — `short_link_clicks` table is the LEDGER, not consumed by dispatch. |
| Does it affect Iron Rule 15 (RLS)? | NO — RLS policy on `short_link_clicks` unchanged; tenant_id filter same. |
| Could test fail? | None known — no existing test references this file. |
| Could the storefront's `resolve-link` EF behavior change? | NO — that EF only INSERTs into `short_link_clicks`. |

### Option 2 (chunking) — risk surface

| Question | Answer |
|---|---|
| Does the chunked query return identical results to the broken single query? | YES (each chunk returns its slice; union covers all). |
| Could chunk-N return error and chunk-N+1 succeed, producing inconsistent results? | YES, if error handling isn't all-or-nothing. The proposed code throws on first error → safe (partial-success state is impossible). |
| Performance regression? | YES on prizma (36 round-trips → ~3.6s tab open). |

### Option 3 (DB view) — risk surface

| Question | Answer |
|---|---|
| Adding a new view risk? | LOW — additive. |
| Does it affect any other module? | NO. |
| Could the view body's LEFT JOIN miss edge cases? | LEFT JOIN matches `c.tenant_id = sl.tenant_id` for safety even though both rows already pass RLS. Captures all clicks attributable to that tenant's links. |
| RLS pattern? | security_invoker view (Supabase default) → reads underlying table RLS. No new policy. |

---

## 6. Recommended Rollback Plan (per option)

### Option 1 rollback
- Single-file `git revert <fix-commit>`. Restores the broken IN clause.
- Worst case (theoretical): if some operator depends on expired-link clicks appearing in the stats, restore + open a follow-up SPEC. Not expected.

### Option 2 rollback
- Single-file `git revert <fix-commit>`. Same as Option 1.

### Option 3 rollback
- Drop the view via migration: `DROP VIEW IF EXISTS v_crm_short_link_stats;`
- Revert frontend file edit.
- Two reverts; longer recovery; only relevant if the view's semantics surprise downstream consumers (none planned in v1).

---

## Foreman Recommendation

**Ship Option 1.** Rationale:

1. **Smallest possible change** — 4 lines edited in 1 file. The current code's structure is preserved.
2. **Fastest of all options at any scale** — single round-trip on the click table using the existing index.
3. **No new DB objects** — no migration risk, no Rule 21 cross-ref cost, no view-permission audit.
4. **Semantic preservation** — user-visible output identical (only live links appear in the table, just like today).
5. **Same Iron Rule profile** as the current broken code (Rule 22 preserved, no new globals).
6. **Avoids the "now we have N round-trips" cost** that Option 2 introduces.
7. **Defers Option 3 (view) until a real use case** — if Daniel asks for more stats in the future, do the view then; until then, Option 1 covers MVP.

**Risk class for Option 1: LOW.**
**Estimated SPEC scope:** Light Pipeline (Foreman + Executor only, no Reviewer/LH-Tester needed — single small file change with smoke 8/8 as the only behavioral verification). ~10-15 minutes total.

**Follow-up considerations (NOT part of this fix):**
- Consider adding an `expires_at` filter to the click query if expired-click-noise becomes an issue at scale (not currently a concern; 47 rows total on Prizma).
- The `crm_short_links_stats.js` 50-line aggregation loop is OK at current scale but eventually wants Option 3 if the table grows >100K clicks.
- M3_SHORTGY_TO_INTERNAL_REDIRECT's MVP was shipped 2026-05-14 with this latent bug. Could be worth a sweep of all M3 MVP queries for similar architectural mismatch patterns.

---

*End of investigation report. Awaiting Daniel's decision on which option to take. NO code committed.*
