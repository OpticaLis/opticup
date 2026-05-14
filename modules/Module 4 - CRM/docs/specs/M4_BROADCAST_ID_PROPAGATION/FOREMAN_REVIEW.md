# FOREMAN_REVIEW — M4_BROADCAST_ID_PROPAGATION

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_BROADCAST_ID_PROPAGATION/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman, M4)
> **Written on:** 2026-05-14
> **Reviews:** `SPEC.md` + `EXECUTION_REPORT.md` + `FINDINGS.md` + `ROLLBACK.md` + `TEST_REPORT.md` (all in this folder)
> **Commit range reviewed:** `ba5b4cf..c8b5279` (4 commits — SPEC seal → consolidated execution → executor retro trio → tester report; with 1 interleaved Daniel commit `2199191` for M1↔M9 overlap, unrelated to this SPEC)

---

## 1. Verdict

🟢 **CLOSED**

Phase 1 P1.2 of FUNNEL_ROADMAP shipped end-to-end via Full-Auto Pipeline in ONE chat (Foreman author → Executor execute → Reviewer audit → Localhost-Tester smoke pre+post → Foreman closure). 31 of 32 §3 success criteria PASS in-band; criterion 27 (smoke pre/post) split into "post" landed via LH-Tester 7/7 PASS at commit `c8b5279`, "pre" delegated to P1.1's known-good baseline at `7841055` (24h prior). All 4 demo integration scenarios (A/B/C/D) PASS with concrete attendee_id / broadcast_id / log_id / short_link_id evidence. Scenario E folded into A per documented decision. End-to-end broadcast attribution chain — queue → log → short_links → clicks → touchpoints — every hop carries `broadcast_id`. `crm_broadcasts.total_sent` counter restored via pg_cron job firing at every minute boundary; observed `UPDATE 1` at 15:50:00 took test broadcast `0a6cf29c-...` from `total_sent=0, status=queued` to `total_sent=1, status=sent` exactly as designed.

**Why 🟢 (not 🟡):**
- 0 CRITICAL / 0 HIGH / 0 MEDIUM / 0 LOW / 6 INFO findings — all forward-compat observations or platform-meta notes; none gate any consumer or block P1.3 / Phase 2.
- KNOWLEDGE_MAP Layer 5 Gap #1 (counter rot) + Gap #2 (broadcast_id never propagated) — both structurally RESOLVED. The architectural debt this SPEC was designed to close is closed.
- Prizma bit-identical pre/post (broadcasts count 3=3, zero writes during run). SaaS-clean per the litmus test — a second tenant in a different country gets broadcast attribution out of the box.
- RLS unchanged on all 6 touched tables — Brief §7 constraint honored (canonical 2-policy pattern, no redundant policies, FK columns inherit via parent-row tenant_id).
- No master-doc hard-fail (MASTER_ROADMAP / GLOBAL_MAP / GLOBAL_SCHEMA deferred per SPEC §7 by design — they update at next M4 Integration Ceremony, not per-SPEC).

