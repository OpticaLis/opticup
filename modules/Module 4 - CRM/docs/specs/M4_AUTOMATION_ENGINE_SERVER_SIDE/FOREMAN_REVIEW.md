# FOREMAN_REVIEW — M4_AUTOMATION_ENGINE_SERVER_SIDE

> **Reviewer:** opticup-strategic (Foreman hat)
> **Date:** 2026-05-03
> **SPEC author:** Campaign Overseer (Cowork session) — DRAFT
> **Verdict:** 🟡 **CONDITIONALLY APPROVED — significant restructure required before Rung 1 dispatch.**
> **Cutover-blocker?** Rung 1 (revised, see below) MUST land before Sunday cutover.

---

## 1. Verdict & headline reasoning

🟡 The SPEC's diagnosis is correct ("the engine must move server-side, browser-only fires are a SaaS-litmus failure"). The SPEC's proposed *mechanism* is wrong on two counts:

- It invents a new trigger type (`event_time_window`) and a new pg_cron poller to do work that the existing `queue_send` action_type + `dispatch_queue` cron + scheduled `crm_message_queue` rows already do today.
- It mis-states the actual gap. The actual gap is not "T8/T9 rules need a new time-based trigger"; it is **"the existing T8/T9 rules already use `queue_send` and fire on `event_status_change`, but the *status flips that should drive them* are either operator-driven (manual UI gesture, browser engine fires) or cron-driven SQL UPDATEs (`event_day_status_flip`) that update the row but never call the engine."**

The right fix is much smaller and reuses existing infrastructure:

> Build a server-side `automation-engine` EF that ports the browser engine logic. Replace `event_day_status_flip` with a cron that does the UPDATE *and then* invokes the EF with `event_status_change` for each flipped event. Add a sibling cron for the missing `2_3d_before` flip. The existing `queue_send` rules then fire correctly without any rule migration.

This restructure also eliminates §5.6 (rule migration backfill) entirely — there is nothing to migrate.

---

## 2. SPEC quality audit

### 2.1 Strengths

- §3 inventory of browser-side files + line counts is accurate (verified: engine 326, dispatch 52, recipients 145, queue-send 111, post-actions 144).
- §4 Iron Rule check is honest and complete.
- §6 success criteria are observable and queryable (good — this avoids the M4_CAMPAIGNS_V2 confabulation lesson).
- §11.4 + §11.5 explicitly require re-reading the source — directly applies the M4_LEAD_EYE_EXAM_DEFAULT lesson about not assuming "well-factored" without checking.
- §13 is honest about lessons it tries to incorporate.

### 2.2 Critical defects

1. **§1 evidence trail mis-cites the source finding.** SPEC claims "Block-12 IP-04 in QA night-run report (HIGH severity)". **The actual finding is H-004**; IP-04 is "Show 'you've already registered' inline state on form re-submit" — totally unrelated. The corresponding improvement proposal is **IP-02**, not IP-04. The Foreman should not be discovering this on review; the SPEC's own line numbers should match its sources. Update the SPEC frontmatter and §1 to cite H-004 / IP-02.

2. **§5.2 invents a trigger type that solves a problem the system already solved.** T8 (`event_2_3d_before`) and T9 (`event_day`) rules in `crm_automation_rules` for prizma already use `action_type='queue_send'`, `trigger_event='status_change'`, with `schedule={offset_days, send_time}` action_config. The queue_send helper writes future-scheduled rows into `crm_message_queue`; the existing `dispatch_queue` cron drains the queue every minute. **The real gap is server-side invocation of `event_status_change`**, not a new trigger type. Drop §5.2 entirely. Drop §5.3 (`automation_engine_time_windows` cron) entirely. Drop §5.6 (T8/T9 migration backfill) entirely — no migration is needed, the rules are already right-shaped.

3. **§1 caller count is off.** SPEC says "5 callers (`crm-event-actions.js`, `crm-event-register.js`, `crm-lead-actions.js`, `crm-attendee-move.js`, `crm-payment-automation.js`)". Reality: there are **5 callsites across 4 files** — `crm-lead-actions.js` has two (line 9 = `lead_status_change`, line 143 = `lead_intake`). `crm-payment-automation.js` does **not** call `CrmAutomation.evaluate` directly; it is a sibling wrapper that performs payment-status side-effects around the engine call (see its own header). §5.5 correctly classifies it as "stays as wrapper", but §1 contradicts §5.5. Reconcile.

