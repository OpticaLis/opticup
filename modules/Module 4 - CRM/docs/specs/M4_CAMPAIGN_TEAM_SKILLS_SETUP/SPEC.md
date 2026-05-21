# M4_CAMPAIGN_TEAM_SKILLS_SETUP — SPEC

> **Author:** Foreman (opticup-strategic, Opus 4.7) · **Date:** 2026-05-21
> **Pipeline:** Light (Foreman → Executor → Reviewer → Foreman close; NO Localhost-Tester)
> **Brief:** `modules/Module 4 - CRM/architecture-brief/M4_CAMPAIGN_TEAM_SKILLS_SETUP_BRIEF.md`
> **Design source:** `roles/_design/CAMPAIGN_TEAM_SKILLS_DESIGN.md`

## 1. Goal

Implement Phase 1 of the campaign team — 4 markdown skills (1 Campaign Lead manager + 3 specialists: Performance Analyst read-only, Copywriter recommend-only, Retrospective read-only). The Campaign Lead mirrors the proven `opticup-architect` pattern, scoped to campaign/marketing context: bootstrap reads campaign memory, writes briefs to specialists, returns plain-Hebrew strategy to Daniel one question at a time, no git, no code, no DB.

## 2. Scope

### 2.1 Skills to create (4)

| Skill | Authority | Files |
|---|---|---|
| `opticup-campaign-lead` | management (briefs + coordination) | `SKILL.md` + `references/CAMPAIGN_LEAD_DECISIONS_LOG.md` + `references/BRIEF_TEMPLATE.md` |
| `opticup-campaign-performance-analyst` | READ-ONLY | `SKILL.md` |
| `opticup-campaign-copywriter` | RECOMMEND-ONLY | `SKILL.md` |
| `opticup-campaign-retrospective` | READ-ONLY | `SKILL.md` |

### 2.2 Folders to create

| Path | Purpose |
|---|---|
| `roles/campaign-overseer/analyses/` | Performance Analyst writes here |
| `roles/campaign-overseer/retrospectives/` | Retrospective writes here |
| `roles/campaign-overseer/briefs/` | Campaign Lead writes briefs here (campaign-scoped); also `campaigns/<campaign>/briefs/` when scoped to a specific campaign |
| `.claude/skills/opticup-campaign-lead/references/` | Lead skill's decisions log + brief template |

Each folder gets a `.gitkeep` since git doesn't track empty dirs.

### 2.3 Other artifacts

- Auto-memory entry at `C:\Users\User\.claude\projects\C--Users-User-opticup\memory\project_campaign_team.md` — points future sessions at the team.
- `roles/_design/CAMPAIGN_TEAM_SKILLS_DESIGN.md` — append a "Phase 1 implemented 2026-05-21" header line.

## 3. Destructive Operations

**None.** Pure CREATE operations (4 new skill folders, 4 new sub-folders under `roles/campaign-overseer/`, 1 new memory file, 1 doc append). NO file deletes, NO mass renames, NO git destructive, NO DB, NO EF, NO template/rule/migration changes.

The destructive-ops gate is satisfied trivially: there is no destructive pattern to declare.

## 4. Cross-Module Safety Audit

### 4.1 What this SPEC touches (CREATE only)

Per Brief §4.1 — verbatim.

### 4.2 NOT touched

