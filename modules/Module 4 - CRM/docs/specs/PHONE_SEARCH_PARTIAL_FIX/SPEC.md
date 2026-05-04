# SPEC — PHONE_SEARCH_PARTIAL_FIX

> **Authored by:** opticup-strategic (Foreman, in-session)
> **Authored on:** 2026-05-04 late night (M4 closure rush, post-PR-merge follow-up)
> **Module:** 4 — CRM
> **Source:** Daniel-reported regression 2026-05-04 late night, post-merge of POST-4 + earlier POST-7 fix `732aacf`. Searching `05056` (Israeli local-format prefix, partial) returns 0 results; searching `5056` (without leading 0) finds the lead. Daniel: "אפשר למצוא רק אם מדביקים את המספר המלא. אם מתחילים לכתוב את המספר לא מוצאים אותו, אבל אם מתחילים לכתוב אותו בלי ה-0 כן מוצאים גם אם כותבים רק חלק מהמספר."
> **Production discipline:** 1-line patch on a function. No DB writes. Demo + prizma read-only test.

---

## 1. Goal

Fix partial-Israeli-format phone search: when an operator types `05056` (or any prefix of an Israeli local-format phone), the leads tab should match leads stored as `+972505636387`. Currently it matches only complete 10-digit local strings (`0505636387`) or international substrings (`972505636387`, `5056`).

---

## 2. Background & Verified Evidence

**Probed 2026-05-04 late night:**

- ✅ Storage canonical: phones stored in `crm_leads.phone` as E.164 (`+972...`). Verified live: `+972505636387` for "אבי".
- ✅ Search code at `modules/crm/crm-leads-tab.js:145-152`:
  ```js
  var s = search.trim().toLowerCase();
  var sNorm = (window.CrmHelpers && CrmHelpers.normalizePhone) ? CrmHelpers.normalizePhone(s) : '';
  ...
  return name.indexOf(s) !== -1 || phone.indexOf(s) !== -1 || (sNorm && phone.indexOf(sNorm) !== -1) || email.indexOf(s) !== -1;
  ```
- ✅ `CrmHelpers.normalizePhone` at `modules/crm/crm-helpers.js:31-42`:
  ```js
  if (hasPlus) return '+' + digits;
  if (digits.indexOf('972') === 0) return '+' + digits;
  if (digits.charAt(0) === '0' && digits.length === 10) return '+972' + digits.slice(1);
  return null;
  ```

**Bug:** the third condition requires `digits.length === 10`. For partial inputs like `05056` (5 digits), `0537` (4 digits), the function returns `null`, `sNorm` becomes empty, and the search falls back to literal substring on the stored E.164 — which never contains `05056` (the leading 0 was replaced by `+972`).

**Daniel-confirmed live** 2026-05-04: typing `5056` finds 'אבי' (`+972505636387`). Typing `05056` finds nothing. Both should find the same lead.

---

## 3. Success Criteria

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 3.1 | Search `05056` finds 'אבי' (+972505636387) | match | manual |
| 3.2 | Search `0505636387` (full local format) finds 'אבי' | match (already working — no regression) | manual |
| 3.3 | Search `5056` (no leading 0) finds 'אבי' | match (already working — no regression) | manual |
| 3.4 | Search `+972505` (international prefix) finds 'אבי' | match (already working) | manual |
| 3.5 | Search `xyz` (non-numeric) returns no leads (search by name still works for 'xyz' as substring) | no false-positives | manual |
| 3.6 | The `normalizePhone` helper signature/return contract is unchanged for full-format inputs (10-digit local, +972..., 972...) | identical output for full-format | unit-style mental check |
| 3.7 | The fix lives in the CRM search-side normalization, NOT in `normalizePhone` itself (preserve normalize semantics for INSERT paths — they need null on partial input to reject bad data) | search-side helper, not core helper | code review |
| 3.8 | Iron Rule 12 (file size ≤350) | crm-leads-tab.js still under cap | wc -l |
| 3.9 | Iron Rule 31 (integrity gate) | clean | post-commit |
| 3.10 | Single commit | exactly 1 commit | `git log` |

---

## 4. Autonomy Envelope

