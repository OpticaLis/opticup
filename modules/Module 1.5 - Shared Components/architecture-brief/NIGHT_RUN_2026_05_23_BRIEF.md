# Night-Run Brief — 2026-05-23 — Cross-Contract Fixes + Leads Migration + M9 Schema

> **Author:** opticup-architect (Cowork) · **Date:** 2026-05-23
> **For:** a single overnight Claude Code Full-Auto Pipeline chain.
> **Activation Prompt:** `NIGHT_RUN_2026_05_23_ACTIVATION_PROMPT.md` (sibling file — paste THAT into Claude Code).
> **Inputs this Brief consumes:**
> - `modules/Module 1.5 - Shared Components/architecture-brief/M5_M8_STRATEGIC_REVIEW_REPORT.md` (🟡 closed-with-followups)
> - `modules/Module 1.5 - Shared Components/architecture-brief/M5_M8_CODE_REVIEW_REPORT.md` (🟡 pass-with-notes)
> - `modules/Module 9 - Lab/architecture-brief/M9_LAB_BRIEF.md` (v1, sealed 2026-05-10)
> - 4 sealed module Briefs (M5/M6/M7/M8) + their 4 SPEC folders

---

## 0. One-paragraph summary

The customer→prescription→order→payment spine (M5/M6/M7/M8) is schema-built and both dual reviews are complete: structurally sound, fully tenant-isolated, RLS canonical on 23/23 tables, zero anon-execute. Two review reports surfaced **8 actionable cross-contract / hardening findings** that must close before the next layer stands on the spine. In parallel, the `crm_leads → customers` migration is a LIVE-blocker (two parallel person-stores coexist today). Once both close 🟢, M9 (Lab) schema can be built against its already-sealed v1 Brief. This one overnight chain does all three, in dependency order, run-to-end, schema-only, demo-tested. **No UI. No merge to main. Visual QA happens later, separately, with Daniel.**

---

## 1. The three tracks (dependency-ordered)

```
TRACK 1  ──►  TRACK 3
(8 fixes)     (M9 schema — gated on Track 1 🟢)

TRACK 2  (leads migration — independent, can run in parallel/either side)
```

**Track 1 — Cross-Contract Fix SPEC.** The 8 findings. Schema-only, additive, ~12 migrations. Must close 🟢 before Track 3 opens (M9 lab jobs FK to sub_orders whose rx must be snapshot-stable + whose lifecycle must advance).

**Track 2 — Leads-Migration SPEC.** `crm_leads → customers`. Independent track — does not block M9 schema, but is a LIVE-blocker in its own right. 1,354 Prizma leads + 28 demo leads.

**Track 3 — M9 Lab Schema SPEC.** Full schema (~10 tables + 5 engines) per the sealed M9 v1 Brief. Opens ONLY after Track 1 closes 🟢.

The chain runs them in order T1 → (T2 anywhere) → T3. Finish-the-sequence: no pause between tracks unless a real deviation fires.

---

## 2. TRACK 1 — Cross-Contract Fix SPEC (the 8 findings)

**SPEC location:** `modules/Module 1.5 - Shared Components/docs/specs/M5_M8_CROSS_CONTRACT_FIXES/SPEC.md`
(Cross-module fix touching M5+M6+M7+M8 contracts → it lives in the shared-components module that owns cross-module concerns.)

**Discipline:** schema-only, **additive**, demo-first then DDL applies to both tenants but functional smoke data lands on demo only. `## Destructive Operations: None.` Every migration is ALTER ADD / CREATE OR REPLACE / CREATE INDEX — zero DROP/TRUNCATE/DELETE.

### The 8 findings to fix

**Cross-contract (from Strategic Review):**

1. **F-A-1 — Lifecycle trigger unwired (🔴 CRITICAL).** `compute_lifecycle_stage_on_order()` exists in `pg_proc` but is attached to zero tables. All 11 demo customers stuck at `prospect` despite paid payments. Brief M5 §1.1 + §8 #50 promised auto-advance to `active`. **Fix direction (per Strategic Q1 recommendation):** attach an `AFTER INSERT OR UPDATE OF status` trigger on `payments` that advances `customers.lifecycle_stage` when the first PAID payment ≥ ₪1 lands. Broaden the function body to read `NEW.customer_id` and key off first-paid. Closes R1 + half of F-A-2 in one stroke.

