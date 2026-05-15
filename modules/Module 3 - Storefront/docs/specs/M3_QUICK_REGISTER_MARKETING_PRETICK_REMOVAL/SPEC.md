# SPEC — M3_QUICK_REGISTER_MARKETING_PRETICK_REMOVAL

> **Location:** `modules/Module 3 - Storefront/docs/specs/M3_QUICK_REGISTER_MARKETING_PRETICK_REMOVAL/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, Site Overseer hat)
> **Authored on:** 2026-05-13
> **Module:** 3 — Storefront
> **Phase (if applicable):** Mode-B fix, no phase change
> **Author signature:** Cowork Site Overseer session 2026-05-13
> **Repo:** `opticup-storefront` (NOT opticup ERP)
> **REC source:** REC-SITE-020 (HANDOFF v2026-05-13)

---

## 1. Goal

Remove the `checked` attribute from the marketing-consent checkbox in the SuperSale lead form at `src/pages/quick-register/index.astro` line 164 so the checkbox is no longer pre-ticked on render. This brings the form into compliance with the Israeli Privacy Protection Act 2024 amendment + Communications Act §30א, which prohibit pre-ticked consent for marketing communications.

---

## 2. Background & Motivation

The SuperSale lead form at `/quick-register/` currently renders two consent checkboxes:
1. Terms of event (`id="terms"`, not pre-ticked, `required`) — legally OK
2. Marketing consent (`id="marketing"`, **pre-ticked via `checked` attribute**) — legally **NOT OK**

Daniel verified in conversation 2026-05-13 that the second checkbox is mandatory to remove the pre-tick (legal compliance). He explicitly declined two related actions for now (text expansion + Lead-pixel wiring on submit) — those are tracked as REC-SITE-021 (DEFERRED) and out of scope for this SPEC.

Site Overseer pre-flight (Step 0) on 2026-05-13 confirmed the live file state matches the assumption:
- File: `C:\Users\User\opticup-storefront\src\pages\quick-register\index.astro`
- Line 164 (verified verbatim): `'<label class="qr-check"><input type="checkbox" id="marketing" checked>' +`

This SPEC is a minimal compliance fix — one attribute deletion in one line, in one file.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Repo & branch | On `opticup-storefront` repo, branch `develop`, clean before & after | `git remote -v` shows `opticalis/opticup-storefront`; `git status` → "nothing to commit" |
| 2 | Pre-flight: target line still has `checked` | Exactly 1 occurrence | `grep -n 'id="marketing" checked' src/pages/quick-register/index.astro` → 1 match on line 164 |
| 3 | Edit applied | `checked` attribute removed; rest of line unchanged | `grep -n 'id="marketing"' src/pages/quick-register/index.astro` → 1 match, contains `id="marketing">` (no `checked`) |
| 4 | No `checked` anywhere on the marketing input | 0 occurrences | `grep -n 'id="marketing" checked\|checked.* id="marketing"' src/pages/quick-register/index.astro` → exit 1 (no match) |
| 5 | The TERMS checkbox is unchanged | Still `id="terms" required` (no `checked`) | `grep -n 'id="terms"' src/pages/quick-register/index.astro` → 1 match, contains `required` |
| 6 | No other file modified | 1 modified file only | `git diff --name-only develop HEAD` → exactly `src/pages/quick-register/index.astro` |
| 7 | Lines changed | Exactly 1 line changed | `git diff --stat HEAD~1..HEAD src/pages/quick-register/index.astro` → "1 file changed, 1 insertion(+), 1 deletion(-)" |
| 8 | Storefront build PASS | exit 0 | `npm run build` |
| 9 | Image-proxy guard PASS (chained to build) | exit 0 | (subsumed by #8) |
| 10 | Commit count | 1 commit | `git log origin/develop..HEAD --oneline | wc -l` → 1 |
| 11 | Live verification post-deploy (Daniel-initiated PR merge → Vercel auto-deploy) | Marketing checkbox renders unchecked on fresh page load | Manual: open `https://www.prizma-optic.co.il/quick-register/` in private window, inspect the marketing checkbox — `.checked` property = `false` on first paint |

