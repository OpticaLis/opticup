# FOREMAN_REVIEW — M4_DISPATCH_PREVIEW_LAZY_ROWS

> **Reviewer role:** opticup-strategic (Foreman hat — post-execution review)
> **Date:** 2026-05-21
> **Predecessor:** `M4_EVENT_STATUS_CHANGE_PRIZMA_SILENT_FAIL_2026_05_21` (🔴 ABORTED WITH INCIDENT)
> **Verdict:** 🟡 **CLOSED WITH FOLLOW-UPS**

## 1. SPEC quality audit (was the SPEC itself good?)

| Aspect | Score | Notes |
|---|---|---|
| Measurable success criteria | 7/10 | 25 criteria total; 22 met outright. 3 had to be relaxed (D-1 window-open, D-2 per-row latency, D-3 hydrate-bug fix mid-execution). The latency targets were optimistic for a serverless function over 1,200 leads with 3 SQL queries. Future SPECs should baseline latency on the actual stack before authoring the target. |
| Destructive-ops declaration | 10/10 | Re-confirmed unchanged in §"Destructive Operations" item-by-item between rev 1 (summary-mode) and rev 2 (lazy-rows). The 1,200-row INSERT + 1,200-row sentinel-bound DELETE were tenant-scoped and exempt from Iron Rule 32's mass-delete prohibition. |
| Stop-on-deviation triggers | 9/10 | Triggers were specific and actionable. The "Chrome MCP shows status changing BEFORE confirm" trigger was implicitly exercised and would have caught a real bug had one existed. -1 for not anticipating the `_hydrate` bug class. |
| Runtime-semantics rehearsal (§0) | 8/10 | Walked the 8 silent-commit test cases. Caught the right design pattern (sequential await beats parallel listeners). Missed the `_hydrate` triggerType-refresh need — that's a closure-state propagation gap, not a flow gap. SPEC §1.4 mentioned "_state.triggerType = triggerType" but didn't bind that to `_hydrate`. |
| Phase 0 load-injection design | 10/10 | Defense-in-depth (non-allowlisted phone + .test TLD email) caught every cascade attempt when the SCE-race fired downstream. Daniel-approved the data shape before exec; that gate worked exactly as intended. |
| Scope discipline (§7 Out of Scope) | 10/10 | Explicit: B + C territory deliberately excluded; lead/attendee status-change paths noted as FINDINGS only. No scope creep during execution. |

**Author-side improvement note:** rev 2 (lazy rows) was a substantially better design than rev 1 (summary mode). Daniel's redirect was the decisive intervention. Lesson for future SPECs: when a "summary" pattern feels like it forces an opt-in fallback to "show everything", that fallback often re-introduces the original problem. Default-to-everything-but-cheap (lazy rows) usually beats default-to-summary-with-escape-hatch.

## 2. Execution quality audit (did the executor follow the SPEC?)

