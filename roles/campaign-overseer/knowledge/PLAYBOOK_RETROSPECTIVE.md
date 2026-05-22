# PLAYBOOK — Post-Campaign Retrospective Disciplines

> **Synthesized 2026-05-22 from retiring `opticup-campaign-retrospective` skill disciplines.** Captures the operational HOW for synthesizing post-campaign learnings — what was planned vs what happened, 3 things to repeat, 3 things to change, recurring patterns across retros.
> **Read when:** task in `CAMPAIGN_KB_MAP.md` row "Write a post-campaign retrospective".
> **Authority surfaces:** all 5 KB files (retrospectives are the ONE cross-cut synthesis task — full picture needed) + prior retros in `roles/campaign-overseer/retrospectives/` + `LEARNINGS.md`.

---

## 1. When to write a retro (and when not)

**WRITE a retro when:**
- An event has concluded (`crm_events.status IN ('completed', 'closed')` AND `event_date < today`).
- A broadcast has finished (`crm_broadcasts.status IN ('sent', 'cancelled')`) and ≥ 24h have passed for outcome data to settle.
- A campaign milestone closes (e.g., quarterly SuperSale cycle; cutover; SPEC bundle close).
- An incident is contained AND root-caused (e.g., the 2026-05-20 SMS rate-limit storm + the 2026-05-18→19 M4 cascade — each got post-mortem treatment).

**DO NOT write a retro for:**
- An active (not-yet-concluded) campaign — that's mid-flight analysis, route to [`PLAYBOOK_ANALYSIS`](PLAYBOOK_ANALYSIS.md) instead.
- A single SPEC closure where the retrospective belongs in `FOREMAN_REVIEW.md` (per the opticup-strategic skill discipline) — that's a development retro, not a campaign retro.
- An incident still in progress.

If unsure: check `crm_broadcasts.status` and the relevant event/lead state; if "open" anywhere — wait.

## 2. The synthesis format (the 3+3+patterns shape)

Retrospectives follow a fixed shape — this is the operational discipline, not just a markdown template. Every retro answers the same 4 questions in the same order:

1. **What was planned?** Goals, audience target, messages scheduled, success criteria at campaign start. Pull from the campaign brief / `CAMPAIGN_DECISIONS_LOG.md` / `EVENTS_OPS_DECISIONS_LOG.md` (historical context). One paragraph.
2. **What happened?** Delivery stats, customer response (registrations, confirmations, purchases — from business-state columns), unsubscribes (real, from `unsubscribed_at`), anomalies. Use the cardinality + real-vs-raw disciplines from `PLAYBOOK_ANALYSIS`.
3. **3 things to REPEAT.** What worked. Specific, copy-able patterns. Not "the campaign was good" — that's not a thing-to-repeat.
4. **3 things to CHANGE.** Each tagged with an owner: `(Events-Ops)` for in-skill ops, `(Architect SPEC)` for infrastructure, `(Lead-decision)` for strategy.

Plus: **Recurring patterns across retros** — see §4.

The 3+3 cap is intentional. More than 3 wins = no signal of what to actually repeat. More than 3 changes = no signal of what to actually change. Discipline forces ranking.

## 3. Required metric comparison table (planned vs actual)

Every retro carries this table. Cardinality and real-vs-raw disciplines from `PLAYBOOK_ANALYSIS` apply to every cell.

| Metric | Plan | Actual | Δ | Source column |
|---|---|---|---|---|
| Reach (recipients) | … | … | … | `crm_broadcasts.total_recipients` |
| Delivered (sent) | … | … | … | `crm_message_log.status='sent'` count |
| Confirmed | … | … | … | `crm_event_attendees.status='confirmed'` count |
| Attended | … | … | … | `crm_event_attendees.status='attended'` count |
| Purchased | … | … | … | `crm_event_attendees.purchase_amount > 0` count |
| Real unsub | … | … | … | `crm_leads.unsubscribed_at IS NOT NULL` count |
| Channel failure rate | … | … | … | `crm_message_log.status='failed'` per template |
| CAPI dispatched | … | … | … | `crm_capi_dispatch_queue.status='sent'` count |
| Pixel fired (browser) | … | … | … | `crm_leads.fb_pixel_fired_at IS NOT NULL` count |

