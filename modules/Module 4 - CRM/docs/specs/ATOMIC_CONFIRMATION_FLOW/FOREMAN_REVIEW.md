# FOREMAN_REVIEW — ATOMIC_CONFIRMATION_FLOW

> **Location:** `modules/Module 4 - CRM/docs/specs/ATOMIC_CONFIRMATION_FLOW/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman)
> **Written on:** 2026-05-04
> **Reviews:** `SPEC.md` (author: opticup-strategic, 2026-05-04 same-day) + `EXECUTION_REPORT.md` (executor: opticup-executor, 2026-05-04, FINAL — supersedes partial at `d8e8f4c`) + `FINDINGS.md` (4 findings, cumulative)
> **Commit range reviewed:** `965c76d..02920d4` (10 commits including doc churn; 6 substantive + 4 doc/retro)

---

## 0. Self-Review Disclosure

Same-session author + reviewer (Opus 4.7, Windows desktop). Executor was a separate session-chain (3 sessions over the day, two activation-prompt revisions). Author/Foreman conflict applies to §2 (SPEC quality) but NOT to §3 (execution quality) — execution was independent.

Compensations applied: (i) 4 spot-checks against the live repo (§5), all passed; (ii) Daniel's GREEN smoke test on demo independently confirmed Bug 2 fix; (iii) live `list_edge_functions` confirms v7 ACTIVE with no [AE-DIAG] in deployed code; (iv) §2 scored on the strict end of 1–5.

Per the protocol from the prior FOREMAN_REVIEW (ATTENDEE_COUNTER_DISPLAY_FIX §0): same-session author/reviewer caps verdict at 🟡 unless every spot-check passes AND an independent party confirms at least one observable claim. Both conditions met (Daniel's GREEN smoke + 4/4 spot checks pass) → 🟢 verdict allowed.

---

## 1. Verdict

🟢 **CLOSED** — both bugs from `AUTOMATION_FLOW_BUGS_TRIPLE/SUPERVISOR_DECISION.md` are fixed and verified on demo. Live state: `automation-engine` v7 ACTIVE, no diagnostic noise in source or deployed code. 1 master-doc gap (MODULE_MAP missing `crm-automation-client.js` + stale `crm-confirm-send.js` line count) is **closed inline** in this Foreman commit; no row in §8 remains "should-have YES, was-it NO" after closure.

**Hard-Fail rule check:**
- §8 Master-Doc Update Checklist: 0 rows "should-have YES / was-it NO" after F-MAP close. ✅
- §5 Spot-Check Verification: 4/4 spot checks passed. ✅
- §4 Findings Processing: every finding has a disposition. ✅
- §3 Execution Quality Audit: no dimension below 3/5. ✅

One-sentence justification: Bug 1 + Bug 2 verified fixed on demo with code-level evidence (engine.ts:159 dispatch-mode gate, `onAfterConfirm` wired across client + 2 callsites, [AE-DIAG] zero in source/deploy), 6 substantive commits each with a single concern, 4 findings dispositioned, MODULE_MAP gap closed inline.

---

## 2. SPEC Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Goal clarity | 5 | §1 names both bugs in 2 sentences with the SUPERVISOR_DECISION provenance. Executor's §1 paraphrase reproduced both bugs verbatim — no interpretation drift. |
| Measurability of success criteria | 4 | 17 numbered criteria across §3 (Part A, 11 items) + §3bis (Part B Step 1, 6 items). Each has an exact expected value + verify command. -1 because §3 covers Part A and Part B Step 1 only — Steps B.2 / B.3 / B.4 had no §3 row, so when the SPEC scope expanded mid-execution (B.3 fix grew from "1-3 lines" to 34 lines across 3 files) there were no pre-set criteria to compare against. The author left the Step 2/3/4 criteria implicit. |
| Completeness of autonomy envelope | 3 | §6 + §7 lists out-of-scope items + 5 stop-triggers (good) but says nothing about how to handle a multi-failure platform deploy block. The Management API failed 4× in succession; the executor reasonably retried 3× in session 1, wrote a partial report, then retried 1× more in session 2 before pivoting. A "stop after 2 platform-API failures and escalate to Foreman for CLI-bypass authorization" envelope clause would have shortened the partial-report chain. -2. |
| Stop-trigger specificity | 4 | §7 has 5 narrow triggers (cross-tenant write, V10 regression, demo seed shortage, modal redesign breaks, prizma write without approval). -1 because the deploy-block class of failure (covered above) was not anticipated. |
| Rollback plan realism | 3 | §7 prizma-halt trigger acts as the de facto rollback (revert commits, EF stays on prior version). No explicit rollback procedure for the EF version itself (e.g., redeploy v4 from git). For a SPEC that touches a live EF on prizma, this is below the bar even though the SPEC restricted writes to demo. -2. |
| Expected final state accuracy | 4 | §3 enumerates the 5 modified files + verify commands. -1 because §8 (commit plan) implied v8 as the final EF version; actual end state is v7 due to the CLI-deploy idempotency observation in Finding 4. The author had no way to predict that, but the version-numbering choice itself is brittle (Finding 4 makes the case for "next version" instead of "v7/v8" in future commit plans). |
| Commit plan usefulness | 3 | §8 lays out the 4-commit plan correctly for the happy path, but (a) didn't anticipate the rule-21-orphans co-staging false-positive on `var doFinalCleanup` (3rd consecutive review naming this — see executor proposal #2 below), and (b) pre-committed to specific EF version numbers (v5→v6→v7→v8) without acknowledging deploy idempotency. The executor lost ~3 minutes splitting B.3 + had to write Finding 4 to explain the v8 absence. -2. |

**Average score:** **3.71/5.**

**Weakest dimensions + why:** Tied at 3 — autonomy envelope, rollback plan realism, commit plan usefulness. All three traceable to the same root cause: the author wrote the SPEC against the happy path and didn't bake in escape valves for platform-side failures (Management API 5xx, deploy idempotency) or for known-recurring tooling false positives (rule-21-orphans co-staging). Both author-skill proposals below address this class.

---

## 3. Execution Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Adherence to SPEC scope | 5 | All and only the 5 files in §A.3 modified for Part A. B.1 added 17 [AE-DIAG] log calls across the 3 EF files exactly as scoped. B.4 cleaned them all back to zero (verified: `grep -c "AE-DIAG"` = 0/0/0). B.3 fix touched 3 files (client + 2 callsites); the other 3 fire-and-forget callsites were correctly left untouched and explicitly documented in the commit message + EXECUTION_REPORT §4 decision #2. |
| Adherence to Iron Rules | 5 | EXECUTION_REPORT §6 self-audit is complete and accurate. Rule 12 verified: every modified file ≤ 350 (largest is engine.ts at 224). Rule 21 explicit cleanup of `runIdTag` + `it` helpers in B.4. Rule 22 unchanged on the EF read paths. Rule 31 integrity gate clean across all commit attempts. Rule 7 deviation correctly flagged as inherited browser-side debt, out of scope. |
| Commit hygiene | 4 | 6 substantive commits + 1 partial report + 1 doc commit + this retrospective. Each commit had a single concern with a clean message that traces back to a SPEC section. -1 because the B.3 commit-split was forced by the rule-21-orphans co-staging hook quirk that the author should have pre-empted in §8 — which deducted from §2 above. The *executor* handled the split correctly under hook pressure (no `--no-verify`, applied the documented M4 P12 / ATTENDEE_COUNTER precedent on the spot). |
| Handling of deviations (stopped when required) | 5 | Stopped after the 4th Management API failure, wrote a partial report, escalated to the activation prompt that pivoted to CLI-only deploy. Stopped after Step B.2 diagnosis to confirm root cause before writing the fix. Zero `--no-verify` usage. Textbook handling of a deploy-block sequence the SPEC didn't anticipate. |
| Documentation currency | 3 | EXECUTION_REPORT (final) + FINDINGS (cumulative 4) + partial report preserved at `d8e8f4c` in git history. SESSION_CONTEXT, MODULE_MAP, CHANGELOG deferred to Integration Ceremony per the SPEC's lifecycle — that's correct per the SKILL but **MODULE_MAP is missing the new `crm-automation-client.js` file entirely** (130 lines, new global `window.CrmAutomationClient.evaluate` with the new `onAfterConfirm` parameter). Authority Matrix says module's MODULE_MAP is the home for that file. Closed inline by Foreman in this commit. -2. |
| FINDINGS.md discipline | 5 | 4 findings logged at appropriate severity (1 CRITICAL fixed inline, 1 MEDIUM tooling gap with workaround, 1 LOW schema-doc drift, 1 INFO deploy idempotency). All have specific code prefixes (`M4-CRM-AUTOMATION-CLIENT-01`, `M4-TOOL-DIAG-01`, `M4-DOC-DIAG-01`, `M4-TOOL-DEPLOY-01`), all have a suggested next action. None silently absorbed. F1 in particular was the temptation: the executor identified the modal-stack race in B.2, wrote the fix in B.3 — and correctly logged it as a CRITICAL finding rather than burying it inside the SPEC's "small fix" framing. |
| EXECUTION_REPORT.md honesty + specificity | 5 | Self-disclosed the 3-session run + 2 activation-prompt revisions in §0. Self-assessment 9.3/10 with load-bearing 8s on commit hygiene + documentation currency that explicitly cite the SPEC's pre-emption gap. §3 deviation table distinguishes structural artifacts (commit-split, version-skip) from genuine misreads. §10 Raw Command Log includes actual hashes + ezbr_sha256 + updated_at for v7. |

**Average score:** **4.57/5.**

**Did executor follow the autonomy envelope correctly?** YES. Three sessions, zero in-flight ambiguity questions to dispatcher. Every escalation point was a documented stop-trigger or post-step report.

**Did executor ask unnecessary questions?** Zero across all 3 sessions.

**Did executor silently absorb any scope changes?** No. The B.3 scope expansion (from "1-3 lines" to 34 lines across 3 files) was logged as deviation #2 with Daniel's explicit Option-A authorization recorded.

---

## 4. Findings Processing

| # | Code | Finding summary | Severity | Disposition | Action taken |
|---|------|-----------------|----------|-------------|--------------|
| 1 | `M4-CRM-AUTOMATION-CLIENT-01` | Confirmation modal closes prematurely from a race against `reloadDetail`'s global `Modal.close()` | CRITICAL | **CLOSED — fix shipped in `c474756` + `201bcf6`** | Daniel verified GREEN on demo. Live EF v7 confirms client-side fix sufficient. The 3 fire-and-forget callsites in `crm-event-actions.js` + `crm-lead-actions.js` (×2) explicitly left untouched per executor decision #2 — they don't have the await-then-sync-cleanup race shape. Pattern documented in EXECUTION_REPORT §4 decision #2 + this finding. **Follow-up:** opt-in `onAfterConfirm` pattern should be documented in `docs/CONVENTIONS.md` so future callsites know to use it (executor proposal: yes, deferred to a future M4-DEBT bucket entry — not blocking). |
| 2 | `M4-TOOL-DIAG-01` | Supabase MCP `get_logs(service='edge-function')` returns gateway-only logs, not function-stdout | MEDIUM | **TECH_DEBT** + executor-skill update | Filed under the existing `M4-TOOL-DEBT` bucket alongside the `rule-21-orphans` false-positive entries. The CLI fallback (`npx supabase functions logs ... \| grep ...`) becomes Executor Proposal #2 below — sub-section in `.claude/skills/opticup-executor/SKILL.md` documenting the CLI fallback for stdout-bearing logs. Workaround already documented in Finding 2 itself; no further action this commit. |
| 3 | `M4-DOC-DIAG-01` | Schema column drift: `crm_automation_runs` lacks `created_at`; `crm_message_log` lacks `template_slug` | LOW | **DISMISS** — cosmetic, no functional impact | The actual columns are accurate (`started_at`/`finished_at`/`updated_at` on runs; `template_id` on log). The drift was in the executor's mental model from the SPEC text, not in the schema. No `docs/DB_TABLES_REFERENCE.md` entry currently misrepresents these tables (verified via grep). Cost was ~2 minutes of executor time — informational only. |
| 4 | `M4-TOOL-DEPLOY-01` | Supabase CLI deploy short-circuits identical-content uploads (no new version) | INFO | **DISMISS** with author-skill proposal #1 absorbing the lesson | Functionally a no-op (v7 has the cleaned source per ezbr_sha256). The lesson — "don't pre-commit to specific EF version numbers in SPEC commit plans" — is folded into Author Proposal #1 below. |

**Zero findings left orphaned.** ✅

---

## 5. Spot-Check Verification

| Claim (from EXECUTION_REPORT) | Verified? | Method |
|-------------------------------|-----------|--------|
| "engine.ts 224, prepare-plan.ts 182, dispatch.ts 81, crm-automation-client.js 130, crm-attendee-move.js 128, crm-event-register.js 206 — all under 350" | ✅ | `wc -l` on all 6 files: 224 / 182 / 81 / 130 / 128 / 206 — exact match |
| "B.4 cleanup: zero [AE-DIAG] in all 3 EF files" | ✅ | `grep -c "AE-DIAG" engine.ts prepare-plan.ts dispatch.ts` → 0 / 0 / 0 |
| "engine.ts: post-actions + queue_send gated on `mode === 'dispatch'`" (SPEC criterion A3) | ✅ | `grep 'mode === "dispatch"' engine.ts` → 1 hit at line 159, wrapping the post-action loop region |
| "`onAfterConfirm` wired in `crm-automation-client.js` (signature) + `crm-event-register.js` (callsite passthrough)" | ✅ | grep on `modules/crm/`: client.js lines 36 (signature), 89-91 (after-dispatch invocation), 116-118 (fallback path); event-register.js lines 96 (signature), 113 (passthrough) — exact match to executor decision #4 (symmetry on no-modal Step 4) |

All 4 spot checks pass. No 🔴 REOPEN trigger. Daniel's GREEN smoke test on demo (per EXECUTION_REPORT §2 B.4 row) is an independent confirmation of the same.

---

## 6. Author-Skill Improvement Proposals (opticup-strategic)

### Proposal 1 — SPEC commit-plan should not pre-commit to specific EF version numbers

- **Where:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` §"Commit plan" — add a constraint clause.
- **Change:** Add to the §"Commit plan" template language:
  > "**EF version numbers:** When a SPEC's commit plan references Edge Function deploys, write 'next version' rather than predicting specific version numbers (e.g., write 'EF deployed as next version' instead of 'EF deployed as v7'). Supabase deploys are idempotent on byte-identical ezbr content — running deploy twice with no source changes does NOT increment the version. Pre-committing to specific numbers (v5 → v6 → v7 → v8) creates spurious deviations when (a) a phase doesn't actually change EF source (so no redeploy needed) or (b) consecutive deploys are content-equivalent. See `M4-TOOL-DEPLOY-01` (ATOMIC_CONFIRMATION_FLOW Finding 4) for the precedent."
