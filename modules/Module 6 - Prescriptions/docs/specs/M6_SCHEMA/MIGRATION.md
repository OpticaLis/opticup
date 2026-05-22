# M6_SCHEMA — MCP Applied Migrations Log

> All migrations applied via Supabase MCP `apply_migration` on project `tsxrrxzmdxaenlvocyit`.
> Apply time: 2026-05-22 overnight chain Half 2 (immediately after M5 close).

| # | Migration name | Summary | Status |
|---|---|---|---|
| 1 | `M6_01_enums` | 19 new enums (exam_status, exam_outcome, exam_type, prescription_status, prescription_source, prescription_exam_reason, prescription_treatment, prescription_refraction_method, glasses_lens_type, glasses_lens_material, prism_base, eye_side, cl_lens_type, cl_replacement_period, cl_wear_schedule, cl_material, cl_tint, recall_axis_kind, prescription_kind). | success |
| 2 | `M6_02_prescription_types` | CREATE prescription_types (16 cols) + RLS 2-policy + tenant_id index + 16 seed rows (8 default types × 2 tenants). | success |
| 3 | `M6_03_lens_manufacturers` | CREATE lens_manufacturers (11 cols) + RLS + index + 10 seed rows (5 manufacturers × 2 tenants). | success |
| 4 | `M6_04_eye_exams` | CREATE eye_exams (19 cols) + FK to customers + RLS 2-policy + 4 indexes. | success |
| 5 | `M6_05_prescriptions_glasses` | CREATE prescriptions_glasses (28 cols, state-machine) + RLS + 5 indexes + tenant-scoped UNIQUE on prescription_number. CREATE prescription_glasses_eyes (Pattern 11 with UNIQUE(prescription_id,eye)) + RLS + 2 indexes. ON DELETE CASCADE on child. | success |
| 6 | `M6_06_prescriptions_contacts` | CREATE prescriptions_contacts (31 cols, includes CL-specific FK to lens_manufacturers + cl_* enums) + RLS + 6 indexes + UNIQUE on prescription_number. CREATE prescription_contacts_eyes (Pattern 11 — power not sphere; bc/dia/over_refraction) + RLS + 2 indexes. | success |
| 7 | `M6_07_prescription_recall_axes` | CREATE prescription_recall_axes (recall multi-axis storage, prescription_kind discriminator) + RLS + 3 indexes (incl. partial idx WHERE is_enabled AND triggered_at IS NULL). | success |
| 8a | `M6_08_create_exam_rpc` | RPC create_exam — Block A + tenant guard + INSERT scheduled. | success |
| 8b | `M6_08_create_prescription_draft_rpc` | RPC create_prescription_draft (M5↔M6 cross-contract) — Block A + tenant guard + branch on kind. | success |
| 8c | `M6_08_compute_recall_due_dates_rpc` | RPC compute_recall_due_dates — emits 4 axes for glasses + 5 for contacts (incl. fit_check). | success |
| 8d | `M6_08_commit_prescription_rpc` | RPC commit_prescription — atomic; calls allocate_tenant_number; UPDATE parent + INSERT both eyes via ON CONFLICT (prescription_id,eye); calls compute_recall_due_dates. | success |
| 8e | `M6_08_cancel_draft_prescription_rpc` | RPC cancel_draft_prescription — Iron Rule 32 (hard-delete draft, counter UNCHANGED because draft never had a number). | success |
| 8f | `M6_08_supersede_prescription_rpc` | RPC supersede_prescription — UPDATE old.status='superseded'. | success |
| 8g | `M6_08_clone_prescription_rpc` | RPC clone_prescription — SELECT source + INSERT new draft + child eyes copies. Handles both kinds. | success |
| 9 | `M6_09_views` | 9 views: v_exam_for_customer, v_exam_for_doctor, v_prescription_glasses_for_order, v_prescription_contacts_for_order, v_recall_due (window-fn 1-row-per-prescription), v_prescription_history_for_customer (UNION), **v_customer_prescriptions_summary** (cross-contract UNION), v_prescription_full_for_editor, v_prescriptions_list_for_customer (UNION). All WITH (security_invoker=on). | success |

**Total:** 15 MCP `apply_migration` calls, all successful. No rollbacks.

**Idempotency:** every migration uses IF NOT EXISTS / OR REPLACE / DO blocks with duplicate_object handler / ON CONFLICT DO NOTHING. Safe to re-run.
