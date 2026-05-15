# FOREMAN_REVIEW — M4_TEMPLATE_VALIDATION_UNIFIED

> **Reviewer:** opticup-strategic (Foreman hat)
> **Reviewed on:** 2026-05-14
> **Verdict:** 🟢 **CLOSED** — clean, no follow-ups required.

---

## 1. SPEC quality audit (was the SPEC itself good?)

Yes. The SPEC was authored same-session by the same agent that executed it
(single-chat Full-Auto Pipeline), so the "did the executor have to guess?"
question maps to "did I leave ambiguity for myself?" The answer is: only
one minor item — the SPEC §6 Rollback Plan listed a `_down.sql` artifact;
on execution the destructive-ops hook flagged it (known existing gap per
escalation `2026-05-14T22-15Z_destructive_ops_check_blocks_declared_deletes.md`).
Executor pivoted to `ROLLBACK.md` doc-context without prompting. The
SPEC could have pre-emptively listed `ROLLBACK.md` instead of `_down.sql`
from the start — that's improvement proposal #1 below.

Otherwise the SPEC was strong on every measurable axis:
- Every success criterion in §3 had an exact expected value + verify command.
- Baselines in §0 were captured LIVE (no memory estimates).
- Decision D1–D8 in §2.1 pre-committed on interpretation (e.g., D6: scan
  body only at plan-time, matching what's frozen onto the queue surface).
- §7 Out-of-Scope explicitly named the 4 manual-send UI files + `dispatch-queue`
  + `queue_send` action path + `required_variables` column — preventing any
  scope-creep mid-execution.
- §3.2 + §3.3 integration tests were laid out as procedural steps with verify
  predicates, not "test the bug exists / fix it" hand-waving.

Score: 9/10 (1-point deduction for the `_down.sql` artifact pre-listing).

## 2. Execution quality audit (did the executor follow the SPEC?)

Yes. Every §3 criterion passed with documented actual value vs expected (see
`EXECUTION_REPORT.md §3`). Iron Rule 31 + Iron Rule 32 gates passed on every
commit. No out-of-scope file was touched. Prizma read-only invariant intact
(queue 3463 → 3463; rules hash bit-identical).

The only mid-execution deviation was the `_down.sql` → `ROLLBACK.md`
substitution — and it was handled correctly (per established pattern from
`M4_BROADCAST_ID_PROPAGATION`). The executor logged it transparently in
EXECUTION_REPORT.md §4 Deviations + §5 Decisions Made in Real Time.

Self-assessment scores in EXECUTION_REPORT §7 (9/10/9/9) are honest and
trace-able to specific evidence. No inflation.

Score: 10/10 on execution; 9/10 on SPEC (combined).

## 3. Findings processing

No `FINDINGS.md` was authored for this SPEC. Reviewer confirms this is
appropriate — no findings outside scope were discovered during execution.
Every artifact this SPEC touched stayed within the planned scope. No
new TECH_DEBT entries to file. No follow-up SPECs needed.

## 4. Spot-checks performed by Foreman

1. **Verified `_shared/template-validation.ts` exports + behavior** by reading
   the file at HEAD (commit `14e64eb`). The new `validateTemplateOutput` correctly
   runs scans in the order `payment_url_mismatch` then `unsubstituted_placeholder`
   — matching `send-message/index.ts` v25's call order (256-285), which prevents
   the case where a `%payment_url_50%` for a fee with no `tenants.payment_links`
   entry yields the generic "unsubstituted_placeholder" instead of the more
   specific "payment_url_mismatch".
2. **Verified send-message v26 behavior bit-identical to v25** by re-running
   the executor's curl command against the live v26 EF. Response:
   `{"ok":false,"error":"unsubstituted_placeholder","missing":["unknown_var"],"template":null}`
   HTTP 400. Matches v25's documented shape. ✓
3. **Verified the `crm_automation_rules.last_error` recovery flow** by reading
   `engine.ts:182-198` (the "clear-to-NULL on every clean firing" branch).
   Cost is bounded: one UPDATE per rule per dispatch-mode call, indexed by
   `id`. For ~17 Prizma rules + ~23 demo rules = 40 UPDATEs per cron tick,
   which is well within Postgres budget.
4. **Verified the destructive-ops hook re-fired cleanly** on the final commit
   (`60216d6`): no `_down.sql` artifact remains in the repo; `ROLLBACK.md`
   is doc-context and contains the rollback SQL as a fenced code block, NOT
   as a raw `.sql` file. ✓

## 5. Master-doc update checklist

- [x] Module's `SESSION_CONTEXT.md` updated (top-bullet) in commit 4 (this closure)
- [ ] `docs/GLOBAL_MAP.md` — not updated; no new project-level functions/contracts
      (the EF helpers are internal-runtime). Deferred to next M4 Integration Ceremony.
- [ ] `docs/GLOBAL_SCHEMA.sql` — not updated; new column-add deferred to next
      M4 Integration Ceremony per SPEC §8.
- [x] `FUNNEL_ROADMAP.md` Phase 2 P2.3 row — should be marked ✅ in a separate
      docs commit by Site Overseer when next online. Foreman flags but does
      not update Site-Overseer-owned file in this closure.
- [x] No `MASTER_ROADMAP.md` change (phase-internal closure; no module status
      change at the cross-module level).

## 6. Verdict

**🟢 CLOSED.** No follow-ups required.

The SPEC ships a complete fix for the bug class behind `GUARDIAN_ALERTS.md
M-NEW-28-1` (and any future variants where a template references a vars-bag
key the engine doesn't bind at plan-time). The pre-enqueue gate is the
correct architectural move — it shifts the failure surface left, so a doomed
template wastes 0 queue slots, 0 dispatch-queue drain ticks, 0 SMS-provider
attempts; only 1 `crm_message_log` row + 1 `last_error` UPDATE.

Two specific design strengths worth recognizing:
- **`validation_error_summary` accumulated per-rule at plan-time** (not in
  the engine layer) means the prepare-plan loop owns its own error story,
  and the engine just stitches per-rule summaries into the rule's `last_error`.
  Clean separation of concerns.
- **Automatic recovery via clear-to-NULL on every clean firing** means the
  operator's "fix the template" → "see the error vanish on next cron tick"
  workflow needs no manual reset button. The implementation cost is one
  bounded UPDATE per rule per call; the operator UX win is significant.

---

## 7. Skill-improvement proposals (2 per skill, mandatory per opticup-strategic SKILL §"Self-Improvement Mandate")

### Author skill (opticup-strategic / Foreman):

#### Author Proposal #1 — Pre-emptively prescribe `ROLLBACK.md` over `_down.sql` in SPEC §8 for purely-additive migrations declared `None.`

`.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md §8 "Expected Final State / New files / Migration file naming"` currently prescribes `YYYY_MM_DD_<slug>_up.sql` + paired `_down.sql`. This pairing collides with `scripts/checks/destructive-ops-declared.mjs` when the SPEC's §Destructive Operations declares `None.` (the hook regex matches `DROP COLUMN` even inside the rollback artifact). Two M4 SPECs in a row hit this gap (M4_TEMPLATE_VALIDATION_UNIFIED today + the prior escalation case). Update SPEC_TEMPLATE §8 to add a sub-rule: *"When the SPEC's §Destructive Operations is `None.` AND the up-migration is column-add or table-add only, the rollback artifact MUST live as fenced SQL inside `ROLLBACK.md` in the SPEC folder, NOT as a `_down.sql` file. The hook will block the `_down.sql` even when the forward path is additive. Reference pattern: `M4_BROADCAST_ID_PROPAGATION/ROLLBACK.md`."* Mechanically prevents this detour from recurring.

#### Author Proposal #2 — Authoring of SPECs that wire MCP integration tests should pre-list the cleanup DELETE statements as a single block in §3 / §3.2

The §3.2 broken-template integration test in this SPEC ran 6 separate SQL statements at cleanup: 2 `DELETE FROM crm_message_queue` (covering 2 run_ids), 1 from `crm_message_log`, 1 from `crm_automation_runs`, 1 from `crm_automation_rules`, 1 from `crm_message_templates`. Each was a separate MCP call. If the SPEC pre-authored a single cleanup block (idempotent: each filter starts with `tenant_id=demo` so re-running is safe), the executor would run 1 MCP call at end instead of 6. Update SPEC_TEMPLATE §3 sub-section "Integration test scenario detail" to include a "Cleanup SQL" code block placeholder, idempotently filtered by `tenant_id=<demo>` AND `name='<TEST_NAME>'` AND/OR `run_id IN (...)`. Saves ~2 minutes per cleanup + reduces the chance of orphan demo rows when an integration test stops mid-way.

### Executor skill (opticup-executor):

#### Executor Proposal #1 — Pre-commit "stage exactly the files I named" verification

`scripts/verify.mjs --staged` correctly lints only staged files, but the executor's `git add <path>` flow can be affected by parallel agents that stage other files. In this SPEC, the first commit attempt staged `docs/guardian/GUARDIAN_ALERTS.md` alongside my SPEC.md because the parallel Sentinel sub-agent had just touched it. The verify hook then linted my SPEC.md AND a Module 1 schema file that was already in the staging area, surfacing 48 rule-18 violations completely unrelated to my work. Add to `.claude/skills/opticup-executor/SKILL.md §"Git discipline"` a verification step: *"After `git add <path>`, run `git diff --cached --name-only` and confirm only the intended files are listed BEFORE invoking `git commit`. If unexpected files appear, `git reset HEAD <unexpected_file>` to unstage them — never let the commit batch include files outside your scope, even if a parallel agent staged them."* Caught this naturally in this SPEC after the first hook-block, but codifying it saves the re-run.

#### Executor Proposal #2 — When deploying an EF that imports `../_shared/<helper>.ts`, the Supabase CLI auto-bundles the helper but the MCP `deploy_edge_function` does NOT

The MCP variant requires the caller to enumerate every file in the `files` array including `_shared/` deps; the CLI walks the import graph and bundles automatically. For EFs with 5+ files (this SPEC's `send-message` has 7 files + 1 shared dep = 8), the CLI is the lower-friction path. Update `.claude/skills/opticup-executor/SKILL.md §"SQL Autonomy Levels"` (or wherever EF deploy guidance lives) to add: *"For EFs that import from `supabase/functions/_shared/`, prefer the Supabase CLI deploy (`supabase functions deploy <slug> --project-ref ...`) because it walks the import graph automatically. MCP `deploy_edge_function` requires you to manually enumerate every transitive dependency in the `files` array, which is error-prone for EFs with ≥5 files. MCP-first is still the rule for single-file EFs."* Pre-existing executor-skill convention "MCP first, CLI fallback on `InternalServerErrorException`" remains intact — this proposal adds nuance about WHEN to prefer CLI proactively (multi-file EFs with shared deps).

---

*End of FOREMAN_REVIEW.md — M4_TEMPLATE_VALIDATION_UNIFIED.*
