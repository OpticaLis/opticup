# Campaign Knowledge Base — MAP

> **This file is a ROUTER, not a manual.** It tells you which KB file to read for which task.
> **The rule:** read this MAP first. Read ONLY the KB file(s) your task names. Never read the whole KB every session.
> **Mirror of:** `CLAUDE.md` at repo root (same map-not-manual pattern).
> **Audience:** the 4 campaign skills (Lead + Analyst + Copywriter + Retrospective) and any future Phase-2 skill.
> **Authority over content:** every KB file lists its own source-of-truth references. The KB synthesizes; the upstream files (DB, M4_INFRASTRUCTURE_CONTRACT, FB_CAPI.md, FOREMAN_REVIEWs, SITE_MAP) are authoritative if they disagree.

---

## 1. Routing table — task → which KB(s) to read

| If your task is… | Read these KBs | Authority surface |
|---|---|---|
| Draft / refine a message body (SMS / Email / WhatsApp) | [`KB_MESSAGING`](KB_MESSAGING.md) + [`KB_STRATEGY`](KB_STRATEGY.md) | `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md` §1 — canonical placeholder list |
| Analyze a campaign's performance (real conversion, unsub rate, deliverability) | [`KB_FUNNEL_CAPI`](KB_FUNNEL_CAPI.md) + [`KB_MODULE_4`](KB_MODULE_4.md) | Business-state columns first; see KB_FUNNEL_CAPI §"real-vs-raw rule" |
| Design or audit a campaign landing/thank-you/registration page | [`KB_STOREFRONT`](KB_STOREFRONT.md) | `roles/site-overseer/SITE_MAP.md` (full route inventory) |
| Plan campaign strategy / audience / timing | [`KB_STRATEGY`](KB_STRATEGY.md) + [`KB_FUNNEL_CAPI`](KB_FUNNEL_CAPI.md) | `roles/campaign-overseer/LEARNINGS.md` + `DECISIONS_LOG.md` |
| Write a post-campaign retrospective | ALL (Module 4 + Messaging + Storefront + Strategy + Funnel/CAPI) | Performance Analyst's analysis for the same period (if any) |
| Understand M4 mechanics (CAPI, dispatch, rules, dashboards) | [`KB_MODULE_4`](KB_MODULE_4.md) | `modules/Module 4 - CRM/docs/MODULE_SPEC.md` + per-SPEC FOREMAN_REVIEWs |
| Check Iron Rule 35 boundary (am I about to cross into Architect SPEC territory?) | [`KB_MESSAGING`](KB_MESSAGING.md) §"IR35 boundary" | `CLAUDE.md` Iron Rule 35 + `M4_INFRASTRUCTURE_CONTRACT.md` |
| Brief a specialist (Lead → Analyst/Copywriter/Retrospective) | THIS MAP + the target specialist's pre-route | `.claude/skills/opticup-campaign-lead/references/BRIEF_TEMPLATE.md` |
| Decide whether a Daniel request needs the Lead vs the Overseer | THIS MAP §3 + memory `project_campaign_team.md` | trigger disambiguation: "צוות" → Lead; without → Overseer |

If your task is NOT in this table → ask Daniel ONE Hebrew question to clarify before reading anything.

## 2. KB file inventory — one-line summary each

| KB file | Lines (target) | One-line scope |
|---|---|---|
| [`KB_MODULE_4`](KB_MODULE_4.md) | ≤ 400 | What M4 is + how it works + every shipped improvement (CAPI, purchase events, dual-path fix, resend, dashboards, short-links, rate-limit hardening, advisory lock) |
| [`KB_MESSAGING`](KB_MESSAGING.md) | ≤ 400 | Template catalog (16 base slugs × 2 tenants) + automation rules (14 active per tenant) + placeholder contract + rule-chaining + IR35 boundary |
| [`KB_STOREFRONT`](KB_STOREFRONT.md) | ≤ 400 | 12 active HE campaign pages + forms + lead→registration→thank-you flow + pixel firing points + CAPI back-wire |
| [`KB_STRATEGY`](KB_STRATEGY.md) | ≤ 350 | Prizma business model + SuperSale campaign + audience tiers + locked decisions + what worked / what didn't |
| [`KB_FUNNEL_CAPI`](KB_FUNNEL_CAPI.md) | ≤ 350 | Funnel Health Dashboard + Weekly Brief + FB CAPI 4-event chain + dedupe contract + real-vs-raw metrics rule |

If a KB ever exceeds its target → split (e.g., KB_MESSAGING → KB_MESSAGING_TEMPLATES + KB_MESSAGING_AUTOMATION) and document the split in this MAP.

## 3. Disambiguation — Lead vs Overseer (most-common confusion)

Daniel says "אתה האחראי על צוות הקמפיין" → Campaign **Lead** (manager). Reads MAP + dispatches.
Daniel says "אתה האחראי על הקמפיין" (no "צוות") → Campaign **Overseer** (config operator). Reads `CAMPAIGN_OVERSEER_HANDOFF.md` + applies config to DB.

Both skills coexist. Trigger phrase carries the discriminator (`צוות` keyword). See `project_campaign_team.md` memory for the full routing table including all 4 specialist triggers.

## 4. KB freshness

This MAP and the 5 KB files are SYNTHESIZED snapshots. They go stale when M4 ships new SPECs, when templates/rules change, or when campaign strategy locks new decisions.

**Refresh trigger:** every M4 / campaign SPEC close (Integration Ceremony per `CLAUDE.md` §10) updates the matching KB file. The Architect's close-ceremony checklist includes "did this SPEC affect any KB file? If yes, update it in the same merge."

If a KB conflicts with the authority surface (column 3 of §1), the authority surface wins — file a delta against the KB.

## 5. Anti-patterns — do not

- Do NOT read all 5 KB files at session start. Read this MAP, then the file(s) the task names.
- Do NOT copy KB content into your reply to Daniel. Daniel does not read KB-level detail — he gets plain Hebrew strategic translation from the Lead.
- Do NOT treat the KB as authoritative when M4_INFRASTRUCTURE_CONTRACT.md / FB_CAPI.md / DB / FOREMAN_REVIEW disagrees. Those are sources of truth; the KB is a synthesis.
- Do NOT update a KB file inline during a campaign session. KB updates flow through SPEC closure (Integration Ceremony) so they are reviewed, not ad-hoc'd.

---

*MAP version: 2026-05-21 v1 (initial). Maintained by `opticup-campaign-lead` skill's Integration-Ceremony checklist hook.*