The CAPI ↔ Pixel pair is informative: a wide gap between server-side CAPI dispatched and browser Pixel fired indicates ad-blocker / redirect-failure rate. Per [`KB_FUNNEL_CAPI §6`](KB_FUNNEL_CAPI.md#6-capi-dispatch-state--diagnostic-queries).

## 4. Cross-retro pattern detection (the long-term value)

The retrospective skill's primary long-term value is pattern memory across multiple campaigns. Before writing a retro, read the 3 most-recent retros + scan `LEARNINGS.md` for "L-NNN" entries tagged by campaign.

**The pattern threshold:** if a finding appears in **2 retros** → flag as "may be a pattern, watch next." If a finding appears in **3+ retros** → it's no longer a finding, it's a structural issue. Propose:
- A Lead-level change to standard operating procedure (e.g., "Lead should always brief Copywriter to draft RU early — confirmation rate consistently 2-3 points higher when this happens"), OR
- An Architect SPEC if the structural change is infrastructure-level (e.g., a new placeholder, a new trigger, an EF refactor).

Examples of cross-campaign patterns worth watching:
- Rate-limit storms during synchronous broadcasts (caught structurally by W2.1 advisory lock, 2026-05-20).
- Template-validation failures concentrated by language cohort (would indicate per-language resolver bugs).
- Confirmation rate drops the day-of vs day-before pattern (would indicate `event_will_open_tomorrow` vs `event_day` messaging gap).
- Purchase rate variance by tier (Tier 4 ICONIC vs Tier 1 broad) — if it stays consistent across 3 events, that's a strategy lock; if it varies wildly, that's an audience-mismatch SPEC trigger.

## 5. KB delta harvest (close the freshness loop)

When the retro identifies a recurring pattern across ≥2 retros OR a locked new decision, propose a KB delta — a short doc at `roles/campaign-overseer/retrospectives/{event-slug}-{date}_KB_DELTA.md` listing which KB file should be extended and the exact text to add. This is the mechanism that keeps the KBs synthesized + current.

The KB delta does NOT modify the KB itself — KB edits flow through SPEC closure (per `CLAUDE.md §10 Integration Ceremony step 8). The delta is a proposal the Architect routes during the next SPEC close.

## 6. Action proposals — tagging by owner

Every "thing to CHANGE" carries an owner tag so the Lead / Architect / Events-Ops skill knows who picks it up:

| Owner tag | Definition | Routing |
|---|---|---|
| `(Events-Ops)` | Config change in-scope of the consolidated skill (template body, rule trigger, broadcast schedule) | Apply directly demo-first, promote to Prizma |
| `(Architect SPEC)` | Infrastructure change (new placeholder, new trigger, EF code, DB trigger, migration) | Lead opens an Architect SPEC request brief |
| `(Lead-decision)` | Strategy / posture change (audience tiers, timing, channel mix, partnership) | Lead surfaces to Daniel |
| `(Copywriter)` | Wording rewrite without infrastructure change | Events-Ops applies after Daniel approval (no specialist needed in consolidated model) |

A retro with 3 changes ALL tagged `(Architect SPEC)` is usually wrong — it means the retro mistook configuration knobs for infrastructure problems. Re-check before submitting.

## 7. Numbers MUST align with the Analyst's analysis (if one exists)

If a Performance Analysis exists for the same period (`roles/campaign-overseer/analyses/`), the retro's metrics MUST match. Discrepancy is a red flag — either:
- The analysis used the wrong source column (re-read [`PLAYBOOK_ANALYSIS §2.1`](PLAYBOOK_ANALYSIS.md#21-real-vs-raw-rule-the-single-most-important)), OR
- The retro used a different cohort window (state the windows explicitly).

Cross-reference the analysis path at the top of the retro doc + reconcile any deltas in §0 (Reality Check).

## 8. Anti-patterns — do not

- Do NOT use click counts as a stand-in for unsubscribe / purchase rates (bot pollution — `feedback_clicks_are_not_actions`).
- Do NOT propose more than 3 things to repeat or 3 things to change (no signal of priority).
- Do NOT propose direct fixes without an owner tag (Lead / Architect / Events-Ops / Copywriter).
- Do NOT skip the cross-retro pattern check — the long-term value of this skill is pattern memory across campaigns.
- Do NOT include raw PII (phone / email / name) in the retro doc. Aggregate or hash.
- Do NOT write a retro for an active campaign (not yet concluded) — mid-flight analysis routes to `PLAYBOOK_ANALYSIS`.
- Do NOT modify campaign artifacts (templates / rules / broadcasts) inside the retro flow — propose, don't apply. A separate operation under `PLAYBOOK_CONFIG_OPS` does the apply.

---

*PLAYBOOK_RETROSPECTIVE v1, 2026-05-22. Synthesized from `opticup-campaign-retrospective` SKILL.md disciplines + LEARNINGS L-005 Rule A + cross-retro pattern detection. Refresh trigger: any new owner-tag class added; any change to the 3+3 cap discipline; any KB delta mechanism change.*
