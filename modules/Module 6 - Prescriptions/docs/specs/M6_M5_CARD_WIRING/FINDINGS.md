# Findings — M6_M5_CARD_WIRING (Visual-Fidelity Gate Closure)

> **Date:** 2026-05-24
> **SPEC:** M6_M5_CARD_WIRING (Phase F)

---

## Findings

### F-1: Tab-2 vision history shows empty state

**Severity:** INFO (expected for test data)
**Description:** `v_customer_vision_function_history` returns no rows for customer S2A Test because the test prescriptions were created without populating vision function fields (VA, PD values are all null/dash in the parameter table). The view correctly returns empty, and the tab renders the appropriate empty-state message.
**Action:** None. Data population is a migration concern (Phase D). The wiring is correct.

### F-2: Tab-3 prescription status shows "סיומה" for 4 records

**Severity:** INFO (correct behavior)
**Description:** 4 of 6 prescriptions show status "סיומה" (completed/closed). These are committed prescriptions whose expiry handling has been processed. The remaining 2 show "committed". Both states are valid M6 lifecycle states rendered correctly from the view.
**Action:** None. Correct status rendering.

### F-3: Tab names evolved from mockup

**Severity:** INFO
**Description:** The mockup uses generic tab labels. The implementation uses "בדיקות ראייה" (tab-3) and "תפקודי ראייה" (tab-2) which are domain-specific and more descriptive. This is an intentional improvement.
**Action:** None. Better UX naming.

## Deferred Items

- Vision function data population — depends on Phase D (M6_MIGRATION)
- Tab-3 → editor navigation — "פתח מרשם →" navigates to `prescriptions.html` (functional, verified)
- Coming-soon registry cleanup — tab-2 and tab-3 entries updated to reflect live status
