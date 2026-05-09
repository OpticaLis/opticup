# SPEC — M4_OVERNIGHT_AUDIT

> **Location (target):** `modules/Module 4 - CRM/docs/specs/M4_OVERNIGHT_AUDIT/SPEC.md`
> **Authored by:** opticup-strategic (Foreman) — at the request of Campaign Overseer + Daniel directive 2026-05-04 night
> **Authored on:** 2026-05-04
> **Module:** 4 — CRM
> **Phase:** post-cutover discovery audit (no phase number — one-off discovery SPEC)
> **SPEC class:** `[discovery / read-only]` — produces ONE report file. No code changes. No DB writes outside demo tenant.

---

## 1. Goal

Run a comprehensive overnight read-only audit of Module 4 (CRM) covering 9 tracks (file placement, open issues, console errors, functional flows, DB integrity, EF + Make health, security, performance, docs/SaaS-readiness) and deliver ONE consolidated report — `OVERNIGHT_AUDIT_REPORT.md` — so the next morning's strategic conversation triages findings into SPECs without further investigation.

## 2. Background & Motivation

Module 4 closed 6 SPECs in the marathon evening of 2026-05-04 (QUICK_REGISTER_QR_FLOW, DELETE_EMPTY_EVENT, ACTIVITY_LOG_DEDUPLICATION_DELETE_EVENT, RESTORE_DELETED_EVENT_UI, POST_4_LEADS_PAGINATION_BUMP, PHONE_SEARCH_PARTIAL_FIX). 4 of the 6 are missing FOREMAN_REVIEW.md. The Campaign Overseer's HANDOFF lists ~20 open follow-ups but the list is partly stale, partly incomplete. Files that conceptually belong to M4 are scattered across `modules/Module 4 - CRM/`, repo root, `[retired-2026-05-09:LAUNCH_PLAN_DRAFT]/`, `campaigns/`, and other locations. Production cutover happened 2026-05-03 — Prizma is live — and Daniel has tightened production discipline. This audit produces situational awareness in one pass so the next 1-2 weeks of M4 work can be planned strategically rather than reactively.

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value |
|---|-----------|---------------|
| 1 | Branch at end of run | `develop`, no NEW dirty files vs run start |
| 2 | Commits produced | 0 |
| 3 | Files modified in project tree | 0 — except `SPEC.md` (this file) and `OVERNIGHT_AUDIT_REPORT.md` |
| 4 | Files created | 2 — SPEC.md + OVERNIGHT_AUDIT_REPORT.md (both in M4_OVERNIGHT_AUDIT folder) |
| 5 | Tracks completed | 9 of 9 (each has content OR a "skipped, reason X" log) |
| 6 | CRITICAL findings surfaced in executive summary | All of them |
| 7 | Demo tenant testing volume | Test leads ≤200 across run, all using whitelist contacts |
| 8 | Prizma write count during run | 0 |
| 9 | Appendix B triage list | ≥5 ranked SPEC titles with dependencies |
| 10 | Total runtime logged | Header has start/end timestamps + total |

## 4. Autonomy Envelope

### CAN do without asking
- Read any file in the project tree (repo + sibling storefront if reachable)
- Read auto-memory + Overseer HANDOFF + DECISIONS_LOG + the 6 closed M4 SPEC folders
- Run **read-only SQL** against demo OR prizma via Supabase MCP — Level 1 autonomy
- Run **read + write SQL** against **demo tenant ONLY** for Track D functional testing — bounded by §6
- List Edge Functions, fetch deployed source, read EF logs (read-only)
- Drive Claude in Chrome MCP against demo CRM — login PIN `12345`, navigate, click, fill forms, capture console + network + screenshots
- Read Make scenario configs via Make MCP (read-only)
- Use Agent subagents for parallel sub-audits if a track exceeds context budget
- Write SPEC.md (this file) and OVERNIGHT_AUDIT_REPORT.md (output) — the only two project-tree writes
- Skip a track and continue if a tool is unavailable — log it in Appendix A

