# M4 Overnight Harvest Round 2 — Brief

**Brief version:** v1
**Date:** 2026-05-14 (overnight)
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Full Auto Pipeline (single Claude Code chat, overnight, ~6-8 hours)
**Model preference:** Opus (multi-SPEC overnight with at least one complex framework extension)
**Owning module:** Module 4 — CRM
**Mode:** Multi-SPEC overnight run, 4 SPECs in queue. Master safety tag at start. Daniel reviews in the morning.

---

## 1. Purpose

Following the successful overnight Harvest Round 1 (2026-05-13), this is Round 2 — another 4-SPEC autonomous run while Daniel is away. The queue is harvested from open findings across:
- `modules/Module 4 - CRM/docs/STATUS_MODEL.md` (F1, F2, F3, F4, F5 + the 14 unwired-or-ambiguous items in §6)
- `modules/Module 4 - CRM/docs/specs/M4_CANCEL_SYNC_FIX/FINDINGS.md` (F-CSF-3, F-CSF-4)
- The Deep Audit (`modules/Module 4 - CRM/docs/audits/M4_DEEP_AUDIT_2026_05_13.md`) Rec 3 phase 2

When Daniel returns: ONE morning summary file points him to which SPECs closed, which (if any) needed escalation, and the recommended next step.

---

## 2. Safety Envelope — Non-Negotiable

### 2.1 Pre-run safety tag
First action — before reading any finding, before writing any SPEC, before any code change:
```
git tag -a pre-overnight-m4-r2-2026-05-14 -m "Pre-overnight-r2 baseline; revert here if anything goes wrong"
git push origin pre-overnight-m4-r2-2026-05-14
```
Single rollback point for the ENTIRE overnight run. Daniel can revert everything with one command.

### 2.2 Branch + merge rules
- All work on `develop`. NEVER touch `main`. NEVER initiate a merge to main. NEVER push to main.
- Each SPEC produces its own commits on develop, in addition to the master tag above.

### 2.3 Tenant write rules
- Zero writes to Prizma DATA rows unless a SPEC in this Brief explicitly authorizes (none in this queue do). SCHEMA changes (DDL) are authorized per §2.4.
- Demo tenant is the only test surface. All smoke tests run there.
- Whitelisted contacts for any test message dispatch:
  - Phones: `0537889878`, `0503348349`, `0507168471`
  - Emails: `danylis92@gmail.com`, `daniel@prizma-optic.co.il`, `alkimovich94@gmail.com`

### 2.4 DDL rules
- DDL pre-approved for THIS run, limited to the items listed below per SPEC. ANY other DDL → escalation.
- SPEC #1 F5 framework: ONE new registry row + 2 DB triggers + 1 view extension. Pre-approved.
- SPEC #2 wrapper phase 2: NO DDL.
- SPEC #3 status-model finetune: ONE trigger rename via DROP/CREATE pair OR via a single ALTER. Pre-approved.
- SPEC #4 STATUS_MODEL.md update: NO DDL (doc only).

### 2.5 Iron Rules in force
- Rule 31 (Integrity Gate): exit 0 or 2 mandatory before each commit.
- Rule 32 (Destructive Operations Gate): every SPEC must declare destructive ops or `None.`
- Rule 12 (350-line file cap): respected.
- Rule 15 (Canonical RLS pattern): all new policies use JWT-claim + service_bypass.
- Rule 21 (No Orphans / No Duplicates): every new name grep'd against GLOBAL_MAP / GLOBAL_SCHEMA / MODULE_MAP first.

### 2.6 SPEC count cap
Maximum 4 SPECs in this run. If a SPEC takes longer than expected (>2.5 hours) and total run is over 6 hours, stop after current SPEC.

### 2.7 Escalation protocol
If any of these conditions arise during the run:
- A SPEC's premise turns out to be wrong (e.g. data assumption refuted by pre-flight, as happened with REMOVE_CONFIRMED_VERIFIED earlier today).
- A Prizma data row would be touched.
- An additional DDL surfaces beyond the pre-approved set.
- A test fails 3 times in a row.
- An Iron Rule conflict that can't be resolved.

