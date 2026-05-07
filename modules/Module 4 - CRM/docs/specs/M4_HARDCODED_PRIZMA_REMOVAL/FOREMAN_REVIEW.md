# FOREMAN_REVIEW — M4_HARDCODED_PRIZMA_REMOVAL

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_HARDCODED_PRIZMA_REMOVAL/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman hat)
> **Written on:** 2026-05-06
> **Reviewed:** SPEC.md (2026-05-06) + EXECUTION_REPORT.md (2026-05-06) + FINDINGS.md (4 findings)
> **Commit range:** `8566067..39e3d4b` (4 fix + 1 retrospective + 1 skill-update batch from earlier)

---

## 1. SPEC Quality Audit

**Verdict: 🟡 GOOD WITH 2 RECURRING FLAWS — 4-OCCURRENCE PATTERN.**

### What the SPEC got right
- Architecture: clean separation of tenant config into JSONB + 2 columns. SaaS-readiness threshold actually crossed (verified by executor).
- 5-commit plan with explicit blast-radius per commit. Each commit a safe revert point.
- Pre-flight `pg_proc.prosrc` source-search applied (per the just-codified Step 1.5 §6) — caught nothing because this SPEC didn't reference RPCs.
- §10 CLI deploy fallback per-EF with verify_jwt-flag notes.
- Migration uses `||` JSONB concat (preserves existing keys) — non-destructive seeding.
- Cross-Reference Check explicitly documented 6 new identifiers, all clean.

### What the SPEC got wrong (executor-flagged)

**Flaw 1 — Phantom file paths (4th occurrence).**
SPEC §2 cited `modules/crm/event-register.js` and `modules/crm/event-register.css`. Actual paths are `modules/crm/public/event-register.{js,css}`. The executor's first `Read` failed; substituted via `find` and proceeded. Logged as M4-DOC-06.

**This is now a 4-occurrence pattern, with the same root cause class:**
1. M4-DOC-02: phantom column names (`recipient_phone`/`recipient_email`)
2. M4-DOC-04: phantom template slug (`event_registration_open`)
3. M4-DOC-05: wrong RPC role (`submit_storefront_lead` writes elsewhere)
4. M4-DOC-06: wrong file paths (missing `/public/` qualifier)

The 3-occurrence rule already triggered for DB-object verification (`pg_proc.prosrc` was added to Step 1.5 §6 in the prior cycle). **Now the same rule triggers for filesystem paths.** Per Self-Improvement Mandate, I MUST add a path-verification check to Step 1.5 BEFORE the next SPEC.

**Flaw 2 — SPEC §2 impact wording overstated for `crm-messaging-templates.js`.**
The SPEC framed the hardcoded values in `substitute()` as customer-facing leakage. They are actually preview-only placeholders used by the staff template editor. Real messages route through `send-message` EF (which substitutes server-side from `tenants` row). The fix as applied (tenant-neutral preview defaults) is correct, but the SPEC's threat model was overstated. Logged as M4-DOC-09 (executor downgraded to INFO).

### What the SPEC got missing
- Path verification for the 5 source files in §2 — closely related to Flaw 1.
- Distinction between "preview default" vs "customer-facing default" in the threat model. The Iron Rule 9 violation was real (tenant 2's editor would see tenant 1's values in preview) but lower-impact than the SPEC implied.

### Severity rollup
- 0 issues that broke execution
- 1 recurring class-pattern issue (4-occurrence rule triggered)
- 1 SPEC threat-model imprecision (logged as INFO, fix correct)

---

## 2. Execution Quality Audit

**Verdict: 🟢 EXCELLENT — 9.6/10 self-assessed; matches my independent assessment.**

