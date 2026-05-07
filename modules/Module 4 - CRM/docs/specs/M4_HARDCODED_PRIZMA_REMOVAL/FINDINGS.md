# FINDINGS — M4_HARDCODED_PRIZMA_REMOVAL

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_HARDCODED_PRIZMA_REMOVAL/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — SPEC §2 cited paths missing `/public/` subfolder qualifier (4th-occurrence pattern)

- **Code:** `M4-DOC-06`
- **Severity:** LOW
- **Discovered during:** Step 1.5 file verification (first `Read` of `modules/crm/event-register.js` failed)
- **Location:** SPEC.md §2 sites table — quoted `modules/crm/event-register.js` and `modules/crm/event-register.css`; actual paths are `modules/crm/public/event-register.{js,css}`.
- **Description:** The SPEC §2 table cited two file paths that don't exist as written. The actual files live in a `/public/` subfolder (the static-asset folder served by the storefront for the public form). Same root-cause class as M4-DOC-02 (column names from memory), M4-DOC-04 (template slug from memory), M4-DOC-05 (RPC role from memory). This is now **4 consecutive SPECs with this pattern.**
- **Reproduction:**
  ```
  $ ls modules/crm/event-register.js
  ls: cannot access 'modules/crm/event-register.js': No such file or directory
  $ find . -name 'event-register.js' -not -path '*/.git/*' 2>/dev/null
  ./modules/crm/public/event-register.js
  ```
- **Expected vs Actual:**
  - Expected (per SPEC §2): files at the cited paths.
  - Actual: files at `modules/crm/public/event-register.{js,css}`.
