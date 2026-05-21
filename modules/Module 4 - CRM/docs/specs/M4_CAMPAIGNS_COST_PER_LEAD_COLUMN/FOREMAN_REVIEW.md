# FOREMAN_REVIEW — M4_CAMPAIGNS_COST_PER_LEAD_COLUMN

> **Verdict:** 🟢 **CLOSED.**

## Audit
- Single-file 12-line edit. Header + per-row cell + summary cell + colspan bump.
- Iron Rules clean.
- IR34 evidence captured via Chrome MCP DOM probe + screenshot.

## IR34 runtime trace evidence
```
headers: ["שם הקמפיין","סטטוס","ספנד","לידים","CPL","קונים","הכנסות","CAC","החלטה"]
n_columns: 9
has_cpl_header: true
first_data_row_cpl_cell: "—"  (correct: campaign has 0 leads)
summary_row_cpl_cell: "—"  (correct: 0 total leads in group)
screenshot: campaigns-cpl-column.png
```
No console errors. Cache-bust required on first load (CDN/browser cache) — real users get new JS on next page reload after Daniel merges to main.

## Verdict justification
🟢 — cleanest item of Sprint 2. The CPL formula was already proven in the detail panel; this just surfaces it in the table.

## Sprint 3 candidate (optional)
- **`M4_CAMPAIGNS_TABLE_COLOR_DECISIONS`** — CAC has a color-by-threshold decision (`STOP/SCALE/TEST`). CPL could similarly carry a color hint (red if CPL > target, green if < target). Requires `cpl_target` config field. Defer until Daniel asks.

---
*End of FOREMAN_REVIEW.*
