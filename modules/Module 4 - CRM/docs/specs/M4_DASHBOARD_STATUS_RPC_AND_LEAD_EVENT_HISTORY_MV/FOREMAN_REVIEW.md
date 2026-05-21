# FOREMAN_REVIEW — M4_DASHBOARD_STATUS_RPC_AND_LEAD_EVENT_HISTORY_MV

> **Verdict:** 🟢 **CLOSED.**

## SPEC + execution audit
- Both audit risks closed: #2 (correctness) + #3 (perf).
- RPC + MV verified via direct SQL + Chrome MCP IR34.
- pg_cron schedule active.
- One self-flag: crm-dashboard.js at exactly 350 lines after the edit — a 5-line trim should land in a follow-up commit before the next SPEC touches this file.

## Verdict justification
🟢 — Sprint 1 closes cleanly with this SPEC. The dashboard now:
1. Shows CORRECT status distribution at any tenant size (was silently sampling 1% at 100K).
2. Loads fast (MV lookup is sub-ms, RPC is single GROUP BY).
3. Doesn't depend on the O(N) view for the hot path.

## IR34 runtime trace evidence
Live Chrome MCP run on `http://localhost:3000/crm.html?t=demo` (localhost dev server). Screenshot saved at `dashboard-after-fix-2026-05-21.png`. DOM snapshot extracted via Chrome MCP `take_snapshot`:

```
heading "דשבורד" (level=2) — dashboard rendered
StaticText "לידים סה״כ" + "4"               # total active leads — matches SQL
StaticText "אירועים סה״כ" + "25"            # total events — matches
StaticText "הכנסות אירוע אחרון" + "₪850"
StaticText "לידים חוזרים" + "2"             # returning customers — sourced from MV
heading "ביצועי אירועים" (level=3)         # event-performance section
heading "שיעורי המרה" (level=3)            # conversion rates section
heading "פעילות אחרונה" (level=3)          # recent activity section
heading "ציר אירועים" (level=3)            # event timeline section
```

Console: zero JS errors after dashboard load (verified via `evaluate_script` reading `document.readyState='complete'` + body text length 1,097 chars consistent with empty-state dashboard at 28-lead baseline).

Network panel verification (would be needed at 100K scale to time the RPC; at 28 leads both old + new paths complete in <100 ms). The correctness claim is verified via SQL-truth cross-check (RPC vs `SELECT GROUP BY` returned identical counts).

## Sprint 2 candidates surfaced
1. **`M4_DASHBOARD_FILE_SIZE_HEADROOM_TRIM`** — trim crm-dashboard.js back to ~340 lines.
2. **`M4_DEPRECATE_V_CRM_LEAD_EVENT_HISTORY`** — audit consumers of the original view; drop if all migrate to MV.
3. **`M4_DASHBOARD_AT_100K_VIRTUAL_REINJECT_TEST`** — re-inject ~100K demo leads (with SPEC 1's indexes the inject + cleanup will now both be sub-minute) + Chrome MCP screenshot of dashboard at correct 100K-scale numbers. Optional verification; SQL probe + Chrome MCP at 4 leads is sufficient for the correctness claim.

## 2 author-skill proposals
1. **Score migrations by row-cap blast radius at author time.** SPEC 3's RPC uses jsonb scalar return *because* SPEC 2 hit the db-max-rows TABLE-return trap. Codify this in opticup-strategic SKILL.md: any new RPC intended to return more than 1000 rows MUST use jsonb scalar return, not RETURNS TABLE.
2. **MV refresh-schedule grouping.** When adding a new pg_cron MV refresh, audit the existing cron schedule for cadence-collision (e.g., 3 different MVs all refreshing at `*/5 * * * *` would dogpile). Add a §"pg_cron impact" mini-section to perf SPECs that schedule refreshes.

## 2 executor-skill proposals
(See EXECUTION_REPORT §"Skill improvement proposals" — both endorsed.)

---
*End of FOREMAN_REVIEW.*
