# FINDINGS — PHONE_SEARCH_PARTIAL_FIX

> **Location:** `modules/Module 4 - CRM/docs/specs/PHONE_SEARCH_PARTIAL_FIX/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — `crm-incoming-tab.js:109` has the identical partial-Israeli-phone-search bug

- **Code:** `M4-INFO-INCOMING-PHONE-01`
- **Severity:** INFO (tech-debt)
- **Discovered during:** Step 1.c cross-reference grep of `normalizePhone` across `modules/crm/`
- **Location:** `modules/crm/crm-incoming-tab.js:109`
- **Description:** The incoming-leads tab uses the same search-filter pattern as the leads tab — declares `var sNorm = (window.CrmHelpers && CrmHelpers.normalizePhone) ? CrmHelpers.normalizePhone(q) : '';` and then tests `phone.indexOf(sNorm)`. Because `normalizePhone` returns `null` on partial-Israeli inputs (e.g. `05056`), `sNorm` becomes empty and the search falls back to literal substring matching against E.164-stored phones (`+972...`) which never contain the local `0` prefix. Same root cause, same operator-visible symptom, same fix would apply (build a partial-E.164 form with the leading-`0` heuristic and test `phone.indexOf` against it).
- **Reproduction:**
  ```
  CRM → קליטה (incoming) tab → search for "05056" (or any partial Israeli prefix
  starting with 0). Expected: incoming lead with phone +972505... should match.
  Actual: 0 results.
  ```
- **Expected vs Actual:**
  - Expected: same partial-search affordance as the leads tab (now fixed in `f13888a`)
  - Actual: incoming tab still has the original bug — operators get inconsistent search behavior across tabs
- **Suggested next action:** NEW_SPEC.
- **Rationale for action:** SPEC §7 (Out of Scope) explicitly excluded "Other tabs' search affordances" from this SPEC. The dispatch reinforced "list them but DO NOT modify in this SPEC". The fix is the same 1-line ternary as in `f13888a` — small enough that a follow-up SPEC is trivially scoped. NEW_SPEC because it is a direct user-visible regression on a different tab, not just internal tech debt; an operator will hit it when triaging incoming leads.
- **Foreman override (filled by Foreman in review):** { }

---
