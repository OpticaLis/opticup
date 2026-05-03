# SPEC — CRM_PHONE_SEARCH_NORMALIZATION

> **Location:** `modules/Module 4 - CRM/docs/specs/CRM_PHONE_SEARCH_NORMALIZATION/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-03
> **Module:** 4 — CRM
> **Phase (if applicable):** Pre-cutover hot-fix (sourced from Campaign Overseer REC-009 / POST-7 backlog)
> **Author signature:** Claude Code Windows desktop session, 2026-05-03

---

## 1. Goal

Make the CRM lead-search box find leads when an operator types an Israeli local-format phone (`0XXXXXXXXX`) on either the "רשומים" tab or the "לידים נכנסים" tab, by normalizing the search input to E.164 before substring-matching against the stored `crm_leads.phone`.

---

## 2. Background & Motivation

Bug surfaced 2026-05-03 during cutover-day testing (Campaign Overseer REC-009; recorded as POST-7 in `project_post_cutover_backlog.md`). Daniel typed `0537889878` on `/crm/` "רשומים" → no results. Typing the substring `97253788` found his lead.

Root cause (verified by Overseer):
- `lead-intake` Edge Function normalizes phones to E.164 at insert time (`+972...`), so `crm_leads.phone` never contains a leading `0`.
- Both tabs do raw substring matching (`phone.indexOf(s) !== -1`) without normalizing the operator's input. The Israeli local form `0XXXXXXXXX` is therefore never a substring of the stored `+972XXXXXXXXX`.
- Every operator who types a local-format phone concludes leads are missing — a high-impact UX regression on cutover day.

Helper to reuse (Iron Rule 21 — No Orphans, No Duplicates): `CrmHelpers.normalizePhone(raw)` already exists at `modules/crm/crm-helpers.js` line 31 (function definition) and is exported at line 194 via `window.CrmHelpers`. It mirrors the EF rule: leading `0` + 10 digits → `+972<rest>`. Returns `null` for inputs that don't normalize. **Reuse, do not invent.**

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state at SPEC start | On `develop`, pulled from origin | `git branch --show-current` → `develop` |
| 2 | Files modified | exactly 2 source files | `git diff --name-only origin/develop...HEAD -- 'modules/crm/' \| wc -l` → 2 |
| 3 | Modified file 1 | `modules/crm/crm-leads-tab.js` line count | `wc -l modules/crm/crm-leads-tab.js` → 349 |
| 4 | Modified file 2 | `modules/crm/crm-incoming-tab.js` line count | `wc -l modules/crm/crm-incoming-tab.js` → 264 |
| 5 | `crm-leads-tab.js` `var s` declaration | now also defines `sNorm` via comma-form | `grep -n "var s = search.trim().toLowerCase(), sNorm = " modules/crm/crm-leads-tab.js` → 1 hit on line 145 |
| 6 | `crm-leads-tab.js` substring filter | now includes `sNorm` clause | `grep -n "(sNorm && phone.indexOf(sNorm) !== -1)" modules/crm/crm-leads-tab.js` → 1 hit on line 152 |
| 7 | `crm-incoming-tab.js` `var q` declaration | now also defines `sNorm` via comma-form | `grep -n "var q = incomingSearch.trim().toLowerCase(), sNorm = " modules/crm/crm-incoming-tab.js` → 1 hit on line 107 |
| 8 | `crm-incoming-tab.js` substring filter | now includes `sNorm` clause | `grep -n "(sNorm && leadPhone.indexOf(sNorm) !== -1)" modules/crm/crm-incoming-tab.js` → 1 hit on line 120 |
| 9 | Iron Rule 12 (file-size) | both files ≤ 350 lines | `awk 'END{print NR}' modules/crm/crm-leads-tab.js` ≤ 350 AND `awk 'END{print NR}' modules/crm/crm-incoming-tab.js` ≤ 350 |
| 10 | Integrity Gate (Iron Rule 31) | exit 0 or 2 (no null-byte ERROR) | `npm run verify:integrity; echo $?` → `0` or `2` |
| 11 | Single commit produced | exactly 1 commit ahead of origin | `git rev-list --count origin/develop..HEAD` → 1 |
| 12 | Pushed to origin | `develop` HEAD matches local | `git fetch && git rev-parse HEAD` == `git rev-parse origin/develop` |
| 13 | Working tree clean | no uncommitted changes | `git status --short` → empty |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in the repo
- Apply the 4 surgical edits specified in §8 (Expected Final State) verbatim
- Stage only the 4 paths in scope (the 2 source files + the 2 SPEC retrospective files)
- Commit and push to `develop` per §9 (Commit Plan)
- Run `npm run verify:integrity`

### What REQUIRES stopping and reporting
- Any Iron / SaaS / Hygiene rule would be violated by the next step
- Any file outside the 4 paths in §8 shows up in `git status` after the edits
- Either source file's line count after edit ≠ the value in §3 criteria #3 / #4
- The `var s = search.trim().toLowerCase();` line in `crm-leads-tab.js` is no longer at line 145, OR the substring filter is no longer at line 152 (drift > ±5 lines means the file changed since the Overseer surveyed it)
- The same drift check on `crm-incoming-tab.js` for lines 107 / 120
- `CrmHelpers.normalizePhone` is no longer exported by `modules/crm/crm-helpers.js` (executor MUST grep before editing)
- Integrity gate returns exit 1 (null-byte ERROR)
- Any merge to `main` is requested by any caller (NEVER do this — only Daniel does, via PR)

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- File structure doesn't match background paragraph (line numbers off by ±5 OK; ±20 means the file changed since survey — STOP).
- After edit, file-size verification (criterion #9) fails for either file.
- After edit, Daniel reports any of the 4 manual-QA cases (§8 verification) failing.

---

## 6. Rollback Plan

Single commit, surgical edit, no DB / EF / config changes:
- `git revert <commit_hash>` then `git push origin develop` reverses the SPEC entirely.
- No DB state to restore.
- No EF redeploy needed.

---

## 7. Out of Scope (explicit)

The following look related but MUST NOT be touched in this SPEC:
- `modules/crm/crm-helpers.js` — the helper is reused as-is, not modified
- `modules/crm/crm-leads-detail.js`, `modules/crm/crm-events-*.js`, any other CRM file
- The `crm_leads` table schema and any DB object
- The `lead-intake` Edge Function and any EF deploy
- Any other tab with a search box (events, attendees, messaging, campaigns) — out of scope for this hot-fix
- Any RPC, migration, or seed
- The `formatPhone` helper (display-side formatting; unrelated to search)
- Adding new helpers to `CrmHelpers` (Rule 21: reuse `normalizePhone`)
- Email-search behavior (criterion: name + email match are unchanged)

---

## 8. Expected Final State

### New files
- `modules/Module 4 - CRM/docs/specs/CRM_PHONE_SEARCH_NORMALIZATION/EXECUTION_REPORT.md` (written by executor at SPEC close)
- `modules/Module 4 - CRM/docs/specs/CRM_PHONE_SEARCH_NORMALIZATION/FINDINGS.md` (written by executor at SPEC close)

### Modified files

#### `modules/crm/crm-leads-tab.js` (349 lines, unchanged total)

**Edit 1 — Line 145** (replace single line, comma-form to keep file ≤349):

Before:
```javascript
    var s = search.trim().toLowerCase();
