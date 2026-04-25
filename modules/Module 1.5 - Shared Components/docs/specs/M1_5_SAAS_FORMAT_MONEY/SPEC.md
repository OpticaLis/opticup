# SPEC — M1_5_SAAS_FORMAT_MONEY

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/M1_5_SAAS_FORMAT_MONEY/SPEC.md`
> **Authored by:** opticup-strategic (overnight hybrid Foreman session) — Claude Code
> **Authored on:** 2026-04-26 (overnight, Daniel asleep)
> **Module:** 1.5 — Shared Components
> **Closes alerts:** M3-SAAS-14 + M3-SAAS-18 + M5-DEBT-08

**Executor TL;DR (1 sentence):** Add `formatMoney(amount, opts)` helper to `js/shared.js` that reads `default_currency` + `locale` from `tenant_config` (with safe ILS/he-IL fallbacks); refactor `formatILS()` (shared.js) and `formatCurrency()` (crm-helpers.js) to delegate to it — preserving all 99 existing callsites unchanged but making the helpers SaaS-ready for any future tenant.

---

## 1. Goal

The Sentinel alerts M3-SAAS-14, M3-SAAS-18, M5-DEBT-08 flag `formatILS` (`js/shared.js:179-182`) and the near-duplicate `formatCurrency` (`modules/crm/crm-helpers.js:45-50`) as SaaS-readiness blockers — both hardcode `'₪'` (₪) and `'he-IL'` locale. A future tenant in another country gets wrong currency symbol + number formatting.

Two changes, one SPEC:

1. **New `formatMoney(amount, opts)` in `js/shared.js`** — primary helper that reads `default_currency` and `locale` from `getTenantConfig()` with fallbacks to `'ILS'` and `'he-IL'`. Uses `Intl.NumberFormat` for currency-aware formatting. Accepts opts overrides for explicit control.
2. **`formatILS` and `formatCurrency` become thin delegates** — internal logic replaced with a call to `formatMoney`. Public API name + signature preserved (zero callsite changes).

Rule 21 compliance: instead of two near-duplicate helpers, both now share one implementation.

---

## 2. Background & Motivation

### 2.1 Why now

The payment-lifecycle trio just closed (commit `b2e3c2d`). Module 4 is ready for P7 Prizma cutover. Before P7, the SaaS-readiness debt should drop — Daniel may onboard a second tenant in coming months, and the formatMoney debt is the single biggest blocker per the SaaS-readiness mission report.

### 2.2 Why "delegate, don't rename"

The grep across the repo shows **99 occurrences of `formatILS` across 26 files** + an unknown number of `formatCurrency` callsites in CRM. Renaming + updating all callsites is a multi-hour mechanical edit with high regression risk. The "delegate" pattern (keep public name, change internals) delivers the SaaS fix with **zero callsite changes**.

If at some future point the project wants to standardize on `formatMoney` everywhere, that becomes a separate Rule-21 cleanup SPEC.

### 2.3 Tenant config is already in sessionStorage

`auth-service.js:134` writes the entire `tenants` row (including `default_currency`, `locale`) to `sessionStorage['tenant_config']`. `getTenantConfig(key)` (shared.js:144-147) reads it. Confirmed via SQL: both demo + prizma have `default_currency='ILS'` + `locale='he-IL'`. The data path is ready; only the helper needs to read it.

---

## 3. Success Criteria (Measurable)

### 3.1 File & repo state

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 1 | Branch state | clean | `git status` |
| 2 | Commits produced | exactly 2 | `git log origin/develop..HEAD --oneline \| wc -l` |
| 3 | `js/shared.js` size | currently 231 lines (verified at SPEC author time 2026-04-26); 240–250 after edit | `wc -l` |
| 4 | `modules/crm/crm-helpers.js` size | currently 164 lines (verified 2026-04-26); within 5 lines after edit | `wc -l` |
| 5 | New `formatMoney` function defined | 1 export added to global scope | `grep -n "function formatMoney" js/shared.js` |
| 6 | `formatILS` body changed to delegate | inline `Intl.NumberFormat`/locale gone, single call to `formatMoney` | `grep -A 4 "function formatILS" js/shared.js` |
| 7 | `formatCurrency` body changed to delegate | inline `'₪'`/`he-IL` gone, single call to `formatMoney` | `grep -A 5 "function formatCurrency" modules/crm/crm-helpers.js` |
| 8 | Integrity gate | exit 0 | `npm run verify:integrity` |
| 9 | Pre-commit hooks pass | all pass | git commit |
| 10 | All CRM JS files ≤350 lines (Rule 12) | 0 violations | none touched today |

### 3.2 Behavioral — backward compat (criterion-11 mechanism-level QA)

| # | Criterion | Expected | Verify by |
|---|-----------|----------|-----------|
| 11 | `formatILS(1234)` on Israeli tenant returns currency-prefixed number | string starts with `₪` and contains `1,234` (or equivalent) | console eval |
| 12 | `formatILS(0)` returns `₪0` (no fractional) | matches existing behavior | console eval |
| 13 | `formatCurrency(null)` returns empty string | empty string (preserves CRM-specific behavior) | console eval |
| 14 | `formatCurrency(39460)` returns `₪39,460` | matches existing behavior | console eval |
| 15 | `formatMoney(1234, {currency:'EUR', locale:'en-US'})` returns Euro-formatted string | string contains `€` and `1,234` | console eval |
| 16 | `formatMoney(1234)` with no `tenant_config` set defaults to ILS+he-IL | identical to `formatILS(1234)` | console eval |
| 17 | A page that uses `formatILS` (e.g., events list, debt dashboard) renders no console errors | 0 errors | smoke test |

### 3.3 SaaS readiness

| # | Criterion | Expected | Verify by |
|---|-----------|----------|-----------|
| 18 | If `tenant_config.default_currency='EUR'` is injected, `formatILS(100)` outputs Euro | currency symbol changes (e.g., `€100`) without callsite changes | console eval after manual sessionStorage manipulation |
| 19 | If `tenant_config.locale='en-US'` is injected, `formatILS(1234567)` uses comma thousands separator (per en-US) | output includes `1,234,567` style separators | console eval |
| 20 | M3-SAAS-14 alert resolved (helper no longer hardcodes ₪/he-IL) | code review | code review |
| 21 | M3-SAAS-18 / M5-DEBT-08 resolved (formatCurrency no longer duplicates formatILS) | code review | code review |

### 3.4 Documentation

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 22 | EXECUTION_REPORT.md present in SPEC folder | exit 0 | `test -f` |
| 23 | FINDINGS.md present (or absent with reasoning) | inspect | inspect |
| 24 | `SESSION_CONTEXT.md` (Module 1.5) updated with overnight entry | new line | grep |
| 25 | Push to origin | exit 0, HEAD synced | `git status -uno` |

---

## 4. Autonomy Envelope

### 4.1 What the executor CAN do without asking

- Read any file (Level 1).
- Read-only SQL (Level 1).
- Edit `js/shared.js` to add `formatMoney` and refactor `formatILS`.
- Edit `modules/crm/crm-helpers.js` to refactor `formatCurrency`.
- Edit Module 1.5 docs (SESSION_CONTEXT, MODULE_MAP).
- Commit and push to develop per §9.
- Decide internal helper structure, JSDoc wording, exact fallback values (ILS/he-IL) per the SPEC.
- Run console-eval QA on `localhost:3000`.

### 4.2 What REQUIRES stopping and reporting

- Any change to `auth-service.js` or `getTenantConfig` itself. STOP.
- Any change to a callsite of `formatILS`/`formatCurrency`. STOP — this SPEC is delegate-only.
- Any DDL or schema change. STOP.
- File grows past 350 lines. STOP.
- `Intl.NumberFormat` not available in target browser (project supports modern browsers only). STOP and report — but extremely unlikely.
- Pre-commit hook failure that you cannot diagnose in one read.
- More than 2 commits OR fewer than 2.

### 4.3 SQL autonomy

- Level 1 (read-only): unrestricted.
- Level 2: not needed — no DB writes.
- Level 3: not needed — no DDL.

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

1. **A callsite of `formatILS` or `formatCurrency` breaks because the new delegation produces a slightly different string.** The SPEC asserts behavioral equivalence for the default-tenant case (ILS, he-IL). If `Intl.NumberFormat('he-IL', {style:'currency', currency:'ILS'})` produces a string format different from the legacy `'₪' + num.toLocaleString(...)` (e.g., trailing `.00` or `₪ ` with space) — STOP, report, do NOT ship.
2. **`getTenantConfig` returns wrong shape.** The function should return the value of a key or undefined. If something else (parse error, etc.) → STOP.
3. **More than 2 commits or fewer than 2.** §9 is exact.
4. **The console-eval QA shows a regression in any of criteria 11-17.** STOP.

---

## 6. Rollback Plan

```
git reset --hard a0e9129   # last commit before this SPEC's first commit
git push --force-with-lease origin develop  # ONLY with Daniel's explicit go-ahead
```

No DB changes — no DB rollback needed.

---

## 7. Out of Scope (explicit)

- **Updating callsites of `formatILS`/`formatCurrency`.** All 99+ callsites stay calling the same names; only the internal implementation changes. A future "rename to formatMoney everywhere" SPEC is OK but explicitly out of scope here.
- **Tenant onboarding tooling** (e.g., a wizard to set `default_currency` + `locale` for new tenants). Out of scope.
- **Currency conversion logic** (multi-currency carts, FX rates). Out of scope.
- **Other formatters** (`formatPhone`, `formatDate`, `formatDateTime`, `formatLanguage`). Out of scope — they have other Sentinel alerts but those are not in tonight's batch.
- **Edge function or server-side formatting changes.** Browser-only SPEC.

### Forward-flags

- **Future SPEC `M1_5_RENAME_FORMATILS_TO_FORMATMONEY`** — full callsite rename if/when desired.
- **Future SPEC `M1_5_TENANT_ONBOARDING_WIZARD`** — admin UI to configure currency/locale per tenant.

---

## 8. Expected Final State

### 8.1 Modified file: `js/shared.js` — currently 231, target 240–250

Add `formatMoney(amount, opts)` after `getTenantConfig()` (around line 148):

```js
/**
 * Format a number as a currency string per tenant_config (default ILS/he-IL).
 * @param {number|string} amount
 * @param {object} [opts] - { currency, locale, minimumFractionDigits, maximumFractionDigits }
 * @returns {string}
 */
