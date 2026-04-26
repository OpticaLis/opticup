# FINDINGS — INTEGRITY_GATE_SETUP

> **Location:** `modules/Module 4 - CRM/final/INTEGRITY_GATE_SETUP/FINDINGS.md`
> **Written by:** opticup-executor (Claude Code, Windows desktop, 2026-04-24)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — CLAUDE.md has 49 trailing NUL bytes baked into HEAD

- **Code:** `M4-REAL-NULLBYTE-01`
- **Severity:** HIGH
- **Discovered during:** first run of `npm run verify:integrity` on clean tree (criterion 6 precondition verification).
- **Location:** `CLAUDE.md` (root), offset 30755–30803.
- **Description:** 49 NUL bytes appended after `"Last major revision: April 2026 — ... added clean-repo check to First Action.*\r\n"`. Size on disk = size in HEAD = 30804 bytes. git stored the file as binary (NUL presence suppresses text classification), so `git diff` was empty — nobody noticed. This is exactly the Cowork-VM null-byte-padding pattern Iron Rule 31 exists to catch.
- **Reproduction (before repair):**
  ```
  node -e "const d=require('fs').readFileSync('CLAUDE.md'); console.log('nuls:', [...d].filter(b=>b===0).length);"
  ```
- **Expected vs Actual:**
  - Expected: 0 NUL bytes (plain text file).
  - Actual: 49 NUL bytes trailing the real content.
- **Suggested next action:** FIXED in this SPEC (Commit 2 `bf36f48` — content preserved, padding stripped, single LF appended). Treat this entry as historical record of the first Rule 31 catch.
- **Foreman override:** { }

---

### Finding 2 — modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md has 913 trailing NUL bytes

- **Code:** `M4-REAL-NULLBYTE-02`
- **Severity:** HIGH
- **Discovered during:** same first gate run as Finding 1.
- **Location:** `modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md`, offset 39039–39951.
- **Description:** 913 NUL bytes appended after Hebrew text `"40 שנה"`. Size on disk = size in HEAD = 39952 bytes. git saw this as binary (NULs) and showed no diff. Pattern: Cowork VM repeatedly reintroduces NULs when it writes this file — `git log -p --follow modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md` shows prior commits alternating between NUL-padded and clean states, evidence that the Cowork environment was the source over multiple sessions.
- **Reproduction (before repair):**
  ```
  node -e "const d=require('fs').readFileSync('modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md'); console.log('nuls:', [...d].filter(b=>b===0).length);"
  ```
- **Expected vs Actual:**
  - Expected: 0 NUL bytes.
  - Actual: 913 NUL bytes.
- **Suggested next action:** FIXED in this SPEC (Commit 2 `bf36f48` — same repair pattern as Finding 1). Additionally, escalate to Cowork workflow owners: the auto-memory entry `feedback_cowork_truncation.md` should be updated with this concrete incident, and the Cowork plugin write path should be audited for the encoding bug that produces NUL padding.
- **Foreman override:** { }

---

### Finding 3 — SPEC §14 heuristics (tail-regex + bracket-balance) produce false positives on this codebase

- **Code:** `M4-GATE-TUNING-01`
- **Severity:** MEDIUM
- **Discovered during:** first `--all` scan of the full tree (1080 text files).
- **Location:** `scripts/verify-tree-integrity.mjs` (design decision).
- **Description:** SPEC §14 mandates two truncation heuristics:
  - (b1) Tail-regex on last 30 bytes matching `[A-Za-z_$][...]\s*\(?\s*['"]?$` (dangling identifier).
  - (b2) Bracket-balance check — curly/square/paren counts must net to zero.

  Both fired on clearly-valid files. The tail-regex flagged 11 files ending with trailing comments like `js/shared.js` → `"…al → js/pin-modal.js"` (a `// comment` at EOF referencing a filename — legitimate). The bracket-balance heuristic flagged 16 files where the tokenizer failed to skip regex literals, template strings, or JSX expressions correctly, producing "curly=2, paren=1" style misreads on completely clean source.
- **Reproduction:**
  ```
  node scripts/verify-tree-integrity.mjs --all --verbose
  ```
  (against a pristine git-clean tree → 27+ false positives before tuning).
- **Expected vs Actual:**
  - Expected: 0 findings on clean tree.
  - Actual: 27+ false positives + 2 true positives (the null-byte entries).
