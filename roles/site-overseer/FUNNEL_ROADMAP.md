# Funnel & Marketing Maturity — ROADMAP

> **Living document.** Updated as decisions are made. Each entry shows the decision Daniel approved, the reasoning, and what gets built.
>
> **Created:** 2026-05-14, after the 10-question knowledge-build review.
> **Source artifacts:** `roles/site-overseer/knowledge-build/KNOWLEDGE_MAP.md` (commit e8ef9d3) + 10-Q review session 2026-05-14.

---

## Context — Why this document exists

On 2026-05-14, three wrong diagnoses in a row about event #24's funnel drop revealed that the Site Overseer's understanding of the CRM/funnel architecture had blind spots. The fix was a comprehensive read-only mapping (`KNOWLEDGE_MAP.md`) which surfaced 5 measurement gaps + 10 architectural questions. Daniel answered each question; this ROADMAP records every decision so future Site Overseer sessions don't re-litigate them.

**Daniel's overarching goal (2026-05-14):** "I want marketing funnels at the level of companies that spend millions on advertising. I want them to always improve, to know how to improve, and what to improve — eventually autonomously via agents."

**The funnel today (status — 2026-05-14):**

| Layer | Status | Notes |
|---|---|---|
| 1. Lead acquisition | Functional | Two paths into `crm_leads`: `/supersale/` form + `/quick-register/?event=N` |
| 2. UTM / Attribution | **Partial — leaking ~35% of leads** | sessionStorage only; lost on tab close / in-app browsers |
| 3. Automation rules | Functional | But mixed with `crm_events.status` (see Phase 3 #1) |
| 4. Event system | Functional | Status column conflates lifecycle + automation phase |
| 5. Broadcasts | **Broken bookkeeping since 2026-05-12** | `crm_broadcasts.total_sent` never updated; no `broadcast_id` propagation |
| 6. Templates | Functional | Validation works (we saw failed message with `unsubstituted_placeholder`) |
| 7. Click tracking | Partial | Internal `/r/<code>` works; `short.gy` external links bypass measurement |
| 8. Form submission | Functional | Lead-intake EF now async (M4_LEAD_INTAKE_ASYNC_DISPATCH, 2026-05-14) |
| 9. Pixel & Conversion | **Browser-only, fires only on thank-you page** | No CAPI; loses ~30-50% of conversions to AdBlocker / closed-tab / network errors |
| 10. Make scenarios | 21 inactive legacy scenarios | Keep as historical reference until Q4 2026 |

---

## Decision Log — 10 Questions (2026-05-14)

### Q1 — UTM update semantics (Layer 2)

**Decision:** First-touch only. UTMs are frozen at first insert and never updated.

**Daniel's reasoning:** Leads register to the event-system once and forever. UTM tells you "how did this person enter the event system originally" — long-term value. The source of any specific event-registration is a different question that needs a different mechanism (e.g. unique tracking link per channel in the future).

**Recorded in skill:** YES — to be added to SITE_OVERSEER_SKILL.md when Phase 1 ships.

---

### Q2 — `crm_events.status` values: `draft` / `live` (Layer 4)

**Decision:** Status column is being used as a combination of (a) event lifecycle and (b) automation phase trigger. Not a typo — that's how the system works today.

**Daniel's reasoning:** "Basically these are statuses to trigger different automations (like Monday did)."

**Implication for Phase 3:** This is the root of "automation status conflated with lifecycle status". Daniel acknowledged that switching to `registration_open` triggers the registration-open broadcast, and most statuses trigger automations. He explicitly warned: "you have to prepare for this really well — many automations already work this way" before any refactor.

**Action:** Phase 3 SPEC #1 will split into 2 columns. **Not Phase 1 work.**

---

### Q3 — Read `register_lead_to_event` RPC line-by-line

**Decision:** Yes — separate diagnostic SPEC. Read the RPC body, produce a state-transition diagram.

**Why:** It's the heart of the funnel. Every future analysis that doesn't understand what the RPC does will be a guess. Estimated 1-2 hours of read + write.

---

### Q4 — Fix the broadcast bookkeeping (Layer 5)

**Decision:** Option (A) — Full fix.
- Add `broadcast_id` to `crm_message_queue`
- Propagate to `crm_message_log`
- Post-drain UPDATE on `crm_broadcasts.total_sent`

**Why:** Daniel wants to be able to measure each broadcast's performance separately (delivered / clicked / registered). Without this, no per-broadcast optimization is possible.

**Estimated:** 3-4 hours.

---

### Q5 — `required_variables` empty in templates (Layer 6)

**Decision:** Validation **already exists** — verified via Daniel's screenshot showing a failed message with `unsubstituted_placeholder: registration_url`. The validation lives in `send-message` EF and the manual-send UI, NOT in the `required_variables` column.

**Action:** Short mapping SPEC to document where validation actually runs + ensure auto-dispatch path also validates. Do NOT fill `required_variables` (avoid creating an unused column).

---

### Q6 — `prizmaoptic.short.gy` external links (Layer 7)

**Decision:** Migrate to internal `/r/<code>` system.

**Daniel's reasoning:** "I do see click stats there [short.gy], but obviously it would be much more convenient to see it in our system."

**Action:** SPEC creates new short links + replaces template references + adds basic ERP stats page.

---

### Q7 — Pixel firing point (Layer 9)

**Decision:** Keep "thank-you page = real lead" model for Meta (only verified conversions count), BUT add validation that detects when a `crm_leads` row was saved but the pixel did NOT fire, and reports those as measurement-gap incidents.

**Daniel's reasoning:** "I want 100% real info — so if someone fills the form AND reaches 'thanks for registering', only then they're counted as a real lead."

**The combo:** Hybrid Pixel + CAPI (Q8) ensures the pixel fires reliably — but Meta still only counts thank-you-page conversions per Daniel's directive.

---

### Q8 — Server-side CAPI (Layer 9)

**Decision:** Deferred to Phase 2 — but high priority.

**Daniel's reasoning:** "Defer but right after we finish what we must do now we'll do this too. Sending purchases is important!"

**Why deferred:** No point measuring with high accuracy a distorted current state. Fix Phase 1 measurement first (UTMs, broadcasts), then CAPI will measure correctly.

**Infrastructure exists:** `tenants.fb_capi_token` column (empty), Make scenario 8542928 (inactive).

---

### Q9 — Cleanup of 21 legacy Make scenarios (Layer 10)

**Decision:** Leave for now. Re-evaluate Q4 2026 after 6 months of stable v3 architecture.

**Why:** Legacy scenarios are documentation of how things used to work. After 6 months of post-cutover stability, can be safely deleted.

---

### Q10 — `event_invite_new` bypassing `crm_automation_rules` (Layer 4)

**Decision:** Keep as-is (fast-path is intentional). Add documentation.

**Daniel's reasoning:** "The goal was that if someone joins the event-system and there's an open event, they shouldn't go through the whole flow — they go straight to 'registered' board and get the message."

**Action:** Document the fast-path pattern in SITE_OVERSEER_SKILL.md. No code change. If more fast-paths are added in the future, they go in the same registry.

---

## Phases — What Gets Built

### Phase 1 — Infrastructure Fixes (BLOCKING — before any new measurement work)

> All Phase 1 SPECs to be authored before Daniel runs any in Claude Code. Cluster benefit: can run sequentially in one session.

**Execution order (Architect decision 2026-05-14):** P1.4 first as read-only foundation, then P1.1 → P1.2 → P1.3. Rationale: P1.4 maps `register_lead_to_event` RPC behavior; P1.1 and P1.2 both touch UTM persistence and broadcast bookkeeping that depend on understanding what the RPC creates/flips/leaves alone. Three wrong diagnoses on 2026-05-14 (broadcasts-not-sent / 7.8% conversion / UTM event-24 attribution) all stemmed from inferring without a map. Pay the 1-2 hour read-only cost first; avoid building the next 3 SPECs on assumptions.

| Order | # | SPEC | Layer | Foreman owner | Estimated | Status |
|---|---|---|---|---|---|---|
| 1 | P1.4 | M4_REGISTER_LEAD_TO_EVENT_RPC_MAP | 4 | opticup-strategic (M4) | 1-2 hrs (read-only) | ✅ CLOSED 2026-05-14 (🟡 with FIND-1 → 15-min follow-up SPEC queued) |
| 2 | P1.1 | M3_UTM_TRIPLE_LAYER_PERSISTENCE | 2 | cross-cut (M3 storefront + M4 lead-intake EF + DB schema; M4 owns the touchpoint table) | 4-6 hrs (actual: closed in ~3.5 hrs) | ✅ CLOSED 2026-05-14 — `modules/Module 4 - CRM/docs/specs/M3_UTM_TRIPLE_LAYER_PERSISTENCE/` |
| 3 | P1.2 | M4_BROADCAST_ID_PROPAGATION | 5 | opticup-strategic (M4) | 3-4 hrs | ✅ CLOSED 2026-05-14 — `modules/Module 4 - CRM/docs/specs/M4_BROADCAST_ID_PROPAGATION/`. X1 (short_links.broadcast_id substrate) + pg_cron 1-min direct-SQL counter refresh. Layer 5 Gap #1 + Gap #2 RESOLVED. End-to-end chain verified on demo: queue→log→short_links→clicks→touchpoints all attributed with broadcast_id; `total_sent=0→1` after cron tick. |
| 4 | P1.3 | M3_SHORTGY_TO_INTERNAL_REDIRECT | 7 | Site Overseer (storefront templates + new ERP stats page) | 2-3 hrs | ✅ CLOSED 2026-05-14 — `modules/Module 4 - CRM/docs/specs/M3_SHORTGY_TO_INTERNAL_REDIRECT/`. 10 template rows + 2 tenants.payment_links rows migrated; 6 new `short_links` (link_type='template_static') created; 4 content drafts synced; MVP "קישורים קצרים" tab live in CRM. `gmapy` → gpw.gamaf.co.il authorized by Daniel 2026-05-14 (Prizma's contracted ₪50 deposit gateway). Layer 7 marked DEPRECATED for short.gy internal usage. |

**🎉 Phase 1 COMPLETE — 2026-05-14.** All 4 SPECs closed in one calendar day (P1.4 + P1.1 + P1.2 + P1.3). Click→broadcast→touchpoint attribution chain now intact end-to-end. Phase 2 (Measurement Quality — CAPI hybrid dedup, pixel validation, template validation) UNBLOCKED.

**Total Phase 1:** ~10-15 hours of executor work, runnable as 4 separate Claude Code sessions.

---

### Phase 2 — Measurement Quality (after Phase 1 lands)

| # | SPEC | Layer | Estimated | Status |
|---|---|---|---|---|
| P2.1 | M4_FB_CAPI_HYBRID_DEDUPLICATION | 9 | 6-8 hrs | ✅ CLOSED 2026-05-15 — commit range `51bc874..` — ERP-side CAPI substrate shipped. `fb-capi-dispatch` EF + `crm_capi_dispatch_queue` table + pg_cron consumer + `lead-intake` v26. Advanced matching (em+ph). Storefront dedup handoff deferred to `M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF`. Make scenario 8542928 retired. Demo runs `skipped_no_token` (D-AUTH-3). See `docs/FB_CAPI.md`. |
| P2.2 | M4_PIXEL_VALIDATION_GAP_DASHBOARD | 9 | 2-3 hrs | ✅ CLOSED 2026-05-19 — commit range `d28dfd7..` — dashboard tile + drill-down modal in Messaging Hub "📊 ביצועי הודעות" sub-tab. 3 SELECT queries (aggregate / 7-day trend / drill-down) on `crm_leads` + `crm_capi_dispatch_queue`. Iron Rule 34 triplet captured (screenshot + `window.__pixelGapTrace` + DB-query evidence). Partial index deferred per D4 gate (all medians < 100ms); revisit at scale milestone. Iron Rule 32 declared None; held. **FUNNEL Phase 2 ✅ COMPLETE** (P2.1 + P2.2 + P2.3 all closed). |
| P2.3 | M4_TEMPLATE_VALIDATION_UNIFIED + M4_TEMPLATE_VALIDATION_UI_LINT | 6 | 2-3 hrs + 2-3 hrs | ✅ CLOSED ALL 4 LAYERS — Layer A (send-message EF pre-dispatch) + Layer B (automation-engine pre-enqueue) + Layer C (`_shared/template-validation.ts` canonical regex/helper) shipped 2026-05-14 by `M4_TEMPLATE_VALIDATION_UNIFIED`. **Layer D (UI editor lint) shipped 2026-05-19** by `M4_TEMPLATE_VALIDATION_UI_LINT` — commit range `fdec327..` — `crm-template-lint.js` (110 lines) + editor save-gate hook + 3-state UI (CLEAN/HARD-BLOCK/SOFT-BLOCK with override). KNOWN_PLACEHOLDERS = 14 named + payment_url_<N> family. Levenshtein ≤ 2 typo detection. Iron Rule 34 triplet captured (3 Chrome MCP screenshots + `window.__lintTrace` + DB-state probes). Smoke 8/8. 2026-05-13 incident class (758 SMS rejected) structurally impossible to repeat. |
| P2.4 | M4_FB_CAPI_PURCHASE_EVENTS | 9 | 4-6 hrs | 🟡 CLOSED-WITH-HOTFIX 2026-05-19 — commit range `28738f6..` — full-funnel CAPI: CompleteRegistration + EventAttended + Purchase. 3 DB triggers on `crm_event_attendees` + EF branching with `custom_data.value` + `currency='ILS'` for Purchase. Purchase signal per Daniel's Option B = `purchase_amount` transition NULL/0 → > 0 (no status/payment_status check). D7 forward-only — 84 prizma rows NOT backfilled. **🔴 P0 regression at LH-Tester phase (uuid-ossp in `extensions` schema, not `public`) closed by hotfix SPEC `M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX` same day.** Demo confirmed: events `status='sent'`, Meta `events_received: 1`. Iron Rule 32: 1 declared op (constraint swap). FUNNEL **full funnel CAPI ✅ LIVE on demo**. Prizma activates when Daniel populates `tenants.fb_capi_token`. |
| P2.4-fix | M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX | 9 | 1 hr | ✅ CLOSED 2026-05-19 — hotfix of P2.4. Schema-qualified uuid-ossp to `extensions.uuid_generate_v5(extensions.uuid_ns_oid(), ...)` in all 3 trigger function bodies via 3 `CREATE OR REPLACE FUNCTION` calls. Iron Rule 32: 0 ops. Smoke 7/7 + E2E 6/6 PASS. See `modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX/`. |

---

### Phase 2.5 — Continuous Improvement Loop (NEW — Architect addition 2026-05-14)

> **Why this exists:** Phase 1+2 give accurate measurement. Phase 2.5 gives the *mechanism to know what to improve*. Without it we are "a company with correct measurement" — not "a company that improves continuously." Daniel's directive: "always improve, know how to improve, what to improve."

| # | SPEC | Layer | Estimated | Status |
|---|---|---|---|---|
| P2.5.1 | M11_FUNNEL_HEALTH_DASHBOARD | 11 (Reports) | 6-8 hrs | PLANNED |
| P2.5.2 | M4_WEEKLY_OPTIMIZATION_BRIEF | 4 + scheduled-task | 4-6 hrs | PLANNED |

**P2.5.1 — Funnel Health Dashboard:** ERP page showing lead→attendee→show-up→purchase conversion rates, sliced by UTM source, broadcast, event-type, and time window (weekly + monthly). Manual interpretation at first; provides the data substrate for P2.5.2.

**P2.5.2 — Weekly Optimization Brief:** Scheduled task runs every Sunday, reads the prior week's metrics from the dashboard data sources, and emits ONE concrete improvement recommendation to Daniel. Template-based v1 (rule-driven thresholds — "X conversion dropped >15% vs 4-week median → flag broadcast X"); LLM-based v2 once enough weeks of data exist.

**Dependency:** Phase 2.5 depends on Phase 1+2 (accurate UTM + broadcast tracking + CAPI). Implementation can start in parallel with Phase 2 once Phase 1 lands.

**SPEC-authoring impact (important for Phase 1+2 authors):** SPECs in Phase 1+2 should capture extra columns/logs that Phase 2.5 will consume — specifically: broadcast attribution tag on `crm_event_attendees`, `acquisition_source` on per-event-registration if Q1 model is revisited, structured event-log writes from `register_lead_to_event` RPC. Foreman authors of P1.1/P1.2/P2.1 must check P2.5 requirements before sealing their SPECs.

---

### Phase 3 — Architectural Reform (Tech Debt)

| # | SPEC | Layer | Estimated | Status |
|---|---|---|---|---|
| P3.1 | M4_EVENT_STATUS_SPLIT_LIFECYCLE_AUTOMATION | 4 | 8-12 hrs (HIGH RISK) | PLANNED — needs full automation map first |
| P3.2 | LEGACY_MAKE_SCENARIO_CLEANUP_Q4 | 10 | 1 hr | PLANNED — Q4 2026 |

---

### Phase 4 — Elite Tier (Post-Baseline Maturity)

> **Status:** DOCUMENTED, NOT YET SPEC'd. This phase records the gap between the baseline we are building (Phase 1+2+2.5+3) and the level of digital-marketing maturity at companies that spend millions on advertising. No SPECs to author yet — but Phase 1+2+2.5+3 authors MUST design for forward-compatibility with everything below. **Flexibility-first: schemas, event logs, and APIs must not lock us out of these capabilities.**

**The 7 elite-tier capabilities we don't yet have:**

| # | Capability | What it means | Forward-compat requirements for current phases |
|---|---|---|---|
| E1 | Multi-Touch Attribution (MTA) Engine | Distribute conversion credit across 5+ touchpoints per customer journey via configurable models (linear / time-decay / U-shape / data-driven) | **✅ SUPPORTED (2026-05-14, P1.1 closed):** `crm_lead_touchpoints` table now captures every active funnel interaction (`short_link_click`, `lead_submit`, `event_register`) with its own UTM bag + timestamp. First-touch becomes ONE view (`v_crm_lead_first_touch`), not the only truth. `crm_leads.utm_*` kept for backward-compat. MTA engine builds on top of the touchpoint log. Page-view tracking (A1) deferred — upgrade path: add `page_view` value to CHECK constraint + browser endpoint, no schema change. |
| E2 | Predictive LTV → CAC per channel | ML model predicts customer lifetime value per acquisition source; budget decisions follow LTV/CAC ratios per channel | **Improved (2026-05-14, P1.1):** every touchpoint now carries `tenant_id, lead_id, touchpoint_id, occurred_at, utm_bag, attendee_id` — stable handle for M5/M7/M13 revenue rows to tag `originating_touchpoint_id`. Phase 1+2: tag every revenue event (order, redemption, repeat purchase) with the originating `touchpoint_id` (preferred) or `broadcast_id` (P1.2). M5/M7/M13 SPECs must persist these tags on every revenue row. |
| E3 | Audience Segmentation auto-export | Sync customer segments (by value, by behavior, by likelihood) to Meta Custom Audiences / Google Customer Match via API | Phase 1+2.5: customer scoring fields (`engagement_score`, `value_tier`, `predicted_ltv_bucket`) live on `customers` or a side table. Even if scores are NULL today, the columns exist. Phase 4 fills them. |
| E4 | Creative A/B at scale | Run 8-12 creative variants per week per campaign, auto-kill losers, auto-reallocate budget to winners | Phase 1+2: every creative/variant gets a stable `creative_id` propagated through UTM/broadcast/short-link → conversion. Phase 2.5.1 dashboard must group by `creative_id` even if there's only one variant today. The new `crm_lead_touchpoints.utm_content` column (text NULL) is the natural carrier for creative_id until a dedicated column ships. |
| E5 | Real-time anomaly detection | Detect CPL spikes / conversion drops within hours, alert + optionally auto-pause | Phase 2.5.2 schedule should be designed to support hourly cadence even if v1 runs weekly. The Brief format should accept severity levels (info / warn / critical) and a "suggest auto-pause" hook from day one. |
| E6 | Cross-channel orchestration | Conditional fallback flows ("if SMS not clicked in 24h → email → still no → FB retarget") | Phase 3 status-column split + STATUS_CHANGE_TRIGGERS_FRAMEWORK already enable this architecturally. Phase 1+2 must NOT hard-code single-channel send paths — every `crm_message_queue` insert is one channel in a potential chain, with `parent_message_id` or `chain_id` for future fallback rules. |
| E7 | Customer Journey Analytics | Visualize the full path: impression → click → landing → scroll-depth → form → submit → cart → purchase, per cohort | **✅ SUPPORTED (2026-05-14, P1.1 closed):** structured event log lives in `crm_lead_touchpoints`. Today covers active interactions (click + submit + register). Phase 4 page-view upgrade adds impressions + scroll-depth via browser endpoint posting to the same table with `touchpoint_type='page_view'`. Phase 4 dashboards can build on top. |

**Estimated effort for Phase 4 (rough):** 12-18 months of additional engineering after Phase 1+2+2.5+3 land — including ML model training data (~6 months of operating data), Meta/Google API integrations, and customer-scoring infrastructure.

**When to revisit Phase 4 → SPEC:** After Phase 2.5 lands AND ≥6 months of post-cutover operating data exist AND tenant 2+ is onboard. Until then: every SPEC author in Phase 1+2+2.5+3 reads the "Forward-compat requirements" column above before sealing their SPEC. If a SPEC blocks any E1-E7 capability — flag and redesign before sealing.

**Why this section is here even with no SPECs:** an architect's job is to flag the gap BEFORE the team builds in a way that closes the door on the future. Documenting Phase 4 now is cheap; ripping out Phase 1 schemas in 2 years to retrofit MTA is expensive.

---

### Diagnostic Tasks (read-only, no code)

| # | Task | Estimated | Status |
|---|---|---|---|
| D1 | Count unsubstituted_placeholder failures in 2026-05-12 broadcast | 30 min | PLANNED |
| D2 | Document all fast-path automations (currently: `event_invite_new`) | 1 hr | PLANNED — to be folded into Q10 docs |

---

## Cross-Phase Dependencies

- **Phase 2 depends on Phase 1.** CAPI accuracy requires UTMs + broadcast tracking to be working first.
- **Phase 2.5 depends on Phase 1+2.** Health Dashboard reads data produced by P1.1/P1.2/P2.1; Weekly Brief reads from the dashboard. Phase 2.5.1 can start authoring in parallel with Phase 2 SPECs.
- **Phase 3 #1 (status split) depends on D2 + Phase 2 #3.** Need a full inventory of every automation triggered by each status value before we can safely refactor.
- **D1 can run any time** — pure diagnostic.

---

## Open Questions Still to Resolve

None from the 10-Q review. New questions will be added here as they arise.

---

## What's NOT in scope

- Building a full marketing-attribution dashboard — Phase 4 territory, after Phase 1+2+3 give us clean data
- Multi-touch attribution modeling — same, Phase 4
- AI agents that auto-optimize campaigns — that's Daniel's long-term north star, but requires all phases above first

---

## How to use this document

- **Site Overseer sessions** read this before starting any funnel/CRM work to avoid re-asking what's already decided.
- **Foreman sessions** check this before authoring a SPEC to ensure scope alignment.
- **Daniel** uses this to see the punch list and decide priorities.

---

*End of FUNNEL_ROADMAP.md.*
*Authored by Site Overseer 2026-05-14 in collaboration with Daniel.*
