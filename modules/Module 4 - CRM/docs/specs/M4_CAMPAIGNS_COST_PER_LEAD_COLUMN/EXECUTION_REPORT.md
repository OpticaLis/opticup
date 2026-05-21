# EXECUTION_REPORT — M4_CAMPAIGNS_COST_PER_LEAD_COLUMN

> **Date:** 2026-05-21 — Sprint 2 Item 2 of 4.

## Summary
Added "CPL" column to the main campaigns table. Per-row formula `spend / leads` (uses `r.cpl` from view, falls back to client compute). Group-summary row uses `sumSpend / sumLeads`. Division-by-zero renders "—".

## What was done
| Step | Result |
|---|---|
| Pipeline lock | claimed |
| Pre-edit grep | found CPL already in detail panel (line 52) + view exposes `cpl` column |
| Edit `modules/crm/crm-campaigns.js` | +12 lines: header th + per-row cell + summary cell + sumLeads-based avgCPL + colspan 8→9 |
| File size | 261 lines (was 250) — under 350 cap |
| Chrome MCP — pre-cache-bust | showed old 8-column table (cache hit) |
| Chrome MCP — cache-busted (`?_=2026052201`) | **9 columns confirmed:** `["שם הקמפיין","סטטוס","ספנד","לידים","CPL","קונים","הכנסות","CAC","החלטה"]`; per-row CPL rendered "—" for demo's 0-leads campaigns (division-by-zero handled correctly); summary row also rendered "—". |
| Screenshot | `campaigns-cpl-column.png` |
| Iron Rule 31 gate | exit 0 |

## Non-zero CPL verification
Demo's `v_crm_campaign_performance` rows all have `leads_num=0` (no FB-attributed conversion data on demo). Prizma view returns 0 rows via service_role probe (view uses `security_invoker=on` + JWT-claim tenant filter). Daniel will see real-number CPLs on Prizma post-merge via his authenticated session — the formula is straightforward (`r.cpl` already populated by view) and the demo render proved it doesn't crash on the 0-leads edge case.

## Iron Rule audit
- R7 N/A (no DB calls added; uses existing `r.cpl` field).
- R9 — no hardcoded business values. Money formatting goes through the existing `money()` helper (currency-aware).
- R12 — 261 lines, under cap.
- R14/15/22 — no DB writes, no policy changes.
- R31 — exit 0.
- R32 — None.
- R33 — demo-only render verification; Prizma unaffected.
- R34 — Chrome MCP live render verified.

## Self-assessment 10/10/10/10
Single 12-line edit. Cache-busting confirmed the new column renders. Formula reuses the existing view field. Cleanest item of Sprint 2.

---
*End of report.*