→ STOP. Write escalation file `modules/Module 4 - CRM/escalations/{ISO_TS}_OVERNIGHT_R2_BLOCKER.md` with SPEC name, what happened, options for Daniel. Continue with OTHER independent SPECs in the queue. Daniel reads in the morning.

### 2.8 No merge-to-main, no PR creation
- Audit report file is on develop.
- Each SPEC's commits land on develop.
- Morning summary tells Daniel which commits exist; Daniel decides whether to merge to main.

---

## 3. The SPECs To Ship (priority order)

Author each SPEC in turn. Execute → review → smoke → close. Then move to the next. Smoke 7/7 + verdict (green or yellow) required before the next SPEC starts. Red verdict means escalation, skip dependent SPECs but continue with independent ones.

### 3.1 SPEC #1 — `M4_STATUS_TRIGGER_FRAMEWORK_EXTENSION` (~2-3 hours)

**From STATUS_MODEL Finding F5 (MEDIUM):** the `crm_status_change_events` framework is wired ONLY for attendee status transitions. Lead status and event status changes still go through legacy in-process automation-engine paths. The "generic framework" is today attendee-only.

**Implementation:**
- Add registry rows in `crm_trigger_type_registry` for `lead_status_change` and `event_status_change` entity types.
- Create DB triggers on `crm_leads.status` and `crm_events.status` that mirror the existing attendee trigger pattern (`trg_attendee_status_change_event`).
- Extend automation-engine EF to handle the new trigger types in its `consumeStatusChangeEvents` loop. Same NULL-safe `IS DISTINCT FROM` pattern. Same parallel-by-group dispatch.
- Update the rule editor UI's `fires_on` sub-picker to also surface lead and event entities.

**Smoke (demo only):**
- Create a demo lead, transition status. Verify a row lands in `crm_status_change_events` for `lead`.
- Create a demo event, transition status. Verify same for `event`.
- Wire ONE test automation rule on demo for each new entity; verify it fires through the new framework path.
- NO Prizma writes.

**SPEC budget:** ~6-9 commits.

### 3.2 SPEC #2 — `M4_RAW_SB_WRAPPER_MIGRATION_PHASE_2` (~1.5-2 hours)

**From Deep Audit Finding 2 (HIGH):** 129 raw `sb.from()` calls remain in `modules/crm/` after Phase 1 reduced 136 → 129. This SPEC migrates the next ~25-30 calls in the most-frequently-loaded files (next-tier candidates: `crm-events-detail.js`, `crm-event-day-manage.js`, `crm-leads-detail.js`, `crm-messaging-tab.js`).

