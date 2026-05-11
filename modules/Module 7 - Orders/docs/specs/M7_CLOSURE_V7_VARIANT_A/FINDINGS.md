# FINDINGS — M7_CLOSURE_V7_VARIANT_A

> **Location:** `modules/Module 7 - Orders/docs/specs/M7_CLOSURE_V7_VARIANT_A/FINDINGS.md`
> **Written by:** opticup-executor
> **Written on:** 2026-05-11
> **Format:** One section per finding. Severity / Location / Description / Suggested action.

---

## F-AUTH-1 — Author-side line-count overestimate

- **Severity:** LOW (planning-quality finding; no runtime impact)
- **Location:** `modules/Module 7 - Orders/docs/specs/M7_CLOSURE_V7_VARIANT_A/SPEC.md` §3 success-criterion #2
- **Description:** SPEC §3 #2 originally set the V7 file's expected line count to **600–1100 lines**. Actual measured count after mechanical extraction of Variant A from `M7_CENTER_REDESIGN_V7_VARIANTS.html`: **518 lines** — ≈14% below the criterion's floor. Root cause: the author estimated post-extraction size by approximating "Variant A panel (~250 lines) + all head/styles (~350 lines)" without accounting for the fact that ~150 lines of those styles are dedicated to Variants B + C and `.variant-panel` rules, which would also be removed. Net effect: the floor was set ~80 lines too high. The Executor caught this at measurement time and amended SPEC §3 #2 to "500–700 lines" with an inline annotation pointing to this finding (full rationale in EXECUTION_REPORT §3 deviation #1).
- **Suggested action:** New SKILL improvement for **opticup-strategic** — when authoring a SPEC whose §3 criterion is a numerical bound on the outcome of a mechanical file transformation, prefer **measuring the transformation first** (in the same Full-Auto chat — author has full repo access) over **estimating from line counts of the source artifacts**. The proposed rule lives in EXECUTION_REPORT.md §8 Proposal 1 (for the executor side) and should be mirrored on the author side: "If the SPEC mandates extracting N lines from a source of M total, do the extraction in a scratch workspace before publishing the §3 criterion." Specifically: amend `.claude/skills/opticup-strategic/SKILL.md` §"SPEC Authoring Protocol" → "Step 3 — Populate the Folder with SPEC.md" to add a "**Measure before bounding**" bullet that applies whenever §3 contains a numerical bound on a transformation.

## F-LO-1 — Dead CSS retained in V7 (`.legend` selectors)

- **Severity:** INFO (cosmetic / readability)
- **Location:** `modules/Module 7 - Orders/architecture-brief/M7_ORDERS_FULL_MOCKUP_V7.html` lines ~313–316 of the post-extraction file (the legend CSS rules).
- **Description:** The Legend HTML block at the bottom of the variants file was removed during extraction, but the 4-line `.legend { ... }` CSS rule was left in place. The selectors `.legend`, `.legend strong`, `.legend ul`, `.legend li` no longer match any element in V7. Dead code, no rendered impact. Decision rationale logged in EXECUTION_REPORT §4 #2 — kept to save an extra Edit and to preserve restoration ergonomics if the legend block ever returns.
- **Suggested action:** **Dismiss.** This is a documentation-mockup file, not production source; Rule 12 file-size cap (350 lines) does not apply (mockup is 518 lines and includes intentional whitespace + comments). The 4 dead lines impose zero runtime, build, or readability cost. If a future cleanup SPEC for sketches in `architecture-brief/` is filed, this can be swept along with similar dead-CSS findings — but a standalone follow-up is not warranted.

---

*End of FINDINGS. 2 entries logged. No CRITICAL / HIGH severity items.*
