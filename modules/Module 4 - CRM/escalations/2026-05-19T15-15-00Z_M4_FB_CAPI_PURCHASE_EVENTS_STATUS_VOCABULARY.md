# Escalation — M4_FB_CAPI_PURCHASE_EVENTS status vocabulary

> **Raised by:** opticup-strategic (Foreman, M4) at SPEC pre-flight.
> **Raised on:** 2026-05-19T15:15 UTC.
> **Pipeline phase:** SPEC authoring — Step 1.5 mandatory DB probes (per the user's activation prompt).
> **Stop-trigger fired:** "Pre-flight probe finds different status vocabulary than Brief assumed" (explicit in the activation prompt's STOP TRIGGERS list).
> **Severity:** BLOCKING — Foreman cannot author the SPEC until Daniel decides on direction.

---

## Why this escalation exists

The Brief `M4_FB_CAPI_PURCHASE_EVENTS_BRIEF.md` §1 + §4.5 assumes that when an attendee pays, their row's `status` flips to `'purchased'`. The Brief's proposed trigger `trg_capi_attendee_status_change` fires `AFTER UPDATE OF status` and branches on `NEW.status = 'purchased'`.

**Live DB probes contradict that assumption:**

1. **`crm_statuses` for entity_type='attendee' on prizma + demo:** 11 slugs defined, NONE of them is `'purchased'`. The full list (both tenants identical):
   `registered, waiting_list, invited, confirmed, attended, no_show, cancelled, duplicate, quick_registration, event_closed, manual_registration`.
   Per the activation prompt: *"If statuses use different keys (e.g., 'attended_paid' or 'הגיע') → STOP and escalate (need Daniel's status mapping)."*

2. **`crm_event_attendees` actual data on prizma (234 rows, the production tenant):**
   - `status='attended'` + `payment_status='pending_payment'` = **89 rows** (majority)
   - `status='confirmed'` + `payment_status='pending_payment'` = 70 rows
   - `status='registered'` + `payment_status='pending_payment'` = 48 rows
   - `status='cancelled'` = 13, `waiting_list` = 9, `invited` = 3, `no_show` = 1, `duplicate` = 1
   - `purchase_amount > 0` count = **84 rows** (de facto purchase signal — set without any status/payment_status change)
   - `payment_status != 'pending_payment'` count = **0** (prizma operators never use this column)

3. **Demo data (60 rows, paint a different picture):** `payment_status='paid'`=7, `unpaid`=1, `refunded`=1, `pending_payment`=49. Demo has been used to exercise `payment_status` — prizma has not.

So the schema offers THREE candidate signals for "purchase," and only one of them is in active use on production:

| Signal | Definition | Prizma usage | Demo usage |
|---|---|---|---|
| `status = 'purchased'` | Brief's assumption | **Status doesn't exist** (0 rows possible) | Doesn't exist |
| `payment_status = 'paid'` | Schema's apparent intent | 0 rows | 7 rows |
| `purchase_amount > 0` | De facto on prizma | **84 rows** | (mixed) |

The Brief author (Architect, 2026-05-19) wrote the Brief from schema docs without checking actual data, and assumed `'purchased'` was a real status. The probe shows it isn't.

---

## What needs Daniel's decision

**Question for Daniel (one only, per Foreman skill — to be paraphrased in Hebrew when surfaced):**

> When a customer pays for a product after an event, which DB change is the canonical signal that we should treat as "Purchase" for Meta CAPI?

Three options (Foreman recommends Option B):

### Option A — Add a new `'purchased'` status to `crm_statuses`

Trigger fires on `status` flipping from any-prior to `'purchased'`. Operators must adopt the new status (today they don't). Requires:
- Migration to seed the new status row for both tenants (and any future tenant).
- Operator training / UI change.
- M4 Status Trigger Framework already knows how to consume `attendee status_change` events for this slug.

**Pro:** semantically explicit; Meta event tied 1:1 to a deterministic state.
**Con:** requires changing operator behavior; introduces a new vocabulary item.
**Iron Rule 35 implication:** adding a new status slug is **Campaign-Overseer-allowed** (templates/rules edit existing statuses, but adding a new status row is operator config — likely OK). Adding the trigger condition that READS the new slug is Foreman-authored DB work, fine.

### Option B (Foreman-recommended) — Trigger fires when `purchase_amount` transitions from NULL/0 to > 0

Trigger: `AFTER UPDATE OF purchase_amount ON crm_event_attendees WHEN (OLD.purchase_amount IS NULL OR OLD.purchase_amount = 0) AND (NEW.purchase_amount > 0)`. No status check.

**Pro:** matches current Prizma operational reality (84 rows already in this state today, forward-only per D7 means we send Purchase for any future flip). Zero operator change needed. Honors the Brief's D5 ("purchase_amount = 0 OR NULL → DO NOT send Purchase").
**Con:** semantic is "money got entered" not "customer paid" — if operators correct a typo (`purchase_amount` $100 → $80), the trigger does NOT re-fire (correct behavior; idempotent via the unique constraint). But a typo that adds amount in TWO steps ($0 → $100 → $200) would fire once, which is also fine.
**SaaS litmus:** future tenant in a different country with different operational flow — they may use payment_status. Make the trigger configurable via tenant setting (future SPEC). v1 hardcodes `purchase_amount` signal; tenant config field added in v2.

### Option C — Trigger fires when `payment_status` flips to `'paid'`

Trigger: `AFTER UPDATE OF payment_status ON crm_event_attendees WHEN OLD.payment_status != 'paid' AND NEW.payment_status = 'paid'`.

**Pro:** semantically explicit (the column literally means "paid"); matches schema's apparent design intent.
**Con:** 0 rows on prizma today — operators have never flipped this column. Either the SPEC ships with zero forward-events on prizma for an indeterminate time, OR we run a behavior-change project to start using `payment_status='paid'`. Brief D7 says no historical backfill, so today's 84 `purchase_amount > 0` rows would never get a Purchase event.

---

## Secondary issue (Foreman can resolve unilaterally — noting here for transparency)

The Brief §3 says to add a new column `crm_capi_dispatch_queue.event_type text NOT NULL DEFAULT 'Lead'`. Probe confirms the queue already has a column `event_name text NOT NULL DEFAULT 'Lead'` (existing since P2.1). The EF (`fb-capi-dispatch/index.ts` lines 88 + 173) already reads `event_name` and threads it through to Meta. This is a **Brief-vs-reality Rule 21 violation** the Foreman can fix in §0 D-AUTH: use the existing `event_name` column instead of adding `event_type`. The new unique constraint becomes `(tenant_id, lead_id, event_name)` (replacing `crm_capi_dispatch_queue_tenant_lead_unique`).

This change makes the SPEC strictly smaller (1 fewer column, 1 fewer schema migration step) and prevents the future-self problem of "we have two columns that mean the same thing."

**Will be baked into the SPEC once Daniel decides the status question above.** Not a separate Daniel decision.

---

## Other findings worth noting (Foreman will incorporate at SPEC author time)

- Existing triggers on `crm_event_attendees`:
  - `crm_event_attendees_set_updated_at_trg` (BEFORE UPDATE) — updates `updated_at`. Standard, untouched.
  - `trg_attendee_status_change_event` (AFTER UPDATE) — writes to `crm_status_change_events` (M4 automation bus). Brief §4.6 explicitly excludes this — ✅.
  - No CAPI-related trigger exists today — ✅ Iron Rule 21 holds, safe to add 2 new triggers.
- Existing unique constraint name on queue: `crm_capi_dispatch_queue_tenant_lead_unique` (not just `_unique` — Brief language was loose; SPEC will name the replacement explicitly).
- `crm_event_attendees.event_id` = uuid NOT NULL (FK to `crm_events.id` — the EVENT id, not the FB CAPI event_id). Brief language confused these; SPEC will be explicit.

---

## Foreman's recommendation

**Daniel's question, paraphrased in Hebrew:** "החתימה של 'רכישה' לאיוונט הפייסבוק — לפי איזה שדה? המומלץ: `purchase_amount > 0` (הדרך שאתם עובדים היום). או: סטטוס תשלום `paid`? או: להוסיף סטטוס חדש 'נרכש'?"

If Daniel picks Option B (recommended), the Foreman can immediately author the SPEC. The SPEC's success criteria, autonomy envelope, and stop-triggers will reflect:
- Trigger fires on `purchase_amount` transitions (NULL/0 → > 0).
- Trigger DOES NOT fire on `payment_status` changes.
- `event_name` column reused (not new `event_type`).
- 84 historical Prizma rows are NOT backfilled (D7 forward-only stands).

If Daniel picks Option A or C, the Foreman authors a different SPEC accordingly.

---

## Pipeline state

- SPEC.md: NOT yet authored (waiting on Daniel's decision).
- No code changes made.
- No DB changes made.
- Pipeline lock NOT acquired.
- Branch: `develop`, working tree pre-existing-dirty per the prior session (unchanged).
- Resumable: any future Claude Code session can pick up by reading this escalation + Daniel's resolution, then authoring the SPEC.

---

*End of escalation. Awaiting Daniel.*