4. **§5.5 deletion list is incomplete.** Two files in the automation cluster are not addressed:
   - `crm-automation-runs.js` (writes `crm_automation_runs` audit rows + `enqueuePlan`). The engine creates run rows by calling into this. If the engine moves to the EF, **run row creation must move to the EF too** — otherwise no audit trail for server-side fires. The browser still reads runs (history UI) so the table stays; but run creation responsibility moves. The SPEC must state this explicitly.
   - `crm-automation-history.js` (UI for rendering past runs). **Stays in the browser** — it is a read-only view of `crm_automation_runs`. SPEC should call this out so future readers know it is intentionally not deleted.

5. **§11.1 references a non-existent pattern.** SPEC says "confirm `supabase/functions/lead-intake` and `supabase/functions/send-message` patterns are still the active reference for Edge Function authoring". Verified against `supabase/config.toml`: there is **no `[functions.send-message]` block**. The only EF blocks present are `pin-auth`, `facebook-campaigns-sync`, `lead-intake`. send-message is deployed but its config defaulted in. The pattern reference must be **`lead-intake` only**. Separately: the missing send-message block is itself tech-debt — Rung 1 must add `[functions.send-message]` (verify_jwt = true) at the same time as `[functions.automation-engine]`, both using the lead-intake template, per the M4_CAMPAIGNS_V2 Rung 2 verify_jwt regression lesson explicitly cited in the lead-intake block comment.

6. **§5.3 fanout-in-EF design (mooted by §5.2 deletion, but worth recording the verdict).** Even if §5.2 weren't deleted, the right design for any future cron-driven multi-tenant fan-out is **per-tenant invocation from the cron** (mirroring the existing `daily-alert-generation` cron — verified live: it iterates `SELECT id FROM tenants WHERE is_active = true` and calls a per-tenant function with EXCEPTION isolation). This keeps the EF single-tenant, RLS-friendly, and per-tenant-debuggable. Fanout-inside-EF is rejected.

### 2.3 §5.4 client refactor — APPROVED with one clarification

The dry_run → preview → approve round-trip is the right shape. CrmConfirmSend stays browser-side (Daniel directive confirmed). One clarification needed: on `approve`, the second EF call must accept the **approved plan_items array** (not just `dry_run=false`), so the operator's edits in the modal (if any) are honored. Otherwise the EF re-evaluates and a race could change recipients between the preview and the dispatch.

---

## 3. Revised Rung breakdown

### Rung 1 — Server-side engine + status-flip-with-engine-call (CUTOVER BLOCKER)

**Acceptance from §6:** items 1, 2, 3 (revised), 4, 5, 7 (parity for `event_status_change`, `event_registration`, `lead_status_change`, `lead_intake`, `attendee_moved`), 9, 10.

**Scope:**
1. Build EF `automation-engine` at `supabase/functions/automation-engine/index.ts` — port the browser engine end-to-end (TRIGGER_TYPES, CONDITIONS, prepareRulePlan, queue_send path, post-actions, runs row creation/finalization). Follow the `lead-intake` EF pattern exactly (CORS, service-role client, json response shapes).
2. Add `[functions.automation-engine]` block to `supabase/config.toml` (verify_jwt = true, mirroring `[functions.lead-intake]` exactly).
3. Add the missing `[functions.send-message]` block to `supabase/config.toml` (verify_jwt = true) — this is tech debt cleanup so all production EFs have explicit blocks per the M4_CAMPAIGNS_V2 verify_jwt regression lesson.
4. **Replace** the existing `event_day_status_flip` pg_cron job with one that does the SQL UPDATE *and then*, for each row UPDATEd, calls `automation-engine` with `{ tenant_id, trigger_type: 'event_status_change', trigger_data: { eventId, newStatus: 'event_day' } }`. Use the `daily-alert-generation` cron as the per-tenant-iteration / EXCEPTION-isolation pattern.
5. **Add** new pg_cron job `event_2_3d_before_status_flip` running at the same 05:30 UTC slot, that flips events whose `event_date = today + 3 days` to `status='2_3d_before'` (subject to the same NOT IN guard as event_day_status_flip), then calls the EF the same way.
6. EF parity test on prizma: pick one historical `event_status_change` invocation (or seed a test event) and verify the EF produces the same `crm_automation_runs` + `crm_message_queue` rows the browser engine would. **Use prizma tenant** (UUID `6ad0781b-37f0-47a9-92e3-be9ed1477e1c`); SMS-triggering tests use ONLY phones `0537889878` and `0503348349`.