2. **F-B-1 — Prescription VALUE snapshot missing (🔴 CRITICAL).** `sub_orders` carries only `prescription_glasses_id` / `prescription_contacts_id` (identity FK), no value snapshot. An M6 edit silently mutates historical orders + printed forms + future M9 lab jobs. Brief M7 §4.2 + §5.6 promised snapshot-on-link. **Fix direction (per Strategic Q2 recommendation):** add an additive `rx_snapshot_jsonb` column on `sub_orders` (single jsonb preferred over 12+ flat columns), populated by `add_sub_order` from the linked prescription at link-time. Preserves M6's right to edit drafts; preserves order history. This is data-integrity-grade for an optical clinic.

3. **F-B-2 — first_payment event predicate too lax (🔴 CRITICAL).** `emit_first_payment_event_fn` fires on first INSERT regardless of `NEW.status`. Brief M7 §4.4 + M8 §4.1 + M5 §1.1 required "first PAID payment with amount ≥ 1". **Fix direction (per Strategic Q3 recommendation):** add `WHEN NEW.status = 'paid' AND NEW.amount >= 1` gate to the trigger. 2-line trigger-body change.

**Code-hardening (from Code Review — these prevent real production regressions the moment two staff act simultaneously):**

4. **F-D1 — payment_events_queue first_payment double-enqueue (🔴 HIGH).** No UNIQUE beyond pkey → two concurrent `record_payment` for the same order both see count=0 and both enqueue → downstream welcome flow fires twice. **Fix:** partial unique index `payment_events_queue (order_id) WHERE event_kind = 'first_payment'`, AND wrap the trigger INSERT in `BEGIN ... EXCEPTION WHEN unique_violation THEN NULL; END` so first-writer-wins / second silently dedups (per Code Q2 recommendation — option (a), matches at-least-once semantics).

5. **F-C3 / F-D2 — mark_check_returned re-trigger (🔴 HIGH).** UPDATE lacks `WHERE status = 'in_bank'` predicate → two concurrent calls both succeed → `check_returned` double-enqueues. **Fix:** add `AND status = 'in_bank'::payment_status` to the UPDATE's WHERE; AND add partial unique index `payment_events_queue (payment_id) WHERE event_kind = 'check_returned'` with the same exception-trap pattern.

6. **F-F1 — payment_events_queue has zero tenant_id / order_id / customer_id indexes (🔴 HIGH-perf).** Consumer queries (`WHERE tenant_id = X AND consumed_at IS NULL`) fall through to scan. **Fix:** add the three FK indexes on `payment_events_queue`.

7. **F-C2 — no DB CHECK amount > 0 (🟡 MEDIUM defense-in-depth).** A service_role direct INSERT bypassing the RPC can persist a negative/zero amount with no DB rejection — books silently go off. **Fix:** `ALTER TABLE payments ADD CONSTRAINT payments_amount_positive CHECK (amount > 0)`; same for `sub_order_items` quantity (`CHECK (quantity > 0)`).

8. **F-F2 (remaining 6 unindexed FKs) — folded in (🟡 LOW).** Roll the 6 other unindexed FKs flagged by the performance advisor into the same migration: `eye_exams.branch_id`, `prescriptions_glasses.health_fund_id`, `prescriptions_contacts.health_fund_id`, `sub_orders.repair_origin_order_id`, plus any remaining. One CREATE INDEX each.

### Explicitly OUT of Track 1 (deferred, do NOT do)