```

After:
```javascript
    var s = search.trim().toLowerCase(), sNorm = (window.CrmHelpers && CrmHelpers.normalizePhone) ? CrmHelpers.normalizePhone(s) : '';
```

**Edit 2 — Line 152** (replace single line):

Before:
```javascript
      return name.indexOf(s) !== -1 || phone.indexOf(s) !== -1 || email.indexOf(s) !== -1;
```

After:
```javascript
      return name.indexOf(s) !== -1 || phone.indexOf(s) !== -1 || (sNorm && phone.indexOf(sNorm) !== -1) || email.indexOf(s) !== -1;
```

#### `modules/crm/crm-incoming-tab.js` (264 lines, unchanged total)

**Edit 3 — Line 107** (replace single line, comma-form):

Before:
```javascript
    var q = incomingSearch.trim().toLowerCase();
```

After:
```javascript
    var q = incomingSearch.trim().toLowerCase(), sNorm = (window.CrmHelpers && CrmHelpers.normalizePhone) ? CrmHelpers.normalizePhone(q) : '';
```

**Edit 4 — Line 120** (replace single line):

Before:
```javascript
      return leadName.indexOf(q) !== -1 || leadPhone.indexOf(q) !== -1 || leadEmail.indexOf(q) !== -1;
```

After:
```javascript
      return leadName.indexOf(q) !== -1 || leadPhone.indexOf(q) !== -1 || (sNorm && leadPhone.indexOf(sNorm) !== -1) || leadEmail.indexOf(q) !== -1;
