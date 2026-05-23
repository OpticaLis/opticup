# Module 6 — Prescriptions / Eye Exams — Module Spec

## Purpose

Holds the medical artifacts: eye_exams (the act) + prescriptions (glasses + contacts, separate tables per Brief Decision #12 multi-vertical scaling). Source of truth for the recall engine. Cross-module FK target from M7 orders.

## Architecture decisions (sealed)

- **M6 is independent of M5** — multi-vertical scaling (future M6-dental, M6-vet). Customers (M5) stays.
- **Two prescription tables, not one** — glasses ≠ contacts in field semantics (sphere vs power, no BC on glasses, no PD on contacts, etc.). UI unifies via toggle.
- **Pattern 11 (two-rows-for-symmetric-pair):** R and L eyes are separate rows in `prescription_glasses_eyes` / `prescription_contacts_eyes`. UNIQUE (prescription_id, eye).
- **Pattern 9 (state-machine):** prescription_status {draft, committed, superseded, expired, cancelled}. exam_status {scheduled, in_progress, completed, cancelled}.
- **Iron Rule 11:** prescription_number allocated atomically only on commit, via `allocate_tenant_number(_, 'prescription')`. Draft has NULL prescription_number.
- **Iron Rule 32:** `cancel_draft_prescription` hard-deletes draft + does NOT consume counter slot. Commit-then-supersede preserves the number (no reuse).
- **Pattern 10 (Fact-vs-Rule):** M6 emits `v_recall_due` (fact). M12 will own `recall_rules` (rule: channel, offset, template). M6 ≠ M12.

## State machines

### `exam_status`
```
scheduled → in_progress → completed → (immutable)
   ↓             ↓
cancelled  ←  cancelled
```

`exam_outcome` set when status=completed: {prescribed_glasses, prescribed_contacts, prescribed_both, no_change, referred_to_doctor, customer_declined}.

### `prescription_status` (both glasses + contacts)
```
draft → committed → superseded
         (number allocated)
   ↓         ↓
cancelled  expired (cron, future)
(hard-delete)
```

Transitions:
- draft → committed: `commit_prescription` RPC. Allocates prescription_number atomically. Fires `compute_recall_due_dates`.
- draft → (hard-delete): `cancel_draft_prescription` RPC. No counter touch.
- committed → superseded: `supersede_prescription` RPC. Old stays for history.
- committed → expired: future cron (deferred to recall engine SPEC).
- committed → cancelled: explicit cancel post-commit (rare; SPEC for it deferred).

## Multi-axis recall (Brief §13)

Each committed prescription gets ≥4 axes inserted into `prescription_recall_axes`:

| axis_kind | Glasses | Contacts | Default offset from commit |
|---|---|---|---|
| `next_exam` | ✅ | ✅ | +12m |
| `health_fund_validity` | ✅ | ✅ | valid_from + 24m (or expires_at) |
| `prescription_validity` | ✅ | ✅ | expires_at or +24m |
| `glasses_delivery` (disabled by default) | ✅ | ✅ | +7d after commit; M7 will enable on order creation |
| `fit_check` | ❌ | ✅ | +1m (contacts only) |

`v_recall_due` aggregates to 1-row-per-prescription using `ROW_NUMBER() OVER (PARTITION BY prescription_id ORDER BY due_at)` filtered to `is_enabled=true AND triggered_at IS NULL`.

## Cross-contract surfaces (M5 ↔ M6 bridge)

| Surface | Owner | Consumer | Notes |
|---|---|---|---|
| `v_customer_prescriptions_summary` (UNION glasses + contacts) | M6 | M5 customer card tab-3 | Read-only |
| `create_prescription_draft(p_tenant_id, p_customer_id, p_kind)` | M6 | M5 customer card "+ מרשם חדש" | Returns draft prescription_id |
| `clone_prescription(p_tenant_id, p_source_id, p_kind)` | M6 | M6 editor "שכפל מרשם" | Returns new draft prescription_id |
| `v_customer_for_exam` | M5 | M6 prescription editor header | Read-only |

## Out of scope (deferred)

- Recall engine cron activation — Phase C.
- OpticPlus migration — Phase D.
- Prescription editor UI — Phase E.
- M5 customer card tab-3 UI integration — Phase F.
- M1 lens_catalog FK on `prescription_contacts_eyes.lens_catalog_id` — M1↔M6 integration SPEC.
- M7 order auto-commit trigger — M7 SPEC will wire.
