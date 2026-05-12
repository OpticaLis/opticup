# FINDINGS — MIGRATION_4_STOREFRONT_STUDIO

**Author:** opticup-executor (Full-Auto Pipeline)
**Date:** 2026-05-12
**Format:** one entry per finding. Each finding includes severity (INFO/LOW/MEDIUM/HIGH/CRITICAL), location, description, suggested next action.

---

## F1 — Stranded indigo rgba in `storefront-blog.html` line 101

**Severity:** LOW

**Location:** `storefront-blog.html:101`

**Description:** During pre-execution hex audit of `storefront-blog.html`, my `grep -oE '#[0-9a-fA-F]{3,8}\b'` pattern caught all literal `#hex` codes but **missed the rgba equivalent of indigo**:

```css
.edit-field input:focus, .edit-field select:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(99,102,241,.08); }
```

`rgba(99,102,241, ...)` = `#6366f1` indigo expressed as rgba. This is decorative non-semantic, semantically equivalent to the `.btn-ai` indigo gradient I just swapped. After migration, the file has Navy `.btn-ai` next to indigo input-focus halos — visual inconsistency.

**Why I did not fix this in MIGRATION_4:**
1. SPEC §3 Token Swap Plan does not list rgba-form indigo as a swap target.
2. Executor SKILL Step 3 mandates "Do NOT fix it inside this SPEC. Append to FINDINGS.md." (Rule: one concern per task.)
3. Detection mechanism is fixable — see Executor Improvement Proposal #1 (audit must also catch rgba).

**Why my pre-execution audit missed it:** the audit regex `#[0-9a-fA-F]{3,8}\b` only matches `#hex` literals, not `rgba(R,G,B,a)` decimal triples. Pattern is fixable.

**Suggested next action:** **File as a new mini-SPEC** `MIGRATION_4_STRANDED_RGBA_SWEEP`, scoped to 1 site: swap `rgba(99,102,241,.08)` → `rgba(30,58,138,.08)` on `storefront-blog.html:101`. Run as a fast follow-up before the batch merge to main, or fold it into a future broader audit. (Severity is LOW because the halo only appears on input-focus and is at 8% alpha — barely perceptible; but it is real visual drift from the post-migration palette.)

**Cross-check on other in-scope files:**
- `storefront-content.html` rgba grep: `grep -c 'rgba(99,\|rgba(201,' storefront-content.html` → check below
- `storefront-landing-content.html` rgba grep: ditto
- `storefront-studio.html` rgba grep: ditto

Verified via:
```
grep -nE "rgba\([0-9 ]+,[0-9 ]+,[0-9 ]+" storefront-blog.html storefront-content.html storefront-landing-content.html storefront-studio.html
```

Results at time of finding capture:
- `storefront-blog.html:101` — `rgba(99,102,241,.08)` indigo (UNMIGRATED)
- `storefront-blog.html:49` — `rgba(0,0,0,.06)` neutral shadow (KEEP — semantic = box-shadow neutral)
- `storefront-content.html` — only `rgba(0,0,0,*)` (neutral shadow) — clean
- `storefront-landing-content.html:34` — only `rgba(0,0,0,.06)` (neutral shadow) — clean
- `storefront-studio.html:60` — `rgba(30,58,138,.12)` Navy — POST-MIGRATION, clean.

So F1 is a single-site finding in blog only.

---

## F2 — SPEC §5 C4 off-by-one for studio Navy literal count

**Severity:** INFO

**Location:** `modules/Module 1.5 - Shared Components/docs/specs/MIGRATION_4_STOREFRONT_STUDIO/SPEC.md` §5 row C4

**Description:** SPEC §5 success-criterion C4 said `studio ≥ 6` literal `#1e3a8a` hits. Actual count after migration is **5 literal `#1e3a8a` hits + 1 `rgba(30,58,138,...)` + 1 `#e6f1fb` Navy-soft = 7 Navy-token-bearing sites total**.

