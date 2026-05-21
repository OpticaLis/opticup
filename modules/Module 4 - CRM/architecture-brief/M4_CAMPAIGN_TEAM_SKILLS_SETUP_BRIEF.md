# M4_CAMPAIGN_TEAM_SKILLS_SETUP — Architecture Brief

> **Status:** Brief sealed 2026-05-21 · Owner: Architect · Pipeline: Full-Auto (doc/skill creation — Light)
>
> **One-line:** Create the campaign team as a 4-skill hierarchy: a Campaign Lead (architect-style manager that takes Daniel's requests, writes briefs to the team, coordinates) over 3 specialist skills (Performance Analyst read-only, Copywriter recommend-only, Retrospective read-only). Mirrors the opticup-architect model but scoped exclusively to campaign/marketing context.
>
> **Risk class:** LOW. Skill-file creation + doc only. No code, no DB, no EF. Skills are markdown.
>
> **Grounding:** `roles/_design/CAMPAIGN_TEAM_SKILLS_DESIGN.md` (Mission 10 of pre-night audit). This Brief implements Phase 1 of that design + adds the Campaign Lead layer Daniel requested.

---

## 1. Goal

Build a self-contained campaign team that Daniel manages the same way he manages the project: he talks to ONE lead (the Campaign Lead), who owns the campaign context and dispatches work to specialists. The Campaign Lead writes briefs, coordinates the team, and returns strategic decisions to Daniel in plain Hebrew — never technical detail, never code.

After this Brief, Daniel can say "אתה האחראי על צוות הקמפיין" and get a manager who:
- Knows the full campaign context (templates, broadcasts, funnel, CAPI, design system).
- Dispatches briefs to Analyst / Copywriter / Retrospective.
- Coordinates with the existing Campaign Overseer (CRM config) + Site Overseer (storefront design).
- Returns one strategic question at a time, in Hebrew, with a recommendation + reason.

## 2. Background

**The 6-role design (Mission 10) found:**
- 2 roles already covered: CRM Manager = existing Campaign Overseer; Storefront Designer = existing Site Overseer.
- 3 new specialists needed: Performance Analyst, Copywriter, Retrospective.
- 3 deferred to Phase 2 (Audience Manager, Scheduler — overlap; QA — integrate into Overseer).

**Daniel's addition (2026-05-21):** a managing layer — a "Campaign Lead" with an architect-style role but campaign-scoped context. He talks to it; it manages the team.

**The template:** `opticup-architect` SKILL.md is the proven pattern — reads memory at bootstrap, writes briefs (not code), coordinates specialists, returns plain-Hebrew strategy with one-question-at-a-time, never does git, applies Steps 0.7-0.10 (live-state probe, plain-language, user-memory compliance). The Campaign Lead is the same pattern, campaign-scoped.

**Authority model (Iron Rule 35 preserved):** all campaign skills respect the existing boundary — config edits (templates/rules/schedules) are Campaign Overseer territory; infrastructure (new placeholders, trigger types, EF, DB) requires an Architect SPEC. The new team works WITHIN this boundary.

## 3. Scope — 4 skills

### 3.1 Skill 1 — Campaign Lead (the manager)

**Skill name:** `opticup-campaign-lead`

**Triggers:**
- Hebrew: "אתה האחראי על צוות הקמפיין", "אתה מנהל הקמפיין", "אתה ראש צוות הקמפיין", "אתה הארכיטקט של הקמפיין"
- English: "you are the campaign lead", "you manage the campaign team", "you are the campaign director"

**Role (architect-style, campaign-scoped):**
- Bootstrap: reads campaign memory + `roles/campaign-overseer/` + `roles/site-overseer/FUNNEL_ROADMAP.md` + `roles/_design/CAMPAIGN_TEAM_SKILLS_DESIGN.md` + design system canon.
- Takes Daniel's campaign requests, decomposes into briefs for the 3 specialists + the 2 existing overseers.
- Coordinates the team handoff flow (Analyst diagnoses → Copywriter rewrites → Overseer applies → Retrospective captures).
- Returns plain-Hebrew strategy to Daniel: one question at a time, recommendation + reason, no technical detail (inherits opticup-architect Step 0.10 plain-language rule).
- Does NOT: write code, edit templates/rules directly, run git, touch DB/EF. Pure coordination + brief authoring.

**Authority:** management layer. Writes briefs to `roles/campaign-overseer/briefs/` or `campaigns/<campaign>/briefs/`. Never touches production data.

**Self-improving:** logs decisions to `roles/campaign-overseer/CAMPAIGN_LEAD_DECISIONS_LOG.md`.

### 3.2 Skill 2 — Performance Analyst (read-only)

**Skill name:** `opticup-campaign-performance-analyst`

**Triggers:** per design — "אתה אנליסט הקמפיין", "תנתח את מדדי הקמפיין", "you are the campaign analyst".

**Role:** reads funnel + campaign metrics (Funnel Health Dashboard, Weekly Brief, broadcast logs, CAPI data). Computes REAL conversion rates from business-state columns (`unsubscribed_at`, `purchase_amount`) — NEVER from raw click events (per memory `feedback_clicks_are_not_actions`). Surfaces actionable insights. Writes analyses to `roles/campaign-overseer/analyses/`.

**Authority:** READ-ONLY everywhere. Writes only analysis docs.

### 3.3 Skill 3 — Copywriter (recommend-only)

**Skill name:** `opticup-campaign-copywriter`

**Triggers:** per design — "אתה כותב תוכן לקמפיין", "תכתוב הודעת SMS", "you are the campaign copywriter".

**Role:** authors/refines SMS/WhatsApp/Email template bodies (HE/EN/RU). Knows the placeholder contract (`M4_INFRASTRUCTURE_CONTRACT.md` §1) — NEVER invents new placeholders (Iron Rule 35). Optimizes for SMS 160-char segments, CTA clarity, cultural fit. Writes draft template bodies; Campaign Overseer applies approved copy to DB.

**Authority:** READ-ONLY on DB. Writes draft documents only. Drafts go to Daniel for approval → Campaign Overseer applies.

### 3.4 Skill 4 — Retrospective (read-only)

**Skill name:** `opticup-campaign-retrospective`

**Triggers:** per design — "אתה כותב רטרוספקטיבה", "תכתוב סיכום קמפיין", "you are the campaign retrospective".

**Role:** after a campaign/event concludes, synthesizes learnings (what messaging worked, audience response, CAPI data, what to change). Writes structured retros to `roles/campaign-overseer/retrospectives/`. References prior retros to detect recurring patterns. Proposes Campaign Overseer or Architect SPEC requests from learnings.

**Authority:** READ-ONLY. Writes retro docs + LEARNINGS.md updates.

### 3.5 Deferred to Phase 2 (NOT created now)

- QA Campaign → integrate into Campaign Overseer as `qa_preflight` action (future).
- Audience Manager → overlap with Analyst; defer.
- Scheduler → overlap with Overseer; defer.

### 3.6 Out of scope

- Modifying existing Campaign Overseer or Site Overseer skills (they stay as-is; the Lead coordinates with them).
- Any actual campaign execution (this Brief creates the team, doesn't run a campaign).
- Plugin packaging / marketplace.
- Any code, DB, EF, or template changes.

## 4. Cross-Module Safety Audit

### 4.1 What this SPEC touches

| Surface | Access |
|---|---|
| `.claude/skills/opticup-campaign-lead/SKILL.md` | CREATE |
| `.claude/skills/opticup-campaign-performance-analyst/SKILL.md` | CREATE |
| `.claude/skills/opticup-campaign-copywriter/SKILL.md` | CREATE |
| `.claude/skills/opticup-campaign-retrospective/SKILL.md` | CREATE |
| `.claude/skills/opticup-campaign-lead/references/` | CREATE (decisions log + brief template) |
| `roles/campaign-overseer/` subfolders (analyses/, retrospectives/, briefs/) | CREATE empty + .gitkeep |
| `roles/_design/CAMPAIGN_TEAM_SKILLS_DESIGN.md` | MODIFY (mark Phase 1 implemented) |
| Auto-memory: campaign team bootstrap entry | CREATE |

### 4.2 EXPLICITLY NOT TOUCHED

| Surface | Confirmed |
|---|---|
| Existing opticup-campaign-overseer skill | not touched |
| Existing opticup-site-overseer skill | not touched |
| opticup-architect / opticup-strategic / opticup-executor SKILLs | not touched |
| Any DB table, EF, trigger | not touched |
| Any template, rule, broadcast | not touched |
| Any module code | not touched |
| Iron Rule 35 boundary | preserved (skills respect it) |

### 4.3 Stop-trigger
If creating any skill requires touching DB/EF/code/templates → STOP. These are markdown skill files only.

## 5. Locked Decisions

**D1. 4 skills, hierarchical.** Campaign Lead (manager) + 3 specialists. NOT 6 — Phase 2 roles deferred per design + overlap analysis.

**D2. Campaign Lead mirrors opticup-architect pattern.** Same bootstrap-read-memory, brief-authoring, plain-Hebrew, one-question-at-a-time, no-git, no-code discipline. Inherits Steps 0.7-0.10. Campaign-scoped context only.

**D3. Authority modes (Daniel-approved C):**
- Campaign Lead = management (briefs + coordination, no direct writes to prod).
- Performance Analyst = read-only.
- Retrospective = read-only.
- Copywriter = recommend-only (drafts → Daniel approval → Overseer applies).

**D4. Iron Rule 35 preserved.** No campaign skill adds placeholders/triggers/actions or touches EF/DB/migrations. Config application stays with Campaign Overseer; infrastructure stays with Architect SPEC.

**D5. Plain-language mandatory (Step 0.10).** Campaign Lead → Daniel uses comparison tables + plain Hebrew, no jargon. All 4 skills inherit this for Daniel-facing output.

**D6. English-only status lines (user memory).** Any skill surfacing status to Daniel uses English per `feedback_daniel_comms` (NOT Hebrew status lines).

**D7. Self-improvement.** Campaign Lead logs decisions; Retrospective harvests learnings. Mirrors the FOREMAN_REVIEW loop.

## 6. Pipeline

Light Pipeline (skill-file creation is doc work):
1. Foreman (opticup-strategic) authors SPEC.
2. Executor (opticup-executor) creates the 4 SKILL.md files + references + folders + memory entry.
3. Reviewer (opticup-reviewer) validates: skills trigger correctly, authority boundaries clear, Iron Rule 35 preserved, no overlap/contradiction with existing skills.
4. Foreman closes.

No Localhost-Tester (no runtime surface). Model: Opus for SKILL authoring (these need careful prose), Sonnet for the mechanical folder/memory scaffolding.

## 7. Success Criteria

1. 4 SKILL.md files exist with proper frontmatter (name, description, triggers).
2. Campaign Lead SKILL has: bootstrap protocol, brief-authoring protocol, team-coordination flow, plain-Hebrew comms rules (Step 0.10), no-git/no-code discipline, decisions-log reference.
3. 3 specialist SKILLs have: triggers, domain, boundary (Iron Rule 35 style), files-consumed, handoff format, authority mode.
4. Each skill's authority mode matches D3 (Lead=mgmt, Analyst=RO, Copywriter=recommend, Retro=RO).
5. `roles/campaign-overseer/` has analyses/ + retrospectives/ + briefs/ subfolders (.gitkeep).
6. Auto-memory bootstrap entry created so future sessions know the team exists.
7. `CAMPAIGN_TEAM_SKILLS_DESIGN.md` marked Phase 1 implemented.
8. Reviewer confirms no trigger collision with existing skills (grep all trigger phrases).
9. Iron Rule 31 + 32 pass.
10. Working tree clean at close.

## 8. Stop-Triggers

- Trigger phrase collision with an existing skill (e.g., campaign-lead triggers overlapping campaign-overseer) → resolve before creating.
- Any skill requiring code/DB/EF → STOP (these are markdown only).
- §4.3 violation.
- IR31 fails.

## 9. Rollback Plan

Pure file creation. Rollback = delete the 4 skill folders + revert design-doc edit + remove memory entry. No DB, no code, no runtime impact.

## 10. Expected Final State

- 4 new skill folders under `.claude/skills/`.
- New subfolders under `roles/campaign-overseer/`.
- 1 memory entry.
- Design doc updated.
- Daniel can invoke "אתה האחראי על צוות הקמפיין" and get the Campaign Lead.

## 11. Commit Plan

- C1: Campaign Lead skill + references.
- C2: 3 specialist skills.
- C3: folders + memory + design-doc update.
- C4: FOREMAN_REVIEW + Reviewer report.

## 12. Cross-References

- `roles/_design/CAMPAIGN_TEAM_SKILLS_DESIGN.md` — THE design source.
- `.claude/skills/opticup-architect/SKILL.md` — the pattern template for Campaign Lead.
- `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md` — Iron Rule 35 boundary.
- `roles/campaign-overseer/CAMPAIGN_OVERSEER_HANDOFF.md` — existing overseer to coordinate with.
- Memory: `feedback_clicks_are_not_actions`, `feedback_daniel_comms`, `feedback_always_recommend`.
- Iron Rule 35.

## 13. Author Notes

This completes Daniel's north-star vision: a marketing operation he manages by talking to ONE campaign lead, who runs a specialist team — exactly how he manages the whole project through me (the Architect). The Lead is campaign-scoped; I stay project-scoped. Clean separation.

Phase 2 (QA/Audience/Scheduler) is deliberately deferred — better to prove 4 skills work than ship 7 that overlap. The design doc records the Phase 2 plan for when the team's value is proven.

---

*End of Brief. Activation Prompt in sibling file `M4_CAMPAIGN_TEAM_SKILLS_SETUP_ACTIVATION_PROMPT.md`.*
