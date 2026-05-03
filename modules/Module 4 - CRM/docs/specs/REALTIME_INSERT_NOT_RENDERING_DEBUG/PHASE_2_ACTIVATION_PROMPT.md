You are working in `C:\Users\User\opticup`. The user is Daniel.

This is **Phase 2** of the existing SPEC `REALTIME_INSERT_NOT_RENDERING_DEBUG`. Phase 1 added diagnostic logging (commit `13ae24d`); Daniel captured console output that confirmed: `subscribe SUBSCRIBED`, but ZERO `INSERT received` lines after a real storefront form submission. UPDATE events DO arrive.

Per Supervisor decision (`SUPERVISOR_DECISION.md` in this folder): **Option A** — drop the JS-side `tenant_id=eq.<UUID>` filter on postgres_changes subscriptions; rely on RLS for tenant isolation; add explicit tenant_id check in handlers as defense-in-depth.

Two-stage. opticup-strategic authors the micro-SPEC. opticup-executor implements.

## Clean-repo discipline (non-negotiable)

- **At session start:** First Action Protocol per CLAUDE.md §1. Working tree must be clean. Stash any pre-existing WIP if present (`git stash push -u -m "pre-REALTIME_PHASE2 wip"`).
- **At session end:** `git status` must show "working tree clean". Pop the stash AFTER push.

## What needs to happen

### Change 1 — Remove the filter from BOTH postgres_changes subscriptions

In `modules/crm/crm-incoming-tab.js::startRealtime()` (around lines ~278-288 per Phase 1 commit). Currently:

```js
.on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'crm_leads', filter: 'tenant_id=eq.' + tid },
    function (payload) { ... })
.on('postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'crm_leads', filter: 'tenant_id=eq.' + tid },
    function (payload) { ... })
```

Change to (drop the `filter:` key entirely):

```js
.on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'crm_leads' },
    function (payload) { ... })
.on('postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'crm_leads' },
    function (payload) { ... })
```

### Change 2 — Add explicit tenant_id check inside handlers (defense-in-depth, Iron Rule 22)

In `handleIncomingInsert(row, tier1)`, FIRST line of the function body (after the `console.log` from Phase 1):
```js
if (row && row.tenant_id !== getTenantId()) return;
```

In `handleIncomingUpdate(newRow, oldRow, tier1)`, FIRST line:
```js
if (newRow && newRow.tenant_id !== getTenantId()) return;
```

Note: `getTenantId()` is the existing global helper used throughout the CRM (defined in `shared.js`).

### Change 3 — REMOVE all temporary diagnostic logging from Phase 1

The 10 `[Realtime DEBUG]` `console.log()` lines added in commit `13ae24d` MUST be removed. They were temporary. Production must run clean.

Search the file for `[Realtime DEBUG]` and delete every `console.log()` containing it.

### Iron Rules to honor

- **Rule 7** (API abstraction — `sb.channel()` already canonical).
- **Rule 12** (file-size — file is currently 328 lines; Change 3 removes ~10 lines, Changes 1-2 net ~0. Final ≈ 320 lines. Well under 350 hard cap).
- **Rule 22** (defense-in-depth — explicit `tenant_id` check is the new "defense" replacing the broken filter).
- **Rule 31** (integrity gate before commit).
- **Rule 9 #7** (no merge to main; Daniel-only PR-merge).

### Acceptance criteria (manual QA on localhost or production after merge)

1. **Real-world INSERT flow (PRIMARY):** Open `localhost:3000/crm/` (or production after merge) → לידים נכנסים tab. Submit a fresh lead via `prizma-optic.co.il/supersale/`. New lead appears in <2s with indigo pulse animation. **No F5 needed.**
2. **No diagnostic spam:** DevTools Console shows ZERO `[Realtime DEBUG]` lines (Phase-1 logging fully removed).
3. **Cross-tenant safety:** verify no rows from other tenants ever appear (e.g., demo tenant's INSERTs should not flash on prizma's screen). Test by inserting a lead into demo tenant via SQL while prizma admin viewing the tab.
4. **UPDATE flow regression:** Status change on existing lead still triggers handler (existing UPDATE behavior unchanged).
5. **All 8 original REC-012 criteria still pass** (insert/update-in/update-out/soft-delete/soak/disconnect/tab-switch/regression).

### Out of scope

- Option B (`realtime.broadcast_changes` trigger pattern) — defer unless Option A fails.
- Any other Realtime-enabled tab (still pilot phase).
- Removing/changing existing UPDATE handler logic.

### Stop triggers

- Real form submission STILL doesn't produce `INSERT received` after this fix → halt + escalate to Supervisor (means Option A wasn't the answer; we need Option B).
- Cross-tenant rows DO appear on prizma screen → halt; the explicit tenant_id check has a bug.
- File-size gate fails → halt.
- Any change required outside `crm-incoming-tab.js` → halt + escalate.

## Stage 1 — opticup-strategic authors the micro-SPEC

1. Switch to `opticup-strategic` skill.
2. Verify SPEC folder `modules/Module 4 - CRM/docs/specs/REALTIME_INSERT_NOT_RENDERING_DEBUG/` already has SPEC.md from Phase 1, plus SUPERVISOR_BRIEF + SUPERVISOR_DECISION + this PHASE_2_ACTIVATION_PROMPT.
3. Update SPEC.md §5 (Phase 2 Implementation) with the actual fix described above. Or write a separate SPEC_PHASE_2.md if cleaner — Foreman's call.
4. Hand off to executor.

## Stage 2 — opticup-executor

1. Switch to `opticup-executor` skill.
2. First Action Protocol — clean repo + integrity gate.
3. Implement Changes 1, 2, 3 in `crm-incoming-tab.js`.
4. Verify ZERO `[Realtime DEBUG]` lines remain (`grep` the file).
5. Single commit: `fix(crm): realtime INSERT now received (drop UUID filter, rely on RLS + handler check)`. Push to `origin/develop`.
6. Append closure to EXECUTION_REPORT.md (Phase 2 section).
7. End-of-session: clean repo, no untracked drift.

## After completion

Daniel runs the 5 acceptance criteria. If all pass → PR-merge to main (Daniel-only). Foreman writes FOREMAN_REVIEW.md after merge.

## References

- Phase 1 SPEC: `SPEC.md` (this folder)
- Supervisor decision: `SUPERVISOR_DECISION.md` (this folder, binding)
- Supervisor brief: `SUPERVISOR_BRIEF.md` (this folder, full analysis)
- Originating Realtime SPEC: `modules/Module 4 - CRM/docs/specs/CRM_REALTIME_INCOMING_PILOT/`
- Overseer recommendation: REC-013 in `__LAUNCH_PLAN_DRAFT__/campaign-overseer/DECISIONS_LOG.md`
- Iron Rules: `CLAUDE.md` §4–§6
