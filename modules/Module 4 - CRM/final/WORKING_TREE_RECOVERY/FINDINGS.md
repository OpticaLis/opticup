# FINDINGS — WORKING_TREE_RECOVERY

> **Location:** `modules/Module 4 - CRM/final/WORKING_TREE_RECOVERY/FINDINGS.md`
> **Written by:** opticup-executor (2026-04-24)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — SPEC premise (1,083 corrupted files) did not match live state at execution time

- **Code:** `M4-INFO-01`
- **Severity:** INFO (escalates to MEDIUM if the mechanism is not understood before SPEC 2 runs)
- **Discovered during:** Precondition verification before running any §4 Autonomy-Envelope action
- **Location:** Working tree of `C:\Users\User\opticup` at 2026-04-24 ~execution time
- **Description:** The SPEC's §2 Background claims 1,083 modified/untracked/deleted entries in `git status`, including 821 CRLF-only diffs and 40+ null-byte-truncated files. Live `git status --short | wc -l` returned `5` — matching the SPEC's §3 expected *final* state, not the starting state. `git diff --numstat` shows only 1 file with any diff (SESSION_CONTEXT.md, 13/27 lines — a real semantic edit, not CRLF noise). Spot-checked "truncated" files (`js/shared.js`, `modules/crm/crm-init.js`, three others) end in clean source-code tokens with zero null bytes, and `diff` against HEAD is empty for the code files. Watcher-deploy has all 16 HEAD-tracked files intact on disk. Conclusion: corruption either (a) never existed at this magnitude, (b) was already cleaned by a prior session between forensic snapshot and executor dispatch, or (c) was mis-characterized by the forensic subagent (CRLF on disk with `core.autocrlf=true` looks like a diff to a raw file reader but is not a git diff).
- **Reproduction:** 
  ```
  git status --short | wc -l             # → 5 (SPEC expected ~1083)
  git diff --numstat | wc -l              # → 1 (SPEC expected 821+)
  diff <(git show HEAD:modules/crm/crm-init.js) modules/crm/crm-init.js  # empty
  git config --get core.autocrlf          # → true  (this is likely why the forensic read saw CRLF everywhere)
  ```
- **Expected vs Actual:**
  - Expected (per SPEC §2): 1,083 `git status` entries, 821 CRLF, 40+ truncated, 3 legit files
  - Actual: 5 entries total (1 modified + 4 untracked), all legitimate; `core.autocrlf=true` normalizes disk-CRLF away from git diff
- **Suggested next action:** DISMISS for this SPEC (state is already correct), but **flag into SPEC 2 (INTEGRITY_GATE_SETUP)** as input: any `verify-tree-integrity.mjs` must treat `core.autocrlf` as known config and not double-count CRLF-on-disk as a diff.
- **Rationale for action:** Nothing in the working tree needs fixing today. The meta-issue (forensic reports drifting from live state) is a SPEC-authoring-protocol problem, not a code problem — addressed via Proposal 2 in EXECUTION_REPORT.md §8.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — SPEC folder convention drift: `final/` vs `docs/specs/`

- **Code:** `M4-DOC-01`
- **Severity:** MEDIUM
- **Discovered during:** Step 1 (Load and validate the SPEC) — reconciling the SPEC path against `CLAUDE.md` §7 Authority Matrix
- **Location:**
  - `CLAUDE.md` §7 (Authority Matrix row "Any new SPEC, phase plan, or task prompt") mandates `modules/Module X - [Name]/docs/specs/{SPEC_SLUG}/` since 2026-04-14
  - `.claude/skills/opticup-executor/references/EXECUTION_REPORT_TEMPLATE.md` line 3 repeats the same path
  - Actual current-SPEC path: `modules/Module 4 - CRM/final/WORKING_TREE_RECOVERY/SPEC.md` (uses `final/` not `docs/specs/`)
  - `ls modules/Module 4 - CRM/final/` (per SPEC §11 Cross-Reference Check) lists CRM_HOTFIXES, EVENT_CONFIRMATION_EMAIL, SHORT_LINKS, CRM_PRE_MERGE, CRM_EVENT_STATUS_FIX, CRM_RESUBSCRIBE_FIX — i.e., `final/` is already an established local pattern in Module 4
