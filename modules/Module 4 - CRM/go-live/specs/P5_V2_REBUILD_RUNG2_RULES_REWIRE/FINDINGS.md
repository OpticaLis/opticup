# FINDINGS — P5_V2_REBUILD_RUNG2_RULES_REWIRE

> Findings discovered during Rung 2 execution that are NOT in scope for Rung 2.

---

## F1 — SPEC §3 #12 vs #13 redundancy

- **Severity:** LOW
- **Location:** `P5_V2_REBUILD_RUNG2_RULES_REWIRE/SPEC.md` §3 Part C rows 12-13
- **What happened:** Both criteria target the same outcome — over-capacity registration fires T6 — but #12 instructs "repurpose status-change rule" while #13 instructs "rewire attendee.created rule". The status-change rule was already inactive; repurposing it would create a duplicate firing path. The right move was a single UPDATE on the attendee.created rule. SPEC author missed that the two rules already existed for different trigger entities and conflated their purposes.
- **Suggested action:** Foreman SPEC quality proposal: when a SPEC mentions "rewire" or "repurpose" an existing rule, the criterion text should include the rule's existing `(trigger_entity, trigger_event, action_config.template_slug)` for disambiguation. Single-paragraph fix to SPEC_TEMPLATE.md.

## F2 — `attendees` recipient resolver does NOT honor `recipient_status_filter`

- **Severity:** MEDIUM (in practice harmless for current rules; potentially surprising for future rules)
- **Location:** `modules/crm/crm-automation-recipient-resolvers.js:65-79` (the `attendees` branch)
- **What happened:** The `tier2*` and `leads_by_status` branches honor `recipient_status_filter`; the `attendees` branch hard-codes the status list to `['registered','confirmed','attended','purchased','no_show']`. Rules 2.5 + 2.6 set `recipient_status_filter:['confirmed']` per the SPEC, but at runtime the filter is silently ignored — the dispatched audience is broader than the SPEC declares. In practice for SuperSale, the broader audience is harmless because non-`confirmed` attendees in those status values still need the reminder. But a future Daniel rule like "send only to no_show attendees" would silently broaden.
- **Suggested action:** New micro-SPEC `M4_ATTENDEES_RECIPIENT_STATUS_FILTER` — extend the `attendees` resolver to intersect its hard-coded list with `cfg.recipient_status_filter` when provided. ~5 lines. Out of scope for Rung 2 (would have changed semantics for existing rules — needs Foreman approval).

## F3 — Two EF deploys still pending Daniel

- **Severity:** HIGH (blocks Rung 1 + Rung 2 full close)
- **Location:** Supabase Management API
- **What happened:** Same as Rung 1 Finding F1 — `mcp__claude_ai_Supabase__deploy_edge_function` returns 500 for full bundles. Diagnostic probe with `deno.json` only returned a 4xx, confirming the input is parsed; the 500 is downstream of MCP.
- **Suggested action:** Same as Rung 1 F1. Daniel deploys via CLI: `supabase functions deploy send-message --project-ref tsxrrxzmdxaenlvocyit` and `supabase functions deploy lead-intake --project-ref tsxrrxzmdxaenlvocyit`.

## F4 — `db-schema.sql` not updated for Rung 2 DB additions

- **Severity:** LOW (documentation drift)
- **Location:** `modules/Module 4 - CRM/docs/db-schema.sql`
- **What happened:** Rung 2 added a UNIQUE INDEX `uq_crm_message_queue_idem` and the `attendee_moved` trigger semantics; neither documented in the module's schema doc. Same axis as Rung 1 F2.
- **Suggested action:** Single-paragraph append to `db-schema.sql` referencing the index + the triggers used by the engine. Defer to next M4 docs commit.

## F5 — `MODULE_MAP.md` not updated for 2 new JS files

- **Severity:** LOW
- **Location:** `modules/Module 4 - CRM/docs/MODULE_MAP.md`
- **What happened:** New files `crm-automation-recipient-resolvers.js` and `crm-automation-queue-send.js` not yet in MODULE_MAP. Same as Rung 1 F2 axis — Integration-Ceremony class debt.
- **Suggested action:** Bundle into the next M4 docs commit (probably at end of full P5_V2 work).

---

*End of FINDINGS — 5 findings, 1 high (the EF deploy blocker), 1 medium, 3 low.*