Criterion 11 happens AFTER Daniel merges the PR to `main`. The executor reports completion at criterion 10; the deploy + live verify are post-execution.

---

## Destructive Operations

None. Single-token deletion inside one HTML attribute (`checked`) in one storefront file — no file deletes, no mass renames, no SQL DDL/DML, no rebase/reset, no governance-file deletions.

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in the `opticup-storefront` repo
- Run read-only commands (`grep`, `git status`, `git log`, `git diff`)
- Edit `src/pages/quick-register/index.astro` line 164 — delete the `checked` attribute (and only that attribute)
- Run `npm run build` to verify
- Stage exactly that one file (`git add src/pages/quick-register/index.astro`)
- Commit with the message specified in §9
- Push to `develop`

### What REQUIRES stopping and reporting
- Any pre-flight grep that does NOT match the expected pre-state (Criterion 2)
- Any change to lines OTHER than line 164 in this file
- Any change to ANY other file
- Any build failure
- A `git status` that is NOT clean before starting (existing uncommitted work)
- Any merge or push to `main` — Daniel-only
- Any temptation to ALSO do action (b) text expansion or action (c) Lead-pixel wiring — these are DEFERRED, not in this SPEC

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 + storefront §8)

- If `grep` on Criterion 2 returns 0 matches → file has already been changed; STOP and report (REC-SITE-020 may already be done)
- If `grep` on Criterion 2 returns >1 match → file structure differs from pre-flight; STOP and report
- If `git diff` after edit shows more than 1 line changed → editor over-reached; revert and STOP
- If `npm run build` warns about ANY new circular import or any new image-proxy violation → STOP (not caused by this 1-line edit, but report)

---

## 6. Rollback Plan

Trivial single-line change. Rollback options:
- Before push: `git reset --hard HEAD~1` (drops the one commit)
- After push but before PR to main: `git revert HEAD && git push origin develop` (adds revert commit)
- After PR to main: re-add `checked` in a follow-up PR — but DON'T (legal compliance regression)

No DB changes. No view changes. No file deletions.

---

## 7. Out of Scope (explicit)

These DO look related but MUST NOT be touched in this SPEC:

- **Action (b) — marketing checkbox label text expansion.** Tracked as REC-SITE-021. Daniel deferred 2026-05-13.
- **Action (c) — `fbq('track','Lead')` wiring on form submit.** Same REC. Same deferral.
- **`tenants.ui_config.cookie_consent` banner config.** Out of scope; the banner stays on this page; deferring the question of suppressing it on `/quick-register/` to REC-SITE-021.
- **The 4 `pixel_events` DB rules in `storefront_config.analytics`** targeting `/successfulsupersale/`. They don't fire from `/quick-register/` (no such success URL exists) but fixing that wiring is REC-SITE-021, not this SPEC.
- **The `/quick-register/` server-side form submission logic** (lib/form-handler, Edge Function, etc.) — untouched.
- **CSS, the `qr-result.success` popup, the `qr-submit` button** — untouched.
- **Any other `index.astro` line** — untouched.
- **The terms checkbox `id="terms"`** — untouched (it is correctly not pre-ticked and is `required`, which is legal).
- **Any other `*.astro` file in `src/pages/`** — untouched.
- **Vercel env vars, build config, deploy hooks** — untouched.

---

## 8. Expected Final State

### Modified files
- `src/pages/quick-register/index.astro` — line 164 changed:
  - Before: `'<label class="qr-check"><input type="checkbox" id="marketing" checked>' +`
  - After:  `'<label class="qr-check"><input type="checkbox" id="marketing">' +`
  - Exactly 1 deletion: the ` checked` token (with its leading space) inside the `<input>` tag

### New files
None.

### Deleted files
None.

### DB state
No changes.

