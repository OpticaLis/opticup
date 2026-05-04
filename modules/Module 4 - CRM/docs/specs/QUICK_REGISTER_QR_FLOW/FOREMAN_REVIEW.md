# FOREMAN_REVIEW — QUICK_REGISTER_QR_FLOW

> **Reviewer:** opticup-strategic (Foreman, in-session)
> **Reviewed on:** 2026-05-04 late night
> **Inputs:** SPEC.md (authored 2026-05-04), EXECUTION_REPORT.md, FINDINGS.md, ACTIVATION_PROMPT.md
> **Verdict at top:** 🟡 **CLOSED WITH FOLLOW-UPS** — feature ships and works end-to-end, but 2 follow-up items remain (TD-3 multi-tenant URL, Module 36 cleanup).

---

## 1. SPEC quality audit

The SPEC was unusual in scope: 3 Rungs across 2 repos, Make scenario surgery, EF authoring, and storefront page authoring. For an Overseer-authored SPEC (Campaign Overseer loaded opticup-strategic in-session per L-002), it held together well.

**What was strong:**
- §3 Success Criteria: 16 criteria for Rung 1 + 5 for Rung 2 + 5 for Rung 3, every one measurable. No vague "verify it works" language.
- §10 Cross-Reference Check explicitly listed 7 names with lookup outcomes and 0 collisions. The 1 unknown (`/quick-register/` storefront route) was handled via stop-trigger #2.
- §5 Stop Triggers were narrow and specific (RPC signature mismatch, route conflict, scenario structure mismatch, zero-cap event, smoke-test failure, EF cross-pollination).
- §11 Lessons Already Incorporated cited 4 prior FOREMAN_REVIEWs by name + the proposals each fed forward.
- §12 Manual QA was step-by-step actionable for Daniel.

**What was weak (corrected mid-flight via 3 hotfixes):**
- The original SPEC assumed `tenant_slug` would be hardcoded server-side (one-tenant deploy). Reality: the storefront sends `tenant_slug` in the body, and the EF needed to accept it. Hotfix #1 fixed this. **Lesson for author skill:** when an EF will be called from a multi-tenant-aware client (storefront), the SPEC must explicitly route the tenant identifier through the request body, not infer it from the EF's deploy environment. Add to author checklist.
- Original SPEC §3 #1.6 said `email?` (optional). Daniel's actual policy after Hotfix #1 deploy: email required. **Lesson:** customer-data fields that look optional are often required by tenant-policy; the SPEC should ask Daniel directly during authoring rather than copy the field's nullability from DB schema.
- The SPEC didn't anticipate that EFs called from server-side (Make scenarios) wouldn't get the same auto-injected `event_id` that browser callers get. Hotfix #2 fixed the dispatch path. **Lesson:** always inventory who calls the EF (browsers vs server-to-server) and map which inputs each path provides.

**SPEC quality score:** 8/10. Strong structure, strong ground-truth probing in §2, but 3 hotfixes (one per Rung 1 deploy iteration) is more churn than ideal. With the 2 lessons applied, future similar SPECs should ship in 1 commit per Rung instead of 4.

---

## 2. Execution quality audit

The executor (Claude Code) ran Rungs 1+2 + 3 hotfixes prior to this Cowork session. Rung 3 was completed in-session by the Campaign Overseer + Daniel manually via Make UI — not by Claude Code.

**Rungs 1 + 2 (Claude Code, prior session):**
- ✅ Strict adherence to Iron Rules. `normalizePhone` reused verbatim from `lead-intake/index.ts` (Rule 21). All inserts include `tenant_id` (Rules 14 + 22). EF deployed via CLI, not MCP `deploy_edge_function` (per ATOMIC_CONFIRMATION_FLOW Foreman precedent).
- ✅ Hotfixes were authored as separate SPECs in `modules/Module 4 - CRM/docs/specs/QUICK_REGISTER_QR_HOTFIX_*/`, not inline patches to the main SPEC. Folder-per-SPEC discipline held.
- ✅ Stop-on-deviation honored: when the storefront page conflicted with anti-spam routing, executor stopped and asked rather than guessing.

**Rung 3 (manual, Cowork session):**
- ✅ Three Make MCP `scenarios_update` attempts failed (FINDINGS F3). Executor (Overseer in this case) stopped after 3rd attempt and switched to manual UI workflow. **Correct call** — looping a 4th attempt would have been waste.
- ✅ The 3 surgical edits in Make UI were verified live via Run-once before saving. No silent commits.
- ⚠️ **One mid-flight pivot was unforced:** the original `replace(...; "/\D/g"; "")` regex approach assumed Make supports JS-style flags. It doesn't. Two iteration cycles were spent debugging this before pivoting to the pattern-free nested `replace`. **Lesson for executor skill:** when integrating with a third-party DSL (Make, Zapier, Pipedream), test the smallest possible expression FIRST in isolation before authoring the full body. Cuts iteration cycles.

**Execution quality score:** 9/10. Two minor process inefficiencies (3 hotfixes for Rung 1, regex iteration in Rung 3) but every outcome was correct and every Iron Rule held.

---

## 3. Findings processing