- **Rationale:** This SPEC's §8 commit plan named v5/v6/v7/v8 as the expected version sequence. Actual end state is v7 because (a) B.3 was client-only with no EF source change → v6 carried over, (b) B.4's CLI deploy ran twice but Supabase short-circuited the second invocation. Result: an executor-perspective "deviation" recorded in EXECUTION_REPORT §3 #4 that's purely about author misframing, not a real execution issue. Cost ~10 minutes of writing the deviation + this Foreman finding-disposition section. Generalizes to any future SPEC that touches a live EF.
- **Source:** EXECUTION_REPORT §3 deviation #4 + FINDINGS Finding 4 (`M4-TOOL-DEPLOY-01`).

### Proposal 2 — SPEC author must include a "platform-deploy block" escape valve in §"Stop triggers" + §"Autonomy envelope"

- **Where:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` §"Stop triggers" + §"Autonomy envelope" — add a paired clause.
- **Change:** Add to the §"Stop triggers" template:
  > "**Platform-deploy block clause (mandatory if the SPEC deploys an Edge Function or runs an MCP-mediated remote action):** if the same MCP / Management-API call returns a 5xx error twice in a row, STOP and escalate to Foreman for explicit CLI-bypass authorization. Do not retry beyond 2 failures. Rationale: the Management API can hit transient `InternalServerErrorException` for minutes at a time; the bypass path (Daniel runs `npx supabase functions deploy ...` from local CLI) is well-established but requires explicit per-SPEC authorization — see `ACTIVATION_PROMPT_RESUME_V3_CLI` from this SPEC for the precedent."

  And in §"Autonomy envelope":
  > "**MCP/CLI deploy fallback:** when the SPEC pre-authorizes the CLI-bypass path (per the Stop-triggers clause above), the executor may use it without further authorization once 2 MCP failures have been recorded. Do not switch to CLI on the first failure."
- **Rationale:** The Management API failed 4× across 2 sessions before pivoting to CLI deploy. Each session retried independently. Without a SKILL-level "stop after N=2, escalate for bypass" clause, executors burn ~10 minutes per failure series investigating + writing partial reports. This SPEC's V2 + V3 activation-prompt revisions exist precisely because the SKILL/SPEC didn't pre-authorize the bypass path. Two recorded incidents in this SPEC's history (sessions 1 + 2) make the case empirically.
- **Source:** EXECUTION_REPORT §0 (Self-Disclosure paragraph on the 3-session run + 2 activation-prompt revisions) + §3 deviation #1 + §5 ("What Would Have Helped Me Go Faster") executor proposal #2.

---

## 7. Executor-Skill Improvement Proposals (opticup-executor)

### Proposal 1 — APPLY: pre-empt rule-21-orphans co-staging false-positive in commit-prep step

- **Where:** `.claude/skills/opticup-executor/SKILL.md` §"Code Patterns → Git discipline" — append a new sub-section after line 166.
- **Change:** Append the following sub-section:
  > "**CRM-module commit-split anticipation (rule-21-orphans hook false positives).** Before staging 2+ files from `modules/crm/` together for the same commit, run:
  > ```
  > grep -hE '^\s+var ([a-z_]+) =' <staged-files> | sort | uniq -d
  > ```
  > If any name appears as a duplicate, the `rule-21-orphans` pre-commit hook will block the commit because it cannot distinguish IIFE-local var declarations from module-global ones. Workaround: split the staged files across 2 separate commits so each commit's staged set has only one declaration of any local var. The mechanical workaround is well-established (precedents: M4 P12 `info`/`phone`/`email`, M4 ATTENDEE_COUNTER_DISPLAY_FIX `var sent`, M4 ATOMIC_CONFIRMATION_FLOW `var doFinalCleanup`). Pre-empting this saves ~3 minutes per affected commit and removes a recurring 'is this a real bug?' cognitive load."
- **Rationale + 3rd-cycle trigger:** This is the **third consecutive FOREMAN_REVIEW** to call out this pattern — first M4 P12 SESSION_CONTEXT, then ATTENDEE_COUNTER_DISPLAY_FIX (Author Proposal #1, marked accepted), now ATOMIC_CONFIRMATION_FLOW (executor self-noted in §5 + EXECUTION_REPORT §3 deviation #3 + executor proposal #2). Per the opticup-strategic SKILL §"Self-Improvement Mandate" → "If 3 consecutive reviews have called out the same issue, the next session MUST apply the change before starting any other work." **This Foreman session APPLIES the change in the same commit batch as this review** — see §10 Followups.
- **Source:** EXECUTION_REPORT §3 deviation #3 + §5 executor proposal #2 + 3-cycle trigger from prior FOREMAN_REVIEWs.

### Proposal 2 — Document the EF stdout-log CLI fallback in the executor SKILL

- **Where:** `.claude/skills/opticup-executor/SKILL.md` — add a new sub-section under §"Verification After Changes" or adjacent (executor's choice during apply).
- **Change:** Add a sub-section "**Edge Function stdout logs (when MCP `get_logs` isn't enough)**":
  > "The Supabase MCP `get_logs(service='edge-function')` returns the **gateway-only** log stream (METHOD | STATUS | URL). It does NOT include function `console.log` / `console.error` stdout. When you need to confirm runtime traces (e.g., `[AE-DIAG]` instrumentation, error stacks, structured JSON logs the function emits), use the CLI fallback:
  > ```
  > npx supabase functions logs <function-name> --project-ref <project-ref> | grep <runId-or-tag>
  > ```
  > or open Supabase Studio → Functions → <function-name> → Logs tab and filter. Document this in the EXECUTION_REPORT's §10 Raw Command Log when used. Source: `M4-TOOL-DIAG-01` from ATOMIC_CONFIRMATION_FLOW FINDINGS — encountered while attempting to capture `[AE-DIAG]` traces via MCP for runId `725393a3-bcfa-4f14-8a9b-9f5b63b28b36`."
- **Rationale:** This SPEC's Step B.2 fell back to DB-side state reconstruction because the MCP path returned only gateway logs. The reconstruction worked (Daniel's GREEN smoke test confirmed the hypothesis), but cost ~15 minutes. Without a SKILL-level note, the next executor will hit the same wall and reinvent the workaround. The CLI command is short, documented in Finding 2, and a one-line addition to the SKILL prevents the next 15-minute lap.
- **Source:** FINDINGS Finding 2 (`M4-TOOL-DIAG-01`) + EXECUTION_REPORT §5 executor proposal #1.

---

## 8. Master-Doc Update Checklist

| Doc | Should have been updated? | Was it? | Follow-up needed |
|-----|--------------------------|---------|------------------|
| `MASTER_ROADMAP.md` §3 Current State | NO — this SPEC is a post-cutover bug bundle, not a phase boundary; M4 status unchanged. | n/a | None |
| `docs/GLOBAL_MAP.md` | NO — `CrmAutomationClient.evaluate` is module-internal (no cross-module contract). The EF `automation-engine` is a server-side artifact, not a client-side global. | n/a | None |
| `docs/GLOBAL_SCHEMA.sql` | NO — no DDL changed in either SPEC. | n/a | None |
| Module's `SESSION_CONTEXT.md` | YES — both SPECs (this + ATTENDEE_COUNTER_DISPLAY_FIX) deserve close-out lines. | Pending — closed in this Integration Ceremony commit | Foreman closes inline |
| Module's `CHANGELOG.md` | YES — commit ranges for both SPECs. | Pending — closed in this Integration Ceremony commit | Foreman closes inline |
| Module's `MODULE_MAP.md` | YES — `crm-automation-client.js` is a NEW file (130 lines) with new global `window.CrmAutomationClient.evaluate` (now with `onAfterConfirm` 3rd param). `crm-confirm-send.js` line count drifted from 271 → 302 (3-button modal expansion). The `automation-engine` EF is the new server-side code surface — should be referenced. | **Closed inline by Foreman in this Integration Ceremony commit** (added new row for `crm-automation-client.js`, refreshed `crm-confirm-send.js` line count, added EF reference note). | None after closure |
| Module's `MODULE_SPEC.md` | NO — high-level CRM business logic unchanged; this is a bug-fix + atomicity hardening at the dispatch layer. | n/a | None |
| Module's `db-schema.sql` | NO — no schema changes in either SPEC. | n/a | None |

**0 rows with "should-have YES, was-it NO"** after the Integration Ceremony commit closes the SESSION_CONTEXT / CHANGELOG / MODULE_MAP rows. ✅ Verdict not capped.

---

## 9. Daniel-Facing Summary (Hebrew)

> שני הבאגים מתהליך אישור ההודעות סגורים. באג 1 (הסטטוס שזלג גם בלחיצה על ביטול) נפתר עם המודאל שלוש-הכפתורים שנבנה בתחילת היום. באג 2 (הודעות שלא נשלחו אחרי "שלח") היה דריסה של חלון האישור על ידי טעינה-מחדש של פרטי האירוע — תוקן בצד הלקוח, ה-EF נשאר על גרסה 7 בייצור. דמו ירוק. הפסק: 🟢 SPEC סגור.

---

## 10. Followups Opened

Linked back to FINDINGS.md numbers + executor SKILL update.

- **Executor SKILL update:** §"Code Patterns → Git discipline" gets the new "CRM-module commit-split anticipation" sub-section per Executor Proposal #1 above. **Applied in the same commit batch as this review** (3rd-cycle trigger). Single commit message: `chore(skill): add Rule-21 orphans co-staging guard to opticup-executor`.
- **TECH_DEBT bucket:** Finding 2 (`M4-TOOL-DIAG-01`) folds into the existing `M4-TOOL-DEBT` mental bucket alongside prior `rule-21-orphans` entries. The CLI fallback is documented in the finding itself + folded into Executor Proposal #2 (deferred — not part of this commit batch; a future executor SKILL session can apply it). No standalone tech-debt file created.
- **Inline closure:** Documentation drift on MODULE_MAP — closed in this Integration Ceremony commit (new row for `crm-automation-client.js`, refreshed `crm-confirm-send.js` line count, added EF reference note).
- **Future doc note (deferred — not blocking):** the `onAfterConfirm` opt-in cleanup pattern should be added to `docs/CONVENTIONS.md` so future callsites of `CrmAutomationClient.evaluate` know to use it. Logged here so the next CRM stabilization SPEC can fold it in. Per Finding 1's "Follow-up" line.

---

*End of FOREMAN_REVIEW. Verdict: 🟢 CLOSED. SPEC fully delivered, both bugs verified fixed on demo, live EF on v7 with no diagnostic noise. All findings dispositioned, MODULE_MAP gap closed inline, executor-skill update applied per 3rd-cycle trigger.*
