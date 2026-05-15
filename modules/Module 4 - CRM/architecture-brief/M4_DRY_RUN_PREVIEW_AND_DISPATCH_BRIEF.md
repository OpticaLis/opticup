# M4 Dry-Run Preview + Manual Recipient Curation + Queue Cancellation — Brief

**Brief version:** v1
**Date:** 2026-05-14 (overnight)
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Full Auto Pipeline (single Claude Code chat, overnight, ~10-12 hours)
**Model preference:** Opus (complex multi-file feature, production-impacting UX redesign)
**Owning module:** Module 4 — CRM
**Mode:** Multi-phase feature build with localhost-tester gate. Daniel reviews in the morning.

---

## 1. Purpose

Today the CRM has two automation engines:
- **Legacy (client-side)** — fires through `CrmAutomationClient.evaluate(...)` from operator-driven UI flows. Shows a preview modal (`CrmConfirmSend`) listing recipients + per-recipient message text + an "Approve / Cancel" decision before dispatch. This is the "confirmation gate" Daniel relies on (memory: `project_confirmation_gate.md`).
- **Queue (server-side)** — fires through `crm_status_change_events` queue → `automation-engine` EF (mode=consume_status_events) → `crm_message_queue` → `dispatch-queue` EF → Make. NO preview. Background dispatch.

The previous Brief (`M4_LEGACY_DISPATCH_DECOMMISSION_BRIEF`) tried to retire the legacy engine. It correctly stopped before any code change because the queue engine has no preview path — removing legacy would lose Daniel's mandatory operator-approval gate.

This Brief is the right way to converge: build the preview capability into the queue engine + add manual recipient curation + per-message body preview + queue-side cancellation. Once that's done, a future Brief can retire the legacy engine cleanly.

---

## 2. Daniel's Locked Decisions (chat 2026-05-14)

| # | Topic | Decision |
|---|---|---|
| 1 | Approach | Build `dry_run` mode into the queue engine. The same engine answers both "show me the preview" and "actually dispatch", swung by a `mode` parameter. No two parallel engines long-term. |
| 2 | Preview content | Show full recipient list AND per-recipient final message body (not just template text). Operator clicks an entry to see the exact body that recipient will receive. |
| 3 | Manual recipient curation | Operator can search recipients (name/phone/email) within the preview list AND deselect individual recipients before dispatch. Deselected recipients are skipped in this send only — no permanent change to their lead status or any other state. |
| 4 | "Reverse selection" pattern | OUT OF SCOPE — Daniel explicitly excluded. Default selection state is "all selected"; operator deselects individuals. |
| 5 | Cancellation after dispatch | Reuse the existing message queue. Dispatching = INSERT into `crm_message_queue` with `scheduled_at=now`. Cron drains the queue. Operator's "cancel send" simply UPDATEs queue rows to `status='cancelled'` for rows not yet processed. The window is naturally the full dispatch duration (~20 min for ~1,200 messages at 1 msg/sec), not a synthetic 30-second hold. |
| 6 | Test-send pattern | Before full dispatch, operator can send to a "first 3" subset to sanity-check rendering. The first 3 are a deterministic subset (e.g., first 3 alphabetically, OR explicitly hand-picked by operator). |
| 7 | Include ALL quality-of-life improvements | All 6 minor improvements from chat (incremental count display, in-list search, quick filters, per-recipient bubble with last-message history, session-saved selections, message history per recipient). |

---

## 3. Scope — Eleven Work Areas

### 3.1 Add `mode='dry_run'` to `automation-engine` EF

