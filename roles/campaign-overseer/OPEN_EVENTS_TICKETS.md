# Open Events Tickets

Tracks Module 4 (CRM / events / automations / messaging) open items that span
multiple sessions. Items close inline when shipped. The file itself can be
deleted once all items are CLOSED.

Last updated: 2026-05-12 evening

---

## EV-001 — Status-change triggers framework (✅ CLOSED 2026-05-13)

**Status:** SHIPPED via Full-Auto Pipeline (Foreman → Executor → CLI-deploy-resume → Foreman-Review). SPEC folder: `modules/Module 4 - CRM/docs/specs/STATUS_CHANGE_TRIGGERS_FRAMEWORK/`. Closing commits: `bb0c73a` (SPEC), `61018a1` (SQL migration + tables + RLS + DB trigger + 2 rule migrations), `8de4197` (EF code: consumer + parallel multi-channel dispatch), `c5dc7e9` (OPEN-021 pause marker), `7424553` (browser engine mirror + rule editor UI), `4214c1b` (pg_cron consumer schedule), Phase 5 closure commit.

**E2E smoke proven on demo (2026-05-13):** attendee status transition `invited`→`attended` → DB trigger inserted into `crm_status_change_events` (sync) → consumer at next cron tick (lag 19.8s) → 2 queue rows enqueued at IDENTICAL `scheduled_at` (single DB transaction) → dispatch-queue parallel-by-group dispatched both within **38ms** of each other (was ~1000ms pre-fix — 26× improvement). Both SMS + email landed with `status='sent'`, log_ids populated. Prizma collateral canary green throughout.

**Production rule fix shipped:** the 2 silently-broken "צ'ק אין לאירוע" rules (`b2a21d96-...` demo + `a9483a90-...` Prizma) had `trigger_event='created' + status_equals='attended'` and have never fired since they were authored. Both now `trigger_event='status_change'`. The check-in SMS will fire correctly on the next live event-day attendee transition to `attended`.

**Open follow-ups recorded in `modules/Module 4 - CRM/docs/specs/STATUS_CHANGE_TRIGGERS_FRAMEWORK/FINDINGS.md`:**
- F1 (HIGH): `dispatch-queue` EF flipped to `verify_jwt=true` during Daniel's CLI deploy (OPEN-021 fallback path). Workaround migration applied (`20260513030500_dispatch_queue_cron_auth_header_workaround.sql`); Daniel to redeploy with `--no-verify-jwt` when convenient.
- F4 (MEDIUM): `destructive-ops-declared.mjs` allowlist hardcoded; needs wildcard regex (one-line follow-up).

**Sealed (do not reopen).** Future entity types (sale, payment, inventory, lab job) plug into the same framework by inserting one row in `crm_trigger_type_registry` per tenant + attaching a one-line DB trigger to their status-bearing table. Zero engine code change required for the next entity.

---

## EV-001 — Status-change triggers framework (🟡 HANDED-OFF 2026-05-12 evening)

**Status:** Architect-Daniel decision complete. Brief authored at
`modules/Module 4 - CRM/architecture-brief/STATUS_CHANGE_TRIGGERS_FRAMEWORK_BRIEF.md`.
Activation prompt for M4 Module Strategist at
`modules/Module 4 - CRM/architecture-brief/STATUS_CHANGE_TRIGGERS_FRAMEWORK_ACTIVATION_PROMPT.md`.
Pipeline kicks off when Daniel pastes the activation prompt into a fresh Claude Code chat.

**Key architectural decisions added beyond the original ticket body below:**
1. Framework implementation = **DB triggers → central queue table (`crm_status_change_events`) → automation-engine consumer**. NOT code-level `AutomationClient.evaluate()` calls.
2. Each module owns its DB trigger DDL on its status-bearing table; M4 owns the consumer + queue + mapping registry.
3. Bundled with multi-channel parallel dispatch: when template configured for SMS+Email and recipient has both → both queue rows in single transaction with identical `scheduled_for`.

The original ticket body is preserved below for reference.

---

## EV-001 — Status-change triggers framework (OPEN — HIGH PRIORITY)

**The need.** The automation engine currently supports only 5 trigger types:
`event_status_change`, `event_registration`, `lead_status_change`, `lead_intake`,
`attendee_moved`. Real-world automations Daniel wants to build need more:
- **attendee_status_change** — e.g. "when attendee becomes 'attended' (הגיע) →
  send check-in SMS." This is the immediate trigger that surfaced on 2026-05-12.
- **sale_status_change** — e.g. "when sale → 'completed' → ping Facebook CAPI
  with purchase event for retargeting / lookalike." Daniel called this out
  explicitly 2026-05-12: future Facebook purchase-event integration.
- **inventory_status_change** — e.g. "when stock < N → notify supplier."
  (Module 1 expansion territory.)
- **payment_status_change** — e.g. "when payment confirmed → send receipt."

