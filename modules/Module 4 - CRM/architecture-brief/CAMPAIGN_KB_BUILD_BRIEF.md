# CAMPAIGN_KB_BUILD — Architecture Brief

> **Status:** Brief sealed 2026-05-21 · Owner: Architect · Pipeline: Full-Auto (knowledge-build, mostly read-only + doc/skill writes)
>
> **One-line:** Build the campaign team's knowledge base as SPLIT reference files behind a short MAP router (mirroring CLAUDE.md's "map not manual" pattern), so each specialist reads only what its task needs — never the whole corpus. Plus wire the 4 campaign skills to route through the MAP, and install a continuous-learning loop (decisions log + retrospective harvest + 3-strikes promotion).
>
> **Risk class:** LOW. Read-only data gathering + markdown KB files + skill-file edits + folder scaffolding. No code, no DB writes, no EF.
>
> **Grounding:** Daniel directive 2026-05-21 — split docs (not one giant file), a master MAP that routes the team to the right doc per task, and a team that always learns from its own mistakes + Daniel's corrections (like the Architect).

---

## 1. Goal

The campaign team (Lead + Analyst + Copywriter + Retrospective, shipped 2026-05-21) currently knows WHERE to look but has no consolidated, task-routed knowledge base. This Brief builds it.

Two outcomes:
1. **Split KB + MAP router.** A short master MAP doc tells each specialist "for task X, read file Y" — so nobody reads the whole corpus every time. The detail lives in 5-6 focused reference files (Module 4, Messaging, Storefront, Strategy, Funnel/CAPI).
2. **Continuous-learning loop.** Decisions log (every Daniel↔Lead interaction), retrospective harvest (recurring patterns → KB + skill updates), and a 3-strikes rule (corrected 3× → becomes a permanent skill rule). Mirrors the opticup-architect self-improvement mechanism.

After this Brief: Daniel talks to the Campaign Lead, which reads only the short MAP at bootstrap, dispatches each specialist to the exact KB file it needs, and the whole team gets measurably better over time from logged corrections.

## 2. Background

**Daniel's two constraints:**
- **No giant single file.** A monolithic KB would hit thousands of lines, slow to read, fragile to edit, confusing. Split into focused files.
- **A master MAP, schema-style.** The team must NOT read everything every time. The MAP routes: "I need to do X → read file Y."

**The proven pattern:** CLAUDE.md at repo root is exactly this — "this file is a MAP, not a manual. It contains rules and navigation. Detailed content lives in the reference files." Under 400 lines, points to docs/. We apply the same to the campaign KB.

**The learning requirement:** Daniel wants the team to improve like the Architect does — every correction logged, recurring patterns promoted to skill rules. The opticup-architect skill already has this (DECISIONS_LOG + FOREMAN_REVIEW loop + 3-strikes "if 3 consecutive reviews call out the same issue, the next session MUST apply the change"). We replicate it campaign-scoped.

**Source material exists but is scattered:**
- Module 4 build + improvements → across dozens of FOREMAN_REVIEWs + MODULE_SPEC + MODULE_MAP.
- Messaging/automation → `crm_message_templates` + `crm_automation_rules` (DB) + M4_INFRASTRUCTURE_CONTRACT.md + CRM_RULE_CHAINING.md.
- Storefront campaign pages → opticup-storefront repo + SITE_MAP.md + FUNNEL_ROADMAP.md.
- Strategy → campaign-overseer LEARNINGS + DECISIONS_LOG + launch-plan decisions.
- Funnel/CAPI → funnel-q3 knowledge maps + FB_CAPI.md.

## 3. Scope

### 3.1 The MAP (master router — short)

`roles/campaign-overseer/knowledge/CAMPAIGN_KB_MAP.md` (target < 150 lines).

Contains:
- A routing table: "Task type → which KB file(s) to read." Example rows:
  | Task | Read |
  |---|---|
  | Write/refine a message | KB_MESSAGING + KB_STRATEGY |
  | Analyze campaign performance | KB_FUNNEL_CAPI + KB_MODULE_4 |
  | Design/audit a campaign page | KB_STOREFRONT |
  | Plan campaign strategy | KB_STRATEGY + KB_FUNNEL_CAPI |
  | Post-campaign retrospective | all (end-of-campaign only) |
  | Understand M4 mechanics | KB_MODULE_4 |
- A one-line description of each KB file.
- The rule: "Read the MAP first. Read only the file(s) your task needs. Do NOT read the whole KB every time."

### 3.2 The split KB files

Under `roles/campaign-overseer/knowledge/`:

