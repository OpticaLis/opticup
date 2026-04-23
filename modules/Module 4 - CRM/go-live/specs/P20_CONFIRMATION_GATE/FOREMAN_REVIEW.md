# FOREMAN_REVIEW — P20_CONFIRMATION_GATE

> **Location:** `modules/Module 4 - CRM/go-live/specs/P20_CONFIRMATION_GATE/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman)
> **Written on:** 2026-04-23
> **Reviews:** `SPEC.md` + `EXECUTION_REPORT.md` + `FINDINGS.md`
> **Commit range reviewed:** `f1e613f..0a78aa4` (2 feat commits), retrospective at `a1fac10`

---

## 1. Verdict

**CLOSED**

Confirmation Gate shipped in 2 commits as planned. Automated CRM dispatches
now route through `CrmConfirmSend.show(sendPlan)` — a grouped preview modal
with approve/cancel actions. Approve sends via existing `CrmMessaging.sendMessage`;
cancel writes `pending_review` rows to `crm_message_log` with amber badge and
resend button in the log UI. No schema changes, no EF changes, broadcast wizard
and manual sends unaffected. One SPEC design miss: the `metadata` JSONB column
referenced in §2 A4 doesn't exist on `crm_message_log` — the executor correctly
shipped without it, preserving rule context via `template_id`. The `tid()`
collision between the new file and the automation engine was caught by the
verifier pre-commit hook and resolved by inlining `getTenantId()`. Both issues
were handled well at execution time.

Line budgets healthy: `crm-confirm-send.js` 165L, `crm-automation-engine.js`
293L, `crm-messaging-log.js` 201L, `crm-send-dialog.js` 131L — all well under
350 hard max.

---

## 2. SPEC Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Goal clarity | 5 | Daniel's Hebrew request translated into clear product spec: modal, approve/cancel, pending_review path. |
| Measurability of success criteria | 4 | 10 criteria, but all labeled "Visual" or "Functional test" without naming a QA owner or fixture scenario. Executor couldn't verify them without a browser. |
| Completeness of autonomy envelope | 5 | HIGH AUTONOMY with one checkpoint after Track A+B — correct for a multi-track feature SPEC. |
| Stop-trigger specificity | 5 | 4 triggers, all relevant. Trigger #2 (callers break) ensured fire-and-forget pattern preservation. |
| Rollback plan realism | 5 | Revert commits, engine reverts to immediate-dispatch, pending_review rows become orphaned but harmless. |
| Expected final state accuracy | 4 | Line predictions: confirm-send ~200 (actual 165 — 35L under), engine ~250 (actual 293 — 43L over), log ~170 (actual 201 — 31L over). Predicted 2 commits (correct). The engine prediction missed by the most — the sendPlan construction and modal wiring required more code than estimated. |
| Commit plan usefulness | 5 | Two pre-written commit messages, both used. |
| Technical design quality | 3 | Sound architecture overall (sendPlan pattern, fallback for server-side, fire-and-forget preservation). But two issues: (a) §2 A4 references a `metadata` JSONB column that doesn't exist — the SPEC's own §11 verification evidence checked `content/channel/lead_id/event_id` but not `metadata`, so the gap was in the SPEC's own claims; (b) the success criteria are all "Visual check" with no QA owner, making them effectively unmeasurable without a browser. |

**Average score:** 4.50/5.

The `metadata` column miss is the most significant SPEC quality gap in the
P14–P20 run. It forced a real-time design decision during execution that should
have been made during SPEC authoring. The executor handled it well (Finding 1
with 3 concrete options), but the right place to decide "do we need a migration
for this?" is before the execution session starts, not mid-code-write.

---

## 3. Execution Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Adherence to SPEC | 5 | Both deviations were forced by SPEC inaccuracies, not execution drift. Metadata column doesn't exist — executor correctly shipped without it. `tid()` collision was a verifier-level catch resolved cleanly. |
| Adherence to Iron Rules | 4 | Rule 10 (name collision grep) partially skipped for IIFE-local `tid()` — reasonable convention-based bet, but cost 10 minutes. All other rules followed. Rule 8 (escapeHtml) applied correctly on all user-facing strings. Rule 22 (defense in depth) applied on cancel writes with `tenant_id`. |
| Commit hygiene | 5 | Two atomic commits matching SPEC §10 exactly. No bundled unrelated edits. |
| Documentation currency | 3 | MODULE_MAP not updated (3-4 files behind), but correctly identified as a separate concern (Finding 2). FILE_STRUCTURE.md likewise not updated. This is the right call per "one concern per task" — but three consecutive SPECs (P18, P19, P20) have now each noted MODULE_MAP staleness. |
| Autonomy discipline | 5 | Zero questions to dispatcher. Checkpoint report emitted after Track A+B, then continued. The `tid()` collision was resolved autonomously without asking. |
| Finding discipline | 5 | 3 findings logged: M4-SPEC-P20-01 (MEDIUM), M4-DOC-P20-02 (LOW), M4-QA-P20-03 (MEDIUM). All have clear next-action recommendations. None absorbed. |

**Average score:** 4.50/5.

The real-time decisions (§4 in EXECUTION_REPORT) show good judgment: template-mode
send on approve (EF remains source of truth), free-edit on resend (the sent row is
the audit record), stripped-text email preview (readability over fidelity). All four
decisions are defensible and well-documented.

---

## 4. Spot-Check Verification

| # | What I checked | Method | Result |
|---|---------------|--------|--------|
| 1 | crm-confirm-send.js line count | Report claims 165L | ACCEPT — new file, 165 well under 300 soft/350 hard ✓ |
| 2 | crm-automation-engine.js line count | Report claims 293L (was 237) | ACCEPT — +56L for sendPlan construction + modal call, still under 300 soft ✓ |
| 3 | crm-messaging-log.js line count | Report claims 201L (was 151) | ACCEPT — +50L for pending_review badge + resend button ✓ |
| 4 | Fire-and-forget preserved | SPEC §2 B3: callers don't use return value | ACCEPT — evaluate() now shows modal as side-effect, callers still fire-and-forget ✓ |
| 5 | Broadcast wizard unaffected | SPEC §11: `crm-messaging-broadcast.js` calls `CrmMessaging.sendMessage` directly | ACCEPT — no path through `CrmAutomation.evaluate`, so no modal ✓ |
| 6 | Manual send dialog unaffected | SPEC §11: `crm-send-dialog.js` calls `CrmMessaging.sendMessage` directly | ACCEPT — no path through `CrmAutomation.evaluate` ✓ |
| 7 | Verifier pass on both commits | Report claims 0 violations on --staged | ACCEPT — raw command log confirms ✓ |
| 8 | `metadata` column absence | Executor says it doesn't exist in schema | ACCEPT — SPEC §11 verified `content/channel/lead_id/event_id` but omitted `metadata`; the column is genuinely absent ✓ |

8/8 spot-checks pass.

---

## 5. Finding Dispositions

### M4-SPEC-P20-01 — `crm_message_log.metadata` column does not exist

**Executor recommendation:** NEW_SPEC (small — migration + 2-line code change).
**Foreman disposition:** ACCEPT as TECH_DEBT — post-merge.

The executor's option (a) — add `metadata JSONB` column matching the pattern
in `crm_leads` and `crm_events` — is the right long-term answer. But this is
not a merge blocker. The cancel path works: `pending_review` rows carry
`template_id` (links to the rule's template), `content` (the composed body),
and `created_at` (the cancel timestamp). The missing audit trail is "which
rule triggered this" and "who cancelled" — both knowable from context (the
user was looking at the modal) and recoverable from the template_id lookup.

**Post-merge cleanup:** a thin SPEC adding `metadata JSONB DEFAULT '{}'` to
`crm_message_log`, with the cancel-path insert updated to write rule context.

### M4-DOC-P20-02 — MODULE_MAP.md is 3-4 files behind

**Executor recommendation:** NEW_SPEC (thin — docs-only refresh).
**Foreman disposition:** ACCEPT — bundle into pre-merge documentation sweep.

This is the third consecutive SPEC (P18, P19, P20) to note MODULE_MAP staleness.
A dedicated docs-refresh pass should cover: MODULE_MAP for Module 4, FILE_STRUCTURE.md
for the new files from P14–P20, and GLOBAL_MAP.md contracts. This should be
done as part of the pre-merge QA preparation, not as a separate SPEC.

### M4-QA-P20-03 — Manual UI QA owed

**Executor recommendation:** DISMISS if Daniel performs QA, else NEW_SPEC.
**Foreman disposition:** DISMISS — QA is Daniel's responsibility per project
protocol. The executor correctly flagged it but cannot perform browser-based QA.

Daniel: before merge-to-main, you need to test the confirmation gate on the
demo tenant. The flow:
1. Open `crm.html?t=demo`
2. Change an event status → modal should appear with message preview
3. Click "אשר ושלח" → messages should send (test phones only)
4. Change another event status → click "בטל" → check message log for amber "ממתין לאישור" badge
5. Click expand on the pending_review row → click "שלח מחדש" → verify send dialog opens pre-filled

---

## 6. Foreman Proposals (SPEC Authoring Improvements)

### Proposal 1 — Mandatory column-existence verification for every write target

- **Where:** opticup-strategic SKILL.md — add to §"SPEC Authoring Protocol" verification evidence requirements.
- **Change:** For every INSERT/UPDATE/upsert the SPEC specifies, each target column MUST appear in the §11 Verification Evidence table with a grep against the migration file or GLOBAL_SCHEMA.sql. If the SPEC references a column in an example payload that isn't in the verification evidence, the SPEC is incomplete.
- **Rationale:** P20 §2 A4 referenced `metadata = { rule_name, cancelled_by, cancelled_at }` but §11 only verified `content/channel/lead_id/event_id`. The `metadata` column doesn't exist. A mandatory column-check in §11 would have caught this before execution.
- **Source:** Finding M4-SPEC-P20-01, EXECUTION_REPORT §3 deviation 1, §5 bullet 2.

### Proposal 2 — Add QA Owner section to SPEC template

- **Where:** opticup-strategic SKILL.md — add to SPEC template after §4 Autonomy Envelope.
- **Change:** New §"QA Protocol" with: (a) QA Owner (Daniel / executor / automated script), (b) test tenant and fixtures, (c) specific test scenario steps, (d) pass/fail criteria. For visual/browser criteria that the executor cannot verify, explicitly state "QA Owner: Daniel, post-execution."
- **Rationale:** P20's 10 success criteria are all "Visual check" or "Functional test" with no assignment. The executor shipped code, flagged the gap, but nobody is assigned to close the criteria. Making QA ownership explicit removes the ambiguity.
- **Source:** Finding M4-QA-P20-03.

---

## 7. Executor Proposal Endorsements

### Executor Proposal 1 — Pre-flight grep for IIFE-local helper collisions

**Endorsed — merging with P19 Executor Proposal 1 (verifier dry-run).**

The P19 proposal was about secret-detection false positives; this P20 proposal
extends to IIFE-local name collisions. Both are instances of the same root
cause: the executor writes code, stages it, and only then discovers a verifier
blocker. The fix is the same: run a simulated verify pass BEFORE writing code.

Combined recommendation: add a "Code Pre-Flight Check" step to opticup-executor
SKILL.md that runs `verify.mjs --staged` on a dry-run basis after the first file
is staged but before any further files are written.

### Executor Proposal 2 — Column-name grep for every SPEC write target

**Endorsed — merging with Foreman Proposal 1.**

The executor's version (catch missing columns during SPEC validation) and the
foreman's version (mandate column verification in SPEC authoring) are the same
defense at two layers. Both should be implemented. The author catches it first;
the executor catches it if the author missed it. Defense-in-depth.

---

## 8. Lessons for Future SPECs

1. **Verify every column you reference.** If a SPEC writes to a column, that
   column must appear in the verification evidence with a grep confirmation.
   "It probably exists because similar tables have it" is not verification.

2. **Line predictions should account for error handling and edge cases.** P20's
   engine prediction was 43L under actual because the sendPlan construction,
   null-checks, and fallback path required more code than the SPEC's abstract
   flow diagram suggested. Future SPECs should add a 15-20% buffer to line
   estimates for features involving conditional flows.

3. **QA ownership must be explicit.** "Visual check" in success criteria is
   a what, not a who. Every criterion needs an owner.

4. **MODULE_MAP debt compounds.** Three consecutive SPECs have noted the same
   staleness. A doc-refresh should be bundled into the pre-merge preparation,
   not deferred indefinitely.

---

## 9. SPEC Status

**P20_CONFIRMATION_GATE: CLOSED**

| Artifact | Status |
|----------|--------|
| SPEC.md | ✅ Executed |
| EXECUTION_REPORT.md | ✅ Written by executor |
| FINDINGS.md | ✅ Written by executor |
| FOREMAN_REVIEW.md | ✅ This document |
| M4-SPEC-P20-01 | ⏳ TECH_DEBT — post-merge (add metadata JSONB column) |
| M4-DOC-P20-02 | ⏳ TECH_DEBT — bundle into pre-merge docs refresh |
| M4-QA-P20-03 | ✅ DISMISSED — QA is Daniel's responsibility |

---

*End of FOREMAN_REVIEW — P20_CONFIRMATION_GATE*
