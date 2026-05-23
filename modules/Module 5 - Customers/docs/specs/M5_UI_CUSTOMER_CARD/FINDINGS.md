# M5_UI_CUSTOMER_CARD — Findings

## F-1 — SPEC §3 #24 said "8 files" backed up, actual = 9 files

**Severity:** INFO (cosmetic).
**Location:** SPEC.md §3 row #24.
**Description:** SPEC said "8 files" but explicitly listed 9: CLAUDE.md + 6 M5 docs (SESSION_CONTEXT, MODULE_SPEC, MODULE_MAP, MODULE_5_ROADMAP, CHANGELOG, db-schema.sql) + js/shared.js + js/shared-field-map.js. Counting error in the SPEC author's review.
**Decision:** Dismiss; backup actually contains all 9 files. P-AUTHOR-1 (below) proposes a fix for the next SPEC.

## F-2 — `customer_documents` lacks `size_bytes` / `mime_type` / `description` columns

**Severity:** LOW.
**Location:** `customer_documents` table (M5_SCHEMA-deployed shape).
**Description:** The mockup shows file size + description in the docs table, but the deployed schema has only `original_name` + `category` + `file_path` + `uploaded_at` + `uploaded_by`. My initial Tab 5 INSERT referenced 3 non-existent columns; caught during code-write self-review (before smoke), fixed by removing the columns from INSERT + display.
**Decision:** TECH_DEBT — a future M5 column-expansion SPEC should add `size_bytes`, `mime_type`, `description` to `customer_documents` so the docs table has richer display.

## F-3 — `orders` table lacks `total_amount` column

**Severity:** LOW.
**Location:** `orders` (M7_SCHEMA-deployed shape).
**Description:** My initial Tab 4 query selected `total_amount` from `orders`. The column doesn't exist; the total is computed from sub_orders + items aggregations (not exposed directly on orders). The smoke caught the error; fix was to drop the "סכום" column entirely from the Tab 4 table (deferred to a future aggregation view/RPC).
**Decision:** TECH_DEBT — M7 should ship a `v_order_total` aggregation view or `compute_order_total(p_order_id)` RPC, then Tab 4 can re-add the column.

## F-4 — `sub_orders` has ambiguous FK embed via PostgREST

**Severity:** LOW (resolved in code).
**Location:** `sub_orders` FK constraints (`sub_orders_order_id_fkey` + `sub_orders_repair_origin_order_id_fkey`).
**Description:** PostgREST's nested aggregation `orders.select('..., sub_orders(count)')` errored "Could not embed because more than one relationship was found for 'orders' and 'sub_orders'" because of the dual FK (regular order_id + repair_origin_order_id). The smoke caught the error; fix was to use explicit FK hint `sub_orders!sub_orders_order_id_fkey(count)`.
**Decision:** Resolved in code (commit `7287852`). Documented for the next M7-consuming page so the FK hint is the canonical pattern.

## F-5 — `DB.update` signature: `idValue` is scalar, not `{ id: ... }` object

**Severity:** LOW (resolved in code).
**Location:** `shared/js/supabase-client.js` DB.update — function signature `(table, id, changes, options)` where `id` is a scalar uuid.
**Description:** I originally called `DB.update('customers', { id: customerId }, patch, ...)` which made PostgREST coerce `[object Object]` as the uuid filter value → "invalid input syntax for type uuid: [object Object]" error. The smoke (T3) caught it.
**Decision:** Resolved in code (commit `7287852`). The DB.update signature should likely be promoted to the FIELD_MAP-adjacent reference doc (or DB wrapper helper) to prevent future mismatches.

## F-6 — Card boot did not call `loadSession()` to inject the PIN-issued JWT into `sb`

**Severity:** MEDIUM (resolved in code).
**Location:** `modules/customers/customer-card.js` — page bootstrap.
**Description:** The customer views (`security_invoker=on`) re-apply caller RLS on the underlying `customers` table. The RLS USING clause checks `tenant_id = (jwt_claims ->> 'tenant_id')::uuid`. Without the PIN-issued JWT in the `sb` client's `Authorization` header, the role is anon → no `tenant_id` claim → RLS denies. The card boot silently failed with PostgREST 406 until I added a `loadSession()` call between tenant resolution and the customer fetch. This is a pattern every new ERP page that reads customer-scoped data must follow.
**Decision:** Resolved in code (commit `7287852`). Worth promoting to a SHARED page-boot helper so each new page doesn't reinvent this — e.g., `await authReady()` exposed by `auth-service.js` that callers can await before any DB read.

## F-7 — Tab 3 R/L summary double-prefix display ("R: R: ..." / "L: L: ...")