### Adherence
- 5 commits as planned. ✓
- Migration applied first try (no MCP flake on this API path). ✓
- 4 EFs deployed via Daniel CLI (executor stopped on detection that 4× MCP deploys with `_shared/` cross-folder dependency would be high-risk — escalated proactively). ✓ Sound risk management.
- Pre/post grep checks confirm 0 hardcoded values remain in the 5 source files. ✓
- All 6 ui_config keys correctly seeded for both tenants. ✓
- Iron Rule 12 watch: `crm-messaging-templates.js` post-edit at 343 lines — same as pre-edit (the substitute changes were swap, not insert). Did NOT exceed 350. ✓
- Iron Rule 9: 7 hardcoded sites closed. ✓
- Iron Rule 22: helper does its own SELECT per request (no caching that would mask tenant changes); seed migration ensures defaults exist (no `undefined` rendered to customers). ✓
- Whitelist enforcement: phone `0537889878` + email `daniel@prizma-optic.co.il` only. 0 prizma writes outside the seed migration. ✓

### Deviations
1. **4 EF deploys, not 3** — `event-register` was added because the public form needs to surface tenant brand colors via the response payload. Documented as Deviation #1 in EXECUTION_REPORT. Sound architectural extension.
2. **Storefront-side brand-color rendering** — out of scope per §7 (storefront repo); the executor confirmed `event-register.js` (which IS in this repo) handles the post-render style injection. Storefront-repo SPEC for cross-repo brand color flow is a separate item.
3. **CLI deploys instead of MCP** — executor proactively escalated for the 4-EF batch (predicted MCP would 5xx on cross-folder `_shared/` imports). Saved time vs walking into 4 separate retries.

### Real-time decisions
1. **Tenant-neutral preview placeholders** in `crm-messaging-templates.js` (rather than dynamic tenant lookup). Correct call — preview function is sync; tenant lookup is async; mixing them would force a cascade of refactors. Logged as M4-DOC-09.
2. **Pre-emptive CLI escalation** for the 4-EF deploy. Correct under Bounded Autonomy — the executor estimated MCP risk based on the 3-occurrence pattern and avoided the cost.
3. **Migration uses JSONB `||` concat** to preserve demo's existing `--color-primary*` keys. Correct — non-destructive seeding. Logged as M4-DOC-07 for future canonicalization.

### Spot-check verifications I ran
- `git log 8566067..HEAD --oneline` → 5 SPEC commits as planned (the 6th `1679c3d` is the inter-SPEC skill update from earlier).
- `git show 73dd0e3 --stat` → 3 client files modified, all in `modules/crm/public/` (matches actual paths). ✓
- `get_edge_function('quick-register')` → version=6, ACTIVE. ✓
- `get_edge_function('send-message')` → version=20, ACTIVE. ✓
- `get_edge_function('resolve-link')` → version=3, ACTIVE. ✓
- `get_edge_function('event-register')` → version=15, ACTIVE. ✓
- DB: prizma `business_phone='050-717-5675'`, `business_address='הרצל 32, אשקלון'`, `ui_config` has all 5 new keys. ✓
- DB: demo `business_phone='050-000-0000'`, `business_address='דוגמה 1, דמו'`, `ui_config` has all 5 new keys + the 4 pre-existing `--color-primary*` keys. ✓ (Non-destructive seed worked.)
- `grep -E "972533645404|c9a555|הרצל 32|prizma-optic.co.il/r" modules/crm/public/event-register.* modules/crm/crm-messaging-templates.js supabase/functions/quick-register/index.ts supabase/functions/send-message/url-builders.ts supabase/functions/resolve-link/index.ts` → 0 matches in target files. Iron Rule 9 closure verified at the source level. ✓

---

## 3. Findings Disposition

