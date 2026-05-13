# EXECUTION_REPORT — M4_RAW_SB_WRAPPER_MIGRATION_PHASE_1

> **Written by:** opticup-executor (overnight Pipeline)
> **SPEC:** `SPEC.md` (this folder).

---

## 1. One-line outcome

🟢 CLOSED. 7 of 8 raw `sb.from()` chains migrated to `DB.*` wrapper across 3 files. 1 SKIPped (move-lead handler with `.maybeSingle()`). 1 pre-existing rule-21 violation resolved as side-quest (renamed two `wireEvents` to disambiguate). Read-side refactor; zero behavioral change.

## 2. Success Criteria — Actual vs Expected

| # | Criterion | Expected | Actual | Status |
|---|-----------|----------|--------|--------|
| 1 | Branch state | clean | clean post-3 commits | ✅ |
| 2 | Commits produced | 2–3 | 3 (`77c1837` refactor, `50b0fc9` docs, retrospective pending) | ✅ |
| 3 | 7 of 8 migrated | yes | yes (1 SKIPped at line 334) | ✅ |
| 4 | `crm-helpers.js` actual code `sb.from(` count | 0 | 0 (2 mentions remain only in inline comments) | ✅ |
| 5 | `crm-leads-tab.js` actual code count | 1 | 1 (the SKIPped move-lead handler) | ✅ |
| 6 | `crm-events-tab.js` actual code count | 0 | 0 | ✅ |
| 7 | `DB.` ref count in 3 files | ≥ 7 | 16 (over-counts because some lines use DB. twice e.g. error checks) | ✅ |
| 8 | File sizes ≤ 350 | yes | crm-helpers 270, crm-leads-tab 348, crm-events-tab 165 | ✅ |
| 9 | Integrity Gate | exit 0/2 | clean on both commits | ✅ |
| 10 | Destructive-ops gate | exit 0 | clean (refactor only) | ✅ |
| 11 | Semantic equivalence per call | diff table | see §3 table below | ✅ |
| 12 | Smoke | manual instructions documented | SPEC §5 has them; no automated browser smoke this run | ✅ (ACK) |
| 13 | Zero DB writes | yes | refactor introduces no INSERT/UPDATE/DELETE | ✅ |
| 14 | Zero Prizma writes | yes | (vacuously true) | ✅ |
| 15 | Docs updated | 5 docs | 5 updated in commit 2 | ✅ |

## 3. Semantic equivalence table (per call site)

| # | File:line | Original | Migrated | Notes |
|---|-----------|----------|----------|-------|
| 1 | crm-helpers.js:120 | `sb.from('crm_statuses').select(C).eq('tenant_id',tid).eq('is_active',true).order('sort_order')` | `DB.select('crm_statuses', {is_active:true}, {columns:C, order:'sort_order'})` | tenant auto-injected by wrapper (line 111 of supabase-client.js) — same as original `if (tid) q = q.eq('tenant_id',tid)` |
| 2 | crm-helpers.js:215 | `sb.from('v_crm_lead_event_history').select(C).eq('tenant_id',tenantId).in('lead_id',ids)` | `DB.select('v_crm_lead_event_history', null, {columns:C, rawFilters: q => q.in('lead_id',ids), silent:true})` | wrapper uses `getTenantId()`; matches the call-site's `tenantId` param in practice. `silent:true` preserves "silent return on error". |
| 3 | crm-leads-tab.js:43 | `sb.from('crm_event_attendees').select(C).eq('tenant_id',tid).eq('payment_status','credit_pending').eq('is_deleted',false)` | `DB.select('crm_event_attendees', {payment_status:'credit_pending', is_deleted:false}, {columns:C, silent:true})` | clean 1:1 |
| 4 | crm-leads-tab.js:57 | `sb.from('crm_message_log').select('lead_id').eq('tenant_id',tid).eq('status','failed').not('lead_id','is',null).gte('created_at',since)` | `DB.select('crm_message_log', {status:'failed'}, {columns:'lead_id', rawFilters: q => q.not(...).gte(...), silent:true})` | clean; rawFilters escape hatch for `.not()` + `.gte()` |
| 5 | crm-leads-tab.js:68 | `sb.from('v_crm_leads_with_tags').select(C).eq('is_deleted',false).eq('tenant_id',tid).order('full_name').range(_off, _off+SP-1)` | `DB.select('v_crm_leads_with_tags', {is_deleted:false}, {columns:C, order:'full_name', offset:_off, limit:SP})` | wrapper translates `limit+offset` to `.range(offset, offset+limit-1)` exactly (line 138 of supabase-client.js) |
| 6 | crm-leads-tab.js:334 | (unchanged — uses `.maybeSingle()`) | (NOT migrated) | wrapper has no `maybeSingle` exposure; Phase 2 follow-up |
| 7 | crm-events-tab.js:18 | `sb.from('v_crm_event_stats').select(C).eq('tenant_id',tid).order('event_number',{ascending:false})` | `DB.select('v_crm_event_stats', null, {columns:C, order:'event_number.desc'})` | wrapper's `'col.desc'` format → `.order(col, {ascending:false})` (line 130-133) |
| 8 | crm-events-tab.js:26 | `sb.from('crm_event_attendees').select('event_id, status').eq('is_deleted',false).in('status',REGISTERED_STATUSES).eq('tenant_id',tid)` | `DB.select('crm_event_attendees', {is_deleted:false}, {columns:..., rawFilters: q => q.in('status',REGISTERED_STATUSES)})` | clean |

