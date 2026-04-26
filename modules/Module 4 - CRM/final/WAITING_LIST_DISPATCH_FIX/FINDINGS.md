# FINDINGS — WAITING_LIST_DISPATCH_FIX

---

## F1 — Same EF-deploy infra failure — HIGH (known, 4th occurrence)

**Severity:** HIGH (known infra)
**Location:** `mcp__claude_ai_Supabase__deploy_edge_function` for
`event-register`.
**Description:** Fourth SPEC in a row where `event-register` EF deploy
via MCP returns `InternalServerErrorException`. Pattern is robust
enough to codify: any change to `event-register` requires a manual
CLI deploy step. Code merges fine; runtime state lags until Daniel
runs `supabase functions deploy`.
**Suggested next action:** Long-term — escalate to Supabase support
(or investigate a build-artifact issue specific to this EF). Short-
term — bake the manual deploy into an OPEN_ISSUE and follow Proposal
2 from this SPEC's EXECUTION_REPORT (deploy-state tracking file).

---

## F2 — `CrmAutomation.evaluate` with zero matching active rules returns silently — INFO

**Severity:** INFO
**Location:** `modules/crm/crm-automation-engine.js:evaluate`.
**Description:** When `event_status_change` is triggered and every
matching rule is `is_active=false` (as happens now for status=
waiting_list on demo after this SPEC), `evaluate` returns
`{fired:0, sent:0, failed:0, skipped:0}` without any Toast or
console log. This is correct behavior (the rule is deliberately
disabled) but noisy to diagnose — an operator clicking status-
change might wonder "did anything happen?". The client code does
log activity (`crm.event.status_change`) independently, so there's
DB trace, just no user-visible signal.
**Suggested next action:** None required — disabling a rule is an
intentional product action and the DB trace is sufficient. If
Daniel wants Toast feedback on status changes with no rule
(just informing the operator), it's a ~5-line addition in
`crm-event-actions.js:changeEventStatus` after
`CrmAutomation.evaluate` returns.

---

## F3 — `dispatchRegistrationConfirmation` queues modal but I ran it headlessly — INFO

**Severity:** INFO (test-environment quirk, not a bug)
**Location:** My QA flow, not product code.
**Description:** During live QA, I called
`CrmEventRegister.registerLeadToEvent` via `evaluate_script` to
register two leads programmatically. The internal call chain does
`dispatchRegistrationConfirmation` → `CrmAutomation.evaluate('event_registration', ...)`
→ `CrmConfirmSend.show(planItems)`. The `show` opens a modal
that requires user approval. I didn't click through, so the
per-attendee confirmation messages (from rules #8/#9 matching
attendee.created) never left. The SPEC's assertion ("no broadcast
on status transition") was still verifiable — zero rows in
`crm_message_log` proves the broadcast didn't happen AND the
unapproved confirmations didn't either. In real UI usage, the
operator would click "אשר ושלח" for each and the per-attendee
messages would dispatch.
**Suggested next action:** Proposal 2 from EXECUTION_REPORT —
build a `CrmTest.fastRegister` harness that auto-approves for
in-session QA. Not worth adding on its own; bundle with next
test-infrastructure SPEC.

---

## F4 — Test-event accumulation on demo continues — LOW

**Severity:** LOW
**Location:** `crm_events` on demo tenant.
**Description:** Event #10 WLDF_QA now joins the demo clutter pile
(WAITING_LIST_QA #6, POST_WL_FIXES_QA #9, etc.). Previous SPEC
(POST_WAITING_LIST_FIXES FINDINGS F3) flagged this. The soft-delete
cleanup one-liner is still valid:
```sql
UPDATE crm_events SET is_deleted=true WHERE tenant_id=
'8d8cfa7e-cfa7e-ef58-49af-9702-a862d459cccb' AND (name LIKE '%QA%' OR name
LIKE '%TEST%');
```
**Suggested next action:** One-liner when Daniel feels it's cluttered.
Not worth a SPEC.
