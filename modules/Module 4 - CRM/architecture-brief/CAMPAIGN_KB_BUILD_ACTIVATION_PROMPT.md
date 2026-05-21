# CAMPAIGN_KB_BUILD — Activation Prompt

Paste into a Claude Code session. (Same session OK — doc work, no worktree needed.)

---

```
Run the Full-Auto Pipeline for CAMPAIGN_KB_BUILD.

Brief: modules/Module 4 - CRM/architecture-brief/CAMPAIGN_KB_BUILD_BRIEF.md

SPEC location: modules/Module 4 - CRM/docs/specs/CAMPAIGN_KB_BUILD/SPEC.md

MANDATORY PRE-FLIGHT READING:
1. The Brief (full) — §3 structure, §5 D1-D7, §4 safety audit.
2. CLAUDE.md — the "map not manual" pattern (template for CAMPAIGN_KB_MAP).
3. .claude/skills/opticup-architect/SKILL.md — the learning-loop + DECISIONS_LOG pattern to mirror.
4. roles/_design/CAMPAIGN_TEAM_SKILLS_DESIGN.md.
5. The 4 campaign skills created yesterday (.claude/skills/opticup-campaign-*).

MODEL: Opus for KB synthesis (needs judgment to distill, not dump). Sonnet for scaffolding.

PIPELINE: Foreman → Executor → Reviewer → Foreman close. No Localhost-Tester.

BUILD (per Brief §3):

1. MAP router — roles/campaign-overseer/knowledge/CAMPAIGN_KB_MAP.md (< 150 lines). Task→file routing table. Rule: read MAP first, read only what the task needs, NEVER the whole corpus.

2. 5-6 split KB files under roles/campaign-overseer/knowledge/ (each ≤ 350-400 lines, SYNTHESIZED not copied):
   - KB_MODULE_4.md — M4 architecture + ALL shipped improvements (CAPI hybrid + purchase events, dual-path fix, resend button, dashboards, short-links redesign, rate-limit hardening).
   - KB_MESSAGING.md — templates catalog + automations + triggers + placeholder contract + rule-chaining + Iron Rule 35 boundary.
   - KB_STOREFRONT.md — campaign pages (URLs) + forms + lead→registration→thank-you flow + pixel points.
   - KB_STRATEGY.md — business model + audience strategy + locked decisions + what worked/didn't.
   - KB_FUNNEL_CAPI.md — funnel measurement + FB CAPI (4 event types) + real-vs-raw metrics rule + dashboard meaning.
   - Split further if any exceeds target (document in MAP).

3. Wire 4 campaign skills to read MAP-first then route to relevant KB (per Brief §3.3).

4. Learning loop in opticup-campaign-lead (mirror opticup-architect):
   - Formalize CAMPAIGN_LEAD_DECISIONS_LOG.md (index format: situation → recommendation → Daniel response → reason → lesson).
   - Retrospective harvest: end-of-campaign pattern detection → KB + skill updates → LEARNINGS.md.
   - 3-strikes rule: corrected 3× on same issue → next session MUST promote to skill rule.
   - KB freshness: add checklist item to Integration Ceremony (Architect SKILL or CLAUDE.md §10) so new M4/campaign SPECs update the relevant KB file.

SOURCE MATERIAL (read-only):
- Today's FOREMAN_REVIEWs (KB_MODULE_4).
- crm_message_templates + crm_automation_rules (DB SELECT only — catalog them).
- M4_INFRASTRUCTURE_CONTRACT.md + docs/CRM_RULE_CHAINING.md (KB_MESSAGING).
- roles/site-overseer/SITE_MAP.md + FUNNEL_ROADMAP.md (KB_STOREFRONT + KB_FUNNEL_CAPI).
- docs/FB_CAPI.md (KB_FUNNEL_CAPI).
- campaign-overseer LEARNINGS + DECISIONS_LOG + launch-plan decisions (KB_STRATEGY).

KEY CONSTRAINTS:
- Per Iron Rule 32: Destructive ops = 0. Read + markdown + skill edits only.
- Cross-Module Safety §4 BINDING. NO DB writes, NO EF, NO code, NO template/rule changes. CREATE only files in §4.1.
- Per Iron Rule 35: KB reflects the boundary (config = Overseer, infra = Architect SPEC). Skills don't gain new authority.
- KB files SYNTHESIZED (curated references), not raw dumps.
- D2: task-routed reading is the contract. MAP routing table must be complete.
- Each KB ≤ size target; split if needed.

STOP TRIGGERS:
- Any KB synthesis needs a DB write → STOP.
- KB file 2× over target with no clean split → STOP, ask Daniel.
- Skill edit would change a campaign skill's authority mode → STOP.
- §4.3 violation. IR31 fail.

VERIFICATION:
- MAP < 150 lines, complete routing table.
- 5-6 KB files within targets, synthesized.
- 4 skills wired to MAP.
- Learning loop documented (decisions log + retro + 3-strikes + KB freshness).
- Zero DB writes (only SELECTs).
- IR31 + IR32 pass.

POST-SPEC:
- Push to develop.
- GitHub compare URL + PR title: feat(campaign): knowledge base (split + MAP router) + learning loop.
- Surface a short English status line per user memory feedback_daniel_comms.
```

---

*End of Activation Prompt. Brief contains the full split-KB structure, MAP routing, learning loop, and §4 binding safety audit.*