| Code | Severity | Description | Foreman decision | Rationale |
|------|----------|-------------|------------------|-----------|
| M4-DOC-06 | LOW | SPEC §2 cited file paths missing `/public/` qualifier | **APPLY immediately — 4-occurrence rule** | Pattern continues. Path-verification check joins the `pg_proc.prosrc` check in Step 1.5. See §5 Proposal 1. |
| M4-DOC-07 | INFO | Two parallel namespaces for tenant brand colors (`brand.gold*` + `--color-primary*`) | **TECH_DEBT — defer to canonical schema SPEC** | Both work; no consumer reads both. Future SPEC picks one and migrates. Not blocking SaaS-readiness. |
| M4-DOC-08 | INFO | event-register.css "Canon Option a" header was outdated; rewritten in this SPEC | **DISMISS for this SPEC** | Already corrected in commit 73dd0e3. The broader doc (`PRIZMA_DESIGN_SYSTEM_CANONICAL.md`) reference IS still active — log a separate follow-up note for the design-canon doc to mark Option a as superseded. |
| M4-DOC-09 | INFO | SPEC §2 overstated impact of `crm-messaging-templates.js` hardcoded values (preview-only, not customer-facing) | **DISMISS for this SPEC** | Fix as applied is correct (tenant-neutral preview placeholders). Note for future SPECs: distinguish "preview default" vs "customer-facing default" in §2 threat models. |

**No findings re-opened the SPEC.** All fixes applied correctly; the impact-wording flaw didn't change the executed outcome.

---

## 4. Master Doc Update Checklist

| File | Touched in SPEC range? | Status |
|------|------------------------|--------|
| `MASTER_ROADMAP.md` | No — module not closing | ✅ Correctly skipped |
| `docs/GLOBAL_MAP.md` | No — deferred to Integration Ceremony | ✅ Correctly skipped |
| `docs/GLOBAL_SCHEMA.sql` | No — deferred | ✅ Correctly skipped |
| `modules/Module 4 - CRM/docs/MODULE_MAP.md` | Yes — registered `loadTenantConfig` helper | ✅ Verified in commit c576bd3 |
| `modules/Module 4 - CRM/docs/CHANGELOG.md` | Yes — appended | ✅ Verified |
| `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` | Yes — current focus | ✅ Verified |
| `modules/Module 4 - CRM/docs/db-schema.sql` | Yes — appended ui_config schema notation | ✅ Verified |

**Master-doc state: aligned. Note: MODULE_MAP got a real new entry this time (the shared helper).**

---

## 5. Author-Skill Improvement Proposals (opticup-strategic)

### Proposal 1 — APPLY immediately: extend Step 1.5 with filesystem path verification

**Where:** `.claude/skills/opticup-strategic/SKILL.md` §"Step 1.5 — Cross-Reference Check (MANDATORY)" — extend the new bullet 6 (DB-object role verification, just added in prior cycle).

**Change:** Add a sub-bullet 6b:
> *"For every filesystem path the SPEC cites in §2 (sites table), §8 (Expected Final State), or §12 (QA Plan), confirm it exists by `ls` or `Glob` BEFORE finalizing the SPEC:*
> *```bash*
> *ls modules/<exact-path-cited>     # for code files*
> *find . -name '<filename>' -not -path '*/.git/*' 2>/dev/null    # if exact location uncertain*
> *```*
> *If the path doesn't exist, the SPEC has a wrong premise. Do NOT cite paths from memory — repos are restructured frequently (e.g., `modules/crm/public/` was added during the storefront refactor; SPECs authored from older mental models miss the qualifier)."*

**Rationale:** **4-occurrence pattern triggered** (M4-DOC-02 → M4-DOC-04 → M4-DOC-05 → M4-DOC-06). The first three triggered the `pg_proc.prosrc` Step 1.5 §6 addition; the fourth (filesystem paths) is the natural extension to the same root-cause class — "SPEC author cited a name from memory; live system disagreed."

**Source:** Finding M4-DOC-06 + the 3 prior findings.

### Proposal 2 — Distinguish preview vs customer-facing in §2 threat models

