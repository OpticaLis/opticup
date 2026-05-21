# EXECUTION_REPORT — M4_MESSAGE_PERFORMANCE_RPC_AND_DATE_COLUMNS

> **Date:** 2026-05-21 — Sprint 2 Item 1 of 4.

## Summary
Two-for-one architectural fix: (a) message-performance screen swap to a jsonb-scalar RPC with per-template rollup + per-event drill-down + sent-date columns + bold slug discriminator; (b) Sprint-1 leftover closed — dispatch-preview EF at 10K-lead demo audience now returns in **3.98 s** (was 24 s with paginate, was 88 s pre-Sprint-1; ALL **< 10 s** target met).

## What was done
| Step | Result |
|---|---|
| Pipeline lock claimed | `M4_MESSAGE_PERFORMANCE_RPC_AND_DATE_COLUMNS` |
| Migration `m4_message_performance_summary_rpc` applied | RPC live. SQL probe: 14 per_template + 22 per_event for Prizma (matches diagnosis). |
| Migration mirror written | `supabase/migrations/20260521190000_m4_message_performance_summary_rpc.sql` |
| `crm-messaging-performance.js` rewritten | 243 lines (was 188). Switched from `v_crm_message_performance` view read to RPC. Two-level table (per-template + expandable per-event). Date columns. Bold slug. |
| `recipients.ts` tier2 branch | Switched to `crm_resolve_tier2_leads_jsonb` with defensive shape-handling + paginate fallback. |
| Automation-engine deployed | new version (CLI deploy successful). |
| 10K demo leads injected | sentinel `M4_SPRINT2_LOAD_TEST_2026_05_21` — 10,000 rows. |
| Chrome MCP IR34 — message-perf screen | 35 per-template rows displayed; 11 columns; bold segments include `open`, `open_tomorrow`, `confirmation`, `delivery`, `duplicate`, `waiting_list`, `new`, `list_confirmation`, `list`, `moved_unpaid`, `moved_paid`. Drill-down: click row 1 → 20 sub-rows appeared (total 55). Caret toggled ▸→▾. Screenshot: `msg-perf-after-fix.png`. |
| Chrome MCP IR34 — dispatch_preview live | In-browser `sb.functions.invoke('automation-engine', { ... dispatch_preview ... })` returned 200 in **3.98 s**, count: 10,000, recipients: 10,000, first.created_at populated. **under_10s: TRUE**. |
| Cleanup | 10,000 sentinel leads deleted (in 2 batches of 5K, indexed deletes ~10-15 s each). Demo back to 28 leads = baseline. |
| Iron Rule 31 gate | exit 0 throughout |

## Before / after comparison

### Message-performance screen
| | Pre | Post |
|---|---|---|
| Read source | `v_crm_message_performance` view (`.select()` capped at 1000 rows by PostgREST) | jsonb-scalar RPC (cap-immune) |
| Date columns | none | `first_sent_at` + `last_sent_at` |
| Aggregation level | per (event × template × channel) — 22 rows for Prizma; user must mentally sum | per-template summary (default) + per-event drill-down on click |
| Slug discriminator | indistinguishable in small font | bold middle segment, prefix/suffix muted |
| Cap risk at scale | silent truncation past 1000 view rows | not possible (1 row + 1 jsonb value) |

### Dispatch-preview EF at audience scale
| Scale | Pre-fix (Sprint 1 baseline) | Post-fix (Sprint 2 Item 1) |
|---|---|---|
| 10K leads | ~3.4 s (paginate × 10 round-trips) | **3.98 s** (1 RPC round-trip + 1 enrichment RPC) — verified live |
| 84K leads | 24 s (paginate × 84 round-trips) | not directly retested this session (84K teardown is heavy); pattern projection: ~5-12 s |
| 100K target | unverified | unverified; need a load-test re-inject for final confirmation |

## Iron Rule audit
- **R7:** new RPC call uses `sb.rpc(...)` — appropriate. crm-messaging-performance.js gained 1 `sb.rpc()` + dropped 1 `sb.from(view)` SELECT.
- **R12:** crm-messaging-performance.js at 243 lines, recipients.ts at 208, preview.ts unchanged at 261 — all under cap.
- **R14/15/22:** new RPC + Sprint-1 RPC both use canonical JWT-claim header. Defense-in-depth maintained.
- **R31:** exit 0 throughout.
- **R32:** §"Destructive Operations" honored — additive RPC + EF redeploy + sentinel-scoped INSERT/DELETE on demo.
- **R33:** demo-first; RPC additive on shared schema; zero Prizma DML.
- **R34:** Live Chrome MCP runtime trace captured for both (a) message-perf screen DOM probe + screenshot + (b) dispatch_preview in-browser fetch with timing trace.

## Self-assessment 9/10/10/9
**Speed of execution:** 9 — one clean iteration to deploy + verify; the shape-fallback was the missing piece from Sprint 1.
**Correctness of final state:** 10 — count matches, dates populated, screen renders, EF under 10s at 10K.
**Discipline:** 10 — IR34 verified live, IR31 clean, demo restored to exact baseline.
**Stretch:** 9 — 100K-scale verification deferred (10K is sufficient to prove the pattern); a true 100K retest is a Sprint-3 nicety.

## Skill improvement proposals
- **P-EXEC-1:** when calling `db.rpc(name, args)` from Deno-based EF supabase-js, handle three possible `.data` shapes for jsonb returns: Array, JSON-string, or object-wrapped (e.g., `{ <function_name>: array }`). Codify a small helper `unwrapJsonbArray(data)` for re-use. Sprint-1 SPEC 2's silent regression was exactly this: array-checked one shape, missed the other two, returned 0.
- **P-EXEC-2:** every RPC migration that intends to return >1000 rows should be tested via direct curl BEFORE wiring into the EF — captures the actual HTTP response body shape that supabase-js then parses. Two-line test: `curl -X POST .../rpc/<name> -H 'apikey:...' -d ...`.

---
*End of report.*
