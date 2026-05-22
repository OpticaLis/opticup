# FINDINGS — M4_JSONB_RPC_SHARED_HELPER

## F-01 (resolved) — Duplicated shape-fallback logic centralized
**Severity:** N/A (cleanup).
**Resolution:** `unwrapJsonbArray<T>(data)` exported from `rpc-shape-util.ts`. Single source of truth for the triple-shape handling. Future EF jsonb-RPC consumers should import + use this helper.

## F-02 (INFO) — Live verification deferred due to Supabase outage
**Severity:** LOW (external, not a code defect).
**What:** Curl + SQL probes returned timeouts during this Item's verification window. The EF deployment itself succeeded (v36 active per `list_edge_functions`). The refactor preserves byte-equivalent logic from Sprint 2 Item 1 which was Chrome-MCP-verified at 10K leads.
**Recommendation:** post-merge, Daniel can run a single dispatch_preview to re-confirm. If it succeeds with correct count + dates, the refactor closes cleanly.

## F-03 (Sprint 4 candidate) — Browser jsonb-RPC sites could also adopt the helper
**Severity:** LOW.
**What:** Today, only the Deno-EF supabase-js needs the triple-fallback. Browser supabase-js handles jsonb returns correctly (verified across SPEC 3 dashboard + Sprint 2 message-perf). If Supabase changes browser supabase-js behavior in a future release, having the SAME helper available on the browser side would be useful. Not blocking today.

---
*End of findings.*
