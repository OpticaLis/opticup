# SPEC — INTEGRITY_GATE_SETUP

> **Location:** `modules/Module 4 - CRM/final/INTEGRITY_GATE_SETUP/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-24
> **AMENDED on:** 2026-04-24 post-FOREMAN_REVIEW of WORKING_TREE_RECOVERY
> **Module:** 4 — CRM (filed under Module 4 since this guardrail work is the pre-merge hardening for CRM)
> **Phase:** N/A — prevention follow-up to WORKING_TREE_RECOVERY
> **Author signature:** Cowork strategic session 2026-04-24

---

## 0. Amendment Log (what changed after SPEC 1 executed as no-op)

SPEC 1 (WORKING_TREE_RECOVERY) was executed and closed as a no-op by the executor — the working tree on Daniel's Windows desktop was already clean at execution time. Three findings emerged from that execution, all of which have now been absorbed into this SPEC:

1. **M4-INFO-01** — CRLF is NOT the corruption mode we're defending against. `core.autocrlf=true` on Daniel's Windows desktop silently normalizes CRLF in `git diff`. The Cowork VM reported "821 files with CRLF changes" because Cowork VM does NOT have autocrlf — but git on Daniel's machine never saw these as diffs. The actual Cowork-VM corruption pattern is **null-byte padding + mid-word truncation** in text files; CRLF was a false signal. This SPEC is rewritten around the real risk.

2. **M4-DOC-01** — Authority Matrix says SPECs live at `modules/Module X - [Name]/docs/specs/`, but Module 4 uses `final/`. **DEFERRED TO POST-MERGE.** Not worth churn mid-stabilization. Will be addressed in a future small doc-SPEC after CRM reaches `main`.

3. **M4-INFRA-01** — Any integrity check MUST use `git diff HEAD` / `git status --porcelain`, NOT raw byte scanning (`file`, `od`, `xxd` over the filesystem). Raw byte scans on Windows with `autocrlf=true` produce false positives on every text file. This SPEC's §14 has been rewritten to reflect this.

The core goal is unchanged: **make it impossible for a Cowork-VM-style corruption to ever reach `git add` silently.** The mechanism is now better targeted.

---

## 1. Goal

Make it architecturally impossible for a Cowork-VM-style working-tree corruption (null-byte padding + mid-word truncation in text files) to ever reach `git add` silently again. This is done by (a) adding a new Iron Rule 31, (b) creating a whole-tree integrity gate script that uses `git diff` as its source of truth, (c) wiring the gate into session start and pre-commit, and (d) updating the opticup-executor and opticup-strategic skills to mandate the gate.

`.gitattributes` is NOT part of this SPEC — see §0 item 1 above for why. Line-ending behavior is managed by each machine's own git config (`core.autocrlf`), which already works correctly on Daniel's Windows desktop.

---

## 2. Background & Motivation

On 2026-04-24 a Cowork VM strategic session opened the repo and found `git status` showing 1,083 entries. Forensic analysis (a read-only subagent) concluded the corruption was extensive: 821 CRLF conversions + 40+ null-byte-padded/truncated files. The planned recovery SPEC (WORKING_TREE_RECOVERY) was authored to address this.

When the executor (Claude Code on Windows desktop) actually ran the SPEC, **the corruption was not visible on Daniel's machine**. `git status --short | wc -l` returned 5 (matching the SPEC's expected *final* state). The executor correctly halted at step 0, verified the 16 success criteria against live state (all passing), and wrote a retrospective. Root-cause analysis (EXECUTION_REPORT §3) identified `core.autocrlf=true` as the reason the CRLF half of the forensic report was invisible to git on Daniel's machine — those "821 CRLF files" existed ON DISK under autocrlf's normalization but were never a git diff.

**However**, the null-byte + truncation half of the corruption pattern IS real and DID happen in this project's history. Auto-memory `feedback_cowork_truncation.md` documents prior incidents where Cowork VM wrote null-byte padding into `crm.html` and other files, and those DID reach production before being caught manually. The defense we're building is specifically against THAT pattern.

Existing protections DID exist but DID NOT catch the null-byte incidents:

- `scripts/checks/null-bytes.mjs` runs on `--staged` files only. Files corrupted at rest between sessions never get staged naturally.
- `.husky/pre-commit` runs `verify.mjs --staged` — same limitation.
- No **session-start** integrity check.
- No **whole-tree** null-byte sweep.

**Root cause of the gap:** all current guardrails assume corruption happens at commit time. Cowork VM corruption happens at **rest** (between sessions). The fix is a whole-tree gate that runs at session start AND before every commit, using `git diff HEAD` / `git status --porcelain` as the file-list source (so autocrlf-normalized files are automatically excluded).

Daniel's directive: *"update the project rules and skills so this never happens again, in our lives."*

---

## 3. Success Criteria (Measurable)

**Pre-conditions:** SPEC 1 (WORKING_TREE_RECOVERY) is CLOSED with clean working tree containing exactly 5 entries (1 modified SESSION_CONTEXT + 4 untracked — MISSION_8, CRM_PRE_MERGE/, WORKING_TREE_RECOVERY/, INTEGRITY_GATE_SETUP/). Verified at SPEC amendment time: ✓.

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop` | `git branch --show-current` → `develop` |
| 2 | Iron Rule 31 added to CLAUDE.md §6 | Rule 31 text present | `grep -c "^31\. \*\*Integrity gate" CLAUDE.md` → 1 |
| 3 | `scripts/verify-tree-integrity.mjs` exists and runs | Script present, `--help` works | `test -f scripts/verify-tree-integrity.mjs && node scripts/verify-tree-integrity.mjs --help` → exit 0 |
| 4 | Integrity script has 2 checks | truncation + null-bytes (CRLF removed — autocrlf handles line endings per §0) | `node scripts/verify-tree-integrity.mjs --help` output contains `--check-truncation` and `--check-null-bytes`. Does NOT contain `--check-crlf`. |
| 5 | Integrity script uses git-diff-based file list | Source: `git status --porcelain` + `git ls-files`, NOT raw `find` | `grep -c "git status\\|git ls-files" scripts/verify-tree-integrity.mjs` → ≥2 AND `grep -c "find " scripts/verify-tree-integrity.mjs` → 0 (finds exclude `find` as file-discovery) |
| 6 | Integrity script passes on current clean tree | exit 0 on 5-entry tree | `node scripts/verify-tree-integrity.mjs` → exit 0 |
| 7 | Integrity script file size | ≤250 lines (Rule 12) | `wc -l scripts/verify-tree-integrity.mjs` → ≤250 |
| 8 | `package.json` has integrity script | `verify:integrity` present | `grep -c "verify:integrity" package.json` → ≥1 |
| 9 | Pre-commit hook invokes integrity gate | `.husky/pre-commit` runs it | `grep -c "verify-tree-integrity" .husky/pre-commit` → 1 |
| 10 | opticup-executor SKILL.md has integrity gate step | New section present | `grep -c "Integrity Gate" .claude/skills/opticup-executor/SKILL.md` → ≥1 |
| 11 | opticup-strategic First Action updated | New step added | `grep -c "verify-tree-integrity" .claude/skills/opticup-strategic/SKILL.md` → ≥1 |
| 12 | SPEC_TEMPLATE.md has integrity gate checklist | New section present | `grep -c "Integrity Gate" .claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` → ≥1 |
| 13 | CLAUDE.md §1 First Action includes integrity check | New step for session-start gate | `grep -c "verify-tree-integrity\\|verify:integrity" CLAUDE.md` → ≥1 |
| 14 | Integrity script correctly FAILS on injected corruption | Controlled test passes | Test procedure in §13 |
| 15 | No new content bugs introduced | All other checks still pass | `node scripts/verify.mjs --full` → exit 0 (or same exit code as before SPEC) |
| 16 | The 3 pre-existing holdover files (from SPEC 1) committed | Part of Integration Ceremony commit | `git log origin/develop..HEAD --oneline \| grep -c "docs(crm)"` → ≥1 |
| 17 | Number of commits produced | 3–5 | `git log origin/develop..HEAD --oneline \| wc -l` → 3–5 |
| 18 | Repo clean at end | nothing to commit | `git status --short \| wc -l` → `0` |
| 19 | Pushed to origin | remote in sync | `git rev-parse HEAD` == `git rev-parse origin/develop` |
| 20 | CRM ROADMAP updated | Entry for integrity gate SPECs | `grep -c "INTEGRITY_GATE_SETUP\\|WORKING_TREE_RECOVERY" "modules/Module 4 - CRM/go-live/ROADMAP.md"` → ≥1 |
| 21 | CRM OPEN_ISSUES updated | New resolved entry for Cowork corruption event | `grep -c "Cowork" "modules/Module 4 - CRM/final/OPEN_ISSUES.md"` → ≥1 |
| 22 | Both SPEC folders have retrospective files | SPEC 1 already has these; SPEC 2 adds its own | `test -f "modules/Module 4 - CRM/final/WORKING_TREE_RECOVERY/EXECUTION_REPORT.md" && test -f "modules/Module 4 - CRM/final/WORKING_TREE_RECOVERY/FOREMAN_REVIEW.md" && test -f "modules/Module 4 - CRM/final/INTEGRITY_GATE_SETUP/EXECUTION_REPORT.md"` → exit 0 |

