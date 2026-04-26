# SPEC — M1_RECEIPT_PO_COMPARE_SHRINK

> **Module:** Module 1 - Inventory
> **SPEC folder (final location for executor):** `modules/Module 1 - Inventory/docs/specs/M1_RECEIPT_PO_COMPARE_SHRINK/SPEC.md`
> **Author:** opticup-strategic (drafted in Cowork 2026-04-26)
> **Drives:** Closes the 1 deferred VAT callsite from M1_DEBT_VAT_FALLBACK_GUARD (8/8 cleanup).

---

## 1. Goal

Free 1 line of headroom in `modules/goods-receipts/receipt-po-compare.js` (currently exactly at the 350-line hard cap), then apply the `getVatRate() / 100` fallback chain to the VAT 17% hardcode at line 343. Closes the M3-SAAS-21 follow-up F1 from M1_DEBT_VAT_FALLBACK_GUARD.

## 2. Background

`M1_DEBT_VAT_FALLBACK_GUARD` (closed 2026-04-26 overnight) cleaned 7 of 8 hardcoded `0.17` VAT fallbacks by introducing a new `getVatRate()` helper in `js/shared.js`. Callsite #8 — `receipt-po-compare.js:343` — was deferred because the file was at exactly 350 lines (Iron Rule 12 hard cap), and replacing the inline `0.17` fallback with the new helper-call expression would have netted +1 line. Per FOREMAN_REVIEW Proposal F1: find a deletable line first, then apply the fallback in the same commit.

Note: `getVatRate()` returns 0 + console warning if `tenant_config.vat_rate` is unset — this is intentional ("loud failure" over silent wrong rate). All 5 tenants now have `vat_rate=18` in DB (verified 2026-04-26), so the fallback path won't actually trigger in practice — but it's still cleaner than a hardcoded `0.17`.

## 3. Success Criteria

All measurable, all binary pass/fail.

1. ✅ `wc -l modules/goods-receipts/receipt-po-compare.js` = **349** (down from 350).
2. ✅ `node -e "console.log(require('fs').readFileSync('modules/goods-receipts/receipt-po-compare.js','utf8').split('\n').length)"` ≤ **350** (per Step 1.5e hook-counter discrepancy).
3. ✅ `grep -n "0.17" modules/goods-receipts/receipt-po-compare.js` returns **0 lines**.
4. ✅ `grep -n "getVatRate" modules/goods-receipts/receipt-po-compare.js` returns exactly **1 line** containing `getVatRate() / 100`.
5. ✅ The replaced expression matches:
   ```
   var vatRate = (tenant && tenant.vat_rate) ? Number(tenant.vat_rate) / 100 : getVatRate() / 100;
   ```
6. ✅ `npm run verify:integrity` exits 0.
7. ✅ Pre-commit hooks pass (`rule-12-file-size`, `rule-21-orphans`, `rule-23-secrets`).
8. ✅ Single commit on `develop` with message: `fix(saas): replace last VAT 17% hardcode in receipt-po-compare; -1 line headroom`.
9. ✅ Repo clean at end (`git status --porcelain` empty).

## 4. Autonomy Envelope

**CAN do without asking:**
- Delete the line specified in §8.1 (header comment `// --- 1. Build comparison report ---` on line 2).
- Apply the VAT fallback substitution per §8.2.
- Run pre-commit hooks and verify integrity.
- Commit with the message in §3.8.

**MUST stop and ask if:**
- Step 1.5e hook-counter check shows the file is somehow still effectively at-cap after the deletion.
- Any pre-commit hook fails — investigate before retry.

## 5. Stop-on-Deviation Triggers (beyond CLAUDE.md §9 globals)

1. **STOP** if `wc -l` ≠ 349 after edits (could mean the deletion took the wrong line, or an unintended addition slipped in).
2. **STOP** if the `node split('\n').length` measure > 350 even after `wc -l` reports 349. Investigate trailing-newline behavior; do not commit.
3. **STOP** if `grep "0.17"` still finds a hit anywhere in the file (means the substitution missed).
4. **STOP** if any pre-commit hook fails. Do not retry with `--no-verify`.

## 6. Rollback Plan

Single commit. Rollback = `git revert <hash>` or `git reset --hard HEAD~1` before push. No DB changes, no EF changes, no schema changes — pure code edit.

## 7. Out of Scope

- The 6 other section-divider header comments in the file (lines 85, 188, 229, 278, 330; also the inline `// Button toggle helpers` on line 175). These remain — only line 2 is touched.
- Refactoring `_poCompLearnPricePattern` for clarity. Net-zero behavior only.
- Updating MODULE_MAP.md or SESSION_CONTEXT.md — defer to next Integration Ceremony.

