# FINDINGS — P3B_MAKE_MESSAGE_DISPATCHER

> **Location:** `modules/Module 4 - CRM/go-live/specs/P3B_MAKE_MESSAGE_DISPATCHER/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, 2026-04-22)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — Make MCP API-built webhook scenarios cannot run until UI "Re-determine data structure" is triggered

- **Code:** `M4-MAKE-01`
- **Severity:** HIGH
- **Discovered during:** SPEC §13 Test 1 (webhook reachability passed 200 OK) → attempting to run scenario through the webhook with a well-formed payload that should have routed to "template not found" (Route 3). Expected: a single `crm_message_log` row with `status='failed'`. Actual: every execution dies at pre-flight validation.
- **Location:** Make scenario `9103817` (and by extension, ANY webhook-triggered scenario built via `scenarios_create` + `hooks_create` on Make's MCP API). Root cause is at the webhook level (hook `4068400` in my case), not the scenario blueprint.
- **Description:** When a Make webhook is created via `hooks_create(teamName="gateway-webhook", ...)`, the hook's `data` is populated with `{ headers, method, stringify, teamId }` — but crucially **no Data Structure (UDT) is linked**. Make's scenario runtime validates all module parameter references (e.g. `{{1.tenant_id}}`, `{{1.variables.email}}`) against the webhook's output schema AT DESIGN TIME. With no UDT linked, those references are unbound. Result: every scenario execution — even with a well-formed POST — fails with `BundleValidationError: Validation failed for 4 parameter(s)`. The "4 parameter(s)" is consistent across every execution regardless of payload content, because the validation happens before the payload is even inspected. After 3 consecutive errors, Make auto-deactivates the scenario.

- **Reproduction:**
  ```
  # 1. Create webhook via API
  mcp__claude_ai_Make__hooks_create({
    teamId: 402680, name: "Test Hook",
    typeName: "gateway-webhook",
    data: { headers: false, method: false, stringify: false }
  })
  # → returns hookId and webhook URL. NOTE: data.udt is NOT set.

  # 2. Create scenario with blueprint referencing webhook fields
  mcp__claude_ai_Make__scenarios_create({
    teamId: 402680, folderId: 499779,
    scheduling: {type: "immediately"},
    blueprint: {
      flow: [
        {id: 1, module: "gateway:CustomWebHook", version: 1,
         parameters: {hook: <hookId>, maxResults: 1}, mapper: {}},
        {id: 2, module: "util:SetVariable2", version: 1,
         mapper: {name: "X", scope: "roundtrip", value: "{{1.anything}}"},
         parameters: {}},
        ...
      ], ...
    }
  })
  # → scenario created, isinvalid=false at creation time

  # 3. Activate + POST
  mcp__claude_ai_Make__scenarios_activate({scenarioId: <id>})
  curl -X POST <webhook URL> -d '{"anything":"value"}' → 200 Accepted (queued)

  # 4. Observe
  mcp__claude_ai_Make__executions_list({scenarioId: <id>})
  # → every execution: BundleValidationError, "Validation failed for N parameter(s)"
  # where N equals the number of distinct webhook-field references across all modules.
  ```

- **Expected vs Actual:**
  - Expected: webhook receives payload → scenario fires → routes process → `crm_message_log` row written OR HTTP error returned (if service_role missing).
  - Actual: webhook receives payload (HTTP 200) → scenario fires → aborts at pre-flight validation → `BundleValidationError` → (after 3) scenario auto-deactivated.

- **Workarounds investigated (none fully worked from the MCP side):**
  1. **Simplify blueprint templates** (remove `+` string-concat, remove `encodeURL`) — did not fix. The validation error is schema-level, not template-syntax-level.
  2. **Switch scheduling to `immediately` + `metadata.instant: true`** — did not fix. Only changed timing, not validation.
  3. **`scenarios_run` with sample data** — responds `"Scenario is not activated"` even immediately after `scenarios_activate` returns success. Appears incompatible with webhook-triggered scenarios; may be a non-webhook-only tool.
  4. **`data-structures_generate` → `data-structures_create` → `hooks_update({data: {udt: N}})`** — `data-structures_generate` fails with `Organization-bound request can't be used outside of the Organization Context`. No MCP tool sets org context explicitly. `hooks_update` accepts a `data` object including `udt` — might work with a manually-authored spec — but I stopped rather than go deeper per Bounded Autonomy (new decision not in plan).

- **Fix (UI-only, Daniel action):**
  1. Open Make → team 402680 → Demo folder (499779) → scenario `9103817` "Optic Up — Send Message".
  2. Click the webhook trigger module → "Re-determine data structure" button (this puts the webhook in "listening" mode).
  3. In a terminal: `curl -X POST https://hook.eu2.make.com/b56ocktlm8rcpj52pu12qkthpke71c77 -H "Content-Type: application/json" -d @sample.json` where `sample.json` contains a full webhook payload (example body in `modules/Module 4 - CRM/go-live/make-send-message.md` §"Webhook payload").
  4. In the Make UI, "Successfully determined" notification appears → click "Save" → save the scenario.
  5. Replace `REPLACE_WITH_SERVICE_ROLE_KEY` with the real Supabase service_role key in each of the 4 HTTP modules (id 4 template-fetch, id 8 SMS-log, id 12 Email-log, id 13 error-log) — value goes in the `Authorization: Bearer ...` header after `Bearer `.
  6. Reactivate the scenario. Tests 4, 5, 6 from the SPEC should then pass.

- **Suggested next action:** NEW_SPEC — "Make MCP Pre-Flight Protocol for webhook scenarios"
- **Rationale for action:** P3b is the first SPEC in Optic Up history that built a Make scenario via MCP. Every future Make-MCP SPEC will hit this same gate. A small pre-flight procedure — documented once in opticup-strategic's SKILL.md and/or in a dedicated reference file — would pre-empt future occurrences. Alternative: Deep investigation of whether `hooks_update({data: {udt: N}})` with a pre-authored UDT spec can bypass the UI step entirely. If it works, the next SPEC bakes that into a reusable helper and the issue is permanently solved. Estimated scope: 1-2 hours of API spike + documentation = small follow-up SPEC, not urgent since Daniel's UI step is 60-90 seconds.
- **Foreman override (filled by Foreman in review):** { }

---
