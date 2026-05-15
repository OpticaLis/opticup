# SPEC — M3_QUICK_REGISTER_MARKETING_TEXT_EXPANSION

> **Location:** `modules/Module 3 - Storefront/docs/specs/M3_QUICK_REGISTER_MARKETING_TEXT_EXPANSION/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, Site Overseer hat)
> **Authored on:** 2026-05-13
> **Module:** 3 — Storefront
> **Phase (if applicable):** Mode-B fix, no phase change
> **Author signature:** Cowork Site Overseer session 2026-05-13
> **Repo:** `opticup-storefront` (NOT opticup ERP)
> **REC source:** REC-SITE-021 sub-item (B) — text expansion only. Sub-item (C) Lead-pixel wiring remains DEFERRED.

---

## 1. Goal

Replace the marketing-consent checkbox label text in the SuperSale lead form at `src/pages/quick-register/index.astro` line 165 with a more inviting, value-forward wording that ALSO covers marketing-cookie consent (in addition to direct-marketing communications), and include an inline link to the existing privacy policy at `/privacy/`. This is action (B) of the REC-SITE-021 deferred bundle; action (C) Lead-pixel wiring on form submit remains out of scope.

---

## 2. Background & Motivation

After REC-SITE-020 shipped (storefront commit `ac6eef6`, merged to main 2026-05-13, Vercel deployed, verified live), Daniel reviewed the rendered form and asked for the marketing-consent label to be reworded to feel more inviting — and to also cover the marketing-cookie consent so the SuperSale flow becomes a single-checkbox compliance flow.

Pre-flight finding 2026-05-13: the global cookie banner is ALREADY suppressed on `/quick-register/` via `hideChrome={true}` (BaseLayout.astro line 247 guard). So extending the checkbox to cover marketing cookies closes the consent gap on this page cleanly — no banner duplication. The privacy policy exists in `storefront_pages` for all 3 langs (`/privacy/`, `status='published'`, verified live 2026-05-13).

Daniel's chosen wording (recommended by Site Overseer): **"שלחו לי קופונים והטבות מיוחדות — לפני כולם"** — value-forward, suggests exclusivity, short. Site Overseer adds the marketing-cookies clause + privacy link to keep the legal coverage that REC-SITE-021 (B) required.

The two existing checkboxes today:
- Line 161-163: TERMS — `id="terms" required` — links to `/supersale-takanon/` — unchanged in this SPEC.
- Line 164-166: MARKETING — `id="marketing"` (no `checked` — fixed by REC-SITE-020) — label = "אני מסכים/ה לקבל עדכונים שיווקיים והצעות מיוחדות" — **THIS is what this SPEC rewrites.**

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Repo & branch | `opticup-storefront`, `develop`, clean before & after | `git remote -v`, `git status` |
| 2 | Pre-flight: line 164 unchecked (REC-SITE-020 still in place) | `id="marketing">` (no `checked`) | `grep -n 'id="marketing"' src/pages/quick-register/index.astro` → 1 match, no `checked` |
| 3 | Pre-flight: line 165 current label verbatim | `'<span>אני מסכים/ה לקבל עדכונים שיווקיים והצעות מיוחדות</span>' +` | `grep -n 'עדכונים שיווקיים' src/pages/quick-register/index.astro` → 1 match on line 165 |
| 4 | After edit: line 165 contains the new label + inline privacy link | The new line contains: `שלחו לי קופונים והטבות מיוחדות — לפני כולם (כולל שימוש בקוקיז שיווקיים, <a href="/privacy/" target="_blank" rel="noopener">מדיניות פרטיות</a>)` | `grep -n 'שלחו לי קופונים' src/pages/quick-register/index.astro` → 1 match on line 165 |
| 5 | Old label fully removed | 0 occurrences of `עדכונים שיווקיים והצעות מיוחדות` in this file | `grep -c 'עדכונים שיווקיים והצעות מיוחדות' src/pages/quick-register/index.astro` → 0 |
| 6 | TERMS checkbox unchanged | Lines 161-163 byte-identical to pre-edit | `git diff HEAD~1..HEAD src/pages/quick-register/index.astro` shows only line 165 changed |
| 7 | Marketing checkbox NOT pre-ticked (REC-SITE-020 preserved) | `id="marketing">` (no `checked`) | (same as Criterion 2, re-verified post-edit) |
| 8 | Exactly 1 file modified | 1 | `git diff --name-only HEAD~1..HEAD` → exactly `src/pages/quick-register/index.astro` |
| 9 | Exactly 1 line changed | "1 file changed, 1 insertion(+), 1 deletion(-)" | `git diff --stat HEAD~1..HEAD src/pages/quick-register/index.astro` |
| 10 | Storefront build PASS | exit 0 | `npm run build` |
| 11 | Image-proxy guard PASS (chained) | exit 0 | (subsumed by #10) |
| 12 | Commit count | 1 commit | `git log origin/develop..HEAD --oneline | wc -l` → 1 |
| 13 | Live verification post-Daniel-merge | New label renders in HE; checkbox still unchecked on fresh load; clicking "מדיניות פרטיות" opens `/privacy/` in new tab | Manual: open production `/quick-register/` in private window, inspect form |
| 14 | Cookie banner still suppressed on this page | Banner not in DOM | Manual: same private-window probe — `document.getElementById('cookie-consent-banner')` returns null OR `display: none` |

Criteria 13 + 14 are post-merge. Executor reports completion at criterion 12.

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in `opticup-storefront`
- Run read-only commands (`grep`, `git`, `git diff`)
- Edit `src/pages/quick-register/index.astro` line 165 — replace the `<span>...</span>` inner text + inject the inline anchor — and only that line
- Run `npm run build`
- Stage exactly that one file (`git add src/pages/quick-register/index.astro`)
- Commit with the message in §9
- Push to `develop`
- Then perform §9 Commit 2 in the ERP repo (HANDOFF + DECISIONS_LOG + retrospective) — same end-of-SPEC pattern as M3_QUICK_REGISTER_MARKETING_PRETICK_REMOVAL

### What REQUIRES stopping and reporting
- Any pre-flight grep that does NOT match Criterion 2 or 3
- Any change to lines OTHER than 165 in this file
- Any change to ANY other file in `opticup-storefront`
- Any build failure
- A `git status` that is NOT clean before starting (existing uncommitted work — same scope-clean dispatch handling as previous SPEC)
- Any merge or push to `main` — Daniel-only
- Any temptation to also wire `fbq('track','Lead')` on form submit — that is REC-SITE-021 sub-item (C), STILL deferred

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 + storefront §8)

- If `grep` on Criterion 2 returns 0 matches → REC-SITE-020 was reverted; STOP and report (do NOT proceed — the legal baseline must be in place first)
- If `grep` on Criterion 3 returns 0 matches → label already changed by someone else; STOP and report
- If post-edit `git diff` shows more than 1 line changed → editor over-reached; revert and STOP
- If `npm run build` warns about a new circular import or a new image-proxy violation → STOP

---

## 6. Rollback Plan

Trivial single-line change. Rollback options:
- Before push: `git reset --hard HEAD~1`
- After push but before PR to main: `git revert HEAD && git push origin develop`
- After PR to main: revert via follow-up PR — but the old wording was legally weaker (no cookie clause, no privacy link), so reverting trades UX wording for a (very small) legal regression. Acceptable if needed.

No DB changes. No view changes. No file deletions.

---

## 7. Destructive Operations

None.

This SPEC performs no file deletes, mass renames, rebases, force-pushes, SQL DROP/TRUNCATE/ALTER DROP, mass DELETEs, governance-file deletions, or main-branch modifications. Executor MUST NOT perform any destructive op not listed here. If a need arises mid-run → STOP per Iron Rule 32.

---

## 8. Out of Scope (explicit)

- **REC-SITE-021 sub-item (C) — Lead-pixel wiring on form submit.** Still deferred. Do NOT touch any pixel/fbq code in this SPEC.
- **Cookie banner global behavior** — already suppressed on `/quick-register/` via `hideChrome={true}` (verified 2026-05-13). DO NOT change `hideChrome` on this page OR change BaseLayout.astro banner-render logic OR touch `CookieBanner.astro`.
- **TERMS checkbox** (line 161-163) — unchanged.
- **Form submission handler / lib / Edge Function** — unchanged.
- **Other pages** (`/supersale-takanon/`, `/privacy/`, etc.) — unchanged.
- **Hebrew translations to EN/RU of this page** — the page is HE-only per the existing layout; out of scope.
- **Updating `tenants.ui_config.cookie_consent.tracker_categories`** — already correctly maps `facebook_pixel`→`marketing`; not needed for this SPEC.

---

## 9. Expected Final State

### Modified files (storefront repo)
- `src/pages/quick-register/index.astro` — line 165 changed:
  - Before: `              '<span>אני מסכים/ה לקבל עדכונים שיווקיים והצעות מיוחדות</span>' +`
  - After:  `              '<span>שלחו לי קופונים והטבות מיוחדות — לפני כולם (כולל שימוש בקוקיז שיווקיים, <a href="/privacy/" target="_blank" rel="noopener">מדיניות פרטיות</a>)</span>' +`
  - Exactly 1 deletion + 1 insertion on line 165. Indentation preserved verbatim (14 leading spaces). Trailing ` +` (string-concat continuation) preserved verbatim.

### New files
**Deliverable artifacts:** None.
**Protocol artifacts (created at SPEC close, executor handles automatically):**
- `EXECUTION_REPORT.md` in this SPEC folder
- `FINDINGS.md` (only if findings)
- `FOREMAN_REVIEW.md` (written by Foreman after)

### Deleted files
None.

### DB state
No changes.

### Docs updated (ERP repo)
- `roles/site-overseer/SITE_OVERSEER_HANDOFF.md` — flip REC-SITE-021 row sub-item (B) from `MEDIUM (DEFERRED)` to closed-for-(B)-only; leave (C) DEFERRED with closure note pointing at this SPEC + commit hash
- `roles/site-overseer/DECISIONS_LOG.md` — append closure entry under existing 2026-05-13 section
- This SPEC folder's `EXECUTION_REPORT.md` + `FINDINGS.md`

---

## 10. Commit Plan

**Commit 1 (storefront repo `opticup-storefront`):**
- Branch: `develop`
- Files staged (explicit): `src/pages/quick-register/index.astro`
- Message:
  ```
  feat(quick-register): more inviting marketing-consent wording + cookies clause

  Replaces the marketing-consent checkbox label with a value-forward
  variant ("שלחו לי קופונים והטבות מיוחדות — לפני כולם") that also
  covers marketing-cookie consent and links to the privacy policy.
  Single-checkbox compliance flow for the SuperSale form — cookie banner
  is already suppressed on this page via hideChrome.

  Refs: REC-SITE-021 sub-item (B), SPEC M3_QUICK_REGISTER_MARKETING_TEXT_EXPANSION
  ```
- Push to `origin develop`. Open PR to `main` IF `gh` is authenticated; otherwise surface compare URL `https://github.com/OpticaLis/opticup-storefront/compare/main...develop?expand=1` per executor SKILL.md §4b (gh-auth pre-flight, applied 2026-05-13). DO NOT merge.

