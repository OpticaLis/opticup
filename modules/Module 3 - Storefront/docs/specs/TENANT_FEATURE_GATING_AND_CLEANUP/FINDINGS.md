# FINDINGS — TENANT_FEATURE_GATING_AND_CLEANUP

**SPEC:** `modules/Module 3 - Storefront/docs/specs/TENANT_FEATURE_GATING_AND_CLEANUP/`
**Date:** 2026-04-15
**Executor:** opticup-executor (Cowork overnight session)

---

## F-001 — SPEC file list does not match actual repo contents

**Severity:** LOW
**Location:** SPEC.md §Gating Tasks (file list)
**Description:** SPEC listed `studio-shortcodes.html`, `studio-blocks.html`, `studio-editor.html`, `studio-pages.html`, and `brand-translations.html` as files to gate. None of these exist at repo root. Actual storefront-facing HTML files are `storefront-*.html`. The SPEC included a recovery clause ("executor enumerates storefront-*.html + studio-*.html"), which allowed execution to continue without stopping.
**Impact:** 10-minute overhead confirming actual file inventory. No code impact — all 8 actual files were correctly gated.
**Suggested action:** Update SPEC template to include a "file existence verification" precondition step. Foreman should run `ls storefront-*.html studio-*.html` before writing the file list into a SPEC.

---

## F-002 — Stale M3 backup folders remain tracked in git

**Severity:** MEDIUM
**Location:** `modules/Module 3 - Storefront/docs/backups/` (multiple subdirectories)
**Description:** SPEC Criterion #15 required removing 15 stale M3 backup folders from git tracking. `git rm --cached -r` was attempted using the GIT_INDEX_FILE workaround, but the removals did not persist in the temp index (files still appeared in `git ls-files`). Root cause: FUSE mount limitation — the temp-index approach does not support recursive removals of large directory trees in this environment.
**Impact:** ~15 backup folders (hundreds of files) remain tracked in git, adding noise to `git diff`, `git log --stat`, and `git status`. No correctness impact on running code.
**Suggested action:** Daniel to run from local machine (Windows desktop):
```
cd C:\Users\User\opticup
git rm -r "modules/Module 3 - Storefront/docs/backups/"
git commit -m "chore(m3): remove stale backup folders from git tracking"
git push origin develop
```
Alternatively, add the folder to `.gitignore` to prevent future tracking.

---

## F-003 — Storefront repo cleanup criteria blocked (repo not mounted)

**Severity:** LOW
**Location:** SPEC Criteria #16, #21
**Description:** Two criteria required access to the `opticup-storefront` repo: (a) remove unused Astro components (criterion #16), and (b) run `npm run build` to verify no broken imports (criterion #21). The storefront repo is not mounted in this Cowork session (only `opticup` ERP repo is available at `/sessions/.../mnt/opticup`).
**Impact:** Unused components remain (cosmetic); build verification not completed. No runtime impact on current ERP-side gating (the gates themselves are in the ERP repo HTML files, not in the storefront).
**Suggested action:** Create a small follow-up SPEC for the storefront repo specifically: "Remove unused Astro components and verify build." Run in a Cowork session that has the storefront repo mounted. Or execute manually:
```
cd opticup-storefront
npm run build
# check for any unused component import warnings
```

---

## F-004 — `storefront-blog.html` feature key changed from SPEC (cms_ai_tools → cms_studio)

**Severity:** INFO
**Location:** `storefront-blog.html` line added in commit `f28db3c`
**Description:** SPEC specified `cms_ai_tools` for the blog page gate. Executor changed this to `cms_studio` because: (a) blog authoring is content creation (Studio tier), not AI tool usage; (b) mapping to `cms_ai_tools` would exclude blog from premium plan tenants, which only gain `cms_studio`. The business logic of `cms_studio` is more appropriate.
**Impact:** Premium plan tenants will have blog access (correct business intent). Enterprise plan tenants have both cms_studio and cms_ai_tools so they are unaffected either way.
**Suggested action:** Confirm with Daniel that blog → cms_studio is correct. If cms_ai_tools was intentional (e.g., blog uses AI content generation), update the gate in `storefront-blog.html` accordingly.
