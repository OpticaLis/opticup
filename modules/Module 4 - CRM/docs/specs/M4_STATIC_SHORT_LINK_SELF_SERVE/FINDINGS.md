# FINDINGS — M4_STATIC_SHORT_LINK_SELF_SERVE

## F-01 (resolved) — Self-serve creation now exists
**Severity:** N/A (feature add).
**Resolution:** RPC + modal UI shipped. Existing `resolve-link` EF immediately serves new codes (no EF change required).

## F-02 (INFO) — `short_links` has no label column
**Severity:** INFO.
**What:** Per spec the label is "optional, for the operator's own recall". `short_links` schema has no `label`. We surface the label in the success-message UI but don't persist it. If labeling becomes a real feature (UI to view labels later, search by label), add a nullable `label text` column.

## F-03 (INFO) — IR18 deviation persists for short_links code
**Severity:** LOW (pre-existing tech debt; not introduced by this SPEC).
**What:** `short_links_code_unique` is a global UNIQUE constraint (not tenant-scoped). The RPC re-rolls on collision (consistent with M4_DEMO_STATIC_LINKS_BACKFILL's documented IR18 deviation). Cleanup-SPEC tracking the tenant-scoped UNIQUE migration is pending elsewhere.

## F-04 (INFO — Sprint 3 nicety) — No edit/delete UI for static links yet
**Severity:** LOW.
**What:** operator can CREATE but not EDIT/DELETE via UI. If a typo'd URL is created, only a SPEC-or-direct-SQL can fix/remove it. Pragmatic for now (low frequency of typos). Sprint 3 candidate: per-row edit + delete with confirm.

---
*End of findings.*
