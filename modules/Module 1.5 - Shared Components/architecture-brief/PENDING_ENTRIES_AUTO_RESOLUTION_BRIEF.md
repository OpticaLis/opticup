# PENDING_ENTRIES_AUTO_RESOLUTION — Architecture Brief

> **Status:** Brief sealed 2026-05-15 evening · Owner: Architect · Pipeline: Full-Auto
>
> **One-line:** Build a 3-layer mechanism that ensures `_archive/architect-pending-entries/*.md` files are automatically applied to their target locations and removed at the end of every Claude Code session — so Cowork-authored pending entries never accumulate as drift.

---

## 1. Goal

Eliminate the manual hand-off step where a Cowork Architect session writes a pending file (because it cannot edit `.claude/skills/`) and the next Claude Code session must remember to apply it. After this Brief ships, the pipeline self-resolves: pending entries land in their target files automatically and the pending files are deleted in the same session that finishes their work.

## 2. Background

**Why this Brief exists:**

Cowork sessions cannot modify files under `.claude/skills/` (file-tool–level lock). The accepted workaround has been: write the intended content to `_archive/architect-pending-entries/<TS>_<TOPIC>.md` and rely on the next Claude Code session to copy it into the protected target.

This is a **culture rule**, not infrastructure. The rule depends on a human (Daniel) or a future session remembering to check the folder. On 2026-05-15 we hit the failure mode: one pending file already sits in the folder (`2026-05-15_STOREFRONT_PUBLIC_DATA_LAYER.md`) and a fresh Cowork Architect session opened today did not have a mechanical way to apply it. The folder's own comment says "If this folder grows beyond 3-4 pending files, surface it to Daniel" — meaning drift detection is also manual.

Per Daniel's directive 2026-05-09 (DECISIONS_LOG #11): **"I want infrastructure, not culture. Culture decays."** This Brief turns the culture rule into infrastructure.

## 3. Scope

**In scope:**

- Layer 1 — Executor protocol update: opticup-executor SKILL.md mandates a "Pending Entries Sweep" as the last step of every SPEC execution.
- Layer 2 — Pre-commit advisory check: `scripts/checks/architect-pending-applied.mjs` runs in `verify.mjs --staged`. If `_archive/architect-pending-entries/` is non-empty, emit a yellow warning before commit (exit code 2 = warning only, not blocking). Wires into existing `verify.mjs` modes.
- Layer 3 — Sentinel detection: extend Mission 10 (Structure Discipline) to count pending-entries files. If ≥ 2 → HIGH alert in `docs/guardian/GUARDIAN_ALERTS.md`. If = 1 and older than 48 hours → MEDIUM alert.
- Documentation update to `.claude/skills/opticup-architect/SKILL.md` (file-write capability map) and `.claude/skills/opticup-executor/SKILL.md` (sweep protocol).
- Apply the one existing pending file (`2026-05-15_STOREFRONT_PUBLIC_DATA_LAYER.md`) as part of this SPEC — to validate the new sweep protocol end-to-end on a real file.

**Out of scope:**

