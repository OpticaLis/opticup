# SPEC — M4_DRY_RUN_PREVIEW_AND_DISPATCH

**Type:** Feature build (Module 4 — CRM)
**Mode:** Full Auto Pipeline (overnight, single Claude Code chat, Opus model)
**Brief:** `modules/Module 4 - CRM/architecture-brief/M4_DRY_RUN_PREVIEW_AND_DISPATCH_BRIEF.md`
**Author:** Foreman (opticup-strategic), 2026-05-14
**Start commit:** `6e64118`
**Master safety tag:** `pre-dry-run-preview-2026-05-14` @ `6e64118`

---

## 0. Pre-Authoring Reality Check (Phase 1 Discovery)

| Check | Result |
|---|---|
| `CrmAutomationClient.evaluate` exists | ✅ `modules/crm/crm-automation-client.js:36` (130 lines total) |
| `CrmConfirmSend.show` exists | ✅ `modules/crm/crm-confirm-send.js:209` (302 lines total — within Iron Rule 12 cap, slim headroom) |
| `automation-engine` EF modes today | `evaluate` + `dispatch` + `consume_status_events` (`engine.ts:103`, `index.ts:69`) |
| `crm_message_queue.broadcast_id` exists | ❌ NO. But `run_id` (uuid, nullable) exists and is shared across all rows of one dispatch — verified: a 2026-05-12 Prizma dispatch wrote 2292 rows under a single `run_id` |
| Plan_items shape today | One item per (lead, channel) pair with `composedBody` already substituted; `recipient: {name, phone, email}`; `lead_id`, `event_id`, `run_id`, `variables`, `template_slug`, `channel`, `language` |
| Demo SMS allowlist | `+972537889878`, `+972503348349`, `+972507168471` — exact match with Brief §4.2 |
| Demo email allowlist | `daniel@prizma-optic.co.il`, `alkimovich94@gmail.com`, `danylis92@gmail.com` — superset of Brief §4.2 (1 extra Daniel-shaped handle). Pre-existing finding documented in `escalations/2026-05-14T00-15Z_LEGACY_DISPATCH_DECOMMISSION_ALLOWLIST_SUPERSET.md`. Pipeline discipline: test sends address only the 2 Brief-listed emails. |
| `send-message` EF allowlist gate | Fail-CLOSED at `supabase/functions/send-message/allowlists.ts:34,58` — safe by design |
| `automation-engine` verify_jwt today | (to be verified before deploy fallback writeup) |
| Iron Rule 31 (integrity) at start | ✅ exit 0 — 93 files scanned, all clear |

### Baselines (used in §3 success criteria)

| Symbol | Value | Source |
|---|---|---|
| `BASE_CONFIRM_SEND_LINES` | 302 | `modules/crm/crm-confirm-send.js` |
| `BASE_AUTOMATION_CLIENT_LINES` | 130 | `modules/crm/crm-automation-client.js` |
| `BASE_ENGINE_INDEX_LINES` | 128 | `supabase/functions/automation-engine/index.ts` |
| `BASE_ENGINE_TS_LINES` | 336 | `supabase/functions/automation-engine/engine.ts` |
| `BASE_PREPARE_PLAN_LINES` | 183 | `supabase/functions/automation-engine/prepare-plan.ts` |
| `BASE_QUEUE_ROW_COUNT_DEMO` | (query at Phase 8) | `SELECT COUNT(*) FROM crm_message_queue WHERE tenant_id=demo` |
| `BASE_QUEUE_ROW_COUNT_PRIZMA` | (query at Phase 8) | `SELECT COUNT(*) FROM crm_message_queue WHERE tenant_id=prizma` |

### Cross-Reference Check (Rule 21)

New symbols introduced by this SPEC:
- EF mode literal `'dispatch_preview'` — verified 0 hits across `supabase/functions/`, `modules/crm/`, and `docs/`.
- Top-level shape field `recipients_by_lead` — verified 0 hits.
- New EF parameters: `exclude_lead_ids`, `recipient_subset` — verified 0 hits in EF source.
- Modal client state field `_selectionState` — verified 0 hits.
- sessionStorage key `crm_confirm_send_selection_v1` — verified 0 hits.

