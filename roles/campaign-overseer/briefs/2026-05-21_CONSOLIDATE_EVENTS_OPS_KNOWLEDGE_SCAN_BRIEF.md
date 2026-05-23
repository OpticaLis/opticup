# Brief — Deep Scan + Consolidate All Campaign Knowledge into the Events-Ops Skill

> **Sealed:** 2026-05-21 · **Author:** Campaign Lead · **Audience:** Claude Code (fresh session, Desktop preferred — repo git must be clean)
> **Mode:** SCAN → show findings → on Daniel's OK, CONSOLIDATE in the same session (no second round-trip).
> **Goal:** make `opticup-events-operations` the single, highest-quality skill for Module 4 / leads / events / campaign pages — with ZERO duplicated knowledge.

## 0. Why

Daniel consolidated the old multi-skill campaign team into ONE Cowork plugin skill: `opticup-events-operations`. The old 4 team skills (overseer, copywriter, performance-analyst, retrospective) are being retired. Before retiring them, their unique know-how must be folded into the knowledge the new skill reads — WITHOUT creating duplicate content. Some knowledge may already exist in the plugin and/or in `roles/campaign-overseer/knowledge/`; we must detect overlaps, not blindly copy.

## 1. What exists today (scan ALL of these)

- **New skill plugin (Cowork, user-level, NOT in repo):** `C:\Users\User\AppData\Roaming\Claude\local-agent-mode-sessions\skills-plugin\688e5fe0-95bf-4761-8e34-3f61cd7e700d\100a184d-7e0d-4dee-85a0-b2566cff0fc9\skills\opticup-events-operations\` — contains `SKILL.md` + `references/EVENTS_OPS_DECISIONS_LOG.md`. (In some mounts it appears at `.claude/skills/opticup-events-operations/`.)
- **Knowledge dir (repo):** `roles/campaign-overseer/knowledge/` — already has `CAMPAIGN_KB_MAP.md` + 5 KBs (KB_MODULE_4, KB_MESSAGING, KB_STOREFRONT, KB_STRATEGY, KB_FUNNEL_CAPI).
- **Old team skills being retired (repo `.claude/skills/`):** `opticup-campaign-overseer`, `opticup-campaign-copywriter`, `opticup-campaign-performance-analyst`, `opticup-campaign-retrospective`. Read each one's SKILL.md + references for its UNIQUE operational know-how.
- **Supporting:** `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md`, `docs/CRM_RULE_CHAINING.md`, `roles/_design/CAMPAIGN_TEAM_SKILLS_DESIGN.md`, `modules/Module 4 - CRM/docs/`, today's diagnosis + incident report under `modules/Module 4 - CRM/`.
- **KEEP (do NOT fold in):** `opticup-campaign-lead` — stays as the oversight/escalation layer.

## 2. Step 1 — SCAN (read-only) and produce a duplication map

For every piece of operational knowledge in the 4 retiring skills, classify it:
- **(a) already covered** in the plugin SKILL.md or in `knowledge/` → do nothing (cite where).
- **(b) partially covered** → note the gap to merge in.
- **(c) unique, not anywhere else** → must be captured.

Output a short findings table: source skill → knowledge item → status (a/b/c) → target location. Show Daniel this table before doing any writes.

## 3. Step 2 — CONSOLIDATE (after Daniel's OK)

Fold only the (b) and (c) items into `roles/campaign-overseer/knowledge/`, as a small number of focused playbook files (e.g. `PLAYBOOK_MESSAGING.md`, `PLAYBOOK_CONFIG_OPS.md`, `PLAYBOOK_ANALYSIS.md`, `PLAYBOOK_RETROSPECTIVE.md`) — but ONLY create a file if there's genuinely unique content for it; if a KB already covers it, extend the KB instead. No duplication (Iron Rule 21).

Then update `CAMPAIGN_KB_MAP.md` routing table so each task type points to the right file, and update the events-ops `SKILL.md` so its first action is "read CAMPAIGN_KB_MAP.md, then read only what the task routes to." The skill should reach ALL knowledge through the one MAP — not memorize many paths.

## 4. Trigger phrases the new skill must respond to

`opticup-events-operations` must load on ALL of these (Hebrew):
- "אחראי על מודול 4"
- "אחראי על מערכת הלידים"
- "אחראי על מערכת האירועים"
- "מנהל האירועים"
- "מנהל מערכת הלידים"

Add these to the skill's trigger list / description so any of them activates it.

## 5. Quality bar

The end state: `opticup-events-operations` is the single highest-quality counterpart for Module 4 — knows system structure, all automations, all logics, lead system, events, campaign landing pages + forms, direct storefront edit + Vercel deploy, the known bugs, and the safety rails (IR33 demo-first, IR34 live-verify, IR35 authority, storefront 24–30, merge-to-main = Daniel-only, message-send safety). One MAP routes it to all knowledge. Zero duplicate content anywhere.

## 6. Safety

- Read-only scan first; writes only after Daniel approves the duplication map.
- Repo writes go to `develop`; never merge to `main` (Daniel-only).
- If the Cowork VM git is unhealthy, run this on Desktop.
- Don't delete the 4 old skills as part of this (they're Cowork plugins; Daniel disables them via Cowork plugin management). This brief only consolidates KNOWLEDGE.

## 7. Handoff

Daniel opens a fresh Claude Code session and pastes this brief. Claude Code scans, shows the duplication map, and on approval consolidates. If anything is ambiguous, escalate to the Campaign Lead (`אתה האחראי על צוות הקמפיין`).

---

*Brief authored by Campaign Lead. Scan before write; no duplication; one MAP to rule them all.*
