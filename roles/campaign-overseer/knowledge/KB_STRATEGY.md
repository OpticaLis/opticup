# KB — Campaign Strategy (Business Model + Audience + Locked Decisions)

> **Synthesized snapshot, 2026-05-21.** Authority surface: `roles/campaign-overseer/DECISIONS_LOG.md`, `roles/campaign-overseer/LEARNINGS.md`, `campaigns/supersale/CAMPAIGN_DECISIONS_LOG.md`, `_archive/launch-plan-versions/MASTER_LIVE_PLAN_v1.md`.
> **Read when:** task is in `CAMPAIGN_KB_MAP.md` row "Plan campaign strategy" or "Draft/refine a message" (for tone + audience context).

---

## 1. Tenant scope (today)

| Tenant | Slug | UUID | Role |
|---|---|---|---|
| Prizma Optics | `prizma` | `6ad0781b-37f0-47a9-92e3-be9ed1477e1c` | First customer; production; all live campaigns. |
| Demo | `demo` | `8d8cfa7e-ef58-49af-9702-a862d459cccb` | Test tenant; QA for every campaign change (Iron Rule 33 demo-first). |

Future: Optic Up = multi-tenant SaaS for optical stores. Every campaign skill must build for "tomorrow a second optical chain joins" (Iron Rule 20 SaaS litmus test).

## 2. SuperSale — the flagship campaign

**Pattern:** quarterly-ish events where Prizma sells deeply discounted frames to a tiered audience.

**Tier structure (locked 2026-05-19 via SuperSale Catalog Refinement):**
- **Tier 1 — broad eligibility.** Most published brands. Standard event price.
- **Tier 2 — selected mid-premium.** Jimmy Choo moved here from Tier 4 (publishing-constraint reframe, see §6 Pattern P40).
- **Tier 3 — luxury.** Premium brands.
- **Tier 4 — ICONIC.** Gucci / Dior / etc. Same event price as other tiers — **publishing constraint**, not pricing constraint. Brands can't have their event price published publicly; operators communicate per-customer.

**Boutique Club (added 2026-05-19):** 7 Japanese/European luxury brands; "הצעות בלעדיות לנרשמי האירוע" (exclusive offers to event registrants).

**Capacity:** 50/event typical. Operator manages registrations → waiting_list → invited → confirmed → attended → purchased lifecycle via CRM UI.

