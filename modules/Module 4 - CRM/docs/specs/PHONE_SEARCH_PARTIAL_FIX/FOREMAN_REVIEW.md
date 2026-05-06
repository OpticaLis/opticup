# FOREMAN_REVIEW — PHONE_SEARCH_PARTIAL_FIX

> **Location:** `modules/Module 4 - CRM/docs/specs/PHONE_SEARCH_PARTIAL_FIX/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman hat)
> **Written on:** 2026-05-06 (BACKFILL — SPEC closed 2026-05-04; retroactive review per M4_CLOSURE)
> **Reviewed:** SPEC.md (2026-05-04) + EXECUTION_REPORT.md + FINDINGS.md (1 finding, INFO)
> **Commit range:** `7f02463..f13888a` (1 fix + 1 retrospective)

---

## 1. SPEC Quality Audit

**Verdict: 🟢 EXCELLENT.**

Live-reproduce-the-bug-first applied: §2 quoted actual code lines (145-152) of `crm-leads-tab.js` and the `normalizePhone` body in `crm-helpers.js` (31-42), pinpointed the `digits.length === 10` gate as the root cause. §3 has 10 measurable success criteria including 5 manual-QA variants (full match + 3 regression checks + the `0` single-char broad-match guard). §4 + §7 together explicitly carve out the cross-tab scope question with a clean Foreman pre-decision in the dispatch.

**One small flaw:** §3.7 said "search-side helper, NOT in `normalizePhone` itself (preserve normalize semantics for INSERT paths)." This guidance is correct but is a project-level convention worth promoting to `docs/CONVENTIONS.md` so future SPECs don't have to re-discover it. Same for the Rule-9 grey-zone discussion of hardcoded `'+972'` — Israeli-only assumption is project-wide and undocumented.

**Severity rollup:** 0 issues that broke execution; 2 minor convention-codification gaps.

---

## 2. Execution Quality Audit

**Verdict: 🟢 EXCELLENT — 9.6/10 self-assessed; matches my independent assessment.**

### Adherence
- 1-line search-side patch shipped without functional deviation. All 5 manual QA variants confirmed by Daniel on prizma.
- Iron Rule 22 (avoiding write-path corruption): `normalizePhone` in `crm-helpers.js` was NOT modified — correctly preserved the rejection-on-partial behavior for write-side consumers (lead-intake EF + form validation).
- Iron Rule 12 (file size 350 cap): one commit-retry cycle to tighten the patch from 357 lines → 350 lines (file-cap exactly). See real-time decision below.
- Single fix commit (`f13888a`) + standard retrospective.

### Deviations
None functional. One execution-time tightening (1st patch attempt → 357 lines → blocked by hook → tightened to 350/350 = at-cap warning → landed). No behavior change between attempts; just denser code (chained `var` + single-line return).

### Real-time decisions (§4 of EXECUTION_REPORT)
1. **Dispatch wins over SPEC §4 stop trigger when dispatch pre-decides scope.** SPEC §4 said "STOP, ask Foreman whether to widen scope" for cross-tab matches; dispatch said "list but DO NOT modify, log as out-of-scope finding". Executor correctly applied dispatch authority. ✓
2. **Iron Rule 12 line-count semantics empirical:** `wc` and pre-commit hook differ by 1 (hook counts trailing newline as a line). Executor tightened patch until both reported ≤350. ✓ Surfaces as a real CLAUDE.md gap.
3. **`sPartial972` upper bound = 10 inclusive** (overlaps with `sNorm` at length=10; harmless redundancy beats off-by-one edge). ✓ Defensible.

### Spot-check verifications I ran
- `git show f13888a` → 1 file changed, 1 line replaced. ✓
- `wc -l modules/crm/crm-leads-tab.js` → 350 lines (at hard cap). ✓
- The patch logic: typing `05056` → `s='05056'`, `s.length>=2 && s.charAt(0)==='0'` → `sPartial972='972' + '5056'` = `'9725056'` → `phone.indexOf('9725056')` matches `'+972505636387'` (the stored E.164). ✓ Logically sound.

---

## 3. Findings Disposition

| Code | Severity | Description | Foreman decision | Rationale |
|------|----------|-------------|------------------|-----------|
| M4-INFO-INCOMING-PHONE-01 | INFO | `crm-incoming-tab.js:109` has the identical partial-Israeli-phone-search bug | **NEW_SPEC** (small follow-up; tracked as a TECH_DEBT entry until then) | Direct user-visible regression on a different tab. Operators will hit it when triaging incoming leads. The fix is the same 1-line ternary as in `f13888a` — trivially scoped. SPEC slug suggestion: `INCOMING_TAB_PHONE_SEARCH_PARITY`. |

**This is the only finding from all 4 backfill SPECs that warrants a follow-up SPEC.** Logged in M4_CLOSURE_AND_INTEGRATION_CEREMONY's Findings → TECH_DEBT migration.

---

## 4. Master Doc Update Checklist

| File | Touched? | Status |
|------|----------|--------|
| `MASTER_ROADMAP.md` | No | ✅ Correctly skipped |
| `docs/GLOBAL_MAP.md` | No | ✅ Correctly skipped (no new functions/contracts) |
| `docs/GLOBAL_SCHEMA.sql` | No | ✅ Correctly skipped |
| `MODULE_MAP.md` / `CHANGELOG.md` | No | ✅ Verified retroactively in M4_CLOSURE commit 5 |
| `SESSION_CONTEXT.md` | No (post-merge) | ✅ |

---

## 5. Author-Skill Improvement Proposals (opticup-strategic)

### Proposal 1 — Iron Rule 12 line-count semantics in CLAUDE.md

**Where:** `CLAUDE.md` §4 Rule 12 OR `.claude/skills/opticup-strategic/SKILL.md` (one canonical home).

**Change:** Add: *"Iron Rule 12 line-count semantics: the pre-commit hook counts `content.split('\n').length`, which is `wc -l + 1` for files ending with `\n`. The hard cap is 350 by hook count. Plan SPEC patches to land at `wc -l ≤ 349` to leave 1 line of breathing room. Files at the hook's 350 boundary will commit but warn."*

**Rationale:** This SPEC's executor hit the hook-vs-`wc` 1-line gap and had to tighten the patch from 16 lines net to 2 lines net. Codifying the semantics saves one commit-retry cycle per cap-adjacent SPEC. Same gap will trip future SPECs without explicit guidance.

**Source:** EXECUTION_REPORT §3 + §5 + executor Proposal 1.

### Proposal 2 — Codify dispatch-vs-SPEC precedence

**Where:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` §4 Autonomy Envelope.

