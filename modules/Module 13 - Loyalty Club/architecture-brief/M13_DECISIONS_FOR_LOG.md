# M13 Decisions — for copy into DECISIONS_LOG

> **Where this goes:** `.claude/skills/opticup-architect/references/decisions/M13.md` (Cowork can't write there directly — Claude Code on Daniel's machine should copy this content there)
> **Also update:** `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` with index entry

---

## Index entry to add to DECISIONS_LOG.md

```markdown
| 2026-05-10 | M13 | Architecture Brief sealed — 13 decisions, 5 sketches, 6 entities, 4 engines | M13.md |
```

---

## Full content for `decisions/M13.md`

(copy-paste the content below)

---

# Decisions Log — M13 (Loyalty Club)

> Per-module detail. Index summary in `../DECISIONS_LOG.md`.
> **Brief sealed:** 2026-05-10
> **Total decisions:** 13 locked + 5 future-proofing slots

---

## 2026-05-10 — M13 Architecture Brief — full sealing session

**Situation:** Last 2 modules before LIVE (M13 + M9). Daniel directed sealing M13 first since it depends only on already-sealed cores (M5/M7/M8). Started from `M13_HANDOFF.md` + Daniel's basic written spec from prior planning. Spent the session expanding from "basic" to comprehensive Brief.

**Process flow:**
1. Read handoff → analyzed Daniel's basic spec → identified 4 critical gaps (lifecycle, family rules, M13/M7 boundary, customer visibility)
2. Daniel pushed back: "this is old, build a comprehensive Brief, not basic"
3. Wrote `M13_LOYALTY_DRAFT.md` (9 sections, 6 entities, 4 engines, 5 risks)
4. Posed 7 decisions to Daniel
5. Daniel: D5 (enrollment) reframed entire model — "only via website page, not in-store, like big chains do"
6. Built 4 sketches (S1-S4)
7. Strategic conversation on numbers (D9-D13) — accrual rates, family scaling, welcome bonus
8. Daniel pushed for S5 (settings panel) — "shouldn't every tenant be able to change these numbers?"
9. Final decision (D13): family balance — Daniel raised legacy Access pattern (manual code-passing)
10. My counter: don't replicate Access workarounds in modern stack. Recommended shared-pool with two-tag traceability
11. Brief sealed at 12 sections, 5 sketches, 13 decisions, 7 risks, 7 to-dos

**13 Locked Decisions:**

| # | Topic | Decision | Reason |
|---|---|---|---|
| D1 | Pricing model | Per-tenant choice (`flat_pricing` / `per_tier_pricing`). Prizma = flat. | SaaS-clean — different chains use different models. Both via config. |
| D2 | Renewal | Manual, not auto | Auto-renewal requires stored payment method (PCI scope) — out for LIVE day-1 |
| D3 | Tier downgrade | Yes, with 6-month grace, per-tenant | Without downgrade tiers lose value. With grace, no resentment shock |
| D4 | Credit expiry | 24 months default, per-tenant | Caps liability + matches optical purchase cycle (18-24mo) |
| D5 | Enrollment channel | Website page ONLY — no in-store, no auto-opt-in via consent | Daniel directive: "all big chains work this way" — single high-quality data source, mandatory email collection |
| D6 | Family pooling policy | `equal` default + `head_only` available, per-tenant | Equal is simpler for customers; head-only fits Spotify/Apple Family pattern |
| D7 | Migration | None — start fresh | Existing `customers.qhaver=true` are leftover, no benefits owed |
| D8 | Coupons separation | M13 issues, M7 redeems | Pattern P9 (one entity, two homes) |
| D9 | Frames vs Lenses accrual | Model 1 — separate accrual rates, combined threshold | Customer thinks total spend, not category-split |
| D10 | Default category accrual | 0% — only frames + lenses earn | Safer default. Future products consciously enabled |
| D11 | Family scale_factor | 30% default (Prizma), per-tenant | Daniel pushed back on initial 50% — kids contribute less, encourage family signups |
| D12 | Welcome bonus | 5% immediate discount, ₪150 cap, 30-day window. Membership ₪50/₪100. | "Members should get back more than they paid in first purchase" |
| D13 | Family balance architecture | Shared household pool, default `open` mode, optional per-member cap requiring head approval. Two-tag traceability. | Daniel raised legacy Access pattern (manual codes). Rejected: "Access workaround for concurrency limitations we don't have. Don't replicate." |

**5 Future-proofing Slots:**
- P1 — Multi-program-per-tenant
- P2 — Cross-tenant pooling
- P3 — AI personalization
- P4 — Manual VIP tier override
- P5 — Multi-currency

**Lessons:**

1. **Anti-Access pattern check.** When user describes legacy process, classify: (a) genuine business need or (b) workaround for tech limitation. (b) should NOT inherit. D13 was textbook.
2. **"Basic spec" → "comprehensive Brief" expansion is a delivered service.** Basic captures intent; Brief captures implementation reality (5-10x expansion).
3. **Number tuning is separate from architecture.** Sequential: architecture first, numbers second.
4. **Don't anchor on first proposed numbers.** Daniel adjusted Silver 3→4%, scale 50→30%, both improved the design.
5. **Settings panel was missed initially.** New rule: any Brief with Pattern P19 must include settings-panel sketch by default.
6. **Customer-visible language matters.** Sketches use customer Hebrew, not engineering terms.