**Commit 2 (ERP repo `opticup`):**
- Branch: `develop`
- Files staged (explicit): `roles/site-overseer/SITE_OVERSEER_HANDOFF.md` + `roles/site-overseer/DECISIONS_LOG.md` + this SPEC folder's `EXECUTION_REPORT.md` + `FINDINGS.md`
- Message:
  ```
  docs(site-overseer): close REC-SITE-021 (B) — quick-register text expansion

  Storefront commit: {STOREFRONT_COMMIT_HASH}
  PR: {URL}

  Sub-item (C) Lead-pixel wiring remains DEFERRED per Daniel's directive.

  Refs: SPEC M3_QUICK_REGISTER_MARKETING_TEXT_EXPANSION
  ```
- Push to `origin develop`.

---

## 11. Dependencies / Preconditions

- REC-SITE-020 must be in place (line 164 has no `checked` — Criterion 2 enforces this). REC-SITE-020 is on `main` since 2026-05-13.
- Two repos checked out + on `develop` + scope-clean: `opticup-storefront` AND `opticup`
- `npm install` already run in `opticup-storefront`
- Daniel-machine identification confirmed at session start
- `/privacy/` storefront_page exists with `status='published'` for HE (verified 2026-05-13: row exists in `storefront_pages` for prizma, `lang='he'`, `slug='/privacy/'`, `title='מדיניות פרטיות'`, `status='published'`)

