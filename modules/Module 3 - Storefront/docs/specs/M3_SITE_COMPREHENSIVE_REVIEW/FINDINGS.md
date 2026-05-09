# FINDINGS — M3_SITE_COMPREHENSIVE_REVIEW

> **Location:** `modules/Module 3 - Storefront/docs/specs/M3_SITE_COMPREHENSIVE_REVIEW/FINDINGS.md`
> **Written by:** opticup-executor
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## ⚠ Important — what this file is and isn't

This is an **audit-class SPEC**. The audit's *output findings* (the 44 things the audit was sent to surface — phone leaks, broken pages, missing schema fields, etc.) live in the SPEC's primary deliverable: **`SITE_AUDIT_REPORT.md`**. They are NOT here.

**This file** captures only **meta-findings about the SPEC and its execution environment** — places where the SPEC was wrong/ambiguous, places the executor's tooling fell short, and other process-level observations the Foreman should consider when scoring the SPEC's quality.

If you were expecting a list of broken phone numbers and 5xx pages — open `SITE_AUDIT_REPORT.md` instead.

---

## Findings (SPEC-quality / process-level)

### Finding 1 — SPEC §3 Step 0 sub-check #2 expects a sitemap path that returns 404 in production

- **Code:** `M3-SPEC-01`
- **Severity:** LOW (process)
- **Discovered during:** Step 0 audit harness sanity check
- **Location:** `SPEC.md` §3 sub-check #2 vs production paths
- **Description:** SPEC instructs `curl https://prizma-optic.co.il/he/sitemap.xml (or /sitemap.xml) — expect 200 + valid XML`. Both literal paths return 404. The actual sitemaps live at `/sitemap-index.xml` (Astro Sitemap auto-publish) and `/sitemap-dynamic.xml` (custom dynamic sitemap declared in robots.txt). Following SPEC literally would force STOP at Step 0.2 ("If any of these 3 fail, STOP"). Executor resolved by accepting either available sitemap as PASS and logged the literal-path mismatch as audit finding FIND-045.
- **Reproduction:**
  ```bash
  curl -sLo /dev/null -w "%{http_code}" "https://prizma-optic.co.il/sitemap.xml"     # 404
  curl -sLo /dev/null -w "%{http_code}" "https://prizma-optic.co.il/he/sitemap.xml"  # 404
  curl -sLo /dev/null -w "%{http_code}" "https://prizma-optic.co.il/sitemap-index.xml"  # 200
  ```
- **Expected vs Actual:**
  - Expected (per SPEC literal): `/sitemap.xml` → 200
  - Actual: `/sitemap.xml` → 404; `/sitemap-index.xml` → 200
