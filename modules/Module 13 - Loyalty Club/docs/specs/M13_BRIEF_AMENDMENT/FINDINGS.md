# FINDINGS — M13 Brief Amendment

**Date:** 2026-05-12
**Severity legend:** 🔴 CRITICAL / 🟠 HIGH / 🟡 MEDIUM / 🟢 LOW / ℹ️ INFO

---

## F1 — 🟡 MEDIUM — Iron Rule 12 file-size violation (pre-existing, expanded)

**File:** `modules/Module 13 - Loyalty Club/architecture-brief/M13_LOYALTY_BRIEF.md`

**Observation:** Pre-amendment line count: 373. Post-amendment line count: 410. Both exceed the Iron Rule 12 absolute max of 350 lines.

**Pre-existing:** YES. The Brief was already 23 lines over the cap before this amendment. The amendment added 37 more lines (basic-free tier sub-section in §2 + D14 row + amendment note in §11). Total breach now 60 lines.

**Cause:** Brief markdown files combine: tier definitions, entity schemas, engine flows, contracts, sketches index, decisions log, future slots, risks, todos, out-of-scope. Single-responsibility per Rule 12 is "one module's architecture" — which is the entire Brief. Splitting it would harm comprehensibility (cross-references, single-source-of-truth for the module).

**Recommendation:** Treat Rule 12 as code-scoped, not docs-scoped. The Sentinel's H-3 alert lists 24 files; if those are all `.js`/`.html`/`.ts` files, the rule is already de-facto code-scoped. Add a clarification to CLAUDE.md Rule 12 stating "applies to code files; markdown documentation governed by single-responsibility-per-file principle without a hard line cap" — but this is a separate SPEC, not for this amendment to author.

**Disposition:** Add to TECH_DEBT.md as `TD-DOCS-RULE-12` — clarify Rule 12 applies to code, not markdown briefs. **NOT** filed as a new SPEC; not blocking; pre-existing condition that the amendment merely expanded by ~10%.

**Action item:** Architect to consider adding a CLAUDE.md clarification next routine session. Until then, M13 Brief stays at 410 lines (expected to grow further as M9 build SPECs reference it).

---

## F2 — ℹ️ INFO — Brief vs Activation Prompt deliverable mismatch

**Files:**
- `M13_BRIEF_AMENDMENT_BRIEF.md` §3 lists 5 files to update
- `M13_BRIEF_AMENDMENT_ACTIVATION_PROMPT.md` (untracked) lists same 5 files PLUS "Standard EXECUTION_REPORT.md + FINDINGS.md + FOREMAN_REVIEW.md"

**Observation:** The Brief's §3 ("Files to Update") doesn't mention the SPEC retrospective trio. The Activation Prompt does. Executor surfaced this discrepancy mid-execution and chose to follow the Activation Prompt (created the SPEC folder + 4 retrospective files).

**Disposition:** Author-side improvement, not a runtime issue. See FOREMAN_REVIEW.md proposal A1.

**Action item:** Brief template should call out retrospective deliverables alongside the user-visible file edits, OR Activation Prompts should not introduce deliverables not in the Brief.

---

## F3 — ℹ️ INFO — Brief uses "D5 in M13_LOYALTY_BRIEF.md" loosely

**File:** `M13_BRIEF_AMENDMENT_BRIEF.md` §2 line 19 + §6 acceptance #1

**Observation:** The Brief Amendment refers to "D5 section" of M13_LOYALTY_BRIEF.md as the location for the new tier definition. However, D5 in M13_LOYALTY_BRIEF.md §11 Decisions Log is the **Enrollment** decision (channel = website only), not the **Tier definition** decision. The actual tier definition lives in §2 "Tiers Prizma" table + §3.2 `loyalty_tier` entity description.

**Resolution applied:** Executor interpreted "D5 section" as "the section where tier definition lives" and added the basic-free tier to §2 (Tiers Prizma table + new sub-section). Added D14 to §11 Decisions Log. Added an "Enrollment clarification" paragraph in the new sub-section noting that paid enrollment remains D5-bound (website only) while basic-free is auto-created and not a real "enrollment" event.

**Disposition:** Author-side improvement. Brief should reference §2 (or "tier definition section") explicitly, not "D5". See FOREMAN_REVIEW.md proposal A2.

---

## Summary

3 findings: 1 MEDIUM (pre-existing, non-blocking), 2 INFO (author-side improvements, applied as proposals to FOREMAN_REVIEW). Zero CRITICAL or HIGH. SPEC closes 🟢.

No new SPECs filed. No TECH_DEBT.md edit performed by this SPEC (the suggested TD-DOCS-RULE-12 entry is a recommendation; Architect to action separately).
