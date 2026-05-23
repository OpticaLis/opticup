# Strategic Review Report — M5/M6/M7/M8 Schema

> **Mode:** READ-ONLY business-logic + cross-contract audit. No code, no DDL, no DML touched.
> **Sibling:** Code/RLS/perf audit runs separately (`M5_M8_CODE_REVIEW_BRIEF.md`). This report covers only business-logic + the 4-module contracts.
> **Date:** 2026-05-23. **Author:** opticup-strategic (Foreman as reviewer).
> **Inputs:** 4 sealed Briefs + 4 SPEC folders end-to-end + 4 decisions logs + live Supabase (SELECT-only, 21 probes against project `tsxrrxzmdxaenlvocyit`).

---

**Verdict:** 🟡 **CLOSED WITH FOLLOW-UPS.** All 26 M5-M8 tables ship with RLS + 2 canonical policies, all 31 RPCs deployed with Block A header, all 23 cross-module views in place, and the 4 per-module smokes (M5 9/9, M6 9/9 + 5/5, M7 9/9, M8 8/8 + 6/6) genuinely pass. The schema spine — customer→prescription→order→payment — is structurally sound and SaaS-clean. **However**, three contract-layer promises made by the Briefs are not yet honored in code: the M5↔M7 lifecycle trigger is unwired (every paying customer stays `prospect`), the M6↔M7 prescription-snapshot mechanism is identity-only (no value snapshot — an M6 edit silently mutates historical orders), and the M8→M7 first-payment event predicate is laxer than Brief §1.1 (`first INSERT` rather than `first PAID payment ≥ ₪1`). Each is a 5-30 minute fix, but each is load-bearing for the next layer of work. None of the 4 Foremen flagged these because their smokes are per-module: each closed correctly inside its own envelope, and the gaps live *between* the envelopes.

**M9-readiness:** **READY-WITH-FOLLOWUPS.** `sub_orders.id` FK target exists, `v_lab_queue` is shaped, barcode triple `<branch>-<order>-<sub>` is buildable from live columns. The 3 cross-contract gaps above do not block M9 schema; they should be resolved before M9 + the order UI ship together, because M9 would compound the rx-mutation bug (lab job FKs to sub_order whose rx changes underfoot).

**UI-readiness:** **READY-WITH-FOLLOWUPS.** `v_customer_for_order`, `v_order_payment_summary`, `v_customer_prescriptions_summary`, `v_recall_due` all render correctly against the 11-customer / 6-order / 5-payment / 3-prescription demo dataset. The customer-card / order-screen / checkout mockups can be implemented without schema changes — but the 3 gaps above must close before the screens are wired to live data, otherwise the lifecycle, history, and payment-event UI affordances will misrepresent state.

---

## 1. Axis-by-axis findings (A–H)

### Axis A — End-to-end customer→order→payment lifecycle

**🔴 CRITICAL F-A-1 — Lifecycle trigger unwired.** `compute_lifecycle_stage_on_order()` exists in `pg_proc` but `pg_trigger` shows it attached to **zero tables**. Live evidence: demo customer #1 (`8fcc5610-…`) has order #1 with 4 payments, including a `paid` row at ₪100 that fired the `first_payment` event into `payment_events_queue` — yet `customers.lifecycle_stage` is still `'prospect'`. All 11 demo customers are stuck at `prospect`. Brief M5 §1.1 + §8 #50 explicitly promised "יצירת order ראשונה → stage=`active`" (auto via trigger). Per M5 SPEC §7 the wiring is "deferred until M7 ships" — M7 has now shipped schema, but the wiring still hasn't followed. **Action:** add 1 `AFTER INSERT OR UPDATE` trigger on `orders` (or, more correctly per Brief §4.4, on `payments` when first PAID lands). 5-line migration.

**🔴 CRITICAL F-A-2 — Order quote→active path broken for orders without sub_orders.** Live evidence: customer #1's order #1 has `paid` payment ₪100 — `orders.status='quote'`. Only order #6 reaches `'active'` because it has an active sub_order child. The only mechanism that flips `orders.status` is `trg_recompute_order_status` (aggregator over `sub_orders`). Brief M7 §3 said "`quote → active`: Convert to Order + תשלום ≥ ₪1" — no RPC implements this path; first-payment alone does not advance an order. **Action:** either extend `recompute_order_status_fn` to also consider `v_order_payment_summary.total_paid > 0`, OR document that an order has no `quote→active` until at least one sub_order is created (and update Brief). Pick one; today neither holds.

