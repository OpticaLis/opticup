# FOREMAN_REVIEW — D3+D4 Phase B (B-1 + B-2)

> **Reviewer:** opticup-strategic (Cowork session)
> **Reviewed on:** 2026-04-26
> **Inputs:** `B1_DEAD_CODE_MAPPING.md`, `EXECUTION_REPORT_PHASE_B.md`, commits `2556392`, `abf9fcc`, `f3c2e8c`, live source at `modules/storefront/storefront-products.js`.
> **Verdict:** 🟡 **CLOSED WITH FOLLOW-UP** — D3 fully resolved; D4 column-write resolved but value-space mismatch surfaced as a new finding requiring a small follow-up SPEC before B-3.

---

## 1. SPEC + Decision Quality Audit

| Aspect | Score | Notes |
|--------|-------|-------|
| Two-phase structure (investigate → decide → act) | 10 | Worked exactly as designed. Phase A surfaced the schema duplication; RECONCILIATION_DECISION committed Option 2; Phase B executed. |
| Activation prompt clarity | 8 | Stop triggers were specific enough that the executor honored them. -2: the "live Brands file" rename instruction was ambiguous given B-1's discovery; the escape clause saved the case but only by luck. |
| Sub-step splitting | 10 | B-1 separating "identify dead-code" from B-2 "rename" prevented the wrong file from being touched. Validated discipline. |
| Value-space oversight | 5 | **Real defect.** The decision document and activation prompt both treated this as a column-rename problem. They ignored the dropdown-value-vs-LEGACY-value-space mismatch (`catalog/shop/hidden` vs `catalog/store/store_all/hidden`). Studio Products now writes 'shop' to a column the storefront types don't accept. -5 because this should have been caught in the cross-reference check during decision authoring. |

## 2. Execution Quality Audit

| Aspect | Score | Notes |
|--------|-------|-------|
| Adherence to activation prompt | 10 | Honored every stop trigger; applied escape clause correctly; logged all deviations with rationale. |
| Iron Rule compliance | 10 | Spot-check confirmed Rule 21 (no orphans created), 22 (defense-in-depth via tenant_id), 31 (integrity gate clean). |
| Two-commit pattern | 10 | Clean — fix commit + chore commit. Hash chicken-and-egg fully resolved. |
| Findings discipline | 10 | The value-space mismatch finding is the highest-quality executor observation we've gotten across this batch. The executor noticed something the SPEC author + Foreman both missed — that's the loop working. |

**Spot-check:**
- `storefront-products.js:16` — confirmed reads `display_mode` ✅
- `storefront-products.js:29` — confirmed reads `display_mode_override` ✅
- `storefront-products.js:197` — confirmed writes `display_mode_override` ✅
- Project-wide grep `storefront_mode_override` post-rename: 1 hit remaining (`storefront-brands.js`, intentionally skipped per escape clause) ✅

## 3. Findings Processing

### Finding 3-A — Value-space mismatch (NEW, CRITICAL for D4 closure)
**Severity:** HIGH. Without this fix, D4 looks closed but storefront may misrender products whose admin set them to "shop" via the Studio.
**What:** Studio Products dropdown options are `'catalog'`, `'shop'`, `'hidden'`, `''` (default). Post-B-2, these values are written to `display_mode_override`. The storefront's `effectiveDisplayMode()` returns the value verbatim, but the TypeScript types and `passesDisplayMode()` logic expect `'catalog'`, `'store'`, `'store_all'`, `'hidden'`. **`'shop'` is not in the LEGACY value space.**
**Action:** Author a small follow-up SPEC (`D4_FOLLOWUP_VALUE_NORMALIZATION/`) to either (a) change the Studio dropdown to use LEGACY values (`shop` → `store_all` makes semantic sense; `store_all` means "show in shop with full features"), or (b) add view-side coercion in the planned B-3 view rewrite. Recommend (a): smaller change, cleaner data, doesn't expand the view's complexity. Single ~5-line edit in `storefront-products.js` lines 84-86 + 96-97 + 116 + 134.
**Status:** Queued.

