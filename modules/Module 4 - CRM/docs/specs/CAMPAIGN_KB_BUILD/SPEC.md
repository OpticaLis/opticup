# CAMPAIGN_KB_BUILD — SPEC

> **Author:** Foreman (opticup-strategic, Opus 4.7) · **Date:** 2026-05-21
> **Pipeline:** Full-Auto (Foreman → Executor → Reviewer → Foreman close; NO Localhost-Tester)
> **Brief:** `modules/Module 4 - CRM/architecture-brief/CAMPAIGN_KB_BUILD_BRIEF.md`

## 1. Goal

Build the campaign team's knowledge base as a SHORT MAP router + 5 SYNTHESIZED reference files (mirroring CLAUDE.md's "map not manual" pattern), wire the 4 campaign skills to read MAP-first, and install a continuous-learning loop in the Campaign Lead (decisions log + retro harvest + 3-strikes + KB-freshness checklist).

## 2. Scope

### 2.1 New files (CREATE)

| Path | Target size | Purpose |
|---|---|---|
| `roles/campaign-overseer/knowledge/CAMPAIGN_KB_MAP.md` | ≤ 150 lines | Router: task → which KB to read |
| `roles/campaign-overseer/knowledge/KB_MODULE_4.md` | ≤ 400 lines | M4 architecture + shipped improvements |
| `roles/campaign-overseer/knowledge/KB_MESSAGING.md` | ≤ 400 lines | Templates + automations + placeholder contract + IR35 |
| `roles/campaign-overseer/knowledge/KB_STOREFRONT.md` | ≤ 400 lines | Campaign pages + forms + lead→thank-you + pixel points |
| `roles/campaign-overseer/knowledge/KB_STRATEGY.md` | ≤ 350 lines | Business model, audience, locked decisions, what worked |
| `roles/campaign-overseer/knowledge/KB_FUNNEL_CAPI.md` | ≤ 350 lines | Funnel measurement + FB CAPI + real-vs-raw metrics rule |

Per Brief §3.2: each KB synthesized (curated references), not raw dumps. DB reads are SELECT-only.

### 2.2 Skill edits (MODIFY)

| Path | Change |
|---|---|
| `.claude/skills/opticup-campaign-lead/SKILL.md` | Bootstrap reads MAP first; learning-loop section formalized (3-strikes rule); KB-freshness checklist reference |
| `.claude/skills/opticup-campaign-performance-analyst/SKILL.md` | Bootstrap: MAP → KB_FUNNEL_CAPI + KB_MODULE_4 |
| `.claude/skills/opticup-campaign-copywriter/SKILL.md` | Bootstrap: MAP → KB_MESSAGING + KB_STRATEGY |
| `.claude/skills/opticup-campaign-retrospective/SKILL.md` | Bootstrap: MAP → all KB (post-campaign); retrospective harvest writes proposals to LEARNINGS + KB delta |

### 2.3 Decisions log (formalize)

`.claude/skills/opticup-campaign-lead/references/CAMPAIGN_LEAD_DECISIONS_LOG.md` already exists with skeleton (created 2026-05-21). Per Brief §3.4 #1, formalize the index format to mirror opticup-architect's DECISIONS_LOG entry shape (situation → my recommendation → Daniel's response → reason → lesson). Already in place from yesterday — confirm + minor tightening.

### 2.4 KB freshness checklist (CLAUDE.md §10)

Add one line to `CLAUDE.md` §10 Integration Ceremony so every Module-4 / campaign SPEC close updates the matching KB file. Surgical 1-line edit; CLAUDE.md absorbs the new item without expanding the file's role.

### 2.5 Auto-memory pointer

`C:\Users\User\.claude\projects\C--Users-User-opticup\memory\project_campaign_kb.md` — points future sessions at the KB structure.

## 3. Destructive Operations

**None.** Pure CREATE + MODIFY of markdown files. NO file deletes, NO mass renames, NO git destructive, NO DB writes (only SELECTs to catalog templates/rules), NO EF, NO template/rule/migration changes.

