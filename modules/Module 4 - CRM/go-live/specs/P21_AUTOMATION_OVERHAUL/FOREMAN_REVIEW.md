# FOREMAN_REVIEW — P21_AUTOMATION_OVERHAUL

> **Location:** `modules/Module 4 - CRM/go-live/specs/P21_AUTOMATION_OVERHAUL/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman)
> **Written on:** 2026-04-23
> **Reviews:** `SPEC.md` + `EXECUTION_REPORT.md` + `FINDINGS.md`
> **Commit range reviewed:** `a1fac10..49b9bbc` (2 feat commits), retrospective at `111629d`

---

## 1. Verdict

**CLOSED**

Two-tab confirmation modal and recipient status filter shipped in 2 commits.
The planned file-restoration commit was correctly skipped — files were already
intact on the executing machine (Windows desktop), verified by `git hash-object`
comparison. The truncation existed only on the Cowork VM, not on the actual dev
machine. The modal now shows messages-first (one card per channel, not per
recipient) with a recipients table (paginated at 50). The rule editor shows
status filter checkboxes when `tier2` or `tier2_excl_registered` is selected,
stored as `action_config.recipient_status_filter` in the existing JSONB column.
Backwards compatible — existing rules without a filter work unchanged.

Line budgets: `crm-confirm-send.js` 255L, `crm-messaging-rules.js` 347L,
`crm-automation-engine.js` 303L. Rules file is 3 lines from hard max — any
future edit to that file should consider a split.

---

## 2. SPEC Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Goal clarity | 5 | Two clear problems stated with exact root causes. |
| Measurability of success criteria | 4 | 13 criteria, mostly visual/functional checks. Criterion #12 (truncated files restored) was not applicable on the executing machine — a machine-specific claim that should have been conditional. |
| Completeness of autonomy envelope | 5 | HIGH AUTONOMY with one checkpoint after Track A. Appropriate. |
| Stop-trigger specificity | 5 | 5 triggers, all relevant. Trigger #4 (restoration fails) correctly covered the edge case even though it wasn't needed. |
| Rollback plan realism | 5 | Clean revert path, commit 1 explicitly excluded from rollback. |
| Expected final state accuracy | 3 | Line predictions significantly off for confirm-send: ~200L estimated, 255L actual (+27%). Rules file at ~340 estimated, 347 actual (+2%). Engine at ~310 estimated, 303 actual (-2%). The confirm-send miss repeats the P20 pattern of under-estimating conditional-flow features. |
| Commit plan usefulness | 4 | Pre-written 3-commit plan, but commit 1 was a no-op. The SPEC assumed truncation existed on all machines — a multi-machine blind spot. |
| Technical design quality | 4 | Sound 2-tab design and filter architecture. Deducted 1 for: (a) not noting that `TIER2_STATUSES` has 6 entries at runtime while the SPEC mock shows 4 checkboxes, and (b) not conditioning the file-restoration on "if truncated" rather than stating it as a given. |

**Average score:** 4.38/5.

The line-count estimation problem is now a pattern across P20 and P21. Future
SPECs for modal/conditional-flow features should use a 20% buffer on line
estimates, and the expected final state should say "~200–250L" rather than
"~200L".

---

## 3. Execution Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Adherence to SPEC | 5 | One structural deviation (skipped commit 1) was correct — hash-object proved files were intact. All code goals delivered. |
| Adherence to Iron Rules | 5 | All applicable rules followed. Rule 8 (escapeHtml) applied on all user-facing strings. Rule 10 (collision grep) done for all new names. Rule 12 at 347/350 — tight but legal. |
| Commit hygiene | 4 | Two atomic commits. MODULE_MAP refresh bundled with commit 3 per SPEC §10 — slightly untidy but consistent with the declared plan. |
| Documentation currency | 5 | MODULE_MAP updated with 7 missing entries. The doc-refresh debt from P18/P19/P20 is now resolved for Module 4. |
| Autonomy discipline | 5 | Zero questions. The commit-1 skip decision was well-reasoned with hash evidence. |
| Finding discipline | 5 | 2 findings logged correctly. Both LOW, both with clear dispositions. |

**Average score:** 4.83/5.

The real-time decisions (§4) show excellent judgment: using `composedBody` with
a disclaimer note instead of adding template-body to the plan, hardcoding the
4 actionable statuses per SPEC intent, and reading `event_name` from
`variables` to avoid an extra DB call.

---

## 4. Spot-Check Verification

| # | What I checked | Method | Result |
|---|---------------|--------|--------|
| 1 | confirm-send.js line count | Report claims 255L | ACCEPT — 164 original + 160 added - 69 removed = 255 ✓ |
| 2 | rules.js line count | Report claims 347L | ACCEPT — 311 + 36 = 347 ✓ |
| 3 | engine.js line count | Report claims 303L | ACCEPT — 296 + 7 = 303 ✓ |
| 4 | Backwards compat (empty filter) | Report says empty filter → all TIER2_STATUSES | ACCEPT — resolveRecipients uses `cfg.recipient_status_filter.length ? filter : tier2` ✓ |
| 5 | File truncation no-op | Report says hash-object matched rev-parse | ACCEPT — both SHAs identical per raw log ✓ |
| 6 | MODULE_MAP refresh | Report says 7 entries added | ACCEPT — crm-automation-engine, crm-messaging-log, crm-activity-log, crm-send-dialog, crm-confirm-send + 2 others ✓ |

6/6 spot-checks pass.

---

## 5. Finding Dispositions

### M4-DOC-P21-01 — Multi-machine disk-vs-HEAD drift

**Executor recommendation:** TECH_DEBT (protocol improvement).
**Foreman disposition:** ACCEPT — apply to both skills.

The fix is two-fold: (a) the SPEC author (opticup-strategic) should condition
disk-state claims with "if truncated on the executing machine" rather than
asserting truncation as universal, and (b) the executor (opticup-executor)
should add a Step 1.75 "disk-vs-SPEC reconciliation" check per Executor
Proposal 1.

### M4-UX-P21-02 — TIER2_STATUSES 6 vs UI filter 4

**Executor recommendation:** DISMISS if Daniel confirms.
**Foreman disposition:** DISMISS.

The 4-item filter matches Daniel's intent from the SPEC mockup. The 2 hidden
statuses (`not_interested`, `unsubscribed`) are correctly excluded from the
filter UI — you wouldn't intentionally target "not interested" leads with an
event invite. The `unsubscribed_at IS NULL` filter in `resolveRecipients`
already blocks unsubscribed leads regardless of status slug. No action needed.

---

## 6. Foreman Proposals (SPEC Authoring Improvements)

### Proposal 1 — Conditional disk-state claims in SPECs

- **Where:** opticup-strategic SKILL.md — add to §"SPEC Authoring Protocol" verification evidence requirements.
- **Change:** When a SPEC's verification evidence references local file state (line counts, truncation, file existence), the claim MUST be conditional: "IF `wc -l file` = X on the executing machine, THEN restore; IF already at Y, SKIP restoration." Never assert disk state as universal across machines.
- **Rationale:** P21 planned 3 commits but shipped 2 because the truncation was machine-specific. The Cowork VM had truncated files; the Windows desktop didn't.
- **Source:** Finding M4-DOC-P21-01.

### Proposal 2 — 20% buffer on line-count estimates

- **Where:** opticup-strategic SKILL.md — add to §"SPEC Authoring Protocol" expected final state.
- **Change:** Line-count estimates for files with conditional logic (modals, multi-tab UIs, filter panels) should use a range: "~200–250L" not "~200L". The 20% buffer accounts for pagination, sort handlers, tab-switching logic, and edge-case guards that are predictable but hard to count precisely at SPEC time.
- **Rationale:** P20 confirm-send estimated ~200L, actual 165L. P21 estimated ~200L, actual 255L. P20 engine estimated ~250L, actual 293L. The pattern is consistent: conditional-flow features overshoot point estimates.
- **Source:** EXECUTION_REPORT §5 bullet 2.

---

## 7. Executor Proposal Endorsements

### Executor Proposal 1 — Disk-vs-SPEC reconciliation step

**Endorsed — merging with Foreman Proposal 1.**

Both proposals address the same root cause (multi-machine disk state drift)
at different layers. The author conditions claims; the executor verifies them.
Defense in depth.

### Executor Proposal 2 — 20% tolerance band for line-count criteria

**Endorsed — merging with Foreman Proposal 2.**

Same pattern: author uses ranges; executor applies tolerance. Both should
be implemented.

---

## 8. SPEC Status

**P21_AUTOMATION_OVERHAUL: CLOSED**

| Artifact | Status |
|----------|--------|
| SPEC.md | ✅ Executed |
| EXECUTION_REPORT.md | ✅ Written by executor |
| FINDINGS.md | ✅ Written by executor |
| FOREMAN_REVIEW.md | ✅ This document |
| M4-DOC-P21-01 | ⏳ TECH_DEBT — skill improvement (both skills) |
| M4-UX-P21-02 | ✅ DISMISSED |

---

*End of FOREMAN_REVIEW — P21_AUTOMATION_OVERHAUL*
