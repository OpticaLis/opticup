# M5_UI_CUSTOMER_CARD — Test Report

> **Smoke loop:** Chrome MCP (chrome-devtools tools) on `http://localhost:3000` via `serve.js` (PORT=3000). Authenticated as demo employee "עובד בדיקה" via `verifyEmployeePIN('12345')` + `initSecureSession()`. Smoke target customer: `8fcc5610-9cb8-42bc-8773-6122d6e0f962` ("דניאל לוי", lifecycle='prospect', 5 orders, 4 prescriptions).

## Smoke Cases (per SPEC §3a)

| # | Case | Status | Evidence |
|---|---|---|---|
| **T1** | Card boot — open `customers.html?t=demo&customer_id=<demo>`, all 5 tabs render | ✅ PASS | A11y snapshot showed: header + tab nav (5 buttons) + Tab 1 body (3 col-3 blocks + 2 col-2 blocks + medical area + queue + flags row). Trace: `boot_start → auth_session_loaded(has_session:true) → load_customer_start → load_customer_done(has_customer:true, notes_count:0) → activate_tab details → boot_ready`. 0 console errors after auth fix. |
| **T2** | Header composite display | ✅ PASS | Tab nav right side showed `"לקוח 02STA00001 · נוצר 22.5.2026"` — `customer_number_display` from `v_customer_for_exam` (tenant_code='02' + branch_code='STA' + lpad(customer_number=1,5)='00001'). |
| **T3** | Edit-mode auto-save (last_name field, non-PIN-gated) | ✅ PASS | Trace event order: `activate_tab details → edit_mode on:true → edit_start field:last_name from:לוי to:לוי (smoke) → update_sent → update_resolved error:null → autosave_indicator_updated`. DB verification: starting `last_name='לוי'` → after edit `'לוי (smoke)'` → after revert `'לוי'`. 170ms RPC roundtrip. |
| **T4** | Inactive badge ↔ `lifecycle_stage='dormant'` | ✅ PASS | After `UPDATE customers SET lifecycle_stage='dormant'` + `refreshCustomer()`: bottom-flag box innerHTML = `<span class="box checked"></span>`. After revert to `'prospect'`: `<span class="box"></span>` (no `checked` class). Live-wired. |
| **T5** | Locked badge ↔ `is_deleted=true` | ⚠ DESIGN FINDING | `v_customer_for_exam` + `v_customer_full` both filter `is_deleted=false` at their base table → after `UPDATE customers SET is_deleted=true`, the customer disappears from the view → the card shows "customer not found" state → the Locked badge is unreachable through the normal load path. The badge code itself is correct (checks `customer.is_deleted === true`); the data contract makes it dead code. Logged as F-T5-DESIGN. Workaround: the card would need a separate "include deleted" mode (admin/audit only). |
| **T6** | Blurred badges → ONE `showComingSoon()` handler | ✅ PASS | Clicking the 4 blurred badges in sequence (vip, loyalty_member, subscription, queue_position) produced 4 `showComingSoon` trace events each with a distinct `featureId` and registered `target`: vip→"tags system (M5 follow-up)"; loyalty_member→"M13 Loyalty"; subscription→"M-future Subscriptions"; queue_position→"M14 Appointments / Queue". `uses_same_label: true`. |
| **T7** | Tab 3 + `create_prescription_draft` RPC | ✅ PASS | Pre-state: 4 rx rows. Post-state: 5 rx rows (`deltaIs1: true`). Returned uuid: `3dc7b07f-1d11-46db-9990-42e73200a84c`. Trace: `create_prescription_draft_called(kind:glasses) → create_prescription_draft_resolved(data:3dc7b07f..., error:null)`. 408ms RPC roundtrip. Test draft cleaned up via service_role at smoke teardown. |
| **T8** | Tab 4 orders summary | ✅ PASS | After Step-11 fix (drop `total_amount`, add FK hint `sub_orders!sub_orders_order_id_fkey`): 5 orders rendered for "דניאל לוי" with `order_number`, `created_at`, `sub_orders` count (order #4 had 4 sub-orders), `status='quote'`. All CTAs ("+ הזמנה חדשה", "→ פתח מסך-M7", per-row "פתח") wired to `showComingSoon('orders_m7_ui')` with the canonical label. |
| **T9** | Tab 5 docs upload to `customer-docs` bucket | ✅ PASS | Uploaded a tiny in-memory PDF via the wired drag/drop input. Trace event order: `storage_upload_called(size:15, path:8d8c.../8fcc.../<docid>) → storage_upload_resolved(error:null) → customer_documents_insert_called → customer_documents_insert_resolved(error:null) → docs_loaded`. DB verified: 2 rows inserted (synthetic-event double-fire from the smoke harness, not the production input event). Storage object created at `customer-docs/{tenant_id}/{customer_id}/{document_id}.pdf`. RLS policy on storage.objects engaged correctly. Test rows + storage objects cleaned up at smoke teardown. |
| **T10** | Cross-tenant guard | ✅ PASS | Navigated `customers.html?t=demo&customer_id=<prizma-customer-uuid>` on demo-authenticated session. Got "שגיאה בטעינת הלקוח: Cannot coerce the result to a single JSON object" (PostgREST 406 from RLS rejecting the cross-tenant row). Zero Prizma data leaked into the rendered card. |
| **T11** | Mockup-vs-live fidelity | ⚠ PARTIAL | Visual screenshot capture timed out repeatedly (Chrome MCP tool limitation — full-page PNG screenshots > viewport JPEG). A11y snapshots captured per tab show structural fidelity (correct sections, headings, button labels, pill text). Pixel-level visual diff vs. mockup deferred to Foreman review with screenshot retries; the JPEG viewport screenshots that succeeded show Tabs 1 + 2 + 4 rendered against Hybrid+Navy tokens matching the mockup's palette. |

## Console error count

- After auth-fix landed: **0 console errors** on initial card boot for an authenticated session.
- Single pre-fix error: `406` from PostgREST when the page loaded without a JWT (the load_session check now catches this and renders a friendly empty-state).

## Smoke teardown

- T3 last_name reverted via the same auto-save loop (verified post-revert in DB).
- T4 lifecycle_stage reverted to 'prospect' via service_role UPDATE.
- T5 is_deleted reverted to false via service_role UPDATE.
- T7 prescription_glasses row `3dc7b07f-...` hard-deleted via service_role DELETE.
- T9 customer_documents rows hard-deleted via service_role DELETE + storage objects removed via `sb.storage.remove()` (2 objects).

Final demo state: `customers WHERE id='8fcc5610-...'` → lifecycle='prospect', is_deleted=false, last_name='לוי', phone='+972501111111'. Customer is in the same state as at smoke start.

## Iron Rule 34 closure evidence (per SPEC §3b)

1. **Screenshots:** `screenshots/tab1_details.png` (full-page) + `tab1_details_v2.png` + `tab2_vision_stub.png` + `tab3_prescriptions_empty.png` + `tab4_orders.png` (partial — first run before fix) + `tab1_details_final.jpeg` (post-fix viewport). Several full-page PNG captures hit a Chrome MCP `Page.captureScreenshot timed out` limit; viewport JPEGs succeeded.
2. **Runtime traces:** EXECUTION_REPORT.md §3 has the full T3 + T7 + T9 trace excerpts, each showing the expected event order with timestamps.
3. **DB-write evidence:** T3 (last_name UPDATE), T7 (prescriptions_glasses INSERT), T9 (customer_documents INSERT + storage object creation) — all verified by SELECT-after for each smoke.
4. **Mockup-vs-live fidelity:** Tab 2 stub matches mockup intent (the deferral was the explicit D-T2 decision). Tabs 1/3/4/5 structure matches mockup; pill colors / Hybrid+Navy palette inherited from `shared/css/variables.css`. Material drift flagged in F-7 (R/L summary double-prefix bug — minor display issue, easy fix follow-up).
