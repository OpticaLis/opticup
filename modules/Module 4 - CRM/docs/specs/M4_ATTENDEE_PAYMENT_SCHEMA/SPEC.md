# SPEC — M4_ATTENDEE_PAYMENT_SCHEMA

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_ATTENDEE_PAYMENT_SCHEMA/SPEC.md`
> **Authored by:** opticup-strategic (Foreman) — Cowork session 2026-04-25
> **Authored on:** 2026-04-25
> **Module:** 4 — CRM
> **Phase:** Payment lifecycle introduction, SPEC 1 of 3 (siblings: `M4_ATTENDEE_PAYMENT_UI`, `M4_ATTENDEE_PAYMENT_AUTOMATION`)
> **Predecessor SPECs (closed):** `CRM_UX_REDESIGN_TEMPLATES` (commit `626c72e`), `CRM_UX_REDESIGN_AUTOMATION` (commit `8c3343f`), `QA_ROUND1_RESULTS + F1 Fix` (commits `600b033`, `2c22eef`)

**Executor TL;DR (1 sentence):** Add a `payment_status` column with 7 values + 4 supporting timestamps + 1 self-reference FK to `crm_event_attendees` (cross-tenant DB-level change), install a one-way sync trigger from new→old (`booking_fee_paid` shadow), backfill demo's 13 existing rows (Prizma has 0 attendees), seed `payment_received` template on BOTH demo + prizma, then carve out the 30-something call sites of `booking_fee_paid` to read/write the new column instead, finally drop the old column at SPEC close.

---

## 1. Goal

Build the database foundation for the payment-lifecycle model Daniel sketched in the strategic conversation:

- 7 payment statuses on each attendee row: `pending_payment`, `paid`, `unpaid`, `refund_requested`, `refunded`, `credit_pending`, `credit_used`.
- 4 supporting timestamps: `paid_at`, `refund_requested_at`, `refunded_at`, `credit_expires_at`.
- 1 self-FK: `credit_used_for_attendee_id` — when a credit moves to a new attendee row, the OLD row points to the NEW one.
- 1 RPC: `transfer_credit_to_new_attendee(old_attendee_id, new_attendee_id)` — atomic credit transfer.
- 1 message template: `payment_received` (SMS + Email, demo only).
- Hybrid migration: keep `booking_fee_paid` shadowing `payment_status='paid'` during the SPEC, then DROP at the end.

The DB schema **changes** here. Existing 4 boolean fields (`booking_fee_paid`, `booking_fee_refunded`) get replaced. The engine (`crm-automation-engine.js`) is **NOT** modified in this SPEC. UI changes are **OUT OF SCOPE** — they live in SPEC #2 (`M4_ATTENDEE_PAYMENT_UI`). Automations are **OUT OF SCOPE** — they live in SPEC #3.

**Cross-tenant scope:** the schema change, sync trigger, RPC, and `payment_received` template are applied to BOTH `demo` AND `prizma` tenants. The CRM is one product across tenants — payment-lifecycle infrastructure ships everywhere. Backfill is demo-only because Prizma currently has 0 attendees (verified 2026-04-25 via SQL).

---

## 2. Background & Motivation

### 2.1 The model Daniel approved (4 strategic questions)

| Q | Decision |
|---|---|
| Q1 — Is deposit required for every event? | **Yes, by default**. Manual override available later if needed. |
| Q2 — How is payment collected? | **External payment link** in registration confirmation message + manual marking by staff. Future: integrate Stripe/Tranzila. |
| Q3 — Refund mechanism? | **Two-step gate**: (1) staff marks `refund_requested` (auto-suggested for >48h cancellations, manager-only for <48h or no-show); (2) staff marks `refunded` OR `credit_pending` after the actual transfer/promise. **Cannot mark `refunded`/`credit_used` without `refund_requested` first**. |
| Q4 — Credit lifecycle? | **6-month window**. Auto-transfers when lead registers for new event. **30-day expiry warning notification** in app. |

### 2.2 Two automations approved (NOT in this SPEC, listed for context)

- **"Event completed" trigger:** any attendee in `pending_payment` who didn't check in → auto-flip to `unpaid`. SPEC #3.
- **"Lead registers for new event" trigger:** if lead has open `credit_pending`, auto-mark new attendee `paid` + flip old to `credit_used`. SPEC #3.

### 2.3 Cross-tenant attendee state (verified 2026-04-25 via SQL)

| Tenant | Attendees | Paid | Refunded |
|---|---:|---:|---:|
| demo | 13 | 1 | 0 |
| prizma | 0 | 0 | 0 |
| 3 test-stores | 0 | 0 | 0 |

The schema change is cross-tenant (DB-level). The backfill only touches demo's 13 rows. The 2 templates (`payment_received_sms_he`, `payment_received_email_he`) are seeded on demo + prizma (4 rows total). Test-stores get the schema for free but no backfill or template seeding.

### 2.4 Existing schema (verified 2026-04-25 via SQL)

`crm_event_attendees` already has 4 fields touching payment:

| Field | Type | Default | Used For |
|---|---|---|---|
| `booking_fee_paid` | bool | false | Today's "did they pay deposit?" flag |
| `booking_fee_refunded` | bool | false | Today's "did we refund them?" flag |
| `purchase_amount` | numeric | null | Purchase value at event day (different concern) |
| `cancelled_at` | timestamptz | null | When they cancelled |

`booking_fee_paid` and `booking_fee_refunded` are too coarse for the new model. They get replaced. `purchase_amount` and `cancelled_at` stay — they're orthogonal.

Demo state at SPEC authoring time: **13 attendees total, 1 with `booking_fee_paid=true`, 0 refunded.** Backfill is small.

### 2.5 The hybrid migration approach (Daniel's decision)

Daniel chose **hybrid over pure-replace** to balance two concerns:
- **Risk reduction:** during the SPEC, code that reads `booking_fee_paid` keeps working. No silent breakage.
- **No tech debt:** at the end of the SPEC, the old field is GONE. No "shadow fields we don't use anymore" left in the schema.

This SPEC commits to the full migration **inside one SPEC**, including the final DROP. We do not split this across multiple SPECs because that would leave the codebase in a "shadow shadowing shadow" state.

### 2.6 Why this is SPEC #1 of 3

Schema first, always. UI and automation depend on the schema being stable. If we discover during UI work that we need a 5th timestamp or a different status name, we'd have to come back to schema. Better to lock the data model now.

---

## 3. Success Criteria (Measurable)

Every criterion has an exact expected value. Executor reports each value in `EXECUTION_REPORT.md §2`.

### 3.1 Migration & schema state

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop`, clean | `git status` → "nothing to commit, working tree clean" |
| 2 | Commits produced | exactly 6 | `git log origin/develop..HEAD --oneline \| wc -l` → 6 |
| 3 | Migrations folder has 4 new SQL files | 4 files | `ls modules/Module\ 4\ -\ CRM/migrations/2026_04_25_payment_*.sql \| wc -l` → 4 |
| 4 | New column `payment_status` exists | type text, NOT NULL, default `'pending_payment'` | `\d crm_event_attendees` |
| 5 | New column `paid_at` exists | timestamptz, nullable | same |
| 6 | New column `refund_requested_at` exists | timestamptz, nullable | same |
| 7 | New column `refunded_at` exists | timestamptz, nullable | same |
| 8 | New column `credit_expires_at` exists | timestamptz, nullable | same |
| 9 | New column `credit_used_for_attendee_id` exists | uuid, nullable, FK to crm_event_attendees(id) | same |
| 10 | CHECK constraint on payment_status values | constraint allows only 7 listed values | `\d+ crm_event_attendees` |
| 11 | Sync trigger installed | trigger `sync_booking_fee_paid_from_status` exists on table | `pg_trigger` query |
| 12 | RPC `transfer_credit_to_new_attendee(uuid, uuid)` exists | function returns void, language plpgsql | `\df transfer_credit_to_new_attendee` |
| 13 | RLS policies preserved | 2 policies remain (`service_bypass`, `tenant_isolation`) | `pg_policies` query |
| 14 | Backfill: existing 13 demo rows have payment_status set | all 13 have non-null status; 1 has `paid`, 12 have `pending_payment` | SQL count |
| 14b | Prizma rows untouched (0 to begin with, 0 after) | 0 rows in `crm_event_attendees` for prizma both pre and post | SQL count |
| 15 | Old field `booking_fee_paid` does NOT exist at SPEC close | column dropped | `\d crm_event_attendees` |
| 16 | Old field `booking_fee_refunded` does NOT exist at SPEC close | column dropped | `\d crm_event_attendees` |

