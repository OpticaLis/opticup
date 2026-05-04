# Strategic Flow Update — 2026-05-04

> **Context:** Captured during Supervisor session 2026-05-04, post-cutover (Prizma went live 2026-05-03). Daniel asked the Supervisor to describe the v1 module-build order. Initial Supervisor description placed M1 expansion (lenses/contacts/accessories) in the "parallel hardening" lane. Daniel pushed back: "How can M7 Orders start without the lens catalog?" — correct catch. This document captures the corrected flow.
> **Status:** Canonical statement of the corrected v1 module sequencing. If `MASTER_PLAN.md` (authored 2026-04-27, pre-cutover) hasn't been updated to reflect this, that's the first cleanup task the next strategic session should handle.

---

## What was wrong in the prior description

**Original MASTER_PLAN positioning (2026-04-27):** M1 expansion (Phases 6-9: lenses, contact lenses, accessories) was classified as a parallel hardening lane, gated on the repo split, "+1.5 weeks earlier added to launch timeline."

**Why that classification was wrong:** M7 (Orders) creates orders for products. For an "average Israeli optical chain" to run their entire business on Optic Up (the v1 launch criterion), orders must include lens prescriptions and contact-lens fittings — not only frames. Most opticals' revenue is in lenses, not frames. An optical that sells lenses cannot operate on the platform without M1 expansion. So M1 expansion is not hardening — it's a hard dependency for M7.

Prizma's current operation (frames-only on Optic Up, lenses still through Linet) is a Prizma-specific transitional state, not the v1 second-customer path.

---

## Corrected v1 module-build order

```
PHASE 0 — In progress now (1-2 days)
  Module 4 post-cutover backlog: POST-1 (broadcast 1000-cap),
  POST-7 (phone-search bug), Realtime → polling, etc.

PHASE 1 — Foundation (two parallel tracks; both must complete before Phase 2)

  Track A (Customer) — sequential within track:
    M5 Customers
       ↓
    M6 Eye Exam + Prescriptions
       ↓
    M6.5 Scheduling

  Track B (Catalog) — independent of Track A:
    M1 expansion (Phases 6-9: lenses, contacts, accessories)

PHASE 2 — Order convergence (sequential, on critical path)
  M7 Orders (incl. coupons, returns, exchanges)
     ↓
  M8 Payments (Z-Credit + Linet)

PHASE 3 — Side lanes (start when their dependencies are met)
  M10 Branches — anytime (structural, no dependency on Phase 1/2)
  M9  Lab + KDS — after M7 (workflow on orders)
  M11 Reports v1 — after M5+M7+M8 (read-only views over the data)
  M12 WhatsApp Customer — after M5 (customer comms)
  M13 Loyalty Club — after M7+M8 (spend tracking + redemption)

PHASE 4 — Hardening (parallel, anytime during Phases 1-3)
  15 HIGH-priority Sentinel security alerts (~1 week)
  M2 onboarding wizard polish

LAUNCH GATE (v1)
  All Phase 1 + Phase 2 modules operational.
  M10 (branches) operational.
  Customer journey end-to-end QA on demo tenant (3 personas).
  System ready for second-customer operator-driven onboarding.
```

---

## Critical dependency map (the picture in one place)

```
                         [Phase 0: M4 post-cutover fixes]
                                    │
                                    ▼
            ┌───────────────────────────────────────────┐
            │              PHASE 1 — Foundation          │
            │                                             │
            │   Track A:                  Track B:        │
            │   ┌─────────┐               ┌──────────┐   │
            │   │   M5    │               │    M1    │   │
            │   │Customers│               │ expansion│   │
            │   └────┬────┘               └─────┬────┘   │
            │        ▼                           │       │
            │   ┌─────────┐                      │       │
            │   │   M6    │                      │       │
            │   │ Eye Exam│                      │       │
            │   └────┬────┘                      │       │
            │        ▼                           │       │
            │   ┌─────────┐                      │       │
            │   │   M6.5  │                      │       │
            │   │Scheduling│                     │       │
            │   └────┬────┘                      │       │
            │        │                           │       │
            └────────┼───────────────────────────┼───────┘
                     │                           │
                     └─────────────┬─────────────┘
                                   ▼
                          ┌────────────────┐
                          │       M7       │  ← convergence point
                          │   Orders +    │
                          │  coupons +    │
                          │   returns      │
                          └────────┬───────┘
                                   ▼
                          ┌────────────────┐
                          │       M8       │
                          │   Payments    │
                          │  Z-Credit+Linet│
                          └────────┬───────┘
                                   │
                  ┌────────────────┼────────────────┐
                  ▼                ▼                ▼
              [M9 Lab]       [M11 Reports]   [M13 Loyalty]
              (after M7)    (after M5+M7+M8) (after M7+M8)

   [M10 Branches] — anytime, structural; doesn't depend on the above chain
   [M12 WhatsApp Customer] — after M5 only
```

---

## Timeline impact

The original timeline (~14-15 weeks; late August / early September 2026) already counted M1 expansion's +1.5 weeks. **The correction does NOT change the total duration** — it only repositions M1 expansion from "parallel hardening" to "critical-path foundation."

If M1 expansion (~1.5 weeks) is shorter than the M5→M6→M6.5 sequential chain (~5 weeks), M1 expansion fits comfortably inside the M5→M6→M6.5 window. No timeline extension. The risk that M1 expansion couldn't ship in time was previously hidden by the "hardening" classification; making it explicit critical-path makes the dependency plannable.

---

## Implications for "what to do in parallel right now"

Daniel asked earlier in this session what work could run safely in parallel during the post-cutover M4 fixes. The original answer surfaced:
- Module 5 SPEC review (Module Strategist)
- M2 onboarding wizard polish
- Seed data preparation for M5/M6 (Daniel-owned content decisions)

**This document adds:** **M1 expansion SPEC review should run in parallel with M5 SPEC review.** Both are Phase 1 foundation tracks. Reviewing both now means Track A and Track B can launch simultaneously the moment M4 fixes stabilize.

Specifically: the Module Strategist should refresh both M5's SPECs (Phases A schema, B UI, C consent form, D contracts) AND M1's expansion SPECs (Phases 6 lenses, 7 contacts, 8 accessories, 9 unified view) against the post-cutover production-discipline rules. Both sets of SPECs were drafted before cutover; both need a refresh against the new operating constraints.

---

## Action for the next Supervisor session

1. Read this document early in the session.
2. Verify whether `MASTER_PLAN.md` reflects the corrected flow. If not, propose an update SPEC for the Module Strategist (small SPEC — text edit only).
3. When Daniel signals readiness to start Phase 1: dispatch Module Strategist to refresh BOTH M5 SPECs AND M1 expansion SPECs in parallel.
4. Track Phase 1 progress as two independent burndowns (Track A + Track B), converging at M7.

— Supervisor (opticup-strategic), 2026-05-04.
