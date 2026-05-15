# Module 4 (CRM) — Deep Audit + Industry Best Practices Analysis

**Brief version:** v1
**Date:** 2026-05-13
**Author:** Architect (`opticup-architect` skill)
**Hand-off to:** Full Auto Pipeline (single chat, read-only investigation, ~2-3 hours)
**Owning module:** Module 4 — CRM
**Mode:** READ-ONLY — no file changes, no DB writes, no commits. Final deliverable is a single comprehensive report.

---

## 1. Purpose

Module 4 (CRM) is in production since the 2026-05-03 cutover. It works. But Daniel wants to know: **is it best-in-class?** Could a fresh expert review identify structural issues that have been invisible because we built it piece by piece? Where does it lag behind industry-leading CRM systems? What from the market should we steal?

This Brief authorizes a fresh Pipeline run to:
1. **Audit the current Module 4 structure** — DB schema, code organization, views, RPCs, EFs, business logic flow. Identify any logical/structural weaknesses regardless of severity.
2. **Investigate two specific known issues** (see §3) that Daniel surfaced in conversation on 2026-05-13.
3. **Take inspiration from leading CRM systems** — research how Salesforce Health Cloud, HubSpot, Pipedrive, Cliniko (medical), Jane App (clinics + optics), and Phorest (appointments + clients) handle the core entities Optic Up handles: leads, events/appointments, attendees/patients, status transitions, broadcasts, automation, segmentation, reporting.
4. **Adapt those patterns to Optic Up's reality** — optical stores + medical-style clinics (eye exams, prescriptions). NOT generic enterprise. The recommendations must respect:
   - Israeli market (Hebrew RTL, SMS-first, WhatsApp prevalent, less email usage than US/EU)
   - Multi-tenant SaaS architecture (every recommendation must scale to N tenants, never be hardcoded for Prizma)
   - Small-team operation (1-5 staff per optical store; recommendations should not require an admin team)
   - Existing investment (don't propose ripping out and rebuilding — propose evolution paths)
5. **Produce a single deliverable:** a markdown report at `modules/Module 4 - CRM/docs/audits/M4_DEEP_AUDIT_2026_05_13.md` with structured findings + recommendations + priority ranking.

This is a strategic intelligence task, not an implementation task. NO SPECS are authored from this Brief. The report becomes input for future strategic decisions Daniel + Architect make together.

---

## 2. Constraints

- **READ-ONLY.** No file modifications. No DB writes. No commits. No git changes whatsoever. Use `git status` only to confirm baseline; never `git add`, `git commit`, `git push`, `git rebase`, `git reset`.
- **Demo OR Prizma read access OK.** All SQL queries must be `SELECT` only. Any `INSERT`/`UPDATE`/`DELETE`/`DDL` is forbidden, regardless of tenant.
- **Web research is encouraged** — read Salesforce/HubSpot/Pipedrive/Cliniko/Jane App documentation, blog posts, comparison articles. Quote the source URLs in the report.
- **No SPECs authored.** The report is the deliverable. SPECs come later, per Architect+Daniel decision.
- **Can run in parallel** with the active Executor working on `BROADCAST_EVENT_LINK_SUPPORT` — this Brief touches NO files the Executor touches. Coordinate at startup by reading what's currently in flight, then proceed independently.
- **Hebrew-aware.** All findings about UI/UX must consider RTL Hebrew. All recommendations must be plausible in Hebrew.
- **Time budget:** ~2-3 hours of investigation + research + writeup. Stop and ship report even if not perfect.

---

## 3. Two Specific Known Issues — Investigate Both, Recommend Fixes

These are real issues Daniel surfaced on 2026-05-13. The audit must investigate them concretely and propose specific fixes IN THE REPORT (do NOT author SPECs).

### Issue 3.1 — "Invited" attendees occupy event capacity but UI hides it

**Symptom (Daniel's words, 2026-05-13):** "ברגע שמישהו נכנס למערכת האירועים ויש אירוע פתוח, זה שולח לו קישור להרשמה. הבעיה היא שהוא מתווסף לאירוע תחת הכותרת 'הוזמן' ולמרות שויזואלית לא נראה שהוא תופס מקום, הוא תופס אותו ויש מקום אחד פחות להרשמה."

**Concrete data confirming the bug (verified via Supabase MCP on 2026-05-13 22:30 IL):**
- Event #24 `a7c9f174-a099-48b7-88bb-e4d0fa6236e2` shows `max_capacity=50`, 13 attendees split into 10 `registered` + 3 `invited`.
- `v_crm_event_stats` returns `total_registered=13` and `spots_remaining=37` — both counting `invited`.
- UI counter (`crm.html` events tab) was previously patched (`ATTENDEE_COUNTER_DISPLAY_FIX`, 2026-05-04) to display only `registered+confirmed+attended` — so the UI shows "10/50" while the view says "13/50" — UI/view mismatch.
- BUT: what actually enforces capacity at write-time? Is it the view? A trigger? RPC logic? Nothing? The report must answer: **when a lead clicks `%registration_url%`, what code path checks capacity, and does it count `invited` rows?** If it does, the real attendee gets rejected/waitlisted because of preemptively-counted `invited` rows. If it doesn't, capacity is enforced inconsistently.

**Investigate:**
1. Where exactly does the `invited` status get created? Trace the code path from "lead clicks link / system opens event" → attendee row insert with `status='invited'`.
2. What is the semantic intent of `invited` in the data model? Marketing invitation? Reservation? Click-through tracking?
3. Where does capacity get enforced at write-time? Read `event-register` EF, `register_lead_to_event` RPC, any triggers on `crm_event_attendees`.
4. What do industry CRMs do here? In medical CRMs (Cliniko/Jane App), patient invitations and bookings are typically separate entities — invitation lives in a marketing/campaign object, booking lives in an appointments object. Same person can have an open invitation AND a confirmed appointment to the same slot — neither blocks the other.
5. **Recommendation in report:** propose a clean separation. Options to evaluate:
   - **Option A:** Add `invited` to a list of "non-capacity-consuming" statuses everywhere — pure UI/view fix. Lowest cost.
   - **Option B:** Move "invited" out of `crm_event_attendees` entirely — into a new lightweight `crm_event_invitations` table that tracks "we sent this lead a link to this event, here's the token". The `attendees` table only records actual registrations.
   - **Option C:** Make `invited` status optional/disabled — only create an attendee row on actual registration; the link click doesn't insert anything.
   - For each option, list pros/cons + SaaS implications + migration cost + how it compares to industry pattern.

### Issue 3.2 — Broadcast wizard cannot link an event (already being fixed by parallel SPEC)

**Status:** SPEC `BROADCAST_EVENT_LINK_SUPPORT` is currently being executed in a parallel Claude Code chat. The audit does NOT need to propose a fix — just verify the SPEC's solution holds up against industry patterns. If the parallel SPEC chose poorly compared to how Salesforce/HubSpot does it, flag in the report.

Specifically: industry pattern for "broadcast linked to an entity" (campaign linked to event, email linked to webinar) is usually a foreign key + dynamic merge fields. Salesforce uses Campaign Member + Campaign + Event relationships. HubSpot uses workflow + dynamic list + smart content. Pipedrive uses email templates + custom fields + automation. **Is the SPEC's `wizard.eventId → queue.event_id → EF resolves %registration_url%` pattern aligned with these, or naive?**

---

## 4. Scope — Areas the Audit Must Cover

### 4.1 Data Model Audit

For each of these tables, evaluate naming, normalization, redundancy, denormalization quality, foreign-key relationships, indexing, RLS policy correctness, completeness vs business needs:
- `crm_leads`
- `crm_events`
- `crm_event_attendees`
- `crm_lead_notes`
- `crm_statuses`
- `crm_automation_rules`
- `crm_message_templates`
- `crm_message_queue`
- `crm_message_log`
- `crm_broadcasts`
- `crm_campaigns`
- `crm_tags`
- `crm_unit_economics`
- `crm_field_visibility`
- Any other `crm_*` tables found

**Questions to answer for each:**
- Is it doing one thing well, or trying to do multiple things?
- Are columns named consistently with the project's conventions?
- Are status values text-typed or enum-typed? Are they configurable per tenant or hardcoded?
- Are timestamp columns (`created_at`, `updated_at`, `deleted_at`) consistent? (Recent finding: `crm_automation_rules` lacks `updated_at` — surface similar gaps.)
- Are JSONB columns being used as bags of unstructured data when they should be normalized?
- Industry comparison: how does Salesforce / HubSpot / Cliniko name and structure this entity?

### 4.2 Status Model Audit

The CRM uses status strings extensively across `crm_leads`, `crm_event_attendees`, `crm_events`, and the new `crm_status_change_events` framework. Audit:
- Are the status transitions documented anywhere?
- Are there any "impossible" or "lossy" transitions (e.g., can a lead go from `confirmed` back to `pending` and lose context)?
- Is the state machine consistent across tenants?
- Industry comparison: how do leading CRMs model lead lifecycle, appointment lifecycle, patient journey?
- Specifically for medical/optical: how do Cliniko + Jane App + Phorest model the "lead → patient → recurring patient" funnel? Is there a "graduation" event when a lead becomes a customer that Optic Up is missing?

### 4.3 Code Organization Audit

Files in `modules/crm/`:
- Are responsibilities clear and orthogonal, or do files overlap?
- Are there 350+ line files that should be split? (Iron Rule 12)
- Are there file-name patterns that suggest a missing abstraction (e.g., 5 files all named `crm-event-*` doing things that could be one event-management module)?
- Are there raw `sb.from()` calls instead of using the `DB.*` wrapper? (Known tech-debt M4-DEBT-02 — quantify it.)
- Are there orphan functions/helpers that nothing calls? (Rule 21)

### 4.4 Edge Function Audit

For each CRM-related EF (`lead-intake`, `send-message`, `dispatch-queue`, `automation-engine`, `event-register`, `quick-register`, `resolve-link`, `unsubscribe`, `whatsapp-catalog-flow`, `retry-failed`):
- Is `verify_jwt` setting correct for its access pattern?
- Are inputs validated rigorously?
- Are errors logged in a way the team can debug?
- Are tenant_id checks belt-and-suspenders (Rule 22)?
- Are there hardcoded values that should be config?

### 4.5 Views Audit

For each `v_crm_*` view:
- Does it leak data across tenants? (Iron Rule 13)
- Is its `WHERE` clause correct?
- Is it `SECURITY DEFINER` vs `SECURITY INVOKER` — correct choice?
- Are its consumers documented?

### 4.6 Business Flow Audit

Trace these 6 end-to-end flows in detail; identify gaps, redundancies, error-handling weaknesses:

1. **New lead intake** — public form submission → `lead-intake` EF → `crm_leads` row → automations fire → SMS/email confirmation → status changes.
2. **Lead-to-event registration** — `%registration_url%` clicked → `event-register` EF → `crm_event_attendees` row → status `registered` → confirmation SMS.
3. **Event lifecycle** — event created → status transitions (scheduled → registration_open → event_day → completed/closed) → attendee status transitions → post-event flow.
4. **Broadcast** — wizard → queue → throttled dispatch → log → unsubscribe handling.
5. **Automation rule firing** — trigger event (status change OR explicit call) → conditions evaluated → action (send message, update status) → tracking.
6. **Unsubscribe / re-subscribe** — handling, audit trail, message-blocking.

For each flow, ask: **what would Salesforce Health Cloud / HubSpot do here that we're NOT doing?** Examples to probe: lead scoring? Engagement timeline? Last-touch attribution? Predictive next-best-action?

### 4.7 Reporting & Analytics Gaps

Optic Up has `crm_unit_economics` and `crm_event_stats` view. What's MISSING:
- Lead source attribution (Facebook campaign_id linkage exists — is it used?)
- Conversion funnel (lead → registered → attended → purchased — percentages, drop-off, time-to-convert)
- Per-staff performance (which employee converts the most leads?)
- Cohort retention (do customers from event 23 still engage with event 24?)
- LTV (lifetime value per lead source / per campaign)

Industry comparison: HubSpot's reports library has 100+ canned reports. Pipedrive has a sales-cycle dashboard. Cliniko has a patient-retention dashboard. **Which 5-10 reports would make the biggest operational impact for an optical-store owner?**

### 4.8 UX Patterns Audit

Without going deep into UI code, identify patterns that feel off:
- Is the "Tier 1 / Tier 2 / רשומים" terminology intuitive, or has it accumulated debt?
- Are status badges color-coded consistently?
- Are bulk operations supported where useful?
- Are search/filter affordances good for staff doing daily work?
- Industry comparison: how do HubSpot/Pipedrive/Phorest design the "today's tasks" view for sales staff / receptionists?

---

## 5. Areas EXPLICITLY OUT OF SCOPE

- The website (Module 3 — Storefront). Separate audit.
- Inventory (Module 1). Separate audit.
- Future modules (M5-M9, M11-M15). They're being designed.
- DESIGN system. Hybrid Navy is being applied; not relevant here.
- The active `BROADCAST_EVENT_LINK_SUPPORT` execution — read its SPEC as context, don't try to fix it.

---

## 6. The Deliverable — Audit Report Structure

The Pipeline produces ONE file at:
`modules/Module 4 - CRM/docs/audits/M4_DEEP_AUDIT_2026_05_13.md`

Structure:
```
# Module 4 — Deep Audit Report

## 1. Executive Summary (≤ 300 words, for Daniel — Hebrew or English, his choice)
   - Top 5 findings ranked by impact
   - Top 5 recommendations ranked by ROI (impact / effort)
   - Confidence level overall

## 2. Methodology
   - What was read (file paths, DB queries, web sources)
   - What was not investigated and why

## 3. Audit Findings — by section (4.1 through 4.8 above)
   For each finding:
   - WHAT: 1-2 sentence description
   - EVIDENCE: file path + line, OR SQL query + result, OR external source URL
   - SEVERITY: CRITICAL / HIGH / MEDIUM / LOW / INFO
   - INDUSTRY COMPARISON: how this is handled in 1+ leading CRMs
   - PROPOSED FIX: concrete options, with pros/cons each

## 4. Issue 3.1 Deep Dive (the "invited occupies slot" bug)
   - Code path traced
   - Capacity enforcement mechanism (or absence)
   - 3 options with detailed analysis
   - Recommendation with reasoning

## 5. Issue 3.2 Cross-Check
   - Compare BROADCAST_EVENT_LINK_SUPPORT SPEC to industry pattern
   - Verdict: aligned / mostly-aligned / divergent
   - Recommendation if divergent

## 6. Industry Benchmark Table
   - 6-column table: Feature | Optic Up today | Salesforce Health Cloud | HubSpot | Pipedrive | Cliniko/Jane App
   - 15-25 rows covering the core CRM concepts

## 7. Top 10 Recommendations — Prioritized
   - For each: title, problem statement, proposed solution, effort (S/M/L/XL), risk (low/med/high), tenant-2 readiness implication

## 8. Anti-recommendations
   - Things from industry CRMs that look attractive but should NOT be adopted, with reasoning
   - This is the SaaS-litmus filter: what works for Salesforce's enterprise customers but not for 1-5 staff optical stores?

## 9. Open Questions for Architect+Daniel
   - 5-10 strategic questions surfaced during the audit that need human decisions before any further work
```

Keep findings INFORMATIONAL by default (don't inflate severity for impact). The report is most valuable if it's honest about which 3-5 things truly matter.

---

## 7. Constraints on the Pipeline's Behavior

- **No file changes.** If during research the Pipeline wants to fix a typo or small bug, it MUST log it in the report as a finding instead.
- **No commits.** Final report is committed by Daniel manually after review.
- **Save the report as a draft locally if anything blocks pushing.** The report content matters; the commit is secondary.
- **Hebrew + English mix is fine.** Daniel reads both. Use Hebrew for direct quotes / UI examples; English for technical analysis.
- **Cite sources.** Every industry-comparison claim needs a URL. No "Salesforce does X" without a source.
- **Acknowledge uncertainty.** Where the data is ambiguous, say so. "I read X but couldn't determine Y; possible interpretations are..."
- **Time-box.** If running long, ship a shorter report rather than a half-finished one. Sections 1-4 are the must-haves; 5-9 are nice-to-haves.

---

## 8. Pipeline Selection

This Brief should be executed by the `opticup-sentinel` skill (read-only by design, audit-oriented) with assistance from `opticup-reviewer` (best-practice + Iron Rule expertise) for cross-checking findings. Web search via Claude Code's built-in tools for industry research. NO `opticup-executor` involvement — this is not a code-change task.

If the Pipeline chooses to use `opticup-strategic` (Module Strategist) for any deep-dive analysis of M4's design, that's also acceptable — but no SPECs are to be authored from this Brief.

---

*End of Brief. Activation prompt lives at `M4_CRM_DEEP_AUDIT_AND_BEST_PRACTICES_ACTIVATION_PROMPT.md` in the same folder.*