**Executor CAN:**
- Add a small helper `partialPhoneToE164(s)` inline in `crm-leads-tab.js` (or extend the existing search logic) that:
  - if `s` is all digits and starts with `0` and length ≥2, replace the leading `0` with `+972` (or `972` to compare substring against E.164 stored as `+972...`).
  - return both forms (`+972<rest>` and `972<rest>`) for indexOf matching.
- Modify line 152 to also test against this partial-normalized form.
- Run integrity gate, commit, push.
- Smoke test on demo or prizma (read-only).

**Executor MUST stop:**
- If the change requires modifying `CrmHelpers.normalizePhone` (it MUST NOT — that helper is reused by lead-intake EF + form validation; widening its semantics would break the rejection path on bad-data inputs).
- If grep finds another tab/screen with the same partial-search pattern that should also benefit (e.g., `crm-incoming-tab.js`) — STOP, ask Foreman whether to widen scope.
- Any merge to main.

---

## 5. Stop Triggers

1. **`normalizePhone` modified instead of search-side fix:** if the executor edits `crm-helpers.js`, STOP. The helper has multiple consumers (write-paths, EF) where `null` on partial is correct behavior.
2. **Search returns false-positives:** if typing `0` (single character) returns all leads with phone, that's a regression. The fix should require ≥2 digits to apply the prefix-replace heuristic.
3. **Other tabs (incoming, broadcast filters) have the same bug but the fix doesn't propagate:** STOP, ask Foreman.

---

## 6. Rollback Plan

`git revert <commit>` — restores the original `phone.indexOf(sNorm)` only logic. Partial search regresses to current behavior.

---

## 7. Out of Scope

- Server-side `ilike` search (current is client-side substring on already-loaded leads — fine for ≤2,000 lead counts).
- Other tabs' search affordances.
- Email partial-format normalization (not requested).
- Phone formatting on display (that's UI concern, separate).

---

## 8. Expected Final State

```
modules/crm/crm-leads-tab.js
  Line ~145-152: search filter logic extended with partial-phone handling.
  File size still ≤350 lines.

modules/Module 4 - CRM/docs/specs/PHONE_SEARCH_PARTIAL_FIX/
  SPEC.md / ACTIVATION_PROMPT.md / EXECUTION_REPORT.md / FINDINGS.md
```

---

## 9. Commit Plan

**Commit 1:** `fix(crm): partial Israeli-format phone search — handle 0-prefixed prefixes shorter than 10 digits`. File: `modules/crm/crm-leads-tab.js`.

**Commit 2 (retro):** `chore(spec): close PHONE_SEARCH_PARTIAL_FIX with retrospective`.

**No merge to main.** Daniel handles PR.

---

## 10. Cross-Reference Check

| Name | Result | Resolution |
|---|---|---|
| `normalizePhone` in `crm-helpers.js` | EXISTS, returns null on partial input | DO NOT modify — preserve write-path contract |
| Search filter in `crm-leads-tab.js:145-152` | TARGET — the fix lives here |
| `crm-incoming-tab.js` search | UNVERIFIED at author time — executor checks at Step 1 |
| Broadcast filters search | UNVERIFIED — executor checks |

---

## 11. Lessons Already Incorporated

- **L-005 Rule A (live-flow check before cleanup REC):** N/A — this is a [feature-request] / regression-fix, not anomaly cleanup.
- **L-005 Rule B (REC class-tagging):** this SPEC's source REC is implicitly `[feature-request]` (user-reported partial-search regression).
- **L-004 (probe schema before SPEC writes):** §2 quotes the exact source of `normalizePhone` and the search line — verified live.

---

## 12. Manual QA — Daniel runs

After commit pushes:

1. CRM → רשומים tab on prizma (or demo).
2. Search `05056` → expect 'אבי' visible.
3. Search `0505636387` → 'אבי' visible (regression check).
4. Search `5056` → 'אבי' visible (regression check).
5. Search `0` (single char) → expect NOT all leads visible (no false-positive on overly-broad heuristic). The intent is search-by-substring still requires meaningful input.
6. Search by name `אבי` → still works.

**Stop trigger:** any false-positive on test 5, OR any regression on tests 2-4 + 6.

---

## 13. Deferrals

- Server-side phone search (`ilike`) for very large datasets (>5K leads) — future.
- Display-side phone formatting normalization — out of scope.
- Other tabs' phone partial-search — depends on what executor finds at Step 1 cross-ref check.

---

*End of SPEC.*
