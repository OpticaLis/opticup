# SPEC — M4_INVITED_GHOST_ATTENDEE_FIX

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_INVITED_GHOST_ATTENDEE_FIX/SPEC.md`
> **Authored by:** opticup-strategic (Foreman) — Full Auto Pipeline overnight run
> **Authored on:** 2026-05-13 (night)
> **Module:** 4 — CRM
> **Driving brief:** `modules/Module 4 - CRM/architecture-brief/M4_OVERNIGHT_AUDIT_HARVEST_BRIEF.md` §4.1
> **Source audit:** `modules/Module 4 - CRM/docs/audits/M4_DEEP_AUDIT_2026_05_13.md` §4 Option A + Rec 1
> **Master safety tag:** `pre-overnight-m4-2026-05-13` → `e2892d4`

---

## 0. Pre-Authoring Reality Check

Confirms grounding in live repo + DB state, not Brief assumptions.

- Brief `M4_OVERNIGHT_AUDIT_HARVEST_BRIEF.md` read in full 2026-05-13.
- Audit `M4_DEEP_AUDIT_2026_05_13.md` §4 Option A read in full.
- Live DB queried 2026-05-13 (read-only):
  - `pg_get_viewdef('v_crm_event_stats')` → predicate `(a.status <> ALL (ARRAY['cancelled','duplicate'])) AND a.is_deleted = false` confirmed in TWO places (`total_registered` and `spots_remaining` FILTER clauses).
  - `pg_get_functiondef('register_lead_to_event')` → predicate `status NOT IN ('cancelled', 'duplicate')` confirmed in TWO capacity-count sites: (a) the `invited`-promotion branch (line marked "P5_8 Fix A"), (b) the fresh-INSERT branch.
- Live file `modules/crm/crm-event-register.js` read in full (122 lines). `checkAndAutoWaitingList` at lines 22–47 uses `.neq('status', 'waiting_list').neq('status', 'cancelled').neq('status', 'duplicate')` — 3 chained `.neq()` calls. `'invited'` is NOT excluded → counted toward capacity (the bug).
- `window.REGISTERED_STATUSES = ['registered','confirmed','attended']` already exported by `crm-helpers.js` (loaded before `crm-event-register.js` per file-header load order). Available for documentation reference; SPEC uses additive-exclusion (audit's literal recommendation) to avoid widening the semantic shift beyond `invited`.
- Pre-existing untracked files at SPEC-author time: 50+ paths (audit, briefs, draft SPECs, role artifacts). Executor will use **selective `git add` by filename** throughout; never `git add -A`.
- Brief §2.4 vs §4.1 interpretation: Brief §2.4 ("DDL pre-approved ONLY for SPEC #2") refers to *schema-altering* DDL (ALTER TABLE ADD COLUMN). SPEC #1's `CREATE OR REPLACE VIEW` + `CREATE OR REPLACE FUNCTION` are *functional* replacements that the Brief §4.1 explicitly enumerates as this SPEC's touches ("view definition, RPC body, storefront helper"). They are atomic, fully reversible by re-running the captured prior bodies, and consistent with the audit's "Pure SQL change" categorization (audit §7 Rec 1). Not the same kind of DDL as §2.4's pre-approval target. Proceed without escalation.
- Iron Rule 32 destructive-ops gate (`scripts/checks/destructive-ops-declared.mjs` line 68 patterns): `CREATE OR REPLACE` is NOT in the destructive list (DROP/TRUNCATE/ALTER…DROP/unscoped DELETE). Hook will not fire.

### Live Baselines

| Metric | Value | How measured |
|--------|-------|--------------|
| `v_crm_event_stats` capacity-predicate sites | 2 | `pg_get_viewdef('v_crm_event_stats')` — `total_registered` + `spots_remaining` FILTER clauses both use `status <> ALL (ARRAY['cancelled','duplicate'])` |
| `register_lead_to_event` capacity-predicate sites | 2 | `pg_get_functiondef('register_lead_to_event')` — `invited` promotion branch + fresh-INSERT branch both use `status NOT IN ('cancelled','duplicate')` |
| `crm-event-register.js` `.neq` exclusion sites | 1 function, 3 chained `.neq()` calls | `Read crm-event-register.js` lines 32–34 |
| `crm-event-register.js` total lines | 206 (verified just now in Read) | wc -l |
| Demo invited attendees right now | (capture during execution before/after) | `SELECT count(*) FROM crm_event_attendees WHERE tenant_id=demo AND status='invited' AND is_deleted=false` |
| Prizma invited attendees right now (read-only) | (capture during execution before/after) | same, prizma tenant — NO writes to prizma |

### Lessons Already Incorporated (from recent FOREMAN_REVIEWs)

- FROM `BROADCAST_EVENT_LINK_SUPPORT/FOREMAN_REVIEW.md` Author Proposal #1 → tenant storefront URL pinning → NOT APPLICABLE (no dispatch/URL substitution in this SPEC).
- FROM `BROADCAST_EVENT_LINK_SUPPORT/FOREMAN_REVIEW.md` Executor Proposal #1 → author SPEC-specific smoke as `tests/smoke/{SPEC_SLUG}.test.mjs` → APPLIED — Executor MAY author `tests/smoke/M4_INVITED_GHOST_ATTENDEE_FIX.test.mjs` if time permits (NOT required to close SPEC; ad-hoc SQL verification is acceptable for this run).
- FROM `STATUS_CHANGE_TRIGGERS_FRAMEWORK/FOREMAN_REVIEW.md` Author Proposal #1 → live baselines, not author memory → APPLIED — every numeric baseline above has a how-measured cell.

---

## 1. Goal

Stop `crm_event_attendees` rows with `status='invited'` from occupying event capacity. Three enforcers (the `v_crm_event_stats` view, the `register_lead_to_event` RPC, the `checkAndAutoWaitingList` storefront helper) currently count `invited` rows toward `total_registered` / `spots_remaining` / the capacity-vs-max comparison. The UI counter was patched in `ATTENDEE_COUNTER_DISPLAY_FIX` (2026-05-04) to hide invited; the data layer still counts them — a "ghost-slot" bug. After this SPEC, the three enforcers and the UI counter agree.

---

## 2. Background & Motivation

The deep audit (2026-05-13 evening) traced the bug end-to-end (audit §4.1 — Code Path Traced). Quick-fix Option A: pure semantic shift in 3 SQL/JS sites; reversible by re-running the prior bodies; matches the operator's mental model already expressed in the UI counter patch. Long-term fix (Option C — derive invitations from `crm_message_log`) is Q3 architectural work.

Event #24 is being rescued on 2026-05-22 (1 week from now, push from 2026-05-15). Removing the ghost-slot drift before the rescue dispatch ensures the capacity counts Daniel sees match the capacity the RPC enforces. Without this fix, leads will be auto-waitlisted at capacity hits that are 5–10% lower than the displayed cap.

This SPEC is the first in the overnight Pipeline run authorized by Brief `M4_OVERNIGHT_AUDIT_HARVEST_BRIEF.md` §4.1.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop`, clean | `git status --short` → empty |
| 2 | Commits produced | ≥ 2 (migration + docs); ≤ 4 | `git log e2892d4..HEAD --oneline \| wc -l` ∈ [2,4] |
| 3 | New SQL migration file | exists at `modules/Module 4 - CRM/migrations/2026_05_13_invited_ghost_attendee_fix_up.sql` | `test -f <path>` |
| 4 | Paired rollback file | exists at `modules/Module 4 - CRM/migrations/2026_05_13_invited_ghost_attendee_fix_down.sql` | `test -f <path>` |
| 5 | View predicate updated | `pg_get_viewdef('v_crm_event_stats')` contains the string `'invited'` literal in BOTH the `total_registered` FILTER and the `spots_remaining` FILTER | `SELECT pg_get_viewdef(...) LIKE '%''invited''%'` → true; count of `'invited'::text` occurrences in def = 2 |
| 6 | RPC predicate updated | `pg_get_functiondef('register_lead_to_event')` contains `'invited'` in BOTH capacity-count `NOT IN (...)` lists | `SELECT pg_get_functiondef(...) LIKE '%''invited''%'` → true |
| 7 | Storefront helper updated | `crm-event-register.js` `checkAndAutoWaitingList` has 4 chained `.neq('status', ...)` calls including `.neq('status', 'invited')` | `grep -c "\.neq('status', 'invited')" modules/crm/crm-event-register.js` → 1 |
| 8 | Demo behaviour test A (UI-style "look like nothing changed for in-flight events") | An event with K invited + L registered (L<max_capacity) → `v_crm_event_stats.spots_remaining` increases by exactly K vs. pre-fix | live SQL on a chosen demo event |
| 9 | Demo behaviour test B (fresh registration succeeds when only invited exist) | An event at capacity-with-invited-only → calling `register_lead_to_event` on a new lead → returns `status='registered'` (not `'waiting_list'`) | live RPC call on demo using whitelisted lead |
| 10 | Demo behaviour test C (invited promotion still works when below cap) | A demo lead with existing `invited` row → calling `register_lead_to_event` → promotes to `'registered'` | live RPC call |
| 11 | Demo behaviour test D (true capacity hit still waitlists) | Event with capacity full of `registered` (no invited) → next registration → returns `'waiting_list'` | live RPC call |
| 12 | Zero Prizma writes | Prizma `crm_event_attendees`, `crm_events`, `crm_leads` row counts unchanged before/after | `SELECT count(*) FROM <table> WHERE tenant_id=prizma` before/after — identical |
| 13 | Integrity Gate (Iron Rule 31) | exit 0 or 2 | `npm run verify:integrity; echo $?` → `0` or `2` |
| 14 | Destructive-ops gate (Iron Rule 32) | exit 0 (no destructive patterns introduced) | runs as part of `verify.mjs --staged` |
| 15 | Docs updated | M4 `SESSION_CONTEXT.md`, `CHANGELOG.md`, `MODULE_MAP.md` updated; `MASTER_ROADMAP.md` §3 hotfix entry | grep for `M4_INVITED_GHOST_ATTENDEE_FIX` reference |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file, any view, any RPC body (read-only SQL).
- Author and apply the migration SQL to live Supabase via the `mcp__claude_ai_Supabase__apply_migration` tool, scoped to the changes in §8 — view + RPC redefinition only.
- Run smoke registrations on **demo tenant only** using whitelisted leads. The 4 demo behaviour tests are: create an `invited` row, count, run RPC, assert outcome, then clean up the test row(s) created by this run.
- Commit per §9 commit plan and push to `develop`.
- Update docs per §8.

