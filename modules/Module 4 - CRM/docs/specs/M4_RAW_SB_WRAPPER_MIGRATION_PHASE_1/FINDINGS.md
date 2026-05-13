# FINDINGS — M4_RAW_SB_WRAPPER_MIGRATION_PHASE_1

---

## Finding #1 — Pre-existing `wireEvents` rule-21 duplicate surfaced by wrapper migration

**Severity:** RESOLVED in this SPEC (was MEDIUM pre-existing).

**What:** `function wireEvents` was defined in BOTH `crm-leads-tab.js:119` (since 2026-05-12, commit `f13888a`) and `crm-events-tab.js:87` (since 2026-05-04, commit `25422a4`). Both are IIFE-local in different files with different responsibilities (one wires the leads-table click/keyboard handlers; the other wires the events-tab filter/search). The `rule-21-orphans` pre-commit check correctly flags this as a name collision because its parser is shallow — it can't tell that each function is local to its closure.

**Resolution in this SPEC (Decision 1 in EXECUTION_REPORT §4):** Renamed both to disambiguate:
- `crm-leads-tab.js`: `wireEvents` → `wireLeadsTabEvents` (definition at line 119, single call site at line 91)
- `crm-events-tab.js`: `wireEvents` → `wireEventsTabEvents` (definition at line 87, single call site at line 52)

Trivial rename, no behavioral change. Resolves the rule-21 violation permanently.

**Why it surfaced now:** The wrapper migration touched both files in the same commit. Prior SPECs that touched only one of the two never staged them together, so the orphans check never ran on both at once.

---

## Finding #2 — `DB.select` wrapper does not expose `.maybeSingle()`

**Severity:** LOW (one call site SKIPped in Phase 1; Phase 2 follow-up.)

**What:** Call site `crm-leads-tab.js:334` (move-lead click handler) uses `.maybeSingle()` to fetch the most-recent active attendee row for a lead — returns `{data: row, error: null}` for 0 or 1 rows, no error on 0. The DB.select wrapper exposes only `single: true` which calls `.single()` (strict — errors on 0 rows). No `maybeSingle` option.

**Workarounds available for Phase 2:**
- **Option A:** Extend the wrapper in `shared/js/supabase-client.js` to add `opts.maybeSingle: true` that calls `.maybeSingle()` instead of `.single()`. Module 1.5 SPEC required.
- **Option B:** Use `DB.select(table, filters, {limit:1, ...})` to get back an array of 0-or-1 rows, then access `[0] || null`. No wrapper change required. ~3 line change in the call site.

**Recommendation:** Option B for the next M4 hygiene SPEC. Option A is cleaner but requires Module 1.5 coordination.

**Disposition:** Log as `M4-DEBT-WRAPPER-PHASE-2-MAYBESINGLE` in `TECH_DEBT.md` at next M4 hygiene SPEC. Phase 2 of this wrapper migration will pick it up.

---

## Finding #3 — Brief §4.4 expected "30-40 calls" but the literal 3-file scope yields only 8

**Severity:** INFO (premise drift; Brief estimate vs reality).

**What:** Brief §4.4 said: "The audit's Finding #2 (HIGH). 136 raw `sb.from()` calls across `modules/crm/`, zero use of `DB.*` wrapper... This SPEC migrates the FIRST 30-40 calls — the ones in the most-frequently-loaded files (`crm-helpers.js`, `crm-leads-tab.js`, `crm-events-tab.js`)." Live grep at SPEC-author time: 2 + 4 + 2 = 8 calls in those 3 files. The Brief's "30-40" was an estimate; the actual literal scope is 8.

**Why it matters:** Phase 1 reduces the module-wide bypass count from 136 → 129 (5%) instead of the Brief-expected ~22-29%. The audit's broader goal is still on track — Phase 2 needs to bite into the remaining 128 calls across the other 27 CRM JS files to make meaningful progress.

**Disposition:** Log Phase 2 plan for future SPEC: target the next 30-40 raw calls in the next most-frequently-loaded files (likely `crm-leads-detail.js`, `crm-events-detail.js`, `crm-event-day-manage.js`, `crm-messaging-broadcast.js`, etc.). Choose files by both call-count + load-frequency.

---

*End of FINDINGS.*
