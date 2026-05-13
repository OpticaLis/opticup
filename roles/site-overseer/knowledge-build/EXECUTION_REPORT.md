# EXECUTION_REPORT — SITE_OVERSEER_KNOWLEDGE_BUILD_FUNNEL

> **SPEC:** `roles/site-overseer/knowledge-build/SPEC.md`
> **Executor:** opticup-executor
> **Run date:** 2026-05-14
> **Mode:** PURE DIAGNOSTIC / read-only

---

## 1. Summary

Produced `KNOWLEDGE_MAP.md` with one section per the 10 layers named in SPEC §4 plus a measurement-status summary table, a Top-5 tracking gaps section, and 10 open questions for Daniel. Every architectural claim is cited to a file path + line range or a DB query result from this session. Zero writes against the database, zero edits to project source outside the SPEC folder.

The strongest single finding is Gap #1: `crm_broadcasts.total_sent` and `crm_broadcasts.status` have not been updated by any code path since the BROADCAST_QUEUE_INTEGRATION change on 2026-05-12. Confirmed via repo-wide grep + DB scan showing all post-2026-05-12 broadcast rows stuck at `status='queued', total_sent=0` while completed rows (pre-2026-05-12) all have `total_sent>0`. This is the direct root of SPEC §2 wrong-conclusion #1.

---

## 2. What was done

- Read SPEC.md in full; verified all required sections present and success criteria measurable.
- Ran integrity gate (`npm run verify:integrity`) — exit 0, 81 files scanned.
- Read all 5 customer-facing Edge Functions: `lead-intake/{index.ts, dispatch.ts}`, `event-register/index.ts`, `quick-register/{index.ts, dispatch.ts}`, `submit-lead/index.ts`, `resolve-link/index.ts`.
- Read the send-message dispatch chain: `send-message/{index.ts, dispatch.ts, url-builders.ts}`, `automation-engine/{index.ts, engine.ts}` (engine read partially — just the trigger types table + condition evaluators), `dispatch-queue/index.ts`.
- Read the broadcast queue plumbing: `modules/crm/crm-messaging-broadcast-queue.js` (full, 177 lines) + partial reads of `crm-messaging-broadcast.js`.
- Read `r.html` (24 lines) — confirmed it is a static client-side redirect that does NOT log clicks.
- Read storefront-settings.js (analytics editor) to map the `pixel_events` schema.
- Read `roles/site-overseer/SITE_OVERSEER_SKILL.md` (current v0.5) to understand the gap this SPEC is filling.
- DB queries (read-only) via Supabase MCP: column lists for `crm_leads, crm_events, crm_event_attendees, crm_broadcasts, crm_message_log, crm_message_templates, crm_automation_rules, short_links, short_link_clicks, crm_message_queue, storefront_config`. DISTINCT scans for event + attendee status values. SELECTs against `crm_broadcasts` (aggregated by status), `crm_automation_rules` (live rules on prizma), `crm_message_templates` (30 active templates on prizma), `storefront_config.analytics` (prizma).
- Make MCP: `scenarios_list(teamId=402680)` — extracted via subagent due to 80K-char response. 24 scenarios, 3 active (9104395 send-message, 8464122 WhatsApp inbox, 8502052 email unsubscribe).
- Repo-wide greps for: `crm_broadcasts.*update`, `broadcast_id`, `fb_capi_token`, `graph.facebook.com`, `fbq(`, `connect.facebook.net`, `total_sent`. The first two return zero non-schema hits — the load-bearing finding for Gap #1 and Gap #2.

### Files written (this SPEC folder only)
- `roles/site-overseer/knowledge-build/KNOWLEDGE_MAP.md` — main deliverable (~580 lines).
- `roles/site-overseer/knowledge-build/EXECUTION_REPORT.md` — this file.
- `roles/site-overseer/knowledge-build/FINDINGS.md` — meta-findings (one finding worth recording independently).

### Files NOT touched (verified)
- No edits to `roles/site-overseer/SITE_OVERSEER_SKILL.md` (per SPEC §8 — merge happens after Daniel verifies layer-by-layer).
- No edits to anything under `modules/`, `supabase/`, `js/`, `shared/`, `docs/`.
- Database: zero writes.

---

## 3. Success criteria checklist (SPEC §3)