Today's gap: the rule-editor UI lets you save a rule against a non-existent
trigger, but the engine never fires it. Silent breakage.

**Architectural decision (Daniel, 2026-05-12).** Build this as a **generic
framework**, not as a one-off attendee fix. Every entity (attendee, sale,
inventory, payment, …) should be able to declare a `status_change` trigger
the same way `lead_status_change` works today, so a new entity = a new row
in a mapping table, not new engine code.

**Work breakdown (estimated ~2-3 hours for the framework + 1 hour per added
entity):**

1. **Audit step.** List every place in code that mutates a `status` column
   on a table that could host automations. Today's known set:
   - `crm_event_attendees.status` → check-in flow, RPCs `register_lead_to_event`,
     `quick-register` EF, manual UI status changes.
   - `crm_sales.status` (or equivalent) → not yet built, but plan ahead.
   - `crm_payments.status` → ditto.
   - `inventory.status` / per-row stock flags → Module 1 territory.

2. **Engine extension.** In `crm-automation-engine.js` + EF mirror, add
   `attendee_status_change` (and the future entries) to `TRIGGER_TYPES`.

3. **Call-site wiring.** Every mutation point identified in step 1 must call
   `CrmAutomationClient.evaluate('<entity>_status_change', { entityId, oldStatus, newStatus, ... })`
   after a successful UPDATE.

4. **Rule-editor UI.** The "attendees" board (and future boards) needs a
   "fires on" picker — created vs. status_change. Today the board is hard-
   wired to `entity:event:created` and pretends status_change rules will
   work. Picker + condition surfaces (status_equals, status_changed_from, etc.)
   need wiring.

5. **Backward compat.** Existing rules that look like attendee_status_change
   today (UI saved them, engine never fired them) must be either auto-routed
   to the new trigger or surfaced as "needs review" in the audit history.

**Reference: prior 2-min hotfix would have looked like:** add only
`attendee_status_change` to TRIGGER_TYPES + wire only the check-in flow.
Daniel explicitly rejected this in favor of the framework approach
("חייב להיות פתרון קבוע כי יש עוד אוטומציות בעתיד", 2026-05-12).

**Tracking SPEC name:** `STATUS_CHANGE_TRIGGERS_FRAMEWORK`.

---

## EV-002 — Broadcast 1000-cap silent truncation ✅ CLOSED 2026-05-12

`paginateQuery` was using `.range()` on a single PostgrestFilterBuilder
that's single-use after first await — second page came back empty, capping
every broadcast and every recipient resolver at exactly 1000 rows.

**Fix shipped:** factory-based paginate (browser-side commit `bed1fee`,
EF-side automation-engine v9). All callers now pass `() => sb.from(...)`
instead of a built builder. Verified live: Prizma 1216 leads no longer
silently truncated to 1000.

---

## EV-003 — Automation 30-cap (parallel-fetch CPU/timeout) ✅ CLOSED 2026-05-12

`dispatchPlanDirect` fired N parallel `fetch()` calls to `send-message` EF
in one go. At >~30 recipients the EF hit CPU/timeout limits and silently
dropped the rest.

**Fix shipped:** automation-engine EF now enqueues all plan items into
`crm_message_queue` (browser broadcast already worked this way). The
existing `dispatch-queue` cron drains the queue at the throttled rate
(SMS 1s, email 0.5s). Verified live: Prizma 2295 messages now flowing
in full, no plateau at 30.

---

## EV-004 — `.in("id", [N])` URL-cap silent rejection ✅ CLOSED 2026-05-12

PostgREST's ~8KB URL cap silently rejected bulk UPDATEs using
`.in("id", [1144 UUIDs])` (~44KB query string). Functions affected:
- `promoteWaitingLeadsToInvited` (was no-op for >~200 recipients)
- `executePostActions`
- `attendeeUpsert`

**Fix shipped:** all three functions chunk `.in()` at 200 UUIDs. EF v11.
Verified live: 1144 Prizma leads correctly promoted via the chunked path.

---

## EV-005 — Eager promotion-before-delivery ✅ CLOSED 2026-05-12 evening

After EV-003 moved automation to queue-based, the per-recipient promote
ran at queue-insert time (`ok: true` assumed for everyone). A recipient
whose send later failed was still marked `invited`. This violated the
intended contract: promotion only after actual delivery.

**Fix shipped:** DB trigger `trg_promote_lead_on_message_sent`
(migration `promote_lead_on_message_sent`) fires when a
`crm_message_queue` row transitions to `status='sent'`. Only then is the
lead promoted waiting→invited. EF v12 removed the eager EF-side promote;
`promoteWaitingLeadsToInvited` is now a no-op stub.

Retroactive cleanup: 1 lead (no queue row + no send) reverted to waiting;
289 still-in-queue leads left as `invited` (they'll receive their messages
within minutes and the trigger handles them idempotently).
