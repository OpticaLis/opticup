# SaaS-Readiness Alerts Resolved — Overnight 2026-04-26

> Overnight autonomous run by Claude Code (hybrid Foreman+Executor). Daniel asleep.
> 4 SPECs executed end-to-end; this file documents the Sentinel alerts each closed.

---

## Resolved tonight

### M3-SAAS-14 — `formatILS` hardcoded ₪ + he-IL ✅ RESOLVED

**Closed by:** SPEC `M1_5_SAAS_FORMAT_MONEY` — commits `8cb0f65` (helper + delegation) + `1612200` (retrospective).

**Resolution:** added `formatMoney(amount, opts)` to `js/shared.js` reading `default_currency` + `locale` from `tenant_config` with safe `'ILS'`/`'he-IL'` fallbacks. `formatILS()` refactored to delegate. Output is byte-identical for the legacy he-IL/ILS case (verified `formatILS(1234) === '₪1,234'`).

**Sentinel verification (next scan):** `grep -n "formatILS" js/shared.js` will find the delegating wrapper, NOT the hardcoded `'₪' + ...toLocaleString('he-IL'...)` pattern. Alert should auto-clear.

### M3-SAAS-18 / M5-DEBT-08 — `formatCurrency` duplicates `formatILS` ✅ RESOLVED

**Closed by:** Same as above (SPEC `M1_5_SAAS_FORMAT_MONEY`).

**Resolution:** `formatCurrency()` in `modules/crm/crm-helpers.js` now also delegates to `formatMoney`. Both helpers share one implementation (Rule 21 cleanup).

**Sentinel verification:** the `formatCurrency` body in `crm-helpers.js` is a thin wrapper. No duplicated `'₪' + num.toLocaleString('he-IL'...)` pattern.

### M3-SAAS-07 — SEO domain hardcoded `prizma-optic.co.il` ✅ RESOLVED

**Closed by:** SPEC `M3_SAAS_CUSTOM_DOMAIN` — commits `813021c` (helper + 2 callsites) + `fd7f182` (retrospective).

**Resolution:** added `getCustomDomain()` to `js/shared.js` (precedence: `tenant_config.custom_domain` → `ui_config.seo_domain` → `'domain.co.il'`). 2 hardcoded literals replaced: `storefront-blog.html:299` (initial HTML placeholder) and `modules/storefront/studio-brands.js:312` (Google preview URL).

**Sentinel verification:** `grep -rn "prizma-optic.co.il" storefront-blog.html modules/storefront/studio-brands.js` → 0 hits.

### M3-SAAS-20 — CRM template default URLs hardcoded ✅ ALREADY RESOLVED (no SPEC needed)

**Status confirmed by Foreman context:** the CRM_UX_REDESIGN_TEMPLATES rewrite (commit `626c72e` from prior session) already cleaned this. The remaining hits at `modules/crm/crm-messaging-templates.js:339-340` are intentional demo-display text in the preview substitution function (`substitute(text)` → replaces `%registration_url%` with `'prizma-optic.co.il/r/...'` for visual preview only, not production behavior). Same pattern as the demo lead name `'דנה כהן'` — placeholder display text.

**Recommended Sentinel rule update:** narrow the M3-SAAS-20 detector to flag only NON-preview-context literal URLs. The `substitute()` function in CRM templates editor is the canonical preview-display path and has no production impact.

### M3-SAAS-21 — VAT 17% fallback hardcoded 🟡 SUBSTANTIVELY RESOLVED (7/8 callsites)

**Closed by:** SPEC `M1_DEBT_VAT_FALLBACK_GUARD` — commits `a4e7524` (helper + 6 callsites) + `e228747` (2 AI callsites) + `b2c1d92` (retrospective).

**Resolution:** added `getVatRate()` to `js/shared.js` returning the configured rate or `0` + console.warn if missing. 7 callsites across 7 files updated. **1 callsite deferred** (`modules/goods-receipts/receipt-po-compare.js:343`) because the file is at the 350-line hard cap; my single-line edit pushed the hook's count to 351 (split-newline counting differs from `wc -l` by +1).

**Operational impact of the deferred callsite:** ZERO. Both demo and Prizma have `vat_rate='18'` in DB; the fresh DB read inside `_poCompLearnPricePattern` always returns the value, and the `0.17` fallback (still hardcoded) only fires if the DB query itself fails or returns no row. For a future tenant, the same DB read would return their configured rate.

**Forward-flag — future SPEC:** `M1_RECEIPT_PO_COMPARE_SHRINK` — find a non-functional line in the file to drop (file is exactly 350; needs 1 line of headroom), then apply the `getVatRate() / 100` fallback chain to fully close the alert. Low priority.

---

## Findings (all in scoped SPEC FINDINGS.md files)

| # | Severity | Finding | Status |
|---|---|---|---|
| F1 (SPEC #1) | MEDIUM | PowerShell `[System.IO.File]::WriteAllText` corrupted UTF-8 | OPEN — process improvement |
| F2 (SPEC #1) | LOW | LRM mark on negative numbers | DISMISSED — matches legacy |
| F3 (SPEC #1) | INFO | Module 1.5 MODULE_MAP doesn't enumerate shared.js helpers | OPEN — pre-existing doc gap |
| F1 (SPEC #3) | LOW | receipt-po-compare.js:343 callsite deferred (file at cap) | OPEN — future cleanup SPEC |
| F2 (SPEC #3) | INFO | rule-21-orphans regex over-broad | OPEN — TECH_DEBT |
| F3 (SPEC #3) | INFO | Pre-existing IIFE-local name collisions across 4 debt files | OPEN — TECH_DEBT |

---

## What this means for next strategic session (Cowork morning)

1. **3 of 5 alerts fully resolved.** Sentinel's next 4-hourly scan should auto-clear M3-SAAS-14, M3-SAAS-18/M5-DEBT-08, M3-SAAS-07.
2. **M3-SAAS-20 was already stale** — recommend Sentinel rule refinement so the alert detector knows to skip the preview-display path.
3. **M3-SAAS-21 partially resolved.** 7/8 callsites cleaned. 1 deferred with documented next-action SPEC.
4. **No production impact.** All 4 SPECs were code-only or doc-only; demo state restored to baseline; 0 dispatches; 0 schema changes.

## Suggested next-session priorities

1. **Apply skill improvements** from tonight's FOREMAN_REVIEWs (4 reviews × 4 proposals each = 16 proposals, several overlapping). High-value focuses:
   - Console-probe step in Step 1.5 (catches output-format divergence pre-execution).
   - File-size hook awareness (split('\n').length vs wc -l).
   - Pre-staging rule-21 simulation (catches IIFE-local collisions pre-commit).
2. **Future tiny SPEC `M1_RECEIPT_PO_COMPARE_SHRINK`** (closes the 1 deferred VAT callsite).
3. **Verify Sentinel auto-clears** the 3 fully-resolved alerts on its next scan; if not, investigate why.
4. **Then P7 Prizma cutover** (pending Daniel approval) or other module work.

---

*End of SAAS_ALERTS_RESOLVED_2026-04-26.md.*