- **Description:** CRM Module 4 appears to be using `final/` as its SPEC folder root, while the project's Authority Matrix says `docs/specs/`. This is either an intentional module-specific override (if so, it's not documented in `CLAUDE.md`), or documentation drift that needs to be fixed. Either way, the two need to be reconciled so future executors and auditors know where to look.
- **Reproduction:**
  ```
  grep -n "docs/specs/" CLAUDE.md | head -3
  ls "modules/Module 4 - CRM/final/" | head -10
  ls "modules/Module 4 - CRM/docs/specs/" 2>&1 | head -5   # may not exist
  ```
- **Expected vs Actual:**
  - Expected: all SPECs under `docs/specs/{SPEC_SLUG}/` per Authority Matrix
  - Actual: Module 4 SPECs live under `final/{SPEC_SLUG}/`
- **Suggested next action:** NEW_SPEC (small, docs-only) — either (a) update `CLAUDE.md` §7 to list `final/` as an accepted Module 4 convention with rationale, or (b) migrate Module 4 SPECs to `docs/specs/` and update `final/` → symlink/redirect note.
- **Rationale for action:** Left unresolved, the next executor running a Module 4 SPEC will waste time reconciling the paths (I did). One-line docs-only SPEC fixes it permanently.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — `core.autocrlf=true` is set on this machine; SPEC 2 must factor it in

- **Code:** `M4-INFRA-01`
- **Severity:** MEDIUM (HIGH if SPEC 2 ships a tree-integrity gate without accounting for it)
- **Discovered during:** Verifying §3 criterion 9 ("No CRLF in tracked files — `git diff --numstat` combined with `--ignore-all-space` must produce IDENTICAL output")
- **Location:** `git config --get core.autocrlf` on this Windows desktop (`C:\Users\User\opticup`) returns `true`
- **Description:** With `core.autocrlf=true`, files are checked out to disk with CRLF line endings and normalized back to LF in the index. `tail -c` on any tracked text file shows `\r\n` (visible as `^M`), but `git diff` correctly reports the file as unchanged. SPEC 2 (`INTEGRITY_GATE_SETUP`) is tasked with creating `scripts/verify-tree-integrity.mjs` and a `.gitattributes`; both must account for this behavior or they will produce false positives on Windows clones. A Unix-style forensic check (`file -i *.js | grep crlf`) would report 821+ "CRLF files" on this same healthy tree — because that's how the files exist ON DISK under `autocrlf=true`. Only `git diff` is the authoritative check, not raw-bytes file inspection.
- **Reproduction:**
  ```
  git config --get core.autocrlf          # → true
  tail -c 5 js/shared.js | cat -v          # → .js^M  (visible CRLF on disk)
  diff <(git show HEAD:js/shared.js) js/shared.js   # empty (no git diff)
  ```
- **Expected vs Actual:**
  - Expected (SPEC 2 design principle, inferred): a tree-integrity check that catches real CRLF corruption
  - Actual (risk): naive byte-level check would flag every file on Windows as "CRLF corrupted" and create alert fatigue
- **Suggested next action:** Input to SPEC 2 (`INTEGRITY_GATE_SETUP`). The tree-integrity script must use `git diff` + `git check-attr`, NOT raw byte scans, as its CRLF check. Also: decide whether to add `.gitattributes` with explicit `* text=auto eol=lf` to remove ambiguity across machines (Windows desktop vs Windows laptop vs Mac — Daniel has all three per CLAUDE.md §9).
- **Rationale for action:** This is exactly what SPEC 2 is for. Not this SPEC's concern to fix; critical for SPEC 2 to know upfront.
- **Foreman override (filled by Foreman in review):** { }

---
