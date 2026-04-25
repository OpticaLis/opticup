# SPEC — M3_SAAS_CUSTOM_DOMAIN

> **Location:** `modules/Module 3 - Storefront/docs/specs/M3_SAAS_CUSTOM_DOMAIN/SPEC.md`
> **Authored by:** opticup-strategic (overnight hybrid Foreman session) — Claude Code
> **Authored on:** 2026-04-26 (overnight, Daniel asleep)
> **Module:** 3 — Storefront
> **Closes alerts:** M3-SAAS-07

**Executor TL;DR (1 sentence):** Add a `getCustomDomain()` helper to `js/shared.js` that reads `tenant_config.custom_domain` (or `ui_config.seo_domain`) with a SaaS-safe fallback (`'domain.co.il'`); replace 2 hardcoded `prizma-optic.co.il` literals — one in `storefront-blog.html:299` (initial HTML placeholder) and one in `modules/storefront/studio-brands.js:313` (Google preview URL) — both for SEO-preview UI in the Studio. Pre-existing JS at `modules/storefront/storefront-blog.js:681` already uses the same fallback inline; future cleanup SPEC can refactor it to call the new helper too.

---

## 1. Goal

Sentinel alert M3-SAAS-07 flags 2 hardcoded `prizma-optic.co.il` literals in the Storefront Studio's Google-preview UI. A second tenant in another country gets the wrong domain shown in their SEO preview. Both callsites are display-only (preview microcopy, not actual outbound URLs) — but they communicate brand to the staff using Studio, so they need to be tenant-aware.

**Two changes:**

1. New `getCustomDomain()` helper in `js/shared.js` — reads `getTenantConfig('custom_domain')` first, falls back to `getTenantConfig('ui_config')?.seo_domain`, then to a generic `'domain.co.il'` placeholder.
2. Replace the 2 hardcoded callsites:
   - `storefront-blog.html:299` — initial HTML placeholder text changes from `prizma-optic.co.il › בלוג › slug` to `domain.co.il › בלוג › slug` (the JS at `storefront-blog.js:681` already overwrites this on first user input — only matters for the pre-paint flash).
   - `modules/storefront/studio-brands.js:313` — replace literal with `getCustomDomain()` call.

---

## 2. Background & Motivation

### 2.1 Why now

SaaS-readiness night. M3-SAAS-07 is a Sentinel alert. The fix is small and isolated. Combining with SPEC #1 (formatMoney) closes 4 SaaS alerts in one session.

### 2.2 Why no schema column

The `tenants` table currently has no `custom_domain` field. The pre-existing `storefront-blog.js:681` reads `getTenantConfig('custom_domain') || 'domain.co.il'` — meaning it looks for `custom_domain` in `tenant_config` (loaded into `sessionStorage` from the `tenants` row). Since the column doesn't exist, the lookup returns `undefined` and the fallback `'domain.co.il'` always wins. **That's already SaaS-safe** for new tenants.

