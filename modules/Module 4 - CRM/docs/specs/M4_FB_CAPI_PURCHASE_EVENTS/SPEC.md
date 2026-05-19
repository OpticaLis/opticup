# SPEC — M4_FB_CAPI_PURCHASE_EVENTS

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_PURCHASE_EVENTS/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, M4)
> **Authored on:** 2026-05-19
> **Module:** 4 — CRM
> **Phase:** FUNNEL_ROADMAP Phase 2 follow-up (Purchase events; the high-value half of CAPI)
> **Author signature:** Claude Code single-chat Full-Auto Pipeline (Opus author → Sonnet executor → default reviewer → default LH-Tester → Opus closure)
> **Brief origin:** `modules/Module 4 - CRM/architecture-brief/M4_FB_CAPI_PURCHASE_EVENTS_BRIEF.md` (sealed 2026-05-19)
> **Risk class:** MEDIUM. DB triggers + EF branch + 1 destructive op (replace existing unique constraint). All other changes additive.

---

## 0. Pre-Authoring Reality Check

Required before drafting any later section. Captures live-DB findings + Daniel's resolution of the BLOCKING escalation that halted SPEC authoring on first attempt.

- ✅ Brief read in full on 2026-05-19, including §4 Cross-Module Safety Audit (binding).
- ✅ `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md` already current — Iron Rule 35 boundary confirmed: zero placeholders, zero action_types, zero trigger types added by this SPEC.
- ✅ `M4_FB_CAPI_HYBRID_DEDUPLICATION/SPEC.md` skimmed for P2.1 reference shape (canonical 2-policy RLS + queue + cron + EF).
- ✅ `supabase/functions/fb-capi-dispatch/index.ts` read in full — current EF already reads `event_name` column at line 88+173 and threads it to Meta. Adding event types becomes a branching matter inside `processQueueRow`.
- ✅ `docs/FB_CAPI.md` current — §12 Dashboard Surface just appended by `M4_PIXEL_VALIDATION_GAP_DASHBOARD` (2026-05-19). This SPEC appends §13 Event Type Coverage.
- ✅ **4 mandatory DB probes completed (per the user's activation prompt) — see §0.5 below.**
- ✅ **BLOCKING escalation `2026-05-19T15-15-00Z_M4_FB_CAPI_PURCHASE_EVENTS_STATUS_VOCABULARY.md` raised and resolved by Daniel — see §0.4 below.**
- ✅ Cross-Reference Check (Rule 21) completed 2026-05-19 — see §0.6 below.
- ✅ Runtime semantics rehearsed — see §0.7 below.

### 0.4 Escalation Resolution (audit trail of the BLOCKING stop)

**Escalation file:** `modules/Module 4 - CRM/escalations/2026-05-19T15-15-00Z_M4_FB_CAPI_PURCHASE_EVENTS_STATUS_VOCABULARY.md`

**Why it fired:** Pre-flight Probe 2 + Probe 3 contradicted the Brief's status-vocabulary assumption. The Brief's §3 Purchase row + §4.5 trigger spec assume `status` flips to `'purchased'`. Live DB:
- `crm_statuses` for entity_type='attendee' on both tenants has 11 slugs (`registered, waiting_list, invited, confirmed, attended, no_show, cancelled, duplicate, quick_registration, event_closed, manual_registration`). **No `'purchased'` slug exists.**
- Prizma's 234 attendee rows: 84 have `purchase_amount > 0`, **0 have `payment_status != 'pending_payment'`**. The de facto purchase signal on Prizma is `purchase_amount`, not `status` or `payment_status`.
- Demo's 60 rows: payment_status `paid`=7 / `unpaid`=1 / `refunded`=1 — demo has exercised that column but Prizma never has.

**Daniel's resolution (received 2026-05-19, baked into D-AUTH-1 below):**
> **Option B chosen.** Trigger fires on `crm_event_attendees.purchase_amount` transition from NULL/0 → > 0. NO status check. NO payment_status check. Plus the secondary Rule 21 fix: reuse existing `event_name` column instead of adding `event_type`. Drop and replace unique constraint accordingly. D7 forward-only stands — do NOT backfill the 84 existing rows.

### 0.5 Live DB Baselines (referenced by §3 Success Criteria as `BASE_*`)

| Symbol | Source | Value (captured 2026-05-19) |
|---|---|---|
| `BASE_PURCHASE_AMOUNT_COL` | `information_schema.columns WHERE table_name='crm_event_attendees' AND column_name='purchase_amount'` | numeric NULLABLE — exists ✅ |
| `BASE_STATUS_COL` | same | text NOT NULL DEFAULT 'registered' — exists ✅ |
| `BASE_PAYMENT_STATUS_COL` | same | text NOT NULL DEFAULT 'pending_payment' — exists but NOT used by this SPEC (D-AUTH-1) |
| `BASE_QUEUE_EVENT_NAME_COL` | `information_schema.columns WHERE table_name='crm_capi_dispatch_queue' AND column_name='event_name'` | text NOT NULL DEFAULT 'Lead' — **exists ✅; Brief proposed adding `event_type` — REJECTED as Rule 21 duplicate; reusing this** |
| `BASE_QUEUE_EVENT_TYPE_COL` | same, looking for `event_type` | does-not-exist — confirms Rule 21 violation prevented |
| `BASE_QUEUE_UNIQUE_OLD` | `pg_constraint WHERE conname='crm_capi_dispatch_queue_tenant_lead_unique'` | UNIQUE (lead_id, tenant_id) — exists, this SPEC REPLACES it |
| `BASE_QUEUE_ROW_COUNT` | `SELECT count(*) FROM crm_capi_dispatch_queue` | 33 rows (all event_name='Lead' — verified, so tighter constraint won't conflict at swap time) |
| `BASE_ATTENDEE_TRIGGERS` | `information_schema.triggers WHERE event_object_table='crm_event_attendees'` | 2 triggers: `set_updated_at_trg` + `trg_attendee_status_change_event` (M4 SCE bus — Brief §4.6 excludes). NO CAPI trigger ✅ |
| `BASE_PRIZMA_PURCHASE_AMOUNT_GT_0` | `SELECT count(*) FROM crm_event_attendees WHERE tenant_id=prizma AND purchase_amount > 0` | 84 rows — D7 says NOT backfilled |
| `BASE_PRIZMA_PAYMENT_STATUS_PAID` | `... AND payment_status='paid'` | 0 rows |
| `BASE_DEMO_PAYMENT_STATUS_PAID` | `... AND tenant_id=demo AND payment_status='paid'` | 7 rows |
| `BASE_PGCRYPTO_EXT` | `pg_extension WHERE extname='pgcrypto'` | v1.3 enabled — available for `digest()` |
| `BASE_UUID_OSSP_EXT` | `pg_extension WHERE extname='uuid-ossp'` | v1.1 enabled — **`uuid_generate_v5(uuid_ns_oid(), lead_id::text \|\| ':' \|\| event_name)` is the deterministic event_id derivation** |
| `BASE_FB_CAPI_DOC_LINES` | `wc -l docs/FB_CAPI.md` | 289 (Executor appends §13; target ≤ 320) |
| `BASE_PIXEL_GAP_TILE_LINES` | `wc -l modules/crm/crm-pixel-gap-tile.js` | 98 (Executor MAY extend by ≤ 30 lines for event_type-aware counts; absolute ceiling for this file remains ≤ 350 per Iron Rule 12 BUT cosmetic target ≤ 130 for this SPEC) |
| `BASE_EF_DISPATCH_LINES` | `wc -l supabase/functions/fb-capi-dispatch/index.ts` | 336 (Executor adds branching for 3 new event types; target ≤ 400) |

### 0.6 Cross-Reference Check (Iron Rule 21 — done at author time)

| New name | Search target | Hits | Resolution |
|---|---|---|---|
| `trg_capi_attendee_registered` (new trigger) | `grep -rn "trg_capi_attendee_registered"` repo-wide | 0 | Genuinely new |
| `trg_capi_attendee_attended` (new trigger) | same | 0 | Genuinely new |
| `trg_capi_attendee_purchased` (new trigger) | same | 0 | Genuinely new |
| `capi_enqueue_complete_registration_fn` (new function) | `grep -rn "capi_enqueue"` repo-wide | 0 | Genuinely new |
| `capi_enqueue_event_attended_fn` (new function) | same | 0 | Genuinely new |
| `capi_enqueue_purchase_fn` (new function) | same | 0 | Genuinely new |
| `crm_capi_dispatch_queue_tenant_lead_event_unique` (new constraint name) | `pg_constraint WHERE conname='crm_capi_dispatch_queue_tenant_lead_event_unique'` | 0 | Genuinely new (replaces `_tenant_lead_unique`) |
| ~~`event_type` (new column)~~ | `information_schema.columns WHERE table_name='crm_capi_dispatch_queue' AND column_name='event_name'` | 1 hit on `event_name` | **Rule 21 violation by Brief — RESOLVED at author time per Daniel's approval: REUSE existing `event_name` column. NO new column.** |
| `CompleteRegistration`, `EventAttended`, `Purchase` as event_name values | `grep -rn "CompleteRegistration\|EventAttended" supabase/functions/` | 0 | Genuinely new vocabulary additions to existing `event_name` column |

**Cross-Reference Check completed 2026-05-19 against GLOBAL_SCHEMA + GLOBAL_MAP + FILE_STRUCTURE + live `pg_proc` + `pg_trigger`: 0 collisions / 1 Brief-vs-reality Rule 21 violation pre-resolved.**

### 0.7 Runtime Semantics Rehearsal (per skill §1.5 Step 5.3)

The SPEC adds 3 DB triggers (SECURITY DEFINER) + 3 trigger functions + modifies 1 EF. Rehearse each surface:

#### Trigger function semantics

For each of the 3 trigger functions, reason about edge cases:

**(1) `capi_enqueue_complete_registration_fn()` — AFTER INSERT ON `crm_event_attendees`:**
- **Happy path:** new attendee row → enqueue `(tenant_id, lead_id, event_name='CompleteRegistration', event_id=uuid_generate_v5(...))`.
- **NULL lead_id:** `crm_event_attendees.lead_id` is NOT NULL — impossible. Skip.
- **Idempotency:** if a duplicate INSERT happens (e.g., manual ROW INSERT replay), the new unique constraint `(tenant_id, lead_id, event_name)` rejects the duplicate via ON CONFLICT DO NOTHING. NO error to caller.
- **Cross-tenant:** tenant_id from NEW.tenant_id — RLS irrelevant for trigger context (runs as SECURITY DEFINER); the INSERT itself was tenant-scoped.

**(2) `capi_enqueue_event_attended_fn()` — AFTER UPDATE OF status ON `crm_event_attendees`:**
- **Happy path:** OLD.status != 'attended' AND NEW.status = 'attended' → enqueue Purchase-distinct event_name='EventAttended'.
- **Status not changing to attended:** function early-returns (NEW.status != 'attended' OR OLD.status = 'attended').
- **Re-flip attended → cancelled → attended:** function fires a 2nd time on the 2nd "attended" transition. Unique constraint on `(tenant_id, lead_id, 'EventAttended')` rejects the 2nd row (ON CONFLICT DO NOTHING). NO duplicate Meta event.
- **Idempotency at trigger entry:** explicit `WHERE OLD.status IS DISTINCT FROM NEW.status` guard to avoid no-op updates.

**(3) `capi_enqueue_purchase_fn()` — AFTER UPDATE OF purchase_amount ON `crm_event_attendees`:**
- **Happy path:** OLD.purchase_amount IS NULL OR OLD.purchase_amount = 0; NEW.purchase_amount > 0 → enqueue event_name='Purchase' (with payload carrying value + currency at EF-dispatch time).
- **Operator corrects typo (100 → 80):** function early-returns (OLD.purchase_amount = 100, which is > 0 — does not match the transition condition).
- **Operator zeroes out (100 → 0):** function early-returns (refund scenario — out of scope per Brief §3 "Out of scope: Refund/cancellation events").
- **NULL → 0:** function early-returns (no value to send Meta).
- **NULL → 50.50 numeric:** function fires. The value 50.50 will be passed to Meta as `value: 50.50` (Meta accepts numeric/float).
- **Re-applying the same value via UPDATE noop (100 → 100):** function early-returns (no transition).
- **Idempotency at queue:** if somehow the trigger fires twice with the same `(tenant_id, lead_id, 'Purchase')`, the unique constraint hits ON CONFLICT DO NOTHING.

#### Edge case — concurrent Lead + CompleteRegistration

If a lead is created + immediately registered to an event in the SAME transaction (which the M4 `dispatch.ts` lead-intake EF can do), the order is:
1. INSERT crm_leads → `lead-intake` EF separately enqueues `event_name='Lead'`.
2. INSERT crm_event_attendees → trigger `trg_capi_attendee_registered` enqueues `event_name='CompleteRegistration'`.

Both rows hit the queue. Both have unique `(tenant_id, lead_id, event_name)` (Lead + CompleteRegistration are distinct). Both dispatched independently. Meta receives both. Correct.

#### Edge case — same lead registered to 2 different events

Two `crm_event_attendees` rows for the same `lead_id`, different `event_id` (the FK to crm_events). Both trigger `trg_capi_attendee_registered`. The unique constraint is on `(tenant_id, lead_id, event_name)` — both rows would try to enqueue `(prizma, lead42, 'CompleteRegistration')`. **Second INSERT into the queue rejected by ON CONFLICT DO NOTHING.**

**Daniel-decision implication:** v1 sends `CompleteRegistration` ONCE per lead across all events (consistent with the unique constraint's tenant_id+lead_id+event_name shape). If Daniel wants per-event-registration tracking, that's a future SPEC that loosens the constraint to include `event_id` (the FK) — out of scope here.

#### EF dispatch branching

`fb-capi-dispatch/index.ts` branches on `eventName` (already passed through):
- `'Lead'` → existing behavior (em + ph only, no custom_data).
- `'CompleteRegistration'` → em + ph + `action_source: 'system'` (no value, no currency).
- `'EventAttended'` → em + ph + `action_source: 'system'` (custom event — Meta treats unknown event_name as standard event payload; advanced matching only).
- `'Purchase'` → em + ph + `custom_data: { value: N, currency: 'ILS' }` (REQUIRED for Meta's ROAS calc). The value is fetched at dispatch time from `crm_event_attendees.purchase_amount` via a tenant-scoped SELECT joined by lead_id.

**Runtime semantics rehearsed: yes —**
- `capi_enqueue_complete_registration_fn`: idempotent via ON CONFLICT; AFTER INSERT only; handles NEW.lead_id NOT NULL.
- `capi_enqueue_event_attended_fn`: explicit OLD.status IS DISTINCT FROM NEW.status guard + status='attended' check; idempotent via ON CONFLICT.
- `capi_enqueue_purchase_fn`: transition (NULL/0 → > 0) guard explicit; refund-direction (anything → 0) explicitly does nothing (out of scope); typo correction (>0 → >0 different) explicitly does nothing; idempotent via ON CONFLICT.
- EF Purchase branch: SELECT `crm_event_attendees.purchase_amount WHERE lead_id=... AND tenant_id=...` with Iron Rule 22 defense-in-depth. If the attendee row was deleted between trigger enqueue + EF dispatch, the queue row gets `status='permanent_error'` with `error_message='attendee_not_found: ...'` (mirrors existing `lead_not_found` pattern in EF).

### Lessons Applied from Prior 3 FOREMAN_REVIEWs (M4)

| From SPEC | Lesson | How honored in this SPEC |
|---|---|---|
| `M4_PIXEL_VALIDATION_GAP_DASHBOARD` Author Proposal P-AUTHOR-1 (2026-05-19) | "Verbatim SQL column-name probe at author time" | Probe 1 + Probe 2 + Probe 3 covered all column references in this SPEC's SQL. Caught the `'purchased'` non-existence + the `event_type` vs `event_name` Rule 21 issue BEFORE executor would have. |
| `M4_PIXEL_VALIDATION_GAP_DASHBOARD` Author Proposal P-AUTHOR-2 (2026-05-19) | "Line-budget sub-allocation for tight criteria" | This SPEC's file-budget criteria are not tight (EF ≤ 400 vs 336 baseline; tile optional ≤ 130 vs 98). N/A for §3.5 — but baked the sub-allocation discipline into §3 anyway. |
| `M4_PIXEL_VALIDATION_GAP_DASHBOARD` Executor Proposal P-EXEC-1 (2026-05-19) | "Column-name pre-flight as a hard Step 1.5 sub-check" | Already applied by this Foreman at author time (probes captured every column name the SQL references). Executor's Step 1.5 is a defensive re-check rather than a discovery activity for this SPEC. |
| `M4_FB_CAPI_HYBRID_DEDUPLICATION` Author Proposal #1 (2026-05-15) | "pg_cron SQL pattern probe" | N/A — this SPEC adds zero pg_cron jobs (reuses existing `fb_capi_dispatch_consumer`). |
| `M4_FB_CAPI_HYBRID_DEDUPLICATION` Author Proposal #2 (2026-05-15) | "CLI command pre-verification in ROLLBACK" | §9 Rollback uses only `git revert` + `DROP TRIGGER IF EXISTS` + `DROP FUNCTION IF EXISTS` + restore old constraint via `ALTER TABLE ... ADD CONSTRAINT ... UNIQUE`. No exotic CLI commands. |
| `M4_FB_CAPI_HYBRID_DEDUPLICATION` Executor Proposal P-EXEC-1 (2026-05-15) | "After `git add <path>`, run `git diff --cached --name-only` and confirm only intended files staged" | Codified in §4 Autonomy Envelope. |
| `M4_FB_CAPI_HYBRID_DEDUPLICATION` Executor Proposal P-EXEC-2 (2026-05-15) | "Multi-file EF with shared deps: prefer Supabase CLI over MCP" | `fb-capi-dispatch` is still single-file → MCP `deploy_edge_function` first; CLI fallback on first 5xx per OPEN-021. |

### D-AUTH (Foreman decisions pre-committed at author time)

- **D-AUTH-1 (purchase signal — Daniel-confirmed).** Trigger fires on `purchase_amount` transition from (`OLD IS NULL OR OLD = 0`) to (`NEW > 0`). NO `status` check. NO `payment_status` check. Operators are NOT required to flip a status. The 84 existing Prizma rows are NOT backfilled (D7 forward-only). Future SPEC may add a tenant-config setting to switch to `payment_status='paid'` semantics.

- **D-AUTH-2 (column reuse — Daniel-confirmed; Rule 21).** Reuse existing `crm_capi_dispatch_queue.event_name text NOT NULL DEFAULT 'Lead'` column. NO new `event_type` column. New unique constraint `(tenant_id, lead_id, event_name)` REPLACES the existing `(tenant_id, lead_id)` constraint named `crm_capi_dispatch_queue_tenant_lead_unique`. New constraint name: `crm_capi_dispatch_queue_tenant_lead_event_unique`. Existing 33 queue rows (all `event_name='Lead'`) won't conflict with the tighter constraint at swap time (verified in §0.5 baseline).

- **D-AUTH-3 (trigger count — 3 not 2).** Brief §4.5 proposed 2 triggers: registration (AFTER INSERT) + status_change (AFTER UPDATE OF status; combined attended + purchase). Daniel's D-AUTH-1 decoupled Purchase from status — Purchase now fires on `purchase_amount` UPDATE, NOT `status` UPDATE. Cleanest decomposition: 3 triggers, one per Meta event type. The Brief's 2-trigger plan is superseded.
  - `trg_capi_attendee_registered` — AFTER INSERT, enqueues `CompleteRegistration`.
  - `trg_capi_attendee_attended` — AFTER UPDATE OF status WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'attended'), enqueues `EventAttended`.
  - `trg_capi_attendee_purchased` — AFTER UPDATE OF purchase_amount WHEN ((OLD.purchase_amount IS NULL OR OLD.purchase_amount = 0) AND NEW.purchase_amount > 0), enqueues `Purchase`.

- **D-AUTH-4 (deterministic event_id derivation).** Use `uuid_generate_v5(uuid_ns_oid(), lead_id::text || ':' || event_name)`. The `uuid-ossp` extension v1.1 is enabled (verified). Output is stable: same (lead_id, event_name) → same uuid. Meta dedups via the shared event_id. If the same lead's queue row is replayed (e.g., manual replay from `permanent_error`), Meta receives the same event_id and dedups against the prior successful dispatch.

- **D-AUTH-5 (Iron Rule 32 — declared destructive ops count = 1).** Brief said "Destructive Operations = 0" assuming a new column. The Rule 21 fix replaces the existing unique constraint with a tighter one. `ALTER TABLE ... DROP CONSTRAINT` is one of the patterns flagged by `destructive-ops-declared.mjs`. **Declared explicitly in §11 below.** No file deletes, no DROP TABLE, no DROP COLUMN, no TRUNCATE, no DML mass-delete, no main-branch modification.

- **D-AUTH-6 (currency = ILS, hardcoded for v1).** Brief D4 said "use tenant's configured currency (read from `tenants.ui_config.currency` if present, default 'ILS')." Reality: `tenants.ui_config` likely doesn't have a `currency` key today (project memory `feedback_localization` cluster M-NEW-39-5 catalogs Hebrew-locale + ₪ hardcoding as carry-tech-debt). v1 hardcodes `currency = 'ILS'` in the EF. **Future-tenant migration plan:** when `M4_M1_5_TENANT_LOCALE_PROPAGATION` SPEC ships, replace the hardcode with `tenants.ui_config.currency || 'ILS'`. Logged as finding F-A1 below.

- **D-AUTH-7 (Iron Rule 34 — UI verification scope).** This SPEC modifies `crm-pixel-gap-tile.js` IF the Executor opts to surface per-event-type counts (optional per Brief §3 + §4.8). If the tile IS touched → Iron Rule 34 triplet required (Chrome MCP screenshot + runtime trace + DB-query evidence). If the tile is NOT touched → Iron Rule 34 does not apply to this SPEC (DB triggers + EF aren't browser-consumed). Executor decides in Step 1.5 + documents in EXECUTION_REPORT D-N.

- **D-AUTH-8 (CompleteRegistration scope — per lead, not per registration).** New unique constraint `(tenant_id, lead_id, event_name)` means CompleteRegistration is dispatched ONCE per lead across all events the lead registers to. If a lead registers to 2 events, only the first registration enqueues a CompleteRegistration; the 2nd hits ON CONFLICT DO NOTHING. **This is intentional for v1** — matches the way Meta thinks about user-funnel-stage. Future SPEC may switch to per-attendee-row tracking by including `event_id` (the FK) in the constraint.

- **D-AUTH-9 (purchase_amount value passed to Meta).** Numeric raw value (e.g., `500.00`) — Meta accepts decimals. NO rounding, NO conversion. NO multi-currency conversion (currency hardcoded ILS per D-AUTH-6).

- **D-AUTH-10 (no Storefront work; no browser pixel).** Brief D8 reaffirmed: server-side CAPI only. Storefront thank-you page does NOT need a `Purchase` pixel call in v1. Out of scope (§7).

### Findings at SPEC Author Time (FINDINGS-AT-AUTHOR)

| # | Finding | Severity | Disposition |
|---|---|---|---|
| F-A1 | Currency hardcoded to 'ILS' per D-AUTH-6 — known Hebrew-locale debt class (Sentinel M-NEW-39-5). Future tenant in non-ILS country requires the `M4_M1_5_TENANT_LOCALE_PROPAGATION` SPEC to land first. | INFO | Tracked in OPEN_TASKS at closure; NOT a blocker for v1 (Prizma's currency IS ILS). |
| F-A2 | Knowledge-map file `roles/site-overseer/knowledge-build/funnel-q3/M4_PIXEL_VALIDATION_GAP_QUERY.md` still missing (inherited from `M4_PIXEL_VALIDATION_GAP_DASHBOARD` SPEC F-2). Brief's §4.8 includes it as a "modified file" — but you can't modify a file that doesn't exist. | INFO | SPEC §8 Expected Final State drops the row for this file. If a future session authors the knowledge-map, multi-event-type queries will be added then. |
| F-A3 | The 84 Prizma rows with `purchase_amount > 0` already exist but no `Purchase` event will be dispatched for them (D7 forward-only). Strategic implication: Meta gets the next month's purchases, not prior. | INFO | Daniel approved this in the escalation resolution. Tracked transparently. |

---

## 1. Goal

Extend Facebook CAPI from Lead-only (P2.1) to the full conversion funnel by enqueueing 3 new Meta event types triggered by DB-level changes to `crm_event_attendees`:

1. **`CompleteRegistration`** on attendee row INSERT (once per lead across events).
2. **`EventAttended`** when attendee `status` transitions to `'attended'`.
3. **`Purchase`** when attendee `purchase_amount` transitions from NULL/0 to > 0 (per Daniel's Option B decision), with `custom_data.value` + `custom_data.currency='ILS'` included.

After this lands, Meta's algorithm has the full funnel — Lead → CompleteRegistration → EventAttended → Purchase — and optimizes on revenue, not just clicks. ROAS measurement becomes the legitimate KPI.

---

## 2. Background & Motivation

P2.1 closed 2026-05-15; Lead events flow to Meta via the `crm_capi_dispatch_queue` + `fb-capi-dispatch` EF + `fb_capi_dispatch_consumer` cron. P2.2 closed 2026-05-19 — the pixel-gap dashboard now surfaces the Lead chain's health. The substrate is stable: 27/30 leads `status='sent'` on Prizma production at last check.

This SPEC delivers what Daniel asked for on 2026-05-13: *"Sending purchases is important."* Without Purchase events, Meta's algorithm optimizes on lead clicks rather than revenue. With Purchase events, ROAS becomes meaningful and Meta's audience-finding pivots from "find leads like our leads" to "find buyers like our buyers."

The 4-day Lead stability bar (Brief author's original gating heuristic, 2026-05-15) has effectively passed: substrate is verified working, demo and Prizma have run the dispatch path end-to-end, the dashboard exists. **Daniel approved fast-tracking** per the Brief.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|----------------|----------------|
| 1 | Branch state | On `develop`, working tree scope-clean at SPEC close (pre-existing dirty paths from prior sessions unchanged) | `git status --short` shows only pre-existing-from-prior-sessions paths |
| 2 | Commits produced | 4 commits in this SPEC's range: C1 (SPEC.md seal + Brief + Activation Prompt) + C2 (migration via MCP `apply_migration` + saved .sql) + C3 (EF update + deploy + docs + optional JS) + C4 (retrospective trio). ±1 acceptable. | `git log {SPEC_SEAL_COMMIT}..HEAD --oneline \| wc -l` → 3–5 |
| 3a | New migration file in `supabase/migrations/` | exists | `ls supabase/migrations/*m4_capi_purchase_events*.sql` → 1 file |
| 3b | Migration applied to DB (via MCP `apply_migration`) | Returns success | MCP probe — new objects exist (see 4–9 below) |
| 4 | Old unique constraint dropped | `crm_capi_dispatch_queue_tenant_lead_unique` not present | `SELECT count(*) FROM pg_constraint WHERE conname='crm_capi_dispatch_queue_tenant_lead_unique'` → 0 |
| 5 | New unique constraint present | `(tenant_id, lead_id, event_name)` with name `crm_capi_dispatch_queue_tenant_lead_event_unique` | `SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='crm_capi_dispatch_queue_tenant_lead_event_unique'` → `UNIQUE (tenant_id, lead_id, event_name)` |
| 6a | Trigger function 1: `capi_enqueue_complete_registration_fn` | exists, SECURITY DEFINER | `SELECT count(*) FROM pg_proc WHERE proname='capi_enqueue_complete_registration_fn'` → 1 |
| 6b | Trigger function 2: `capi_enqueue_event_attended_fn` | exists, SECURITY DEFINER | same shape |
| 6c | Trigger function 3: `capi_enqueue_purchase_fn` | exists, SECURITY DEFINER | same shape |
| 7a | Trigger: `trg_capi_attendee_registered` | AFTER INSERT on crm_event_attendees | `SELECT count(*) FROM pg_trigger WHERE tgname='trg_capi_attendee_registered'` → 1 |
| 7b | Trigger: `trg_capi_attendee_attended` | AFTER UPDATE OF status on crm_event_attendees | `SELECT count(*) FROM pg_trigger WHERE tgname='trg_capi_attendee_attended'` → 1 |
| 7c | Trigger: `trg_capi_attendee_purchased` | AFTER UPDATE OF purchase_amount on crm_event_attendees | `SELECT count(*) FROM pg_trigger WHERE tgname='trg_capi_attendee_purchased'` → 1 |
| 8 | NO new column on `crm_capi_dispatch_queue` | column count unchanged (13) | `SELECT count(*) FROM information_schema.columns WHERE table_name='crm_capi_dispatch_queue'` → 13 |
| 9 | EF `fb-capi-dispatch` deployed with new branching | EF version increments; source branches on event_name | `mcp__claude_ai_Supabase__list_edge_functions` shows newer version + grep "CompleteRegistration\|EventAttended\|Purchase" in deployed source |
| 10 | EF includes `custom_data.value` + `custom_data.currency='ILS'` for Purchase events | code path exists | grep "custom_data" in source after edit |
| 11 | EF fetches `purchase_amount` at dispatch time via tenant-scoped query | Iron Rule 22 honored | grep `.eq('tenant_id', tenantId)` in the new Purchase branch |
| 12 | `docs/FB_CAPI.md` §13 Event Type Coverage appended | section exists, ≤ 30 lines | `grep -c "## 13. Event Type Coverage" docs/FB_CAPI.md` → 1 |
| 13 | `docs/FB_CAPI.md` ≤ 320 lines | ≤ 320 | `wc -l docs/FB_CAPI.md` → ≤ 320 |
| 14 | Demo E2E test 1 — CompleteRegistration | INSERT attendee → queue row `event_name='CompleteRegistration', status='sent'` (or 'skipped_no_token' on demo per D-AUTH-3 of P2.1; both PASS for this criterion) | LH-Tester probes `crm_capi_dispatch_queue` after manual INSERT |
| 15 | Demo E2E test 2 — EventAttended | UPDATE status='attended' → queue row `event_name='EventAttended', status='sent'` (or 'skipped_no_token') | same |
| 16 | Demo E2E test 3 — Purchase | UPDATE purchase_amount=500.00 → queue row `event_name='Purchase'` with `event_payload->>'value'='500.00'` and `event_payload->>'currency'='ILS'`, status='sent' (or 'skipped_no_token') | same |
| 17 | Demo E2E test 4 — Idempotency | Re-execute UPDATE status='attended' (no-op) → NO new queue row | row count for `(lead_id, 'EventAttended')` remains 1 |
| 18 | Demo E2E test 5 — Refund direction | UPDATE purchase_amount=500 → 0 → NO new queue row | row count for `(lead_id, 'Purchase')` remains 1 |
| 19 | Demo E2E test 6 — Typo correction | UPDATE purchase_amount=500 → 480 → NO new queue row (does not trigger; OLD already > 0) | same |
| 20 | Iron Rule 31 integrity gate passes at every commit | exit 0 (or 2 warn-only) | pre-commit hook |
| 21 | Iron Rule 32 destructive-ops gate passes | declared 1 op (constraint replacement); hook reads `## Destructive Operations` section | pre-commit hook + visual confirmation in §11 |
| 22 | Iron Rule 18 — new constraint tenant-scoped | YES (tenant_id is first column of new constraint) | constraint definition includes `tenant_id` |
| 23 | Iron Rule 21 — no duplicate column | `event_type` not added; `event_name` reused | column count unchanged + new event_name VALUES in production |
| 24 | Iron Rule 22 — defense-in-depth in EF | all new `.from(...)` calls chain `.eq('tenant_id', ...)` | grep |
| 25 | Iron Rule 35 — no new placeholder / action_type / trigger_type | 0 new entries | Reviewer SQL probe (same shape as `M4_PIXEL_VALIDATION_GAP_DASHBOARD` §3 criterion 21) |
| 26 | Brief §4 Cross-Module Safety Audit | Reviewer confirms no §4.2 / §4.4 / §4.6 surface touched | `git diff` against the enumeration |
| 27 | Smoke 7/7 PASS post-state | 7 passing | `node tests/smoke/baseline.test.mjs` |
| 28 | Existing 33 queue rows preserved | unchanged | `SELECT count(*) FROM crm_capi_dispatch_queue` → 33 |
| 29 | NO backfill (D7) — 84 Prizma rows with `purchase_amount > 0` NOT enqueued | unchanged | `SELECT count(*) FROM crm_capi_dispatch_queue WHERE event_name='Purchase'` → 0 (will become ≥ 1 only when LH-Tester does demo E2E) |
| 30 | If LH-Tester chooses to extend `crm-pixel-gap-tile.js` → Iron Rule 34 triplet | screenshot + runtime trace + DB-query evidence in TEST_REPORT | DEFERRED to LH-Tester; OPTIONAL per D-AUTH-7 |

### 3.5 Verbatim Trigger Function + EF Branch Semantics

The Executor implements these 3 trigger functions VERBATIM (Foreman-authored, not Executor-derived). Same shape for each — body differs by event_name + WHEN clause.

#### Function 1 — `capi_enqueue_complete_registration_fn()`

```sql
CREATE OR REPLACE FUNCTION public.capi_enqueue_complete_registration_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Forward-only; INSERT trigger context implies a fresh attendee row.
  INSERT INTO public.crm_capi_dispatch_queue (
    tenant_id, lead_id, event_id, event_name, status
  ) VALUES (
    NEW.tenant_id,
    NEW.lead_id,
    public.uuid_generate_v5(public.uuid_ns_oid(), NEW.lead_id::text || ':' || 'CompleteRegistration'),
    'CompleteRegistration',
    'queued'
  )
  ON CONFLICT (tenant_id, lead_id, event_name) DO NOTHING;
  RETURN NEW;
END $$;
```

#### Function 2 — `capi_enqueue_event_attended_fn()`

```sql
CREATE OR REPLACE FUNCTION public.capi_enqueue_event_attended_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire on a real transition INTO 'attended'.
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'attended' THEN
    INSERT INTO public.crm_capi_dispatch_queue (
      tenant_id, lead_id, event_id, event_name, status
    ) VALUES (
      NEW.tenant_id,
      NEW.lead_id,
      public.uuid_generate_v5(public.uuid_ns_oid(), NEW.lead_id::text || ':' || 'EventAttended'),
      'EventAttended',
      'queued'
    )
    ON CONFLICT (tenant_id, lead_id, event_name) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
```

#### Function 3 — `capi_enqueue_purchase_fn()`

```sql
CREATE OR REPLACE FUNCTION public.capi_enqueue_purchase_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Daniel-decision (Option B, 2026-05-19): fire only on purchase_amount transition NULL/0 → >0.
  -- Refund-direction (anything → 0): out of scope. Typo correction (>0 → other >0): out of scope.
  IF (OLD.purchase_amount IS NULL OR OLD.purchase_amount = 0)
     AND NEW.purchase_amount IS NOT NULL
     AND NEW.purchase_amount > 0 THEN
    INSERT INTO public.crm_capi_dispatch_queue (
      tenant_id, lead_id, event_id, event_name, status
    ) VALUES (
      NEW.tenant_id,
      NEW.lead_id,
      public.uuid_generate_v5(public.uuid_ns_oid(), NEW.lead_id::text || ':' || 'Purchase'),
      'Purchase',
      'queued'
    )
    ON CONFLICT (tenant_id, lead_id, event_name) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
```

#### Triggers

```sql
CREATE TRIGGER trg_capi_attendee_registered
AFTER INSERT ON public.crm_event_attendees
FOR EACH ROW EXECUTE FUNCTION public.capi_enqueue_complete_registration_fn();

CREATE TRIGGER trg_capi_attendee_attended
AFTER UPDATE OF status ON public.crm_event_attendees
FOR EACH ROW EXECUTE FUNCTION public.capi_enqueue_event_attended_fn();

CREATE TRIGGER trg_capi_attendee_purchased
AFTER UPDATE OF purchase_amount ON public.crm_event_attendees
FOR EACH ROW EXECUTE FUNCTION public.capi_enqueue_purchase_fn();
```

#### Constraint replacement (the 1 declared destructive op — see §11)

```sql
ALTER TABLE public.crm_capi_dispatch_queue
  DROP CONSTRAINT crm_capi_dispatch_queue_tenant_lead_unique;

ALTER TABLE public.crm_capi_dispatch_queue
  ADD CONSTRAINT crm_capi_dispatch_queue_tenant_lead_event_unique
  UNIQUE (tenant_id, lead_id, event_name);
```

#### EF dispatch branching — `processQueueRow` augmentation

The Executor extends the existing `processQueueRow` function in `supabase/functions/fb-capi-dispatch/index.ts`. Semantic changes:

1. After fetching `lead` + `config` + computing `userData` (lines 109–167 existing), branch on `eventName`.
2. For `event_name === 'Purchase'`:
   - Execute a Iron-Rule-22-compliant SELECT:
     ```ts
     const { data: attendee, error: attendeeErr } = await db
       .from("crm_event_attendees")
       .select("purchase_amount")
       .eq("lead_id", leadId)
       .eq("tenant_id", tenantId)
       .gt("purchase_amount", 0)
       .order("created_at", { ascending: false })
       .limit(1)
       .maybeSingle();
     ```
   - If `attendee` is null OR `purchase_amount` not > 0 → `status='permanent_error'`, `error_message='attendee_not_found_or_zero_amount: no matching attendee row'`. Return.
   - Otherwise build CAPI payload with `custom_data: { value: Number(attendee.purchase_amount), currency: 'ILS' }`.
3. For `event_name === 'CompleteRegistration'` or `event_name === 'EventAttended'`:
   - Same payload shape as Lead (em + ph in user_data, no custom_data).
4. For `event_name === 'Lead'`:
   - Unchanged (existing behavior).

CAPI body shape becomes:
```ts
const capiBody = {
  data: [
    {
      event_name: eventName,
      event_time: eventTime,
      action_source: "website",
      event_id: eventId ?? undefined,
      user_data: userData,
      ...(eventName === "Purchase" ? { custom_data: { value: Number(attendee.purchase_amount), currency: "ILS" } } : {}),
    },
  ],
};
```

---

## 4. Autonomy Envelope

### CAN do autonomously

- Read any file in the repo (or sibling storefront repo, though SPEC scope is ERP-only).
- Run Level 1 read-only SQL via Supabase MCP `execute_sql`.
- Run Level 2 SQL ONLY for the declared migration (`apply_migration` MCP call with name `m4_capi_purchase_events`). Single migration, applied once (covers both demo + Prizma — single DB).
- Save the migration's SQL body to `supabase/migrations/{ts}_m4_capi_purchase_events.sql` as a committed artifact.
- Deploy the EF via `mcp__claude_ai_Supabase__deploy_edge_function` first; on first 5xx → `supabase functions deploy fb-capi-dispatch --project-ref tsxrrxzmdxaenlvocyit` CLI fallback per OPEN-021 (harvested from M4_FB_CAPI_HYBRID_DEDUPLICATION lessons).
- Modify exactly these files:
  - `supabase/migrations/{ts}_m4_capi_purchase_events.sql` (NEW)
  - `supabase/functions/fb-capi-dispatch/index.ts` (MODIFIED — line additions in `processQueueRow` + payload assembly; ≤ 80-line net addition; target final ≤ 400 lines)
  - `docs/FB_CAPI.md` (MODIFIED — append §13)
  - OPTIONALLY: `modules/crm/crm-pixel-gap-tile.js` (small extension if Executor wants — ≤ 30-line net addition; per Iron Rule 34 D-AUTH-7, this triggers Chrome MCP triplet at LH-Tester phase)
- Stage by explicit filename only; `git diff --cached --name-only` before every commit.

### MUST STOP

- Need to modify any file outside the 4 declared (+ optional 5th).
- Brief §4.2 / §4.4 / §4.6 — ANY touch on enumerated off-limits tables / EFs / triggers.
- Migration's `DROP CONSTRAINT` would conflict with existing data (would only happen if new queue rows with non-`Lead` event_name were inserted between SPEC seal + migration apply — vanishingly unlikely; if it happens → STOP, escalate).
- Need to add ANY new column on `crm_capi_dispatch_queue` (D-AUTH-2 forbids; reuse `event_name`).
- Need to write code that touches `payment_status` (D-AUTH-1 explicitly excludes).
- Need to backfill the 84 existing Prizma rows (D7 forbids).
- Need to add ANY new placeholder, action_type, or trigger_type slug (Iron Rule 35).
- Iron Rule 31 fails (exit 1).
- Iron Rule 32 hook fires unexpectedly (anything beyond the declared 1 op).
- EF deploys via MCP returns InternalServerErrorException THEN CLI fallback also fails — STOP, escalate (deployment-side issue, not SPEC bug).
- Demo E2E test 14/15/16 doesn't produce the expected queue rows — STOP, escalate (trigger semantics regression).
- Demo E2E test 17/18/19 produces a duplicate queue row — STOP, escalate (idempotency broken).

### Bounded handling of EXPECTED deviations

- **EF deploy first attempt returns InternalServerErrorException** → immediately fallback to `supabase functions deploy ...` from local shell. Document as D-N in EXECUTION_REPORT.
- **uuid-ossp namespace function differs in v1.1 vs v1.2** → both versions have `uuid_ns_oid()` — confirmed in §0.5 baseline. If signature differs at runtime → use the alternative `uuid_generate_v5('6ba7b812-9dad-11d1-80b4-00c04fd430c8'::uuid, ...)` (URL namespace OID literal). Document as D-N.
- **Existing rows with event_name != 'Lead' between SPEC seal + migration apply** → SHOULD NOT happen (no other event types are written by anything else), but if probe at C2 time finds them → STOP and escalate (something else is writing to the queue we don't know about).
- **Demo doesn't have `crm_event_attendees` rows for testing** → INSERT 1 test attendee with a known test lead_id (use one of Daniel's allowlist test phones for the lead per memory `feedback_test_data_phones`). Track UUIDs for LH-Tester cleanup.

---

## 5. Stop-Triggers (extended beyond CLAUDE.md §9 + Brief §8)

1. **Brief §4.9 enforcement.** Touch on any §4.2 table, §4.4 EF, or §4.6 trigger → STOP, escalate.
2. **Iron Rule 35.** New placeholder / action_type / trigger_type → STOP.
3. **Cross-tenant write.** Any INSERT/UPDATE/DELETE against Prizma data → STOP (read-only on Prizma; demo writes only for E2E).
4. **Constraint swap rollback.** If `ALTER TABLE ... DROP CONSTRAINT` fails (extremely unlikely but possible if 2 rows with same `(tenant_id, lead_id, 'Lead')` exist — they shouldn't; old constraint was on `(tenant_id, lead_id)`, but defensive) → STOP, manual reconciliation needed.
5. **EF deploy double-failure.** MCP `deploy_edge_function` 5xx + CLI fallback also fails → STOP.
6. **Demo E2E shows wrong event_name in queue row** → STOP, trigger function logic regression.
7. **Demo E2E idempotency fails** (duplicate queue row appears) → STOP, ON CONFLICT clause regression.
8. **Iron Rule 31 / 32 gate fails.**

---

## 6. Pipeline

Standard Full-Auto Pipeline:

1. **Foreman (opticup-strategic, Opus)** authors this `SPEC.md` (DONE — this file).
2. **Executor (opticup-executor, Sonnet — `claude-sonnet-4-5-20250629` or current Sonnet)** implements:
   - Step 1.5 pre-flight (re-confirm baselines from §0.5; safety re-probe `crm_capi_dispatch_queue` event_name distribution to confirm still all `'Lead'`).
   - C1 already committed (this SPEC.md seal) — Executor does NOT re-commit SPEC.md.
   - C2: write migration .sql → apply via MCP `apply_migration` → commit saved file.
   - C3: modify EF source → deploy via MCP → commit source + (optionally) JS tile + docs.
   - C4: write `EXECUTION_REPORT.md` + `FINDINGS.md` → commit.
3. **Reviewer (opticup-reviewer, default model)** validates against §3 + §5 + Brief §4 + Iron Rules 12/14/15/18/21/22/23/31/32/35. Writes `REVIEW.md`. Commit.
4. **Localhost-Tester (opticup-localhost-tester, default model)** runs smoke 7/7 + 6 E2E tests on demo (criteria 14-19) + (IF tile touched) Chrome MCP triplet. Writes `TEST_REPORT.md`. Commit.
5. **Foreman closes (opticup-strategic, Opus)** with `FOREMAN_REVIEW.md` + 4 skill improvement proposals + memory update + Hebrew status line.

---

## 7. Out of Scope

Explicit list. Touching anything here = stop trigger.

- All EFs except `fb-capi-dispatch`.
- Storefront repo (`opticalis/opticup-storefront`).
- Browser pixel for Purchase events (Brief D8).
- Refund / cancellation events (Brief §3).
- Custom event parameters beyond `value` + `currency` (Brief §3).
- Multi-currency support (D-AUTH-6; hardcoded ILS).
- Backfill of historical events (Brief D7).
- Adding column `event_type` (D-AUTH-2 reuse `event_name`).
- Modifying `payment_status` semantics or vocabulary.
- Adding `'purchased'` slug to `crm_statuses`.
- Modifying `trg_attendee_status_change_event` (existing M4 SCE bus — different bus).
- Modifying `fb_capi_dispatch_consumer` cron job (reuses existing schedule).
- Modifying RLS on `crm_capi_dispatch_queue`.
- Any change to `lead-intake`, `pixel-fired`, `automation-engine`, `dispatch-queue`, `send-message`, `submit-lead`, `pin-auth`, `quick-register`.
- Any change to `crm_message_log`, `crm_message_queue`, `crm_message_templates`, `crm_automation_rules`, `crm_automation_runs`, `crm_status_change_events`, `crm_events`, `crm_broadcasts`, `crm_statuses`, `crm_lead_touchpoints` schemas/data (Brief §4.2).
- Modifying `crm-messaging-tab.js` or `crm-messaging-performance.js` (P2.2 territory).

---

## 8. Expected Final State

**Files added/modified:**

| File | Action | Expected size |
|---|---|---|
| `supabase/migrations/{ts}_m4_capi_purchase_events.sql` | NEW | ~80-120 lines (3 functions + 3 triggers + 1 constraint swap + comments) |
| `supabase/functions/fb-capi-dispatch/index.ts` | MODIFIED | 336 → ≤ 400 lines (net ~+50–60 for Purchase branch + attendee fetch + payload assembly) |
| `docs/FB_CAPI.md` | MODIFIED | 289 → ≤ 320 lines |
| `modules/crm/crm-pixel-gap-tile.js` | OPTIONAL — MODIFIED | 98 → ≤ 130 lines (if Executor surfaces per-event-type counts) |
| `modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_PURCHASE_EVENTS/SPEC.md` | NEW (this file) | this file |
| `.../EXECUTION_REPORT.md` | NEW (by Executor) | ~150 lines |
| `.../FINDINGS.md` | NEW (by Executor, even if minimal) | ~30 lines |
| `.../REVIEW.md` | NEW (by Reviewer) | ~100 lines |
| `.../TEST_REPORT.md` | NEW (by Localhost-Tester) | ~100 lines |
| `.../FOREMAN_REVIEW.md` | NEW (by Foreman closure) | ~250 lines |
| `modules/Module 4 - CRM/escalations/2026-05-19T15-15-00Z_...md` | ALREADY EXISTS | audit trail (already written, will be staged in C2 alongside the migration) |

**Memory update at closure:**
- `project_fb_capi_p21_state.md` — promote Purchase events from "out of scope" to "live"; note Meta now receives full funnel (Lead + CompleteRegistration + EventAttended + Purchase).

**DB state:**
- 3 new triggers + 3 new functions + 1 constraint swap on `crm_capi_dispatch_queue`.
- 0 row writes on Prizma (read-only).
- ≤ 1 test attendee row INSERTed on demo during LH-Tester E2E, with cleanup of the test row + its queue child rows at TEST_REPORT close.
- 4 new queue rows on demo after LH-Tester E2E (one per event type) — cleaned up post-test.
- Existing 33 Lead queue rows: untouched.

---

## 9. Rollback Plan

Pure-revert atomic via the pre-SPEC tag `pre-capi-purchase-events-start` (Executor creates at session start per Brief §9).

**If C2 (migration) is bad — rollback the DB changes:**
Apply a reverse migration via `apply_migration` named `m4_capi_purchase_events_rollback`:
```sql
DROP TRIGGER IF EXISTS trg_capi_attendee_purchased ON public.crm_event_attendees;
DROP TRIGGER IF EXISTS trg_capi_attendee_attended ON public.crm_event_attendees;
DROP TRIGGER IF EXISTS trg_capi_attendee_registered ON public.crm_event_attendees;
DROP FUNCTION IF EXISTS public.capi_enqueue_purchase_fn();
DROP FUNCTION IF EXISTS public.capi_enqueue_event_attended_fn();
DROP FUNCTION IF EXISTS public.capi_enqueue_complete_registration_fn();
ALTER TABLE public.crm_capi_dispatch_queue
  DROP CONSTRAINT IF EXISTS crm_capi_dispatch_queue_tenant_lead_event_unique;
ALTER TABLE public.crm_capi_dispatch_queue
  ADD CONSTRAINT crm_capi_dispatch_queue_tenant_lead_unique
  UNIQUE (tenant_id, lead_id);
```

**If C3 (EF) is bad — revert the deploy:**
- `git revert <c3_commit_hash>` (reverts source).
- Redeploy old version via MCP `deploy_edge_function` (the `mcp__claude_ai_Supabase__get_edge_function` MCP can read the prior version from the source tree at the revert commit).

**If C3 docs/JS are bad:**
- `git revert <c3_commit_hash>` covers them in the same atomic revert.

Existing 33 Lead queue rows preserve their state throughout any rollback step.

---

## 10. Commit Plan

- **C1** (already committed by this Foreman session): `chore(spec): seal M4_FB_CAPI_PURCHASE_EVENTS — full funnel CAPI events + Daniel Option B`
  - Files: this `SPEC.md` + the existing Brief + Activation Prompt + the resolved escalation file.
- **C2**: `feat(m4): M4_FB_CAPI_PURCHASE_EVENTS — DB triggers + constraint swap`
  - Files: `supabase/migrations/{ts}_m4_capi_purchase_events.sql`.
  - Applied via MCP `apply_migration` BEFORE commit; on-disk .sql file committed as audit trail.
- **C3**: `feat(m4): M4_FB_CAPI_PURCHASE_EVENTS — EF branches on event_name + docs`
  - Files: `supabase/functions/fb-capi-dispatch/index.ts`, `docs/FB_CAPI.md`, OPTIONALLY `modules/crm/crm-pixel-gap-tile.js`.
  - EF deployed via MCP `deploy_edge_function` (CLI fallback on 5xx) BEFORE commit.
- **C4**: `chore(spec): M4_FB_CAPI_PURCHASE_EVENTS — Executor retrospective`
  - Files: `EXECUTION_REPORT.md` + `FINDINGS.md` in the SPEC folder.

Reviewer + LH-Tester + Foreman closure each add 1 commit at their respective phases. All commits pass pre-commit hooks (Rule 14/15/18/21/22/23/31/32).

---

## 11. Destructive Operations

**Count: 1.**

Per Iron Rule 32 the gate `destructive-ops-declared.mjs` scans the staged migration for destructive patterns. This SPEC's migration contains exactly ONE pattern matching the gate's destructive-op definition:

1. **`ALTER TABLE public.crm_capi_dispatch_queue DROP CONSTRAINT crm_capi_dispatch_queue_tenant_lead_unique;`** — the Rule 21 fix (Daniel-approved) replaces the existing `(tenant_id, lead_id)` unique constraint with a tighter `(tenant_id, lead_id, event_name)`. This is the ONLY destructive op in the SPEC.

Everything else is additive:
- New trigger functions (CREATE OR REPLACE FUNCTION).
- New triggers (CREATE TRIGGER).
- New constraint (ALTER TABLE ... ADD CONSTRAINT).
- Net additions to EF source.
- Net additions to docs.

**Safety analysis for the 1 destructive op:**
- Existing 33 queue rows ALL have `event_name='Lead'` (verified at SPEC-author time §0.5).
- New tighter constraint `(tenant_id, lead_id, event_name)` is satisfiable by all 33 existing rows (since `event_name='Lead'` is fixed across them and `(tenant_id, lead_id)` was already unique pre-SPEC).
- The window between DROP and ADD is sub-millisecond inside a single transaction; no race risk on a single-DB migration.
- Rollback is safe: the SPEC's §9 reverse migration drops the new constraint and recreates the old one with the original name.

If the Executor encounters a need for ANY other destructive op (file deletes, DROP TABLE, DROP COLUMN, DROP POLICY, TRUNCATE, DML mass-delete, CLAUDE.md or SKILL.md section deletion, main-branch modification) → STOP, escalate.

---

## 12. Cross-References

- `modules/Module 4 - CRM/architecture-brief/M4_FB_CAPI_PURCHASE_EVENTS_BRIEF.md` — sealed 2026-05-19.
- `modules/Module 4 - CRM/escalations/2026-05-19T15-15-00Z_M4_FB_CAPI_PURCHASE_EVENTS_STATUS_VOCABULARY.md` — Foreman pre-flight escalation; Daniel resolved with Option B + Rule 21 fix + D7 forward-only. This SPEC's §0.4 + D-AUTH-1/2/3/4 are the resolution baked in.
- `modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_HYBRID_DEDUPLICATION/` — P2.1 substrate (2026-05-15) — RLS pattern + queue shape reference.
- `modules/Module 4 - CRM/docs/specs/M4_PIXEL_VALIDATION_GAP_DASHBOARD/` — P2.2 dashboard (2026-05-19) — recently-applied skill-improvement proposals (P-AUTHOR-1/2 + P-EXEC-1/2) honored in §0.7.
- `docs/FB_CAPI.md` — canonical reference; this SPEC appends §13.
- `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md` — Iron Rule 35 boundary; this SPEC adds 0 placeholders, 0 action_types, 0 trigger_types.
- `roles/site-overseer/FUNNEL_ROADMAP.md` — Phase 2 row for Purchase events; will flip at SPEC closure if a row exists, or get appended.
- Iron Rules 12, 14, 15, 18, 21, 22, 23, 31, 32, 35.
- Meta Conversions API Purchase event spec: https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/custom-data (cited by Brief).
- Memory: `project_fb_capi_p21_state.md` (to be updated at closure to reflect full-funnel coverage).

---

## 13. Author Notes

This SPEC is the highest-value remaining piece of the FUNNEL track. After this lands, Meta's optimization engine has the full conversion data and ROAS becomes a legitimate KPI.

**Why the escalation was the right call:**
The Brief was authored from schema docs without checking actual data. The probe showed two things the schema doesn't:
1. The status vocabulary is fixed at 11 slugs — `'purchased'` is not in it.
2. Prizma operators have never used `payment_status` — they encode "paid" implicitly via `purchase_amount > 0`.

Authoring the SPEC on the Brief's assumption would have shipped DB triggers that NEVER fire on production. Daniel's Option B decision aligns the trigger with actual operator behavior — zero behavior change required, forward-only enqueueing from the next purchase onward.

**Iron Rule 21 fix value:**
The Brief's "add `event_type` column" plan would have created a column that means the same thing as the existing `event_name` (default 'Lead'). Either column would be redundant; the EF code at line 88+173 already reads `event_name`. Catching this at SPEC-author time saved the executor a column-write + a 1.5-hour deprecation-debt cleanup down the road.

**Cross-Module Safety Audit Brief §4 is BINDING.** Reviewer enforces at §6.3. Brief §4.2 / §4.4 / §4.6 explicitly enumerate off-limits surfaces; any leak is a STOP trigger.

---

*End of SPEC.*