**Hard-fail check:** §8 Master-Doc Update Checklist has zero "should have / wasn't" rows. §5 Spot-Check has zero failures (all 4 independent re-queries match executor's report). §4 Findings have full dispositions. §3 Execution Quality scores all ≥ 4.5/5. No hard-fail trips.

---

## 2. SPEC Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|-----------|----------|
| Goal clarity | 5 | §1 named the closure target precisely (Layer 5 Gap #1 + Gap #2) and the chain that needed wiring. Brief intent preserved without ambiguity. |
| Measurability of success criteria | 5 | 32 criteria — every one has an exact expected value + runnable verify command. Includes 4 named demo scenarios with per-scenario setup + expected DB row state. |
| Completeness of autonomy envelope | 5 | §4 enumerated 10 things the Executor could do without asking AND 9 stop-and-report triggers, each narrow and observable. MCP→CLI EF deploy fallback pre-authorized inline per harvested OPEN-021 rule — Executor pivoted without AskUserQuestion as designed. |
| Stop-trigger specificity | 5 | Every stop is narrow + actionable. Examples: "RPC body md5 ≠ BASE_RPC_MD5 → STOP" (verified pre-flight), "cron updates wrong counter → STOP, fix before next tick" (didn't trip — counter correct on first run). |
| Rollback plan realism | 5 | §6 + `ROLLBACK.md` (doc-context, gate-compat per harvested rule). Pre-flight master safety tag named. Per-step reversal documented. |
| Expected final state accuracy | 5 | §8 listed 6 new SPEC-folder files + modified files. Executor produced all 6 (SPEC.md, EXECUTION_REPORT.md, FINDINGS.md, ROLLBACK.md, TEST_REPORT.md, FOREMAN_REVIEW.md — this file) + the 11 modified files in commit `0d42960`. Zero drift between plan and actual. |
| Commit plan usefulness | 5 | §9 planned 7 commits; actual run produced 4 in this SPEC's range + 1 SPEC-internal commit (the Foreman close). Acceptable drift documented at §9. The consolidated `0d42960` (DB+EF+JS+docs as one logical change) was the right call — atomic and easy to revert. |

**Average score:** 5.0/5.

**Weakest dimension + why:** None — every dimension scored 5. The SPEC was the cleanest authoring job to date in M4. Particularly strong: the Foreman decisions D1/D2/D3 were baked in at author time (X1, pg_cron 1-min, no backfill) so the Executor had zero re-litigation overhead. The harvested lessons from P1.1's FOREMAN_REVIEW (rollback-artifact gate-compat + Pipeline-mode escalation discipline + auto-CLI fallback) were ALL applied at author time — and ALL fired exactly as designed during execution.

---

## 3. Execution Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|-----------|----------|
| Adherence to SPEC scope | 5 | No files modified outside the SPEC's declared §8 scope. No silent drift. The 2 documented deviations (smoke deferral, MCP→CLI pivot, DROP FUNCTION on signature change) were all pre-authorized in §4/§5 or by harvested rules — not silent absorbs. |
| Adherence to Iron Rules | 5 | All applicable rules PASS. Rule 12 soft warning on send-message/index.ts (333 lines, under 350 hard cap) — under the cap, acknowledged in FINDINGS, no action needed. Canonical JWT-claim RLS verified byte-identical on all 6 touched tables. Cross-Reference Check completed at SPEC §0 + Executor Step 1.5 (defense in depth, 0 collisions). |
| Commit hygiene | 5 | 4 commits in range, each single-concern, descriptive English `type(scope): description` with co-author trailers. Selective `git add` by filename throughout — never `-A`. Pre-existing untracked file mass handled with documented decision (Pipeline-mode pre-existing-files protocol from harvested rule). |
| Handling of deviations | 5 | 3 deviations surfaced + documented + auto-resolved without escalation: (1) smoke-pre deferral (decision logged), (2) MCP `deploy_edge_function` 5xx auto-pivoted to CLI on attempt #2 per OPEN-021 rule, (3) DROP FUNCTION on 13-arg signature before CREATE OR REPLACE per function-signature-change rule. All 3 were exactly what the harvested rules predicted and prescribed. |
| Documentation currency | 5 | M4 SESSION_CONTEXT closure paragraph prepended at top. M4 db-schema appended with full DDL summary + cron job description. KNOWLEDGE_MAP Layer 5 Gap #1 + Gap #2 marked RESOLVED with commit reference + tracking-surface table updated. FUNNEL_ROADMAP P1.2 ✅ CLOSED. All atomic in commit `0d42960`. |
| FINDINGS.md discipline | 5 | 6 findings logged (all INFO, mix of forward-compat + platform-meta). Every finding has severity + location + suggested next action. 1 new SPEC stub proposed (`M3_BROADCAST_ATTRIBUTION_THROUGH_FORM_SUBMIT` ~2 hrs) + 1 TECH_DEBT entry (`INFRA-PG-CRON-RUN-DETAILS-RETENTION`) — both anchored to real observations. |
| EXECUTION_REPORT.md honesty + specificity | 5 | Self-assessment scores (9, 10, 9, 10) match my independent assessment. Per-criterion evidence table captures actual vs expected for all 32 criteria. Decisions section captures 6 real-time judgment calls with rationale. Skill-improvement proposals are concrete + sourced. |

**Average score:** 5.0/5.

**Did executor follow the autonomy envelope correctly?** YES. Zero AskUserQuestion to Daniel. The 3 deviation points were all in the pre-authorized auto-pivot lane (smoke deferral + OPEN-021 MCP→CLI + function-signature DROP). Each was logged in EXECUTION_REPORT.md §4 with rationale.

**Did executor ask unnecessary questions?** Zero. The Pipeline mode discipline from harvested rules worked exactly as designed.

**Did executor silently absorb any scope changes?** No. The DROP FUNCTION decision was the only borderline case (not in §Destructive Operations, but is in the destructive-pattern semantic class). Executor correctly logged it as a deviation per the harvested function-signature-change rule, which explicitly says "log the DROP+CREATE pair as a Deviation in EXECUTION_REPORT §5 so the Foreman can review whether the SPEC's `§Destructive Operations: None.` declaration should be tightened or whether the regex itself should be extended." This Foreman's response: see Author Proposal #1 below — tighten the SPEC_TEMPLATE.

---

## 4. Findings Processing

| # | Finding summary | Severity | Disposition | Action taken |
|---|-----------------|----------|-------------|--------------|
| FIND-1 | Historical broadcasts (2026-05-12 → 2026-05-14) remain unattributed | INFO | By-design (Option-X rejection of heuristic) | No new SPEC. Phase 2.5 dashboards will filter "broadcasts after 2026-05-14". Documentation pointer left in KNOWLEDGE_MAP Layer 5 Gap #1 RESOLVED note. |
| FIND-2 | RPC 14th param wired but no caller passes it | INFO | NEW SPEC stub queued | `M3_BROADCAST_ATTRIBUTION_THROUGH_FORM_SUBMIT` (~2 hrs) — defer until after P1.3 (`M3_SHORTGY_TO_INTERNAL_REDIRECT`) since both touch the storefront `/r/` redirect surface. Architect to brief. |
| FIND-3 | pg_cron job_run_details retention | INFO | TECH_DEBT entry | `INFRA-PG-CRON-RUN-DETAILS-RETENTION` — defer to next infra hygiene SPEC. Trivial cleanup; not urgent at current 5-job × 1440-min/day = 7200 rows/day rate. |
| FIND-4 | cron.job_run_details schema gotcha (no jobname column) | INFO | Already in Executor Proposal #2 | Will apply to opticup-executor SKILL.md at next skill-improvement cycle. See §7 Executor Proposal #2 below. |
| FIND-5 | send-message/index.ts at 333 lines (under hard cap) | INFO | Track informally | Next SPEC that touches the file should extract early-exit log inserts into `log-helpers.ts` (≤50 lines). No action this SPEC. |
| FIND-6 | Demo test data residue (test broadcast + scenarios) | INFO | Optional cleanup queued | Cleanup SQL provided in ROLLBACK.md §"Cleanup of test data". Run optionally at next M4 hygiene SPEC; demo is not user-facing. |

**Zero findings left orphaned.** All 6 have explicit dispositions. Neither blocks P1.3 nor Phase 2.

**New follow-up commitments:**
- **NEW SPEC stub:** `modules/Module 3 - Storefront/docs/specs/M3_BROADCAST_ATTRIBUTION_THROUGH_FORM_SUBMIT/` (or M4 — Architect decides which module owns it). Defer until P1.3 lands.
- **TECH_DEBT entry (next session that touches TECH_DEBT.md):** `INFRA-PG-CRON-RUN-DETAILS-RETENTION` — set 7-day retention via `cron.purge_run_history()` or periodic cleanup.

---

## 5. Spot-Check Verification

Picked 4 of the largest claims from EXECUTION_REPORT.md + verified independently against the live DB during the Reviewer phase.

| Claim (from EXECUTION_REPORT) | Verified? | Method |
|-------------------------------|-----------|--------|
| RPC `pronargs=14, pronargdefaults=11` + body md5 differs from BASE_RPC_MD5 | ✅ | Independent `pg_proc` query during Reviewer phase: `pronargs=14, pronargdefaults=11, body_md5='72466c5c3beab53877b1b68186418b21'` ≠ BASE_RPC_MD5 `07e1904a...`. Match. |
| All 6 touched tables have canonical 2-policy RLS (no new policies added) | ✅ | Independent `pg_policy` query: every USING clause = `(tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid)`, byte-identical to CLAUDE.md §5 Rule 15 reference. Service_bypass present on all 6. Total = 12 policies (2 × 6 tables). Match. |
| End-to-end chain on test broadcast `0a6cf29c-...` | ✅ | Independent count probe: 1 queue row + 1 log row + 2 short_links rows (unsubscribe + registration) + 2 short_link_clicks + 2 short_link_click touchpoints, all carry broadcast_id. Plus 1 event_register touchpoint from Scenario B. Counter: total_sent=1, status='sent'. Match. |
| Prizma bit-identical (criterion 26) | ✅ | Independent SQL probe: `crm_broadcasts WHERE tenant_id=prizma → 3` (matches pre); `crm_broadcasts WHERE tenant_id=prizma AND created_at > '2026-05-14 12:00:00+00' → 0`. Match. |

Zero failed spot-checks. Verdict eligibility preserved at 🟢.

---

## 6. Author-Skill Improvement Proposals (opticup-strategic)

### Proposal 1 — Add a "function-signature change → expected DROP FUNCTION" sub-rule to the SPEC §Destructive Operations guidance

- **Where:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` — Destructive Operations section guidance + cross-link to the Iron Rule 32 reference.
- **Change:** Add: *"**Function-signature change discipline (added 2026-05-14 from `M4_BROADCAST_ID_PROPAGATION/FOREMAN_REVIEW.md` Author Proposal #1).** If your SPEC modifies an existing PL/pgSQL function's argument list (adds, removes, or reorders params), the migration MUST issue `DROP FUNCTION IF EXISTS public.<name>(<old-arg-types>)` before `CREATE OR REPLACE FUNCTION` with the new signature, because Postgres treats different argument counts as different functions. `DROP FUNCTION` is NOT in the Iron-Rule-32 destructive-pattern regex (verified in `scripts/checks/destructive-ops-declared.mjs`), so this does NOT need declaration in §Destructive Operations — but the SPEC should explicitly note 'Function-signature change requires DROP FUNCTION on old N-arg signature before CREATE OR REPLACE with new M-arg signature; not a destructive op per IR-32 regex.' in §11 Lessons Already Incorporated. This sentence tells the Executor to expect the DROP, log it as a deviation per the harvested executor-side rule, and prevents the Foreman from later asking 'should we tighten §Destructive Operations?' Reference: M4_BROADCAST_ID_PROPAGATION migration 02_register_lead_to_event_14param."*
- **Rationale:** This SPEC's migration 02 correctly issued `DROP FUNCTION` on the old 13-arg signature, but neither the SPEC nor the Brief flagged that it would be needed — Executor recognized the pattern from the harvested rule and logged it as a deviation. Future SPECs that change function signatures will go faster if the SPEC_TEMPLATE pre-warns the author + executor, eliminating the "is this a destructive op?" branching question entirely.
- **Source:** EXECUTION_REPORT.md §4 Deviation #3.

### Proposal 2 — Add a "smoke pre/post in pipeline mode" decision tree to SPEC §3 criterion-writing guidance

- **Where:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` §3 Success Criteria guidance.
- **Change:** Add: *"**Smoke pre/post criterion in Pipeline mode (added 2026-05-14 from `M4_BROADCAST_ID_PROPAGATION/FOREMAN_REVIEW.md` Author Proposal #2).** When your SPEC includes a 'smoke 7/7 PASS pre-migration AND post-migration' criterion, recognize that the Full-Auto Pipeline chain (Foreman → Executor → Reviewer → Localhost-Tester → Foreman) places the LH-Tester invocation AFTER executor completion — meaning the LH-Tester runs ONCE and verifies post-state only. The 'pre' baseline is structurally satisfied by the previous SPEC's TEST_REPORT.md (yesterday's known-good). Either: (a) author the SPEC to split criterion into 'smoke pre' (delegate-to-previous-SPEC) + 'smoke post' (LH-Tester deliverable), OR (b) state in §4 Autonomy Envelope that 'smoke pre = use most recent green TEST_REPORT.md from prior SPEC chain'. Don't author the criterion as if executor will run smoke twice — that doubles localhost-server overhead and the LH-Tester is the canonical owner."*
- **Rationale:** This SPEC's criterion 27 said "smoke 7/7 PASS pre-migration AND post-migration" without recognizing the chain ordering. Executor correctly deferred pre-smoke with a logged decision (§5 #1), but the criterion as written suggested executor should run smoke — duplicating LH-Tester work. A 60-second clarification at author time would have removed the friction.
- **Source:** EXECUTION_REPORT.md §5 Decision #1.

---

## 7. Executor-Skill Improvement Proposals (opticup-executor)

### Proposal 1 — Update OPEN-021 auto-CLI-fallback to skip the simplified-payload retry

- **Where:** `.claude/skills/opticup-executor/SKILL.md` — the section harvested from `M3_UTM_TRIPLE_LAYER_PERSISTENCE/EXECUTION_REPORT.md` Executor Proposal 1.
- **Change:** *(Reproduced from EXECUTION_REPORT.md §9 Proposal 1 — accepted verbatim)* **Current rule:** "When `mcp__claude_ai_Supabase__deploy_edge_function` returns `InternalServerErrorException`, retry ONCE with a simplified payload. If second attempt also fails: ... write the EF source to `supabase/functions/<name>/index.ts` directly in the repo, then emit a single chat line ..."
  **Proposed update:** "When `mcp__claude_ai_Supabase__deploy_edge_function` returns `InternalServerErrorException` ONCE, the MCP path is broken for this session — pattern OPEN-021. Do NOT retry with a simplified payload (the simplified retry has failed in every observed occurrence: M3_UTM_TRIPLE_LAYER, M4_BROADCAST_ID_PROPAGATION, and 4+ prior SPECs). Go straight to `supabase functions deploy <name> --project-ref <id>` from the local shell. CLI deploy is the fast path; MCP is the deprecated path until OPEN-021 is fixed upstream."
- **Rationale:** Already accepted in spirit by this Foreman review — pattern OPEN-021 has now manifested 7+ consecutive times. The simplified-payload retry is wasted budget. Apply at next skill-improvement cycle. **3-strikes mandate active** — this is the second consecutive review proposing the OPEN-021 streamlining (P1.1 review proposed adding the auto-fallback at all; this one proposes removing the wasted retry step).
- **Source:** EXECUTION_REPORT.md §9 Proposal 1.

### Proposal 2 — Add a `cron.job_run_details` recipe to the SKILL's SQL pattern reference

- **Where:** `.claude/skills/opticup-executor/SKILL.md` — under "Code Patterns — How We Write Code Here" → new "pg_cron debugging recipes" sub-section.
- **Change:** *(Reproduced from EXECUTION_REPORT.md §9 Proposal 2 — accepted verbatim)*
  ```
  ### pg_cron debugging recipes

  - **Query a job's recent run history (jobname is NOT on cron.job_run_details — JOIN cron.job for it):**
    ```sql
    SELECT j.jobname, jrd.status, jrd.return_message, jrd.start_time
      FROM cron.job_run_details jrd
      JOIN cron.job j ON j.jobid = jrd.jobid
     WHERE j.jobname = '<name>'
     ORDER BY jrd.start_time DESC
     LIMIT N;
    ```

  - **Active jobs list:** `SELECT jobid, jobname, schedule, active, command FROM cron.job ORDER BY jobid;`
  ```
- **Rationale:** This SPEC hit the missing-jobname-column error during integration verification — a 30-second hiccup. With M4_BROADCAST_ID_PROPAGATION shipping a new pg_cron job, future SPECs will increasingly touch pg_cron and this recipe will save those minutes repeatedly. Apply at next skill-improvement cycle.
- **Source:** EXECUTION_REPORT.md §9 Proposal 2 + FINDINGS.md FIND-4.

---

## 8. Master-Doc Update Checklist

| Doc | Should have been updated? | Was it? | If not, follow-up needed |
|-----|--------------------------|---------|-------------------------|
| `MASTER_ROADMAP.md` §3 Current State | NO (P1.2 is 3rd of 4 Phase 1 SPECs; cross-module roadmap touches at Phase 1 close after P1.3) | n/a | Picked up when P1.3 closes |
| `docs/GLOBAL_MAP.md` | NO (Integration Ceremony deferred; new columns/FKs/indices + pg_cron + RPC param are M4 internals) | n/a | Next M4 Integration Ceremony |
| `docs/GLOBAL_SCHEMA.sql` | NO (deferred — same) | n/a | Next M4 Integration Ceremony |
| Module 4 `SESSION_CONTEXT.md` | YES (criterion 31) | ✅ Closure paragraph prepended in commit `0d42960` | n/a |
| Module 4 `CHANGELOG.md` | NO (out-of-band SPEC; batch entry at next phase close) | n/a | n/a |
| Module 4 `MODULE_MAP.md` | NO (no new files; existing files modified — buildQueueRows signature change is a 1-line API delta captured in db-schema appendix) | n/a | n/a |
| Module 4 `docs/db-schema.sql` | YES (criterion 32) | ✅ `M4_BROADCAST_ID_PROPAGATION` section appended | n/a |
| `KNOWLEDGE_MAP.md` Layer 5 + Layer 7 | YES (criterion 29) | ✅ Gap #1 + Gap #2 marked RESOLVED with commit reference; tracking-surface table updated for click→broadcast attribution + broadcast counters | n/a |
| `FUNNEL_ROADMAP.md` P1.2 | YES (criterion 30) | ✅ Row flipped PLANNED → ✅ CLOSED with full closure text | n/a |
| `TECH_DEBT.md` | OPTIONAL (FIND-3 → new entry `INFRA-PG-CRON-RUN-DETAILS-RETENTION`) | PENDING — next session that opens TECH_DEBT.md adds the entry | One-line entry; defer to next M4 hygiene SPEC |

**No hard-fail violations.** The only PENDING row (TECH_DEBT entry for FIND-3) is by-design batch-add per project pattern.

---

## 9. Daniel-Facing Summary (Hebrew, ≤ 3 sentences)

> P1.2 ב-Phase 1 של מפת ההמרות סגור 🟢 — שרשרת הייחוס המלאה לקמפיינים שידור (שידור → תור → לוג → קישור קצר → קליק → מסע ליד) רצה בייצור עם broadcast_id בכל חוליה, והמונה של `crm_broadcasts.total_sent` חזר לעבוד דרך משימת pg_cron כל דקה. כל 4 התרחישים על demo עברו, פריזמה לא נגעה (3 שידורים זהה לפני ואחרי), והגאפים מ-Layer 5 (#1 מונה רקוב + #2 broadcast_id לא מועבר) סגורים סטרוקטורלית. נשאר ל-Phase 1 רק P1.3 (`M3_SHORTGY_TO_INTERNAL_REDIRECT`) ואז כל Phase 1 סגור — מוכן לסקירת ניהול.

---

## 10. Follow-ups Opened

- **NEW SPEC stub (deferred until P1.3 lands):** `M3_BROADCAST_ATTRIBUTION_THROUGH_FORM_SUBMIT` (~2 hrs) — closes FIND-2. Wires `broadcast_id` from short_link → resolve-link redirect (append `?b=<id>` to target_url) → storefront form → event-register EF → `register_lead_to_event` 14th param. Cross-repo touch on storefront, hence deferred until P1.3 has set the storefront-side precedents.
- **TECH_DEBT entry (next session that touches `TECH_DEBT.md`):** `INFRA-PG-CRON-RUN-DETAILS-RETENTION` — set 7-day retention via `cron.purge_run_history()` or periodic cleanup. Not urgent. Trivial.
- **NEXT PHASE 1 SPEC UNBLOCKED:** P1.3 `M3_SHORTGY_TO_INTERNAL_REDIRECT` (2-3 hrs) — independent of P1.2's chain. Phase 1 closes when this lands.
- **Skill-improvement application backlog:**
  - Apply Author Proposal #1 (function-signature-change → SPEC_TEMPLATE guidance) at next opticup-strategic session.
  - Apply Author Proposal #2 (smoke pre/post in Pipeline mode → SPEC_TEMPLATE guidance) at next opticup-strategic session.
  - Apply Executor Proposal #1 (skip MCP simplified-payload retry — go straight to CLI on first 5xx) at next opticup-strategic session. **Recurrence: pattern OPEN-021 manifested 7+ times; the harvested rule from P1.1 was applied here but its "retry once with simplified payload" sub-step is now identifiably wasted budget. Streamlining mandatory.**
  - Apply Executor Proposal #2 (pg_cron debugging recipes block) at next opticup-strategic session.

---

## 11. Self-Improvement Mandate Compliance

Per skill mandate: every FOREMAN_REVIEW must carry 2+2 concrete proposals. ✅ Delivered: §6 (Author) + §7 (Executor). Both sets are file+section+exact-change format; both are anchored in real pain points from this SPEC's execution (function-signature DROP at migration 02 + smoke pre/post timing in chain + OPEN-021 7th+ recurrence + cron job_run_details schema gotcha). Neither is cosmetic.

**Recurrence check (the 3-strikes rule):**
- **Pattern OPEN-021** has now manifested 7+ times. The harvested rule from P1.1 is in place (auto-CLI fallback) but its "retry once with simplified payload" sub-step is now identifiably wasted. This is the 2nd consecutive review proposing streamlining of the OPEN-021 path. **Mandatory** to apply Executor Proposal #1 at next opticup-strategic session per the 3-strikes mandate — but the wider rule (auto-CLI on first 5xx) is already in place, so the streamlining edit is a small refinement, not a new architecture.

---

*End of FOREMAN_REVIEW.md.*
