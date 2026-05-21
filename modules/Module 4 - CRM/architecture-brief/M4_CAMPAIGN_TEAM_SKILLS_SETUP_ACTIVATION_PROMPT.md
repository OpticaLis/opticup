# M4_CAMPAIGN_TEAM_SKILLS_SETUP — Activation Prompt

Paste into a Claude Code session.

---

```
Run the Full-Auto Pipeline (Light) for M4_CAMPAIGN_TEAM_SKILLS_SETUP.

Brief: modules/Module 4 - CRM/architecture-brief/M4_CAMPAIGN_TEAM_SKILLS_SETUP_BRIEF.md

SPEC location: modules/Module 4 - CRM/docs/specs/M4_CAMPAIGN_TEAM_SKILLS_SETUP/SPEC.md

MANDATORY PRE-FLIGHT READING:
1. The Brief (full) — especially §3 (4 skills) + §5 D1-D7 + §4 safety audit.
2. roles/_design/CAMPAIGN_TEAM_SKILLS_DESIGN.md — the design source.
3. .claude/skills/opticup-architect/SKILL.md — the PATTERN TEMPLATE for the Campaign Lead skill (bootstrap, brief authoring, plain-Hebrew comms, no-git/no-code discipline, Steps 0.7-0.10). Campaign Lead mirrors this, campaign-scoped.
4. roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md — Iron Rule 35 boundary all skills respect.
5. roles/campaign-overseer/CAMPAIGN_OVERSEER_HANDOFF.md — existing overseer the Lead coordinates with.

MODEL: Opus for SKILL.md authoring (careful prose needed). Sonnet for folder/memory scaffolding.

LIGHT PIPELINE: Foreman → Executor → Reviewer → Foreman close. NO Localhost-Tester (no runtime surface).

CREATE 4 SKILLS (per Brief §3):
1. opticup-campaign-lead — MANAGER. Architect-style, campaign-scoped. Bootstrap reads campaign memory + roles/campaign-overseer/ + FUNNEL_ROADMAP + design system canon. Writes briefs to team, coordinates, returns plain-Hebrew strategy (one question at a time, recommendation+reason, NO technical detail, NO git, NO code). Triggers: "אתה האחראי על צוות הקמפיין", "אתה מנהל הקמפיין", "you are the campaign lead". Self-improving via CAMPAIGN_LEAD_DECISIONS_LOG.md.
2. opticup-campaign-performance-analyst — READ-ONLY. Real conversion rates from business-state columns (unsubscribed_at, purchase_amount), NEVER raw clicks (per memory feedback_clicks_are_not_actions). Triggers: "אתה אנליסט הקמפיין", "תנתח את מדדי הקמפיין".
3. opticup-campaign-copywriter — RECOMMEND-ONLY. Drafts SMS/Email/WhatsApp bodies (HE/EN/RU). NEVER invents placeholders (Iron Rule 35). Drafts → Daniel approval → Campaign Overseer applies. Triggers: "אתה כותב תוכן לקמפיין", "תכתוב הודעת SMS".
4. opticup-campaign-retrospective — READ-ONLY. Post-campaign learnings synthesis. Triggers: "אתה כותב רטרוספקטיבה", "תכתוב סיכום קמפיין".

KEY CONSTRAINTS:
- Per Iron Rule 32: Destructive ops = 0. Pure markdown skill-file creation.
- Cross-Module Safety Audit §4 BINDING. CREATE only the files in §4.1. NEVER touch §4.2 (existing skills, DB, EF, code, templates).
- Per Iron Rule 35: NO campaign skill adds placeholders/triggers/actions or touches EF/DB. Config application stays with Campaign Overseer.
- D3 authority modes: Lead=mgmt, Analyst=read-only, Copywriter=recommend-only, Retro=read-only.
- D5: plain-language for Daniel-facing output (comparison tables, no jargon).
- D6: English-only status lines per feedback_daniel_comms.
- Phase 2 roles (QA, Audience, Scheduler) NOT created — deferred per design.

PRE-FLIGHT CHECK:
- grep ALL proposed trigger phrases against existing skills (.claude/skills/*/SKILL.md frontmatter) to confirm NO collision. If a campaign-lead trigger overlaps campaign-overseer → resolve before creating.

VERIFICATION:
- 4 SKILL.md files with proper frontmatter (name, description, triggers).
- Each authority mode matches D3.
- roles/campaign-overseer/ has analyses/ + retrospectives/ + briefs/ subfolders (.gitkeep).
- Auto-memory bootstrap entry created.
- CAMPAIGN_TEAM_SKILLS_DESIGN.md marked Phase 1 implemented.
- Reviewer confirms no trigger collision (grep evidence).
- Iron Rule 31 + 32 pass.

POST-SPEC:
- Push to develop.
- Provide GitHub compare URL + PR title for Daniel to merge develop → main.
  Title: feat(skills): campaign team — lead + analyst + copywriter + retrospective (Phase 1).
- Surface a short English status line per user memory feedback_daniel_comms.

Note: skill changes live under .claude/skills/ which is git-tracked. If running in Cowork, the file-tool lock on .claude/skills/ applies — but this runs in Claude Code, which has write access.
```

---

*End of Activation Prompt. Brief contains §3 (4 skills) + §4 binding safety + §5 D1-D7 decisions.*