function formatMoney(amount, opts) {
  opts = opts || {};
  var num = Number(amount);
  if (!isFinite(num)) num = 0;
  var currency = opts.currency || getTenantConfig('default_currency') || 'ILS';
  var locale = opts.locale || getTenantConfig('locale') || 'he-IL';
  var minFrac = (opts.minimumFractionDigits != null) ? opts.minimumFractionDigits : 0;
  var maxFrac = (opts.maximumFractionDigits != null) ? opts.maximumFractionDigits : 0;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency', currency: currency,
      minimumFractionDigits: minFrac, maximumFractionDigits: maxFrac
    }).format(num);
  } catch (e) {
    // Defensive: bad currency or locale code → fall back to ILS/he-IL pattern.
    return '₪' + num.toLocaleString('he-IL', { minimumFractionDigits: minFrac, maximumFractionDigits: maxFrac });
  }
}
```

Refactor `formatILS` (line 176-182) to delegate:

```js
/**
 * Format a number as ILS currency string: ₪1,234.
 * Backward-compat wrapper — delegates to formatMoney() which now reads
 * default_currency + locale from tenant_config (M1_5_SAAS_FORMAT_MONEY).
 */
function formatILS(amount) {
  return formatMoney(amount);
}
```

### 8.2 Modified file: `modules/crm/crm-helpers.js` — currently 164, target ~163

Refactor `formatCurrency` (line 45-50) to delegate, preserving the empty-string-on-null behavior:

```js
// --- Currency: number -> ₪39,460 (delegate to formatMoney; preserves CRM empty-on-null) ---
function formatCurrency(n) {
  if (n == null || n === '') return '';
  if (typeof formatMoney === 'function') return formatMoney(n);
  // Fallback if shared.js not loaded (defensive — shouldn't happen in CRM context).
  var num = Number(n);
  if (!isFinite(num)) return '';
  return '₪' + num.toLocaleString('he-IL', { maximumFractionDigits: 0 });
}
```

### 8.3 Files NOT modified

- `auth-service.js` — getTenantConfig data path is correct.
- All 99 callsites of `formatILS`.
- All callsites of `formatCurrency` in CRM.
- All other formatters.

### 8.4 New retrospective files

- `EXECUTION_REPORT.md` (executor)
- `FINDINGS.md` (executor, if any)
- `QA_FOREMAN_RESULTS.md` (hybrid QA)
- `FOREMAN_REVIEW.md` (foreman, last)

### 8.5 File-size projection summary

| File | Currently | Projected |
|---|---|---|
| `js/shared.js` | 231 | 246 (+15: new function + JSDoc) |
| `modules/crm/crm-helpers.js` | 164 | 167 (+3: defensive fallback line) |

Both well under Rule 12 cap.

---

## 9. Commit Plan

Exactly 2 commits.

### Commit 1 — `feat(saas): formatMoney helper reads currency+locale from tenant_config; formatILS+formatCurrency delegate`

- Files: `js/shared.js` + `modules/crm/crm-helpers.js`.
- Both files in one commit — they're a cohesive change (the delegation chain only works if both are updated together).
- Co-staged file pre-flight (Step 1.5g): both files have IIFE-local helpers but **not shared names** — `shared.js` is global-scope (no IIFE wrapper); `crm-helpers.js` is IIFE-wrapped with helpers like `formatPhone`, `normalizePhone`, `formatDate` — none of which collide with `shared.js`. SAFE to co-stage.

### Commit 2 — `chore(spec): close M1_5_SAAS_FORMAT_MONEY with retrospective`

- Files: `EXECUTION_REPORT.md` (new), `FINDINGS.md` (new if any), `QA_FOREMAN_RESULTS.md` (new — hybrid QA), `FOREMAN_REVIEW.md` (new — hybrid review), `modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md` (update).
- NO code changes.

> Note: under the standard protocol commit 2 would be just retrospective; under the hybrid overnight protocol, the executor + QA + Foreman files all close in commit 2 (since the same agent plays all 3 roles). Commit message reflects the closure.

---

## 10. Test Subjects (Pinned)

### 10.1 Tenant
- demo — `tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'`. Login via `crm.html?t=demo` ensures `tenant_config` is in sessionStorage with `default_currency='ILS'`, `locale='he-IL'`.

