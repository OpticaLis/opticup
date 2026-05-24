# Module 6 — Prescriptions — Module Map

## Tables (M6-owned)

| Table | Pattern | RLS | Owner of relationship |
|---|---|---|---|
| `eye_exams` | state-machine (Pattern 9); FK customer_id+exam_date+optometrist | canonical 2-policy | M6 |
| `prescriptions_glasses` | state-machine + Iron Rule 11 number | canonical 2-policy | M6 |
| `prescription_glasses_eyes` | Pattern 11 (R/L child rows); ON DELETE CASCADE | canonical 2-policy | M6 |
| `prescriptions_contacts` | state-machine + Iron Rule 11 + CL-specific fields | canonical 2-policy | M6 |
| `prescription_contacts_eyes` | Pattern 11 (R/L) | canonical 2-policy | M6 |
| `prescription_types` | config table per-tenant + capability flags (P19) | canonical 2-policy | M6 |
| `lens_manufacturers` | config table per-tenant (P19) | canonical 2-policy | M6 |
| `prescription_recall_axes` | multi-axis recall storage; partial idx WHERE is_enabled AND triggered_at IS NULL | canonical 2-policy | M6 |

## Enums (M6 — 19)

State-machines: `exam_status`, `exam_outcome`, `exam_type`, `prescription_status`, `prism_base`, `eye_side`, `recall_axis_kind`, `prescription_kind`.
Property sets: `prescription_source`, `prescription_exam_reason`, `prescription_treatment`, `prescription_refraction_method`, `glasses_lens_type`, `glasses_lens_material`, `cl_lens_type`, `cl_replacement_period`, `cl_wear_schedule`, `cl_material`, `cl_tint`.

## Functions (7 RPCs)

| Name | Signature | Purpose |
|---|---|---|
| `create_exam` | `(p_tenant_id, p_customer_id, p_exam_date, p_optometrist_id) → uuid` | Initial scheduled exam |
| `create_prescription_draft` | `(p_tenant_id, p_customer_id, p_kind) → uuid` | **M5↔M6 cross-contract entry-point.** Returns draft prescription_id |
| `commit_prescription` | `(p_tenant_id, p_prescription_id, p_kind, p_type_id, p_eyes_data jsonb) → jsonb` | Atomic. Calls allocate_tenant_number. Inserts both eyes. Fires compute_recall_due_dates |
| `cancel_draft_prescription` | `(p_tenant_id, p_prescription_id, p_kind) → boolean` | Iron Rule 32. Draft only. Counter UNCHANGED |
| `supersede_prescription` | `(p_tenant_id, p_old_id, p_new_id, p_kind) → void` | committed → superseded |
| `compute_recall_due_dates` | `(p_tenant_id, p_prescription_id, p_kind) → integer` | Generates 4 axes for glasses, 5 for contacts |
| `clone_prescription` | `(p_tenant_id, p_source_id, p_kind) → uuid` | Creates new draft from source (parent + eyes copied) |

| `process_due_recalls` | `(p_tenant_id) → integer` | Recall engine: marks due axes triggered, optionally queues M4 messages |

All SECURITY DEFINER + Block A header + REVOKE anon/PUBLIC + GRANT authenticated+service_role.

## pg_cron Jobs

| Job | Schedule | Command |
|---|---|---|
| `m6_recall_engine` | `0 8 * * *` (daily 08:00 UTC) | `SELECT process_due_recalls(id) FROM tenants WHERE is_active = true` |

## Views (9)

| View | Consumer | Purpose |
|---|---|---|
| `v_exam_for_customer` | M5/M6 customer card | Read-only exam summary |
| `v_exam_for_doctor` | UI optometrist | Wider exam detail |
| `v_prescription_glasses_for_order` | M7 future | Committed prescriptions only; eyes joined |
| `v_prescription_contacts_for_order` | M7 future | Same for contacts |
| `v_recall_due` | M12 future | Window-fn 1-row-per-prescription with soonest axis |
| `v_prescription_history_for_customer` | M11 | UNION glasses + contacts, all statuses |
| **`v_customer_prescriptions_summary`** | M5 customer card tab-3 | **Cross-contract; M6 owns** |
| `v_prescription_full_for_editor` | M6 editor center | Parent fields only; eyes read separately |
| `v_prescriptions_list_for_customer` | M6 editor sidebar | UNION glasses + contacts; compact |

All views WITH (security_invoker = on).

## UI Files (Phase E — Prescription Editor)

| File | Purpose |
|---|---|
| `prescriptions.html` | ERP page entry point (root) |
| `css/prescriptions.css` | Page CSS (Hybrid+Navy tokens + layout) |
| `modules/prescriptions/rx-editor.js` | Bootstrap + state + type toggle |
| `modules/prescriptions/rx-sidebar.js` | History sidebar + search + filters |
| `modules/prescriptions/rx-center.js` | Center editor layout + context bar + lifecycle |
| `modules/prescriptions/rx-meta-grid.js` | Meta grid (7 fields) rendering + autosave |
| `modules/prescriptions/rx-param-table.js` | Per-eye refraction table (17 fields × 2 eyes) |
| `modules/prescriptions/rx-add-block.js` | Per-eye ADD block (4 fields × 2 eyes + copy R→L) |
| `modules/prescriptions/rx-secondary.js` | Secondary row (glasses) |
| `modules/prescriptions/rx-notes.js` | Notes + recall axes display + HF info + print strip |
| `modules/prescriptions/rx-contacts-params.js` | Contacts per-eye table (14 fields × 2 eyes) |
| `modules/prescriptions/rx-contacts-secondary.js` | Contacts secondary (manufacturer, model, etc.) |

## Re-used M5 infrastructure

- `allocate_tenant_number(p_tenant_id, p_entity_kind)` called with `'prescription'` — produces atomic per-tenant prescription_number. Iron Rule 11 preserved.
- `tenant_number_counters` row per (tenant_id, 'prescription'). Lazy-initialized on first commit.

## T-constants added to js/shared.js

```js
EYE_EXAMS, PRESCRIPTIONS_GLASSES, PRESCRIPTION_GLASSES_EYES,
PRESCRIPTIONS_CONTACTS, PRESCRIPTION_CONTACTS_EYES,
PRESCRIPTION_TYPES, LENS_MANUFACTURERS, PRESCRIPTION_RECALL_AXES
```

## Cross-module contract entry points

| Surface | Direction |
|---|---|
| `customers.id` PK | M6 ← M5 (FK in eye_exams, prescriptions_*) |
| `v_customer_for_exam` | M6 ← M5 (M6 reads M5's view) |
| `v_customer_prescriptions_summary` | M5 ← M6 (M5 customer card reads) |
| `create_prescription_draft` | M5 customer card → M6 RPC |
| `clone_prescription` | M6 editor → M6 RPC |
| `v_prescription_glasses_for_order` + `_contacts_for_order` | M7 future ← M6 |
| `v_recall_due` | M12 future ← M6 (Pattern 10 Fact-vs-Rule) |