The right path tonight: keep the same pattern (don't add a schema column without Daniel approval), and document that `custom_domain` is the canonical config key for whenever Daniel decides to add it as a column or ui_config sub-key. Future SPEC can wire it into the schema + tenant onboarding flow.

### 2.3 Why a helper instead of inline

Rule 21: the same fallback pattern (`getTenantConfig('custom_domain') || 'domain.co.il'`) currently exists inline in `storefront-blog.js:681`. Adding it inline at studio-brands.js would create a 3rd copy. A `getCustomDomain()` helper solves both: studio-brands.js calls it tonight, storefront-blog.js can be cleaned in a future SPEC.

---

## 3. Success Criteria (Measurable)

### 3.1 File & repo state

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 1 | Branch state | clean | `git status` |
| 2 | Commits produced | exactly 2 | `git log origin/develop..HEAD --oneline \| wc -l` |
| 3 | `js/shared.js` size | currently 263 (verified at SPEC author 2026-04-26); 268-272 after edit | `wc -l` |
| 4 | `storefront-blog.html` size | currently 377 (verified); unchanged or ±1 after edit | `wc -l` |
| 5 | `modules/storefront/studio-brands.js` size | currently 894 (over-cap, M1-R12-02 accepted exception); MUST NOT GROW past 894 | `wc -l` |
| 6 | New `getCustomDomain` function defined | 1 export added to global scope | `grep -n "function getCustomDomain" js/shared.js` |
| 7 | Hardcoded `prizma-optic.co.il` in `storefront-blog.html` removed | grep returns 0 hits | `grep "prizma-optic.co.il" storefront-blog.html` |
| 8 | Hardcoded `prizma-optic.co.il` in `studio-brands.js` removed | grep returns 0 hits | `grep "prizma-optic.co.il" modules/storefront/studio-brands.js` |
| 9 | Integrity gate | exit 0 | `npm run verify:integrity` |
| 10 | Pre-commit hooks pass | all pass | git commit |

### 3.2 Behavioral

| # | Criterion | Expected | Verify by |
|---|-----------|----------|-----------|
| 11 | `getCustomDomain()` with no `tenant_config` set returns `'domain.co.il'` | string `'domain.co.il'` | console eval |
| 12 | `getCustomDomain()` reads `custom_domain` if present in tenant_config | returns the configured value | console eval after manual sessionStorage manipulation |
| 13 | `getCustomDomain()` falls back to `ui_config.seo_domain` if `custom_domain` missing | returns `ui_config.seo_domain` | console eval |
| 14 | Studio Brands editor opens, Google preview shows tenant domain (or fallback) | Google preview URL renders without `prizma-optic.co.il` | smoke test on demo |
| 15 | Storefront Blog editor opens, Google preview shows tenant domain (or fallback) on first paint | initial HTML doesn't show `prizma-optic.co.il` | view-source / DevTools |
| 16 | M3-SAAS-07 alert resolvable (no hardcoded prizma-optic.co.il in scoped files) | 2 grep hits become 0 | grep |

### 3.3 Backward compat

| # | Criterion | Expected | Verify by |
|---|-----------|----------|-----------|
| 17 | `storefront-blog.js:681` inline pattern still works (uses same `tenant_config.custom_domain` lookup) | unchanged | code review |
| 18 | Studio Brands editor 0 console errors | 0 errors | smoke test |
| 19 | Studio Blog editor 0 console errors | 0 errors | smoke test |

### 3.4 Documentation

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 20 | EXECUTION_REPORT.md present | exit 0 | `test -f` |
| 21 | FINDINGS.md present (or absent with reasoning) | inspect | inspect |
| 22 | Push to origin | exit 0 | `git status -uno` |

---

## 4. Autonomy Envelope

### 4.1 What the executor CAN do

- Read any file (Level 1).
- Edit `js/shared.js`, `storefront-blog.html`, `modules/storefront/studio-brands.js`.
- Commit and push to develop per §9.
- Decide internal helper structure, JSDoc wording.
- Run console-eval QA on demo.

### 4.2 What REQUIRES stopping

- Any change to `storefront-blog.js` (out of scope tonight; M1-R12-02 cap).
- Any DDL or schema change.
- Any change to a file outside the §8 list.
- `studio-brands.js` line count grows (M1-R12-02 hold-steady).
- More than 2 commits OR fewer than 2.

---

## 5. Stop-on-Deviation Triggers

1. **Studio Brands editor breaks visually after the edit.** Google preview should still show `<domain> › brands › <slug>` format — just with the new helper substituting the domain. STOP if format breaks.
2. **`studio-brands.js` line count grows.** It's at 894 (over-cap, accepted exception). My edit must be net 0 or net negative.
3. **Pre-commit hook failure.**

---

## 6. Rollback Plan

```
git reset --hard 1612200   # last commit before this SPEC
git push --force-with-lease origin develop
```

---

## 7. Out of Scope

- **`modules/storefront/storefront-blog.js:681`** — inline pattern stays. Future Rule-21 cleanup SPEC.
- **Tenants table schema change** (adding `custom_domain` column).
- **The `campaigns/supersale/messages/*.html` literals** — they're email templates with brand-specific URLs (`https://prizma-optic.co.il/supersale/`, etc.). Out of scope; future tenant-onboarding SPEC.
- **Other M3-SAAS alerts** (M3-SAAS-17, M3-SAAS-21).

---

## 8. Expected Final State

### 8.1 Modified file: `js/shared.js` — currently 263, target ~270

Add `getCustomDomain()` helper after `getTenantConfig()` and before `formatMoney()`:

```js
/**
 * Resolve the tenant's custom storefront domain, used in SEO-preview UI text.
 * Priority: tenant_config.custom_domain → tenant_config.ui_config.seo_domain → 'domain.co.il'.
 * @returns {string}
 */
function getCustomDomain() {
  var direct = getTenantConfig('custom_domain');
  if (direct) return direct;
  var uiConfig = getTenantConfig('ui_config');
  if (uiConfig && uiConfig.seo_domain) return uiConfig.seo_domain;
  return 'domain.co.il';
}
```

### 8.2 Modified file: `storefront-blog.html` — line 299

Change:
```html
<div class="gp-url" id="blog-gp-url">prizma-optic.co.il › בלוג › slug</div>
```
to:
```html
<div class="gp-url" id="blog-gp-url">domain.co.il › בלוג › slug</div>
```

### 8.3 Modified file: `modules/storefront/studio-brands.js` — line 313

Change:
```js
// TODO(B4): replace hardcoded domain with getTenantConfig('custom_domain') when added to schema
const googleUrl = `prizma-optic.co.il › brands › ${brand.slug || ''}`;
```
to:
```js
const googleUrl = `${getCustomDomain()} › brands › ${brand.slug || ''}`;
```

(TODO comment removed since the SPEC implements it.)

### 8.4 File-size projection

| File | Currently | Projected |
|---|---|---|
| `js/shared.js` | 263 | 270 (+7: helper + JSDoc) |
| `storefront-blog.html` | 377 | 377 (1 word changed in 1 line, no line count delta) |
| `modules/storefront/studio-brands.js` | 894 | 893 (-1: TODO comment line removed; replaces literal with helper call, same line). MUST NOT exceed 894. |

---

## 9. Commit Plan

Exactly 2 commits.

### Commit 1 — `feat(saas): getCustomDomain helper + replace prizma-optic.co.il in studio previews`

- Files: `js/shared.js` + `storefront-blog.html` + `modules/storefront/studio-brands.js`.
- Co-staged file pre-flight (Step 1.5g): `shared.js` is global-scope (no IIFE); `studio-brands.js` is IIFE — no shared helper names. SAFE.

### Commit 2 — `chore(spec): close M3_SAAS_CUSTOM_DOMAIN with retrospective + QA + review (overnight hybrid)`

- Files: EXECUTION_REPORT.md (new), FINDINGS.md (new if any), QA_FOREMAN_RESULTS.md (new), FOREMAN_REVIEW.md (new).

---

## 10. Test Subjects (Pinned)

### 10.1 Tenant
- demo (`tenant_id='8d8cfa7e-…'`).

### 10.2 Pre-flight verification

```bash
wc -l js/shared.js storefront-blog.html modules/storefront/studio-brands.js
# Expected: 263 + 377 + 894
```

```bash
grep -n "prizma-optic.co.il" storefront-blog.html modules/storefront/studio-brands.js
# Expected: 1 hit each (target lines)
```

```js
// Browser console:
typeof getCustomDomain  // expected pre-SPEC: 'undefined'
```

### 10.3 Path 0 — Baseline reset
N/A — no DB writes. `git rev-parse HEAD` should be `1612200`.

---

## 11. Lessons Already Incorporated

Cross-Reference Check 2026-04-26 against repo grep:
- `getCustomDomain` does not exist in repo (verified).
- The string `'custom_domain'` already appears in `storefront-blog.js:681` (existing inline lookup) — no collision, just confirms the canonical config key.

Step 1.5e file-size pre-flight: 263 + 377 + 894 (live counts).

Step 1.5f criteria-§8 sync: criterion 2 = "exactly 2 commits"; §9 = 2. ✅

Step 1.5g co-staged file pre-flight: 3 files; only 2 are JS (shared.js + studio-brands.js). shared.js is global-scope, studio-brands.js is IIFE — no helper-name collisions. SAFE.

Step 1.5h behavioral preservation: no JSON columns touched. N/A.

Lessons applied:
1. **From `M1_5_SAAS_FORMAT_MONEY/FOREMAN_REVIEW.md` Proposal 1 (console probe of new helper output)** → APPLIED — §3.2 criterion 11 specifies exact expected return value.
2. **From `M3-SAAS-07` Sentinel context (file already over Rule 12 cap)** → APPLIED — §5 stop trigger mandates studio-brands.js MUST NOT grow.

---

## 12. Foreman QA Protocol

### 12.1 Path 0 — Baseline reset
N/A (no DB).

### 12.2 Path 1 — Pre-flight + helper load
- `npm run verify:integrity` → exit 0.
- `wc -l` baselines match.
- Browser `typeof getCustomDomain === 'function'` → `true` after fresh page load.

### 12.3 Path 2 — Helper behavior
- `getCustomDomain()` with default demo tenant_config → returns `'domain.co.il'` (since neither `custom_domain` nor `ui_config.seo_domain` is set on demo).
- Manually inject `tenant_config.custom_domain = 'mystore.co.il'`; reload helper → returns `'mystore.co.il'`.
- Restore tenant_config.

### 12.4 Path 3 — Studio Brands Google preview
- Open `crm.html?t=demo` (or wherever Studio Brands lives) → click brand row → Brands editor opens → Google preview shows `domain.co.il › brands › <slug>`.

### 12.5 Path 4 — Blog editor pre-paint
- Hard-reload `storefront-blog.html?t=demo` (or its host page) → before JS runs, view-source shows `domain.co.il › בלוג › slug` in the gp-url placeholder.

### 12.6 Path 5 — Backward compat smoke
- Studio Brands editor: 0 console errors.
- Blog editor: 0 console errors.
- Storefront-blog.js inline pattern still works (verified by code grep).

### 12.7 Path 6 — Final cleanup + integrity
```bash
npm run verify:integrity   # exit 0
git status                 # clean
git log origin/develop..HEAD --oneline  # empty
grep "prizma-optic.co.il" storefront-blog.html modules/storefront/studio-brands.js  # 0 hits
```

---

## 13. Pre-Merge Checklist

- [ ] All §3 criteria pass.
- [ ] Integrity gate exit 0.
- [ ] HEAD pushed.
- [ ] All 4 retrospective docs written.
- [ ] studio-brands.js line count not increased.

---

## 14. Dependencies / Preconditions

- Branch develop current (HEAD = `1612200`).
- SPEC #1 closed (formatMoney shipped). ✓
- Demo state untouched.

---

*End of SPEC.*
