# FINDINGS — M3_UTM_TRIPLE_LAYER_PERSISTENCE

> 2 findings logged. Both are LOW + INFO severity, deferrable. Neither cleared the §5 stop-trigger threshold of "constitutes a live production bug" requiring immediate escalation.

---

## FIND-1 — INFO — Pattern OPEN-021 (Supabase MCP `deploy_edge_function` 5xx) recurred for the 5th+ time

**Severity:** INFO (process / platform observation; not a code defect)
**Location:** Tooling — Supabase MCP `deploy_edge_function` endpoint
**Discovered:** during execution of this SPEC (4 deploy failures including a minimal 7-line sanity payload)

### Description
MCP `deploy_edge_function` returned `InternalServerErrorException` 4 consecutive times for both `resolve-link` (3 attempts: full payload, simplified path, minimal sanity) and `lead-intake` (would have been the 5th but I pivoted before attempting). The pattern has now manifested at least 5 times across SPECs:
- 2026-05-06 `M4_TENANT_ISOLATION_HARDENING_PART2` (×2)
- 2026-05-06 `M4_HARDCODED_PRIZMA_REMOVAL` (×4 on 4 different EFs)
- 2026-05-06 `M4_UNSUB_SUPPRESSION_CRIT` (×2)
- 2026-05-06 `M4_PUBLIC_FORM_VARIABLES_HIGH` (×2)
- 2026-05-13 `STATUS_CHANGE_TRIGGERS_FRAMEWORK` (per SPEC notes)
- **2026-05-14 this SPEC** (×4)

Each time, the resolution has been the same: Daniel runs `supabase functions deploy <name>` from his local shell.

`get_logs` API also returned a Supabase-platform-side BigQuery reservation error during the diagnostic, suggesting the underlying analytics extension may be intermittently degraded.

### Suggested next action
Add a pattern-recognized auto-fallback to the executor SKILL — see EXECUTION_REPORT §9 Proposal 1. Specifically: on second MCP deploy failure with `InternalServerErrorException`, write the source to `supabase/functions/<name>/index.ts` and emit a single chat line asking Daniel to run the CLI deploy. Skips the AskUserQuestion round-trip when the answer is known-default Option 2.

Optional: open a Supabase support ticket from Daniel's side with the failure trace + project ref to ask if there's a Edge Function build queue issue. Not blocking.

---

## FIND-2 — INFO — Storefront does not yet plumb `referrer_url` + `landing_url` to lead-intake

**Severity:** INFO (forward-compat gap, not a defect)
**Location:** Storefront repo `opticup-storefront/` — `/supersale/` form submit code (not read in this SPEC; cross-repo)

### Description
`lead-intake` EF v25 now accepts optional `referrer_url` + `landing_url` body fields and forwards them into the `lead_submit` touchpoint row. Today the storefront's `/supersale/` form does NOT send these — touchpoint rows on real production traffic will have `referrer_url=NULL` and `landing_url=NULL`. This is by design for the initial cut: the schema supports the fields, the EF reads them when present, but storefront-side plumbing is a follow-up.

Demo Scenario B verified the wiring works when those fields ARE sent (the test passed `referrer_url='https://www.facebook.com/'` and `landing_url='https://demo.example.com/supersale/'` and they landed in the touchpoint row).

### Suggested next action
Open a small SPEC `M3_STOREFRONT_FORM_REFERRER_LANDING_CAPTURE` (~30 minutes) to:
1. Storefront `/supersale/` form: capture `document.referrer` + `window.location.href` at submit time.
2. POST them into `lead-intake` body as `referrer_url` + `landing_url`.
3. Verify with a manual click-through that touchpoint row gets non-NULL values.

This is forward-compat enrichment. Phase 2.5 Funnel Health Dashboard can already work without it (the new touchpoint type/UTM bag/lead_id/event_id are the primary slice keys). The referrer/landing pair adds context for journey reconstruction in Phase 4.

---

## Summary

| ID | Severity | Class | Suggested next action |
|---|---|---|---|
| FIND-1 | INFO | Tooling / Platform | EXECUTION_REPORT §9 Proposal 1 (skill update) + optional Supabase support ticket |
| FIND-2 | INFO | Storefront forward-compat | New small SPEC `M3_STOREFRONT_FORM_REFERRER_LANDING_CAPTURE` (~30 min) |

**Counts:** 0 CRITICAL · 0 HIGH · 0 MEDIUM · 0 LOW · 2 INFO · **2 total.**

No findings cleared the SPEC's §5 stop-trigger threshold. P1.1 closes cleanly.

---

*End of FINDINGS.md.*
