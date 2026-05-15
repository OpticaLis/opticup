# Module 4 — Overnight Audit Harvest

**Brief version:** v1
**Date:** 2026-05-13
**Author:** Architect (`opticup-architect` skill)
**Hand-off to:** Full Auto Pipeline (single chat, overnight, up to 8 hours)
**Owning module:** Module 4 — CRM
**Mode:** Multi-SPEC overnight run. Reads `modules/Module 4 - CRM/docs/audits/M4_DEEP_AUDIT_2026_05_13.md` and converts its top findings into shipped SPECs.

---

## 1. Purpose

The Deep Audit report (committed 2026-05-13 evening) identified 10 prioritized recommendations. Event #24 is being pushed from Friday 2026-05-15 to Friday 2026-05-22 to give the team a week to harden the CRM. This Brief authorizes an overnight Pipeline run that ships 4-5 high-ROI fixes from the audit before Daniel returns in the morning.

**Strategic intent:** when Daniel reopens the wizard a week from now and resends to 1,187 leads, the underlying CRM is in materially better shape than today. The audience experience is improved (no more ghost-attendees taking slots), the codebase is cleaner (fewer raw `sb.from()` calls), and the team has at least the foundation of better reporting.

This is NOT a comprehensive M4 rebuild. It is a targeted harvest of the audit's highest-ROI, lowest-risk wins.

---

## 2. Safety Envelope — Non-Negotiable

These constraints apply to every SPEC the Pipeline writes and every commit the Executor makes during this overnight run. They are the safety guarantee Daniel needs to leave the machine and trust the run.

### 2.1 Pre-run safety tag
The Pipeline's FIRST action — before reading any audit finding, before writing any SPEC, before any code change — is to create an annotated git tag at the current HEAD of `develop`:

```
git tag -a pre-overnight-m4-2026-05-13 -m "Pre-overnight-run baseline; revert here if anything in this run goes wrong"
git push origin pre-overnight-m4-2026-05-13
```

This tag is the single rollback point for the ENTIRE overnight run. If Daniel wakes up and any of the SPECs look wrong:
```
git reset --hard pre-overnight-m4-2026-05-13
git push --force-with-lease origin develop
```
…will revert everything. (Force-push to develop is acceptable here because this is a planned-rollback path the Brief authorizes; main is never touched.)

### 2.2 Branch & merge rules
- All work on `develop`. NEVER touch `main`. NEVER initiate a merge to main. NEVER push to main.
- Each SPEC produces its own commits on develop, in addition to the master tag above.

### 2.3 Tenant write rules
- **Zero writes to Prizma tenant rows.** Any SQL `INSERT`/`UPDATE`/`DELETE` whose WHERE clause does not explicitly target the demo tenant (`8d8cfa7e-ef58-49af-9702-a862d459cccb`) — STOP, write escalation file, halt the entire overnight run.
- Demo tenant is the only test surface. All smoke tests run there.
- Whitelisted contacts for any test message dispatch:
  - Phones: `0537889878`, `0503348349`, `0507168471`
  - Emails: `danylis92@gmail.com`, `daniel@prizma-optic.co.il`, `alkimovich94@gmail.com`

### 2.4 DDL rules (Iron Rule 15)
- DDL (`CREATE`, `ALTER`, `DROP`, new column, new table, new RPC, new policy) requires explicit per-SPEC approval. The default is NO DDL in this run.
- Two SPECs in this Brief (§4.4 `updated_at` column) need ONE small `ALTER TABLE ADD COLUMN`. That single DDL is pre-approved as part of this Brief. ANY OTHER DDL needs escalation.

### 2.5 Iron Rules in force
- Rule 31 (Integrity Gate): exit 0 or 2 mandatory before each commit.
- Rule 32 (Destructive Operations Gate): every SPEC must declare destructive ops or `None.`
- Rule 12 (350-line file cap): respected.
- All other Iron Rules per CLAUDE.md.

### 2.6 SPEC count cap
Maximum 5 SPECs in this run. If a SPEC is taking longer than expected (>2 hours) and the run is over 6 hours total, stop and ship what's done — don't start a new SPEC.

### 2.7 Escalation protocol
If any of these conditions arise during the run:
- A SPEC's premise turns out to be wrong (audit was stale or misread).
- A Prizma row would be touched.
- An additional DDL surfaces (beyond the pre-approved one).
- A test fails 3 times in a row.
- An Iron Rule conflict that can't be resolved.

→ STOP. Write escalation file `modules/Module 4 - CRM/escalations/{ISO_TS}_OVERNIGHT_BLOCKER.md` with the SPEC name, what happened, and the proposed paths forward. Continue with the OTHER SPECs in the queue if they're independent; do not start a new SPEC dependent on the blocker. Daniel will read in the morning.