---

## Skill improvement proposals (apply to opticup-architect SKILL.md)

**Proposal 1 — Anti-Legacy-Pattern Check:**
When user describes a legacy process from old system (Access/Excel/paper), classify: (a) genuine business requirement or (b) limitation of legacy tech. If (b), do NOT replicate. Cite M13 D13 as canonical example.

**Proposal 2 — Settings sketch as mandatory deliverable:**
Any Brief with Pattern P19 (config table) must include a settings-panel sketch in deliverables list. Not optional.

---

## 2026-05-12 — M13 Brief Amendment — basic-free tier added (D14)

**Trigger:** During M9 D24 (2026-05-10), Architect identified a gap in the sealed M13 Brief: there was no membership type for leads who receive credits via M9 compensation or future Referral bonuses but haven't paid a membership fee. The 13 locked decisions all assumed paying members.

**Amendment scope:** Documentation-only, no code or DB changes. 5 files updated via Full-Auto Pipeline:
- `modules/Module 13 - Loyalty Club/architecture-brief/M13_LOYALTY_BRIEF.md` — §2 Tiers Prizma table extended + new `Tier basic-free` sub-section + §11 D14 entry
- `modules/Module 13 - Loyalty Club/architecture-brief/M13_DECISIONS_FOR_LOG.md` — this entry (D14)
- `.claude/skills/opticup-architect/references/decisions/M13.md` — module-level decision entry
- `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` — index entry under M13 sub-table + cross-module entry
- `OPEN_TASKS.md` — task #6 closed

**D14 — Basic-Free tier (auto-enrolled, no fee, credits-only)**

| Field | Value |
|---|---|
| **Created via** | Auto-create on first qualifying event for a non-member customer: (a) M9 issues a compensation credit (lab delay / quality issue / complaint resolution), OR (b) future Referral slot fires when an existing member's referral bonus is granted to a new customer |
| **Fee** | None (`annual_fee=0`, `annual_fee_paid_at IS NULL`) |
| **Receives** | Credits (the compensation/referral amount itself) in `loyalty_credit_balance` |
| **Does NOT receive** | accrual on purchases (`accrual_rate_*=0`), recurring bonuses, tier benefits, welcome bonus, family pool participation, expiry extensions, special discounts — all of those are paid-tier perks |
| **Lifecycle engines** | Excluded from cron promotion/downgrade engine — basic-free is not graded |
| **Redemption** | Same M7 Redeem Engine, same RPC, same RLS — `loyalty_redeem_credit(customer_id, amount, order_id)` |
| **Upgrade path** | Customer can upgrade to a paid tier (Silver/Gold/Diamond) via enrollment page anytime. On upgrade: `tier_id` updates, `annual_fee_paid_at = now()`, `expires_at = now() + 24mo`. **Existing credit balance is preserved** (not zeroed). |
| **Existing at LIVE-day** | No — created on-demand only |
| **Schema impact** | None. Same `loyalty_membership` row, same `loyalty_tier` config table — basic-free is a config row with `slug='basic-free', annual_fee=0, accrual_rate_*=0, is_default_tier=false, is_active=true`. Added at M13 seed time. |

**Rationale:**
1. Without basic-free, compensation credits from M9 had nowhere to land — either dropped (revenue/trust hit) or required forcing the customer through paid enrollment (friction at exactly the wrong moment, after a service failure).
2. Same applies to future Referral slot — referrer bonus must persist for a new customer who hasn't enrolled yet.
3. SaaS-clean: basic-free is a `loyalty_tier` config row, not a special-case in code. Other tenants can disable basic-free by setting `is_active=false` on that config row, or rename it, or change its display.
4. Anti-Access pattern (P32) holds: don't replicate a workaround where the modern stack offers a clean primitive. `loyalty_membership.tier_id → loyalty_tier(slug='basic-free')` IS the clean primitive.

**SaaS litmus:** A second tenant onboards. If they don't want compensation auto-enrollment → they set `loyalty_tier WHERE slug='basic-free' AND tenant_id=<theirs>` to `is_active=false`. Zero code change. Pass.

**Out of scope of this amendment:**
- Code changes (M13 doesn't exist yet — this is doc-only)
- DB changes (same)
- Sketch updates (basic-free has no separate sketch — it's an internal config row, not a customer-facing tier)
- Re-running Module Close Ceremony (M13 already closed; this is a targeted amendment)

**Mode:** Full-Auto Pipeline, single Claude Code chat, Foreman + Executor + Reviewer collapsed to one actor. Closed cleanly per `M13_BRIEF_AMENDMENT_BRIEF.md` acceptance criteria.

---

*Brief sealed 2026-05-10. Amended 2026-05-12 with D14 (basic-free tier). Sketches in `M13_SKETCHES.html`. Full Brief in `M13_LOYALTY_BRIEF.md`.*