Existing concept being **reused** rather than re-introduced:
- `crm_message_queue.run_id` plays the role of "broadcast_id" per Brief §3.7 "(or reuse existing concept)". No DDL.

0 collisions. Sweep complete 2026-05-14 against GLOBAL_SCHEMA.

---

## 1. Goal

Build a server-authoritative dispatch-preview path into the `automation-engine` Edge Function and the `CrmConfirmSend` modal so the operator sees the FINAL message bodies (per recipient), can search / deselect / quick-filter / test-send / cancel-after-dispatch, before any message leaves the queue. Deliverables converge on what the Brief calls "the right way to retire the legacy engine cleanly" — but legacy retirement itself is OUT OF SCOPE and deferred to a future `M4_LEGACY_DISPATCH_DECOMMISSION_v2`.

---

## 2. Scope — 11 Work Areas Per Brief §3

| # | Work area | Phase | Acceptance |
|---|---|---|---|
| 3.1 | EF `mode='dispatch_preview'` | 2 | Returns recipients-grouped JSON with per-recipient final SMS + email bodies, last-message timestamp; ZERO writes |
| 3.2 | Modal consumes dry_run output | 3 | Modal renders from EF response (server-authoritative); Cancel/Approve preserved |
| 3.3 | Per-recipient body preview | 4 | Click recipient row → expand to show that lead's exact final body (SMS + email if both channels) |
| 3.4 | In-list search | 4 | Top-of-modal input filters by name OR phone OR email (case-insensitive substring); client-side only |
| 3.5 | Manual recipient deselection | 4 | Each row has a checkbox (default checked); excluded `lead_ids` are filtered out of the plan_items passed to dispatch |
| 3.6 | Test-send to first 3 | 5 | New button: sends ONLY to the first 3 (alphabetical) recipients via fresh EF dispatch call; modal stays open afterwards |
| 3.7 | Queue-side cancellation | 6 | Post-dispatch toast with "Cancel send" button → updates `crm_message_queue` SET status='cancelled', error_message='operator_cancelled' WHERE run_id=$broadcast AND processed_at IS NULL |
| 3.8 | Incremental count display | 7 | Modal shows "Computing recipients..." → "N recipients found. Loading details..." → "N recipients (N selected)" |
| 3.9 | Quick filter chips | 7 | All / Last 30 days / No previous registration / Customers chips filter the recipient list (client-side, additive with search) |
| 3.10 | Per-recipient last-message line | 7 | Body-preview panel includes "Last message sent: <date> — <template_slug>" or "No previous messages" |
| 3.11 | Session-saved selections | 7 | sessionStorage preserves the deselection set; cleared on dispatch or explicit reset |

Explicitly excluded per Daniel's Brief §2 #4: **reverse selection** is OUT OF SCOPE.

---

## 3. Success Criteria (measurable)

### Per Phase

| Phase | Criterion |
|---|---|
| 1 | `LEGACY_DISPATCH_INVENTORY_2026_05_14.md` and this SPEC's §0 cite the same 5 callsites and 7 recipient_types; Brief assumptions verified or escalated |
| 2 | `automation-engine` EF deployed with `mode='dispatch_preview'`; demo smoke: dry_run for any active rule returns `recipients_by_lead.length ≥ 1` AND `crm_message_queue` row count delta = 0 AND `crm_message_log` row count delta = 0 |
| 3 | Modal opens via existing callsite (e.g., event-status change on demo); renders recipient names + count from EF response; Cancel + Approve both work end-to-end |
| 4 | Search filter narrows the visible list; per-recipient body expands on click and shows exact final body (both channels if applicable); checkbox unchecks 1 recipient → that lead_id is excluded from approve-dispatch (verified by `crm_message_queue` row absence) |
| 5 | "Send test to first 3" on a demo rule with ≥3 recipients → 3 messages dispatched to 3 whitelisted recipients (SMS only or SMS+email if email present); modal still open; "Send to remaining N" excludes the test-3 |
| 6 | Cancel toast appears after approve-dispatch on a demo broadcast with ≥4 recipients; click → 1 row in `crm_message_queue` flips from `queued` → `cancelled`; toast updates with K/M counts |
| 7 | All 4 QoL items visible + functional on demo: count progression, 4 chip filters, last-message line, sessionStorage persists across modal close/reopen |
| 8 | Walk every legacy callsite once on demo; no regression of pre-SPEC behavior (Cancel still cancels; Approve still dispatches; Confirm-no-notify still commits status without dispatch) |
| 9 | `docs/audits/DRY_RUN_PREVIEW_SUMMARY_2026_05_14.md` exists with per-phase MIGRATED/SKIPPED/ESCALATED state + go/no-go verdict + top 3 takeaways |