## 8. Expected Final State

### 8.1 — Line deletion

Delete line 2 (the section header comment):
```
// --- 1. Build comparison report ---
```
Rationale: pure aesthetic; no code references it; the file's flow is still discoverable via the function names (`_poCompBuildReport`, `_poCompShowReport`, etc.) and the remaining section dividers below.

After this edit:
- Line 1 unchanged: `// receipt-po-compare.js — PO comparison report (Phase 8 Step 4b)`
- Line 2 (was line 3): `async function _poCompBuildReport(receiptItems, poId) {`

### 8.2 — VAT fallback substitution

Original line 343 (will be line 342 after the deletion):
```js
    var vatRate = (tenant && tenant.vat_rate) ? Number(tenant.vat_rate) / 100 : 0.17;
```

Replace with:
```js
    var vatRate = (tenant && tenant.vat_rate) ? Number(tenant.vat_rate) / 100 : getVatRate() / 100;
```

This matches the canonical pattern from the other 7 callsites cleaned in `M1_DEBT_VAT_FALLBACK_GUARD`. `getVatRate()` returns the tenant config's vat_rate as a percentage (e.g., 18 for Israel) — the `/100` converts to a multiplier consistent with the surrounding code's expectation. If `getVatRate()` returns 0 (tenant_config unset), the multiplier becomes 0 — caller code already handles this safely (the OCR price-pattern learner will skip writing a hint if vatRate is 0).

### 8.3 — Final file size

- `wc -l`: 349 (exactly).
- `split('\n').length`: 350 or less.

## 9. Commit Plan

**Single commit:**
```
fix(saas): replace last VAT 17% hardcode in receipt-po-compare; -1 line headroom

Closes M3-SAAS-21 fully (8/8 callsites cleaned; previously 7/8 from
M1_DEBT_VAT_FALLBACK_GUARD with 1 deferred). Removed aesthetic header
comment to free the line needed for the helper-call expansion. No
behavior change for tenants with valid vat_rate; correct fallback
behavior for tenants without one (0 + console warning).

Files: modules/goods-receipts/receipt-po-compare.js (-1 line)
```

## 10. Pre-flight Checks (executor runs before any edit)

1. `git status --porcelain` is empty (or contains only this SPEC file itself if SPEC is being committed first).
2. `wc -l modules/goods-receipts/receipt-po-compare.js` returns **350**.
3. `grep -n "0.17" modules/goods-receipts/receipt-po-compare.js` returns exactly **1 line** at line **343**.
4. `grep -c "getVatRate" js/shared.js` returns **≥1** (helper exists from M1_DEBT_VAT_FALLBACK_GUARD).
5. Line 2 of the file is exactly `// --- 1. Build comparison report ---` (verify before deletion).

## 11. Lessons Already Incorporated

- **Step 1.5e (file-size pre-flight refresh + hook-counter discrepancy):** §3.2 + §10 explicitly include the `split('\n').length` Node measure. This SPEC is the first one to apply Step 1.5e's hook-counter rule.
- **Step 1.5g (co-staged file pre-flight):** N/A — single-file SPEC.
- **Step 1.5i (console probe for observable helpers):** N/A — `getVatRate` returns a raw number, not an observable surface format.
- **Cross-Reference Check completed 2026-04-26 against GLOBAL_SCHEMA + GLOBAL_MAP:** 0 collisions. `getVatRate` already exists in `js/shared.js`.

## 12. QA Protocol

### Path 0 — Baseline
- `git status` clean, on `develop`, synced with `origin/develop`.
- File at exactly 350 lines.
- Helper `getVatRate` is present in `js/shared.js`.

### Path 1 — Edit & verify
1. Apply §8.1 deletion, save.
2. Apply §8.2 substitution, save.
3. Run §3.1, §3.2, §3.3, §3.4 verification commands.
4. All must return the expected values.

### Path 2 — Browser smoke (skip if dev server not running)
The ERP is served from GitHub Pages; no localhost server runs on the executor's machine for this repo (verified in prior session). Skip the browser path. The change is a literal `0.17` → `getVatRate() / 100` swap with zero behavior change for tenants whose `tenant_config.vat_rate` is set (all 5 tenants are at 18 as of 2026-04-26). Regression risk = zero.

### Path 3 — Commit & push
1. `git add modules/goods-receipts/receipt-po-compare.js`
2. `git commit -m "..."` per §9.
3. Pre-commit hooks must all pass.
4. `git push origin develop`.
5. `git status` empty.

---

*End of SPEC. Author: opticup-strategic in Cowork session 2026-04-26.*
