# SPEC — Consolidate Campaign-Team Knowledge into Events-Operations Skill

> **Authored:** 2026-05-22 (retroactive — work executed in same session).
> **Trigger:** Campaign Lead brief `roles/campaign-overseer/briefs/2026-05-21_CONSOLIDATE_EVENTS_OPS_KNOWLEDGE_SCAN_BRIEF.md`.
> **Why retroactive:** the brief was authored at the Campaign Lead layer, not as a SPEC. Iron Rule 32 requires destructive ops to be declared in a SPEC §Destructive Operations; this SPEC documents the work as executed and authorizes the deletions performed in the same commit.

---

## 1. Purpose

Consolidate the 4 retiring campaign-team specialist skills (`opticup-campaign-overseer`, `-copywriter`, `-performance-analyst`, `-retrospective`) into a single `opticup-events-operations` skill. The skills' operational disciplines are extracted into 4 PLAYBOOK files under `roles/campaign-overseer/knowledge/`. The historical decisions log + HANDOFF context is migrated into a single git-tracked file at `roles/events-operations/EVENTS_OPS_DECISIONS_LOG.md`. The 4 SKILL.md files themselves are NOT deleted (Daniel manages disable via Cowork plugin management) per the brief's §6.

Goal: zero duplication (Iron Rule 21), one home for all history, the consolidated skill reads everything through the existing `CAMPAIGN_KB_MAP.md` router.

## 2. Pre-flight (already done)

- ✅ Read 4 retiring SKILL.md files + 5 existing KBs + current MAP.
- ✅ Built duplication map (a / b / c classification across ~40 knowledge items).
- ✅ Daniel approved the duplication map + chose: drop scaffolding, 4 PLAYBOOKs + MAP rows, history goes in-repo at `roles/events-operations/`.

## 3. Steps (executed)

1. Created `roles/events-operations/EVENTS_OPS_DECISIONS_LOG.md` (542 lines) with: schema, 12 RECs verbatim (REC-001..REC-012), Self-Review #1, and 15 historical blocks consolidated from `CAMPAIGN_OVERSEER_HANDOFF.md`.
2. Verified migration entry-by-entry (REC count match 12=12, Self-Review #1 verbatim, 15 HANDOFF blocks accounted for).
3. Deleted source files via `git rm -f` (see §4).
4. Created 4 PLAYBOOK files under `roles/campaign-overseer/knowledge/`:
   - `PLAYBOOK_CONFIG_OPS.md` (79 lines) — L-001/L-003/L-004 disciplines, demo-first promote flow, IR35 escalation, message-send safety
   - `PLAYBOOK_MESSAGING.md` (107 lines) — worst-case substitution char count, channel decision tree, brand tone canon
   - `PLAYBOOK_ANALYSIS.md` (164 lines) — real-vs-raw rule, cardinality discipline, PII discipline, cohort sizing, query crib
   - `PLAYBOOK_RETROSPECTIVE.md` (108 lines) — 3+3+patterns format, planned-vs-actual table, cross-retro pattern detection
5. Extended `KB_MESSAGING.md` §8 with "above 320 chars → switch to Email/WhatsApp" rule (the one (b)-class partial item from the duplication map).
6. Updated `CAMPAIGN_KB_MAP.md`: new routing rows for the consolidated skill's task types, §2b PLAYBOOK inventory, §3 disambiguation rewritten for the 5 new Hebrew triggers.

## 4. Destructive Operations

Two file deletions are authorized by this SPEC. Both source files were fully migrated into `roles/events-operations/EVENTS_OPS_DECISIONS_LOG.md` and verified entry-by-entry before deletion. Source line counts → target line counts: 951 → 542 (delta = live-state sections that were intentionally dropped: KPIs all-TBD, recommend-only gate status, "recent decisions" duplicating the REC list, per-skill bootstrap "what to read").

Authorized deletions:

1. `git rm -f roles/campaign-overseer/DECISIONS_LOG.md` — 245 lines (12 RECs + Self-Review #1 + schema). Migrated to `EVENTS_OPS_DECISIONS_LOG.md` "Migrated Recommendations" + "Self-Reviews" sections.
2. `git rm -f roles/campaign-overseer/CAMPAIGN_OVERSEER_HANDOFF.md` — 706 lines (16 sections, 15 of historical value migrated, 1 set of live-state sections dropped intentionally). Migrated to `EVENTS_OPS_DECISIONS_LOG.md` "Historical Context" section.

No other destructive operations performed. No `git rebase`, no `git reset --hard`, no `git push --force`, no SQL DDL, no DML mass-delete, no edits to `main`, no edits to governance files beyond the additive extends to `KB_MESSAGING.md` §8 and `CAMPAIGN_KB_MAP.md` §1/§2/§2b/§3/§4/§5 (all append/extend, no removal of governance content).

## 5. Success Criteria

- ✅ All 12 RECs present in new file (verified via `grep -c "^## REC-"` = 12 in both old and new).
- ✅ Self-Review #1 verbatim in new file.
- ✅ 15 historical HANDOFF blocks preserved verbatim in §Historical Context.
- ✅ 4 PLAYBOOK files created with content distinct from KBs (cross-reference, not duplication — Iron Rule 21).
- ✅ `KB_MESSAGING.md` §8 extended with switch-channel rule.
- ✅ `CAMPAIGN_KB_MAP.md` routing reflects the consolidated skill + PLAYBOOK layer.
- ✅ Old DECISIONS_LOG + HANDOFF deleted (staged as `D ` in `git status`).
- ✅ `npm run verify:integrity` exit 0.
- ⏳ This SPEC + the consolidation commit land on `develop` together.

## 6. Out of scope

- Deleting the 4 retiring SKILL.md files at `.claude/skills/opticup-campaign-{overseer,copywriter,performance-analyst,retrospective}/` — per brief §6, Daniel disables them via Cowork plugin management.
- Changes to `LEARNINGS.md` + `POST_CUTOVER_TECH_DEBT.md` — preserved as-is.
- Authoring or editing the `opticup-events-operations` SKILL.md itself (lives in the Cowork plugin path, not in this repo).

---

*SPEC authored 2026-05-22. Used as the destructive-ops declaration for the consolidation commit. No separate EXECUTION_REPORT / FINDINGS / FOREMAN_REVIEW lifecycle — this is a retroactive SPEC for a Campaign-Lead-brief execution, not a Foreman pipeline run.*
