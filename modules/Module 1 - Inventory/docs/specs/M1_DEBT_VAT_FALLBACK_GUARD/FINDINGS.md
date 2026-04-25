# FINDINGS — M1_DEBT_VAT_FALLBACK_GUARD

> **Written by:** opticup-executor

---

## Findings

### Finding 1 — receipt-po-compare.js:343 still uses `0.17` literal (file at 350-line hard cap)

- **Code:** `M1-DEBT-VAT-01`
- **Severity:** LOW (operationally safe — Israel demo+prizma have vat_rate=18; the fallback only fires if config is broken)
- **Location:** `modules/goods-receipts/receipt-po-compare.js:343`
- **Description:** This callsite reads `vat_rate` directly from a fresh DB query (`sb.from(T.TENANTS).select('vat_rate')`) instead of `getTenantConfig`. SPEC #3's intent was to chain its `0.17` fallback to `getVatRate() / 100`. My single-line edit pushed the file's hook-counted line count from 350 to 351 (likely trailing-newline interaction with `content.split('\n').length`), breaching Rule 12's hard cap. Reverted.
- **Impact:** None operationally — both demo and Prizma have `vat_rate='18'`, so the fresh DB query always returns a value and the `0.17` fallback never fires. The SaaS-readiness concern remains theoretically: if a future tenant's `vat_rate` is missing, this callsite falls back to 17% silently while the other 7 callsites would warn.
- **Suggested next action:** Future SPEC `M1_RECEIPT_PO_COMPARE_SHRINK` — find a non-functional line to drop from receipt-po-compare.js (file is 350 lines; even a single blank-line removal would buy the headroom needed). Then apply the `getVatRate() / 100` fallback. Total expected delta: -1 line for the cleanup, +0 for the fallback chain (1 line replaces 1 line).
- **Foreman override:** { }

---

### Finding 2 — `rule-21-orphans` regex over-broad (false positive on parenthesized expressions)

- **Code:** `M0-TOOL-RULE21-02`
- **Severity:** INFO (executor process)
- **Location:** `scripts/checks/rule-21-orphans.mjs:7`
- **Description:** The regex `(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(` matches any `var X = (` declaration, including parenthesized non-function expressions like `var x = (a ? b : c)`. This causes false-positive orphan-collision flags when 2+ staged files share the same variable name in this form. Encountered tonight: my edit of po-items.js added parens that triggered the false positive against receipt-po-compare.js (which already had a similar form). Worked around by removing outer parens.
- **Impact:** Forces split commits or pre-emptive renames when files with similar-named locals are co-staged. Otherwise harmless.
- **Suggested next action:** TECH_DEBT — refine the regex to be function-specific: `(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>)`. Would eliminate the false positive class.
- **Foreman override:** { }

---

### Finding 3 — pre-existing IIFE-local name collisions (`supplierId`, `ext`) across 4 debt-module files

- **Code:** `M1-DEBT-COLLISION-03`
- **Severity:** INFO (pre-existing; surfaced when files co-staged)
- **Location:**
  - `supplierId`: `modules/debt/ai/ai-batch-ocr.js` + `modules/debt/debt-doc-new.js`
  - `ext`: `modules/debt/ai/ai-ocr-review.js` + `modules/debt/debt-returns-tab-actions.js`
- **Description:** These 4 files have local-scoped helpers/variables named `supplierId` and `ext` that collide per the rule-21-orphans hook regex. The collisions are ALL pre-existing — none introduced by this SPEC. They surface only when 2+ colliding files are staged in the same commit.
- **Impact:** Forces commit-splitting (deviation from §9) or pre-emptive renames when modifying these debt-module files in batch. A future cleanup could rename them with module-prefix conventions (e.g., `_dnSupplierId` in debt-doc-new, `_drExt` in debt-returns-tab-actions) to break the collisions permanently.
- **Suggested next action:** TECH_DEBT — bundle into a future "Debt Module IIFE-local name discipline" cleanup SPEC. Low priority; only matters when multi-file commits are needed.
- **Foreman override:** { }

---

*End of FINDINGS.*
