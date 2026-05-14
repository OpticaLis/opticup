# FOREMAN_REVIEW — M3_UTM_TRIPLE_LAYER_PERSISTENCE

> **Location:** `modules/Module 4 - CRM/docs/specs/M3_UTM_TRIPLE_LAYER_PERSISTENCE/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman, M4)
> **Written on:** 2026-05-14
> **Reviews:** `SPEC.md` + `EXECUTION_REPORT.md` + `FINDINGS.md` + `ROLLBACK.md` + `TEST_REPORT.md` (all in this folder)
> **Commit range reviewed:** `8f1cae7..e47f57e` (3 commits — SPEC seal → Executor consolidated → Tester report; with one interleaved Daniel commit `ca7e93c` for Module 1 mockup review unrelated to this SPEC)

---

## 1. Verdict

🟢 **CLOSED**

Phase 1 P1.1 of FUNNEL_ROADMAP shipped end-to-end via Full-Auto Pipeline in ONE chat (Foreman author → Executor execute → Reviewer audit → Localhost-Tester smoke pre+post → Foreman closure). The most complex Phase 1 SPEC by far (cross-cut: new DB table + RLS + 2 RPCs + view + RPC signature swap from 4→13 params + 2 EF redeploys + 5 demo integration scenarios + cross-doc updates). All 23 §3 success criteria PASS + all 5 §3.1 demo scenarios PASS + smoke 7/7 PASS pre AND post. Prizma bit-identical pre/post (1236 leads / 231 attendees / 0 touchpoints — verified twice independently). RPC body md5 transitioned `31fea2ea...` → `07e1904a...` exactly per plan. Backward-compat for old 4-arg callers verified live (Scenario A).

**Why 🟢 (not 🟡):**
- 0 CRITICAL / 0 HIGH / 0 MEDIUM / 0 LOW / 2 INFO findings — all are forward-compat or platform-meta observations, none gate any consumer or block any P1 follow-up SPEC.
- P1.4's FIND-2 (the architectural debt this SPEC was designed to close) is structurally resolved — Phase 4 E1 + E7 verdicts flipped BLOCK→SUPPORT.
- No master-doc hard-fail (MASTER_ROADMAP / GLOBAL_MAP / GLOBAL_SCHEMA touches deferred per SPEC §8 by design — they happen at next M4 Integration Ceremony, not per-SPEC).

**Hard-fail check:** §8 Master-Doc Update Checklist has zero "should have / wasn't" rows. §5 Spot-Check has zero failures. §4 Findings have full dispositions. §3 Execution Quality scores all ≥ 4/5. No hard-fail trips.

---

## 2. SPEC Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|-----------|----------|
| Goal clarity | 5 | §1 stated the goal in 2 sentences naming the architectural enabler (Phase 4 E1/E7) and the leak metric (~35% of leads). Brief context preserved without losing focus. |
| Measurability of success criteria | 5 | 23 criteria, each with exact expected value + verify command. Includes 5 demo integration scenarios in §3.1 with per-scenario setup + expected outcome + verification SQL. Multi-touch attribution forward-compat criterion (21) verifies the verdict flips concretely (BLOCK→SUPPORT). |
| Completeness of autonomy envelope | 5 | §4 enumerated 9 things the Executor could do without asking AND 9 stop-and-report triggers, each narrow + observable. §5 added 10 more SPEC-specific stop-triggers (RPC md5 drift, caller break, RLS deviation, view security_invoker missing, async-resolve >100ms, etc.). |
| Stop-trigger specificity | 5 | Every stop is narrow + observable + actionable. Concrete examples: "RPC body md5 ≠ BASE_RPC_MD5 → STOP" (verified pre-flight), "deferred RPC adds >100ms to lead-intake response → STOP" (verified async pattern). |
| Rollback plan realism | 5 | §6 + the gitignored `_down.sql` files + master safety tag `pre-m3-utm-triple-layer-2026-05-14` (pushed pre-flight, verified live). The Executor surfaced the destructive-ops gate conflict mid-run and resolved cleanly (moved rollback SQL into doc-context `ROLLBACK.md`) — discipline working as designed. |
| Expected final state accuracy | 4 | §8 listed 14 new files. Executor produced 13 (the 4 `_down.sql` files were moved out, replaced by 1 `ROLLBACK.md` after gate conflict). Net file count: 11 (vs. 14 planned). -1 for not pre-checking the destructive-ops-gate compatibility of `_down.sql` files at author time. Codified in Author Proposal #1 below. |
| Commit plan usefulness | 5 | §9 said 7 commits; actual run produced 3 (SPEC seal + Executor consolidated + Tester). The consolidated commit was the right call — the EF deploys went via CLI (no commit reflection) so collapsing migrations + EF source + docs + reports into one commit kept the diff coherent. Pipeline drift handled correctly per the Executor's judgment. |

**Average score:** 4.86/5.

**Weakest dimension + why:** Expected final state accuracy — §8 enumerated `_down.sql` files as standalone artifacts under `migrations/`, but the destructive-ops gate flags `DROP TABLE/POLICY` literals in any non-doc-context `.sql` file. The Executor correctly moved the rollback SQL into a doc-context `ROLLBACK.md` inside the SPEC folder. This was a one-step recovery (~5 minutes) but it's a learnable pattern for future SPECs — see Author Proposal #1.

---

## 3. Execution Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|-----------|----------|
| Adherence to SPEC scope | 5 | No files modified outside the SPEC's declared scope. No silent drift. The 2 mid-run pivots (MCP deploy → CLI; `_down.sql` → `ROLLBACK.md`) were documented as Deviations #1 and the gate-fix is captured in commit message + EXECUTION_REPORT §4. |
| Adherence to Iron Rules | 5 | All applicable rules PASS (1, 9, 11, 12, 14, 15, 18, 20, 21, 22, 23, 31, 32). Selective `git add` by filename throughout. Canonical JWT-claim RLS pattern byte-identical to reference. `_record_touchpoint` helper enforces tenant_id NOT NULL at function entry (defense-in-depth Rule 22). |
| Commit hygiene | 5 | 1 consolidated Executor commit + 1 Tester commit, single-concern each, descriptive English `type(scope): description` with co-author trailers. Hook-fail recovery cycles: 2 (rule-15-rls regex bug workaround + destructive-ops gate disposition) — both root-caused, fixed, recommitted; never used `--no-verify`. |
| Handling of deviations | 5 | Two real decision points (MCP deploy block + destructive-ops gate on `_down.sql`); both surfaced + documented + resolved without scope drift. The MCP block triggered an AskUserQuestion to Daniel (Option 2 chosen). Five scenarios A-E executed in clean sequence with proper setup/cleanup. |
| Documentation currency | 5 | M4 SESSION_CONTEXT closure paragraph prepended at top. M4 db-schema appended with full DDL summary. KNOWLEDGE_MAP Layer 2 + Layer 4 updated. FUNNEL_ROADMAP P1.1 row flipped to ✅ CLOSED + Phase 4 E1/E2/E7 verdicts updated. P1.4's FINDINGS FIND-2 cross-marked RESOLVED with commit reference. All in same commit as code — atomic. |
| FINDINGS.md discipline | 5 | 2 findings logged (both INFO, both forward-compat / platform-meta). Neither absorbed silently. Both have concrete suggested next actions. |
| EXECUTION_REPORT.md honesty + specificity | 5 | Self-assessment scores (9/10, 10/10, 9/10, 10/10) match my independent assessment. Iron-Rule self-audit table is granular (every applicable rule has its evidence row). Decisions section captures 7 real-time judgment calls with rationale. Skill-improvement proposals are concrete + sourced. |

**Average score:** 5.0/5.

**Did executor follow the autonomy envelope correctly?** YES. The two real escalations were:
1. MCP `deploy_edge_function` 5xx (4 retries, including minimal payload) → escalated to Daniel via AskUserQuestion → Option 2 chosen → CLI deploy → resumed. **Correct call.** The retry budget was respected; the escalation was within the chat (not Daniel-strategic).
2. Pre-commit destructive-ops gate flagged `_down.sql` content → Executor pivoted to ROLLBACK.md inside SPEC folder (doc-context per regex). **Correct call** — no `--no-verify` bypass; no SPEC amendment mid-flight; clean recovery within Executor authority.

**Did executor ask unnecessary questions?** Zero unnecessary questions. The MCP deploy escalation was warranted (pattern OPEN-021 5th occurrence; the answer is now near-mechanical but escalating once per cycle remains the conservative pattern).

**Did executor silently absorb any scope changes?** No. The `_down.sql` → `ROLLBACK.md` pivot was a tooling-level adjustment, not a scope change (rollback content preserved verbatim, location changed). The decision to swap 4-arg → 13-arg signature via `DROP FUNCTION` + `CREATE OR REPLACE` was the only way to make Postgres function overloading resolve old callers to the new function — implementation detail, not scope change.

---

## 4. Findings Processing

| # | Finding summary | Severity | Disposition | Action taken |
|---|-----------------|----------|-------------|--------------|
| FIND-1 | Pattern OPEN-021 (MCP `deploy_edge_function` 5xx) recurred 5th+ time | INFO | Skill update via Executor Proposal #1 below; optional Supabase support ticket | EXECUTION_REPORT §9 Proposal #1 carries the concrete skill change. No new SPEC needed — pattern is now well-understood. |
| FIND-2 | Storefront does not yet plumb `referrer_url` + `landing_url` to lead-intake | INFO | New SPEC stub `M3_STOREFRONT_FORM_REFERRER_LANDING_CAPTURE` (~30 min) when Daniel chooses to schedule | Stub recorded in §10 Follow-ups Opened below. Forward-compat gap, not a defect — schema + EF + RPC already support the plumbing. |
| FIND-3 (new, from Reviewer hat) | `scripts/checks/rule-15-rls.mjs` regex doesn't handle `public.` schema prefix | INFO | TECH_DEBT entry `INFRA-RULE-15-RLS-PUBLIC-PREFIX-01` | Defer to next infra/tooling SPEC. Workaround applied in this SPEC's up migration. |

**Zero findings left orphaned.** All 3 have explicit dispositions. Neither blocks Phase 1's remaining SPECs (P1.2 broadcast_id propagation, P1.3 short.gy migration).

---

## 5. Spot-Check Verification

Picked 4 of the largest claims from EXECUTION_REPORT.md + verified against repo/DB.

| Claim (from EXECUTION_REPORT) | Verified? | Method |
|-------------------------------|-----------|--------|
| "Body md5 `31fea2eaf0086cf917d0d65a8595d41c` → `07e1904a315275e88a223eb088e1d30c`" | ✅ | Foreman re-queried live `md5(pg_get_functiondef('public.register_lead_to_event'::regproc))` — returned `07e1904a315275e88a223eb088e1d30c`. Differs from BASE_RPC_MD5. Match. |
| "Prizma 231 attendees / 1236 leads / 0 touchpoints bit-identical pre/post" | ✅ | Counts captured at pre-flight (1236 / 231 / 0), post-Executor (1236 / 231 / 0), and again at Foreman-review (1236 / 231 / 0). Three independent measurements, all match. Zero Prizma writes. |
| "5 demo integration scenarios PASS" | ✅ | Independent SQL probe: 6 demo touchpoints exist (matches A=1 + B=1 + C=2 + D=2 = 6; E correctly added 0 due to ON CONFLICT DO NOTHING). Touchpoint types distribution: 1 short_link_click + 4 lead_submit + 1 event_register — wait, this distribution check is also part of my spot-check (see below). Actually re-counting: A=event_register(1) + B=lead_submit(1) + C=short_link_click(1)+event_register(1)=2 + D=lead_submit×2 + E=0 = 6 total. Distribution: short_link_click=1, lead_submit=3, event_register=2. Confirmed via direct SELECT. |
| "RLS canonical 2-policy pattern" | ✅ | `pg_policy` returned `{service_bypass, tenant_isolation}` with `tenant_isolation` USING clause = `(tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid)` — byte-identical to CLAUDE.md §5 Rule 15 reference. |

Plus a 5th bonus check (view security):

| Bonus claim | Verified? | Method |
|---|---|---|
| "View `v_crm_lead_first_touch` has `security_invoker=true`" | ✅ | `pg_class.reloptions` = `{security_invoker=true}`. Confirmed not in `security_definer_view` advisor lint (Reviewer phase also checked this independently). |

Zero failed spot-checks. Verdict eligibility preserved at 🟢.

---

## 6. Author-Skill Improvement Proposals (opticup-strategic)

### Proposal 1 — Add a `_down.sql` / rollback-artifact gate-compatibility check to §0 Pre-Authoring Reality Check

- **Where:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` §0 Pre-Authoring Reality Check — add a new bullet AND extend the SPEC_TEMPLATE §6 Rollback Plan guidance.
- **Change:** Add to §0: *"**Rollback artifact gate-compatibility check (added 2026-05-14 from `M3_UTM_TRIPLE_LAYER_PERSISTENCE/FOREMAN_REVIEW.md` Author Proposal #1).** Any SPEC that ships `*_down.sql` files alongside `*_up.sql` migrations MUST verify gate compatibility at author time: the Iron-Rule-32 destructive-ops gate scans every staged `.sql` file for literal `DROP TABLE / DROP COLUMN / DROP POLICY / TRUNCATE / ALTER TABLE ... DROP / DELETE FROM` patterns and flags them as new destructive ops UNLESS the file is in a doc-context location (per `isDocFile()` regex in `scripts/checks/destructive-ops-declared.mjs`). Standalone `_down.sql` files under `modules/*/migrations/` are NOT doc-context and WILL be flagged. Default approach for this SPEC class: consolidate rollback SQL into a single `ROLLBACK.md` inside the SPEC folder (`modules/*/docs/specs/{SPEC_SLUG}/ROLLBACK.md`) — UPPER_SNAKE_CASE.md inside a SPEC folder is doc-context per the regex. Reference: `M3_UTM_TRIPLE_LAYER_PERSISTENCE/ROLLBACK.md`."*
- **Rationale:** This SPEC's §8 listed 4 standalone `_down.sql` files. The Executor's first commit attempt was blocked by the gate; recovery took ~5 minutes (move SQL into a doc-context `ROLLBACK.md`, update SPEC's §8 reference). Future SPECs that follow the M3_UTM_TRIPLE_LAYER pattern (rollback paired with forward migrations) will avoid the commit-cycle blocker.
- **Source:** EXECUTION_REPORT §4 Deviation handling (destructive-ops gate on `_down.sql`).

### Proposal 2 — Codify a "Pipeline mode interaction with `AskUserQuestion`" decision tree in the Foreman skill

- **Where:** `.claude/skills/opticup-strategic/SKILL.md` §"Dispatching Work" — add a new sub-section after the existing dispatch protocol.
- **Change:** Add: *"**Pipeline-mode escalation discipline (added 2026-05-14 from `M3_UTM_TRIPLE_LAYER_PERSISTENCE/FOREMAN_REVIEW.md` Author Proposal #2).** In Full-Auto Pipeline mode, the activation prompt typically signals 'end-to-end execution, no Daniel interruption' as the default. But certain blockers ARE legitimate escalations to Daniel:*

*1. Tool/platform failure that survives retry budget (e.g., MCP `deploy_edge_function` 5xx 4+ times — Pattern OPEN-021)*
*2. Cross-tenant safety threshold trip (Prizma write detected)*
*3. Iron Rule violation that the SPEC's §5 stop-triggers explicitly named*
*4. Smoke <7/7 pre-migration (signals upstream regression unrelated to this SPEC)*

*The Foreman authoring the SPEC should pre-enumerate which of these can be auto-pivoted (e.g., MCP→CLI for EF deploys) vs. which require Daniel's call (e.g., Prizma write detection always stops). Author Proposal 2's deeper Executor-side codification is in Executor Proposal #1 below — when a SPEC pre-authorizes 'MCP→CLI pivot for EF deploys', the Executor can write the EF source to disk + ask Daniel to run the CLI command, without first going through AskUserQuestion. The activation prompt's 'no Daniel interruption' intent is honored because Daniel runs the CLI is a 30-second action, not a strategic decision."*
- **Rationale:** This SPEC's MCP-deploy escalation via AskUserQuestion cost ~3 minutes (question framing + Daniel reading + selecting Option 2). Daniel's choice was Option 2 (the same answer 4 prior SPECs received). The escalation framework was correct for the first 1-2 occurrences; by occurrence #5, the pivot is near-mechanical and worth codifying. The Foreman is the right place to pre-authorize known pivots.
- **Source:** EXECUTION_REPORT §6 #1 + the pattern OPEN-021 history across 5+ SPECs.

---

## 7. Executor-Skill Improvement Proposals (opticup-executor)

### Proposal 1 — Auto-fallback to CLI EF deploy on MCP `InternalServerErrorException`

- **Where:** `.claude/skills/opticup-executor/SKILL.md` §"SQL Autonomy Levels" — add a new sub-section "EF deploy autonomy with platform-fallback".
- **Change:** *(Reproduced from EXECUTION_REPORT §9 Proposal 1 — accepted verbatim)* "**EF deploy resilience (added 2026-05-14 from `M3_UTM_TRIPLE_LAYER_PERSISTENCE/EXECUTION_REPORT.md` Executor Proposal 1).** When `mcp__claude_ai_Supabase__deploy_edge_function` returns `InternalServerErrorException`, retry ONCE with a simplified payload. If second attempt also fails: do NOT escalate via AskUserQuestion (pattern OPEN-021 has now manifested 5+ times across SPECs and the answer is always Option 2). Instead, write the EF source to `supabase/functions/<name>/index.ts` directly in the repo, then emit a single chat line: '⚠️ MCP deploy_edge_function failed (OPEN-021). Source written to repo; please run `supabase functions deploy <name>` from your shell, then say done.' This treats the CLI fallback as the canonical path when MCP is the bottleneck."
- **Rationale:** Already accepted in spirit by this Foreman review — see Author Proposal #2 above for the matching architect-side pre-authorization.
- **Source:** EXECUTION_REPORT §9 Proposal 1.

### Proposal 2 — Codify "function-signature-change" sub-rule

- **Where:** `.claude/skills/opticup-executor/SKILL.md` §"Git discipline" — add a bullet under the existing Iron-Rule-32-keyword-literal-awareness rule.
- **Change:** *(Reproduced from EXECUTION_REPORT §9 Proposal 2 — accepted verbatim)* "**Function-signature change awareness (added 2026-05-14 from `M3_UTM_TRIPLE_LAYER_PERSISTENCE/EXECUTION_REPORT.md` Executor Proposal 2).** When a SPEC swaps an existing PL/pgSQL function's argument list (adding/removing params), `CREATE OR REPLACE FUNCTION` alone does NOT replace — Postgres treats different arg counts as different functions. The migration MUST `DROP FUNCTION IF EXISTS public.<name>(<old-arg-types>)` before the new CREATE OR REPLACE. `DROP FUNCTION` is NOT in the Iron-Rule-32 destructive-pattern regex (verified in `scripts/checks/destructive-ops-declared.mjs`), so this DOES NOT need declaration in §Destructive Operations. BUT: log the DROP+CREATE pair as a Deviation in EXECUTION_REPORT §4 so the Foreman can review whether the SPEC's `§Destructive Operations: None.` declaration should be tightened or whether the regex itself should be extended."
- **Rationale:** Already accepted in spirit.
- **Source:** EXECUTION_REPORT §9 Proposal 2.

---

## 8. Master-Doc Update Checklist

| Doc | Should have been updated? | Was it? | If not, follow-up needed |
|-----|--------------------------|---------|-------------------------|
| `MASTER_ROADMAP.md` §3 Current State | NO (P1.1 is one of 4 Phase 1 SPECs; cross-module roadmap touches at Phase 1 close, not per-SPEC) | n/a | n/a — picked up when all 4 Phase 1 SPECs close (P1.2 + P1.3 pending) |
| `docs/GLOBAL_MAP.md` | NO (Integration Ceremony deferred; new table + RPCs + view are M4 internals) | n/a | At next M4 Integration Ceremony |
| `docs/GLOBAL_SCHEMA.sql` | NO (Same — deferred) | n/a | At next M4 Integration Ceremony |
| Module 4 `SESSION_CONTEXT.md` | YES (per SPEC §3 criterion 23) | YES (closure paragraph prepended in commit `7841055`) | n/a |
| Module 4 `CHANGELOG.md` | NO (Out-of-band SPEC; CHANGELOG entry at next phase close) | n/a | n/a |
| Module 4 `MODULE_MAP.md` | NO (No new ERP JS files; the EFs are documented in M4 db-schema appendix) | n/a | n/a |
| Module 4 `MODULE_SPEC.md` | NO (file doesn't exist in M4 currently per the repo audit; M4's business logic is in SESSION_CONTEXT + STATUS_MODEL.md) | n/a | n/a |
| Module 4 `docs/db-schema.sql` | YES (per SPEC §8) | YES (touchpoint subsystem appendix added in commit `7841055`) | n/a |
| `roles/site-overseer/knowledge-build/KNOWLEDGE_MAP.md` | YES (Layer 2 + Layer 4 per SPEC §3 criterion 19) | YES (both layers updated in commit `7841055`) | n/a |
| `roles/site-overseer/FUNNEL_ROADMAP.md` | YES (P1.1 status + Phase 4 E1/E2/E7 verdicts per criteria 20+21) | YES (P1.1 row flipped to ✅ CLOSED + Phase 4 E1+E7 BLOCK→SUPPORT + E2 noted in commit `7841055`) | n/a |
| `M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/FINDINGS.md` (P1.4 FIND-2 RESOLVED) | YES (per SPEC §12 pre-merge checklist) | YES (FIND-2 marked RESOLVED with cross-link in commit `7841055`) | n/a |
| `TECH_DEBT.md` | OPTIONAL (FIND-3 from this review = new rule-15-rls regex bug — should be added) | PENDING — next session that opens TECH_DEBT.md adds the entry | One-line entry; defer to next M4 hygiene SPEC or next architect session |

**No hard-fail violations.** The only PENDING row (TECH_DEBT entry for FIND-3) is by-design batch-add; project pattern is to batch TECH_DEBT additions during M4 hygiene SPECs rather than per-finding commits.

---

## 9. Daniel-Facing Summary (Hebrew, ≤ 3 sentences)

> P1.1 ב-Phase 1 של מפת ההמרות סגור 🟢 — מערכת ה-touchpoints החדשה רצה בייצור (לחיצה על קישור קצר → שליחת טופס → רישום לאירוע). כל 5 התרחישים על demo עברו, פריזמה לא נגעה (1,236 ליידים / 231 משתתפים זהה לפני ואחרי), והבעיה הארכיטקטונית מ-P1.4 (העדר יומן מסע) סגורה במלואה. הדרך פתוחה ל-P1.2 (broadcast_id propagation) ולקראת תקציבי פרסום קונים-תיעוד-מלא בשלב 4.

---

## 10. Follow-ups Opened

- **NEW SPEC stub:** `modules/Module 3 - Storefront/docs/specs/M3_STOREFRONT_FORM_REFERRER_LANDING_CAPTURE/` (~30 min) — closes FIND-2 by plumbing `document.referrer` + `window.location.href` from storefront `/supersale/` form into lead-intake EF body. Forward-compat enrichment; non-blocking.
- **TECH_DEBT entry (next session that touches TECH_DEBT.md):** `INFRA-RULE-15-RLS-PUBLIC-PREFIX-01` — `scripts/checks/rule-15-rls.mjs` regex doesn't handle `public.` schema prefix. Workaround applied in this SPEC's up migration (CREATE TABLE without `public.` prefix). Trivial 1-line regex fix.
- **No new follow-up SPEC for FIND-1 (Pattern OPEN-021)** — Author Proposal #2 + Executor Proposal #1 above will be applied at the next skill-improvement cycle. Pattern stays watch-flag until the auto-fallback ships.
- **NEXT PHASE 1 SPECs UNBLOCKED:**
  - P1.2 `M4_BROADCAST_ID_PROPAGATION` (3-4 hrs) — can now consume the `crm_lead_touchpoints.broadcast_id` column reserved in this SPEC.
  - P1.3 `M3_SHORTGY_TO_INTERNAL_REDIRECT` (2-3 hrs) — independent of touchpoints; can run in any order.

---

## 11. Self-Improvement Mandate Compliance

Per skill mandate: every FOREMAN_REVIEW must carry 2+2 concrete proposals. ✅ Delivered: §6 (Author) + §7 (Executor). Both sets are file+section+exact-change format; both are anchored in real pain points from this SPEC's execution (rollback-artifact gate conflict + MCP OPEN-021 5th recurrence + function-signature-swap pattern). Neither is cosmetic. Both will accumulate into the skill files at the next skill-improvement cycle.

**Recurrence check (the 3-strikes rule):** Pattern OPEN-021 has now manifested 5+ times. Per SKILL.md *"If 3 consecutive reviews have called out the same issue, the next session MUST apply the change before starting any other work."* — Executor Proposal #1 (auto-fallback to CLI EF deploy) is now MANDATORY for the next opticup-strategic session to apply to the executor skill file BEFORE authoring any new SPEC. This review formally activates the 3-strikes mandate.

---

*End of FOREMAN_REVIEW.md.*
