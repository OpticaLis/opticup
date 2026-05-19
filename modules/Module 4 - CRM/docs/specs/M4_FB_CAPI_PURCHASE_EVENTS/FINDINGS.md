# FINDINGS — M4_FB_CAPI_PURCHASE_EVENTS

> **Executor:** opticup-executor (Claude Sonnet 4.6)
> **Execution date:** 2026-05-19
> **Inherited from SPEC author:** F-A1, F-A2, F-A3 (see SPEC §0 Findings at SPEC Author Time)

---

## Inherited Findings (SPEC §0)

| # | Finding | Severity | Status |
|---|---|---|---|
| F-A1 | Currency hardcoded to 'ILS' — future tenant in non-ILS country requires M4_M1_5_TENANT_LOCALE_PROPAGATION SPEC | INFO | Confirmed by executor. currency: "ILS" literal at EF line 188. Not a blocker for v1. |
| F-A2 | roles/site-overseer/knowledge-build/funnel-q3/M4_PIXEL_VALIDATION_GAP_QUERY.md still missing | INFO | Not touched by this SPEC. Still does not exist. |
| F-A3 | 84 Prizma rows with purchase_amount>0 not backfilled (D7 forward-only) | INFO | Confirmed. No Purchase queue rows added by Executor. |

---

## New Findings (discovered during execution)

### F-1 — SPEC line budget conflicts with IR12 hard max

- **Severity:** LOW
- **Location:** SPEC.md §4 Autonomy Envelope ("EF source ... target <= 400 lines")
- **Description:** SPEC budgeted <=400 lines for fb-capi-dispatch/index.ts. The repo's IR12 hard max is 350 lines (pre-commit hook). These two numbers conflict. Cost: 1 extra commit attempt and comment compression work.
- **Next action:** Foreman: SPEC authoring for EF-touching SPECs must verify IR12 hard max before stating a budget. Add to opticup-strategic/SKILL.md: "EF budget: never exceed 349 wc-l."

### F-2 — MCP deploy_edge_function source-viewer shows stale version after CLI fallback

- **Severity:** INFO
- **Location:** mcp__claude_ai_Supabase__get_edge_function response
- **Description:** After CLI deploy of version 3, MCP get_edge_function returned version 2 source. MCP source viewer is not reliable when CLI and MCP deploys are mixed.
- **Next action:** Add to P-EXEC-2 playbook in executor skill: "Verify source via local grep, not get_edge_function, when CLI fallback was used."

### F-3 — EF now at 348 lines, leaving 1 wc-l line before IR12 triggers

- **Severity:** LOW
- **Location:** supabase/functions/fb-capi-dispatch/index.ts
- **Description:** File is at 348 wc-l / 349 hook-count post-SPEC. Next non-trivial addition risks blocking the next commit.
- **Next action:** File TECH_DEBT entry: fb-capi-dispatch needs headroom planning or helper-file split before next feature.
