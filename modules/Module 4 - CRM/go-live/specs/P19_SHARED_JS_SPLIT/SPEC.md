# SPEC — P19_SHARED_JS_SPLIT

> **Module:** Cross-module (js/shared.js is project-wide)
> **Location:** `modules/Module 4 - CRM/go-live/specs/P19_SHARED_JS_SPLIT/`
> **Author:** opticup-strategic (Cowork)
> **Written:** 2026-04-23
> **Status:** READY FOR EXECUTION
> **Priority:** Pre-P7 — blocks all Rule 5 FIELD_MAP additions

---

## 1. Goal

Split `js/shared.js` (407 lines, 57 over the 350-line hard max) into 3 files
so Rule 12 is satisfied and Rule 5 FIELD_MAP additions are unblocked. Add
P18's deferred FIELD_MAP entries (`max_coupons`, `extra_coupons` under
`crm_events`) as the first follow-up.

---

## 2. Tracks

### Track A — Split `js/shared.js` into 3 files

Current structure (4 sections, 407 lines):

| Section | Lines | Content |
|---------|-------|---------|
| CONFIG (1–120) | 120 | `SUPABASE_URL`, `SUPABASE_ANON`, `T` constants, `resolveTenant()` |
| STATE (121–136) | 16 | Tenant state variables |
| COMPAT (137–314) | 178 | `FIELD_MAP`, `FIELD_MAP_REV`, `ENUM_MAP`, `heToEn`/`enToHe` |
| UI (315–407) | 93 | `getTenantId`, `escapeHtml`, `formatILS`, `toast`, `confirmDialog` |

**Split plan:**

| New file | Content | Estimated lines |
|----------|---------|----------------|
| `js/shared.js` | CONFIG (1–120) + STATE (121–136) + UI (315–407) | ~229 |
| `js/shared-field-map.js` | COMPAT section: `FIELD_MAP`, `FIELD_MAP_REV`, `ENUM_MAP`, `heToEn`, `enToHe`, `enumCatForCol` | ~178 |

Two files, not three — the STATE section (16 lines) is too small to justify
its own file and is tightly coupled to CONFIG (tenant resolution writes to
state variables). Keeping CONFIG+STATE+UI together at ~229 lines gives
ample headroom for future UI helpers.

**A1. Create `js/shared-field-map.js`**

