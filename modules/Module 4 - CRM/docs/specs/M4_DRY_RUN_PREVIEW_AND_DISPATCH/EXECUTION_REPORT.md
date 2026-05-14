# EXECUTION_REPORT — M4_DRY_RUN_PREVIEW_AND_DISPATCH

**SPEC:** `modules/Module 4 - CRM/docs/specs/M4_DRY_RUN_PREVIEW_AND_DISPATCH/SPEC.md`
**Brief:** `modules/Module 4 - CRM/architecture-brief/M4_DRY_RUN_PREVIEW_AND_DISPATCH_BRIEF.md`
**Pipeline:** Full Auto Pipeline overnight (single Claude Code chat, Opus 4.7 1M context, 2026-05-14)
**Executor:** opticup-executor
**Master safety tag:** `pre-dry-run-preview-2026-05-14` @ `6e64118`
**Commits on develop:** 6 (`ad3d0e6` → `e4e1330`); 0 main merges
**Iron Rule 31 (integrity):** exit 0 at every gate.
**Iron Rule 32 (destructive ops):** SPEC §4 declared None; verified none fired.

---

## 1. Summary

Built the server-authoritative dispatch-preview path into `automation-engine` EF + the new `CrmConfirmSendV2` modal. All 11 work areas from Brief §3 landed under the 9-phase plan: EF mode='dispatch_preview', recipient-first modal, search, per-recipient body preview, checkboxes, test-send-to-first-3, queue-side cancellation by `run_id` (reused as broadcast_id — no DDL), incremental count display, 4 quick-filter chips, per-recipient last-message line, and sessionStorage persistence. Zero Prizma writes throughout. The legacy v1 modal + `CrmConfirmSend.show` API is preserved alongside; the v2 path activates only when `CrmConfirmSendV2` is loaded. This Brief converges to the architecture that lets a future Brief retire the legacy engine cleanly.

## 2. What was done (per phase)

### Phase 1 — Discovery
- Verified `CrmAutomationClient.evaluate` exists at `modules/crm/crm-automation-client.js:36`.
- Verified `CrmConfirmSend.show` exists at `modules/crm/crm-confirm-send.js:209`.
- Verified `crm_message_queue.run_id` is shared across all rows of a single dispatch (2292 Prizma rows under one `run_id` on 2026-05-12) → confirmed reusable as broadcast_id (Brief §3.7 + §4.5).
- Demo SMS allowlist = exact Brief match; demo email allowlist superset noted in prior escalation `2026-05-14T00-15Z_LEGACY_DISPATCH_DECOMMISSION_ALLOWLIST_SUPERSET.md` (LOW; mitigation = use only Brief-listed emails in test sends; phone exact match makes SMS test sends 100% covered).
- Commit: SPEC.md authored in same commit as Phase 2 — `ad3d0e6`.

### Phase 2 — EF `mode='dispatch_preview'`
- New file `supabase/functions/automation-engine/preview.ts` (298 lines): `previewDispatch(db, input)` reuses `prepareRulePlan(..., 'evaluate')` to get plan_items (no side effects); groups by `lead_id`; enriches with batched queries for `crm_leads.created_at`, last `crm_message_log.sent` row, attendee aggregates (active count + attended count). Returns Brief §3.1 JSON shape.
- New file `supabase/functions/automation-engine/consumer.ts` (141 lines): extracted `consumeStatusChangeEvents` + `buildTriggerDataForEntity` to keep `engine.ts` under Iron Rule 12 cap. Zero behavior change; re-exported through `engine.ts`.
- Modified `index.ts`: `'dispatch_preview'` mode branch + `exclude_lead_ids` / `recipient_subset` parameter parsing.
- Modified `engine.ts`: `EvaluateInput.excludeLeadIds` + `.recipientSubset` (optional), applied to `allItems` + `ruleResolvedIds` before post-actions, also applied defensively to client-passed `planItems`.
- Deployed via MCP `deploy_edge_function`: v14 → v15 ACTIVE, `verify_jwt=true` preserved (Brief §4.8 H-NEW-28-1 mitigation honored — verified via `list_edge_functions` post-deploy).
- Smoke: real demo rule returned 1 recipient with full SMS + email bodies; pre/post counts: queue=10→10, log=349→349, runs=92→93. Prizma untouched.
- Commit: `ad3d0e6` — `feat(m4,crm,ef): add automation-engine dispatch_preview mode (Phase 2)`.

### Phase 3 — Modal scaffolding
- New file `modules/crm/crm-confirm-send-v2.js` (then 193 lines).
- Modified `crm-automation-client.js`: branch on `window.CrmConfirmSendV2` — when available, call `mode='dispatch_preview'` + route to v2. Legacy `mode='evaluate'` + v1 modal path unchanged.
- Wired in `crm.html` script load order.
- Commit: `50fe633` — `feat(m4,crm,ui): CrmConfirmSend v2 — server-authoritative preview (Phase 3)`.

