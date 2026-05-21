# Campaign Team Skills Design
## 6-Role Architecture for Optic Up Autonomous Marketing Operations

**Authored by:** opticup-localhost-tester (Mission 10)
**Date:** 2026-05-20
**Status:** **Phase 1 IMPLEMENTED 2026-05-21** via `M4_CAMPAIGN_TEAM_SKILLS_SETUP` SPEC. Phase 1 shipped 4 skills (with the Campaign Lead manager layer added per Daniel's request — not in the original 6-role design): `opticup-campaign-lead`, `opticup-campaign-performance-analyst`, `opticup-campaign-copywriter`, `opticup-campaign-retrospective`. Phase 2 (QA-pre-flight, Audience Manager, Scheduler) remains deferred per §6 below. See `modules/Module 4 - CRM/docs/specs/M4_CAMPAIGN_TEAM_SKILLS_SETUP/SPEC.md` for the implementation record and `modules/Module 4 - CRM/architecture-brief/M4_CAMPAIGN_TEAM_SKILLS_SETUP_BRIEF.md` for the Phase 1 scope.
**References read:** `roles/campaign-overseer/CAMPAIGN_OVERSEER_HANDOFF.md`, `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md`, `roles/site-overseer/SITE_OVERSEER_HANDOFF.md`, `roles/site-overseer/FUNNEL_ROADMAP.md`, `.claude/skills/opticup-campaign-overseer/SKILL.md` (inferred via loading context)

---

## 1. Design Principles

The campaign team exists to fulfil Daniel's north-star directive: *"Marketing funnels at the level of companies that spend millions — always improving, knowing how to improve, eventually autonomously."*

Three constraints shape the design:

**Constraint 1 — Iron Rule 35 boundary.** The existing Campaign Overseer established the authority boundary: config edits (templates, rules, schedules) are Campaign Overseer territory; infrastructure (new placeholders, new trigger types, EF code, DB triggers) requires an Architect SPEC. All 6 roles must respect this same boundary.

**Constraint 2 — Recommend-Only (v1) default.** New roles should launch in Recommend-Only mode (like Campaign Overseer) unless they are purely read-only analytical roles. Human review (Daniel) on every action until a 90% acceptance gate is reached over 30 decisions.

**Constraint 3 — Reuse before creating.** Two existing roles cover substantial ground: Campaign Overseer + Site Overseer. New skills should extend or specialize existing ones where possible.

---

## 2. Existing Coverage Map

| Existing Role | What It Covers | What It Lacks |
|---|---|---|
| opticup-campaign-overseer | Template wording, rule trigger conditions, broadcast schedules, audience filters, active/inactive flags | Performance analysis, creative optimization, audience segmentation strategy, multi-channel attribution |
| opticup-site-overseer | Storefront site architecture, funnel measurement, URL/UTM strategy, Lighthouse perf monitoring | Campaign copywriting, audience personas, A/B testing, post-campaign analysis |

**Gap analysis:** Between the two existing roles, the gaps are:
1. Campaign performance analytics (reading signals, diagnosing underperformance)
2. Campaign copywriting + creative direction
3. Audience/segmentation management (which leads get which messages)
4. Quality assurance before sends (template validation, audience sanity checks)
5. Post-campaign retrospectives + learning capture

---

## 3. The 6 Roles

---

### Role 1: opticup-campaign-performance-analyst

**Skill name:** `opticup-campaign-performance-analyst`

**Trigger phrases:**
- Hebrew: "אתה אנליסט הקמפיין", "אתה אחראי על מדדי הקמפיין", "ניתוח ביצועי קמפיין", "תנתח את מדדי הקמפיין"
- English: "you are the campaign analyst", "analyze campaign performance", "campaign metrics review", "funnel performance analysis"

**Primary domain:**
Reads funnel and campaign metrics from the Funnel Health Dashboard, Weekly Brief, broadcast logs, and CAPI dispatch data. Computes real conversion rates (using business-state columns like `unsubscribed_at`, `purchase_amount`, not raw click events). Surfaces actionable insights: which broadcasts underperformed, which templates have high real-unsub rates, which lead cohorts convert best. Writes analyses to `roles/campaign-overseer/LEARNINGS.md` and the DECISIONS_LOG.

**Boundary (does NOT):**
- Does NOT modify any template, rule, or broadcast
- Does NOT insert, update, or delete any lead or attendee
- Does NOT access Prizma production data directly (reads aggregated views only, or explicitly scoped reads on Prizma with explicit Daniel authorization)
- Does NOT make recommendations about EF code, DB schema, or trigger types

**Files consumed:**
- `roles/site-overseer/FUNNEL_ROADMAP.md`
- `roles/campaign-overseer/LEARNINGS.md`
- `roles/campaign-overseer/CAMPAIGN_OVERSEER_HANDOFF.md`
- `docs/guardian/GUARDIAN_ALERTS.md` (Sentinel data)
- DB reads: `mv_funnel_health_dashboard`, `funnel_weekly_briefs`, `crm_message_log`, `crm_broadcasts`, `short_link_clicks`, `crm_capi_dispatch_queue`

**Handoff format:**
- Input: "Analyze campaign X for the period Y" or "Which templates underperformed last week?"
- Output: structured findings doc in `roles/campaign-overseer/analyses/{YYYY-MM-DD}_{SLUG}.md` with: metric table, diagnosis, proposed next actions (ranked by ROI), escalations needed

**Authority boundary:** READ-ONLY everywhere. Writes only to `roles/campaign-overseer/` analysis files.

**Reuse vs new:** NEW skill. Not covered by Campaign Overseer (which is config-only) or Site Overseer (which is site/funnel architecture-only, not per-campaign analysis).

---

### Role 2: opticup-campaign-copywriter

**Skill name:** `opticup-campaign-copywriter`

**Trigger phrases:**
- Hebrew: "אתה כותב תוכן לקמפיין", "תכתוב הודעת SMS", "תכתוב תוכן לקמפיין", "כותב הקמפיין"
- English: "you are the campaign copywriter", "write campaign copy", "draft SMS message", "write template content"

**Primary domain:**
Authors and refines SMS/WhatsApp/email template bodies for Prizma's marketing campaigns. Knows the documented placeholder contract (all variables in `M4_INFRASTRUCTURE_CONTRACT.md` §1) and NEVER invents new placeholders. Understands Hebrew/English/Russian copy needs for Prizma's multilingual audience. Optimizes for: character limits (SMS 160-char segments), call-to-action clarity, urgency, cultural appropriateness. Works within Iron Rule 35: edits `body` and `subject` of existing templates only, using only already-declared placeholders.

**Boundary (does NOT):**
- Does NOT add new `%var_name%` placeholders (Architect SPEC required)
- Does NOT change `template_slug`, `channel`, `language` on templates (structural — Architect SPEC)
- Does NOT activate/deactivate templates without Campaign Overseer review
- Does NOT write copy that references undocumented business values (hardcoded prices, addresses, phone numbers — these must come from config/placeholders per Iron Rule 9)

**Files consumed:**
- `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md` §"Variable Contract"
- `roles/campaign-overseer/CAMPAIGN_OVERSEER_HANDOFF.md`
- Iron Rule 35 in `CLAUDE.md`

**Handoff format:**
- Input: "Write a Hebrew SMS for the `will_open_tomorrow` trigger for the May event"
- Output: Draft template body (Hebrew + English + Russian variants if applicable) presented to Campaign Overseer for config application and to Daniel for approval. NEVER applies to DB without Campaign Overseer acting as executor.

**Authority boundary:** READ-ONLY on all DB tables. Writes only draft documents. Campaign Overseer applies the approved copy.

**Reuse vs new:** Could be framed as a specialized mode of opticup-campaign-overseer. However, the creative/copywriting function is distinct enough from config management to warrant its own role (separation of "what to say" from "when to say it"). Recommend as a SEPARATE skill.

---

### Role 3: opticup-campaign-qa (extends Campaign Overseer)

**Skill name:** `opticup-campaign-qa`

**Trigger phrases:**
- Hebrew: "אתה בודק קמפיין", "בדוק את הקמפיין לפני שליחה", "QA לקמפיין", "סינון האוכלוסייה"
- English: "you are the campaign QA", "validate campaign before send", "check broadcast audience", "campaign pre-flight check"

**Primary domain:**
Pre-send validation of broadcasts and automation rules. Checks: (1) template variable substitution will succeed for the target audience (counts leads with null values for each used placeholder), (2) audience filter sanity (how many leads will actually receive this?), (3) unsubscribed leads excluded, (4) test_mode_sms_allowlist not masking real sends accidentally, (5) broadcast_id propagation will work for the target message path, (6) no duplicate broadcasts (same leads already messaged by this template in X days). Writes a QA report to `campaigns/supersale/qa-checks/` or equivalent.

**Boundary (does NOT):**
- Does NOT modify any template or rule
- Does NOT send any message
- Does NOT create broadcast rows
- Does NOT write to Prizma production data

**Files consumed:**
- `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md`
- `docs/CRM_RULE_CHAINING.md`
- DB reads: `crm_message_templates`, `crm_leads`, `crm_automation_rules`, `crm_broadcasts`, `crm_message_log` (for duplicate-send check)

**Handoff format:**
- Input: "Pre-flight check broadcast B before we send to 1,135 leads"
- Output: QA report with: audience size, potential failures (null placeholders, unsubscribed count), duplicate-send risk, pass/fail verdict, list of leads to investigate before send

**Authority boundary:** READ-ONLY on all DB tables. Writes only to QA report files.

**Reuse vs new:** Could be a mode of Campaign Overseer. However, QA focus (read, validate, flag) is distinct from Campaign Overseer config mode. Could also be a built-in checklist within Campaign Overseer. **Recommend: integrate into Campaign Overseer as a `qa_preflight` action** rather than a separate skill — reduces skill sprawl.

---

### Role 4: opticup-audience-manager

**Skill name:** `opticup-audience-manager`

**Trigger phrases:**
- Hebrew: "אתה מנהל הקהל", "תנתח את קהל הלידים", "פילוח קהל", "אסטרטגיית לידים"
- English: "you are the audience manager", "analyze lead audience", "segment leads", "lead cohort analysis"

**Primary domain:**
Analyzes and recommends lead segmentation strategy. Reads `crm_leads` demographics (language, city, status, UTM source), `crm_event_attendees` history, and `crm_lead_touchpoints` to understand: who responds to which messages, which cohorts purchase vs cancel, optimal re-engagement timing for no-shows. Produces audience segments as SQL filter criteria recommendations (not applied automatically). Manages the lifecycle: new → invited → confirmed → attended → purchased.

**Boundary (does NOT):**
- Does NOT modify lead records (status, phone, email, notes)
- Does NOT create or delete leads
- Does NOT modify automation rules or template targeting criteria directly
- Does NOT access leads' PII beyond what's needed for cohort analysis (no raw phone/email in outputs)

**Files consumed:**
- `roles/campaign-overseer/CAMPAIGN_OVERSEER_HANDOFF.md`
- DB reads: `crm_leads`, `crm_event_attendees`, `crm_lead_touchpoints`, `crm_statuses`

**Handoff format:**
- Input: "Which lead segments should we target for the next event?"
- Output: segment definition document with: filter criteria (SQL-compatible), estimated audience size per segment, recommended message timing, historical response rates for similar segments

**Authority boundary:** READ-ONLY on all DB tables. Writes to `campaigns/` or `roles/campaign-overseer/` strategy docs.

**Reuse vs new:** PARTIAL OVERLAP with Performance Analyst (Role 1). Could be merged or structured as a sub-capability. Recommend: **Phase 2** — defer until the Performance Analyst + Copywriter + Campaign QA prove their value. The audience management function can be served by Campaign Overseer + Performance Analyst in Phase 1.

---

### Role 5: opticup-campaign-scheduler

**Skill name:** `opticup-campaign-scheduler`

**Trigger phrases:**
- Hebrew: "אתה מתזמן הקמפיין", "תכנן את לוח הזמנים", "מתי לשלוח", "תזמון קמפיין"
- English: "you are the campaign scheduler", "schedule the campaign", "timing strategy", "when to send"

**Primary domain:**
Optimizes broadcast and automation rule timing. Analyzes `crm_message_log` delivery patterns vs response rates by time-of-day and day-of-week. Recommends optimal send windows (Israeli audience: Sunday-Thursday, 10am-8pm Israel time typically performs best). Manages `crm_broadcasts.scheduled_at` and automation rule `trigger_condition` timing parameters. Works with Campaign Overseer to apply timing changes.

**Boundary (does NOT):**
- Does NOT directly modify broadcasts or automation rules (recommends to Campaign Overseer)
- Does NOT send messages
- Does NOT change template content or placeholders

**Files consumed:**
- `roles/campaign-overseer/CAMPAIGN_OVERSEER_HANDOFF.md`
- `roles/site-overseer/FUNNEL_ROADMAP.md`
- DB reads: `crm_message_log` (timing analysis), `crm_broadcasts`, `crm_automation_rules`

**Handoff format:**
- Input: "What's the optimal time to send the מחר אירוע message?"
- Output: timing recommendation with: evidence from historical send performance, recommended send_at value, rationale

**Authority boundary:** READ-ONLY on DB. Recommendations flow through Campaign Overseer for application.

**Reuse vs new:** SIGNIFICANT OVERLAP with Campaign Overseer (which already manages rule trigger conditions + broadcast schedules). The scheduling function might be too narrow to justify its own skill. **Recommend: defer to Phase 2 OR integrate as a specialized analysis within Performance Analyst or Campaign Overseer.** A standalone Scheduler skill risks becoming a thin wrapper.

---

### Role 6: opticup-campaign-retrospective

**Skill name:** `opticup-campaign-retrospective`

**Trigger phrases:**
- Hebrew: "אתה כותב רטרוספקטיבה", "תכתוב סיכום קמפיין", "מה למדנו מהקמפיין", "רטרו קמפיין"
- English: "you are the campaign retrospective", "write campaign retrospective", "post-campaign review", "what did we learn"

**Primary domain:**
After a campaign or event concludes, synthesizes the learnings: what messaging worked, what audience responded, what CAPI data showed, what to do differently next time. Writes structured retrospective documents to `roles/campaign-overseer/LEARNINGS.md` and to the campaign DECISIONS_LOG. References prior retrospectives to detect recurring patterns. Proposes new Campaign Overseer or Architect SPEC requests based on learnings.

**Boundary (does NOT):**
- Does NOT modify any live campaign configuration
- Does NOT send messages or create broadcasts
- Does NOT make infrastructure changes

**Files consumed:**
- `roles/campaign-overseer/LEARNINGS.md`
- `roles/campaign-overseer/DECISIONS_LOG.md`
- `campaigns/supersale/` and equivalent campaign folders
- DB reads (post-campaign): `crm_message_log`, `crm_broadcasts`, `crm_event_attendees`, `crm_capi_dispatch_queue`

**Handoff format:**
- Input: "Write a retrospective for the May 2026 SuperSale event"
- Output: structured retrospective in `roles/campaign-overseer/retrospectives/{event-slug}-{date}.md` covering: what was planned, what happened, key metrics, 3 things to repeat, 3 things to change, SPEC requests triggered

**Authority boundary:** READ-ONLY on DB. Writes only to `roles/` retrospective docs.

**Reuse vs new:** NEW skill. No existing role fills the post-campaign learning capture function. However, this role could also be implemented as a periodic opticup-campaign-overseer action. **Recommend Phase 1 if lightweight enough; defer to Phase 2 if complexity is high.**

---

## 4. Current Coverage Matrix

| Function | Campaign Overseer | Site Overseer | Performance Analyst | Copywriter | QA | Audience Mgr | Scheduler | Retrospective |
|---|---|---|---|---|---|---|---|---|
| Template config (body, conditions) | ✅ | — | — | drafts only | validates | — | — | — |
| Broadcast scheduling | ✅ | — | — | — | — | — | recommends | — |
| Funnel measurement | — | ✅ | reads | — | — | — | — | — |
| Per-broadcast analysis | — | — | ✅ NEW | — | — | — | — | — |
| Copy generation | — | — | — | ✅ NEW | reviews | — | — | — |
| Pre-send validation | partial | — | — | — | ✅ NEW | — | — | — |
| Audience segmentation | — | partial | partial | — | partial | ✅ NEW | — | — |
| Timing optimization | partial | — | partial | — | — | — | ✅ NEW | — |
| Learning capture | — | partial | — | — | — | — | — | ✅ NEW |

**Legend: ✅ = primary, partial = secondary coverage, — = not covered**

---

## 5. Handoff Flow Diagram

```
[Campaign Planning]
      ↓
Copywriter drafts template copy
      ↓
Campaign Overseer applies config (template body, rule conditions)
      ↓
Campaign QA runs pre-flight check
      ↓ (QA pass)
Campaign Overseer sets broadcast schedule
      ↓
[Campaign Runs Autonomously]
      ↓
Performance Analyst monitors mid-campaign metrics (CTR, real-unsubs)
      ↓ (finding: low CTR on RU segment)
Performance Analyst → Copywriter: "RU template underperforming, suggest rewrite"
Copywriter → Campaign Overseer: new RU draft
Campaign Overseer applies
      ↓
[Post-Campaign]
      ↓
Performance Analyst: final metric summary
Retrospective: learnings doc + SPEC requests
      ↓ (SPEC request)
Architect: reviews, authors SPEC if new infrastructure needed
```

---

## 6. Phase 1 vs Phase 2 Recommendation

### Phase 1 (Create these 2-3 roles immediately after night-run)

**Role 1 — opticup-campaign-performance-analyst** (HIGH PRIORITY)
- Fills the biggest gap: today there is no structured analysis layer between raw DB data and Campaign Overseer decisions
- The 3 regressions caught today in M4_SHORT_LINKS_DASHBOARD_REDESIGN (click vs action, PostgREST 1000-row limit, bot noise) were all metrics-interpretation failures that an analyst role would have caught
- Directly addresses Daniel's "always know how to improve" directive

**Role 2 — opticup-campaign-copywriter** (HIGH PRIORITY)
- Prizma runs HE + EN + RU templates; copy quality is a marketing constraint, not a technical one
- Campaign Overseer currently does not specialize in copy quality — it manages configuration
- Low technical risk (read-only DB, writes to docs only)

**Recommendation for QA integration:** integrate Campaign QA as a named checklist/protocol within Campaign Overseer rather than a separate skill (reduces skill proliferation)

### Phase 2 (Defer these roles)

**Role 4 — opticup-audience-manager:** Defer until Phase 1 roles prove value and audience segmentation needs exceed what Performance Analyst + Campaign Overseer can handle

**Role 5 — opticup-campaign-scheduler:** Defer; integrate timing analysis into Performance Analyst output

**Role 6 — opticup-campaign-retrospective:** Defer; integrate retrospective into Performance Analyst or make it a Campaign Overseer periodic action

---

## 7. Implementation Notes for the SPEC

### Skill naming convention
Follow existing pattern: `opticup-{role}` (lowercase, hyphenated)

### Skill file locations
`.claude/skills/opticup-campaign-performance-analyst/SKILL.md`  
`.claude/skills/opticup-campaign-copywriter/SKILL.md`

### Boundary enforcement
Both Phase 1 skills must include:
1. An explicit section mirroring Iron Rule 35 (Campaign Overseer authority boundary)
2. The M4_INFRASTRUCTURE_CONTRACT.md reference as mandatory first-read
3. Recommend-Only mode launch (no autonomous DB writes)
4. DECISIONS_LOG appended for every recommendation acted upon (Daniel-decides gate)

### Trigger registration
The existing opticup-campaign-overseer skill's trigger list in SKILL.md should be updated to NOT overlap with the new analyst/copywriter trigger phrases, preventing ambiguous skill loading.

---

*Mission 10 design complete. Total: 6 roles designed, 2 recommended for Phase 1 implementation.*