**Out of scope for Rung 1:** browser callers still call `CrmAutomation.evaluate` directly — both paths coexist transiently. The browser engine is unchanged. Rung 2 changes that.

**Stop triggers:** EF returns a different `crm_message_log` row pattern than the browser engine for the parity test → STOP. Either cron job fails 3 consecutive runs → STOP. Any null-byte detected by integrity gate → STOP.

**Autonomy:** execute autonomously after Foreman approval (this review). Rollback: `cron.unschedule()` the new jobs; restore the original `event_day_status_flip` from the EXECUTION_REPORT pre-state capture; the EF can be left deployed (idle if nothing calls it).

### Rung 2 — Browser callers route through EF in dry_run/approve mode (POST-CUTOVER OK, prefer same-day)

**Acceptance from §6:** item 6 (UX zero regression). Refines item 7 to "all callsites go through EF".

**Scope:**
1. New file `modules/crm/crm-automation-client.js` — thin wrapper exposing `CrmAutomationClient.evaluate(triggerType, triggerData)`. Internal flow: POST to `/functions/v1/automation-engine` with `mode='evaluate'` → receive `planItems[]` → if `CrmConfirmSend` is loaded, render preview modal → on approve, POST again with `mode='dispatch'` and `plan_items=[approved items]`.
2. Edit the 5 callsites (4 files):
   - `crm-event-actions.js:217` — replace `CrmAutomation.evaluate('event_status_change', ...)` with `CrmAutomationClient.evaluate(...)`.
   - `crm-event-register.js:109` — same.
   - `crm-lead-actions.js:9` — same.
   - `crm-lead-actions.js:143` — same.
   - `crm-attendee-move.js:99` — same.
3. Browser engine files (`crm-automation-engine.js` + 4 siblings) **stay loaded** (Rung 3 deletes them) but are unreachable via the new client.
4. Manual UX QA on prizma: open registration on a real event, verify modal renders, verify approve dispatches, verify `crm_message_log` row matches Rung 1 EF output.

**Stop triggers:** confirmation modal breaks, or the planItems shape returned by the EF differs from what `CrmConfirmSend.show` expects → STOP.

**Autonomy:** execute autonomously after Rung 1 lands and Foreman re-confirms.

### Rung 3 — Delete browser engine files (REQUIRES DANIEL SIGN-OFF)

**Acceptance from §6:** item 8.

**Scope:** delete the 5 files in §5.5 of SPEC + ALSO delete `modules/crm/crm-automation-runs.js` (its run-row-creation responsibility moved into the EF in Rung 1; stamping logs from `crm-confirm-send.js` either moves into the EF approve-dispatch path OR keeps using `crm-automation-runs.js` only for `stampLog` — to be decided in Rung 2 EXECUTION_REPORT).

**Keeps:**
- `modules/crm/crm-automation-history.js` — read-only history UI, browser-side.
- `modules/crm/crm-payment-automation.js` — wrapper around the engine call (now the client wrapper), keeps its role.
- `modules/crm/crm-confirm-send.js` — preview modal UI.
- `modules/crm/crm-automation-client.js` (new in Rung 2) — the only client.

**Stop triggers:** any HTML still loads a deleted file (404 on next deploy) → STOP. Any reference to a deleted symbol in the bundle → STOP.

**Autonomy:** Daniel sign-off required before delete commits.

---

## 4. Decisions on §5.1 / §5.2 / §5.4

