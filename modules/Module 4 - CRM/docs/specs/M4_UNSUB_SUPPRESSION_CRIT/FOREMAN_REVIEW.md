# FOREMAN_REVIEW — M4_UNSUB_SUPPRESSION_CRIT

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_UNSUB_SUPPRESSION_CRIT/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman hat)
> **Written on:** 2026-05-06
> **Reviewed:** SPEC.md (2026-05-06) + EXECUTION_REPORT.md (2026-05-06) + FINDINGS.md (3 findings)
> **Commit range:** `b35b6f6..dc02375` (1 fix + 1 retrospective)

---

## 1. SPEC Quality Audit

**Verdict: 🟡 GOOD WITH 2 FIXABLE FLAWS.**

### What the SPEC got right
- Root cause documented at code level before authoring §3 — Step-0 Reproduce-The-Bug-First satisfied (Phase 2 T14-CRIT-1 evidence: lead `b52e8fbc` unsubscribed at 12:57:54Z, follow-up SMS sent at 12:57:55Z).
- Architecture decision (all-channels suppression) explicitly stated and justified — defense in depth applied (`unsubscribed_at IS NOT NULL` OR `status='unsubscribed'`).
- 3 plumbing options offered (a/b/c) with executor latitude — Bounded Autonomy preserved.
- §11 Cross-Reference Check confirmed "0 collisions" before authoring.
- §10 CLI deploy fallback embedded the exact command — applying the prior FOREMAN_REVIEW's Proposal 2 in real time. Saved executor ~30s when MCP failed.
- Iron Rule 22 (defense in depth) explicitly invoked in §11 with its codification in the gate logic.
- Whitelist enforcement hard-gated in §3 + §4 + §6 cleanup.

### What the SPEC got wrong (executor-flagged)

**Flaw 1 — Phantom template slug in §10/§12 (`event_registration_open`).**
The SPEC told the executor "POST to send-message: tenant=demo, lead_id=<test_lead>, channel=`sms`, template_slug=`event_registration_open`". That slug does not exist in `crm_message_templates`. The actual slug catalog has `event_registration_confirmation_*`, `event_registration_form_*`, etc. Cost: a few minutes of executor lookup + substitution to `event_coupon_delivery_sms_he`.

**Same root cause as `M4_PUBLIC_FORM_VARIABLES_HIGH/FOREMAN_REVIEW` Flaw 2** (phantom column references): SPEC author cites names from memory rather than from a confirmation query. The prior review's Proposal 1 (column nullability check) covered `\d <table>` for column metadata — it does NOT cover catalog row existence (slugs, RPCs by name, T-constants). **2nd consecutive review surfacing this exact gap.**

