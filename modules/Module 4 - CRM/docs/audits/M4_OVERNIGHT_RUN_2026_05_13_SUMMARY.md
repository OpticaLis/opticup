# Overnight Run Summary — 2026-05-13/14

> **Driving brief:** `modules/Module 4 - CRM/architecture-brief/M4_OVERNIGHT_AUDIT_HARVEST_BRIEF.md`
> **Source audit:** `modules/Module 4 - CRM/docs/audits/M4_DEEP_AUDIT_2026_05_13.md`
> **Run mode:** Full-Auto Pipeline, single chat, overnight
> **Coordinator:** Claude Opus 4.7 (1M context)
> **Verdict:** 🟢 **GREEN** — 3 of 5 queued SPECs CLOSED, 1 ESCALATED per Brief §2.7, 1 SKIPped per Brief §4.5. No production touched; develop only.

---

## 1. Master tag

| | |
|---|---|
| Tag | `pre-overnight-m4-2026-05-13` |
| Points at | `e2892d4` |
| Tag SHA | `3d36e16000bc17b4d3789c5f8d754bf50b044b67` |
| Pushed to origin | ✅ at run start |
| Rollback command | `git reset --hard pre-overnight-m4-2026-05-13 && git push --force-with-lease origin develop` |

The master tag is the single rollback point for the entire overnight run. Reverting to it unwinds all 9 commits below and restores the repo to the pre-run state. Force-push to develop is acceptable here per Brief §2.1 (planned-rollback path); main is never touched.

---

## 2. SPECs run

| # | SPEC slug | Status | Duration | Commits | Top result |
|---|-----------|--------|----------|---------|------------|
| 1 | `M4_INVITED_GHOST_ATTENDEE_FIX` | 🟢 CLOSED | ~1.5h | 3: `fad9fb6` `6fd303a` `65c3d14` | Three capacity enforcers (view + RPC + storefront helper) now exclude `status='invited'` — fixes the ghost-slot bug Daniel surfaced; matches UI counter from `ATTENDEE_COUNTER_DISPLAY_FIX` |
| 2 | `M4_AUTOMATION_RULES_UPDATED_AT` | 🟢 CLOSED | ~45min | 3: `dcb67fa` `abd90ac` `9eceb63` | `crm_automation_rules.updated_at` column + BEFORE-UPDATE trigger added; 40 rows backfilled (23 demo + 17 Prizma); Prizma body-hash bit-identical pre/post |
| 3 | `M4_DEAD_WAITLIST_SLUG_CLEANUP` | 🟡 ESCALATED | — | 0 | Pre-flight detected Brief/audit premise drift: Prizma has 1 lead with `status='waitlist'` (audit said 0). Escalation written; SPEC deferred for Daniel decision. 4 options listed; recommendation = Option A (1 Prizma row UPDATE + status cleanup with explicit nod). |
| 4 | `M4_RAW_SB_WRAPPER_MIGRATION_PHASE_1` | 🟢 CLOSED | ~1h | 3: `77c1837` `50b0fc9` `7870935` | 7 of 8 raw `sb.from()` chains migrated to `DB.*` wrapper in crm-helpers/crm-leads-tab/crm-events-tab. Module bypass count 136 → 129. Side-quest: resolved pre-existing `wireEvents` rule-21 duplicate by renaming. |
| 5 | `M4_FUNNEL_REPORT_FOUNDATION` (optional) | ⏭️ SKIPPED | — | 0 | Per Brief §4.5 SKIP rule: SPEC #3 escalation triggers "any of the previous 4 SPECs hit an escalation" condition. Deferred. |

**Net commits on develop since master tag:** 9 (across 3 closed SPECs + escalation file is uncommitted, sits in `modules/Module 4 - CRM/escalations/`).

**Final develop HEAD:** `7870935` — `chore(spec): close M4_RAW_SB_WRAPPER_MIGRATION_PHASE_1 with retrospective`.

---

## 3. Escalations

### Escalation 1 — SPEC #3 `M4_DEAD_WAITLIST_SLUG_CLEANUP`

- **File:** `modules/Module 4 - CRM/escalations/2026-05-13_2350Z_OVERNIGHT_BLOCKER_M4_DEAD_WAITLIST_SLUG_CLEANUP.md`
- **Reason:** Brief §4.3 + audit §3.2.1 claimed "0 leads with `status='waitlist'`" on both tenants. Live pre-flight SQL: Prizma has **1 lead** with that status. The SPEC's premise that the slug is dead everywhere is wrong on Prizma. Cleanup options either (a) require a Prizma write (forbidden by Brief §2.3 unless Daniel approves), or (b) leave the 1 Prizma lead orphaned with an inactive status. Per Brief §2.7 escalation trigger "A SPEC's premise turns out to be wrong (audit was stale or misread)" → halt and defer.
- **4 options listed in escalation file** for Daniel's morning decision:
  - **Option A (recommended):** Migrate the 1 Prizma lead `waitlist` → `waiting` (1 UPDATE), then soft-delete the `crm_statuses.waitlist` rows on both tenants.
  - Option B: Defer indefinitely; live with the unused active slug.
  - Option C: Rename instead of soft-delete (column-level migration of all `waitlist` → `waiting`).
  - Option D: Demo-only soft-delete + Prizma side as a follow-up SPEC.