### 3.2 Code state (carve-out)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 17 | All references to `booking_fee_paid` in JS removed | 0 hits | `grep -rn "booking_fee_paid" modules/ js/ \| grep -v "/specs/" \| grep -v "/docs/" \| wc -l` → 0 |
| 18 | All references to `booking_fee_refunded` in JS removed | 0 hits | same pattern |
| 19 | All references in EFs (`supabase/functions/`) removed | 0 hits | `grep -rn "booking_fee_paid\|booking_fee_refunded" supabase/ \| wc -l` → 0 |
| 20 | All references in DB views removed | 0 hits in `v_crm_*` view definitions | SQL: `SELECT count(*) FROM pg_views WHERE schemaname='public' AND definition ILIKE '%booking_fee_paid%';` → 0 |
| 21 | New `payment_status` is referenced in carved-out code | ≥10 hits | `grep -rn "payment_status" modules/ js/ supabase/ \| grep -v "/specs/" \| grep -v "/docs/" \| wc -l` → ≥10 |

### 3.3 Template seed

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 22 | Template `payment_received_sms_he` exists on BOTH demo + prizma | 2 rows total, is_active=true | SQL count grouped by tenant |
| 23 | Template `payment_received_email_he` exists on BOTH demo + prizma | 2 rows total, is_active=true | SQL count grouped by tenant |
| 24 | Templates are NOT created on test-store tenants | 0 rows for test-store-qa/-v2/-verify | SQL count |