### What REQUIRES stopping and escalating
- Any UPDATE / INSERT / DELETE that touches a row with `tenant_id` ≠ demo's UUID (`8d8cfa7e-ef58-49af-9702-a862d459cccb`).
- Any DDL outside the 1 view + 1 RPC enumerated in §8 (e.g. ALTER TABLE, new RPC, new table, DROP).
- Any commit that touches files outside §8 "Modified files" + §8 "New files".
- Any test that fails 3 times in a row.
- Any baseline measurement that diverges from this SPEC's pre-flight (e.g. view predicate site count ≠ 2) → SPEC premise wrong, escalate.

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- If `pg_get_viewdef` post-migration does NOT contain exactly 2 occurrences of `'invited'::text` (one per FILTER) → STOP, revert view, escalate.
- If `pg_get_functiondef('register_lead_to_event')` post-migration does NOT contain the new `'invited'` references in BOTH capacity-count sites → STOP, revert RPC, escalate.
- If Smoke C (invited promotion) returns `status='waiting_list'` instead of `'registered'` when capacity is open → STOP — this means the "exclude self by id <> v_existing.id" branch interacts badly with the new exclude-invited predicate; needs re-review.
- If Smoke D (true capacity hit) returns `status='registered'` when capacity is full of `'registered'` rows → STOP — capacity logic broken for the non-invited case.
- If Prizma counts diverge from baseline → STOP, force-revert via master safety tag.

