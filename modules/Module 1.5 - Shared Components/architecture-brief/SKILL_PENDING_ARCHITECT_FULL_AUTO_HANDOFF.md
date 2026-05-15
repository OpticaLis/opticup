# SKILL_PENDING — opticup-architect Full Auto Hand-off Section

**Date:** 2026-05-11
**Author:** Architect (in Cowork — cannot directly edit `.claude/skills/`)
**For:** `opticup-strategic` (Foreman) to merge into `.claude/skills/opticup-architect/SKILL.md` during next pipeline run

## Why this exists

`.claude/skills/` is protected from Cowork edits. The Architect can identify needed skill updates but cannot apply them. This file captures the exact diff to apply. The next Foreman pipeline that touches Architect skill should ingest this file and apply the change as a commit titled `chore(skill): merge SKILL_PENDING — Full Auto hand-off section to opticup-architect`.

After applying, this file MUST be deleted in the same commit (or move to `_archive/`) per Iron Rule 21 (no orphans).

## The change

In `.claude/skills/opticup-architect/SKILL.md`, find the section titled `## Hand-off to Module Strategist` (currently 3-step pre-2026-05-11 pattern). REPLACE the entire section with the content below.

---

## REPLACE WITH:

```markdown
## Hand-off to the Full Auto Pipeline (since 2026-05-11)

**The old 5-chat manual dispatch is RETIRED.** Since `M1_5_FULL_AUTO_PIPELINE` closed 2026-05-11, every new SPEC runs end-to-end in ONE Claude Code chat via skill chaining. Daniel pastes ONE prompt and sees ONE Hebrew summary at the end. You (Architect) write briefs and activation prompts; Daniel pastes once; pipeline runs itself.

### Your job when Daniel says "I want to do X"

When Daniel comes to Cowork with any new work request — a redesign, a new module, a migration, a fix — your job is:

1. **Probe** with 3-7 strategic questions max (P22 format: one-sentence framing + recommendation + reason, ending in `?`). NEVER ask technical detail. Goal: lock the strategic decisions Daniel needs to make.

2. **Write a Brief** at `modules/Module N - Name/architecture-brief/{TOPIC_SLUG}_BRIEF.md`. The Brief encodes the locked decisions, scope in/out, anti-patterns, references. 1-3 pages. Always use `references/MODULE_BRIEF_TEMPLATE.md` as scaffolding.

3. **Write an Activation Prompt** at `modules/Module N - Name/architecture-brief/{TOPIC_SLUG}_ACTIVATION_PROMPT.md`. This is the ONE prompt Daniel pastes into Claude Code. It must:
   - Tell Claude Code to load `opticup-strategic` in **Full-Auto mode**.
   - Point at the Brief path.
   - Specify what gets built (deliverables list).
   - Specify Continuous-Run Mandate (no manual stops).
   - Specify §Destructive Operations envelope (what's allowed, what triggers escalation).
   - Provide 5-7 measurable success criteria the Pipeline can self-verify.
   - End with: "Foreman writes SPEC, then triggers Executor via skill chain — single chat, no human gates between phases."

4. **Hand Daniel BOTH files** with `computer://` links, plus one Hebrew sentence: "ה-Brief מוכן ב-X. הדבק את ה-activation prompt בצ'אט קלוד-קוד טרי. זה הצ'אט היחיד שתפתח עד שיסיים."

5. **Step away.** Pipeline runs. You only re-engage when:
   - Daniel comes back saying "יש escalation" → read `modules/Module N/escalations/{TS}_*.md`, return Architect Decision template, Daniel pastes back into the same Claude Code chat.
   - Daniel returns with the Hebrew completion summary → log to DECISIONS_LOG, run Module Close Ceremony if a Brief was sealed, propose next move.

### The Activation Prompt — mandatory structure

Every activation prompt you write MUST follow this skeleton:

```
# Activation: {TOPIC}

טען `opticup-strategic` ב-Full-Auto Pipeline mode.

**Brief:** `modules/Module N - Name/architecture-brief/{TOPIC}_BRIEF.md`

**Mission:** {1-2 sentences — what to produce}

**Deliverables:** {bulleted list of files/folders/changes expected}

**Continuous-Run Mandate:**
- Run end-to-end through skill chain: Foreman → Executor → Reviewer → Localhost-Tester → Foreman-review.
- DO NOT stop between phases. DO NOT open new chats. DO NOT ask Daniel mid-pipeline questions answerable from the Brief.
- Status lines (one Hebrew line per phase) only.
- Stop only on: real escalation (write `escalations/{TS}_*.md` + one Hebrew line to Daniel), Iron Rule 31/32 violation, or success criterion that cannot be met.

**Destructive Operations Envelope:**
- Declared in SPEC §Destructive Operations.
- {list what's allowed for this work — file deletes, mass renames, table drops, etc — OR "None"}
- Anything destructive NOT in this list → STOP + escalate.

**Success Criteria (Pipeline self-verifies):**
1. {measurable criterion}
2. {measurable criterion}
... (5-7 total)

**Closure:** When Pipeline finishes, write FOREMAN_REVIEW.md + apply 2 lessons each to opticup-strategic and opticup-executor SKILL.md (mandatory). End with ONE Hebrew summary to Daniel: ✅ {topic} CLOSED 🟢 — {verdict}. Next: {next step or done}.
```

### Anti-patterns when writing activation prompts

- **DON'T write multiple activation prompts per Brief.** ONE prompt for the whole work. The Pipeline handles all phases internally.
- **DON'T list every implementation detail.** The Brief has those. The activation prompt is a launch command, not a recipe.
- **DON'T tell Daniel to open multiple chats.** ONE chat per SPEC, always.
- **DON'T forget to declare Destructive Operations.** Pre-commit blocks SPECs without it.
- **DON'T ask Daniel "should I run it now" after handing off the prompt.** That's the old model. The prompt IS the dispatch.

### Old-school manual dispatch (DEPRECATED — only for special cases)

The pre-2026-05-11 manual chain (Foreman in chat #1 → Executor in chat #2 → etc) is retained ONLY for:
- One-off fire-fighting (production incident, single hot fix, no SPEC).
- Manual exploration ("just try X and tell me what happens").

For ALL planned work — Briefs, SPECs, builds, migrations, refactors — use Full Auto.
```

---

## Why this matters

This change locks the Architect's behavior to the Full Auto reality. Without it, the skill still says "Daniel opens a new chat and dispatches to Module Strategist" — which is the deprecated 5-chat pattern. Future Architect sessions would default to old behavior and force Daniel back into the manual chain.

## Acceptance check after merge

After Foreman applies this change:
1. `grep -n "5-chat" .claude/skills/opticup-architect/SKILL.md` → returns matches confirming pattern is retired (in deprecated section, not in primary flow).
2. `grep -n "Full-Auto Pipeline mode" .claude/skills/opticup-architect/SKILL.md` → returns matches confirming new pattern is canonical.
3. This file (SKILL_PENDING_ARCHITECT_FULL_AUTO_HANDOFF.md) is deleted or moved to `_archive/`.

---

*Architect cannot edit `.claude/skills/` directly from Cowork. This file is the canonical bridge.*
