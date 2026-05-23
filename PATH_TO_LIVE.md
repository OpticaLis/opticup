# Path to LIVE — Ordered Tracking Checklist

> **Purpose:** the single ordered "what's left to finish everything" view, in plain terms.
> **Backbone:** synthesized from `MASTER_ROADMAP.md` §2 Build Order + `OPEN_TASKS.md`. Those remain authoritative; this file is the followable summary on top of them.
> **Created:** 2026-05-23 by opticup-architect. **Update:** tick a box when a phase closes; re-sync against MASTER_ROADMAP at each module close.
> **How to read status:** ✅ done · 🟢 closed-clean · 🟡 closed-with-followups · 🔨 in progress · ⬜ not started.

---

## The big picture in one paragraph

The **data spine is built**: M5-M9 schemas are all 🟢 (customers → prescriptions → orders → payments → lab). What remains to reach LIVE is mostly **building the screens (UI)** on top of that spine for 9 modules, plus a few infrastructure tasks and the final historical-data migration at cutover. We are mid-way through the FIRST screen module (M5): the customer card is done 🟢, the customer list is next.

---

## Stage 1 — Finish the screens for the core 5 modules (the critical path)

These five are the operational heart (a customer walks in → has a prescription → places an order → pays → it goes to the lab). Schemas all 🟢; this stage is UI.

### M5 — Customers
- [x] Schema (Phase A+B) — 🟢
- [x] Leads rollover into customers — 🟢 (Prizma 1,296 + demo 4)
- [x] Phase D — Customer Card UI (5 tabs) — 🟢 (the first-screen template)
- [x] **Phase E — Customer List + create-mode UI** — 🟢 **CLOSED 2026-05-23** (Sketch 2 Split Workspace + dedup-safe create via create_customer RPC; M5 screen layer complete)
- [ ] Phase C — OpticPlus 5,028-customer historical import ⬜ (cutover-time, deferred by Daniel decision 2026-05-23: "screens first, migrate customers after")

### M6 — Prescriptions / Eye Exams
- [x] Schema (Phase A+B) — 🟢
- [ ] Phase C — recall engine cron ⬜
- [ ] Phase E — Prescription Editor UI ⬜
- [ ] Phase F — wire into M5 customer-card tab-3 + lights up the card's Vision tab (`v_customer_vision_function_history`) ⬜
- [ ] Phase D — OpticPlus prescription migration ⬜ (cutover-time)

### M7 — Orders
- [x] Schema (Phase A+B) — 🟢
- [ ] Phase D — Order screen UI (Variant A locked) ⬜
- [ ] Phase E — 5 print forms ⬜
- [ ] Phase F — helper screens ⬜
- [ ] Phase G — cross-module wiring ⬜
- [ ] Phase C — OpticPlus 9,805-order migration ⬜ (cutover-time)

### M8 — Payments
- [x] Schema (Phase A+B) — 🟢
- [ ] Phase E — Checkout UI (lives inside M7) ⬜
- [ ] Phase F — Daily-close UI ⬜
- [ ] Phase G — Checks Pipeline UI ⬜
- [ ] Phase D — Provider Config UI ⬜
- [ ] Phase C — real payment adapters (Linet/Gama/Z-Credit) — Daniel-in-loop + NDA ⬜ (can be post-LIVE; manual receipts work day-1)
- [ ] Phase H — OpticPlus 1,160 credit-installment migration ⬜ (cutover-time)

### M9 — Lab / KDS
- [x] Schema (Phase A+B) — 🟢
- [ ] Phase C — KDS ("McDonalds") screen UI ⬜
- [ ] Phase D — Shipments UI ⬜
- [ ] M12 message templates (6) + M13 compensation RPC wiring ⬜
- [ ] Production pg_cron schedule (clock engine) ⬜
- [ ] M1-extension blocker for lens-specific stock FKs ⬜ (note: M1 contact-lens + accessory tables already shipped 2026-05-16)

---

## Stage 2 — The supporting modules

Schemas/briefs exist (all sketches v1 sealed). Build after the core 5 are usable. Several can run in parallel once the monorepo split lands.

- [ ] **M11 — Reports** ⬜ (manager dashboard + supplier portal; consumes M5-M9 views)
- [ ] **M12 — Communications** ⬜ (inbox + templates + channel configs; M9 + M4 lean on it)
- [ ] **M13 — Loyalty Club** ⬜ (incl. basic-free tier; M9 compensation auto-enrolls)
- [ ] **M14 — Appointments** ⬜ (calendar + sub-screens)
- [ ] **M15 — Queue** ⬜ (embedded in M14 calendar)

---

## Stage 3 — Infrastructure (do alongside, before tenant #2 / before LIVE)

- [ ] **Monorepo migration** ⬜ — sealed + validated, awaiting dispatch. Unblocks parallel M7+M9 builds. Prereqs: M1 Phase 2 + funnel settle, hook-comment fix (0b), backup tags, write-freeze.
- [ ] **TD-2 — migrations git drift** ⬜ — 31 MCP-applied migrations not in git. HIGH; SaaS-blocker before a second tenant onboards.
- [ ] **M13 + M9 sketch revision** ⬜ — the 2 outliers (M13 gold-gradient → SaaS-clean; M9 had sketches, now needs the build-time UI). Note: M9 has 4 sketch files already.
- [ ] Supervisor: Shadow → Active flip + Phases 2/3 ⬜ (autonomy quality-of-life, not LIVE-blocking)
- [ ] Small defensive sweeps (security RPC audit 0a, hook-comment fix 0b, brand-cascade 0c, function-revokes 0d) ⬜
- [ ] M1 Stage 2A.5 tenant-dropdown inversion (#10) ⬜

---

## Stage 4 — Cutover to LIVE

- [ ] All Stage-1 screens usable on demo + QA'd (Chrome MCP per Iron Rule 34)
- [ ] Historical data migrations run against Prizma (the deferred Phase C/D/H items above): 5,028 customers + prescriptions + 9,805 orders + 1,160 credit-installments — backup-first, reconciled like the leads migration
- [ ] TD-2 closed (git-clean migrations)
- [ ] Final go-live verification + merge to main (Daniel-only, via PR)

---

## Honest framing of "how much is left"

- **The hard part is Stage 1** — building the screens for the 5 core modules. MASTER_ROADMAP estimates the full 9-module UI build at ~6-8 weeks.
- **Everything downstream of the schema is UI + wiring**, not new architecture — the spine, contracts, and sketches are all done and verified.
- **The historical-customer/order migrations are cutover-time**, deliberately deferred so screen-building keeps momentum.
- **Right now:** M5 screen layer is **complete** (card + list + create-mode all 🟢 as of 2026-05-23). M6 (Prescriptions UI — recall engine + editor + Phase F wiring into the card's tab-3/Vision tab) is the immediate next module.

---

*This file is a summary map. MASTER_ROADMAP.md §2 + each module's ROADMAP.md are authoritative for detail. OPEN_TASKS.md is authoritative for "what's actively claimed right now."*