### Axis B — Cross-module contract integrity (primary axis)

**M5↔M6 (`v_customer_prescriptions_summary` + `create_prescription_draft`):** ✅ both deployed. View aggregates parent+eye rows for both kinds. RPC signature `(p_tenant_id, p_customer_id, p_kind)` matches the customer-card "+ מרשם חדש" button contract.

**M5↔M7 (`orders.customer_id` + `v_order_customer_summary` + prospect→active trigger):** 🟡 FK present, view rich (includes `customer_number_display`), trigger **MISSING** (F-A-1).

**🔴 CRITICAL F-B-1 — M6↔M7 prescription-VALUE snapshot missing.** `sub_orders` carries only `prescription_glasses_id` + `prescription_contacts_id` (FK identity), no `sphere/cyl/axis/add/pd_*` snapshot columns. `v_prescription_glasses_for_order` reads live from `prescriptions_glasses` + `prescription_glasses_eyes` joined at query time. Consequence: an optometrist correcting a typo on a 6-month-old prescription mutates the rx the M7 order screen, the printed Order Inspection form, and any M9 lab job render. Brief M7 §4.2 explicitly stated "שינוי-מרשם ב-M6 לא משפיע על הזמנה קיימת — snapshot-ID נשמר". This is data-integrity-grade. M7 §5.6 also promised snapshots. None of M6's `commit_prescription` or M7's `add_sub_order` writes value snapshots. **Action:** add `rx_snapshot_jsonb` (or 12+ flat columns) on `sub_orders`, populated by `add_sub_order` from the linked prescription at link-time. Brief-aligned and SaaS-clean.

**M6→M7 auto-commit on first link:** Brief M6 §3.3 said "כשהזמנה נפתחת על draft prescription, ה-prescription עובר אוטומטית ל-committed". `add_sub_order` accepts a `p_prescription_glasses_id` but does not call `commit_prescription` on a `draft` row. M6 `commit_prescription` is its own RPC. 🟡 implicit contract, not wired.