### 2.8 No merge-to-main, no PR creation, no Vercel/Pages deploy intervention
- The audit report file is on develop.
- Each SPEC's commits land on develop.
- The morning summary tells Daniel which commits exist; Daniel decides whether to merge any of them to main.

---

## 3. Source Material

The Pipeline reads:
1. **Audit report:** `modules/Module 4 - CRM/docs/audits/M4_DEEP_AUDIT_2026_05_13.md` — every finding, every recommendation, every "Option A/B/C" analysis.
2. **Module documentation:** standard SESSION_CONTEXT, MODULE_SPEC, MODULE_MAP, db-schema for M4.
3. **Recent FOREMAN_REVIEWs:** the 3 most recent under `modules/Module 4 - CRM/docs/specs/*/FOREMAN_REVIEW.md` to harvest executor + author improvement proposals not yet applied.

---

## 4. The SPECs To Ship (priority order)

The Pipeline writes ONE SPEC at a time, executes it end-to-end (Foreman → Executor → Reviewer → Localhost-Tester → Foreman-Review), then moves to the next. Each SPEC's success criteria + smoke 7/7 must pass before the next begins.

### 4.1 SPEC #1 — `M4_INVITED_GHOST_ATTENDEE_FIX` (HIGH-1, ~1-2 hours)

**From audit:** Finding #1 (HIGH). `invited` status is counted toward event capacity by THREE consumers (the view `v_crm_event_stats`, the registration RPC `register_lead_to_event`, the storefront helper). Only the UI counter was patched in `ATTENDEE_COUNTER_DISPLAY_FIX` (2026-05-04). When a real lead clicks `%registration_url%`, the RPC sees `invited` rows as occupying slots and may block / waitlist a real registrant.

**Implementation:** Option A from the audit report — exclude `invited` from capacity counts in the 3 consumers. Reuse the existing `REGISTERED_STATUSES = ['registered','confirmed','attended']` constant.

**Touches:** view definition, RPC body, storefront helper. NO new tables. NO new statuses. Pure semantics-correction.

**Smoke:** 4 demo E2E paths:
1. Event with `invited` rows present → real lead registers → succeeds, counter increments.
2. Event at `max_capacity` (all `registered` slots full) → next lead correctly waitlisted.
3. Event with `invited` rows + capacity OPEN → counter shows correct number, `spots_remaining` correct.
4. Regression: existing event-day check-in flow still works.

### 4.2 SPEC #2 — `M4_AUTOMATION_RULES_UPDATED_AT` (~30 min)

**From open debt:** `M4-DEBT-CRM-AUTO-RULES-UPDATED-AT` — `crm_automation_rules` table has no `updated_at` column. Surfaced during `PRIZMA_CRM_BUGFIX_BACKPORT` (2026-05-12).

**Implementation:** single migration adding `updated_at timestamptz NOT NULL DEFAULT now()` + `ON UPDATE` trigger mirroring the canonical pattern on `crm_leads`. Backfill existing rows with `created_at` value as initial `updated_at`.

**Touches:** ONE table, ONE trigger. Pre-approved DDL per §2.4. Schema change only — no business-logic change.

**Smoke:** UPDATE a demo rule → confirm `updated_at` advanced. UPDATE same rule again → confirm advanced again.

### 4.3 SPEC #3 — `M4_DEAD_WAITLIST_SLUG_CLEANUP` (~45 min)

**From audit:** Finding #4 (MEDIUM). `waitlist` slug is dead on Prizma — never assigned, never referenced in code, but lives in `crm_statuses` table as a configured option. Daniel's analytical question "how many leads are on the waitlist?" returns 0 systematically, hiding that the lifecycle is incomplete.

**Implementation:** investigate first — confirm zero leads carry `status = 'waitlist'` on BOTH demo and Prizma. If confirmed dead → soft-delete the `waitlist` row from `crm_statuses` (set `is_active=false`, keep row for history). NO UPDATE on existing leads. NO data migration. Pure config cleanup.

**Touches:** ONE row UPDATE on `crm_statuses`. Affects which options appear in status-picker UI dropdowns. No code change required.

**Smoke:** demo + Prizma status-picker UI → confirm `waitlist` no longer appears. Confirm no existing data references it (`SELECT count(*) WHERE status='waitlist'` returns 0 on both tenants).

### 4.4 SPEC #4 — `M4_RAW_SB_WRAPPER_MIGRATION_PHASE_1` (~2-3 hours)

