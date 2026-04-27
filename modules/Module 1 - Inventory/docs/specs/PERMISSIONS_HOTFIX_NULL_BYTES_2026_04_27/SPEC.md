# SPEC — PERMISSIONS_HOTFIX_NULL_BYTES_2026_04_27

> **Authored:** 2026-04-27 night, post-Phase-2-FOREMAN_REVIEW
> **Severity:** CRITICAL — production hotfix; matrix UI broken
> **Type:** Hotfix + Iron Rule 31 strengthening

---

## 1. Goal

Repair `modules/permissions/employee-list.js` which contains 4,788 trailing null bytes (Cowork-VM-style truncation), causing the browser parser to fail and the permission matrix to hang on "טוען..." forever. Then strengthen Iron Rule 31's integrity gate to catch this corruption class going forward, since the existing gate failed to detect it.

Live evidence (Cowork pre-flight 2026-04-27):
- File ends mid-comment: `"... — file-size com"` (no closing parenthesis, no trailing newline, then 4,788 NUL bytes).
- `hexdump -C` shows null run starting at offset `0x31cc`.
- File ID via `file(1)`: still detected as UTF-8 text — the gate only checks file-type, not content. **That's the gap.**
- Browser console (when Daniel reloads) should show a `SyntaxError` near the truncation offset.

---

## 2. Background

`PERMISSIONS_PHASE2_FIX_2026_04_27` commit 6 (`7d37e62`) extracted the matrix UI into a new `permission-matrix.js` and deleted the matrix code from `employee-list.js`. The deletion left a trailing comment block. Somewhere between that commit and the next, ~4.7KB of null bytes got appended to the end of the file. Most likely scenario: a Cowork-VM file-write that padded the buffer with zeros instead of truncating to actual content length. Iron Rule 31 was added on 2026-04-24 specifically to catch this class of corruption — it scans staged files for null bytes — but **the staged file at commit time may have been clean and the corruption happened later** (during a subsequent file-tool write that inflated the file size on disk).

The user reported the bug visually: matrix shows "טוען..." indefinitely. Daniel correctly demanded the executor verify visually next time, not just via SQL.

---

## 3. Success Criteria

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 1 | ERP repo on `develop`, clean | "nothing to commit" | `git status` |
| 2 | ERP commit count this SPEC | 3 | `git log origin/develop..HEAD --oneline \| wc -l` → 3 |
| 3 | `employee-list.js` size | matches actual content (no null padding) | `wc -c modules/permissions/employee-list.js` → expect ~12,800 bytes (down from ~17,500) |
| 4 | Zero null bytes in file | 0 | `tr -d '\0' < modules/permissions/employee-list.js \| wc -c` equals `wc -c < modules/permissions/employee-list.js` |
| 5 | File ends correctly | last line is the truncated comment, completed + closing `\n` | `tail -c 200 modules/permissions/employee-list.js` shows complete `compliance).` followed by newline |
| 6 | Iron Rule 31 gate now catches null bytes mid-content | `npm run verify:integrity` against the corrupted file would fail | demonstration: temporarily reintroduce a null byte in a test file, gate exits non-zero |
| 7 | Browser visual QA | matrix renders fully on `localhost:3000/employees.html?t=prizma` | Chrome MCP `evaluate_script`: `document.querySelectorAll('.perm-row').length > 30` AND `document.querySelector('#perm-matrix-wrap').textContent.includes('טוען') === false` |
| 8 | Manager bug fix verified live | sign in as Demo manager test user, attempt bulk inventory ops, succeed | Chrome MCP — see §12 step 4 |
| 9 | Daniel's prizma session preserved | new-tab QA flow used | Chrome MCP `new_page` for Demo, original tab untouched |
| 10 | EXECUTION_REPORT, FINDINGS exist | files present | `ls SPEC_FOLDER/` |

---

## 4. Autonomy Envelope