### Global

| # | Criterion |
|---|---|
| G1 | Master safety tag `pre-dry-run-preview-2026-05-14` exists locally + on origin (already created — verified) |
| G2 | Iron Rule 31 (integrity gate) exits 0 on every commit |
| G3 | Iron Rule 32 (destructive-ops gate) green every commit (§4 declares None) |
| G4 | File sizes — every touched JS/TS file ≤ 350 lines (Iron Rule 12). New `crm-confirm-send.js` may grow beyond 302 → if it crosses 320, split a helper module BEFORE crossing 350 |
| G5 | Zero Prizma writes throughout (verified by per-phase `SELECT COUNT(*) FROM crm_message_queue WHERE tenant_id=prizma_id` pre/post; counts must match) |
| G6 | All test sends route to Brief §4.2 whitelisted recipients only |
| G7 | NO merge to main by the Pipeline (verified by `git log main..develop` showing only this run's commits) |
| G8 | EF deploys go via MCP; if InternalServerError → `DEPLOY_FALLBACK_NEEDED.md` written per Brief §4.8 |

---

## 4. Destructive Operations

**None.** This SPEC is purely additive:
- Adds `mode='dispatch_preview'` to existing EF (new branch in `index.ts` + new code path in `engine.ts`).
- Adds optional `exclude_lead_ids` / `recipient_subset` parameters to existing `mode='dispatch'` (no behavior change when omitted).
- Extends `CrmConfirmSend.show()` API additively (existing 2-arg signature preserved; new optional fields on the plan source).
- New `js`/`html` content additive.
- ZERO DDL. ZERO `DROP`. ZERO `TRUNCATE`. ZERO file deletes. ZERO `git rebase` / `reset --hard` / `push --force`. ZERO main merges.

If the Executor encounters a need for ANY destructive operation mid-run → STOP, write escalation under `modules/Module 4 - CRM/escalations/{ISO_TS}_DRY_RUN_PREVIEW_BLOCKER.md`, do NOT silently amend this section.

---

## 5. Autonomy Envelope

### Can do without asking
- Implement EF + JS changes per the per-phase plans below.
- Deploy `automation-engine` EF via MCP `deploy_edge_function`; multiple version bumps acceptable (already at v8+ — Brief §4.8).
- Run smokes on demo tenant (whitelisted recipients only).
- Read `crm_message_queue` / `crm_message_log` / `crm_automation_runs` freely.
- UPDATE `crm_message_queue` to `status='cancelled'` ONLY for rows created by the Pipeline's own test broadcasts (i.e., this run's own `run_id`s).
- Commit + push to `develop` after each phase (one or more commits per phase, English commit messages).
- Update `MODULE_MAP.md`, `SESSION_CONTEXT.md`, `CHANGELOG.md` at Phase 8 close.

### Must STOP and write escalation
- Any DDL need (see §4 — Brief §4.5 hard rule).
- Any send going to a non-whitelisted recipient.
- Any prize-side write (per §3 G5).
- MCP `deploy_edge_function` returning `InternalServerError` → write `DEPLOY_FALLBACK_NEEDED.md` AND continue with other phases that don't depend on the new EF mode (e.g., still write modal scaffolding, push to develop, surface fallback in morning summary).
- Iron Rule 12 cap breach with no clean split possible.
- Any Brief assumption contradicted by live state.

