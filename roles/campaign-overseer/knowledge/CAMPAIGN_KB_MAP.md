# Campaign Knowledge Base — MAP

> **This file is a ROUTER, not a manual.** It tells you which KB / PLAYBOOK file to read for which task.
> **The rule:** read this MAP first. Read ONLY the file(s) your task names. Never read the whole KB every session.
> **Mirror of:** `CLAUDE.md` at repo root (same map-not-manual pattern).
> **Audience:** the consolidated `opticup-events-operations` skill (primary) + the Campaign Lead (oversight) + any future Phase-2 skill.
> **Architecture (post-2026-05-22 consolidation):** 5 KB files are the canon (synthesized from authority surfaces). 4 PLAYBOOK files capture the operational HOW for each task family — extracted from the 4 retiring specialist skills (Overseer / Copywriter / Analyst / Retrospective). The history layer (`roles/events-operations/EVENTS_OPS_DECISIONS_LOG.md`) holds prior RECs + locked decisions. The MAP routes tasks to the right combination.
> **Authority over content:** every KB file lists its own source-of-truth references. The KB synthesizes; the upstream files (DB, `M4_INFRASTRUCTURE_CONTRACT`, `docs/FB_CAPI.md`, FOREMAN_REVIEWs, `SITE_MAP`) are authoritative if they disagree.

---

## 1. Routing table — task → which KB(s) + PLAYBOOK(s) to read

| If your task is… | Read these KBs | + PLAYBOOK | Authority surface |
|---|---|---|---|
| Apply / edit a template body, toggle a rule, schedule a broadcast | [`KB_MESSAGING`](KB_MESSAGING.md) + [`KB_MODULE_4`](KB_MODULE_4.md) | [`PLAYBOOK_CONFIG_OPS`](PLAYBOOK_CONFIG_OPS.md) | `M4_INFRASTRUCTURE_CONTRACT.md` (IR35 boundary) + Iron Rule 33 (demo-first) |
| Draft / refine a message body (SMS / Email / WhatsApp) | [`KB_MESSAGING`](KB_MESSAGING.md) + [`KB_STRATEGY`](KB_STRATEGY.md) | [`PLAYBOOK_MESSAGING`](PLAYBOOK_MESSAGING.md) | `M4_INFRASTRUCTURE_CONTRACT.md` §1 — canonical placeholder list |
| Analyze a campaign's performance (real conversion, unsub rate, deliverability) | [`KB_FUNNEL_CAPI`](KB_FUNNEL_CAPI.md) + [`KB_MODULE_4`](KB_MODULE_4.md) | [`PLAYBOOK_ANALYSIS`](PLAYBOOK_ANALYSIS.md) | Business-state columns first; see `KB_FUNNEL_CAPI` §1 real-vs-raw rule |
| Write a post-campaign retrospective | ALL (Module 4 + Messaging + Storefront + Strategy + Funnel/CAPI) | [`PLAYBOOK_RETROSPECTIVE`](PLAYBOOK_RETROSPECTIVE.md) | Performance analysis for the same period (if any) + `EVENTS_OPS_DECISIONS_LOG.md` historical context |
| Diagnose / fix an M4 bug | [`KB_MODULE_4`](KB_MODULE_4.md) | [`PLAYBOOK_CONFIG_OPS`](PLAYBOOK_CONFIG_OPS.md) §3 IR35 escalation | `modules/Module 4 - CRM/docs/MODULE_SPEC.md` + per-SPEC FOREMAN_REVIEWs |
| Edit a storefront campaign page + deploy to Vercel | [`KB_STOREFRONT`](KB_STOREFRONT.md) + [`KB_STRATEGY`](KB_STRATEGY.md) | — | `roles/site-overseer/SITE_MAP.md` (full route inventory) + storefront rules 24-30 |
| Plan campaign strategy / audience / timing | [`KB_STRATEGY`](KB_STRATEGY.md) + [`KB_FUNNEL_CAPI`](KB_FUNNEL_CAPI.md) | — | `roles/campaign-overseer/LEARNINGS.md` + `roles/events-operations/EVENTS_OPS_DECISIONS_LOG.md` |
| Understand M4 mechanics (CAPI, dispatch, rules, dashboards) | [`KB_MODULE_4`](KB_MODULE_4.md) | — | `modules/Module 4 - CRM/docs/MODULE_SPEC.md` + per-SPEC FOREMAN_REVIEWs |
| Check Iron Rule 35 boundary (am I about to cross into Architect SPEC territory?) | [`KB_MESSAGING`](KB_MESSAGING.md) §1 | [`PLAYBOOK_CONFIG_OPS`](PLAYBOOK_CONFIG_OPS.md) §3 | `CLAUDE.md` Iron Rule 35 + `M4_INFRASTRUCTURE_CONTRACT.md` |
| Decide whether a Daniel request needs the Lead vs Events-Ops | THIS MAP §3 + memory `project_campaign_team.md` | — | trigger disambiguation: "צוות" → Lead; without → Events-Ops |

If your task is NOT in this table → ask Daniel ONE Hebrew question to clarify before reading anything.

## 2. KB file inventory — one-line summary each