### 10.2 Pre-flight verification (executor MUST run BEFORE commit 1)

```bash
wc -l js/shared.js modules/crm/crm-helpers.js
# Expected: 231 + 164 = 395 total
```

```js
// Browser console after loading crm.html?t=demo:
JSON.parse(sessionStorage.getItem('tenant_config'))
// Expected: object with default_currency='ILS', locale='he-IL', vat_rate='18'
formatILS(1234)
// Expected: '₪1,234' (existing behavior baseline)
```

### 10.3 Path 0 — Baseline reset (per QA protocol)

No DB state to reset — this SPEC has no DB writes. Baseline is the file state at session start.

```bash
git rev-parse HEAD
# Should match latest known commit on develop before this SPEC.
```

### 10.4 Phone allowlist
N/A — this SPEC sends no messages.

---

## 11. Lessons Already Incorporated

Cross-Reference Check 2026-04-26 against `docs/GLOBAL_MAP.md`, `docs/GLOBAL_SCHEMA.sql`, and repo grep. **Result: 0 collisions.**

- `formatMoney` global — does not exist in repo (verified via `grep -rn "formatMoney" --include="*.js"`).
- `formatILS` exists at `js/shared.js:179` — this SPEC modifies its body, not its name.
- `formatCurrency` exists in 2 places: `crm-helpers.js:45` (this SPEC modifies) AND `modules/storefront/studio-blog.js` (TBD — not affected, per scope §7).