Today the EF supports `mode='evaluate'` (which is essentially `dry_run` for rule evaluation but doesn't return per-recipient final bodies), and `mode='consume_status_events'`. Extend with `mode='dispatch_preview'`:

- Resolves recipients (same logic as dispatch — tier1/tier2/leads_by_status filters, allowlist gates).
- For each recipient, builds the FINAL message body — same variable substitution, same URL token generation, same template selection. The only difference: NO INSERT into `crm_message_queue`, NO INSERT into `crm_message_log`.
- Returns JSON: `{ recipients: [{ lead_id, full_name, phone, email, message_body_sms, message_body_email, last_message_sent_at }], rule_id, template_slug, channels: [...] }`.

This is the foundation everything else depends on.

### 3.2 Refactor the existing `CrmConfirmSend` modal to consume the new dry_run output

Today the modal renders previews built client-side via `CrmAutomationClient`. Refactor it to call the EF's new `dispatch_preview` mode and render the response. Keep the same operator UX (open modal → see list → approve/cancel) but the data source is now server-authoritative.

### 3.3 Per-recipient body preview

Click on any recipient row in the modal → expand to show that recipient's exact final message body (already in the dry_run response). Collapsible. No second API call (data is already loaded).

### 3.4 In-list search

Top of the modal: search input. Filters the recipient list in real-time by full_name OR phone OR email (case-insensitive, substring). Client-side filter only — no API call. Recipients are typically 100-2000, easy to filter in browser.

### 3.5 Manual recipient deselection

Each recipient row has a checkbox (default checked). Operator can uncheck individuals. The deselected list is captured in client state. On dispatch, the EF is called with `mode='dispatch'` + `exclude_lead_ids=[...]` and skips those.

### 3.6 Test-send to first 3

Button in modal: "Send test to first 3". Sends ONLY to the first 3 recipients (alphabetically by full_name, stable). After the test, modal stays open. Operator inspects whether the 3 test recipients received the message correctly, then clicks "Send to remaining N" for the rest.

### 3.7 Queue-side cancellation

After full dispatch:
- Toast: "🟢 X messages queued — delivering over ~Y minutes. [Cancel send]".
- "Cancel send" button → confirm dialog → UPDATEs `crm_message_queue` SET `status='cancelled', error_message='operator_cancelled'` WHERE `broadcast_id = <this_send_id>` AND `processed_at IS NULL`.
- Toast updates: "🟡 Cancelled K of N pending. M already delivered (cannot recall)."

### 3.8 Quality-of-life: incremental count display

When modal opens, before recipient list resolves, show: "Computing recipients... 🔄". As soon as the count is known, show: "1,187 recipients found. Loading details...". When fully loaded: "1,187 recipients (1,187 selected)".

### 3.9 Quality-of-life: quick filters

Above the recipient list, 3-4 quick-filter chips:
- "All" (default)
- "Last 30 days only" (lead.created_at >= now() - interval '30 days')
- "No previous event registration" (lead has 0 attendees on completed events)
- "Customers" (lead has 1+ attended events) — disabled if no such status yet

Operator clicks chip → applies filter on the current recipient list (additive: chip + search both apply).

### 3.10 Quality-of-life: per-recipient message history

In the per-recipient body preview (§3.3), add a small line: "Last message sent: <date> — <template_slug>". Helps the operator spot "we just sent this person yesterday, maybe skip".

### 3.11 Quality-of-life: session-saved selections + history

If operator closes the modal accidentally and reopens for the same rule + same operator action, the previously-curated selection persists (sessionStorage). Cleared on dispatch or explicit "reset".

---

## 4. Safety Envelope — Non-Negotiable

### 4.1 Pre-run safety tag
First action:
```
git tag -a pre-dry-run-preview-2026-05-14 -m "Pre-dry-run-preview baseline"
git push origin pre-dry-run-preview-2026-05-14
```

### 4.2 Test-recipient whitelist (HARD GATE)
Any test message sent during this run MUST go to these recipients ONLY:
- **Phones:** `0537889878`, `0503348349`, `0507168471`
- **Emails:** `daniel@prizma-optic.co.il`, `alkimovich94@gmail.com`

Demo tenant allowlist verification BEFORE the first dispatch. If allowlist drift → STOP, escalate. Do NOT update allowlists autonomously.

### 4.3 Tenant write rules
- Demo tenant ONLY for all testing.
- Zero writes to Prizma rows of any kind throughout. The new EF mode + UI code lands on develop; no Prizma DML occurs.

### 4.4 Localhost requirement
The run requires `http://localhost:3000` (ERP) running. Daniel starts it manually via `scripts/start-local.ps1` before the run. If unreachable on first health check + 1 retry → STOP, escalate.

### 4.5 DDL rules
- NO DDL expected. The feature builds on existing tables + EF. If a column addition seems needed (e.g., `crm_message_queue.cancelled_by_user_id` for audit), STOP, escalate, ask Architect.
- ONE exception pre-approved: if the existing `crm_message_queue` schema doesn't already have `error_message` accepting `'operator_cancelled'` (it's a free-text column today, so this should be fine), no DDL is needed.

### 4.6 Iron Rules
Rules 31, 32, 12, 15, 21, 22 enforced.

### 4.7 Time budget
No hard cap. Quality > speed. ~10-12 hours expected.