### Finding 3-B — UI duplication (NEW, MEDIUM)
**Severity:** MEDIUM. Two admin pages let users set the same brand-display-mode field. Pre-B-2: different columns (different effects, confusing). Post-B-2: same column, but `storefront-brands.js` intentionally not renamed → it still writes the OLD `storefront_mode` column which is empty and ignored everywhere. So the standalone Brand Mode Manager page is now functionally a no-op write. Confusing for admins who use it expecting effect.
**Action:** Either consolidate the two pages (delete Brand Mode Manager standalone, keep Brand Page Editor in Studio), or rename the writes in `storefront-brands.js` to LEGACY too. Defer to a separate housekeeping SPEC after B-3.
**Status:** Queued (lower priority than 3-A).

## 4. Author-Skill Improvement Proposals (opticup-strategic)

### Proposal #1 — Cross-reference check must include enum/value-space audit, not just column names
**Where:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` §1.5 Cross-Reference Check.
**Change:** When a SPEC reconciles two columns, the Foreman must also reconcile the **enum/value spaces** they accept. Today's proposal #2 (B1 review) covered "syntax citations from documented patterns"; this proposal covers the **value vocabulary** of fields being unified. A standard line in the Cross-Reference Check: "For each renamed/unified column, list the distinct values currently present in DB + the values the dropdown UIs write. If they differ → STOP, the SPEC must include value normalization."
**Why:** Today's RECONCILIATION_DECISION assumed value spaces matched. They didn't (`catalog/shop/hidden` vs `catalog/store/store_all/hidden`). The executor caught it post-rename. Catching it at decision-time would have saved one follow-up SPEC.

### Proposal #2 — QA-step responsibility split in activation prompts
**Where:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` (and the soon-to-exist ACTIVATION_PROMPT_TEMPLATE.md per FOREMAN_REVIEW_C1 #2).
**Change:** When the SPEC's success criterion involves live UI behavior, split it into two sub-criteria: (a) Pre-deploy executor verification — must be DB/source-readable proof (e.g., "view exposes column X as pass-through"). (b) Post-deploy human verification — Daniel walks through the UI on demo. Today's executor was forced to "deviate" on the QA step because no browser was available; a clear split would have saved that.
**Why:** The executor's §5 "what would have helped" makes this exact case. Adopting the split codifies the existing CLAUDE.md §9 rule that live QA is Daniel's responsibility post-deploy.

## 5. Executor-Skill Improvement Proposals (opticup-executor)

The executor proposed three concrete items in EXECUTION_REPORT §5 (value-space mismatch as finding, UI duplication finding, QA-step responsibility split). Accept all three. The first two become Foreman work (above); the third overlaps with my Proposal #2.

## 6. Master-Doc Update Checklist

- [x] `ROADMAP.md` — D3 + D4 rows flipped to ✅ by executor.
- [ ] `MASTER_ROADMAP.md` — not touched. D3+D4 are bug-fixes inside Module 3.
- [ ] `docs/CONVENTIONS.md` — **suggested follow-up:** add "Display mode field — canonical pair is `display_mode` + `display_mode_override`. Value vocabulary: `catalog`/`store`/`store_all`/`hidden`. Do NOT introduce `shop` (legacy NEW-pair value)." Logged for next housekeeping pass.
- [ ] `docs/GLOBAL_SCHEMA.sql` updated AFTER B-3 (view rewrite, Daniel-gated).

## 7. Verdict

🟡 **CLOSED WITH FOLLOW-UP.**

Closure status:
- **D3 (read wrong field):** ✅ fully resolved. Studio now reads from populated LEGACY pair.
- **D4 (writes don't propagate):** ⚠️ column-write resolved, but ⚠️ value-space mismatch makes some writes ('shop') effectively dead-letters at the storefront. Treat as 80% resolved; the remaining 20% is the follow-up SPEC.

**Next strategic step:** author `D4_FOLLOWUP_VALUE_NORMALIZATION` SPEC. Small, ~5-line edit. Then proceed to B-3 (view rewrite, Daniel-gated) when Daniel approves.
