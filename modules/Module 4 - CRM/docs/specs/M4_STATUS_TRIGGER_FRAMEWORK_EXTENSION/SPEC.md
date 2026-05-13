# M4_STATUS_TRIGGER_FRAMEWORK_EXTENSION — SPEC

**Module:** 4 — CRM
**Author:** opticup-strategic (Foreman)
**Date:** 2026-05-14
**Brief:** `modules/Module 4 - CRM/architecture-brief/M4_OVERNIGHT_HARVEST_ROUND_2_BRIEF.md` §3.1
**Source finding:** `STATUS_MODEL.md` Finding F5 (MEDIUM) + §5.4
**Run context:** Overnight Round 2, SPEC #1 of 4. Master safety tag: `pre-overnight-m4-r2-2026-05-14`.

---

## 0. Pre-Authoring Reality Check

Verified live state on 2026-05-14 against the Brief's stated assumptions. All confirmed.

| Assumption | Verified |
|---|---|
| `crm_status_change_events` queue exists | ✅ live, 9 columns including `entity_type`, `entity_id`, `old_status`, `new_status`, `payload`, `consumed_at` |
| `crm_trigger_type_registry` exists with UNIQUE(tenant_id, entity_type) | ✅ live, 10 columns, 2 rows (one per tenant), both `entity='attendee'` |
| `trg_attendee_status_change_event` is the model trigger | ✅ live on `crm_event_attendees`, fires AFTER UPDATE OF status |
| `attendee_status_change_event_fn` is the model function | ✅ SECURITY DEFINER, NULL-safe `IS DISTINCT FROM`, inserts payload `{event_id, lead_id}` |
| Lead/event triggers absent | ✅ 0 hits for `trg_lead_status_change_event`, `trg_event_status_change_event` |
| `automation-engine` EF has consumer | ✅ `engine.ts::consumeStatusChangeEvents` reads registry, derives trigger_type per entity_type |
| `TRIGGER_TYPES` in engine.ts:14 + crm-automation-engine.js:38 already include `lead_status_change`, `event_status_change` | ✅ rule editor already saves these via `tier2` and `events` boards |
| Rule 21 — new DB names unique | ✅ 0 collisions on the 4 new names |

**Tenants:** demo (`8d8cfa7e-ef58-49af-9702-a862d459cccb`), prizma (`6ad0781b-37f0-47a9-92e3-be9ed1477e1c`).

### Baselines (symbols used in §3)
- `BASE_REGISTRY_ROWS` = 2 (attendee × 2 tenants)
- `BASE_TRIGGERS_ON_LEADS` = 0 (no `trg_*_status_change_event` on `crm_leads`)
- `BASE_TRIGGERS_ON_EVENTS` = 0 (no `trg_*_status_change_event` on `crm_events`)
- `BASE_QUEUE_LEAD_ROWS` = 0 (no `entity_type='lead'` rows in queue)
- `BASE_QUEUE_EVENT_ROWS` = 0 (no `entity_type='event'` rows in queue)

### UI scope clarification (vs Brief literal wording)

The Brief asks to "extend the rule editor UI's `fires_on` sub-picker to also surface lead and event entities." Reality:

- The current `fires_on` sub-picker exists only on the **attendees** board (created vs status_change variant).
- The `tier2` (lead) and `events` boards already exist and already save rules with `trigger_event='status_change'`. The `entity` axis is therefore already surfaced.
- What is **not** yet surfaced on those boards: the `status_changed_from` / `status_changed_to` condition types. Those exist in `CONDITIONS` in both engine.ts and crm-automation-engine.js, but `COND_BY_BOARD` only exposes them on the `attendees` board (via the status_change variant).
- The minimal coherent UI extension that matches the Brief's intent: surface the two transition-shape conditions on the `tier2` and `events` boards too. This is what the queue framework enables (the payload carries `old_status` + `new_status`, so transition-shape conditions evaluate correctly).

This is documented here in §0 because the Brief's literal wording is slightly off from the codebase's UI structure; the intent maps cleanly to the change above.

---

## 1. Goal

Extend the `crm_status_change_events` queue framework — today wired only for `entity_type='attendee'` — to also fire on `crm_leads.status` and `crm_events.status` transitions, with end-to-end coverage: DB producers → registry rows → automation-engine consumer entity-aware payload shaping → rule editor UI conditions.

After this SPEC: any `lead_status_change` or `event_status_change` automation rule fires through the **queue path** (decoupled bus) just like attendee rules already do. The legacy in-process direct-dispatch path stays in place; this SPEC adds a parallel route, does **not** decommission the old one.

