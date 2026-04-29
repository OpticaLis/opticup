# FINDINGS — P5_V2_REBUILD_RUNG3_FEATURES

## F1 — UI smoke (toggle ON/OFF flows, capacity/fee edges, public-form auto-move) deferred

- **Severity:** MEDIUM (blocks formal Rung 3 close; doesn't block cutover since the auto-move path is RPC-only and tested at DB level)
- **Location:** demo tenant, browser
- **What happened:** No headless browser available in this session. The dialog's UI clickthrough paths (events-detail row click → toggle off / on / paid branch / unpaid branch / capacity-full target / fee-mismatch warning) need a human operator on `localhost:3000/crm.html?t=demo`.
- **Suggested action:** Daniel runs the smoke after his EF deploys land. The 7 UI scenarios in SPEC §3 #19-#25 are explicit; pass/fail tracked there.

## F2 — Documentation drift consolidating across Rung 1 / Rung 2 / micro-SPEC / Rung 3

- **Severity:** LOW (informational debt, not functional)
- **Location:** `modules/Module 4 - CRM/docs/db-schema.sql`, `MODULE_MAP.md`
- **What happened:** Across the 4 SPECs in this session, no module-doc commits landed. Outstanding:
  - `tenants.payment_links` JSONB column (Rung 1)
  - `crm_message_queue` UNIQUE INDEX `uq_crm_message_queue_idem` (Rung 2)
  - `attendee_moved` engine trigger semantics (Rung 2)
  - `waitlist` lead status (micro-SPEC)
  - `sync_lead_status_from_attendee` RPC (micro-SPEC)
  - `move_attendee_between_events` RPC (Rung 3)
  - 4 new automation files: `crm-automation-recipient-resolvers.js`, `crm-automation-queue-send.js`, `crm-attendee-move.js`, `dispatch.ts` (lead-intake)
- **Suggested action:** A single docs-cleanup commit at the end of the cutover SPEC (P7) that batches all doc-merge work into MODULE_MAP and db-schema.sql. Defer until cutover smoke confirms everything works as designed — saves rework if anything changes.

## F3 — `cancelled_moved` slug not added (used `cancelled` instead)

- **Severity:** INFO
- **Location:** `crm_statuses.attendee` enum
- **What happened:** SPEC §13.1 used Hebrew `מבוטל-עבר` for the source-close status. I used the existing English `cancelled` slug + `cancelled_at` timestamp (preserves audit chain via activity_log + the action='crm.attendee.moved' entry). If Daniel wants reporting to distinguish manual move from regular cancel, add a `cancelled_moved` slug (1-row INSERT + map in sync RPC).
- **Suggested action:** Optional 1-line micro-SPEC — defer until cutover or until Daniel asks. Not needed for cutover correctness.

---

*End of FINDINGS — 3 findings, 1 medium (UI smoke), 2 low/info.*
