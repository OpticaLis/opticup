# FOREMAN_REVIEW — M4_PUBLIC_FORM_VARIABLES_HIGH

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_PUBLIC_FORM_VARIABLES_HIGH/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman hat)
> **Written on:** 2026-05-06
> **Reviewed:** SPEC.md (2026-05-06) + EXECUTION_REPORT.md (2026-05-06) + FINDINGS.md (3 findings)
> **Commit range:** `52263fc..b35b6f6` (1 fix + 1 retrospective)

---

## 1. SPEC Quality Audit (was the SPEC itself good?)

**Verdict: 🟡 GOOD WITH 2 FIXABLE FLAWS.**

### What the SPEC got right
- Single-file scope (`event-register/index.ts`) with 2 surgical edits — minimal blast radius for a production hotfix.
- Root cause documented at code level (lines 251 and 326-329) before authoring §3 — Step-0 reproduce-the-bug-first satisfied.
- Whitelist enforcement hard-gated in §3 #8/#9 + §4 stop triggers + §6 cleanup — no risk of leaking to non-whitelist contacts.
- §5 stop-trigger for MCP-deploy 5xx ×2 — prevented executor from looping, exactly as Phase 1 OPEN-021 predicted. The pre-acknowledged failure path saved time.
- §11 explicit Cross-Reference Check — "ZERO new code names" — verified at author time.

### What the SPEC got wrong (executor-flagged)

**Flaw 1 — Schema-impossible test precondition (§10 + §12 Test 2).**
The SPEC asked for "an event with `end_time IS NULL`" to exercise the HH:MM-only branch in `event-variables.ts:90`. The actual schema is `end_time TIMESTAMP NOT NULL DEFAULT '14:00:00'`. No such row can exist via normal writes. Cost: ~3 minutes of executor time hunting for a non-existent event.
**This was a Step-1.5 cross-reference omission.** I checked DB-object names but not column-nullability constraints. A `\d crm_events` would have caught it in 10 seconds.

**Flaw 2 — Phantom column references in §3 #8.**
Verification criterion said `SELECT recipient_phone, recipient_email FROM crm_message_log` — neither column exists. The actual schema stores recipient info implicitly via `lead_id` join + rendered `content`. Cost: ~1 minute. Same root cause as Flaw 1: I cited columns from memory, not from a `\d`.

### What the SPEC got missing

- **Exact CLI deploy command** in §10 Dependencies. SPEC §5 told the executor to escalate on MCP-deploy 5xx; when that happened the executor had to look up the command from CHANGELOG context. Should have been spelled out: `supabase functions deploy event-register --no-verify-jwt --project-ref tsxrrxzmdxaenlvocyit`. This is now a 2-occurrence pattern (ATOMIC_CONFIRMATION_FLOW + this SPEC).

### Severity rollup
- 0 issues that broke execution
- 2 issues that cost ~4 minutes total
- All 2 flaws actionable into skill improvements (see §5 below)

---

## 2. Execution Quality Audit (did the executor follow the SPEC?)

**Verdict: 🟢 EXCELLENT — 9.3/10 self-assessed; matches my independent assessment.**