### 3.4 Pre-existing functionality preserved

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 25 | All 13 demo attendees still readable via app | UI loads attendees tab without error | Smoke test in browser (executor) |
| 26 | The 1 paid attendee still shows as paid in any UI that displays payment state | visual confirmation | Smoke test |
| 27 | Engine (`crm-automation-engine.js`) untouched | no commits in this SPEC's range | git verify |
| 28 | No new global JS function introduced (Rule 21) | 0 new globals added in this SPEC (only DB + carve-out edits) | grep before/after diff |

### 3.5 Tooling & docs

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 29 | Integrity gate (Rule 31) | exit 0 (clean) at every commit | `npm run verify:integrity; echo $?` → `0` |
| 30 | Pre-commit hooks pass on each commit | all pass without `--no-verify` | git commit succeeds |
| 31 | All CRM JS files ≤350 lines (Rule 12) | 0 violations | `find modules/crm -name '*.js' -exec wc -l {} + \| awk '$1>350'` |
| 32 | New entry in MODULE_MAP | 1 new section "Payment lifecycle (DB)" | grep MODULE_MAP.md |
| 33 | SESSION_CONTEXT updated | new Phase History row | grep SESSION_CONTEXT.md |
| 34 | CHANGELOG updated | new section at top | grep CHANGELOG.md |
| 35 | EXECUTION_REPORT.md present | exit 0 | `test -f .../M4_ATTENDEE_PAYMENT_SCHEMA/EXECUTION_REPORT.md` |
| 36 | FINDINGS.md present (or absent with reasoning) | inspect | inspect |
| 37 | Push to origin | exit 0, HEAD synced | `git status -uno` |

---

## 4. Autonomy Envelope

### 4.1 What the executor CAN do without asking

- Read any file in the repo (Level 1).
- Run read-only SQL on demo tenant to verify state (Level 1).
- Run **DDL on demo tenant only**: `ALTER TABLE crm_event_attendees ADD COLUMN ...`, `CREATE TRIGGER ...`, `CREATE FUNCTION ...`, `CREATE INDEX ...`. **Level 3 SQL allowed for this SPEC because the DDL is the SPEC.** All DDL goes through `apply_migration` MCP, never raw `execute_sql`.
- Run the migrations on demo via Supabase MCP `apply_migration`. Each migration file is one logical change.
- Backfill existing demo rows via UPDATE (Level 2 write, bounded scope: only rows in `crm_event_attendees` for demo tenant, only the new columns being initialized).
- INSERT 2 template rows (`payment_received_sms_he` + `payment_received_email_he`) on demo only via Level 2.
- Edit any JS file under `modules/`, `js/`, `supabase/functions/` to carve out `booking_fee_paid` references (within bounds of §8).
- Commit and push to `develop` per the §9 commit plan.
- Decide internal helper-function names, internal class constants, internal state shape — anything not externally visible.
- Decide migration filename suffixes (e.g. `_phase1_add_columns`, `_phase2_backfill`, etc.) as long as they sort lexically by execution order.

### 4.2 What REQUIRES stopping and reporting

