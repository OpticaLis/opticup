# M6_SCHEMA — Findings

## F-M6-1 — Orphan enum `contact_lens_wearing_schedule` in DB

The pre-existing enum `contact_lens_wearing_schedule {daily, weekly, monthly, yearly}` was probed at chain start and is unused. M6 explicitly created two new enums with distinct semantics: `cl_replacement_period` (same value set: daily/weekly/monthly/quarterly/yearly, used for "כל כמה זמן מחליפים") + `cl_wear_schedule` (daily_remove_at_night / extended_wear, used for "מתי-מחליפים").

**Decision:** TECH_DEBT — deferred cleanup. Drop `contact_lens_wearing_schedule` in a future cleanup SPEC after verifying it truly has zero consumers (grep all Edge Functions, view bodies, RPC bodies, triggers).

## F-M6-2 — Prescription number is shared across glasses+contacts on same tenant

`allocate_tenant_number(p_tenant_id, 'prescription')` allocates a single sequence regardless of kind. So glasses #5 and contacts #5 cannot coexist on the same tenant. The next prescription (whether glasses or contacts) gets the next integer.

**Decision:** dismiss; this is intentional and matches the OpticPlus pattern (single עוקב per tenant). If Daniel wants per-kind sequences in the future, that's a deliberate design change requiring a separate SPEC.

## F-M6-3 — `v_prescription_full_for_editor` exposes parent columns only (no eyes join)

The view exposes the parent table's columns. The editor reads child eyes (`prescription_glasses_eyes` or `prescription_contacts_eyes`) separately. Reason: the editor needs editable per-eye fields, and a flat join would lose the R/L row identity.

**Decision:** dismiss; documented in DDL Step 9 comment.

## F-M6-4 — Legacy `prescriptions` table (0 rows) — different shape

The legacy `public.prescriptions` table (18-col flat shape) was probed at chain start and left untouched per Brief anti-creep. M6's new `prescriptions_glasses` + `prescriptions_contacts` are the canonical going-forward. The legacy stub will be addressed in a future cleanup SPEC once M7 verifies no consumer.

**Decision:** TECH_DEBT — already logged in M5 FINDINGS F4; not re-logged here.

## F-M6-5 — `prescription_contacts_eyes.lens_catalog_id` FK deferred

The column exists (uuid, nullable) but has no FK constraint to M1's lens_catalog tables. Reason: M1 lens_catalog tables (`lens_brand`, `lens_design`, `lens_variant`) exist in DB but the specific CL-catalog integration semantics need a dedicated SPEC.

**Decision:** dismiss; deferred FK addition tracked in TECH_DEBT for M1↔M6 integration SPEC (future).

## F-M6-6 — Recall axes `next_followup_at` field on prescription parent is unused at day-1

`prescriptions_glasses.next_followup_at date` exists but isn't read by any view or RPC. It's a UI-facing field for the optometrist's note about "ביקורת חוזרת מתוכננת". The recall axes table is the data-driven source; this field is metadata.

**Decision:** dismiss; documented as UI-facing.

## F-M6-7 — `compute_recall_due_dates` returns count but doesn't track which axes were skipped

The function deletes-then-inserts 4 axes for glasses + 5 for contacts. There's no audit trail of WHY a specific axis was chosen or skipped. The Brief §13 mentioned "ברירת-מחדל offset" but didn't ask for per-axis configurability (deferred to M12 recall_rules).

**Decision:** dismiss; deferred to M12 SPEC.

## F-M6-8 — `v_recall_due` aggregates to 1-row-per-prescription via window function

Used `ROW_NUMBER() OVER (PARTITION BY prescription_id ORDER BY due_at ASC)` then filter rn=1 to surface the soonest axis. Brief §5.7 confirmed this approach prevents M12 data-flood.

**Decision:** dismiss; intentional design.

## Summary

| # | Severity | Decision |
|---|---|---|
| F-M6-1 | Low | TECH_DEBT (orphan enum cleanup) |
| F-M6-2 | None | Intentional per-tenant single sequence |
| F-M6-3 | None | Intentional (editor reads child separately) |
| F-M6-4 | Low | TECH_DEBT (legacy prescriptions cleanup) — already F4 of M5 |
| F-M6-5 | Low | TECH_DEBT (M1↔M6 integration SPEC) |
| F-M6-6 | None | UI-facing field |
| F-M6-7 | None | Deferred to M12 SPEC |
| F-M6-8 | None | Intentional |

No findings require reopening. Verdict candidate: 🟢 CLOSED.