- **Suggested next action:** TUNED in this SPEC. The gate as shipped uses only null-bytes (ERROR) + trailing-newline (WARNING). Tail-regex and bracket-balance were dropped per Foreman directive 2026-04-24. If a future SPEC wants to reintroduce either, it should ship its own opt-in flag (`--check-tail-regex`, `--check-brackets`) with an allowlist of file patterns — not a global sweep.
- **Foreman override:** { }

---

### Finding 4 — Repo has ~20 legitimate source files that don't end with a trailing newline

- **Code:** `M4-STYLE-01`
- **Severity:** LOW
- **Discovered during:** `npm run verify:integrity --all` after null-byte repair.
- **Location:** `modules/inventory/*.js` (7 files), `storefront-*.html` (3 root files), `campaigns/supersale/messages/email-*.html` (7 files), `campaigns/supersale/mockups/*.html` (2 files), `modules/Module 4 - CRM/go-live/seed-templates-demo.sql` (1 file).
- **Description:** Every modern POSIX-compliant text file should end with a newline, but this repo has ~20 source files that don't. HEAD and disk match — this is legacy style inconsistency, not corruption. Reported as WARNING (not ERROR) by the gate because blocking commits on these would fail pre-existing files on every run until they were all touched.
- **Reproduction:**
  ```
  npm run verify:integrity -- --all 2>&1 | grep trailing-newline
  ```
- **Expected vs Actual:**
  - Expected: all source files end with `\n`.
  - Actual: ~20 don't.
- **Suggested next action:** NEW_SPEC (small chore, post-merge). A `chore(style): normalize trailing newlines across inventory/storefront/campaign files` one-shot SPEC can add the newlines and then the integrity gate can be tightened to ERROR for trailing-newline in a follow-up.
- **Foreman override:** { }

---

### Finding 5 — Sentinel 9-mission audit did NOT catch the 2 HEAD-baked NUL files

- **Code:** `M4-SENTINEL-GAP-01`
- **Severity:** MEDIUM
- **Discovered during:** same first gate run that caught Findings 1+2.
- **Location:** `.claude/skills/opticup-sentinel/SKILL.md` mission definitions; specifically Mission 2 (Security Audit) and Mission 5 (Technical Debt).
- **Description:** The Sentinel runs 9 read-only missions on a schedule. None of them sweep HEAD or the working tree for NUL bytes. A generic "binary bytes in text files" check would have caught both Findings 1+2 months earlier. The Cowork-VM corruption pattern is a known risk (documented in auto-memory), but no automated mission scans for it.
- **Reproduction:**
  ```
  grep -r "NUL\|null.*byte\|0x00" .claude/skills/opticup-sentinel/SKILL.md
  # → no matches
  ```
- **Expected vs Actual:**
  - Expected: at least one Sentinel mission scans HEAD for NUL bytes in tracked text files.
  - Actual: no mission does.
- **Suggested next action:** NEW_SPEC (small, post-merge). Add a "HEAD integrity sweep" to Mission 2 or create a new Mission 10 that runs `node scripts/verify-tree-integrity.mjs --all --quiet; echo $?` and alerts on exit 1. This closes the detection gap that allowed Findings 1+2 to survive.
- **Foreman override:** { }

---

### Finding 6 — Husky hook gate ordering: integrity-first is correct, document it

- **Code:** `M4-HUSKY-01`
- **Severity:** INFO
- **Discovered during:** wiring the gate into `.husky/pre-commit` (Commit 5).
- **Location:** `.husky/pre-commit`.
- **Description:** The new pre-commit hook runs `verify-tree-integrity.mjs --fast` before `verify.mjs --staged`. This ordering is intentional: null-byte corruption in *any* tracked file is a catastrophic state that should abort the commit even if the staged files themselves pass. But this ordering is not explicitly justified in the hook. Future-readers may reorder without understanding the semantics.
- **Reproduction:** N/A — documentation / comment addition only.
- **Expected vs Actual:**
  - Expected: inline comment in `.husky/pre-commit` explaining *why* integrity-first (vs staged-only-first).
  - Actual: the comment block explains exit-code mechanics but not gate ordering.
- **Suggested next action:** TECH_DEBT (tiny). One-line comment added next time anyone touches the hook.
- **Foreman override:** { }