- **Any DDL outside the migration files in §8.1.** The 4 migration files are exhaustive. If the executor concludes another DDL is needed → STOP. (DDL itself is allowed via `apply_migration` — it's cross-tenant by nature, this is correct for §1.1 scope.)
- **Any change to `crm-automation-engine.js`.** Engine is the contract for `lead-intake` EF, `event-register` EF, Module 1's `createManualLead`. Modifying it breaks dispatch. STOP.
- **Any UI behavioral change.** This SPEC is schema + carve-out only. If the executor finds themselves writing new UI logic (button, modal, status display), that's SPEC #2 territory — STOP.
- **Any automation (rule) change.** Don't add or modify any row in `crm_automation_rules`. Don't touch `crm-messaging-rules.js` or `crm-rule-editor.js`. STOP.
- **Any change to `purchase_amount` or `cancelled_at` columns.** They're orthogonal to payment status. Leave alone.
- **Pre-commit hook failure** that you cannot diagnose in one read.
- **Integrity gate (Iron Rule 31) failure.** STOP.
- **Any unfamiliar file appearing in `git status`** that wasn't created by you.
- **Carve-out grep finds a reference in a file you don't recognize** (e.g., a 3rd-party dependency, an old archived script). STOP, report, get guidance before editing.
- **Backfill UPDATE touches any tenant other than demo.** Backfill MUST have `tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'` in the WHERE clause. STOP if you find yourself updating prizma or test-store rows. (Schema DDL is cross-tenant by definition — that's correct. Backfill is demo-only because Prizma has 0 rows.)
- **Template INSERTs touch any tenant other than demo + prizma.** The 4 template rows go to demo + prizma only. STOP if you find yourself inserting to test-store tenants.
- **More than 6 commits, OR fewer than 6 commits.** §9 commit plan is exact.

### 4.3 SQL autonomy (elevated for this SPEC only)

- **Level 1 (read-only):** unrestricted on demo and prizma (read both is fine).
- **Level 2 (writes on demo only):** allowed for backfill of new columns + 2 template INSERTs.
- **Level 3 (DDL):** **ALLOWED on demo only**, exclusively via `apply_migration` MCP. Each DDL operation is one migration file. Never execute DDL via raw `execute_sql` — the audit trail and rollback rely on migrations.

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

Beyond the global stop triggers, this SPEC adds:

1. **Backfill UPDATE returns row count ≠ 13.** Demo has exactly 13 attendees. If `UPDATE ... SET payment_status = ...` affects more or fewer, the WHERE clause is wrong. STOP.
2. **`payment_status` CHECK constraint accepts a value outside the 7-value list.** Test with a deliberately-bad value before committing the constraint. STOP if it accepts.
3. **Sync trigger writes to `payment_status` from `booking_fee_paid` change.** The trigger is **one-way only**: new → old, never old → new. If the executor implements bidirectional sync, that's a logic loop. STOP.
4. **The 1 paid attendee on demo loses its paid state during backfill.** Before backfill, snapshot the paid attendee's id. After, verify `payment_status='paid'` AND `paid_at IS NOT NULL`. If either drifts → STOP.
5. **Any RLS policy added/modified.** The 2 existing policies (`service_bypass`, `tenant_isolation`) stay. New columns inherit existing RLS. If the executor adds a new policy → STOP, that's scope creep.
6. **`grep` for `booking_fee_paid` finds the field in a file the executor cannot identify the function of** (e.g., a script in `archive/`, a vendored library). STOP, report.
7. **`payment_received` template body contains hardcoded tenant info** (e.g., "אופטיקה פריזמה"). Per Iron Rule 9 (no hardcoded business values), templates use `%tenant_name%` or read from config. STOP if the executor writes the literal name.
8. **Any column DROP fails with a "depended on by view/RPC/policy" error.** The carve-out (Phase 2) must remove all references BEFORE the DROP. If DROP fails → STOP, the carve-out missed something.

---

## 6. Rollback Plan

Each migration file is reversible. If something fails partway through:

```sql
-- Rollback Phase 1 (drop new columns):
ALTER TABLE crm_event_attendees
  DROP COLUMN IF EXISTS payment_status,
  DROP COLUMN IF EXISTS paid_at,
  DROP COLUMN IF EXISTS refund_requested_at,
  DROP COLUMN IF EXISTS refunded_at,
  DROP COLUMN IF EXISTS credit_expires_at,
  DROP COLUMN IF EXISTS credit_used_for_attendee_id;

DROP TRIGGER IF EXISTS sync_booking_fee_paid_from_status ON crm_event_attendees;
DROP FUNCTION IF EXISTS sync_booking_fee_paid_from_status();
DROP FUNCTION IF EXISTS transfer_credit_to_new_attendee(uuid, uuid);

-- Rollback Phase 4 (re-add old columns if dropped prematurely):
ALTER TABLE crm_event_attendees
  ADD COLUMN booking_fee_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN booking_fee_refunded boolean NOT NULL DEFAULT false;
-- Then backfill from payment_status...
```

For code rollback: `git reset --hard <SPEC start commit>` + `git push --force-with-lease origin develop` (with Daniel's explicit go-ahead).

For template rollback:
```sql
DELETE FROM crm_message_templates
 WHERE slug LIKE 'payment_received_%' AND tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb';
```
(Hard delete authorized for QA artifacts in rollback scenario only.)

Force-pushing to `develop` requires Daniel's explicit authorization.

---

## 7. Out of Scope (explicit)

- **UI changes** — buttons, modals, attendee detail panels, status pills. SPEC #2.
- **Automations** — "event completed → unpaid", credit-transfer-on-registration. SPEC #3.
- **Notifications** — 30-day credit expiry alert. SPEC #2 or #3.
- **Manager-approval gate for refunds <48h** — UI feature, SPEC #2.
- **Payment integration** — Stripe/Tranzila/external API. Future SPEC, not on the roadmap yet.
- **Multi-currency / multi-tenant pricing** — when a 3rd tenant in another country joins. Future SPEC.
- **`purchase_amount` semantics** — orthogonal to payment status, not touched.
- **`cancelled_at` semantics** — same.
- **Prizma migration** — Daniel will activate the model on Prizma after the full module is done.
- **Audit log of payment status changes** — useful but not in MVP. The system has `crm_activity_log` for general logs; payment-specific history is a SPEC #2 nice-to-have or a follow-up.

### Forward-flags for future SPECs

- **SPEC #2 will need a UI for refund approval gate <48h** — manager role required. Currently, role-based access in CRM is informal (anyone with PIN can do anything). May need a new `role` column on `employees` or a config flag.
- **SPEC #2 will need a notification mechanism for 30-day credit expiry** — there's no existing notification infrastructure in CRM. Either build a simple "alert badge" UI, or wire through `crm_message_log` as a system message.
- **Post-Prizma cutover:** `payment_received` template must be seeded on Prizma. Add to the cutover checklist.
- **Credit transfer atomicity:** the RPC in this SPEC handles single-attendee → single-attendee. If a future model allows partial credits (e.g., split a credit across 2 events), the RPC needs redesign.

---

## 8. Expected Final State

### 8.1 New migration files (4)

Location: `modules/Module 4 - CRM/migrations/`

#### `2026_04_25_payment_01_add_columns.sql`
```sql
-- Add 6 new columns + CHECK constraint + FK to self
ALTER TABLE crm_event_attendees
  ADD COLUMN payment_status text NOT NULL DEFAULT 'pending_payment',
  ADD COLUMN paid_at timestamptz,
  ADD COLUMN refund_requested_at timestamptz,
  ADD COLUMN refunded_at timestamptz,
  ADD COLUMN credit_expires_at timestamptz,
  ADD COLUMN credit_used_for_attendee_id uuid REFERENCES crm_event_attendees(id);

ALTER TABLE crm_event_attendees
  ADD CONSTRAINT crm_event_attendees_payment_status_check
    CHECK (payment_status IN (
      'pending_payment', 'paid', 'unpaid',
      'refund_requested', 'refunded',
      'credit_pending', 'credit_used'
    ));

CREATE INDEX idx_crm_attendees_payment_status
  ON crm_event_attendees(tenant_id, payment_status)
  WHERE is_deleted = false;

CREATE INDEX idx_crm_attendees_credit_pending
  ON crm_event_attendees(tenant_id, credit_expires_at)
  WHERE payment_status = 'credit_pending' AND is_deleted = false;
```

#### `2026_04_25_payment_02_sync_trigger.sql`
```sql
-- One-way sync: payment_status='paid' → booking_fee_paid=true
-- This trigger exists ONLY during the SPEC; dropped at end.
CREATE OR REPLACE FUNCTION sync_booking_fee_paid_from_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.payment_status = 'paid' THEN
    NEW.booking_fee_paid := true;
  ELSIF OLD.payment_status = 'paid' AND NEW.payment_status != 'paid' THEN
    NEW.booking_fee_paid := false;
  END IF;
  IF NEW.payment_status = 'refunded' THEN
    NEW.booking_fee_refunded := true;
  ELSIF OLD.payment_status = 'refunded' AND NEW.payment_status != 'refunded' THEN
    NEW.booking_fee_refunded := false;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_booking_fee_paid_from_status
  BEFORE INSERT OR UPDATE OF payment_status ON crm_event_attendees
  FOR EACH ROW EXECUTE FUNCTION sync_booking_fee_paid_from_status();
```

#### `2026_04_25_payment_03_backfill_demo.sql`
```sql
-- Backfill existing demo rows: paid → 'paid', everything else → 'pending_payment' (default already)
UPDATE crm_event_attendees
   SET payment_status = 'paid',
       paid_at = COALESCE(confirmed_at, registered_at, now())
 WHERE booking_fee_paid = true
   AND tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';

-- Refunded backfill (none on demo today, but safe to include)
UPDATE crm_event_attendees
   SET payment_status = 'refunded',
       refunded_at = COALESCE(cancelled_at, now()),
       refund_requested_at = COALESCE(cancelled_at, now())
 WHERE booking_fee_refunded = true
   AND tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
```

#### `2026_04_25_payment_04_credit_transfer_rpc.sql`
```sql
-- Atomic credit transfer: old attendee's credit_pending → new attendee's paid
CREATE OR REPLACE FUNCTION transfer_credit_to_new_attendee(
  p_old_attendee_id uuid,
  p_new_attendee_id uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tenant uuid;
  v_old_status text;
  v_new_status text;
BEGIN
  SELECT tenant_id, payment_status INTO v_tenant, v_old_status
    FROM crm_event_attendees WHERE id = p_old_attendee_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'old attendee not found'; END IF;
  IF v_old_status != 'credit_pending' THEN
    RAISE EXCEPTION 'old attendee % is not in credit_pending (status=%)', p_old_attendee_id, v_old_status;
  END IF;

  SELECT payment_status INTO v_new_status
    FROM crm_event_attendees
   WHERE id = p_new_attendee_id AND tenant_id = v_tenant FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'new attendee not found or wrong tenant'; END IF;
  IF v_new_status != 'pending_payment' THEN
    RAISE EXCEPTION 'new attendee % is not in pending_payment (status=%)', p_new_attendee_id, v_new_status;
  END IF;

  -- Atomic flip: old → credit_used (with FK pointing to new), new → paid
  UPDATE crm_event_attendees
     SET payment_status = 'credit_used',
         credit_used_for_attendee_id = p_new_attendee_id
   WHERE id = p_old_attendee_id;

  UPDATE crm_event_attendees
     SET payment_status = 'paid',
         paid_at = now()
   WHERE id = p_new_attendee_id;
END;
$$;

GRANT EXECUTE ON FUNCTION transfer_credit_to_new_attendee(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_credit_to_new_attendee(uuid, uuid) TO service_role;
```

### 8.2 New template seed (commit 4) — BOTH demo + prizma

Four rows inserted total: 2 templates × 2 tenants.

- `payment_received_sms_he` — SMS body, ~100-150 chars, includes `%name%`, `%event_name%`, `%event_date%`. Subject NULL.
- `payment_received_email_he` — Email body, ~3K-5K chars, RTL HTML, same variables + tenant branding (NOT hardcoded — `%tenant_name%` substitution OR pulled from tenant_config).

Insert format follows the template-editor's contract: each row gets `tenant_id`, `slug`, `channel`, `language='he'`, `name`, `body`, `subject` (Email only), `is_active=true`. Same body content for both tenants — branding variables resolve at send-time per tenant.

Insert path: SQL INSERT with explicit tenant_id parameterization (the template editor UI doesn't support cross-tenant create in one flow). Executor uses 1 SQL block with 4 INSERTs.

### 8.3 Code carve-out (commit 5)

Find every reference to `booking_fee_paid` and `booking_fee_refunded` in:
- `modules/crm/*.js` (likely sites: crm-event-day-checkin, crm-events-detail, crm-event-day-schedule, crm-event-edit)
- `js/shared.js`, `js/auth-service.js` (unlikely but check)
- `supabase/functions/*/index.ts` (event-register, send-message, retry-failed)
- `pg_views` definitions (`v_crm_event_attendees_full`, `v_crm_event_dashboard`, `v_crm_event_stats`, `v_crm_lead_event_history`)

For each reference:
- **Read** → replace with `payment_status = 'paid'` or `payment_status = 'refunded'` (the equivalent boolean check).
- **Write** → replace with `payment_status = 'paid'` (or appropriate status). The sync trigger handles the shadow.
- **View column** → re-create the view with `payment_status = 'paid' AS booking_fee_paid` (preserves backward-compat for view consumers) OR rename in consumers.

The executor has discretion on view strategy: either keep the view's column name as `booking_fee_paid` (computed from `payment_status`) for one more SPEC cycle, or carve out the consumers too. Document the choice in EXECUTION_REPORT §4.

### 8.4 Drop old columns (commit 6, after carve-out verified)

```sql
-- File: 2026_04_25_payment_99_drop_legacy.sql
-- ONLY run after grep returns 0 references to booking_fee_paid in code.

DROP TRIGGER IF EXISTS sync_booking_fee_paid_from_status ON crm_event_attendees;
DROP FUNCTION IF EXISTS sync_booking_fee_paid_from_status();

ALTER TABLE crm_event_attendees
  DROP COLUMN booking_fee_paid,
  DROP COLUMN booking_fee_refunded;
```

Note the migration's `99_` prefix — sorts last lexically.

### 8.5 Modified docs (commit 6)

- `modules/Module 4 - CRM/docs/MODULE_MAP.md` — new section "Payment lifecycle (DB)" documenting the 7 statuses, RPC, indexes.
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — new Phase History row.
- `modules/Module 4 - CRM/docs/CHANGELOG.md` — new section at top.
- `modules/Module 4 - CRM/docs/db-schema.sql` — refresh to reflect new columns + FK + indexes + RPC. Drop old columns.

### 8.6 Files NOT updated in this SPEC

- `docs/GLOBAL_SCHEMA.sql` — already 14 days stale (Sentinel M4-DOC-07). Will be updated in next Integration Ceremony, not this SPEC.
- `docs/GLOBAL_MAP.md` — `transfer_credit_to_new_attendee` is internal to CRM module. Add at next Integration Ceremony.
- `docs/FILE_STRUCTURE.md` — already stale, deferred per existing Sentinel alert.
- `MASTER_ROADMAP.md` — phase status updated only when SPEC #3 closes.

---

## 9. Commit Plan

Exactly 6 commits. Order is rigid: schema → trigger → backfill → RPC + templates → carve-out → drop legacy.

### Commit 1 — `feat(crm): add payment lifecycle columns to event attendees`
- Migration: `2026_04_25_payment_01_add_columns.sql` applied on demo via `apply_migration`.
- Files: 1 new migration file.
- Verify: 6 new columns visible in `\d crm_event_attendees`. CHECK constraint enforces 7 values. 2 indexes created. FK self-reference works.

### Commit 2 — `feat(crm): install booking_fee_paid sync trigger`
- Migration: `2026_04_25_payment_02_sync_trigger.sql` applied on demo.
- Files: 1 new migration file.
- Verify: trigger exists in `pg_trigger`. Test by UPDATE-ing payment_status on a test row and verifying booking_fee_paid auto-updates.

### Commit 3 — `feat(crm): backfill demo attendees with payment_status`
- Migration: `2026_04_25_payment_03_backfill_demo.sql` applied on demo.
- Files: 1 new migration file.
- Verify: 1 row has `payment_status='paid'` AND `paid_at IS NOT NULL`. 12 rows have `payment_status='pending_payment'`. 0 rows have `payment_status='refunded'`.

### Commit 4 — `feat(crm): add credit transfer RPC + payment_received template`
- Migration: `2026_04_25_payment_04_credit_transfer_rpc.sql` applied on demo.
- Templates: 2 INSERTs into `crm_message_templates` for demo only.
- Files: 1 new migration file. (Templates inserted via runtime SQL or UI — no migration file needed for content seeds, per project convention.)
- Verify: RPC callable. Templates appear in template editor.

### Commit 5 — `refactor(crm): carve out booking_fee_paid/refunded from JS + EFs + views`
- Files: every JS/TS/SQL file that referenced the old fields. Likely 5-15 files touched.
- Verify: `grep` for old field names returns 0 hits in active code.
- This is the scariest commit. Test the app end-to-end after this commit before commit 6.

### Commit 6 — `chore(crm): drop legacy booking_fee_paid/refunded + close SPEC`
- Migration: `2026_04_25_payment_99_drop_legacy.sql` applied on demo.
- Files: migration file + EXECUTION_REPORT.md + FINDINGS.md (if any) + MODULE_MAP.md + SESSION_CONTEXT.md + CHANGELOG.md + db-schema.sql.
- Verify: old columns gone from `\d crm_event_attendees`. Sync trigger gone. Code still works.

If any commit fails its pre-commit hook, the executor fixes the underlying issue and re-creates a NEW commit (NOT amend). Do not bypass with `--no-verify`.

---

## 10. Test Subjects (Pinned)

All work on demo tenant only. Pre-flight verified 2026-04-25.

### 10.1 Tenant
- **demo** — `tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'`.

### 10.2 Pre-flight verification (executor MUST run before commit 1)

```sql
-- Total attendees
SELECT count(*) FROM crm_event_attendees WHERE tenant_id='8d8cfa7e-…' AND is_deleted=false;
-- Expected: 13

-- Paid attendees
SELECT count(*) FROM crm_event_attendees WHERE tenant_id='8d8cfa7e-…' AND booking_fee_paid=true;
-- Expected: 1
-- Pin this row's id in EXECUTION_REPORT §2 — track it through backfill.

-- Refunded attendees
SELECT count(*) FROM crm_event_attendees WHERE tenant_id='8d8cfa7e-…' AND booking_fee_refunded=true;
-- Expected: 0

-- Existing RLS policies on table
SELECT policyname FROM pg_policies WHERE tablename='crm_event_attendees';
-- Expected: ['service_bypass', 'tenant_isolation']

-- Existing columns count
SELECT count(*) FROM information_schema.columns WHERE table_name='crm_event_attendees' AND table_schema='public';
-- Expected: 23 (will become 29 after commit 1, then 27 after commit 6)
```

If any value differs from expected — STOP and report. Do NOT start commit 1.

### 10.3 No leads/phones touched
This SPEC does not exercise the dispatch pipeline. No `crm_message_log` rows should be created. No SMS/Email sent. The 3-layer phone allowlist remains in force.

---

## 11. Lessons Already Incorporated

Cross-Reference Check completed 2026-04-25 against `docs/GLOBAL_MAP.md`, `docs/GLOBAL_SCHEMA.sql` (stale, supplemented by direct DB query), all `modules/Module 4 - CRM/docs/MODULE_MAP.md`. **Result: 0 collisions.**

- `payment_status` column — does not exist on any current table.
- `transfer_credit_to_new_attendee` RPC — does not exist (`pg_proc` query returned 0 hits).
- `payment_received` template slug — does not exist on demo (verified via SQL).
- `sync_booking_fee_paid_from_status` trigger function — does not exist.

**Lessons applied from recent FOREMAN_REVIEWs:**

1. **FROM `CRM_UX_REDESIGN_TEMPLATES/FOREMAN_REVIEW.md §6 Proposal 1 (verification methodology)** → APPLIED in §3: criteria use SQL anchors. No JS `.length` substitution.
2. **FROM `CRM_UX_REDESIGN_TEMPLATES/FOREMAN_REVIEW.md §6 Proposal 2 (Executor TL;DR)** → APPLIED at the top of this SPEC.
3. **FROM `CRM_UX_REDESIGN_AUTOMATION/FOREMAN_REVIEW.md §7 Proposal 1 (co-staged file pre-flight)** → APPLIED: §9 commits are ordered specifically so that no commit stages 2 existing JS files together. The carve-out (commit 5) touches multiple files but they're all distinct concerns; the rule-21-orphans hook should not fire because none of these files have IIFE-local helpers with the same name. Executor pre-checks shared helper names before staging commit 5.
4. **FROM `CRM_UX_REDESIGN_AUTOMATION/FOREMAN_REVIEW.md §7 Proposal 2 (behavioral preservation defaults)** → APPLIED throughout: the migration explicitly preserves all existing data (backfill maps booleans → status), the sync trigger preserves `booking_fee_paid` semantics during the carve-out, and the RPC uses `Object.assign`-equivalent pattern (only updates targeted fields, leaves others alone).
5. **FROM `CRM_UX_REDESIGN_AUTOMATION/EXECUTION_REPORT §3.2 (line-count overrun caught pre-write)** → APPLIED: §8.6 explicitly defers GLOBAL_SCHEMA, FILE_STRUCTURE, MASTER_ROADMAP updates so the executor doesn't have to debate scope mid-flight.
6. **General lesson — pin test-subject IDs at author time** → APPLIED in §10.2: paid attendee row count pinned (1), expected backfill outcome pinned (1 paid + 12 pending_payment + 0 refunded).

---

## 12. Foreman QA Protocol (post-execution)

The Foreman delegates §12 execution to Claude Code on Windows desktop (Cowork-VM-cannot-reach-localhost limitation, established as canonical workflow per `CRM_UX_REDESIGN_TEMPLATES/FOREMAN_REVIEW.md §7`).

### 12.1 Path 1 — Schema integrity
SQL on demo:
- All 6 new columns exist with correct types and defaults.
- CHECK constraint accepts all 7 valid values, rejects an invalid one (test by attempting `UPDATE ... SET payment_status='invalid_test'` — should error).
- Old columns `booking_fee_paid` and `booking_fee_refunded` do NOT exist.
- 2 indexes exist.
- Sync trigger does NOT exist (was dropped in commit 6).
- RPC `transfer_credit_to_new_attendee` exists and is callable.

### 12.2 Path 2 — Backfill correctness
SQL:
- Of 13 demo attendees: 1 has `payment_status='paid'` AND `paid_at IS NOT NULL`. 12 have `payment_status='pending_payment'` AND `paid_at IS NULL`. 0 have `payment_status='refunded'`.
- The pinned paid attendee id from §10.2 still has `payment_status='paid'`.

### 12.3 Path 3 — Carve-out completeness
- `grep -rn "booking_fee_paid\|booking_fee_refunded" modules/ js/ supabase/` returns 0 hits (excluding `/docs/` and `/specs/`).
- `SELECT count(*) FROM pg_views WHERE definition ILIKE '%booking_fee_paid%';` → 0.

### 12.4 Path 4 — UI smoke test
- Navigate `crm.html?t=demo` → events tab → open the event with the paid attendee → verify the paid attendee still appears and any "paid" indicator the existing UI shows still works.
- Navigate to attendees-day-of view → verify all 13 attendees load.
- Console: 0 new errors related to undefined fields.

### 12.5 Path 5 — RPC functional test
- Create 2 test attendee rows: one with `payment_status='credit_pending'` (the "old" one), one with `payment_status='pending_payment'` (the "new" one).
- Call `SELECT transfer_credit_to_new_attendee('<old_id>', '<new_id>');`.
- Verify: old row now has `payment_status='credit_used'` AND `credit_used_for_attendee_id=<new_id>`. New row has `payment_status='paid'` AND `paid_at IS NOT NULL`.
- Test error paths: call with non-existent ids → should raise. Call when old isn't `credit_pending` → should raise. Call when new isn't `pending_payment` → should raise.
- Cleanup: hard-delete the 2 test rows (QA artifact authorization).

### 12.6 Path 6 — Template existence
- `payment_received_sms_he` and `payment_received_email_he` exist on demo with `is_active=true`.
- They DO NOT exist on prizma.
- Open in template editor — render correctly, no JS errors.

### 12.7 Path 7 — Final cleanup + integrity
```bash
npm run verify:integrity   # exit 0
git status                 # clean (only docs/guardian/* per Daniel directive)
git log origin/develop..HEAD --oneline  # empty (HEAD pushed)
```

---

## 13. Pre-Merge Checklist (Executor Closure)

Every item must pass before commit 6.

- [ ] All §3 success criteria pass with actual values captured in `EXECUTION_REPORT.md §2`.
- [ ] **Integrity Gate:** `npm run verify:integrity` returns exit 0.
- [ ] `git status --short` empty (clean tree, ignoring `docs/guardian/*`).
- [ ] HEAD pushed to `origin/develop` (commits 1-5 pushed individually; commit 6 at the very end).
- [ ] EXECUTION_REPORT.md written with: §1 Summary, §2 Criteria results table (all 37 criteria), §3 What was done per file/migration, §4 Deviations, §5 Decisions made in real time, §6 Iron-rule self-audit, §7 Self-assessment, §8 Improvement proposals (2 for executor skill).
- [ ] FINDINGS.md written if any findings.
- [ ] MODULE_MAP, SESSION_CONTEXT, CHANGELOG, db-schema.sql updated.
- [ ] All CRM JS files ≤350 lines.
- [ ] No new orphan globals.
- [ ] Engine `crm-automation-engine.js` untouched.
- [ ] No automation rules added/modified.
- [ ] DROP commands executed only after grep returns 0 references.

After commit 6 push, executor signals: `EXECUTOR DONE`. Foreman runs §12 protocol independently and writes `FOREMAN_REVIEW.md`.

---

## 14. Dependencies / Preconditions

- Branch `develop` is current with `origin/develop`.
- `CRM_UX_REDESIGN_AUTOMATION` is closed (commit `8c3343f`). ✓
- F1 fix on `event_2_3d_before` template applied (commit `2c22eef`). ✓
- Demo tenant has 13 attendees with 1 paid (per §10.2). If different, executor stops and reports.
- Local dev server reachable at `http://localhost:3000` for QA. If not, Foreman pings Daniel before §12.
- Supabase MCP `apply_migration` tool available (executor has access).

---

*End of SPEC.*

*This SPEC is ready for execution by opticup-executor. Do not begin until Daniel reviews and approves.*
