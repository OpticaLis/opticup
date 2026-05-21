# SPEC — M4_CAMPAIGNS_COST_PER_LEAD_COLUMN

> **Authored:** 2026-05-21 — Sprint 2 Item 2 of 4.

## 0. Goal
Add a "CPL" (Cost Per Lead) column to the main campaigns table in `modules/crm/crm-campaigns.js`. Already computed in the per-campaign detail panel but not surfaced in the table or its group-summary rows. Pure read-path / display-only change.

## 1. Acceptance bar
- Table header gains "CPL" column between "לידים" and "קונים" (semantically grouping per-lead metrics).
- Per-row CPL = `spend / leads` (uses view's `cpl` column when present, falls back to client-side compute).
- Division-by-zero handled — renders "—" for campaigns with 0 leads.
- Group summary row aggregates: `sumSpend / sumLeads`.
- Same money formatting as existing ספנד/הכנסות/CAC cells (₪ symbol, LTR direction).
- Iron Rule 31 gate exit 0.

## 2. Files modified
- `modules/crm/crm-campaigns.js` — add CPL header, per-row CPL cell, sumLeads-based avgCPL in summary; bump group-label colspan 8→9.

## 3. Destructive Operations
None. Pure display-only client edit.

## 4. Out of scope
- The per-campaign detail panel (already has CPL).
- Backend/view changes (view already exposes `cpl` column).

## 5. Verification
4 closing docs + Chrome MCP live render on demo.

---
*End of SPEC.*