### CAN
- Read and edit `modules/permissions/employee-list.js` (truncation fix).
- Edit `scripts/verify.mjs` or whatever script Iron Rule 31 lives in to add the null-byte-anywhere-in-file check.
- Run `npm run verify:integrity`, `git diff`, `wc`, `hexdump`, `tr`.
- Use Chrome MCP `new_page` (NOT `navigate` of existing tab) to open Demo tenant for QA in an isolated context. Daniel's prizma tab stays untouched.
- Commit and push to `develop`.

### MUST STOP
- Any change to other files in `modules/permissions/` (the bug is isolated to one file).
- Any DB writes.
- Any modification to the storefront repo.
- Any `navigate_page` on Daniel's existing Chrome tab. Use `new_page` only.

---

## 5. Stop Triggers

- If after the truncation fix `wc -c` returns < 11,000 bytes, stop — the original content was over-deleted.
- If the integrity gate update breaks any existing verify run, stop and report.
- If §3 #7 (matrix renders) fails after the fix, stop — there's a second bug.

---

## 6. Rollback

`git reset --hard {START_COMMIT}` reverts. No DB rollback needed.

---

## 7. Out of Scope

- Re-running any Phase 2 functionality. This is a corruption-only repair.
- The CSS `.admin-mode` refactor (queued tech-debt).
- The Module 1 folder consolidation (recurrence tech-debt).
- Authoring Phase 3 of permissions work.

---

## 8. Expected Final State

### File restoration

`modules/permissions/employee-list.js`:
- Truncate the trailing 4,788 null bytes.
- Complete the dangling `"file-size com"` comment to read `"file-size compliance)."` and add a final newline.
- Final file should be ~12,800 bytes, all ASCII/UTF-8 valid.

Procedure:
```bash
# 1. Find truncation point
hexdump -C modules/permissions/employee-list.js | grep '00 00' | head -1
# Expected first hit: offset 0x31cc (12748)

# 2. Capture content up to last meaningful byte (the period after "compliance)")
# The dangling line is "(PERMISSIONS_PHASE2_FIX_2026_04_27 — file-size com"
# After repair: "(PERMISSIONS_PHASE2_FIX_2026_04_27 — file-size compliance)."

# 3. Edit via file-tool: replace the truncated line with the complete one + ensure trailing \n.
```

### Iron Rule 31 strengthening

Add to `scripts/verify-integrity.mjs` (or wherever the gate lives — confirm at execution):
- A new check: scan every staged + tracked file for ANY null byte (`\x00`) anywhere in the content. Today's gate likely only checks for null-byte runs at end-of-file. Strengthen to "any null byte → fail".
- A documentation update in CLAUDE.md §6 Rule 31 noting the strengthening.

### Visual QA (NEW REQUIREMENT for this and all future SPECs)

Use Chrome MCP `new_page` (separate browser context) to open `localhost:3000/employees.html?t=prizma` and run `evaluate_script` to confirm:
- `.perm-row` element count > 30 (canonical Group A: ~55 perms × ~5 roles, but matrix renders one row per perm, so count > 30 minimum).
- `#perm-matrix-wrap.textContent.includes('טוען')` is false.
- "סמן הכל" / "בטל הכל" buttons visible (`document.querySelectorAll('[data-row-toggle]').length > 0`).

Then `new_page` again to `localhost:3000/employees.html?t=demo` (Demo tenant), sign in as a manager test user (creating one via UI if needed), navigate to `inventory.html`, verify bulk inventory ops accessible.

Document Chrome MCP screenshots or evaluate-script outputs verbatim in EXECUTION_REPORT.

### Files

| Touched | Type |
|---|---|
| `modules/permissions/employee-list.js` | edit (truncation repair) |
| `scripts/verify-integrity.mjs` (or equivalent) | edit (strengthen null-byte check) |
| `CLAUDE.md` | small edit to Rule 31 description |
| `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md` | append entry |
| SPEC folder (4 files) | new |

---

## 9. Commit Plan

