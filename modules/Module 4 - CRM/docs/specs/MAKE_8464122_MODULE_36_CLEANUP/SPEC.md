# SPEC — MAKE_8464122_MODULE_36_CLEANUP

> **Authored by:** opticup-strategic (Foreman, in-session via Campaign Overseer per L-002)
> **Authored on:** 2026-05-04 late night (M4 closure rush)
> **Module:** 4 — CRM
> **Source finding:** F4 (LOW) from `QUICK_REGISTER_QR_FLOW/FINDINGS.md` — Module 36 (Monday legacy `ListItemsByColumnValues`) is dangling in scenario 8464122 quick-register branch after Rung 3 wired the new HTTP module 213 + EF.
> **Production discipline:** scenario 8464122 is LIVE post-cutover. The branch has been working since 2026-05-04 evening; this is a cosmetic/latency cleanup, not a fix.

---

## 1. Goal

Remove Module 36 (Monday legacy `monday:ListItemsByColumnValues`) from scenario 8464122's `"ברקוד רישום לאירוע - רישום מהיר"` branch. The module is upstream of HTTP module 213 (the new EF call) and produces output that nothing reads. Removing it eliminates: (1) one unnecessary Monday API call per WhatsApp trigger, (2) recurring red-triangle errors in Make UI when Monday API hiccups, (3) ~1-2 seconds of latency.

**Why now:** part of the M4 closure rush. The cleanup is low-risk (output is unread), short (~5-10 minutes manual UI work), and removes operational noise.

---

## 2. Background & Verified Evidence

**Pre-Authoring Sweep:**

- ✅ Module 36 confirmed in scenario blueprint (verified during Rung 3 of QUICK_REGISTER_QR_FLOW). Type: `monday:ListItemsByColumnValues`, Monday board ID `5088674576`, column `text_mky7rmq8`.
- ✅ Module 36's output feeds nothing post-Rung 3 (Module 40 caption + URL now reference Module 213's output, not Module 36's).
- ✅ The module sits between the branch filter and HTTP module 213. Removing it requires reconnecting the filter directly to module 213.
- ✅ FINDINGS.md F3 from QUICK_REGISTER_QR_FLOW documented that `scenarios_update` MCP is unreliable for blueprints >150KB. This SPEC's edits will follow the same manual-UI-only approach.

**Daniel's directive (verbal, 2026-05-04):** when handling Make-scenario edits in the M4 closure rush, the Overseer probes via `scenarios_get` MCP, dictates exact UI actions, Daniel applies via Make UI. No autonomous round-trip.

---

## 3. Success Criteria

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 3.1 | Module 36 removed from scenario 8464122 quick-register branch | blueprint no longer contains module id 36 in this branch | `scenarios_get` post-edit + grep |
| 3.2 | Branch filter directly connects to HTTP module 213 (no intermediate module) | logical flow: filter → module 213 → router → module 40 (success) / send-message (error) | scenario UI inspection |
| 3.3 | Run-once smoke test with `רישום מהיר אירוע 14` produces a valid QR within 10 seconds | identical UX to pre-cleanup | Daniel runs Run-once |
| 3.4 | No regression in Module 213's behavior (still POSTs to EF, gets 200, parses event_name + url) | Run-once shows 200 + payload | Make UI |
| 3.5 | Module 40 (Green-API SendFileByURL) still emits the QR with caption + URL referencing Module 213 | identical to pre-cleanup | Run-once + WhatsApp receipt |
| 3.6 | No other branches in scenario 8464122 affected | scenarios_get diff before/after shows changes only in the one branch | manual diff |
| 3.7 | Scenario remains active (toggle stays ON) | scenario.scheduling.type unchanged | Make UI |
| 3.8 | Documentation row added to a Make-changes log file (TBD location) capturing module removal date + reason | doc row exists | git log |

---

## 4. Autonomy Envelope

**Executor (Campaign Overseer in this case, since this is Make-UI surgery, not code) CAN do:**
- Probe scenario 8464122 via `scenarios_get` to confirm module 36's location and connections.
- Dictate to Daniel the exact Make-UI clicks: "delete module 36, reconnect filter output to module 213 input."
- Daniel performs the UI clicks; Overseer verifies via second `scenarios_get` call.
- Coordinate Run-once smoke test.

**Executor MUST stop and ask:**
- If Module 36's output IS being referenced somewhere unexpected (e.g., by a downstream module not previously mapped) — STOP, list the consumer, ask Foreman before deleting.
- If `scenarios_get` post-edit shows the connection wiring is malformed (orphan modules, dead-end routes) — STOP.
- Run-once failure with no obvious cause — STOP, paste error, ask Foreman.
- Any merge to main on the opticup repo (this SPEC writes only Make-UI state, no opticup commits — but if the executor authors a doc commit per §3.8, the same no-merge-to-main rule applies).

---

## 5. Stop Triggers