The author counted all 7 swap sites without separating which produce a `#1e3a8a` literal vs which produce a rgba form vs which produce a different Navy-token color (Navy-soft).

The 7 swap sites:
1. `.lp-wizard-section input/select/textarea:focus` `border-color`: `#1e3a8a` literal ✓ (1)
2. `.lp-wizard-section input/select/textarea:focus` `box-shadow`: `rgba(30,58,138,.12)` — NOT literal
3. `.lp-wizard-drop:hover, .dragover` `border-color`: `#1e3a8a` literal ✓ (2)
4. `.lp-wizard-drop:hover, .dragover` `background`: `#e6f1fb` Navy-soft — NOT literal
5. `.lp-wizard-footer .btn-create` `background`: `#1e3a8a` literal ✓ (3)
6. `.lp-wizard-footer .btn-create` `color`: `#ffffff` — NOT a Navy literal
7. inline `onmouseover` border `'#1e3a8a'` literal ✓ (4)
8. inline `style` bg on toolbar `#1e3a8a` literal ✓ (5)
9. inline `style` color on toolbar `#fff` — NOT a Navy literal

So 5 literal `#1e3a8a` hits, not 6. C4 expectation was wrong; the work was correct.

**Why I did not stop on deviation:** the work matches SPEC §3 exhaustively. The deviation is in a SPEC's verification target, not in the work output. No stop-trigger from §7 applies. Decision logged as D1 in EXECUTION_REPORT §5.

**Suggested next action:** Foreman amends C4 in FOREMAN_REVIEW.md notes (or in a post-hoc SPEC.md update commit). No code action.

---

## F3 — Trailing-newline pre-existing warning on `storefront-content.html`

**Severity:** INFO

**Location:** `storefront-content.html` (entire file)

**Description:** During C2 commit, `verify.mjs --staged` emitted ONE warning:
```
[trailing-newline] storefront-content.html — source file does not end with newline (last byte: 0x3e) — possible mid-statement truncation (warning; legitimate in this repo for some files)
0 violations, 1 warnings across 41 files (2ms)
```

This is a **pre-existing condition**, not introduced by MIGRATION_4. I confirmed by inspecting the file: it ends with `</script></body></html>` (last byte `0x3e` = `>`). The Edit tool calls in C2 only modified 2 specific lines (41 + 79) — neither of those is the final line. The file has been missing a trailing newline since well before MIGRATION_4 started.

**Cross-check:** the same warning would have appeared on every prior commit that touched this file. It's a Rule 31 warning (exit 2), not error (exit 1) — does not block commits.

**Suggested next action:** TECH_DEBT.md entry under "EOF newline hygiene" — applies project-wide to any HTML/JS file missing trailing newline. Could be batched in a future EOL-normalization SPEC. Low-priority cosmetic.

---

## F4 — Other storefront-* hex inventory clean post-migration

**Severity:** INFO (not a finding requiring action — recorded for completeness)

**Description:** Final hex inventory across all 7 storefront-*.html files after MIGRATION_4:

```
$ grep -oE '#[0-9a-fA-F]{3,8}\b' storefront-*.html | sort -u
```

Confirms:
- Zero `#534AB7`, `#26215C`, `#EEEDFE`, `#7F77DD` (legacy purple) — vacuously, was already 0 at start
- Zero `#6366f1`, `#c9a555`, `#e8da94`, `#fefdf8` (post-migration target absences)
- 5+ literal `#1e3a8a` (Navy) in studio + 3/2/1 in blog/content/landing-content
- All semantic, neutral-gray, and out-of-scope decorative hex (Google SERP, lang-pill family) preserved

No new findings beyond F1–F3.

---

*End of FINDINGS. 3 actionable findings + 1 informational. F1 is the only one that warrants a follow-up SPEC; F2 is a documentation tweak; F3 is debt.*