| Item | SPEC proposal | Foreman decision | Reasoning |
|---|---|---|---|
| §5.1 EF shape (single EF, fanout='all_active_tenants') | Single EF + fanout flag | **REJECT.** Per-tenant invocation from the cron. EF stays single-tenant. | `daily-alert-generation` cron is the live precedent: iterates tenants in DO block with EXCEPTION isolation. Fanout-in-EF makes RLS gymnastics, debugging, and per-tenant rate-limiting harder. |
| §5.2 `event_time_window` trigger | New trigger type + ±15 min tolerance + idempotency markers | **REJECT entirely.** | The existing `queue_send` action_type + `dispatch_queue` cron already handle time-based dispatch. The actual gap is server-side invocation of `event_status_change`, fixed by the cron rewrites in revised Rung 1. |
| §5.3 cron `automation_engine_time_windows` every 15 min | Build it | **REJECT.** Replaced by extending `event_day_status_flip` and adding `event_2_3d_before_status_flip` (both at the existing 05:30 UTC slot, simpler, fires once per day per matching event). | Same reasoning as §5.2. |
| §5.4 dry_run/approve round-trip | Approved | **APPROVED with clarification:** the approve call passes the approved plan_items array, not just a dry_run=false flag. | Prevents preview/dispatch race if a recipient changes between modal open and approve click. |
| §5.5 deletions list | 5 files | **EXTEND** — also address `crm-automation-runs.js` (move responsibility to EF) and **EXCLUDE** `crm-automation-history.js` (read-only UI stays). | See §2.2 finding 4. |
| §5.6 T8/T9 migration backfill | UPDATE rules to new shape | **REJECT entirely.** | Existing rules already use `queue_send` + `event_status_change` correctly. No migration needed. |

---

## 5. Deltas to apply to SPEC.md (record-only — do NOT rewrite the SPEC)

If a future session edits the SPEC, these deltas apply:

1. Replace "IP-04" with "H-004 / IP-02" everywhere in §1 and frontmatter.
2. Reconcile §1 caller count (5 callsites in 4 files; payment-automation is wrapper not caller) with §5.5 wording.
3. Delete §5.2, §5.3, §5.6 outright.
4. Rewrite §5.5 to add `crm-automation-runs.js` (responsibility moves to EF) and explicitly call out `crm-automation-history.js` as intentionally retained.
5. Replace §11.1 reference to send-message with lead-intake; add a Rung 1 task to add the missing `[functions.send-message]` block.
6. Replace §6 success criteria 3 ("event_time_window fires on schedule") with: "after `event_day_status_flip` cron runs, T9 `queue_send` rows exist in `crm_message_queue` with `scheduled_at = today 08:00`; after `event_2_3d_before_status_flip` cron runs at T-3, T8 `queue_send` rows exist with `scheduled_at = T-3 10:00`. dispatch_queue then drains them on schedule."

---

## 6. Findings processing (none from this review — SPEC has not yet been executed)

No `EXECUTION_REPORT.md` or `FINDINGS.md` exist for this SPEC yet. This review is a pre-execution refinement. The opticup-executor will produce findings during Rung 1 execution; a follow-up FOREMAN_REVIEW (or amendment to this one) will process them.

Adjacent finding from cross-reference sweep that should be tracked separately as tech-debt:
- **TD-1:** `[functions.send-message]` block missing from `supabase/config.toml`. Folded into Rung 1 scope above. If for any reason Rung 1 ships without it, file this as a `M4_CONFIG_TOML_SEND_MESSAGE_BLOCK` SPEC.

---

## 7. Self-improvement proposals

### Two for opticup-strategic (this skill):

1. **Add an explicit "verify the cited finding ID" step to the Pre-SPEC Preparation checklist (Step 1 in SKILL.md).** A SPEC's frontmatter that mis-cites the source finding (this SPEC: "IP-04" → actually H-004 / IP-02) erodes the audit trail. The check: open the cited report, search for the cited ID, confirm it matches the SPEC's framing in one sentence. Add as a new Step 1.9 between Step 1.5 (Cross-Reference Check) and Step 2 (Create the SPEC Folder). **Justified by:** this SPEC's mis-citation, which a 30-second check would have caught and which also caused the night-run report's actual recommendation (IP-02 lines 237+: "server-side automation engine") to be unread by the SPEC author — leading to the over-engineered §5.2 trigger invention.