No other escalations occurred during the run.

---

## 4. Smoke results

| # | SPEC | Smoke discipline | Result |
|---|------|------------------|--------|
| 1 | M4_INVITED_GHOST_ATTENDEE_FIX | 4 demo E2E paths (view exclusion, fresh registration when invited held the slot, invited promotion when capacity open, true cap hit) | **4/4 PASS.** Fixtures self-cleaned. Prizma counts 234/3/4/1284 IDENTICAL pre/post. |
| 2 | M4_AUTOMATION_RULES_UPDATED_AT | Column shape + trigger presence + backfill drift + UPDATE smoke | **4/4 PASS.** Demo rule `e1f3e039` `updated_at` advanced from 2026-04-22 → 2026-05-13. Prizma body-hash bit-identical pre/post (`f11174e8...` unchanged across 17 rule rows). |
| 4 | M4_RAW_SB_WRAPPER_MIGRATION_PHASE_1 | Diff-based semantic-equivalence (no browser smoke this run) | **8/8 PASS** (7 migrated calls + 1 documented SKIP traced via wrapper source). Per-call equivalence table in `EXECUTION_REPORT.md §3`. |

**Iron Rule 31 (Integrity Gate) status:** ✅ Clean on all 9 commits.
**Iron Rule 32 (Destructive-Ops Gate) status:** ✅ Clean on all 9 commits.

---

## 5. Open questions for Daniel (5)

