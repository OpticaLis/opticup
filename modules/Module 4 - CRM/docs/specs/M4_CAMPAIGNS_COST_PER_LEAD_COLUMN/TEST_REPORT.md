# TEST_REPORT — M4_CAMPAIGNS_COST_PER_LEAD_COLUMN

## 1. Chrome MCP IR34 — campaigns table on demo
Cache-busted URL `http://localhost:3000/crm.html?t=demo&_=2026052201` → קמפיינים tab:

**Headers (9 columns):**
```
["שם הקמפיין", "סטטוס", "ספנד", "לידים", "CPL", "קונים", "הכנסות", "CAC", "החלטה"]
```

**First two data rows:**
```
["קמפיין מעורבות | רוסית | 10 שח", "Live", "₪61,626", "0", "—", "0", "₪0", "—", "TEST"]
["‏‏‏קמפיין מעורבות | רוסית - 18", "Live", "₪38,123", "0", "—", "0", "₪0", "—", "TEST"]
```

**Summary row:**
```
["סה\"כ Live & Scaling", "", "₪234,017", "0", "—", "0", "₪0", "—", ""]
```

CPL renders "—" because all demo campaigns have `leads_num=0` — confirms the division-by-zero edge is handled correctly.

Screenshot: `campaigns-cpl-column.png`.

## 2. Formula correctness
Per-row formula (verbatim from the edit):
```js
var cpl = Number(r.cpl);
if (!isFinite(cpl) || cpl <= 0) {
  var leadsN = Number(r.leads_num) || 0;
  cpl = leadsN > 0 ? Math.round(Number(r.total_spend || 0) / leadsN) : 0;
}
var cplStr = cpl > 0 ? money(cpl) : '—';
```
- Prefers the view's pre-computed `r.cpl` (consistent with how `r.cac` is consumed elsewhere).
- Fallback computes client-side when view doesn't carry `cpl` (defensive).
- "—" rendered for 0-leads or invalid CPL.

Summary-row formula: `sumLeads > 0 ? Math.round(sumSpend / sumLeads) : 0` — same shape as existing `avgCAC`.

## 3. Verdict
🟢 **PASS.**
- ✅ Column header in place.
- ✅ Per-row cell renders.
- ✅ Summary cell renders.
- ✅ Division-by-zero handled.
- ✅ Money formatting consistent with sibling cells.
- ✅ No console errors.
- ⚠️ Non-zero render unverified on demo (no leads-bearing campaigns in demo data); will be visible on Prizma post-merge.

---
*End of test report.*