Step 1.5e file-size pre-flight (LIVE counts at SPEC author time): shared.js=231, crm-helpers.js=164. Both have ample headroom.

Step 1.5f criteria-§8 sync check: criterion 2 says "exactly 2 commits"; §9 lists exactly 2. Criterion 3 says shared.js 240-250; §8.5 says +15 → 246. Criterion 4 says crm-helpers.js within 5; §8.5 says +3 → 167. ✅ in sync.

Step 1.5g co-staged file pre-flight: `js/shared.js` (global-scope) and `modules/crm/crm-helpers.js` (IIFE) do NOT share IIFE-local helper names. SAFE to co-stage.

Step 1.5h behavioral preservation: no JSON columns touched. N/A.

Lessons applied:
1. **From `M4_ATTENDEE_PAYMENT_AUTOMATION/EXECUTION_REPORT.md` Proposal 1 (per-status pre-flight events for QA)** → APPLIED — §10 lists demo specifically with tenant_config shape expected.
2. **From `M4_EVENT_DAY_PARITY_FIX/FOREMAN_REVIEW.md` (mechanism-level QA verification)** → APPLIED — criteria 11-17 are mechanism-level (not just "looks right"), criterion 18-19 specifically test the SaaS axis.
3. **From `M4_ATTENDEE_PAYMENT_UI` (re-baseline file sizes at SPEC author time)** → APPLIED — §10.2 + §11 cite live `wc -l` counts.