### REQUIRES stopping
- Any write to **prizma** tenant data — STOP IMMEDIATELY
- Any modification to a project file other than the 2 audit files
- Any commit, push, branch checkout other than verifying current
- Any DDL on either tenant
- Any EF deploy, redeploy, or source edit
- Any Make scenario edit
- Any merge to main / push to main
- Any test that would send SMS or email to a contact NOT in the whitelist
- Total runtime exceeding 12 hours — write the partial report at 12h and stop

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- VM mount drift makes a file unreadable (not just dirty) → log Appendix A, skip file, continue
- Demo tenant unreachable → halt Track D, continue Tracks A/B/E/F/G/H/I (read-only, don't need demo)
- Supabase MCP returns gateway-only logs → use Studio Logs UI via Chrome instead, log workaround
- Test message would fire to non-whitelist contact → STOP, log CRITICAL, continue with other tests
- A SQL query against prizma is about to be a write → STOP, log CRITICAL, continue read-only

## 6. Test Boundaries (demo tenant rules)

| Bound | Value |
|---|---|
| Tenant slug | `demo` |
| Tenant UUID | `8d8cfa7e-ef58-49af-9702-a862d459cccb` |
| Login PIN | `12345` |
| Phone whitelist | `0537889878`, `0503348349` (no other phone, ever) |
| Email whitelist | `daniel@prizma-optic.co.il` (no other email, ever) |
| Lead/attendee/event creation | Allowed, repeatedly. Soft-delete + recreate as needed. |
| Maximum test leads created | ~200 across full run |
| Real SMS firing | Allowed to whitelist phones — Daniel pre-authorized |
| Real email firing | Allowed to whitelist email — Daniel pre-authorized |
| Demo tenant cleanup at run end | Soft-delete all test leads created during this run |

**Any write attempt against prizma is a CRITICAL stop trigger.** Always include `tenant_id` filter on every INSERT/UPDATE.

## 7. Rollback Plan

Zero project-tree changes outside the 2 audit files → no project rollback. For demo test data:

```sql
UPDATE crm_leads
   SET is_deleted=true, deleted_at=NOW()
 WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
   AND phone IN ('+972537889878','+972503348349')
   AND created_at >= '{START_TIMESTAMP}';
```

## 8. Out of Scope (DO NOT touch)

- Any file in `modules/Module 4 - CRM/` other than read (no edits, no renames, no moves)
- Any file in repo root other than read
- Any Edge Function source code
- Any Make scenario config
- The 6 closed-2026-05-04 SPEC folders — read only, no missing-FOREMAN_REVIEW backfilling
- The Overseer's HANDOFF + DECISIONS_LOG — read only
- `MASTER_ROADMAP.md` — read only
- `MEMORY.md` (auto-memory) — read only; do NOT write new memory entries unless genuinely orthogonal AND outlives this audit (rare; default no)
- prizma tenant — every operation is `SELECT` only
- `main` branch — no checkout, no push, no merge
- VM mount drift state — do NOT `git restore` / `git clean` / `git reset`
- Iron Rule 31 integrity gate — do not run against the working tree
- Authoring follow-up SPECs — Appendix B contains titles + dependencies only

## 9. Audit Tracks

The executor runs each track and produces one section per track in OVERNIGHT_AUDIT_REPORT.md. Cap each track at ~90 minutes unless yielding. **Do not skip any track.** If a track produces 0 findings, write "Track {X}: 0 findings — {reason}" and move on.

### Track A — File & Folder Placement Audit

**Question:** every conceptually-M4 file — where is it physically? Should it be inside `modules/Module 4 - CRM/`?

- Walk the repo tree
- Classify each file: `correctly placed`, `correctly shared`, `MISPLACED — should move to M4`
- For each MISPLACED: propose target path + reason
- Build a **single ordered `git mv` script** that performs all proposed moves in one run (printed in report — NOT executed)
- Note files imported by other modules / storefront — moves require import-path updates

**Output table:** `current_path | proposed_path | reason | severity (CRITICAL/HIGH/MEDIUM/LOW) | downstream consumers`

### Track B — Open Issues Catalog

Walk all sources of pending work and produce ONE ranked table:
- Overseer HANDOFF §3, §6, §10–§15 (path: `roles/campaign-overseer/CAMPAIGN_OVERSEER_HANDOFF.md`)
- DECISIONS_LOG entries where `Applied: PENDING` or `Outcome: PENDING`
- Each closed M4 SPEC's "Open follow-ups" / "Tech debt" sections in EXECUTION_REPORT.md + FINDINGS.md
- The 4 SPECs missing FOREMAN_REVIEW.md — list with paths
- TECH_DEBT.md M4 entries
- `docs/guardian/` mission reports — every CRITICAL or HIGH mentioning M4
- POST-cutover backlog
- TODO/FIXME/HACK/XXX comments in `modules/Module 4 - CRM/**`, related EFs, related migrations

For each item: `OPEN-NNN`, source pointer, one-line description, suggested resolution (existing-SPEC / new-SPEC / quick-fix / WONTFIX), severity, dependency.

**Output:** ranked table grouped by theme (UX / data integrity / automation / security / perf / docs / infra).

### Track C — Browser Console + Runtime Errors

Drive Claude in Chrome against demo CRM. Login PIN `12345`. Walk every screen, tab, modal, drawer. For each:
- Console errors / warnings / info (executor judges noise threshold)
- Failed network requests (4xx/5xx) — capture request body + response body
- Slow requests (>1.5s)
- Layout glitches in screenshots (RTL, overflow, missing icons, broken images)
- Unhandled promise rejections

**Screens (executor adds more):** Leads tab (incoming/registered/all), Events, Attendees, Automation Rules, Message Log, Templates, Campaigns, Activity Log, Settings, Quick Register, Coupons, Refunds. Modals: edit/delete lead, edit/delete event, restore deleted event, attendee move, send-test, manual lead create.

**Output:** one row per error — screen, action, error text, severity, suggested fix path, screenshot ref.

### Track D — Functional Flow Tests (demo tenant, whitelist contacts only)

Failures don't stop the run. The minimum 17 tests below — executor adds more if reasonable.

1. Lead intake (storefront → demo) — full pipeline including SMS + email
2. Lead intake DUPLICATE — duplicate detection + duplicate template
3. Event lifecycle — create → status flips → templates fire → close
4. Manual lead → registration — staff registers existing lead to event
5. Auto event registration form (T5/T7 flow) — SMS link → form submit → status promotion
6. Quick-register QR flow — WhatsApp → QR → scan → form → coupon (skip if Daniel hasn't pre-authorized demo Make scenario)
7. Delete event (empty) — soft-delete + activity-log + RPC vs JS dedup verify
8. Restore deleted event — from activity-log screen, attendees re-attached
9. Lead delete + cascade — soft-delete lead → attendees auto-soft-delete
10. Phone search — 5 partial-format variants
11. Pagination — leads tab >200
12. Broadcast 1000-cap — pagination helper at >1000 recipients
13. Coupon delivery — message log + SMS body + unsubscribe link
14. Unsubscribe — click link → consent state DB write → next message suppressed
15. Activity-log — every meaningful action writes exactly one row (cross-check dedup)
16. CRM admin permissions matrix — role gates (read-only — don't change roles)
17. Refund flow — `payment_status='refunded'` correctness

**Output:** one row per test — pass / fail / skipped + reason, screenshots for failures, suggested fix.

### Track E — Database Integrity Audit (read-only on prizma, demo allowed)

Use Supabase MCP `execute_sql` (SELECT only). Run against both tenants:
- Orphan attendees (lead_id NULL, or linked lead is_deleted=true while attendee not)
- Orphan inverse (lead is_deleted, attendee not)
- Counter sanity (events.current_attendees vs COUNT of active attendees)
- Duplicate phone leads where COUNT > 2
- Activity-log dedup spot-check (post Track D)
- Stale `crm_message_queue` (status='pending' > 1h)
- Stale `crm_message_log` transient states > 5min
- Soft-delete sanity (every is_deleted table — count where tenant_id IS NULL)
- RLS spot-check on 3 random `crm_*` tables — `EXPLAIN` of SELECT without tenant_id filter
- Migrations drift — `list_migrations` vs git

**Output:** per-query — query text, rows returned, severity, suggested fix.

### Track F — Edge Functions + Make Scenarios

- `list_edge_functions` — for each M4-related EF: deployed version, last deploy time, source vs git, drift flag
- 24h error logs per EF (Studio UI via Chrome if MCP returns gateway-only)
- Make scenarios: `9104395` (send-message), `8464122` (quick-register QR), any others — status, maxErrors, DLQ, 24h error count
- Scenario `8464122` Module 36 cleanup verify
- 13 disabled SuperSale legacy scenarios — confirm still disabled

**Output:** per-EF + per-scenario tables.

### Track G — Security Audit (read-only)

- Every `crm_*` table: list RLS policies, cross-check vs canonical pattern (CLAUDE.md §5 Rule 15 JWT-claim USING + two-policy pattern). Flag any `auth.uid()` or single-policy.
- Every M4-scope EF: `verify_jwt` setting, public-POST exposure
- Secrets scan: grep for raw API keys, JWTs, DB passwords in M4 source — should find zero
- `pin-auth` EF — read source, confirm no regression (DO NOT refactor — Iron Rule 8)
- Iron Rule 14 (tenant_id everywhere) + Rule 18 (tenant-scoped UNIQUE) — schema audit
- Bot-protection (P5_6) — Layers 1+2 actually present on production lead-intake? Layers 3+4 status?
- `STOREFRONT_URL` hardcoded in `quick-register` EF — confirm multi-tenant promotion still on backlog

**Output:** per-finding table with severity. CRITICAL findings get a top-of-section red callout.

### Track H — Performance Audit (read-only)

- 5 representative CRM screens via Chrome — TTFP / TTI / total bytes / slowest request
- Top 10 slow queries from `pg_stat_statements` touching `crm_*`
- M4 JS files exceeding 350 lines (Iron Rule 12) — list violators
- `EXPLAIN` on dominant queries (events list, attendees-by-event, message-log-by-lead) — flag missing indexes

**Output:** opportunities table with severity + estimated effort.

### Track I — Documentation & SaaS-Readiness Audit

- 6 closed-2026-05-04 SPECs vs folder-per-SPEC protocol — confirm 4 missing FOREMAN_REVIEW.md, list each missing file with path
- MODULE_MAP.md vs reality — pick 3 functions added/changed in recent SPECs, confirm presence
- GLOBAL_MAP.md / GLOBAL_SCHEMA.sql vs M4 reality — were recent additions merged?
- Hardcoded business values (Iron Rule 9) — grep M4 source for "Prizma" / "פריזמה" / phone numbers / addresses / gold colors / VAT rate
- `event_type` field promised post-cutover — added or still open?
- B1 eye-exam 4-option list — production form match? value propagates?
- B3 date format DD/MM/YYYY — every CRM admin date display matches?
- B9 Multisale — fully removed?

**Output:** doc/protocol violations table + SaaS-readiness gaps.

## 10. Report Structure (mandatory)

ONE file at `modules/Module 4 - CRM/docs/specs/M4_OVERNIGHT_AUDIT/OVERNIGHT_AUDIT_REPORT.md`:

```
# OVERNIGHT_AUDIT_REPORT.md — Module 4
**Audit start:** YYYY-MM-DD HH:MM (Israel time)
**Audit end:** YYYY-MM-DD HH:MM
**Total runtime:** Xh Ym
**Executor session:** {model + session id}
**Branch confirmed:** develop @ {sha}
**VM/repo state at start:** {clean / drifted (reason)}

## EXECUTIVE SUMMARY (1 page max)
- N findings: X CRITICAL / Y HIGH / Z MEDIUM / W LOW
- Top 5 things Daniel should review first (one-liners with severity tags)
- Total estimated SPEC count to close all CRITICAL+HIGH
- One-paragraph "state of Module 4" narrative

## TRACK A — File & Folder Placement
## TRACK B — Open Issues Catalog
## TRACK C — Console & Runtime Errors
## TRACK D — Functional Tests
## TRACK E — Database Integrity
## TRACK F — Edge Functions & Make
## TRACK G — Security
## TRACK H — Performance
## TRACK I — Documentation & SaaS-Readiness

## APPENDIX A — Tool & Environment Issues Encountered
## APPENDIX B — Suggested Triage Order for Tomorrow
   {ordered list of 5–15 SPEC titles + dependency arrows + 1-line scopes}
## APPENDIX C — Surprising Findings Worth Saving as Memory
```

## 11. Lessons Already Incorporated

- Supabase MCP `get_logs` returns gateway-only — Track F prescribes Studio Logs UI workaround
- Make MCP regex parsing limitations — Track F prescribes Make UI via Chrome
- Schema column drift (e.g., `crm_activity_log` table name) — Track E surfaces actual table names
- Activity-log double-write (RPC + JS callback) — Track D tests 7+15 + Track E include dedup verify
- Post-cutover discipline — §4/§6/§8 hard-gate every prizma-write path
- Real SMS fires on demo tests — §6 whitelist contacts only
- Cowork VM null-byte truncation — runs only on Daniel desktop, not Cowork
- Survey-before-destroy — §8 forbids `git restore`/`clean`/`reset`

**Cross-Reference Check:** This SPEC introduces ZERO new code names. The only new artifacts are SPEC.md + OVERNIGHT_AUDIT_REPORT.md. Cross-reference sweep: 0 collisions, 0 hits.

## 12. Foreman Notes

- **Skill loading:** plain Claude Code only (no opticup-executor — its commit/integrity gates would conflict)
- **Cowork cannot run this:** VM mount drift would corrupt file reads. Run on Daniel's Windows desktop or Mac.
- **Morning success bar:** Daniel + Overseer open the report, read executive summary in 5 min, open Appendix B, have a triage plan for the next 1-2 weeks of M4 SPECs.

*End of SPEC.*