The destructive-ops gate is satisfied trivially.

## 4. Cross-Module Safety Audit

### 4.1 What this SPEC touches (CREATE/MODIFY)

See Brief §4.1 — verbatim. Plus:
- `CLAUDE.md` (one-line append to §10 Integration Ceremony for KB freshness checklist item).
- `modules/Module 4 - CRM/docs/specs/CAMPAIGN_KB_BUILD/` (SPEC + FOREMAN_REVIEW).

### 4.2 NOT touched

Per Brief §4.2 — verbatim. Read-only on M4 DB + EF + code + templates + rules. Existing Campaign Overseer, Site Overseer, Architect, Strategic, Executor, Reviewer SKILLs all untouched.

### 4.3 Stop-trigger

Any need to write to DB / EF / code / templates → STOP.

## 5. Read-only DB plan

Two SELECT-only catalog probes already run as pre-flight (template + rule inventory). Results used to synthesize KB_MESSAGING. No further DB writes.

## 6. Iron Rule 35 reflection in KB

KB_MESSAGING explicitly documents the boundary:
- Campaign Overseer authority: template body wording (using only documented placeholders), rule trigger_condition on existing trigger types, broadcast schedules, audience filters, active/inactive flags.
- Architect SPEC authority: new `%var_name%` placeholders, new trigger types, new action types, EF code, DB triggers, migrations.

All 4 campaign skills already inherit this; the KB confirms it for the team's reading layer.

## 7. Pipeline

Full-Auto, no Localhost-Tester (no runtime surface). Model: Opus for KB synthesis (judgment-heavy); Sonnet for mechanical scaffolding.

## 8. Success Criteria

Per Brief §7 (1-13). Restated as gates:

1. MAP exists, < 150 lines, complete routing table covering: write/refine message, analyze performance, design/audit campaign page, plan strategy, post-campaign retro, understand M4 mechanics.
2. 5 KB files exist, each within size target, synthesized.
3. KB_MODULE_4 covers CAPI hybrid + purchase events, dual-path fix, resend button, dashboards, short-links redesign, rate-limit hardening.
4. KB_MESSAGING covers templates + automations + placeholder contract + IR35.
5. KB_STOREFRONT covers campaign pages + forms + lead flow + pixel points.
6. 4 campaign skills updated to read MAP-first.
7. CAMPAIGN_LEAD_DECISIONS_LOG.md formalized.
8. Learning loop documented in Lead SKILL (decisions log + retro harvest + 3-strikes).
9. KB freshness checklist in CLAUDE.md §10.
10. Auto-memory `project_campaign_kb.md` exists + MEMORY.md updated.
11. Zero DB writes (verified — only SELECTs).
12. IR31 + IR32 pass on every commit.
13. Working tree clean modulo pre-existing WIP.

## 9. Commit Plan

Bundled per the Light-Pipeline lesson harvested from M4_CAMPAIGN_TEAM_SKILLS_SETUP (P-AUTHOR-1 — markdown-only inter-dependency-free SPECs commit as one):

- C1: All KB files + MAP + 4 skill edits + Lead decisions-log tightening + CLAUDE.md §10 line + auto-memory + MEMORY.md.
- C2: FOREMAN_REVIEW.

## 10. Rollback Plan

`git revert` C1 + C2. Pure markdown — zero runtime impact.

## 11. Author Notes

The split-with-MAP shape is the key: CLAUDE.md is 400 lines at repo root pointing at docs/; the campaign KB is the same pattern at `roles/campaign-overseer/knowledge/`. The team reads short, routes long.

The learning loop is the second-order goal: yesterday gave the team roles, today gives them knowledge, the loop ensures they compound. After this, the Campaign Lead is to campaigns what the Architect is to the project — full context, dispatches correctly, improves over time.

---

*End of SPEC. Executor proceeds with C1.*