---

## 6. Phase Plan

### Phase 1 — Discovery + UX sketch ✅ (done at SPEC author time)
- Output: §0 reality check + this SPEC.
- 5 legacy callsites mapped (per `LEGACY_DISPATCH_INVENTORY_2026_05_14.md`).
- Existing modal data shape understood.
- `run_id` confirmed as natural broadcast_id reuse.
- 0 DDL required (Brief §4.5 hard rule satisfied).

### Phase 2 — EF `mode='dispatch_preview'` (~2h)

**File:** `supabase/functions/automation-engine/index.ts`, `supabase/functions/automation-engine/engine.ts`, new `supabase/functions/automation-engine/preview.ts`.

**Implementation:**
1. Add `'dispatch_preview'` to the mode-allowed set in `index.ts` validation.
2. Add `preview-only` branch that calls a new `previewDispatch(db, input)` from `engine.ts`.
3. `previewDispatch` reuses `prepareRulePlan(...)` in `mode='evaluate'` to get `plan_items` (no side effects — already gated in `prepare-plan.ts:112`).
4. Group plan_items by `lead_id`. For each lead, build a single recipient row:
   ```
   { lead_id, full_name, phone, email,
     message_body_sms: <substituted SMS body or null>,
     message_body_email: <substituted email body or null>,
     last_message_sent_at: <ISO ts or null>,
     last_template_slug: <string or null> }
   ```
5. Batch-query `crm_message_log` once for all lead_ids: `SELECT lead_id, MAX(created_at) AS last_sent, ... GROUP BY lead_id`. Attach last_sent + slug.
6. Return JSON: `{ run_id, rule_id (if single rule) or rules: [...], template_slug (if single), channels: [...], recipients_by_lead: [...], skipped, queued, fired }`.
7. Add new optional parameters `exclude_lead_ids: string[]` and `recipient_subset: string[]` to `mode='dispatch'`:
   - In `engine.ts:evaluate()`, after `prepareRulePlan` builds plan_items, filter by `exclude_lead_ids` (drop) + intersect with `recipient_subset` if provided.
   - Post-actions + queue_send run on the FINAL filtered set (the actually-dispatched set), not the full re-resolved set.
8. Deploy via MCP (`verify_jwt` flag = preserve existing value; check via `get_edge_function` BEFORE deploy).

**Smoke (Phase 2 close):**
- Pick an active demo rule that resolves to ≥1 lead (e.g., `הרשמה: אישור הרשמה`).
- POST `automation-engine` with `mode='dispatch_preview', trigger_type='event_registration', trigger_data={...}`.
- Verify: `recipients_by_lead.length ≥ 1`; `message_body_sms` or `message_body_email` non-empty; `crm_message_queue` row count unchanged; `crm_message_log` row count unchanged.