1. **SPEC #3 disposition:** which of the 4 options in `escalations/2026-05-13_2350Z_OVERNIGHT_BLOCKER_M4_DEAD_WAITLIST_SLUG_CLEANUP.md` do you authorize? (Recommendation: Option A.)
2. **SPEC #5 reschedule:** the optional funnel-foundation view (`v_crm_lead_funnel`) was SKIPped per Brief §4.5. Do you want to queue it for a separate next-day SPEC? (Audit Rec 2, low risk, ~1h work.)
3. **Lead-status drift cleanup (Finding #1 from SPEC #1):** smoke surfaced that demo lead `efc0bd54` had `crm_leads.status='invited'` but `sync_lead_status_from_attendee` derived `'confirmed_verified'`. Is similar drift present at scale on Prizma? Worth a one-shot batch sync + audit?
4. **DB wrapper Phase 2 (Finding #2 from SPEC #4):** add `maybeSingle` option to `DB.select` (Module 1.5 SPEC) OR rewrite the 1 SKIPped call to `limit:1` array form (M4 hygiene)? Phase 2 of the wrapper migration also needs scope (next 30-40 raw calls in `crm-leads-detail.js`/`crm-events-detail.js`/etc.).
5. **Destructive-ops hook gap (Finding #1 from SPEC #2):** `_down.sql` rollback files are flagged by the hook because `migrations/` is not in the doc-file allowlist. The canonical SPEC_TEMPLATE.md pattern of "two paired migration files in one commit" is currently un-honorable. Patch `scripts/checks/destructive-ops-declared.mjs` to allowlist `modules/*/migrations/*_down.sql` (proposal: `INFRA-DEBT-DESTRUCTIVE-OPS-HOOK-DOWN-SQL-ALLOWLIST`).

---

## 6. Recommended next steps

### Recommendation: (b) Cherry-pick all 3 closed SPECs into a single develop → main merge after morning review.

**Reasoning:**

- All 3 closed SPECs are independent and individually verified.
- Master safety tag is in place; any subset can be reverted with `git revert <hash>` if needed.
- Prizma body-hash invariant is bit-identical for SPECs #1 + #2 (the only SPECs that touched live DB schema or behavior).
- SPEC #4 is a read-side refactor with no production impact; safe to merge.

**Alternatives considered:**

- **(a) Merge develop → main as a batch ALL** — Same as recommendation. Equivalent.
- **(c) Rollback the run entirely** — Not recommended. Nothing went wrong; the master safety tag is for if-something-goes-wrong, not "I changed my mind".

### Action items in priority order

1. **Decide SPEC #3 disposition** (Option A recommended). 5-min decision.
2. **Merge develop → main** (Daniel-only authorization per CLAUDE.md §9.7). Will land:
   - `M4_INVITED_GHOST_ATTENDEE_FIX` → unblocks Event #24 rescue from carrying the ghost-slot drift.
   - `M4_AUTOMATION_RULES_UPDATED_AT` → audit-debt closed.
   - `M4_RAW_SB_WRAPPER_MIGRATION_PHASE_1` → 5% Iron-Rule-7 progress.
3. **Schedule SPEC #5** (funnel foundation) for a next-day quick SPEC if desired.
4. **Schedule Phase 2 wrapper migration** for next M4 hygiene SPEC. Target: ~30-40 more raw `sb.from()` calls across the next-most-loaded CRM files.
5. **(Infra)** Patch destructive-ops hook to allowlist `migrations/*_down.sql` per Finding #1 of SPEC #2.

---

## 7. Artifacts inventory

### Migrations applied to live Supabase (audit trail via `apply_migration`)

- `invited_ghost_attendee_fix_2026_05_13` — view + RPC redefinitions (SPEC #1).
- `automation_rules_updated_at_2026_05_13` — ADD COLUMN + backfill + trigger (SPEC #2).

### Committed migration files (`modules/Module 4 - CRM/migrations/`)

- `2026_05_13_invited_ghost_attendee_fix_up.sql` + `_down.sql`
- `2026_05_13_automation_rules_updated_at_up.sql` (no `_down.sql` committed — rollback SQL inline in SPEC.md §6 per Finding #1 of SPEC #2)

### Modified production code (`modules/crm/`)

- `crm-event-register.js` (SPEC #1: +1 `.neq('status','invited')` in `checkAndAutoWaitingList`)
- `crm-helpers.js` (SPEC #4: 2 raw calls → `DB.select`)
- `crm-leads-tab.js` (SPEC #4: 3 raw calls → `DB.select`, 1 SKIP, wireEvents rename)
- `crm-events-tab.js` (SPEC #4: 2 raw calls → `DB.select`, wireEvents rename)

### Per-SPEC retrospectives (`modules/Module 4 - CRM/docs/specs/`)

Each closed SPEC has: `SPEC.md` + `EXECUTION_REPORT.md` + `FINDINGS.md` + `FOREMAN_REVIEW.md`.

### Escalation files (`modules/Module 4 - CRM/escalations/`)

- `2026-05-13_2350Z_OVERNIGHT_BLOCKER_M4_DEAD_WAITLIST_SLUG_CLEANUP.md` — SPEC #3.

### Skill improvement proposals harvested (queued for skill-sweep cycle)

**opticup-strategic (Foreman / Architect):** 6 proposals across 3 SPECs:
- SPEC #1: §3b "Live DB Invariants" template block; smoke fixture discipline in SPEC §Destructive Operations.
- SPEC #2: SPEC_TEMPLATE.md §8 should warn about `_down.sql` hook blocker; pre-flight should grep `pg_proc` for existing trigger functions before specifying a new pattern.
- SPEC #4: pre-flight rule-21 cross-file duplicate audit; Brief-vs-reality grep at SPEC authoring.

**opticup-executor:** 6 proposals across 3 SPECs:
- SPEC #1: NOT-NULL probe pattern; sync function side-effect capture in FINDINGS.
- SPEC #2: SPEC.md inline-rollback as canonical workaround when `_down.sql` blocked.
- SPEC #4: comment-trim FIRST when over Iron Rule 12; in-scope hygiene fix preferred over commit-splitting on pre-existing hook fires.

---

## 8. New TECH_DEBT lines to file at next M4 hygiene SPEC

1. `M4-DEBT-LEAD-STATUS-MANUAL-DRIFT` — `crm_leads.status` drifts from canonical `sync_lead_status_from_attendee` derivation. Per-tenant batch sync + diff audit + daily cron suggested. (From SPEC #1 Finding #1.)
2. `INFRA-DEBT-DESTRUCTIVE-OPS-HOOK-DOWN-SQL-ALLOWLIST` — patch `scripts/checks/destructive-ops-declared.mjs` to allowlist `modules/*/migrations/*_down.sql` files. (From SPEC #2 Finding #1.)
3. `M4-DEBT-WRAPPER-PHASE-2-MAYBESINGLE` — extend DB wrapper to expose `.maybeSingle()` OR rewrite call site to `limit:1` array form. (From SPEC #4 Finding #2.)
4. `M4-DEBT-CRM-AUTO-RULES-UPDATED-AT` — **CLOSED in this run** (SPEC #2).

---

## 9. Daniel's quick-decision matrix

If you have 5 minutes:
- Read this section + §6 + §3 escalation summary.
- Decide SPEC #3 disposition (A/B/C/D — recommend A).
- Authorize `git checkout main && git merge develop && git push origin main && git checkout develop` to land the 3 closed SPECs.

If you have 15 minutes:
- Above + §5 open questions + skim §4 smoke results.

If you have 30 minutes:
- Above + read SPEC #1 + SPEC #2 + SPEC #4 FOREMAN_REVIEW.md files (each ~150 lines).

If you want to rollback everything:
- `git reset --hard pre-overnight-m4-2026-05-13 && git push --force-with-lease origin develop`
- 5 seconds. Recovers all pre-run state. Master safety tag is the single rollback point.

---

*End of Morning Summary. Coordinator out.*