Extract lines 137–314 verbatim. The file must NOT have any dependencies
on shared.js — verify that `FIELD_MAP`, `FIELD_MAP_REV`, `ENUM_MAP`,
`heToEn`, `enToHe`, and `enumCatForCol` don't reference any globals from
CONFIG or UI. (They don't — they are pure data maps + pure lookup functions.)

**A2. Remove lines 137–314 from `js/shared.js`**

Leave a comment at the extraction point:
```javascript
// — FIELD_MAP, ENUM_MAP, heToEn/enToHe — moved to js/shared-field-map.js
```

**A3. Update all HTML pages that load `shared.js`**

Add `<script src="js/shared-field-map.js"></script>` BEFORE the existing
`<script src="js/shared.js"></script>` in every HTML file that loads shared.js.

**Why before:** `FIELD_MAP` is a global object. It must be defined before any
module JS tries to access it. `shared.js` itself does NOT reference FIELD_MAP,
so load order between the two doesn't matter for shared.js — but some module
JS files (loaded after shared.js) call `heToEn` / `enToHe` which live in the
new file. Loading field-map first ensures everything is defined.

The 15 HTML files that load shared.js (excluding test files):
`crm.html`, `index.html`, `inventory.html`, `shipments.html`,
`settings.html`, `employees.html`, `suppliers-debt.html`,
`storefront-settings.html`, `storefront-studio.html`,
`storefront-content.html`, `storefront-products.html`,
`storefront-landing-content.html`, `storefront-glossary.html`,
`storefront-brands.html`, `storefront-blog.html`

Also update the 3 test files:
`shared/tests/activity-log-test.html`, `db-test.html`, `table-test.html`

### Track B — Add deferred FIELD_MAP entries from P18

After the split, add to `js/shared-field-map.js` under the `crm_events`
section of FIELD_MAP:

```javascript
'כמות קופונים':       'max_coupons',
'קופונים נוספים':      'extra_coupons',
```

This closes the Rule 5 debt from M4-DEBT-P18-01.

### Track C — Update `docs/FILE_STRUCTURE.md`

Add `js/shared-field-map.js` to the file structure documentation.

---

## 3. Success Criteria

| # | Criterion | Expected |
|---|-----------|----------|
| 1 | `wc -l js/shared.js` | ≤ 250 |
| 2 | `wc -l js/shared-field-map.js` | ≤ 200 |
| 3 | Both files ≤ 350 hard max | Pre-commit hook passes |
| 4 | `grep -c "FIELD_MAP" js/shared.js` | 0 (moved out) |
| 5 | `grep -c "FIELD_MAP" js/shared-field-map.js` | ≥ 1 |
| 6 | `grep -c "max_coupons" js/shared-field-map.js` | ≥ 1 |
| 7 | `grep -c "extra_coupons" js/shared-field-map.js` | ≥ 1 |
| 8 | All 15 HTML files include `shared-field-map.js` | `grep -l "shared-field-map" *.html` = 15 files |
| 9 | `heToEn` function exists in `shared-field-map.js` | `grep -c "function heToEn" js/shared-field-map.js` = 1 |
| 10 | Zero new console errors on `crm.html?t=demo` | Manual browser check |
| 11 | Zero new console errors on `index.html?t=demo` | Manual browser check |

---

## 4. Autonomy Envelope

**MAXIMUM AUTONOMY** — no checkpoints. This is a mechanical split with zero
behavior changes. Execute all tracks and commit.

---

## 5. Stop-on-Deviation Triggers

1. Any function in the extracted section references a global from CONFIG/UI
   (e.g., `sb`, `getTenantId`) — STOP, the split boundary is wrong
2. Pre-commit hook fails on any file
3. Any consumer JS file fails to find `FIELD_MAP` or `heToEn` at runtime

---

## 6. Files Affected

| File | Track | Changes |
|------|-------|---------|
| `js/shared.js` (407L) | A | Remove COMPAT section (lines 137–314) → ~229L |
| NEW `js/shared-field-map.js` | A+B | Extract COMPAT section + add P18 FIELD_MAP entries → ~180L |
| 15 HTML files | A | Add `<script>` tag for `shared-field-map.js` |
| 3 test HTML files | A | Same |
| `docs/FILE_STRUCTURE.md` | C | Add new file entry |

---

## 7. Out of Scope

- Splitting CONFIG further (T constants, resolveTenant) — not needed, 229L is fine
- Refactoring FIELD_MAP to a proper module system — the ERP has no build step
- Adding FIELD_MAP entries for other modules' deferred fields — only P18's
- Renaming any existing functions or variables
- Touching any module JS files — they consume globals, no import changes

---

## 8. Expected Final State

```
js/shared.js            — ~229L (CONFIG + STATE + UI)
js/shared-field-map.js  — ~180L (FIELD_MAP + ENUM_MAP + translation helpers)
```

1 commit:
`refactor(shared): split shared.js — extract FIELD_MAP to shared-field-map.js, add P18 coupon entries`

---

## 9. Rollback Plan

1. Revert commit.
2. Single file restored, all HTML pages back to one `<script>` tag.

---

## 10. Commit Plan

See §8. Single commit — the split is atomic and must not be half-applied.

---

## 11. Verification Evidence (Guardian Protocol)

| Claim | Verification |
|-------|-------------|
| shared.js is 407 lines | **VERIFIED** — `wc -l js/shared.js` = 407 |
| COMPAT section is lines 137–314 | **VERIFIED** — section markers `// — SUPABASE COMPATIBILITY LAYER —` at 137, `// — UI HELPERS —` at 315 |
| FIELD_MAP has no dependencies on CONFIG/UI globals | **VERIFIED** — grep for `sb `, `getTenantId`, `SUPABASE_`, `resolveTenant` in lines 137–314 = 0 hits |
| 15 HTML files load shared.js | **VERIFIED** — grep `shared.js` across *.html = 15 non-test files |
| FIELD_MAP consumers: 10 JS files (inventory, goods-receipts, brands, data-loading) | **VERIFIED** — grep `FIELD_MAP\|heToEn\|enToHe\|enumCatForCol` = 10 .js files |
| CRM files do NOT use FIELD_MAP | **VERIFIED** — 0 hits in `modules/crm/*.js` |
| Cross-Reference: `shared-field-map.js` name unused | **VERIFIED** — 0 hits in repo |

---

## 12. Lessons Already Incorporated

- **From P18 FOREMAN_REVIEW proposal 1:** Rule 5 destination file line-budget
  check — this entire SPEC exists because shared.js was over budget.
- **From P15 FOREMAN_REVIEW proposal 1:** Line-budget contradictions — the
  split gives both files 120–170 lines of headroom.

---

*End of SPEC — P19_SHARED_JS_SPLIT*