- **F-A-2 full** (order quote→active path) — the lifecycle-trigger fix (F-A-1) covers half. The other half is "an order has no quote→active until a sub_order exists" — DOCUMENT this invariant in M7 db-schema; do not invent a new RPC path. (Strategic F-A-2 said "pick one"; the pick is: document the invariant, advance customers via payments, advance orders via sub_orders. No new mechanism.)
- **F-B-1 anon view REVOKE grants** (Code F-B1 / Q4) — LOW, blocked by `security_invoker=on`. Defer to the project-wide RLS-perf SPEC.
- **F-F3 `auth_rls_initplan` rewrite** (181 project-wide occurrences) — defer to a single project-wide RLS-perf SPEC under Module 1.5 (per Code Q3 recommendation). NOT this run.
- **F-F4 unused_index drops** — premature; re-audit after UI workload exists.
- **F-D-1 cross-kind prescription-number CHECK / F-F-1 customer_number_display width** — these are documentation/backfill items, NOT in this schema-fix run. (The short_code backfill is a data write to Prizma + demo — handle in the migration track or a follow-up, NOT bundled here. See §3 note.)

### Track 1 mandatory smoke (demo) — must pass before T1 closes 🟢

1. Record a first PAID payment ≥ ₪1 → customer lifecycle_stage advances `prospect → active`.
2. Record a `pending_pos` payment first → NO first_payment event emitted (predicate gate works).
3. Two simulated concurrent first-payment paths for one order → exactly ONE `first_payment` queue row (dedup works).
4. `mark_check_returned` on an `in_bank` check → exactly ONE `check_returned` event; a second call on the now-`returned` check → no second event.
5. Attempt a direct INSERT of `amount = 0` payment (as service_role) → rejected by CHECK.
6. `add_sub_order` linking a prescription → `rx_snapshot_jsonb` populated; then edit the source prescription → the sub_order snapshot is unchanged.
7. Cross-tenant guard + anon-reject still hold on every touched RPC.

If ANY fail → STOP, escalate, HALT chain (M9 must not build on an unproven spine).

---

## 3. TRACK 2 — Leads-Migration SPEC (crm_leads → customers)

**SPEC location:** `modules/Module 5 - Customers/docs/specs/M5_LEADS_MIGRATION/SPEC.md`

**Why a LIVE-blocker:** M4 production keeps writing to `crm_leads` (1,354 rows on Prizma + 28 on demo); M5 RPCs write to `customers`. Two parallel person-stores. Until the cutover runs, every UI built on M5's "single person entity" assumption is built on a half-truth, and M5 UI will not see lead-only people. (Strategic F-C-1 / R4.)

**Scope IN:**
- Migrate `crm_leads` rows into `customers` with `lifecycle_stage='lead'` (or the correct seam stage), preserving the original lead identity, source/UTM, consent state, and created_at.
- Re-point existing FKs that today reference `crm_leads.id` (e.g. `crm_event_attendees`) — decide and document the dual-write / backfill approach (the migration must keep M4 production functioning through cutover; M4 continues to write to crm_leads until its own cutover, OR a dual-write seam is established — the SPEC author picks the safe path and documents it).
- Dedup against existing `customers` (phone-based, per M5 §4.7 dedup rules) so a lead who is already a customer doesn't create a duplicate person.
- Demo-first (28 demo leads), verify, THEN Prizma (1,354). Backup-first before the Prizma write.

**Scope OUT:**
- Decommissioning / dropping `crm_leads` — NOT this run. crm_leads stays live; M4 still uses it. This is an additive migration + FK-seam, not a teardown. Any `crm_leads` removal is a separate far-future SPEC after M4 itself cuts over.
- The OpticPlus 5,028-customer import — that is the separate historical-data migration, not this leads cutover.
- Any UI.

**Track 2 mandatory smoke (demo):**
1. All 28 demo leads present in `customers` after migration, none lost, none duplicated against existing customers.
2. A demo lead that matches an existing customer by phone → merged/linked, not duplicated.
3. `crm_event_attendees` (or whatever FKs crm_leads) still resolve correctly post-migration.
4. M4 demo flows that write a new lead still succeed (no regression to live M4).
5. Cross-tenant isolation holds (demo migration does not touch Prizma rows).

If ANY fail → STOP, escalate, HALT (do NOT proceed to the Prizma 1,354-row write on a failed demo run).

