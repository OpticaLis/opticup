# FINDINGS — STOREFRONT_REPO_STATE_SNAPSHOT

> **Executor:** opticup-executor
> **Run date:** 2026-04-18
> **Scope rule:** One concern per task. Findings below are NOT fixed in this SPEC — they are logged for the Foreman to triage.

---

## Finding 1 — State drift between Cowork dispatch and execution start

- **Severity:** INFO
- **Location:** Handoff between Cowork session `awesome-cool-faraday` and this executor run.
- **Description:** The dispatch prompt described the storefront repo as having ~250+ modified files, staged deletions of `vercel.json` / `tsconfig.json` / `global.css` / multiple RU pages, and mirroring untracked files. At execution start (≤30 min later), the repo had 0 staged changes, 1 modified file (`SESSION_CONTEXT.md`), and 0 untracked files. Something cleaned the working tree between observation and execution — likely a `git add` + `git restore` cycle, or a normalising `git checkout`, or `core.autocrlf=true` settling after an index touch.
- **Suggested next action:** No fix needed; SPEC methodology handled it gracefully. **Recommend** updating `opticup-executor` to add a state-drift-check step for diagnostic SPECs (see EXECUTION_REPORT.md §8 Proposal 1).

---

## Finding 2 — Uncommitted documentation on storefront `develop`

- **Severity:** LOW
- **Location:** `C:\Users\User\opticup-storefront\SESSION_CONTEXT.md` (unstaged, branch `develop`).
- **Description:** One real content change exists on storefront develop: `SESSION_CONTEXT.md` adds a "POST_DNS_PERF_AND_SEO — Regression & Revert" section and updates the header banner with post-regression warnings. This is substantive documentation that should not be lost. The current SPEC is read-only and cannot commit it.
- **Suggested next action:** The cleanup SPEC (to be authored) must commit this file on storefront develop BEFORE any `git reset` or `--force` push. One-line plan: `cd opticup-storefront && git add SESSION_CONTEXT.md && git commit -m "docs: log post-DNS perf regression + revert context" && git push origin develop`.

---

## Finding 3 — `core.autocrlf=true` on Windows vs `.gitattributes eol=lf` causing phantom-dirty states

- **Severity:** MEDIUM
- **Location:** `C:\Users\User\opticup-storefront\.git\config` (`core.autocrlf=true`) vs `.gitattributes` (`* text=auto eol=lf`).
- **Description:** The combination of Windows autocrlf=true (which converts LF→CRLF on checkout, CRLF→LF on add) with `.gitattributes` forcing `eol=lf` creates a race where git repeatedly flags files as modified when Windows tools (IDE, editors, watchers) touch them without going through git. This is the most likely root cause of the Cowork session's "~250 modified files" observation, which then vanished when the index re-normalised. This will keep recurring on this machine until resolved.
- **Suggested next action:** Two options for the Foreman to choose from in a follow-up SPEC:
  - **A (recommended):** Set `git config core.autocrlf input` on the Windows machine. With `.gitattributes` already enforcing `eol=lf`, autocrlf=input means "convert CRLF→LF on add, never convert LF→CRLF on checkout". Cleaner mental model.
  - **B:** Leave autocrlf=true but add a `git add --renormalize .` cleanup pass to the cleanup SPEC. One-shot fix, but the phantom-dirty state will return the next time an editor rewrites a file with CRLFs.
- **Do NOT touch in this SPEC** — out of scope per the read-only contract.

---

*End of FINDINGS. Total: 3 findings (1 INFO, 1 LOW, 1 MEDIUM). No HIGH/CRITICAL.*
