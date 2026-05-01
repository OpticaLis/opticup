# FINDINGS — PRE_CUTOVER_QA_A_DATA_AND_LOGIC

> Findings logged during execution that are NOT part of this SPEC's scope but
> deserve a follow-up. Format: one entry per finding, with severity, location,
> description, and suggested next action.
> See `.claude/skills/opticup-executor/references/FINDINGS_TEMPLATE.md`.

---

## F1 — RPC `next_crm_event_number` does not filter `is_deleted`

**Severity:** MEDIUM
**Location:** Postgres function `public.next_crm_event_number(uuid, uuid)`; source captured during B6 execution.
**Discovered while:** verifying `next_crm_event_number(prizma, supersale)` would return 1 after soft-deleting 6 prizma QA events.

**Description.** The RPC computes `MAX(event_number) + 1` over ALL `crm_events` rows, ignoring `is_deleted`. After the soft-delete attempted in B6 step 1, the RPC kept returning 98392 because the soft-deleted row at event_number=98391 still satisfied `MAX`. Combined with the `UNIQUE (tenant_id, event_number)` constraint that also includes soft-deleted rows, the two pieces are consistent — the RPC's behavior is protecting against UNIQUE collisions.

This is the root cause that forced the cascade hard-delete in B6 (Daniel's choice — Option 1 in the live conversation). Without it, soft-delete would have been the natural pre-cutover hygiene path.

**Suggested next action.** A standalone post-cutover SPEC should evaluate two paths and let Daniel pick:
1. Modify the RPC to filter `WHERE is_deleted = false` AND change `UNIQUE (tenant_id, event_number)` to a partial `UNIQUE INDEX ... WHERE is_deleted = false` so collisions only fire among live rows. This is a cleaner schema model.
2. Keep the schema as-is and accept hard-delete as the only path for "reset numbering". The new SPEC documents this in `CONVENTIONS.md`.

Path #1 is cleaner long-term; path #2 ships nothing. Daniel's call.

---

## F2 — 6 satellite tables FK-reference `crm_events.id`; no documented cascade policy

**Severity:** MEDIUM
**Location:** `information_schema.table_constraints` query during B6.
**Discovered while:** the events DELETE blocked on FK from `crm_message_log`.

**Description.** The 6 FKs that point at `crm_events.id`:
- `crm_message_log.event_id` (119 prizma rows referenced the 6 deleted events)
- `crm_message_queue.event_id`
- `crm_lead_notes.event_id`
- `crm_event_status_history.event_id`
- `short_links.event_id` (123 prizma rows)
- `crm_event_attendees.event_id`

All are non-CASCADE (i.e., DELETE on `crm_events` is blocked unless dependents are removed first). For QA cleanup that is exactly the right behavior — accidental cascade-delete would silently destroy message audit history. But there is no operator-facing path that does the right cascade in user-visible flows.

**Suggested next action.** Add a `delete_event_cascade(event_id)` RPC OR document in a new "Event-deletion runbook" in `modules/Module 4 - CRM/docs/runbooks/` that lists the 6 satellite tables and the order to clean them. Useful both for operator self-service and for future cleanup SPECs. Not blocking for cutover.

---

## F3 — 16 templates have hardcoded Waze URL — future migration to `%waze_url%`

**Severity:** LOW
**Location:** 16 rows in `crm_message_templates` (8 unique slugs × 2 tenants) + 7 source files in `campaigns/supersale/MESSAGES_V2/`.
**Discovered while:** B7 plumbing pre-recon.

**Description.** The literal `https://waze.com/ul/hsv8s5h2c3` appears hardcoded in:
- `event_2_3d_before_email_he`
- `event_attendee_moved_paid_email_he`
- `event_attendee_moved_unpaid_email_he`
- `event_coupon_delivery_email_he`
- `event_day_email_he`
- `event_day_sms_he`
- `event_registration_confirmation_email_he`
- `lead_intake_new_email_he`

B7 plumbing (this SPEC) wires `%waze_url%` end-to-end so templates that adopt it can use the cascade `event.location_waze_url → tenant.ui_config.default_waze_url`. The 16 hardcoded literals continue to render the same URL to customers — no functional regression.

**Suggested next action.** Post-cutover, when §7 V2 sealed-copy lock lifts (or via a Daniel-approved targeted lift for this single change), replace each hardcoded `https://waze.com/ul/hsv8s5h2c3` with `%waze_url%` in both the live DB rows and the `MESSAGES_V2/` source files. Then any event with a custom `location_waze_url` will surface the right link to its registrants. Estimated 30 minutes of DB UPDATE + git diff verification.

---

## F4 — `tenants.ui_config` is freeform JSONB; no schema for valid keys

**Severity:** LOW
**Location:** `tenants.ui_config` column (existed pre-SPEC).
**Discovered while:** B7 column choice.

**Description.** Demo's `ui_config` had 4 color tokens (`--color-primary-*`); prizma was empty `{}`. We added `default_waze_url` to both. There is no enum/schema documenting which keys are valid in `ui_config`, which means future tenants could end up with inconsistent shapes (e.g. "default_waze" vs "default_waze_url" vs "wazeDefault").

**Suggested next action.** A future tenant-config SPEC should:
1. Promote display defaults to a typed structure (either a separate `tenant_display_defaults` table with named columns, OR a JSON Schema validator running in a CHECK constraint on `ui_config`).
2. Inventory all `ui_config` keys currently in use (after B7: 5 known — `--color-primary*` ×4 + `default_waze_url`).
3. Document the canonical key list in `docs/CONVENTIONS.md`.

Not blocking for cutover. The pattern works for now; it just won't scale to 5+ tenants without governance.

---

## F5 — SMS templates intentionally lack `%event_day_of_week%`

**Severity:** INFO
**Location:** 9 SMS templates × 2 tenants (18 rows).
**Discovered while:** B8 audit.

**Description.** Per HANDOFF §11 (line 268), SMS templates omit `%event_day_of_week%` because each substituted Hebrew weekday adds 6-8 chars and Hebrew SMS pricing is part-based with a 5-part cap from the Global SMS vendor. Daniel chose Option β in B8 to skip SMS templates this round.

**Suggested next action.** Track as a post-cutover REC (recommendation) for the Campaign Overseer: A/B-test SMS templates with vs without the day-of-week prefix on a small audience to see if engagement justifies the part bump. If Daniel approves, a future SPEC can inject `%event_day_of_week%` into the 9 SMS slugs. Not blocking; not even a bug.

---

## F6 — File `crm-automation-engine.js` at hard cap (350 lines)

**Severity:** LOW
**Location:** `modules/crm/crm-automation-engine.js`.
**Discovered while:** B4 commit produced soft-warning at 350.

**Description.** The B4 fix added 3 lines (1 line of code + 2 lines of comment). `crm-automation-engine.js` is now exactly at the 350-line hard cap (Iron Rule 12). Any future addition will trip the cap.

**Suggested next action.** A targeted split SPEC should pull `dispatchPlanDirect` (the P20 fallback dispatch path, ~35 lines starting at line 224) into a new file `crm-automation-dispatch.js`. That brings the engine to ~315 lines and gives future B-items room to land. Not blocking; current commit is at-cap, not over.

---

## F7 — Re-import of "אירוע המותגים מאי 26" is post-cutover Monday-import work

**Severity:** INFO
**Location:** N/A — workflow item, not a code site.
**Discovered while:** B6 hard-delete cascade.

**Description.** Among the 6 prizma events Daniel approved deleting, event_number=98391 ("אירוע המותגים מאי 26", `event_date=2026-05-15`, status=`waiting_list`, 2 active attendee registrations) was a real upcoming event placeholder, not pure QA. After B6 hard-delete it no longer exists.

When the storefront cuts over to the lead-intake EF on 2026-05-02/03, the operator will need to:
1. Either re-create event #1 (or whatever next number) for "אירוע המותגים מאי 26" with `event_date=2026-05-15` BEFORE Daniel re-runs the Monday import,
2. OR re-create it AFTER the Monday import and re-attach the 2 known registrants.

This is documented in the B6 commit message and in the cutover runbook. Not part of this SPEC.

**Suggested next action.** Cutover-day checklist (Daniel's, not the executor's) should include "create אירוע המותגים מאי 26 for 2026-05-15" as an explicit step.

---

## F8 — Live E2E (B11 §12 #6) gated on Daniel's two pending EF deploys

**Severity:** INFO (operationally, MEDIUM until deploys land)
**Location:** EFs `send-message` (Rung 1) + `lead-intake` (Rung 2).
**Discovered while:** B11.

**Description.** Per `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` line 4, Daniel was supposed to deploy these EFs manually after Rung 1+2+Rung 3 work landed (2026-04-28). As of execution (2026-05-01) they are still pending. The 7-step E2E in SPEC §12 #6 cannot autonomously run without them. Component-level DB verification (rules + templates + flags + cascade) is GREEN; live customer-flow verification is deferred.

**Suggested next action.** Daniel deploys both EFs (`supabase functions deploy send-message` + `supabase functions deploy lead-intake`) before the cutover-day operational event, then runs the §12 #6 path end-to-end. If a regression surfaces there, a follow-up SPEC opens.

---

## F9 — `tenants.payment_links["50"]` URL still pending Daniel seed

**Severity:** INFO (carried forward from prior SPEC)
**Location:** `tenants.payment_links` JSONB.
**Discovered while:** reading SESSION_CONTEXT during First Action.

**Description.** Per SESSION_CONTEXT line 4: "Daniel's `tenants.payment_links['50']` URL also pending." This is unrelated to PRE_CUTOVER_QA_A but still pending as of execution. Once Daniel sets the URL, the Pattern P12 "loud-fail when payment_url is referenced but missing" path will start succeeding for templates that reference `%payment_url_50%`.

**Suggested next action.** Daniel-only. Same window as the EF deploys (F8). Not in scope of this SPEC.

---

*End of FINDINGS.md.*
