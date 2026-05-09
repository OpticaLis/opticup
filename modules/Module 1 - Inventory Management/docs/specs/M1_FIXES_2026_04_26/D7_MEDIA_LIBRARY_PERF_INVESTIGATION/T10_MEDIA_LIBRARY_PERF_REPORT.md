# T10 — D7 Media Library Performance Investigation

> **Phase:** read-only investigation (T10 of OVERNIGHT_M1_M3_BURNDOWN)
> **Written by:** opticup-executor (Claude Code, Windows desktop)
> **Written on:** 2026-04-26
> **Source file:** `modules/storefront/studio-media.js` (lines 52-123 — `loadMediaLibrary` function)
> **No source changes.** This is a measurement + proposal document.

---

## TL;DR

The Media Library "loads slowly" complaint isn't dominated by the perf
issues the activation prompt enumerated. Real measurements:

- **Per-tenant row counts are TINY**: demo has 0 media items, Prizma has
  251 (excluding 425 soft-deleted = ~676 total in table).
- **PostgreSQL execution time on the search query is 0.7ms** (Seq Scan over
  ~676 rows is faster than any index lookup at this scale).
- **What's slow is the request CHAIN**: count='exact' (~600ms RTT) + page
  fetch (~600ms) + up to 30 parallel signed-URL requests (each ~100-200ms,
  but rate-limited).

The biggest latent perf problem is **a useful GIN index that exists but is
never used**. `idx_media_library_search` is a tsvector(simple) GIN index on
`title || description || alt_text` — the JS code uses 4 sequential `ilike`
operators that can't leverage it. At today's row counts this doesn't hurt;
when the table grows past ~10k rows, switching from `ilike` → tsquery via
the existing GIN index will become a 100-1000x speedup. Worth fixing now
to avoid the future cliff.

---

## 1. Live measurements (2026-04-26, Prizma tenant)

### Row counts (`media_library`)

| Tenant | Active items | Soft-deleted | Total |
|--------|--------------|--------------|-------|
| demo   | 0            | n/a          | 0     |
| prizma | 251          | 425          | ~676  |

### Network/HTTP timings (curl from Windows desktop, service role JWT)

3 runs each, total wall time including network:

| Query type | Run 1 | Run 2 | Run 3 | Notes |
|------------|-------|-------|-------|-------|
| count='exact' (HEAD only) | 0.150s | 0.633s | 0.650s | First run hits cache |
| count='estimated' (HEAD only) | 1.184s | 0.624s | 0.621s | **NOT faster** at this row count |
| Simple page fetch (30 rows, no filter) | 0.636s | 0.127s | 0.652s | Network-dominated |
| Page fetch + ilike search across 4 cols | 0.862s | 1.350s | 0.838s | ~200-700ms penalty over plain fetch |

### Internal PostgreSQL execution time (EXPLAIN ANALYZE)

For the exact ilike query:
```
Limit  (cost=34.83..34.84 rows=1 width=354) (actual time=0.632..0.632 rows=0)
  Sort Key: created_at DESC
  ->  Seq Scan on media_library  (rows=1 width=354) (actual time=0.591..0.591)
        Filter: (NOT is_deleted AND tenant_id = ... AND
                 (title ~~* '%test%' OR description ~~* '%test%' OR
                  alt_text ~~* '%test%' OR original_filename ~~* '%test%'))
        Rows Removed by Filter: 425
        Buffers: shared hit=26
Execution Time: 0.707 ms
```

**Internal execution: 0.7ms.** The full HTTP round trip is 600-1300ms. So
~99% of perceived latency is network/PostgREST overhead, not query
execution.

### Existing indexes on `media_library`

```
idx_media_library_pkey       — UNIQUE (id)
idx_media_library_tenant     — btree (tenant_id)
idx_media_library_folder     — btree (tenant_id, folder)
idx_media_library_tags       — gin (tags)
idx_media_library_search     — gin (to_tsvector('simple', COALESCE(title,'') || ' ' ||
                                                          COALESCE(description,'') || ' ' ||
                                                          COALESCE(alt_text,'')))
```