| File | Content | Target size |
|---|---|---|
| `KB_MODULE_4.md` | Module 4 architecture: tables, EFs, flows, AND every improvement shipped (CAPI hybrid + purchase events, dual-path fix, resend button, dashboards, short-links redesign, rate-limit hardening). The "what M4 can do + how it works" reference. | ≤ 400 lines |
| `KB_MESSAGING.md` | All message templates (SMS/Email/WhatsApp catalog), automation rules + their triggers + logic, placeholder contract, rule-chaining logic, copy conventions. The "messaging + automation" reference. | ≤ 400 lines |
| `KB_STOREFRONT.md` | All campaign-related storefront pages (URLs), forms, the exact lead→registration→thank-you flow, pixel firing points. The "site campaign surfaces" reference. | ≤ 400 lines |
| `KB_STRATEGY.md` | Campaign business model, audience strategy, locked decisions, launch-plan context, what's worked / what hasn't. The "why + strategy" reference. | ≤ 350 lines |
| `KB_FUNNEL_CAPI.md` | Funnel measurement, FB CAPI architecture (Lead + CompleteRegistration + EventAttended + Purchase), real-vs-raw metrics rule, dashboard meaning. The "measurement" reference. | ≤ 350 lines |

If any file would exceed its target → split further (e.g., KB_MESSAGING → KB_MESSAGING_TEMPLATES + KB_MESSAGING_AUTOMATION). Executor judgment, documented in MAP.

**Each KB file is sourced by READING existing material** (FOREMAN_REVIEWs, DB schema, MODULE_MAP, contracts, knowledge maps) and synthesizing — NOT by copying raw. DB reads are read-only SELECTs to catalog templates/rules.

### 3.3 Wire the 4 campaign skills to the MAP

Edit each of the 4 campaign skill files (created 2026-05-21) so their bootstrap reads `CAMPAIGN_KB_MAP.md` first, then loads only the KB file(s) relevant to the invoked task:
- `opticup-campaign-lead` — reads MAP at bootstrap; dispatches specialists with explicit "read KB_X" instructions.
- `opticup-campaign-performance-analyst` — MAP → KB_FUNNEL_CAPI + KB_MODULE_4.
- `opticup-campaign-copywriter` — MAP → KB_MESSAGING + KB_STRATEGY.
- `opticup-campaign-retrospective` — MAP → all (post-campaign).

### 3.4 Continuous-learning loop