---

## 12. Lessons Already Incorporated

- FROM `M3_QUICK_REGISTER_MARKETING_PRETICK_REMOVAL/FOREMAN_REVIEW.md` (Author Proposal 1) → "SPEC_TEMPLATE.md missing explicit Destructive Operations section" → **APPLIED** in §7 above ("Destructive Operations: None."). This SPEC is the first to apply that template improvement before the formal template edit lands.
- FROM `M3_QUICK_REGISTER_MARKETING_PRETICK_REMOVAL/FOREMAN_REVIEW.md` (Author Proposal 2) → "distinguish deliverable new files from protocol new files in §8/§9" → **APPLIED** in §9 above ("New files" split into Deliverable + Protocol).
- FROM `M3_QUICK_REGISTER_MARKETING_PRETICK_REMOVAL/FOREMAN_REVIEW.md` (Executor Proposals 1+2) → "gh-auth pre-flight + scope-clean dispatch detection" → **REFERENCED** in §10 Commit 1 (gh-auth pre-flight) and assumed in §4 (scope-clean working tree handling). If executor SKILL has not yet been amended with these changes, they apply here by SPEC reference.
- FROM `BLOG_PRE_MERGE_FIXES/FOREMAN_REVIEW.md` (2026-05-10) → "re-enumerate any count cited by prior audit at Step 1.5" → **APPLIED** in §2 + §3 Criterion 3: pre-flight grep with verbatim quote of current line 165.

**Cross-Reference Check (Rule 21 — Step 1.5 from skill):**
- New names introduced: NONE (no new tables, columns, views, RPCs, functions, files, T-constants, FIELD_MAP entries, or config keys).
- The new anchor's `href="/privacy/"` is an existing route (storefront_pages row verified 2026-05-13).
- Sweep is trivially clean. Documented per Step 1.5 #5: "Cross-Reference Check completed 2026-05-13 against GLOBAL_SCHEMA + GLOBAL_MAP + FILE_STRUCTURE: 0 new symbols introduced, sweep N/A."

---

*End of SPEC.*