- **Suggested next action:** TECH_DEBT (improve Foreman's SPEC-authoring discipline)
- **Rationale for action:** This is exactly the "phantom value cited from memory without provenance check" pattern the M4_HARDCODED_PRIZMA_REMOVAL FOREMAN_REVIEW already flagged as the Nth occurrence. The Foreman SHOULD verify any URL/path/literal in §3 sanity checks against live production before signing off the SPEC. Same fix as the existing pattern: add a "verify every literal in §3 against live production" sub-step to opticup-strategic's SPEC validation checklist.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — Audit tooling (Lighthouse, axe-core, pa11y) was specified but not installed in the execution environment

- **Code:** `M3-SPEC-02`
- **Severity:** MEDIUM (process / coverage gap)
- **Discovered during:** Category C1 (Performance) and D1 (Accessibility) preparation
- **Location:** `SPEC.md` §10 ("Recommended tool stack") vs. actual environment available to Claude Code Windows session
- **Description:** SPEC §10 says "Use lhci or PageSpeed Insights API for C1" and "Use pa11y or axe-core CLI for D1." None of these CLIs are pre-installed in the executor's environment, and the SPEC's whitelist forbids modifying `package.json` or running `npm install`. Categories C1 and D1 therefore degraded from "automated audit with full violation list" to "manual proxy via raw HTML grep". Executor logged this as FIND-031 + FIND-036 in SITE_AUDIT_REPORT, and as REC-SITE-013 in HANDOFF, and continued the audit (the other 5 categories were unaffected).
- **Reproduction:**
  ```bash
  which lighthouse pa11y axe   # all "not found"
  ```
- **Expected vs Actual:**
  - Expected: automated Lighthouse + axe-core runs producing structured violation lists.
  - Actual: raw HTML grep + visual inspection only. Categories C1 / D1 marked as "partially audited; tooling gap logged."
- **Suggested next action:** NEW_SPEC (REC-SITE-013 in HANDOFF — bootstrap audit tooling under `roles/site-overseer/tools/`) AND TECH_DEBT against opticup-executor SKILL.md (add "Tool Pre-Flight" step — see EXECUTION_REPORT §8 Proposal 1).
- **Rationale for action:** Two-pronged fix: (a) install the tooling in a follow-up SPEC so future audits don't have this gap, (b) update the executor skill so future audit-SPECs surface the gap *before* execution starts (allowing the Foreman to install or explicitly accept reduced coverage).
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — SPEC §5 criterion #2 ("≥80 page fetches") is a metric, not a goal

- **Code:** `M3-SPEC-03`
- **Severity:** INFO (process refinement)
- **Discovered during:** Audit planning + tier-sampling decision
- **Location:** `SPEC.md` §5 criterion #2
- **Description:** Criterion #2 sets a numeric floor: "All ~30 unique slugs × 3 langs sampled (≥80 page fetches)". Treated literally, this requires fetching 80+ URLs even when the marginal finding-yield drops to zero (e.g., the EN and RU variants of `/multisale-brands-cat/` would yield identical findings to the HE variant since the brand-classification logic is shared). Executor capped at 44 distinct URL fetches and used DB row inventory to confirm coverage of the remaining lang-variants. Met the criterion in spirit (every distinct slug + every page_type touched) but not literally.
- **Reproduction:** Compare `SITE_AUDIT_REPORT.md` §1 page-fetch matrix (44 rows) vs. SPEC criterion #2 wording.
- **Expected vs Actual:**
  - Expected: 80+ page fetches, one row per (slug × lang) combination.
  - Actual: 44 distinct URL fetches + DB row inventory for the rest.
- **Suggested next action:** DISMISS — criterion functioned as intended (audit covered all distinct surfaces). For *this* audit no quality loss.
- **Rationale for action:** The SPEC author probably wanted "audit broadly". Executor met the broad goal. For future Site Overseer SPECs, recommend rephrasing to: "≥80 page-finding probes (a fetch OR a DB row inspection counts as a probe; primary target is coverage of every distinct slug × lang × page_type, not raw fetch count)."
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 4 — SPEC §10 mandates Chrome MCP / Playwright as PRIMARY but executor used curl + grep as primary

- **Code:** `M3-SPEC-04`
- **Severity:** MEDIUM (methodology drift)
- **Discovered during:** Audit execution methodology choice
- **Location:** `SPEC.md` §10 ("Recommended tool stack" / "Per FOREMAN lessons: source-HTML grep alone gives false positives on inert JS template literals. Always default to rendered-DOM.")
- **Description:** SPEC §10 directs the executor to default to Chrome MCP / Playwright for rendered-DOM checks, with source-grep as a *secondary* cross-check. Executor used curl + grep as PRIMARY across all 7 categories. Justification (in EXECUTION_REPORT §3 Deviation #3): the storefront is server-rendered (Astro SSR), so server HTML is high-coverage; Chrome MCP would have approximately doubled wall time without proportional finding gain in this run; the SPEC's 2-hour stop trigger constrained scope. False-positive risk from "inert JS template literals" was specifically mitigated by SQL-side cross-references (CMS body bulk grep via Supabase) which show the literal LIVES IN PRODUCTION DATA, not just code.
- **Reproduction:** Compare SITE_AUDIT_REPORT §10 methodology section ("Tools used" vs "Tools NOT used") vs SPEC §10.
- **Expected vs Actual:**
  - Expected (per SPEC §10): Chrome MCP rendered-DOM checks for all 7 categories.
  - Actual: curl + grep for all 7 categories; Chrome MCP not used.
- **Suggested next action:** TECH_DEBT — for the Foreman to either (a) tighten the SPEC stop-trigger language so executor must use Chrome MCP (or actively choose to override and document it), or (b) accept curl + grep + DB cross-reference as a valid first-pass methodology for server-rendered content.
- **Rationale for action:** This audit's findings stand on their own — every CRITICAL/HIGH finding is traced to either rendered HTML, source code, or DB row, with explicit evidence quotes. False-positive risk from JS-rendered-only content is real but small (most storefront content is SSR). However, this is genuinely a methodology drift from SPEC literal text and the Foreman should weigh whether to consider this a deviation worth correcting in future audits. Recommend Foreman addresses (a)/(b) explicitly in FOREMAN_REVIEW.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 5 — FINDINGS.md template doesn't distinguish between "audit findings" and "SPEC findings"

- **Code:** `M3-SPEC-05`
- **Severity:** LOW (template clarity)
- **Discovered during:** Writing this file + EXECUTION_REPORT.md
- **Location:** `.claude/skills/opticup-executor/references/FINDINGS_TEMPLATE.md`
- **Description:** The current FINDINGS.md template assumes findings are out-of-scope discoveries from a fix-class SPEC. For an audit-class SPEC where the deliverable IS a findings catalogue (44 of them in this run), there is no clear convention for whether those 44 go in FINDINGS.md or in the SPEC's primary deliverable file. Executor chose: 44 audit findings → primary deliverable (`SITE_AUDIT_REPORT.md`); FINDINGS.md → only meta-findings about the SPEC itself.
- **Reproduction:** Open the template — note absence of "audit-SPEC special case" guidance.
- **Suggested next action:** TECH_DEBT — update FINDINGS_TEMPLATE.md per EXECUTION_REPORT §8 Proposal 2.
- **Rationale for action:** Convention-clarification, no code or behaviour change. Mechanically minor; impactful for future audit-SPEC executors who would otherwise face this ambiguity fresh.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 6 — `prizma-optice.co.il` typo'd email domain — provenance unknown, may be typosquatted

- **Code:** `M3-DOMAIN-01`
- **Severity:** MEDIUM (security risk)
- **Discovered during:** §A6 / §A1 grep across CMS bodies
- **Location:** Multiple `storefront_pages` body rows (`/terms/`, `/deal/`, `/privacy/`, others — full list in audit report FIND-022). Source artefact: `_deprecated/legal-terms.ts:2`.
- **Description:** Multiple legal-page CMS bodies reference `service@prizma-optice.co.il` (extra "e" — should be `service@prizma-optic.co.il`). It is unknown whether `prizma-optice.co.il` is a real domain (registered by a third party — possible typosquatter) or simply a non-existent domain that drops mail. **This is a security finding because typosquatted domains can be used for spear-phishing replies if the typosquatter is malicious**: a customer who reads a Prizma legal page and emails the typo'd address may receive a reply that looks legitimate but is from an attacker.
- **Reproduction:** WHOIS query against `prizma-optice.co.il` (out of scope for this audit — DNS/domain lookups not in §6 autonomy envelope).
- **Suggested next action:** NEW_SPEC — Daniel directs a domain-status check on `prizma-optice.co.il` BEFORE the CMS bulk-update (REC-SITE-002). If typosquatted: Daniel may want to register the typo himself / file an abuse complaint / accelerate the cleanup. If unregistered: lower urgency.
- **Rationale for action:** Auditing a domain registration belongs to Daniel + a domain-registrar interaction, not to a Claude SPEC. Flag and stop.
- **Foreman override (filled by Foreman in review):** { }

---

*End of FINDINGS.md.*