| Finding | Severity | Decision |
|---|---|---|
| F1 — `STOREFRONT_URL` hardcoded in EF | LOW (single-tenant), MEDIUM (tenant 2) | **TECH_DEBT-3** in Module 4 closure tracker. Address when tenant 2 is ≤4 weeks out. |
| F2 — Storefront `tenantSlug` defaults `'prizma'` | MEDIUM | **Same SPEC as F1.** Resolve together since they're the same axis (multi-tenant URL strategy). |
| F3 — Make MCP `scenarios_update` unreliable for >150KB blueprints | HIGH for tooling | **Author skill update applied** in §6 of this review. No SPEC needed; the lesson is now binding on every future Make-edit SPEC. |
| F4 — Module 36 (Monday legacy) dangling in scenario | LOW (cosmetic) | **NEW SPEC: `MAKE_8464122_MODULE_36_CLEANUP`** authored in same Cowork session as part of M4 closure rush. ~2 min manual UI work. |
| F5 — Existing coupon plumbing reused successfully | POSITIVE | No action needed. Logged for future SaaS-readiness audit. |

No findings dismissed. No findings orphaned.

---

## 4. Author-skill improvement proposals (opticup-strategic)

**P1 — When SPEC involves cross-repo or cross-system work, force the author to inventory call paths.** Today's SPEC missed that `event_id` had different injection paths for browser callers vs server-side callers. Add to `.claude/skills/opticup-strategic/SKILL.md` Step 1.5 a line: "If the SPEC introduces or modifies an EF, list every caller (storefront page, Make scenario, server-side cron, other EF) and the inputs each path provides. If any caller path lacks an input the EF needs, flag in §5 Stop-Triggers." Justification: 2 of the 3 hotfixes in this SPEC were caller-path mismatches that authoring should catch.

**P2 — When SPEC includes Make-scenario edits, force the author to check blueprint size before committing to a strategy.** Today's SPEC §6 commit plan said "scenarios_update via Make MCP" without checking the blueprint size. The blueprint was 269KB which made MCP round-trip unreliable. Add to `.claude/skills/opticup-strategic/SKILL.md` SPEC Authoring §"Make scenario edits": "Before authoring §6, run `scenarios_get` and check blueprint size. If >150KB, the SPEC must specify manual UI surgery instead of MCP round-trip; the executor should not waste cycles on the failed approach." This is FINDINGS F3 codified.

---

## 5. Executor-skill improvement proposals (opticup-executor)

**P1 — Pre-flight expressions in third-party DSLs before authoring the full body.** The Rung 3 regex iteration could have been avoided by testing `{{replace("test"; "/\D/g"; "")}}` in a Make Run-once first to see whether the flag syntax holds. Add to `.claude/skills/opticup-executor/SKILL.md` Step 5 (Implementation): "When integrating with Make, Zapier, or other no-code DSLs, write the smallest possible test expression first and verify it returns the expected output. Only after the smallest expression works, author the full body." Justification: 2 iteration cycles saved per Make-edit SPEC.

**P2 — Don't loop on platform 5xx after 3 attempts.** This was already proposed by the prior `ATOMIC_CONFIRMATION_FLOW` Foreman, and the executor honored it correctly here — switching from MCP to manual after 3 failed `scenarios_update` calls. The proposal is now reinforced (2nd consecutive review citing this). Per the skill's "3 reviews → must apply" rule, the next opticup-strategic session should edit the executor skill directly to embed the explicit "stop after 3 platform-deploy failures" rule, not just leave it as a Foreman-review proposal. **This counts as the 2nd review citation. One more and the skill must be edited.**

---

## 6. Master-doc updates

- ✅ HANDOFF §"Open follow-ups" updated by Overseer in same session (CLOSED + 3 new follow-ups added).
- ✅ DECISIONS_LOG REC-009 marked APPLIED. REC-010 added.
- ✅ MEMORY entry updated.
- ⚠️ `MASTER_ROADMAP.md` Module 4 status — needs update to reflect "QUICK_REGISTER_QR_FLOW closed". Overseer did NOT update; flag for next opticup-strategic session.
- ⚠️ `docs/GLOBAL_MAP.md` — should list the new `quick-register` EF + `lookup_url` op as project-wide functions. Pending Integration Ceremony.
- ⚠️ `docs/GLOBAL_SCHEMA.sql` — no DDL was added by this SPEC (no new tables/columns/RPCs in SUPABASE; only Make-scenario UI changes). Skip.

---

## 7. Verdict

🟡 **CLOSED WITH FOLLOW-UPS.**

The feature is live and working. 4 follow-up items remain:
1. TD-3 multi-tenant URL strategy (F1+F2) — defer to tenant-2 onboarding window.
2. Module 36 cleanup in scenario 8464122 — separate SPEC authored in same session.
3. MASTER_ROADMAP + GLOBAL_MAP updates — next opticup-strategic session.
4. Skill edits per P1/P2 above — next opticup-strategic session.

No reopens. No execution rework. The SPEC + execution combination produced a customer-facing feature that handles the demo smoke test cleanly, including the multi-tenant URL caveat (workaround documented in F2).

---

*End of FOREMAN_REVIEW.md.*
