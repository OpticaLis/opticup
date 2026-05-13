# FINDINGS — M4_LEAD_INTAKE_ASYNC_DISPATCH

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_LEAD_INTAKE_ASYNC_DISPATCH/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — Demo seed state blocks Criterion #8 measurement of the fresh-lead path

- **Code:** `M4-FIND-25`
- **Severity:** MEDIUM
- **Discovered during:** §3 Criterion #8 smoke test execution.
- **Location:** demo tenant DB state at `crm_leads` table (`tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'`), specifically rows `152e6188-2af6-413e-86b1-a44f15e71e66` (phone `+972537889878`, active) and `efc0bd54-c6ed-4430-9552-018935a7ebbc` (phone `+972503348349`, active).
- **Description:** SPEC §3 Criterion #8 asks the executor to curl-submit on demo with phone `0537889878` and measure response time < 3s + `crm_leads` row creation. The SPEC author implicitly assumed this would exercise the fresh-lead path — but the demo DB has an ACTIVE lead for that phone (`152e6188`, created 2026-05-11 18:34 UTC), so the EF takes the duplicate (409) branch which is INTENTIONALLY UNCHANGED by this SPEC. The other approved demo phone (`+972503348349`, per memory `feedback_test_data_phones.md`) also has an active lead. Net effect: the executor cannot measure the actual change on demo without either (a) authoring + executing a side-write to soft-delete one of the leads, (b) adding a third approved demo phone, or (c) deferring the measurement to Daniel's manual production test (Criterion #9). Option (a) violates SPEC §4 Autonomy Envelope (only Level 1 reads are authorized; soft-delete is Level 2). Option (b) violates memory `feedback_test_data_phones.md` (Daniel-only authorization for new burner numbers, to prevent real SMS to strangers). Option (c) is what was done.
- **Reproduction:**
  ```sql
  SELECT id, phone, is_deleted, status, created_at
  FROM crm_leads
  WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
    AND phone IN ('+972537889878', '+972503348349')
    AND is_deleted = false;
  ```
  Returns 2 rows (one per phone). Both must be soft-deleted (or a new approved phone provisioned) for Criterion #8's fresh-lead measurement to be runnable on demo.
- **Expected vs Actual:**
  - Expected (per SPEC author intent): curl → fresh-lead path → response in < 3s → new `crm_leads` row inserted within 1 second.
  - Actual: curl → duplicate path (existing lead returned, HTTP 409) → response in 7.7s → no new `crm_leads` row (existing row returned). The 7.7s is consistent with the original synchronous-dispatch timing AND with the fact that the duplicate path is intentionally unchanged by this SPEC.
- **Suggested next action:** **NEW_SPEC** (small, ~15 minutes). Add a tiny side-task SPEC (or include in the next M4 SPEC) that periodically soft-deletes test-leads on demo whose `full_name` contains `'TEST'`, `'SMOKE'`, `'M4'`, `'P5'`, `'PRE-MERGE QA'`, etc. — see the result of the SQL above for the naming pattern. This keeps demo's two approved phones "fresh" for future smoke tests. Alternatively, the executor SKILL.md Pre-Flight Check could grow a "verify demo seed state matches SPEC assumption" step — see EXECUTION_REPORT §9 Proposal 2.
- **Rationale for action:** The underlying issue is that the demo tenant has accumulated ~5+ test leads on each of the two approved phones (per the read at smoke time). This blocks any future SPEC that wants to measure a fresh-lead curl on demo. Cleanup is mechanical (UPDATE is_deleted=true WHERE name LIKE …) and a 1-row-per-cycle SPEC would prevent this from recurring.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — SPEC line-number references drift between authoring and execution

- **Code:** `M4-DEBT-26`
- **Severity:** LOW
- **Discovered during:** §1 SPEC validation + §3 Criterion #2 verification.
- **Location:** SPEC §3 Criterion #2 + §5 Stop-on-Deviation trigger #1 referencing `lead-intake/index.ts:301` — actual file has the line at 300.
- **Description:** SPEC pre-flight greps captured `await dispatchFreshLead(...)` at line 301; reality at execution time was line 300. The discrepancy is 1 line. Either (a) a whitespace edit landed between SPEC authoring and SPEC dispatch (no commits between `33c72af` at HEAD and the SPEC's authoring time — so unlikely), or (b) the SPEC author counted lines from a slightly different version of the file (e.g. open in editor with trailing newline / displayed-line counter). The semantic match is unambiguous (exactly 1 grep hit project-wide for `await dispatchFreshLead`), so the change applied cleanly without ambiguity. But the Stop-on-Deviation trigger #1's strict reading would have me halt — only the trigger's parenthetical rationale ("file structure differs from pre-flight") let me determine that the file structure is in fact identical. A more robust SPEC authoring convention would help.
- **Reproduction:** Static text comparison between SPEC.md §3 Criterion #2 and the actual file content.
- **Expected vs Actual:**
  - Expected: SPEC line number matches reality at execution time.
  - Actual: 1-line off.
- **Suggested next action:** **TECH_DEBT** — record in `opticup-strategic` SKILL or SPEC_TEMPLATE that line-number references in SPEC pre-flight checks should be paired with a content-only check (grep + match count), and Stop-on-Deviation triggers should be written against content match (not line number) when content-match is unambiguous. The opticup-executor SKILL already pretty much does this via the autonomy playbook's "Step output is ambiguous but SPEC has a tie-breaker | Apply tie-breaker, continue." row, but tightening SPEC authoring is the higher-leverage fix.
- **Rationale for action:** Tightening this on the authoring side prevents the executor from having to make a strict-vs-semantic judgment call mid-execution. Low severity because the judgment call took ~10 seconds and was correct.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — MCP deploy_edge_function path is transiently unreliable

- **Code:** `M4-OBS-03`
- **Severity:** INFO
- **Discovered during:** §3 Criterion #7 (EF deploy).
- **Location:** `mcp__claude_ai_Supabase__deploy_edge_function` tool, ran against project `tsxrrxzmdxaenlvocyit`, function `lead-intake`.
- **Description:** Two back-to-back invocations of the MCP deploy tool both returned `InternalServerErrorException: Function deploy failed due to an internal error`. The CLI fallback (`supabase functions deploy ...`) succeeded on the first attempt with the same files. This is observational — no fix on our side. Possibly a load-balanced backend issue at Supabase's MCP gateway, or a payload-size limit (the deploy body included the full content of 3 files inline as Base64-ish text, which may have exceeded a transient quota).
- **Reproduction:** Run `mcp__claude_ai_Supabase__deploy_edge_function` with project_id `tsxrrxzmdxaenlvocyit`, name `lead-intake`, the 3 files (index.ts, dispatch.ts, deno.json), verify_jwt=true. If the issue recurs, the immediate-success of the CLI fallback is the workaround.
- **Expected vs Actual:**
  - Expected: deploy succeeds via MCP tool.
  - Actual: deploy fails twice via MCP; succeeds via CLI.
- **Suggested next action:** **DISMISS** — no action needed unless the MCP path becomes the SPEC-authorized canonical (currently SPEC §4 names the CLI). If recurring, file a separate observation finding for the executor SKILL "Multi-tool fallback paths" sub-section (see EXECUTION_REPORT §9 Proposal 1).
- **Rationale for action:** External tool reliability; not in our control; the CLI fallback works. Logged for pattern visibility if it recurs in future SPECs.
- **Foreman override (filled by Foreman in review):** { }
