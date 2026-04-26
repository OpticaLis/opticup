# SPEC — M1_DEBT_VAT_FALLBACK_GUARD

> **Authored by:** opticup-strategic (overnight hybrid Foreman) — Claude Code
> **Authored on:** 2026-04-26 (overnight)
> **Module:** 1 — Inventory (debt + receipts spread across multiple modules; primary owner = M1 by file structure)
> **Closes alert:** M3-SAAS-21

**TL;DR:** Add `getVatRate()` helper to `js/shared.js` that reads `getTenantConfig('vat_rate')` and warns to console + returns 0 if missing/invalid (instead of silently falling back to a hardcoded `17`); replace 7 callsites that currently use `... || 17` patterns. Closes Sentinel alert M3-SAAS-21.

---

## 1. Goal

7 callsites currently fall back to `17` (or `0.17` decimal form) when `tenant_config.vat_rate` is missing. Israel's actual rate is 18 (both demo + prizma DB rows confirm). The `17` fallback is BOTH wrong (silent default to incorrect value) AND not SaaS-portable (a different country has different VAT). Replace with a single `getVatRate()` helper that returns the configured value or warns + returns `0` if missing — explicit zero is safer than silently wrong.

**Callsites scoped (7 — confirmed via grep):**
1. `modules/goods-receipts/receipt-debt.js:85` — `Number(getTenantConfig('vat_rate')) || 17`
2. `modules/goods-receipts/receipt-po-compare.js:343` — `(tenant && tenant.vat_rate) ? Number(tenant.vat_rate) / 100 : 0.17` (fresh DB read; fallback `0.17` only)
3. `modules/debt/debt-doc-edit.js:86` — `(Number(doc.vat_rate) || 17)` (this one falls back when the DOCUMENT has no vat_rate; reasonable to keep — see §7)
4. `modules/debt/debt-doc-new.js:36` — `(getTenantConfig('vat_rate') || 17)`
5. `modules/debt/ai/ai-batch-ocr.js:265` — `(Number(getTenantConfig('vat_rate')) || 17)`
6. `modules/debt/ai/ai-ocr-review.js:23` — `Number(getTenantConfig('vat_rate')) || 17`
7. `modules/purchasing/po-items.js:247` — `Number(typeof getTenantConfig === 'function' ? getTenantConfig('vat_rate') : 0) || 17`
8. `modules/debt/debt-returns-tab-actions.js:145` — `getTenantConfig('vat_rate') || 17`

**Note on §7 below:** `debt-doc-edit.js:86` is a special case — its fallback is for a missing field on the DOCUMENT (`doc.vat_rate`), not the tenant config. Keeping that semantic; will switch to `getVatRate()` only as the chained outer fallback.

---

## 2. Background

Sentinel alert M3-SAAS-21 (NEW 2026-04-25): `VAT 17% fallback hardcoded — debt-doc-edit/-new + 2 receipt files; second tenant gets wrong VAT silently.`

Israel's VAT changed from 17% to 18% in 2025. Both demo + prizma have `vat_rate='18'` in DB. The `|| 17` fallback would only fire if `tenant_config.vat_rate` is somehow missing (uninitialized session, broken auth flow). Replacing the silent-fallback with an explicit `getVatRate()` helper that warns + returns 0 surfaces the configuration error rather than producing wrong totals.

---

## 3. Success Criteria

### 3.1 File & repo state

