# Brief — M5 Customer Card: 🟡 → 🟢 Closure

> **Author:** opticup-architect (Cowork) · **Date:** 2026-05-23
> **Activation Prompt:** `M5_UI_CUSTOMER_CARD_CLOSURE_ACTIVATION_PROMPT.md` (sibling — paste THAT into Claude Code).
> **Type:** small closure SPEC, Daniel-in-loop on the one UX point (already settled below).
> **Closes:** the two non-🟢 follow-ups from `docs/specs/M5_UI_CUSTOMER_CARD/FOREMAN_REVIEW.md` — **T11** (visual fidelity partial) + **F-T5-DESIGN** (dead Locked badge).
> **Why now:** this is the FIRST UI on the M5-M9 spine = the template every later screen copies. Closing it cleanly to 🟢 before Phase E means later screens inherit a clean pattern, not open corners.

---

## 0. One-paragraph summary

The M5 customer card is functional, secure, and closed 🟡 with two small, non-blocking follow-ups. This SPEC clears both: (1) complete the **mockup-vs-live pixel-fidelity** capture that timed out at the last close, and (2) **remove the dead "Locked" badge** (it was wired to `is_deleted`, but the card's views hide deleted customers, so it can never light up — confirmed dead code). Both are tiny. No new features, no schema change, no Prizma writes, no merge to main. After this, the card is 🟢 and Phase E (customer list + create-mode) is the next UI SPEC.

## 1. Item A — T11 visual fidelity (the only "work")

**Problem:** at the last close, full-page Chrome-MCP screenshots intermittently hit `Page.captureScreenshot timed out`. Coverage fell back to viewport JPEGs + a11y structural snapshots — enough to satisfy Iron Rule 34's runtime-trace+DB-evidence branch, but the **pixel-level mockup-vs-live diff was left partial** (Tabs 1/2/4 captured; not a full clean set across all 5 tabs).

**This is a capture-technique problem, NOT a code problem.** The card renders correctly; the screenshot tool timed out on full-page captures.

**Required:** produce a clean visual-fidelity set across ALL 5 tabs against live demo data, using a capture method that doesn't time out — e.g. per-tab viewport-height JPEG captures (the JPEGs succeeded last time), or scroll-and-stitch, or capturing each tab at a fixed viewport. For each tab: a live screenshot + a one-line fidelity note vs the mockup (`M5_CUSTOMER_CARD_MOCKUP.html`). Material drift (beyond the already-settled stub/blur/coming-soon decisions) is a finding to flag, not silently pass (memory `feedback_no_polish_by_validation`).

**Allowed code touch for Item A:** only genuinely-cosmetic fidelity fixes the diff surfaces (e.g. a spacing/label/pill-color mismatch vs mockup) — small, surgical, no behavior change. If the diff surfaces something structural → STOP and escalate, don't expand scope.

## 2. Item B — remove the dead "Locked" badge (F-T5-DESIGN)

**Settled decision (Foreman + Daniel, 2026-05-23): REMOVE the badge.** Rationale: the badge checks `customer.is_deleted === true`, but `v_customer_for_exam` + `v_customer_full` both filter `is_deleted=false` at the base table, so a deleted customer never loads into the card → the badge is unreachable through any normal path → it's a ghost label that promises a state the UI can't show. A ghost badge is misleading; remove it.

**Required:**
- Remove the "Locked / נעול" badge from the card's status-badge row (the render + any handler/registry entry specific to it). Keep the real wired badges (Inactive = `lifecycle_stage='dormant'`) and the blurred coming-soon badges (VIP / club / subscription / queue) exactly as they are — only the Locked badge goes.
- Leave the shared `showComingSoon()` / `COMING_SOON_LABEL` / `COMING_SOON_REGISTRY` machinery intact; Locked was NOT one of the coming-soon set, so this is a clean removal, not a registry change (verify before editing).

**Do NOT, in this SPEC:** build a customer-lock feature, build an include-deleted/audit mode, or add any new badge. Those are documented future wants (see §4) — out of scope here. This SPEC only deletes dead UI.

## 3. Closure gate — Iron Rule 34

Card re-closes 🟢 only when:
1. Clean visual-fidelity set across **all 5 tabs** (Item A) attached to the updated FOREMAN_REVIEW / TEST_REPORT, each with a mockup-vs-live note.
2. Confirmation (screenshot + the badge-row a11y snapshot) that the Locked badge is gone and the remaining badges (real + blurred) are unchanged.
3. A short runtime re-check that the card still boots clean (no console errors) after the Item-B edit.

Update the SPEC folder's TEST_REPORT + FOREMAN_REVIEW to flip T11 ⚠→✅ and F-T5-DESIGN to RESOLVED, and update M5 SESSION_CONTEXT + ROADMAP (Phase D ⬜/🟡 → ✅ 🟢).

## 4. Documented future wants (record, do NOT build)

Surfaced while removing the Locked badge — log these in M5 SESSION_CONTEXT "what's next" + TECH_DEBT, do NOT implement here:
- **Customer LOCK (new feature):** block an ACTIVE customer from edits/actions without deleting (freeze for debt / dispute / pending check). Distinct from soft-delete. Needs an Architect cross-module pass (likely gates M7 order-creation / M8 payment edits for a locked customer) before it becomes a SPEC.
- **See-deleted / audit mode (smaller):** a future include-deleted view (in Phase E list or a dedicated audit screen) that would make a real "deleted" indicator reachable.

## 5. Constraints

- Branch develop. Demo tenant only (`8d8cfa7e-...`, PIN 12345). No Prizma writes. No schema change. No merge to main.
- Surgical edits only (Working Rule 9.3) — Item B is a deletion of dead UI; Item A is capture + at-most cosmetic fixes. No logic changes.
- Iron Rules in focus: 7 (shared.js abstraction — untouched), 8 (sanitization — untouched), 12 (file size — removal helps), 21 (no orphans — removing dead code IS the rule), 34 (Chrome closure).
- Integrity gate clean before each commit; selective git add by filename; backup per Working Rule 9.9 only if the trigger fires (likely won't — this is a small edit).
- Continue in the SAME Claude Code session if context is healthy (Claude Code ~1M tokens; this is a small follow-on to the build session) — fresh session only if budget is genuinely low.

## 6. What Daniel has at the end

The M5 customer card at 🟢 — full visual-fidelity proof across all 5 tabs, dead Locked badge gone, clean boot. The first-screen template is now spotless for every later M5-M9 screen to copy. Next UI = M5 Phase E (customer list + create-mode). Two future wants (customer-lock, see-deleted) are on record for when Daniel prioritizes them.

---

*End of Brief. Small closure: T11 fidelity + remove dead badge. No new features. Demo only. No merge to main.*
