# FOREMAN_REVIEW — M1_DEBT_VAT_FALLBACK_GUARD

> **Verdict:** 🟡 **CLOSED WITH FOLLOW-UPS**

---

## SPEC quality audit

The SPEC was thorough but missed two things:
1. Did not anticipate the file-size hook's `split('\n').length` vs `wc -l` discrepancy. §3 criterion 9 said "MUST stay ≤350" assuming `wc -l` measure. The hook uses different counting. This caused the receipt-po-compare callsite to be forcibly deferred mid-execution.
2. Did not preview the rule-21-orphans hook's behavior on the staged set. The hook flags pre-existing IIFE-local collisions, forcing commit splits or renames.

What the SPEC got right:
- Listed 7 callsites + 1 special case (receipt-po-compare with different data path).
- §5 stop trigger #2 explicitly mentioned receipt-po-compare's at-cap status.
- Mechanism-level QA (criterion 11-15).

## Execution quality audit

Cleanly handled both unforeseen issues:
- File-size cap: stopped + reverted that callsite + documented as F1. The right call.
- rule-21 collisions: split commits to 3 instead of forcing renames in unrelated lines. Documented as Deviation §3.1.

Both are textbook STOP-on-deviation handling.

## Findings processing

| # | Action |
|---|---|
| F1 (receipt-po-compare:343 deferred) | Future SPEC `M1_RECEIPT_PO_COMPARE_SHRINK` — find a deletable line, then apply fallback chain. Low priority. |
| F2 (rule-21 regex over-broad) | TECH_DEBT — refine regex to function-specific pattern. |
| F3 (pre-existing IIFE collisions) | TECH_DEBT — future "Debt Module IIFE-local name discipline" cleanup. |

## 2 author-skill improvement proposals

### Proposal 1 — Add "hook counter discrepancy" awareness to Step 1.5e

**Section to update:** SKILL.md → Step 1.5e (file-size pre-flight refresh).

**Change:** when a file is at hard cap (within 1 line of 350), the SPEC author MUST run BOTH `wc -l` AND simulate `content.split('\n').length` (Node one-liner) to get the hook's measure. The hook's count can be 1 higher than `wc -l` due to trailing-newline counting. Files at exact cap per `wc -l` may breach the hook's threshold after any edit.

### Proposal 2 — Pre-staging rule-21 simulation

**Section to add:** SKILL.md → Step 1.5g co-staged file pre-flight — extend.

**Change:** when SPEC plans 2+ JS file edits in one commit, add to Step 1.5g a 30-second simulation of the rule-21-orphans hook on the planned staged set. Run `node scripts/checks/rule-21-orphans.mjs` (manually invoke against the file list). If it flags pre-existing collisions, the SPEC must either (a) authorize specific renames in §8 OR (b) plan commit splits in §9. Catches the issue at SPEC author time, not execution time.

## 2 executor-skill improvement proposals

(Per EXECUTION_REPORT §9.) Document hook regex over-broadness + hook line-counting method.

## Master-doc update checklist

| File | Status |
|---|---|
| `modules/Module 1 - Inventory/docs/SESSION_CONTEXT.md` | Pending — overnight batch update |
| `MASTER_ROADMAP.md` | Pending — overnight batch |
| `docs/GLOBAL_MAP.md` | Defer — `getVatRate` is module-1.5-style helper |

## Verdict

🟡 **CLOSED WITH FOLLOW-UPS.**

7 of 8 callsites cleaned. 1 deferred with documented next-action SPEC. Both pre-commit hooks (rule-21 + file-size) caught real edge cases the SPEC didn't anticipate; executor handled both correctly via STOP-on-deviation discipline. M3-SAAS-21 substantively resolved (operational impact zero — Israel tenants always have valid vat_rate).

---

*End of FOREMAN_REVIEW.md.*
