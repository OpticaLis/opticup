# Supabase Security Vulnerabilities — Read-Only Audit

**Brief version:** v1
**Date:** 2026-05-13
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Full Auto Pipeline (single chat, READ-ONLY, ~1 hour)
**Model preference:** Sonnet (audit work, no code changes — Opus is overkill)
**Owning module:** Cross-module (touches whichever modules own the flagged tables)
**Mode:** READ-ONLY. No file changes. No DB writes. No DDL. No commits. Final deliverable is ONE markdown report.

---

## 1. Purpose

Daniel received a Supabase Security Advisor alert on 2026-05-13 flagging at least one CRITICAL issue: `Table publicly accessible — Row-Level Security is not enabled` with the advisor code `rls_disabled_in_public` on project `prizma-optic` / `tsxrrxzmdxaenlvocyit`.

Optic Up's Iron Rule 15 is: **every table has RLS enabled with the canonical JWT-claim pattern**. An `rls_disabled_in_public` finding is a direct Iron Rule violation. This audit answers three questions:

1. **WHICH tables are flagged?** Get the full list from Supabase Security Advisor.
2. **For each flagged table — is it actually exploitable in production?** Or is it a false positive (e.g., service-role-only access path)?
3. **What's the canonical fix per table?** Either enable RLS with the canonical pattern (Iron Rule 15) OR document why this table is intentionally without RLS (rare, requires Daniel approval).

The deliverable is a single report ranking findings by real-world severity (live customer-data exposure vs. theoretical-edge-case) and proposing a fix per finding. NO SPECs are authored from this Brief. SPECs come later, per Architect+Daniel decision.

---

## 2. Constraints

- **READ-ONLY throughout.** Only `SELECT` SQL. NO `INSERT`/`UPDATE`/`DELETE`/`DDL`. NO `ALTER POLICY`. NO `CREATE POLICY`. If the audit determines a fix needs to land, the report says so; the report is NOT the fix.
- **NO file modifications.** No commits, no docs updates. Final deliverable is one markdown report file at the path in §5.
- **PARALLEL SAFETY.** Three sessions are running on M4 concurrently — BROADCAST_EVENT_LINK_SUPPORT (already closed, just merged), the Deep Audit (closed), and the Overnight Harvest (just started). All three operate on the demo + Prizma tenants for various read operations and SOME writes (on demo only). The Security Audit MUST coordinate by:
  - Reading state at startup — what SPECs are in flight, what files are open.
  - Using Supabase MCP for the security-advisor query and any table inspection — read-only.
  - Writing ONLY to its own report file path; never touching files owned by the other sessions.
  - If a tracked-table investigation requires reading a SQL function body or RLS policy definition, that's `SELECT` from `pg_catalog` — safe regardless of what other sessions are doing.
- **Sonnet model preference.** This is structured audit work — Sonnet is fully capable. No need for Opus.

---

## 3. Investigation Scope

### 3.1 Get the full Security Advisor finding list

Use Supabase MCP's `get_advisors` (or equivalent) call to retrieve ALL security findings, not just the one in Daniel's email screenshot. The email shows one CRITICAL example; there may be more findings of varying severity that the email truncated. The audit covers ALL of them.

### 3.2 Per-finding investigation

For each finding, gather:

