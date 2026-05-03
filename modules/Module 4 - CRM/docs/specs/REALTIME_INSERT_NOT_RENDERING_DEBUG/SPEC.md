# SPEC — REALTIME_INSERT_NOT_RENDERING_DEBUG

> **Location:** `modules/Module 4 - CRM/docs/specs/REALTIME_INSERT_NOT_RENDERING_DEBUG/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-03
> **Module:** 4 — CRM
> **Phase (if applicable):** Two-phase debug-then-fix follow-up to `CRM_REALTIME_INCOMING_PILOT` (commit `5d0bd9d`)

---

## 1. Goal

Diagnose why Realtime INSERT events on `crm_leads` aren't rendering new leads on the Tier-1 incoming tab in real-time (UPDATE events DO trigger render — confirmed). Phase 1 (this SPEC's commit) instruments `handleIncomingInsert` + `startRealtime` with `console.log` diagnostics. Phase 2 (separate commit, after Daniel's console capture) removes the logs and lands the actual fix.

---

## 2. Background & Motivation

`CRM_REALTIME_INCOMING_PILOT` (commit `5d0bd9d`) shipped Realtime on the incoming tab with all 8 acceptance cases passing. In real-world use, Daniel observed: (a) form-submitted leads do NOT appear on the open tab in <2s; (b) opening a different lead and changing its status causes the new lead to suddenly appear (UPDATE-triggered re-render reveals the existing-but-unrendered row).

What's been ruled out (per activation brief): publication membership ✅, REPLICA IDENTITY FULL ✅, RLS policies ✅, lead-intake EF write ✅, storefront wiring ✅, channel subscription ✅. The leak is somewhere in the INSERT → handler → render path on the client.

The 4 hypotheses from the brief (A: RLS-on-Realtime; B: race against initial fetch; C: Tier-1 status mismatch; D: pagination/render gating) cannot be distinguished without runtime evidence. The only path forward is targeted logging.

---

## 3. Success Criteria — Phase 1 (this commit)

| # | Criterion | Expected | Verify |
|---|-----------|---------|--------|
| 1 | Branch state at start | clean post-stash | `git status --porcelain` → empty |
| 2 | Files modified | 1 source file | `git diff --name-only` (excluding SPEC folder) → `modules/crm/crm-incoming-tab.js` |
| 3 | `crm-incoming-tab.js` line count | 322 → ≤ 335 | `wc -l modules/crm/crm-incoming-tab.js` ≤ 335 |
| 4 | `[Realtime DEBUG]` log lines added | ≥ 9 | `grep -c "\[Realtime DEBUG\]" modules/crm/crm-incoming-tab.js` ≥ 9 |
| 5 | `subscribe()` callback added | 1 hit | `grep -n "subscribe(function" modules/crm/crm-incoming-tab.js` → 1 hit |
| 6 | Iron Rule 12 (≤ 350) | crm-incoming-tab.js ≤ 350 | covered by #3 |
| 7 | Integrity gate | exit 0 or 2 | `npm run verify:integrity; echo $?` |
| 8 | Single commit | 1 ahead of origin | `git rev-list --count origin/develop..HEAD` → 1 |
| 9 | Pushed | local == origin/develop | post-push verify |
| 10 | In-scope clean tree | empty | `git status --short modules/crm/ "<spec folder>/"` → empty |
| 11 | Stash restored | pop succeeds | end of session |

---

## 4. Phase 1 — Expected Final State (this commit)

### Modified file: `modules/crm/crm-incoming-tab.js`

**Edit A — `startRealtime()`: replace `.subscribe();` with a callback logging the subscription status:**

Find:
```javascript
        .subscribe();
```

Replace with:
```javascript
        .subscribe(function (status, err) { console.log('[Realtime DEBUG] subscribe status:', status, 'err:', err); });
```

**Edit B — `handleIncomingInsert()`: thread `console.log` calls into the existing flow.** The brief's exact log spec, plus 3 EARLY-EXIT logs on each return path so we can distinguish WHICH check rejected the row (vital for hypothesis A vs B vs C):

Find:
```javascript
  function handleIncomingInsert(row, tier1) {
    if (!row || row.is_deleted) return;
    if (tier1.length && tier1.indexOf(row.status) === -1) return;
    if (_allLeads.some(function (l) { return l.id === row.id; })) return;
    _allLeads.unshift(row);
    applyIncomingFilters();
    flashIncomingRow(row.id, 'bg-indigo-100');
  }