| KB file | Lines (target) | One-line scope |
|---|---|---|
| [`KB_MODULE_4`](KB_MODULE_4.md) | ≤ 400 | What M4 is + how it works + every shipped improvement (CAPI, purchase events, dual-path fix, resend, dashboards, short-links, rate-limit hardening, advisory lock) |
| [`KB_MESSAGING`](KB_MESSAGING.md) | ≤ 400 | Template catalog (16 base slugs × 2 tenants) + automation rules (14 active per tenant) + placeholder contract + rule-chaining + IR35 boundary |
| [`KB_STOREFRONT`](KB_STOREFRONT.md) | ≤ 400 | 12 active HE campaign pages + forms + lead→registration→thank-you flow + pixel firing points + CAPI back-wire |
| [`KB_STRATEGY`](KB_STRATEGY.md) | ≤ 350 | Prizma business model + SuperSale campaign + audience tiers + locked decisions + what worked / what didn't |
| [`KB_FUNNEL_CAPI`](KB_FUNNEL_CAPI.md) | ≤ 350 | Funnel Health Dashboard + Weekly Brief + FB CAPI 4-event chain + dedupe contract + real-vs-raw metrics rule |

## 2b. PLAYBOOK file inventory — operational HOW per task family

| PLAYBOOK file | Lines (target) | One-line scope |
|---|---|---|
| [`PLAYBOOK_CONFIG_OPS`](PLAYBOOK_CONFIG_OPS.md) | ≤ 200 | Demo-first promote flow + IR35 escalation rules + L-001/L-003/L-004 verify-before-write disciplines + operator-facing recovery surfaces + message-send safety |
| [`PLAYBOOK_MESSAGING`](PLAYBOOK_MESSAGING.md) | ≤ 200 | Worst-case substitution char count + channel decision tree (160/320/switch-channel) + multilingual scaffolding + Prizma tone canon + tone-continuity discipline |
| [`PLAYBOOK_ANALYSIS`](PLAYBOOK_ANALYSIS.md) | ≤ 250 | Analysis-mode flag + real-vs-raw rule + PostgREST cardinality + PII discipline + cohort sizing + diagnostic query crib sheet + L-005 Rule A live-flow check |
| [`PLAYBOOK_RETROSPECTIVE`](PLAYBOOK_RETROSPECTIVE.md) | ≤ 200 | When to write a retro + 3+3+patterns synthesis format + planned-vs-actual metric table + cross-retro pattern detection + KB delta harvest + owner-tagging |

If a KB ever exceeds its target → split (e.g., `KB_MESSAGING` → `KB_MESSAGING_TEMPLATES` + `KB_MESSAGING_AUTOMATION`) and document the split in this MAP. PLAYBOOKs follow the same discipline.

## 3. Disambiguation — Lead vs Events-Operations (post-2026-05-22)

Daniel says "אתה האחראי על צוות הקמפיין" → Campaign **Lead** (oversight/escalation layer). Reads MAP + escalates to Daniel for strategy decisions.
Daniel says "אתה אחראי על מודול 4" / "אתה אחראי על מערכת הלידים" / "אתה אחראי על מערכת האירועים" / "אתה מנהל האירועים" / "אתה מנהל מערכת הלידים" → consolidated **Events-Operations** skill. Reads MAP + works hands-on (config ops + bug fixing + storefront edits + analysis + retrospective). All operational work that used to be split across Overseer / Copywriter / Analyst / Retrospective now flows through this one skill.

The Campaign Lead becomes oversight only — if a problem arises with Events-Operations work, Daniel returns to the Lead to supervise. See `project_campaign_team.md` memory for the consolidation rationale + the now-retired 4-skill split.

## 4. KB + PLAYBOOK freshness

This MAP + the 5 KB files + 4 PLAYBOOK files are SYNTHESIZED snapshots. They go stale when M4 ships new SPECs, when templates/rules change, when campaign strategy locks new decisions, or when a new operational discipline is locked.

**Refresh trigger:** every M4 / campaign SPEC close (Integration Ceremony per `CLAUDE.md` §10 step 8) updates the matching file(s). The Architect's close-ceremony checklist includes "did this SPEC affect any KB or PLAYBOOK? If yes, update it in the same merge."

If a KB / PLAYBOOK conflicts with its authority surface (column 4 of §1), the authority surface wins — file a delta against the file.

## 5. Anti-patterns — do not

- Do NOT read all 5 KBs + 4 PLAYBOOKs at session start. Read this MAP, then only the file(s) your task names.
- Do NOT copy KB / PLAYBOOK content into your reply to Daniel verbatim. Daniel does not read KB-level detail — he gets plain Hebrew operational translation.
- Do NOT treat the KB / PLAYBOOK as authoritative when `M4_INFRASTRUCTURE_CONTRACT.md` / `docs/FB_CAPI.md` / DB / FOREMAN_REVIEW disagrees. Those are sources of truth; the KB / PLAYBOOK is a synthesis.
- Do NOT update a KB / PLAYBOOK file inline during a campaign session. Updates flow through SPEC closure (Integration Ceremony) so they are reviewed, not ad-hoc'd.
- Do NOT read the retiring `.claude/skills/opticup-campaign-{overseer,copywriter,performance-analyst,retrospective}/SKILL.md` files for operational discipline — those files are dormant (Cowork plugin disabled by Daniel). The PLAYBOOKs are the live source.

---

*MAP version: 2026-05-22 v2 (post-consolidation). Adds PLAYBOOK layer, updates routing for the consolidated `opticup-events-operations` skill, retires the 4-specialist routing model. Maintained by the Architect's Integration-Ceremony checklist hook.*
