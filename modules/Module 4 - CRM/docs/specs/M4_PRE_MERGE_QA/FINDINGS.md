# FINDINGS — M4_PRE_MERGE_QA (executor-skill / SPEC-author notes)

> Distinct from `QA_REPORT.md`. This file captures process learnings about how the SPEC was authored and how the executor skill behaved — input for the Foreman to improve the next SPEC and skill files.

---

## F1 — SPEC pass-numbering inconsistency (LOW)

**Where:** SPEC.md §13 "QA Protocol — 10 Passes" — header says **10 passes**, but the body enumerates Pass 0 through Pass 13 (= 14 passes).

**Impact:** Executor expected 10 and had to recount. Minor. No execution loss.

**Fix:** SPEC author skill — reconcile pass count in section header with the actual enumerated body. Either rename the section "QA Protocol — Passes 0–13" or trim the body.

**Severity for SPEC-author skill:** LOW.

---

## F2 — MCP tool-prefix drift in SPEC (MEDIUM)

**Where:** SPEC.md §3 ("DO" sublist, lines 69–74) and §13 (pass instructions) reference:
- `mcp__supabase__execute_sql` — actual is `mcp__claude_ai_Supabase__execute_sql`
- `mcp__Claude_in_Chrome__*` — actual is `mcp__chrome-devtools__*`
- `mcp__make__*` — actual is `mcp__claude_ai_Make__*`

**Impact:** ~5 minutes lost confirming the correct prefixes via `ToolSearch`. Could have cost more if the executor lacked tool-discovery skills.

**Fix:** SPEC author skill — at SPEC-write time, query the available MCP tools (or the `<system-reminder>` listing them) and write the actual tool names into the SPEC. Don't rely on memorized prefixes from earlier SPECs.

**Severity for SPEC-author skill:** MEDIUM. Will repeat across all SPECs that prescribe specific MCP tools.

---

## F3 — Supabase advisor result size unbounded (MEDIUM)

**Where:** SPEC.md §13 Pass 4 step 1 — "List all M4-related views (similar query, change `pg_proc` → `pg_views`)." The natural follow-up is to use `mcp__claude_ai_Supabase__get_advisors` for SECURITY DEFINER classification, but that tool returned a 204,837-char payload that exceeded the tool-result token cap. Had to write to disk + parse with node.

**Impact:** ~3 minutes. Manageable but disrupts the Bounded Autonomy "fast-path" execution.

**Fix:** SPEC author skill — for any pass that calls `get_advisors`, pre-cap the expected output size in the SPEC (e.g. "use `mcp__claude_ai_Supabase__get_advisors` and pipe to disk via the auto-truncation handler; expect ~200kB for projects with >100 lints"). Or: prefer a targeted SQL query against `pg_class` with a `SECURITY DEFINER` filter if the advisor is too noisy.

**Severity for SPEC-author skill:** MEDIUM.

---

## F4 — Pass 7 ambiguity around test data creation (MEDIUM)

**Where:** SPEC §3 (Authority Envelope) says "If the QA can be performed without creating test data — prefer that path." SPEC §13 Pass 7 then prescribes 3 flows that all involve creating test leads/attendees and ends with cleanup queries.

**Impact:** Executor had to make a judgment call on Flow B (event registration). Chose §3 over §13. Logged as a documented partial-completion. Could be a source of inconsistent execution between executors.

**Fix:** SPEC author skill — when an audit SPEC has read-only preference AND a flow-test pass, explicitly mark each Flow as "[REQUIRED] / [PREFERRED] / [OPTIONAL — read-only inference acceptable]". Or: split Flow B into Flow B-RO (curl + DB count check) and Flow B-WRITE (full lifecycle with cleanup).

**Severity for SPEC-author skill:** MEDIUM.

---

## F5 — verify --full output triage missing from skill (HIGH for executor skill)

**Where:** Pass 10 ran `node scripts/verify.mjs --full` which returned **5950 violations + 152 warnings**. Without a triage rule, this output is overwhelming. The executor would either (a) spend 20+ minutes reading, or (b) skip the pass entirely — both bad.

**What worked:** Manual triage filter chain (dropped `.claude/worktrees/*` shadow files, file-size soft warnings, IIFE-local false positives) reduced 5950 → 3 real findings in <60 seconds.

**Impact:** Without this filter chain, executor productivity on Pass 10 = poor. With it = great.

**Fix:** Add a "verify --full triage helper" to `opticup-executor/SKILL.md` §"Verification After Changes" — see Proposal 2 in EXECUTION_REPORT.md for exact text. Bonus: ship a `scripts/verify-triage.mjs` that applies these filters automatically.

**Severity for executor skill:** HIGH. Will affect every future audit SPEC.

---

## F6 — DB Pre-Flight Check (Step 1.5) not skipped for read-only SPECs

**Where:** `opticup-executor/SKILL.md` §"SPEC Execution Protocol" Step 1.5 mandates reading GLOBAL_SCHEMA.sql, db-schema.sql, DB_TABLES_REFERENCE.md, GLOBAL_MAP.md before "any commit that touches the database". For a 100% read-only audit, none of these are required.

**Impact:** ~3 minutes of unnecessary startup reading. Adds context-window pressure for no value.

**Fix:** See Proposal 1 in EXECUTION_REPORT.md. Add a fast-path for `type=Audit/QA + scope=read-only`.

**Severity for executor skill:** MEDIUM.

---

## F7 — Test-data whitelist gap (would-be CRITICAL if executor had created data)

**Where:** SPEC §3 lists `0507168471` in the test-phone whitelist. But the actual EF code (`send-message`, `dispatch-queue`) only allow-lists `0537889878` and `0503348349`. If the executor had naively followed §13 Pass 7 Flow A and used `0507168471`, the SMS would have been **rejected** at the EF, the lead would have been **created** in DB without confirmation, AND the audit would have left a dangling test lead with no SMS audit trail.

**Impact in this run:** Avoided because the executor skipped data creation.

**Fix:** SPEC author skill — when prescribing test data, cross-check the whitelist against the actual enforcement layer (the EF source) before authoring the SPEC. Don't trust the SPEC's own §3 declaration as the enforcement source.

**Severity for SPEC-author skill:** HIGH (would-be CRITICAL in a different execution).

---

## F8 — Tab count drift between SPEC, SESSION_CONTEXT, and reality

**Where:** SPEC says "9 tabs" (in §5.1). SESSION_CONTEXT says "6 visible tabs + 1 hidden". Live UI has 10 tabs.

**Impact:** Executor recalibrated Pass 1 to "test all 10". Minor.

**Fix:** Sentinel mission: detect when SPEC counts contradict SESSION_CONTEXT counts. Alternatively, SPEC author skill: re-derive UI counts from current code at SPEC-write time, not from cached docs.

**Severity for SPEC-author skill:** LOW.

---

*End of FINDINGS.md. These are process learnings, not QA findings on the codebase. The Foreman should read both this file and `QA_REPORT.md` and decide which findings warrant SPEC-skill or executor-skill amendments.*