```

Replace with:
```javascript
  function handleIncomingInsert(row, tier1) {
    console.log('[Realtime DEBUG] INSERT received:', { id: row && row.id, status: row && row.status, tenant_id: row && row.tenant_id, full_name: row && row.full_name });
    console.log('[Realtime DEBUG] tier1 list:', tier1, 'tier1 includes status?', tier1.indexOf(row && row.status));
    console.log('[Realtime DEBUG] _allLeads.length BEFORE:', _allLeads.length);
    console.log('[Realtime DEBUG] dedup check:', _allLeads.some(function (l) { return l.id === row.id; }));
    if (!row || row.is_deleted) { console.log('[Realtime DEBUG] EARLY EXIT: !row or is_deleted'); return; }
    if (tier1.length && tier1.indexOf(row.status) === -1) { console.log('[Realtime DEBUG] EARLY EXIT: status not in tier1'); return; }
    if (_allLeads.some(function (l) { return l.id === row.id; })) { console.log('[Realtime DEBUG] EARLY EXIT: dedup hit'); return; }
    _allLeads.unshift(row);
    console.log('[Realtime DEBUG] _allLeads.length AFTER unshift:', _allLeads.length);
    applyIncomingFilters();
    console.log('[Realtime DEBUG] _filtered.length:', _filtered.length, '_currentPage:', _currentPage);
    flashIncomingRow(row.id, 'bg-indigo-100');
  }
```

Net file delta: +7 lines (322 → 329). Iron Rule 12 hard cap (350) easily met.

### Manual capture protocol — Daniel runs after deploy

1. Open `https://app.opticalis.co.il/crm/` (after GH-Pages redeploys, ~30s).
2. Navigate to "לידים נכנסים" (Incoming) tab.
3. Open DevTools → Console. Filter by `[Realtime DEBUG]` to clean noise.
4. **Expected at startup:** `[Realtime DEBUG] subscribe status: SUBSCRIBED err: null`. If `status` is anything else (CHANNEL_ERROR, TIMED_OUT, CLOSED) — that's the answer; escalate.
5. Submit a fresh lead via `https://prizma-optic.co.il/supersale/` with phone `0537889878`.
6. Within ~5 seconds, console should fire `[Realtime DEBUG] INSERT received:` followed by tier1 / dedup / unshift / filtered logs. **If this line never appears → hypothesis A (RLS-on-Realtime broadcast filter mismatch); escalate to Supervisor.**
7. Copy ALL `[Realtime DEBUG]` console output and paste back to the Foreman / Overseer for diagnosis.

Expected diagnostic outcomes:
- **Subscribe status ≠ SUBSCRIBED** → fix subscription wiring (Phase 2).
- **No INSERT received at all** → RLS-on-Realtime issue; escalate to Supervisor.
- **INSERT received but `tier1 includes status?` returns -1** → status mismatch (e.g., EF inserts row with status `pending_terms` not `new`); fix tier1 list OR EF status default.
- **INSERT received, tier1 OK, but `dedup check` is `true`** → race against initial fetch; the row landed in both initial query and broadcast. Fix dedup or fetch timing.
- **All logs fire including AFTER unshift / _filtered.length, but visually no row appears** → render/pagination gating; fix `applyIncomingFilters` or `renderIncomingTable` reliance on `_currentPage` slice.

---

## 5. Phase 2 — Placeholder (separate commit, future session)

**To be authored after Daniel pastes console output.** The Foreman re-opens this SPEC, diagnoses the root cause from the captured logs, and amends §5 with the actual fix specification. Stage 2 executor:
1. Removes ALL `console.log('[Realtime DEBUG] ...')` lines (Edit A reverted, Edit B reverted to original 7-line form, with the actual fix applied at the right place).
2. Lands the fix (typically 1–3 lines).
3. Commits as `fix(crm): realtime INSERT now renders new leads in real-time` and pushes.
4. Daniel re-tests the original repro — new lead appears in <2s without F5.

This SPEC remains OPEN until Phase 2 ships. EXECUTION_REPORT for Phase 1 documents the diagnostic deployment; FOREMAN_REVIEW deferred until Phase 2 closes.

---

## 6. Out of scope

- Modifying RLS policies, the publication, or REPLICA IDENTITY (already verified correct).
- Refactoring `applyIncomingFilters` or `renderIncomingTable` beyond the minimum needed.
- Touching any file other than `modules/crm/crm-incoming-tab.js` (and this SPEC folder).
- Adding any non-`[Realtime DEBUG]` logs (production-noisy).
- Moving Phase 2 forward without console-capture evidence — the whole point of Phase 1 is to gate the fix on real diagnostic data.

---

## 7. Stop triggers (Phase 1)