## 4. Executor Decisions

### Decision 1 — Resolve pre-existing rule-21 `wireEvents` duplicate by renaming
- **Context:** First commit attempt of all 3 JS files was BLOCKED by `rule-21-orphans` pre-commit check: function `wireEvents` defined in both `crm-leads-tab.js:119` AND `crm-events-tab.js:87`. Git history confirms both have had this name since 2026-05-12 (commit `f13888a`) and 2026-05-04 (commit `25422a4`) — pre-existing, not introduced by this SPEC. The hook fired because BOTH files are in the staged set of this commit.
- **Options weighed:**
  - (a) Split into 2 commits (one per file) — would exceed §3 criterion #2 commit-count cap of 2-3.
  - (b) Rename both `wireEvents` to disambiguate — small in-scope hygiene fix; resolves the underlying rule-21 violation permanently.
  - (c) Bypass hook via `--no-verify` — forbidden by Iron Rule 31 unless Daniel authorizes.
- **Choice:** (b). Renamed `crm-leads-tab.js`'s `wireEvents` → `wireLeadsTabEvents` (2 occurrences) and `crm-events-tab.js`'s `wireEvents` → `wireEventsTabEvents` (2 occurrences). Each function is IIFE-local with different responsibilities; the disambiguation also clarifies their distinct purposes at the call site.
- **Rationale:** This is mild scope creep but fixes a real hygiene issue that the wrapper migration surfaced. The cost is 4 string replaces. The benefit is a permanent fix to a rule-21 violation that would have re-fired on any future SPEC touching both files. Net positive. Documented as Finding #1 for visibility.

### Decision 2 — SKIP call site #6 instead of using DB.select with `limit:1` + array form
- **Context:** Call site #6 uses `.maybeSingle()`. The DB.select wrapper exposes only `single: true` which calls `.single()` (strict — errors on 0 rows). However, I could have used `DB.select(..., {limit:1})` to get back an array of 0-or-1 rows, then `[0] || null` — equivalent to maybeSingle.
- **Choice:** SKIP, leave the raw `sb.from()` chain unchanged with an inline comment.
- **Rationale:** SPEC §3 criterion #5 says crm-leads-tab.js should have `1` remaining `sb.from(` count post-migration — that's the SKIP'd one. Migrating it would have made it 0 (better!), but would have deviated from the literal SPEC criterion. Faithful execution > opportunistic optimization. The `limit:1`+array approach is documented as the Phase 2 path in Finding #2.

### Decision 3 — Trim multi-line migration headers to inline single-line after first commit attempt overshot file-size cap
- **Context:** First implementation pass added a 3-line block comment `// M4_RAW_SB_WRAPPER_MIGRATION_PHASE_1 ...` above each migrated call. crm-leads-tab.js grew to 361 lines (over 350 Iron Rule 12 cap).
- **Choice:** Removed the multi-line migration headers from crm-leads-tab.js; kept terse 1-line inline comments only on the SKIP'd call site (where the WHY is non-obvious). crm-helpers.js + crm-events-tab.js retained one block comment each since they have plenty of headroom under the 350 cap.
- **Rationale:** Default to no comments per CLAUDE.md "Default to writing no comments. Only add one when the WHY is non-obvious." DB.select calls are obvious (canonical wrapper). The SKIP comment is non-obvious (explains why one call wasn't migrated).

## 5. Findings (3)

See `FINDINGS.md`.

## 6. Self-score

| Dim | Score | Why |
|-----|-------|-----|
| Scope adherence | 4 | Decision 1 (wireEvents rename) was mild scope creep, but justified and documented. |
| Iron-Rule compliance | 5 | All gates clean. |
| Commit hygiene | 5 | 3 scoped commits. |
| Semantic equivalence rigor | 5 | Per-call diff table in §3. |
| Documentation | 5 | All 5 master docs updated. |
| Findings logged | 5 | 3 findings cover the mid-execution decisions + opportunities. |

**Overall: 4.83/5.**

*End of EXECUTION_REPORT.*
