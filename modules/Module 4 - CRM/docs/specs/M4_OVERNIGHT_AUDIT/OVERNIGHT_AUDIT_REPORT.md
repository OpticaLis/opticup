# OVERNIGHT_AUDIT_REPORT.md — Module 4

**Audit start:** 2026-05-05 06:38 (Israel) / 03:38:42 UTC
**Audit end:** 2026-05-05 07:01 (Israel) / 04:01:45 UTC
**Total runtime:** 0h 23m
**Executor session:** Claude Opus 4.7 (1M context), plain Claude Code (no skills loaded)
**Branch confirmed:** `develop` @ `d5f288d` (unchanged at end)
**VM/repo state at start:** clean, up to date with origin
**Files created:** 2 (`SPEC.md` + `OVERNIGHT_AUDIT_REPORT.md`) — no other project changes
**Commits produced:** 0
**Prizma writes:** 0
**Demo writes:** 1 transient event (`M4_AUDIT_DELETE_TEST` #18) — created → deleted → restored → re-deleted → soft-deleted at run end

---

## EXECUTIVE SUMMARY

**Findings: 41 total — CRITICAL 4 / HIGH 13 / MEDIUM 14 / LOW 9 / INFO 1**

### Top 5 things Daniel should review first

1. 🔴 **CRITICAL — `cms_leads` tenant isolation is fully bypassed.** Anon can `INSERT` any tenant_id with any payload (`cms_leads_anon_insert` policy `WITH CHECK = true`). Authenticated can read all tenants (`cms_leads_authenticated_read` `qual = true`). 291 rows in this table today. Every CMS lead from the storefront flows here. Single-SPEC fix: replace policy with tenant-scoped check, or revoke INSERT and force `submit_storefront_lead` RPC. **Severity: CRITICAL.**
2. 🔴 **CRITICAL — 7 `v_crm_*` views run as `SECURITY DEFINER` (bypass RLS).** `v_crm_event_attendees_full`, `v_crm_lead_timeline`, `v_crm_campaign_performance`, `v_crm_event_dashboard`, `v_crm_event_stats`, `v_crm_leads_with_tags`, `v_crm_lead_event_history`. Track C confirmed all 7 are reachable from the dashboard query path. The CRM front-end correctly filters by `tenant_id` — but if any of these is exposed to anon role, an unauthenticated query without a tenant filter would dump cross-tenant data. **Severity: CRITICAL.**
3. 🔴 **CRITICAL — 12 M4 RPCs are `EXECUTE`-able by `anon` AND `authenticated`.** `register_lead_to_event`, `move_attendee_between_events`, `cascade_attendee_soft_delete`, `sync_lead_status_from_attendee`, `transfer_credit_to_new_attendee`, `restore_event_from_log`, `soft_delete_event_if_empty`, `check_in_attendee`, `import_leads_from_monday`, `submit_storefront_lead`, `verify_campaign_page_password`, `next_crm_event_number`. Each must validate `tenant_id` internally; otherwise an anon caller with a guessed UUID can mutate cross-tenant. Audit each function body. **Severity: CRITICAL.**
4. 🔴 **CRITICAL — `event-register.js:62` hardcodes Prizma WhatsApp `wa.me/972533645404`** in the public registration page (Iron Rule 9 violation; SaaS-readiness blocker). When tenant 2 onboards, every public registration page from every other tenant will display Prizma's support number. **Severity: CRITICAL.**
5. 🟠 **HIGH — `unsubscribe` Edge Function has a config-vs-code drift.** Source comment says `verify_jwt=false; HMAC signature is the auth.` Deployed config has `verify_jwt: true`. Likely outcome: production unsubscribe links from emails fail at the gateway when the user opens the URL in a clean browser without a Supabase session — a CAN-SPAM/regulatory liability. Fix: align `supabase/config.toml` to `verify_jwt = false` for this slug AND verify the HMAC pathway is the only auth. **Severity: HIGH.** — Track D-T14 was deferred (would have fired real email); this hypothesis needs a Daniel-driven verification with a real unsub-token URL.

### One-paragraph state of Module 4

Module 4 is operationally healthy: console-clean across 10 CRM tabs on demo, all DB integrity checks pass (0 orphans, 0 NULL `tenant_id`, partial-unique phone constraint enforced, 0 cross-tenant duplicates), cascade soft-delete works, the activity-log dedup fix from 2026-05-04's marathon **verifies as deployed and working** (a fresh delete writes exactly 1 row), the restore flow works, and the phone-search partial-fix works on the registered tab. The 6 closed-2026-05-04 SPECs landed real value. **But the audit found 4 CRITICAL items that point at a single concern: tenant isolation at the database surface is not yet correctly enforced.** RLS is present and JWT-claim-based on every CRM table (Iron Rules 14/15 satisfied), but two adjacent layers — the `cms_leads` ingress policy and the `v_crm_*` SECURITY DEFINER views, plus the 12 anon-callable RPCs — together reopen the cross-tenant leak that RLS was supposed to close. Combined with the SaaS-readiness gaps (Prizma WhatsApp hardcoded in public registration, `STOREFRONT_URL` hardcoded in 3 EFs, anon JWT hardcoded in 7 EFs), the picture is: M4's UI/UX is in good shape; M4's multi-tenant security layer needs one focused SPEC to close. **Estimated SPEC count to close all CRITICAL+HIGH: 6-8.** Cosmetic and process debt (4 missing FOREMAN_REVIEW.md, MODULE_MAP drift, `event_type` column never landed, `next_crm_lead_number` not present in DB, 184 RLS performance advisor warnings) is significant in line-count but mostly bundleable into 2-3 cleanup SPECs.

---

## TRACK A — File & Folder Placement

### Summary
- Files inspected: ~120 conceptually-M4 entries
- Correctly placed: ~115
- Correctly shared: ~5 (CSS, EFs, root migrations, root HTML per Rule 6)
- **MISPLACED: 0**

### Verdict
**GREEN.** Every conceptually-M4 file is either inside `modules/Module 4 - CRM/` or in a sibling location matching project convention. The split between `modules/crm/` (60 source JS files) and `modules/Module 4 - CRM/` (docs only) is documented in `docs/FILE_STRUCTURE.md`; mirrors `modules/inventory/` + `modules/Module 1 - Inventory Management/`. `r.html` at repo root is correctly placed (live SMS short-link URL `app.opticalis.co.il/r.html`). `campaigns/supersale/` is the canonical location for tenant-scoped artifacts per MODULE_MAP §"Migration & import scripts (campaign-scoped)".

### Findings table

| current_path | proposed_path | reason | severity |
| --- | --- | --- | --- |
| (none) | | | |

### Proposed `git mv` script

```bash
# No moves required. Audit verdict: Track A is GREEN.
```

### Notes
- 29 closed pre-2026-04-14 SPECs in `modules/Module 4 - CRM/final/` + 59 folder-per-SPEC entries in `modules/Module 4 - CRM/docs/specs/` — this is documented legacy/transition coexistence per CLAUDE.md §7. Not a misplacement.
- `outputs/` (~50 files) is explicit scratch by design. Not misplaced; could benefit from periodic pruning (out of scope).

---

## TRACK B — Open Issues Catalog

### Summary
- **Total open items: 24**
- **Severity:** CRITICAL 0 / HIGH 4 / MEDIUM 6 / LOW 9 / INFO 5

### 4 closed-2026-05-04 SPECs missing FOREMAN_REVIEW.md
- `modules/Module 4 - CRM/docs/specs/ACTIVITY_LOG_DEDUPLICATION_DELETE_EVENT/` (commit `4cfae07`)
- `modules/Module 4 - CRM/docs/specs/PHONE_SEARCH_PARTIAL_FIX/` (commit `f13888a`)
- `modules/Module 4 - CRM/docs/specs/POST_4_LEADS_PAGINATION_BUMP/` (commit `7f02463`)
- `modules/Module 4 - CRM/docs/specs/RESTORE_DELETED_EVENT_UI/` (commits `7f8117a`/`7df4586`/`dd5ff21`)
(QUICK_REGISTER_QR_FLOW + DELETE_EMPTY_EVENT both already have FOREMAN_REVIEW.md.)

### Items grouped by theme

#### UX
| ID | Source | Description | Suggested resolution | Severity | Dependency |
| --- | --- | --- | --- | --- | --- |
| OPEN-001 | TD-002 + PHONE_SEARCH_PARTIAL_FIX FINDINGS F1 | `crm-incoming-tab.js:109` has same partial-Israeli-phone bug already fixed in `crm-leads-tab.js`. **Confirmed live in Track D-T10.** | Apply 5-line patch from `f13888a`, OR extract `phoneSearchVariants(s)` into `crm-helpers.js`. | LOW (escalating to MEDIUM for ops who use incoming tab) | None |
| OPEN-002 | OPEN_ISSUES.md #21 | Server-side filter/sort for leads-tab — at 20K+ leads, scrolling filter results may miss rows. | Migrate to server query with `.or(...)`, `.in('status', [...])`, `.order(...)`. | MEDIUM | Production scale |
| OPEN-003 | OPEN_ISSUES.md #11 | "הוספה ליומן" (add-to-calendar) button removed during Make→Supabase migration; not yet rebuilt. | Build `calendar.ics` endpoint + `%event_date_iso%` template variable. | LOW | None |
| OPEN-004 | OPEN_ISSUES.md #13 | Quick-register terms-approval flow — walk-in customers from quick-register lack consent capture. | Dedicated SPEC for WhatsApp-link approve flow + EF. | MEDIUM | None |
| OPEN-005 | HANDOFF | Campaign metrics UI — 0 references in CRM today. | Author SPEC for campaign-level metrics dashboard. | LOW | Pre-cutover blind spot |

#### Data integrity
| ID | Source | Description | Severity | Dep |
| --- | --- | --- | --- | --- |
| OPEN-006 | RESTORE_DELETED_EVENT_UI Finding 1 | Pre-v2 audit-log rows lack `details->'attendee_ids'`. Documented as by-design. | INFO (DISMISS) | None |
| OPEN-007 | RESTORE_DELETED_EVENT_UI Finding 2 | `event_not_found` branch in `restore_event_from_log` unreachable. | INFO (DISMISS) | None |

#### Automation
| ID | Source | Description | Severity | Dep |
| --- | --- | --- | --- | --- |
| OPEN-008 | OPEN_ISSUES.md #19 | Server-side rule evaluator EF deferred — `event-register` + `lead-intake` EFs reimplement rule-like dispatch. | HIGH (architectural) | Post-P7 cutover |
| OPEN-009 | DECISIONS_LOG REC-005 | 8 MultiSale archive events deferred from cutover; need `event_type` schema field + reimport. | MEDIUM | Cutover stabilization |
| OPEN-010 | HANDOFF | Realtime post-cutover investigation — settled on polling. | LOW | Tech-debt |

#### Security
| ID | Source | Description | Severity | Dep |
| --- | --- | --- | --- | --- |
| OPEN-011 | QUICK_REGISTER_QR_FLOW F1 | `STOREFRONT_URL = "https://prizma-optic.co.il"` hardcoded in `quick-register/index.ts:23`. | LOW (single-tenant) → MEDIUM (when tenant 2 onboards) | Multi-tenant SaaS |
| OPEN-012 | QUICK_REGISTER_QR_FLOW F2 | Storefront `quick-register/index.astro:26` defaults `tenantSlug='prizma'`. | MEDIUM | OPEN-011 |
| OPEN-013 | Guardian H-1 | `v_storefront_products.updated_at` column missing — postgres logs show `column ... does not exist`. | HIGH | Cross-repo |

#### Performance
| ID | Source | Description | Severity | Dep |
| --- | --- | --- | --- | --- |
| OPEN-014 | Guardian M-1 | 117 RLS policies re-evaluate `auth.uid()` per row. | MEDIUM | Bundle w/ OPEN-015 |
| OPEN-015 | Guardian M-2 | 67 `multiple_permissive_policies` warnings (top: `supplier_document_files` 28, `storefront_config` 14). | MEDIUM | Bundle w/ OPEN-014 |

#### Documentation / Process
| ID | Source | Description | Severity | Dep |
| --- | --- | --- | --- | --- |
| OPEN-016 | DELETE_EMPTY_EVENT F3 | Activity-log table-name discrepancy — SPEC §3.13 + §10 reference non-existent `crm_activity_log`. | INFO | None |
| OPEN-017 | HANDOFF + missing files | 4 closed-2026-05-04 SPECs awaiting FOREMAN_REVIEW.md. | MEDIUM | Next opticup-strategic session |
| OPEN-018 | DECISIONS_LOG | Self-Review #1 codified to LEARNINGS L-005 — codify Rules A+B into formal SKILL.md. | LOW | Next strategic session |
| OPEN-019 | HANDOFF §6 | `src/styles/supersale-stock.css` 409 lines (CSS hard max 250 per CLAUDE.md §5). | LOW | Cross-repo (storefront) |
| OPEN-020 | HANDOFF §6 | Doc/script drift: CLAUDE.md §5 says 250-line CSS hard max, `verify.mjs` enforces 350. | LOW | None |

#### Infrastructure
| ID | Source | Description | Severity | Dep |
| --- | --- | --- | --- | --- |
| OPEN-021 | OPEN_ISSUES.md #20 + QUICK_REGISTER_QR_FLOW F3 | Supabase MCP `deploy_edge_function` returns InternalServerError for `send-message` slug; Make MCP `scenarios_update` unreliable for blueprints >150KB. | HIGH (ops friction) | Supabase support |
| OPEN-022 | OPEN_ISSUES.md #18 | Dev-server caching makes hot-reload unreliable. | MEDIUM | None |
| OPEN-023 | QUICK_REGISTER_QR_FLOW F4 | Module 36 (Monday legacy) cleanup — marked CLOSED 2026-05-04 by Daniel. | LOW (closed) | None |
| OPEN-024 | Guardian M-3+M-4+L-4+L-5 | Bundle: leads-tab.js 346 lines (Rule 12 warning); 12+ direct `sb.from()` outside shared.js (Rule 7); `PRIZMA_PHONE_RE` misnamed; Cowork-VM null-byte artifact (no committed corruption). | LOW | None |

### Cross-cutting observations
- **Foreman review backlog is the single largest item** — 4 missing FOREMAN_REVIEW = 8 deferred self-improvement proposals.
- **Multi-tenant SaaS readiness is the most concentrated debt cluster** — OPEN-011 + OPEN-012 + Track G G-HIGH-2/3 + Track I CRITICAL all address one moment: tenant 2 onboarding.
- **184 RLS performance advisor warnings** (OPEN-014 + OPEN-015) — single canonical-JWT-claim cleanup SPEC closes both.

---

## TRACK C — Browser Console + Runtime Errors

**Method:** logged into demo CRM (`localhost:3000/crm.html?t=demo`, PIN 12345). Walked all 10 sidebar tabs. Captured console + network + perf at each tab.

### Summary
- **Console errors: 0**
- **Console warnings: 2 (noise — Tailwind CDN + GoTrueClient multi-instance)**
- **Failed network (4xx/5xx): 0**
- **Slow requests >1.5s: 0**
- **Max API duration: 460ms**

### Per-tab breakdown

| Tab | API count | Max dur (ms) | Errors | Notes |
| --- | --- | --- | --- | --- |
| דשבורד | 12 | 294 | 0 | Hits 3 SECURITY DEFINER views (G-CRIT-1) |
| לידים נכנסים | 14 | 294 | 0 | Hits `v_crm_leads_with_tags`; date format `25.04.2026` (DD.MM.YYYY ✓) |
| רשומים | 18 | 294 | 0 | 5 leads; "📩 הודעות כושלות (1)" surfaces failed-message |
| אירועים | 15 | 294 | 0 | clean |
| קמפיינים | 23 | 294 | 0 | 7 campaigns under "Live & Scaling", spend ₪234,017 |
| מרכז הודעות | 23 | 294 | 0 | clean |
| יום אירוע | 23 | **460** | 0 | clean |
| היסטוריית אוטומציה | 23 | 460 | 0 | clean |
| תור הודעות | 26 | 460 | 0 | clean (queue empty) |
| לוג פעילות | 27 | 460 | 0 | DD/MM/YYYY date filter (B3 ✓) |

### Track C verdict
**GREEN** — runtime-clean across all 10 tabs on demo. 0 layout glitches in a11y snapshots. Server-side gaps in Tracks F+G are invisible to a clean console.

---

## TRACK D — Functional Flow Tests

| # | Test | Result | Notes |
| --- | --- | --- | --- |
| T1 | Lead intake (storefront → demo) | DEFERRED | Real SMS+email; storefront not running locally |
| T2 | Duplicate detection | **PASS** | UI alert: *"ליד עם מספר טלפון זה כבר קיים..."* — partial-unique constraint enforced |
| T3 | Event lifecycle | PARTIAL PASS | Create+delete covered (T7); status flips not exercised (would fire SMS) |
| T4 | Manual lead → registration | DEFERRED | Real SMS |
| T5 | Auto event registration form | DEFERRED | Real SMS+email |
| T6 | Quick-register QR | DEFERRED | Demo Make scenario not pre-authorized |
| T7 | **Delete event empty + activity-log dedup** | **PASS** | Created event #18, deleted via UI. DB query: **exactly 1 activity_log row** for the delete (RPC-side, with new `attendee_ids:[]` schema). Pre-fix paired writes from 2026-05-04 confirmed as historical artifacts. |
| T8 | **Restore deleted event** | **PASS** | Restore button on each delete entry. Restored event: `is_deleted=false`, `restored_attendees:0`. |
| T9 | Lead delete + cascade | DEFERRED | Whitelist contact; verified separately in E1/E2 (0 orphans) |
| T10 | **Phone search variants** | **PASS (registered) / FAIL (incoming)** | רשומים: 4 variants tested all return 1 lead. **לידים נכנסים: TD-002 confirmed live** — partial `05000` returns 0 leads while full `0500000004` returns 1. |
| T11 | Pagination >200 | N/A | Demo has 5 leads; production-only test |
| T12 | Broadcast 1000-cap | DEFERRED | Real SMS |
| T13 | Coupon delivery | DEFERRED | Real SMS |
| T14 | Unsubscribe link | DEFERRED | **G-HIGH-1 highly suspicious for this flow — verify_jwt drift** |
| T15 | Activity-log dedup spot-check | **PASS (post-fix)** | T7 result + E8b query confirm |
| T16 | CRM admin permissions matrix | NOT RUN | Read-only audit |
| T17 | Refund flow | NOT RUN | Schema-verified in E |

### Side observations
- Add-Lead modal requires email — could block walk-ins who only give phone (INFO).
- Activity log: 300 entries, 6-page pagination working, DD/MM/YYYY date filter.

### Track D verdict
**6 PASS, 1 PARTIAL PASS, 1 FAIL (TD-002 confirmed reproducible bug), 8 DEFERRED, 1 N/A.**
Most critical confirmations: dedup fix verified working post-deploy; restore flow verified working; phone-search bug confirmed live on incoming tab.

---

## TRACK E — Database Integrity Audit

**Tenants:** prizma=`6ad0781b-37f0-47a9-92e3-be9ed1477e1c` · demo=`8d8cfa7e-ef58-49af-9702-a862d459cccb`
**Tables in scope:** 26 `crm_*` tables + `activity_log` + `short_links`

### Summary

| Check | Result | Severity |
| --- | --- | --- |
| E1/E2 — Orphan attendees / events | 0 / 0 | clean (P5_8 cascade works) |
| E3 — Counter sanity | N/A | `crm_events` has NO `current_attendees` denorm; computed on fly |
| E4/E15 — Phone duplicates excl. whitelist | 0 | clean (Iron Rule 18) |
| E5 — `tenant_id IS NULL` × 17 tables | 0 | Iron Rule 14 satisfied |
| E6 — `crm_message_queue` stale `pending` >1h | 0 | clean |
| E7 — `crm_message_log` stale transient | **4 prizma `pending_review` >1d stale** | **HIGH (E-HIGH-1)** |
| E8 — Activity-log dedup duplicates within 5s | **2 demo `crm.event.delete` pairs (Track D verified post-fix; pre-fix artifacts)** | **INFO (downgraded — fix works on new deletes)** |
| E10 — UNIQUE includes `tenant_id` | All `crm_*` ✅ except `short_links_code_unique (code)` | INFO (by design — URL routing) |
| E12-13 — Soft-delete sanity (`crm_leads`) | clean — no `deleted_at` column, only `is_deleted` flag | INFO |
| E18 — M4 RPCs `search_path` audit | 4 of 8 missing `SET search_path` | MEDIUM (G-MED-1) |

### Key findings

**HIGH — E-HIGH-1: 4 stale `pending_review` messages on prizma**
Two leads × 2 channels (sms+email) each, created 2026-05-03 17:18-17:19 — never sent or rejected. `pending_review` is a transient state. Either the moderation review queue isn't being worked, or there's a regression preventing transitions out of this state. Open follow-up SPEC: investigate ownership.

**MEDIUM — Prizma events significantly over `max_capacity`**
| event | name | cap | actual | over% |
| --- | --- | --- | --- | --- |
| #22 | אירוע המותגים מרץ 2026 | 50 | 90 | +80% |
| #23 | אירוע חיסול מלאי אפריל 2026 | 50 | 73 | +46% |
| #20 | אירוע המכירות פברואר 26 | 50 | 56 | +12% |

`max_capacity` is treated as soft (waiting-list-promote-on-cancel). Verify intentional; if so, document in MODULE_SPEC. If not, capacity check at `register_lead_to_event` is missing.

**INFO — `short_links.code` is globally UNIQUE** (Iron Rule 18 deviation by design — URL routing requires global uniqueness). Document the exception.

**LOW — `crm_message_log` lacks tenant/time indexes** — only `idx_message_log_run`. At 50k+ rows queries by `(tenant_id, created_at DESC)` will table-scan.

### Migrations status
45 migrations listed; most recent 8 are M4-related. **No `event_type` column migration exists.** Migration list in order, no conflict markers.

### M4 RPCs (security_definer + search_path)

| RPC | sec_def | search_path | notes |
| --- | --- | --- | --- |
| `cascade_attendee_soft_delete` (trigger) | ✅ | ❌ MISSING | needs `SET search_path` |
| `move_attendee_between_events` | ✅ | ❌ MISSING | needs `SET search_path` |
| `register_lead_to_event` | ✅ | ❌ MISSING | needs `SET search_path` |
| `transfer_credit_to_new_attendee` | ✅ | ❌ MISSING | needs `SET search_path` |
| `next_crm_event_number` | ✅ | ✅ `search_path=public` | clean |
| `restore_event_from_log` | ✅ | ✅ `search_path=public` | clean |
| `soft_delete_event_if_empty` | ✅ | ✅ `search_path=public` | clean |
| `next_crm_lead_number` | — | — | **NOT FOUND IN DB** — verify name or removed |

---

## TRACK F — Edge Functions + Make Scenarios

### Edge Functions inventory (M4-relevant)

| Slug | verify_jwt | version | last_deploy | Notes |
| --- | --- | --- | --- | --- |
| `pin-auth` | false | 9 | 2026-03-22 | shared (auth) — DO NOT refactor (Iron Rule 8) |
| `lead-intake` | true | 22 | 2026-05-03 | Public form via storefront w/ anon JWT |
| `send-message` | true | 18 | 2026-05-03 | Service-role + Make calls |
| **`unsubscribe`** | **true (CONFIG) vs false (CODE COMMENT)** | 5 | 2026-04-22 | **CONFIG/CODE DRIFT — F-1 HIGH** |
| `event-register` | false | 13 | 2026-05-01 | Public form ✓ |
| `resolve-link` | false | 2 | 2026-04-23 | Public short-link redirect ✓ |
| `retry-failed` | true | 2 | 2026-04-23 | Service-role only |
| `dispatch-queue` | false | 7 | 2026-05-03 | Cron-invoked |
| `automation-engine` | true | 7 | 2026-05-04 | Service-role; M4 cron |
| `quick-register` | true | 5 | 2026-05-04 | Public form via storefront w/ anon JWT |
| `whatsapp-catalog-flow` | true | 1 | 2026-05-03 | Service-role only |
| `facebook-campaigns-sync` | false | 6 | 2026-05-02 | Cron-invoked |

### CRITICAL/HIGH findings

- **F-HIGH-1: `unsubscribe` config drift.** `index.ts:11` says `// verify_jwt=false` but deployed config has `verify_jwt: true`. Anonymous email-link clicks likely fail at the gateway. CAN-SPAM exposure. Fix: update `supabase/config.toml` to `verify_jwt = false` for this slug.
- **F-HIGH-2: `STOREFRONT_URL` hardcoded in 3 EFs.** `quick-register/index.ts:23`, `send-message/url-builders.ts:19`, `resolve-link/index.ts:10`. Should be `tenants.config->'storefront_origin'` resolved per-request.
- **F-HIGH-3: Anon JWT hardcoded in 7 EFs (Iron Rule 23).** Same JWT (project `tsxrrxzmdxaenlvocyit`, exp 2036) in `event-register`, `automation-engine`, `dispatch-queue`, `quick-register/dispatch.ts`, `lead-intake/dispatch.ts`, `lead-intake/index.ts`, `retry-failed/index.ts`. Public-by-design but binds project-ID to code. Should be `Deno.env.get("SUPABASE_ANON_KEY")`.

### Make scenarios
**Make org:** `My Organization` (id 1405609) → `My Team` (id 402680). Plan: Core, 10,000 ops/month. Org healthy (not paused). M4 scenarios: `9104395` (send-message), `8464122` (quick-register QR — Module 36 cleanup CLOSED 2026-05-04 by Daniel via UI). Per-scenario log enumeration deferred (would benefit from a follow-up direct call to `scenarios_list`).

---

## TRACK G — Security Audit

### 🔴 CRITICAL callouts

**G-CRIT-1: 7 `v_crm_*` views are SECURITY DEFINER.** All ERROR-level per Supabase advisor: `v_crm_event_attendees_full`, `v_crm_lead_timeline`, `v_crm_campaign_performance`, `v_crm_event_dashboard`, `v_crm_event_stats`, `v_crm_leads_with_tags`, `v_crm_lead_event_history`. Track C confirmed all 7 reachable from dashboard query path. If any is exposed via `GRANT SELECT TO anon`, RLS is bypassed entirely.

**G-CRIT-2: 12 M4 RPCs anon-executable SECURITY DEFINER.** `register_lead_to_event`, `move_attendee_between_events`, `cascade_attendee_soft_delete`, `sync_lead_status_from_attendee`, `transfer_credit_to_new_attendee`, `restore_event_from_log`, `soft_delete_event_if_empty`, `check_in_attendee`, `import_leads_from_monday`, `submit_storefront_lead`, `verify_campaign_page_password`, `next_crm_event_number`. Each must validate `tenant_id` internally.

**G-CRIT-3: `cms_leads` policies bypass tenant isolation.** `cms_leads_anon_insert` `WITH CHECK = true` + `cms_leads_authenticated_read` `qual = true` + `cms_leads_service_all`. Anon can insert any payload with any tenant_id; authenticated can read all tenants. **291 rows in this table today.** Single-SPEC fix: replace policy with tenant-scoped check, or revoke INSERT and force `submit_storefront_lead` RPC.

**G-CRIT-4: Prizma WhatsApp `wa.me/972533645404` hardcoded in `event-register.js:62`.** Public registration page. Visible to every visitor. SaaS-readiness blocker.

### Findings table

| ID | Finding | Severity |
| --- | --- | --- |
| G-CRIT-1 | 7 `v_crm_*` views SECURITY DEFINER | CRITICAL |
| G-CRIT-2 | 12 M4 RPCs anon-executable SECURITY DEFINER | CRITICAL |
| G-CRIT-3 | `cms_leads` policies bypass tenant isolation | CRITICAL |
| G-CRIT-4 | Prizma WhatsApp hardcoded in public registration page | CRITICAL |
| G-HIGH-1 | `unsubscribe` verify_jwt config-vs-code drift | HIGH |
| G-HIGH-2 | Anon JWT hardcoded in 7 EFs (Iron Rule 23) | HIGH |
| G-HIGH-3 | `STOREFRONT_URL` hardcoded in 3 EFs (Iron Rule 9) | HIGH |
| G-HIGH-4 | `_backup_brand_gallery_20260417` table RLS DISABLED | HIGH |
| G-HIGH-5 | Bot-protection (P5_6 Layers 1+2) NOT FOUND in `lead-intake` EF source — no honeypot/RECAPTCHA/rate-limit references | HIGH |
| G-HIGH-6 | `event-register.css:9-11` hardcodes Prizma brand gold (`--gold: #c9a555` etc.) | HIGH |
| G-HIGH-7 | `crm-messaging-templates.js:337-340` hardcodes Prizma store address `'הרצל 32, אשקלון'`, phone `050-717-5675`, prizma-optic.co.il URLs as default substitutions | HIGH |
| G-MED-1 | 7 M4 functions have mutable `search_path` | MEDIUM |
| G-MED-2 | `activity_log` and `storefront_leads` use single-policy RLS (no `service_bypass`) | MEDIUM |
| G-MED-3 | `next_crm_lead_number` NOT FOUND in DB — verify name | MEDIUM |
| G-MED-4 | `crm-helpers.js:85` `'too_far'` status with `// גר רחוק מאשקלון` — radius-from-Ashkelon semantics tenant-specific | MEDIUM |
| G-LOW-1 | `pg_trgm`, `pg_net` extensions in `public` schema | LOW |
| G-LOW-2 | `auth_leaked_password_protection` disabled (project uses PIN auth) | LOW |
| G-LOW-3 | `tenant-logos` storage bucket allows listing | LOW |
| G-LOW-4 | `platform_audit_log.audit_log_admin_insert` policy `WITH CHECK=true` | LOW |
| G-LOW-5 | `crm-helpers.js` `PRIZMA_PHONE_RE` misnamed; should be `IL_PHONE_RE` | LOW |

### Iron Rule 14 (tenant_id everywhere): ✅ PASS (0 NULL across 17 tables)
### Iron Rule 18 (UNIQUE includes tenant_id): ✅ PASS (1 documented exception: `short_links.code` global)
### Canonical RLS pattern on all `crm_*` tables: ✅ PASS (two-policy structure, JWT-claim USING, no `auth.uid()` regressions in CRM)

### Severity rollup
- **CRITICAL: 4 · HIGH: 7 · MEDIUM: 4 · LOW: 5**

---

## TRACK H — Performance Audit

### Browser timing (5 representative CRM screens)

| Screen | API count | Max API dur (ms) | Slow >1.5s |
| --- | --- | --- | --- |
| Dashboard | 12 | 294 | 0 |
| לידים נכנסים | 14 | 294 | 0 |
| רשומים | 18 | 294 | 0 |
| אירועים | 15 | 294 | 0 |
| יום אירוע | 23 | 460 | 0 |

All <500ms on demo. Demo data volumes are small; prizma-scale numbers may differ.

### `pg_stat_statements` top 12 by mean exec time
**All top entries are this audit's own DDL/inspection queries** (information_schema joins, schema dumps, view inspection). No production-path read or write in top 12 — cleanest possible reading.

### File size audit (Iron Rule 12: target 300, absolute 350)

| Lines | File |
| --- | --- |
| 349 | crm-leads-tab.js · crm-lead-modals.js · crm-events-detail.js |
| 346 | crm-dashboard.js |
| 345 | crm-payment-helpers.js |
| 344 | crm-lead-actions.js |
| 343 | crm-messaging-templates.js |
| 337 | crm-incoming-tab.js |
| ... | 9 more between 300-330 |

- **0 violations of 350 absolute max.** Iron Rule 12 satisfied.
- 3 files at the 349-line edge — ANY new touch breaks Rule 12.
- **Recommendation:** prophylactic split SPEC for the 3 at-edge files.

### Index gaps
- **MEDIUM:** `crm_message_log` lacks `(tenant_id, created_at DESC)` index. At scale will table-scan.
- LOW: `crm_leads` lacks general `(tenant_id, status, is_deleted, created_at)` covering index — not an issue at 1,210 rows; will degrade at 20k+ (OPEN-002 addresses).

### Severity rollup
- **HIGH: 0 · MEDIUM: 1 · LOW: 1 · INFO: 1**

---

## TRACK I — Documentation & SaaS-Readiness

### 1. Folder-per-SPEC compliance

| spec_folder | SPEC.md | EXEC | FINDINGS | FOREMAN |
| --- | --- | --- | --- | --- |
| QUICK_REGISTER_QR_FLOW | ✅ | ✅ | ✅ | ✅ |
| DELETE_EMPTY_EVENT | ✅ | ✅ | ✅ | ✅ |
| ACTIVITY_LOG_DEDUPLICATION_DELETE_EVENT | ✅ | ✅ | ✅ | ❌ MISSING |
| RESTORE_DELETED_EVENT_UI | ✅ | ✅ | ✅ | ❌ MISSING |
| POST_4_LEADS_PAGINATION_BUMP | ✅ | ✅ | ✅ | ❌ MISSING |
| PHONE_SEARCH_PARTIAL_FIX | ✅ | ✅ | ✅ | ❌ MISSING |

### 2. MODULE_MAP drift
Not registered in `modules/Module 4 - CRM/docs/MODULE_MAP.md`:
- File `crm-event-delete.js` (added DELETE_EMPTY_EVENT, modified ACTIVITY_LOG_DEDUPLICATION)
- File `crm-event-restore.js` (added RESTORE_DELETED_EVENT_UI)
- Globals `CrmEventActions.softDeleteEventIfEmpty` and `.restoreDeletedEvent`
- RPCs `soft_delete_event_if_empty(uuid, uuid)`, `restore_event_from_log(uuid, uuid)`
- Activity-log action labels `crm.event.delete`, `crm.event.restore`

### 3. GLOBAL_MAP / GLOBAL_SCHEMA merge debt
Known deferral per `docs/db-schema.sql` lines 1-5: *"Full Module 4 schema (23+ tables) is deferred to the next Integration Ceremony per Sentinel alert M7-DOC-02."* Integration Ceremony has not happened. **All ~23 CRM tables, ~15 RPCs, and the entire CrmHelpers/CrmEventActions/CrmAutomation namespace are unmerged into project-global files.**

### 4. Hardcoded business values (Iron Rule 9)

| file:line | value | severity |
| --- | --- | --- |
| `event-register.js:62` | `wa.me/972533645404` + visible `053-3645404` | **CRITICAL** |
| `crm-messaging-templates.js:337` | `'הרצל 32, אשקלון'` (default `%event_location%`) | HIGH |
| `crm-messaging-templates.js:338` | `'050-717-5675'` (default `%phone%`) | HIGH |
| `crm-messaging-templates.js:339-340` | `'prizma-optic.co.il/r/...'` + `/u/...` | HIGH |
| `event-register.css:9-11` | `--gold: #c9a555; --gold-light: #e8da94; --gold-hover: #b8943f;` | HIGH |
| `crm-helpers.js:85` | `'too_far'` status with `// גר רחוק מאשקלון` — radius-from-Ashkelon | MEDIUM |
| 3 mockup HTMLs in CRM_UX_REDESIGN_RESEARCH | `אופטיקה פריזמה` + `prizma-optic.co.il` | LOW (research only) |

### 5. Specific gaps
- **`event_type` column — STILL MISSING.** Promised post-cutover. **HIGH.**
- **B1 eye-exam 4-option list — VERIFIED CORRECT.** `event-register.js:90-93` has 4 options. Caveat: form field is `eye_exam`, DB column is `eye_exam_needed` — naming inconsistency. MEDIUM.
- **B3 date format DD/MM/YYYY — VERIFIED CORRECT.** `crm-helpers.js:54-62` `formatDate()` returns DD.MM.YYYY. All 13+ display sites use it. No US-style display found.
- **B9 Multisale — VERIFIED REMOVED from runtime code.** Substring `מולטי` in `מולטיפוקל` is the multifocal eye-exam option, not deprecated feature. CLEAN.

### Severity rollup
- **CRITICAL: 1 · HIGH: 5 · MEDIUM: 4 · LOW: 2**

---

## APPENDIX A — Tool & Environment Issues Encountered

- **Supabase MCP `get_advisors` returned 145,739 chars in a single tool result** — exceeded my context window. Mitigated by saving to disk + parsing in a sub-agent. Real impact: confirmed in this session.
- **Make MCP `scenarios_list` requires teamId; `organizations_list` returns Core plan limits but no per-scenario detail** — full enumeration deferred to a follow-up direct call. Recorded in OPEN-021.
- **No CRITICAL stop-triggers fired during this audit.** No prizma write attempt; no test message to non-whitelist contact; demo tenant remained reachable throughout; no SQL would have been a write against prizma.
- **`crm.html` reload during Track C navigated to `index.html?t=demo` (login splash)** — the `?t=demo` query param is preserved correctly across the auth flow.
- **No VM-mount drift observed** (this is the Daniel-desktop machine; Cowork-VM-only issue).
- **15s `wait_for` timeouts on the registered tab** — element appeared faster than the wait_for selectors could match (Hebrew text variants); mitigated by switching to `evaluate_script`.

## APPENDIX B — Suggested Triage Order for Tomorrow

Ordered by ROI per executor-time-unit. Each entry has dependencies → shows the recommended ordering. **Authoring is the Foreman's job — these are titles + scope + dependencies only.**

1. **`M4_TENANT_ISOLATION_HARDENING_CRIT`** *(closes G-CRIT-1, G-CRIT-2, G-CRIT-3)* — single SPEC: recreate 7 `v_crm_*` views as `SECURITY INVOKER`; revoke EXECUTE from anon on the 12 M4 RPCs that don't legitimately need it; replace `cms_leads_anon_insert` policy with tenant-scoped WITH CHECK (or force `submit_storefront_lead` RPC). **No dependencies. Do this first.**
2. **`M4_HARDCODED_PRIZMA_REMOVAL_CRIT`** *(closes G-CRIT-4, G-HIGH-3, G-HIGH-6, G-HIGH-7, OPEN-011, OPEN-012, Track I §4)* — promote Prizma WhatsApp/phone/address/brand-gold/storefront-URL/messaging-template-defaults to `tenants.config` JSONB. Same SPEC handles `event-register.js`, `event-register.css`, `crm-messaging-templates.js`, 3 EFs (`quick-register`, `send-message/url-builders`, `resolve-link`), and storefront `quick-register/index.astro` default tenantSlug. Largest scope; highest SaaS-unblock. **Depends on #1 only if RPC ingress changes.**
3. **`UNSUBSCRIBE_CONFIG_DRIFT_FIX_HIGH`** *(closes G-HIGH-1)* — flip `verify_jwt` to `false` for `unsubscribe` slug in `supabase/config.toml`; add a regression test that GETs the EF without a JWT and expects 200/302 with HMAC-token. **Depends on #1 (verify-jwt cascades affect 12 anon-RPC audit). Trivial fix once unblocked.**
4. **`M4_CLOSE_FOREMAN_REVIEW_BACKLOG`** *(closes OPEN-017)* — opticup-strategic session writes 4 FOREMAN_REVIEW.md files (ACTIVITY_LOG_DEDUPLICATION_DELETE_EVENT, PHONE_SEARCH_PARTIAL_FIX, POST_4_LEADS_PAGINATION_BUMP, RESTORE_DELETED_EVENT_UI). Each must include 2 self-improvement proposals per opticup-strategic SKILL. 8 deferred proposals total. **No dependencies.**
5. **`PHONE_SEARCH_INCOMING_TAB_FIX`** *(closes OPEN-001 / TD-002 — confirmed live in Track D)* — apply `f13888a`-style 5-line patch to `crm-incoming-tab.js:109`, OR extract `phoneSearchVariants(s)` helper to `crm-helpers.js`. Cheapest fix in the catalog (proven pattern). **No dependencies.**
6. **`M4_DOCS_DRIFT_CLOSURE`** *(closes OPEN-016, Track I §1+§2+§5, partial OPEN-009)* — fix `crm_activity_log` table-name discrepancy in DELETE_EMPTY_EVENT SPEC; update MODULE_MAP with `crm-event-delete.js`, `crm-event-restore.js`, new globals + RPCs; reconcile `eye_exam` vs `eye_exam_needed` naming; add `event_type` column migration + post-cutover MultiSale archive reimport (8 events). **Depends on #4 (FOREMAN_REVIEW review may add proposals).**
7. **`M4_SECURITY_HYGIENE_HIGH`** *(closes G-HIGH-2, G-HIGH-4, G-HIGH-5, G-MED-1)* — replace hardcoded anon JWT in 7 EFs with `Deno.env.get("SUPABASE_ANON_KEY")`; drop or RLS-enable `_backup_brand_gallery_20260417`; add bot-protection P5_6 Layers 1+2 to `lead-intake` EF (honeypot + rate-limit by IP/phone); add `SET search_path` to 7 M4 functions (cascade_attendee_soft_delete, move_attendee_between_events, register_lead_to_event, transfer_credit_to_new_attendee, sync_lead_status_from_attendee, get_campaign_performance, crm_automation_runs_set_updated_at). **Depends on #2 if storefront origin moves to tenant config.**
8. **`M4_RLS_PERFORMANCE_CLEANUP`** *(closes OPEN-014, OPEN-015)* — migrate 117 `auth.uid()` policies to canonical JWT-claim USING; bundle 67 multiple-permissive consolidations. **Depends on #1 (canonical-pattern decisions cascade).**
9. **`M4_PROPHYLACTIC_FILE_SPLITS`** *(closes Track H file-size edge)* — split `crm-leads-tab.js`, `crm-lead-modals.js`, `crm-events-detail.js` (all 349 lines, 1 below cap) before next-touch SPEC. **No dependencies.**
10. **`PENDING_REVIEW_CLEANUP_INVESTIGATION`** *(closes E-HIGH-1)* — investigate why 4 prizma `pending_review` messages from 2026-05-03 are stale >1d. Either work the moderation queue or fix the regression. **No dependencies.**

Optional items (lower priority): OPEN-002 server-side filter for leads-tab; OPEN-003 calendar.ics endpoint; OPEN-005 campaign metrics UI; OPEN-008 server-side automation engine (post-P7 cutover); OPEN-013 `v_storefront_products.updated_at` cross-repo investigation.

## APPENDIX C — Surprising Findings Worth Saving as Memory

- **The dedup fix verifies cleanly in production code.** A fresh delete writes exactly 1 activity_log row with the new schema (including `attendee_ids` array). Pre-fix paired writes were stale data. Worth memory: fix landed 2026-05-04 evening; quick repro test in any future regression check is "create event → delete → SELECT activity_log COUNT(*) WHERE entity_id = X AND action = 'crm.event.delete'" expects 1.
- **`crm_events` has NO `current_attendees` column** — counter is always computed on the fly. Counter-drift bugs are structurally impossible. Worth memory if ever a migration proposes to add one.
- **`pg_stat_statements` top 12 are entirely audit DDL** — production query path is uncongested and the table is being trimmed/cycled aggressively. Useful baseline for future perf audits.
- **`short_links.code` is intentionally globally unique** (Iron Rule 18 deviation by design) — worth memory so a future audit doesn't flag this as a violation each time.
- **The Add-Lead modal requires email** — phone-only walk-ins blocked. Possibly intentional but worth remembering when discussing storefront → CRM ingress paths.
- **`next_crm_lead_number` does not exist in the live DB** despite being referenced in M4 docs. The actual lead-numbering RPC may have a different name or the function was removed. Worth a memory because it'll come up in a future MODULE_MAP reconciliation.

---

*End of report.*