**Explicitly NOT in this SPEC (removed per FOREMAN_REVIEW of SPEC 1):**
- No `.gitattributes` file creation
- No git config changes (`core.autocrlf`, `core.eol`)
- No CRLF normalization commit
- No CRLF detection in the integrity script (autocrlf handles this per §0)
- No folder-convention resolution (`final/` vs `docs/specs/` deferred to post-merge)

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Create `.gitattributes` at repo root (new file)
- Create `scripts/verify-tree-integrity.mjs` (new file)
- Modify `CLAUDE.md` (add Rule 31, update First Action)
- Modify `.husky/pre-commit` (add integrity gate call)
- Modify `package.json` (add `verify:integrity` script)
- Modify `.claude/skills/opticup-executor/SKILL.md`
- Modify `.claude/skills/opticup-strategic/SKILL.md`
- Modify `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md`
- Modify `modules/Module 4 - CRM/go-live/ROADMAP.md` (add entry for the two SPECs)
- Modify `modules/Module 4 - CRM/final/OPEN_ISSUES.md` (add closed entry #8 for the Cowork corruption event)
- Commit the 3 pre-existing legitimate files (SPEC 1 holdover) as part of Integration Ceremony
- Commit the new infrastructure (gate + docs) in a logical commit group
- Push to origin/develop
- Run the integrity gate on the live tree as part of verification
- Run a controlled corruption test (§13) — inject a null byte into a scratch file, confirm the gate fails, then clean up

### What REQUIRES stopping and reporting
- Any test failure in §14 (gate must correctly detect injected corruption)
- `node scripts/verify.mjs --full` failing → STOP, don't commit
- File line count exceeding 300 soft / 350 hard for the new integrity script → STOP, propose split
- Any of the 3 pre-existing legitimate files failing integrity check (they passed SPEC 1 verification; if they fail here something is genuinely wrong) → STOP, investigate before touching
- Pre-commit hook blocking a commit unexpectedly → STOP, don't bypass with `--no-verify`
- Integrity script produces false positives on the current clean tree → STOP, fix the script logic (likely a non-git-diff-based file listing is being used)

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- **Pre-commit hook test failure.** After wiring the gate into `.husky/pre-commit`, the executor MUST attempt a test commit (of the 3 holdover files) and verify it passes. If the hook blocks the commit unexpectedly → STOP, investigate, don't `--no-verify`.
- **Integrity script taking >10 seconds on full tree.** If the script is slow, it won't be used. STOP and optimize before proceeding.
- **Integrity script flags autocrlf-normalized files as "corrupted".** This is the classic false-positive mode. If `node scripts/verify-tree-integrity.mjs` on a clean tree returns any finding, STOP and review §14 design — likely the script is reading raw filesystem bytes instead of using `git status --porcelain` / `git diff`.

---

## 6. Rollback Plan

This SPEC produces 3–5 commits. Rollback is per-commit, in reverse order:

- If docs/skill commits break anything: `git revert <sha>` for each.
- If `verify-tree-integrity.mjs` has a bug blocking commits: first-line fix, then revert the `.husky/pre-commit` change if needed; the script itself can live without being wired into the hook.

All changes are backward-compatible: pre-commit hook already exists (husky); adding a gate call does NOT remove existing checks.

**Start commit marker (for `git reset --hard` if catastrophic):** `6cd332f` (the HEAD at SPEC 1 and SPEC 2 start — both SPECs start from the same commit because SPEC 1 made zero commits). Executor will record this in EXECUTION_REPORT §1.

---

## 7. Out of Scope (explicit)

- **No refactor of existing `verify.mjs` or `scripts/checks/*.mjs`.** The new `verify-tree-integrity.mjs` is a separate, additive script. Existing staged-only checks continue unchanged.
- **No changes to other Iron Rules** (1–23). Only adding Rule 31.
- **No `.gitattributes` creation.** Deferred per FOREMAN_REVIEW (autocrlf already handles it on Daniel's machine; cross-platform consistency can come in a future post-merge SPEC).
- **No git config changes.** Same reason as above.
- **No CRLF-related checks in the integrity script.** autocrlf handles this.
- **No CI / GitHub Actions changes.** `verify.yml` stays as-is.
- **No changes to the existing `null-bytes.mjs` check** (keep it for staged-only defense-in-depth).
- **No folder-convention resolution** (`final/` vs `docs/specs/` — deferred to post-merge small doc-SPEC).
- **No hooks beyond pre-commit** (no pre-push, no post-merge) — can be added in a follow-up SPEC once the gate is proven.
- **No deletion of `watcher-deploy/`** — it's HEAD-tracked and must be preserved (verified in SPEC 1).

---

## 8. Expected Final State

### New files

- `scripts/verify-tree-integrity.mjs` — ~200 lines (projected; ≤250 hard cap per Rule 12). Two checks over git-tracked files only: truncation + null bytes. Uses `git status --porcelain` + `git ls-files` for file list (NOT raw filesystem scan). CLI flags: `--help`, `--check-truncation`, `--check-null-bytes`, `--all` (default).
- `modules/Module 4 - CRM/final/INTEGRITY_GATE_SETUP/EXECUTION_REPORT.md` — written by executor at close.
- `modules/Module 4 - CRM/final/INTEGRITY_GATE_SETUP/FINDINGS.md` — if any emerge.

### REMOVED from scope (was in original SPEC, removed after FOREMAN_REVIEW)

The original SPEC 2 included a CRLF normalization commit of 15 files that appeared to have CRLF in HEAD. Per §0 Amendment Log and the FOREMAN_REVIEW of SPEC 1, this is no longer in scope:
1. **`.gitattributes` file** — not created. Deferred to post-merge.
2. **git config changes** (`core.autocrlf=false`, `core.eol=lf`) — not applied. Each machine keeps its current config.
3. **CRLF normalization commit** — skipped. autocrlf on Windows + LF in git storage means files check out correctly on each machine. The "15 files with CRLF in HEAD" claim from the Cowork-VM-side authoring was a mis-read of the Cowork VM's raw file state, not a real state of git's index.

The 15 files that appeared problematic from the Cowork VM perspective:
1. `.gitignore`, `CLAUDE.md`, `crm.html`, `storefront-landing-content.html`
2. 3 files under `modules/Module 3 - Storefront/`
3. 3 files under `modules/crm/`
4. 4 files under `modules/storefront/` + `modules/goods-receipts/`
5. `shared/js/plan-helpers.js`

These are **NOT modified** by this SPEC. Left as-is. If in the future a cross-platform CRLF policy is desired, it belongs in a separate small SPEC with its own `.gitattributes` design.

### Modified files

- `CLAUDE.md` — add Rule 31 in §6 (Hygiene Rules, before "Cross-repo: Iron Rules 24–30"); add "integrity check" step to §1 First Action Protocol (new sub-step between existing steps 4 and 5).
- `.husky/pre-commit` — add invocation of `node scripts/verify-tree-integrity.mjs` BEFORE the existing `verify.mjs --staged` call. Maintain existing `set +e` / exit-code logic.
- `package.json` — add `"verify:integrity": "node scripts/verify-tree-integrity.mjs"` to scripts block.
- `.claude/skills/opticup-executor/SKILL.md` — add "Pre-Commit Integrity Gate" section under SPEC Execution Protocol (before Step 1 DB Pre-Flight or as Step 0).
- `.claude/skills/opticup-strategic/SKILL.md` — add integrity-check step to First Action (Step 0 or 1.5).
- `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` — add "Integrity Gate" bullet to §3 Success Criteria template requirements and a new "Pre-Merge Checklist" with integrity check item.
- `modules/Module 4 - CRM/go-live/ROADMAP.md` — add a new entry: "CRM_PRE_MERGE_INTEGRITY (2026-04-24): Emergency recovery from Cowork VM corruption + permanent integrity gate. WORKING_TREE_RECOVERY executed as no-op (tree was already clean — false alarm from Cowork-side authoring env). INTEGRITY_GATE_SETUP added Iron Rule 31 + verify-tree-integrity.mjs (null-byte + truncation checks using git diff). Status: ✅ CLOSED."
- `modules/Module 4 - CRM/final/OPEN_ISSUES.md` — add a new closed entry (e.g., #8): "קבצים מושחתים ב-working tree (Cowork VM) — ✅ RESOLVED 2026-04-24. Description: Cowork VM strategic session perceived 1,083 corrupted files, but the executor found only 5 on Daniel's Windows desktop (autocrlf handled the CRLF half; the null-byte half did not actually reach this repo state). Lesson: authoring-env vs execution-env can differ sharply. Resolution: WORKING_TREE_RECOVERY closed as no-op with FOREMAN_REVIEW 🟡; INTEGRITY_GATE_SETUP installed Iron Rule 31 + a null-byte + truncation gate using git diff to avoid env-drift false positives. The real Cowork-VM null-byte risk (documented in prior incidents) is now guarded."

These are NOT files but are part of the "expected final state" — the executor will verify them with `git config --get <key>`.

### DB state

No DB changes.

### Docs updated (MUST include)

- **`CLAUDE.md`** — Rule 31 added, First Action updated. Last-revision line at file bottom updated.
- **`modules/Module 4 - CRM/docs/SESSION_CONTEXT.md`** — SPEC 1's POST-MERGE content committed as part of this SPEC's Integration Ceremony commit. No content changes beyond what SPEC 1 left on disk.
- **NOT updated by this SPEC:** `MASTER_ROADMAP.md` (no module phase status change), `docs/GLOBAL_MAP.md` (no new shared functions), `docs/GLOBAL_SCHEMA.sql` (no DB changes), any module CHANGELOG.

### Files committed (summary)

1. 3 holdover files from SPEC 1 (SESSION_CONTEXT + ACTIVATION_PROMPT + MISSION_8_XMOD_AUDIT) — one commit: `docs(crm): commit post-merge status + pre-merge activation + M8 audit from prior session`.
2. `.gitattributes` + git config + new `verify-tree-integrity.mjs` + `package.json` script — one commit: `feat(rules): add Iron Rule 31 integrity gate + .gitattributes LF enforcement + tree-integrity check`.
3. Skill + CLAUDE.md edits (Iron Rule 31 text, First Action step, SKILL.md updates, SPEC_TEMPLATE update) — one or two commits: `docs(rules): Iron Rule 31 + First Action integrity step` and `chore(skills): wire integrity gate into opticup-executor + opticup-strategic + SPEC_TEMPLATE`.
4. `.husky/pre-commit` update — one commit: `chore(husky): pre-commit runs tree-integrity gate before staged verify`.
5. (Optional) SPEC folder `EXECUTION_REPORT.md` + `FINDINGS.md` at close — one commit: `chore(spec): close INTEGRITY_GATE_SETUP with retrospective`.

Total: 3–5 commits (depending on how the executor groups 3–4 above). Criterion 19 allows 3–5.

---

## 9. Commit Plan

Executor decides final grouping within 3–5 commits. Recommended order:

- **Commit 1:** Commit the 3 holdover files from SPEC 1 + SPEC 1 retrospective files (EXECUTION_REPORT + FINDINGS + FOREMAN_REVIEW) + this SPEC folder. All by explicit path. Commit message: `docs(crm): commit SPEC 1 retrospective + holdover files (SESSION_CONTEXT, CRM_PRE_MERGE, M8 audit)`.
- **Commit 2:** Add `scripts/verify-tree-integrity.mjs` + `package.json` npm script. Run `npm run verify:integrity` on clean tree — must exit 0. Commit message: `feat(verify): add whole-tree integrity gate (null-byte + truncation via git diff)`.
- **Commit 3:** Add Iron Rule 31 to CLAUDE.md + update §1 First Action + update all 3 skill files (opticup-executor, opticup-strategic, SPEC_TEMPLATE). Commit message: `docs(rules): add Iron Rule 31 + wire integrity gate into skills`.
- **Commit 4:** Wire `verify-tree-integrity.mjs` into `.husky/pre-commit`. Perform controlled corruption test per §13. Commit message: `chore(husky): pre-commit runs integrity gate before staged verify`. Optionally combine with Commit 3.
- **Commit 5:** Update CRM ROADMAP + OPEN_ISSUES + close INTEGRITY_GATE_SETUP with EXECUTION_REPORT + FINDINGS. Commit message: `docs(crm): close INTEGRITY_GATE_SETUP + log in ROADMAP and OPEN_ISSUES`.

Each commit message: English, present-tense verb, scoped. Paths added by explicit name. Never `git add -A`.

Push after final commit: `git push origin develop`.

---

## 10. Dependencies / Preconditions

- **SPEC 1 (WORKING_TREE_RECOVERY) is CLOSED 🟡 (no-op).** The working tree on Daniel's Windows desktop is already in the expected state: 5 entries (1 modified + 4 untracked). Verified 2026-04-24 in SPEC 1 EXECUTION_REPORT.
- Current HEAD: `6cd332f`. Same as origin/develop.
- Node.js (version installed on machine — Node ≥18 for `import`).
- Husky already installed (`.husky/pre-commit` exists, `"prepare": "husky"` in package.json).
- Git ≥2.10.

---

## 11. Lessons Already Incorporated

Harvested from the 3 most recent FOREMAN_REVIEWs:

- **EVENT_CONFIRMATION_EMAIL Proposal 1 (row-existence check)** → NOT APPLICABLE (no INSERTs).
- **EVENT_CONFIRMATION_EMAIL Proposal 2 (feature-existence grep)** → APPLIED. Verified no existing `verify-tree-integrity.mjs`, no `.gitattributes`, no existing Iron Rule 31 — all genuinely new. `null-bytes.mjs` exists but covers only staged files; the new script is over full tree (different scope). Documented in §12 why both coexist.
- **CRM_HOTFIXES Proposal 1 (runtime state verification at author time)** → APPLIED. All stated pre-conditions in §2 and §10 were verified live at SPEC-authoring time: `.husky/pre-commit` content, `verify.mjs` existence, `null-bytes.mjs` existence, absence of `.gitattributes`, absence of `core.autocrlf`/`core.eol` config.
- **CRM_HOTFIXES Proposal 2 (Expected Final State lists ALL modified files)** → APPLIED. §8 enumerates every new and modified file plus git config changes.
- **SHORT_LINKS Proposal 1 (line-count projection)** → APPLIED. `verify-tree-integrity.mjs` projected at ~200 lines, hard cap ≤250 enforced as criterion 8. CLAUDE.md projected under 400-line soft cap after Rule 31 addition (~12 lines of net growth). SPEC_TEMPLATE.md small delta.
- **SHORT_LINKS Proposal 2 (rollback plan mandatory)** → APPLIED. §6 has per-commit rollback strategy.

### Cross-Reference Check (Rule 21 enforcement at author time)

Names introduced by this SPEC and their collision check:

| New name | Exists? | Resolution |
|----------|---------|------------|
| `.gitattributes` | No | Safe to create |
| `scripts/verify-tree-integrity.mjs` | No (only `verify.mjs` + `schema-diff.mjs`) | Safe to create, distinct purpose |
| `verify:integrity` npm script | No (`verify`, `verify:staged`, `verify:full` exist) | Safe to add, pattern-consistent |
| Iron Rule 31 | No (rules jump 23 → 24 but 24–30 are storefront-repo-only) | Safe to add as next ERP rule |
| `Integrity Gate` skill section | No grep hits | Safe to add |

- `null-bytes.mjs` (existing staged-only check) vs new `verify-tree-integrity.mjs` (full-tree check): the NEW script covers a broader scope (all files in working tree, not just staged), adds CRLF and truncation checks, and runs at session-start and pre-commit as two layers. The existing check remains untouched — it's defense-in-depth for staged commits specifically. Both coexist, each with its own scope, no duplication.

**Cross-Reference Check completed 2026-04-24: 0 collisions / 1 clarification documented (null-bytes coexistence).**

---

## 12. Iron Rule 31 — Exact Text to Insert

This is the exact text for CLAUDE.md §6 (Hygiene Rules), inserted AFTER Rule 23 and BEFORE the "Cross-repo: Iron Rules 24–30" heading:

```
31. **Integrity gate before every stage.** Before any `git add`, `git commit`, or session end, run `npm run verify:integrity`. The gate scans git-tracked + git-modified files (sourced from `git status --porcelain` + `git ls-files`, never a raw filesystem walk — this avoids autocrlf false positives) for two corruption classes: (a) null bytes embedded in source files (Cowork-VM-style padding); (b) mid-statement truncation (file ends with incomplete token, no trailing newline, unbalanced braces at EOF). A failed gate BLOCKS the stage; never bypass with `--no-verify`. If the gate fails at session start, STOP and investigate before touching anything. This rule is in force because on 2026-04-24 a single Cowork VM strategic session introduced a false-alarm-sized corruption report (1,083 entries seen from that env, 5 entries actually on disk) AND because prior real incidents (e.g. 286 null bytes in crm.html on 2026-04-21, documented in auto-memory `feedback_cowork_truncation.md`) did reach staged commits before being caught manually. CRLF is NOT checked — `core.autocrlf` on each developer machine handles line endings; adding a CRLF check would produce false positives on Windows without .gitattributes, and .gitattributes is deferred to a post-merge SPEC.
```

(Note: rules 24–30 are storefront-repo-scoped per existing CLAUDE.md; this numbering keeps the ERP rule block contiguous from 31 onward.)

---

## 13. Controlled Corruption Test (Criterion 15)

After the integrity script is in place, the executor MUST run this test to prove the gate actually detects corruption:

```bash
# 1. Create a scratch file in a safe location
mkdir -p /tmp/integrity-test
cp modules/crm/crm-init.js /tmp/integrity-test/test-clean.js

# 2. Inject corruption (truncate + null pad)
head -c 100 /tmp/integrity-test/test-clean.js > /tmp/integrity-test/test-corrupt.js
printf '\x00\x00\x00\x00\x00' >> /tmp/integrity-test/test-corrupt.js
cp /tmp/integrity-test/test-corrupt.js modules/crm/crm-init.js

# 3. Run gate — MUST fail (exit non-zero)
node scripts/verify-tree-integrity.mjs
test $? -ne 0 && echo "PASS: gate correctly failed" || echo "FAIL: gate did not detect"

# 4. Restore clean file
git checkout -- modules/crm/crm-init.js

# 5. Re-run gate — MUST pass (exit 0)
node scripts/verify-tree-integrity.mjs
test $? -eq 0 && echo "PASS: gate clean on clean tree" || echo "FAIL"

# 6. Cleanup
rm -rf /tmp/integrity-test
```

If either PASS line is not emitted, STOP — the gate is defective, fix before commit.

---

## 14. Integrity Script — Design Spec (not full code — executor implements)

`scripts/verify-tree-integrity.mjs` must:

- Be an ES module (`.mjs`) matching the pattern of `scripts/verify.mjs` (import chalk, export exit codes consistent with husky hook contract).
- Accept CLI flags: `--help`, `--check-truncation`, `--check-null-bytes`, `--all` (default), `--verbose`, `--quiet`.
- **CRITICAL: Get the file list from `git`, NEVER from a raw filesystem walk.** This is the central design decision per FOREMAN_REVIEW M4-INFRA-01. Concrete implementation:
  - `git status --porcelain` → parse for modified/untracked entries
  - `git ls-files` → full list of tracked files in HEAD
  - Union of those two sets = files to check
  - Optionally filter by extension: `.js .mjs .cjs .jsx .ts .tsx .astro .css .html .htm .md .sql .json`
  - If the union is >500 files, check only the ones in `git status --porcelain` (the ones recently touched) for a faster pre-commit pass; `--all` flag triggers the full sweep.
- For each file in that list, open as a Buffer and run:
  - **Null-byte check** (existing logic from `scripts/checks/null-bytes.mjs` — reuse, don't rewrite): scan for `0x00`. Report: path + first offset + total count.
  - **Truncation check** — two heuristics, both required:
    - (a) Last byte is not `\n` AND file is source code (all extensions above except `.md` and `.json`). Report as violation.
    - (b) Last 30 bytes parsed: if the trailing non-whitespace sequence ends with `[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(?\s*['"]?$` (dangling identifier / function call), OR with unbalanced `{` `[` `(` count, report as violation.
    - Warnings (not violations) for `.md` files with missing trailing newline — common and usually not corruption.
- Exit codes: `0` = clean, `1` = violations, `2` = warnings only (matches `verify.mjs` hook contract).
- Output format: matches `verify.mjs` style (chalk red/yellow/green, one line per violation, summary at end).
- Runtime target: <5 seconds on full tree. If slower, use concurrent `fs.readFile` via `Promise.all` with a concurrency cap of 32.
- Keep line count ≤250 (Rule 12 hard cap; target 200). Factor shared helpers if needed.
- **Do NOT import `chokidar` or `find-up` or any file-walking library.** Source of truth is git.
- **Do NOT check CRLF.** Per §0 and §12, autocrlf handles this per machine.

---

## 15. Dependencies on SPEC 1

| Needed from SPEC 1 | Status |
|---|---|
| Clean working tree (no real null-byte/truncation corruption) | ✅ Verified by SPEC 1 EXECUTION_REPORT: spot-checked 5 files, all clean |
| 3 holdover files still uncommitted | ✅ SESSION_CONTEXT.md, CRM_PRE_MERGE/, MISSION_8 all on disk |
| HEAD unchanged (`6cd332f`) | ✅ SPEC 1 made zero commits |
| SPEC 1 folder has EXECUTION_REPORT + FINDINGS + FOREMAN_REVIEW | ✅ All written |

SPEC 2 is ready to execute.

---

*End of SPEC. Hand to opticup-executor.*