---

## 6. Rollback Plan

Layered rollback (use the lightest level that solves the failure):

- **Level 1 — re-apply prior SQL bodies** (if smoke fails mid-run): run `modules/Module 4 - CRM/migrations/2026_05_13_invited_ghost_attendee_fix_down.sql` which contains the pre-fix `CREATE OR REPLACE VIEW v_crm_event_stats AS …` and `CREATE OR REPLACE FUNCTION register_lead_to_event(...)` literally captured from `pg_get_*def` during pre-flight. Storefront-helper change reverts via `git checkout HEAD -- modules/crm/crm-event-register.js` before commit, or `git revert <commit>` after.
- **Level 2 — git revert the SPEC's commits** (if migration applied + smoke clean but later regression surfaces): `git revert <hash1> <hash2>` on develop.
- **Level 3 — master safety tag rollback** (catastrophic — overnight Pipeline coordinator's prerogative): `git reset --hard pre-overnight-m4-2026-05-13 && git push --force-with-lease origin develop`. Reverts THIS SPEC plus any subsequent SPEC committed before the issue surfaced. Force-push to develop is acceptable here per the Brief; never to main.

---

## Destructive Operations

1. `CREATE OR REPLACE VIEW v_crm_event_stats AS …` — functional view replacement. Prior body captured in `_down.sql`. Atomic. No data loss. Not a destructive pattern per Iron Rule 32's hook (`scripts/checks/destructive-ops-declared.mjs` line 68 — only DROP/TRUNCATE/ALTER…DROP/unscoped-DELETE/force-push patterns fire).
2. `CREATE OR REPLACE FUNCTION register_lead_to_event(...)` — functional function replacement. Prior body captured in `_down.sql`. Atomic. No data loss. Not a destructive pattern per the hook.
3. Edit to `modules/crm/crm-event-register.js` (in-place edit of `checkAndAutoWaitingList`, ~3 lines changed, one `.neq()` chain extension). Standard SCM revert path applies.
4. **DEMO test-data writes only:** ≤ 5 `crm_event_attendees` rows created/deleted on demo tenant for smoke testing, all created via the SPEC's authorized smoke flow and cleaned up before final commit. ZERO Prizma writes; that's a tested invariant in §3 criterion 12.

No file deletions. No DROP / TRUNCATE / ALTER … DROP. No `git rebase` / `git reset --hard` / `git push --force` outside the Level-3 rollback path. No `--no-verify`.

---

## 7. Out of Scope (explicit)

- The Option C architectural cleanup (separate marketing-object from booking-object via new `crm_event_invitations` table) — Q3 work per audit §7 Rec 4. NOT this SPEC.
- The 6 other audit recommendations (Rec 2 funnel view, Rec 3 wrapper migration, Rec 5 status hygiene, Rec 6 LEFT JOIN, Rec 7 verify_jwt, Rec 8 updated_at columns) — each its own SPEC in the overnight queue.
- UI changes — the events-tab counter was already patched in `ATTENDEE_COUNTER_DISPLAY_FIX`. After this SPEC the view-side count matches that patch; no UI work needed.
- Modifying any other view / RPC / EF beyond the 2 enumerated objects.
- Modifying any other file in `modules/crm/`.
- Renaming or removing the `'invited'` attendee status. The status still exists; it just stops occupying capacity.
- Touching the automation rules that CREATE invited rows (Rules 2.2 / 2.4). They keep working unchanged.

---

## 8. Expected Final State

### New files
- `modules/Module 4 - CRM/migrations/2026_05_13_invited_ghost_attendee_fix_up.sql` — contains:
  - `CREATE OR REPLACE VIEW v_crm_event_stats AS …` (new body: add `'invited'` to the exclusion array in BOTH `total_registered` and `spots_remaining` FILTERs).
  - `CREATE OR REPLACE FUNCTION register_lead_to_event(...) …` (new body: add `'invited'` to both capacity-count `NOT IN (...)` lists).
- `modules/Module 4 - CRM/migrations/2026_05_13_invited_ghost_attendee_fix_down.sql` — contains the prior bodies of view + RPC, byte-for-byte from `pg_get_viewdef` / `pg_get_functiondef` at SPEC authoring time.

### Modified files
- `modules/crm/crm-event-register.js` — `checkAndAutoWaitingList` gains `.neq('status', 'invited')` as the 4th chained exclusion (between `.neq('status', 'duplicate')` and the `.eq('is_deleted', false)` clause). Net diff: +1 line. File total expected: 207 lines (was 206; remain ≤ 350 cap).

### DB state
- View `v_crm_event_stats` redefined per migration.
- Function `register_lead_to_event` redefined per migration.
- ZERO row mutations on any base table (no UPDATE / INSERT / DELETE on `crm_*` tables beyond demo-only smoke rows that the SPEC self-cleans).

### Docs updated
- `MASTER_ROADMAP.md` §3 — add a one-line hotfix entry under M4 ("`M4_INVITED_GHOST_ATTENDEE_FIX` — invited rows stop occupying capacity").
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — top entry under the BROADCAST_EVENT_LINK_SUPPORT close.
- `modules/Module 4 - CRM/docs/CHANGELOG.md` — new section.
- `modules/Module 4 - CRM/docs/MODULE_MAP.md` — `crm-event-register.js` line annotation (mention `'invited'` exclusion).
- `OPEN_TASKS.md` — close any related open task; mark Brief SPEC #1 ✅.
- This SPEC folder: `EXECUTION_REPORT.md`, `FINDINGS.md` (executor at close). `FOREMAN_REVIEW.md` (Foreman after).

### Migration naming
Per template, paired `_up.sql` + `_down.sql` in the same commit, in `modules/Module 4 - CRM/migrations/`.

---

## 9. Commit Plan

- **Commit 1** — `fix(m4-crm): exclude invited from event capacity counts (v_crm_event_stats + register_lead_to_event + checkAndAutoWaitingList)`
  - Files: `modules/Module 4 - CRM/migrations/2026_05_13_invited_ghost_attendee_fix_up.sql`, `..._down.sql`, `modules/crm/crm-event-register.js`.
- **Commit 2** — `docs(m4-crm): note M4_INVITED_GHOST_ATTENDEE_FIX in SESSION_CONTEXT + CHANGELOG + MODULE_MAP + MASTER_ROADMAP + OPEN_TASKS`
  - Files: 5 docs.
- **Commit 3** (after smoke + review + tester verdict, end of SPEC) — `chore(spec): close M4_INVITED_GHOST_ATTENDEE_FIX with retrospective`
  - Files: `modules/Module 4 - CRM/docs/specs/M4_INVITED_GHOST_ATTENDEE_FIX/{EXECUTION_REPORT,FINDINGS,FOREMAN_REVIEW}.md`.

Selective `git add <filename>` for every commit; no wildcards.

---

## 10. Dependencies / Preconditions

- Master safety tag `pre-overnight-m4-2026-05-13` exists at origin → CONFIRMED (created and pushed at run start).
- Branch is `develop`, behind origin = 0 → CONFIRMED.
- `mcp__claude_ai_Supabase__apply_migration` tool available to the executor; OR fallback `mcp__claude_ai_Supabase__execute_sql` for `CREATE OR REPLACE` (which Postgres treats as idempotent re-definition, not migration-tracked DDL).

### Browser readiness pre-flight (executor instructs at start)
Pre-flight (executor): SPEC's QA is SQL/RPC + grep-level — no browser required. Skip Chrome readiness check.

---

## 11. Lessons Already Incorporated

(Cross-referenced above in §0. Summary:)
- Author Proposal #1 from `BROADCAST_EVENT_LINK_SUPPORT/FOREMAN_REVIEW.md` (storefront URL pinning) — N/A; this SPEC has no dispatch step.
- Executor Proposal #1 from `BROADCAST_EVENT_LINK_SUPPORT/FOREMAN_REVIEW.md` (SPEC-specific smoke as `tests/smoke/{SPEC_SLUG}.test.mjs`) — Acknowledged; optional for this SPEC.
- Author Proposal #1 from `STATUS_CHANGE_TRIGGERS_FRAMEWORK/FOREMAN_REVIEW.md` (live baselines) — APPLIED; §0 Live Baselines table.
- Author Proposal #2 from `SETTINGS_PERMISSIONS_CONSOLIDATION/FOREMAN_REVIEW.md` (selective `git add` because pre-existing untracked files) — APPLIED in §9.

---

## 12. Pre-Merge Checklist

- [ ] All §3 success criteria pass with actual values captured in EXECUTION_REPORT.md §2.
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` exit 0 or 2.
- [ ] `git status --short` empty.
- [ ] HEAD pushed to `origin/develop`.
- [ ] EXECUTION_REPORT.md + FINDINGS.md written.
- [ ] Module SESSION_CONTEXT / CHANGELOG / MODULE_MAP / ROADMAP entries updated.
- [ ] Zero writes to Prizma tenant (criterion #12).
- [ ] Smoke A/B/C/D all PASS on demo tenant (criteria #8–#11).

*End of SPEC. Author signature: opticup-strategic Foreman, overnight Pipeline run 2026-05-13.*