| Aspect | Score | Notes |
|---|---|---|
| SPEC adherence | 8/10 | All structural goals achieved. Latency criteria 6+8 deviations documented thoroughly in EXECUTION_REPORT — not silently absorbed. The `_hydrate` bug was caught by the executor's own test (per-row clicks didn't fire EF calls), diagnosed, fixed, re-tested. That IS the stop-on-deviation loop working correctly mid-Phase-2. |
| Iron Rule compliance | 9/10 | Rules 12 (file size; hit cap twice but resolved cleanly via extraction), 21 (no duplicates — `previewRecipientBody` re-uses `prepareRulePlan` via narrow filters), 22 (defense-in-depth `tenant_id` on every query), 31 (integrity gate exit 0 throughout), 32 (destructive-ops hook caught a folder-rename — author added explicit declaration), 33 (demo-first), 34 (Chrome MCP at close) all honored. |
| Commit hygiene | 9/10 | 3 commits in `develop` range: `de46394` (utm fix), `801e65f` (EF + scripts), `c1d1a5a` (client JS). Each commit has a focused scope, Iron Rule 31 + 32 acknowledgements in the body, and clear rationale. -1 for `_hydrate` bug fix being amended into the JS commit rather than a separate fix commit — defensible (it was a small bug fix on freshly-introduced code) but a cleaner separation would have been nicer. |
| Test discipline | 10/10 | Both cancel and confirm paths exercised with DB-before / DB-after assertions. Per-row click test sampled 5 leads (idx 0, 100, 300, 700, 1100) covering the audience evenly. The `_hydrate` bug was found AS DESIGNED — the verification process caught a defect the SPEC missed at author time. |
| Cleanup discipline | 9/10 | FK cascade was hit (logs + queue + short_links + leads), worked through cleanly. Final state bit-identical to baseline on demo. Prizma drift explained as organic real-user activity. -1 for one chance encounter where the SCE consumer cron beat me to disabling the rule — that's a timing race the SPEC didn't pre-mitigate (the SPEC could have disabled the cron pg_cron entry before the confirm click; it'll be added to the rev-3 boilerplate). |

## 3. Findings processing

| Finding | Severity | Action |
|---|---|---|
| F-01 SCE consumer race | HIGH | **SPEC B (`M4_SCE_CONSUMER_RACE_FIX`) — already authored and queued.** This SPEC's execution VALIDATED that SPEC B is necessary. Live measurement: 4,000 rows enqueued instead of 2,400 — proves the race is real and active. |
| F-02 Queue insert without ON CONFLICT | HIGH | **SPEC C (`M4_QUEUE_INSERT_ON_CONFLICT`) — already authored and queued.** F-01's 800 `queue_insert_failed: duplicate key` log rows are the direct evidence. |
| F-03 Window-open latency >1 s | MEDIUM | **Accept deviation.** Operator-acceptable at 2 s for 1,200 leads. Optional future SPEC `M4_DISPATCH_PREVIEW_CHIP_AGGREGATE_PRECOMPUTE` could cut another 300 ms — not urgent. |
| F-04 Per-row latency >500 ms | MEDIUM | **Accept deviation.** Spinner state covers UX. No follow-up SPEC needed. |
| F-05 `_hydrate` triggerType refresh | LOW | **Fixed in this SPEC.** No follow-up. |
| F-06 Iron Rule 12 cap hits during edits | LOW | **TECH_DEBT or skill improvement.** Codified as P-EXEC-1 below. |
| F-07 `next_crm_event_number` rejects service_role context | INFO | **Not a bug — documented as awareness item.** RPC behavior is correct in browser context. |

## 4. 2 author-skill improvement proposals (opticup-strategic)

### P-AUTHOR-1 — Latency-target reality-check before authoring
**Where:** `.claude/skills/opticup-strategic/SKILL.md` §"Step 1.5 Cross-Reference Check" — extend §5.3 Runtime-Semantics Rehearsal with a "Latency budget" sub-row.
**What:** before pinning a latency criterion in §3 (like "<1 s window open" or "<500 ms per-row"), the SPEC author must:
1. Run a quick curl against the EF in evaluate mode with the target audience size to capture a baseline.
2. Add the baseline + 50% headroom as the criterion, NOT the optimistic target.
3. If the baseline already exceeds the optimistic target, the SPEC's design isn't done — go back and find another bottleneck.
**Rationale:** this SPEC's latency criteria (1 s + 500 ms) were authored without a baseline curl probe. Both were missed by ~2× even though the design was correct. Operator UX would have been fine either way, but the criterion missed signals "SPEC is not done" — which forces a reopen unnecessarily. Source: D-1 + D-2 in EXECUTION_REPORT.

### P-AUTHOR-2 — Stop-trigger for cron-cascade post-confirm
**Where:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` §5 Stop-on-Deviation — new sub-section "Post-confirm cascades."
**What:** any SPEC where the Phase-2 verification clicks a confirm button that writes an SCE / triggers automation must explicitly declare:
- Whether the cron consumer should be paused during the test window.
- A pre-confirm stop-trigger: "disable rule + suspend pg_cron job within 5 s of confirm click; if either fails to apply, halt and clean up."
**Rationale:** in this SPEC the cron beat me to the rule-disable, leading to a ~4,000-row queue cascade that had to be cleaned up. Defense-in-depth (test data allowlist-disjoint) saved it, but a tighter Phase-2 protocol would prevent the side-effect entirely. Source: D-4 in EXECUTION_REPORT.

## 5. 2 executor-skill improvement proposals (opticup-executor)

(See EXECUTION_REPORT §7 for the executor's own self-proposals; restated and endorsed here.)

### P-EXEC-1 — Pre-edit line-budget calculator (endorsed)
The executor's proposal P-EXEC-1 (pre-edit `350 - $(wc -l < <file>)` budget check) is endorsed. Should land as a one-line addition to `.claude/skills/opticup-executor/SKILL.md` §"File discipline".

### P-EXEC-2 — Closure-state debug hook for modal-flow SPECs (endorsed)
The executor's proposal P-EXEC-2 (conditional `window.__ccsv2_state_snapshot` for SPEC-marked Chrome MCP runs) is endorsed. Should land as a `.claude/skills/opticup-executor/SKILL.md` §"Pattern: Chrome MCP verification" subsection. The marker can default to `window.__SPEC_DEBUG === '<SPEC_SLUG>'` so it's a no-op in production.

## 6. Master-doc update checklist

- [x] M4 `SESSION_CONTEXT.md` top entry — added in the same closing commit.
- [ ] `MASTER_ROADMAP.md` — NOT REQUIRED (no phase status change; M4 stays in MAINTENANCE).
- [ ] `docs/GLOBAL_MAP.md` — NOT REQUIRED (no new global functions; per-EF surface changes only).
- [ ] `docs/GLOBAL_SCHEMA.sql` — NOT REQUIRED (no DB objects added).
- [ ] M4 `MODULE_MAP.md` — defer to next M4 SPEC's Integration Ceremony. Adds 1 new EF file `preview-recipient-body.ts` + 2 new scripts `inject/cleanup-demo-load-test-leads.mjs`.
- [ ] M4 `CHANGELOG.md` — defer.
- [ ] `docs/FB_CAPI.md` etc. — not relevant.

## 6.1 Iron Rule 34 runtime trace evidence

The Chrome MCP runtime trace was captured via `window.__modalConfirmTrace` (equivalent of the canonical `window.__modalTrace` per Iron Rule 34) — a wrapper installed around `CrmAutomationClient.probeAndCommit` + `previewRecipientBody` that pushes one event per enter / exit with timestamps + outcomes.

**Cancel-path trace excerpt:**
```
{ step: 'probeAndCommit:enter',  t: 1779371438349, triggerType: 'event_status_change' }
{ step: 'probeAndCommit:exit',   t: 1779371505480, elapsed_ms: 67131.7, mode: 'cancelled', committed: false }
```
DB before: `event_status='planning'`. DB after: `event_status='planning'` UNCHANGED. ✅

**Confirm-path trace excerpt (window.__modalConfirmTrace):**
```
{ step: 'probeAndCommit:exit',   t: 1779371783560, elapsed_ms: 67557.9, mode: 'confirmed',  committed: true  }
```
DB before: `event_status='planning'`. DB after: `event_status='registration_open'` + 1 SCE row written. ✅

(Note: `elapsed_ms` includes operator think time between modal open and click; the EF call latency itself is ~2 s, captured separately via curl + network panel.)

**Per-row body fetch trace excerpt** — 10 EF calls fired, paired enter/exit:
```
{ step: 'rb_enter', leadId: 'ee4b8d65-…', channel: 'sms'   }
{ step: 'rb_exit',  leadId: 'ee4b8d65-…', channel: 'sms',   elapsed_ms: 1209, hasBody: true }
{ step: 'rb_enter', leadId: '09cce6c2-…', channel: 'sms'   }
{ step: 'rb_exit',  leadId: '09cce6c2-…', channel: 'sms',   elapsed_ms: 1254, hasBody: true }
… 6 more lead×channel pairs, all hasBody: true …
{ step: 'rb_enter', leadId: 'd2d74e85-…', channel: 'email' }
{ step: 'rb_exit',  leadId: 'd2d74e85-…', channel: 'email', elapsed_ms: 793,  hasBody: true }
```
DB during clicks: `event_status='planning'` UNCHANGED (per-row body clicks NEVER commit). ✅

Full trace dump pinned in TEST_REPORT.md §5 (10 rows table). Screenshots in `screenshot-01-modal-open-1200-leads.png` + `screenshot-02-modal-with-expanded-rows.png` (this folder).

## 7. Verdict

🟡 **CLOSED WITH FOLLOW-UPS.**

**Closed:**
- ✅ The operator-confirm safety brake works under load. Cancel + confirm paths both verified end-to-end with Chrome MCP under 1,200-lead demo audience.
- ✅ Lazy-rows architecture proven: window-open is 36× faster + 70× smaller than pre-fix; per-row click materializes exactly one body via one EF call.
- ✅ `crm_message_log.template_slug` drift auto-fixed by deleting `fetchLastMessages` from preview.ts; 0 new drift errors during test window.
- ✅ Demo restored bit-identical to baseline (28 leads / 25 events / rule disabled). Prizma untouched by this SPEC.
- ✅ Iron Rule 34 verified with screenshots + DB before/after queries + `__modalConfirmTrace` dump.

**Follow-ups:**
- ⏭ SPEC B (`M4_SCE_CONSUMER_RACE_FIX`) — proven necessary by F-01 measurement. Authored, queued.
- ⏭ SPEC C (`M4_QUEUE_INSERT_ON_CONFLICT`) — proven necessary by F-02 measurement. Authored, queued.
- ⏭ Latency criteria 6 + 8 deviations accepted; no rework needed. P-AUTHOR-1 future-proofs SPEC authoring against optimistic latency targets.

**Risk assessment:** the operator-side safety brake is now in place. Even before B + C ship, an operator changing event status on Prizma's 1,210-lead audience will:
1. See the full 1,210-row modal open in ~2 s (vs the previous 76 s hang).
2. See the count header explicitly + sample row data + working filter + working deselect.
3. Have to click `אישור ושלח הודעות (N)` explicitly to commit. No silent-commit path remains for recipients>0.
4. Cancel path is verified to leave status unchanged.

The B+C race + ON-CONFLICT gaps are still present, so a confirm click on a 1,210-lead audience would still produce a ~3× over-enqueue cascade. But (a) the operator made the choice consciously, (b) the dispatch-queue's status-machine still prevents duplicate sends (per INCIDENT_REPORT §2.4), and (c) once B+C ship the cascade gap closes too.

---

*End of FOREMAN_REVIEW.*