- **Suggested next action:** TECH_DEBT — apply the natural 4th-occurrence fix. The Foreman applied a 3-occurrence-triggered fix to opticup-strategic Step 1.5 for `pg_proc.prosrc` source-search; the parallel fix here is filesystem-path verification (`ls` or `find` for every path in the SPEC's §2/§8/§12 tables BEFORE finalizing the SPEC). Per Self-Improvement Mandate, 4 occurrences = APPLY immediately to both opticup-strategic + opticup-executor SKILL files. Also see executor Proposal 1 in EXECUTION_REPORT §8.
- **Foreman override:** { }

---

### Finding 2 — Pre-existing `--color-primary*` keys in demo's ui_config (separate namespace from SPEC's `brand.gold*`)

- **Code:** `M4-DOC-07`
- **Severity:** INFO
- **Discovered during:** Step 1.5 pre-flight `SELECT ui_config FROM tenants WHERE slug='demo'`
- **Location:** `tenants.ui_config` (demo row, prior to migration).
- **Description:** Demo's `ui_config` already contained 4 keys before this SPEC's migration: `--color-primary` (`#059669`), `--color-primary-dark` (`#065f46`), `--color-primary-hover` (`#047857`), `--color-primary-light` (`#d1fae5`). These appear to be a previous attempt at tenant-scoped CSS variables (likely from Module 3 storefront work, where Astro components consume `--color-primary` directly). The SPEC's new `brand.gold/gold_light/gold_hover` namespace coexists with these. No collision, no functional issue — but the project has TWO conventions for tenant brand colors now: (a) flat `--color-primary*` keys at the top level, (b) nested `brand: {gold, gold_light, gold_hover}` object. Worth deciding which is canonical for the SaaS-onboarding flow.
- **Reproduction:**
  ```sql
  SELECT ui_config FROM tenants WHERE slug='demo';
  -- → {"--color-primary":"#059669", "default_waze_url":"...", "--color-primary-dark":"#065f46",
  --     "--color-primary-hover":"#047857", "--color-primary-light":"#d1fae5"}
  ```
- **Expected vs Actual:**
  - Expected (implicit per SPEC §2 architecture): `tenants.ui_config` has ONE namespace for brand colors.
  - Actual: TWO namespaces coexist; `brand.gold*` is the ERP-CRM convention; `--color-primary*` was a prior Module 3 storefront convention.
- **Suggested next action:** TECH_DEBT — defer to a future "tenant config schema canonicalization" SPEC. For now, both namespaces work because no consumer reads both. Long-term, pick ONE convention (`brand.*` is more idiomatic JSONB; the `--color-*` flat keys are CSS-friendly but less structured) and migrate the other.
- **Foreman override:** { }

---

### Finding 3 — Pre-cutover "Canon Option a" decision in event-register.css header is now superseded

- **Code:** `M4-DOC-08`
- **Severity:** INFO
- **Discovered during:** Reading `event-register.css` lines 1-6 before editing
- **Location:** `modules/crm/public/event-register.css:1-6` (the file header comment).
- **Description:** The CSS file's header read: *"Restyled 2026-05-01 per Prizma Design System Canon v1.1 (sealed 2026-04-28). See `__LAUNCH_PLAN_DRAFT__/campaign-overseer/PRIZMA_DESIGN_SYSTEM_CANONICAL.md`. Canon values inlined directly (Daniel pre-authorized Option a in SPEC §1.5)."* This was the pre-cutover (single-tenant) decision: explicitly inline canon gold values in CSS for simplicity, accept the Iron Rule 9 violation in exchange for source-of-truth clarity. This SPEC supersedes that decision as part of the post-cutover SaaS-readiness pivot. The header has been rewritten to reflect the new architecture.
- **Reproduction:** N/A — historical context.
- **Expected vs Actual:**
  - Expected (post-SaaS-pivot): canon values come from `tenants.ui_config.brand`, code is tenant-neutral.
  - Actual (pre-this-SPEC): canon values inlined in CSS per Option a.
- **Suggested next action:** DISMISS — this SPEC's header rewrite already records the architectural-context shift. For the broader project: the `__LAUNCH_PLAN_DRAFT__/campaign-overseer/PRIZMA_DESIGN_SYSTEM_CANONICAL.md` doc may also reference Option a as a still-active decision; it should be updated with a "superseded by M4_HARDCODED_PRIZMA_REMOVAL" note.
- **Foreman override:** { }

---

### Finding 4 — `crm-messaging-templates.js` substitute() is preview-only, not the customer-facing path (SPEC §2 risk wording overstates impact)

- **Code:** `M4-DOC-09`
- **Severity:** INFO
- **Discovered during:** Reading `crm-messaging-templates.js:332-341` to understand the function's role
- **Location:** `modules/crm/crm-messaging-templates.js` lines 332-341 (the `substitute()` function).
- **Description:** SPEC §2 sites #3-5 cited the hardcoded values in `substitute()` and described their impact via the SaaS-impact paragraph: *"every customer-facing surface from M4 will display Prizma's...address, phone, ...because the source quotes them as literal strings."* This is partially misleading. The `substitute()` function is a PREVIEW-ONLY helper for the staff template editor (signaled by its sibling fake values like `'דנה כהן'` for `%name%`, `'01.11.2026'` for `%event_date%`). Real customer-facing messages route through send-message EF, which already reads tenant-scoped values server-side. The Iron Rule 9 violation was real (preview shows tenant-specific data when authoring tenant 2's templates) but lower-impact than the SPEC's wording suggested. The fix I applied (tenant-NEUTRAL placeholders rather than tenant-specific reads) reflects this distinction.
- **Reproduction:** N/A — code-comprehension finding.
- **Expected vs Actual:**
  - Expected (per SPEC §2 wording): hardcoded values reach customers.
  - Actual: hardcoded values appear in staff editor preview only; customer-facing messages route through send-message EF and substitute correctly.
- **Suggested next action:** DISMISS — the fix as applied is correct (tenant-neutral preview placeholders). For the Foreman: future SPECs touching client-side preview helpers should distinguish "preview default" from "customer-facing default" so the impact section is accurate.
- **Foreman override:** { }

---

*End of FINDINGS.*