### 4.8 EF deployment fallback
If MCP `deploy_edge_function` returns `InternalServerError` (OPEN-021 pattern), write `DEPLOY_FALLBACK_NEEDED.md`. Include `verify_jwt` flag value for `automation-engine` (currently `true` — confirm via `get_edge_function` BEFORE writing the fallback doc). Daniel CLI-deploys.

### 4.9 No main merge by Pipeline
Morning summary explicitly tells Daniel: "Review the modal in localhost yourself before merging." Pipeline owns 100% of verification correctness; merge decision is Daniel's.

### 4.10 Escalation
If blocked by an architectural choice (e.g., the in-list search needs to fetch full lead data and `crm_leads` columns aren't exposed in the right shape), write `modules/Module 4 - CRM/escalations/{ISO_TS}_DRY_RUN_PREVIEW_BLOCKER.md`. Continue with other work areas if possible.

---

*Continues in Brief Part 2 — Phases, Smoke, Communication. See same folder.*

---

## 5. Phases of Work

### Phase 1 — Discovery + UX sketch (~45 min)
- Map every call site of `CrmAutomationClient.evaluate` + `CrmConfirmSend` open paths.
- Document the existing modal's exact behavior (today's truth) — what it shows, in what order, what data sources.
- Verify the new dry_run output shape will satisfy all displayed fields. If gaps → escalate.

### Phase 2 — EF dry_run mode (~2 hours)
- Add `mode='dispatch_preview'` to `automation-engine` EF.
- Reuse existing recipient resolution + variable substitution. Return JSON.
- Deploy EF (via MCP, CLI fallback if needed).
- Smoke: call EF in dry_run for a real demo rule. Verify recipients + bodies populated. Verify ZERO writes to `crm_message_queue`.

### Phase 3 — Modal refactor (~2 hours)
- `CrmConfirmSend` consumes EF dry_run response.
- Renders the new shape.
- Existing modal "Cancel" / "Approve" buttons still work.

### Phase 4 — In-list search + per-recipient body preview + checkboxes (~2 hours)
- Add search input, recipient checkboxes (default checked), expand-on-click body preview.
- Captured "exclude_lead_ids" passed to dispatch on approve.

### Phase 5 — Test-send to first 3 (~1 hour)
- New button in modal.
- Calls EF in dispatch mode with `recipient_subset=[first 3 lead_ids]`.
- Modal stays open. After return: "Test sent to 3 recipients. Inspect, then approve full send."

### Phase 6 — Queue-side cancellation (~1.5 hours)
- After approve: dispatch issues a `broadcast_id` (or reuse existing concept) so all rows in `crm_message_queue` share the ID.
- Toast: "Cancel send" button.
- On click: UPDATE rows WHERE broadcast_id=X AND processed_at IS NULL → status='cancelled'.

### Phase 7 — Quality-of-life additions (~2 hours)
- Incremental count display.
- Quick filter chips.
- Per-recipient last-message line.
- Session-saved selections.

### Phase 8 — Full regression smoke (~1 hour)
- Walk every existing modal call site one more time on demo.
- Confirm no regression. Capture artifacts.

### Phase 9 — Morning summary
- Write `modules/Module 4 - CRM/docs/audits/DRY_RUN_PREVIEW_SUMMARY_2026_05_14.md`.
- Per-phase results + smoke artifacts + go/no-go verdict.

---

## 6. Localhost-Tester Verification Per Phase

For each phase that touches UI, the localhost-tester opens Chrome MCP, performs the operator action, and captures:
1. The screen state (DOM snapshot or screenshot via Chrome MCP).
2. The DB chain (queue rows, log rows).
3. The recipient inbox (whitelisted phones receive correctly).
4. The cancellation chain (cancel button → DB rows flipped → no further dispatch).

All 4 verified per phase = green for that phase.

---

## 7. Pipeline Selection

Standard Full Auto Pipeline:
- `opticup-strategic` Foreman authors per-phase SPECs.
- `opticup-executor` implements.
- `opticup-localhost-tester` runs Chrome MCP smokes.
- `opticup-reviewer` audits the diff.
- `opticup-strategic` Foreman-Review closes per-phase.

Opus model. Stakes are high — this is the operator's daily-driver workflow.

---

## 8. Communication

English status updates between phases. ONE concise English summary at the end pointing Daniel to:
- The morning summary file path.
- Per-phase MIGRATED / ESCALATED / SKIPPED state.
- Pipeline's go/no-go verdict.
- Top 3 takeaways.
- Whether the next Brief (`M4_LEGACY_DISPATCH_DECOMMISSION_v2`) is now unblocked.

---

*End of Brief.*