```

### Deleted files
None.

### DB state
Unchanged.

### Docs updated
This is a surgical UI hot-fix; no master-doc updates required at SPEC close. SESSION_CONTEXT will be touched only if Daniel asks for a one-line note after manual-QA passes.

### Manual QA — Daniel runs after push (4 acceptance cases)

The executor must print these exactly to Daniel at hand-off:
1. `/crm/` → "רשומים" tab → type `0537889878` → Daniel's lead appears in <500ms.
2. `/crm/` → "לידים נכנסים" tab → type `0537889878` → Daniel's incoming lead appears (if present).
3. Regression: type `דניאל` → name search still works.
4. Regression: type `537` (3-digit substring of stored E.164 form) → partial-phone search still works (raw substring path unchanged).

Note: typing `0537` (4-digit Israeli-local prefix) is not expected to produce a hit; it didn't before this fix either, because the leading `0` is not stored. This is acceptable — the SPEC fixes the full-10-digit case, not partials starting with `0`. Recorded here so the executor doesn't flag it as a regression during QA.

---

## 9. Commit Plan

Exactly **1 commit**, both source files + the 2 retrospective docs in the same commit. No separate "spec" commit.

Commit message:
```
fix(crm): normalize phone search input to find leads in Israeli local format
```

Files in commit:
- `modules/crm/crm-leads-tab.js`
- `modules/crm/crm-incoming-tab.js`
- `modules/Module 4 - CRM/docs/specs/CRM_PHONE_SEARCH_NORMALIZATION/EXECUTION_REPORT.md`
- `modules/Module 4 - CRM/docs/specs/CRM_PHONE_SEARCH_NORMALIZATION/FINDINGS.md`

(The pre-existing `ACTIVATION_PROMPT.md` and this `SPEC.md` are tracked-or-untracked depending on prior state; the executor will add them to the same commit only if they're not already committed.)

Push to `origin/develop`. **Do NOT merge to main.** Daniel handles PR-merge himself per `feedback_main_merge_via_pr.md`.

---

## 10. Dependencies / Preconditions

- On `develop`, repo clean for the in-scope paths (pre-existing untracked files outside `modules/crm/` and outside this SPEC's folder are explicitly fine — the executor uses **selective `git add` by exact filename**, never `git add -A`).
- `CrmHelpers.normalizePhone` exported by `modules/crm/crm-helpers.js` (pre-flight grep mandatory).
- No prior in-flight CRM edits — git status of `modules/crm/` is clean before starting.

---

## 11. Lessons Already Incorporated

Cross-Reference Check (Step 1.5) completed 2026-05-03 against authoritative sources:
- `grep -n "normalizePhone" modules/crm/crm-helpers.js` → function at line 31, export at line 194 (1 definition, 1 export — no duplicates anywhere else in `modules/crm/` or `js/`).
- `grep -n "var sNorm" modules/crm/` → 0 hits (new variable name, no collision).
- `grep -n "indexOf(sNorm)" modules/crm/` → 0 hits.
- 0 collisions / 1 reuse-target confirmed (Iron Rule 21).

FOREMAN_REVIEW proposals applied from the 3 most-recent M4 reviews:
- **FROM `M4_AUTOMATION_ENGINE_SERVER_SIDE/FOREMAN_REVIEW.md` → SA proposal #2 ("don't invent parallel mechanism — extend existing infra, Iron Rule 21")** → APPLIED. The SPEC mandates reusing `CrmHelpers.normalizePhone` rather than authoring a new helper, and §7 explicitly forbids adding to `CrmHelpers`.
- **FROM `C001_SEND_MESSAGE_PHONE_ALLOWLIST_REMOVAL/FOREMAN_REVIEW.md` → Proposal B ("don't trust comment-described inventories — grep the code")** → APPLIED. Foreman independently re-verified the brief's line numbers (`crm-leads-tab.js:145/152`, `crm-incoming-tab.js:107/120`) and the `CrmHelpers.normalizePhone` export by reading the actual source before authoring §8.
- **FROM `M4_CAMPAIGNS_V2_METRICS_AND_DATERANGE/FOREMAN_REVIEW.md` → SA-1 (tenant-scope verification)** → NOT APPLICABLE (no tenant counts in this SPEC).
- **FROM `M4_CAMPAIGNS_V2_METRICS_AND_DATERANGE/FOREMAN_REVIEW.md` → SA-2 (Make/EF blueprint snapshots)** → NOT APPLICABLE (no Make / EF / webhook contract changes).
- **FROM `M4_AUTOMATION_ENGINE_SERVER_SIDE/FOREMAN_REVIEW.md` → SA-1 (verify cited finding ID)** → NOT APPLICABLE (no cross-SPEC finding citation).
- **FROM `C001_SEND_MESSAGE_PHONE_ALLOWLIST_REMOVAL/FOREMAN_REVIEW.md` → Proposal A (verify cross-SPEC dependency claims against live state)** → NOT APPLICABLE (this SPEC has no cross-SPEC dependency claims).

Iron Rule 12 explicit accommodation: `crm-leads-tab.js` is currently 349 lines (1 under the 350 absolute max). The SPEC therefore prescribes the **comma-form `var s = ..., sNorm = ...`** declaration on line 145 (rather than a separate new line) so the file remains at 349 lines after the fix. `crm-incoming-tab.js` (264 → 264) follows the same pattern for consistency.

---

## 12. Pre-Merge Checklist

- [ ] All §3 success criteria pass with actual values captured in `EXECUTION_REPORT.md` §2.
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2.
- [ ] `git status --short` returns empty (clean tree).
- [ ] HEAD pushed to `origin/develop`.
- [ ] `EXECUTION_REPORT.md` + `FINDINGS.md` written in the SPEC folder.
- [ ] 4 manual-QA acceptance cases printed to Daniel for his verification on the live app.
- [ ] **NO merge to main** — that step belongs to Daniel via PR with branch protection.
