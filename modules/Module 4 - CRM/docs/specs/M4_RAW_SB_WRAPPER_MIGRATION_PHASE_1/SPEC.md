# SPEC — M4_RAW_SB_WRAPPER_MIGRATION_PHASE_1

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_RAW_SB_WRAPPER_MIGRATION_PHASE_1/SPEC.md`
> **Authored by:** opticup-strategic (Foreman) — overnight Pipeline
> **Authored on:** 2026-05-13/14 (overnight)
> **Module:** 4 — CRM
> **Driving brief:** `M4_OVERNIGHT_AUDIT_HARVEST_BRIEF.md` §4.4
> **Source debt:** `M4-DEBT-02` (Iron Rule 7 — API abstraction broken at scale)
> **Audit source:** `M4_DEEP_AUDIT_2026_05_13.md` §3.3.1
> **Master safety tag:** `pre-overnight-m4-2026-05-13` → `e2892d4`

---

## 0. Pre-Authoring Reality Check

- Brief read 2026-05-13/14. Audit §3.3.1 read.
- Live grep at SPEC-author time:
  - `grep -c "sb\.from(" modules/crm/crm-helpers.js` → **2**
  - `grep -c "sb\.from(" modules/crm/crm-leads-tab.js` → **4**
  - `grep -c "sb\.from(" modules/crm/crm-events-tab.js` → **2**
  - **Total in 3 target files: 8** (Brief expected 30-40 — premise drift; Brief's 30-40 was an estimate, the literal 3-file list yields 8). Phase 1 will migrate what's there in those files. Subsequent phases (2/3/...) will tackle the remaining 128 raw calls across the other 27 `modules/crm/*.js` files. **Decision:** honor literal Brief file list (not literal call count); document premise drift as Finding.
  - Module-wide total: 136 calls across 60 files — audit baseline confirmed.
- DB wrapper exists: `shared/js/supabase-client.js` line 3 (`const DB = ...`). Loaded by `crm.html` line 346 (verified via `grep "supabase-client" crm.html`).
- Wrapper API (verified by reading lines 100-300 of `supabase-client.js`):
  - `DB.select(table, filters, options)` — auto tenant_id filter, columns, order, range, single, rawFilters escape hatch.
  - `DB.insert/update/batchUpdate/softDelete/hardDelete`.
- 8 call site categorization (read at SPEC-author time):
  1. `crm-helpers.js:120` (`loadStatusCache`) — `crm_statuses` SELECT. Wraps cleanly.
  2. `crm-helpers.js:215` (`mergeLeadHistory`) — `v_crm_lead_event_history` SELECT with `.in('lead_id', ids)`. Wraps via `rawFilters`.
  3. `crm-leads-tab.js:43` (`loadCreditMaps`) — `crm_event_attendees` SELECT. Wraps cleanly.
  4. `crm-leads-tab.js:57` (`loadFailedCounts`) — `crm_message_log` SELECT with `.not()` + `.gte()`. Wraps via `rawFilters`.
  5. `crm-leads-tab.js:68` (`loadLeads`) — `v_crm_leads_with_tags` SELECT with range pagination. Wraps cleanly (limit + offset).
  6. `crm-leads-tab.js:322` (move-lead handler) — `crm_event_attendees` SELECT with `.in('status', [...])` + `.maybeSingle()`. **DOES NOT WRAP CLEANLY** — wrapper's `single:true` calls `.single()` (strict, errors on 0 rows) not `.maybeSingle()` (silent null on 0 rows). **SKIP + log** per Brief §4.4 stop-trigger.
  7. `crm-events-tab.js:18` (`loadEvents` statsQ) — `v_crm_event_stats` SELECT. Wraps cleanly.
  8. `crm-events-tab.js:26` (`loadEvents` regQ) — `crm_event_attendees` SELECT with `.in('status', REGISTERED_STATUSES)`. Wraps via `rawFilters`.
- Plan: migrate 7 of 8. Document 1 SKIP.
- Pre-existing untracked files: 50+ unrelated. Selective `git add` throughout.

### Live Baselines

| Metric | Value | How measured |
|--------|-------|--------------|
| `sb.from(` in `crm-helpers.js` | 2 | `grep -c "sb\.from(" modules/crm/crm-helpers.js` |
| `sb.from(` in `crm-leads-tab.js` | 4 | same |
| `sb.from(` in `crm-events-tab.js` | 2 | same |
| Module-wide `sb.from(` total | 136 | `grep -rc ... modules/crm/*.js \| awk` |
| `DB.*` references in `modules/crm/` | 0 | `grep -rln "DB\." modules/crm/*.js` returns no files |

### Lessons Already Incorporated

- Live baselines per Author Proposal #1 (from `STATUS_CHANGE_TRIGGERS_FRAMEWORK/FOREMAN_REVIEW.md`) — APPLIED above.
- Skip-and-log discipline (Brief §4.4 stop-trigger) — APPLIED for call site #6.

---

## 1. Goal

Migrate 7 of the 8 raw `sb.from()` calls in `modules/crm/{crm-helpers,crm-leads-tab,crm-events-tab}.js` to the canonical `DB.*` wrapper (`shared/js/supabase-client.js`). The 8th (move-lead handler in `crm-leads-tab.js:322`) uses `.maybeSingle()` which the wrapper does not currently expose; SKIP + log to FINDINGS so a future phase can extend the wrapper or migrate this call manually. Phase 1 of a multi-phase Iron-Rule-7 cleanup; reduces M4's wrapper-bypass count from 136 → 129 in this run, with the bulk to come in Phases 2/3.

---

## 2. Background & Motivation

`M4-DEBT-02` was logged after the M4 audit cycle observed M4's near-total bypass of the project's `DB.*` wrapper (Iron Rule 7). Audit §3.3.1 quantified: 136 raw `sb.from()` calls across 60 CRM JS files, 0 use of `DB.*`. Audit Rec 3 offered two options: (a) phased migration to wrappers, or (b) document M4 as wrapper-exempt with a justification. Brief §4.4 chose (a): start with a small Phase 1 across the most-frequently-loaded files. This SPEC delivers Phase 1.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected | Verify command |
|---|-----------|----------|----------------|
| 1 | Branch state | `develop`, clean | `git status --short` empty |
| 2 | Commits produced | 2–3 | `git log e2892d4..HEAD --oneline \| wc -l` |
| 3 | Wrapper migrations | 7 of 8 raw `sb.from()` calls in the 3 target files replaced with `DB.*` equivalents | grep counts post-migration |
| 4 | `crm-helpers.js` `sb.from(` count | 0 (was 2, both migrated) | `grep -c "sb\.from(" modules/crm/crm-helpers.js` → 0 |
| 5 | `crm-leads-tab.js` `sb.from(` count | 1 (was 4; 1 SKIP — call site #6 maybeSingle) | `grep -c "sb\.from(" modules/crm/crm-leads-tab.js` → 1 |
| 6 | `crm-events-tab.js` `sb.from(` count | 0 (was 2, both migrated) | `grep -c "sb\.from(" modules/crm/crm-events-tab.js` → 0 |
| 7 | `DB.` references in 3 files | ≥ 7 | `grep -c "DB\." modules/crm/{crm-helpers,crm-leads-tab,crm-events-tab}.js \| awk '{s+=$NF} END {print s}'` ≥ 7 |
| 8 | File sizes still under cap | crm-helpers.js ≤ 350, crm-leads-tab.js ≤ 350, crm-events-tab.js ≤ 350 | `wc -l` each |
| 9 | Integrity Gate | exit 0 or 2 | `npm run verify:integrity` |
| 10 | Destructive-ops gate | exit 0 | `verify.mjs --staged` |
| 11 | Semantic equivalence — diff every change | Each migrated call's `DB.select(...)` form translates 1:1 to the original `sb.from(t).select(c).eq(...)` chain when followed through the wrapper's internal translation. Documented in EXECUTION_REPORT §3 table. | manual diff trace |
| 12 | Smoke: status cache + leads list + events list | (no automated browser smoke in this overnight run — documented manual smoke instructions in §5; mark criterion 12 ACK-only) | manual trace + diff |
| 13 | Zero DB writes | Migration is read-side only | (vacuously true — no INSERT/UPDATE/DELETE introduced) |
| 14 | Zero Prizma writes | (same) | (vacuously true) |
| 15 | Docs updated | 5 docs | grep `M4_RAW_SB_WRAPPER_MIGRATION_PHASE_1` |

---

## 4. Autonomy Envelope

**CAN:** read files, make surgical edits to the 3 target files, commit + push, log FINDINGS for the 1 skipped call site.

**MUST STOP:**
- Any call site translation that requires non-trivial semantic interpretation (e.g., `.maybeSingle()` → handled by SKIP path).
- Any test failure (no automated tests run; relying on semantic-equivalence diff).
- Any other CRM JS file edit outside the 3 target files.
- Any wrapper extension (e.g., adding `maybeSingle` to `DB.select`) — that's a Module 1.5 SPEC, not this one.

---

## 5. Stop-on-Deviation Triggers

- File size of any of the 3 target files would exceed 350 → STOP, re-evaluate.
- Wrapper translation produces different chain shape than original (e.g., wrapper's `order` syntax doesn't accept the original's descending form) → STOP, document.
- Any `DB.select` call would auto-inject a tenant_id where the original was tenant-agnostic → STOP (would break behavior).

### Manual smoke instructions (for Daniel post-merge if needed)

1. Open `crm.html` on demo tenant.
2. Status badges render → `loadStatusCache` works.
3. "Leads" tab loads with rows + tag pills → `loadLeads` + `mergeLeadHistory` + `loadCreditMaps` + `loadFailedCounts` work.
4. "Events" tab loads with capacity bars → `loadEvents` (statsQ + regQ) works.
5. Click "Move attendee" button on a Tier-2 lead row → `crm-leads-tab.js:322` (the SKIP'd call site) still works because it was NOT migrated.

---

## 6. Rollback Plan

- **Level 1:** `git revert <hash>` on develop (single commit, 3 file edits).
- **Level 2:** master safety tag.

---

## Destructive Operations

None. Read-side refactor of 3 JS files. Zero file deletes, zero DDL, zero DML. The DB wrapper functions called are read-only (`DB.select`).

---

## 7. Out of Scope

- The other 128 raw `sb.from()` calls across `modules/crm/*.js` (Phase 2/3+).
- Extending the `DB.*` wrapper to support `maybeSingle` (Module 1.5 SPEC).
- The 1 skipped call site (`crm-leads-tab.js:322`) — log only.
- Any UI / behavior change.
- Any other module's wrapper migration.

---

## 8. Expected Final State

### Modified files (3 JS files)
- `modules/crm/crm-helpers.js` — 2 raw calls → 2 `DB.*` calls (loadStatusCache, mergeLeadHistory).
- `modules/crm/crm-leads-tab.js` — 4 raw calls → 3 `DB.*` calls + 1 unchanged (move-lead handler at line 322, SKIP'd).
- `modules/crm/crm-events-tab.js` — 2 raw calls → 2 `DB.*` calls (statsQ, regQ in loadEvents).

### Net diff
- 7 raw `sb.from(...)` chains replaced with `DB.select(...)` calls.
- 1 raw chain unchanged (line 322 of crm-leads-tab.js, with inline comment explaining why).
- File line counts: small net change per file (mostly equal lines for-equal lines).

### Docs updated
- M4 SESSION_CONTEXT + CHANGELOG + MODULE_MAP + MASTER_ROADMAP + OPEN_TASKS.

### Iron-Rule-7 progress
- Before: M4 wrapper-bypass count = 136.
- After: M4 wrapper-bypass count = 129. **5% reduction in this SPEC.** (Brief expected 22-29% from a 30-40 call migration; actual is bounded by the literal 3-file scope.)

---

## 9. Commit Plan

- Commit 1 — `refactor(m4-crm): migrate 7 sb.from() to DB.* wrapper in crm-{helpers,leads-tab,events-tab}.js` (3 JS files).
- Commit 2 — `docs(m4-crm): note M4_RAW_SB_WRAPPER_MIGRATION_PHASE_1 in SESSION_CONTEXT + CHANGELOG + MODULE_MAP + MASTER_ROADMAP + OPEN_TASKS`.
- Commit 3 — `chore(spec): close M4_RAW_SB_WRAPPER_MIGRATION_PHASE_1 with retrospective`.

---

## 10. Dependencies / Preconditions

- DB wrapper loaded by `crm.html` (CONFIRMED line 346).
- Master safety tag exists.
- SPECs #1 + #2 closed.

### Browser readiness pre-flight
SPEC has no automated browser smoke — relies on diff-based semantic equivalence + post-merge manual smoke. Skip Chrome.

---

## 11. Lessons Already Incorporated

- Author Proposal #1 (live baselines) — APPLIED §0.
- Author Proposal from SPEC #2's FOREMAN_REVIEW (warn about `_down.sql` hook) — N/A (no migration SQL in this SPEC).

---

## 12. Pre-Merge Checklist

- [ ] All §3 criteria pass (actuals in EXECUTION_REPORT §2).
- [ ] Integrity Gate exit 0 or 2.
- [ ] git status clean post-close.
- [ ] Pushed to origin.
- [ ] EXECUTION_REPORT + FINDINGS + FOREMAN_REVIEW landed.
- [ ] FINDINGS notes the 1 skipped call site (line 322) with proposed Phase 2 handling.

*End of SPEC.*
