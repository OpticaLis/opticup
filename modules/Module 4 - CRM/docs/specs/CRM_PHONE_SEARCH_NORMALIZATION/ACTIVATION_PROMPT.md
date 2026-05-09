You are working in `C:\Users\User\opticup` (the ERP repo, `opticalis/opticup`). Follow CLAUDE.md and all 30 Iron Rules. The user is Daniel.

## Role for this session

Two-step. First load `opticup-strategic` (Foreman) and author the SPEC. Then load `opticup-executor` and execute it. Both stages belong in this single session.

## Background (from Campaign Overseer REC-009)

**Bug surfaced 2026-05-03 cutover-day testing — POST-7 in `project_post_cutover_backlog.md`.**

Daniel types `0537889878` (Israeli local format) into the search box on the CRM "רשומים" (registered leads) tab → "no results". Typing `97253788` (substring of stored E.164) finds his lead. Same pattern reproduces on "לידים נכנסים" tab.

**Root cause confirmed by Overseer (Cowork session, 2026-05-03):**
- Phones stored in `crm_leads.phone` as E.164 (e.g., `+972537889878`).
- Both tabs do raw substring match: `phone.indexOf(s) !== -1` without normalizing user input.
- Israeli local format `0XXXXXXXXX` is NOT a substring of `+972XXXXXXXXX` because the leading `0` is replaced by `+972` during normalization at insert time.
- Result: every operator who types Israeli local format concludes leads are missing.

**Two locations affected (verified by Overseer reading the actual files):**
1. `modules/crm/crm-leads-tab.js` line ~145-152 (the "רשומים" tab filter).
2. `modules/crm/crm-incoming-tab.js` line ~106-120 (the "לידים נכנסים" tab filter).

Verified pattern in `crm-leads-tab.js:152`:
```javascript
return name.indexOf(s) !== -1 || phone.indexOf(s) !== -1 || email.indexOf(s) !== -1;
```

Verified pattern in `crm-incoming-tab.js:120`:
```javascript
return leadName.indexOf(q) !== -1 || leadPhone.indexOf(q) !== -1 || leadEmail.indexOf(q) !== -1;
```

**Helper to reuse (Iron Rule 21 — No Orphans, No Duplicates):**
- `CrmHelpers.normalizePhone(raw)` already exists at `modules/crm/crm-helpers.js` line ~31 (exposed via `window.CrmHelpers.normalizePhone` per the export at line ~194). It mirrors the `lead-intake` EF rule: leading `0` + 10 digits → `+972<rest>`. **Use this. Do not write a new helper.**

## Task

### Stage 1 — Foreman (opticup-strategic) authors the SPEC

1. Switch to `opticup-strategic` skill.
2. Verify the folder structure: this ACTIVATION_PROMPT.md already exists at `modules/Module 4 - CRM/docs/specs/CRM_PHONE_SEARCH_NORMALIZATION/`. The Foreman will create `SPEC.md` alongside it. If a SPEC.md already exists, STOP and surface to Daniel.
3. Survey the 3 most recent `FOREMAN_REVIEW.md` files under `modules/Module 4 - CRM/docs/specs/*/` for proposals to apply to this SPEC (per opticup-strategic SPEC Authoring Protocol).
4. Author `modules/Module 4 - CRM/docs/specs/CRM_PHONE_SEARCH_NORMALIZATION/SPEC.md` with:
   - **Goal:** Make the CRM phone-search find leads when the operator types Israeli local format.
   - **Files to edit (exact):** `modules/crm/crm-leads-tab.js` + `modules/crm/crm-incoming-tab.js`. Nothing else.
   - **Edit pattern (both files, conceptually identical):** Just before the substring filter, compute `var sNorm = (window.CrmHelpers && CrmHelpers.normalizePhone) ? CrmHelpers.normalizePhone(s) : ''` (use the matching variable name `s` in `crm-leads-tab.js` and `q` in `crm-incoming-tab.js`). Then change the phone match from `phone.indexOf(s) !== -1` to `(phone.indexOf(s) !== -1 || (sNorm && phone.indexOf(sNorm) !== -1))`. Name + email matching unchanged.
   - **Iron Rules touched:** Rule 21 (reuse existing helper), Rule 7 (no direct sb.from() needed — pure client-side filter), Rule 8 (no innerHTML changes), Rule 12 (file-size — verify both files stay under 350 lines after edit).
   - **Acceptance criteria (4 manual QA steps on demo tenant):**
     1. On `/crm/` → "רשומים" tab → type `0537889878` → Daniel's lead appears in <500ms.
     2. On `/crm/` → "לידים נכנסים" tab → type `0537889878` → Daniel's incoming lead appears (if present).
     3. Regression: type `דניאל` → name search still works.
     4. Regression: type `0537` (partial, 4 digits) → partial-phone search still works (substring of normalized OR raw).
   - **Out of scope:** schema changes, EF deploys, new helpers, any other tab, any RPC. This is a 2-file surgical edit.
   - **Backout:** `git revert <commit>` — single commit, reversible.
   - **Branch:** `develop`. Single commit. Push to `origin/develop`. **Do NOT merge to main** — only Daniel does that, only via PR with branch protection (per `feedback_main_merge_via_pr.md`).
5. Hand off to executor.

### Stage 2 — Executor (opticup-executor) runs the SPEC

1. Switch to `opticup-executor` skill.
2. Run First Action protocol from CLAUDE.md §1 (machine, repo, branch, integrity gate, etc.). User is on `🖥️ Windows desktop` (`C:\Users\User\opticup`). Confirm clean repo before starting.
3. Read the SPEC from Stage 1 and execute it exactly.
4. Verify both files still pass `npm run verify:integrity` and the file-size gate.
5. Manual QA gate: print the 4 acceptance criteria from the SPEC and instruct Daniel how to test each one. Daniel can test on the local dev server (localhost:3000) or after the push on `app.opticalis.co.il/crm/`.
6. Commit message: `fix(crm): normalize phone search input to find leads in Israeli local format`. Single commit, both files in the same commit, plus the SPEC folder additions. Push to `origin/develop`.
7. Write `EXECUTION_REPORT.md` + `FINDINGS.md` in the SPEC folder per opticup-executor protocol.
8. **End-of-session integrity:** `git status` must be clean before closing. No untracked files left behind (per Pattern 20 / opticup-executor SKILL §5.7).

## Stop conditions (per Bounded Autonomy)

- File structure doesn't match what's described in Background above (line numbers off by ±5 is fine; off by ±20 means the file changed since Overseer surveyed it — STOP and report).
- `CrmHelpers.normalizePhone` no longer exists at `crm-helpers.js`. STOP and report.
- File-size gate fails. STOP and report.
- Any unexpected diff outside the 2 named files (`crm-leads-tab.js`, `crm-incoming-tab.js`) and the SPEC folder additions. STOP and report.

## After completion

Daniel will run the 4 acceptance-criteria steps. If all 4 pass, the SPEC closes and Daniel will trigger PR-merge-to-main himself.

The Foreman writes `FOREMAN_REVIEW.md` AFTER Daniel verifies — that step is post-session, not part of this run.

## References

- Overseer recommendation: REC-009 in `roles/campaign-overseer/DECISIONS_LOG.md`.
- Backlog source: `project_post_cutover_backlog.md` POST-7 (auto-memory).
- Iron Rules: `CLAUDE.md` §4–§6.
- Folder-per-SPEC protocol: `CLAUDE.md` §7 Authority Matrix.
