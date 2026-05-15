# M13 Brief Amendment — Basic-Free Membership Type

**Brief version:** v1
**Date:** 2026-05-11
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Full Auto Pipeline (single chat)
**Owning module:** Module 13 — Loyalty Club

---

## 1. Purpose

During M9 D24 (2026-05-10), a gap was surfaced in M13's Brief: there is no membership type for leads who receive credits via compensation or referral but haven't paid a membership fee. Today's M13 Brief assumes every member is a paying member.

This SPEC adds a `basic-free` membership tier to M13's locked decisions. Documentation-only — no code, no DB changes. The Brief gets updated; the M13_DECISIONS_LOG.md gets an entry; the M13_LOYALTY_BRIEF.md D5 section gets the new tier slot. Pure docs.

## 2. The Amendment

Add a new membership tier to M13's tier definition (D5 in M13_LOYALTY_BRIEF.md):

**Tier: `basic-free`**
- **How created:** Auto-created on first qualifying event:
  - Lead receives compensation (M9 issued a credit due to lab delay / quality issue / customer complaint resolution)
  - Lead is referred by an existing member who earns a referral bonus
- **Fee:** None (free tier, auto-enrolled)
- **Receives:** Credits (the compensation/referral amount itself)
- **Does NOT receive:** Recurring bonuses, tier benefits, expiry extensions, special discounts — those are paid-tier perks
- **Upgrade path:** Can upgrade to a paid tier (silver/gold/platinum) at any time by paying the fee — existing credits carry over
- **Existing at LIVE-day:** No — this tier is created on-demand only

**Updated tier list (after amendment):**
1. `basic-free` (new — auto-enrolled, no fee, credits-only)
2. `silver` (paid)
3. `gold` (paid)
4. `platinum` (paid)

(Exact paid-tier names per M13_LOYALTY_BRIEF.md D5 — Pipeline preserves whatever names are there.)

## 3. Files to Update

1. `modules/Module 13 - Loyalty Club/architecture-brief/M13_LOYALTY_BRIEF.md` — D5 section (membership tiers definition)
2. `modules/Module 13 - Loyalty Club/architecture-brief/M13_DECISIONS_FOR_LOG.md` — add decision entry #14 (or next number)
3. `.claude/skills/opticup-architect/references/decisions/M13.md` — add module decision entry
4. `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` — add cross-module index entry referencing the amendment
5. `OPEN_TASKS.md` — mark this task closed (was "M13 Brief amendment" in Active list)

## 4. Scope — Out

- Any code changes
- Any DB changes
- Re-sketching M13 mockups (the basic-free tier doesn't need a separate sketch — it's a config row in `loyalty_tiers` table when M13 is built)
- Re-running M13 Module Close Ceremony (already done)

## 5. Locked Decisions

| # | Decision | Source |
|---|---|---|
| 1 | New tier `basic-free` — auto-enrolled, no fee, credits-only | Daniel 2026-05-10 (M9 D24) |
| 2 | Creation triggers: compensation OR referral bonus | Architect 2026-05-11 |
| 3 | Upgrade path to paid tier preserves credits | Architect 2026-05-11 |
| 4 | Docs-only SPEC, no code or DB changes | Architect 2026-05-11 |

## 6. Quality Bar — Acceptance Criteria

1. `M13_LOYALTY_BRIEF.md` D5 section includes `basic-free` tier with full description
2. `M13_DECISIONS_FOR_LOG.md` has new entry with date 2026-05-11 + Architect signoff
3. `decisions/M13.md` has corresponding entry in the per-module decisions log
4. `DECISIONS_LOG.md` index has cross-module reference entry
5. `OPEN_TASKS.md` marks task closed (was "M13 Brief amendment" — move from Active to Completed)
6. `npm run verify:integrity` exit 0
7. Working tree clean, pushed to `origin/develop`

## 7. Destructive Operations

**None.** This is a documentation-only amendment. 5 files receive content additions only (no deletions of existing sections).

## 8. Continuous-Run Mandate

Run in ONE Claude Code chat. Single phase. Should take ~30 minutes.

Stop only on Iron Rule violation.

## 9. Anti-Patterns

- DO NOT create new sketches
- DO NOT touch any code or DB
- DO NOT re-litigate M13's other decisions
- DO NOT merge to main

## 10. References

- `modules/Module 13 - Loyalty Club/architecture-brief/M13_LOYALTY_BRIEF.md` — the file being amended
- `.claude/skills/opticup-architect/references/decisions/M9.md` — D24 entry referencing the gap
- Auto-memory `MEMORY.md` — task #4 listing this amendment

---

*End of brief.*