| # | Commit | Touches |
|---|--------|---------|
| 1 | `fix(perms): repair employee-list.js truncation (4788 null bytes removed)` | `employee-list.js` |
| 2 | `chore(integrity): strengthen Iron Rule 31 to catch null bytes anywhere in file` | `scripts/verify-integrity.mjs` + CLAUDE.md |
| 3 | `docs(m1): close PERMISSIONS_HOTFIX_NULL_BYTES with retrospective` | SESSION_CONTEXT + EXECUTION_REPORT + FINDINGS |

---

## 10. Dependencies

- `PERMISSIONS_PHASE2_FIX_2026_04_27` closed (it is — `f43297a`).
- `localhost:3000` reachable for visual QA (REQUIRED — no skip option this time).
- Chrome MCP available for new_page isolated-context QA.

---

## 11. Lessons Already Incorporated

- **FROM `PERMISSIONS_PHASE2_FIX/FOREMAN_REVIEW.md` Strategic Proposal A (Cross-Asset Coupling Survey)** → APPLIED: §3 explicitly checks Iron Rule 31 strengthening alongside the file repair.
- **FROM `PERMISSIONS_PHASE2_FIX/FOREMAN_REVIEW.md` Executor Proposal D (Chrome new_page isolated context)** → APPLIED: §4 mandates `new_page`, forbids `navigate` on existing tab. Daniel's session is sacred.
- **FROM all 4 prior FOREMAN_REVIEWs (visual QA gap)** → APPLIED: §3 #7 + #8 require live Chrome MCP rendered-DOM verification, not just SQL or grep. **This is the gap Daniel called out: SQL passing isn't proof the page works.**
- **FROM Daniel's direct feedback this conversation (2026-04-27 night)** → "כל פעם שאתה נותן לקלאוד קוד לשנות דברים שאפשר לבדוק ויזואלית תן לו לבדוק אותם ויזואלית!" → APPLIED as a hard rule for this SPEC and going forward.

---

## 12. QA — Mandatory visual checks

After commit 1 lands:

```javascript
// In new_page #1 (preserve Daniel's existing tab):
// Navigate: localhost:3000/employees.html?t=prizma
// Sign in as Daniel (PIN known)
// Click "מטריצת הרשאות" tab if not auto-loaded
await page.evaluate_script(`
  ({
    matrix_loading_text_present: document.body.textContent.includes('טוען'),
    perm_row_count: document.querySelectorAll('.perm-row').length,
    role_columns: document.querySelectorAll('.perm-row td input[type=checkbox]').length / Math.max(1, document.querySelectorAll('.perm-row').length),
    bulk_buttons: document.querySelectorAll('[data-row-toggle]').length,
    console_errors: (window.__capturedErrors || []).length
  })
`);
// Expected:
//   matrix_loading_text_present: false
//   perm_row_count: > 30
//   role_columns: 5 (ceo + manager + team_lead + worker + viewer)
//   bulk_buttons: > 60 (2 buttons per row)
//   console_errors: 0
```

In new_page #2:
- Navigate: `localhost:3000/?t=demo`
- Sign in as a manager-role employee (create one if needed via the QA Manager test path documented in PERMISSIONS_PHASE2_FIX SPEC).
- Navigate to `inventory.html`.
- Verify bulk-edit row visible + clickable.
- Try a price update on 2 rows — confirm success.
- Document everything in EXECUTION_REPORT §QA.

---

## 13. Notes for Executor

- **Visual QA is not optional in this SPEC.** All previous SPECs let it slide for various reasons; this one cannot. Daniel explicitly demanded it.
- The truncation pattern (file ends mid-line followed by null bytes) is suspicious for Cowork-VM file-write bugs. Document in FINDINGS what you observe — was the truncation already in the commit `7d37e62` blob, or did it appear later? `git cat-file blob 7d37e62:modules/permissions/employee-list.js | wc -c` will tell you.
- The integrity gate strengthening must include a regression test: after the fix lands, intentionally introduce a null byte in a throwaway test file, run `npm run verify:integrity`, confirm it fails, then revert the test file. Document in EXECUTION_REPORT §QA.
- Chrome MCP `new_page` requires a `tabName` or context arg — verify in the MCP tool docs at execution time.
