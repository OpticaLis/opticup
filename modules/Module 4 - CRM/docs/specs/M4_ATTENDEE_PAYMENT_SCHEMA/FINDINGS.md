# FINDINGS — M4_ATTENDEE_PAYMENT_SCHEMA

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_ATTENDEE_PAYMENT_SCHEMA/FINDINGS.md`
> **Written by:** opticup-executor
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — Criterion 3 ("4 migration files") inconsistent with §8.4 + §8.3

- **Code:** `M4-SPEC-PAYMENT-01`
- **Severity:** INFO
- **Discovered during:** Pre-commit-5 verification of migration count.
- **Location:** SPEC §3 criterion 3 vs. §8.4 (Phase 99 drop) + §8.3 (view recreation directive).
- **Description:** Criterion 3 reads: *"Migrations folder has 4 new SQL files — 4 files."* But §8.4 explicitly defines a 5th migration `2026_04_25_payment_99_drop_legacy.sql` ("Note the migration's `99_` prefix — sorts last lexically."). And §8.3 directs the executor to re-create the view, which is also DDL and per §4.3 must go through `apply_migration`. So the SPEC's own §8 contents imply ≥5 SQL artifacts, while §3 criterion 3 still says 4.
- **Impact:** None operational — the migrations are correct. The criterion count is just out of sync with the rest of the SPEC.
- **Suggested next action:** TECH_DEBT for SPEC authoring methodology — the next SPEC author should cross-check criterion counts against §8 file lists in the §1.5 Cross-Reference step.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — Legacy SPEC docs and campaigns/ artifacts retain references to dropped columns

- **Code:** `M4-DOCS-PAYMENT-02`
- **Severity:** INFO
- **Discovered during:** §3.2 carve-out verification.
- **Location:**
  - `modules/Module 4 - CRM/go-live/specs/P22_COUPON_TRACKING/` (3 files: SPEC, EXECUTION_REPORT, FOREMAN_REVIEW)
  - `modules/Module 4 - CRM/docs/specs/CRM_PHASE_B4_EVENT_DAY/SPEC.md`
  - `campaigns/supersale/migrations/001_crm_schema.sql`
  - `campaigns/supersale/CRM_SCHEMA_DESIGN.md`
- **Description:** These files still mention `booking_fee_paid` / `booking_fee_refunded` because they document the historical state of the schema before this SPEC. They are documentation/planning artifacts, not active code. The criterion 17 grep filter (`grep -v "/specs/" | grep -v "/docs/"`) correctly excludes them.
- **Impact:** None — historical references preserved as audit trail of how the schema evolved. Editing them would rewrite history.
- **Suggested next action:** DISMISS. The pattern of "legacy SPEC docs retain references" is normal and matches how the Foreman previously dispositioned similar findings (e.g. CRM_UX_REDESIGN_TEMPLATES Finding 3 — soft-deleted artifacts retained as audit trail).
- **Foreman override (filled by Foreman in review):** { }

---

*End of FINDINGS.*