---

## 12. Foreman QA Protocol

### 12.1 Path 0 — Baseline reset
N/A (no DB state). Verify HEAD matches expected pre-SPEC commit.

### 12.2 Path 1 — Pre-flight + module load
- Run `npm run verify:integrity` → exit 0.
- Run `wc -l` on both files → match SPEC §10.2 baseline.
- Reload `crm.html?t=demo` → verify console: `typeof formatMoney === 'function'`.

### 12.3 Path 2 — Backward compat (formatILS unchanged surface)
- `formatILS(1234)` → string starting with `₪` containing `1,234`.
- `formatILS(0)` → `₪0` exactly.
- `formatILS(null)` → some sane value (`₪0` or empty — verify match to old behavior baseline).
- Pick a real demo page that uses `formatILS` (e.g., debt dashboard) → load → 0 console errors.

### 12.4 Path 3 — Backward compat (formatCurrency in CRM)
- `CrmHelpers.formatCurrency(39460)` → `₪39,460`.
- `CrmHelpers.formatCurrency(null)` → empty string `''`.
- `CrmHelpers.formatCurrency('')` → empty string `''`.
- Open CRM events list → revenue column renders correctly (no `undefined`, no `NaN`).

### 12.5 Path 4 — SaaS axis
- Manipulate `sessionStorage.tenant_config` to `{"default_currency":"EUR","locale":"en-US"}`.
- Reload page (or call `formatMoney(1234)` from console).
- Verify output uses `€` and en-US thousands separator.
- Restore `tenant_config` to original (re-login or set demo values).

### 12.6 Path 5 — Edge cases
- `formatMoney(0)` → currency-prefixed zero.
- `formatMoney(NaN)` → currency-prefixed zero (per the `isFinite` guard).
- `formatMoney(undefined)` → currency-prefixed zero.
- `formatMoney(1234.567, {maximumFractionDigits: 2})` → currency-prefixed `1,234.57`.

### 12.7 Path 6 — Backward compat smoke
- Load `index.html` (main ERP). 0 console errors.
- Load `crm.html?t=demo`. 0 console errors.
- Load `debt-dashboard.html` (heavy formatILS user). 0 console errors.
- Cycle through CRM tabs. 0 console errors.

### 12.8 Path 7 — Final cleanup + integrity
```bash
npm run verify:integrity   # exit 0
git status                 # clean
git log origin/develop..HEAD --oneline  # empty after push
```

---

## 13. Pre-Merge Checklist

- [ ] All §3 criteria pass.
- [ ] Integrity gate exit 0.
- [ ] `git status --short` empty (ignoring docs/guardian/*).
- [ ] HEAD pushed.
- [ ] EXECUTION_REPORT + FINDINGS + QA_FOREMAN_RESULTS + FOREMAN_REVIEW written.
- [ ] Rule 12 not breached.
- [ ] No new orphan globals.
- [ ] No SMS/Email triggered (this SPEC sends nothing).

---

## 14. Dependencies / Preconditions

- Branch develop current.
- M4 trio closed (commit `b2e3c2d`). ✓
- Skill sweep applied (commit `a0e9129`). ✓
- Demo state untouched (no DB writes in this SPEC).
- `Intl.NumberFormat` available (every modern browser since 2017).

---

*End of SPEC.*

*Authored under hybrid Foreman+Executor overnight protocol. Daniel asleep. Self-dispatched to executor next.*