| Item | What to capture |
|---|---|
| Advisor code | e.g., `rls_disabled_in_public`, `policy_exists_rls_disabled`, etc. |
| Severity (Supabase's label) | CRITICAL / HIGH / MEDIUM / LOW |
| Table or object affected | schema.table name |
| Owning module | Which Optic Up module owns this table (cross-reference MODULE_MAP for each module) |
| Current RLS state | `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname=?` |
| Current policies (if any) | `SELECT polname, polcmd, polqual FROM pg_policy WHERE polrelid=...` |
| Row count | `SELECT count(*) FROM <table>` — how much data is exposed? |
| Tenant_id column? | Does the table have a `tenant_id` column to filter by? If not, this is a deeper problem. |
| Who reads/writes this table? | grep modules/*/ for `from('<table>')` and `T.<TABLE>` |
| Exploit scenario | Concrete: "an anon user could read all rows by calling X" OR "no anon path; service-role-only" |

### 3.3 Real-world impact classification

For each finding, classify in one of three buckets:

- **LIVE CUSTOMER HARM** — anon role can read/write actual customer data through the public API. This is the worst case.
- **STAFF-DATA HARM** — authenticated role can cross-tenant. Less severe but still a Rule 15 breach.
- **THEORETICAL** — no realistic exploit path exists. The table is reachable only through service-role contexts where RLS doesn't apply. Should still be fixed for defense-in-depth, but doesn't block anything.

**This classification is critical.** The audit pattern Daniel approved on 2026-05-08 (memory `feedback_audit_real_world_check.md`) says ~25% of theoretical findings should be closed as no-action. Do not inflate severity for impact.

### 3.4 Canonical fix per finding

For each LIVE-CUSTOMER-HARM or STAFF-DATA-HARM finding, propose the canonical fix. By Iron Rule 15, the fix is almost always:

```sql
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON public.<table>
  FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid);

CREATE POLICY service_bypass ON public.<table>
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
```

If the table lacks `tenant_id`, the fix is different — either add `tenant_id` (DDL, requires Daniel) or restrict to service-role only. Flag for human decision.

For THEORETICAL findings, propose either: (a) enable RLS anyway for defense-in-depth, or (b) document the intent (e.g., reference table that's truly public-read) and accept the finding.

---

## 4. Coordination with Iron Rule 15 known-good baseline

Per Audit Report finding (Module 4 Deep Audit, just-completed): **28/28 CRM tables run the canonical pattern (tenant_isolation + service_bypass).** This is the gold standard. The Security Audit's findings should compare against this baseline:

- Tables that match the canonical pattern → no action.
- Tables that have `enable rls=true` but a non-canonical policy → still a finding (subtler than disabled-RLS but still risky).
- Tables with `enable rls=false` → CRITICAL by definition.

---

## 5. Deliverable — Single Markdown Report

Write ONE file at:

`docs/guardian/SECURITY_ADVISOR_AUDIT_2026_05_13.md`

(Not under `modules/Module 4 - CRM/` because this audit is cross-module. `docs/guardian/` is the project-wide audit home per CLAUDE.md.)

Structure:

```
# Supabase Security Advisor Audit — 2026-05-13

## 1. Executive Summary (≤200 words)
   - Total findings: N
   - LIVE-CUSTOMER-HARM count: X
   - STAFF-DATA-HARM count: Y
   - THEORETICAL count: Z
   - Top 3 urgent fixes (one-line each)

## 2. Methodology
   - How the findings were retrieved (Supabase MCP advisor call)
   - What was checked per finding
   - Classification rubric

## 3. Findings — sorted by classification

For each finding:
### Finding {N} — <Advisor code> on `<table>` — <CLASSIFICATION>
- **Module owner:** Module X
- **Current state:** <RLS state + policies>
- **Row count:** N
- **Tenant_id present:** Yes/No
- **Exploit scenario:** <concrete, one paragraph>
- **Proposed fix:** <SQL or "accept" with reasoning>
- **Effort:** S (~5 min) / M (~30 min) / L (~2 hours) — how big is the actual fix SPEC?

## 4. Prioritized Fix Queue
   - The 3-5 findings that should be fixed FIRST, with one-line reasoning each.
   - Whether they can be bundled into ONE SPEC or need separate SPECs.

## 5. Open questions for Daniel
   - Any finding where the audit can't decide between "enable RLS" and "intentional public table".
   - Any DDL gap (table missing tenant_id) that Daniel must decide on.
```

---

## 6. Pipeline Selection

This is `opticup-sentinel` territory (read-only, audit-oriented) with possible `opticup-reviewer` cross-check for the canonical-pattern verification. Web research not needed — this is purely DB inspection. Use Supabase MCP's `get_advisors` + `execute_sql` for SELECT queries.

**NO `opticup-executor` involvement.** This is not a code-change task.

---

## 7. Constraints on Pipeline Behavior

- **READ-ONLY enforced.** If a query would mutate state, the report says "fix proposed but not executed" — the Pipeline does NOT run it.
- **No SPEC authoring from this Brief.** SPECs come later. The report is the artifact.
- **Time budget:** ~1 hour. If overrunning, ship the report with whatever findings are processed.
- **No Hebrew in chat.** English status updates and final summary (Daniel's terminal renders Hebrew reversed; memory `feedback_english_only_responses.md` confirms).
- **One concise English final summary** at the end pointing Daniel to the report file path + top 3 takeaways.

---

*End of Brief. Activation prompt at `SUPABASE_SECURITY_VULNERABILITIES_AUDIT_ACTIVATION_PROMPT.md`.*
