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
