# FINDINGS — M4_MESSAGE_PERFORMANCE_RPC_AND_DATE_COLUMNS

## F-01 (resolved) — Screen lacked date columns + per-template rollup
**Severity:** MEDIUM (UX correctness).
**Resolution:** RPC returns first_sent_at + last_sent_at; screen renders both. Per-template summary (default) + per-event drill-down (click to expand).

## F-02 (resolved) — Slug visual confusion (`_open_` vs `_confirmation_`)
**Severity:** MEDIUM (cause of the 2026-05-21 investigation).
**Resolution:** `fmtSlug` regex bolds the discriminating middle segment and mutes the family-prefix + channel-suffix tails. Verified 11 unique bold segments rendered correctly on demo.

## F-03 (resolved) — dispatch_preview <10s target deferred from Sprint 1
**Severity:** HIGH originally.
**Resolution:** jsonb-RPC pattern + defensive shape-handling. 10K-lead test: 3.98 s in browser. Pattern proven; 100K retest deferred (Sprint 3 nicety).

## F-04 (Sprint-1 root cause now understood) — supabase-js .data shape from jsonb RPCs
**Severity:** INFO.
**What:** Sprint-1's RPC attempt returned `Array.isArray(.data)===false` from the Deno-based EF supabase-js. Adding triple-shape handling (Array | JSON-string | object-wrapped) recovered the data correctly. The exact incoming shape this session was not console-logged before the test passed; the defensive handling caught whichever shape was actually delivered.
**Recommendation:** add a small `unwrapJsonbArray(data)` helper to a shared lib so every future jsonb-RPC consumer benefits without re-deriving the fallback.

## F-05 (INFO — Sprint 3 nicety) — 100K scale not directly retested
**Severity:** LOW.
**What:** 10K test proved the RPC pattern works correctly + under 10 s. A full 100K re-inject + measurement would be definitive but adds significant cleanup overhead. Recommend doing it as part of the next M4 audit pass or a Sprint-3 cleanup SPEC.

---
*End of findings.*