**M7↔M8 (`payments.order_id` + `v_order_payment_summary` + event queue):** payments + view ✅. v_order_payment_summary aggregates correctly per live data (order #1 → 4 payments, total_paid=100, pending=250, returned=75, methods=[cash,check,salary_deduction]).

**🔴 CRITICAL F-B-2 — `emit_first_payment_event_fn` predicate weaker than Brief.** Function body (probed verbatim): `IF count(*) of prior payments=0 THEN INSERT into queue`. Fires regardless of `NEW.status`. Brief M7 §4.4 + M8 §4.1 + M5 §1.1 all required "תשלום ראשון בסטטוס שולם עם amount ≥ 1". Live evidence: 2 unconsumed `first_payment` events on demo + 1 `check_returned`. Order #1's first INSERT was a `paid` ₪100 (correct firing by luck), but a workflow that records a `pending_pos` row first would emit a premature event. **Action:** add `WHEN NEW.status = 'paid' AND NEW.amount >= 1` to the trigger.

**M7↔M1 (`sub_order_items.inventory_id` + decrement/increment atomic RPCs + `decrements_inventory` boolean):** ✅. `sub_order_items.decrements_inventory boolean NOT NULL DEFAULT true` is consistent with Brief; the `transition_sub_order_state` smoke (M7 S6) verified increment/decrement firing.

**M7↔M9 forward (M9 not built):** `sub_orders` columns + `v_lab_queue` are M9-ready. `v_lab_queue` already exposes `order_number`, `letter`, `kind`, `location`, plus `current_external_company`, framing/lens/ready timestamps, and `customer_name`. Adequate for M9's "scan barcode → update location + flow timestamp" pattern. See F-H-3 for the barcode-width caveat.

### Axis C — Sealed-decision coherence

**M5 §1.1 crm_leads absorption decision vs live state.** Live: `crm_leads` still holds **1,354 rows on Prizma + 28 on demo**. M5 decided absorption (single `customers` table with `lifecycle_stage`), but the migration SPEC has not been written. Until then, two parallel person stores coexist. M4 production rules continue to write to `crm_leads`; M5 RPCs write to `customers`. Brief M5 §3.3 promised "כל אינטראקציה מצביעה ל-`customer_id`" — `crm_event_attendees` etc still FK to `crm_leads.id`, not `customers.id` (verified by FK graph). 🟡 known-deferred (M5_MIGRATION SPEC). Flag as a launch-blocker; if M4 keeps writing to crm_leads through cutover, M5 UI will not see those people.

**Number allocation philosophy coherent across M5/M6/M7/M8.** All four entity kinds (`customer`, `prescription`, `order`, `payment`) share `tenant_number_counters` with `entity_kind` discriminator and `allocate_tenant_number()` helper. Excellent Rule 21 hygiene. Live: demo counters = `{customer:11, order:6, payment:5, prescription:3}` — matches row counts perfectly.

### Axis D — Number allocation soundness

Single helper `allocate_tenant_number(p_tenant_id, p_entity_kind)` uses `INSERT ... ON CONFLICT DO UPDATE ... RETURNING last_value` (row-level lock, no race). Sound across all four kinds.

**🟡 MEDIUM F-D-1 — Single-sequence intent vs per-table UNIQUE for prescriptions.** F-M6-2 declared "single per-tenant sequence regardless of kind" (glasses #5 and contacts #6 are siblings in one stream). The per-table UNIQUE indexes (`prescriptions_glasses_number_uidx` + `prescriptions_contacts_number_uidx`, each on `(prescription_number, tenant_id)`) are partial+per-table — they would *permit* a direct INSERT of glasses #5 and contacts #5 simultaneously, bypassing the RPC. Practical risk: low (no direct INSERT path; all RPCs go through `allocate_tenant_number`). Documentation gap; not a vulnerability. Recommend a cross-table CHECK or a documented invariant.

### Axis E — Event mechanism soundness (M8 → M7 → M5)

**Pattern P22 (Durable Event Queue):** `payment_events_queue` deployed with `consumed_at`/`consumed_by` drain columns. Trigger functions inline canonical Block A. Mirrors M1 K3.

**🔴 HIGH F-E-1 — Queue has no consumer wired.** Live: 3 events on demo, **all 3 with `consumed_at IS NULL`**. F-M8-4 dismissed this as "deferred per Brief". Acceptable today (M9 + UI deferred), but combined with F-A-1 (lifecycle trigger missing) + F-A-2 (order.status doesn't advance on payment alone) it means: as of right now, *nothing* converts a paying prospect into an active customer / active order, in code. Production cutover with 9,828 historic payments would accumulate ~9,828 first-payment events and 0 drains.

**Pattern P22 generalization:** consistent with the M1 K3 `pending_lens_advancement_queue` pattern. Future modules (M9, M12, M13) can reuse the shape.

### Axis F — Forward-readiness for M9 + UI

**M9-readiness (lab):** `sub_orders` shape is excellent — `kind`, `state`, `location`, `letter`, all flow timestamps + actors, `current_external_company`, `is_repair`/`has_open_task` flags. `v_lab_queue` filters appropriately (`is_deleted=false AND state='active' AND location IN ('lab','outside_lab')`). M9 can FK `lab_jobs.sub_order_id` cleanly.

**🟡 HIGH F-F-1 — Customer-number-display variable-width.** Brief M5 §12 promised 9-char fixed-width `[TENANT2][BRANCH2][CUSTOMER5]` (e.g. `010300545`). Live `v_customer_for_order.customer_number_display` formula = `tenant_code || COALESCE(tl.short_code, '00') || lpad(customer_number, 5, '0')`. With demo's `tenant_location.short_code='STA'` (3 chars), customer #1 renders as **`02STA00001` (10 chars)**. On Prizma, `tenant_location.short_code IS NULL` for the "מרכזי" branch → falls back to `'00'` → 9 chars `0100<n>`. Width is variable per tenant. M5_MIGRATION's 5,028 Prizma customers would render `0100<n>` but Brief §12 promised `0101<n>`. **Action:** backfill Prizma branch `short_code='01'` and tighten demo branches to 2-char codes; OR change Brief to acknowledge variable width and document the formatter in M5 db-schema.

**UI-readiness (3 surveyed):** views feed customer-card / order-screen / checkout adequately. `v_customer_full` exposes lifecycle + demographics + aggregations; `v_order_full` joins customer + branch + sub_orders for the M7 screen; `v_order_payment_summary` powers the checkout's "כמה נשאר לשלם" affordance.

### Axis G — Reviewer of the 4 Foreman self-reviews

Sampled 7 of the 22 accumulated findings:

| # | Finding | My verdict |
|---|---|---|
| M5 F1 (column count cosmetic) | Dismissed | ✅ concur |
| M5 F4 (legacy `prescriptions` 0-row stub) | TECH_DEBT | ✅ concur (0 rows verified) |
| M5 F8 (RLS smoke under MCP runs as `postgres`) | Dismissed | ✅ concur; report flags this is also true for sibling Code Review |
| M6 F-M6-2 (single prescription sequence) | Dismissed | 🟡 **partial dissent** — see F-D-1: per-table UNIQUE allows direct-INSERT collisions; document the invariant or add cross-kind enforcement |
| M6 F-M6-5 (CL `lens_catalog_id` FK deferred) | TECH_DEBT | ✅ concur |
| M7 F-M7-3 (`compute_lifecycle_stage_on_order` not attached) | Dismissed as "intentional defer" | 🔴 **dissent** — promoted to F-A-1 CRITICAL. The trigger has been "deferred" through M5+M6+M7 SPECs; the contract promise from M5 §1.1 + §8 #50 is now load-bearing on live demo data and remains unwired. Should not have been dismissed; should have been logged for action at M7 close, not deferred again. |
| M8 F-M8-4 (queue listeners deferred) | Dismissed | 🟡 **partial dissent** — combined with F-A-1 + F-A-2, the system has no path to advance customers or orders into the `active` state. Each finding alone is "deferred"; together they are a launch-time bug. |

### Axis H — Hidden risks for M9 + UI + migration

**🟡 H-1 — Naming drift `state` vs `status`.** Prescriptions use `status`, sub_orders use `state`, orders use `status`, payments use `status`, eye_exams use `status`. Five tables, two columns. Cosmetic but readability suffers; future devs will guess wrong.

**🟡 H-2 — `prescription_recall_axes` polymorphic FK absent.** Table has `prescription_id` + `prescription_kind` discriminator but NO FK to either prescription table (verified). `v_recall_due` uses `CASE prescription_kind WHEN 'glasses' THEN (SELECT customer_id FROM prescriptions_glasses ...)` — works but adds scan cost and lets orphan rows persist if a parent is hard-deleted. Iron Rule 32 only allows hard-delete on `draft` (pre-axes), so practically OK; not formally enforced.

**🟢 H-3 — Defensive code present.** All write paths go through SECURITY DEFINER RPCs with Block A header. Direct-INSERT bypass is theoretically possible for service_role only. Defense-in-depth on writes is honored per Rule 22.

**🟡 H-4 — Demo `tenant_location` has 2 M1A smoke-leftover branches (STA, STB), no `is_default=true`.** UI SPECs will trip when they look for a canonical demo branch. F-M5-F2 already logged as TECH_DEBT.

---

## 2. Cross-Contract Matrix

| # | Surface | Type | Owner | Consumer(s) | Producer side | Consumer side | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | `v_customer_prescriptions_summary` | View | M6 | M5 card tab-3 | ✅ deployed | UI not built (deferred) | ✅ |
| 2 | `create_prescription_draft(p_tenant_id, p_customer_id, p_kind)` | RPC | M6 | M5 card "+ מרשם חדש" | ✅ signature matches | UI not built | ✅ |
| 3 | `v_order_customer_summary` + `orders.customer_id` FK | View+FK | M7 | M7 screen, reports | ✅ deployed, `customer_number_display` computed | live | ✅ |
| 4 | M5↔M7 prospect→active trigger | Trigger | M5 (function) + M7 (attach) | M5 lifecycle invariant | function exists | **🔴 no trigger attached** | 🔴 |
| 5 | `sub_orders.prescription_glasses_id`/`prescription_contacts_id` FK | FK | M6 | M7 sub_order | FK present | identity-only | 🟡 (F-B-1: value snapshot missing) |
| 6 | M6 auto-commit on first M7 link | Implicit | M6 (`commit_prescription`) | M7 (`add_sub_order`) | RPC exists | **not called** by add_sub_order | 🟡 |
| 7 | `payments.order_id` FK + `v_order_payment_summary` | FK+View | M8 | M7, M11 | ✅ aggregates verified | live | ✅ |
| 8 | `emit_first_payment_event_fn` → `payment_events_queue` | Trigger+Queue | M8 emits | M7 should drain | **🔴 predicate wrong** + queue undrained | no consumer wired | 🔴 |
| 9 | `emit_check_returned_event_fn` → queue | Trigger+Queue | M8 | M7 + M4 | ✅ predicate correct | no consumer wired | 🟡 |
| 10 | `decrement_inventory` / `increment_inventory` atomic | RPC | M1 | M7 `transition_sub_order_state`, `cancel_sub_order` | ✅ called inline | ✅ tested in M7 S6 | ✅ |
| 11 | `v_lab_queue` + barcode `<branch>-<order>-<sub>` | View | M7 | M9 (future) | ✅ shape ready | M9 not built | 🟢 forward-ready (see F-F-1 width) |
| 12 | `v_recall_due` | View | M6 | M12 (future) | ✅ 1-row-per-prescription via window fn | M12 not built | 🟢 forward-ready |
| 13 | `v_salary_deduction_pending` + `mark_salary_deduction_processed` | View+RPC | M8 | M11 | ✅ deployed | M11 not built | 🟢 forward-ready |
| 14 | `tenant_number_counters` (shared infra) | Helper table | M5 | M5, M6, M7, M8 | ✅ atomic | ✅ all 4 use it | ✅ |

**Net cross-contract verdict:** 8 ✅, 3 🟢-forward-ready, 3 🟡 partial, 2 🔴.

---

## 3. Concurrence with the 4 FOREMAN_REVIEWs

Concur with all 4 verdicts of 🟢 *within their respective per-module envelopes*. Dissent on the cross-module composite: the 3 Foremen-dismissed findings (M7 F-M7-3, M8 F-M8-4, and the M5 deferred trigger) are individually defensible but jointly fatal to the customer→active and order→active transitions. Promotion to the report's top section (F-A-1, F-A-2, F-E-1) is the correct disposition. The cross-contract review the 4 Foremen explicitly could not run (because each is solo on its module) is what surfaces this.

The 4 closure verdicts are otherwise sound. SPEC quality, RLS coverage, advisors clean, smoke discipline, selective-git-add, Iron Rules 11/14/15/18/21/22/31/32 honored. The Reviewer-of-Reviewers note: the per-module SPEC framework served the build well; what it missed is exactly what this Brief commissioned this report to catch.

---

## 4. Top-5 risks for M9 + UI + migration

**R1 — Lifecycle drift in production (CRITICAL).** Every customer who pays after cutover stays `prospect` forever (until F-A-1 wired). M11 LTV reports, M12 marketing segments, M13 loyalty enrollment all key on `lifecycle_stage`. By day 30 of production, segmentation reports will be wrong by 100% of new customers.

**R2 — M6 edit silently mutates historic orders (CRITICAL).** Until F-B-1 closes, any optometrist correction to a prescription cascades through every M7 sub_order linked to that prescription, including printed lab forms and M9 lab jobs. This is a data-integrity-grade liability for an optical clinic.

**R3 — `payment_events_queue` accumulates without drain (HIGH).** F-E-1: 3 events undrained on demo today. With M7+M5 listeners unwired, cutover with ~9,800 historic payments would produce ~9,800 immediately-stale queue rows. Operationally noisy; potentially expensive at first listener wire-up.

**R4 — crm_leads ↔ customers cutover not authored (HIGH).** F-C-1: M4 production keeps writing to `crm_leads` (1,354 rows on Prizma); M5 RPCs write to `customers`. Until M5_MIGRATION SPEC runs, two parallel person-stores coexist. UI work that assumes "single person entity" will misrender any lead-only person.

**R5 — customer_number_display variable-width (HIGH).** F-F-1: Brief §12 promised 9-char fixed-width; live demo produces 10 chars (`02STA00001`), Prizma will produce 9 (`0100<n>` via NULL→'00' fallback). PDF receipts, export labels, and customer-facing identifiers will diverge from spec. Compounds with R4 at cutover.

---

## 5. Pre-M9 + Pre-UI questions for Daniel (each with one recommendation)

**Q1 — Wire the M5 lifecycle trigger now, or defer to M7-UI phase?**
**Recommendation:** wire NOW. ~30 minutes: attach `AFTER INSERT OR UPDATE OF status` trigger on `payments` calling `compute_lifecycle_stage_on_order` (broaden function body to read NEW.customer_id + check first paid payment). Closes R1 + F-A-1 + half of F-A-2 in one stroke. Defers no UI work.

**Q2 — Snapshot strategy for M6→M7: add value-snapshot columns to sub_orders, or enforce immutable-on-commit on M6 prescriptions?**
**Recommendation:** add additive **snapshot columns** on `sub_orders` (12 rx fields × 2 eyes or 1 `rx_snapshot_jsonb`), populated by `add_sub_order` at link-time. Preserves M6's right to edit drafts; preserves order history; honors Brief M7 §5.6. Single migration + 1 RPC body change. Alternative (immutable-on-commit) would deny optometrists the ability to correct typos on committed prescriptions — wrong trade.

**Q3 — Tighten `emit_first_payment_event_fn` predicate to `status='paid' AND amount >= 1`?**
**Recommendation:** yes. 2-line trigger body change. Closes F-B-2 + Brief §1.1 contract.

**Q4 — Author the M5_MIGRATION SPEC (crm_leads → customers) before any UI phase?**
**Recommendation:** yes. Until the cutover runs, every UI built on M5's "single person entity" assumption is built on a half-truth. SPEC blocks M5 UI Phase D, M7 UI, M4 customer-card integration.

**Q5 — Backfill Prizma `tenant_location.short_code='01'` and standardize all branches to 2-char codes?**
**Recommendation:** yes. 2 UPDATEs (Prizma + demo cleanup of STA/STB → 2-char). Closes F-F-1 + R5. Aligns Brief §12 promise with reality before any customer-facing display goes live.

---

## 6. Final verdict + gates

**Verdict: 🟡 CLOSED WITH FOLLOW-UPS.** The 4-module schema spine is sound. The 3 unresolved cross-contracts (F-A-1 lifecycle, F-B-1 snapshot, F-B-2 event predicate) are correctable in <2 hours of total work and should be addressed before M9 builds on top.

**M9 gate (recommended ordering):**
1. ✅ Schema FKs ready — pass.
2. ⏳ Resolve F-A-1 + F-B-1 + F-B-2 BEFORE M9_SCHEMA SPEC opens.
3. ⏳ Author M5_MIGRATION SPEC in parallel (independent track).
4. → M9_SCHEMA SPEC can then proceed under the same overnight-chain template that built M5/M6/M7/M8.

**UI gate (recommended ordering):**
1. ⏳ F-A-1 + F-B-1 + F-B-2 closed.
2. ⏳ F-F-1 short_code backfill + customer_number_display width pinned.
3. ⏳ M5_MIGRATION run (or its UI implications documented and accepted as transition state).
4. ⏳ Wire at least one consumer for `payment_events_queue` (M7-side first_payment listener — minimal viable: 1 EF or 1 trigger that sets `consumed_at` after applying the customer/order state transitions).
5. → M5/M6/M7/M8 UI phases unblocked.

The schema work was clean. The contract work between schemas needs ~½ day of follow-up before the next layer can stand on it without surprises.

---

*End of report. Read-only audit, single deliverable. Architect + Daniel decide which findings become SPECs.*