1. **Hidden consumer of Module 36 output:** the Overseer's pre-edit probe should grep the blueprint for `36.` references in this branch's downstream modules. If any are found beyond what was already remapped in Rung 3, STOP.
2. **Run-once produces wrong QR:** if post-cleanup Run-once produces a QR with the wrong event_name or wrong URL, STOP and revert the change in Make UI before any further work.
3. **Make UI doesn't allow direct filter→module 213 reconnection:** if the UI's connection model requires an intermediate (router or aggregator), STOP and ask Foreman whether to keep Module 36 as a no-op or replace with a different intermediate.

---

## 6. Rollback Plan

Manual UI revert in Make: re-add `monday:ListItemsByColumnValues` module to the branch with the same parameters as the original Module 36, reconnect the wiring. Make's version-history feature lets Daniel revert in one click within 30 days.

If Run-once still fails after revert, the rollback is partial — the legacy module won't have its data anymore (Monday board may be decommissioned). In that case, the QR flow stops working until either Module 36 is deleted again OR the Monday board is restored. Acceptable risk: legacy module was already broken pre-Rung-3.

---

## 7. Out of Scope

- **Removing other Monday modules** in OTHER branches of scenario 8464122. There may be more legacy Monday modules in unrelated branches. Audit them in a separate sweep SPEC.
- **Migrating other Make scenarios** off Monday — separate scope.
- **Optimizing scenario 8464122** beyond this one removal (latency, error handling, observability).

---

## 8. Expected Final State

```
Make scenario 8464122:
  Branch "ברקוד רישום לאירוע - רישום מהיר":
    BEFORE: filter → SetVar → module 36 (monday) → HTTP module 213 → router → module 40 / error-send
    AFTER:  filter → SetVar → HTTP module 213 → router → module 40 / error-send

opticup repo:
  modules/Module 4 - CRM/docs/specs/MAKE_8464122_MODULE_36_CLEANUP/
    SPEC.md                           (this file)
    ACTIVATION_PROMPT.md              (sibling)
    EXECUTION_REPORT.md               (added by Overseer post-Daniel-verify)
    FINDINGS.md                       (1-line if clean)
  __LAUNCH_PLAN_DRAFT__/campaign-overseer/MAKE_SCENARIO_NOTES.md   (NEW or appended — records the module removal date + before/after structure)
```

---

## 9. Commit Plan

This SPEC produces **0 code commits** (Make-UI only). The opticup-repo commit is for documentation only:

**Commit 1 — Documentation:**
- Message: `chore(make): remove dangling Module 36 (Monday legacy) from scenario 8464122 quick-register branch`
- Files: `__LAUNCH_PLAN_DRAFT__/campaign-overseer/MAKE_SCENARIO_NOTES.md` (new or appended) — records the module IDs, before/after wiring, smoke-test outcome.

**Commit 2 — Retro:**
- Message: `chore(spec): close MAKE_8464122_MODULE_36_CLEANUP with retrospective`
- Files: `modules/Module 4 - CRM/docs/specs/MAKE_8464122_MODULE_36_CLEANUP/EXECUTION_REPORT.md` + `FINDINGS.md`.

---

## 10. Cross-Reference Check

| Name | Lookup result | Resolution |
|------|--------------|------------|
| Scenario 8464122 quick-register branch | EXISTS, modified during Rung 3 of QUICK_REGISTER_QR_FLOW | TARGET — clean up |
| Module 36 (`monday:ListItemsByColumnValues`) | EXISTS in this branch, dangling | TARGET — delete |
| Modules 213 + 40 | EXISTS, connected to EF response per Rung 3 | Keep, verify still connected post-cleanup |
| `MAKE_SCENARIO_NOTES.md` doc file | UNVERIFIED — Overseer creates if absent | OK |

**Sweep outcome: 4 names checked, 0 collisions.**

---

## 11. Lessons Already Incorporated

- **QUICK_REGISTER_QR_FLOW FINDINGS F3:** Make MCP `scenarios_update` unreliable for >150KB blueprints. This SPEC's edits go through manual UI, NOT MCP round-trip.
- **L-001 (verify infrastructure before dispatching):** §3 success criteria explicitly verify smoke-test parity (same QR, same caption, same URL) before declaring closed.

---

## 12. Manual QA — Daniel runs (after the Make-UI edit)

1. Send WhatsApp message `רישום מהיר אירוע 14` to demo Green-API number.
2. Within 10 seconds, expect to receive a QR with caption `ברקוד רישום לאירוע <event-name>` and a scannable QR pointing to `https://prizma-optic.co.il/quick-register/?event=14`.
3. Scan QR → land on the form → submit (test phone) → expect normal registration success.
4. Verify in CRM: lead + attendee created with `source='quick_register_qr'` AND `registration_method='quick_register_qr'`.
5. Open Make UI scenario 8464122 → verify the branch shows: filter → SetVar → HTTP module 213 → router → module 40 (or error-send). Module 36 should be GONE.

**Stop trigger:** missing QR / wrong caption / wrong URL / form submit fails / module 36 still present after the edit.

---

## 13. Deferrals

- **Audit other Make scenarios** for similar dangling Monday modules — separate sweep SPEC. Likely candidates: any scenario that previously read from Monday boards. Daniel can task this when he wants the operational cleanup.

---

*End of SPEC.*