**From audit:** Finding #2 (HIGH). 136 raw `sb.from()` calls across `modules/crm/`, zero use of `DB.*` wrapper. M4-DEBT-02. This SPEC migrates the FIRST 30-40 calls — the ones in the most-frequently-loaded files (`crm-helpers.js`, `crm-leads-tab.js`, `crm-events-tab.js`). NOT a full migration — phase 1 of a future multi-phase effort.

**Implementation:** identify the 30-40 calls, replace each with the appropriate `DB.fetchAll` / `DB.batchCreate` / `DB.batchUpdate` equivalent. Iron Rule 7 compliance increases incrementally. No behavioral change.

**Touches:** 3-5 JS files. NO DB changes. NO EF changes.

**Smoke:** existing CRM flows still work — lead create, lead update, event list, event filter. Diff every change to confirm semantic equivalence.

**Stop trigger:** if any call site has unusual semantics (e.g., a join the wrapper doesn't support, a special filter the wrapper handles differently), SKIP that call site and log to FINDINGS. Do not stretch the wrapper to fit. Iron Rule 7 explicitly allows raw `sb.from()` for cases the wrapper can't handle.

### 4.5 SPEC #5 (optional, only if time) — `M4_FUNNEL_REPORT_FOUNDATION` (~1 hour)

**From audit:** Finding #5 (MEDIUM). Critical reports missing — funnel, per-staff conversion, source attribution, LTV.

**Implementation:** create ONE new view `v_crm_lead_funnel` that aggregates `crm_leads` by status, by source, by created_at month. NO UI work. The view is the foundation; UI consumption comes in a future SPEC.

**Touches:** ONE new view. Pre-approved DDL per §2.4 ONLY IF the Pipeline is still on track AND time remains.

**Smoke:** query the view on demo, confirm sensible results.

**SKIP this SPEC entirely if:**
- The previous 4 SPECs took >5 hours combined.
- Any of the previous 4 SPECs hit an escalation.
- Total run time exceeds 6 hours when this SPEC would start.

---

## 5. The Morning Summary

When the run ends, the Pipeline writes ONE summary file:

`modules/Module 4 - CRM/docs/audits/M4_OVERNIGHT_RUN_2026_05_13_SUMMARY.md`

Structure:
```
# Overnight Run Summary — 2026-05-13/14

## Master tag
- pre-overnight-m4-2026-05-13 → <hash>
- Rollback command: `git reset --hard pre-overnight-m4-2026-05-13 && git push --force-with-lease origin develop`

## SPECs run
| # | SPEC slug | Status | Duration | Commits | Top result |
|---|-----------|--------|----------|---------|-----------|
| 1 | M4_INVITED_GHOST_ATTENDEE_FIX | 🟢/🟡/🔴 | Xh Ym | N commits | one sentence |
| ... |

## Escalations
- (none) OR list of escalation file paths

## Smoke results
- SPEC 1: 7/7 / 6/7 / etc
- ...

## Open questions for Daniel
- 3-5 strategic questions surfaced during the run

## Recommended next steps
- (a) Merge develop → main as a batch (if all SPECs 🟢)
- (b) Cherry-pick specific SPECs (if mixed verdicts)
- (c) Rollback the run (if anything looks wrong)
- A clear recommendation with reasoning.
```

This is the file Daniel reads first thing in the morning.

---

## 6. Pipeline Selection

This Brief is executed by the standard Full Auto Pipeline:
- `opticup-strategic` (Foreman) writes each SPEC.
- `opticup-executor` runs each SPEC.
- `opticup-reviewer` audits each SPEC.
- `opticup-localhost-tester` smoke-tests each SPEC on demo.
- `opticup-strategic` (Foreman-review) closes each SPEC with FOREMAN_REVIEW.

After all SPECs close, ONE final summary is written by the Pipeline.

No `opticup-sentinel` usage — this is implementation, not audit.

---

## 7. Sleep-Through-It Confidence Check

Daniel asked: "can this run autonomously with no risk to production?"

The answer is YES, because:
- Production = `main` branch. The run touches `develop` only.
- Every change is on top of a single git tag that reverts the entire run in one command.
- No merge to main happens autonomously.
- No Prizma row gets written; demo only.
- Iron Rules 31, 32, 12, 15 are all enforced by hooks.
- Each SPEC ends with Reviewer + Localhost-Tester verdict before next SPEC starts.

If anything fails: the worst case is "develop has some commits that don't work; rollback with one command". Production is never affected.

---

*End of Brief. Activation prompt at `M4_OVERNIGHT_AUDIT_HARVEST_ACTIVATION_PROMPT.md`.*