**Implementation:**
- Identify the 25-30 next call sites by file load frequency.
- Replace each with appropriate `DB.fetchAll` / `DB.batchCreate` / `DB.batchUpdate` equivalent.
- Iron Rule 7 compliance increases incrementally.
- Skip any call site with unusual semantics (joins the wrapper doesn't support, special filters) — log skipped sites in FINDINGS.

**Touches:** 3-5 JS files. NO DB changes. NO EF changes.

**Smoke:** existing CRM flows still work — lead create, lead update, event list, event filter, attendee management. Diff every change to confirm semantic equivalence.

**Stop trigger:** if total calls dropped reaches Phase 1's pattern of leaving 1 unmigrated (Pipeline judged it had unusual semantics in Phase 1), accept and skip. Don't stretch the wrapper.

**SPEC budget:** ~4-6 commits.

### 3.3 SPEC #3 — `M4_STATUS_MODEL_FINETUNES` (~1 hour)

**From STATUS_MODEL.md §6 findings F2 + F-CSF-3:**

**F2 (LOW): Trigger naming inconsistency.** Two conventions coexist: legacy `trg_<table>_updated` and the new `<table>_set_updated_at_trg` from recent SPECs. Normalize to one pattern.

**F-CSF-3 (LOW): Composite-NULL idiom in `sync_lead_status_from_attendee` body.** A subtle code pattern that's latent today but could bite when extended. Tighten the idiom.

**Implementation:**
- F2: pick the project's standard convention (Pipeline reads CONVENTIONS.md if present, else infers from the older majority pattern). Rename triggers via DROP/CREATE pair.
- F-CSF-3: review the composite-NULL handling in the sync RPC. If a defensive `COALESCE` or explicit NULL check would prevent the latent issue, add it. Document the fix in the RPC body comment.

**Smoke:** both target tables receive an UPDATE that triggers the renamed trigger — confirm `updated_at` advances. Sync RPC tested with a NULL-bearing attendee row — confirm no crash, returns sensible status.

**SPEC budget:** ~3-4 commits.

### 3.4 SPEC #4 — `M4_STATUS_MODEL_DOC_UPDATE` (~30-45 min)

**From STATUS_MODEL.md §6 F-CSF-4:** the doc was written 2026-05-13 night. The 2026-05-14 day shipped 2 fixes that change what the doc says: M4_CANCEL_SYNC_FIX (cancel path now calls sync — update §5.4) and M4_STALE_INVITED_LEADS_SWEEP (mass migration — note in §6 historical context).

**Implementation:**
- Pure documentation edit.
- Update §5.4 to reflect the new cancel-sync wire.
- Add §6 historical note about the 1042-lead sweep.
- Remove or update the F4 finding now that it's resolved.
- Mark F-CSF-1 RESOLVED.

**Smoke:** Mermaid still renders. Headings still navigable. No other doc files reference the removed/changed parts.

**SPEC budget:** ~2 commits.

---

## 4. The Morning Summary

When the run ends, the Pipeline writes ONE summary file:

`modules/Module 4 - CRM/docs/audits/M4_OVERNIGHT_RUN_2026_05_14_SUMMARY.md`

Structure:
```
# Overnight Run Summary — 2026-05-14/15

## Master tag
- pre-overnight-m4-r2-2026-05-14 → <hash>
- Rollback command: `git reset --hard pre-overnight-m4-r2-2026-05-14 && git push --force-with-lease origin develop`

## SPECs run
| # | SPEC slug | Status | Duration | Commits | Top result |
|---|-----------|--------|----------|---------|-----------|
| 1 | M4_STATUS_TRIGGER_FRAMEWORK_EXTENSION | green/yellow/red | Xh Ym | N commits | one sentence |
| ... |

## Escalations
- (none) OR list of escalation file paths

## Smoke results
- per SPEC

## Open questions for Daniel
- 3-5 strategic items surfaced during the run

## Recommended next steps
- (a) Merge develop → main (if all SPECs green)
- (b) Cherry-pick (if mixed verdicts)
- (c) Rollback (if anything bad)
- A clear recommendation with reasoning.
```

---

## 5. Pipeline Selection

Standard Full Auto Pipeline for each SPEC:
- `opticup-strategic` (Foreman) authors.
- `opticup-executor` implements.
- `opticup-reviewer` audits.
- `opticup-localhost-tester` smokes.
- `opticup-strategic` (Foreman-Review) closes.

Opus model — the F5 framework extension is non-trivial (DDL + EF logic + UI), and the run is long. Don't compromise.

---

## 6. Sleep-Through Confidence Check

Daniel can leave the machine because:
- Production = `main`. Run touches develop only.
- Every change sits on top of one git tag that reverts the entire run with one command.
- No merge to main happens autonomously.
- No Prizma data row gets written (DDL is schema-only).
- Iron Rules 31, 32, 12, 15, 21 enforced by hooks.
- Each SPEC ends with Reviewer + Localhost-Tester verdict before next begins.
- Escalation protocol catches genuine surprises and continues with independent work.

Worst case: develop has commits that don't work; rollback with one command. Production unaffected.

---

*End of Brief. Activation prompt at `M4_OVERNIGHT_HARVEST_ROUND_2_ACTIVATION_PROMPT.md`.*