- Inventing a separate "pending entries database." The flat-file folder is fine; the discipline is what's missing.
- Building a UI for pending entries.
- Auto-applying entries during the Cowork session that authored them (impossible — the lock is exactly what we're working around).
- Changing the file-tool lock on `.claude/skills/`. That lock exists for a reason (prevents Cowork from corrupting skill files); we keep it.
- Re-architecting the lock itself or the Cowork sandbox.

## 4. Destructive Operations

1. Delete `_archive/architect-pending-entries/2026-05-15_STOREFRONT_PUBLIC_DATA_LAYER.md` after its content is successfully merged into `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` and verified by grep.

No other destructive operations are authorized by this Brief. If the executor finds additional pending files at sweep time, it MUST stop and escalate — they were not declared in scope.

## 5. Pipeline

Standard Full-Auto Pipeline:

1. **Foreman (opticup-strategic)** authors `SPEC.md` from this Brief.
2. **Executor (opticup-executor)** implements Layers 1–3 + applies the existing pending file.
3. **Reviewer (opticup-reviewer)** validates Iron Rule compliance, especially Rule 21 (No Orphans — verify no duplicate sweep logic exists elsewhere) and Rule 31 (integrity gate must still pass).
4. **Localhost-Tester** smoke 7/7 must remain GREEN. No new runtime surfaces are added — this is process infrastructure — so the smoke test is for regression only.
5. **Foreman closes** with FOREMAN_REVIEW.md + 4 skill-improvement proposals.

## 6. Locked Decisions

**D1. Layer ordering: Executor protocol first, then pre-commit check, then Sentinel.** Executor protocol catches 95% of cases inside the SPEC run itself. Pre-commit catches the remaining 5% before they enter git. Sentinel catches anything that slips both (e.g., a session ended without commit). Three layers for the same reason the Root Discipline Rule has three (prevention + detection + reminder).

**D2. Pre-commit is advisory (exit 2), not blocking (exit 1).** If a contributor genuinely needs to commit without resolving a pending entry (e.g., the pending entry is queued for a separate strategic session), they can. A blocking gate would prevent legitimate work. The advisory warning is loud enough to catch accidents.

**D3. Sentinel thresholds: 1 file > 48h = MEDIUM; 2+ files = HIGH.** Single recent file is normal Cowork → Claude Code hand-off. Single stale file means a session ended without sweep — soft failure. Multiple files means the sweep itself is broken or being ignored — hard failure.

**D4. Apply the existing pending file as part of this SPEC.** Two reasons: (a) validates Layer 1 protocol on a real file before it ships; (b) clears the only existing pending file so the new Sentinel check starts from a clean baseline.

**D5. Cowork file-write capability map goes into Architect SKILL.md.** A short table that says: file tools blocked on `.claude/skills/`; bash CAN write (echo, sed -i, python); bash CANNOT rm. So future Cowork Architect sessions know not to attempt bash workarounds — instead, write the pending file and trust the new sweep. Prevents future "I figured out a hack" sessions.

## 7. Success Criteria

Every criterion measurable. Each has an exact expected value to be filled in by the SPEC.

1. `scripts/checks/architect-pending-applied.mjs` exists, exit 0 when folder empty, exit 2 with yellow warning text when non-empty.
2. `verify.mjs --staged` and `verify.mjs --full` both call the new check.
3. `_archive/architect-pending-entries/` is empty at SPEC close (the existing pending file is consumed).
4. `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` contains the entry #32 row from the pending file (verified by `grep -c "^| 32 |" DECISIONS_LOG.md` = 1).
5. `.claude/skills/opticup-executor/SKILL.md` contains a "Pending Entries Sweep" section with explicit step-by-step protocol.
6. `.claude/skills/opticup-architect/SKILL.md` contains a "Cowork File-Write Capability Map" sub-section.
7. Sentinel Mission 10 file (path determined by executor pre-flight) declares the pending-entries audit with the D3 thresholds.
8. Smoke 7/7 PASS post-change.
9. Iron Rule 31 integrity gate passes at staged + full mode.
10. All commits land on `develop`, working tree clean at SPEC close.

## 8. Stop-Triggers

The Executor MUST stop on any of:

- More than 1 file present in `_archive/architect-pending-entries/` at SPEC start (Brief authorizes only the 1 known file; others are undeclared scope).
- Any pending file whose content is malformed (no clear "placement instructions" section, or target path doesn't exist).
- Sentinel Mission 10 file structure differs from what the SPEC author assumed (executor pre-flight discovers the actual structure first — see opticup-executor SKILL.md §1.5 DB Pre-Flight pattern adapted to file pre-flight).
- Iron Rule 31 gate fails at any commit boundary.
- Smoke 7/7 regresses.

## 9. Rollback Plan

Per-commit annotated tags (`pre-pending-entries-resolution-{step}`) at each commit boundary. Worst-case rollback: `git reset --hard pre-pending-entries-resolution-start`. Layers 1–3 are additive — no existing logic is rewritten — so rollback is clean.

## 10. Expected Final State

- Working tree clean on `develop`.
- `_archive/architect-pending-entries/` is an empty folder with a `.gitkeep` file (executor decides whether to keep folder or remove and recreate on next pending entry).
- DECISIONS_LOG.md has entry #32.
- 3 new infrastructure pieces: `architect-pending-applied.mjs` + executor SKILL update + Sentinel Mission 10 extension.
- 2 SKILL.md updates: Architect (capability map) + Executor (sweep protocol).
- Smoke + integrity GREEN.

## 11. Commit Plan

Indicative. Executor adjusts if its pre-flight reveals a better order.

- C1: Add `scripts/checks/architect-pending-applied.mjs` + wire into `verify.mjs`.
- C2: Update `.claude/skills/opticup-executor/SKILL.md` with sweep protocol.
- C3: Update `.claude/skills/opticup-architect/SKILL.md` with capability map.
- C4: Update Sentinel Mission 10 file with pending-entries audit.
- C5: Apply existing pending file → DECISIONS_LOG.md entry #32 + delete pending file.
- C6: Retrospective (EXECUTION_REPORT.md + FINDINGS.md if any).

## 12. Out-of-Scope

- The 4 skill-improvement proposals queued by STOREFRONT_PUBLIC_DATA_LAYER FOREMAN_REVIEW. Those are tracked separately and applied at the next strategic touch. This SPEC does not apply them.
- BRAND_VISIBILITY_CASCADE + FUNCTION_REVOKES (OPEN_TASKS tasks 0c + 0d). Separate SPECs.
- M4_FB_CAPI_HYBRID_DEDUPLICATION (OPEN_TASKS task 6). Separate SPEC, scheduled after this.
- Reworking how `.claude/skills/` access works in Cowork. We work with the lock as-is.

## 13. Author Notes

This Brief is itself a small example of the pattern it codifies: a Cowork Architect session wrote a Brief to a Cowork-accessible folder, and a Claude Code Executor session will pick it up. The pending-entries mechanism is the same logic, just for a different file type.

After this SPEC closes, the failure mode that prompted it (a Cowork session unable to apply a DECISIONS_LOG entry, leaving drift) is structurally impossible: the pending file gets applied within the same SPEC chain that uses it.

---

*End of Brief. Activation Prompt in sibling file `PENDING_ENTRIES_AUTO_RESOLUTION_ACTIVATION_PROMPT.md`.*
