# FINDINGS — P33_PLACEHOLDER_GUARD_AND_COUPON_FIX

> Findings discovered during P33 execution. Per executor playbook: log, do not fix, surface to Foreman.

---

## Finding P33-001 — `mcp__claude_ai_Supabase__deploy_edge_function` returned 500 for the THIRD consecutive SPEC

- **Severity:** HIGH (operational — escalated from MEDIUM in P29 + P31 due to the third occurrence)
- **First observed:** P29 commit 5 (dispatch-queue EF, 2x)
- **Second observed:** P31 commit 3 follow-up (send-message EF, 1x)
- **Third observed:** P33 commit 2 follow-up (send-message EF, 1x)

### Evidence

`mcp__claude_ai_Supabase__deploy_edge_function` payload: 6 source files. Single attempt response:

```
{"error":{"name":"InternalServerErrorException","message":"Function deploy failed every time"}}
```

Same generic shape as the prior two SPECs. Daniel deployed P29 + P31 EFs via Supabase CLI manually; same workaround needed here.

### Pattern

| SPEC | EF | Files in payload | Result |
|---|---|---|---|
| P29 | dispatch-queue | 2 | 500 (×2 attempts) |
| P31 | send-message | 6 | 500 (×1 attempt) |
| P33 | send-message | 6 | 500 (×1 attempt) |

The single common factor: every multi-file EF deploy via this MCP tool fails. Possibly related to payload size (6 files × ~150-300 lines each ≈ 12-15K JSON), import-map handling, or an internal Supabase API path that the MCP wrapper hits. Single-file EFs (apply_migration, get_edge_function, get_logs) all work fine.

### Why escalation now

P31 FINDINGS.md P31-001 already proposed two paths forward:
1. Drop MCP deploy from the executor playbook ("not autonomous-friendly"); update the executor SKILL to skip the attempt entirely
2. Implement P29's pre-flight test-deploy proposal so the executor surfaces it before code commits, not after

Neither was implemented before P33; P33 hit the same wall. The cost is now ~5 minutes per SPEC (one failed deploy + handoff message) PLUS Daniel context-switching to run a manual CLI command. At three SPECs, that's measurable lost time.

### Suggested follow-up

Foreman + Daniel should pick a path. Options ordered by effort:
- **(zero-effort)** Update opticup-executor SKILL.md to mark `deploy_edge_function` MCP as "untrusted; expect failure on multi-file EFs; commit code, push develop, signal Daniel for CLI deploy as the standard close step." Removes the friction without investigating the platform issue.
- **(low-effort)** Add a Make scenario or GitHub Action that auto-deploys `send-message` and `dispatch-queue` on `main` branch push. Develop→main merge becomes the deploy trigger; Daniel doesn't run anything manual.
- **(medium-effort)** Open a Supabase support ticket with the failed payloads. The error message gives no actionable detail; their server logs would have the real cause. Future executors might benefit if it's fixed.

Recommendation: zero-effort option for now (codify the manual-CLI step as standard); revisit if Supabase publishes a fix or if the deploy frequency increases.

---

## Finding P33-002 — Null `coupon_code` on an event will substitute to empty string (operator-visible blank, not customer-facing broken)

- **Severity:** LOW (design observation; documented for future operator clarity)

### Evidence

Fix A's design: `vars.coupon_code = ev.coupon_code || ""`. When `ev.coupon_code IS NULL`, `vars.coupon_code` becomes `""`. `substituteVariables` substitutes the empty string into the body, leaving an empty space where the coupon would have appeared.

The universal scan from Fix B will NOT fire (no `%coupon_code%` literal remains). The dispatch succeeds.

### Why this matters

If a future event has `coupon_code IS NULL`, the email will dispatch with a blank coupon-code area where the customer expected a code. Customer impact: confusion ("where's my coupon?"). Operator-side: no failed log row to surface the issue.

### Why it's acceptable

Pre-flight verified all 5 active Prizma events have non-null coupon_code values. No null-coupon edge case exists today. The design choice (empty-string fallback vs explicit `null`) was intentional: keeping the placeholder as `%coupon_code%` would have triggered the universal scan and rejected the dispatch — but a null coupon code at the event row is more likely a data-entry error than a malicious payload, so silently substituting to empty is the gentler default.

### Suggested follow-up

If/when the first null-coupon-code event appears, decide:
- (a) Add a CHECK constraint on `crm_events.coupon_code IS NOT NULL`
- (b) Mark `coupon_code` as required in templates that use it (so the P31 contract layer catches it pre-substitution)
- (c) Keep current behavior (silent empty-string)

Document the chosen approach in db-schema.sql.

---

## Finding P33-003 — `crm-message-error-labels.js` does not yet have a Hebrew label for `unsubstituted_placeholder`

- **Severity:** LOW (UI polish; functional fallback works)

### Evidence

`CrmMessageErrorLabels.errorLabel(rawError)` falls through to raw text for unknown codes per P31 commit 4 design. Operators viewing a P33-rejected dispatch in the failed-msg UI will see something like:

```
unsubstituted_placeholder: coupon_code,event_name
```

Functional but English-only.

### Suggested follow-up

Add to the EXACT/PREFIX maps in `crm-message-error-labels.js`:

```js
// EXACT
'unsubstituted_placeholder': 'משתנה לא הוחלף בתבנית',
// PREFIX
{ prefix: 'unsubstituted_placeholder:', label: 'משתנה לא הוחלף בתבנית' }
```

~3 lines. No file-size impact. Defer to a daytime-edit cycle since the failure is rare and the raw text already conveys the meaning to a Hebrew operator who reads English.

---

## Finding P33-004 — Foreman authoring quality issue (already acknowledged in SPEC)

- **Severity:** INFO (process-level; SPEC §11 already self-flagged)

The P32-001 bug existed because P31's SPEC declared `coupon_code` was auto-filled, but the matching EF code was never written. The SPEC's claim was not verified by a live grep before authoring. SPEC §11 explicitly acknowledges this:

> The Foreman's mistake on P31 — declaring coupon_code was auto-filled without verifying the EF actually injected it. Lesson: every architectural claim in a SPEC's §1 MUST be backed by a live grep or DB query.

Recommended skill update for opticup-strategic: pre-flight grep gate on every architectural claim. SPEC SKILL §"SPEC Authoring Protocol" should require a grep verification block in §2 of every SPEC for any architectural claim that says "the EF does X" or "the auto-fill set includes Y".

---

*4 findings total: 1 HIGH (recurring MCP deploy issue, escalated from MEDIUM after third occurrence), 1 LOW (null-coupon design choice — documented for future), 1 LOW (Hebrew label gap), 1 INFO (process-level Foreman-quality lesson, already self-flagged in SPEC).*