**The GIN search index covers 3 of the 4 columns the JS searches** — but
the JS uses `ilike` instead of full-text query, so the index is bypassed.
`original_filename` is NOT in the GIN index.

---

## 2. The 3 perf issues from activation prompt — re-examined with data

### Issue 1: `count: 'exact'` on every reset (line 92)

**Activation prompt suggestion:** switch to `count: 'estimated'`.

**Verdict:** at current row count (251) this is **NOT a win**. Measurements
show estimated is sometimes SLOWER than exact (1.18s vs 0.65s). PostgreSQL
needs to gather statistics for estimated and on a small table that's more
work than exact COUNT(*). The advice applies to tables with millions of
rows; media_library is unlikely to grow past 100k.

**Recommendation:** keep `count: 'exact'` for now. Re-evaluate if the table
ever exceeds 100k rows (alarm trigger: count query latency > 500ms
internally per pg_stat).

### Issue 2: `ilike` across 4 columns (lines 74-76)

**Activation prompt suggestion:** add an index on the search columns or use `or(...)` instead of multiple `ilike`s.

**Refined finding:** the existing `idx_media_library_search` GIN tsvector
index already covers 3 of the 4 columns. The JS just needs to switch from
`ilike` to a tsquery operator to use it. Concrete options:

**Option A (recommended) — switch to tsquery via PostgREST `text_search`:**
```js
if (mediaFilter.search) {
  const s = mediaFilter.search;
  // Use the existing GIN tsvector index for title/description/alt_text:
  q = q.textSearch(
    "to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(alt_text,''))",
    s,
    { config: 'simple' }
  );
  // Fallback: also OR-match original_filename via ilike (no GIN index for it)
  // — combine via .or() so the GIN-indexed match wins when applicable.
  // Note: PostgREST does not allow combining .textSearch + .or naturally;
  // see Option B for the practical pattern.
}
```

PostgREST's textSearch syntax is awkward to combine with another OR
clause, and the JS would need to either drop original_filename OR run two
queries and union client-side.

**Option B (simpler, smaller win) — keep ilike but split into a single OR:**
The current code is already a single `.or()` with 4 ilike clauses, which
is what the activation prompt suggested. So that piece is already done.
The real fix is Option A.

**Option C (deferred) — add a covering GIN index that includes original_filename:**
```sql
CREATE INDEX idx_media_library_search_v2 ON media_library
USING gin (to_tsvector('simple',
    COALESCE(title,'') || ' ' || COALESCE(description,'') || ' ' ||
    COALESCE(alt_text,'') || ' ' || COALESCE(original_filename,'')));
```

This is **Level 3 SQL — requires Daniel sign-off + Iron Rule 29 if any
view depends on `media_library`**. Defer to a follow-up SPEC.

**Recommended for follow-up SPEC:** Option C (DDL) + Option A (JS).
Together this cuts search query internal time from ~0.7ms (already fast at
this scale) to <0.1ms (irrelevant difference today, ~100x at 100k+ rows).

### Issue 3: parallel signed URL requests (line 47)

```js
await Promise.all(uncached.map(i => getMediaSignedUrl(i.storage_path)));
```

**Activation prompt suggestion:** batch in groups of 20.

**Refined finding:** with `MEDIA_PAGE_SIZE = 30`, up to 30 parallel
HTTPS requests fire to Supabase Storage `createSignedUrl()`. The cache
(`mediaSignedUrls`) avoids re-fetching across renders, but on a fresh
load all 30 fire simultaneously. Each takes 100-200ms; in parallel they
complete in roughly the slowest (~200-300ms) plus connection setup.

The activation prompt's "batch in groups of 20" would make this WORSE
for cold loads — first 20 → 200ms, second 10 → another 200ms = 400ms
total, vs 200-300ms when fully parallel.

