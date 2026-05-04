You are working in `C:\Users\User\opticup` (the ERP repo, `opticalis/opticup`). Follow CLAUDE.md and all 30 Iron Rules. The user is Daniel.

## Role for this session

Two-stage. First load `opticup-strategic` (Foreman) to author the SPEC. Then load `opticup-executor` to implement. Both stages happen in this single Claude Code session.

## Clean-repo discipline (Daniel directive 2026-05-03 — non-negotiable)

- **At session start:** First Action Protocol per CLAUDE.md §1. Working tree must be clean. Run `npm run verify:integrity`. Stash any pre-existing WIP if present (`git stash push -u -m "pre-CRM_REALTIME_INCOMING_PILOT wip"`) — do NOT proceed otherwise.
- **At session end:** `git status` must show "working tree clean". Pop the stash AFTER push if any. Delete scratch files. No untracked drift.

## Background (from Campaign Overseer REC-012)

Daniel directive 2026-05-03: "אין מצב בזמן אמת. אם ליד נכנס למערכת חייב לרענן בשביל לראות אותו." Operators today F5 the CRM every minute to see new incoming leads. Daily volume: 67 leads today, peak 186 in one day. Friction-heavy.

This SPEC is the PILOT for full CRM Realtime rollout. Scope: "לידים נכנסים" (Incoming Leads) tab ONLY. After 1-week stable soak, future SPECs expand to "רשומים", Events, Event Day, etc.

## What needs to happen

### Change 1 — Add `crm_leads` to Supabase Realtime publication (DB migration)

`crm_leads` is currently NOT in the `supabase_realtime` publication (verified by Overseer 2026-05-03). Without this, subscriptions return empty. Add via migration:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE crm_leads;
```

**Important:** This migration counts toward the M4-DEBT-01 backlog (31 MCP-applied migrations not in git). Per CLAUDE.md authority, the SPEC must save the migration .sql file in the SPEC folder so it CAN be added to git tracking when the M4-DEBT-01 SPEC lands. Filename: `migration_realtime_crm_leads.sql` in the SPEC folder. Apply via Supabase MCP `apply_migration`.

### Change 2 — Subscribe in `modules/crm/crm-incoming-tab.js`

Add a Realtime channel subscription:

```js
var _realtimeChannel = null;

function startRealtime() {
  if (_realtimeChannel) return; // already subscribed
  var tid = getTenantId();
  if (!tid) return;
  var tier1 = (typeof TIER1_STATUSES !== 'undefined') ? TIER1_STATUSES : [];
  
  _realtimeChannel = sb.channel('crm_incoming_' + tid)
    .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'crm_leads', filter: 'tenant_id=eq.' + tid },
        function (payload) { handleIncomingInsert(payload.new, tier1); })
    .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'crm_leads', filter: 'tenant_id=eq.' + tid },
        function (payload) { handleIncomingUpdate(payload.new, payload.old, tier1); })
    .subscribe();
}

