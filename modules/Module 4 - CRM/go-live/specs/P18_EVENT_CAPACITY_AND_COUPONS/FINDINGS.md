# FINDINGS — P18_EVENT_CAPACITY_AND_COUPONS

> **Location:** `modules/Module 4 - CRM/go-live/specs/P18_EVENT_CAPACITY_AND_COUPONS/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — `js/shared.js` over the 350-line hard max blocks Rule 5 additions

- **Code:** `M4-DEBT-P18-01`
- **Severity:** MEDIUM
- **Discovered during:** Track A commit 1 (first attempt, `feat(crm): add max_coupons and extra_coupons to events schema`)
- **Location:** `js/shared.js` (408 lines pre-existing, 409 after a single FIELD_MAP entry addition)
- **Description:** `js/shared.js` is already 58 lines over the 350-line hard max enforced by `scripts/checks/file-size.mjs`. Any attempt to obey Iron Rule 5 (add new DB fields to FIELD_MAP) for a new column on any table referenced in shared.js now trips the pre-commit hook. This blocks P18's Rule 5 obligation (adding `max_coupons` and `extra_coupons` Hebrew↔English entries under `crm_events`). It will block every future SPEC that adds columns to any CRM, inventory, tenant, or other table that shared.js maps.
- **Reproduction:**
  ```
  $ wc -l js/shared.js
  408 js/shared.js

  # Add one FIELD_MAP entry → 409 lines
  $ git add js/shared.js && git commit -m "test"
  pre-commit: [file-size] js\shared.js:409 — file exceeds 350-line hard max
  ```
- **Expected vs Actual:**
  - Expected: FIELD_MAP updates are a one-line, reversible addition per new field per Iron Rule 5.
  - Actual: FIELD_MAP updates are blocked by a pre-commit hook because shared.js is pre-existing tech debt.
- **Suggested next action:** NEW_SPEC
- **Rationale for action:** This is a foundational shared file that every module depends on. Splitting it responsibly (e.g., `shared-field-map.js`, `shared-tenant.js`, `shared-constants.js`) requires Foreman-level architecture planning, not an executor side-task. The split is blocking all future Rule 5 work, so it should be prioritized as its own SPEC (estimate: 1 track, ~2 hours, includes `docs/FILE_STRUCTURE.md` update and grep-verification that no consumer breaks). In the meantime, P18's specific missing entries (`כמות קופונים`→`max_coupons`, `קופונים נוספים`→`extra_coupons` under `crm_events`) should be added as part of the split SPEC's follow-up commit.
- **Foreman override (filled by Foreman in review):** { }

---
