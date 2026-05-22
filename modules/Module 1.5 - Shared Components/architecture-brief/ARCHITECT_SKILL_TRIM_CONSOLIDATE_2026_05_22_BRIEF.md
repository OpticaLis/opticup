# BRIEF — Trim + consolidate the opticup-architect skill (under 1000 lines) (2026-05-22)

**Type:** Skill maintenance — trim the architect SKILL.md back under the plugin line limit, move pattern detail to a reference file, eliminate the copy drift.
**Author:** Architect (Daniel directive, 2026-05-22).
**Repo:** `opticalis/opticup`. Branch `develop`.
**Run on:** Claude Code (desktop preferred — file is large, and Cowork's large-file edits have been failing intermittently today).

---

## 1. Background — the drift, explained

The `opticup-architect` skill exists in TWO physical copies:

1. **`.remote-plugins/plugin_011EwWuets4MvyZ8UqfumsiF/skills/opticup-architect/SKILL.md`** — 839 lines, **READ-ONLY** (the installed plugin). This is the copy that ACTUALLY LOADS at session start. It currently ends at pattern **P38**.

2. **`opticup/.claude/skills/opticup-architect/SKILL.md`** — 1320 lines, **editable** (the in-project source). This is where edits are made and from which the plugin is (re)published. It contains P1–P46 plus some P-AR-* patterns.

**The problem:** Daniel's design intent is that the plugin SKILL stays **under ~1000 lines** (the plugin's supported limit), with overflow detail pushed into reference files. The editable copy has grown to 1320 lines — over the limit — so it can't be cleanly published, AND the live plugin is stale at P38 (missing P39–P46, which are real, recently-promoted lessons). The two copies have drifted.

**What must be true at the end:** ONE source of truth, under 1000 lines, with all 46 patterns present (in short form in the body, full detail in a reference file), and the loaded plugin matching it.

---

## 2. The structure to produce

The patterns occupy lines ~399–1320 of the editable copy (~920 lines, ~70% of the file). They are currently a MIX of short (P1–P38, title + 1–2 lines) and long (P39–P46 + some P-AR-*, multi-paragraph). The long ones are what blew past the limit.

**Target structure:**

### A. SKILL.md body (the plugin) — SHORT patterns only
- Every pattern keeps its `### Pn — Title` heading + a 1–2 line summary. That's it. Match the existing P1–P38 short format exactly.
- At the top of the patterns section, add one line: `> Full rationale, origin incidents, and examples for each pattern live in references/PATTERNS_DETAIL.md. The summaries below are the operational rule.`
- This must bring the SKILL.md under **1000 lines** (target ~850–950 to leave headroom).

### B. references/PATTERNS_DETAIL.md (NEW) — the long-form detail
- For every pattern that currently has more than 2 lines of body (the "Promoted to skill...", origin incidents, examples, anti-patterns, self-checks), move that full text here under a matching `## Pn — Title` heading.
- The short summary stays in SKILL.md; the full reasoning moves here. No information is lost — it's relocated.
- This file has NO line limit (it's a reference, loaded on demand, not the plugin body).

### C. Verify no pattern is dropped
- Count `### P` headings in the new SKILL.md — must equal the count before (56). Every pattern that existed must still have a short entry.
- Every long-form detail block must appear in PATTERNS_DETAIL.md.

---

## 3. Then: eliminate the drift (sync the plugin)

After the editable copy is trimmed + the reference file created:

1. **Republish/sync the plugin** so `.remote-plugins/.../SKILL.md` matches the trimmed editable copy. (The exact mechanism depends on how this project installs the plugin — check for a plugin manifest, a marketplace config, or a sync script. If the plugin is installed from a marketplace/git source, the update flows through that. Document the actual sync path used.)
2. If the plugin can't be republished from this session (it's read-only and sourced externally), document EXACTLY what Daniel needs to do to refresh it (e.g. re-install the plugin, or run the marketplace update command) — a precise, copy-pasteable instruction.
3. **Verify the loaded copy:** after sync, the plugin SKILL.md should contain P39–P46 (in short form) and be under 1000 lines.

---

## 4. Hard constraints

### MUST
- Keep ALL 46+ patterns — every one keeps a short entry in SKILL.md.
- Move long detail to references/PATTERNS_DETAIL.md — lose nothing.
- Get SKILL.md under 1000 lines (target 850–950).
- Match the existing P1–P38 short format for consistency.
- Verify pattern count is unchanged (before vs after).
- Run `npm run verify:integrity` (Iron Rule 31) — the editable copy was Cowork-edited today; check for null bytes / truncation before committing.
- Commit on develop. Merge to main is Daniel's via PR (if the skill lives under a path that main deploys; skills under .claude/ may not need a main merge — confirm).

### MUST NOT
- Do NOT delete any pattern.
- Do NOT change the WORDING of the operational rule in each short summary — only relocate the long rationale.
- Do NOT edit the read-only plugin copy directly (it's read-only; it updates via republish/sync only).
- Do NOT touch any other skill.

---

## 5. Stop-on-deviation triggers

- Pattern count after ≠ pattern count before → STOP, a pattern was dropped.
- SKILL.md still over 1000 lines after the trim → STOP, report what's still bloating it (maybe non-pattern sections need trimming too).
- The integrity gate finds null bytes / truncation in the editable copy → STOP, clean first (the file was Cowork-edited today; this is a real risk per the day's incidents).
- No clear plugin-republish mechanism found → STOP, document what you found and ask Daniel how the plugin is installed/updated.

---

## 6. Deliverables

1. Trimmed `opticup/.claude/skills/opticup-architect/SKILL.md` (under 1000 lines, all patterns present in short form).
2. New `references/PATTERNS_DETAIL.md` with all long-form pattern detail.
3. Plugin synced (or precise instructions for Daniel to sync it).
4. Verification: pattern count before/after, final line count, integrity gate result.
5. `EXECUTION_REPORT.md` in this brief's folder documenting the plugin-sync mechanism (so future skill edits know the flow).
6. One Hebrew status line to Daniel ≤ 8 lines.

---

## 7. Destructive Operations

This relocates content within the skill's own files (SKILL.md → PATTERNS_DETAIL.md) and creates one new reference file. No deletes of patterns, no row/table changes, no main modification. The only "destructive" act is rewriting SKILL.md's pattern section — back it up first per project policy. Anything beyond the skill's own files → STOP.

---

## 8. Success criteria

1. `opticup-architect` SKILL.md is under 1000 lines with all 46+ patterns present (short form).
2. `references/PATTERNS_DETAIL.md` holds the full detail; nothing lost.
3. The loaded plugin copy matches (P39–P46 present) — drift eliminated, OR Daniel has exact instructions to refresh it.
4. The plugin-sync mechanism is documented so this doesn't recur.
5. Integrity gate passes; pattern count unchanged.

---

*End of Brief.*