2. **Add a "verify the proposed mechanism against existing infrastructure" sub-step to Step 1.5 Cross-Reference Check.** When a SPEC proposes new infrastructure (cron job, trigger type, queue), grep the live system for whether that infrastructure already exists in another form. This SPEC proposed `event_time_window` + a 15-min poller cron without checking that `queue_send` + `dispatch_queue` cron already do this work, just driven from a different invocation point. The check would be: "for each new mechanism in §5, search `cron.job` table and `crm_automation_rules.action_type` enum for existing equivalents; if found, the mechanism becomes an extension, not a parallel invention (Iron Rule 21)." **Justified by:** this SPEC inventing a parallel time-based trigger system when one already exists in `queue_send`.

### Two for opticup-executor (recorded for the eventual EXECUTION_REPORT loop):

1. **When the EF being authored mirrors an existing EF's pattern, the executor must `diff -u` the new EF's deno.json + boilerplate against the reference EF's and report any divergences in the EXECUTION_REPORT, even if they look intentional.** The boilerplate is the leakage point for verify_jwt regressions, CORS gaps, and missing imports. **Justified by:** the M4_CAMPAIGNS_V2 Rung 2 verify_jwt regression — entirely a config.toml + boilerplate-drift incident that automated diffing would have caught.

2. **When deleting a file from the codebase, the executor must produce a "reverse callsite" report listing every grep hit for symbols exported by that file — both inside the repo AND inside `opticup-storefront` (sibling repo).** Today's deletion list omitted `crm-automation-runs.js` and incorrectly hinted at `crm-automation-history.js`; a mechanical reverse-callsite report on each candidate file would have surfaced both gaps before the SPEC was written. Make the reverse-callsite report a mandatory section in EXECUTION_REPORT.md when any `git rm` is in scope. **Justified by:** repeated near-misses (this SPEC; CRM_OPEN_ISSUES_CLEANUP_2026-04-25 EXECUTION_REPORT line 103 also references the same pattern).

---

## 8. Master-doc update checklist

This review changes nothing in the codebase — no master-doc updates yet. After Rung 1 executes:
- `MASTER_ROADMAP.md` — add a one-line note that the CRM automation engine is server-side as of (date).
- `docs/GLOBAL_MAP.md` — at Integration Ceremony for the SPEC: add the `automation-engine` EF to the EF registry; remove `CrmAutomation.evaluate` from the "browser globals" registry once Rung 3 completes.
- `docs/GLOBAL_SCHEMA.sql` — Rung 1 changes the `event_day_status_flip` cron command and adds `event_2_3d_before_status_flip`. Both go into the cron section.
- `modules/Module 4 - CRM/docs/MODULE_MAP.md` — after Rung 3, remove the deleted browser files and add `crm-automation-client.js`.
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — update after Rung 1 ships.

---

## 9. Pre-cutover sequencing recommendation

For Daniel's call. Three pre-cutover items contend:
- **C-001 (send-message phone allowlist)** — small, contained, blocks SMS to real customers if mis-set.
- **This SPEC's revised Rung 1** — large, blocks server-side engine for SaaS-litmus.
- **C-002 (P5_7 storefront /api/leads/submit rewire)** — sibling repo, blocks fresh-lead flow at cutover.

Recommended order: **C-001 → this SPEC's Rung 1 → C-002.** C-001 is smallest and self-contained (low risk, fast verify). Rung 1 is largest and most architectural (do it second so it has the longest soak window before cutover). C-002 is in the storefront repo and benefits from being last (lowest risk of conflict with this repo's Rung 1 changes).

If time runs short pre-cutover, Rung 2 + Rung 3 of this SPEC may slip up to 7 days post-cutover (as the SPEC §12 also notes). Rung 1 is the cutover blocker; Rungs 2/3 only remove dual-mode coexistence.

---

*End of FOREMAN_REVIEW.*
