# FOREMAN_REVIEW — M4_RAW_SB_FROM_MIGRATION_PHASE_2

> **Verdict:** 🟡 **DEFERRED.** Honest re-scope after scoping + 1 trial migration.

## Audit
- 159-call target validated.
- DB.* wrapper gaps discovered (`head:true` + chained filters).
- Trial migration on `crm-dashboard.js` `v_crm_event_stats` — code is correct but couldn't verify (Supabase outage).
- Reverted to keep dashboard reliable.
- 3 follow-up SPECs proposed.

## IR34 runtime trace evidence
**Chrome MCP — N/A** (no code shipped after revert).

screenshot_reference — N/A (no UI change).

## Verdict justification
🟡 — refactor SPECs that can't be verified are riskier to ship than ones with new value, because their entire purpose is "no behaviour change". Without verification, that promise is unverified. Honest deferral + clear path-forward is the right call.

## Sprint 4 candidates (3 SPECs)
1. **`M4_DB_WRAPPER_EXTENSION`** — add `head:true` + `in:`/`not:`/`is:` chained-filter sugar to `DB.select`. Unlocks Phase 2A.
2. **`M4_RAW_SB_FROM_MIGRATION_PHASE_2A`** — migrate 10 read-only sb.from calls (crm-dashboard.js + crm-funnel-dashboard.js + crm-pixel-gap-tile.js) once Phase 2A wrapper is in place.
3. **`M4_RAW_SB_FROM_MIGRATION_PHASE_2B`** — migrate write-path calls (crm-lead-actions.js + crm-payment-helpers.js + crm-attendee-cancel.js) with per-call verification.

## 2 author-skill proposals
1. **For migration SPECs, audit the target wrapper's API surface BEFORE setting the count target.** This SPEC's 25-call target was set without knowing `head:true` was missing.
2. **Distinguish "refactor SPECs" from "feature SPECs" in §1.** Refactor SPECs have asymmetric risk (any regression is 100% on the SPEC) and need stricter verification gates.

## 2 executor-skill proposals
(See EXECUTION_REPORT — endorsed.)

---
*End of FOREMAN_REVIEW.*