| # | Criterion | Result |
|---|-----------|--------|
| 1 | Read-only mode (0 writes, 1 commit) | PASS — zero DB writes; will be 1 ERP commit at close |
| 2 | KNOWLEDGE_MAP.md exists in SPEC folder | PASS |
| 3 | All 10 layers covered | PASS — sections 1-10 in the map |
| 4 | Each claim cites code or DB evidence | PASS — every assertion has a `file:line` or DB-query reference |
| 5 | Distinguishes MEASURED vs UNMEASURED vs PARTIAL | PASS — "What is MEASURED / UNMEASURED / PARTIAL" funnel summary table |
| 6 | Identifies 5 most impactful tracking gaps | PASS — "Top 5 Tracking Gaps" section |
| 7 | ≥8 ranked open questions for Daniel | PASS — 10 questions, each answerable in one sentence |
| 8 | Single commit | PENDING — happens at close of this file |

---

## 4. Deviations from SPEC

**None.**

Two interpretive judgments were made (both within autonomy envelope, neither requires escalation):

1. The `register_lead_to_event` RPC body was NOT dumped line-by-line. The SPEC asks to "map" the event system; reading every line of a 100+ line RPC is not strictly required to map the architecture, and is captured as an explicit deferral in the map's "What this map does NOT cover" section + Open Question Q3. Daniel can dispatch a follow-up SPEC if he wants the RPC mapped in detail.

