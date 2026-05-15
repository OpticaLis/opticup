# FINDINGS — M7_CENTER_REDESIGN_V7_VARIANTS

> **Location:** `modules/Module 7 - Orders/docs/specs/M7_CENTER_REDESIGN_V7_VARIANTS/FINDINGS.md`
> **Written by:** opticup-executor
> **Written on:** 2026-05-11

Findings discovered during execution that are real but NOT in scope for this SPEC. Foreman to triage each → new SPEC / TECH_DEBT / dismiss.

---

## Finding 1 — Brief leaves `loc-strip` + `timeline` v6 regions unscoped

- **Severity:** LOW
- **Location:** `modules/Module 7 - Orders/architecture-brief/M7_CENTER_REDESIGN_BRIEF.md` §3 (lists 9 regions, but v6 also has `loc-strip` and `timeline` which are not in the 9)
- **Description:** v6 has 11 visible regions in the center column. The brief lists 9. The other 2 (location-override strip + 5-step sub-order timeline) are not in scope and were omitted from the 3 variants. If Daniel still wants them surfaced in v7, the chosen variant will need a place for them.
- **Suggested action:** Dismiss if Daniel confirms the 9-region list is final; otherwise add a follow-up SPEC `M7_CENTER_REDESIGN_V7_LOCATION_TIMELINE` after Daniel's variant pick to merge those 2 into the winner.

---

## Finding 2 — Module 7 has no `ROADMAP.md` yet (per README expectation)

- **Severity:** INFO
- **Location:** `modules/Module 7 - Orders/README.md` lines 8–9 mention `docs/` and `ROADMAP.md` "created when SPEC authoring begins" — but only `docs/` was created in this SPEC.
- **Description:** README contract says ROADMAP.md is created when SPEC authoring begins. This is technically the first SPEC, but no phases are defined yet — the Architect's build-phase plan hasn't been authored.
- **Suggested action:** Add to `TECH_DEBT.md` as M7-DEBT-01: "Module 7 ROADMAP.md missing — author when Architect drafts the M7 phase plan." Don't create it in this SPEC; phase planning is opticup-architect's responsibility, not Foreman's at this point.