Install in `opticup-campaign-lead` skill (mirroring opticup-architect):
1. **`CAMPAIGN_LEAD_DECISIONS_LOG.md`** (already referenced in the Lead skill from yesterday — formalize it). Every Daniel↔Lead interaction logged: situation → Lead recommendation → Daniel response (agree/disagree) → reason → lesson. Index format like the Architect's DECISIONS_LOG.
2. **Retrospective harvest:** the Retrospective skill, at end of each campaign, identifies recurring patterns from the decisions log + campaign data → proposes KB updates + skill-rule updates. Writes to LEARNINGS.md.
3. **3-strikes rule:** if Daniel corrects the team on the same issue 3 times (visible in decisions log), the next campaign-lead session MUST promote that correction into the relevant skill file before other work. Codify this rule in the Lead skill.
4. **KB freshness:** when a SPEC ships a new M4 feature or campaign change, the relevant KB file gets updated (add a checklist item to the Architect's Integration Ceremony + a note in the campaign Lead skill).

### 3.5 Out of scope

- Running an actual campaign.
- Modifying Module 4 code, EFs, DB, templates, rules.
- Creating Phase 2 skills (QA/Audience/Scheduler).
- Storefront repo changes.
- Plugin packaging.

## 4. Cross-Module Safety Audit

### 4.1 What this SPEC touches

| Surface | Access |
|---|---|
| `roles/campaign-overseer/knowledge/CAMPAIGN_KB_MAP.md` | CREATE |
| `roles/campaign-overseer/knowledge/KB_*.md` (5-6 files) | CREATE |
| `roles/campaign-overseer/CAMPAIGN_LEAD_DECISIONS_LOG.md` | CREATE/formalize |
| `.claude/skills/opticup-campaign-lead/SKILL.md` | MODIFY (bootstrap + learning loop) |
| `.claude/skills/opticup-campaign-performance-analyst/SKILL.md` | MODIFY (MAP routing) |
| `.claude/skills/opticup-campaign-copywriter/SKILL.md` | MODIFY (MAP routing) |
| `.claude/skills/opticup-campaign-retrospective/SKILL.md` | MODIFY (MAP routing + harvest) |
| All M4 tables, EFs, docs | **READ-ONLY** (source material) |
| Auto-memory: campaign KB pointer entry | CREATE |

### 4.2 EXPLICITLY NOT TOUCHED

| Surface | Confirmed |
|---|---|
| Module 4 code / EF / DB writes / templates / rules | not touched |
| opticup-campaign-overseer / site-overseer skills | not touched |
| opticup-architect / strategic / executor / reviewer skills | not touched |
| Any other module | not touched |
| storefront repo | READ-ONLY for KB_STOREFRONT (if accessible); else source from SITE_MAP.md |

### 4.3 Stop-trigger
Any need to write to DB / EF / code / templates → STOP. This is read + markdown only.

## 5. Locked Decisions

**D1. Split KB + MAP router, NOT a single file.** Daniel directive. Each KB file ≤ 350-400 lines; MAP ≤ 150. Mirror CLAUDE.md map pattern.

**D2. Task-routed reading.** Specialists read the MAP, then ONLY the file(s) their task needs. Never the whole corpus. The MAP's routing table is the contract.

**D3. KB is synthesized, not copied.** Read source material, distill into focused references. KB files are curated, not dumps.

**D4. Learning loop mirrors opticup-architect.** DECISIONS_LOG + retro harvest + 3-strikes. Same proven mechanism, campaign-scoped.

**D5. KB freshness is enforced.** New M4/campaign SPECs update the relevant KB file — added to Integration Ceremony checklist so the KB never goes stale.

**D6. Read-only on all production data.** Cataloging templates/rules = SELECT only. No writes.

**D7. Iron Rule 35 reflected in KB.** KB_MESSAGING documents the authority boundary (config = Overseer, infrastructure = Architect SPEC) so the team internalizes it.

## 6. Pipeline

Full-Auto Pipeline:
1. Foreman (opticup-strategic) authors SPEC.
2. Executor (opticup-executor) reads source material + writes KB files + MAP + edits 4 skills + learning loop + memory. Model: Opus for KB synthesis (needs judgment), Sonnet for scaffolding.
3. Reviewer (opticup-reviewer) validates: MAP routing complete, KB files within size targets, skills wired correctly, learning loop matches architect pattern, Iron Rule 35 reflected, no DB writes occurred.
4. Foreman closes.

No Localhost-Tester (no runtime surface).

## 7. Success Criteria

1. `CAMPAIGN_KB_MAP.md` exists, < 150 lines, with a complete task→file routing table.
2. 5-6 KB files exist, each within size target, each synthesized (not raw dumps).
3. KB_MODULE_4 covers all shipped improvements (CAPI, purchase events, dual-path fix, resend, dashboards, short-links, rate-limit hardening).
4. KB_MESSAGING covers templates + automations + placeholder contract + Iron Rule 35 boundary.
5. KB_STOREFRONT covers campaign pages + forms + lead→thank-you flow + pixel points.
6. 4 campaign skills edited to read MAP-first + route to relevant KB.
7. CAMPAIGN_LEAD_DECISIONS_LOG.md formalized with index format.
8. Learning loop documented in Lead skill: decisions log + retro harvest + 3-strikes.
9. KB freshness checklist added to Integration Ceremony (Architect SKILL or CLAUDE.md §10).
10. Auto-memory pointer entry created.
11. Zero DB writes (verified — only SELECTs).
12. Iron Rule 31 + 32 pass.
13. Working tree clean.

## 8. Stop-Triggers

- Any KB file synthesized requires a DB write → STOP (read-only).
- A KB file blows past 2× its size target with no clean split → STOP, ask Daniel.
- Skill edit would change a campaign skill's authority mode (set yesterday) → STOP.
- §4.3 violation.
- IR31 fails.

## 9. Rollback Plan

Pure file creation + skill-doc edits. Rollback = delete knowledge/ folder + revert 4 skill edits + revert memory + revert Integration Ceremony checklist line. No runtime, no DB.

## 10. Expected Final State

- `roles/campaign-overseer/knowledge/` with MAP + 5-6 KB files.
- 4 campaign skills wired to MAP.
- Learning loop live.
- Campaign Lead bootstrap now reads short MAP → has full task-routed context.
- Daniel can ask the Lead anything campaign-related and it routes correctly.

## 11. Commit Plan

- C1: KB_MAP + KB files (source-and-synthesize).
- C2: 4 skill edits (MAP routing).
- C3: learning loop (decisions log + Lead skill update + Integration Ceremony checklist).
- C4: memory + design-doc update + FOREMAN_REVIEW.

## 12. Cross-References

- `CLAUDE.md` — the map-not-manual pattern template.
- `.claude/skills/opticup-architect/SKILL.md` — learning loop + DECISIONS_LOG pattern.
- `roles/_design/CAMPAIGN_TEAM_SKILLS_DESIGN.md`.
- `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md`.
- All today's FOREMAN_REVIEWs (KB_MODULE_4 source).
- `roles/site-overseer/SITE_MAP.md` + `FUNNEL_ROADMAP.md` (KB_STOREFRONT + KB_FUNNEL_CAPI source).
- `docs/FB_CAPI.md` (KB_FUNNEL_CAPI source).
- Iron Rules 12, 21, 31, 32, 35.

## 13. Author Notes

This is what makes the campaign team genuinely autonomous. Yesterday we gave them roles; today we give them knowledge (task-routed, not overwhelming) + a learning mechanism (so they compound). After this, the Campaign Lead is to campaigns what I am to the project — full context, dispatches correctly, improves over time.

The split-with-MAP structure is the key insight from Daniel: don't drown the team in one giant doc; give them a router. Same reason CLAUDE.md stays under 400 lines and points elsewhere.

---

*End of Brief. Activation Prompt in sibling file `CAMPAIGN_KB_BUILD_ACTIVATION_PROMPT.md`.*
