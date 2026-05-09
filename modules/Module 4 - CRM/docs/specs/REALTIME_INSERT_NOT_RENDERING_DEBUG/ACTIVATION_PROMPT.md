You are working in `C:\Users\User\opticup`. The user is Daniel. This is a TARGETED DEBUG + FIX task. Two-stage: opticup-strategic identifies root cause via diagnostic logging, then opticup-executor lands the actual fix once root cause is confirmed.

## Clean-repo discipline (Daniel directive 2026-05-03 — non-negotiable)

- **At session start:** First Action Protocol per CLAUDE.md §1. Working tree must be clean. Stash any pre-existing WIP if present (`git stash push -u -m "pre-REALTIME_DEBUG wip"`).
- **At session end:** `git status` must show "working tree clean". Pop the stash AFTER push.

## Background

REC-012 (Realtime on Incoming Leads tab) was merged today (commit `5d0bd9d`). All 8 acceptance criteria passed during initial QA. Then in real-world use, Daniel observed:

- Submitted a fresh lead via `https://prizma-optic.co.il/supersale/` with phone `0537889878`.
- Lead did NOT appear on the open "לידים נכנסים" tab in real-time.
- Daniel then opened a different lead and changed its status. AT THAT MOMENT the new lead appeared.
- The Monday-pipeline leak ruled out: legacy Make scenarios were turned off, and the `lead-intake` EF DID write the row to `crm_leads` correctly.

So: INSERT events are NOT triggering the Realtime handler in real-time, but UPDATE events DO trigger render (because changing another lead's status caused render which then "discovered" the new lead).

## What's been ruled out

- ✅ Publication membership: `crm_leads` IS in `supabase_realtime` publication (verified DB-side).
- ✅ REPLICA IDENTITY: `crm_leads` has `relreplident='f'` (FULL).
- ✅ RLS policies: `tenant_isolation` (JWT-based) + `service_bypass` exist correctly.
- ✅ `lead-intake` EF wrote the row (Daniel saw it after refresh).
- ✅ Storefront → EF wiring is correct (verified earlier today via diagnostic).
- ✅ The Realtime client subscription DOES exist and the channel was successfully created (acceptance criteria during initial QA passed because the test was synthetic — but in real-world, INSERT path fails).

## What still needs verification

The strongest hypothesis: the Realtime INSERT event IS being received by the client, but the handler is NOT calling render — possibly due to:

1. **Hypothesis A — RLS on Realtime broadcast:** Even though SELECT RLS is fine, Realtime broadcasts may be additionally filtered. Maybe the `service_role` INSERT done by `lead-intake` EF doesn't carry `tenant_id` in a way that the broadcast filter `tenant_id=eq.X` matches.
2. **Hypothesis B — Race condition:** the INSERT broadcast arrives BEFORE the initial fetch completes, and the dedup check `if (_allLeads.some(...))` actually returns true because the row landed in the initial fetch AND in the broadcast — or worse, the unshift happens but the render never hits because of pagination state (see `_currentPage` and `PAGE_SIZE` slicing in `renderIncomingTable`).
3. **Hypothesis C — Tier1 filter mismatch:** `lead-intake` EF inserts new leads with status `new` which IS in TIER1_STATUSES. But maybe a brief intermediate status `pending_terms` flickers through, or the JS-side TIER1 list is out of sync.
4. **Hypothesis D — Pagination:** `_filtered` has the new lead at index 0, but `_currentPage` × `PAGE_SIZE` slice might exclude it. Less likely but worth ruling out.

## Stage 1 — opticup-strategic adds diagnostic logging

1. Switch to `opticup-strategic` skill.
2. Verify SPEC folder. Author SPEC.md with:

   **Phase 1 — Diagnostic logging (TEMPORARY, must be removed in Phase 2):**
   
   Add `console.log()` calls to `modules/crm/crm-incoming-tab.js` at these exact points:

   ```js
   // In startRealtime() right after .subscribe()
   .subscribe(function (status, err) {
     console.log('[Realtime DEBUG] subscribe status:', status, 'err:', err);
   });
   
   // At top of handleIncomingInsert()
   function handleIncomingInsert(row, tier1) {
     console.log('[Realtime DEBUG] INSERT received:', { id: row && row.id, status: row && row.status, tenant_id: row && row.tenant_id, full_name: row && row.full_name });
     console.log('[Realtime DEBUG] tier1 list:', tier1, 'tier1 includes status?', tier1.indexOf(row && row.status));
     console.log('[Realtime DEBUG] _allLeads.length BEFORE:', _allLeads.length);
     console.log('[Realtime DEBUG] dedup check:', _allLeads.some(function (l) { return l.id === row.id; }));
     // ... existing logic ...
     console.log('[Realtime DEBUG] _allLeads.length AFTER unshift:', _allLeads.length);
     // After applyIncomingFilters call:
     console.log('[Realtime DEBUG] _filtered.length:', _filtered.length, '_currentPage:', _currentPage);
   }
   ```

3. Single commit on develop: `chore(crm): temporary realtime diagnostic logging`. Push.
4. Daniel will: open `localhost:3000/crm/` (or production after deploy), open DevTools Console, submit a lead via storefront form, capture all `[Realtime DEBUG]` lines.

## Stage 2 — opticup-executor lands the fix once root cause is confirmed

After Daniel pastes the console output back to the Overseer, the Overseer will diagnose root cause:
- If subscribe status is not `SUBSCRIBED` → fix subscription wiring.
- If INSERT received but tier1 check rejects → fix the tier1 list sync.
- If INSERT received and unshift happens but render doesn't visibly update → fix pagination/render flow.
- If INSERT NEVER received → escalate to Supervisor (RLS-on-Realtime issue).

Once root cause is identified, the Foreman re-authors the SPEC's Phase 2 section with the actual fix, the Executor:

1. Removes ALL temporary diagnostic logging.
2. Implements the fix (typically 1-3 line change).
3. Tests on localhost.
4. Single commit `fix(crm): realtime INSERT now renders new leads in real-time`. Push.

## Iron Rules

- Rule 7 (API abstraction).
- Rule 12 (file-size — incoming-tab is currently 322 lines, adding ~10 logs OK).
- Rule 22 (defense-in-depth).
- Rule 31 (integrity gate).
- Rule 9 #7 (no merge to main).

## Stop triggers

- Cannot reproduce the issue → halt and report (means it self-resolved or was timing-dependent).
- Console shows zero `[Realtime DEBUG]` output AT ALL → halt; subscription itself failed.
- Multiple hypotheses are simultaneously true → halt + escalate to Supervisor.

## After completion

Daniel runs the same test that originally surfaced the bug:
1. Open Incoming Leads tab.
2. Submit form via storefront.
3. New lead must appear in <2s without F5.
4. Pulse animation visible.

If pass → trigger PR-merge to main. Foreman writes FOREMAN_REVIEW.md with proposal: "Realtime SPEC checklist must include real-storefront-form submission, not just synthetic INSERT via Supabase admin."

## References

- Originating SPEC: `modules/Module 4 - CRM/docs/specs/CRM_REALTIME_INCOMING_PILOT/`
- Overseer recommendation: REC-012 in `roles/campaign-overseer/DECISIONS_LOG.md`
- Iron Rules: `CLAUDE.md` §4–§6
