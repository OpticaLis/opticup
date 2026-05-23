# Module 5 — Customers — Roadmap

> **Authored by:** opticup-strategic (Foreman) — 2026-05-22 overnight chain
> **Source brief:** `architecture-brief/M5_CUSTOMERS_BRIEF.md` v3 (sealed 2026-05-07)
> **Companion module:** Module 6 — Prescriptions (M5↔M6 contract via `v_customer_prescriptions_summary` + `create_prescription_draft` RPC).

---

## Phases

| Phase | Name | Status | SPEC folder | Notes |
|---|---|---|---|---|
| **A** | Schema + RLS + Views + Config seeds | ⬜ in progress (2026-05-22 overnight) | `docs/specs/M5_SCHEMA/` | Combined with Phase B in one overnight schema SPEC |
| **B** | RPCs + dedup + Iron Rule 32 | ⬜ in progress (2026-05-22 overnight) | `docs/specs/M5_SCHEMA/` | Combined with Phase A |
| C | OpticPlus migration (5,028 customers + 1,158 leads) | ⬜ deferred | `docs/specs/M5_MIGRATION/` (not yet authored) | Separate SPEC, Daniel-in-loop. crm_leads rollover already done by M5_LEADS_MIGRATION (4+1296). |
| **D** | **UI — Customer card (5 tabs)** | **✅ 🟢 CLOSED 2026-05-23** | `docs/specs/M5_UI_CUSTOMER_CARD/` (incl. `CLOSURE_SPEC.md`) | First UI on the M5-M9 spine. Iron Rule 34 closure complete: T11 ✅ (clean per-tab JPEG fidelity set), F-T5-DESIGN RESOLVED (dead Locked badge removed). Render+action wiring pattern established for every later M5-M9 UI screen. |
| E | UI — Customer list + create-mode | ⬜ deferred | `docs/specs/M5_UI_CUSTOMER_LIST/` (not yet authored) | UI SPEC, Daniel-in-loop. Reuses customers.html entrypoint. |

Phases A + B together = the **schema foundation** built tonight. They are sealed in one combined SPEC (`M5_SCHEMA`) per the overnight Brief recommendation: each half remains independently verifiable but they share one DDL transaction graph and one functional smoke suite. UI + migration phases are out-of-scope tonight (require Daniel-in-loop for Chrome MCP smoke + curated data review respectively).

---

## Phase A + B — Scope (this overnight SPEC)

**Tables built this phase:**
- `customers` (EXTEND existing 16-col stub — 0 rows, canonical RLS already present)
- `households` (new — skeleton, 5 business fields per Brief §2.2)
- `health_funds` (new — config table per-tenant, P19)
- `tenant_languages` (new — config table per-tenant, P19)
- `customer_notes` (new — Brief §2.3.3)
- `customer_documents` (new — Brief §2.3.4)
- `tenant_settings` (new — for customer_list_preferences config, Brief §14)
- `tenant_number_counters` (new — per-tenant sequential allocation table for Iron Rule 11)
- `tenants` extension (ADD `tenant_code text` for composite customer_number, Brief §12)
- `tenant_location` extension (ADD `deactivated_at timestamptz`; `short_code` already serves as branch_code, Brief §2.3.2)

**Views built this phase (7 of 9 — 2 deferred):**
- `v_customer_for_exam`, `v_customer_for_order`, `v_customer_for_payment`, `v_customer_full`, `v_customer_for_messaging`, `v_customer_for_loyalty`, `v_customer_for_appointment`
- Deferred: `v_customer_prescriptions_summary` (M6 owns it — built in Half 2 / M6_SCHEMA SPEC), `v_customer_queue_position` (M14 not built — documented as deferred contract).

**RPCs built this phase (5):**
- `create_customer(p_tenant_id, p_payload jsonb)` — atomic, allocates customer_number, applies dedup algorithm per Brief §4.7.
- `merge_customers(p_tenant_id, p_primary_id, p_secondary_id)` — atomic, reassigns child FKs.
- `assign_to_household(p_tenant_id, p_customer_id, p_household_id)` — atomic.
- `delete_last_unused_customer(p_tenant_id, p_customer_id)` — Iron Rule 32; only if customer_number == max AND zero incoming FK references.
- `update_customer_display_preferences(p_tenant_id, p_prefs jsonb)` — writes to `tenant_settings.customer_list_preferences`.

**lifecycle_stage automation:**
- Trigger FUNCTION `compute_lifecycle_stage_on_order()` BUILT but NOT WIRED (orders table doesn't exist yet — M7 wires it when M7 ships).
- Dormant transition (24m inactivity) — FUNCTION `compute_lifecycle_dormant_sweep()` BUILT, cron schedule deferred (no rows to sweep yet).

**Seed data (demo + prizma):**
- `tenants.tenant_code` — prizma='01', demo='02'.
- `tenant_languages` — 4 rows per tenant: he (default, active), ru (active), en (active), es (inactive).
- `health_funds` — 5 rows per tenant: לאומית, מכבי, כללית, כללית פלטינום, מאוחדת.

**Functional smoke (≥8 on demo, mandatory):**
1. create_customer happy path → returns customer_id + customer_number=1 (first row on demo).
2. customer_number allocated atomically — concurrent calls yield 2, 3, 4 with no gaps.
3. Dedup on duplicate phone → second call with same phone returns the existing customer (no INSERT).
4. Dedup on duplicate id_number → same.
5. merge_customers — child notes/documents move from secondary to primary; secondary soft-deleted.
6. assign_to_household — customer.household_id updated atomically.
7. delete_last_unused_customer — returns TRUE when customer is max and zero FKs; returns FALSE after a customer_note FK exists.
8. Cross-tenant guard — set JWT to tenant-A; cannot read tenant-B customer (RLS) AND cannot call merge_customers across tenants.
9. Anon-reject — anon role calling any of the 5 RPCs raises 42501.

---

## Out of Scope (this overnight SPEC)

- No UI screens (customer card, list, create-mode) — deferred to Phases D+E.
- No OpticPlus migration of 5,028 customers + 1,158 leads — deferred to Phase C.
- No `crm_leads` row migration or decommission — `crm_leads` (1,376 rows) stays live, untouched. M4 keeps running on it.
- No M14 contracts (`v_customer_queue_position` deferred).
- No M7 orders contract wiring (`v_customer_for_order` is built but consumes future tables that don't exist; the view references `customer_number` + own columns only — no orders join yet).
- No Prizma data writes — DDL applies to both tenants, but functional smoke data only on demo.
- No merge to main (Daniel-only after morning QA).

---

## Decision history (pinned at module start)

The 30 sealed M5 decisions are in `architecture-brief/M5_CUSTOMERS_BRIEF.md` §8. Most load-bearing for this overnight schema:
- Single-person entity = `customers` with `lifecycle_stage` enum; `crm_leads` absorbed at migration-time, not this SPEC.
- `customer_number` composite display = `[TENANT_CODE][BRANCH_CODE][CUSTOMER_NUMBER]`; storage = `customer_number integer NOT NULL` allocated atomically per-tenant.
- Iron Rule 32 (Sequential Number Cancellation) applies to `customer_number` via `delete_last_unused_customer` RPC.
- 4 independent consent flags (not 3-value enum). Phone UNIQUE (phone, tenant_id) always; family phone-share = UX exception.
- Config tables (health_funds, tenant_languages) = P19.
- M6 = separate module that owns `v_customer_prescriptions_summary` + `create_prescription_draft`.

---

*End of MODULE_5_ROADMAP.md. Updated when phases close.*