**Prizma write gate:** the 1,354-row Prizma migration runs only after demo smoke 5/5 passes AND a backup is taken. This is a production write — backup-first, verify-after, report row counts before and after.

---

## 4. TRACK 3 — M9 Lab Schema SPEC (gated on Track 1 🟢)

**SPEC location:** `modules/Module 9 - Lab/docs/specs/M9_SCHEMA/SPEC.md`
**Design source:** `modules/Module 9 - Lab/architecture-brief/M9_LAB_BRIEF.md` v1 (sealed 2026-05-10). This track does NOT re-design M9 — it authors the schema SPEC against the already-sealed Brief and builds it.

**Build scope (per M9 Brief §3 + §4):**
- **~10 tables:** `lab_jobs`, `lab_categories` (config P19), `lab_compensation_tiers`, `lab_notes`, `shipping_boxes`, `shipping_box_items`, `lab_damage_reasons` (config), `lab_couriers` (config), `lab_supplier_thresholds`. (`lab_status_log` is NOT a table — it's a View `v_m9_status_log` over the central `activity_log` per Iron Rules 2 + 21.)
- **5 engines** (Brief §4): Clock Engine (pg_cron per-minute), Compensation Engine, Shipping Box Engine, plus the remaining two per Brief §4 — build the DB-side functions/RPCs; do NOT wire notification side-effects (WhatsApp/sound) — those are M12 + UI, deferred (foundation-first, P17).
- **Cross-contract FKs:** `lab_jobs.sub_order_id → sub_orders`, `lab_jobs.order_id → orders`, `lab_jobs.customer_id → customers`, `lab_jobs.category_id`, supplier/courier FKs to M1.
- **`v_lab_queue` consumer side** already exists from M7 — M9 reads it. Build the M9-owned views the Brief calls for.
- Same discipline as M5-M8: canonical 2-policy RLS, SECURITY DEFINER + search_path + JWT Block-A guard, tenant-scoped UNIQUE, FK indexes, soft-delete, T-constants + FIELD_MAP, atomic number allocation via `allocate_tenant_number` (Iron Rule 11 — reuse, do NOT create a new counter table).
- **Inherit the queue-idempotency lesson from Track 1:** if M9 creates its own `lab_events_queue` (Pattern P22), it MUST ship with the partial-unique-on-source-id idempotency guard from day one (per Code Review §6 — codify the idiom so M9 doesn't inherit the F-D1 gap).

**M9 mandatory smoke (demo) ≥ 8/8 + cross-contract:**
- create lab_job from a sub_order; clock engine advances color on threshold; manual freeze/unfreeze with mandatory reason; compensation tier proposal + manager approve within max-addition; shipping box outgoing draft → scan order barcode → send; incoming box receive → mark ok/damaged with reason; cross-tenant guard; anon-reject. Plus cross-contract: a real M7 sub_order flows into a lab_job and `v_lab_queue` shows it.

If ANY fail → STOP, escalate, HALT.

**M9 explicitly OUT:** any UI / KDS screen (the McDonalds screen, shipments drawer, dashboard — all separate UI SPECs, Daniel-in-loop, Chrome MCP); notification side-effects (M12); M11 reports; the M1 inventory-extension blocker (3 lens/CL/accessory stock tables — separate SPEC per OPEN_TASKS #2; M9 schema can build without it but FK to inventory where M9 Brief specifies, leaving the lens-specific FKs documented-deferred if the M1 extension isn't present).

---

## 5. Global constraints (all three tracks)

- **Branch:** develop. Never main. Merge to main is Daniel-only, after QA, via GitHub PR (not this run).
- **Environment:** Claude Code (NOT Cowork — Cowork's 45s MCP timeout breaks DDL chains). Supabase MCP connected.
- **Demo-first:** all functional smoke data on demo (`8d8cfa7e-ef58-49af-9702-a862d459cccb`, PIN 12345). DDL applies to both tenants. Prizma DATA writes only in Track 2's gated 1,354-row step (backup-first).
- **Iron Rules in sharp focus:** 1, 2, 11, 14, 15, 18, 19, 21, 22, 23, 31, 32. Rule 32: each SPEC declares `## Destructive Operations` — Track 1 + Track 3 = `None.`; Track 2 = declare the migration writes (INSERT into customers, FK re-point) explicitly, no DROP.
- **Integrity gate (Rule 31):** `npm run verify:integrity` clean before every commit. Never `--no-verify`.
- **Selective git add only** — by explicit filename. Never `git add -A` / `.`.
- **Backups** per Working Rule 9.9 when a step touches >5 files or refactors >100 lines, AND before the Prizma production write.
- **MIGRATION.md Applied Log** — this is MCP-migration-heavy; log every applied migration version.
- **Pipeline coordination** — claim the session lock; no competing Claude Code session on this repo overnight.
- **Self-validate every file write** (P42): `wc -l` + `tail` + marker check before declaring any phase complete (Cowork-VM truncation defense — but this runs on Claude Code, still good hygiene).

---

## 6. Pre-flight probes (pin as §0 baseline before any DDL)

1. Confirm branch=develop, repo=opticalis/opticup, clean tree (handle untracked per First Action 3a survey-first).
2. Confirm `compute_lifecycle_stage_on_order` exists in pg_proc and is attached to zero triggers (F-A-1 premise).
3. Confirm `sub_orders` has NO `rx_snapshot_jsonb` column yet (F-B-1 premise).
4. Confirm `payment_events_queue` has only pkey, no partial uniques, no tenant_id/order_id/customer_id index (F-D1/F-F1 premise).
5. Confirm `emit_first_payment_event_fn` body has no status gate (F-B-2 premise).
6. Confirm live row counts: `crm_leads` (expect 1,354 Prizma + 28 demo), `customers` (demo 11), `payment_events_queue` (demo 3 undrained).
7. Confirm M9 tables do NOT exist yet (Track 3 premise).
8. Confirm demo branch present + `allocate_tenant_number` signature.

Pin every result. If any premise is false (e.g. trigger already attached, snapshot column already exists) → that finding is already resolved; note it, skip that fix, do NOT invent work.

---

## 7. What Daniel has in the morning

- Track 1 closed 🟢 — the spine's 8 cross-contract/hardening gaps fixed, smoke 7/7 on demo. The customer→active and order-history-stable contracts now actually hold.
- Track 2 closed 🟢 — leads unified into customers, demo 5/5 + Prizma 1,354 migrated (backup taken). Single person-store seam established.
- Track 3 closed 🟢 — M9 Lab schema live on demo (~10 tables + 5 engines + views + RPCs), smoke 8/8 + cross-contract. M9 becomes UI-buildable.
- Reports per track in each SPEC folder (EXECUTION_REPORT + FINDINGS + FOREMAN_REVIEW). MIGRATION.md updated. GLOBAL_MAP / GLOBAL_SCHEMA / DB_TABLES_REFERENCE merged additive.

**Next wave (Daniel-in-loop, separate Cowork chat):** visual / UI QA on ALL new modules (M5–M9) via Chrome MCP per Iron Rule 34. Then the M5/M6/M7/M8/M9 UI SPECs.

---

## 8. Anti-patterns for this run (do NOT)

- Do NOT build M9 before Track 1 closes 🟢 (lab jobs FK a spine that must be sound first).
- Do NOT touch ANY UI in any track.
- Do NOT drop / decommission `crm_leads` (additive migration only; M4 still runs on it).
- Do NOT do the project-wide RLS-perf rewrite (181 occurrences) — out of scope, separate SPEC.
- Do NOT bundle the customer_number_display width backfill / short_code change into the schema-fix — it's a data write, separate.
- Do NOT wire notification side-effects (WhatsApp/sound) in M9 — foundation-first, M12 owns delivery.
- Do NOT merge to main.
- Do NOT close any track 🟢 without its smoke passing on demo.
- Do NOT relitigate the sealed M5/M6/M7/M8/M9 decisions — they are locked; this run executes, it does not redesign.

---

*End of Brief. Three tracks, one overnight chain, schema-only + one gated production data migration. UI + visual QA are a separate later wave with Daniel.*
