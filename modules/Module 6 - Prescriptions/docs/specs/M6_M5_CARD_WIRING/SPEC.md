# SPEC — M6_M5_CARD_WIRING

> **Location:** `modules/Module 6 - Prescriptions/docs/specs/M6_M5_CARD_WIRING/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, night-run-2026-05-24)
> **Authored on:** 2026-05-24
> **Module:** 6 — Prescriptions (cross-module: M5 Customers consumer)
> **Phase:** F — M5 Customer Card Prescription + Vision Tab Wiring

---

## 0. Pre-Authoring Reality Check

- M5 customer card Phase D CLOSED: tab-3 (prescriptions) and tab-2 (vision) are STUB tabs using `showComingSoon`.
- `v_customer_prescriptions_summary` view exists (M6_SCHEMA, verified live).
- `customer-card-tab-prescriptions.js` exists and currently renders a coming-soon surface.
- `customer-card-tab-vision.js` exists and currently renders a coming-soon surface.
- `COMING_SOON_REGISTRY` in `customer-card-coming-soon.js` includes keys for Phase-E entries (tab-2 + tab-3 among them).
- M6_PRESCRIPTION_EDITOR SPEC sealed — provides the editor page that tab-3 navigates to.

### Cross-Module Contract Matrix

| Surface | Type | Owner | Consumer | Built in |
|---|---|---|---|---|
| `v_customer_prescriptions_summary` | View | M6 | M5 card tab-3 | M6_SCHEMA (exists) |
| `v_customer_vision_function_history` | View | M6 | M5 card tab-2 | M6_SCHEMA (exists) |
| `create_prescription_draft` | RPC | M6 | M5 card "+ מרשם" button | M6_SCHEMA (exists) |

---

## 1. Goal

Wire M5 customer card tab-3 (prescriptions) and tab-2 (vision) from coming-soon stubs to live data surfaces, consuming M6 views. Tab-3 shows a prescription summary table with a "+ מרשם חדש" button that creates a draft and navigates to the editor page. Tab-2 shows the vision function history timeline.

## 2. Background & Motivation

M5 customer card was built with placeholder tabs for prescriptions and vision, pending M6 schema delivery. M6 Phase A+B is now CLOSED. This SPEC flips both tabs from stubs to live data.

## 3. Success Criteria (Measurable)

| # | Criterion | Expected |
|---|---|---|
| SC-1 | Tab-3 loads prescription summary from `v_customer_prescriptions_summary` | Table renders with status badges |
| SC-2 | Tab-3 "+ מרשם חדש" calls `create_prescription_draft` and navigates to prescriptions.html | Navigation occurs with customer_id + prescription_id params |
| SC-3 | Tab-2 loads vision history from `v_customer_vision_function_history` | Timeline renders |
| SC-4 | Both tabs remove their coming-soon surface | `showComingSoon` calls removed from these tabs |
| SC-5 | COMING_SOON_REGISTRY updated — tab-2/tab-3 keys removed or marked live | Registry reflects reality |
| SC-6 | No regressions on other tabs (tab-1, tab-4, tab-5) | Existing behavior unchanged |
| SC-7 | Chrome MCP screenshot of tab-3 with prescription data | Attached to TEST_REPORT |
| SC-8 | Visual-Fidelity Gate: region comparison | In TEST_REPORT + FOREMAN_REVIEW |
| SC-9 | `npm run verify:integrity` PASS | exit 0 |

## 4. Autonomy Envelope

- Modified files: `customer-card-tab-prescriptions.js`, `customer-card-tab-vision.js`, `customer-card-coming-soon.js` (registry update).
- Read-only DB: SELECT from M6 views. One RPC call (create_prescription_draft).
- Chrome MCP for verification.
- Demo tenant only.

## 5. Stop-on-Deviation Triggers

- View returns unexpected shape or empty when data exists → STOP
- Tab regression (other tabs break) → STOP
- File exceeds 350 lines → split

## 6. Rollback Plan

Pure frontend — `git revert`. No DB changes.

## 7. Destructive Operations

**None.**

## 8. Out of Scope

- Prescription editor UI (M6_PRESCRIPTION_EDITOR SPEC)
- Order creation from prescription (M7)
- Recall axis editing (M12)
- Data migration (M6_MIGRATION)

## 9. Expected Final State

### Modified files

| Path | Change |
|---|---|
| `modules/customers/customer-card-tab-prescriptions.js` | Replace coming-soon with live data table from v_customer_prescriptions_summary |
| `modules/customers/customer-card-tab-vision.js` | Replace coming-soon with live vision history from v_customer_vision_function_history |
| `modules/customers/customer-card-coming-soon.js` | Remove/update tab-2 + tab-3 registry entries |
| `modules/Module 6 - Prescriptions/docs/SESSION_CONTEXT.md` | Update |
| `modules/Module 5 - Customers/docs/SESSION_CONTEXT.md` | Note tab activation |

## 10. Commit Plan

| # | Scope | Files |
|---|---|---|
| C1 | Tab-3 prescription summary + create button + navigation | customer-card-tab-prescriptions.js |
| C2 | Tab-2 vision history | customer-card-tab-vision.js |
| C3 | Coming-soon registry cleanup + docs + VFG evidence | coming-soon.js, SESSION_CONTEXTs, SPEC closure files |

## 11. Dependencies / Preconditions

- M6_SCHEMA Phase A+B CLOSED (provides views + RPCs)
- M6_PRESCRIPTION_EDITOR sealed (provides the navigation target page)
- M5 customer card Phase D CLOSED (provides the tab infrastructure)

## 12. Lessons Already Incorporated

- M6_SCHEMA P-AUTHOR-1: cross-contract matrix ✅
- Iron Rule 34: Visual-Fidelity Gate at closure ✅
- M5 patterns: coming-soon registry discipline (remove entries when going live)

## 13. Pre-Merge Checklist

- [ ] All files ≤ 350 lines
- [ ] No regressions on M5 tabs 1, 4, 5
- [ ] `npm run verify:integrity` exit 0
- [ ] Chrome MCP screenshots attached
- [ ] Visual-Fidelity Gate table present

## 14. Smoke Test Cases

| Case | Effect | Invariant | Type |
|---|---|---|---|
| S-1 | Open customer card → click tab-3 → prescription table loads | v_customer_prescriptions_summary returns data | Functional |
| S-2 | Click "+ מרשם חדש" on tab-3 → navigates to prescriptions.html | create_prescription_draft returns uuid, URL has customer_id | Functional |
| S-3 | Click tab-2 → vision history timeline renders | v_customer_vision_function_history returns data | Functional |
| S-4 | Click tab-1 → details tab still works | No regression | Regression |
| S-5 | Visual-Fidelity Gate: tab-3 region comparison | Matches M5 card style | Visual |
