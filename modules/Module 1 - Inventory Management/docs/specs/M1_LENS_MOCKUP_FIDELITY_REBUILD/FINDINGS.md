# FINDINGS — M1_LENS_MOCKUP_FIDELITY_REBUILD (Session 1)

**Generated:** 2026-05-18 evening
**Executor:** opticup-executor (Claude Code)

Findings discovered during Phase A + Phase H execution that are NOT in the SPEC and that warrant a follow-up action. One concern per task — these are NOT fixed inside this Pipeline (per executor SKILL §"Step 3 — Log findings as you go").

---

## F-1 (MEDIUM) — Phases B–G need 6 dedicated SPECs

**Location:** `modules/Module 1 - Inventory Management/docs/specs/`

**Description:** The Brief intended one mega-Pipeline to rebuild all 7 lens screens + apply skill updates. The session demonstrated that single-session execution exceeds the 4-hour soft cap by 3-4×. Phases B (Catalog Admin + Private Catalog), C (Purchase Order), D (Goods Receipt), E (Pricing), F (Active Designs Selection), G (Active POs List) need to be authored as their own SPEC folders + executed in dedicated sessions.

**Suggested next action:** Foreman (opticup-strategic) authors 6 SPECs:
- `M1_LENS_CATALOG_ADMIN_REBUILD/` (dual-screen: dark admin + light private — Phase B, CRITICAL)
- `M1_LENS_PURCHASE_ORDER_REBUILD/` (Phase C, CRITICAL — source-split 3 sections)
- `M1_LENS_GOODS_RECEIPT_REBUILD/` (Phase D, HIGH — v3 with M9 box linkage)
- `M1_LENS_PRICING_REBUILD/` (Phase E, HIGH — 3-column structure + bulk toolbar)
- `M1_LENS_DESIGNS_SELECTION_REBUILD/` (Phase F, HIGH — stats banner + brand grouping)
- `M1_LENS_POS_LIST_REBUILD/` (Phase G, MEDIUM — stat-card filters + progress bars)

Each SPEC inherits the P-AR-16 enforcement (mockup is mandatory input) now that Phase H landed.

---

## F-2 (LOW) — OPEN_TASKS.md not updated this session

**Location:** `OPEN_TASKS.md`

**Description:** The session did not update `OPEN_TASKS.md` to reflect (a) the 6 deferred-Phase SPECs that F-1 proposes, (b) the M1 lens-inventory partial rebuild now landed (a previously-open item), (c) the P-AR-16 rule now in force across the project. Per Architect skill ceremony cadence, this is the Architect's job — but the Executor could surface the gap.

**Suggested next action:** Foreman / Architect updates `OPEN_TASKS.md` at next ceremony (or whenever Phase B is dispatched).

---

## F-3 (LOW) — Unrelated pending entry still in archive

**Location:** `_archive/architect-pending-entries/2026-05-17_decisions_log_for_autonomous_skill.md`

**Description:** The Iron Rule 32 check + verify gate flagged a second pending entry as not yet applied. This entry is **out of scope** for the current Pipeline (it predates 2026-05-18 by one day, addresses a different skill, and is not referenced in the M1_LENS_MOCKUP_FIDELITY_REBUILD Brief). The session left it in place. Future Phase H-style "Apply pending entries" sweeps from any Pipeline should consume it.

**Suggested next action:** Either (a) the next architect-skill session opens this entry and applies it, or (b) a dedicated micro-SPEC `APPLY_2026_05_17_PENDING_ENTRIES` is dispatched. Not blocking any M1 work.

---

## F-4 (MEDIUM) — Existing `css/lens-tabs.css` exceeds Iron Rule 12

**Location:** `css/lens-tabs.css` (368 lines)

**Description:** Pre-existing debt — the file was already 368 lines before this session opened, exceeding the Iron Rule 12 target (300) and just above the absolute max (350). The session did NOT increase this file (Phase A overrides went into the new `css/lens-inventory-page.css`), but the existing debt remains. A pre-commit `file-size` check should be flagging this — either the check is permissive on .css files or it's mis-configured.

**Suggested next action:** TECH_DEBT entry, plus investigate why pre-commit didn't flag a 368-line file. Decompose `css/lens-tabs.css` into `shared-lens-primitives.css` (nav strips, chip base, stat-cards) + `lens-grid-base.css` (the legacy grid styles) in a dedicated `M1_LENS_TABS_CSS_DECOMPOSE` SPEC. Not urgent — does not block the per-page lens rebuilds since each gets its own `lens-{page}-page.css`.

---

## F-5 (HIGH) — Localhost servers + Chrome MCP fidelity check infra not exercised

**Location:** Pipeline infra (scripts/start-local.ps1 / Tier C VFV)

**Description:** The Brief §9 pre-flight specifies "Both localhost servers reachable" + per-Phase Tier C side-by-side Chrome MCP screenshots. This session did not exercise either. The skill-update commit `a23be91` now formalizes the procedure in `.claude/skills/opticup-localhost-tester/SKILL.md` but no Pipeline has actually run it yet. Phase B (the next session) should be the first to exercise the new procedure end-to-end, validating that the documented steps actually work.

**Suggested next action:** Phase B dispatch SHOULD include "exercise Tier C Mockup Fidelity Check on the Phase A surface as well as the Phase B surface" — closing the loop on Phase A 🟡 → 🟢 transition AND validating the new infra in one go.

---

## F-6 (INFO) — Architect Brief lacks "scope-realism" row in template

**Location:** Architect Brief template (implicit, exists in `.claude/skills/opticup-architect/`)

**Description:** Brief §1 stated "12-18 hours" and Brief §3 specified "4-hour soft cap" + Brief §8 said "Phases A+B MUST complete." The three statements are mathematically inconsistent. The Executor spent ~45 minutes deliberating which interpretation to follow before settling on the Brief §3 + §8 second-tier acceptance. A standardized "scope-realism" row in the Brief template would force the architect to reconcile these before the Brief ships.

**Suggested next action:** EXECUTION_REPORT §8 proposes the executor-side counterpart (P-EXEC-A: 60-second scope-reality check at execution start). The architect-side counterpart — adding the row to the Brief template — is a P-AR-XX candidate for the next ceremony.

---

*FINDINGS closed. 6 entries logged (2 LOW, 2 MEDIUM, 1 HIGH, 1 INFO).*