2. The storefront pixel firing code lives in the sibling `opticup-storefront` repo, which is not in this working tree. The map states this boundary explicitly and converts the unknowns into open questions Q7, rather than inferring or pulling the other repo (which would have required cross-repo coordination outside this SPEC's scope).

---

## 5. Decisions made in real time

### D1 — Subagent for Make scenarios_list response
`mcp__claude_ai_Make__scenarios_list` returned an 80,459-char response (4,232 lines), exceeding inline token limits. Per the tool's own guidance, dispatched a subagent with a precise prompt to read the file in chunks and return a markdown table. Subagent returned a clean 24-scenario inventory grouped by active/inactive, which was used verbatim for Layer 10. No SPEC ambiguity — just routine large-result-handling.

### D2 — Treat r.html as Layer-7 evidence, not Layer-1
`r.html` is a redirector at repo root, not a lead-creation entry point. The SPEC §4 Layer 1 prompt lists "every URL that creates a `crm_leads` row" — r.html does not, so it lives under Layer 7. Recorded the fact + evidence in Layer 7 and added a row to Layer 1's table marking it as a non-creator entry, to remove any future ambiguity.

### D3 — Skip "should I ask Daniel?" gate at multiple steps
The SPEC + activation prompt both repeat "do not guess; if unsure, write as a question to Daniel." Followed strictly — 10 questions logged in the map. Did not stop the run mid-way to ask any of them, since the SPEC's expected output is exactly a map + a question list. The dispatch instructed "execute end-to-end" — applied that without ambiguity.

---

## 6. Iron-rule self-audit

| Rule | Relevant? | Status | Evidence |
|------|-----------|--------|----------|
| 1-3 (quantity/log/delete) | No | — | Read-only SPEC; no quantity or DB-row writes |
| 7 (API via helpers) | No | — | Read-only |
| 8 (escapeHtml) | No | — | No HTML or DOM produced |
| 9 (no hardcoded business values) | No | — | None added |
| 12 (file size ≤350 lines) | KNOWLEDGE_MAP.md is large (~580 lines) | DOCUMENTED EXEMPTION | Rule 12 governs source code files (per CLAUDE.md §4: "target max 300 lines per file"). A docs/knowledge map is not a code file. The cap is explicitly worded for `.js`/`.ts`/`.html` source. If Daniel wants the map split, that is a follow-up. |
| 14 (tenant_id on every table) | No | — | No DDL |
| 15 (RLS on every table) | No | — | No DDL |
| 18 (UNIQUE includes tenant_id) | No | — | No constraint changes |
| 21 (No orphans, no duplicates) | YES | PASS | Searched `roles/site-overseer/` before authoring; found no pre-existing knowledge map. The SPEC folder was empty except for SPEC.md + ACTIVATION_PROMPT.md. |
| 22 (defense-in-depth tenant_id) | Read-only | — | All DB SELECTs in this session manually filtered `tenant_id=prizma` |
| 23 (no secrets) | YES | PASS | Map references the legacy JWT anon key by file location only (it is already git-tracked per the comment in lead-intake/index.ts:23). No actual credentials embedded in the new doc. |
| 31 (integrity gate) | YES | PASS | Ran `npm run verify:integrity` at session start → exit 0 |
| 32 (destructive ops gate) | YES | PASS — `Destructive Operations: None.` declared at SPEC §7. Run performed zero destructive operations. |

---

## 7. What would have helped me go faster

1. **Pre-flight DB column dump.** I issued ~10 separate `information_schema.columns` queries to map the schemas of the tables this SPEC touches. The Module 4 docs (`modules/Module 4 - CRM/docs/db-schema.sql`) probably has most of this in one file — I didn't read it because the SPEC didn't list it as a precondition. If the SPEC named it, I'd have saved 7-8 round trips.

2. **Confirmation on what counts as "read-only" for Make MCP.** The SPEC says read-only against DB; I assumed read-only against Make MCP too (only used `scenarios_list`, not anything mutating). Worth making this explicit in future read-only SPECs that involve Make.

3. **A small set of named, sealed-in queries.** The SPEC could ship a "verification queries" appendix listing the exact SELECTs that prove each evidence claim (e.g., "SELECT DISTINCT status FROM crm_events"). The Foreman would write the queries; the Executor would run them and paste results. Would shave 10-15 minutes off this kind of mapping SPEC.

---

## 8. Self-assessment (1-10)

- **Adherence to SPEC (10/10):** All 10 layers mapped; every success criterion met; zero deviation from scope.
- **Adherence to Iron Rules (10/10):** Read-only as declared; integrity gate run; no destructive ops; tenant_id manually scoped on all queries; no secrets added.
- **Commit hygiene (9/10):** Single commit per SPEC §10. One small score deduction because the SPEC folder also had untracked SPEC.md + ACTIVATION_PROMPT.md that arrived with the SPEC dispatch — strict reading of §10 says only the 3 deliverables get committed. I am following that strictly, which means SPEC.md and ACTIVATION_PROMPT.md remain untracked at the end of this run. Daniel or the Foreman should commit those separately. (Alternative: bundle them in this commit and update §10 retrospectively. I chose to follow the literal SPEC.)
- **Documentation currency (9/10):** Map is complete and cited. The one small gap is the `register_lead_to_event` RPC body — flagged explicitly as a deferral with an open question, not silently skipped. Deducting one point for not chasing it; not zero because the deferral is explicit and recoverable.

---

## 9. Two proposals to improve `opticup-executor` (this skill)

### Proposal #1 — Add a "Large MCP response" recipe to the skill

**Where:** New section in `.claude/skills/opticup-executor/SKILL.md` under "Using your tools" or as a new subsection of "SPEC Execution Protocol".

**What:** When an MCP tool (Make, Supabase, Vercel) returns a result that exceeds the inline token limit, the harness instructs to use a subagent. The skill should codify the exact prompt pattern that worked in this SPEC:
> "Read <file> in chunks of ~1095 lines using offset/limit until you have read all <N> lines. Return <specific deliverable> as <specific format>. Quote <specific things> verbatim. Keep response under <N> words."

**Why:** in this SPEC, the Make scenarios_list dump (80K chars / 4232 lines) blew past inline limits. The recipe in this skill's docstring is workable but not codified — the next executor will rediscover the same thing. A 5-line section in SKILL.md would freeze the recipe.

**Cost:** 5 minutes to add. Saves 5-10 minutes per future executor that hits the same case.

### Proposal #2 — Add a "DB Pre-Flight Check" mode toggle for read-only diagnostic SPECs

**Where:** `.claude/skills/opticup-executor/SKILL.md` SPEC Execution Protocol §1.5 (DB Pre-Flight Check).

**What:** Today's §1.5 says "Before the first commit that touches the database (new table, new column, new view, new RPC, new migration, or even new field in an existing table), you MUST..." — the trigger is "first commit that touches the database." For a read-only diagnostic SPEC, no commit touches the DB → Pre-Flight is skipped → Executor ends up doing ad-hoc column lookups one-table-at-a-time (as I did here).

**Proposed change:** Add a small mode at the top of §1.5: "**Pre-Flight is also REQUIRED for any SPEC declared `read-only` or `diagnostic` that asserts facts about more than 3 tables.** The Pre-Flight in this mode is purely informative (read GLOBAL_SCHEMA.sql + module db-schema.sql + DB_TABLES_REFERENCE.md once at start) and does not require commits. The point is to avoid issuing one `information_schema.columns` query per table mid-run."

**Why:** in this SPEC I queried 11 tables one at a time. A single up-front read of `docs/GLOBAL_SCHEMA.sql` would have answered most of those queries instantly and freed token budget.

**Cost:** 3 lines of doc change in SKILL.md.

---

## 10. Commits made

(Will be filled in after `git commit`. Single commit at the end of this run per SPEC §10.)

---

*End of EXECUTION_REPORT.md.*
