# SPEC — M3_QUICK_REGISTER_ROLLBACK

> **Location:** `modules/Module 3 - Storefront/docs/specs/M3_QUICK_REGISTER_ROLLBACK/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, Site Overseer hat)
> **Authored on:** 2026-05-13
> **Module:** 3 — Storefront
> **Repo:** `opticup-storefront` + `opticup` (both)

---

## 1. Goal

Revert all changes made to `src/pages/quick-register/index.astro` by the two SPECs M3_QUICK_REGISTER_MARKETING_PRETICK_REMOVAL (storefront commit `ac6eef6`, merged to main) and M3_QUICK_REGISTER_MARKETING_TEXT_EXPANSION (storefront commit `84e7e88`, on `develop` only). Restore the file to its state before either SPEC ran. Also close the open PR on `develop` without merging.

---

## 2. Background & Motivation

Daniel directive 2026-05-13: the two SPECs were authored against `/quick-register/` when Daniel meant `/supersale/`. The wrong page was modified. Roll back fully, do not touch `/quick-register/` again. The correct work for `/supersale/` is in a separate SPEC (`M3_SUPERSALE_MARKETING_CHECKBOX`).

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | `src/pages/quick-register/index.astro` line 161 unchanged | `'<label class="qr-check"><input type="checkbox" id="terms" required>' +` | `sed -n '161p' src/pages/quick-register/index.astro` |
| 2 | `src/pages/quick-register/index.astro` line 164 restored | `'<label class="qr-check"><input type="checkbox" id="marketing" checked>' +` (with `checked` BACK in) | `grep -n 'id="marketing" checked' src/pages/quick-register/index.astro` → 1 match on line 164 |
| 3 | `src/pages/quick-register/index.astro` line 165 restored | `'<span>אני מסכים/ה לקבל עדכונים שיווקיים והצעות מיוחדות</span>' +` | `grep -c 'עדכונים שיווקיים והצעות מיוחדות' src/pages/quick-register/index.astro` → 1 |
| 4 | The new label fully removed | 0 occurrences of `שלחו לי קופונים` | `grep -c 'שלחו לי קופונים' src/pages/quick-register/index.astro` → 0 |
| 5 | Storefront build PASS | exit 0 | `npm run build` |
| 6 | Storefront commit count | 2 commits on `develop` ahead of main BEFORE this SPEC; 0 commits ahead of main AFTER (storefront `develop` matches storefront `main`) | `git log origin/main..origin/develop --oneline | wc -l` → 0 |
| 7 | Open PR on `develop` is CLOSED (not merged) | PR state = closed | `gh pr view --json state` OR manual GitHub UI |
| 8 | ERP HANDOFF row REC-SITE-020 flipped from `(closed)` to `(reverted)` with closure note | Row exists, text includes "reverted 2026-05-13" + reason | `grep 'REC-SITE-020' roles/site-overseer/SITE_OVERSEER_HANDOFF.md` |
| 9 | ERP HANDOFF row REC-SITE-021 flipped from `(PARTIAL...)` to `(reverted)` for (B) | Similar | Same |
| 10 | DECISIONS_LOG has reversal entry under 2026-05-13 | New entry exists | Read file |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file
- On storefront repo: run `git revert` on commits `84e7e88` then `ac6eef6` in that order (newest first), OR alternatively `git checkout {pre-SPEC-hash} -- src/pages/quick-register/index.astro` then commit. Pick whichever produces a single net commit that restores the file to its pre-SPEC state.
- On storefront repo: `git push origin develop`
- Close the open PR (https://github.com/OpticaLis/opticup-storefront/compare/main...develop?expand=1) via `gh pr close` if authenticated; otherwise emit manual instruction for Daniel
- On ERP repo: update HANDOFF + DECISIONS_LOG
- Commit and push to ERP `develop`

### What REQUIRES stopping
- Any rebase / force-push / `git reset --hard` on shared branches
- Any merge to `main`
- Edits to ANY file other than `src/pages/quick-register/index.astro` (storefront) + 2 HANDOFF/DECISIONS_LOG files + this SPEC folder's retro files (ERP)

---

## 5. Stop-on-Deviation Triggers

- If the revert produces conflicts → STOP, do not force-resolve
- If `src/pages/quick-register/index.astro` does not match the pre-SPEC state byte-for-byte → STOP and report

---

## 6. Rollback of the Rollback

If this SPEC itself fails, restore via `git reset --hard origin/develop` (before push) or `git revert HEAD` (after push). No DB to roll back.

---

## 7. Destructive Operations

**1. `git revert` of storefront commits `84e7e88` + `ac6eef6` on `opticup-storefront/develop`.** Authorized 2026-05-13 in chat by Daniel ("להחזיר אחורה ואל תגע בעמוד הזה"). Both commits will be reverted via `git revert` (preserves history, no force-push). The resulting `develop` branch will be byte-equivalent to `main` for the file `src/pages/quick-register/index.astro`.

**2. Closing the open storefront PR without merging.** Same authorization. PR is closed via `gh pr close` (or Daniel-manual via GitHub UI if gh not authenticated). PR state changes from OPEN to CLOSED. No data lost; commits remain in git history.

No `git reset --hard` on shared branches. No force-push. No SQL. No file deletions. No main-branch edits.

---

## 8. Out of Scope

- Anything outside `src/pages/quick-register/index.astro` in the storefront repo
- `/supersale/` work — that is `M3_SUPERSALE_MARKETING_CHECKBOX`, separate SPEC
- The ERP-side site-overseer SKILL.md edit already applied today (terminology lock) — leave in place
- The original SPEC folders themselves (`M3_QUICK_REGISTER_MARKETING_PRETICK_REMOVAL/` + `M3_QUICK_REGISTER_MARKETING_TEXT_EXPANSION/`) — leave the historical files in place; they document the work-that-was-reverted

---

## 9. Expected Final State

### Storefront repo
- `src/pages/quick-register/index.astro` line 164 = `'<label class="qr-check"><input type="checkbox" id="marketing" checked>' +`
- `src/pages/quick-register/index.astro` line 165 = `'<span>אני מסכים/ה לקבל עדכונים שיווקיים והצעות מיוחדות</span>' +`
- `develop` branch matches `main` (0 commits ahead)
- Open PR closed, not merged

### ERP repo
- `roles/site-overseer/SITE_OVERSEER_HANDOFF.md` — REC-SITE-020 + REC-SITE-021 rows updated to reflect reversal
- `roles/site-overseer/DECISIONS_LOG.md` — new reversal entry under 2026-05-13
- `modules/Module 3 - Storefront/docs/specs/M3_QUICK_REGISTER_ROLLBACK/EXECUTION_REPORT.md` + `FINDINGS.md` written

---

## 10. Commit Plan

**Storefront commits (preferred form — two reverts, one push):**
- Commit 1: `git revert 84e7e88 --no-edit` → produces commit `revert(quick-register): undo text expansion (wrong page)`
- Commit 2: `git revert ac6eef6 --no-edit` → produces commit `revert(quick-register): undo pre-tick removal (wrong page)`
- Push both with `git push origin develop`

**Alternative form (if reverts conflict — single restore commit):**
- `git checkout {ac6eef6^} -- src/pages/quick-register/index.astro`
- `git add src/pages/quick-register/index.astro`
- `git commit -m "revert(quick-register): restore pre-2026-05-13 state (wrong page edited)"`
- `git push origin develop`

**PR closure:**
- `gh pr close {PR_NUMBER} --comment "Wrong page edited — see SPEC M3_QUICK_REGISTER_ROLLBACK. The correct work is in /supersale/ via a separate SPEC."`
- If gh not authenticated → emit manual instruction for Daniel

**ERP commit:**
- Files: HANDOFF + DECISIONS_LOG + this SPEC folder's `EXECUTION_REPORT.md` + `FINDINGS.md`
- Message: `docs(site-overseer): revert REC-SITE-020 + REC-SITE-021 (wrong page edited)`
- Push to `origin develop`

---

## 11. Dependencies / Preconditions

- Both repos on `develop`, clean
- Daniel-machine identified
- `gh` authentication checked at step 0 per executor SKILL §4b (gh-auth pre-flight). If unauthenticated → PR closure becomes a Daniel-manual step.

---

## 12. Lessons Already Incorporated

- L-SITE-002 (new today) — Daniel's terminology for "supersale page" always means `/supersale/`. Already locked in `SITE_OVERSEER_SKILL.md` (commit pending).
- All SPEC_TEMPLATE improvements from M3_QUICK_REGISTER_MARKETING_PRETICK_REMOVAL/FOREMAN_REVIEW: Destructive Operations declared (§7), Protocol artifacts called out (§9), gh-auth pre-flight referenced (§11).

---

*End of SPEC.*