| # | Criterion | Expected | Verify |
|---|---|---|---|
| 1 | Branch state | clean | `git status` |
| 2 | Commits produced | exactly 2 | `git log` |
| 3 | `js/shared.js` size | currently 277 (after SPEC #1+#2); 285-290 after edit | `wc -l` |
| 4 | All affected JS files ≤350 lines | 0 violations | `wc -l` |
| 5 | New `getVatRate` defined | `grep -n "function getVatRate" js/shared.js` returns 1 hit | grep |
| 6 | Hardcoded `17` for vat_rate fallback removed | `grep -E "(getTenantConfig|tenant)\\.vat_rate.*17" <files>` returns 0 hits | grep |
| 7 | Integrity gate | exit 0 | `npm run verify:integrity` |
| 8 | Pre-commit hooks pass | all pass | git commit |
| 9 | `receipt-po-compare.js` line count | currently 350 (at cap); MUST stay ≤ 350 | `wc -l` |
| 10 | `po-items.js` line count | currently 342; MUST stay ≤ 350 | `wc -l` |

### 3.2 Behavioral

| # | Criterion | Expected | Verify |
|---|---|---|---|
| 11 | `getVatRate()` with `tenant_config.vat_rate=18` returns 18 | `18` | console eval on demo |
| 12 | `getVatRate()` with `tenant_config.vat_rate` missing returns `0` and console.warn fires | warn message + return value `0` | console eval after manipulating sessionStorage |
| 13 | `getVatRate()` with `tenant_config.vat_rate='abc'` (non-numeric) returns `0` and warns | `0` | console eval |
| 14 | All 7 affected callsites compile + load without runtime error | no console errors | smoke test of 1 page per affected module |
| 15 | M3-SAAS-21 closable: `grep -rE "(getTenantConfig|tenant)\\.vat_rate.*17"` in scoped files = 0 | grep | grep |

### 3.3 Backward compat

| # | Criterion | Expected | Verify |
|---|---|---|---|
| 16 | Demo + Prizma have `vat_rate=18` (already verified pre-flight); helper returns 18 → behaviorally equivalent | unchanged for both tenants | console eval |
| 17 | `debt-doc-edit.js:86` document-level fallback preserved | doc.vat_rate is checked first; tenant fallback chained | code review |

---

## 4. Autonomy Envelope

### 4.1 CAN
- Edit `js/shared.js`, the 7 listed callsite files.
- Decide internal helper structure.
- Smoke-test on demo (no DB writes).

### 4.2 STOP
- Any change to a file outside §8 list.
- `receipt-po-compare.js` grows past 350.
- `po-items.js` grows past 350.
- More than 2 commits.

---

## 5. Stop-on-Deviation Triggers

1. **A callsite's surrounding logic relies on the integer 17 elsewhere in the same line** (e.g., comparison or cast). Inspect each replacement before applying.
2. **`receipt-po-compare.js` line count grows.** This file is AT 350. Net-0 mandatory.
3. **`po-items.js` grows past 350.** Currently 342. Net-0 preferred, +2 acceptable.

---

## 6. Rollback

```
git reset --hard fd7f182
```

---

## 7. Out of Scope

- **`debt-doc-edit.js:86` document-level fallback.** This handles the case where the DOCUMENT (not the tenant) has no vat_rate. Different semantic. Will chain to `getVatRate()` for the outer fallback but keep the document-first check.
- **Other VAT-related code** that doesn't fall back (e.g., `debt-doc-compare.js:47` uses `Number(doc.vat_rate) || 0` — already safe).
- **Schema changes** to vat_rate field type/nullability.
- **Audit log of vat_rate access** (would need infrastructure).

---

## 8. Expected Final State

### 8.1 New helper in `js/shared.js`

Add after `getCustomDomain()`:

```js
/**
 * Resolve the tenant's VAT rate (percentage form, e.g. 18 for 18%).
 * Reads from tenant_config.vat_rate. Returns 0 + warns if missing/invalid —
 * explicit zero is safer than silent fallback to wrong country's rate
 * (M3-SAAS-21).
 * @returns {number}
 */
function getVatRate() {
  var raw = getTenantConfig('vat_rate');
  var num = Number(raw);
  if (isFinite(num) && num > 0) return num;
  if (window.console && console.warn) {
    console.warn('[shared] vat_rate missing or invalid in tenant_config; returning 0. Configure vat_rate on the tenant.');
  }
  return 0;
}
```

### 8.2 Callsite replacements (7 files)

Each: replace inline `... getTenantConfig('vat_rate') ... || 17` with `getVatRate()` (or `getVatRate() / 100` where the line uses decimal-form expectation).

| File:Line | OLD | NEW |
|---|---|---|
| `receipt-debt.js:85` | `Number(getTenantConfig('vat_rate')) \|\| 17` | `getVatRate()` |
| `receipt-po-compare.js:343` | `(tenant && tenant.vat_rate) ? Number(tenant.vat_rate) / 100 : 0.17` | `(tenant && tenant.vat_rate) ? Number(tenant.vat_rate) / 100 : (getVatRate() / 100)` |
| `debt-doc-edit.js:86` | `(Number(doc.vat_rate) \|\| 17)` (in DOM input value) | `(Number(doc.vat_rate) \|\| getVatRate())` |
| `debt-doc-new.js:36` | `(getTenantConfig('vat_rate') \|\| 17)` | `getVatRate()` |
| `ai-batch-ocr.js:265` | `(Number(getTenantConfig('vat_rate')) \|\| 17)` | `getVatRate()` (in the fallback chain only — keep `fv('vat_rate')` first) |
| `ai-ocr-review.js:23` | `if (vatRate == null) vatRate = Number(getTenantConfig('vat_rate')) \|\| 17;` | `if (vatRate == null) vatRate = getVatRate();` |
| `po-items.js:247` | `Number(typeof getTenantConfig === 'function' ? getTenantConfig('vat_rate') : 0) \|\| 17` | `getVatRate()` |
| `debt-returns-tab-actions.js:145` | `getTenantConfig('vat_rate') \|\| 17` | `getVatRate()` |

### 8.3 File-size projection

| File | Currently | Projected |
|---|---|---|
| `js/shared.js` | 277 | 290 (+13: helper + JSDoc) |
| `receipt-debt.js` | 207 | 207 |
| `receipt-po-compare.js` | 350 | 350 (NET 0 — single-line replace) |
| `debt-doc-edit.js` | 279 | 279 |
| `debt-doc-new.js` | 233 | 233 |
| `ai-batch-ocr.js` | 324 | 324 |
| `ai-ocr-review.js` | 262 | 262 |
| `po-items.js` | 342 | 342 |
| `debt-returns-tab-actions.js` | 289 | 289 |

All under cap.

---

## 9. Commit Plan

Exactly 2 commits.

### Commit 1 — `feat(saas): getVatRate helper + replace 17 fallbacks across 7 callsites`

- Files: `js/shared.js` + 7 callsite files (same commit — they're coupled).
- Co-staged file pre-flight (Step 1.5g): all JS files; spot-check for shared IIFE-local helper names. Different modules, low collision risk. If hook fires, will rename.

### Commit 2 — `chore(spec): close M1_DEBT_VAT_FALLBACK_GUARD with retrospective + QA + review (overnight hybrid)`

---

## 10. Test Subjects

### 10.1 Tenant: demo. Vat_rate = '18' (verified via SQL pre-flight).

### 10.2 Pre-flight verification

```bash
wc -l js/shared.js modules/goods-receipts/receipt-debt.js modules/goods-receipts/receipt-po-compare.js modules/debt/debt-doc-edit.js modules/debt/debt-doc-new.js modules/debt/ai/ai-batch-ocr.js modules/debt/ai/ai-ocr-review.js modules/purchasing/po-items.js modules/debt/debt-returns-tab-actions.js
```

```bash
grep -nE "(getTenantConfig|tenant)\\.vat_rate.*17|0\\.17" <files>
# Expected: 8 hits (the 7 listed + receipt-po-compare's `0.17`)
```

### 10.3 Path 0 — Baseline reset
N/A (no DB writes).

---

## 11. Lessons Already Incorporated

Cross-Reference Check 2026-04-26:
- `getVatRate` does not exist (verified).
- `getVatRate` doesn't collide with anything in GLOBAL_MAP/SCHEMA.

Step 1.5e file-size pre-flight: live counts above. shared.js 277, receipt-po-compare AT cap (350) — explicit stop trigger added.

Step 1.5f criteria-§8 sync: criterion 2 = 2 commits, §9 = 2. Criterion 3 = 285-290, §8.3 = 290. ✅

Step 1.5g co-staged file pre-flight: 8 JS files in commit 1. Risk of helper-name collision is real if any 2 share names. Will spot-check (e.g., `tid`, `toast`, `escapeHtml` are common). Pre-commit hook (`rule-21-orphans`) will catch. If it fires → split or rename per existing pattern.

Step 1.5h behavioral preservation: no JSON columns touched.

Lessons applied:
- From SPEC #1 (mid-execution stop trigger #1 catch) → APPLIED (§5 trigger #2 + #3 specifically about file-size cap on at-cap files).
- From SPEC #2 Proposal 2 (executor pre-flight grep target validation) → APPLIED (§10.2 pre-flight specifies expected grep count).

---

## 12. Foreman QA Protocol

### 12.1 Path 0
N/A.

### 12.2 Path 1 — Helper load
- `npm run verify:integrity` exit 0
- Browser `typeof getVatRate` → `'function'`
- `getVatRate()` → `18` on demo

### 12.3 Path 2 — Missing config warning
- Manually `delete tenant_config.vat_rate` in sessionStorage; reload helper.
- `getVatRate()` → `0` AND console.warn fires.

### 12.4 Path 3 — Per-callsite smoke
- Open one page from each module: receipt-debt, receipt-po-compare, debt-doc-edit, debt-doc-new, ai-batch-ocr, ai-ocr-review, po-items, debt-returns. Verify no JS errors on load.
(Realistically can't test all 8 page paths in detail overnight; spot-check 2-3 + rely on the fact that the only change is a function-call substitution.)

### 12.5 Path 4 — grep verification
- `grep -rnE "(getTenantConfig|tenant)\\.vat_rate.*17" <8-files>` → 0 hits.
- `grep -n "0\\.17" modules/goods-receipts/receipt-po-compare.js` → 0 hits.

### 12.6 Path 5 — Final cleanup + integrity
Same template as prior SPECs.

---

## 13. Pre-Merge Checklist

Standard. + receipt-po-compare.js line count not increased.

---

## 14. Dependencies

- HEAD = `fd7f182` (after SPEC #2).
- Both demo + prizma have vat_rate='18'. ✓

---

*End of SPEC.*