**Flaw 2 — Line-count budget (§3 #4) too aggressive.**
The SPEC asked for ≤25 lines changed in `send-message/`. The chosen option-(a) path required:
- 1 SELECT widening in `lead-variables.ts`
- Function signature change `Promise<void>` → `Promise<{...}|null>`
- 3 early-return rewrites
- New `loadLeadForSuppression`-style return shape
- Gate insertion in `index.ts` (~14 lines)

Even the leanest path lands at 33 lines. The executor inlined a 5-line type alias to save 5 lines (38 → 33), but that's trimming gymnastics, not architecture. The "2 logical edits" intent in §3 #4 is correct; the line-count threshold was off by ~10.

### What the SPEC got missing
- Nothing critical — the §10 CLI fallback (harvested from the prior FOREMAN_REVIEW) was the major recovery aid and it was present.

### Severity rollup
- 0 issues that broke execution
- 2 issues that cost ~5 minutes total
- Both flaws are actionable into skill improvements (see §5)

---

## 2. Execution Quality Audit

**Verdict: 🟢 EXCELLENT — 9.5/10 self-assessed; matches my independent assessment.**

### Adherence
- Both edits applied verbatim. Verified via `git show 177c93c`:
  - `lead-variables.ts` line 23 SELECT widened ✓
  - `index.ts` gate inserted between line 158 (post-injectLeadVariables) and line 163 (pre-auto-URLs) ✓
- Iron Rule 12 (file size): `index.ts` 317 → 332, `lead-variables.ts` 43 → 47, both under 350 hard cap ✓
- Iron Rule 31 (integrity gate): ran 4× (start, post-edit, pre-fix-commit, pre-retro-commit). All PASS. ✓
- Iron Rule 22 (defense in depth): the gate checks BOTH `unsubscribed_at IS NOT NULL` AND `status='unsubscribed'` exactly as SPEC §11 prescribed ✓
- Iron Rule 14 (tenant_id): the rejection-row insert writes `tenant_id` explicitly ✓
- Whitelist enforcement: 0 prizma writes; all messages routed to `0537889878` ✓
- Stop-trigger discipline: stopped on 2nd MCP failure exactly per SPEC §5. No looping. ✓

### Deviations (3 documented in §3 of EXECUTION_REPORT)
1. **§3 #4 line count overshoot (33 vs ≤25):** the SPEC's arithmetic was off; executor's choice to keep readability over chasing the threshold is correct discipline. ✓
2. **CLI deploy instead of MCP:** authorized by SPEC §5 (3rd OPEN-021 occurrence). ✓
3. **Substituted `event_coupon_delivery_sms_he` for the phantom `event_registration_open`:** correct mid-flight adaptation; logged as Finding 1. ✓

### Real-time decisions (§4 of EXECUTION_REPORT)
1. **Option (a) chosen** (signature-change pattern) over option (b) (2nd SELECT): correct under Bounded Autonomy. Single SELECT is faster on hot path; signature change is small + private. ✓
2. **Soft-delete-then-recreate for Test 4** (re-using whitelist phone): handled the unique-active-phone constraint cleanly. Logged as Finding 2 for skill memory. ✓
3. **Inlined the 5-line type alias** when diff exceeded threshold: pragmatic. ✓

### Spot-check verifications I ran
- `git log b35b6f6..HEAD --oneline` → 2 commits, hashes match. ✓
- `git diff b35b6f6 177c93c -- supabase/functions/send-message/` → 33-line net change matches §2 of EXECUTION_REPORT. ✓
- `get_edge_function('send-message')` → `version=19, status=ACTIVE, ezbr_sha256=6d5a6b6f...` matches the report. ✓
- Inspected the suppression gate code in `send-message/index.ts` v19 source: gate sits AFTER `injectLeadVariables` and BEFORE `injectAutoUrls`/`injectEventVariables` exactly per SPEC §8. The ordering matters because we want to short-circuit BEFORE generating an unsubscribe URL or running event lookups for a suppressed lead. ✓
- 4 demo test results verified at the message_log row level: Test 1 + 2 = `status='rejected'`, `error_message='lead_unsubscribed'`, `template_id=NULL`, `content=""`; Test 3 + 4 = `status='sent'`. All 4 match SPEC §3 #5-8. ✓

---

## 3. Findings Disposition

| Code | Severity | Description | Foreman decision | Rationale |
|------|----------|-------------|------------------|-----------|
| M4-DOC-04 | LOW | SPEC §10 cited template slug `event_registration_open` that doesn't exist | **APPLY to opticup-strategic SKILL — extend Step 1.5 sweep to catalog rows** | Same root cause as M4-DOC-02 from prior review. **2-occurrence pattern → apply now, don't just propose.** See §5 Proposal 1. |
| M4-INFRA-04 | LOW | `crm_leads_tenant_phone_active_uniq` constraint requires soft-delete-then-recreate when re-using whitelist phone in tests | **DISMISS as constraint-design — codify mini-recipe in opticup-executor SKILL** | Constraint is production-correct (prevents duplicate active leads per phone per tenant). The recipe is now muscle memory; one paragraph in the executor skill makes it explicit for future executors. See §6 Proposal 2. |
| M4-INFRA-05 | MEDIUM | Supabase MCP `deploy_edge_function` 5xx — **3rd occurrence in 14 days** | **APPLY immediately — 3-occurrence rule triggers** | The prior FOREMAN_REVIEW already proposed `docs/TROUBLESHOOTING.md` entry + opticup-strategic SKILL §10 template. The §10 part was applied (this SPEC's §10 has the CLI command verbatim and it worked). The TROUBLESHOOTING entry is now overdue. **Per opticup-strategic Self-Improvement Mandate "3 reviews → must apply", the next opticup-strategic session MUST apply both pieces before starting any other work.** See §5 Proposal 3. |

**No findings re-opened the SPEC.** The fix is correct, deployed, verified.

---

## 4. Master Doc Update Checklist

| File | Touched in this SPEC range? | Status |
|------|----------------------------|--------|
| `MASTER_ROADMAP.md` | No — no phase boundary | ✅ Correctly skipped |
| `docs/GLOBAL_MAP.md` | No — no new public functions/contracts (signature change on private helper does not count) | ✅ Correctly skipped |
| `docs/GLOBAL_SCHEMA.sql` | No — no schema change | ✅ Correctly skipped |
| `modules/Module 4 - CRM/docs/MODULE_MAP.md` | No — no new exported function name (signature widened on existing private function) | ✅ Correctly skipped per executor judgment |
| `modules/Module 4 - CRM/docs/CHANGELOG.md` | Yes — appended hotfix line | ✅ Verified in commit 177c93c |
| `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` | Yes — Today line updated | ✅ Verified |
| `modules/Module 4 - CRM/ROADMAP.md` | No | ✅ Not in scope |

**Master-doc state at SPEC close: aligned with executed work. No drift.**

---

## 5. Author-Skill Improvement Proposals (opticup-strategic)

### Proposal 1 — Extend Step 1.5 Cross-Reference sweep to catalog ROWS, not just objects

**Where:** `.claude/skills/opticup-strategic/SKILL.md` §"Step 1.5 — Cross-Reference Check (MANDATORY)" — extend bullet 2.

**Change:** Currently bullet 2 covers grep against authoritative sources for *names* (tables, columns, RPCs, functions). Add a sub-bullet 2d:
> *"For every named CATALOG ROW the SPEC will cite (template slug, RPC by name, T-constant value, FIELD_MAP key, view name, automation rule slug), run a confirmation `SELECT` against the appropriate catalog table:*
> *- Template slugs → `SELECT slug FROM crm_message_templates WHERE tenant_id=? AND slug=?`*
> *- RPCs by name → `SELECT proname FROM pg_proc WHERE proname=?`*
> *- T-constants / FIELD_MAP → grep `shared.js`*
> *- Automation rule slugs → `SELECT slug FROM crm_automation_rules WHERE tenant_id=? AND slug=?`*
> *Phantom catalog rows in SPEC §10/§12 force the executor to invent substitutes mid-run — the SPEC is no longer authoritative for that step."*

**Rationale:** This is the SECOND consecutive review surfacing this exact gap (M4-DOC-02 was columns, M4-DOC-04 is template slugs). The prior review's Proposal 1 covered `\d <table>` for object metadata; this extends it to catalog rows.

**Source:** Finding M4-DOC-04 + prior review M4-DOC-02. **2-occurrence pattern → apply directly, don't keep proposing.**

### Proposal 2 — Honest line-count budgeting heuristic

**Where:** `.claude/skills/opticup-strategic/SKILL.md` §"SPEC Authoring Protocol" — add a paragraph to the §3 success-criteria authoring guidance.

**Change:** Add:
> *"When asserting a line-count threshold in §3, account for the mechanical cost of any signature changes the SPEC will require. Function-signature widening typically adds 5-7 lines (early-return rewrites, return-type declaration, downstream consumer threading). If you can't budget honestly, drop the line-count criterion and replace with a 'logical edits = N' criterion that the executor can satisfy by intent rather than by line-counting."*

**Rationale:** This SPEC's §3 #4 ≤25-line target was logically unreachable. The executor burned ~3 minutes inlining a type alias to gain 5 lines, when the SPEC's premise was just off. Tighter budgets force trimming gymnastics that erode readability without any functional benefit.

**Source:** EXECUTION_REPORT §3 Deviation #1 + §4 Decision #3.

### Proposal 3 — APPLY (not propose) the TROUBLESHOOTING.md entry for MCP-deploy 5xx

**Where:** `docs/TROUBLESHOOTING.md` — add new section "Edge Function deploy fails with InternalServerErrorException".

**Change:** Add:
> *"### Supabase MCP `deploy_edge_function` returns `InternalServerErrorException`*
>
> *3-occurrence pattern documented (ATOMIC_CONFIRMATION_FLOW 2026-05-04, M4_PUBLIC_FORM_VARIABLES_HIGH 2026-05-06, M4_UNSUB_SUPPRESSION_CRIT 2026-05-06). MCP deploys returns 5xx; CLI deploys from the same source succeed. Workaround:*
>
> *```*
> *cd C:\\Users\\User\\opticup*
> *supabase functions deploy <slug> --project-ref tsxrrxzmdxaenlvocyit*
> *```*
>
> *Add `--no-verify-jwt` ONLY if the deployed config is `verify_jwt=false`. Confirm via Supabase MCP `get_edge_function(<slug>)` before adding the flag — mismatch will silently change the EF's auth posture.*
>
> *SPEC authors: when authoring any SPEC that includes EF deploy, embed this CLI command verbatim in §10 Dependencies as the §5 stop-trigger fallback path."*

**Rationale:** **3-occurrence rule triggered.** The prior FOREMAN_REVIEW proposed it; this review applies it directly per the Self-Improvement Mandate.

**Source:** Finding M4-INFRA-05 + 2 prior reviews documenting the same pattern.

---

## 6. Executor-Skill Improvement Proposals (opticup-executor)

The executor proposed 2 of its own. I'm forwarding both with my endorsement, plus 1 derived from M4-INFRA-04 (test recipe).

### Proposal 1 (executor-suggested) — Catalog-row pre-flight check
**Where:** `.claude/skills/opticup-executor/SKILL.md` §"Step 1.5 — DB Pre-Flight Check"
**Change:** Add bullet 5b — *"For every template slug, RPC name, T-constant, view name, or automation rule slug the SPEC's QA plan cites, run a confirmation `SELECT` against the appropriate catalog. If the cited row does not exist, substitute the closest valid alternative AND log a finding so the SPEC author can fix the reference."*
**Endorsed:** Yes. Mirror of my Author Proposal 1.

### Proposal 2 (executor-suggested) — Honest line-count budgeting
**Where:** `.claude/skills/opticup-executor/SKILL.md` §"Bounded Autonomy — Execution Model"
**Change:** Add paragraph — *"If a SPEC §3 success criterion specifies a line-count threshold AND requires a function-signature change, mentally budget +5-7 extra lines for mechanical signature-update cost. If the change exceeds threshold by less than that mechanical cost, document the deviation in EXECUTION_REPORT §3 — do NOT trim past readability to hit the number. The SPEC's intent (logical edits) is what counts."*
**Endorsed:** Yes. Mirror of my Author Proposal 2.

### Proposal 3 (Foreman-derived from M4-INFRA-04) — Whitelist-phone test recipe
**Where:** `.claude/skills/opticup-executor/SKILL.md` §"Bounded Autonomy — Execution Model" or new §"Common Test Patterns"
**Change:** Add: *"When a QA plan requires multiple sequential test leads with the same whitelist phone (`0537889878` or `0503348349`), navigate the `crm_leads_tenant_phone_active_uniq` constraint via the soft-delete-then-recreate pattern: (1) soft-delete the prior test lead's `is_deleted=true`; (2) INSERT the next one. The constraint is partial UNIQUE WHERE NOT is_deleted, so soft-deleted rows do not block. Idempotent cleanup at end-of-run uses `UPDATE crm_leads SET is_deleted=true WHERE phone=<whitelist> AND created_at >= START_TIMESTAMP`."*
**Source:** Finding M4-INFRA-04. Codifies a recipe that's now used in 2+ SPECs.

---

## 7. Verdict

🟢 **CLOSED.**

**Closed:**
- M4_UNSUB_SUPPRESSION_CRIT SPEC complete; `send-message` v19 active in production for both prizma + demo; 4 demo E2E tests GREEN; CRITICAL T14-CRIT-1 regulatory exposure CLOSED.
- 2 commits on `develop` (`177c93c` + `dc02375`). Awaiting Daniel-only merge to main.

**Action items for the next opticup-strategic session (per Self-Improvement Mandate — apply, don't defer):**
1. **APPLY Proposal 3 NOW** (TROUBLESHOOTING.md entry for MCP deploy 5xx) — 3-occurrence rule triggered.
2. **APPLY Proposal 1 NOW** (Step 1.5 catalog-row check) — 2-occurrence rule for opticup-strategic SKILL.
3. **APPLY Proposals 1+2+3 from §6 to opticup-executor SKILL** (catalog row pre-flight, line-count budgeting, whitelist test recipe) — accumulated from this review and the prior one.
4. Daniel-only: merge `develop` → `main` after morning monitoring confirms `send-message` v19 stable. The fix is live for prizma the moment v19 deployed (already happened); the merge is source-tree bookkeeping.

**Production status confirmed:** v19 of `send-message` ACTIVE on tsxrrxzmdxaenlvocyit. Customers who unsubscribe NOW will not receive subsequent messages. CAN-SPAM-equivalent regulatory exposure is closed.

*End of FOREMAN_REVIEW.*