- Cannot reproduce the issue → halt and report (means it self-resolved or was timing-dependent — close SPEC as RESOLVED-NO-ACTION).
- Console shows zero `[Realtime DEBUG]` output AT ALL after startup → halt; subscription itself failed (different problem than INSERT-render).
- Multiple hypotheses simultaneously confirmed → halt + escalate to Supervisor (means there are stacked bugs).

---

## 8. Rollback

- Phase 1 is purely additive (logs only). Revert via `git revert <hash> && git push origin develop`.
- No DB changes, no migrations, no new files.

---

## 9. Commit Plan (Phase 1)

Single commit:
```
chore(crm): temporary realtime diagnostic logging
```

Files:
- `modules/crm/crm-incoming-tab.js` (modified)
- `modules/Module 4 - CRM/docs/specs/REALTIME_INSERT_NOT_RENDERING_DEBUG/ACTIVATION_PROMPT.md` (newly tracked)
- `modules/Module 4 - CRM/docs/specs/REALTIME_INSERT_NOT_RENDERING_DEBUG/SPEC.md` (this file, newly tracked)
- `modules/Module 4 - CRM/docs/specs/REALTIME_INSERT_NOT_RENDERING_DEBUG/EXECUTION_REPORT.md` (newly tracked)
- `modules/Module 4 - CRM/docs/specs/REALTIME_INSERT_NOT_RENDERING_DEBUG/FINDINGS.md` (if any, otherwise omit)

Push to `origin/develop`. Pop the pre-session stash AFTER push. **Do NOT merge to main.**

---

# Round 2 (Option D) — HALTED at Phase A pre-flight (audit trail, 2026-05-03)

> **Round 2 not authored as a code commit.** Daniel ran the Phase-A pre-flight per the Round-2 brief: subscribe SUBSCRIBED fires, but `[Realtime DEBUG] INSERT received:` does NOT fire after a real storefront form submission. Per `SUPERVISOR_DECISION_ROUND_2.md` gate logic: handler is not reached at all, so Option D (reload-on-event) would be a no-op. Round 2 halted as designed; no code shipped. Routing: Round 3 = Option B (Postgres trigger + `realtime.broadcast_changes`).

---

# Round 3 — Option B (Postgres trigger + realtime.broadcast_changes per-tenant channel) — authored 2026-05-03

