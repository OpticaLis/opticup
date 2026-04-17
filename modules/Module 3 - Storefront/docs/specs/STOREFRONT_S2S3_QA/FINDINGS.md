# FINDINGS — STOREFRONT_S2S3_QA

> **Location:** `modules/Module 3 - Storefront/docs/specs/STOREFRONT_S2S3_QA/FINDINGS.md`
> **Written by:** opticup-executor (Cowork session `festive-stoic-galileo`, 2026-04-16)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Rules

1. One entry per finding. Never merge two unrelated issues.
2. Findings are things discovered OUTSIDE the SPEC's declared scope.
3. Do NOT fix findings inside this SPEC.
4. Every finding needs a suggested next action.
5. Severity: CRITICAL / HIGH / MEDIUM / LOW / INFO

---

## Findings

### Finding 1 — Storefront code criteria unverifiable: folder not mounted in this session

- **Code:** `M3-QA-01`
- **Severity:** MEDIUM
- **Discovered during:** First Action (directory enumeration after git status)
- **Location:** Cowork session mount configuration — `/sessions/festive-stoic-galileo/mnt/` contains only `opticup` (ERP). `opticup-storefront` folder is not mounted.
- **Description:** SPEC §3 criteria 1–10 and 20–21 (11 total) require reading files from `opticup-storefront/src/components/Header.astro`, `BaseLayout.astro`, `ContactForm.astro`, `src/pages/*/index.astro`, and `src/i18n/he.json`. These files contain Daniel's uncommitted session 2+3 changes that have never been pushed to git. Without the storefront folder mounted, these criteria cannot be verified. The prior authoring session (`friendly-awesome-carson`) had the storefront mounted; this executor session does not. The 11 criteria cover: sticky header positioning, mobile CTA presence, dropdown cleanup, he.json spelling, BaseLayout defaults, ContactForm wiring, submit.ts Resend guard, and homepage tenantId/hideContactForm props.
- **Reproduction:**
  ```
  ls /sessions/festive-stoic-galileo/mnt/
  # Returns: opticup  uploads
  # Expected: opticup  opticup-storefront  uploads
  ```
- **Expected vs Actual:**
  - Expected: Both `opticup` and `opticup-storefront` mounted; all 21 criteria verifiable.
  - Actual: Only `opticup` mounted; 11 criteria (1–10, 20–21) not verifiable this session.
- **Suggested next action:** DISMISS (or NEW_SPEC if a dedicated re-verification pass is wanted)
- **Rationale for action:** The storefront changes were authored and executed by a prior Cowork session with full visibility. Daniel has local access to the files and can verify the 11 criteria manually against the `grep` commands in SPEC §3. Alternatively, a future session that mounts both folders can re-run the grep checks as a quick sanity pass. The DB deliverables (criteria 11–19) are fully verified — this finding affects QA completeness only, not production correctness.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — SPEC missing explicit Rollback Plan section

- **Code:** `M3-SPEC-01`
- **Severity:** LOW
- **Discovered during:** SPEC validation (Step 1 — required section check)
- **Location:** `modules/Module 3 - Storefront/docs/specs/STOREFRONT_S2S3_QA/SPEC.md` — missing top-level `## Rollback Plan` section
- **Description:** The opticup-executor SKILL.md requires all SPECs to have a Rollback Plan section. STOREFRONT_S2S3_QA contains two Level 2 SQL UPDATEs (§6 Fix A and Fix B) but no explicit rollback section. The pre-fix SELECT statements in §6 serve as effective rollback data (they capture the exact pre-state strings), but they are not labeled or structured as a rollback plan. This creates a judgment-call overhead for the executor and a documentation gap for anyone reading the SPEC after the fact.
- **Reproduction:**
  ```
  grep -n "Rollback" "modules/Module 3 - Storefront/docs/specs/STOREFRONT_S2S3_QA/SPEC.md"
  # Returns: 0 results
  ```
- **Expected vs Actual:**
  - Expected: `## 11. Rollback Plan` (or similar) listing the reverse UPDATEs for Fix A and Fix B.
  - Actual: No rollback section. Pre-fix SELECT in §6 is the only rollback reference.
- **Suggested next action:** TECH_DEBT (apply to SPEC_TEMPLATE update, not a new SPEC)
- **Rationale for action:** This is a template compliance gap, not a production risk. The SPEC_TEMPLATE used by opticup-strategic should be updated to make Rollback Plan a mandatory section for any SPEC with Level 2 SQL changes. The Foreman's Executor Proposal 2 (from this EXECUTION_REPORT) proposes the exact SKILL.md edit.
- **Foreman override (filled by Foreman in review):** { }
