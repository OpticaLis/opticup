# FINDINGS — MODULE_3_CLOSEOUT
**SPEC:** `modules/Module 3 - Storefront/docs/specs/MODULE_3_CLOSEOUT/SPEC.md`
**Executor:** opticup-executor (2026-04-15)
**Count:** 5 findings

These are issues discovered during execution but NOT fixed inside this SPEC (Rule: one concern per task).

---

## F-001 — SPEC table name mismatch: storefront_blog_posts vs blog_posts

**Severity:** LOW
**Location:** SPEC.md §3 Criterion #12 + Commit Plan item #11
**Description:** The SPEC referenced table `storefront_blog_posts` in the blog images backfill criterion. The actual table in the DB is `blog_posts` (no `storefront_` prefix). The criterion was nevertheless satisfied — querying `blog_posts` found 0 null `featured_image` rows, meaning all existing blog posts already had images or didn't need them.
**Impact:** Zero — the criterion was already met. The table name error in the SPEC caused ~3 unnecessary tool calls mid-execution.
**Suggested next action:** Foreman to correct SPEC authoring process — require Strategic to verify every table name in criteria against `GLOBAL_SCHEMA.sql` before publishing. See Executor Proposal #2 in EXECUTION_REPORT.md §8.

---

## F-002 — translate-content wrapper regression was deeper than SPEC stated

**Severity:** INFO
**Location:** `supabase/functions/translate-content/translation-utils.ts`
**Description:** The SPEC described the issue as "markdown wrappers passing through." The actual root cause was more specific: the `validateAndRetryText` function checked FORBIDDEN_PATTERNS on the raw Anthropic API response before any stripping occurred. This meant a response like ```` ```\nclean text\n``` ```` would fail the fence check, trigger a retry, and the retry would also fail because the retry prompt (STRICT_SUFFIX) didn't explicitly forbid fences. Fixed by: (a) adding `stripWrappers()` as a pre-processing step before validation, and (b) extending STRICT_SUFFIX to mention backtick fences explicitly. The v2 smoke test confirmed the fix works.
**Impact:** None — fix is in place. Documented for future debugging reference.
**Suggested next action:** None. For historical record only.

---

## F-003 — storefront_pages page_type check constraint: 'catalog' not valid

**Severity:** LOW
**Location:** `storefront_pages` table, check constraint `storefront_pages_page_type_check`
**Description:** The SPEC's Commit Plan item #8 suggested `page_type='catalog'` for the `/vintage-frames/` page. The DB check constraint rejects 'catalog' — valid values are: `campaign`, `custom`, `guide`, `homepage`, `landing`, `legal`. Used `'custom'` instead. The page is semantically a catalog but the DB doesn't have that type.
**Impact:** Low — page is published and working. The `page_type` field affects rendering logic in the storefront; if the storefront has a `catalog` rendering branch, this page may not use it.
**Suggested next action:** If the storefront has a 'catalog' page type rendering branch that should apply to `/vintage-frames/`, either: (a) add 'catalog' to the check constraint via a new migration, or (b) accept 'custom' as correct. Foreman to decide.

---

## F-004 — opticup-storefront SESSION_CONTEXT.md not updated (BLOCKED: ENVIRONMENT)

**Severity:** MEDIUM
**Location:** `opticup-storefront/SESSION_CONTEXT.md` (storefront repo — not mounted in this Cowork session)
**Description:** SPEC Criterion #15 requires the storefront repo's SESSION_CONTEXT.md to reflect the Close-Out state ("Open Issues - Blocking DNS Switch" = resolved). The storefront repo is not mounted in this Cowork cloud session and cannot be accessed. The ERP-side SESSION_CONTEXT.md was updated (commit `635011d`). The storefront-side copy remains stale.
**Impact:** MEDIUM — SESSION_CONTEXT drift between ERP and storefront, which CLAUDE.md §7 flags as a bug to report. Does not block DNS switch functionally, but violates the dual-repo drift detection rule.
**Suggested next action:** In the next Cowork session that has the storefront repo mounted, or via Daniel locally: open `opticup-storefront/SESSION_CONTEXT.md`, find the "Open Issues — Blocking DNS Switch" section, mark all items resolved, update status to "🟢 Code-complete — awaiting Daniel QA + DNS switch."

---

## F-005 — Orphaned smoke test files in repo root (FUSE mount prevents deletion)

**Severity:** INFO
**Location:** `.smoke_test_claude`, `.smoke_test2` in repo root
**Description:** Two empty smoke test files were created during pre-flight in the prior session to test git write capability. They are untracked by git (not staged, not committed). The FUSE mount environment prevents `rm` from deleting them (EPERM). They have no functional impact.
**Impact:** None — untracked files, not part of any commit, not visible in git log.
**Suggested next action:** Delete manually on Daniel's local machine: `del .smoke_test_claude .smoke_test2` (Windows) or `rm .smoke_test_claude .smoke_test2` (Git Bash). Do this after pulling the develop branch.
