# FINDINGS — P5_V2_REBUILD_RUNG1_PLUMBING

> Findings discovered during Rung 1 execution that are NOT in scope for Rung 1 itself.

---

## F1 — `mcp__claude_ai_Supabase__deploy_edge_function` returned 500 (transient or persistent unknown)

- **Severity:** MEDIUM (blocks autonomous close of Rung 1; doesn't damage anything)
- **Location:** Supabase Management API path used by the MCP tool
- **What happened:** Both deploy attempts of `send-message` (with the new `event-variables.ts` helper) returned `{"error":{"name":"InternalServerErrorException","message":"Function deploy failed due to an internal error"}}`. No further diagnostic from the API.
- **Suggested action:** New SPEC `M4_INFRA_EF_DEPLOY_DIAGNOSTIC` — try a tiny no-op deploy (single empty function) to determine if the issue is per-function, per-payload, or platform-wide. If platform-wide, raise Supabase support ticket. The pre-Rung-2 path needs to also redeploy `lead-intake` (Rule 2.1) — if the issue persists, both deploys must be done manually by Daniel via CLI.

## F2 — `db-schema.sql` for Module 4 NOT updated for `tenants.payment_links`

- **Severity:** LOW (no functional impact; documentation drift)
- **Location:** `modules/Module 4 - CRM/docs/db-schema.sql`
- **What happened:** Rung 1 added the column but did not append the column definition to the module-scoped schema doc. CLAUDE.md §10 Integration Ceremony says module schemas merge to GLOBAL_SCHEMA at phase close. Rung 1 isn't a phase close — but the column's authoritative home is M4 since payments belong to M4. (Or arguably M5 since `tenants` is platform-level. Foreman call.)
- **Suggested action:** Single-line append to `modules/Module 4 - CRM/docs/db-schema.sql` referencing `tenants.payment_links` as a payment-coupling column. Defer to next M4 docs commit; not worth its own SPEC.

## F3 — Foreman SPEC criterion #17 had wrong absolute number

- **Severity:** LOW (caught by executor's pre-state baseline)
- **Location:** `P5_V2_REBUILD_RUNG1_PLUMBING/SPEC.md` §3 Part C row 17
- **What happened:** SPEC stated expected=28, actual=36. The criterion's own arithmetic prose `24 + 4 = 28` ignored the 4 inactive QA test templates and the 4 confirmation templates (event_registration_confirmation_*, event_waiting_list_confirmation_*) that already existed pre-Rung-1.
- **Suggested action:** Author-skill improvement proposal in this SPEC's FOREMAN_REVIEW (when the Foreman writes it): require absolute counts in success criteria to be derived from a pre-state SELECT, not estimated. Fold into SPEC_TEMPLATE.md §3.

## F4 — `crm-helpers.js` TIER2_STATUSES does NOT include `waitlist`

- **Severity:** INFO (already known; the M4_LEAD_STATUS_WAITLIST_SYNC micro-SPEC handles it)
- **Location:** `modules/crm/crm-helpers.js:90-97`
- **What happened:** Confirmed during cross-reference grep — current Tier 2 set is `waiting / invited / confirmed / confirmed_verified / not_interested / unsubscribed`. The micro-SPEC will add `waitlist`.
- **Suggested action:** None — already covered by the queued micro-SPEC.

---

*End of FINDINGS — 4 findings, 0 critical, 1 medium, 2 low, 1 info.*
