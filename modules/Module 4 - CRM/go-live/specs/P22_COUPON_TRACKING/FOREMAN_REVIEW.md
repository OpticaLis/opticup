# FOREMAN_REVIEW — P22_COUPON_TRACKING

> **Location:** `modules/Module 4 - CRM/go-live/specs/P22_COUPON_TRACKING/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman)
> **Written on:** 2026-04-23
> **Reviews:** `SPEC.md` + `EXECUTION_REPORT.md` + `FINDINGS.md`
> **Commit range reviewed:** `111629d..b652327` (1 feat commit) + `9edc8e0` (retrospective)

---

## 1. Verdict

**🟢 CLOSED**

Coupon funnel panel and arrival-status badges shipped in one commit as planned.
Pure UI task — no schema changes, no EF changes. The executor correctly
preserved the coupon send button (SPEC described it as a passive indicator but
it's actually an action toggle — deviation #1 was the right call). The file-size
compression dance was caused by a stale line count in the SPEC (237L claimed vs
317L actual — same pattern as P21). Final file at exactly 350 hard cap.

---

## 2. SPEC Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Goal clarity | 5 | Daniel's request quoted verbatim. Clear funnel definition. |
| Measurability of success criteria | 4 | 9 criteria, all testable. #9 "manual browser check" is soft but appropriate for a UI task. |
| Completeness of autonomy envelope | 5 | MAXIMUM AUTONOMY — correct for a pure display task. |
| Stop-trigger specificity | 5 | 3 triggers, all relevant. Trigger #2 (SELECT needs modification) correctly predicted the `booking_fee_paid` gap. |
| Rollback plan realism | 5 | Single commit revert. Clean. |
| Expected final state accuracy | 2 | `crm-events-detail.js` claimed 237L start → ~280L end. Actual: 317L start → 350L end. Off by 80L on start, 70L on end. This is the 3rd consecutive SPEC with significant line-count drift (P20, P21, P22). |
| Commit plan usefulness | 5 | One commit, pre-written message, used as-is. |
| Technical design quality | 3 | Track A design (funnel cards + no-show table + collapsible) was sound. Track B mischaracterized the coupon cell as a "yes/no indicator" when it's a toggle button with send capability — the SPEC's Track B1 would have removed operator functionality if followed literally. |

**Average score:** 4.25/5.

Two recurring issues: (1) line-count drift — 3 consecutive SPECs now, and
(2) inadequate pre-flight grep of interactive elements before prescribing
visual-only changes. Both have actionable proposals below.

---

## 3. Execution Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Adherence to SPEC | 5 | One intentional deviation (Track B send-button preservation) was the correct call — SPEC would have broken existing functionality. Documented thoroughly. |
| Adherence to Iron Rules | 5 | Rule 8 (escapeHtml) on all user strings. Rule 12 at 350 (at cap but legal). Rule 21 grep before creating `renderCouponFunnel`. |
| Commit hygiene | 5 | Single atomic commit. Message describes both tracks. |
| Documentation currency | 5 | No MODULE_MAP updates needed (no new exports/contracts). |
| Autonomy discipline | 5 | Zero questions asked. Self-resolved compression iteration and Track B deviation. |
| Finding discipline | 4 | 3 findings logged (2 SPEC-author observations + 1 debt item). All actionable. M4-DEBT-P22-01 (file at cap) is real — next edit to that file will need a split. |

**Average score:** 4.83/5. Excellent execution given a SPEC with stale data.

---

## 4. Findings Processing

| Finding | Code | Decision | Action |
|---------|------|----------|--------|
| SPEC starting-line-count drift | M4-DOC-P22-01 | ACCEPTED | Skill improvement below (proposal 1). Not a code SPEC. |
| SPEC mischaracterized coupon cell | M4-DOC-P22-02 | DISMISSED | Deviation was correct. SPEC authoring lesson captured in proposal 2. |
| crm-events-detail.js at hard cap | M4-DEBT-P22-01 | DEFERRED | Will split during FINAL_QA if the file needs any edit. Otherwise next touch. Not a standalone SPEC — bundle with next feature. |

---

## 5. Author-Skill Improvement Proposals (opticup-strategic)

### Proposal 1 — Mandatory `wc -l` at SPEC authoring time

- **Where:** opticup-strategic SKILL.md, Step 1.5 (Cross-Reference Check)
- **Change:** Add sub-bullet: *"For every file listed in §6 'Files Affected',
  run `wc -l <file>` and use the ACTUAL count, not a remembered count from
  a prior session. This is the 3rd consecutive SPEC (P20, P21, P22) where
  stale line counts caused mid-execution compression passes."*
- **Source:** M4-DOC-P22-01, M4-DOC-P21-01, P20 FOREMAN_REVIEW §2.

### Proposal 2 — Interactive-element pre-flight for visual SPECs

- **Where:** opticup-strategic SKILL.md, Step 1.5 (Cross-Reference Check)
- **Change:** Add sub-bullet: *"When a SPEC prescribes visual changes to an
  existing UI element (badges, indicators, formatting), grep the element's
  current implementation for event handlers (`addEventListener`, `onclick`,
  `data-*` action attributes). If the element has interactive behavior,
  the SPEC must explicitly state whether that behavior is preserved, moved,
  or removed. Never describe an interactive element as a passive indicator."*
- **Source:** M4-DOC-P22-02, EXECUTION_REPORT §3 deviation #1.

---

## 6. Executor-Skill Improvement Proposals (opticup-executor)

### Proposal 1 — Verifier line-count parity note

- **Where:** opticup-executor SKILL.md, file-discipline section
- **Change:** *"Pre-commit `verify.mjs` file-size uses `split('\\n').length`
  which counts the trailing-newline element. A file that `wc -l` reports as
  350 will score 351 in the verifier. Aim for `wc -l ≤ 349` when compressing
  toward the 350 cap."*
- **Source:** EXECUTION_REPORT §5 bullet 3, §8 Proposal 1.

### Proposal 2 — Pre-execution line-count sanity check

- **Where:** opticup-executor SKILL.md, Step 1 (Load and validate the SPEC)
- **Change:** *"Step 2.5: for every file in SPEC §6 with a numeric starting
  line count, run `wc -l` and compare. If they disagree by >20 lines, log
  the drift as a finding and recompute the line budget BEFORE writing code."*
- **Source:** EXECUTION_REPORT §5 bullet 1, §8 Proposal 2. Endorsed in P21
  FOREMAN_REVIEW — now 3rd consecutive endorsement. Elevate to MUST.

---

## 7. Master-Doc Update Checklist

| File | Updated? | Notes |
|------|----------|-------|
| SESSION_CONTEXT.md | ⬜ PENDING | P22 phase history row — will batch with P19-P21 update |
| ROADMAP.md | ⬜ PENDING | P22 status — will batch with P19-P21 update |
| MODULE_MAP.md | N/A | No new exports or contracts |
| GLOBAL_MAP.md | N/A | No cross-module changes |
| GLOBAL_SCHEMA.sql | N/A | No schema changes |

---

*End of FOREMAN_REVIEW — P22_COUPON_TRACKING*