**File-size guard:** If `engine.ts` would exceed 350 lines after extending → split the preview logic into a new file `preview.ts` (which I'm preemptively planning above).

### Phase 3 — Modal refactor (~2h)

**File:** `modules/crm/crm-confirm-send.js` + `modules/crm/crm-automation-client.js`.

**Implementation:**
1. `CrmAutomationClient.evaluate(triggerType, triggerData, onAfterConfirm)` — extend to call `mode='dispatch_preview'` FIRST. Then if `recipients_by_lead.length > 0`, pass that response (NOT old plan_items) to a new `CrmConfirmSend.show2(previewResponse, onChoice)` API. Keep existing `CrmConfirmSend.show(planItems, onChoice)` for backward compat (used by some non-modal legacy paths).
2. `CrmConfirmSend.show2(previewResponse, onChoice)` — new 2-arg API:
   - Renders title + count (will get incremental in Phase 7; static for now).
   - Renders single-tab recipient list (no more Messages/Recipients tabs — the modal becomes recipient-first).
   - Each row: name | phone | email | (placeholder for body-expand button in Phase 4).
   - Footer: Cancel / "אישור ללא הודעות" / "אישור ושלח הודעות (N)".
3. On "אישור ושלח הודעות": call EF `mode='dispatch'` with `exclude_lead_ids=[]` (Phase 4 wires real exclusions) + `dispatch_messages=true`. Reuse the existing `run_id` from preview response (so the preview→dispatch round-trip keeps a single run_id — cleaner audit + broadcast_id continuity).
4. On "אישור ללא הודעות": same call but `dispatch_messages=false`.

**File-size guard:** Pre-split now. Add `modules/crm/crm-confirm-send-v2.js` if `crm-confirm-send.js` would exceed 350. Both files registered on `window.CrmConfirmSend` — v2 owns `show2`, legacy keeps `show`. Long-term plan: deprecate `show` once all 5 callsites migrate (NOT this SPEC).

**Smoke:** open demo event status board → flip an event to `registration_open` → modal opens → recipient list visible (count + names) → click Cancel → no DB writes (counts verified in §3 Phase 3 criterion).

### Phase 4 — Search + per-recipient body + checkboxes (~2h)

**File:** `modules/crm/crm-confirm-send-v2.js`.

**Implementation:**
1. Add search input above the recipient list. `oninput` filters `recipients_by_lead` array client-side by `full_name` OR `phone` OR `email` (case-insensitive substring).
2. Add checkbox column to each row (default checked). Click toggles `_selectionState.excluded.add(lead_id)`.
3. Click on recipient name (or new "expand" button) → expand-on-click body preview panel:
   - SMS body if exists.
   - Email body if exists (rendered as `<pre>` with HTML-escape, NOT injected as HTML — Iron Rule 8).
4. On approve, the dispatch call uses `exclude_lead_ids: [...Array.from(_selectionState.excluded)]`.

**Smoke:** filter on demo modal → list narrows; uncheck 1 recipient → approve → `crm_message_queue` does NOT have a row for that lead_id (verified via SELECT after dispatch).

### Phase 5 — Test-send to first 3 (~1h)

**File:** `modules/crm/crm-confirm-send-v2.js`.

**Implementation:**
1. New button: "📤 שלח טסט ל-3 הראשונים". Enabled when `recipients_by_lead.length ≥ 3`.
2. On click: compute first-3 alphabetically by `full_name` (intersected with current search/filter + selection state — only checked, visible recipients eligible).
3. Call EF `mode='dispatch'` with `recipient_subset=[first 3 lead_ids]` + `dispatch_messages=true`. Creates a FRESH dispatch run (`run_id` differs from the modal's preview `run_id`).
4. After EF returns: show inline status "✅ נשלח טסט ל-3 נמענים. בדוק וסמן 'שלח לשאר' להמשך."
5. The original modal's `_selectionState.testSent_lead_ids` accumulates the 3 lead_ids.
6. "אישור ושלח הודעות" button label becomes "שלח לשאר (N-3)" once test-send happened. On click, dispatches with `exclude_lead_ids = [...excluded, ...testSent_lead_ids]`.

**Whitelist discipline:** Test-send only proceeds if every one of the 3 has a phone OR email on the Brief §4.2 list. Otherwise → toast "אין שלושה נמענים מתאימים לרשימת הבדיקה" + ABORT the test-send. Demo tenant test data is curated such that the 3 phones in §4.2 match 3 demo leads' phones; verify at Phase 5 author-time.

**Smoke:** demo rule with ≥3 recipients (some whose phones are on the §4.2 list) → click test-send → 3 SMS dispatched → modal still open → click "שלח לשאר" → remaining N-3 dispatched on a new run_id.

### Phase 6 — Queue-side cancellation (~1.5h)

**File:** `modules/crm/crm-confirm-send-v2.js` + small new helper `modules/crm/crm-broadcast-cancel.js` (≤ 100 lines).

**Implementation:**
1. After approve-dispatch returns, hide modal + show toast: `🟢 X messages queued — delivering over ~Y minutes. [ביטול שליחה]` where Y = `ceil(X / 60)` minutes (assuming 1 msg/sec dispatch rate from `dispatch-queue`).
2. "ביטול שליחה" button → confirm dialog → call new helper `CrmBroadcastCancel.cancelByRunId(runId)`:
   - `UPDATE crm_message_queue SET status='cancelled', error_message='operator_cancelled' WHERE tenant_id=$tid AND run_id=$runId AND processed_at IS NULL` (via `sb.from('crm_message_queue').update(...).eq(...).is('processed_at', null)` — single statement, RLS-protected).
   - Re-fetch counts: `SELECT COUNT(*) FILTER (WHERE status='cancelled') AS k, COUNT(*) FILTER (WHERE processed_at IS NOT NULL) AS m FROM crm_message_queue WHERE tenant_id=$tid AND run_id=$runId`.
3. Toast updates: `🟡 בוטלו K מתוך N. M כבר נשלחו (לא ניתן להחזיר).`

**Edge cases:**
- Cancel pressed AFTER all messages already processed → toast: "כל ההודעות כבר נשלחו".
- Cancel pressed for a run_id whose rows are ALL still queued → all flip.
- Operator double-presses cancel → second press is a no-op (rows are already cancelled, predicate matches 0 rows).

**Smoke:** demo broadcast of ≥4 recipients → approve → toast appears → click cancel → ≥1 row flips to `cancelled` (verified by SELECT).

### Phase 7 — Quality-of-life additions (~2h)

**File:** `modules/crm/crm-confirm-send-v2.js`.

**Implementation:**

1. **Incremental count display (3.8):**
   - Modal opens IMMEDIATELY with header `🔄 מחשב נמענים...`.
   - As soon as EF `dispatch_preview` call returns, header updates to `<N> נמענים נמצאו. טוען פרטים...`.
   - When list renders, header becomes `<N> נמענים (<K> נבחרו)`.
   - K reflects current checkbox selection state; updates live as operator toggles.

2. **Quick filter chips (3.9):**
   - 4 chips above the recipient list:
     - `הכל` (default).
     - `30 ימים אחרונים` (active iff `lead.created_at >= now() - 30 days`) — requires `created_at` on the preview response; add it in Phase 2's recipient shape.
     - `ללא הרשמה לאירוע קודם` (active iff `lead has 0 attendees with status IN (registered, confirmed, attended) — pre-aggregated in Phase 2's recipient shape).
     - `לקוחות` (active iff `lead has ≥1 status='attended' attendee` — pre-aggregated).
   - Click chip → applies the predicate as a client-side filter (additive with search).
   - "Customers" chip disabled (greyed) iff no recipient in the current dataset qualifies.

3. **Per-recipient last-message line (3.10):**
   - In the body-expand panel, add a line: `📩 הודעה אחרונה: <date DD.MM.YYYY> — <template_slug>` or `אין הודעות קודמות`. Uses `last_message_sent_at` + `last_template_slug` from the EF response.

4. **Session-saved selections (3.11):**
   - sessionStorage key `crm_confirm_send_selection_v1` = JSON `{ rule_id, run_id, excluded: [lead_ids], filterChip, search, ts }`.
   - On `show2(previewResponse, onChoice)` open: if a stored entry exists for the same `rule_id`, restore `_selectionState` and re-render.
   - Cleared on dispatch (approve), explicit "reset" button click, or `ts` older than 6 hours.

**Smoke:** demo modal → count text progresses through 3 stages → all 4 chips functional → expand panel shows last-message line → close modal (without dispatch) → reopen for same rule → previous selection restored.

### Phase 8 — Full regression smoke (~1h)

For each of the 5 legacy callsites, walk through on demo:
1. Trigger the callsite (e.g., flip event status).
2. Confirm modal opens, list renders, counts match expected.
3. Click Cancel → confirm zero DB writes (queue + log row counts identical pre/post).
4. Re-trigger.
5. Click Approve → confirm queue rows appear under a single `run_id`.
6. Trigger Cancel-send toast → confirm rows flip to `cancelled`.

Capture artifacts in `modules/Module 4 - CRM/docs/specs/M4_DRY_RUN_PREVIEW_AND_DISPATCH/SMOKE_ARTIFACTS.md` — per-callsite checklist with timestamps + queue row counts pre/post.

### Phase 9 — Morning summary (~30m)

Write `modules/Module 4 - CRM/docs/audits/DRY_RUN_PREVIEW_SUMMARY_2026_05_14.md` containing:
- Per-phase status (✅ GREEN / 🟡 PARTIAL / 🔴 BLOCKED / 🟣 ESCALATED).
- Smoke artifacts referenced.
- Go/no-go verdict (Pipeline's own).
- Top 3 takeaways.
- Whether next Brief (`M4_LEGACY_DISPATCH_DECOMMISSION_v2`) is unblocked.
- Master safety tag + rollback instructions for Daniel.

---

## 7. Out of Scope

- Retiring the legacy `CrmAutomationClient.evaluate` callsites — out of scope. Deferred to `M4_LEGACY_DISPATCH_DECOMMISSION_v2` Brief.
- Modifying the broadcast wizard's preview/curation — out of scope. The wizard has its own path (`CrmBroadcastQueue.enqueueBroadcast`) and is NOT one of the 5 legacy callsites.
- Adding DDL columns to `crm_message_queue` (e.g., `cancelled_by_user_id` for audit). Reuse `error_message='operator_cancelled'` as the audit signal. Brief §4.5 hard rule.
- Reverse-selection pattern. Daniel's Brief §2 #4 explicitly excluded.
- Any Prizma writes of any kind.
- Any change to `dispatch-queue` EF, `send-message` EF, or Make scenario `9104395`.
- Any merge to `main` — Daniel's call alone per CLAUDE.md §9 #7 and Brief §4.9.

---

## 8. Expected Final State (post-Phase 9)

### Files added
- `supabase/functions/automation-engine/preview.ts` (~120-180 lines, new) — preview building logic.
- `modules/crm/crm-confirm-send-v2.js` (~280-340 lines, new) — recipient-first modal.
- `modules/crm/crm-broadcast-cancel.js` (~60-100 lines, new) — cancel-by-run_id helper.
- `modules/Module 4 - CRM/docs/specs/M4_DRY_RUN_PREVIEW_AND_DISPATCH/EXECUTION_REPORT.md` (Phase 8 close).
- `modules/Module 4 - CRM/docs/specs/M4_DRY_RUN_PREVIEW_AND_DISPATCH/FINDINGS.md` (Phase 8 close).
- `modules/Module 4 - CRM/docs/specs/M4_DRY_RUN_PREVIEW_AND_DISPATCH/FOREMAN_REVIEW.md` (after Executor close).
- `modules/Module 4 - CRM/docs/specs/M4_DRY_RUN_PREVIEW_AND_DISPATCH/SMOKE_ARTIFACTS.md` (Phase 8).
- `modules/Module 4 - CRM/docs/audits/DRY_RUN_PREVIEW_SUMMARY_2026_05_14.md` (Phase 9).

### Files modified (additive only)
- `supabase/functions/automation-engine/index.ts` (+~15 lines: new mode branch).
- `supabase/functions/automation-engine/engine.ts` (+~20 lines: `exclude_lead_ids`/`recipient_subset` plumbing).
- `modules/crm/crm-automation-client.js` (+~30-50 lines: alternative `evaluate2` flow OR enhancement of existing `evaluate` to call dispatch_preview).
- `modules/crm/crm-confirm-send.js` (untouched if all new logic lives in v2 file).

### EF version
- `automation-engine` deployed (v9+ — currently v8+ per L-NEW-29-1; verify before deploy).

### Database
- `crm_message_queue` has at least one row with `status='cancelled'` and `error_message='operator_cancelled'` (from Phase 6 smoke).
- ZERO Prizma writes (verified by Phase 8 pre/post counts).

### Git
- N commits on `develop`. Each commit message English, `type(scope): description` format (e.g., `feat(m4,crm): add automation-engine dispatch_preview mode`).
- Master safety tag `pre-dry-run-preview-2026-05-14` at `6e64118` unchanged.
- ZERO main merges.

---

## 9. Rollback Plan

If at any point the Pipeline determines the SPEC is unsafe to continue:
1. Stop committing immediately.
2. If commits were already pushed: `git revert <hash>` for each commit since the master safety tag, OR `git reset --hard pre-dry-run-preview-2026-05-14` LOCALLY (NOT on origin without Daniel approval).
3. If EF was deployed with a broken `mode='dispatch_preview'`: undeploy by re-deploying the prior version. The prior `automation-engine` source is at HEAD pre-Phase-2 commit; CLI deploy:
   ```
   git checkout <pre-phase-2-commit> -- supabase/functions/automation-engine/
   supabase functions deploy automation-engine
   git checkout HEAD -- supabase/functions/automation-engine/
   ```
4. If `crm_message_queue` rows were cancelled by Pipeline test: they remain cancelled (idempotent UPDATE; rollback is not required since these are demo-tenant test broadcasts, not real customer messages).

Master safety tag rollback procedure documented in `docs/audits/DRY_RUN_PREVIEW_SUMMARY_2026_05_14.md` for Daniel's morning review.

---

## 10. Commit Plan

| Phase | Suggested commits |
|---|---|
| 1 | (none — SPEC.md is the deliverable; commit at end of Phase 2 to keep first commit substantive) |
| 2 | `feat(m4,crm,ef): add automation-engine dispatch_preview mode (M4_DRY_RUN_PREVIEW Phase 2)` — single commit with EF source + SPEC.md |
| 3 | `feat(m4,crm,ui): CrmConfirmSend v2 — server-authoritative preview (Phase 3)` |
| 4 | `feat(m4,crm,ui): per-recipient body preview + search + checkboxes (Phase 4)` |
| 5 | `feat(m4,crm,ui): test-send to first 3 (Phase 5)` |
| 6 | `feat(m4,crm,ui): queue-side cancellation (Phase 6)` |
| 7 | `feat(m4,crm,ui): QoL — count progression + chips + history + session-save (Phase 7)` |
| 8 | `docs(m4): regression smoke artifacts + EXECUTION_REPORT + FINDINGS (Phase 8 close)` |
| 9 | `docs(m4): morning summary + integration docs (Phase 9 close)` |

Each commit:
- Uses `git add` by explicit filename only (no `-A`, no `.`).
- Pre-commit hooks must pass (Iron Rule 31 integrity gate, Rule 32 destructive ops, Rule 14 tenant_id, Rule 15 RLS, etc.).
- Push to `origin develop`.

---

## 11. Lessons Already Incorporated

Harvested from the 3 most recent `FOREMAN_REVIEW.md` files in this module:
- `STATUS_CHANGE_TRIGGERS_FRAMEWORK/FOREMAN_REVIEW.md` (2026-05-13): F1 verify_jwt regression — Brief §4.8 already addresses; this SPEC will `get_edge_function` BEFORE deploy and preserve the existing `verify_jwt` value.
- `M4_LEGACY_DISPATCH_DECOMMISSION` (effectively the prior aborted run): Brief premise was contradicted by live state (wrong symbol name, missing INSERT triggers). This SPEC's §0 reality-check verified the actual symbol `CrmAutomationClient.evaluate` and used the prior inventory directly.
- `M4_REMOVE_CONFIRMED_VERIFIED` (2026-05-13): pre-flight discipline — verify Brief assumptions against live DB/code BEFORE proceeding. Applied here in §0.

Cross-Reference Check completed 2026-05-14 against GLOBAL_SCHEMA: 0 collisions / 5 hits resolved (all are pre-existing symbols being REUSED — `run_id`, `CrmConfirmSend`, `CrmAutomationClient`, `crm_message_queue`, `automation-engine`).

---

*End of SPEC.*
