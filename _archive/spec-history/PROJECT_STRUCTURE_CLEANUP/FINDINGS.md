# FINDINGS — PROJECT_STRUCTURE_CLEANUP_SPEC

> **SPEC location:** `__LAUNCH_PLAN_DRAFT__/architecture-briefs/PROJECT_STRUCTURE_CLEANUP_SPEC.md`
> **Logged by:** opticup-executor
> **Logged on:** 2026-05-09
> **Convention:** one section per finding, with severity, location, description, recommendation, and suggested follow-up SPEC name.

---

## F1 — Anon-key JWTs remain in git history at deprecated `outputs/` paths

- **Severity:** LOW
- **Location:** Git history, paths `outputs/PROMPT_FB_SCENARIO_FINISH.md:89` + `outputs/PROMPT_FB_SCENARIO_FIX_AUTH.md:20` (both untracked at HEAD as of Commit 2 `a94dfb9`, but tracked in earlier commits — visible via `git log --all -p --follow outputs/PROMPT_FB_SCENARIO_FINISH.md`).
- **Description:** Two Supabase anon-key JWT strings (`eyJhbGc...` for the `tsxrrxzmdxaenlvocyit` project, anon role) were embedded in two session-prompt markdown files. During Commit 4 the files were moved to `_archive/session-outputs/` and the JWTs were redacted at the new locations to `<SUPABASE_ANON_KEY_REDACTED>` (Daniel-approved, satisfies pre-commit Rule 23 hook). However, the same JWT strings remain at the old `outputs/` paths in git history from prior commits.
- **SaaS-clean note:** Anon keys are **public-by-design** — they are embedded in every client HTML page on the app domain, distributed to every browser session, and are the documented mechanism for Supabase clients to talk to the project's `anon` role. Their RLS policies guarantee tenant isolation. So while Rule 23 flags them, they do not constitute a security incident in the conventional sense — no service-role key, no bypass-RLS key, no PII, no credential to a private system.
- **Recommendation:** Defer. If future audit policy requires literal Rule-23 cleanliness, run a `git filter-repo` history rewrite SPEC to purge the strings. Until then, the redaction at `_archive/session-outputs/` is sufficient — the keys are not in the working tree and the project's RLS is the actual security boundary.
- **Suggested follow-up SPEC:** `GIT_HISTORY_PURGE_ANON_KEYS_2026_TBD` (only if Daniel decides Rule 23 cleanliness in history matters).

## F2 — `.gitignore` line 34 duplicate `.claude/` overrides intent of lines 6–9

- **Severity:** MEDIUM
- **Location:** `.gitignore` line 2 (`.claude/`), lines 6–9 (negation: `!.claude/`, `!.claude/skills/`, `!.claude/skills/opticup-*/`, `!.claude/skills/opticup-*/**`), and line 34 (`.claude/` again, under comment "Claude local settings").
- **Description:** `.gitignore` is processed top-to-bottom; later patterns override earlier ones. Line 2 ignores `.claude/`, lines 6–9 negate to allow opticup-* skills, then line 34 re-ignores `.claude/` — overriding the earlier negation. Result: new files inside `.claude/skills/opticup-*/` are silently ignored by default. During Pre-SPEC A, the new `decisions/` subfolder under `opticup-main-strategic/references/` would not commit; had to use `git add -f` for each file. The 3 already-tracked files (SKILL.md, DECISIONS_LOG.md, MODULE_BRIEF_TEMPLATE.md) survive only because they were force-added before line 34 was introduced.
- **Recommendation:** Delete line 33–34 (`# Claude local settings\n.claude/`) from `.gitignore`. Lines 2 + 6–9 already correctly express the intent. If "Claude local settings" needs a separate ignore (settings.local.json, transcripts), use a more specific pattern like `.claude/settings.local.json` or `.claude/transcripts/`.
- **Suggested follow-up SPEC:** `GITIGNORE_CLEANUP_2026-05-XX` (small, single-commit fix). Bundle with F4 below.

## F3 — `watcher-deploy/daemon/opticupsyncwatcher.wrapper.log` is tracked but should be gitignored

- **Severity:** LOW
- **Location:** `watcher-deploy/daemon/opticupsyncwatcher.wrapper.log` (tracked, frequently modified by the watcher service). `.gitignore` line 14 covers `.out.log` only — `.wrapper.log` is not listed.
- **Description:** The watcher service (Windows desktop) writes service-lifecycle events to `opticupsyncwatcher.wrapper.log` whenever it starts/stops. Because the file is tracked and appended-to constantly, every Claude Code session opens with a dirty `git status` (M on the log). This is noise that has caused multiple sessions to discuss "is this real work?" before continuing. Daniel flagged this in his Pre-SPEC plan as "leave alone for separate cleanup".
- **Recommendation:** Add `watcher-deploy/daemon/opticupsyncwatcher.wrapper.log` to `.gitignore` (alongside the existing `.out.log` entry on line 14). One `git rm --cached` + `.gitignore` line + commit. After this, the log will stop showing as M in every session.
- **Suggested follow-up SPEC:** `GITIGNORE_CLEANUP_2026-05-XX` (bundle with F2).

## F4 — `tests/optic*.accdb` Access database fixtures are untracked

- **Severity:** INFO
- **Location:** `tests/optic.accdr`, `tests/optic_dt.accdb`, `tests/optic_dt_all.accdb` — all untracked at HEAD, all three Access-database binary files (~varies in size).
- **Description:** Three Access database files appeared in `tests/` during a recent session. They are untracked, not gitignored, and their disposition is unclear. Daniel deferred decision to a "separate decision later" during the Pre-SPEC plan. Possibilities: (a) test fixtures for Access Bridge sync work, (b) staged-but-uncommitted test data, (c) accidental drops that should be deleted, (d) backup files Daniel needs but doesn't want in git.
- **Recommendation:** Daniel-decision. Three options:
  - **Track them** — `git add tests/optic*.accdb` if they are real test fixtures the Access Bridge depends on.
  - **Gitignore them** — `tests/*.accdb` + `tests/*.accdr` to `.gitignore` if they are local-only.
  - **Delete them** — `rm tests/optic*.accdb` if they were dropped by accident.
- **Suggested follow-up SPEC:** None needed — single-decision item, no SPEC required. Resolve in next Cowork session.

---

## Summary table

| ID | Severity | Topic | Suggested follow-up |
|---|---|---|---|
| F1 | LOW | Anon JWTs in git history | `GIT_HISTORY_PURGE_ANON_KEYS` (defer; SaaS-clean — anon keys are public-by-design) |
| F2 | MEDIUM | `.gitignore` line 34 duplicate `.claude/` | `GITIGNORE_CLEANUP` |
| F3 | LOW | `wrapper.log` not gitignored | `GITIGNORE_CLEANUP` (bundle with F2) |
| F4 | INFO | `tests/optic*.accdb` decision pending | Daniel-decision (no SPEC) |

*FINDINGS complete.*