**Severity:** LOW (cosmetic — display only).
**Location:** `modules/customers/customer-card-tab-prescriptions.js` rowHtml() + `v_customer_prescriptions_summary.r_summary` / `.l_summary` content.
**Description:** The view's `r_summary` / `l_summary` columns already contain `"R: -3.00 / -1.00 x 180"` (with leading "R: "). My render adds another "R: " prefix → "R: R: -3.00 ...". Cosmetic display bug.
**Decision:** Quick fix — either drop the "R: " / "L: " prefix from the view OR from the render. Will fix in the follow-up Foreman pass or the next Tab 3 SPEC.

## F-T5-DESIGN — Locked badge unreachable through normal card load

**Severity:** MEDIUM (design).
**Location:** Cross-cutting — `v_customer_for_exam` + `v_customer_full` (M5_SCHEMA) + card load path.
**Description:** Both views filter `WHERE is_deleted = false` at the base-table level. When a customer is soft-deleted, the views return 0 rows → the card renders "customer not found" → the Locked badge (which checks `customer.is_deleted === true`) is dead code on the normal load path. The badge code is correct; the data contract makes it unreachable.
**Decision:** TECH_DEBT — the customer card's "view a deleted customer" use case is genuine (audit / undelete flow). Either (a) the card adds an "include deleted" mode that reads `customers` direct (RLS-scoped), or (b) a separate audit-view exists. Punt to a follow-up SPEC. The current card's behavior of refusing to render deleted customers is defensible — staff don't normally need to view a deleted person — but the Locked badge in the UI implies otherwise. Either remove the badge or build the include-deleted mode.

## F-8 — `js/shared-field-map.js` reached 350 lines after M5 additions (file-size hook warning)

**Severity:** LOW.
**Location:** `js/shared-field-map.js`.
**Description:** The shared FIELD_MAP file was 317 lines before this SPEC; my 6 M5 entries pushed it to exactly 350 (Iron Rule 12 hard cap). Pre-commit hook fired a warning (not violation) at commit time. Iron Rule 12 target = 300; max = 350. At the wall.
**Decision:** TECH_DEBT — the FIELD_MAP is destined to grow with every new module. A follow-up SPEC should split it by module: `js/shared-field-map-m1.js`, `js/shared-field-map-m4.js`, `js/shared-field-map-m5.js`, etc., each loaded by the consumer pages. Until then, every new module SPEC must accept the warning + scope-trim if needed.

## F-9 — CLAUDE.md §0.5 Category 3 count was already inaccurate (pre-existing)

**Severity:** INFO (pre-existing, out of scope this SPEC).
**Location:** `CLAUDE.md` §0.5 — "17 other ERP HTML pages" line.
**Description:** Before this SPEC, the count in CLAUDE.md said "17 other ERP HTML pages" but the actual `scripts/checks/root-allowlist.json` listed 25 entries (now 26 with customers.html). Pre-existing drift. This SPEC's edit bumped the count to "18" reflecting the actual addition; the larger drift remains.
**Decision:** Out of scope. Sentinel Mission 10 (Structure Discipline) should pick this up. Suggested follow-up: a CLAUDE.md sweep SPEC that reconciles the §0.5 prose count with root-allowlist.json.

## F-10 — T9 upload synthetic-event harness fired twice (test artifact)

**Severity:** INFO (test-only — not a production bug).
**Location:** T9 smoke harness (evaluate_script call).
**Description:** The DataTransfer property descriptor override + the explicit `dispatchEvent('change')` together caused the input change event to fire twice, which made `uploadFile` run twice and INSERT 2 docs instead of 1. Production behavior (a real user picking a file from the OS file dialog) fires `change` once → 1 doc per upload. Verified by inspecting the trace event count.
**Decision:** Dismiss (test artifact, not a production bug). Will add `if (file._smokeProcessed) return; file._smokeProcessed = true;` as a defensive guard in a follow-up if it becomes an issue. For Phase D smoke evidence, both inserts succeeded with the correct RLS path — the bucket policy + customer_documents INSERT chain works.

## Summary

| # | Severity | Decision |
|---|---|---|
| F-1 | INFO | Dismiss; P-AUTHOR-1 prevents recurrence |
| F-2 | LOW | TECH_DEBT (column expansion follow-up) |
| F-3 | LOW | TECH_DEBT (aggregation view/RPC) |
| F-4 | LOW | Resolved in `7287852` |
| F-5 | LOW | Resolved in `7287852` |
| F-6 | MEDIUM | Resolved in `7287852` + propose shared `authReady()` helper |
| F-7 | LOW | Quick fix (one render line); easy follow-up |
| F-T5-DESIGN | MEDIUM | TECH_DEBT (include-deleted mode OR remove the badge) |
| F-8 | LOW | TECH_DEBT (split FIELD_MAP by module) |
| F-9 | INFO | Out-of-scope; Sentinel sweep |
| F-10 | INFO | Test-only artifact, dismiss |

No reopener-class findings. Smoke evidence supports closure pending Foreman review of Iron Rule 34 artifacts.