**Booking fee (`crm_events.booking_fee`):** ₪50 deposit collected via Gama (`gpw.gamaf.co.il` — Prizma's contracted payment gateway, used for months, known partner per `M3_SHORTGY_TO_INTERNAL_REDIRECT` stop-trigger resolution 2026-05-14).

**Takanon (legal terms):** `/supersale-takanon/` page. **Surgical edits only** (Pattern P41) — the Challenge / 14-day guarantee / free-glasses fallback are load-bearing for `/supersale/`. Attorney review mandatory before merge to main (gap still open).

## 3. Audience tiers (lead-side)

| Tier label | crm_leads.status set | Used by |
|---|---|---|
| Tier 1 incoming | `new`, `no_answer`, `pending_terms` | `crm-incoming-tab.js` (Tier 1 view) |
| Tier 2 (`TIER2_STATUSES`) | `waiting`, `invited`, `confirmed`, `confirmed_verified`, `attended`, `purchased` | Main leads board + automation recipient_type=`tier2` |
| Waitlist | `waitlist` | recipient_type=`leads_by_status` with filter `['waitlist']` |
| Unsubscribed | `unsubscribed_at IS NOT NULL` | EXCLUDED from every audience by default |

Tier 1 leads are converted to Tier 2 by operator-approved `transferLeadToTier2` (requires `terms_approved=true`).

## 4. Locked decisions (key — re-read source DECISIONS_LOG for full)

| # | Decision | Source |
|---|---|---|
| Pattern A (mirror tables for storefront public data) | 2026-05-15 `STOREFRONT_PUBLIC_DATA_LAYER` | `DECISIONS_LOG.md` #32 |
| EV-001: status-change framework via DB triggers + central SCE queue + parallel SMS/Email | 2026-05-12 | `DECISIONS_LOG.md` #29 |
| Click-vs-action: source metrics from business-state, never click logs | 2026-05-20 (memory `feedback_clicks_are_not_actions`) | M4_SHORT_LINKS_DASHBOARD_REDESIGN F-BOT-NOISE amendment |
| Demo-first for all M4 config (Iron Rule 33) | 2026-05-19 | `CLAUDE.md` Iron Rule 33 |
| Authority boundary (Iron Rule 35) | 2026-05-19 | `M4_INFRASTRUCTURE_CONTRACT.md` + `CLAUDE.md` Iron Rule 35 |
| Campaign Lead manager layer + 4-skill Phase 1 | 2026-05-21 `M4_CAMPAIGN_TEAM_SKILLS_SETUP` | `DECISIONS_LOG.md` #36-37 (pending log entry) |
| Split KB + MAP router | 2026-05-21 `CAMPAIGN_KB_BUILD` (this Brief) | the SPEC under closure now |

## 5. Recurring failure patterns to AVOID

Lessons captured from `roles/campaign-overseer/LEARNINGS.md`:

### L-005 Rule A — Live-flow check before any cleanup REC

Before recommending action on a perceived data anomaly, identify and inspect the customer-facing or operator-facing surface that produces the data. Examples of past failures:
- REC-002: proposed preserving 8 questionnaire summaries that turned out to have zero use in new system.
- REC-005: proposed dropping 8 MultiSale events = ~200K NIS revenue history.
- REC-006: proposed dropping 587 lead-level eye-exam answers that the live storefront form actively writes.
- REC-008: proposed merging 16 duplicate-email leads that are couples + parents-with-kids by design.

**Always ask Daniel about the producing flow before drafting an anomaly-cleanup REC.**

### L-005 Rule B — Tag every REC as anomaly-detection or feature-request

The 90% rolling acceptance rate is misleading without class tags. Anomaly-detection RECs have different discipline than feature-request RECs. From REC-011 onward, every REC carries `[anomaly-detection]` or `[feature-request]` in its title.

### L-004 — Probe schema BEFORE writing a SPEC that depends on a column

Multiple past SPECs assumed column existence and wasted execution time. Pre-flight DB probes are mandatory.

### Pattern P40 (added 2026-05-19) — anti-extrapolation

When user describes a constraint, default to "cosmetic/publishing restriction" not "behavioral difference" unless explicitly told otherwise. Source: Tier-4 SuperSale brands — I repeatedly assumed they had a "different pricing mechanism" because their prices aren't published; Daniel corrected: "It's a publishing constraint, not a pricing constraint. Same event price."

### Pattern P41 (added 2026-05-19) — legal docs = surgical edits

Legal documents like `/supersale-takanon/` get section-targeted edits, not full rewrites. The legal-research subagent's "clean §5.1–§5.8 rewrite" would have silently deleted the Challenge mechanism. Apply surgical 2-section edits only.

## 6. What worked / what didn't (high-signal recent data)

**What worked:**
- The CAPI hybrid (2026-05-15) — Lead events now arrive at Meta with proper dedupe; ad-blocker visibility via `pixel-fired` back-wire.
- Multi-channel parallel dispatch (2026-05-12 EV-001) — SMS + Email same `scheduled_at` arrive 38ms apart (vs ~1000ms pre-fix, 26× improvement).
- Status-change framework (DB triggers → SCE → consumer) — silently-broken check-in rules now operationally correct on demo + Prizma.
- Click-vs-action correction (2026-05-20) — Short Links Dashboard now shows real unsubscribes (`crm_leads.unsubscribed_at`) instead of bot-polluted click rates (95% bots within 6 min).

**What didn't (recovered):**
- 2026-05-13 morning broadcast: 552/552 failed for Event #24 because wizard didn't collect `event_id` → `%registration_url%` never resolved. Fixed by `BROADCAST_EVENT_LINK_SUPPORT` (event-link dropdown in wizard step 3).
- 2026-05-18→19 M4 cascade: 5 SPECs + 1 emergency rollback triggered by 3 placeholders added to Prizma templates on 2026-04-28 without resolver extension. Now prevented by Iron Rule 35 + Sentinel Mission 14 daily audit.
- 2026-05-20 SMS rate-limit storm: 4× concurrent dispatch-queue ticks overlapped, hit Make rate-limit. Band-aid: `batchSize: 60 → 15`. Structural fix: advisory lock (W2.1).

## 7. Strategic posture for new campaigns

When the Campaign Lead briefs a specialist, default to:
1. **Demo-first** for any new template / rule / broadcast schedule (Iron Rule 33).
2. **Business-state metrics** for any conversion claim (`feedback_clicks_are_not_actions`).
3. **Whitelist-phones** for any test send (Daniel's two personal phones only).
4. **Prizma cardinality estimate** for any analysis SQL (`feedback_probe_biggest_production_tenant`).
5. **Surgical edits** to legal docs / load-bearing templates (Pattern P41).
6. **Class-tagged RECs** (anomaly vs feature-request — Rule B).
7. **Iron Rule 35 boundary** preserved; escalate to Architect SPEC when placeholders / triggers / actions / EF / DB needed.

## 8. Anti-patterns — do not

- Do NOT propose campaign changes that touch storefront repo directly. Brief the Site Overseer.
- Do NOT propose anomaly cleanups without applying L-005 Rule A.
- Do NOT extrapolate constraints (P40 — assume cosmetic, not behavioral, unless told otherwise).
- Do NOT rewrite legal pages full-document (P41 — surgical 2-section edits only).
- Do NOT skip the demo-first test before promoting any config to Prizma.

---

*KB_STRATEGY v1, 2026-05-21. Refresh trigger: every locked decision in `DECISIONS_LOG.md` from #38 onward; every L-006+ entry in `LEARNINGS.md`; every campaign close.*