> **Why this is right and Rounds 1+2 weren't.** Phase-A diagnostic (Round 2) proved the INSERT handler is never reached. Daniel + Supervisor analysis: `lead-intake` EF inserts via `service_role`, and Supabase's `postgres_changes` mechanism does NOT reliably broadcast service-role-originated INSERTs to subscribers (the practical failure mode confirmed empirically; the exact mechanism — RLS evaluation timing or service_role bypass — is academic). The fix shape: replace the INSERT transport with `realtime.broadcast_changes` driven by an `AFTER INSERT` Postgres trigger (which sees ALL inserts regardless of writer's role). UPDATEs continue working on `postgres_changes` (admin browser writes carry JWT tenant context). **Hybrid by design.**
>
> **Per-tenant channel topology** is the security primitive — `crm_leads_<tenant_uuid>`. Different tenants subscribe to different channel names; cross-tenant traffic is structurally impossible at the broadcast layer. Iron Rule 22 defense-in-depth still requires `tenant_id` check in the handler (belt + suspenders).

## R3.0 — Step Zero verification (HARD GATE — Daniel directive)

**STATUS: PASSED** before SPEC authoring. Verification log:

- `ls supabase/migrations/` → 6 .sql files in YYYYMMDDHHMMSS_<slug>.sql convention.
- `git ls-files supabase/migrations/` → all 6 tracked.
- `git log --oneline supabase/migrations/ | head -5` → recent commits include `51e4457` (M4 cron migrations) + `17a9ad4` (C-001 allowlist) — Daniel's recent work IS tracked correctly.
- `git status --short supabase/migrations/` → empty (no untracked .sql).
- `.gitignore` does NOT exclude `supabase/`.

**Conclusion: the project HAS a properly-tracked `supabase/migrations/` directory.** The new Round-3 migration goes here in the same git commit as the client code change. Does NOT pile onto M4-DEBT-01.

## R3.1 — Stage 1.5 pre-execution verification (executor MUST run BEFORE applying migration)

Three Level-1 (read-only) SQL checks via Supabase MCP `execute_sql` against `tsxrrxzmdxaenlvocyit`. ALL must pass before applying the migration:

| # | Query | Expected | If fails |
|---|-------|----------|----------|
| V1 | `SELECT proname, pronargs FROM pg_proc WHERE proname = 'broadcast_changes' AND pronamespace = 'realtime'::regnamespace;` | ≥ 1 row, `pronargs` ∈ {7} | **STOP.** `realtime.broadcast_changes` API has changed/deprecated in this Supabase version. Escalate to Supervisor. |
| V2 | `SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.crm_leads'::regclass AND tgname LIKE '%broadcast%';` | 0 rows | **STOP** (Rule 21). An existing broadcast-trigger on crm_leads exists; resolve duplication first (extend / remove). |
| V3 | `SELECT pubname, schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'crm_leads';` | 1 row | Informational. The publication membership shipped in `CRM_REALTIME_INCOMING_PILOT` should still be present. (Independent of broadcast — postgres_changes UPDATE path uses it.) |

If V1 or V2 fail → halt SPEC, escalate. Do NOT apply migration. If V3 returns 0 rows → not blocking but flag in EXECUTION_REPORT.

## R3.2 — Migration plan

**File path:** `supabase/migrations/20260503180000_realtime_crm_leads_broadcast_insert.sql`

**Naming rationale:** YYYYMMDDHHMMSS_<slug>.sql per project convention. Timestamp `20260503180000` is later than the most recent existing migration (`20260503063500_m4_automation_engine_status_flip_crons.sql`) to preserve linear git/CLI ordering. Slug `realtime_crm_leads_broadcast_insert` describes the surface (realtime), table (crm_leads), and op (broadcast on insert).

**Application:** Executor calls `mcp__claude_ai_Supabase__apply_migration` with name `realtime_crm_leads_broadcast_insert` and the SQL body. The .sql file is git-tracked in the SAME commit as the client code change (Daniel directive — non-negotiable).

**Idempotency:** `DROP TRIGGER IF EXISTS` + `DROP FUNCTION IF EXISTS` precede the `CREATE` calls so re-applying the migration is a no-op (e.g., on cloned environments or re-runs).

**Migration body (authored alongside this SPEC):**

```sql
-- Migration: realtime_crm_leads_broadcast_insert
-- SPEC: REALTIME_INSERT_NOT_RENDERING_DEBUG / Round 3 / Option B
-- Daniel directive 2026-05-03: this migration enters git AT FIRST COMMIT.
--
-- Why this exists: postgres_changes does not reliably broadcast service_role-
-- originated INSERTs to Realtime subscribers. The lead-intake EF inserts via
-- service_role. So we use a Postgres trigger that calls realtime.broadcast_changes
-- with a per-tenant channel topic. Subscribers (CRM admin browser) listen on
-- the same channel topic. UPDATE path is unaffected — postgres_changes UPDATE
-- works (browser admin writes carry JWT tenant context).
--
-- Idempotent: DROP IF EXISTS + CREATE OR REPLACE.

DROP TRIGGER IF EXISTS crm_leads_broadcast_insert_trigger ON public.crm_leads;
DROP FUNCTION IF EXISTS public.crm_leads_broadcast_insert();

CREATE OR REPLACE FUNCTION public.crm_leads_broadcast_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, realtime
AS $$
BEGIN
  PERFORM realtime.broadcast_changes(
    'crm_leads_' || NEW.tenant_id::text,  -- topic (per-tenant channel)
    'INSERT',                              -- event_name (sent on payload)
    'INSERT',                              -- operation
    'crm_leads',                           -- table
    'public',                              -- schema
    NEW,                                   -- new row
    NULL                                   -- old row (NULL for INSERT)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER crm_leads_broadcast_insert_trigger
  AFTER INSERT ON public.crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.crm_leads_broadcast_insert();

-- Post-application verification (run as read-only Level-1 SQL):
-- SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.crm_leads'::regclass;
--   Expected: list includes 'crm_leads_broadcast_insert_trigger'.
-- SELECT proname FROM pg_proc WHERE proname = 'crm_leads_broadcast_insert';
--   Expected: 1 row.
```

**SECURITY DEFINER rationale:** the trigger function runs under the function-owner role (postgres). This ensures it can call `realtime.broadcast_changes` regardless of which role originated the INSERT (`service_role`, `anon`, `authenticated`). Privilege escalation surface is bounded — the function only PERFORMs ONE call into Supabase's own `realtime` schema. `SET search_path` locks the resolution path to prevent search-path hijacking.

## R3.3 — Client edits (`modules/crm/crm-incoming-tab.js`)

Five surgical Edits.

### Edit R3-A — Replace `startRealtime()` with hybrid pattern (broadcast for INSERT, postgres_changes for UPDATE)

Find:
```javascript
  function startRealtime() {
    if (_rtChannel) return;
    var tid = getTenantId();
    if (!tid || !window.sb || !sb.channel) return;
    var tier1 = (typeof TIER1_STATUSES !== 'undefined') ? TIER1_STATUSES : [];
    try {
      _rtChannel = sb.channel('crm_incoming_' + tid)
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'crm_leads', filter: 'tenant_id=eq.' + tid },
            function (payload) { handleIncomingInsert(payload.new, tier1); })
        .on('postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'crm_leads', filter: 'tenant_id=eq.' + tid },
            function (payload) { handleIncomingUpdate(payload.new, payload.old, tier1); })
        .subscribe(function (status, err) { console.log('[Realtime DEBUG] subscribe status:', status, 'err:', err); });
    } catch (e) { console.warn('CrmIncomingRealtime subscribe failed:', e && e.message); _rtChannel = null; }
  }
```

Replace with:
```javascript
  // HYBRID PATTERN (Round 3 / Option B) — DO NOT "CLEAN UP":
  // INSERTs from service_role (lead-intake EF) bypass postgres_changes broadcast.
  // The DB trigger crm_leads_broadcast_insert (migration 20260503180000_realtime_crm_leads_broadcast_insert)
  // calls realtime.broadcast_changes onto a per-tenant channel 'crm_leads_<tid>'.
  // UPDATEs continue on postgres_changes — they work (browser admin writes carry
  // JWT tenant context, not service_role). Mixed transports by design.
  function startRealtime() {
    if (_rtChannel) return;
    var tid = getTenantId();
    if (!tid || !window.sb || !sb.channel) return;
    try {
      _rtChannel = sb.channel('crm_leads_' + tid)
        .on('broadcast', { event: 'INSERT' }, function (payload) {
          var row = payload && payload.payload && payload.payload.record;
          if (!row || row.tenant_id !== tid) return;
          reloadIncomingFromRealtime(row.id, 'bg-indigo-100');
        })
        .on('postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'crm_leads', filter: 'tenant_id=eq.' + tid },
            function (payload) {
              var newRow = payload && payload.new;
              if (!newRow || newRow.tenant_id !== tid) return;
              reloadIncomingFromRealtime(newRow.id, 'bg-amber-100');
            })
        .subscribe(function (status, err) { console.log('[Realtime] subscribe status:', status, err); });
    } catch (e) { console.warn('CrmIncomingRealtime subscribe failed:', e && e.message); _rtChannel = null; }
  }
```

**Net delta:** old block is 16 lines, new block is 24 lines (includes 6-line comment header). **+8 lines.** The new comment block is mandatory (Daniel directive Point 2) so future maintainers don't "unify" the hybrid by mistake.

### Edit R3-B — DELETE `handleIncomingInsert` entirely (Phase-1 logged form)

The handler is no longer referenced — its work moved inline into the broadcast `.on()` callback.

Find:
```javascript
  function handleIncomingInsert(row, tier1) {
    console.log('[Realtime DEBUG] INSERT received:', { id: row && row.id, status: row && row.status, tenant_id: row && row.tenant_id, full_name: row && row.full_name });
    console.log('[Realtime DEBUG] tier1 list:', tier1, 'tier1 includes status?', tier1.indexOf(row && row.status));
    console.log('[Realtime DEBUG] _allLeads.length BEFORE:', _allLeads.length);
    console.log('[Realtime DEBUG] dedup check:', _allLeads.some(function (l) { return l.id === row.id; }));
    if (!row || row.is_deleted) { console.log('[Realtime DEBUG] EARLY EXIT: !row or is_deleted'); return; }
    if (tier1.length && tier1.indexOf(row.status) === -1) { console.log('[Realtime DEBUG] EARLY EXIT: status not in tier1'); return; }
    if (_allLeads.some(function (l) { return l.id === row.id; })) { console.log('[Realtime DEBUG] EARLY EXIT: dedup hit'); return; }
    _allLeads.unshift(row);
    console.log('[Realtime DEBUG] _allLeads.length AFTER unshift:', _allLeads.length);
    applyIncomingFilters();
    console.log('[Realtime DEBUG] _filtered.length:', _filtered.length, '_currentPage:', _currentPage);
    flashIncomingRow(row.id, 'bg-indigo-100');
  }
```

Replace with: (empty — the function and its closing brace are entirely removed; what remains is just the blank line before `function handleIncomingUpdate` if any).

**Net delta:** −14 lines (the entire function body, signature, closing brace).

This Edit also REMOVES 9 of the 10 `[Realtime DEBUG]` logs.

### Edit R3-C — DELETE `handleIncomingUpdate` entirely

Same rationale — moved inline.

Find:
```javascript
  function handleIncomingUpdate(newRow, oldRow, tier1) {
    if (!newRow) return;
    var idx = _allLeads.findIndex(function (l) { return l.id === newRow.id; });
    var inTier1 = !newRow.is_deleted && (!tier1.length || tier1.indexOf(newRow.status) >= 0);
    if (idx >= 0 && !inTier1) { _allLeads.splice(idx, 1); applyIncomingFilters(); return; }
    if (idx >= 0) { _allLeads[idx] = Object.assign({}, _allLeads[idx], newRow); applyIncomingFilters(); flashIncomingRow(newRow.id, 'bg-amber-100'); return; }
    if (idx < 0 && inTier1) { _allLeads.unshift(newRow); applyIncomingFilters(); flashIncomingRow(newRow.id, 'bg-indigo-100'); }
  }
```

Replace with: (empty).

**Net delta:** −8 lines.

### Edit R3-D — INSERT new helper `reloadIncomingFromRealtime` immediately AFTER `flashIncomingRow` and BEFORE `window.addEventListener('beforeunload', stopRealtime);`

Find:
```javascript
  function flashIncomingRow(leadId, bgClass) {
    setTimeout(function () {
      var tr = document.querySelector('tr[data-lead-id="' + leadId + '"]');
      if (!tr) return;
      tr.classList.add(bgClass, 'transition-colors', 'duration-1000');
      setTimeout(function () {
        tr.classList.remove(bgClass);
        setTimeout(function () { tr.classList.remove('transition-colors', 'duration-1000'); }, 1000);
      }, 1000);
    }, 0);
  }
  window.addEventListener('beforeunload', stopRealtime);
```

Replace with:
```javascript
  function flashIncomingRow(leadId, bgClass) {
    setTimeout(function () {
      var tr = document.querySelector('tr[data-lead-id="' + leadId + '"]');
      if (!tr) return;
      tr.classList.add(bgClass, 'transition-colors', 'duration-1000');
      setTimeout(function () {
        tr.classList.remove(bgClass);
        setTimeout(function () { tr.classList.remove('transition-colors', 'duration-1000'); }, 1000);
      }, 1000);
    }, 0);
  }
  // Realtime as trigger (Round 3 / Option B). Full reload via existing fetcher;
  // re-applies filters via existing applyIncomingFilters; flashes the changed row.
  // Tradeoff vs granular mutation: 1 round-trip per event. Acceptable at <200 events/day.
  async function reloadIncomingFromRealtime(highlightLeadId, flashClass) {
    try {
      _allLeads = await loadIncomingLeads(true);
      if (window.CrmLeadFilters) _lastNotesMap = await CrmLeadFilters.loadLastNotesMap();
      applyIncomingFilters();
      if (highlightLeadId && flashClass) flashIncomingRow(highlightLeadId, flashClass);
    } catch (e) { console.warn('[Realtime] reload failed, falling back to next manual refresh:', e && e.message); }
  }
  window.addEventListener('beforeunload', stopRealtime);
```

**Net delta:** +12 lines (3-line comment + 9-line function).

### Edit R3-E — None (subscribe-status log production-grade form is already covered by Edit R3-A)

The `[Realtime DEBUG] subscribe status` log is replaced by the production-grade `[Realtime] subscribe status` line inside the new startRealtime body (R3-A). No separate edit needed.

### R3.3 combined line-count math

| Edit | Description | Delta |
|------|-------------|-------|
| R3-A | startRealtime reshape + 6-line hybrid comment | +8 |
| R3-B | handleIncomingInsert deleted (+ 9 [Realtime DEBUG] logs) | −14 |
| R3-C | handleIncomingUpdate deleted | −8 |
| R3-D | reloadIncomingFromRealtime helper added | +12 |
| **Total** | | **−2 lines** |

`crm-incoming-tab.js`: 328 (HEAD `cf2d978`) → **326**. Iron Rule 12 hard cap (≤350) easily met with 24 lines headroom.

`grep -c "\[Realtime DEBUG\]"` after Round 3 must return **0** (all 10 logs removed: 9 from deleted handleIncomingInsert via R3-B, 1 from subscribe-callback via R3-A's reformulation to `[Realtime]` production-grade prefix).

`grep -c "\[Realtime\] subscribe status"` after Round 3 must return **1** — the kept production-grade log.

## R3.4 — Round 3 success criteria

| # | Criterion | Expected | Verify |
|---|-----------|---------|--------|
| R3-1 | Step Zero gate | PASS (already verified above) | `git ls-files supabase/migrations/` returns ≥ 6 tracked .sql files |
| R3-2 | Stage-1.5 pre-flight V1 | `realtime.broadcast_changes` exists with 7 args | Supabase MCP execute_sql per R3.1 |
| R3-3 | Stage-1.5 pre-flight V2 | 0 existing broadcast triggers on crm_leads | Supabase MCP execute_sql per R3.1 |
| R3-4 | Migration applied | `apply_migration` returns success | MCP response |
| R3-5 | Trigger present post-migration | `crm_leads_broadcast_insert_trigger` row in `pg_trigger` | Read-only SQL post-migration |
| R3-6 | Function present post-migration | `crm_leads_broadcast_insert` row in `pg_proc` | Read-only SQL post-migration |
| R3-7 | `crm-incoming-tab.js` line count | 328 → 326 | `wc -l modules/crm/crm-incoming-tab.js` → 326 |
| R3-8 | Zero `[Realtime DEBUG]` logs | 0 | `grep -c "\[Realtime DEBUG\]" modules/crm/crm-incoming-tab.js` → 0 |
| R3-9 | Production `[Realtime] subscribe status` log present | 1 hit | `grep -c "\[Realtime\] subscribe status" modules/crm/crm-incoming-tab.js` → 1 |
| R3-10 | Channel name uses per-tenant format | 1 hit | `grep -c "sb.channel('crm_leads_'" modules/crm/crm-incoming-tab.js` → 1 |
| R3-11 | Broadcast `.on('broadcast'` listener | 1 hit | `grep -c "\.on('broadcast'" modules/crm/crm-incoming-tab.js` → 1 |
| R3-12 | UPDATE postgres_changes preserved | 1 hit | `grep -c "event: 'UPDATE'" modules/crm/crm-incoming-tab.js` → 1 |
| R3-13 | Defense-in-depth handler tenant_id checks | 2 hits | `grep -c "tenant_id !== tid" modules/crm/crm-incoming-tab.js` → 2 |
| R3-14 | `handleIncomingInsert` / `handleIncomingUpdate` removed | 0 hits | `grep -c "function handleIncoming" modules/crm/crm-incoming-tab.js` → 0 |
| R3-15 | `reloadIncomingFromRealtime` helper added | 1 declaration | `grep -c "function reloadIncomingFromRealtime\|async function reloadIncomingFromRealtime" modules/crm/crm-incoming-tab.js` → 1 |
| R3-16 | Iron Rule 12 (≤ 350) | 326 | covered by R3-7 |
| R3-17 | Migration .sql tracked in git | 1 new tracked file | `git ls-files supabase/migrations/20260503180000_realtime_crm_leads_broadcast_insert.sql` returns the path |
| R3-18 | Integrity gate | exit 0 or 2 | `npm run verify:integrity; echo $?` |
| R3-19 | Single commit | 1 ahead of origin (before push) | `git rev-list --count origin/develop..HEAD` → 1 |
| R3-20 | Pushed | local == origin/develop | post-push verify |
| R3-21 | In-scope clean tree | empty | `git status --short modules/crm/ supabase/migrations/ "<spec folder>/"` → empty |
| R3-22 | Stash restored | pop succeeds | end of session |

## R3.5 — Manual QA — Daniel runs after deploy (7 acceptance cases per brief)

After GitHub Pages redeploys (~30s) AND migration applied to live DB (executor confirmed pre-push), test on **prizma**:

1. **PRIMARY (real-world INSERT — the case that has failed in pilot, Round 1, AND Round 2 pre-flight):** Open `app.opticalis.co.il/crm/` → לידים נכנסים tab. From a separate browser/tab, submit a fresh lead via `prizma-optic.co.il/supersale/` with phone `0537889878`. **New lead appears in <2s with indigo pulse, no F5 needed.** ★ This is the make-or-break case.
2. **UPDATE flow regression:** Change status of an existing lead → list re-renders, amber pulse on the changed row. (Tests that postgres_changes UPDATE path is unaffected.)
3. **Cross-tenant safety:** While prizma admin viewing the tab, insert a lead into demo tenant via SQL. The new demo row should NOT flash on prizma's screen — different `tenant_id` → different channel name `crm_leads_<demo-uuid>` → no broadcast leakage. The handler-side `row.tenant_id !== tid` check is a backstop.
4. **No diagnostic spam:** Console shows ZERO `[Realtime DEBUG]` lines. ONE `[Realtime] subscribe status: SUBSCRIBED null` line at startup is expected and production-grade.
5. **Soak (5 min):** Tab open, periodic INSERTs from another browser → all reflected within 2s.
6. **Rapid-fire safety:** 5 INSERTs within 10s → all 5 appear, no console errors, no duplicate rows. Each event triggers its own reload via `reloadIncomingFromRealtime`; the latest reload wins; in-flight stale state is replaced.
7. **DB verification:** `SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.crm_leads'::regclass;` shows `crm_leads_broadcast_insert_trigger`.

If all 7 pass → trigger PR-merge to main yourself. **Executor does NOT merge.**
If acceptance #1 still fails → halt, escalate to Supervisor; capture the broadcast-channel network frames in DevTools to diagnose deeper. The 3-round arc continues.
If acceptance #3 fails → cross-tenant leak; channel namespace is broken — halt + revert.

## R3.6 — Iron-Rule self-audit (Round 3 plan)

| Rule | Status | Plan |
|------|--------|------|
| Rule 7 | ✅ reuse | `loadIncomingLeads`, `applyIncomingFilters`, `flashIncomingRow`, `CrmLeadFilters.loadLastNotesMap` are all existing helpers. New `reloadIncomingFromRealtime` is a thin orchestrator. `sb.channel()` is the canonical Realtime helper. |
| Rule 12 | ✅ 326 ≤ 350 | 24-line headroom |
| Rule 14/15 | ✅ relied on | RLS on `crm_leads` is unchanged; trigger reads `NEW.tenant_id` from the row already gated by RLS at INSERT time. Channel name embeds tenant_id (Daniel directive Point 3). |
| Rule 21 | ✅ no parallel fetcher | Reload uses existing `loadIncomingLeads(true)`. Stage-1.5 V2 verifies no existing broadcast trigger on `crm_leads`. |
| Rule 22 | ✅ defense-in-depth (Daniel directive Point 4) | Two layers: (a) per-tenant channel name `crm_leads_<tid>` — different tenants subscribe to different topics, no cross-tenant traffic structurally possible; (b) handler-side `row.tenant_id !== tid` check — belt + suspenders. |
| Rule 23 | ✅ | no secrets; tenant UUIDs in the channel name are not secrets (already exposed via JWT claim) |
| Rule 31 | ✅ | gate before commit |

## R3.7 — Round 3 commit plan

Single commit:
```
feat(crm): realtime INSERT via broadcast_changes trigger (Option B)
```

Files in commit:
- `supabase/migrations/20260503180000_realtime_crm_leads_broadcast_insert.sql` (new, tracked from commit zero — Daniel directive)
- `modules/crm/crm-incoming-tab.js` (modified per Edits R3-A..R3-D)
- `modules/Module 4 - CRM/docs/specs/REALTIME_INSERT_NOT_RENDERING_DEBUG/SPEC.md` (this file, Round-2-and-3 sections appended)
- `modules/Module 4 - CRM/docs/specs/REALTIME_INSERT_NOT_RENDERING_DEBUG/EXECUTION_REPORT.md` (Round 3 closure appended)
- `modules/Module 4 - CRM/docs/specs/REALTIME_INSERT_NOT_RENDERING_DEBUG/ROUND_3_ACTIVATION_PROMPT.md` (newly tracked)
- `modules/Module 4 - CRM/docs/specs/REALTIME_INSERT_NOT_RENDERING_DEBUG/SUPERVISOR_DECISION_ROUND_3.md` (newly tracked, binding)

Push to `origin/develop`. Pop the pre-session stash AFTER push. **Do NOT merge to main.**

## R3.8 — Round 3 stop triggers (in addition to brief globals)

- Stage-1.5 V1 fails (`realtime.broadcast_changes` API changed/missing) → halt + escalate to Supervisor.
- Stage-1.5 V2 fails (existing broadcast trigger on crm_leads) → halt; resolve duplication first per Rule 21.
- Migration application returns error → halt; do NOT roll forward to client edits.
- Post-migration: trigger function present but doesn't fire on a synthetic INSERT (executor verifies via `INSERT INTO crm_leads ... RETURNING ...` against demo tenant + checks no error) → halt.
- Acceptance #1 (real form) still fails post-deploy → halt, escalate; capture broadcast frames in DevTools.
- Acceptance #3 fails (cross-tenant leak) → halt, revert.
- Any change required outside `supabase/migrations/`, `modules/crm/crm-incoming-tab.js`, and the SPEC folder → halt + escalate.

This SPEC closes when Daniel verifies all 7 R3.5 acceptance cases pass.
