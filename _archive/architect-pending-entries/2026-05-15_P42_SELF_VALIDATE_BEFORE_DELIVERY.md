# Pending Architect-skill entry — P42 Self-validate file integrity before delivery

**Date:** 2026-05-15
**Author:** Architect (Cowork session)
**Target file:** `.claude/skills/opticup-architect/SKILL.md`
**Placement:** Append after the last existing P-pattern in the file (currently P41 — see "Promoted to skill 2026-05-14 (M5/M11/M14 Module Close batch — 3 strikes)" section).
**Reason for pending:** Cowork file-tool layer blocks writes to `.claude/skills/**`. Per Architect SKILL.md §"Cowork File-Write Capability Map" (line 975+), the correct mechanism is a pending entry consumed by the Layer 1 sweep in the next Claude Code session (per executor SKILL.md Step 4.5).
**Source:** Validation Report Track D #X4 (2026-05-15 overnight Cowork validation run for MONOREPO_MIGRATION Brief).
**Counter status:** 3/3 — auto-promote per Self-Improvement Mandate. Three documented past truncation incidents: (1) 2026-04-21 crm.html 286 NULs, (2) 2026-04-24 CLAUDE.md + M3 SESSION_CONTEXT NULs, (3) 2026-05-13 multiple SKILL.md write failures + 2026-05-15 MONOREPO_MIGRATION_BRIEF.md mid-section truncation during Edit-based 10-edit batch (recovered via git baseline + bash heredoc append).
**Daniel-approved:** 2026-05-15.

---

## Verbatim content to append to `.claude/skills/opticup-architect/SKILL.md`

```markdown


### P42 — Self-validate file integrity BEFORE delivering to Daniel (30-second pre-delivery check).

**Promoted to skill 2026-05-15** (validated 3/3 per documented past truncation incidents: 2026-04-21 crm.html 286 NULs, 2026-04-24 CLAUDE.md + M3 SESSION_CONTEXT NULs, 2026-05-13 multiple SKILL.md write failures, 2026-05-15 MONOREPO_MIGRATION_BRIEF.md mid-section truncation during Edit-based 10-edit batch). Reference: Validation Report Track D #X4.

After every Write or Edit that touches a file >100 lines OR >5KB, **and before delivering anything to Daniel that references that file**, run this 30-second check:

1. **Line count sanity:** `wc -l <path>` returns approximately the expected total (within ±5%).
2. **EOF marker present:** `tail -3 <path>` shows the actual end of intended content, not mid-sentence / mid-table-row / mid-code-block.
3. **Marker grep:** for the 3-5 most distinctive phrases I just wrote, `grep -c "<marker>"` returns ≥1 for each.
4. **Internal links resolve:** for any `computer://` or sibling-file path I just added, `ls <path>` succeeds.
5. **No accidental duplication:** for files where I appended content, the first occurrence of any section header (`## N. ...`) appears only ONCE — duplicate headers indicate that `cat >>` or `git heredoc` appended past the file's natural end.

**If ANY check fails:** the Write/Edit silently truncated or duplicated. **Do not deliver yet.** Recovery path per existing "Cowork VM File-Write Failures" rule (lines 195+): switch to shell heredoc write via `mcp__workspace__bash`, verify again, deliver. If recovery requires restoring from git, the canonical move is `git show <prior-good-commit>:<path>` to a temp file + diff against current + re-append the missing content carefully.

**Cowork-specific extension:** when targeting any path in `.claude/skills/**` or `scripts/**`, **do NOT attempt the write at all** — those paths are blocked by Cowork file-tool layer (per "Cowork File-Write Capability Map" §). Instead write a pending entry to `_archive/architect-pending-entries/<YYYY-MM-DD>_<TOPIC>.md` per the existing pending-entry protocol. The Layer 1 sweep in the next Claude Code session applies it.

**Why this exists:** the Edit tool returns "success" even when it has truncated the file. The harness tracks file state but the tracking is approximate; for large multi-section files with multiple sequential edits, mid-file content can drop silently. Daniel sees "10 edits applied 🟢" → reads the file → finds §9-12 missing. This 30-second check catches it before delivery, every time.

**Anti-pattern:** trusting the Edit tool's "success" return without verification on files >100 lines.

**Cumulative cost of skipping:** in the 2026-05-15 MONOREPO_MIGRATION_BRIEF.md incident, I lost 60 lines of §9-12 and had to restore from `git show 473cdc8:...` then re-append the missing content via shell heredoc. ~15 minutes of recovery work for a 30-second check that would have caught it pre-delivery. In the same session, a follow-up `cat >>` to append P42 to `.claude/skills/opticup-architect/SKILL.md` failed silently because the path is Cowork-blocked — the bash returned 0 exit code but the cowork-local view of the file was unchanged. This pending entry exists because of that second failure.

**This rule applies to every Write/Edit, not just batched edits.** Single-edit truncations have also been observed (less frequent but documented). It also applies when using `mcp__workspace__bash` to append/edit files, since the VM mount may diverge from the Cowork-local file state (as observed 2026-05-15).
```

---

## Placement instructions for the Layer 1 sweep (next Claude Code session)

1. Open `.claude/skills/opticup-architect/SKILL.md`.
2. Find the last `### P` header (currently P41, "Manual-now-with-auto-twin-hook is the right shape when an action is automatable in the future").
3. After the closing of that P41 section but BEFORE the next non-pattern section (e.g., before `## Architectural Principles (Non-Negotiable)` or whatever next major section heading exists), append the verbatim content above.
4. Verify with the standard line-count + tail + grep check (which is P42 itself, recursively).
5. Delete this pending file: `rm "_archive/architect-pending-entries/2026-05-15_P42_SELF_VALIDATE_BEFORE_DELIVERY.md"`.
6. Commit: `chore(skills): promote P42 self-validate-before-delivery to opticup-architect SKILL.md (3/3 truncation incidents, Validation #X4)`.

---

## Self-validation of THIS pending file (per P42, recursively)

- Line count expectation: ~85 lines. Run `wc -l "_archive/architect-pending-entries/2026-05-15_P42_SELF_VALIDATE_BEFORE_DELIVERY.md"` and verify.
- EOF marker: file ends with this self-validation section. Run `tail -3` to confirm.
- Distinctive markers: `Self-validate file integrity BEFORE delivering`, `Cowork-specific extension`, `Cumulative cost of skipping`. Each should appear ≥1 time on grep.

*End of pending entry. Consumed and deleted by next Claude Code session's Layer 1 sweep.*
