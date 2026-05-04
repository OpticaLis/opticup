# SPEC — CRM_REALTIME_INCOMING_PILOT

> **Location:** `modules/Module 4 - CRM/docs/specs/CRM_REALTIME_INCOMING_PILOT/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-03
> **Module:** 4 — CRM
> **Phase (if applicable):** Realtime pilot (cutover-parallel; first of N planned realtime SPECs — pilot for the "לידים נכנסים" tab; future SPECs expand to "רשומים", Events, Event Day after a 1-week stable soak)
> **Author signature:** Claude Code Windows desktop session, 2026-05-03 (4th SPEC of session, after CRM_PHONE_SEARCH_NORMALIZATION + BROADCAST_1000_CAP_FIX + CRM_LEADS_TAB_PURCHASE_FILTER_AND_EVENTS_COL)
> **Source documents:**
> - Activation prompt: `ACTIVATION_PROMPT.md` (this folder)
> - Overseer recommendation: REC-012 in `__LAUNCH_PLAN_DRAFT__/campaign-overseer/DECISIONS_LOG.md`

---

## 1. Goal

Enable Supabase Realtime for `crm_leads` (one-time DDL migration) and add a tenant-scoped Realtime subscription to the "לידים נכנסים" (Incoming Leads / Tier-1) tab so new leads appear in <2s without F5, and status transitions in/out of Tier 1 reconcile the visible list automatically. Visual cue is a 2-second Tailwind-utility background flash (indigo for new rows, amber for updates) — no new CSS files, no audio, no toast.

This is the **pilot** for full CRM Realtime. After 1-week stable soak on the incoming tab, follow-up SPECs expand to "רשומים", Events, and Event Day surfaces.

---

## 2. Background & Motivation

Daniel directive 2026-05-03: *"אין מצב בזמן אמת. אם ליד נכנס למערכת חייב לרענן בשביל לראות אותו."* Operators currently F5 the CRM minute-by-minute. Daily volume is 67 leads today, peak 186 in one day. The tab's existing data path is server-paged via `range()` → no realtime by default.

Sourced from Campaign Overseer REC-012. Verified by Overseer 2026-05-03: `crm_leads` is NOT in `supabase_realtime` publication — subscriptions today return zero events. The migration is the gating prerequisite. The subscription wiring is the consumer.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state at SPEC start | On `develop`, working tree GLOBALLY clean (Daniel directive 2026-05-03 + brief §"Clean-repo discipline") | `git status --porcelain` → empty |
| 2 | Files modified (source) | exactly 1 source file | `git diff --name-only origin/develop...HEAD -- 'modules/crm/'` → `modules/crm/crm-incoming-tab.js` (1 line) |
| 3 | `crm-incoming-tab.js` line count | 264 → ≤ 340 (Iron Rule 12 hard cap is 350; SPEC budgets ≤ 340 to leave 10 lines of headroom) | `wc -l modules/crm/crm-incoming-tab.js` ≤ 340 |
| 4 | Realtime subscription declared | 1 hit | `grep -n "sb.channel(" modules/crm/crm-incoming-tab.js` → 1 hit |
| 5 | INSERT handler exists | 1 hit | `grep -n "function handleIncomingInsert" modules/crm/crm-incoming-tab.js` → 1 hit |
| 6 | UPDATE handler exists | 1 hit | `grep -n "function handleIncomingUpdate" modules/crm/crm-incoming-tab.js` → 1 hit |
| 7 | Flash helper exists | 1 hit | `grep -n "function flashIncomingRow" modules/crm/crm-incoming-tab.js` → 1 hit |
| 8 | startRealtime invoked in `loadCrmIncomingTab` | 1 hit | `grep -n "startRealtime()" modules/crm/crm-incoming-tab.js` → ≥ 1 hit |
| 9 | beforeunload listener wired | 1 hit | `grep -n "beforeunload" modules/crm/crm-incoming-tab.js` → 1 hit |
| 10 | tenant_id filter on subscription (Rule 22 defense-in-depth) | 2 hits (one per `.on('postgres_changes', ...)` for INSERT + UPDATE) | `grep -c "tenant_id=eq." modules/crm/crm-incoming-tab.js` → 2 |
| 11 | Migration .sql exists in SPEC folder | exists, non-empty | `wc -l "modules/Module 4 - CRM/docs/specs/CRM_REALTIME_INCOMING_PILOT/migration_realtime_crm_leads.sql"` → > 0 |
| 12 | Migration applied via Supabase MCP `apply_migration` | success | Executor records the MCP call result + the post-migration `SELECT FROM pg_publication_tables` row count for crm_leads (= 1) and the `relreplident` value (= 'f' / FULL) in EXECUTION_REPORT §4 |
| 13 | Iron Rule 12 (file-size, hard cap 350) | crm-incoming-tab.js ≤ 350 | `wc -l modules/crm/crm-incoming-tab.js` ≤ 350 |
| 14 | Integrity Gate (Iron Rule 31) | exit 0 or 2 | `npm run verify:integrity; echo $?` → `0` or `2` |
| 15 | Single commit | exactly 1 ahead of origin (before push) | `git rev-list --count origin/develop..HEAD` → 1 |
| 16 | Pushed to origin | local HEAD == origin/develop | `git fetch && git rev-parse HEAD` == `git rev-parse origin/develop` |
| 17 | Working tree clean (in-scope paths) | empty | `git status --short modules/crm/ "modules/Module 4 - CRM/docs/specs/CRM_REALTIME_INCOMING_PILOT/"` → empty |
| 18 | Stash restored at session end | pre-session stash `pre-CRM_REALTIME_INCOMING_PILOT wip` is `git stash pop`-ed cleanly OR documented if conflict | (executor records pop result in EXECUTION_REPORT §3) |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in the repo.
- Apply the surgical edits in §8 verbatim.
- Apply the migration via Supabase MCP `apply_migration` (Daniel pre-authorized this Level 3 DDL change in the activation brief at "Apply via Supabase MCP `apply_migration`" — the SPEC author records this pre-auth here so the executor's Level-3 autonomy guard does not reject the call).
- Run read-only verification SQL (Level 1 autonomy) against `pg_publication_tables` + `pg_class.relreplident` to confirm criterion #12.
- Stage only the in-scope files (1 source + 4 SPEC-folder files).
- Commit and push to `develop` per §9.
- Run `npm run verify:integrity`.
- Restore the pre-session stash at session end via `git stash pop`.

### What REQUIRES stopping and reporting
- The migration via Supabase MCP `apply_migration` returns an error (RLS / replica identity / permissions / publication ownership) — STOP, do NOT roll forward to the JS edits.
- `crm-incoming-tab.js` line count after edit > 340 (criterion #3 strict budget) AND the executor cannot trim to ≤ 340 by minor formatting changes within the §8 §"compression latitude" guidance — STOP and escalate. Hard rule (Iron Rule 12 ≤ 350) is a separate stop trigger, but ≤ 340 is the SPEC's working budget.
- A 2nd source file in `git diff --name-only` (other than `modules/crm/crm-incoming-tab.js`) — STOP, scope creep. (The migration .sql is in the SPEC folder, not under `modules/crm/`, so it doesn't count as a source-file deviation.)
- Integrity gate exit 1 (null-byte ERROR).
- Any merge-to-main attempt by any caller — REFUSE.
- Browser smoke-test reveals console errors that don't auto-resolve in 5s (pre-merge guard from brief §"Stop triggers") — STOP. (Note: this stop trigger is mostly Daniel-side after deploy; executor verifies the JS is syntactically correct via integrity gate but cannot run the live browser test from this CLI.)

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- **Migration application returns "permission denied" or "publication does not exist".** Either is a Supabase project-state issue, not a SPEC defect. STOP, escalate to Daniel/Foreman.
- **Migration application succeeds but the verification query returns 0 rows for crm_leads in pg_publication_tables.** That means the publication exists and was modified but the row didn't land — extremely unlikely, would indicate a Postgres replication-slot issue. STOP.
- **`crm-incoming-tab.js` line count after edit is > 340 AND the executor cannot trim within "compression latitude" rules from §8.** STOP.
- **Pre-session stash conflict on pop.** `git stash pop` MUST succeed cleanly. If conflicts, STOP and report — Daniel decides whether to keep the stash or resolve.
- **Realtime subscription returns no events even after a confirmed INSERT** (executor cannot test this, but if Daniel reports it during manual QA): the migration likely succeeded but RLS or filter shape is wrong. Reopen SPEC, do not push fix-without-investigation.

---

## 6. Rollback Plan

Two-part rollback (DB + code):

### DB rollback (idempotent, safe)
```sql
ALTER PUBLICATION supabase_realtime DROP TABLE public.crm_leads;
ALTER TABLE public.crm_leads REPLICA IDENTITY DEFAULT;
```
Apply via Supabase MCP `apply_migration` (or directly, since it's a Level 3 DDL — Daniel authorizes).

### Code rollback
- `git revert <commit_hash> && git push origin develop` — single commit, fully reversible.

The DB rollback is INDEPENDENT of the code revert. If the JS subscription is reverted but the publication still has `crm_leads`, no harm — the publication just emits events that nobody listens to. If the publication is dropped but the JS still tries to subscribe, the subscription returns zero events but the tab still works (graceful degradation per brief §"Lifecycle hooks: If subscribe fails (network), log to console but DON'T break the tab — fall back to manual refresh as today.").

---

## 7. Out of Scope (explicit)

- "רשומים" tab Realtime (separate SPEC after pilot proves stable, per brief).
- Events / Event Day Realtime.
- Notification system (toast on new lead) — defer to feedback after pilot.
- Sound alerts.
- Multi-tab sync coordination — out-of-the-box behavior is fine; every tab has its own subscription.
- Touching any view or other table's RLS / publication membership.
- Schema changes beyond the migration .sql in this SPEC folder.
- Adding `crm_leads_realtime.js` as a separate file (Foreman judged the budget allows in-file compression; see §8 compression latitude). If a future SPEC's budget exceeds 350 lines, that's the time to extract.
- New CSS files / global stylesheet edits — the visual cue uses inline Tailwind utility classes (`bg-indigo-100`, `bg-amber-100`, `transition-colors`, `duration-1000`).
- Tab-switch handler modifications. Brief mentioned "existing tab-switch handler" but the actual mechanism is parent-page-controlled (crm.html / a routing layer); this SPEC handles the symmetric `beforeunload` listener instead, plus an idempotent `startRealtime()` call inside `loadCrmIncomingTab` (so re-entering the tab does not double-subscribe).

---

## 8. Expected Final State

### New files (SPEC folder)
- `modules/Module 4 - CRM/docs/specs/CRM_REALTIME_INCOMING_PILOT/migration_realtime_crm_leads.sql` — already authored by Foreman alongside this SPEC.
- `modules/Module 4 - CRM/docs/specs/CRM_REALTIME_INCOMING_PILOT/EXECUTION_REPORT.md` — written by executor at end.
- `modules/Module 4 - CRM/docs/specs/CRM_REALTIME_INCOMING_PILOT/FINDINGS.md` — written by executor at end.

### Modified files (1 source file)

#### `modules/crm/crm-incoming-tab.js` (currently 264 lines; expected ≤ 325 after edit)

**Edit A — Insert realtime block + helpers IMMEDIATELY before the closing IIFE `})()` at line 264.**

Find the closing `})();` of the IIFE at the end of the file (the EXACT match — there's only one `})();` in the file):

```javascript
  window.getCrmIncomingLeadById = function (id) {
    return _allLeads.find(function (r) { return r.id === id; }) || null;
  };
})();
```

Replace with the same window-export line, plus the new realtime block, plus the closing IIFE:

```javascript
  window.getCrmIncomingLeadById = function (id) {
    return _allLeads.find(function (r) { return r.id === id; }) || null;
  };

  // ===== Realtime (CRM_REALTIME_INCOMING_PILOT — pilot for crm_leads streaming) =====
  // Supabase Realtime channel filtered to this tenant's crm_leads.
  // INSERT events: prepend new Tier-1 lead (de-dup against initial fetch race).
  // UPDATE events: add/remove/merge based on Tier-1 status + is_deleted transitions.
  // Visual cue: 2s Tailwind background flash (indigo=new, amber=update). No CSS file.
  // Failure mode (per brief): subscribe failure logs and falls through; tab keeps working.
  var _rtChannel = null;
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
        .subscribe();
    } catch (e) { console.warn('CrmIncomingRealtime subscribe failed:', e && e.message); _rtChannel = null; }
  }
  function stopRealtime() {
    if (!_rtChannel) return;
    try { sb.removeChannel(_rtChannel); } catch (_) {}
    _rtChannel = null;
  }
  function handleIncomingInsert(row, tier1) {
    if (!row || row.is_deleted) return;
    if (tier1.length && tier1.indexOf(row.status) === -1) return;
    if (_allLeads.some(function (l) { return l.id === row.id; })) return;
    _allLeads.unshift(row);
    applyIncomingFilters();
    flashIncomingRow(row.id, 'bg-indigo-100');
  }
  function handleIncomingUpdate(newRow, oldRow, tier1) {
    if (!newRow) return;
    var idx = _allLeads.findIndex(function (l) { return l.id === newRow.id; });
    var inTier1 = !newRow.is_deleted && (!tier1.length || tier1.indexOf(newRow.status) >= 0);
    if (idx >= 0 && !inTier1) { _allLeads.splice(idx, 1); applyIncomingFilters(); return; }
    if (idx >= 0) { _allLeads[idx] = Object.assign({}, _allLeads[idx], newRow); applyIncomingFilters(); flashIncomingRow(newRow.id, 'bg-amber-100'); return; }
    if (idx < 0 && inTier1) { _allLeads.unshift(newRow); applyIncomingFilters(); flashIncomingRow(newRow.id, 'bg-indigo-100'); }
  }
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
})();
```

**Edit B — Add `startRealtime()` call inside `loadCrmIncomingTab` AFTER the existing `wireIncomingEvents();` line.** This is the brief's "Subscribe in `loadCrmIncomingTab()` after the initial fetch completes" requirement. Combine on the same physical line as `wireIncomingEvents();` to keep net line delta low:

Find:
```javascript
        renderIncomingAdvancedBar();
        wireIncomingEvents();
      })().catch(function (e) {
```

Replace with:
```javascript
        renderIncomingAdvancedBar();
        wireIncomingEvents();
        startRealtime();
      })().catch(function (e) {
```

(One additional line — the cleanest placement; combining onto `wireIncomingEvents();` would be ugly. Net +1 line.)

### Compression latitude (executor guidance — only invoke if criterion #3 budget is breached)

If after applying Edit A + Edit B the file lands at > 340 lines, the executor may compress the realtime block by:
- Removing the JSDoc-style comment lines `// ===== ... =====` and `// Supabase Realtime ...` blocks (saves up to 5 lines).
- Combining `function stopRealtime() { ... }` onto fewer lines (saves up to 2 lines).
- Compressing `flashIncomingRow` to a single tight one-liner inside `setTimeout` callbacks (saves up to 4 lines).

Total compression headroom: ~11 lines. If file STILL exceeds 340 after compression, STOP — Foreman re-shape needed.

### Total expected line delta

- Pre-edit: 264 lines.
- Edit A: +59 lines (realtime block including 2 blank-line separators between functions, plus the comment block + beforeunload listener, all inserted before `})()`).
- Edit B: +1 line.
- Post-edit predicted: **324 lines.** (criterion #3: ≤ 340 → 16 lines of headroom inside SPEC budget; criterion #13: ≤ 350 → 26 lines of headroom inside Iron Rule 12 hard cap).

### DB state
- `crm_leads.replica_identity` → FULL (was DEFAULT)
- `pg_publication_tables` gains 1 row: `(supabase_realtime, public, crm_leads)`

### Manual QA — Daniel runs after deployment (8 acceptance cases — verbatim from brief)

The executor MUST print this exact section to Daniel at hand-off:

1. **Insert flow:** Open `/crm/` → לידים נכנסים tab in browser A. From browser B (or `curl` against `lead-intake` EF), submit a test lead with phone `0537889878` (Daniel's allowlisted test phone via `tenants.test_mode_sms_allowlist`). New lead appears in browser A within 2 seconds, NO F5. Soft indigo pulse animation visible on the new row.
2. **Update flow (status moved INTO Tier 1):** Manually create a lead in browser A with status `waiting`. Then change status to `new`. Lead appears in incoming tab in browser A.
3. **Update flow (status moved OUT of Tier 1):** With a Tier-1 lead in the list, change status to `waiting` from another browser/tab. Lead disappears from incoming tab within 2 seconds.
4. **Soft-delete flow:** Soft-delete a Tier-1 lead. It disappears from incoming tab within 2 seconds.
5. **Soak test (30 min):** Leave tab open 30 minutes. No console errors. No memory leak (DevTools Performance Memory tab — heap shouldn't grow unbounded).
6. **Disconnect resilience:** Toggle network off in DevTools. Tab continues to show last-known data, no crash. Network back on → subscription auto-reconnects (Supabase Realtime built-in), new events flow again.
7. **Tab switch:** Switch to "רשומים" tab. (Note: this SPEC does NOT explicitly stop the channel on tab-switch — `stopRealtime` only fires on `beforeunload`. The realtime channel remains active in the background, buffering events that would prepend to `_allLeads` while the user views another tab. Returning to incoming tab shows the accumulated state. This is acceptable for the pilot; if Daniel sees memory pressure or surprising state, a future SPEC adds explicit visibility-change wiring.)
8. **Regression:** Existing search, status filter, "Load more" pagination, and "Approve ✓" button all still work as before.

If all 8 pass → trigger PR-merge to main yourself. **Executor does NOT merge.**
If any fails → DB rollback (§6) + `git revert <commit_hash> && git push origin develop`.

---

## 9. Commit Plan

Exactly **1 commit**. 1 source file + 5 SPEC-folder files (ACTIVATION_PROMPT, SPEC, migration .sql, EXECUTION_REPORT, FINDINGS) — same single commit.

Commit message:
```
feat(crm): realtime updates on incoming leads tab (pilot)
```

Files in commit:
- `modules/crm/crm-incoming-tab.js`
- `modules/Module 4 - CRM/docs/specs/CRM_REALTIME_INCOMING_PILOT/ACTIVATION_PROMPT.md` (newly tracked)
- `modules/Module 4 - CRM/docs/specs/CRM_REALTIME_INCOMING_PILOT/SPEC.md` (this file, newly tracked)
- `modules/Module 4 - CRM/docs/specs/CRM_REALTIME_INCOMING_PILOT/migration_realtime_crm_leads.sql` (newly tracked)
- `modules/Module 4 - CRM/docs/specs/CRM_REALTIME_INCOMING_PILOT/EXECUTION_REPORT.md` (newly tracked, executor at end)
- `modules/Module 4 - CRM/docs/specs/CRM_REALTIME_INCOMING_PILOT/FINDINGS.md` (newly tracked, executor at end)

**Migration is applied via Supabase MCP `apply_migration` BEFORE the commit.** The .sql file in the SPEC folder is the audit trail (M4-DEBT-01 contributor); the actual DDL has already been applied to the live DB by the time the commit lands. This ordering ensures: if the migration fails, no JS code referencing the publication is committed; if the JS commit is reverted, the publication state remains (idempotent rollback per §6 if needed).

Push to `origin/develop`. **Do NOT merge to main.** Daniel handles PR-merge himself per `feedback_main_merge_via_pr.md`.

---

## 10. Dependencies / Preconditions

- On `develop`, repo **globally clean** at session start. Pre-session stash already created at session start by the dispatching session (`pre-CRM_REALTIME_INCOMING_PILOT wip`); do NOT pop until after this SPEC's commit + push.
- Supabase MCP connection authenticated for the Optic Up project (the live DB at `tsxrrxzmdxaenlvocyit.supabase.co`).
- `crm_leads` table exists with RLS policies enforcing tenant isolation per the canonical pattern (Iron Rule 15) — verified existing.
- `getTenantId()`, `sb`, `TIER1_STATUSES` global helpers exist in the load order before `crm-incoming-tab.js` — verified existing.
- The previous 3 SPECs in this session are merged: `732aacf` (phone search), `62dd6dd` (broadcast cap), `56283bf` (purchase filter + events column). All on `develop` at SPEC authoring time.

### End-of-session ordering (executor MUST follow this exact sequence)

1. Apply migration via Supabase MCP `apply_migration` with the contents of `migration_realtime_crm_leads.sql`.
2. Verify migration via read-only SQL (criterion #12 evidence): `SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'crm_leads';` (expect 1 row) AND `SELECT relreplident FROM pg_class WHERE relname = 'crm_leads' AND relnamespace = 'public'::regnamespace;` (expect `'f'`).
3. Apply Edit A + Edit B to `modules/crm/crm-incoming-tab.js`.
4. Verify §3 #3 (line count ≤ 340) + #13 (≤ 350). Apply compression latitude if needed.
5. Run `npm run verify:integrity`.
6. Stage 1 source file + 5 SPEC-folder files.
7. Commit + push.
8. Verify in-scope `git status --porcelain` is empty.
9. **Pop the pre-session stash:** `git stash pop`. Verify pop succeeded; if conflicts, STOP and report.

---

## 11. Lessons Already Incorporated

Cross-Reference Check (Step 1.5) completed 2026-05-03 against authoritative sources:
- `grep -rn "sb.channel(" js/ modules/ shared/` BEFORE edit → 0 hits in modules/crm; some hits in unrelated UI for non-CRM realtime patterns. No collision in CRM.
- `grep -rn "function startRealtime\|function stopRealtime\|handleIncomingInsert\|handleIncomingUpdate\|flashIncomingRow" modules/crm/` BEFORE edit → 0 hits (all new function names, no collision).
- `grep -rn "_rtChannel\|_realtimeChannel" modules/` BEFORE edit → 0 hits (new module-scope variable, no collision).
- `grep -rn "REPLICA IDENTITY FULL" campaigns/supersale/migrations/` → mentioned in `001_crm_schema.sql` for `crm_event_attendees` (already FULL). Setting it on `crm_leads` is consistent with the project's pattern for other realtime-eligible tables.
- Result: 0 collisions. Rule 21 satisfied.

FOREMAN_REVIEW proposals applied from the 3 most-recent M4 reviews (already harvested earlier this session):
- **FROM `M4_AUTOMATION_ENGINE_SERVER_SIDE/FOREMAN_REVIEW.md` → SA proposal #2 ("don't invent parallel mechanism — extend existing infra, Iron Rule 21")** → APPLIED. The realtime block is added to the existing `crm-incoming-tab.js` IIFE rather than splitting into a new file (which would be a parallel state pattern). The pattern reuses the project's existing `sb.channel()` Supabase Realtime conventions; no new abstraction layer.
- **FROM `C001_SEND_MESSAGE_PHONE_ALLOWLIST_REMOVAL/FOREMAN_REVIEW.md` → Proposal B ("don't trust comment-described inventories — grep the code")** → APPLIED. Foreman re-verified the line count of `crm-incoming-tab.js` (actual 264; brief said ~165 — brief was wrong). The SPEC's compression strategy is anchored on the verified 264, not the brief's 165. This avoided shipping a SPEC that would have failed the Iron Rule 12 hard cap mid-execution.
- **FROM `M4_CAMPAIGNS_V2_METRICS_AND_DATERANGE/FOREMAN_REVIEW.md` → SA-1 (tenant-scope verification)** → APPLIED. The subscription includes `filter: 'tenant_id=eq.' + tid` on every `.on()` call (Rule 22 defense-in-depth). Manual QA #1 explicitly anchors to **prizma's `tenants.test_mode_sms_allowlist` allowlisted phone** so the test doesn't send real SMS to a customer.

**Inherited from prior in-session SPECs (`CRM_PHONE_SEARCH_NORMALIZATION` 732aacf + `BROADCAST_1000_CAP_FIX` 62dd6dd + `CRM_LEADS_TAB_PURCHASE_FILTER_AND_EVENTS_COL` 56283bf):**
- Executor proposal X-1 (batch all Edits when char-exact): the executor will batch all 2 Edits in a single tool-use round.
- Executor proposal X-2 (§0 in-scope paths in EXECUTION_REPORT): mandatory.
- Executor proposal SE-Z-2 (pre-flight `wc -l` on `new_string` blocks): the Foreman pre-computed the line delta this time (Edit A new_string is 60 lines including the closing `})()`; old_string is 4 lines; delta +56. Edit B delta +1. Total +57 → 264 + 57 = 321. Some headroom vs the 324 prediction; rounding accounts for blank-line variance.
- Executor proposal SE-Z-1 (binding vs advisory criteria): SPEC §3 marks criterion #3 as **strict SPEC budget (≤ 340)** with criterion #13 as the **Iron Rule 12 hard cap (≤ 350)**. The `≤ 340` is binding for this SPEC; `≤ 350` is the underlying rule. The executor stops on EITHER deviation, with compression latitude available for #3.
- Executor proposal Y-1 (smoke-fetch-all script): N/A here.
- Executor proposal Y-2 (COMMON_PATTERNS.md): pattern in this SPEC = "Supabase Realtime tenant-scoped subscription with INSERT/UPDATE handlers + visual cue". Could seed `PATTERN-REALTIME-TENANT-SCOPED` once Y-2 lands.
- F1 from CRM_LEADS_TAB SPEC (Foreman line-count estimate miss): Applied. This SPEC's predicted line counts in §8 are derived from a literal newline-count of the new_string block, not a guess.
- F2 from CRM_LEADS_TAB SPEC (rule-21-orphans hook false positive on local `var tid`): N/A — this SPEC doesn't touch `crm-helpers.js` or `crm-lead-filters.js`, so the cross-file `tid` collision stays exactly as it is now (already mitigated by the previous SPEC's rename).

**Iron Rule 12 critical accommodation:** The brief's premise (current ~165 → final 265) was off by ~100 lines (actual 264 → expected 324). Foreman caught this at authoring time via direct `wc -l`, kept the SPEC in a single-file shape via inline-Tailwind visual cue + compressed handlers, and set criterion #3 at ≤ 340 with `≤ 350` as the absolute backstop.

**Daniel pre-authorization for Level 3 SQL:** the activation brief's "Apply via Supabase MCP `apply_migration`" is the explicit pre-auth for the executor's normally-NEVER-autonomous Level 3 DDL. Recorded in §4 Autonomy Envelope so the executor doesn't reject it.

---

## 12. Pre-Merge Checklist

- [ ] All §3 success criteria pass with actual values captured in `EXECUTION_REPORT.md` §2.
- [ ] **Iron Rule 12 critical:** `wc -l modules/crm/crm-incoming-tab.js` ≤ 340 (SPEC budget) and ≤ 350 (rule cap).
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2.
- [ ] In-scope `git status --short` returns empty.
- [ ] HEAD pushed to `origin/develop`.
- [ ] Migration applied via MCP, verified by post-migration SELECT (criterion #12).
- [ ] `EXECUTION_REPORT.md` + `FINDINGS.md` written in the SPEC folder.
- [ ] 8 manual-QA acceptance cases printed to Daniel.
- [ ] **NO merge to main** — Daniel via PR.
- [ ] Pre-session stash popped cleanly at end (criterion #18); post-pop state documented.