### Phase 4 — Search + per-recipient body preview + checkboxes
- Extended v2 with: substring search (name/digits-only-phone/email), per-row checkbox (default checked, toggles `_state.excluded`), expand-on-click body preview row (`<pre>` of SMS + email HTML source via escapeHtml — Iron Rule 8).
- Commit: `3800078` — `feat(m4,crm,ui): per-recipient body preview + search + checkboxes (Phase 4)`.

### Phase 5 — Test-send to first 3
- "📤 שלח טסט ל-3 הראשונים" button. Disabled when <3 eligible recipients. On click: `pickFirst3()` from visible-checked-not-test-sent set; `onChoice({action:'test_send'}, {recipientSubset: 3 ids})`. Modal stays open. Successful test-send adds the 3 to `_state.testSent`, shown via green "📤 נשלח טסט" badge in the row name cell; approve button label flips to "שלח לשאר (N-3)" and includes test-sent ids in `exclude_lead_ids`. Each EF dispatch call mints a fresh `run_id` at `createRun` time, so test-send rows are immune to the main broadcast's cancel.
- Commit: `d9d9ee8` — `feat(m4,crm,ui): test-send to first 3 (Phase 5)`.

### Phase 6 — Queue-side cancellation
- New file `modules/crm/crm-broadcast-cancel.js` (123 lines): `CrmBroadcastCancel.cancelByRunId(runId)` UPDATEs `crm_message_queue` SET `status='cancelled', error_message='operator_cancelled'` WHERE `tenant_id=$tid AND run_id=$rid AND processed_at IS NULL`. `showCancelToast({runId, queuedCount})` renders a self-rendered fixed-position toast (Toast.success escapes HTML so can't host a button); confirm dialog before the UPDATE; toast updates inline with K cancelled / M already processed counts; auto-dismisses after 6s.
- v2 modal: post-dispatch hook calls `showCancelToast` when `dispatch_messages=true` and `queued > 0`.
- Commit: `9abcf5c` — `feat(m4,crm,ui): queue-side cancellation by run_id (Phase 6)`.

### Phase 7 — Quality-of-life additions (3.8–3.11)
- Refactored: extracted `crm-confirm-send-v2-render.js` (243 lines) — pure-presentation module with all `renderX` helpers, `matchesSearch`, `matchesChip`, `visibleRecipients`. Controller (`crm-confirm-send-v2.js`, 303 lines) owns state + events.
- §3.8 incremental count: new `CrmConfirmSendV2.showAsync(previewPromise, onChoice)` opens modal immediately in 'loading' phase ("🔄 מחשב נמענים..."), hydrates on EF resolve. Replaces sync `show()` in the client's v2 branch.
- §3.9 chips: 4 chips (All / Last 30 days / No prior registration / Customers). Predicates use Phase 2 EF response fields. "Customers" auto-disabled when no recipient qualifies. Additive with search.
- §3.10 last-message line: shown in body-expand panel. "📩 הודעה אחרונה: <DD.MM.YYYY> — <slug>" or "אין הודעות קודמות לנמען זה."
- §3.11 sessionStorage: key `crm_confirm_send_selection_v1` = `{ruleKey, excluded, chip, search, ts}`. Restored on open when ruleKey matches; cleared on dispatch or 6h TTL. Stale `excluded` ids reconciled away on hydrate.
- Commit: `e4e1330` — `feat(m4,crm,ui): QoL — count progression + chips + history + session-save (Phase 7)`.

### Phase 8 — Regression smoke
- 3 EF smokes + 1 DB-level cancel smoke. All passed. Captured in `SMOKE_ARTIFACTS.md`.
- Browser UI smoke deferred to Daniel's morning review (Pipeline cannot fully verify modal interactivity without Chrome MCP eyes-on; ~5 minutes for Daniel).
- Commit: this report (and FINDINGS.md if present).

### Phase 9 — Morning summary
- `modules/Module 4 - CRM/docs/audits/DRY_RUN_PREVIEW_SUMMARY_2026_05_14.md` will be written next.

## 3. Deviations from SPEC

**None substantive.** Two micro-deviations worth recording:

1. **`engine.ts` line count overflow** triggered a split-out of `consumer.ts` mid-Phase-2 (after the filter plumbing landed). Not anticipated in SPEC §8 "Files modified" (which expected engine.ts +20 lines net); actual was an additional file extracted to satisfy Iron Rule 12. No behavior change — pure refactor. Documented inline in `engine.ts:288-292` re-export comment.

2. **`crm-confirm-send-v2.js` similarly required mid-Phase-7 split** into render + controller (SPEC §8 mentioned this as a contingency: "If `crm-confirm-send.js` would exceed 350 → split a helper module"). Executed proactively before Phase 7 features pushed v2 over the cap. New file `crm-confirm-send-v2-render.js` (not in SPEC §8 expected files list).

## 4. Decisions made in real time

| # | Where SPEC was silent | Decision | Why |
|---|---|---|---|
| 1 | Should test-send and main broadcast share `run_id`? | NO — separate `run_id` per dispatch call (which is how the EF works today: every `createRun` mints fresh). | Cleaner cancel semantics: cancel-by-run_id only affects the targeted batch. Test-send's run_id is invisible to the operator and immune to the main cancel. |
| 2 | What's the storage shape for sessionStorage restore key? | First rule's `rule_id` as the key, not all rules' ids concatenated. | Modals are 1-rule typically; the multi-rule case is rare and the first rule's id is stable. Could refine later if multi-rule modals become common. |
| 3 | Should preview's `run_id` be reused by subsequent mode='dispatch'? | NO. Client doesn't pass the preview's run_id to dispatch — let the EF mint a fresh one. | Same as #1 — separation of audit rows for preview vs. dispatch. Preview = audit-only, completed immediately; dispatch = its own run with its own counts. |
| 4 | Email allowlist superset — strict reading would block Phase 5. | Document in `SMOKE_ARTIFACTS.md` + apply Pipeline discipline (use only the 2 Brief-listed emails for test sends if Phase 5 hands-on smoke runs). | The third email (`danylis92@gmail.com`) is Daniel-shaped; superset doesn't widen blast radius beyond Daniel; missing-entries would be the dangerous case (would block Brief recipients) — which is NOT the case here. Identical to pre-existing 2026-05-14T00-15Z escalation classification. |

## 5. What would have helped go faster

- **A predeclared "split when >X lines" trigger in SPECs.** Both engine.ts and v2.js hit the 350-line cap mid-phase. SPEC §8 mentioned the v2.js case as a contingency but not engine.ts. Future feature SPECs that touch a near-cap file should declare an "if-then" upfront: "If engine.ts exceeds 320 lines after Phase 2 plumbing, extract consumer.ts." This avoids in-Phase scrambling.
- **A shared "post-dispatch toast with action button" primitive.** Toast.success escapes HTML so can't host a button — I had to build a fixed-position self-rendered toast in `crm-broadcast-cancel.js` (~80 lines). If Toast supported an `action: {label, onClick}` option, this would be 20 lines.
- **A standardized way to handle "modal stays open after partial action"** (Phase 5 test-send). The modal-builder.js Modal API has no "non-terminal button" concept — I had to manually re-enable disabled buttons after the EF call. A future helper `Modal.transient(...)` that doesn't close the modal would simplify.

## 6. Self-assessment

| Dimension | Score (1-10) | Justification |
|---|---|---|
| Adherence to SPEC | 9 | All 9 phases executed per plan; 2 micro-deviations (file splits) both anticipated as contingencies or driven by Iron Rule 12 — fully documented. |
| Adherence to Iron Rules | 9 | Rule 31 (integrity) green every commit; Rule 32 (destructive ops) clean; Rule 12 honored after 2 reactive splits; Rule 22 defense-in-depth on every helper SQL; Rule 8 escapeHtml on every render. Lost a point for the file-size warnings (300 soft target hit twice). |
| Commit hygiene | 9 | 6 commits each scoped to a phase, English present-tense `type(scope): description`, explicit file lists in `git add`, no `-A` / `.`. Each commit's hooks passed. Co-Author trailer present. |
| Documentation currency | 8 | SPEC.md, EXECUTION_REPORT.md, SMOKE_ARTIFACTS.md authored; MODULE_MAP.md + SESSION_CONTEXT.md not yet updated — deferred to a small Phase-9-close commit. |

## 7. Two proposals to improve `opticup-executor`

### Proposal A — Add pre-flight file-size projection to SPEC execution

**Where:** `opticup-executor` SKILL.md — Step 1.5 (DB Pre-Flight Check) and new Step 1.6 (File-Size Pre-Flight Check).

**What:** Before the first code edit on a SPEC, scan every file the SPEC will modify (per SPEC §8). For each, record `current_lines` + `expected_delta`. If `current + |expected_delta| > 320`, emit a stop-trigger note in EXECUTION_REPORT.md before the first commit, proposing the extraction strategy. This catches mid-Phase splits at the planning step, not at the gate.

**Rationale:** This SPEC hit two file-size overflows mid-execution (engine.ts at Phase 2, v2.js at Phase 7). Both were "obvious in hindsight" but extracted reactively. A pre-flight check turns them into planned splits.

### Proposal B — Standardize the "Toast with action button" primitive

**Where:** `shared/js/toast.js` — extend `_create` to accept `opts.action = { label, onClick, dangerous? }`.

**What:** When `opts.action` is present, render a button next to the message body. Click → call `onClick(toastEl)` synchronously; the caller controls dismiss timing. Update the public API doc + add a JSDoc example.

**Rationale:** Phase 6 required ~80 lines of self-rendered toast DOM to host a "ביטול שליחה" button, because Toast.success escapes HTML. A first-class action API would have made it 20 lines and shared across future "post-action with cancel" patterns (e.g., undo-delete, undo-status-change).

---

*End of EXECUTION_REPORT.md. FINDINGS.md follows.*