**Change:** Add to §4 guidance: *"When the SPEC's stop triggers and the dispatch (ACTIVATION_PROMPT or in-chat task) appear to disagree, the dispatch wins. The dispatch is the Foreman's deterministic pre-resolution of an abstract SPEC policy. Executor logs the divergence as an INFO finding so the Foreman can decide whether to tighten the SPEC template (avoid the disagreement next time) or whether dispatch-time overrides are routine."*

**Rationale:** This SPEC's §4 said "STOP, ask Foreman" for cross-tab matches; dispatch pre-resolved with "list but DO NOT modify". Codifying precedence prevents the next executor from freezing on a SPEC trigger that the Foreman has already overridden. Mirrors POST_4 SPEC's same pattern (activation-prompt grep count vs SPEC §10).

**Source:** EXECUTION_REPORT §4 Decision 1 + executor Proposal 2.

---

## 6. Executor-Skill Improvement Proposals (opticup-executor)

The executor proposed 2 of its own (EXECUTION_REPORT §8). Both endorsed.

### Proposal 1 (executor-suggested) — Iron Rule 12 line-count semantics in SKILL
**Endorsed:** Yes — pairs with my Author Proposal 1.

### Proposal 2 (executor-suggested) — Dispatch-vs-SPEC precedence + INFO finding
**Endorsed:** Yes — pairs with my Author Proposal 2. **Note:** the same proposal-pair appeared in POST_4_LEADS_PAGINATION_BUMP's review. **2-occurrence pattern.** Per the project's "3-occurrence rule applies, but 2 occurrences is a heads-up", flag for the next opticup-strategic session: if any further SPEC surfaces dispatch-vs-SPEC ambiguity, this becomes 3-occurrence and must be applied immediately.

---

## 7. Verdict

🟡 **CLOSED WITH FOLLOW-UPS.**

**Closed:**
- PHONE_SEARCH_PARTIAL_FIX SPEC complete; Daniel-confirmed all 5 manual QA variants on prizma.
- 2 commits on `develop` (`f13888a` fix + retrospective). Already merged to main.
- This review is RETROSPECTIVE — no rework needed for this SPEC's scope.

**Follow-up:**
- **M4-INFO-INCOMING-PHONE-01** — identical bug in `crm-incoming-tab.js:109`. NEW_SPEC slug suggested: `INCOMING_TAB_PHONE_SEARCH_PARITY`. Logged in M4_CLOSURE's TECH_DEBT migration so it's not forgotten when the maintenance phase opens.
- **Dispatch-vs-SPEC precedence:** 2-occurrence pattern (this SPEC + POST_4). Apply to skill files if a 3rd occurrence surfaces.

*End of FOREMAN_REVIEW.*
