# FINDINGS — M3_SHORTGY_TO_INTERNAL_REDIRECT

> **Location:** `modules/Module 4 - CRM/docs/specs/M3_SHORTGY_TO_INTERNAL_REDIRECT/FINDINGS.md`
> **Written by:** opticup-executor
> **Written on:** 2026-05-14
> **Total findings:** 5 (0 CRITICAL / 0 HIGH / 0 MEDIUM / 2 LOW / 3 INFO)

Each finding has severity, location, description, and suggested disposition. The Foreman decides in FOREMAN_REVIEW.md whether each becomes a new SPEC stub, a TECH_DEBT entry, or is dismissed.

---

## FIND-1 — INFO — `gmapy` short-link target is a third-party domain (Gama payment gateway)

- **Severity:** INFO
- **Location:** `short_links.target_url` for codes `dsruWc1z` (demo) + `KvSzd3Zz` (prizma) — both point at `https://gpw.gamaf.co.il/?id=IzQNzbZPhyDU&sid=U2FsdGVkX1/4/0NPy/xONtNHjNCAPoFRdflGF9vE7supiQ87dX0g6lCoPGaxGdbS`
- **Description:** The ₪50 SuperSale deposit payment URL points at the Gama payment gateway (third-party). The literal `id` + `sid` query-string tokens are baked into the URL (apparently Gama's session preset for this specific Prizma payment configuration). If Gama ever rotates these tokens or migrates to a new gateway, the static `short_links.target_url` is stale and customer payments break silently.
- **Daniel-approved context:** Daniel chose Option-1 (continue) during Step 0 INVENTORY 2026-05-14 — Gama is Prizma's contracted payment gateway, used for months. This finding is documentation, not a blocker.
- **Suggested disposition:** Track informally. If/when a new "payment_links migration" SPEC is authored (e.g. when a 2nd tenant onboards and needs their own gateway), audit how the `sid` token's lifecycle is managed and consider routing through a dynamic resolver instead of a baked-in URL. No action this SPEC.

## FIND-2 — LOW — `crm_message_templates` lacks `updated_at` column

- **Severity:** LOW
- **Location:** `public.crm_message_templates` schema (verified via `information_schema.columns`)
- **Description:** The table has `created_at` but no `updated_at` column. When a SPEC mutates a row's `body` (as this SPEC did on 10 rows), there's no audit-trail timestamp of the latest mutation — only git history of the SPEC that did it. Project pattern across most CRM tables IS to have `updated_at` with a `update_updated_at()` trigger (per `M4_AUTOMATION_RULES_UPDATED_AT` 2026-05-13 which added it on `crm_automation_rules`). `crm_message_templates` is one of the few stragglers.
- **Disposition suggestion:** **New TECH_DEBT entry** `M4-DEBT-CRM-MESSAGE-TEMPLATES-UPDATED-AT`. Trivial fix (~5 min): add the column with DEFAULT now() + the trigger function from the auto-rules SPEC. Batch with next M4 hygiene SPEC.
- **Source:** Deviation 1 in EXECUTION_REPORT.md §4.

## FIND-3 — LOW — `crm.html` is at 442 lines, over Rule 12's 350-line target

- **Severity:** LOW
- **Location:** `crm.html` — 442 lines after this SPEC's +14 additive change
- **Description:** Rule 12 says "target max 300 lines, absolute max 350". `crm.html` was already at 428 pre-SPEC; this SPEC added 14 lines for the new tab. The SPEC's criterion 20 ("≤ BASE+30") PASSed (442 ≤ 458) but the parenthetical "well under Rule 12 limit of 350" was inaccurate at authoring time. Pre-existing debt, not introduced by this SPEC.
- **Note on HTML entrypoints:** Rule 12's 350-line target is primarily a JS-file discipline. HTML entrypoints with N tabs + N×script-includes will grow linearly with feature count. Whether they should fall under the same cap is a project-policy question.
- **Disposition suggestion:** Either (a) raise Rule 12 cap to N lines specifically for HTML entrypoints with explicit reasoning in CLAUDE.md, OR (b) refactor `crm.html` to lazy-load tab section HTML from external template files (~1-2 hr SPEC). Either way, NOT in this SPEC's scope. Open as informational; no urgent action.

## FIND-4 — INFO — Iron Rule 18 false-positive on doc-context appendix comments

- **Severity:** INFO
- **Location:** `scripts/checks/rule-18-unique-tenant.mjs` regex behavior on `modules/*/docs/db-schema.sql` files
- **Description:** When this SPEC's docs-closure commit (commit 5) appended a P1.3 appendix to `M4 db-schema.sql` containing the literal advisory comment about `short_links_code_unique`, the Rule 18 gate fired (`UNIQUE constraint (not - tenant-scoped) missing tenant_id`). Required a one-word reword to commit. Iron Rule 32's gate already excludes `isDocFile()` files (`modules/*/docs/...md` etc.) from its destructive-pattern scan; Rule 18 should have the same exclusion. The Sentinel may have flagged similar patterns historically — worth checking GUARDIAN_ALERTS for recurrence.
- **Disposition suggestion:** **New SPEC stub** `M1_5_RULE_18_DOC_CONTEXT_EXCLUSION` — single-line fix: import or mirror the `isDocFile()` predicate from `destructive-ops-declared.mjs` into `rule-18-unique-tenant.mjs`. ~5 min SPEC, M1.5 ownership (shared check infrastructure). Tracked also as Executor Proposal #1 in EXECUTION_REPORT §9.

## FIND-5 — INFO — Iron Rule 18 advisory: `short_links_code_unique` is GLOBAL, not tenant-scoped

- **Severity:** INFO (pre-existing)
- **Location:** `public.short_links` constraint `short_links_code_unique UNIQUE (code)` (verified at SPEC §0 + during INSERT collision check)
- **Description:** Per Iron Rule 18 ("UNIQUE constraints must include tenant_id"), this constraint is non-compliant. The constraint enforces global code uniqueness across all tenants. Today this works fine because codes are 8-char random over a 62-char alphabet (~218 trillion possibilities) — collision probability is astronomically low. But strictly the constraint violates the rule and would block a future tenant from using the same code another tenant already used (which today is impossible but tomorrow could become a coincidence if someone seeds tenants with deterministic codes).
- **Disposition suggestion:** **New TECH_DEBT entry** `M4-DEBT-IRON-RULE-18-SHORT-LINKS-CODE-UNIQUE-GLOBAL`. Migration: DROP constraint + recreate as `UNIQUE (tenant_id, code)`. ~10 min SPEC. Batch with the next M4 hygiene SPEC or with the rule-18 gate fix (FIND-4). Iron Rule 32 will need to acknowledge the DROP CONSTRAINT in §Destructive Operations.

---

## Findings summary

| # | Severity | Title | Suggested disposition |
|---|---|---|---|
| FIND-1 | INFO | gmapy → Gama payment gateway (3rd-party) | Track informally; revisit when 2nd tenant payment integration is needed |
| FIND-2 | LOW | crm_message_templates lacks updated_at | New TECH_DEBT `M4-DEBT-CRM-MESSAGE-TEMPLATES-UPDATED-AT` |
| FIND-3 | LOW | crm.html at 442 lines > Rule 12 target | Informational; consider policy clarification for HTML entrypoints |
| FIND-4 | INFO | Rule 18 gate false-positive on doc-context | New SPEC stub `M1_5_RULE_18_DOC_CONTEXT_EXCLUSION` |
| FIND-5 | INFO | short_links_code_unique is global, not tenant-scoped | New TECH_DEBT `M4-DEBT-IRON-RULE-18-SHORT-LINKS-CODE-UNIQUE-GLOBAL` |

**Zero CRITICAL / HIGH / MEDIUM.** No SPEC reopens needed. All 5 findings are forward-compat observations or pre-existing-debt class.

---

*End of FINDINGS.md.*