### Adherence
- Both edits applied verbatim (Edit A: `end_time` added to SELECT; Edit B: 4 keys removed from variables object). Verified via `git show 11d96cd`.
- Iron Rule 12 (file size): 347 → 343 lines, under 350 hard cap. ✓
- Iron Rule 31 (integrity gate): ran 3× during session (start, post-edit, pre-commit). All PASS.
- Iron Rule 21 (no orphans/duplicates): correctly handled (Edit B removes keys, doesn't add).
- Whitelist enforcement: 0 prizma writes; all messages routed to `0537889878` + `daniel@prizma-optic.co.il`. ✓
- Stop-trigger discipline: stopped on second MCP failure exactly as §5 prescribed. ✓ Did not retry, did not improvise.

### Deviations (3 documented in §3 of EXECUTION_REPORT)

1. **Test 2 skipped (schema-impossible)** — handled correctly: documented as Finding 1, substituted with code review of the dead branch. ✓
2. **2 commits instead of 1** — non-conflict (executor-skill protocol mandates a separate retrospective commit; SPEC §9 "ONE commit" referred to the fix). ✓
3. **CLI deploy instead of MCP** — explicitly authorized by §5 stop trigger. ✓

### Real-time decisions (§4 of EXECUTION_REPORT)

1. **Test 3 substitution** (direct send-message instead of full RPC + engine path): correct choice — the test's purpose was to confirm the formatter still works for empty-variables callers. Direct send-message is a stricter test than RPC-first because it isolates the variable. ✓
2. **§3 #8 verified via `content` column instead of phantom `recipient_*` columns:** correct workaround; the SPEC's intent (whitelist enforcement) was met. ✓
3. **Reverted self-added explanatory comment to stay verbatim with §8 AFTER block:** correct discipline. Bounded Autonomy says execute, don't get creative. ✓

### Spot-check verifications I ran
- `git log 52263fc..HEAD --oneline` → 2 commits, hashes match the report. ✓
- `git diff 52263fc 11d96cd -- supabase/functions/event-register/index.ts` → +1 / -5 line delta, matches §2 of EXECUTION_REPORT. ✓
- `get_edge_function('event-register')` → version=14, status=ACTIVE, ezbr_sha256=19af937e... matches Daniel's CLI deploy hash. ✓
- Test 1 SMS body (cited in §10 of EXECUTION_REPORT) shows `📅 13/05/2026` — DD/MM/YYYY canonical formatter rendered. ✓
- Test 1 Email body shows `09:00 - 14:00` — HH:MM - HH:MM range rendered. ✓
- Test 3 (regression) SMS body shows `📅 13/05/2026` — staff path still works. ✓

---

## 3. Findings Disposition

| Code | Severity | Description | Foreman decision | Rationale |
|------|----------|-------------|------------------|-----------|
| M4-INFO-01 | INFO | `event-variables.ts:90` HH:MM-only branch is dead code (schema enforces `end_time NOT NULL`) | **DISMISS — keep branch as defensive code** | The branch costs nothing at runtime, would have to be re-added if a future SPEC introduces a "TBD end time" event class. Removing it would cost a deploy with zero customer benefit. SPEC §11 of any future event-time-related SPEC should drop the "Event B" precondition. |
| M4-DOC-02 | LOW | `crm_message_log` lacks `recipient_phone` / `recipient_email` columns | **TECH_DEBT — defer to a future audit-traceability SPEC** | Adding denormalized recipient columns would aid SPEC verification + audit log readability when leads are mutated post-send. Not urgent — currently reconstructable from `content` + `lead_id`. Not a customer-facing bug. Bundle into `M4_AUDIT_TRACEABILITY_HARDENING` when authored. |
| M4-INFRA-03 | MEDIUM | Supabase MCP `deploy_edge_function` returned 5xx twice; pattern repeats from ATOMIC_CONFIRMATION_FLOW + Phase 1 OPEN-021 | **TECH_DEBT — codify CLI workaround** | Now a 2+ occurrence infrastructure pattern. Three actions: (a) document in `docs/TROUBLESHOOTING.md` under "Edge Function deploy"; (b) embed the canonical CLI command in opticup-strategic SKILL §"SPEC Authoring Protocol" §10 Dependencies template; (c) Daniel optionally raises with Anthropic/Supabase support if not already filed. None of this requires a SPEC — straight skill + doc edits. |

**No findings re-opened the SPEC.** The fix is correct; the findings are either defensive code (kept), doc debt (deferred), or infrastructure (workaround codified).

---

## 4. Master Doc Update Checklist

| File | Touched in this SPEC range? | Status |
|------|----------------------------|--------|
| `MASTER_ROADMAP.md` | No — no phase boundary | ✅ Correctly skipped |
| `docs/GLOBAL_MAP.md` | No — no new functions/contracts | ✅ Correctly skipped |
| `docs/GLOBAL_SCHEMA.sql` | No — no schema change | ✅ Correctly skipped |
| `modules/Module 4 - CRM/docs/MODULE_MAP.md` | No — no new code names | ✅ Correctly skipped per SPEC §8 |
| `modules/Module 4 - CRM/docs/CHANGELOG.md` | Yes — appended hotfix line | ✅ Verified in commit 11d96cd |
| `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` | Yes — Today line | ✅ Verified |
| `modules/Module 4 - CRM/ROADMAP.md` | No | ✅ Not in scope |

**Master-doc state at SPEC close: aligned with executed work. No drift introduced.**

---

## 5. Author-Skill Improvement Proposals (opticup-strategic)

### Proposal 1 — Add `\d <table>` column-nullability check to Step-1.5 Cross-Reference sweep

**Where:** `.claude/skills/opticup-strategic/SKILL.md` §"Step 1.5 — Cross-Reference Check (MANDATORY)" — extend bullet 2.

**Change:** Currently bullet 2 says "Grep every name against the authoritative sources." Add a sub-bullet 2c:
> *"For every column the SPEC will assert NULL/NOT NULL on, write a `\\d <table>` style query into the SPEC's QA plan. NEVER cite `column_name IS NULL` as a test precondition without first confirming `is_nullable=YES` in `information_schema.columns`. Schema-impossible test cases waste executor time and erode SPEC credibility."*

**Rationale:** This SPEC's Flaw 1 (Test 2 schema-impossible) and Flaw 2 (phantom columns in §3 #8) are both the same root cause: I cited columns from memory rather than from `\d`. A 30-second pre-authoring query catches both classes.

**Source:** EXECUTION_REPORT §5 bullet 1 + Findings 1+2.

### Proposal 2 — Embed the canonical CLI deploy command in §10 Dependencies template

**Where:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` §10.

**Change:** Add a sub-section to the §10 template:
> *"### Edge Function deploy fallback*
> *If the SPEC includes any EF deploy step AND the SPEC's stop-triggers cover MCP-deploy 5xx, embed the exact CLI command verbatim in §10:*
> *```supabase functions deploy <slug> --no-verify-jwt --project-ref tsxrrxzmdxaenlvocyit```*
> *(adjust `--no-verify-jwt` per the EF's actual `verify_jwt` config — match the deployed setting). This avoids forcing the executor to context-switch + look it up under deviation pressure."*

**Rationale:** 2-occurrence pattern now. The MCP-deploy 5xx is a known infrastructure flake; the recovery path is muscle memory but only if it's in the SPEC's hand.

**Source:** EXECUTION_REPORT §5 bullet 2 + Finding 3.

---

## 6. Executor-Skill Improvement Proposals (opticup-executor)

The executor proposed 2 of its own in §8. Both are good. I'm forwarding them with my endorsement:

### Proposal 1 (executor-suggested) — Pre-flight schema-impossibility check
**Where:** `.claude/skills/opticup-executor/SKILL.md` §"Step 1.5 — DB Pre-Flight Check"
**Change:** Add bullet 8 — *"For every test data row the SPEC asks you to create, run `\\d <table>` against any column the SPEC references. If the column has `NOT NULL` + a non-null default, the SPEC's ‘NULL’ test case is schema-impossible — log it as a finding immediately, propose alternative coverage (code review of the dead branch), and continue."*
**Endorsed:** Yes. This is the executor-side mirror of my Foreman Proposal 1.

### Proposal 2 (executor-suggested) — Stale `.git/index.lock` recovery playbook
**Where:** `.claude/skills/opticup-executor/SKILL.md` §"Git discipline"
**Change:** Add — *"If `git add`/`commit` fails with `Unable to create '.git/index.lock': File exists`, verify no live git process via `tasklist | grep -i git` (Windows) or `pgrep git`. If no live process AND lock is stale, `rm -f .git/index.lock` is safe and required."*
**Endorsed:** Yes. Cost executor ~30s in this run; first-time encounters might escalate unnecessarily.

---

## 7. Verdict

🟡 **CLOSED WITH FOLLOW-UPS.**

**Closed:**
- M4_PUBLIC_FORM_VARIABLES_HIGH SPEC complete; both bugs fixed; production EF v14 active; QA verified.
- 2 commits on `develop` (`11d96cd` + `b35b6f6`). Awaiting Daniel-only merge to main.

**Follow-ups (non-blocking, captured here for the next opticup-strategic session):**
1. Apply Author-Skill Proposal 1 (column-nullability check) and Proposal 2 (CLI deploy command in §10 template) to opticup-strategic SKILL files. Per SKILL "Self-Improvement Mandate" — every review feeds 4 proposals back. **2nd consecutive review surfacing MCP-deploy issues** → per the 3-review rule, the next opticup-strategic session should apply Proposal 2 directly (not just propose).
2. Apply Executor-Skill Proposal 1 (schema-impossibility) and Proposal 2 (index.lock) to opticup-executor SKILL.
3. Add `docs/TROUBLESHOOTING.md` entry for "Supabase MCP `deploy_edge_function` 5xx — fallback to CLI" (covers Finding 3 disposition).
4. Daniel-only: merge `develop` → `main` after monitoring v14 in production for the morning hours. The fix is live for prizma the moment the EF v14 was deployed (which has already happened); the `develop` → `main` merge is bookkeeping for the source-tree lineage, not for runtime behavior.

**Production status confirmed:** v14 of `event-register` is live for prizma + demo. Customers registering via the public form NOW see DD/MM/YYYY date and `HH:MM - HH:MM` time correctly.

*End of FOREMAN_REVIEW.*