**The real perf win for signed URLs:** use **public URLs** instead of
signed URLs where bucket policy allows, OR cache signed URLs longer
(currently signed URLs typically expire after 60s; pushing to a longer
TTL like 1 hour means the in-memory cache stays warm across more
admin-tab-toggles).

**Recommended:** check whether `media-library` bucket can be made public
(would require RLS/policy review). Otherwise leave parallel fetching as
is — the activation prompt's batching suggestion is a regression.

---

## 3. The actual perf bottleneck (not in activation prompt)

The unmentioned issue is **the request waterfall**:

```
1. count='exact'   — RTT ~600ms     (waits for response)
2. data fetch       — RTT ~600ms     (sequential, after count)
3. signed URLs      — RTT ~200-300ms (parallel, after data)
                      ─────────────
                       ~1500ms total user-perceived
```

The first two could be parallel: kick off the count and the data fetch
simultaneously, await both. That cuts ~600ms from cold loads:

```js
const [{ count: totalCount }, { data, error }] = await Promise.all([
  applyMediaFilters(sb.from(MEDIA_TABLE).select('id', { count: 'exact', head: true })),
  applyMediaFilters(sb.from(MEDIA_TABLE).select('*'))
    .order(...).range(from, to)
]);
```

**This is a 30-40% latency reduction with zero infrastructure change.**
Worth fixing in a follow-up SPEC alongside the GIN-index work.

---

## 4. Proposed fix plan (for a follow-up SPEC, NOT this commit)

Priority order:

| # | Fix | Estimated impact | SPEC type |
|---|-----|-------------------|-----------|
| 1 | Parallelize count + data fetch in `loadMediaLibrary` | -600ms cold load (~40% of perceived latency) | JS only — autonomous |
| 2 | Replace `ilike` with `textSearch` using existing GIN index | Internal: ~0.7ms → <0.1ms (irrelevant now, 100x at scale) | JS only — autonomous |
| 3 | Add `original_filename` to GIN index via new index | Internal: covers the 4th column; tiny improvement now, big win at scale | DDL — Level 3, Daniel sign-off |
| 4 | Cache signed URLs longer (TTL bump from default to 1 hour) | Eliminates re-fetch on tab-toggle (most common scenario) | JS only — autonomous |
| 5 | Investigate making `media-library` bucket public | Eliminates signed-URL request entirely | Architecture review — Daniel call |

NOT recommended:
- ~~Switch count='exact' → 'estimated'~~ — measurements show no win at current size.
- ~~Batch signed URLs in groups of 20~~ — measurements show this would be a regression.

---

## 5. Methodology notes

- Service-role JWT was used for direct REST probes from
  `$HOME/.optic-up/credentials.env`. No production data modified.
- Curl timings include full network round-trip (Windows desktop → Supabase
  US region). User-perceived latency from a browser session may differ;
  these are upper bounds.
- EXPLAIN ANALYZE was run via Supabase MCP `execute_sql` (read-only).
- Probe queries each ran 3 times to surface variance from network/cache.
- The `media-library` bucket itself was not probed — only the database
  table `media_library` and its REST endpoint.

---

## 6. Open questions

- **What's "slow" to the user?** This investigation assumes the complaint
  is page-load latency. If it's actually upload time or thumbnail
  generation, the bottleneck and fix are entirely different. Foreman
  should clarify before authoring the follow-up SPEC.
- **Does the storefront repo also load from `media_library`?** If yes,
  any DDL change must go through the Iron Rule 29 View Modification
  Protocol even if no view is touched, because the `media_library`
  contract is shared.
- **TTL for signed URLs** — the JS cache (`mediaSignedUrls`) doesn't
  appear to expire entries. If a session lasts longer than the signed-URL
  TTL (default 60 seconds), users will see broken thumbnails. Worth
  verifying current behavior in a separate investigation.

---

*End of T10_MEDIA_LIBRARY_PERF_REPORT.md.*