### Docs updated
- `roles/site-overseer/SITE_OVERSEER_HANDOFF.md` — flip REC-SITE-020 row from `HIGH (PENDING)` to `(closed)` with closure note pointing at this SPEC + commit hash
- `roles/site-overseer/DECISIONS_LOG.md` — append closure entry under existing 2026-05-13 section (or new sub-section)
- This SPEC folder gets `EXECUTION_REPORT.md` + `FINDINGS.md` (if any) from executor at close — and `FOREMAN_REVIEW.md` from this skill afterwards

NOTE: HANDOFF + DECISIONS_LOG updates live in the **opticup ERP repo** (`C:\Users\User\opticup`). The code change lives in the **opticup-storefront repo**. The executor handles both — see §9 commit plan.

---

## 9. Commit Plan

**Commit 1 (storefront repo):**
- Repo: `opticup-storefront`
- Branch: `develop`
- Files staged (explicit, no wildcards): `src/pages/quick-register/index.astro`
- Message:
  ```
  fix(quick-register): remove pre-tick from marketing consent checkbox

  Israeli Privacy Act 2024 amendment + Communications Act §30א prohibit
  pre-ticked consent for marketing communications. Checkbox now renders
  unchecked; user must actively opt in. Legal compliance only — no UX or
  data-flow changes.

  Refs: REC-SITE-020, SPEC M3_QUICK_REGISTER_MARKETING_PRETICK_REMOVAL
  ```
- Push to `origin develop`. Open PR to `main` and notify Daniel — DO NOT merge.

**Commit 2 (ERP repo `opticup`):**
- Repo: `opticup`
- Branch: `develop`
- Files staged (explicit): `roles/site-overseer/SITE_OVERSEER_HANDOFF.md` + `roles/site-overseer/DECISIONS_LOG.md` + this SPEC folder's `EXECUTION_REPORT.md` and `FINDINGS.md` (and any `BACKUPS/` if created)
- Message:
  ```
  docs(site-overseer): close REC-SITE-020 (quick-register pre-tick removal)

  Storefront commit: {STOREFRONT_COMMIT_HASH}
  PR: {URL}

  Refs: SPEC M3_QUICK_REGISTER_MARKETING_PRETICK_REMOVAL
  ```
- Push to `origin develop`.

---

## 10. Dependencies / Preconditions

- Two repos checked out + on `develop` + clean: `opticup-storefront` AND `opticup`
- `npm install` already run in `opticup-storefront` (or run it once if `node_modules` missing)
- Daniel-machine identification confirmed at session start (Windows desktop / laptop / Mac)
- No active uncommitted work in either repo (pre-flight per First Action steps 3a–4)

---

## 11. Lessons Already Incorporated

- FROM `M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT/FOREMAN_REVIEW.md` (2026-05-11) → "pre-author MCP surface scan for external-infra SPECs" → **NOT APPLICABLE** (this SPEC touches no external infra; pure source-file edit).
- FROM `M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT/FOREMAN_REVIEW.md` (2026-05-11) → "anti-pattern: `updated_at` as proof of UPDATE" → **NOT APPLICABLE** (no DB UPDATE in this SPEC).
- FROM `BLOG_PRE_MERGE_FIXES/FOREMAN_REVIEW.md` (2026-05-10) → "re-enumerate any count cited by prior audit at Step 1.5" → **APPLIED** in §2: pre-flight grep for line 164 contents executed by Site Overseer 2026-05-13 with verbatim quote.
- FROM `BLOG_PRE_MERGE_FIXES/FOREMAN_REVIEW.md` (2026-05-10) → "SPEC must name ONE canonical form when codebase has two valid forms" → **NOT APPLICABLE** (no URL/render-form ambiguity here).

**Cross-Reference Check (Rule 21 — Step 1.5 from skill):**
- New names introduced: NONE (this SPEC creates no tables, columns, views, RPCs, functions, files, T-constants, FIELD_MAP entries, or config keys).
- Therefore: 0 collisions / 0 hits / sweep is trivially clean.
- Documented per Step 1.5 #5: "Cross-Reference Check completed 2026-05-13 against GLOBAL_SCHEMA + GLOBAL_MAP + FILE_STRUCTURE: 0 new symbols introduced, sweep N/A."

---

*End of SPEC.*
