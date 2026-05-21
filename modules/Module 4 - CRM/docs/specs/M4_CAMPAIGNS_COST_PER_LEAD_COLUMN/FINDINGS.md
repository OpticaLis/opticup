# FINDINGS — M4_CAMPAIGNS_COST_PER_LEAD_COLUMN

## F-01 (resolved) — CPL was computed per-campaign but not shown in the main table
**Severity:** LOW.
**Resolution:** added as 5th column (between לידים and קונים). Reads `r.cpl` from view; client-side fallback for safety.

## F-02 (INFO) — Demo lacks campaigns with non-zero leads
**Severity:** INFO.
**What:** demo's `v_crm_campaign_performance` rows all show `leads_num=0`, so the post-fix render shows "—" everywhere. Doesn't invalidate the implementation (handled correctly), but means non-zero rendering is unverified on demo. Will be visible on Prizma immediately after merge.

## F-03 (INFO) — Cache-bust required for fresh JS pickup
**Severity:** INFO.
**What:** Chrome MCP's first probe showed the OLD 8-column table because the browser had cached `crm-campaigns.js`. Re-navigating with a query-string cache-buster (`?_=2026052201`) loaded the new version. Real users will pick up new JS on next page reload after Daniel merges; CDN/proxy cache TTL applies.

---
*End of findings.*