Per Brief §4.2 — including the existing `opticup-campaign-overseer` and `opticup-site-overseer` SKILLs (the new Lead coordinates WITH them, doesn't modify them).

### 4.3 Stop-trigger

Any skill requiring code/DB/EF/template changes → STOP (markdown skill files only).

## 5. Trigger-collision pre-flight (per Brief §8)

Grep result against all `.claude/skills/*/SKILL.md` frontmatter for proposed trigger phrases:

| Proposed trigger | Closest existing trigger | Verdict |
|---|---|---|
| Campaign Lead: "אתה האחראי על צוות הקמפיין" | Overseer: "אתה האחראי על הקמפיין" | DISTINCT (word "צוות" differentiates). String match cannot conflate; semantic match resolves via Lead's "צוות" keyword. |
| Campaign Lead: "אתה מנהל הקמפיין" | Overseer: "campaign monitor" | DISTINCT (Hebrew vs English; different verbs) |
| Campaign Lead: "אתה הארכיטקט של הקמפיין" | Architect: "אתה הארכיטקט של הפרוייקט" | DISTINCT (קמפיין vs פרוייקט) |
| Analyst: "אתה אנליסט הקמפיין" | (none) | NO collision |
| Copywriter: "אתה כותב תוכן לקמפיין" | (none) | NO collision |
| Retrospective: "אתה כותב רטרוספקטיבה" | (none) | NO collision |

Both the Lead and Overseer SKILLs will carry a "Disambiguation" note pointing each at the other, so a future Daniel session asking "אחראי על הקמפיין" without "צוות" loads Overseer (config) and "אחראי על צוות הקמפיין" loads Lead (manager).

## 6. Authority modes (per Brief §D3)

| Skill | Mode | Concretely |
|---|---|---|
| Campaign Lead | management | Writes briefs + coordinates. NO direct writes to production data (no template/rule/broadcast edits). Briefs go to specialists or to Campaign Overseer for execution. |
| Performance Analyst | READ-ONLY | Reads `mv_funnel_health_dashboard`, `funnel_weekly_briefs`, `crm_message_log`, `crm_broadcasts`, `crm_capi_dispatch_queue`. Writes only to `roles/campaign-overseer/analyses/`. |
| Copywriter | RECOMMEND-ONLY | Reads `M4_INFRASTRUCTURE_CONTRACT.md` §1 + existing templates. Writes draft copy to a doc — Daniel approves → Campaign Overseer applies. NEVER writes to `crm_message_templates`. |
| Retrospective | READ-ONLY | Reads post-campaign DB + prior retros. Writes to `roles/campaign-overseer/retrospectives/` + may append LEARNINGS.md. |

## 7. Iron Rule 35 inheritance

All 4 skills include an explicit "Iron Rule 35 boundary" section:
- NO new `%var_name%` placeholders (Copywriter especially).
- NO new trigger types or action types (Lead especially when briefing).
- NO EF code, NO DB triggers, NO migrations.
- Config application stays with Campaign Overseer; infrastructure stays with Architect SPEC.

Bypass requires Daniel's explicit in-chat authorization.

## 8. Plain-language rule (per Brief §D5)

All 4 skills inherit Step 0.10 — Daniel-facing output uses plain Hebrew, comparison tables when comparing options, NO jargon, NO file paths, NO commit hashes, NO SQL. The Campaign Lead has this as its primary communication discipline.

## 9. English status-line rule (per Brief §D6)

All 4 skills surface status to Daniel in English per `feedback_daniel_comms` memory. Hebrew is for SPEC body + briefs to other skills + thinking-out-loud. Status lines = English.

## 10. Success Criteria

Per Brief §7 (1-10), restated as gates:

1. 4 `SKILL.md` files exist under `.claude/skills/opticup-campaign-*/` with frontmatter (name, description with triggers).
2. Campaign Lead `SKILL.md` has: bootstrap protocol, brief-authoring protocol, team-coordination flow, plain-Hebrew comms rules (Step 0.10), no-git/no-code discipline, decisions-log reference.
3. 3 specialist `SKILL.md`s have: triggers, domain, IR35 boundary, files-consumed, handoff format, authority mode.
4. Each skill's authority mode matches §6.
5. `roles/campaign-overseer/analyses/`, `retrospectives/`, `briefs/` exist with `.gitkeep`.
6. Auto-memory `project_campaign_team.md` exists.
7. `roles/_design/CAMPAIGN_TEAM_SKILLS_DESIGN.md` carries a "Phase 1 implemented 2026-05-21" header.
8. Trigger-collision pre-flight passes (§5).
9. IR31 + IR32 pass on every commit.
10. Working tree clean at close (untouched pre-existing WIP from prior sessions explicitly excluded from "clean" definition).

## 11. Commit Plan

- C1: Campaign Lead skill (`SKILL.md` + `references/CAMPAIGN_LEAD_DECISIONS_LOG.md` + `references/BRIEF_TEMPLATE.md`).
- C2: 3 specialist skills (analyst + copywriter + retrospective `SKILL.md`).
- C3: `roles/campaign-overseer/{analyses,retrospectives,briefs}/.gitkeep` + auto-memory + design-doc Phase-1 mark.
- C4: FOREMAN_REVIEW + reviewer findings.

## 12. Rollback Plan

`git rm -r` the 4 skill folders + the 3 new role subfolders + the memory file. Revert the design-doc header change. Zero runtime impact (no DB, no EF, no code).

## 13. Author Notes

Per Brief §13: this completes Daniel's north-star — talk to ONE Campaign Lead, who runs a specialist team. Phase 2 roles (QA/Audience/Scheduler) deferred per design.

The trigger disambiguation between Lead and Overseer ("צוות" keyword) is the single subtle point — documented in both SKILLs to prevent future confusion.

---

*End of SPEC. Executor proceeds with C1.*
