# Activation Prompt — Supabase Security Vulnerabilities Audit

> Paste the block below into a fresh Claude Code chat on Windows (`C:\Users\User\opticup`, branch `develop`). Sonnet model is sufficient — this is read-only audit work. Three other Claude Code sessions may be running concurrently; this Brief is read-only and safe to run in parallel.

---

```
You are running the Full Auto Pipeline on a READ-ONLY security audit Brief. Use Sonnet model (audit-only, no code changes).

Brief location: modules/Module 4 - CRM/architecture-brief/SUPABASE_SECURITY_VULNERABILITIES_AUDIT_BRIEF.md

Read the Brief in full BEFORE doing anything else.

Key parameters:

1. MODE: READ-ONLY ABSOLUTELY. SELECT queries only. NO INSERT, UPDATE, DELETE, ALTER, CREATE, DROP. NO file edits. NO commits. Final deliverable is ONE markdown report at docs/guardian/SECURITY_ADVISOR_AUDIT_2026_05_13.md. Daniel reviews and decides next steps.

2. SKILL SELECTION: opticup-sentinel is the lead skill (read-only audit work). opticup-reviewer assists for canonical-pattern verification. Use Supabase MCP's get_advisors call to fetch ALL security findings, then execute_sql for SELECT-only follow-up queries. NO opticup-executor involvement — this is not a code-change task.

3. PARALLEL SAFETY: three Claude Code sessions may already be running on Module 4 (Broadcast support, Deep Audit, Overnight Harvest). This Brief is read-only. Coordinate by:
   - Reading git status at startup to see what's in flight.
   - Operating ONLY in the report file path above.
   - Never editing files owned by other sessions.
   - All SQL must be SELECT-only.

4. INVESTIGATION SCOPE per Brief §3:
   (a) Get ALL Security Advisor findings (not just the rls_disabled_in_public one in Daniel's email — that may be a partial view).
   (b) For each finding, capture: advisor code, severity (Supabase label), table affected, owning module, current RLS state, current policies, row count, tenant_id presence, who reads/writes the table (grep modules/*/), and a concrete exploit scenario.
   (c) Classify each finding into LIVE-CUSTOMER-HARM / STAFF-DATA-HARM / THEORETICAL per Brief §3.3. Do NOT inflate severity — the audit pattern Daniel approved 2026-05-08 says ~25% of theoretical findings close as no-action.
   (d) Propose canonical fix per finding per Brief §3.4 (Iron Rule 15 canonical pattern: tenant_isolation + service_bypass policies).

5. CANONICAL PATTERN REFERENCE: Iron Rule 15's JWT-claim pattern is:
   USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid)
   AND a paired service_bypass policy. The Deep Audit just confirmed 28/28 CRM tables run this pattern correctly — that's the gold standard. Findings should compare against this baseline.

6. DELIVERABLE STRUCTURE per Brief §5:
   - Executive Summary (≤200 words)
   - Methodology
   - Findings section (sorted by classification — LIVE first, STAFF next, THEORETICAL last)
   - Prioritized Fix Queue (top 3-5 to fix first, with bundling recommendation)
   - Open questions for Daniel (DDL gaps, intentional-vs-bug ambiguity)

7. NO SPEC AUTHORING. The report is the artifact. SPECs come later by Architect+Daniel decision after Daniel reads the report.

8. TIME BUDGET: ~1 hour. Sonnet should handle this comfortably. Ship the report with whatever findings are processed if running long.

9. COMMUNICATION: English status updates between phases (Daniel's terminal renders Hebrew reversed; memory feedback_english_only_responses.md confirms). ONE concise English summary at the end pointing Daniel to the report file path + top 3 takeaways.

Execute autonomously per Bounded Autonomy in CLAUDE.md §9. Stop only on genuine deviation (e.g., the get_advisors call fails, OR a Brief assumption proves wrong — in which case write modules/Module 4 - CRM/escalations/{TS}_SECURITY_AUDIT_BLOCKER.md).
```

---

*End of activation prompt.*