---

## 2. Scope

**In scope:**
- 1 SQL migration adding 2 trigger functions + 2 DB triggers + 4 registry rows (2 entities × 2 tenants).
- `supabase/functions/automation-engine/engine.ts` — entity-aware payload shaping in `consumeStatusChangeEvents`.
- `modules/crm/crm-automation-engine.js` — mirror the consumer entity-awareness comment (no functional change in the browser file — it never invokes the consumer).
- `modules/crm/crm-rule-editor.js` — extend `COND_BY_BOARD` for `tier2` and `events` boards to include `status_changed_from` and `status_changed_to`.
- Deploy the updated `automation-engine` EF.
- Smoke validation on demo tenant only.

**Explicitly out of scope:**
- Decommissioning the in-process `lead_status_change` / `event_status_change` dispatch paths (`crm-lead-actions.js::fireLeadStatusAutomation`, `crm-event-actions.js::changeEventStatus → CrmAutomationClient.evaluate`). Keep both paths active for safety.
- Backfilling `crm_status_change_events` with historical lead/event transitions.
- Resolving F-CSF-3 composite-NULL idiom in `sync_lead_status_from_attendee` (separate SPEC #3 in this overnight queue).
- F2 trigger naming normalization (separate SPEC #3 in this overnight queue).
- Any STATUS_MODEL.md doc edits (separate SPEC #4).
- Prizma tenant writes beyond the registry seed rows (Brief §2.4 pre-approved DDL).

---

## 3. Destructive Operations

**None.** All DDL is additive (CREATE FUNCTION, CREATE TRIGGER, INSERT). All DML is restricted to a 4-row INSERT into `crm_trigger_type_registry`. No DROP, no TRUNCATE, no mass DELETE, no ALTER on existing rows, no schema column changes, no file deletions, no commits on `main`.

If the executor encounters a need for any destructive op mid-run → STOP per Iron Rule 32; write escalation file; halt SPEC.

---

## 4. Success Criteria

Each criterion is measurable; the executor must verify each before declaring the SPEC complete.

### 4.1 DB state after migration applies

```sql
-- C1: trigger functions exist
SELECT count(*) FROM pg_proc WHERE proname IN ('lead_status_change_event_fn','event_status_change_event_fn');
-- expected: 2

-- C2: DB triggers exist
SELECT count(*) FROM pg_trigger WHERE tgname IN ('trg_lead_status_change_event','trg_event_status_change_event') AND NOT tgisinternal;
-- expected: 2

-- C3: registry row count grew from BASE_REGISTRY_ROWS=2 to 6 (2 + lead×2 tenants + event×2 tenants)
SELECT count(*) FROM crm_trigger_type_registry;
-- expected: 6

-- C4: every tenant has exactly 3 registry rows now (attendee, lead, event)
SELECT tenant_id, count(*) FROM crm_trigger_type_registry GROUP BY tenant_id;
-- expected: 2 rows, each with count=3

-- C5: every new registry row is_active=true
SELECT count(*) FROM crm_trigger_type_registry WHERE entity_type IN ('lead','event') AND is_active=true;
-- expected: 4
```

### 4.2 Producer-trigger behavior (demo only, criterion 4.4 smoke verifies)

- Updating `crm_leads.status` from `X` to `Y` (where X ≠ Y) on demo inserts exactly 1 row into `crm_status_change_events` with `entity_type='lead'`, `entity_id` = lead.id, `old_status='X'`, `new_status='Y'`, and `payload` containing `{phone, source}` (lead-shaped payload — see §5.2 for the exact contract).
- Updating `crm_events.status` from `X` to `Y` on demo inserts exactly 1 row with `entity_type='event'`, `entity_id` = event.id, `old_status='X'`, `new_status='Y'`, and `payload` containing `{event_date, event_name}`.
- No-op UPDATEs (same status set again) insert **zero** rows (verified via `IS DISTINCT FROM`).

### 4.3 Consumer behavior

- The deployed `automation-engine` EF responds to `mode='consume_status_events'` POSTs with HTTP 200 and a JSON body `{ok:true, processed:N, evaluated:M, errors:0}`.
- For an `entity_type='lead'` queue row, the consumer's `triggerData` passes `leadId` = `entity_id` and `eventId=null`. Verified by reading the EF logs OR by inserting a test rule whose `recipient_type='trigger_lead'` and checking that `crm_automation_runs.trigger_data->>'leadId'` matches the entity_id.
- For an `entity_type='event'` queue row, the consumer's `triggerData` passes `eventId` = `entity_id` and `leadId=null`.
- Queue rows are marked `consumed_at = now()` after successful processing.

### 4.4 Smoke (demo only — see §6)

7/7 smoke tests pass (baseline + 5 SPEC-specific cases below).

### 4.5 File / line / commit metrics

- 1 new migration file under `supabase/migrations/`, named `<ts>_m4_status_trigger_framework_extension.sql`, ≤ 350 lines (Iron Rule 12).
- `engine.ts` post-edit: ≤ 350 lines.
- `crm-rule-editor.js` post-edit: ≤ 350 lines.
- `crm-automation-engine.js` post-edit: ≤ 350 lines.
- 4–6 commits per Brief §3.1 commit budget.
- `npm run verify:integrity` exit 0 or 2 before each commit (Iron Rule 31).
- `git status` clean at SPEC end.

---

## 5. Implementation Plan

### 5.1 Step 1 — DB migration

Create `supabase/migrations/<ts>_m4_status_trigger_framework_extension.sql`. Wrap in `BEGIN; ... COMMIT;`.

Contents (additive only):

1. **`lead_status_change_event_fn()`** — SECURITY DEFINER, `search_path = public, pg_temp`. Mirrors attendee fn but payload is `{phone, source}` (the two columns most relevant for a lead-status downstream consumer).
2. **`event_status_change_event_fn()`** — same shape; payload is `{event_date, event_name}`.
3. **`trg_lead_status_change_event`** — `AFTER UPDATE OF status ON crm_leads FOR EACH ROW EXECUTE FUNCTION lead_status_change_event_fn()`.
4. **`trg_event_status_change_event`** — `AFTER UPDATE OF status ON crm_events FOR EACH ROW EXECUTE FUNCTION event_status_change_event_fn()`.
5. **4 INSERT rows** into `crm_trigger_type_registry`:
   - demo + lead → trigger_type_slug=`lead_status_change`, display_name_he='שינוי סטטוס ליד', display_icon='🧑'
   - prizma + lead → same
   - demo + event → trigger_type_slug=`event_status_change`, display_name_he='שינוי סטטוס אירוע', display_icon='📅'
   - prizma + event → same
   - `allowed_condition_types` left at default array (`status_equals`, `status_changed_from`, `status_changed_to`)
6. `COMMENT ON FUNCTION`/`COMMENT ON TRIGGER` for each new object, referencing this SPEC slug.

Apply via `mcp__claude_ai_Supabase__apply_migration`. Verify C1–C5 in §4.1 immediately after.

### 5.2 Step 2 — Consumer entity-aware payload shaping (`engine.ts`)

`consumeStatusChangeEvents` currently hardcodes `attendeeId: e.entity_id` and reads `lead_id`/`event_id` from `payload`. Replace the `triggerData` construction (around line 293) with an entity-aware switch:

```ts
const payload = (e.payload && typeof e.payload === "object") ? e.payload : {};
let triggerData: Record<string, unknown>;
if (e.entity_type === "attendee") {
  triggerData = {
    oldStatus: e.old_status,
    newStatus: e.new_status,
    status: e.new_status,
    attendeeId: e.entity_id,
    leadId: typeof payload.lead_id === "string" ? payload.lead_id : null,
    eventId: typeof payload.event_id === "string" ? payload.event_id : null,
  };
} else if (e.entity_type === "lead") {
  triggerData = {
    oldStatus: e.old_status,
    newStatus: e.new_status,
    status: e.new_status,
    leadId: e.entity_id,
    eventId: null,
    attendeeId: null,
    phone: typeof payload.phone === "string" ? payload.phone : null,
    source: typeof payload.source === "string" ? payload.source : null,
  };
} else if (e.entity_type === "event") {
  triggerData = {
    oldStatus: e.old_status,
    newStatus: e.new_status,
    status: e.new_status,
    eventId: e.entity_id,
    leadId: null,
    attendeeId: null,
    eventDate: typeof payload.event_date === "string" ? payload.event_date : null,
    eventName: typeof payload.event_name === "string" ? payload.event_name : null,
  };
} else {
  // Unknown entity_type — mark consumed, skip evaluate (parity with unregistered-entity branch).
  await db.from("crm_status_change_events")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", e.id).eq("tenant_id", tenantId);
  processed++;
  continue;
}
```

No other changes to the consumer. The registry lookup, evaluate-call, and consumed_at mark remain intact.

### 5.3 Step 3 — Browser engine comment parity (`crm-automation-engine.js`)

Add a one-line comment under the existing `attendee_status_change` comment block explaining that `lead_status_change` and `event_status_change` are now ALSO routed through the queue (as of this SPEC date) in addition to the in-process direct dispatch. No functional changes — the browser file never invokes the consumer.

### 5.4 Step 4 — Rule editor UI extension (`crm-rule-editor.js`)

Edit `COND_BY_BOARD` to:

```js
var COND_BY_BOARD = {
  incoming:  [['always','תמיד (כל ליד חדש)'], ['source_equals','מקור הליד שווה ל-']],
  tier2:     [['status_equals','סטטוס ליד משתנה ל-'], ['status_changed_from','סטטוס ליד לפני השינוי הוא'], ['status_changed_to','סטטוס ליד אחרי השינוי הוא']],
  events:    [['status_equals','סטטוס אירוע משתנה ל-'], ['status_changed_from','סטטוס אירוע לפני השינוי הוא'], ['status_changed_to','סטטוס אירוע אחרי השינוי הוא'], ['count_threshold','ספירה עוברת סף']],
  attendees: [['status_equals','סטטוס הרשמה הוא']]
};
```

Verify the existing `_validate(s)` block at line 309 already covers the new condition types (it does — `needsStatusValue` already lists `status_changed_from` and `status_changed_to`).

### 5.5 Step 5 — Deploy + verify

Deploy `automation-engine` via `mcp__claude_ai_Supabase__deploy_edge_function`. Test C3 (consumer responds to consume_status_events).

### 5.6 Step 6 — Smoke + commit + push

See §6 for smoke. Commit groups (4–6 commits):

1. `feat(m4,crm): add lead+event status_change DB triggers (migration)` — migration only
2. `feat(m4,crm,ef): make automation-engine consumer entity-aware` — engine.ts
3. `chore(m4,crm,js): mirror queue-routing comment in browser engine` — crm-automation-engine.js
4. `feat(m4,crm,ui): surface status_changed_from/to on lead+event boards` — crm-rule-editor.js
5. `chore(m4): deploy automation-engine EF` — (no file change; CHANGELOG note only) — OR skipped if commit 2 includes the deploy step
6. `docs(m4): note framework extension in SESSION_CONTEXT` — SESSION_CONTEXT.md update

---

## 6. Smoke Plan (demo tenant only)

The localhost-tester executes these after the executor signals SPEC complete. All on demo (`tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'`).

### Baseline (2 cases)
1. **PIN auth still works on demo** — `baseline.test.mjs`.
2. **CRM lead create + read RLS still works** — `baseline.test.mjs`.

### SPEC-specific (5 cases)
3. **Lead status producer fires.** UPDATE a demo lead `status` from `'new'` → `'callback'`. Verify exactly 1 new row in `crm_status_change_events` with `entity_type='lead'`, `entity_id`=lead.id, `old_status='new'`, `new_status='callback'`, `payload->>'phone'` matches the lead's phone. Restore to `'new'` after (which inserts a second row — acceptable, both attributable to smoke).
4. **Event status producer fires.** UPDATE a demo event `status` from `'planning'` → `'will_open_tomorrow'` (a transition the operator UI offers). Verify 1 new row with `entity_type='event'`, payload contains `event_date` + `event_name`. Restore to `'planning'`.
5. **No-op UPDATE inserts nothing.** UPDATE a lead with `status='new'` to `status='new'`. Verify queue row count for this entity is unchanged. Same for event.
6. **Consumer entity routing works end-to-end.** Insert a test automation rule on demo (`trigger_entity='lead'`, `trigger_event='status_change'`, `trigger_condition={type:'status_changed_to', status:'callback'}`, `action_type='send_message'`, channel sms, recipient `trigger_lead`, template = an existing demo lead-status template). Trigger by changing a demo lead's status to `'callback'` (must be one of the whitelisted phones — `0537889878`, `0503348349`, `0507168471`). Wait for cron tick (≤ 65s) OR POST `mode='consume_status_events'` directly. Verify a row appears in `crm_automation_runs` with `trigger_type='lead_status_change'` and `trigger_data->>'leadId'` = the lead.id. Verify `crm_status_change_events.consumed_at` set. **Then delete the test rule and revert the lead.**
7. **Rule editor UI shows new options.** Open `crm.html` → Automations tab → "New rule" → select `tier2` board → confirm the "מתי החוק יופעל?" dropdown now lists three options (`status_equals`, `status_changed_from`, `status_changed_to`). Repeat for `events` board. NO functional rule save in this smoke — just visual verification.

**Cleanup:** any test rule created in §6.6 is deleted at smoke end. Any lead status flips are reverted to their pre-smoke status. Any event status flips reverted. No persistent demo writes from this smoke.

**Stop trigger for smoke:** if §6.6 fails to produce a `crm_automation_runs` row within 90s after the consume_status_events POST, escalate. Likely cause = consumer entity-routing bug; needs executor debug.

---

## 7. Autonomy Envelope

The executor CAN, without asking:
- Apply the migration with `apply_migration`.
- Edit the 3 listed JS/TS files within their stated scope.
- Deploy the EF.
- Run the smoke commands.
- Commit + push to `develop`.
- Group commits as listed in §5.6 OR slightly differently if a logical grouping fits better, as long as total commits stay between 4 and 6.

The executor MUST stop and escalate if:
- Any new DB collision surfaces (a name already exists). The pre-flight in §0 showed zero — if reality differs, that's a deviation.
- The migration's transaction fails on any statement (no partial-state allowed).
- `npm run verify:integrity` reports null bytes (Iron Rule 31, exit 1).
- A smoke test fails 3 times — escalate per Brief §2.7.
- Any source file approaches the 350-line cap (Iron Rule 12). Refactor scope-extension is out of bounds.
- The EF deploy fails (the queue would silently break if old EF runs against new DB triggers — STOP).

---

## 8. Stop-on-Deviation Triggers

Beyond the autonomy envelope:
- `crm_status_change_events.payload` for the new triggers contains anything unexpected (e.g., wrong keys, null tenant_id).
- The new triggers fire on tables OTHER than the intended one (sanity-check `pg_trigger.tgrelid`).
- Any change to an existing rule, an existing crm_statuses row, an existing event, or any Prizma data row.

---

## 9. Out of Scope (explicit)

- Migrating any of the 6 active in-process triggers (`event_status_change`, `lead_status_change`, etc.) OFF their direct dispatch path. Both paths run in parallel after this SPEC.
- Adding `purchased`/`cancelled` event slug (STATUS_MODEL §6.2). Separate slug-cleanup work.
- Refactoring `engine.ts` shape beyond the entity-aware switch.

---

## 10. Expected Final State

- 1 new migration file in `supabase/migrations/`.
- `engine.ts` updated, deployed.
- `crm-automation-engine.js` has 1 added comment line.
- `crm-rule-editor.js` updated with extended `COND_BY_BOARD`.
- `crm_trigger_type_registry` rowcount = 6.
- New triggers fire on lead + event status transitions and produce queue rows.
- Smoke 7/7 green.
- 4–6 commits on `develop`. Working tree clean.

---

## 11. Rollback

If the SPEC needs full rollback:

```sql
-- Demote to the safety tag's baseline:
DROP TRIGGER IF EXISTS trg_lead_status_change_event ON crm_leads;
DROP TRIGGER IF EXISTS trg_event_status_change_event ON crm_events;
DROP FUNCTION IF EXISTS lead_status_change_event_fn();
DROP FUNCTION IF EXISTS event_status_change_event_fn();
DELETE FROM crm_trigger_type_registry WHERE entity_type IN ('lead','event');
```

Then `git reset --hard pre-overnight-m4-r2-2026-05-14` + force-push.

A partial rollback (DDL only, leaving JS in place) is safe because the rule editor's new condition options simply have no producers backing them — rules saved with those condition types would never fire. Acceptable transient state if needed.

---

## 12. Lessons Already Incorporated

- **Cross-Reference Check completed 2026-05-14 against live DB:** 0 collisions on the 4 new DB names; 0 collisions in `docs/GLOBAL_MAP.md` / `MODULE_MAP.md` (no functions registered yet for these names).
- **Pre-flight discipline (per `M4_REMOVE_CONFIRMED_VERIFIED` lesson, 2026-05-14):** all 7 stated Brief assumptions verified against live state in §0. The Brief's literal UI wording (`fires_on` sub-picker) was found to be slightly off vs the codebase's actual UI structure; §0 documents the reframe.
- **Baselines as symbols (per MIGRATION_2 lesson, 2026-05-11):** §0 lists `BASE_REGISTRY_ROWS`, `BASE_TRIGGERS_ON_LEADS`, etc.; §4 references them numerically.
- **Iron Rule 32 — destructive ops declared `None.` in §3.** Any deviation = escalation.

---

*End of SPEC.*
