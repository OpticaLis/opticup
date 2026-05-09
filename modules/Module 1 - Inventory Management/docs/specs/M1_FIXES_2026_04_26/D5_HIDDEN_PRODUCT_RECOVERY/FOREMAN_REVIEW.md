# FOREMAN_REVIEW — D5_HIDDEN_PRODUCT_RECOVERY

> **Reviewer:** opticup-strategic (Cowork session)
> **Reviewed on:** 2026-04-26
> **Inputs reviewed:** `SPEC.md`, `EXECUTION_REPORT.md`, commit `402fb20`, live source at `modules/storefront/storefront-products.js:37-44`
> **Verdict:** 🟢 **CLOSED WITH FOLLOW-UP** (the follow-up is a Daniel manual action on demo tenant, not new code)

---

## 1. SPEC Quality Audit

| Aspect | Score | Notes |
|--------|-------|-------|
| Goal clarity | 10 | Two-paragraph goal, both the bug and the recovery path made explicit. |
| Success criteria measurability | 8 | §3.1–§3.6 are measurable. §3.4 ("Product 0004223 is recovered through the Studio UI") is gated on Daniel and the SPEC could have flagged that more clearly. -2. |
| Autonomy envelope | 10 | Clean permitted/forbidden lists. |
| Stop triggers | 10 | Three narrow triggers, all relevant. |
| Out-of-scope discipline | 10 | Excluded D3, D4, the other two `visible` filters, opacity styling, SQL recovery — all the obvious scope creep was pre-emptively closed. |
| Commit plan | 6 | Same defect as C1 — single-commit plan with self-referencing retrospective files. Real flaw, not new. |
| Edit scope precision | 7 | The SPEC §3.1 said "Line 46 removed (the `if (resolved === 'hidden') return false;` line)" — strictly minimal. The activation prompt then expanded to "~9 line edit, removing dead vars + adjusting comment." Both are correct individually; the disagreement created a decision-point for the executor. |

**Net:** SPEC was good but two recurring defects (commit-plan + scope-disagreement-with-activation-prompt). Both harvested into proposals below.

## 2. Execution Quality Audit

| Aspect | Score | Notes |
|--------|-------|-------|
| Adherence to SPEC | 9 | Both declared deviations (scope expansion, hash chicken-and-egg) were rationalized in §3 of the report. The decision to remove dead vars is correct and defensible. |
| Iron Rule compliance | 10 | Spot-check confirmed Rule 21 (the `resolved === 'hidden'` pattern is gone project-wide) and Rule 14/15/22 unchanged-but-honored. |
| Commit hygiene | 9 | Explicit-named adds, message verbatim from SPEC §9, single logical change. -1 for the self-reference workaround. |
| Documentation currency | 10 | ROADMAP rows updated atomically. |
| Autonomy | 10 | Zero questions to Daniel during D5 itself (the C1 question was at session-start and applies to the whole batch). |
| Findings discipline | 10 | No new findings. |

**Spot-check results:**
- `storefront-products.js:37-44` — confirmed: filter has only the brand-exclusion and zero-stock checks, the `resolved === 'hidden'` return is gone, and the WHY-comment block is in place ✅
- `storefront-products.html` (not modified) — `filter-mode` dropdown still includes `<option value="hidden">מוסתר</option>` at the original line, ready to receive newly-visible hidden products ✅
- `resolved-hidden` CSS class still present in the inline `<style>` in `storefront-products.html` ✅
- Project-wide grep for `resolved === 'hidden'` — 0 hits in JS files (only matches in old SPEC docs) ✅

## 3. Findings Processing

The executor reported no FINDINGS.md. One pre-existing observation worth
logging here (not in scope for D5):

- **The other two `visible` filters** (excluded brand, zero-stock full-sync) still cut products out of the Studio UI. Same UX class as D5 — admins can lose visibility into products that need attention. **Action:** queue a follow-up SPEC `STUDIO_VISIBILITY_FILTERS` to relax those for the management UI (with a "show all / hide unmanageable" toggle). Logged here, not a blocker for closing D5. Severity: MEDIUM.

## 4. Author-Skill Improvement Proposals (opticup-strategic)

### Proposal #1 — SPEC must list dead-var consequences when authorizing a deletion
**Where:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` §3 Success Criteria sub-section.
**Change:** When a SPEC removes lines or branches from a function, the author MUST trace forward 5–10 lines and list any local variable, helper, or branch that becomes dead code as a result. Each becomes its own success criterion (e.g., "§3.1 line 46 removed; §3.1.1 lines 44-45 dead and also removed; §3.1.2 comment block on lines 37-40 rewritten as WHY-comment").
**Why this exists:** today's SPEC said "remove line 46." That left lines 44-45 (`brand`/`resolved` lookups) as dead vars. The activation prompt I authored AFTER the SPEC caught this and expanded scope — but the SPEC itself should have done it. Two layers disagreeing forced an "I'll choose the activation prompt because it's later" decision the executor had to make on the fly. The SPEC should be self-sufficient.

### Proposal #2 — Activation prompt is part of the SPEC, not a separate artifact
**Where:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` (add a new §X "Activation Prompt").
**Change:** The activation prompt MUST live as a section inside the SPEC.md, not as a sibling `ACTIVATION_PROMPT.md`. When two artifacts can disagree, they will disagree. Co-locating them forces the author to keep them in sync — and keeps the dispatcher's instructions versioned alongside the success criteria.
**Why this exists:** today the SPEC.md said one thing about edit scope and the standalone `ACTIVATION_PROMPT_C1_D5.md` said another. The executor (correctly) chose the later artifact, but it's a fragile heuristic. The structural fix is to stop treating them as separate things.

## 5. Executor-Skill Improvement Proposals (opticup-executor)

Forwarding the executor's own two proposals from EXECUTION_REPORT §8 (precedence rule for SPEC-vs-activation-prompt scope disagreement, and the verify-script delta-files printing). Both are concrete and derived from real pain — accept both. The first one becomes obsolete if my Proposal #2 above lands (no separate activation prompt → no precedence ambiguity), but until then the executor's rule is the right interim defense.

## 6. Master-Doc Update Checklist

- [x] `ROADMAP.md` — D5 row + Progress Tracking row updated by executor.
- [ ] `MASTER_ROADMAP.md` — not touched. D5 is a bug-fix inside Module 3 (Storefront, currently in late phase B/post-DNS). No phase moved.
- [ ] `docs/GLOBAL_MAP.md` — not touched. No new function added.
- [ ] `docs/GLOBAL_SCHEMA.sql` — not touched. No DB change.
- [ ] `docs/CONVENTIONS.md` — **suggested follow-up:** add a short note "Management UIs MUST NOT mirror public-view filters that hide rows — admins need to see filtered-out rows to manage them." Closes the design pattern that caused this bug. Logged for next housekeeping pass; not a blocker.
- [ ] Module 3 `MODULE_MAP.md` — not touched. `loadStorefrontProducts` signature unchanged.

## 7. Verdict

🟢 **CLOSED WITH FOLLOW-UP.** The code fix is complete and verified. Closure
is gated on Daniel performing the manual UI recovery of product 0004223 on
demo tenant per SPEC §3.4. The follow-up SPEC `STUDIO_VISIBILITY_FILTERS`
(see §3 above) is queued but optional.