**Where:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` §2 Background.

**Change:** Add to the §2 guidance:
> *"When the SPEC cites a hardcoded value, distinguish whether it appears in:*
> *(a) **customer-facing path** — value reaches the customer's screen / SMS / email body; OR*
> *(b) **internal-only path** — value appears in staff tooling, preview helpers, debug pages, etc.*
> *Iron Rule 9 violations in (b) are real but lower-severity. Mark each violation with [customer-facing] or [internal] in the §2 sites table."*

**Rationale:** This SPEC's §2 implicitly conflated `crm-messaging-templates.js` preview defaults with customer-facing defaults. The fix differs (tenant-neutral placeholder vs dynamic tenant lookup). Future SPECs should explicit the distinction.

**Source:** Finding M4-DOC-09.

---

## 6. Executor-Skill Improvement Proposals (opticup-executor)

The executor proposed 1 of its own. I'm forwarding it with my endorsement, plus 1 derived:

### Proposal 1 (executor-suggested) — Filesystem-path Step 1.5 check
**Where:** `.claude/skills/opticup-executor/SKILL.md` §"Step 1.5 — DB Pre-Flight Check"
**Change:** Mirror of my Author Proposal 1, executor-side. *"For every file path cited in the SPEC's §2/§8/§12, confirm via `ls` or `find` BEFORE editing. If wrong, locate the actual path, edit there, log finding."*
**Endorsed:** Yes. Defense in depth — Foreman catches it at author time; executor catches it at edit time.

### Proposal 2 (Foreman-derived from M4-DOC-09) — Cross-tenant render verification when client-side preview helpers are touched
**Where:** `.claude/skills/opticup-executor/SKILL.md` §"Common Test Patterns"
**Change:** Add: *"When SPEC modifies a client-side preview/template helper (e.g., `crm-messaging-templates.js` substitute()), the QA must include a 'preview as tenant 2' walkthrough: open the helper while logged in as the OTHER tenant, confirm preview shows tenant-neutral placeholders or correctly-fetched current-tenant values, NEVER the prior tenant's values."*
**Source:** Finding M4-DOC-09 — preview-only impact path is structurally different from customer-facing path.

---

## 7. Verdict

🟢 **CLOSED.**

**Closed:**
- M4_HARDCODED_PRIZMA_REMOVAL SPEC complete; 5 commits on `develop`; 4 EFs deployed; SaaS-readiness threshold crossed for M4.
- Tenant 2 onboarding now requires only `INSERT INTO tenants` + `UPDATE ui_config` JSONB. Zero code changes.
- 3 of 4 audit CRITICALs CLOSED (G-CRIT-1 cms_leads, G-CRIT-3 7 views, G-CRIT-4 hardcoded Prizma + the related G-HIGH-3/6/7).

**Action items for the next opticup-strategic session:**
1. **APPLY Proposal 1 NOW** (filesystem path verification in Step 1.5). 4-occurrence rule triggered.
2. **APPLY Proposal 2** (preview vs customer-facing distinction in SPEC_TEMPLATE §2 guidance).
3. **APPLY executor Proposal 1** (mirror filesystem check in opticup-executor Step 1.5).
4. **APPLY executor Proposal 2** (cross-tenant preview QA pattern in opticup-executor Common Test Patterns).
5. **Author PART 2 SPEC** — `M4_TENANT_ISOLATION_HARDENING_PART2`: the 12 anon-callable SECURITY DEFINER RPCs (G-CRIT-2). This is the LAST CRITICAL remaining from the audit.
6. Daniel-only: merge `develop` → `main` after morning monitoring confirms tenant_config + EF behavior stable.

**Production status confirmed:** All 4 EFs ACTIVE (quick-register v6, send-message v20, resolve-link v3, event-register v15). Tenant config seeded for prizma + demo. Customers receiving messages NOW see correct tenant-scoped values from DB, not hardcoded literals.

**Module 4 audit progress:** 3 of 4 audit CRITICALs CLOSED. PART 2 (12 RPCs) is the last CRITICAL standing. After PART 2, M4 enters HIGH-priority cleanup phase.

*End of FOREMAN_REVIEW.*
