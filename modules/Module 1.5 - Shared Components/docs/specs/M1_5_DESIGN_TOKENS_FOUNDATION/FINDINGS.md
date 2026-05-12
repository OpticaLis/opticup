# FINDINGS — M1_5_DESIGN_TOKENS_FOUNDATION

Findings discovered during execution that were OUT of this SPEC's scope.
Each finding rolls up to the combined FOREMAN_REVIEW at end of Phase 4
(Daniel directive 2026-05-10).

---

## M1_5-SPEC-DRIFT-01 — `INFO`

**Location:** `modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_TOKENS_FOUNDATION/SPEC.md` §3 criterion #12 vs §8 prescribed text
**Description:** SPEC criterion #12 grep literal `"neutral slate"` doesn't appear in the §8 prescribed db-schema text (`"...near-black + slate scale — brand-free neutral baseline."`). When Daniel chose Option 2 (Slate-900 near-black) mid-authoring, the Foreman updated §8's hex values but missed sweeping §3's grep substrings.
**Impact:** Forced an unplanned fixup commit (`a6fe14d`) to make the literal grep pass; criterion #2 deviated 4→5.
**Suggested action:** Author-skill (opticup-strategic) — apply Executor Proposal 1 in EXECUTION_REPORT.md §8 (SPEC self-consistency pre-flight).

## M1_5-SPEC-DRIFT-02 — `INFO`

**Location:** Same SPEC §3 criterion #13 vs §8
**Description:** Criterion #13 grep `"Slate 700.*neutral platform default"` matches the brief's original Option-1 wording (Slate 700) but Daniel chose Option 2 (Slate 900). §8's prescribed MODULE_MAP text reads "Slate 900 — neutral platform default". Fix forced documentation to reference both Slate 700 (historical) and Slate 900 (shipping) — awkward wording but satisfies both.
**Impact:** Same fixup commit as M1_5-SPEC-DRIFT-01.
**Suggested action:** Same as above — author-skill enforcement.

## M1_5-SPEC-DRIFT-03 — `INFO`

**Location:** SPEC §5 stop-trigger wording
**Description:** Trigger said "If Prizma ui_config at baseline contains keys other than empty `{}` → STOP". Prizma's baseline had 8 non-empty keys (none of them `--color-*`). Literal reading fires the trigger; intent reading ("keys that conflict with the migration") does not. Foreman judgment applied: continued because the `||` merge correctly preserves all 8 keys and adds 4 non-conflicting new ones.
**Impact:** Forced an explicit judgment call mid-execution; documented decision in EXECUTION_REPORT §4 Decision 2.
**Suggested action:** Author-skill — sharpen trigger language to "If Prizma ui_config contains any `--color-*` key at baseline → STOP" (semantically precise).

## M1_5-ENV-01 — `MEDIUM`

**Location:** `docs/guardian/GUARDIAN_ALERTS.md` on local disk (this Windows desktop machine)
**Description:** File on disk was 13,433 bytes; HEAD's tracked version is 630 bytes clean. Difference was 10,543 NUL bytes appended starting at offset 2890 — Cowork-VM-style padding. `git status` did NOT flag the file as modified (it was a silent binary diff). Iron Rule 31 Integrity Gate caught it on pre-execution scan and refused to start Phase 1 until repaired.
**Repair applied:** `git checkout -- docs/guardian/GUARDIAN_ALERTS.md` restored HEAD's clean version. Re-ran gate → exit 0.
**Impact:** ~3 minutes of pre-execution debugging. Iron Rule 31 paid for itself — this is exactly the failure mode it's designed to catch.
**Suggested action:** Sentinel-skill — investigate why a Sentinel process writes NUL-padded output to GUARDIAN_ALERTS.md. The rule says repair recipe is "truncate at offset 2890 and add trailing LF" — that suggests a stream-write that gets interrupted mid-flush and Windows fills the rest with NULs. Sentinel's writer needs an atomic-write pattern (write to `.tmp` + rename).

## M1_5-RECURRING-01 — `LOW`

**Location:** Repo working tree (pre-existing dirt)
**Description:** Same untracked items have been listed across consecutive sessions (per M4_HARDCODED_DEMO_PHONE_CLEANUP FOREMAN_REVIEW Executor Proposal 2 — "Untracked-file routing"): 3 untracked M3 FOREMAN_REVIEW.md files + 3 .accdb files. These are not part of this SPEC and were left untouched. The recurrence proves the underlying friction predicted by Proposal 2 hasn't been addressed by a session yet.
**Impact:** None on this SPEC; minor noise in `git status` output.
**Suggested action:** Promote M4_HARDCODED_DEMO_PHONE_CLEANUP Executor Proposal 2 to active enforcement in the executor skill — auto-propose `docs(spec): commit pending retrospectives from <date>` chore commit before SPEC's first commit. (Currently still pending application — log + watch threshold has been reached.)

---

## Summary

5 findings, all `INFO` or `LOW` except `MEDIUM` env-finding M1_5-ENV-01 (Sentinel atomic-write issue). 3 are author-skill proposals; 1 is environment; 1 is meta-recurring. None block Phase 2 dispatch. All roll up to the combined FOREMAN_REVIEW at end of Phase 4.
