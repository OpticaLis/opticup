# FINDINGS — REPO_CLEANUP_2026_05_18

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/REPO_CLEANUP_2026_05_18/FINDINGS.md`
> **Written by:** opticup-executor (Windows desktop session, DESKTOP-C6N6M28)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Note on placement

Per ARCHITECT_DECISION_001 §"Closeout protocol for this Pipeline" line 2:
> "FINDINGS.md captures the classification-mismatch as F-1 (high-value finding)"

F-1 is a structural finding about Cowork-VM-authored SPEC reliability, not a
bug in any single file. It is placed here per Architect instruction rather
than treated solely as an EXECUTION_REPORT §3 deviation. EXECUTION_REPORT §3
also documents the same event as deviations D-1 through D-4 for the per-commit
audit trail; this file captures the broader lesson for the Foreman's review.

---

## Findings

### Finding 1 — Cowork-FUSE-mount classification cannot be trusted for destructive ops

- **Code:** `M1.5-INFRA-01` (Module 1.5 infrastructure, finding 01)
- **Severity:** HIGH
- **Discovered during:** Mandatory desktop re-verification of SPEC Phase 1 (ACTIVATION_PROMPT step "Re-verification steps before any destructive action").
- **Location:** Architectural / cross-cutting — affects every SPEC authored by a Cowork-VM session that classifies on-disk state.
- **Description:** The SPEC's Phase 1 Background (§2.1 through §2.6) classified 2,340 modified files into Buckets B (2,233 CRLF rot) / S (104 stale-disk) / X (2 special), plus a ghost `.git/index.lock`. The classification was performed inside the Cowork VM's FUSE mount of the Windows desktop repo. When the executor re-verified on the desktop directly, only **6** entries appeared in `git status --porcelain`: 1 modified (`docs/guardian/GUARDIAN_ALERTS.md` — Sentinel auto-write delta) + 5 untracked (the SPEC folder itself, 3 M1 Briefs the SPEC planned to commit, `_archive/pr-drafts/` the SPEC planned to delete). The 2,334 missing modifications were 100% FUSE-mount artifacts (snapshot lag + CRLF translation between Linux git inside the VM and the Windows working tree on the host). Had the bulk-restore commit (SPEC Commit 1) executed blind on the desktop, it would have been a no-op `git checkout HEAD -- <file>` on files that already matched HEAD — wasting CI time and producing a misleading commit message claiming 2,339 restorations that didn't happen.
- **Reproduction:**
  ```
  # On Cowork VM (FUSE mount): may show high count
  git status --porcelain | wc -l    # → could be 2,340 (or any large N)

  # On Windows desktop (source-of-truth): clean tree
  cd C:\Users\User\opticup
  git status --porcelain | wc -l    # → 6 (this Pipeline)
  ```
- **Expected vs Actual:**
  - Expected (per Cowork classification): 2,340 modifications on desktop
  - Actual (per desktop re-verification): 6 entries (4 of which were Bucket D inputs already known to the SPEC; 2 of which were the SPEC folder + Sentinel auto-write)
- **Suggested next action:** DISMISS (already addressed by this SPEC's Phase 5 / Commit 4).
- **Rationale for action:** The structural fix landed in Commit `7c93473`:
  1. CLAUDE.md §1 step 3a Phase 2.5 (Cowork VM only — ghost-lock + FUSE-stale detection probes) now requires Cowork sessions to detect this state and escalate to desktop.
  2. `.claude/skills/opticup-strategic/SKILL.md` Step 0.5 (Cowork-VM viability check) now blocks the Module Strategist from authoring destructive SPECs while in a ghost-lock or FUSE-stale state.
  3. `.claude/skills/opticup-executor/SKILL.md` Pre-Action #2 (Cowork-SPEC desktop re-verification gate) now requires the executor to re-verify on desktop before any destructive op when the SPEC's evidence base is Cowork-VM-side.
  Future SPECs are protected by all three layers. No new SPEC required.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — Iron Rule 32 hook regex rejects parenthetical suffixes on `## 4. Destructive Operations` heading

- **Code:** `M1.5-INFRA-02`
- **Severity:** LOW
- **Discovered during:** Commit 5 pre-commit hook execution.
- **Location:** `scripts/checks/destructive-ops-declared.mjs` — regex `SPEC_HEADING_RE = /^##\s+(?:\d+\.\s+)?Destructive Operations\s*$/m` (file line 73).
- **Description:** The Iron Rule 32 hook regex requires the SPEC heading to be EXACTLY `## Destructive Operations` or `## N. Destructive Operations`, with only optional trailing whitespace allowed. Any informational suffix (e.g., `## 4. Destructive Operations (Iron Rule 32)` — which this SPEC originally had, and which is natural English authoring style) breaks the match and the hook reports the section as missing. The Architect's SPEC was authored with the parenthetical suffix; the Executor had to apply an in-stride heading edit to comply (see EXECUTION_REPORT §4 RT-4).
- **Reproduction:**
  ```
  # Heading that hook accepts:
  ## 4. Destructive Operations

  # Heading that hook rejects (natural authoring style):
  ## 4. Destructive Operations (Iron Rule 32)
  ## 4. Destructive Operations — required per SPEC_TEMPLATE
  ```
- **Expected vs Actual:**
  - Expected: regex tolerates trailing parentheticals or em-dash sub-titles that don't affect the section's semantic identity.
  - Actual: regex requires bare heading; informational suffixes silently break Iron Rule 32 detection at SPEC time, then fail loudly at commit time.
- **Suggested next action:** TECH_DEBT (small) — relax regex to `/^##\s+(?:\d+\.\s+)?Destructive Operations\b/m` (anchor at word boundary instead of end-of-line). Add a unit case to `scripts/test-destructive-ops-gate.mjs` covering the parenthetical-suffix form.
- **Rationale for action:** Cost in this Pipeline: ~1 min in-stride fix. Cost across a portfolio of SPECs: every Foreman has to remember the bare-heading rule, and every Executor catches the violation at commit time rather than at SPEC-authoring time. A regex relaxation eliminates the class of failure with one line.
- **Foreman override (filled by Foreman in review):** { }

---

## Closing note

Two findings total. F-1 is the Pipeline's central artifact (already remediated
by Commit 4 governance edits). F-2 is a small hook-regex improvement (TECH_DEBT
candidate; ~5 min fix in a future SPEC). The Pipeline executed exactly the work
the Architect-resolved scope authorized (3 functional commits + 1 governance
commit + 1 closeout) and surfaced no incidental issues in the touched files
beyond F-2.
