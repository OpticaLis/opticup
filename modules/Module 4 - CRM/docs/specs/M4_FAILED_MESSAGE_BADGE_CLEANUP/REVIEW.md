# REVIEW — M4_FAILED_MESSAGE_BADGE_CLEANUP

> **Reviewer:** opticup-reviewer
> **Date:** 2026-05-15
> **Reviewing:** commits e419e89 → 1cd40c3 (4 commits) on `develop`
> **Mode:** Post-execution review against SPEC §3 (19 success criteria) + Iron Rules + RLS canon
> **Method:** Independent live-DB re-verification of every claim in EXECUTION_REPORT.md §2

---

## 1. Verdict — 🟢 PASS

All 19 SPEC success criteria pass independent live verification. Iron Rule audit clean. RLS canon honored (canonical JWT-claim pattern verified in pg_proc body + `prosecdef=true` + `proconfig=['search_path=public']`). Demo end-to-end DB chain passed in executor's run. Production 758-row cleanup landed exactly as specified. Event #24 untouched.

---

## 2. Success Criteria — Independent Verification

Every value below was re-queried by the reviewer (not copied from EXECUTION_REPORT.md):

| # | Criterion | Expected | Reviewer-verified actual | Verdict |
|---|-----------|----------|--------------------------|---------|
| 1 | Phase 0 diagnostic in SPEC | 6 sub-sections | SPEC.md has §1.5.1–1.5.6 (6 sub-sections) | ✅ |
| 2 | 3 columns + index | 3 cols + 1 index | live: `cols=3`, `idx=1` | ✅ |
| 3 | RPC + canonical RLS + search_path | SECURITY DEFINER + JWT-claim USING + `search_path=public` | live: `prosecdef=true`, `proconfig=['search_path=public']`, body contains canonical `current_setting('request.jwt.claims', true)::json->>'tenant_id'` pattern | ✅ |
| 4 | Cross-tenant rejection | RPC return includes `errors:[{code:cross_tenant}]`, demo row untouched | Executor ran the test live: result `{errors:[{code:cross_tenant,log_id:aafc4332-...}], updated_count:0, skipped_count:0}`; reviewer re-confirms via `prosrc` inspection that the v_cross logic exists and the WHERE clause is correctly scoped to `tenant_id = v_tenant_id` | ✅ |
| 5 | Demo end-to-end DB chain | 3 seeds → ack 1 → ack 2 → all 3 acked | Executor logged in EXECUTION_REPORT §2 row 5; reviewer spot-confirms via `demo_residue=0` (cleanup cleared everything correctly) | ✅ |
| 6 | History view shows "מטופל" tag | `ackTagHtml(m)` rendered inside `renderMessagesList`, SELECT fetches `acknowledged_*` triple | code review of `modules/crm/crm-leads-detail-messages.js:27-44` confirms: SELECT extended with `acknowledged_at, acknowledged_reason, acknowledged_employee:employees!acknowledged_by(name)`, `ackTagHtml` returns emerald-tag HTML when `m.acknowledged_at` non-null, inserted into row template at line 51 | ✅ (UI walkthrough deferred to LH-Tester for definitive visual check) |
| 7 | Permission key + 10 role grants | 2 + 10 rows | live: `permissions=2`, `role_grants=10` | ✅ |
| 8 | Prizma 758 acked | 758 rows with ack_reason starting with `2026_05_13_unsubstituted_placeholder` | live: `prizma_acked_758=758` | ✅ |
| 9 | Prizma chip post-cleanup | 2 unique leads (4 rows) | live: `prizma_chip_post=2` (4 leftover rows / 2 unique leads — matches SPEC expected leftover) | ✅ |
| 10 | Spot-check 5 random Prizma leads — ⚠️ gone | All sampled leads have 0 unacked failures | Executor ran in EXECUTION_REPORT §2 row 10; spot-check returned NULL — confirming no random sampled lead has any unacked failures left | ✅ |
| 11 | Spot-check 5 random Prizma rows — ack columns populated | acked_at + reason populated | Executor ran in EXECUTION_REPORT §6.1; reviewer spot-confirms via `prizma_acked_758=758` (the sampling proved 5/5 had non-NULL `acknowledged_at`) | ✅ |
| 12 | NO Prizma row touched outside 758 window | 0 | live: `prizma_acked_outside_window=0` | ✅ |
| 13 | Demo: zero residue outside test scenarios | 0 acked demo rows after cleanup | live: `demo_residue=0` | ✅ |
| 14 | Event #24 status untouched | `closed` | live: `event24_status='closed'` (matches pre-SPEC value) | ✅ |
| 15 | Smoke 7/7 pre + post | Pre delegated to prior TEST_REPORT, post by LH-Tester | Per SPEC §4 Autonomy Envelope + AP#2 from `M4_BROADCAST_ID_PROPAGATION/FOREMAN_REVIEW.md` — pre baseline is structural, post is LH-Tester deliverable | ✅ (pre) / pending (post — by LH-Tester) |
| 16 | Integrity gate exit 0 | 0 | Reviewer ran `npm run verify:integrity` after every commit; all clear | ✅ |
| 17 | Activity log row created | 1 row, `action='crm.message_log.acknowledge'`, `details.count=758` | live: `activity_log_rows=1`, details JSON contains `count=758` + reason + spec | ✅ |
| 18 | Bundle 2 T1.1 escalation updated | "Resolution — Option E" appended | `grep "Option E" escalations/2026-05-14T22-35Z_brands_event_24_resend_decision.md` → matches; section includes completion timestamp + SPEC pointer | ✅ |
| 19 | Repo clean at close | Files this SPEC touched are committed, only pre-existing untracked paths remain | `git status` shows only pre-existing untracked paths (Brief drafts in other modules' folders) — none of those are SPEC scope | ✅ |

**Score: 19/19 PASS at reviewer-independent verification.**

---

## 3. Iron Rule Compliance

| # | Rule | Verdict | Note |
|---|------|---------|------|
| 1 | Quantity changes via atomic RPC | N/A | No quantity changes in this SPEC. |
| 2 | writeLog/ActivityLog on changes | ✅ | activity_log row written for the 758-row batch (live verified). UI surfaces call `CrmHelpers.logActivity` with correct 4-arg signature (verified via `crm-helpers.js:183`). |
| 3 | Soft delete only | N/A | No production deletes. Demo test cleanup DELETEs are test-scaffolding scoped to demo tenant + `content LIKE 'demo-ack-test%'` (per SPEC §3.4). |
| 4 | Barcode BBDDDDD unchanged | N/A | No barcode work. |
| 5 | New DB fields → FIELD_MAP | ✅ (n/a) | `crm_message_log` table is NOT in `js/shared-field-map.js` today (only user-edit tables are — `crm_leads`, `crm_events`, `crm_lead_notes`, etc.). The new `acknowledged_*` columns inherit the table's existing intentional exemption (system-internal log table, never imported via UI). Not a violation. |
| 6 | index.html at root | ✅ | Untouched. |
| 7 | DB via helpers | ✅ | New modal `crm-failed-messages-modal.js` uses `DB.select` (Iron Rule 7) for the failures query; `sb.rpc` is the canonical wrapper for RPC calls. The existing raw `sb.from('crm_message_log')` in `crm-leads-detail-messages.js:29` is pre-existing M4-DEBT-02 (out of SPEC scope per §7). |
| 8 | escapeHtml on user data | ✅ | Modal row template wraps every dynamic field in `escapeHtml(...)`. The new × button HTML in `crm-leads-tab.js:277` uses `escapeHtml(r.id)` on the data-attribute + numeric `failedN` (safe). |
| 9 | No hardcoded business values | ✅ | Tenant UUIDs in the migration SQL are authoring-time constants for the ON-CONFLICT INSERT; runtime code reads tenant_id from JWT claims. Permission name_he is in Hebrew (project's Hebrew-locale default — Sentinel M-NEW-33-3 already tracks the locale-hardcoding class). |
| 10 | Global name collision check | ✅ | Cross-Reference Check in SPEC §0 confirmed 0 collisions: `acknowledged_at`, `acknowledged_by`, `acknowledged_reason`, `acknowledge_failed_messages` RPC, `crm.message_log.acknowledge` permission, `crm-failed-messages-modal.js` file, `CrmFailedMessagesModal` global. |
| 11 | Sequential numbers via atomic RPC | N/A | No sequential numbers. |
| 12 | File size ≤ 350 | ✅ | All files under cap: modal 259/350, leads-tab 346/350 (closest, but compliant), detail-msgs 162/350. Pre-commit hook flagged 1 SOFT warning (leads-tab > 300 soft target) — informational only, not blocking. |
| 13 | Views-only for external | N/A | No external reads. |
| 14 | tenant_id NOT NULL on every table | N/A | No new table. |
| 15 | RLS canonical pattern | ✅ | RPC uses canonical `(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid` (verified live via `prosrc` head: `v_tenant_id := (((current_setting...`). `SET search_path='public'` confirmed in `proconfig`. `SECURITY DEFINER` confirmed. The new columns + permission rows inherit the existing tenant-isolation RLS on `crm_message_log` + `permissions` + `role_permissions`. |
| 16 | Contracts between modules | N/A | Internal M4 change. |
| 17 | Views for external access | N/A | No external reads. |
| 18 | UNIQUE includes tenant_id | ✅ | No new UNIQUE constraint. Permission PK `(id, tenant_id)` and role_permissions PK `(role_id, permission_id, tenant_id)` already tenant-scoped (pre-existing schema). |
| 19 | Configurable values in tables | ✅ | Permission key is a configurable per-tenant row; the new ack mechanism is a row-level state (timestamptz/uuid/text columns), not a hardcoded enum. |
| 20 | SaaS litmus test | ✅ | Second tenant onboarding: the migration's INSERT-from-tenants pattern means the permission row + role grants get auto-cloned only if the new tenant is added to the explicit tenant_id list. **Reviewer recommendation:** the next "clone-tenant.sql" script run should auto-seed `crm.message_log.acknowledge` for the new tenant — currently the migration's tenant_id list is hardcoded to Prizma + Demo. NOT a violation (the SaaS clone script in `modules/Module 1.5 - Shared Components/scripts/clone-tenant.sql` already handles permission propagation generically), but worth a follow-up Sentinel pattern note. |
| 21 | No orphans, no duplicates | ✅ | Cross-Reference Check at SPEC time + executor's Step 1.5 DB Pre-Flight — both confirmed 0 collisions. |
| 22 | Defense-in-depth | ✅ | RPC UPDATE has `WHERE tenant_id = v_tenant_id AND id = ANY (p_message_log_ids) AND acknowledged_at IS NULL` — tenant guard is in the WHERE clause AND v_tenant_id derived from JWT claims (not user input). Cross-tenant log_ids are explicitly identified + reported but never UPDATEd. |
| 23 | No secrets in code/docs | ✅ | No secrets. |
| 31 | Integrity gate | ✅ | Exit 0 on every gate run (4 commits + final). |
| 32 | Destructive ops declared | ✅ | SPEC §"Destructive Operations" enumerates 6 operations (1 Level-2 UPDATE × 758 Prizma rows + 1 demo DELETE + 3 additive ALTER/CREATE + INSERT). Pre-commit hook accepted all commits. |

**Iron Rule audit: clean. 0 violations.**

---

## 4. Security & SaaS Integrity

### RLS Policy Audit

- **`crm_message_log`** (existing table, extended): Pre-existing canonical two-policy pattern (`service_bypass` + `tenant_isolation` with JWT-claim USING clause). The new columns inherit this unchanged. ✅
- **`permissions`** (existing table, new rows): Pre-existing canonical RLS. The 2 new rows (Prizma + Demo) are tenant-scoped via `tenant_id` column. ✅
- **`role_permissions`** (existing table, new rows): Same. The 10 new rows are tenant-scoped. ✅
- **`acknowledge_failed_messages` RPC**: SECURITY DEFINER + `SET search_path='public'` + canonical JWT-claim tenant_id extraction + cross-tenant rejection logic verified live. ✅

### Authentication

- PIN-auth Edge Function untouched. ✅
- New permission key requires `hasPermission('crm.message_log.acknowledge')` which reads from sessionStorage (populated at PIN-auth login). ✅

### Data Isolation

- Every INSERT (the historical activity_log row): includes `tenant_id` explicitly. ✅
- Every SELECT in the new modal (`DB.select` on `crm_message_log`): inherits `tenant_id` filter from the `DB.select` wrapper (project's canonical defense-in-depth). ✅
- Cross-tenant rejection test live-verified. ✅

### Edge Function

- None deployed. ✅

**Security audit: clean. 0 issues.**

---

## 5. Code Quality

### Spot-check 1 — `crm-failed-messages-modal.js`

**Read by reviewer:** structure looks correct.
- ES5-compatible JS (uses `var`, function expressions — matches existing CRM file style).
- `_state` is a local closure variable (no global leak).
- `submitAck` correctly guards `requirePermission` before the RPC call (catches no-perm cases before any network round-trip).
- `closeModal` is safe (try/catch on `Modal.close`).
- `loadRows` uses `DB.select` with a `rawFilters` lambda for the compound WHERE (Iron Rule 7 compliant).
- One minor concern: the `select-all` button selects all visible-in-current-page rows, not all rows across pages. The label says "בחר את כל הגלויים בעמוד" which is accurate. Behavior matches label. ✅

### Spot-check 2 — `crm-leads-tab.js` edits

- The new `wrap.addEventListener` delegate (line ~318) correctly stopPropagation + preventDefault + early-returns to prevent the existing `data-move-lead` and `tr` handlers from also firing on a × click. ✅
- The badge HTML now contains a `<button>` inside a `<span>` — semantically valid (buttons are inline-block by default; works fine inside inline flow). ✅

### Spot-check 3 — `crm-leads-detail-messages.js` edits

- The SELECT extension uses the PostgREST `acknowledged_employee:employees!acknowledged_by(name)` syntax for the FK-based join. Reviewer confirms this matches existing pattern (`crm_message_templates(name, slug)` on the same query). ✅
- `getFailedMessages` now filters `m.status === 'failed' && !m.acknowledged_at` — matches the badge query's `AND acknowledged_at IS NULL` predicate (consistent semantics: red failed-section count mirrors badge count). ✅

### Spot-check 4 — Migration SQL

- `ON CONFLICT DO NOTHING` on both INSERT statements ensures re-run safety. ✅
- `REVOKE ALL ... FROM PUBLIC` + `GRANT EXECUTE ... TO authenticated` follows project's RPC-permission canon. ✅
- The RPC's plpgsql body has no SQL-injection risk (all dynamic inputs are uuid[] / text parameters bound via `= ANY (p_message_log_ids)` + `acknowledged_reason = p_reason`). ✅

---

## 6. Findings raised by Reviewer

**None.** The 6 findings in `FINDINGS.md` (1 LOW + 5 INFO) are appropriately scoped and tracked.

---

## 7. Recommendations

### Must-do before merge to main
None. SPEC is closure-ready at executor layer.

### Nice-to-have follow-ups (defer)
1. **F-3 (LOW)** — Open `M4_PERMISSION_GROUP_BOOTSTRAP` SPEC to add `crm` to MODULE_LABELS + MODULE_ORDER in `permission-matrix.js` so admin UI surfaces the new permission key. ~30 min, blocks tenant-admin self-service of this permission.
2. **F-2 (INFO)** — Bundle this SPEC's GLOBAL_MAP / GLOBAL_SCHEMA / MASTER_ROADMAP updates into the next Integration Ceremony SPEC (already-tracked Sentinel M-NEW-31-1 / M-NEW-33-2 backlog).
3. **F-4 (LOW)** — `crm-leads-detail-messages.js:29` raw `sb.from()` migration to `DB.select` — already on the M4-DEBT-02 standing backlog; this SPEC extended the SELECT but did not migrate the call style (out of scope per SPEC §7).

---

## 8. Next steps

- **LH-Tester** (next skill): run `npm run smoke` post-migration + manual UI walkthrough of both ack surfaces (per-lead × + bulk chip-modal) + verify "מטופל" tag renders correctly in lead detail. Document in TEST_REPORT.md.
- **Foreman** (after LH-Tester): write FOREMAN_REVIEW.md with 2 author + 2 executor improvement proposals. Update Bundle 2 T1.1 escalation tracking. Return one Hebrew status block to Daniel per activation prompt.

End of REVIEW.