function stopRealtime() {
  if (_realtimeChannel) {
    sb.removeChannel(_realtimeChannel);
    _realtimeChannel = null;
  }
}
```

### Change 3 — Handle INSERT (new lead arrived)

```js
function handleIncomingInsert(row, tier1) {
  if (!row || row.is_deleted) return;
  if (tier1.length && tier1.indexOf(row.status) === -1) return; // not Tier 1
  // Avoid duplicate (subscription can race with initial fetch)
  if (_allLeads.some(function (l) { return l.id === row.id; })) return;
  _allLeads.unshift(row); // prepend (newest first matches existing sort)
  renderIncomingTable();
  flashNewRow(row.id); // visual cue
}
```

### Change 4 — Handle UPDATE (status change, edit, etc.)

```js
function handleIncomingUpdate(newRow, oldRow, tier1) {
  if (!newRow) return;
  var idx = _allLeads.findIndex(function (l) { return l.id === newRow.id; });
  
  // Was in list, status moved OUT of Tier 1 OR soft-deleted → remove
  if (idx >= 0 && (newRow.is_deleted || (tier1.length && tier1.indexOf(newRow.status) === -1))) {
    _allLeads.splice(idx, 1);
    renderIncomingTable();
    return;
  }
  
  // Was in list, still Tier 1 → merge fields
  if (idx >= 0) {
    _allLeads[idx] = Object.assign({}, _allLeads[idx], newRow);
    renderIncomingTable();
    flashUpdatedRow(newRow.id);
    return;
  }
  
  // Was not in list, status moved INTO Tier 1 → add
  if (idx < 0 && !newRow.is_deleted && (!tier1.length || tier1.indexOf(newRow.status) >= 0)) {
    _allLeads.unshift(newRow);
    renderIncomingTable();
    flashNewRow(newRow.id);
  }
}
```

### Change 5 — Visual cue (subtle pulse, ~2s)

Add CSS class `crm-realtime-flash` with 2s tailwind animation. Apply to row, remove after 2s. Use existing brand colors (indigo for new, amber for update). NO emoji, NO sound.

### Change 6 — Lifecycle hooks

- Subscribe in `loadCrmIncomingTab()` after the initial fetch completes (so we don't race with it).
- Unsubscribe when the user leaves the tab (existing tab-switch handler) AND on `beforeunload`.
- If subscribe fails (network), log to console but DON'T break the tab — fall back to manual refresh as today.

### Iron Rules to honor

- **Rule 7** (API abstraction — `sb.channel()` is allowed; it's the canonical Supabase Realtime pattern, not a "direct table access" violation).
- **Rule 12** (file-size — verify `crm-incoming-tab.js` stays under 350 lines after edit; current ~165, adding ~100 = 265, well under cap).
- **Rule 14/15** (RLS — Realtime respects RLS policies automatically; the tenant_id filter in the subscription is defense-in-depth).
- **Rule 22** (defense-in-depth — every subscription includes `tenant_id=eq.X` filter, even though RLS enforces it).
- **Rule 31** (integrity gate before commit).
- **Rule 9 #7** (no merge to main — Daniel-only authorization).

### Acceptance criteria (manual QA on localhost or production after merge)

1. **Insert flow:** Open `/crm/` → לידים נכנסים tab in browser A. From browser B (or curl/Postman against `lead-intake` EF), submit a test lead with phone `0537889878` (Daniel's test phone, allowed via `tenants.test_mode_sms_allowlist` config). New lead appears in browser A within 2 seconds, without F5. Soft pulse animation visible.
2. **Update flow (status moved IN to Tier 1):** Manually create a lead via /crm/ admin with status `waiting`. Then change its status to `new`. Lead should appear in incoming tab in browser A.
3. **Update flow (status moved OUT of Tier 1):** With a Tier 1 lead in the list, change status to `waiting` from another browser/tab. Lead disappears from incoming tab within 2 seconds.
4. **Soft-delete flow:** Soft-delete a Tier 1 lead. It disappears from incoming tab within 2 seconds.
5. **Soak test:** Leave tab open 30 minutes. No console errors. No memory leak (check DevTools Performance Memory tab — heap shouldn't grow unbounded).
6. **Disconnect resilience:** Toggle network off in DevTools. Tab continues to show last-known data, no crash. Network back on → subscription auto-reconnects (Supabase Realtime built-in), new events flow again.
7. **Tab switch:** Switch to "רשומים" tab. Subscription unsubscribes (verify in DevTools Network → WS frames stop). Switch back. Subscription resumes.
8. **Regression:** Existing search, filters, "load more" pagination still work as before.

### Out of scope

- "רשומים" tab Realtime (separate SPEC after pilot proves stable).
- Events / Event Day Realtime.
- Notification system (toast on new lead) — defer to feedback after pilot.
- Sound alerts.
- Multi-tab sync (out-of-the-box behavior is fine — every tab has its own subscription).

### Stop triggers

- The migration to add `crm_leads` to publication fails → halt + escalate. (RLS or replica identity issues are the typical cause.)
- The subscription returns no events even after a confirmed INSERT → halt; debug RLS policies on the table.
- File-size gate fails → halt.
- Any change required outside `crm-incoming-tab.js` + the migration .sql → halt + escalate.
- Realtime connection causes browser console errors that don't auto-resolve in 5s → halt.

## Stage 1 — Foreman (opticup-strategic) authors the SPEC

1. Switch to `opticup-strategic` skill.
2. Verify SPEC folder exists with this ACTIVATION_PROMPT.md. Foreman creates SPEC.md alongside.
3. Survey 3 most recent FOREMAN_REVIEW.md files for proposals.
4. Author SPEC.md transposing §What needs to happen above into the standard schema. Decide details like exact CSS class names, animation curve, channel name format.
5. Save the migration .sql to the SPEC folder.

## Stage 2 — Executor (opticup-executor) runs the SPEC

1. Switch to `opticup-executor` skill.
2. First Action Protocol — clean repo + integrity gate.
3. Apply migration via Supabase MCP `apply_migration` (this counts toward M4-DEBT-01 — save the .sql in the SPEC folder).
4. Implement Changes 2-6 in `crm-incoming-tab.js`.
5. Single commit: `feat(crm): realtime updates on incoming leads tab (pilot)`. Push to `origin/develop`.
6. Write EXECUTION_REPORT.md + FINDINGS.md.
7. End-of-session: clean repo, no untracked drift.

## After completion

Daniel runs the 8 acceptance criteria. After all pass → PR-merge to main (Daniel-only). 1-week soak. If stable → next SPEC expands to "רשומים" tab.

Foreman writes FOREMAN_REVIEW.md post-merge.

## References

- Overseer recommendation: REC-012 in `__LAUNCH_PLAN_DRAFT__/campaign-overseer/DECISIONS_LOG.md`
- Iron Rules: `CLAUDE.md` §4–§6
- Supabase Realtime docs: https://supabase.com/docs/guides/realtime
- Folder-per-SPEC protocol: `CLAUDE.md` §7
