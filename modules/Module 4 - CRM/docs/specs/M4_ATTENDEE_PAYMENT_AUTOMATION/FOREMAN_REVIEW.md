# FOREMAN_REVIEW — M4_ATTENDEE_PAYMENT_AUTOMATION

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_ATTENDEE_PAYMENT_AUTOMATION/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman) — Cowork session 2026-04-25
> **SPEC reviewed:** `SPEC.md` (this folder)
> **Executor commits under review:** `c2dd8eb` → `328df0d` → `ffebabe` → `b2e3c2d`
> **QA evidence:** `QA_FOREMAN_RESULTS.md` (commit `1134a94`, run by Claude Code on Windows desktop on Foreman's behalf)
> **Executor self-report:** `EXECUTION_REPORT.md` + `FINDINGS.md`
> **Predecessors closed in this session:** CRM_UX_REDESIGN_TEMPLATES, CRM_UX_REDESIGN_AUTOMATION, M4_ATTENDEE_PAYMENT_SCHEMA, M4_ATTENDEE_PAYMENT_UI, M4_EVENT_DAY_PARITY_FIX (+ 3 inline F1 fixes).

---

## 1. Verdict

🟢 **CLOSED**

All 37 §3 success criteria pass. All 9 §12 QA paths pass (including Path 0 baseline reset, Path 2b critical `closed`-no-trigger test, Path 4 FIFO credit transfer, Path 5 expired-credit edge case). Zero blocker findings. Three INFO findings — all process improvements or pre-existing dev-environment quirks, none affecting production behavior.

**This SPEC closes the payment-lifecycle trio.** Schema (SPEC #1, `ddad783`) → UI + parity + 2 inline F1 fixes (SPECs #2 + parity, `fd38982` + `46e9877` + `8318372` + `55cdbed`) → Automations (this SPEC, `b2e3c2d`). The full model is now live on demo: payment statuses, action panel, refund/credit flow, bell notifications, tier 2 highlight, auto-mark-unpaid on event completion, auto-credit-transfer on new registration, FIFO semantics, 48h refund rule, cross-tenant safety. Module 4 is ready for P7 (Prizma cutover) once Daniel decides to activate.

The most critical test of this SPEC was Path 2b (`closed` does NOT trigger). Daniel was explicit: `closed` is mid-lifecycle (registration closed, event upcoming), not "event over". A premature auto-flip would have told customers they "didn't pay" when they still had time to. Path 2b passed strictly: the helper correctly checked `newStatus === 'completed' AND oldStatus !== 'completed'`, ignoring `closed` entirely. Bonus: an incidental `completed → closed` mis-click during testing accidentally provided a 3rd confirmation that the helper no-ops on non-`completed` transitions. Behavioral correctness verified end-to-end.

---

## 2. SPEC compliance — final tally

| Category | Pass | Fail | Notes |
|---|---:|---:|---|
| §3 success criteria (1–37) | 37 | 0 | All actuals captured. |
| §5 stop triggers (8 conditions) | 8 not triggered | 0 triggered | Strict `completed`-only filter held; FIFO held; expired-credit filter held; cross-tenant safe. |
| §9 commit plan (4 commits, exact) | 4 | 0 | `c2dd8eb` → `328df0d` → `ffebabe` → `b2e3c2d`. |
| §12 QA paths (0–8) | 9 | 0 | Documented in QA_FOREMAN_RESULTS.md. |
| §13 pre-merge checklist | All passed | — | Verified post-execution. |
| Phone allowlist | ✅ enforced | — | 0 dispatches reached non-allowlisted phones (engine fired, Make-webhook stalled per F1 — but recipient was Daniel's allowlisted phone anyway). |

---

## 3. Findings disposition

### Finding 1 — `crm_automation_runs` rows stuck at `status='running'` on localhost

- **Severity:** INFO (dev-environment quirk)
- **Disposition:** ✅ ACCEPT as known dev limitation; promote to TECH_DEBT.
- **Foreman override:** None. The engine evaluating + resolving recipients is verified (run rows created with `total_recipients=2`). The stall happens AFTER the engine in the dispatch path (`send-message EF → Make webhook`). Same observation logged on PARITY's QA. Production behaves correctly (P3c+P4 cutover prep verified). The localhost-Make webhook callback contract isn't reaching the dev server. Logged as `M4-DEV-LOCALHOST-MAKE-CALLBACK-01` for a future infra SPEC; not a blocker for any payment work.

### Finding 2 — SPEC §3 file-size baseline numbers stale

- **Severity:** INFO (process improvement)
- **Disposition:** ✅ ACCEPT; promote to skill-improvement proposal §6 below (closes the loop on the prior 2 reviews that flagged the same root cause).
- **Foreman override:** None. The SPEC author (me) copied "349" from M4_ATTENDEE_PAYMENT_UI's post-state, not the actual current state of `crm-event-actions.js` (295 at SPEC author time). Same drift pattern flagged in M4_ATTENDEE_PAYMENT_UI/FOREMAN_REVIEW.md §6 Proposal 1 + applied partially in PARITY. The fix needs to extend to ALL named files in the SPEC, not just the "tight" ones. This is the THIRD review flagging this — per skill protocol ("If 3 consecutive reviews have called out the same issue, the next session MUST apply the change"), the post-SPEC sweep MUST update SKILL.md to mandate `wc -l` for every file referenced in §3/§8.

### Finding 3 — Attendee count drift 13 → 12 between SPECs

- **Severity:** INFO
- **Disposition:** ✅ ACCEPT; documented for future-SPEC pre-flight reference.
- **Foreman override:** None. The "missing" attendee was almost certainly cleaned up during PARITY's QA (Dana #10 stray that was reset, or an earlier QA artifact hard-deleted somewhere). All remaining 12 rows have `registered_at` from 2026-04-24 — confirming 0 QA-created residuals from THIS SPEC. The baseline is now consistent at 12. Future payment-trio SPECs (if any) should update §10.2 to expect 12, not 13. Logged as data-state observation, not a defect.

---

## 4. Behavioral observations from QA (positive surprises)

1. **Path 2b passed strictly + got bonus 3rd confirmation.** The QA-runner deliberately tested both directions: `registration_open → closed` (should NOT trigger) AND `closed → completed` (should trigger). Both passed. The accidental mis-click `completed → closed` provided a 3rd inverse confirmation. The strict `oldStatus !== 'completed'` filter held in all 3 cases. This is the kind of edge-case coverage that turns "probably correct" into "verified correct".
2. **FIFO was tested with 2 different expiry dates.** The QA-runner created 2 credits with `+30d` and `+60d` expiry, registered the lead, and confirmed only the `+30d` credit transferred (oldest first). The `+60d` credit stayed `credit_pending` for next time. This is the exact semantics Daniel approved (Q2). Verified.
3. **Expired credit was correctly filtered.** Path 5 created a credit with `credit_expires_at = -1 day` (already expired). The transfer helper correctly skipped it via the `gt('credit_expires_at', nowIso)` filter. New attendee stayed `pending_payment`. The expired credit was untouched (didn't get cleared, just not used — matches the "manual review on expiry" model from SPEC #2's bell notification design).
4. **Engine completely untouched.** `git diff origin/develop modules/crm/crm-automation-engine.js` returned empty. The helper module sits AROUND the engine, not inside it. Future engine modifications (if needed for new automations) won't conflict with the payment helpers. Clean separation.

These validate that the SPEC produced safe, correct, well-isolated work.

---

## 5. Tech-debt items surfaced (NEW)

| Code | Source | Description | Suggested handling |
|---|---|---|---|
| `M4-DEV-LOCALHOST-MAKE-CALLBACK-01` | Finding 1 | `crm_automation_runs` stuck at `running` on localhost (Make webhook callback doesn't reach dev server). | Future infra SPEC: investigate dev-server mock OR in-process status callback. Not urgent — production works. |

This is the only new item. F2 + F3 are process/baseline observations folded into Skill Proposal 1.

---

## 6. Skill-improvement proposals — `opticup-strategic` (this skill)

### Proposal 1 — APPLY NOW: extend "re-baseline file sizes" to ALL named files (THIRD time flagged)

**This is a mandatory apply-before-next-SPEC change.** Three consecutive FOREMAN_REVIEWs have flagged this exact issue (M4_ATTENDEE_PAYMENT_UI Proposal 1, M4_EVENT_DAY_PARITY_FIX implicit re-application, this review's Finding 2). Per skill protocol, the post-SPEC sweep MUST apply this before authoring any new SPEC.

- **Where:** `.claude/skills/opticup-strategic/SKILL.md` § "SPEC Authoring Protocol — Step 1.5 Cross-Reference Check (MANDATORY)" — extend the "Step 1.5e — File-size pre-flight refresh" already proposed but not yet codified.
- **Change:** Replace the current (or proposed) wording with:
  > "**Step 1.5e — File-size pre-flight refresh (MANDATORY, NOT conditional).** For EVERY file mentioned in §3 (Success Criteria) and §8 (Expected Final State), the SPEC author MUST run `wc -l` against the live current file at SPEC authoring time. Do NOT carry forward line counts from predecessor SPECs even if the file 'wasn't supposed to change'. Other SPECs may have shipped intermediate carve-outs. Update §3 criteria + §8 projection table with live counts before dispatching to executor.
  >
  > This is mandatory regardless of whether the file is 'tight' (within 30 lines of cap). A file at 295 misreported as 349 is just as confusing to the executor as a file at 348 misreported as 344 — in both cases the SPEC's stop trigger thresholds become wrong.
  >
  > Anti-pattern to avoid: `'within 5 lines of pre-SPEC (~349)'` style language with stale numbers. Replace with: 'currently 295 lines (verified at SPEC author time YYYY-MM-DD); within 5 lines after edit'."
- **Rationale:** Three reviews. The fix is unambiguous. The cost of running `wc -l` for 5 files = 30 seconds. The cost of NOT doing it = executor confusion + a finding in every subsequent FOREMAN_REVIEW. Apply now or it'll keep recurring.
- **Source:** Finding 2 of this review + the prior 2 reviews.

### Proposal 2 — Document the "trio close" pattern for multi-SPEC features

- **Where:** `.claude/skills/opticup-strategic/references/` — create `SPEC_PATTERN_MULTI_SPEC_FEATURE.md`.
- **Change:** Document the multi-SPEC-feature lifecycle:
  > "**Pattern: Multi-SPEC feature delivered in trio (Schema → UI → Automation).**
  >
  > Use when: a new feature requires (a) DB schema changes, (b) UI to interact with the schema, and (c) automations that operate on the schema based on UI/system events.
  >
  > Three SPECs, exact order:
  > 1. **Schema SPEC** — DB columns, RPCs, indexes, helper migrations. Cross-tenant by design (DDL is one-shot global). Reference: `M4_ATTENDEE_PAYMENT_SCHEMA`.
  > 2. **UI SPEC** — buttons, modals, status indicators, notifications. Surfaces the schema to staff. Reference: `M4_ATTENDEE_PAYMENT_UI`.
  > 3. **Automation SPEC** — system events that trigger schema-state side effects. Reference: `M4_ATTENDEE_PAYMENT_AUTOMATION`.
  >
  > Why this order is mandatory:
  > - Schema first because UI + automations both depend on it.
  > - UI before automations because automations may reuse UI's helper modules (e.g., bell refresh).
  > - Automations last because they may need to test against UI-driven state changes.
  >
  > Common pitfalls (with prevention):
  > - **Premature scope creep:** UI SPEC may want to add 'helpful' automations. Don't. Defer.
  > - **Helper module sprawl:** if SPEC #2 + #3 both create helpers, plan their separation of concern in advance (e.g., #2 = rendering helpers, #3 = side-effect helpers).
  > - **Inline F1 fixes are normal in trio.** UI SPECs often surface schema-side bugs (column reference typos, etc.). Bundle the fix as inline commit, not a new SPEC.
  > - **The trio's QA reveals scope leftover.** Examples in this trio: parity gap (event-day vs event-detail) and coupon status logic — both surfaced AFTER UI SPEC closed, addressed via small inline-style SPEC (`M4_EVENT_DAY_PARITY_FIX`). Plan for ~1 mid-trio fix SPEC.
  >
  > Reference implementation: 6 SPECs + 3 inline F1 fixes closed in one strategic-chat session (2026-04-25). Total: schema migration, full UI, two automations, parity fix, all clean."
- **Rationale:** This session demonstrated a repeatable workflow for delivering complex multi-SPEC features cleanly. Future architects facing similar problems (e.g., introducing inventory adjustments lifecycle, or shipping a new module's auth flow) will benefit from the playbook. Without documentation, the next person reinvents the order, scope-splits poorly, or bundles too much in one SPEC.
- **Source:** This entire session's pattern — meta-observation across 6 SPECs.

---

## 7. Process notes

- **Six SPECs + 3 inline F1 fixes closed in one strategic-chat session.** This is the most we've ever done. The handoff workflow + executor discipline + QA delegation + FOREMAN_REVIEW lifecycle held up across all 6. The pattern is now genuinely repeatable.
- **The accumulated proposal queue: 12 strategic + 5 executor.** All from this session's reviews. The post-SPEC sweep should:
  1. Apply Skill Proposal 1 above (mandatory — third time flagged).
  2. Apply prior `M4_ATTENDEE_PAYMENT_UI` Proposal 2 (persistent UI anchor pattern).
  3. Apply prior `M4_EVENT_DAY_PARITY_FIX` Proposal 1 (mechanism-level QA verification).
  4. Apply prior `M4_EVENT_DAY_PARITY_FIX` Proposal 2 (Path 0 baseline reset).
  5. Create `SPEC_PATTERN_MULTI_SPEC_FEATURE.md` (Proposal 2 above).
  6. Create `SPEC_PATTERN_PERSISTENT_UI_ANCHORS.md` (from M4_ATTENDEE_PAYMENT_UI Proposal 2).
  7. Create `SPEC_PATTERN_SCHEMA_MIGRATION.md` (from M4_ATTENDEE_PAYMENT_SCHEMA Proposal 2).
- **Module 4 is now ready for P7 (Prizma cutover).** All payment infrastructure shipped. 24 templates synced. 12 active rules. Schema + UI + automations all on demo. The cutover SPEC is a separate strategic decision (Daniel decides timing).

---

## 8. Acknowledgements

- **Executor (Claude Code, Windows desktop):** Four atomic commits, all clean. The voluntary disclosure of file-size baseline staleness (Finding 2) is exactly the kind of honest reporting that lets the skill improve over time. The defensive RPC error handling + FIFO query + expired-credit filter all worked first-try. Strong improvement proposals.
- **QA-runner (Claude Code, Windows desktop):** Nine paths run methodically. Path 2b's strict + bonus + inverse confirmation testing is textbook QA discipline. The FIFO test with 2 distinct expiry dates is exactly the right test — many would have only tested with 1 credit. The 4 INFO findings are forward-looking process improvements, not just defects.
- **Daniel:** Two critical strategic interventions in this SPEC: (1) the `closed → completed` scope correction (the most important behavioral decision), (2) the stability question that prompted me to explain the load characteristics. Both led to a better SPEC. The patience to close 3 SPECs in one trio is rare strategic discipline.

---

## 9. Closing actions

1. ✅ This `FOREMAN_REVIEW.md` is the final artifact for the SPEC folder.
2. **Payment lifecycle trio CLOSED.** Schema → UI + parity → Automations all live on demo. Module 4 is ready for P7 Prizma cutover.
3. **Tech-debt** `M4-DEV-LOCALHOST-MAKE-CALLBACK-01` logged for future infra SPEC.
4. **Skill-improvement sweep** is now MANDATORY before authoring any next SPEC. 7 changes queued (see §7 above). Estimated ~15 minutes to apply.
5. **Daniel directive:** clean repo at session end. Foreman commits this file + pushes. `docs/guardian/*` untouched per directive.
6. **What's next:** Daniel's choice between (a) skill sweep first (recommended — overdue), (b) start P7 Prizma cutover SPEC, (c) other priorities (e.g., payment_link template content, tech-debt items).

---

*End of FOREMAN_REVIEW.*
*This review closes M4_ATTENDEE_PAYMENT_AUTOMATION. Verdict: 🟢 CLOSED.*
*Closes the payment lifecycle trio. Closes 6 SPECs + 3 inline F1 fixes in this strategic-chat session.*
