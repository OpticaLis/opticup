# FINDINGS — M4_PUBLIC_FORM_VARIABLES_HIGH

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_PUBLIC_FORM_VARIABLES_HIGH/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — `event-variables.ts` HH:MM-only branch is dead code in production data

- **Code:** `M4-INFO-01`
- **Severity:** INFO
- **Discovered during:** §10 + §12 pre-flight (attempting to create the SPEC's "Event B with `end_time IS NULL`")
- **Location:** `supabase/functions/send-message/event-variables.ts:90` (the `else` branch of `if (startStr && endStr) … else …`)
- **Description:** `crm_events.end_time` is declared `NOT NULL DEFAULT '14:00:00'`. The fallback branch in `injectEventVariables` that handles a missing `end_time` (renders `HH:MM` only, no dash, no range) is therefore unreachable for any event row created through the normal write path. The SPEC §10 precondition asking for "another test event with `end_time IS NULL`" is schema-impossible.
- **Reproduction:**
  ```sql
  SELECT column_name, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='crm_events' AND column_name='end_time';
  -- → is_nullable: NO, column_default: '14:00:00'::time without time zone
  ```
- **Expected vs Actual:**
  - Expected (per SPEC): create a `registration_open` event with `end_time IS NULL` for E2E testing of the HH:MM-only branch.
  - Actual: schema rejects NULL; no such row can exist via normal writes.
- **Suggested next action:** DISMISS (or TECH_DEBT if Foreman wants to retire the dead branch). The branch is harmless. No customer impact. The SPEC's QA plan should drop this precondition next time and rely on code review for the unreachable branch.
- **Rationale for action:** The fix is verified correct by Test 1 (the only practically reachable case in production). The dead branch costs no runtime, and removing it would require a code change and redeploy with no behavioral upside.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — `crm_message_log` schema is missing `recipient_phone` / `recipient_email` columns referenced by SPEC §3 #8

- **Code:** `M4-DOC-02`
- **Severity:** LOW
- **Discovered during:** §3 success-criterion verification
- **Location:** `crm_message_log` table (real schema vs SPEC §3 #8 expectation)
- **Description:** SPEC §3 criterion 8 says "every fired message → phone `+972537889878`, email `daniel@prizma-optic.co.il`" verified by `SELECT recipient_phone, recipient_email FROM crm_message_log WHERE id IN (...)`. The actual columns of `crm_message_log` are `id, tenant_id, lead_id, event_id, template_id, broadcast_id, channel, content, status, external_id, error_message, created_at, run_id` — no `recipient_phone` / `recipient_email`. The recipient is reconstructed at send time from the lead row's `phone` + `email`, then rendered into `content`.
- **Reproduction:**
  ```sql
  SELECT column_name FROM information_schema.columns
  WHERE table_schema='public' AND table_name='crm_message_log';
  ```
- **Expected vs Actual:**
  - Expected (per SPEC §3 #8): direct columns `recipient_phone`, `recipient_email`.
  - Actual: contact info lives only in `content` (rendered) and on `crm_leads` (source).
- **Suggested next action:** DISMISS for next-SPEC author awareness; OR optionally TECH_DEBT to add denormalized `recipient_phone` / `recipient_email` columns to `crm_message_log` for audit/traceability without re-deriving from the lead row (which mutates).
- **Rationale for action:** Verification was still possible — the SPEC's intent (whitelist enforcement) was met by the lead's pre-insert phone/email + the rendered `content`. The doc inaccuracy is minor and mostly affects future SPEC authoring.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — Supabase MCP `deploy_edge_function` recurrence pattern (OPEN-021)

- **Code:** `M4-INFRA-03`
- **Severity:** MEDIUM
- **Discovered during:** SPEC step "Deploy event-register EF"
- **Location:** Supabase Management API path (external; no source file in this repo)
- **Description:** `deploy_edge_function` returned `InternalServerErrorException: "Function deploy failed due to an internal error"` on both attempts (within seconds of each other) for the `event-register` deploy. Same symptom as ATOMIC_CONFIRMATION_FLOW (4 consecutive failures) and Phase 1 OPEN-021. Daniel deployed via local `supabase functions deploy` CLI without issue. This is now the second SPEC in two weeks where MCP deploy fails and CLI succeeds.
- **Reproduction:**
  ```
  mcp__claude_ai_Supabase__deploy_edge_function(project_id="tsxrrxzmdxaenlvocyit", name="event-register", entrypoint_path="event-register/index.ts", verify_jwt=false, files=[...])
  ```
- **Expected vs Actual:**
  - Expected: 200 + new version number.
  - Actual: `InternalServerErrorException` with no detail. CLI deploy from same source content + same project: 200 + v14.
- **Suggested next action:** TECH_DEBT — formally document the MCP-deploy failure mode in `docs/TROUBLESHOOTING.md` and the executor SKILL with the canonical Daniel-CLI workaround command. Also flag to Anthropic/Supabase support if not already.
- **Rationale for action:** This is now a repeat infrastructure issue that costs ~10 minutes of executor session time per occurrence (escalate, wait for Daniel, verify, resume). Codifying the workaround in TROUBLESHOOTING shortens the next recovery to 30 seconds.
- **Foreman override (filled by Foreman in review):** { }

---

*End of FINDINGS.*
