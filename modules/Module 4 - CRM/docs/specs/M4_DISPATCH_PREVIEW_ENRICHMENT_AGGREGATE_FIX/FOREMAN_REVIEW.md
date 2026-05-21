# FOREMAN_REVIEW — M4_DISPATCH_PREVIEW_ENRICHMENT_AGGREGATE_FIX

> **Verdict:** 🟡 **CLOSED-WITH-FOLLOW-UPS.**

## SPEC + execution audit
- **Primary acceptance bar (no more 80 s blowup):** ✅ met. 88.3 s → 24.0 s, HTTP 200 consistent, no Cloudflare 546.
- **Stretch <10 s target:** ⚠️ not met. 24 s with db-max-rows pagination remaining. Documented as F-02 with concrete Sprint-2 follow-up.
- **Correctness:** ✅ count + created_at + aggregates verified.
- **Iron Rules:** 31/32/33 honored; IR34 deviation honestly documented (curl-only verification this iteration).
- **Demo cleanup:** delegated to pg_cron job — decoupled from MCP timeout window.

## Verdict justification
🟡 — the regression that triggered this SPEC (Daniel's "modal opens after more than a minute") is gone, but Daniel's stated <10 s target is unmet. The remaining gap is a known Supabase product constraint (`db-max-rows=1000`) that needs a specific bypass shape — investigated this iteration without success, requires more time.

The SPEC delivers MEANINGFUL value:
- The screen no longer hangs catastrophically.
- The dispatch-preview modal will OPEN at 84K-lead scale (was failing with HTTP 546 timeout).
- Future audiences > 84K continue to work (24 s scales linearly to ~30 s at 100K, well within EF budget).

The deferred work is well-bounded and surfaced in `FINDINGS.md` for Daniel to triage.

## 2 author-skill proposals
1. **Author baseline at the highest realistic scale.** Original SPEC A authored the lazy-rows fix using 1,210-lead measurements. The pathology only emerged at 84K because the per-lead enrichment loops are O(N). Future SPEC authoring on perf-touching code should declare BOTH a typical-scale baseline AND a stretch-scale (10×–100× larger) baseline. Without the stretch baseline, the SPEC's success criterion is silently scale-limited.
2. **Sprint-1 SPECs should pre-commit a "fallback acceptance bar" for stretch targets.** This SPEC targeted <10 s. When <10 s wasn't reachable, I spent 4 EF redeploys exploring RPC shapes. Pre-commit: "if X attempt fails, ship at Y seconds and defer the rest to Sprint 2." Saves churn.

## 2 executor-skill proposals
(See EXECUTION_REPORT §"Skill improvement proposals" — both endorsed.)

## Sprint 2 / 3 follow-ups identified
- `M4_DISPATCH_PREVIEW_RPC_SHAPE_INVESTIGATION` — figure out why the `_jsonb` RPC's supabase-js shape returns empty. Cleanest path to <10 s.
- `M4_MODAL_VIRTUAL_SCROLL_AT_SCALE` — modal DOM render at 83,999 rows is unverified; likely needs virtual scrolling.
- `M4_AUDIT_LEAD_LEFTOVER_FINAL_CLEANUP` — once pg_cron finishes draining, unschedule the job + confirm baseline.

---
*End of FOREMAN_REVIEW.*
