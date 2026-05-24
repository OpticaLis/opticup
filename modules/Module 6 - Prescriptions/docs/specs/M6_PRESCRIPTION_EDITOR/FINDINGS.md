# Findings — M6_PRESCRIPTION_EDITOR (Visual-Fidelity Gate Closure)

> **Date:** 2026-05-24
> **SPEC:** M6_PRESCRIPTION_EDITOR (Phase E)

---

## Findings

### F-1: Sidebar uses visit-based grouping instead of flat prescription list

**Severity:** INFO (not a bug)
**Description:** The mockup shows a flat list of individual prescriptions in the sidebar. The implementation uses visit-based grouping (one sidebar item per exam visit, showing stage count). This is an intentional design evolution — the visit-based model better reflects the clinical workflow where a single visit produces multiple stages (old/objective/subjective/final).
**Action:** None. Document as INTENTIONAL.

### F-2: R→L copy button hidden in COMMITTED state

**Severity:** INFO (correct behavior)
**Description:** The mockup always shows the "העתק לעין שמאל" button in the ADD block. The implementation hides it in COMMITTED state because the form is read-only. The button appears in DRAFT state.
**Action:** None. Correct UX behavior.

### F-3: Date fields show dd/mm/yyyy placeholder instead of populated dates

**Severity:** LOW (data gap in test records)
**Description:** The meta grid date fields (prescription date, expiry date) show "dd/mm/yyyy" placeholder rather than populated dates for some test prescriptions. This occurs because the test data records created during smoke testing did not populate all meta fields.
**Action:** Deferred — data population is a migration concern (Phase D). The UI correctly renders dates when present.

### F-4: Health fund info shows "אין מידע קופ"ח" for test customer

**Severity:** INFO (expected for test data)
**Description:** The health fund card in the bottom strip shows "אין מידע קופ"ח" because the test customer S2A Test has no health fund configured.
**Action:** None. Correct empty-state behavior.

## Deferred Items

- Phase D (M6_MIGRATION): Will populate real prescription data from OpticPlus legacy system
- Phase G+: Print/send actions (currently coming-soon registered)
- Recall axis editing (M12 dependency — currently read-only display)
